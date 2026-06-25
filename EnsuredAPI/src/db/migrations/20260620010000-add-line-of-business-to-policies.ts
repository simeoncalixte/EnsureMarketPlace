import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Add a nullable `lineOfBusinessCode` to `policies` so deployed exposure can be
 * summed per line of business for the capacity-utilization layer. Additive and
 * idempotent. The `policies` table uses camelCase columns (the Policy model is
 * not `underscored`), so the column is camelCase to match.
 */

async function columnExists(
  context: QueryInterface,
  table: string,
  column: string,
  transaction: Transaction,
): Promise<boolean> {
  try {
    const desc = await context.describeTable(table, { transaction } as never);
    return Object.prototype.hasOwnProperty.call(desc, column);
  } catch {
    return false;
  }
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (!(await columnExists(context, 'policies', 'lineOfBusinessCode', transaction))) {
      await context.addColumn('policies', 'lineOfBusinessCode', { type: DataTypes.STRING, allowNull: true }, { transaction });
      await context.addIndex('policies', ['lineOfBusinessCode'], {
        transaction,
        name: 'idx_policies_line_of_business',
      });
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
    if (await columnExists(context, 'policies', 'lineOfBusinessCode', transaction)) {
      await context.removeIndex('policies', 'idx_policies_line_of_business', { transaction }).catch(() => {});
      await context.removeColumn('policies', 'lineOfBusinessCode', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
