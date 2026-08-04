/**
 * Canonical registry of pipeline operations (modules) and the idempotent process
 * that populates `pipelineOperationCatalogs`.
 *
 * SINGLE SOURCE OF TRUTH: lifecycle-stage operations are derived from the central
 * stage registry, while this module owns only their catalog-specific metadata.
 * `syncPipelineOperationCatalog()` registers any operation missing from the
 * catalog table, so the persisted backend catalog is initialized at startup.
 *
 * EXTEND, DON'T REPLACE: the sync is purely ADDITIVE — it inserts missing
 * operations and never updates or deletes existing catalog rows.
 */
import { PipelineOperationCatalog, OrganizationPipelineConfigOperation } from '../../../db/models';
import { PIPELINE_STAGE_DEFINITIONS, type PipelineStageDefinition } from '../stages/registry';

export type OperationDefinition = {
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

type OperationSeed = Pick<OperationDefinition, 'operationKey' | 'stageName' | 'displayName' | 'description' | 'category'> &
  Partial<Pick<OperationDefinition, 'defaultEnabled' | 'canDisable' | 'configSchemaJson'>>;

type StageOperationOptions = Pick<OperationSeed, 'category' | 'canDisable'>;

const STAGE_OPERATION_OPTIONS: Readonly<Record<string, StageOperationOptions>> = {
  ingestion: { category: 'intake', canDisable: false },
  ocr: { category: 'extraction' },
  submissionType: { category: 'extraction' },
  classification: { category: 'extraction' },
  assignment: { category: 'workflow' },
  extraction: { category: 'extraction' },
  insuredSubject: { category: 'extraction' },
  locationDiscovery: { category: 'extraction' },
  normalization: { category: 'extraction', canDisable: false },
  validation: { category: 'underwriting', canDisable: false },
  schemaGeneration: { category: 'underwriting' },
  preRating: { category: 'underwriting' },
  capacity: { category: 'underwriting' },
  oracleAttestation: { category: 'governance' },
  workflow: { category: 'workflow', canDisable: false },
  riskCompute: { category: 'pricing' },
  preBindCompliance: { category: 'governance', canDisable: false },
};

function operationForStage(stage: PipelineStageDefinition): OperationSeed {
  const options = STAGE_OPERATION_OPTIONS[stage.key];
  if (!options) throw new Error(`Missing operation catalog metadata for pipeline stage: ${stage.key}`);
  return {
    operationKey: stage.key,
    stageName: stage.key,
    displayName: stage.label,
    description: stage.description,
    ...options,
  };
}

const STAGE_OPERATIONS = PIPELINE_STAGE_DEFINITIONS.map(operationForStage);

// Stage operations are generated from the registry above. These two transport /
// utility operations intentionally remain catalog-only because they are not board
// lanes or executable lifecycle stages.
const OPERATIONS: ReadonlyArray<OperationSeed> = [
  STAGE_OPERATIONS[0],
  { operationKey: 'ingestion-amqp', stageName: 'ingestion-amqp', displayName: 'Ingestion (AMQP)', description: 'Consume submissions from the AMQP/RabbitMQ transport.', category: 'intake' },
  ...STAGE_OPERATIONS.slice(1),
  { operationKey: 'storageSearch', stageName: 'storageSearch', displayName: 'Storage Search', description: 'Search archived pipeline artifacts.', category: 'archive' },
];

export const PIPELINE_OPERATION_DEFINITIONS: OperationDefinition[] = OPERATIONS.map((op, index) => ({
  ...op,
  defaultOrder: (index + 1) * 10,
  defaultEnabled: op.defaultEnabled ?? true,
  canDisable: op.canDisable ?? true,
  configSchemaJson: op.configSchemaJson ?? {},
}));

/** Ordered operation keys — the execution order derives from this. */
export const PIPELINE_OPERATION_KEYS: string[] = PIPELINE_OPERATION_DEFINITIONS.map((d) => d.operationKey);

/**
 * Pure: definitions whose operationKey is NOT already in the catalog. Unit-testable
 * without a database.
 */
export function diffMissingOperations(
  existingKeys: Iterable<string>,
  defs: OperationDefinition[] = PIPELINE_OPERATION_DEFINITIONS,
): OperationDefinition[] {
  const have = new Set(existingKeys);
  return defs.filter((d) => !have.has(d.operationKey));
}

export type CatalogRow = { id: number; operationKey: string };

/**
 * Pure: of the catalog rows, which stale (non-canonical) ones are safe to prune.
 * A row is prunable iff its operationKey is NOT a canonical operation AND it is not
 * referenced by any org pipeline config. Referenced stale rows are KEPT (reported).
 * Canonical rows are never touched.
 */
export function decideStalePrunable(
  rows: CatalogRow[],
  referencedIds: Iterable<number>,
  canonicalKeys: Iterable<string> = PIPELINE_OPERATION_KEYS,
): { prune: CatalogRow[]; keptReferenced: CatalogRow[] } {
  const canon = new Set(canonicalKeys);
  const refd = new Set(referencedIds);
  const stale = rows.filter((r) => !canon.has(r.operationKey));
  return {
    prune: stale.filter((r) => !refd.has(r.id)),
    keptReferenced: stale.filter((r) => refd.has(r.id)),
  };
}

export type CatalogSyncResult = {
  added: string[];
  existing: string[];
  pruned: string[];
  keptReferenced: string[];
};

/**
 * Registry process — idempotent reconcile of `pipelineOperationCatalogs` against the
 * canonical operation set:
 *  - ADD any canonical operation missing from the table.
 *  - PRUNE stale (non-canonical) rows that are NOT referenced by any org pipeline
 *    config. Referenced stale rows are kept (and reported). Canonical rows are never
 *    deleted. Safe to run on every boot, in every environment (reference data).
 */
export async function syncPipelineOperationCatalog(): Promise<CatalogSyncResult> {
  const rows = await PipelineOperationCatalog.findAll({ attributes: ['id', 'operationKey'] });
  const existingKeys = rows.map((r) => r.operationKey);

  // ADD missing canonical operations.
  const missing = diffMissingOperations(existingKeys);
  if (missing.length > 0) {
    await PipelineOperationCatalog.bulkCreate(missing.map((d) => ({ ...d })));
  }

  // PRUNE stale, unreferenced rows (hard guard: never delete a referenced row).
  const refs = await OrganizationPipelineConfigOperation.findAll({ attributes: ['operationCatalogId'] });
  const referencedIds = refs.map((r) => r.operationCatalogId);
  const { prune, keptReferenced } = decideStalePrunable(
    rows.map((r) => ({ id: r.id, operationKey: r.operationKey })),
    referencedIds,
  );
  if (prune.length > 0) {
    await PipelineOperationCatalog.destroy({ where: { id: prune.map((p) => p.id) } });
  }

  return {
    added: missing.map((d) => d.operationKey),
    existing: existingKeys,
    pruned: prune.map((p) => p.operationKey),
    keptReferenced: keptReferenced.map((p) => p.operationKey),
  };
}
