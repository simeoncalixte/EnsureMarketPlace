import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Organizational structure — Departments and the Teams nested within them, plus
 * the nullable `departmentId` / `teamId` assignment columns on `users`.
 *
 *   organizations 1──* departments 1──* teams
 *   users.departmentId → departments.id   (SET NULL on delete)
 *   users.teamId       → teams.id         (SET NULL on delete)
 *
 * Assignment columns are additive and nullable, so existing users are left
 * unassigned and unchanged.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

async function columnExists(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  transaction: Transaction,
): Promise<boolean> {
  const description = await context.describeTable(tableName, { transaction });
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

function baseColumns() {
  return {
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  };
}

function orgFk() {
  return {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
    onUpdate: 'CASCADE' as const,
    onDelete: 'CASCADE' as const,
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'departments', transaction))) {
      await context.createTable(
        'departments',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          organizationId: orgFk(),
          name: { type: DataTypes.STRING, allowNull: false },
          code: { type: DataTypes.STRING, allowNull: true },
          description: { type: DataTypes.TEXT, allowNull: true },
          isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('departments', ['organizationId'], { name: 'idx_departments_org', transaction });
      await context.addIndex('departments', ['organizationId', 'code'], {
        unique: true,
        name: 'uq_departments_org_code',
        transaction,
      });
    }

    if (!(await tableExists(context, 'teams', transaction))) {
      await context.createTable(
        'teams',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'departments', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          organizationId: orgFk(),
          name: { type: DataTypes.STRING, allowNull: false },
          code: { type: DataTypes.STRING, allowNull: true },
          description: { type: DataTypes.TEXT, allowNull: true },
          isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('teams', ['departmentId'], { name: 'idx_teams_department', transaction });
      await context.addIndex('teams', ['organizationId'], { name: 'idx_teams_org', transaction });
      await context.addIndex('teams', ['departmentId', 'code'], {
        unique: true,
        name: 'uq_teams_department_code',
        transaction,
      });
    }

    if (!(await columnExists(context, 'users', 'departmentId', transaction))) {
      await context.addColumn(
        'users',
        'departmentId',
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'departments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );
      await context.addIndex('users', ['departmentId'], { name: 'idx_users_department', transaction });
    }

    if (!(await columnExists(context, 'users', 'teamId', transaction))) {
      await context.addColumn(
        'users',
        'teamId',
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'teams', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction },
      );
      await context.addIndex('users', ['teamId'], { name: 'idx_users_team', transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await columnExists(context, 'users', 'teamId', transaction)) {
      await context.removeColumn('users', 'teamId', { transaction });
    }
    if (await columnExists(context, 'users', 'departmentId', transaction)) {
      await context.removeColumn('users', 'departmentId', { transaction });
    }
    for (const table of ['teams', 'departments']) {
      if (await tableExists(context, table, transaction)) {
        await context.dropTable(table, { transaction });
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
