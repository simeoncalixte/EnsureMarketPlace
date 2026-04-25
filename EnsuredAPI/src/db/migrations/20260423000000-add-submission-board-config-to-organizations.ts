import { DataTypes, QueryInterface, Transaction } from 'sequelize';

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

async function removeColumnIfPresent(context: QueryInterface, tableName: string, columnName: string, transaction: Transaction): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });
  if (description[columnName]) {
    await context.removeColumn(tableName, columnName, { transaction });
  }
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    await addColumnIfMissing(
      context,
      'organizations',
      'submissionBoardConfig',
      { type: DataTypes.JSONB, allowNull: true },
      transaction,
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    await removeColumnIfPresent(context, 'organizations', 'submissionBoardConfig', transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}