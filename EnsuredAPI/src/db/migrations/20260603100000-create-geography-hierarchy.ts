import { DataTypes, QueryInterface, Transaction } from 'sequelize';
import { continents } from '../seed-data/continents';
import { countries } from '../seed-data/countries';

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
    if (!(await tableExists(context, 'continents', transaction))) {
      await context.createTable(
        'continents',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          code: { type: DataTypes.STRING(2), allowNull: false, unique: true },
          name: { type: DataTypes.STRING, allowNull: false },
          slug: { type: DataTypes.STRING, allowNull: false },
          ...timestampCols(),
        },
        { transaction },
      );
    }

    if (!(await tableExists(context, 'countries', transaction))) {
      await context.createTable(
        'countries',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          iso2: { type: DataTypes.STRING(2), allowNull: false, unique: true },
          iso3: { type: DataTypes.STRING(3), allowNull: false, unique: true },
          isoNumeric: { type: DataTypes.STRING(3), allowNull: true },
          name: { type: DataTypes.STRING, allowNull: false },
          officialName: { type: DataTypes.STRING, allowNull: true },
          slug: { type: DataTypes.STRING, allowNull: false },
          continentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'continents', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          region: { type: DataTypes.STRING, allowNull: true },
          subregion: { type: DataTypes.STRING, allowNull: true },
          capitalName: { type: DataTypes.STRING, allowNull: true },
          currencyCode: { type: DataTypes.STRING(3), allowNull: true },
          currencyName: { type: DataTypes.STRING, allowNull: true },
          phoneCode: { type: DataTypes.STRING, allowNull: true },
          tld: { type: DataTypes.STRING, allowNull: true },
          flagEmoji: { type: DataTypes.STRING, allowNull: true },
          population: { type: DataTypes.BIGINT, allowNull: true },
          areaKm2: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
          latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          timezones: { type: DataTypes.JSONB, allowNull: true },
          ...timestampCols(),
        },
        { transaction },
      );
      await context.addIndex('countries', ['iso2'], { name: 'countries_iso2_idx', transaction });
      await context.addIndex('countries', ['iso3'], { name: 'countries_iso3_idx', transaction });
      await context.addIndex('countries', ['continentId'], { name: 'countries_continent_idx', transaction });
    }

    if (!(await tableExists(context, 'stateProvinces', transaction))) {
      await context.createTable(
        'stateProvinces',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          countryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'countries', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: { type: DataTypes.STRING, allowNull: false },
          nameAscii: { type: DataTypes.STRING, allowNull: true },
          slug: { type: DataTypes.STRING, allowNull: true },
          code: { type: DataTypes.STRING, allowNull: true },
          type: { type: DataTypes.STRING, allowNull: true },
          latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          population: { type: DataTypes.BIGINT, allowNull: true },
          ...timestampCols(),
        },
        { transaction },
      );
      await context.addIndex('stateProvinces', ['countryId'], { name: 'state_provinces_country_idx', transaction });
      await context.addIndex('stateProvinces', ['countryId', 'code'], {
        name: 'state_provinces_country_code_uq',
        unique: true,
        transaction,
      });
    }

    if (!(await tableExists(context, 'cities', transaction))) {
      await context.createTable(
        'cities',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          externalId: { type: DataTypes.STRING, allowNull: false, unique: true },
          countryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'countries', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          stateProvinceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'stateProvinces', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          name: { type: DataTypes.STRING, allowNull: false },
          nameAscii: { type: DataTypes.STRING, allowNull: true },
          altNames: { type: DataTypes.JSONB, allowNull: true },
          latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
          longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
          capital: { type: DataTypes.STRING, allowNull: true },
          isCapital: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          population: { type: DataTypes.BIGINT, allowNull: true },
          populationProper: { type: DataTypes.BIGINT, allowNull: true },
          density: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
          ranking: { type: DataTypes.INTEGER, allowNull: true },
          timezone: { type: DataTypes.STRING, allowNull: true },
          sameName: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          ...timestampCols(),
        },
        { transaction },
      );
      await context.addIndex('cities', ['countryId'], { name: 'cities_country_idx', transaction });
      await context.addIndex('cities', ['stateProvinceId'], { name: 'cities_state_idx', transaction });
      await context.addIndex('cities', ['name'], { name: 'cities_name_idx', transaction });
      await context.addIndex('cities', ['latitude', 'longitude'], { name: 'cities_latlng_idx', transaction });
    }

    if (!(await tableExists(context, 'addresses', transaction))) {
      await context.createTable(
        'addresses',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          line1: { type: DataTypes.STRING, allowNull: true },
          line2: { type: DataTypes.STRING, allowNull: true },
          cityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'cities', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          stateProvinceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'stateProvinces', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          countryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'countries', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          cityName: { type: DataTypes.STRING, allowNull: true },
          stateName: { type: DataTypes.STRING, allowNull: true },
          countryCode: { type: DataTypes.STRING(3), allowNull: true },
          postalCode: { type: DataTypes.STRING, allowNull: true },
          latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
          formattedAddress: { type: DataTypes.TEXT, allowNull: true },
          placeId: { type: DataTypes.STRING, allowNull: true },
          metadata: { type: DataTypes.JSONB, allowNull: true },
          ...timestampCols(),
        },
        { transaction },
      );
      await context.addIndex('addresses', ['cityId'], { name: 'addresses_city_idx', transaction });
      await context.addIndex('addresses', ['countryId'], { name: 'addresses_country_idx', transaction });
      await context.addIndex('addresses', ['postalCode'], { name: 'addresses_postal_idx', transaction });
    }

    // Seed continents, then countries (resolving continentId by continent code).
    const now = new Date();

    await context.bulkInsert(
      'continents',
      continents.map((c) => ({ code: c.code, name: c.name, slug: c.slug, createdAt: now, updatedAt: now })),
      { transaction, ignoreDuplicates: true },
    );

    const continentRows = (await context.sequelize.query('SELECT id, code FROM continents', {
      type: 'SELECT',
      transaction,
    })) as Array<{ id: number; code: string }>;
    const continentIdByCode = new Map(continentRows.map((row) => [row.code, row.id]));

    await context.bulkInsert(
      'countries',
      countries.map((c) => ({
        iso2: c.iso2,
        iso3: c.iso3,
        isoNumeric: c.isoNumeric,
        name: c.name,
        officialName: c.officialName,
        slug: c.slug,
        continentId: c.continentCode ? continentIdByCode.get(c.continentCode) ?? null : null,
        region: c.region,
        subregion: c.subregion,
        capitalName: c.capitalName,
        currencyCode: c.currencyCode,
        currencyName: c.currencyName,
        phoneCode: c.phoneCode,
        tld: c.tld,
        flagEmoji: c.flagEmoji,
        population: null,
        areaKm2: c.areaKm2,
        latitude: c.latitude,
        longitude: c.longitude,
        timezones: null,
        createdAt: now,
        updatedAt: now,
      })),
      { transaction, ignoreDuplicates: true },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    // Drop in dependency order (children first).
    for (const table of ['addresses', 'cities', 'stateProvinces', 'countries', 'continents']) {
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
