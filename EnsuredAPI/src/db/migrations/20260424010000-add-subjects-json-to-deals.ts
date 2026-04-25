import { DataTypes, QueryInterface, Transaction } from 'sequelize';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

async function addColumnIfMissing(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  definition: Record<string, unknown>,
  transaction: Transaction,
): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });
  if (!description[columnName]) {
    await context.addColumn(tableName, columnName, definition, { transaction });
  }
}

async function removeColumnIfPresent(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  transaction: Transaction,
): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });
  if (description[columnName]) {
    await context.removeColumn(tableName, columnName, { transaction });
  }
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (await tableExists(context, 'deals', transaction)) {
      await addColumnIfMissing(context, 'deals', 'subjectsJson', { type: DataTypes.JSONB, allowNull: true, defaultValue: [] }, transaction);
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
    if (await tableExists(context, 'deals', transaction)) {
      await removeColumnIfPresent(context, 'deals', 'subjectsJson', transaction);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}