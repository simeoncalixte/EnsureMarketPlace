import { QueryInterface, Transaction } from 'sequelize';

/**
 * Destructive: drop the legacy appetite tables now that the capacity-governance
 * model is the single source of truth (data copied by
 * 20260622000100-migrate-appetite-into-capacity). Children first to respect FKs.
 *
 * IRREVERSIBLE — `down` recreates nothing; the data is gone. Take a DB backup
 * before running `npm run migrate`.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    for (const table of ['appetiteLocationLimits', 'organizationValidationRules', 'organizationAppetiteProfiles']) {
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

export async function down(): Promise<void> {
  // Irreversible — the legacy appetite tables and their data are not restorable.
}
