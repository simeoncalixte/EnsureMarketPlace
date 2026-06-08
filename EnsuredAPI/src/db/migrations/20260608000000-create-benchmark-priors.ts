import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Slice 5.0 of the Risk Class spine — the credibility-weighted compute spine.
 *
 * This migration is strictly ADDITIVE and backward-compatible:
 *   - NEW TABLE `benchmark_priors` (industry/benchmark loss-rate + loss-ratio
 *     priors, per LOB taxonomy code, optionally per org). Org-null rows are the
 *     platform default priors. Every prior carries a REQUIRED `source` citation so
 *     no number is undefended.
 *
 * No existing table is touched. No column is dropped, renamed, or made
 * non-nullable. No endpoint is removed. Every existing row/query is unaffected
 * because this only creates one new table. Column naming is camelCase to mirror
 * the now-correct riskClassRegistry pattern (model `underscored:false`).
 * Idempotent guards mirror Slices 1-2.
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
    if (!(await tableExists(context, 'benchmark_priors', transaction))) {
      await context.createTable(
        'benchmark_priors',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false },
          lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
          exposureBasis: { type: DataTypes.STRING, allowNull: true },
          lossRate: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
          targetLossRatio: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
          expenseRatio: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
          marginTarget: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
          fullCredibilityStandard: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
          paramsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          source: { type: DataTypes.STRING, allowNull: false },
          sourceUrl: { type: DataTypes.STRING, allowNull: true },
          asOfDate: { type: DataTypes.DATEONLY, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
          createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );

      await context.addIndex(
        'benchmark_priors',
        ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode'],
        {
          unique: true,
          transaction,
          name: 'benchmark_priors_scope_unique',
        },
      );
      await context.addIndex(
        'benchmark_priors',
        ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'status'],
        {
          transaction,
          name: 'benchmark_priors_scope_status_idx',
        },
      );
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
    if (await tableExists(context, 'benchmark_priors', transaction)) {
      await context.dropTable('benchmark_priors', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
