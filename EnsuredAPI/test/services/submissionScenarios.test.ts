import {
  assignScenarios,
  deriveScenarioMetadata,
  FULL_WORKFLOW_PATH,
  LOB_CATEGORIES,
  LOB_CATEGORY_ARCHETYPES,
  resolveScenario,
  SCENARIO_CATALOG,
  SCENARIO_KEYS,
  SCENARIO_WEIGHTS,
  type ExpectedOutcome,
  type Priority,
  type SlaClassification,
  type SubmissionScenarioKey,
  type UnderwriterType,
} from '../../src/services/submissionScenarios';
import { ARCHETYPE_CODES } from '../../src/services/submissionPackages';

// Pure scenario layer — no database, no clock, no RNG globals — so this suite
// runs anywhere and pins the behaviour the seed service relies on.

const PRIORITIES: Priority[] = ['low', 'standard', 'high', 'urgent'];
const SLA: SlaClassification[] = ['standard', 'expedited', 'extended', 'breached'];
const UW: UnderwriterType[] = ['junior', 'standard', 'senior', 'lead', 'specialist'];
const OUTCOMES: ExpectedOutcome[] = ['quoted', 'bound', 'declined', 'referred', 'awaiting_information'];

// Every token that can terminate a workflow path beyond the pipeline stages.
const TERMINALS = new Set<string>(['quoted', 'bound', 'declined', 'referred', 'awaiting_information']);
const STAGE_KEYS = new Set<string>(FULL_WORKFLOW_PATH);

describe('scenario catalog', () => {
  it('defines all 16 brief scenarios', () => {
    expect(SCENARIO_KEYS).toHaveLength(16);
    expect(SCENARIO_CATALOG).toHaveLength(16);
    expect(new Set(SCENARIO_KEYS).size).toBe(16);
  });

  it('gives every scenario complete, valid metadata and at least one variant', () => {
    for (const entry of SCENARIO_CATALOG) {
      expect(entry.label).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.variants.length).toBeGreaterThan(0);
      for (const v of entry.variants) {
        expect(v.value).toMatch(/^[a-z0-9_]+$/);
        expect(v.label).toBeTruthy();
      }
      expect(PRIORITIES).toContain(entry.priority);
      expect(SLA).toContain(entry.slaClassification);
      expect(UW).toContain(entry.underwriterType);
      expect(OUTCOMES).toContain(entry.outcome);
    }
  });

  it('maps every LOB family to real, existing archetype codes', () => {
    const known = new Set(ARCHETYPE_CODES);
    for (const family of LOB_CATEGORIES) {
      const codes = LOB_CATEGORY_ARCHETYPES[family];
      expect(codes.length).toBeGreaterThan(0);
      for (const code of codes) expect(known.has(code)).toBe(true);
    }
  });
});

