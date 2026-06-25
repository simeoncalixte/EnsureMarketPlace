import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Per-location override fields (additive) on `capacityLocationLimits`. These let a
 * (LOB × location) row override the global capacity definition with a graded
 * appetite stance, pricing-adequacy floors, a per-occurrence limit, a referral
 * threshold, and an effective window. All nullable → unset means "inherit the
 * definition".
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

async function columnExists(context: QueryInterface, tableName: string, column: string): Promise<boolean> {
  const table = await context.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, column);
}

const COLUMNS: Record<string, Parameters<QueryInterface['addColumn']>[2]> = {
  perOccurrenceLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  appetiteStance: { type: DataTypes.STRING, allowNull: true },
  minimumPremium: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  minRateOnLine: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
  referralThreshold: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
  effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
  effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
};

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, 'capacityLocationLimits', transaction)) {
      for (const [name, spec] of Object.entries(COLUMNS)) {
        if (!(await columnExists(context, 'capacityLocationLimits', name))) {
          await context.addColumn('capacityLocationLimits', name, spec, { transaction });
        }
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
    if (await tableExists(context, 'capacityLocationLimits', transaction)) {
      for (const name of Object.keys(COLUMNS)) {
        if (await columnExists(context, 'capacityLocationLimits', name)) {
          await context.removeColumn('capacityLocationLimits', name, { transaction });
        }
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
