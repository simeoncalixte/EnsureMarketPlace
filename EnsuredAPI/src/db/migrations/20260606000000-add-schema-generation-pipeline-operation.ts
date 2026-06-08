import { QueryInterface, Transaction } from 'sequelize';

/**
 * Registers the "schema generation" pipeline stage in the operation catalog so it
 * appears in the organization pipeline-config UI between validation (order 50)
 * and pre-rating (order 60). Idempotent: the insert ignores duplicates and the
 * down migration removes only this row.
 */
const SCHEMA_GENERATION_OPERATION = {
  operationKey: 'schema_generation',
  stageName: 'schemaGeneration',
  displayName: 'Schema Generation',
  description: 'Generates a suggested, submission-specific coverage form (sections, fields, and a repeatable insured-subjects section) from the pipeline run.',
  category: 'preprocess',
  defaultOrder: 55,
  defaultEnabled: true,
  canDisable: true,
  configSchemaJson: {},
};

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : (value as { tableName: string }).tableName));
  return normalized.includes(tableName);
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, 'pipelineOperationCatalogs', transaction)) {
      const now = new Date();
      await context.bulkInsert(
        'pipelineOperationCatalogs',
        [
          {
            operationKey: SCHEMA_GENERATION_OPERATION.operationKey,
            stageName: SCHEMA_GENERATION_OPERATION.stageName,
            displayName: SCHEMA_GENERATION_OPERATION.displayName,
            description: SCHEMA_GENERATION_OPERATION.description,
            category: SCHEMA_GENERATION_OPERATION.category,
            defaultOrder: SCHEMA_GENERATION_OPERATION.defaultOrder,
            defaultEnabled: SCHEMA_GENERATION_OPERATION.defaultEnabled,
            canDisable: SCHEMA_GENERATION_OPERATION.canDisable,
            configSchemaJson: JSON.stringify(SCHEMA_GENERATION_OPERATION.configSchemaJson),
            createdAt: now,
            updatedAt: now,
          },
        ],
        { transaction, ignoreDuplicates: true },
      );
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, 'pipelineOperationCatalogs', transaction)) {
      await context.bulkDelete(
        'pipelineOperationCatalogs',
        { operationKey: SCHEMA_GENERATION_OPERATION.operationKey },
        { transaction },
      );
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
