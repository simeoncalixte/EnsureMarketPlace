/**
 * Predefined **submission scenarios** for seeding.
 *
 * Seeded submissions used to be shapeless — a random line of business with a
 * complexity-driven document bundle and nothing telling you whether the thing in
 * front of you is a renewal, a referral, a declined risk or an SLA breach. That
 * made it hard to exercise workflow routing, reporting, assignment logic and
 * underwriting scenarios, because you couldn't ask the seed for "a referral that
 * exceeds authority" and get a submission that actually behaves like one.
 *
 * This module turns the 16 business scenarios from the brief into a first-class
 * seeding concept. Each scenario carries:
 *   - the metadata every seeded submission should be tagged with (Scenario,
 *     Line(s) of Business, Priority, Expected Workflow Path, Expected Final
 *     Outcome, Assigned Underwriter Type, SLA Classification); and
 *   - **directives** that shape the actual submission — which/how many lines of
 *     business it bundles, treaty vs facultative, which documents are missing,
 *     how cat-exposed it is, and how stale its received date is.
 *
 * Like {@link ./submissionPackages}, it is a **pure, dependency-free,
 * deterministic** module (no DB, no clock, no RNG globals): the same
 * `(scenarioKey, seed)` always yields the same metadata + directives, so it is
 * trivially unit-testable and reproducible.
 */

import {
  ARCHETYPE_CODES,
  ARCHETYPE_INFO,
  type ArchetypeInfo,
} from './submissionPackages';

// ---------------------------------------------------------------------------
// Public taxonomy
// ---------------------------------------------------------------------------

export type SubmissionScenarioKey =
  | 'single_lob'
  | 'multi_lob'
  | 'new_business'
  | 'renewal'
  | 'endorsement'
  | 'declined'
  | 'referred'
  | 'high_priority'
  | 'sla_breach'
  | 'incomplete'
  | 'catastrophe_exposed'
  | 'large_capacity'
  | 'broker_package'
  | 'facultative'
  | 'treaty'
  | 'portfolio';

export type Priority = 'low' | 'standard' | 'high' | 'urgent';
export type SlaClassification = 'standard' | 'expedited' | 'extended' | 'breached';
export type UnderwriterType = 'junior' | 'standard' | 'senior' | 'lead' | 'specialist';
export type ExpectedOutcome = 'quoted' | 'bound' | 'declined' | 'referred' | 'awaiting_information';

/** The six single-line-of-business families from the brief. */
export type LobCategory = 'property' | 'casualty' | 'marine' | 'energy' | 'aviation' | 'specialty';

/** Resolved, concrete instructions handed to {@link buildSubmissionPackage}. */
export interface ScenarioDirectives {
  /** Concrete archetype codes to bundle (1 = single LOB; 2+ = multi-LOB). */
  archetypeCodes: string[];
  /** Pin treaty/facultative when no explicit codes carry the type already. */
  reinsuranceType?: 'treaty' | 'facultative';
  /** Restrict perils (catastrophe-exposed scenarios). */
  perilFilter?: string[];
  /** Document categories to strip (Incomplete / Declined-incomplete). */
  dropCategories?: string[];
  /** Spread the bundle across distinct insureds (Broker Package / Portfolio). */
  multipleInsureds?: boolean;
  /** Raise complexity to at least this floor (cat / large-capacity / portfolio). */
  complexityFloor?: number;
  /** Backdate the received date this many days (SLA breach). */
  receivedAtAgeDays?: number;
}

/** Everything a seeded submission gets tagged with on its ingestion event. */
export interface ScenarioMetadata {
  scenario: SubmissionScenarioKey;
  scenarioLabel: string;
  /** Machine value of the chosen sub-variant (e.g. `appetite_mismatch`). */
  variant: string;
  /** Human label of the chosen sub-variant (e.g. `Appetite mismatch`). */
  variantLabel: string;
  priority: Priority;
  /** Ordered pipeline stage keys plus a terminal token (e.g. `…→ declined`). */
  expectedWorkflowPath: string[];
  expectedOutcome: ExpectedOutcome;
  underwriterType: UnderwriterType;
  slaClassification: SlaClassification;
}

