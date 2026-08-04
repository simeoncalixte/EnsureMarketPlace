import { PIPELINE_STAGE_CATALOG } from '../stages/registry';
import {
  CANONICAL_STAGE_ORDER,
  DEFAULT_ROUTE_KEY,
  PIPELINE_ROUTES,
  SHARED_PREFIX,
  applyEnabledOverride,
  isCanonicalSubsequence,
  nextStageKeyInRoute,
  prevStageKeyInRoute,
  routeForType,
} from './routes';

describe('routeForType', () => {
  it('returns the full default route for an unknown / null / empty type', () => {
    for (const code of [null, undefined, '', 'not_a_real_type']) {
      const route = routeForType(code);
      expect(route.routeKey).toBe(DEFAULT_ROUTE_KEY);
      expect(route.keys).toEqual([...CANONICAL_STAGE_ORDER]);
    }
  });

  it('new_business runs the full canonical path (legacy behaviour preserved)', () => {
    const route = routeForType('new_business');
    expect(route.routeKey).toBe('new_business');
    expect(route.keys).toEqual([...CANONICAL_STAGE_ORDER]);
  });

  it('endorsement runs the full path minus schema generation', () => {
    const route = routeForType('endorsement');
    expect(route.keys).not.toContain('schemaGeneration');
    // everything else stays, in order
    expect(route.keys).toEqual(CANONICAL_STAGE_ORDER.filter((k) => k !== 'schemaGeneration'));
  });

  it('cancellation skips classification / appetite / pricing / schema / workflow', () => {
    const route = routeForType('cancellation');
    expect(route.keys).toEqual([
      'ingestion',
      'ocr',
      'submissionType',
      'extraction',
      'normalization',
      'preBindCompliance',
    ]);
  });

  it('claim structures the loss data and stops before underwriting', () => {
    const route = routeForType('claim');
    expect(route.keys).toEqual([
      'ingestion',
      'ocr',
      'submissionType',
      'extraction',
      'insuredSubject',
      'locationDiscovery',
      'normalization',
    ]);
    expect(route.keys).not.toContain('riskCompute');
    expect(route.keys).not.toContain('preBindCompliance');
  });

  it('inquiry is triage-only (just the shared prefix)', () => {
    expect(routeForType('inquiry').keys).toEqual([...SHARED_PREFIX]);
  });

  it('returns a fresh array (callers cannot mutate the registry)', () => {
    const a = routeForType('claim').keys;
    a.push('mutated');
    expect(routeForType('claim').keys).not.toContain('mutated');
  });
});

describe('route invariants (every registered route)', () => {
  const entries = Object.entries(PIPELINE_ROUTES);

  it.each(entries)('%s is a subsequence of the canonical order', (_code, keys) => {
    expect(isCanonicalSubsequence(keys)).toBe(true);
  });

  it.each(entries)('%s begins with the shared prefix', (_code, keys) => {
    expect(keys.slice(0, SHARED_PREFIX.length)).toEqual([...SHARED_PREFIX]);
  });

  it.each(entries)('%s references only known stage keys', (_code, keys) => {
    for (const key of keys) expect(CANONICAL_STAGE_ORDER).toContain(key);
  });
});

describe('nextStageKeyInRoute', () => {
  it('advances down the default route', () => {
    const { keys } = routeForType('new_business');
    expect(nextStageKeyInRoute(keys, 'ocr')).toBe('submissionType');
    expect(nextStageKeyInRoute(keys, 'submissionType')).toBe('classification');
    expect(nextStageKeyInRoute(keys, 'riskCompute')).toBe('preBindCompliance');
  });

  it('returns null at the end of the route', () => {
    const { keys } = routeForType('new_business');
    expect(nextStageKeyInRoute(keys, 'preBindCompliance')).toBeNull();
    expect(nextStageKeyInRoute(routeForType('inquiry').keys, 'submissionType')).toBeNull();
  });

  it('skips a trimmed stage: endorsement goes validation → pre-rating (no schemaGeneration)', () => {
    const { keys } = routeForType('endorsement');
    expect(nextStageKeyInRoute(keys, 'validation')).toBe('preRating');
  });

  it('still advances forward when the current stage was trimmed out of the route', () => {
    // A submission re-typed to "cancellation" while sitting on 'classification'
    // (not in the cancellation route) must still move forward, not stall.
    const { keys } = routeForType('cancellation');
    expect(nextStageKeyInRoute(keys, 'classification')).toBe('extraction');
  });
});

describe('prevStageKeyInRoute', () => {
  it('returns the prior stage in the route', () => {
    const { keys } = routeForType('new_business');
    expect(prevStageKeyInRoute(keys, 'classification')).toBe('submissionType');
    // endorsement has no schemaGeneration, so workflow follows the separate
    // pre-rating/capacity/oracle stages.
    expect(prevStageKeyInRoute(routeForType('endorsement').keys, 'workflow')).toBe('oracleAttestation');
  });

  it('falls back to the target itself when it is first in the route', () => {
    const { keys } = routeForType('new_business');
    expect(prevStageKeyInRoute(keys, 'ingestion')).toBe('ingestion');
  });
});

describe('applyEnabledOverride', () => {
  it('drops disabled stages', () => {
    const { keys } = routeForType('new_business');
    const result = applyEnabledOverride(keys, ['schemaGeneration', 'riskCompute']);
    expect(result).not.toContain('schemaGeneration');
    expect(result).not.toContain('riskCompute');
    expect(result).toContain('validation');
  });

  it('never drops a protected (shared-prefix) stage', () => {
    const { keys } = routeForType('new_business');
    const result = applyEnabledOverride(keys, ['ocr', 'submissionType', 'classification']);
    expect(result).toContain('ocr');
    expect(result).toContain('submissionType');
    expect(result).not.toContain('classification');
  });
});

describe('drift guard: routing canonical order mirrors the board', () => {
  it('CANONICAL_STAGE_ORDER equals the stage registry catalog keys', () => {
    expect([...CANONICAL_STAGE_ORDER]).toEqual(PIPELINE_STAGE_CATALOG.map((s) => s.key));
  });
});
