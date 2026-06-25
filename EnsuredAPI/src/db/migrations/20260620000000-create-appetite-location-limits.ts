import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Per-location appetite limits, keyed by (line of business × location). One new
 * table, no existing table touched — strictly ADDITIVE. Captures per-risk
 * `maxLineSize` and regional `aggregateLimit` for an included jurisdiction +
 * line of business, so geographic appetite becomes an accumulation-control tool.
 * Idempotent guard mirrors the existing migrations. Columns are camelCase to match
 * the sibling appetite tables (organizationAppetiteProfiles / organizationValidationRules).
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
    if (!(await tableExists(context, 'appetiteLocationLimits', transaction))) {
      await context.createTable(
        'appetiteLocationLimits',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          appetiteProfileId: { type: DataTypes.INTEGER, allowNull: false },
          organizationId: { type: DataTypes.INTEGER, allowNull: false },
          lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '*' },
          entry: { type: DataTypes.STRING, allowNull: false },
          level: { type: DataTypes.STRING, allowNull: false },
          countryId: { type: DataTypes.INTEGER, allowNull: true },
          stateProvinceId: { type: DataTypes.INTEGER, allowNull: true },
          cityId: { type: DataTypes.INTEGER, allowNull: true },
          maxLineSize: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          aggregateLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
          currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
          enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('appetiteLocationLimits', ['organizationId'], {
        transaction,
        name: 'idx_appetite_loc_limits_org',
      });
      await context.addIndex('appetiteLocationLimits', ['appetiteProfileId'], {
        transaction,
        name: 'idx_appetite_loc_limits_profile',
      });
      await context.addIndex('appetiteLocationLimits', ['appetiteProfileId', 'lineOfBusinessCode', 'entry'], {
        transaction,
        unique: true,
        name: 'uq_appetite_loc_limits_profile_lob_entry',
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
    if (await tableExists(context, 'appetiteLocationLimits', transaction)) {
      await context.dropTable('appetiteLocationLimits', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