describe('deriveScenarioMetadata / resolveScenario', () => {
  it('is deterministic in (scenario, seed)', () => {
    for (const key of SCENARIO_KEYS) {
      const a = resolveScenario(key, 123);
      const b = resolveScenario(key, 123);
      expect(a).toEqual(b);
    }
  });

  it('builds workflow paths from real pipeline stages plus a valid terminal token', () => {
    for (const key of SCENARIO_KEYS) {
      for (const seed of [0, 1, 7, 42, 99]) {
        const meta = deriveScenarioMetadata(key, seed);
        expect(meta.expectedWorkflowPath.length).toBeGreaterThan(1);
        const terminal = meta.expectedWorkflowPath[meta.expectedWorkflowPath.length - 1];
        expect(TERMINALS.has(terminal)).toBe(true);
        // Every non-terminal entry is a real pipeline stage key, in order.
        for (const stage of meta.expectedWorkflowPath.slice(0, -1)) {
          expect(STAGE_KEYS.has(stage)).toBe(true);
        }
        expect(meta.expectedWorkflowPath[0]).toBe('ingestion');
      }
    }
  });

  it('routes terminal scenarios to the right outcome token', () => {
    expect(deriveScenarioMetadata('declined', 3).expectedWorkflowPath).toContain('declined');
    expect(deriveScenarioMetadata('declined', 3).expectedWorkflowPath).not.toContain('preBindCompliance');
    expect(deriveScenarioMetadata('referred', 3).expectedWorkflowPath).toContain('referred');
    expect(deriveScenarioMetadata('incomplete', 3).expectedWorkflowPath).toContain('awaiting_information');
    // Happy paths run the full pipeline before binding/quoting.
    const renewal = deriveScenarioMetadata('renewal', 3).expectedWorkflowPath;
    expect(renewal).toContain('preBindCompliance');
    expect(renewal[renewal.length - 1]).toBe('bound');
  });

  it('marks SLA-breach submissions breached with a backdating directive', () => {
    for (const seed of [0, 5, 50, 500]) {
      const { metadata, directives } = resolveScenario('sla_breach', seed);
      expect(metadata.slaClassification).toBe('breached');
      expect(directives.receivedAtAgeDays).toBeGreaterThanOrEqual(10);
      expect(directives.receivedAtAgeDays).toBeLessThanOrEqual(21);
    }
  });

  it('resolves concrete archetype codes for every scenario', () => {
    const known = new Set(ARCHETYPE_CODES);
    for (const key of SCENARIO_KEYS) {
      for (const seed of [0, 1, 13, 64]) {
        const { directives } = resolveScenario(key, seed);
        expect(directives.archetypeCodes.length).toBeGreaterThan(0);
        for (const code of directives.archetypeCodes) expect(known.has(code)).toBe(true);
      }
    }
  });

  it('shapes multi-line scenarios as genuine multi-archetype bundles', () => {
    // Multi-LOB / Broker Package / Portfolio bundle 2+ distinct lines of business.
    for (const key of ['multi_lob', 'broker_package', 'portfolio'] as SubmissionScenarioKey[]) {
      let sawMultiple = false;
      for (let seed = 0; seed < 12; seed += 1) {
        const { directives } = resolveScenario(key, seed);
        if (directives.archetypeCodes.length >= 2) sawMultiple = true;
      }
      expect(sawMultiple).toBe(true);
    }
    // Single-LOB is always exactly one line.
    for (let seed = 0; seed < 12; seed += 1) {
      expect(resolveScenario('single_lob', seed).directives.archetypeCodes).toHaveLength(1);
    }
  });

  it('pins facultative / treaty scenarios to the matching reinsurance type', () => {
    expect(resolveScenario('facultative', 4).directives.reinsuranceType).toBe('facultative');
    expect(resolveScenario('treaty', 4).directives.reinsuranceType).toBe('treaty');
  });

  it('drops core documents for the Incomplete scenario', () => {
    for (let seed = 0; seed < 6; seed += 1) {
      const { directives } = resolveScenario('incomplete', seed);
      expect(directives.dropCategories?.length).toBeGreaterThan(0);
    }
  });

  it('raises complexity for catastrophe / large-capacity / portfolio scenarios', () => {
    expect(resolveScenario('catastrophe_exposed', 2).directives.complexityFloor).toBeGreaterThanOrEqual(7);
    expect(resolveScenario('large_capacity', 2).directives.complexityFloor).toBeGreaterThanOrEqual(8);
    expect(resolveScenario('portfolio', 2).directives.complexityFloor).toBeGreaterThanOrEqual(7);
  });

  it('throws on an unknown scenario key', () => {
    expect(() => resolveScenario('not_a_scenario' as SubmissionScenarioKey, 1)).toThrow(/Unknown submission scenario/);
  });
});

describe('assignScenarios', () => {
  it('returns an empty array for non-positive counts', () => {
    expect(assignScenarios(0)).toEqual([]);
    expect(assignScenarios(-5)).toEqual([]);
  });

  it('produces exactly `count` scenarios', () => {
    for (const count of [1, 2, 3, 8, 13, 50, 100]) {
      expect(assignScenarios(count)).toHaveLength(count);
    }
  });

  it('is deterministic', () => {
    expect(assignScenarios(40)).toEqual(assignScenarios(40));
  });

  it('only emits keys present in the weighted mix', () => {
    const mixKeys = new Set(SCENARIO_WEIGHTS.map((w) => w.key));
    for (const key of assignScenarios(100)) expect(mixKeys.has(key)).toBe(true);
  });

  it('approximates the brief distribution at scale (largest-remainder exact)', () => {
    const total = SCENARIO_WEIGHTS.reduce((s, w) => s + w.weight, 0);
    const n = 1000;
    const batch = assignScenarios(n);
    const counts = new Map<SubmissionScenarioKey, number>();
    for (const key of batch) counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const w of SCENARIO_WEIGHTS) {
      const expected = (n * w.weight) / total;
      // Largest-remainder allocation lands within one whole submission of ideal.
      expect(Math.abs((counts.get(w.key) ?? 0) - expected)).toBeLessThanOrEqual(1);
    }
    // The headline weights dominate the mix.
    expect(counts.get('renewal')!).toBeGreaterThan(counts.get('new_business')!);
    expect(counts.get('new_business')!).toBeGreaterThan(counts.get('multi_lob')!);
    expect(counts.get('sla_breach')!).toBeGreaterThan(0);
  });

  it('interleaves rather than clustering scenarios', () => {
    // The first handful of a weighted batch should not all be the same scenario.
    const head = assignScenarios(20).slice(0, 5);
    expect(new Set(head).size).toBeGreaterThan(1);
  });
});
