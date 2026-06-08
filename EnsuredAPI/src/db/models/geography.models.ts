import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Normalized geographic hierarchy: Continent -> Country -> StateProvince -> City, plus a
 * reusable Address book that points into the hierarchy.
 *
 * Continents and countries are seeded deterministically (small, stable reference data).
 * StateProvinces (~4.4k) and Cities (~1.94M) are bulk-loaded from worldcities.csv by the
 * streaming importer (`src/db/import-worldcities.ts`). Coordinates use DECIMAL(9,6); arrays
 * and free-form metadata use JSONB — no PostGIS, consistent with the rest of the schema.
 */

export class Continent extends Model<InferAttributes<Continent>, InferCreationAttributes<Continent>> {
  declare id: CreationOptional<number>;
  declare code: string;
  declare name: string;
  declare slug: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Country extends Model<InferAttributes<Country>, InferCreationAttributes<Country>> {
  declare id: CreationOptional<number>;
  declare iso2: string;
  declare iso3: string;
  declare isoNumeric: string | null;
  declare name: string;
  declare officialName: string | null;
  declare slug: string;
  declare continentId: number | null;
  declare region: string | null;
  declare subregion: string | null;
  declare capitalName: string | null;
  declare currencyCode: string | null;
  declare currencyName: string | null;
  declare phoneCode: string | null;
  declare tld: string | null;
  declare flagEmoji: string | null;
  declare population: number | null;
  declare areaKm2: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare timezones: CreationOptional<unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class StateProvince extends Model<InferAttributes<StateProvince>, InferCreationAttributes<StateProvince>> {
  declare id: CreationOptional<number>;
  declare countryId: number;
  declare name: string;
  declare nameAscii: string | null;
  declare slug: string | null;
  declare code: string | null;
  declare type: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare population: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class City extends Model<InferAttributes<City>, InferCreationAttributes<City>> {
  declare id: CreationOptional<number>;
  declare externalId: string;
  declare countryId: number;
  declare stateProvinceId: number | null;
  declare name: string;
  declare nameAscii: string | null;
  declare altNames: CreationOptional<unknown>;
  declare latitude: number;
  declare longitude: number;
  declare capital: string | null;
  declare isCapital: CreationOptional<boolean>;
  declare population: number | null;
  declare populationProper: number | null;
  declare density: string | null;
  declare ranking: number | null;
  declare timezone: string | null;
  declare sameName: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class Address extends Model<InferAttributes<Address>, InferCreationAttributes<Address>> {
  declare id: CreationOptional<number>;
  declare line1: string | null;
  declare line2: string | null;
  declare cityId: number | null;
  declare stateProvinceId: number | null;
  declare countryId: number | null;
  declare cityName: string | null;
  declare stateName: string | null;
  declare countryCode: string | null;
  declare postalCode: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare formattedAddress: string | null;
  declare placeId: string | null;
  declare metadata: CreationOptional<unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initGeographyModels(sequelize: Sequelize): void {
  Continent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      code: { type: DataTypes.STRING(2), allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'Continent', tableName: 'continents' },
  );

  Country.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      iso2: { type: DataTypes.STRING(2), allowNull: false, unique: true },
      iso3: { type: DataTypes.STRING(3), allowNull: false, unique: true },
      isoNumeric: { type: DataTypes.STRING(3), allowNull: true },
      name: { type: DataTypes.STRING, allowNull: false },
      officialName: { type: DataTypes.STRING, allowNull: true },
      slug: { type: DataTypes.STRING, allowNull: false },
      continentId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'continents', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
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
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Country',
      tableName: 'countries',
      indexes: [{ fields: ['iso2'] }, { fields: ['iso3'] }, { fields: ['continentId'] }],
    },
  );

  StateProvince.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      countryId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'countries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      name: { type: DataTypes.STRING, allowNull: false },
      nameAscii: { type: DataTypes.STRING, allowNull: true },
      slug: { type: DataTypes.STRING, allowNull: true },
      code: { type: DataTypes.STRING, allowNull: true },
      type: { type: DataTypes.STRING, allowNull: true },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      population: { type: DataTypes.BIGINT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'StateProvince',
      tableName: 'stateProvinces',
      indexes: [{ fields: ['countryId'] }, { unique: true, fields: ['countryId', 'code'] }],
    },
  );

  City.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      externalId: { type: DataTypes.STRING, allowNull: false, unique: true },
      countryId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'countries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      stateProvinceId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'stateProvinces', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
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
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'City',
      tableName: 'cities',
      indexes: [
        { fields: ['countryId'] },
        { fields: ['stateProvinceId'] },
        { fields: ['name'] },
        { fields: ['latitude', 'longitude'] },
      ],
    },
  );

  Address.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      line1: { type: DataTypes.STRING, allowNull: true },
      line2: { type: DataTypes.STRING, allowNull: true },
      cityId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'cities', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      stateProvinceId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'stateProvinces', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      countryId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'countries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      cityName: { type: DataTypes.STRING, allowNull: true },
      stateName: { type: DataTypes.STRING, allowNull: true },
      countryCode: { type: DataTypes.STRING(3), allowNull: true },
      postalCode: { type: DataTypes.STRING, allowNull: true },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      formattedAddress: { type: DataTypes.TEXT, allowNull: true },
      placeId: { type: DataTypes.STRING, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Address',
      tableName: 'addresses',
      indexes: [{ fields: ['cityId'] }, { fields: ['countryId'] }, { fields: ['postalCode'] }],
    },
  );
}