/** A fully resolved scenario: what to tag, and how to shape the package. */
export interface ResolvedScenario {
  metadata: ScenarioMetadata;
  directives: ScenarioDirectives;
}

// ---------------------------------------------------------------------------
// Canonical pipeline path
// ---------------------------------------------------------------------------

/**
 * The ordered pipeline stage keys, used to build each scenario's expected
 * workflow path. The source of truth is `PIPELINE_STAGES` in
 * `pipeline/board/service.ts`; it is duplicated here (rather than imported) to
 * keep this module dependency-free — that service pulls in the DB models. A unit
 * test asserts this list equals `PIPELINE_STAGE_CATALOG` so it cannot drift.
 */
export const FULL_WORKFLOW_PATH = [
  'ingestion',
  'ocr',
  'classification',
  'extraction',
  'locationDiscovery',
  'normalization',
  'validation',
  'schemaGeneration',
  'workflow',
  'riskCompute',
  'preBindCompliance',
] as const;

/** Terminal tokens a workflow path can end on (beyond the pipeline stages). */
export type WorkflowTerminal = ExpectedOutcome;

/** Shape of a scenario's workflow path. */
type WorkflowShape = 'full' | 'declined' | 'referred' | 'incomplete';

function buildWorkflowPath(shape: WorkflowShape, outcome: ExpectedOutcome): string[] {
  const full = [...FULL_WORKFLOW_PATH];
  const throughValidation = full.slice(0, full.indexOf('validation') + 1);
  const throughWorkflow = full.slice(0, full.indexOf('workflow') + 1);
  switch (shape) {
    case 'declined':
      return [...throughValidation, 'declined'];
    case 'incomplete':
      return [...throughValidation, 'awaiting_information'];
    case 'referred':
      return [...throughWorkflow, 'referred'];
    case 'full':
    default:
      return [...full, outcome];
  }
}

// ---------------------------------------------------------------------------
// Line-of-business families → archetype codes
// ---------------------------------------------------------------------------

export const LOB_CATEGORIES: readonly LobCategory[] = [
  'property',
  'casualty',
  'marine',
  'energy',
  'aviation',
  'specialty',
];

/**
 * Bridges the brief's six single-LOB families to the existing package
 * archetypes (see {@link ARCHETYPE_INFO}). Every code here must be a real
 * archetype code — a unit test enforces it.
 */
export const LOB_CATEGORY_ARCHETYPES: Record<LobCategory, string[]> = {
  property: ['property_cat'],
  casualty: ['casualty_qs', 'workers_comp', 'financial_lines'],
  marine: ['marine_fac'],
  energy: ['energy_offshore'],
  aviation: ['aviation'],
  specialty: ['cyber_xol', 'political_violence', 'engineering_car', 'agriculture'],
};

// ---------------------------------------------------------------------------
// Deterministic, pure helpers (no Math.random / Date)
// ---------------------------------------------------------------------------

/** Small integer hash — stable across runs, used to pick deterministically. */
function hash32(n: number): number {
  let a = n >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  return (a ^ (a >>> 16)) >>> 0;
}

/** Deterministically pick an element of `arr` from `(seed, salt)`. */
function pickBy<T>(seed: number, salt: number, arr: readonly T[]): T {
  const h = hash32((seed >>> 0) ^ Math.imul(salt + 1, 0x9e3779b1));
  return arr[h % arr.length];
}

/** Deterministically pick `n` distinct elements of `arr` from `(seed, salt)`. */
function pickDistinct<T>(seed: number, salt: number, arr: readonly T[], n: number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i += 1) {
    const h = hash32((seed >>> 0) ^ Math.imul(salt + i + 1, 0x9e3779b1));
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}

