/**
 * Canonical registry of pipeline operations (modules) and the idempotent process
 * that populates `pipelineOperationCatalogs`.
 *
 * SINGLE SOURCE OF TRUTH: this ordered list defines every pipeline operation. The
 * execution order (routes/pipelineProcesses) imports `PIPELINE_OPERATION_KEYS`
 * from here, and `syncPipelineOperationCatalog()` registers any operation missing
 * from the catalog table. Add a module here once and it is wired everywhere — this
 * is what prevents new modules (e.g. `riskCompute`) from going unregistered.
 *
 * EXTEND, DON'T REPLACE: the sync is purely ADDITIVE — it inserts missing
 * operations and never updates or deletes existing catalog rows.
 */
import { PipelineOperationCatalog, OrganizationPipelineConfigOperation } from '../../db/models';

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

// Ordered canonical operations. `defaultOrder` is derived from position below.
const OPERATIONS: ReadonlyArray<OperationSeed> = [
  { operationKey: 'ingestion', stageName: 'ingestion', displayName: 'Ingestion', description: 'Receive an inbound submission and open the pipeline run.', category: 'intake', canDisable: false },
  { operationKey: 'ingestion-amqp', stageName: 'ingestion-amqp', displayName: 'Ingestion (AMQP)', description: 'Consume submissions from the AMQP/RabbitMQ transport.', category: 'intake' },
  { operationKey: 'ocr', stageName: 'ocr', displayName: 'OCR', description: 'Extract text from uploaded documents.', category: 'extraction' },
  { operationKey: 'submissionType', stageName: 'submissionType', displayName: 'Submission Type', description: 'Determine the submission/transaction type (new business, renewal, endorsement, claim, cancellation, treaty/facultative reinsurance).', category: 'extraction' },
  { operationKey: 'classification', stageName: 'classification', displayName: 'Line of Business', description: 'Determine the submission’s line of business.', category: 'extraction' },
  { operationKey: 'assignment', stageName: 'assignment', displayName: 'Assignment', description: 'Assign the submission to a department, team, and person based on the staff role that owns its transaction type.', category: 'workflow' },
  { operationKey: 'extraction', stageName: 'extraction', displayName: 'Extraction', description: 'Extract structured fields from documents.', category: 'extraction' },
  { operationKey: 'insuredSubject', stageName: 'insuredSubject', displayName: 'Insured Subjects', description: 'Enumerate the insured subject(s) and extract every key-value pair relative to each (SOV, address, TIV, construction).', category: 'extraction' },
  { operationKey: 'locationDiscovery', stageName: 'locationDiscovery', displayName: 'Location Discovery', description: 'Geocode and normalize a location for each insured subject (open-source Nominatim, premium Google).', category: 'extraction' },
  { operationKey: 'normalization', stageName: 'normalization', displayName: 'Normalization', description: 'Canonicalize extracted fields into the submission schema.', category: 'extraction', canDisable: false },
  { operationKey: 'validation', stageName: 'validation', displayName: 'Validation & Appetite', description: 'Run scrub, schema validation, and underwriting appetite.', category: 'underwriting', canDisable: false },
  { operationKey: 'schemaGeneration', stageName: 'schemaGeneration', displayName: 'Schema Generation', description: 'Generate/tailor the dynamic submission schema.', category: 'underwriting' },
  { operationKey: 'preRating', stageName: 'preRating', displayName: 'Pre-Rating', description: 'Heuristic triage grade derived from the appetite decision.', category: 'underwriting' },
  { operationKey: 'capacity', stageName: 'capacity', displayName: 'Capacity Match', description: 'Route by the org-configured per-peril capacity and appetite.', category: 'underwriting' },
  { operationKey: 'oracleAttestation', stageName: 'oracleAttestation', displayName: 'Oracle Attestation', description: 'Check smart-contract / oracle readiness.', category: 'governance' },
  { operationKey: 'workflow', stageName: 'workflow', displayName: 'Rating & Workflow', description: 'Triage decision and workflow routing.', category: 'workflow', canDisable: false },
  { operationKey: 'riskCompute', stageName: 'riskCompute', displayName: 'Risk Compute (Pricing)', description: 'Resolve risk class, model loss, and compute price with provenance + confidence.', category: 'pricing' },
  { operationKey: 'preBindCompliance', stageName: 'preBindCompliance', displayName: 'Pre-bind Compliance', description: 'Sanctions/OFAC screening and carrier admitted-status before quote/bind; persists a ComplianceClearance the bind gate reads.', category: 'governance', canDisable: false },
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
