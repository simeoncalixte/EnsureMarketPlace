import { blend, confidenceLabel, credibilityZ } from './credibility';
import {
  assembleParams,
  deriveReturnAndRisk,
  mapToPersistence,
} from './assemble';
import { selectPrior, type BenchmarkPriorRow } from '../benchmarkPriors/resolve';
import { decidePriorUpsert } from '../benchmarkPriors/upsert';
import type { ModelOutput, PricingOutput } from '../registry/types';

/**
 * DB-FREE unit tests for the Slice 5.0 credibility-weighted compute spine. None of
 * these touch Postgres — they exercise the pure credibility math, prior
 * specificity selection, params assembly (registry override), honest
 * return/risk derivation, and the strategy→persistence value mapping.
 */

const TENANT = 7;

function priorRow(overrides: Partial<BenchmarkPriorRow>): BenchmarkPriorRow {
  return {
    id: 1,
    organizationId: null,
    lineOfBusinessCode: 'property',
    lineOfBusinessSubTypeCode: '',
    exposureBasis: 'TIV',
    lossRate: 0.004,
    targetLossRatio: 0.6,
    expenseRatio: 0.28,
    marginTarget: 0.1,
    fullCredibilityStandard: 1082,
    paramsJson: {},
    source: 'NAIC aggregate',
    sourceUrl: null,
    asOfDate: '2024-12-31',
    status: 'active',
    ...overrides,
  };
}

describe('credibilityZ', () => {
  it('returns 0 when n <= 0 (no experience credible)', () => {
    expect(credibilityZ(0, 1082)).toBe(0);
    expect(credibilityZ(-5, 1082)).toBe(0);
  });

  it('returns 0 when nFull <= 0 or inputs non-finite', () => {
    expect(credibilityZ(100, 0)).toBe(0);
    expect(credibilityZ(100, -1)).toBe(0);
    expect(credibilityZ(NaN, 1082)).toBe(0);
    expect(credibilityZ(100, Infinity)).toBe(0);
  });

  it('returns 1 at full credibility (n >= nFull)', () => {
    expect(credibilityZ(1082, 1082)).toBe(1);
    expect(credibilityZ(5000, 1082)).toBe(1);
  });

  it('returns sqrt(n/nFull) for partial credibility', () => {
    expect(credibilityZ(271, 1084)).toBeCloseTo(0.5, 6); // sqrt(0.25) = 0.5
    expect(credibilityZ(100, 400)).toBeCloseTo(0.5, 6);
  });
});

describe('confidenceLabel', () => {
  it('labels Z < 0.2 as benchmark_low', () => {
    expect(confidenceLabel(0)).toBe('benchmark_low');
    expect(confidenceLabel(0.19)).toBe('benchmark_low');
  });

  it('labels 0.2..0.7 as developing', () => {
    expect(confidenceLabel(0.2)).toBe('developing');
    expect(confidenceLabel(0.5)).toBe('developing');
    expect(confidenceLabel(0.7)).toBe('developing');
  });

  it('labels Z > 0.7 as credible', () => {
    expect(confidenceLabel(0.71)).toBe('credible');
    expect(confidenceLabel(1)).toBe('credible');
  });
});

describe('blend — null handling and weighting', () => {
  it('experience null ⇒ returns the prior with Z forced to 0 (honest)', () => {
    const r = blend(null, 50_000, 0.9);
    expect(r.value).toBe(50_000);
    expect(r.z).toBe(0);
    expect(r.basis).toBe('prior_only');
    expect(r.confidenceLabel).toBe('benchmark_low');
  });

  it('prior null (experience present) ⇒ returns the experience alone', () => {
    const r = blend(80_000, null, 0.9);
    expect(r.value).toBe(80_000);
    expect(r.basis).toBe('experience_only');
  });

  it('both null ⇒ value null, Z 0, basis none', () => {
    const r = blend(null, null, 0.5);
    expect(r.value).toBeNull();
    expect(r.z).toBe(0);
    expect(r.basis).toBe('none');
  });

  it('both present ⇒ Z*experience + (1-Z)*prior', () => {
    const r = blend(100, 200, 0.25);
    expect(r.value).toBeCloseTo(0.25 * 100 + 0.75 * 200, 6); // 175
    expect(r.basis).toBe('blended');
  });

  it('clamps an out-of-range Z into [0,1]', () => {
    expect(blend(100, 200, 2).value).toBe(100); // Z clamped to 1
    expect(blend(100, 200, -1).value).toBe(200); // Z clamped to 0
  });

  it('Z=0 (today) ⇒ pure prior even with an experience value', () => {
    const r = blend(999, 50_000, 0);
    expect(r.value).toBe(50_000);
  });
});