/** One archetype code per family, chosen deterministically. */
function codeForFamily(family: LobCategory, seed: number, salt: number): string {
  return pickBy(seed, salt, LOB_CATEGORY_ARCHETYPES[family]);
}

/** Archetype codes whose reinsurance type matches, in catalog order. */
function codesByReinsuranceType(type: 'treaty' | 'facultative'): string[] {
  return ARCHETYPE_INFO.filter((a: ArchetypeInfo) => a.reinsuranceType === type).map((a) => a.code);
}

// ---------------------------------------------------------------------------
// Scenario catalog
// ---------------------------------------------------------------------------

interface ScenarioVariant {
  value: string;
  label: string;
}

interface ScenarioSpec {
  key: SubmissionScenarioKey;
  label: string;
  description: string;
  variants: ScenarioVariant[];
  priority: Priority;
  outcome: ExpectedOutcome;
  underwriterType: UnderwriterType;
  slaClassification: SlaClassification;
  workflow: WorkflowShape;
  /**
   * Resolve package directives for a chosen variant. `seed` keeps the selection
   * deterministic; the resolved `archetypeCodes` are always concrete.
   */
  directives: (variantValue: string, seed: number) => ScenarioDirectives;
}

/** Per-variant document categories to strip for the Incomplete scenario. */
const INCOMPLETE_DROPS: Record<string, string[]> = {
  missing_loss_runs: ['loss_run', 'claims_bordereau'],
  missing_exposure_schedules: ['statement_of_values', 'schedule_of_locations', 'exposure_data'],
  missing_financials: ['cedent_financials', 'rating_agency_report'],
};

/** Catastrophe-exposed peril filters per variant (mapped to catalog perils). */
const CAT_PERILS: Record<string, string[]> = {
  hurricane: ['hurricane', 'storm_surge', 'windstorm'],
  earthquake: ['earthquake'],
  flood: ['flood', 'storm_surge'],
  // No dedicated wildfire peril in the archetype catalog yet — the filter falls
  // back to the archetype's full peril list, but the scenario is still tagged.
  wildfire: ['fire'],
};

