import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class PipelineOperationCatalog extends Model<InferAttributes<PipelineOperationCatalog>, InferCreationAttributes<PipelineOperationCatalog>> {
  declare id: CreationOptional<number>;
  declare operationKey: string;
  declare stageName: string;
  declare displayName: string;
  declare description: string;
  declare category: string;
  declare defaultOrder: number;
  declare defaultEnabled: boolean;
  declare canDisable: boolean;
  declare configSchemaJson: Record<string, unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class OrganizationPipelineConfig extends Model<InferAttributes<OrganizationPipelineConfig>, InferCreationAttributes<OrganizationPipelineConfig>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare name: string;
  declare description: string | null;
  declare status: string;
  declare isDefault: boolean;
  declare createdByUserId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class OrganizationPipelineConfigOperation extends Model<InferAttributes<OrganizationPipelineConfigOperation>, InferCreationAttributes<OrganizationPipelineConfigOperation>> {
  declare id: CreationOptional<number>;
  declare organizationPipelineConfigId: number;
  declare operationCatalogId: number;
  declare enabled: boolean;
  declare stageOrder: number;
  declare required: boolean;
  declare failBehavior: string;
  declare configJson: Record<string, unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class PipelineLifecycleSubscription extends Model<InferAttributes<PipelineLifecycleSubscription>, InferCreationAttributes<PipelineLifecycleSubscription>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare eventKey: string;
  declare process: string;
  declare stage: string;
  declare enabled: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initPipelineConfigModels(sequelize: Sequelize): void {
  PipelineOperationCatalog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      operationKey: { type: DataTypes.STRING, allowNull: false, unique: true },
      stageName: { type: DataTypes.STRING, allowNull: false },
      displayName: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: false },
      defaultOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      defaultEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      canDisable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      configSchemaJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'PipelineOperationCatalog', tableName: 'pipelineOperationCatalogs' },
  );

  OrganizationPipelineConfig.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'OrganizationPipelineConfig', tableName: 'organizationPipelineConfigs' },
  );

  OrganizationPipelineConfigOperation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationPipelineConfigId: { type: DataTypes.INTEGER, allowNull: false },
      operationCatalogId: { type: DataTypes.INTEGER, allowNull: false },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      stageOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      failBehavior: { type: DataTypes.STRING, allowNull: false, defaultValue: 'stop' },
      configJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'OrganizationPipelineConfigOperation',
      tableName: 'organizationPipelineConfigOperations',
    },
  );

  PipelineLifecycleSubscription.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: false },
      eventKey: { type: DataTypes.STRING, allowNull: false },
      process: { type: DataTypes.STRING, allowNull: false },
      stage: { type: DataTypes.STRING, allowNull: false },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'PipelineLifecycleSubscription',
      tableName: 'pipelineLifecycleSubscriptions',
      indexes: [
        { unique: true, fields: ['organizationId', 'eventKey'], name: 'uq_pipeline_lifecycle_subscriptions_org_event' },
        { fields: ['organizationId'], name: 'idx_pipeline_lifecycle_subscriptions_org' },
        { fields: ['eventKey'], name: 'idx_pipeline_lifecycle_subscriptions_event' },
      ],
    },
  );
}
