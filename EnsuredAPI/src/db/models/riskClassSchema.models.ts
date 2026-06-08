import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import type { PageTemplateDefinition } from './pageTemplates.models';

export const riskClassSchemaVersionStatuses = ['published', 'archived'] as const;

export type RiskClassSchemaVersionStatus = (typeof riskClassSchemaVersionStatuses)[number];

/**
 * Immutable, content-addressed compiled schema artifact.
 *
 * Authoring stays in `PageTemplate`; *publishing* a template version compiles it
 * into one of these rows. Submissions pin to a row here (never to a mutable
 * `PageTemplate`), so an org editing its schema never retroactively invalidates an
 * in-flight submission. `contentHash` makes publishing idempotent.
 */
export class RiskClassSchemaVersion extends Model<
  InferAttributes<RiskClassSchemaVersion>,
  InferCreationAttributes<RiskClassSchemaVersion>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  declare lineOfBusinessCode: string;
  declare lineOfBusinessSubTypeCode: string;
  declare pageKey: string;
  declare sourceTemplateId: number | null;
  declare schemaVersion: number;
  declare status: CreationOptional<RiskClassSchemaVersionStatus>;
  declare baseSchemaVersionId: number | null;
  declare definitionJson: PageTemplateDefinition;
  declare compiledJsonSchema: Record<string, unknown>;
  declare contentHash: string;
  declare publishedByUserId: number | null;
  declare publishedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initRiskClassSchemaModels(sequelize: Sequelize): void {
  RiskClassSchemaVersion.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
      lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
      pageKey: { type: DataTypes.STRING, allowNull: false },
      sourceTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'pageTemplates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      schemaVersion: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'published',
        validate: { isIn: [riskClassSchemaVersionStatuses] },
      },
      baseSchemaVersionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'risk_class_schema_versions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      definitionJson: { type: DataTypes.JSONB, allowNull: false },
      compiledJsonSchema: { type: DataTypes.JSONB, allowNull: false },
      contentHash: { type: DataTypes.STRING, allowNull: false },
      publishedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      publishedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'RiskClassSchemaVersion',
      tableName: 'risk_class_schema_versions',
      // camelCase columns (repo default) — matches the migration, which created
      // camelCase columns. underscored:true here caused a model/migration mismatch
      // that broke sync (index on snake_case cols) and dev/prod queries.
      underscored: false,
      indexes: [
        {
          unique: true,
          name: 'risk_class_schema_versions_scope_version_unique',
          fields: ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'pageKey', 'schemaVersion'],
        },
        {
          unique: true,
          name: 'risk_class_schema_versions_content_hash_unique',
          fields: ['organizationId', 'contentHash'],
        },
        {
          name: 'risk_class_schema_versions_scope_status_idx',
          fields: ['organizationId', 'lineOfBusinessCode', 'lineOfBusinessSubTypeCode', 'pageKey', 'status'],
        },
      ],
    },
  );
}