const SCENARIOS: ScenarioSpec[] = [
  {
    key: 'single_lob',
    label: 'Single Line of Business',
    description: 'A submission containing only one line of business.',
    variants: LOB_CATEGORIES.map((c) => ({ value: c, label: titleCase(c) })),
    priority: 'standard',
    outcome: 'quoted',
    underwriterType: 'standard',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (variant, seed) => ({
      archetypeCodes: [codeForFamily(variant as LobCategory, seed, 11)],
    }),
  },
  {
    key: 'multi_lob',
    label: 'Multi-Line of Business',
    description: 'A submission containing multiple lines of business under a single proposal.',
    variants: [
      { value: 'property_casualty', label: 'Property + Casualty' },
      { value: 'property_marine', label: 'Property + Marine' },
      { value: 'casualty_specialty', label: 'Casualty + Specialty' },
      { value: 'three_or_more', label: 'Three or more LOBs' },
    ],
    priority: 'high',
    outcome: 'quoted',
    underwriterType: 'senior',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (variant, seed) => {
      const families = multiLobFamilies(variant, seed);
      return { archetypeCodes: families.map((f, i) => codeForFamily(f, seed, 20 + i)) };
    },
  },
  {
    key: 'new_business',
    label: 'New Business',
    description: 'A first-time submission from a cedent or broker.',
    variants: [
      { value: 'no_prior_participation', label: 'No prior participation' },
      { value: 'full_underwriting_review', label: 'Full underwriting review required' },
    ],
    priority: 'standard',
    outcome: 'quoted',
    underwriterType: 'standard',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (_v, seed) => ({ archetypeCodes: [codeForFamily(anyFamily(seed, 31), seed, 32)] }),
  },
  {
    key: 'renewal',
    label: 'Renewal',
    description: 'A renewal of an existing treaty or facultative placement.',
    variants: [
      { value: 'prior_year_available', label: 'Prior year information available' },
      { value: 'expiring_terms_included', label: 'Expiring terms and pricing included' },
    ],
    priority: 'standard',
    outcome: 'bound',
    underwriterType: 'standard',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (_v, seed) => ({ archetypeCodes: [codeForFamily(anyFamily(seed, 41), seed, 42)] }),
  },
  {
    key: 'endorsement',
    label: 'Endorsement / Amendment',
    description: 'A modification to an existing contract.',
    variants: [
      { value: 'change_in_limits', label: 'Change in limits' },
      { value: 'change_in_retention', label: 'Change in retention' },
      { value: 'territory_change', label: 'Addition or removal of territories' },
      { value: 'coverage_modification', label: 'Coverage modifications' },
    ],
    priority: 'standard',
    outcome: 'bound',
    underwriterType: 'standard',
    slaClassification: 'expedited',
    workflow: 'full',
    directives: (_v, seed) => ({ archetypeCodes: [codeForFamily(anyFamily(seed, 51), seed, 52)] }),
  },
  {
    key: 'declined',
    label: 'Declined',
    description: 'A submission that is ultimately declined.',
    variants: [
      { value: 'appetite_mismatch', label: 'Appetite mismatch' },
      { value: 'capacity_constraints', label: 'Capacity constraints' },
      { value: 'incomplete_information', label: 'Incomplete information' },
    ],
    priority: 'low',
    outcome: 'declined',
    underwriterType: 'standard',
    slaClassification: 'standard',
    workflow: 'declined',
    directives: (variant, seed) => ({
      archetypeCodes: [codeForFamily(anyFamily(seed, 61), seed, 62)],
      // A decline for incomplete information is genuinely missing core documents.
      dropCategories:
        variant === 'incomplete_information'
          ? ['loss_run', 'statement_of_values', 'cedent_financials']
          : undefined,
    }),
  },
  {
    key: 'referred',
    label: 'Referred',
    description: 'A submission requiring escalation to leadership or senior underwriting.',
    variants: [
      { value: 'exceeds_authority', label: 'Exceeds authority limits' },
      { value: 'special_approval', label: 'Special approval required' },
      { value: 'high_cat_exposure', label: 'High catastrophe exposure' },
    ],
    priority: 'high',
    outcome: 'referred',
    underwriterType: 'lead',
    slaClassification: 'expedited',
    workflow: 'referred',
    directives: (variant, seed) => {
      if (variant === 'high_cat_exposure') {
        return {
          archetypeCodes: [codeForFamily(pickBy(seed, 71, ['property', 'energy'] as LobCategory[]), seed, 72)],
          perilFilter: CAT_PERILS.hurricane,
          complexityFloor: 7,
        };
      }
      return { archetypeCodes: [codeForFamily(anyFamily(seed, 73), seed, 74)], complexityFloor: 6 };
    },
  },
  {
    key: 'high_priority',
    label: 'High Priority',
    description: 'A submission requiring expedited review.',
    variants: [
      { value: 'broker_deadline', label: 'Broker deadline approaching' },
      { value: 'strategic_client', label: 'Strategic client' },
      { value: 'executive_attention', label: 'Executive attention required' },
    ],
    priority: 'urgent',
    outcome: 'quoted',
    underwriterType: 'senior',
    slaClassification: 'expedited',
    workflow: 'full',
    directives: (_v, seed) => ({ archetypeCodes: [codeForFamily(anyFamily(seed, 81), seed, 82)] }),
  },
  {
    key: 'sla_breach',
    label: 'Late / SLA Breach',
    description: 'A submission intentionally seeded to test SLA and workflow monitoring.',
    variants: [
      { value: 'missed_deadline', label: 'Missed review deadlines' },
      { value: 'escalation_triggered', label: 'Escalation triggers' },
    ],
    priority: 'high',
    outcome: 'quoted',
    underwriterType: 'standard',
    slaClassification: 'breached',
    workflow: 'full',
    directives: (_v, seed) => ({
      archetypeCodes: [codeForFamily(anyFamily(seed, 91), seed, 92)],
      // Received well in the past so the card lands overdue against any SLA window.
      receivedAtAgeDays: 10 + (hash32((seed >>> 0) ^ 0x51a) % 12),
    }),
  },
  {
    key: 'incomplete',
    label: 'Incomplete',
    description: 'A submission missing required documentation or data.',
    variants: [
      { value: 'missing_loss_runs', label: 'Missing loss runs' },
      { value: 'missing_exposure_schedules', label: 'Missing exposure schedules' },
      { value: 'missing_financials', label: 'Missing financial information' },
    ],
    priority: 'standard',
    outcome: 'awaiting_information',
    underwriterType: 'junior',
    slaClassification: 'extended',
    workflow: 'incomplete',
    directives: (variant, seed) => ({
      archetypeCodes: [codeForFamily(anyFamily(seed, 101), seed, 102)],
      dropCategories: INCOMPLETE_DROPS[variant] ?? INCOMPLETE_DROPS.missing_loss_runs,
    }),
  },
  {
    key: 'catastrophe_exposed',
    label: 'Catastrophe Exposed',
    description: 'A submission with significant catastrophe exposure.',
    variants: [
      { value: 'hurricane', label: 'Hurricane' },
      { value: 'earthquake', label: 'Earthquake' },
      { value: 'flood', label: 'Flood' },
      { value: 'wildfire', label: 'Wildfire' },
    ],
    priority: 'high',
    outcome: 'quoted',
    underwriterType: 'specialist',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (variant, seed) => ({
      archetypeCodes: [codeForFamily(pickBy(seed, 111, ['property', 'energy'] as LobCategory[]), seed, 112)],
      perilFilter: CAT_PERILS[variant] ?? CAT_PERILS.hurricane,
      complexityFloor: 7,
    }),
  },
  {
    key: 'large_capacity',
    label: 'Large Capacity',
    description: 'A submission requesting capacity above standard authority thresholds.',
    variants: [
      { value: 'leadership_review', label: 'Leadership review required' },
      { value: 'multiple_approval_levels', label: 'Multiple approval levels' },
    ],
    priority: 'high',
    outcome: 'referred',
    underwriterType: 'lead',
    slaClassification: 'expedited',
    workflow: 'referred',
    directives: (_v, seed) => ({
      archetypeCodes: [codeForFamily(anyFamily(seed, 121), seed, 122)],
      complexityFloor: 8,
    }),
  },
  {
    key: 'broker_package',
    label: 'Broker Package',
    description: 'Multiple risks submitted together by a broker as a package.',
    variants: [
      { value: 'multiple_insureds', label: 'Multiple insureds' },
      { value: 'multiple_territories', label: 'Multiple territories' },
      { value: 'multiple_lobs', label: 'Multiple LOBs' },
    ],
    priority: 'high',
    outcome: 'quoted',
    underwriterType: 'senior',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (_v, seed) => {
      const families = pickDistinct(seed, 131, LOB_CATEGORIES, 2 + (hash32((seed >>> 0) ^ 0x13) % 2));
      return {
        archetypeCodes: families.map((f, i) => codeForFamily(f, seed, 132 + i)),
        multipleInsureds: true,
      };
    },
  },
  {
    key: 'facultative',
    label: 'Facultative',
    description: 'A risk-specific facultative placement.',
    variants: [
      { value: 'single_risk', label: 'Single risk' },
      { value: 'individual_assessment', label: 'Individual underwriting assessment' },
    ],
    priority: 'standard',
    outcome: 'quoted',
    underwriterType: 'standard',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (_v, seed) => {
      const pool = codesByReinsuranceType('facultative');
      return { archetypeCodes: [pickBy(seed, 141, pool)], reinsuranceType: 'facultative' };
    },
  },
  {
    key: 'treaty',
    label: 'Treaty',
    description: 'A treaty reinsurance opportunity.',
    variants: [
      { value: 'quota_share', label: 'Quota Share' },
      { value: 'surplus_share', label: 'Surplus Share' },
      { value: 'excess_of_loss', label: 'Excess of Loss' },
      { value: 'stop_loss', label: 'Stop Loss' },
      { value: 'aggregate_excess', label: 'Aggregate Excess' },
    ],
    priority: 'standard',
    outcome: 'bound',
    underwriterType: 'senior',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (_v, seed) => {
      const pool = codesByReinsuranceType('treaty');
      return { archetypeCodes: [pickBy(seed, 151, pool)], reinsuranceType: 'treaty' };
    },
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    description: 'A portfolio or book transfer opportunity.',
    variants: [
      { value: 'multiple_treaties', label: 'Multiple treaties' },
      { value: 'multiple_years', label: 'Multiple years' },
      { value: 'runoff', label: 'Runoff portfolios' },
    ],
    priority: 'high',
    outcome: 'quoted',
    underwriterType: 'lead',
    slaClassification: 'standard',
    workflow: 'full',
    directives: (_v, seed) => {
      const families = pickDistinct(seed, 161, LOB_CATEGORIES, 3 + (hash32((seed >>> 0) ^ 0x16) % 2));
      return {
        archetypeCodes: families.map((f, i) => codeForFamily(f, seed, 162 + i)),
        multipleInsureds: true,
        complexityFloor: 7,
      };
    },
  },
];

