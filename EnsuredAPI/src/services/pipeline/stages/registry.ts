/**
 * The single source of truth for pipeline stage identity, presentation, aliases,
 * and execution eligibility. Board queries, routing, subscriptions, and command
 * execution all derive their stage knowledge from this registry.
 */
export type PipelineStagePresentation = {
  key: string;
  label: string;
  accent: string;
  background: string;
  border: string;
  description: string;
  emptyState: string;
};

export type PipelineStageDefinition = PipelineStagePresentation & {
  eventStages: readonly string[];
  statuses: readonly string[];
  executable: boolean;
};

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

function defineStage(
  key: string,
  label: string,
  accent: string,
  eventStages: readonly string[],
  statuses: readonly string[],
  executable = true,
): PipelineStageDefinition {
  return {
    key,
    label,
    accent,
    background: withAlpha(accent, '1f'),
    border: withAlpha(accent, '47'),
    description: `${label} stage of the document pipeline.`,
    emptyState: `No submissions in ${label.toLowerCase()}.`,
    eventStages,
    statuses,
    executable,
  };
}

export const PIPELINE_STAGE_DEFINITIONS: readonly PipelineStageDefinition[] = [
  defineStage('ingestion', 'Ingestion', '#4edea3', ['received', 'ingestion', 'ingestion-amqp', 'amqp-consume', 'amqp-retry-dlq'], ['draft', 'submitted'], false),
  defineStage('ocr', 'OCR', '#4b8eff', ['ocr'], []),
  defineStage('submissionType', 'Submission Type', '#93c5fd', ['submission-type', 'submissiontype'], []),
  defineStage('classification', 'Line of Business', '#adc6ff', ['classification', 'line-of-business', 'lineofbusiness'], []),
  defineStage('assignment', 'Assignment', '#c3b5fd', ['assignment'], []),
  defineStage('extraction', 'Extraction', '#7dd3fc', ['extraction'], []),
  defineStage('insuredSubject', 'Insured Subjects', '#67e8f9', ['insured-subject', 'insuredsubject'], []),
  defineStage('locationDiscovery', 'Location Discovery', '#5eead4', ['location-discovery', 'locationdiscovery'], []),
  defineStage('normalization', 'Normalization', '#a7f3d0', ['normalization'], []),
  defineStage('validation', 'Validation', '#fbbf24', ['validation'], ['modeling']),
  defineStage('schemaGeneration', 'Schema Generation', '#f0abfc', ['schema-generation', 'schemageneration'], []),
  defineStage('preRating', 'Pre-Rating', '#a78bfa', ['pre-rating', 'prerating'], []),
  defineStage('capacity', 'Capacity Match', '#8b5cf6', ['capacity-match', 'capacity'], []),
  defineStage('oracleAttestation', 'Oracle Attestation', '#c084fc', ['oracle-attestation', 'oracleattestation'], []),
  defineStage('workflow', 'Workflow', '#c084fc', ['workflow', 'storage-search', 'storagesearch'], ['priced', 'approved']),
  defineStage('riskCompute', 'Pricing', '#f472b6', ['risk-compute', 'riskcompute'], []),
  defineStage('preBindCompliance', 'Pre-bind Compliance', '#f87171', ['pre-bind-compliance', 'prebindcompliance', 'compliance'], ['compliance']),
];

export const PIPELINE_STAGE_CATALOG: ReadonlyArray<{ key: string; label: string }> =
  PIPELINE_STAGE_DEFINITIONS.map((stage) => ({ key: stage.key, label: stage.label }));

export const DEFAULT_STAGE_KEY = PIPELINE_STAGE_DEFINITIONS[0].key;
export const FINAL_STAGE_KEY = PIPELINE_STAGE_DEFINITIONS[PIPELINE_STAGE_DEFINITIONS.length - 1].key;

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const stageByKey = new Map(PIPELINE_STAGE_DEFINITIONS.map((stage) => [stage.key, stage]));
const eventStageToKey = new Map<string, string>();
const statusToKey = new Map<string, string>();
for (const stage of PIPELINE_STAGE_DEFINITIONS) {
  eventStageToKey.set(normalizeToken(stage.key), stage.key);
  for (const alias of stage.eventStages) eventStageToKey.set(normalizeToken(alias), stage.key);
  for (const status of stage.statuses) statusToKey.set(normalizeToken(status), stage.key);
}

export function stageForKey(key: string | null | undefined): PipelineStageDefinition | null {
  return stageByKey.get(String(key ?? '')) ?? null;
}

export function stageKeyForEvent(value: string | null | undefined): string | null {
  return eventStageToKey.get(normalizeToken(String(value ?? ''))) ?? null;
}

export function resolveStageKey(eventStage: string | null | undefined, submissionStatus: string | null | undefined): string {
  return stageKeyForEvent(eventStage)
    ?? statusToKey.get(normalizeToken(String(submissionStatus ?? '')))
    ?? DEFAULT_STAGE_KEY;
}
