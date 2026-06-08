import { DataTypes, QueryInterface, Transaction } from 'sequelize';
import { crestaZones } from '../seed-data/crestaZones';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'crestaZones', transaction))) {
      await context.createTable(
        'crestaZones',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          code: { type: DataTypes.STRING, allowNull: false, unique: true },
          countryName: { type: DataTypes.STRING, allowNull: false },
          iso3: { type: DataTypes.STRING(3), allowNull: false },
          iso2: { type: DataTypes.STRING(2), allowNull: true },
          continent: { type: DataTypes.STRING, allowNull: true },
          resolution: { type: DataTypes.STRING, allowNull: false, defaultValue: 'low' },
          scheme: { type: DataTypes.STRING, allowNull: true },
          release: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2019 },
          zoneCount: { type: DataTypes.INTEGER, allowNull: true },
          // GeoJSON Polygon/MultiPolygon for the zone boundary. Null until the licensed
          // PERILS CRESTA boundary dataset is loaded; null zones do not render on the map.
          geometry: { type: DataTypes.JSONB, allowNull: true },
          createdAt: { type: DataTypes.DATE, allowNull: true },
          updatedAt: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
      );

      await context.addIndex('crestaZones', ['iso3'], { name: 'cresta_zones_iso3_idx', transaction });
    }

    const now = new Date();
    const rows = crestaZones.map((zone) => ({
      code: zone.code,
      countryName: zone.countryName,
      iso3: zone.iso3,
      iso2: zone.iso2,
      continent: zone.continent,
      resolution: zone.resolution,
      scheme: zone.scheme,
      release: zone.release,
      zoneCount: zone.zoneCount,
      geometry: null,
      createdAt: now,
      updatedAt: now,
    }));

    if (rows.length > 0) {
      // Idempotent re-seed: ignore rows whose unique `code` already exists.
      await context.bulkInsert('crestaZones', rows, { transaction, ignoreDuplicates: true });
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
    if (await tableExists(context, 'crestaZones', transaction)) {
      await context.dropTable('crestaZones', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