const SCENARIO_BY_KEY = new Map<SubmissionScenarioKey, ScenarioSpec>(SCENARIOS.map((s) => [s.key, s]));

/** All scenario keys, in catalog order. */
export const SCENARIO_KEYS: readonly SubmissionScenarioKey[] = SCENARIOS.map((s) => s.key);

/** Public, metadata-only catalog (no resolver functions) for UIs/docs. */
export const SCENARIO_CATALOG: ReadonlyArray<{
  key: SubmissionScenarioKey;
  label: string;
  description: string;
  variants: ScenarioVariant[];
  priority: Priority;
  outcome: ExpectedOutcome;
  underwriterType: UnderwriterType;
  slaClassification: SlaClassification;
}> = SCENARIOS.map((s) => ({
  key: s.key,
  label: s.label,
  description: s.description,
  variants: s.variants,
  priority: s.priority,
  outcome: s.outcome,
  underwriterType: s.underwriterType,
  slaClassification: s.slaClassification,
}));

// ---------------------------------------------------------------------------
// Scenario-shape helpers
// ---------------------------------------------------------------------------

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Pick any of the six LOB families deterministically. */
function anyFamily(seed: number, salt: number): LobCategory {
  return pickBy(seed, salt, LOB_CATEGORIES);
}

/** Resolve the LOB families for a Multi-LOB variant. */
function multiLobFamilies(variant: string, seed: number): LobCategory[] {
  switch (variant) {
    case 'property_casualty':
      return ['property', 'casualty'];
    case 'property_marine':
      return ['property', 'marine'];
    case 'casualty_specialty':
      return ['casualty', 'specialty'];
    case 'three_or_more':
    default:
      return pickDistinct(seed, 25, LOB_CATEGORIES, 3 + (hash32((seed >>> 0) ^ 0x2b) % 2));
  }
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a scenario for a given `seed` into its tag metadata and the directives
 * that shape its document package. The chosen sub-variant is deterministic in
 * `seed`, so the metadata and the package stay in agreement.
 */
export function resolveScenario(scenarioKey: SubmissionScenarioKey, seed: number): ResolvedScenario {
  const spec = SCENARIO_BY_KEY.get(scenarioKey);
  if (!spec) {
    throw new Error(`Unknown submission scenario: ${scenarioKey}`);
  }
  const variant = pickBy(seed, 7, spec.variants);
  const metadata: ScenarioMetadata = {
    scenario: spec.key,
    scenarioLabel: spec.label,
    variant: variant.value,
    variantLabel: variant.label,
    priority: spec.priority,
    expectedWorkflowPath: buildWorkflowPath(spec.workflow, spec.outcome),
    expectedOutcome: spec.outcome,
    underwriterType: spec.underwriterType,
    slaClassification: spec.slaClassification,
  };
  const directives = spec.directives(variant.value, seed);
  return { metadata, directives };
}

/** Just the metadata for a scenario/seed (the directives are recomputed). */
export function deriveScenarioMetadata(scenarioKey: SubmissionScenarioKey, seed: number): ScenarioMetadata {
  return resolveScenario(scenarioKey, seed).metadata;
}

// ---------------------------------------------------------------------------
// Weighted batch allocation
// ---------------------------------------------------------------------------

export interface ScenarioWeight {
  key: SubmissionScenarioKey;
  weight: number;
}

/**
 * The default seeding mix (per the brief). Weights are relative; they need not
 * sum to 100 but here they do, and {@link assignScenarios} normalises regardless.
 */
export const SCENARIO_WEIGHTS: ScenarioWeight[] = [
  { key: 'renewal', weight: 30 },
  { key: 'new_business', weight: 25 },
  { key: 'multi_lob', weight: 15 },
  { key: 'facultative', weight: 10 },
  { key: 'treaty', weight: 10 },
  { key: 'referred', weight: 5 },
  { key: 'declined', weight: 3 },
  { key: 'sla_breach', weight: 2 },
];

/**
 * Allocate `count` scenarios across a weighted mix, exact to the count via
 * largest-remainder (the same technique `assignComplexities` uses for an exact
 * mean), then interleave them round-robin so a seeded batch isn't clustered by
 * scenario. Deterministic: no RNG — identical inputs yield an identical sequence.
 */
export function assignScenarios(
  count: number,
  mix: ScenarioWeight[] = SCENARIO_WEIGHTS,
): SubmissionScenarioKey[] {
  if (count <= 0) return [];
  const usable = mix.filter((m) => m.weight > 0);
  if (usable.length === 0) return [];

  const total = usable.reduce((sum, m) => sum + m.weight, 0);
  const buckets = usable.map((m) => {
    const exact = (count * m.weight) / total;
    const base = Math.floor(exact);
    return { key: m.key, n: base, frac: exact - base };
  });

  let assigned = buckets.reduce((sum, b) => sum + b.n, 0);
  // Hand out the remaining slots to the largest fractional parts.
  const byFrac = [...buckets].sort((a, b) => b.frac - a.frac);
  for (let i = 0; assigned < count; i += 1, assigned += 1) {
    byFrac[i % byFrac.length].n += 1;
  }

  // Round-robin interleave so the board shows a varied mix rather than runs.
  const pools = buckets.filter((b) => b.n > 0).map((b) => ({ key: b.key, n: b.n }));
  const out: SubmissionScenarioKey[] = [];
  while (out.length < count) {
    let progressed = false;
    for (const pool of pools) {
      if (pool.n > 0) {
        out.push(pool.key);
        pool.n -= 1;
        progressed = true;
        if (out.length >= count) break;
      }
    }
    if (!progressed) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Internal consistency guard (cheap, runs at import)
// ---------------------------------------------------------------------------

// Surface a mapping typo immediately rather than as a confusing seed failure:
// every code a family maps to must be a real archetype code.
const KNOWN_CODES = new Set(ARCHETYPE_CODES);
for (const [family, codes] of Object.entries(LOB_CATEGORY_ARCHETYPES)) {
  for (const code of codes) {
    if (!KNOWN_CODES.has(code)) {
      throw new Error(`submissionScenarios: LOB family "${family}" maps to unknown archetype code "${code}"`);
    }
  }
}
