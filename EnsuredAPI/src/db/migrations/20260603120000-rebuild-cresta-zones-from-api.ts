import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Replace the CRESTA catalog (one example code + zone count per country/resolution) with a table
 * shaped to hold the REAL CRESTA zones fetched from the CRESTA API, plus a resumable import-progress
 * table. The catalog's per-(country, resolution) rows are first captured as the importer work-list,
 * then the catalog data is cleared by dropping and recreating `crestaZones`.
 *
 * - `crestaImportProgress`: one row per (country, level) tracking pagination/resume state.
 * - `crestaZones` (rebuilt): real zones at `state_province` (low-res) and `city` (high-res) levels.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

function timestampCols() {
  return {
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    // 1. Progress/checkpoint table (one row per country+level).
    if (!(await tableExists(context, 'crestaImportProgress', transaction))) {
      await context.createTable(
        'crestaImportProgress',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          countryIso3: { type: DataTypes.STRING(3), allowNull: false },
          level: { type: DataTypes.STRING, allowNull: false },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
          totalElements: { type: DataTypes.INTEGER, allowNull: true },
          nextOffset: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          imported: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          pageSize: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
          attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          lastError: { type: DataTypes.TEXT, allowNull: true },
          startedAt: { type: DataTypes.DATE, allowNull: true },
          completedAt: { type: DataTypes.DATE, allowNull: true },
          lastFetchedAt: { type: DataTypes.DATE, allowNull: true },
          ...timestampCols(),
        },
        { transaction },
      );
      await context.addIndex('crestaImportProgress', ['countryIso3', 'level'], {
        name: 'cresta_progress_country_level_uq',
        unique: true,
        transaction,
      });
      await context.addIndex('crestaImportProgress', ['status'], {
        name: 'cresta_progress_status_idx',
        transaction,
      });
    }

    // 2. Seed the work-list from the existing catalog (low -> state_province, high -> city) before
    //    we clear it. DISTINCT collapses the catalog's per-country rows into the unique work pairs.
    if (await tableExists(context, 'crestaZones', transaction)) {
      await context.sequelize.query(
        `INSERT INTO "crestaImportProgress"
           ("countryIso3", "level", "status", "nextOffset", "imported", "pageSize", "attempts", "createdAt", "updatedAt")
         SELECT DISTINCT z."iso3",
                CASE WHEN z."resolution" = 'high' THEN 'city' ELSE 'state_province' END,
                'pending', 0, 0, 1000, 0, NOW(), NOW()
         FROM "crestaZones" z
         ON CONFLICT DO NOTHING`,
        { transaction },
      );
    }

    // 3. Clear the catalog: drop and recreate crestaZones with the real-zone shape.
    if (await tableExists(context, 'crestaZones', transaction)) {
      await context.dropTable('crestaZones', { transaction });
    }
    await context.createTable(
      'crestaZones',
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        crestaId: { type: DataTypes.STRING, allowNull: false, unique: true },
        externalId: { type: DataTypes.STRING, allowNull: false, unique: true },
        countryId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'countries', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        countryIso3: { type: DataTypes.STRING(3), allowNull: false },
        level: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: true },
        bbox: { type: DataTypes.JSONB, allowNull: true },
        latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
        longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
        geometry: { type: DataTypes.JSONB, allowNull: true },
        release: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2019 },
        ...timestampCols(),
      },
      { transaction },
    );
    await context.addIndex('crestaZones', ['countryId'], { name: 'cresta_zones_country_idx', transaction });
    await context.addIndex('crestaZones', ['countryIso3'], { name: 'cresta_zones_iso3_idx', transaction });
    await context.addIndex('crestaZones', ['level'], { name: 'cresta_zones_level_idx', transaction });
    await context.addIndex('crestaZones', ['latitude', 'longitude'], { name: 'cresta_zones_latlng_idx', transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (await tableExists(context, 'crestaImportProgress', transaction)) {
      await context.dropTable('crestaImportProgress', { transaction });
    }
    if (await tableExists(context, 'crestaZones', transaction)) {
      await context.dropTable('crestaZones', { transaction });
    }
    // Recreate the prior catalog shape (without data — forward-only migration).
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
        geometry: { type: DataTypes.JSONB, allowNull: true },
        countryId: { type: DataTypes.INTEGER, allowNull: true },
        ...timestampCols(),
      },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
