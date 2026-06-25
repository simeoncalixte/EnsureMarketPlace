import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Distribution partners reuse the Organization / User tables: a partner is a
 * `type='partner'` org or a `role='partner'` user, created by another org as a
 * placeholder ("stub") with default info. The real partner can later *claim* the
 * account when they join the platform.
 *
 * Adds the claim-state columns to both tables (camelCase — these tables use
 * `underscored: false`):
 *   - claimToken               opaque token a joining partner presents to claim
 *   - claimedAt                set when claimed (null = unclaimed)
 *   - createdByOrganizationId  the org that created the stub (scopes the picker)
 */

const TABLES = ['organizations', 'users'] as const;
const COLUMNS: Record<string, Parameters<QueryInterface['addColumn']>[2]> = {
  claimToken: { type: DataTypes.STRING, allowNull: true },
  claimedAt: { type: DataTypes.DATE, allowNull: true },
  createdByOrganizationId: { type: DataTypes.INTEGER, allowNull: true },
};

function hasColumn(description: Record<string, unknown>, col: string): boolean {
  return Object.keys(description).some((c) => c === col || c.toLowerCase() === col.toLowerCase());
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    for (const table of TABLES) {
      const desc = await context.describeTable(table, { transaction });
      for (const [col, def] of Object.entries(COLUMNS)) {
        if (!hasColumn(desc, col)) {
          await context.addColumn(table, col, def, { transaction });
        }
      }
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    for (const table of TABLES) {
      const desc = await context.describeTable(table, { transaction });
      for (const col of Object.keys(COLUMNS)) {
        if (hasColumn(desc, col)) {
          await context.removeColumn(table, col, { transaction });
        }
      }
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
