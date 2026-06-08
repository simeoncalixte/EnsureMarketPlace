import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Real CRESTA zones loaded from the CRESTA API (https://cresta.org/api/countries/{iso3}/2019/...).
 *
 * Two levels are stored:
 *   - `state_province` — from the `lowreszones/info` endpoint (regions/states/provinces)
 *   - `city`           — from the `highreszones/info` endpoint (cities/localities)
 *
 * Each zone carries the CRESTA `crestaId` (e.g. "RUS_01703"), the API numeric id (`externalId`),
 * the locality `name` (the API `description`), and the zone bounding box (`bbox` = {sw,ne}) with a
 * derived centroid (`latitude`/`longitude`). `geometry` is reserved for true polygon boundaries.
 *
 * The import is driven by `CrestaImportProgress`, which tracks resumable per-(country, level)
 * pagination state so the throttled loader can stop and pick up exactly where it left off.
 */

export type CrestaBBox = {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
} | null;

export type CrestaLevel = 'state_province' | 'city';

export class CrestaZone extends Model<InferAttributes<CrestaZone>, InferCreationAttributes<CrestaZone>> {
  declare id: CreationOptional<number>;
  declare crestaId: string;
  declare externalId: string;
  declare countryId: number | null;
  declare countryIso3: string;
  declare level: CrestaLevel;
  declare name: string | null;
  declare bbox: CrestaBBox;
  declare latitude: number | null;
  declare longitude: number | null;
  declare geometry: CreationOptional<unknown>;
  declare release: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const crestaImportStatuses = ['pending', 'in_progress', 'complete', 'failed', 'unavailable'] as const;
export type CrestaImportStatus = (typeof crestaImportStatuses)[number];

export class CrestaImportProgress extends Model<
  InferAttributes<CrestaImportProgress>,
  InferCreationAttributes<CrestaImportProgress>
> {
  declare id: CreationOptional<number>;
  declare countryIso3: string;
  declare level: CrestaLevel;
  declare status: CreationOptional<CrestaImportStatus>;
  declare totalElements: number | null;
  declare nextOffset: CreationOptional<number>;
  declare imported: CreationOptional<number>;
  declare pageSize: CreationOptional<number>;
  declare attempts: CreationOptional<number>;
  declare lastError: string | null;
  declare startedAt: Date | null;
  declare completedAt: Date | null;
  declare lastFetchedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initCrestaModels(sequelize: Sequelize): void {
  CrestaZone.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      crestaId: { type: DataTypes.STRING, allowNull: false, unique: true },
      externalId: { type: DataTypes.STRING, allowNull: false, unique: true },
      countryId: { type: DataTypes.INTEGER, allowNull: true },
      countryIso3: { type: DataTypes.STRING(3), allowNull: false },
      level: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: true },
      bbox: { type: DataTypes.JSONB, allowNull: true },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
      geometry: { type: DataTypes.JSONB, allowNull: true },
      release: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2019 },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CrestaZone',
      tableName: 'crestaZones',
      indexes: [{ fields: ['countryId'] }, { fields: ['level'] }, { fields: ['latitude', 'longitude'] }],
    },
  );

  CrestaImportProgress.init(
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
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CrestaImportProgress',
      tableName: 'crestaImportProgress',
      indexes: [{ unique: true, fields: ['countryIso3', 'level'] }, { fields: ['status'] }],
    },
  );
}
