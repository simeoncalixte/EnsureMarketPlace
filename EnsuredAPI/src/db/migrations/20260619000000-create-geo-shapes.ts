import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Boundary-geometry cache for the unified geolocation service. One new table, no
 * existing table touched — strictly ADDITIVE. The geolocation orchestrator caches
 * fetched country/state/city boundaries here (keyed by kind + ref + country_code)
 * so subsequent shape requests are served from our own DB instead of re-hitting a
 * remote provider. Idempotent guards mirror the existing migrations. Columns are
 * snake_case (underscored model).
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
    if (!(await tableExists(context, 'geo_shapes', transaction))) {
      await context.createTable(
        'geo_shapes',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          kind: { type: DataTypes.STRING, allowNull: false },
          ref: { type: DataTypes.STRING, allowNull: false },
          country_code: { type: DataTypes.STRING(2), allowNull: true },
          state_ref: { type: DataTypes.STRING, allowNull: true },
          name: { type: DataTypes.STRING, allowNull: true },
          geometry: { type: DataTypes.JSONB, allowNull: false },
          bbox: { type: DataTypes.JSONB, allowNull: true },
          provider: { type: DataTypes.STRING, allowNull: false },
          source: { type: DataTypes.STRING, allowNull: false },
          fetched_at: { type: DataTypes.DATE, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('geo_shapes', ['kind', 'ref', 'country_code'], {
        transaction,
        unique: true,
        name: 'geo_shapes_kind_ref_country_uniq',
      });
      await context.addIndex('geo_shapes', ['kind'], { transaction, name: 'geo_shapes_kind_idx' });
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
    if (await tableExists(context, 'geo_shapes', transaction)) {
      await context.dropTable('geo_shapes', { transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