describe('selectPrior — specificity ladder', () => {
  const orgSub = priorRow({ id: 10, organizationId: TENANT, lineOfBusinessSubTypeCode: 'property_catastrophe', source: 'org-sub' });
  const orgPrimary = priorRow({ id: 11, organizationId: TENANT, source: 'org-primary' });
  const platSub = priorRow({ id: 12, organizationId: null, lineOfBusinessSubTypeCode: 'property_catastrophe', source: 'plat-sub' });
  const platPrimary = priorRow({ id: 13, organizationId: null, source: 'plat-primary' });

  it('org+subtype wins when present', () => {
    const r = selectPrior([orgSub, orgPrimary, platSub, platPrimary], TENANT, 'property', 'property_catastrophe');
    expect(r.resolvedFrom).toBe('org_subtype');
    expect(r.prior?.id).toBe(10);
  });

  it('falls to org+primary when no org subtype', () => {
    const r = selectPrior([orgPrimary, platSub, platPrimary], TENANT, 'property', 'property_catastrophe');
    expect(r.resolvedFrom).toBe('org_primary');
    expect(r.prior?.id).toBe(11);
  });

  it('falls to platform+subtype, then platform+primary', () => {
    const subOnly = selectPrior([platSub, platPrimary], TENANT, 'property', 'property_catastrophe');
    expect(subOnly.resolvedFrom).toBe('platform_subtype');
    const primaryOnly = selectPrior([platPrimary], TENANT, 'property', 'property_catastrophe');
    expect(primaryOnly.resolvedFrom).toBe('platform_primary');
  });

  it('returns none when nothing matches', () => {
    const r = selectPrior([], TENANT, 'property', null);
    expect(r.resolvedFrom).toBe('none');
    expect(r.prior).toBeNull();
  });

  it('ignores inactive rows', () => {
    const inactive = priorRow({ id: 20, organizationId: TENANT, status: 'inactive' });
    const r = selectPrior([inactive, platPrimary], TENANT, 'property', null);
    expect(r.prior?.id).toBe(13); // skips inactive org row → platform primary
  });
});

describe('decidePriorUpsert', () => {
  it('updates the exact-scope match, else creates', () => {
    const rows = [{ id: 5, organizationId: TENANT, lineOfBusinessCode: 'property', lineOfBusinessSubTypeCode: '' }];
    expect(decidePriorUpsert(rows, TENANT, 'property', '')).toEqual({ action: 'update', updateId: 5 });
    expect(decidePriorUpsert(rows, TENANT, 'general_liability', '')).toEqual({ action: 'create' });
  });
});

describe('assembleParams — registry override beats prior', () => {
  it('seeds exposureBase from exposure and rates from the prior', () => {
    const params = assembleParams(priorRow({}), {}, { exposureBase: 1_000_000, exposureBasis: 'TIV' });
    expect(params.exposureBase).toBe(1_000_000);
    expect(params.lossRate).toBe(0.004);
    expect(params.targetLossRatio).toBe(0.6);
    expect(params.expenseRatio).toBe(0.28);
    expect(params.marginTarget).toBe(0.1);
    expect(params.exposureBasis).toBe('TIV');
  });

  it('registry methodParams override the prior values', () => {
    const params = assembleParams(
      priorRow({ lossRate: 0.004, targetLossRatio: 0.6 }),
      { lossRate: 0.01, targetLossRatio: 0.5, extra: 'kept' },
      { exposureBase: 1_000_000 },
    );
    expect(params.lossRate).toBe(0.01); // registry beats prior
    expect(params.targetLossRatio).toBe(0.5); // registry beats prior
    expect(params.extra).toBe('kept');
  });

  it('omits exposureBase when none is available (no fabricated number)', () => {
    const params = assembleParams(priorRow({}), {}, { exposureBase: null });
    expect(params.exposureBase).toBeUndefined();
  });

  it('handles a null prior gracefully', () => {
    const params = assembleParams(null, { lossRate: 0.02 }, { exposureBase: 500 });
    expect(params.exposureBase).toBe(500);
    expect(params.lossRate).toBe(0.02);
    expect(params.targetLossRatio).toBeUndefined();
  });
});

