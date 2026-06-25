import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Capacity-appetite structures (additive). Adds the enforcement-facing `appetite`
 * JSONB block to `capacityDefinitions` and creates the governance equivalents of
 * the legacy appetite domain's per-location limits + flat validation rules,
 * re-keyed to `capacityDefinitionId`. No legacy table is touched here; the
 * copy + drop happen in later migrations.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

async function columnExists(context: QueryInterface, tableName: string, column: string): Promise<boolean> {
  // describeTable's typings don't accept a transaction; reading committed schema
  // is sufficient for this additive idempotency guard.
  const table = await context.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, column);
}

function baseColumns() {
  return {
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (
      (await tableExists(context, 'capacityDefinitions', transaction)) &&
      !(await columnExists(context, 'capacityDefinitions', 'appetite'))
    ) {
      await context.addColumn(
        'capacityDefinitions',
        'appetite',
        { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        { transaction },
      );
    }

    if (!(await tableExists(context, 'capacityLocationLimits', transaction))) {
      await context.createTable(
        'capacityLocationLimits',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'capacityDefinitions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '*' },
          entry: { type: DataTypes.STRING, allowNull: false },
          level: { type: DataTypes.STRING, allowNull: false },
          countryId: { type: DataTypes.INTEGER, allowNull: true },
          stateProvinceId: { type: DataTypes.INTEGER, allowNull: true },
          cityId: { type: DataTypes.INTEGER, allowNull: true },
          maxLineSize: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          aggregateLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
          enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('capacityLocationLimits', ['organizationId'], { name: 'idx_capacity_loc_limits_org', transaction });
      await context.addIndex('capacityLocationLimits', ['capacityDefinitionId'], { name: 'idx_capacity_loc_limits_def', transaction });
      await context.addIndex('capacityLocationLimits', ['capacityDefinitionId', 'lineOfBusinessCode', 'entry'], {
        unique: true,
        name: 'uq_capacity_loc_limits_def_lob_entry',
        transaction,
      });
    }

    if (!(await tableExists(context, 'capacityValidationRules', transaction))) {
      await context.createTable(
        'capacityValidationRules',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          capacityDefinitionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'capacityDefinitions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          field: { type: DataTypes.STRING, allowNull: false },
          operator: { type: DataTypes.STRING, allowNull: false },
          value: { type: DataTypes.JSONB, allowNull: true },
          severity: { type: DataTypes.STRING, allowNull: false, defaultValue: 'flag' },
          enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          ...baseColumns(),
        },
        { transaction },
      );
      await context.addIndex('capacityValidationRules', ['organizationId'], { name: 'idx_capacity_validation_rules_org', transaction });
      await context.addIndex('capacityValidationRules', ['capacityDefinitionId'], { name: 'idx_capacity_validation_rules_def', transaction });
      await context.addIndex('capacityValidationRules', ['capacityDefinitionId', 'sortOrder'], { name: 'idx_capacity_validation_rules_order', transaction });
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
    if (await tableExists(context, 'capacityValidationRules', transaction)) {
      await context.dropTable('capacityValidationRules', { transaction });
    }
    if (await tableExists(context, 'capacityLocationLimits', transaction)) {
      await context.dropTable('capacityLocationLimits', { transaction });
    }
    if (
      (await tableExists(context, 'capacityDefinitions', transaction)) &&
      (await columnExists(context, 'capacityDefinitions', 'appetite'))
    ) {
      await context.removeColumn('capacityDefinitions', 'appetite', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
