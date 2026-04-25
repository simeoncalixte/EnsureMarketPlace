import { DataTypes, QueryInterface, Transaction } from 'sequelize';
import { lineOfBusinessTaxonomy } from '../seed-data/lineOfBusinessTaxonomy';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
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
    if (!(await tableExists(context, 'lineOfBusinessPrimaryTypes', transaction))) {
      await context.createTable(
        'lineOfBusinessPrimaryTypes',
        {
          code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
          label: { type: DataTypes.STRING, allowNull: false },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          ...baseColumns(),
        },
        { transaction },
      );
    }

    if (!(await tableExists(context, 'lineOfBusinessSubTypes', transaction))) {
      await context.createTable(
        'lineOfBusinessSubTypes',
        {
          code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
          primaryCode: {
            type: DataTypes.STRING,
            allowNull: false,
            references: { model: 'lineOfBusinessPrimaryTypes', key: 'code' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          label: { type: DataTypes.STRING, allowNull: false },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          ...baseColumns(),
        },
        { transaction },
      );
    }

    const now = new Date();
    const primaryRows = lineOfBusinessTaxonomy.map((primary, index) => ({
      code: primary.code,
      label: primary.label,
      sortOrder: (index + 1) * 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    const subtypeRows = lineOfBusinessTaxonomy.flatMap((primary) =>
      primary.subTypes.map((subType, index) => ({
        code: subType.code,
        primaryCode: primary.code,
        label: subType.label,
        sortOrder: (index + 1) * 10,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })),
    );

    if (primaryRows.length > 0) {
      await context.bulkInsert('lineOfBusinessPrimaryTypes', primaryRows, { transaction });
    }

    if (subtypeRows.length > 0) {
      await context.bulkInsert('lineOfBusinessSubTypes', subtypeRows, { transaction });
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
    if (await tableExists(context, 'lineOfBusinessSubTypes', transaction)) {
      await context.dropTable('lineOfBusinessSubTypes', { transaction });
    }

    if (await tableExists(context, 'lineOfBusinessPrimaryTypes', transaction)) {
      await context.dropTable('lineOfBusinessPrimaryTypes', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
