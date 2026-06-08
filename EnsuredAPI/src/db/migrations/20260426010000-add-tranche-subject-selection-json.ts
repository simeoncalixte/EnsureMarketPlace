import { DataTypes, QueryInterface, Transaction } from 'sequelize';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

async function columnExists(context: QueryInterface, tableName: string, columnName: string, transaction: Transaction): Promise<boolean> {
  const description = await context.describeTable(tableName, { transaction });
  return Boolean(description[columnName]);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (await tableExists(context, 'tranches', transaction)) {
      if (!(await columnExists(context, 'tranches', 'subjectSelectionJson', transaction))) {
        await context.addColumn(
          'tranches',
          'subjectSelectionJson',
          {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: { mode: 'all', subjectIds: [] },
          },
          { transaction },
        );
      }
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
    if (await tableExists(context, 'tranches', transaction)) {
      if (await columnExists(context, 'tranches', 'subjectSelectionJson', transaction)) {
        await context.removeColumn('tranches', 'subjectSelectionJson', { transaction });
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}