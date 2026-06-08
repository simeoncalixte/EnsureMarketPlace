import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export const riskClassRegistryStatuses = ['active', 'inactive'] as const;

export type RiskClassRegistryStatus = (typeof riskClassRegistryStatuses)[number];

/**
 * Slice 2 — the Risk Class Registry.
 *
 * Binds a behavior declaration (risk-modeling method, rating method, appetite
 * dimensions, required canonical data fields, default method params) to a
 * line-of-business taxonomy code, **per org**, as data — never code. Engines look
 * the method strings up in a strategy registry; they never branch on a known line.
 *
 * Rows with `organizationId = null` are **platform defaults**. The resolver
 * (`src/pipeline/registry/resolve.ts`) walks the specificity ladder
 * org+subtype → org+primary → platform+subtype → platform+primary → generic
 * default, so a brand-new risk class always resolves to a usable strategy.
 *
 * Additive only: this is a brand-new table; it does not alter any existing model.
 */
export class RiskClassRegistry extends Model<
  InferAttributes<RiskClassRegistry>,
  InferCreationAttributes<RiskClassRegistry>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  declare lineOfBusinessCode: string;
  declare lineOfBusinessSubTypeCode: string;
  declare activeSchemaVersionId: number | null;
  declare riskModelingMethod: string | null;
  declare ratingMethod: string | null;
  declare appetiteDimensionsJson: CreationOptional<Record<string, unknown>>;
  declare requiredDataFieldsJson: CreationOptional<string[]>;
  declare methodParamsJson: CreationOptional<Record<string, unknown>>;
  declare status: CreationOptional<RiskClassRegistryStatus>;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initRiskClassRegistryModels(sequelize: Sequelize): void {
  RiskClassRegistry.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false },
      lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
      activeSchemaVersionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'risk_class_schema_versions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      riskModelingMethod: { type: DataTypes.STRING, allowNull: true },
      ratingMethod: { type: DataTypes.STRING, allowNull: true },
      appetiteDimensionsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      requiredDataFieldsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      methodParamsJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
        validate: { isIn: [riskClassRegistryStatuses] },
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'RiskClassRegistry',
      tableName: 'risk_class_registry',
      // camelCase columns (repo default) — matches the migration. See the matching
      // note in riskClassSchema.models.ts; underscored:true broke sync + queries.
      underscored: false,
      indexes: [
        {
          unique: true,
          name: 'risk_class_registry_scope_unique',
          fields: ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode'],
        },
        {
          name: 'risk_class_registry_scope_status_idx',
          fields: ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'status'],
        },
      ],
    },
  );
}
