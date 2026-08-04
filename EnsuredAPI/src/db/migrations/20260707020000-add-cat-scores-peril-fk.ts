import { QueryInterface, Transaction } from 'sequelize';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

/**
 * Backfill migration: enforce cat_scores.peril -> perils.code reference for
 * databases created before the FK was added to the base CAT schema migration.
 */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    const hasCatScores = await tableExists(context, 'cat_scores', transaction);
    const hasPerils = await tableExists(context, 'perils', transaction);

    if (hasCatScores && hasPerils) {
      await context.addConstraint('cat_scores', {
        fields: ['peril'],
        type: 'foreign key',
        name: 'fk_cat_scores_peril_code',
        references: { table: 'perils', field: 'code' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        transaction,
      } as never).catch(() => {});
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
    await context.removeConstraint('cat_scores', 'fk_cat_scores_peril_code', { transaction }).catch(() => {});
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