describe('deriveReturnAndRisk — honest, never constants', () => {
  it('expectedReturn = marginTarget when present', () => {
    const r = deriveReturnAndRisk(60_000, 100_000, { marginTarget: 0.1 });
    expect(r.expectedReturn).toBe(0.1);
    expect(r.expectedReturn).not.toBe(0.128); // never the old constant
  });

  it('expectedReturn null + flagged when no marginTarget', () => {
    const r = deriveReturnAndRisk(60_000, 100_000, {});
    expect(r.expectedReturn).toBeNull();
    expect(r.flags).toContain('expectedReturn:not_derived_no_margin_target');
  });

  it('riskScore is the implied loss ratio (clamped), not a constant', () => {
    const r = deriveReturnAndRisk(60_000, 100_000, { marginTarget: 0.1 });
    expect(r.riskScore).toBeCloseTo(0.6, 6);
    expect(r.riskScore).not.toBe(0.612); // never the old constant
  });

  it('riskScore clamps to 1 when loss exceeds premium', () => {
    const r = deriveReturnAndRisk(150_000, 100_000, {});
    expect(r.riskScore).toBe(1);
  });

  it('riskScore null + flagged when premium missing/zero', () => {
    const r = deriveReturnAndRisk(60_000, null, {});
    expect(r.riskScore).toBeNull();
    expect(r.flags).toContain('riskScore:not_derived_insufficient_inputs');
  });
});

describe('mapToPersistence — value mapping logic', () => {
  const model: ModelOutput = { method: 'generic_burning_cost', expectedLossCost: 4000, detail: {} };
  const pricing: PricingOutput = { method: 'generic_loss_ratio', technicalPremium: 6667, detail: {} };

  it('var99 is ALWAYS null (not modeled until cat engine)', () => {
    const m = mapToPersistence(model, pricing, blend(null, 4000, 0), 0.1, 0.6);
    expect(m.var99).toBeNull();
  });

  it('expectedLoss ← blended loss cost; premium ← technical premium', () => {
    const m = mapToPersistence(model, pricing, blend(null, 4000, 0), 0.1, 0.6);
    expect(m.expectedLoss).toBe('4000');
    expect(m.premium).toBe('6667');
    expect(m.riskMetricExpectedLoss).toBe('4000');
  });

  it('premium floors to "0" when the strategy could not derive one (NOT NULL column)', () => {
    const noPremium: PricingOutput = { method: 'generic_loss_ratio', technicalPremium: null, detail: {} };
    const m = mapToPersistence(model, noPremium, blend(null, 4000, 0), null, null);
    expect(m.premium).toBe('0');
  });

  it('expectedReturn/riskScore serialize as strings or null', () => {
    const m = mapToPersistence(model, pricing, blend(null, 4000, 0), 0.1, null);
    expect(m.expectedReturn).toBe('0.1');
    expect(m.riskScore).toBeNull();
  });

  it('expectedLoss null when blend produced no value', () => {
    const m = mapToPersistence(
      { method: 'generic_burning_cost', expectedLossCost: null, detail: {} },
      { method: 'generic_loss_ratio', technicalPremium: null, detail: {} },
      blend(null, null, 0),
      null,
      null,
    );
    expect(m.expectedLoss).toBeNull();
  });
});
