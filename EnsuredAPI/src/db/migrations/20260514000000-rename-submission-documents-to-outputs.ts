import { QueryInterface, QueryTypes, Transaction } from 'sequelize';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const rows = await context.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = :tableName
    ) AS "exists"`,
    {
      type: QueryTypes.SELECT,
      replacements: { tableName },
      transaction,
    },
  );

  return Boolean(rows[0]?.exists);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    const hasOldTable = await tableExists(context, 'submission_documents', transaction);
    const hasNewTable = await tableExists(context, 'submission_outputs', transaction);

    if (hasOldTable && !hasNewTable) {
      await context.renameTable('submission_documents', 'submission_outputs', { transaction });
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
    const hasOldTable = await tableExists(context, 'submission_documents', transaction);
    const hasNewTable = await tableExists(context, 'submission_outputs', transaction);

    if (!hasOldTable && hasNewTable) {
      await context.renameTable('submission_outputs', 'submission_documents', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
