import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Configurable Home dashboards — persisted override tiers.
 *
 * A dashboard *surface* (e.g. `marketplace`, `insurer-analytics`) resolves its
 * effective layout through a three-tier cascade:
 *
 *   platform default (code)  <  org override  <  user override
 *
 * Only the org and user tiers are stored here; platform defaults live in code
 * (`services/dashboards/platformDefaults.ts`). Resolution is most-specific-wins
 * per surface (not a per-coordinate merge): a user row, if present, replaces the
 * org row, which replaces the platform default. "Reset" deletes the more-specific
 * row to fall back down the cascade.
 *
 * Rows are keyed uniquely by (surfaceKey, scope, organizationId, userId):
 *   - scope `org`:  organizationId set, userId null
 *   - scope `user`: organizationId set (denormalised), userId set
 */

export const dashboardLayoutScopes = ['org', 'user'] as const;
export type DashboardLayoutScope = (typeof dashboardLayoutScopes)[number];

export class DashboardLayout extends Model<
  InferAttributes<DashboardLayout>,
  InferCreationAttributes<DashboardLayout>
> {
  declare id: CreationOptional<number>;
  declare surfaceKey: string;
  declare scope: DashboardLayoutScope;
  declare organizationId: number | null;
  declare userId: number | null;
  /** The layout document: { surfaceKey, version, items: [{ widgetKey, x, y, w, h, settings? }] } */
  declare layout: Record<string, unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initDashboardLayoutModels(sequelize: Sequelize): void {
  DashboardLayout.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      surfaceKey: { type: DataTypes.STRING, allowNull: false, field: 'surface_key' },
      scope: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [dashboardLayoutScopes] },
      },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
      layout: { type: DataTypes.JSONB, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'DashboardLayout',
      tableName: 'dashboard_layouts',
      underscored: true,
      indexes: [
        {
          unique: true,
          name: 'uq_dashboard_layouts_scope',
          fields: ['surface_key', 'scope', 'organization_id', 'user_id'],
        },
      ],
    },
  );
}
