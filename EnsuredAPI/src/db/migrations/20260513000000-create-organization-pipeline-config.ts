import { DataTypes, QueryInterface, Transaction } from 'sequelize';

type PipelineOperationSeed = {
  operationKey: string;
  stageName: string;
  displayName: string;
  description: string;
  category: string;
  defaultOrder: number;
  defaultEnabled: boolean;
  canDisable: boolean;
  configSchemaJson: Record<string, unknown>;
};

const pipelineOperationSeeds: PipelineOperationSeed[] = [
  {
    operationKey: 'ingestion',
    stageName: 'ingestion',
    displayName: 'Ingestion',
    description: 'Collects and stages incoming submissions from enabled channels.',
    category: 'intake',
    defaultOrder: 10,
    defaultEnabled: true,
    canDisable: false,
    configSchemaJson: {},
  },
  {
    operationKey: 'classification',
    stageName: 'classification',
    displayName: 'Document Classification',
    description: 'Classifies submission documents to determine processing path.',
    category: 'preprocess',
    defaultOrder: 20,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {},
  },
  {
    operationKey: 'ocr_ner_extraction',
    stageName: 'ocr_extraction',
    displayName: 'OCR and Entity Extraction',
    description: 'Extracts contract entities such as limits, deductibles, and dates.',
    category: 'preprocess',
    defaultOrder: 30,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {},
  },
  {
    operationKey: 'normalization',
    stageName: 'normalization',
    displayName: 'Normalization',
    description: 'Normalizes extracted fields into canonical pipeline format.',
    category: 'preprocess',
    defaultOrder: 40,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {},
  },
  {
    operationKey: 'auto_scrub_validation',
    stageName: 'validation',
    displayName: 'Auto-Scrub and Validation',
    description: 'Validates data hygiene and flags submissions needing more information.',
    category: 'risk',
    defaultOrder: 50,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {
      thirdPartyApi: {
        endpointEnv: 'RISK_ENRICHMENT_API_URL',
      },
    },
  },
  {
    operationKey: 'pre_rating',
    stageName: 'pre_rating',
    displayName: 'Algorithmic Risk Grading',
    description: 'Calculates preliminary risk score and grade for priority routing.',
    category: 'risk',
    defaultOrder: 60,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {
      targetRiskTypesEnv: 'PIPELINE_TARGET_RISK_TYPES',
    },
  },
  {
    operationKey: 'oracle_attestation',
    stageName: 'oracle_attestation',
    displayName: 'Oracle Integration Check',
    description: 'Confirms trigger and source compatibility for smart contract settlement.',
    category: 'oracle',
    defaultOrder: 70,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {},
  },
  {
    operationKey: 'capacity_match',
    stageName: 'capacity_match',
    displayName: 'Capacity Match-Maker',
    description: 'Matches submissions with open capacity and appetite routing rules.',
    category: 'allocation',
    defaultOrder: 80,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {
      capacityByRiskEnv: 'PIPELINE_OPEN_CAPACITY_BY_RISK_JSON',
      totalCapacityEnv: 'PIPELINE_TOTAL_OPEN_CAPACITY',
    },
  },
  {
    operationKey: 'workflow_routing',
    stageName: 'workflow',
    displayName: 'Workflow Routing',
    description: 'Routes submissions to review queues and persists triage/workflow status.',
    category: 'workflow',
    defaultOrder: 90,
    defaultEnabled: true,
    canDisable: false,
    configSchemaJson: {},
  },
  {
    operationKey: 'storage_search',
    stageName: 'storage_search',
    displayName: 'Storage and Search Indexing',
    description: 'Stores canonical submission payload and search metadata.',
    category: 'postprocess',
    defaultOrder: 100,
    defaultEnabled: true,
    canDisable: true,
    configSchemaJson: {},
  },
];

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

function baseColumns() {
  return {
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    if (!(await tableExists(context, 'pipelineOperationCatalogs', transaction))) {
      await context.createTable(
        'pipelineOperationCatalogs',
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
          ...baseColumns(),
        },
        { transaction },
      );
    }

    if (!(await tableExists(context, 'organizationPipelineConfigs', transaction))) {
      await context.createTable(
        'organizationPipelineConfigs',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizations', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: { type: DataTypes.STRING, allowNull: false },
          description: { type: DataTypes.TEXT, allowNull: true },
          status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
          isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          createdByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          ...baseColumns(),
        },
        { transaction },
      );

      await context.addIndex('organizationPipelineConfigs', ['organizationId'], {
        name: 'idx_org_pipeline_configs_org',
        transaction,
      });
      await context.addIndex('organizationPipelineConfigs', ['organizationId', 'name'], {
        unique: true,
        name: 'uq_org_pipeline_configs_org_name',
        transaction,
      });
      await context.addIndex('organizationPipelineConfigs', ['organizationId', 'isDefault'], {
        name: 'idx_org_pipeline_configs_default',
        transaction,
      });
    }

    if (!(await tableExists(context, 'organizationPipelineConfigOperations', transaction))) {
      await context.createTable(
        'organizationPipelineConfigOperations',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          organizationPipelineConfigId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizationPipelineConfigs', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          operationCatalogId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'pipelineOperationCatalogs', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
          stageOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
          required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          failBehavior: { type: DataTypes.STRING, allowNull: false, defaultValue: 'stop' },
          configJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
          ...baseColumns(),
        },
        { transaction },
      );

      await context.addIndex('organizationPipelineConfigOperations', ['organizationPipelineConfigId'], {
        name: 'idx_org_pipeline_ops_config',
        transaction,
      });
      await context.addIndex('organizationPipelineConfigOperations', ['operationCatalogId'], {
        name: 'idx_org_pipeline_ops_catalog',
        transaction,
      });
      await context.addIndex('organizationPipelineConfigOperations', ['organizationPipelineConfigId', 'stageOrder'], {
        name: 'idx_org_pipeline_ops_order',
        transaction,
      });
      await context.addIndex('organizationPipelineConfigOperations', ['organizationPipelineConfigId', 'operationCatalogId'], {
        unique: true,
        name: 'uq_org_pipeline_ops_config_catalog',
        transaction,
      });
    }

    const now = new Date();
    await context.bulkInsert(
      'pipelineOperationCatalogs',
      pipelineOperationSeeds.map((operation) => ({
        operationKey: operation.operationKey,
        stageName: operation.stageName,
        displayName: operation.displayName,
        description: operation.description,
        category: operation.category,
        defaultOrder: operation.defaultOrder,
        defaultEnabled: operation.defaultEnabled,
        canDisable: operation.canDisable,
        configSchemaJson: JSON.stringify(operation.configSchemaJson),
        createdAt: now,
        updatedAt: now,
      })),
      {
        transaction,
        ignoreDuplicates: true,
      },
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
    if (await tableExists(context, 'organizationPipelineConfigOperations', transaction)) {
      await context.dropTable('organizationPipelineConfigOperations', { transaction });
    }

    if (await tableExists(context, 'organizationPipelineConfigs', transaction)) {
      await context.dropTable('organizationPipelineConfigs', { transaction });
    }

    if (await tableExists(context, 'pipelineOperationCatalogs', transaction)) {
      await context.dropTable('pipelineOperationCatalogs', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
