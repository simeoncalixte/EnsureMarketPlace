import { DataTypes, QueryInterface, Transaction } from 'sequelize';
import { perilTaxonomy } from '../seed-data/perilTaxonomy';

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
    if (!(await tableExists(context, 'perilCategories', transaction))) {
      await context.createTable(
        'perilCategories',
        {
          code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
          label: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          ...baseColumns(),
        },
        { transaction },
      );
    }

    if (!(await tableExists(context, 'perils', transaction))) {
      await context.createTable(
        'perils',
        {
          code: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
          categoryCode: {
            type: DataTypes.STRING,
            allowNull: false,
            references: { model: 'perilCategories', key: 'code' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          label: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          isCatastrophe: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          ...baseColumns(),
        },
        { transaction },
      );
    }

    const now = new Date();
    const categoryRows = perilTaxonomy.map((category, index) => ({
      code: category.code,
      label: category.label,
      description: category.description,
      sortOrder: (index + 1) * 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    const perilRows = perilTaxonomy.flatMap((category) =>
      category.perils.map((peril, index) => ({
        code: peril.code,
        categoryCode: category.code,
        label: peril.label,
        description: peril.description,
        isCatastrophe: peril.isCatastrophe ?? false,
        sortOrder: (index + 1) * 10,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })),
    );

    if (categoryRows.length > 0) {
      await context.bulkInsert('perilCategories', categoryRows, { transaction });
    }

    if (perilRows.length > 0) {
      await context.bulkInsert('perils', perilRows, { transaction });
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
    if (await tableExists(context, 'perils', transaction)) {
      await context.dropTable('perils', { transaction });
    }

    if (await tableExists(context, 'perilCategories', transaction)) {
      await context.dropTable('perilCategories', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
