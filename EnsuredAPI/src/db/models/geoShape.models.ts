import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Boundary-geometry cache for the unified geolocation service.
 *
 * Administrative boundaries (country / state / city) are fetched lazily from a
 * remote provider (e.g. Nominatim's `polygon_geojson`) the first time they are
 * requested, then cached here so the local-dataset-first orchestrator can serve
 * every subsequent request from our own DB — turning the table into a growing,
 * provider-agnostic shape cache.
 *
 * Deliberately a small, dedicated table rather than a `geometry` column on the
 * ~1.94M-row `cities` table (which would be a heavy migration) and distinct from
 * `crestaZones.geometry` (a different dataset keyed by `crestaId`). Keyed by
 * (kind, ref, country_code) so a country's boundary and a state's boundary never
 * collide. Columns are snake_case (underscored model), mirroring the other recent
 * domains.
 */

export type GeoShapeKind = 'country' | 'state' | 'city';

export class GeoShape extends Model<InferAttributes<GeoShape>, InferCreationAttributes<GeoShape>> {
  declare id: CreationOptional<number>;
  /** Granularity of the cached boundary. */
  declare kind: GeoShapeKind;
  /** ISO-2 for country; name or code for state/city (normalized upstream). */
  declare ref: string;
  /** ISO-3166 alpha-2 scope for state/city refs (null for country). */
  declare countryCode: string | null;
  /** State/province scope for city refs (null otherwise). */
  declare stateRef: string | null;
  /** Display name as resolved by the source provider. */
  declare name: string | null;
  /** RFC 7946 geometry object (Polygon | MultiPolygon | Point). */
  declare geometry: unknown;
  /** [west, south, east, north] when known (null otherwise). */
  declare bbox: unknown | null;
  /** Provider that produced the geometry (e.g. 'nominatim'). */
  declare provider: string;
  /** Where it came from ('local' once cached, or the originating provider). */
  declare source: string;
  /** When the geometry was fetched/cached (for future TTL/refresh). */
  declare fetchedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initGeoShapeModels(sequelize: Sequelize): void {
  GeoShape.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      kind: { type: DataTypes.STRING, allowNull: false },
      ref: { type: DataTypes.STRING, allowNull: false },
      countryCode: { type: DataTypes.STRING(2), allowNull: true, field: 'country_code' },
      stateRef: { type: DataTypes.STRING, allowNull: true, field: 'state_ref' },
      name: { type: DataTypes.STRING, allowNull: true },
      geometry: { type: DataTypes.JSONB, allowNull: false },
      bbox: { type: DataTypes.JSONB, allowNull: true },
      provider: { type: DataTypes.STRING, allowNull: false },
      source: { type: DataTypes.STRING, allowNull: false },
      fetchedAt: { type: DataTypes.DATE, allowNull: true, field: 'fetched_at' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'GeoShape',
      tableName: 'geo_shapes',
      underscored: true,
      indexes: [
        { unique: true, fields: ['kind', 'ref', 'country_code'], name: 'geo_shapes_kind_ref_country_uniq' },
        { fields: ['kind'] },
      ],
    },
  );
}
