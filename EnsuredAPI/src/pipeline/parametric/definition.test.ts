import {
  assembleParametricSpec,
  computeParametricExpectedLoss,
  normalizeExceedancePoints,
} from './definition';

/**
 * Slice 5.1 — parametric expected-loss math (DB-free, hand-verified).
 */

describe('normalizeExceedancePoints', () => {
  it('resolves AEP from returnPeriodYears (1/T) and sorts ascending', () => {
    const r = normalizeExceedancePoints([
      { indexValue: 160, returnPeriodYears: 100 }, // AEP 0.01
      { indexValue: 130, returnPeriodYears: 20 }, // AEP 0.05
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.points[0].indexValue).toBe(130);
      expect(r.points[0].annualExceedanceProbability).toBeCloseTo(0.05, 10);
      expect(r.points[1].annualExceedanceProbability).toBeCloseTo(0.01, 10);
    }
  });

  it('rejects empty, out-of-range AEP, duplicates, and non-monotonic curves', () => {
    expect(normalizeExceedancePoints([]).ok).toBe(false);
    expect(normalizeExceedancePoints([{ indexValue: 1, annualExceedanceProbability: 0 }]).ok).toBe(false);
    expect(normalizeExceedancePoints([{ indexValue: 1, annualExceedanceProbability: 1.5 }]).ok).toBe(false);
    expect(
      normalizeExceedancePoints([
        { indexValue: 10, annualExceedanceProbability: 0.1 },
        { indexValue: 10, annualExceedanceProbability: 0.05 },
      ]).ok,
    ).toBe(false);
    // higher index value with a HIGHER AEP is non-physical.
    expect(
      normalizeExceedancePoints([
        { indexValue: 10, annualExceedanceProbability: 0.01 },
        { indexValue: 20, annualExceedanceProbability: 0.05 },
      ]).ok,
    ).toBe(false);
  });
});

describe('computeParametricExpectedLoss — binary trigger', () => {
  it('expectedLoss = AEP × payout(threshold)', () => {
    // Binary: a single point. AEP 0.02, fixed payout = limit (1,000,000).
    const r = computeParametricExpectedLoss({
      indexName: 'rain',
      payoutFormula: 'limit',
      limit: 1_000_000,
      probabilitySource: 'Structurer-cited NOAA AEP curve, return period 50yr',
      exceedancePoints: [{ indexValue: 200, annualExceedanceProbability: 0.02 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 0.02 × 1,000,000 = 20,000.
      expect(r.expectedLoss).toBeCloseTo(20_000, 6);
      expect(r.bands).toHaveLength(1);
      expect(r.bands[0].marginalProb).toBeCloseTo(0.02, 10);
      expect(r.bands[0].payout).toBe(1_000_000);
    }
  });
});

describe('computeParametricExpectedLoss — graduated multi-band (hand-verified)', () => {
  it('Σ marginalProb × payout with the canonical wind formula', () => {
    // payout = min(limit, (wind-130)*125000), limit = 5,000,000.
    //
    // Points (ascending index, AEP non-increasing):
    //   wind 140, AEP 0.05    payout = min(5e6, 10*125000) = 1,250,000
    //   wind 160, AEP 0.02    payout = min(5e6, 30*125000) = 3,750,000
    //   wind 200, AEP 0.005   payout = min(5e6, 70*125000=8.75e6) = 5,000,000 (capped)
    //
    // marginal:
    //   band1 = 0.05 - 0.02  = 0.03   → 0.03  * 1,250,000 = 37,500
    //   band2 = 0.02 - 0.005 = 0.015  → 0.015 * 3,750,000 = 56,250
    //   band3 = 0.005 (tail)          → 0.005 * 5,000,000 = 25,000
    //   total = 37,500 + 56,250 + 25,000 = 118,750
    const r = computeParametricExpectedLoss({
      indexName: 'wind',
      payoutFormula: 'min(limit,(wind-130)*125000)',
      limit: 5_000_000,
      probabilitySource: 'Structurer-cited HURDAT2 wind exceedance curve, 2024',
      exceedancePoints: [
        { indexValue: 140, annualExceedanceProbability: 0.05 },
        { indexValue: 160, annualExceedanceProbability: 0.02 },
        { indexValue: 200, annualExceedanceProbability: 0.005 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bands[0].marginalProb).toBeCloseTo(0.03, 10);
      expect(r.bands[0].payout).toBe(1_250_000);
      expect(r.bands[1].marginalProb).toBeCloseTo(0.015, 10);
      expect(r.bands[1].payout).toBe(3_750_000);
      expect(r.bands[2].marginalProb).toBeCloseTo(0.005, 10);
      expect(r.bands[2].payout).toBe(5_000_000); // capped at limit
      expect(r.expectedLoss).toBeCloseTo(118_750, 4);
      expect(r.probabilitySource).toMatch(/HURDAT2/);
      expect(r.indexName).toBe('wind');
    }
  });

  it('accepts returnPeriodYears mixed with AEP', () => {
    // wind 140 T=20 → AEP 0.05 ; wind 180 AEP 0.01. payout fixed = 100000.
    // marginal: band1 = 0.05-0.01 = 0.04 ; band2 = 0.01.
    // EL = 0.04*100000 + 0.01*100000 = 4000 + 1000 = 5000.
    const r = computeParametricExpectedLoss({
      indexName: 'wind',
      payoutFormula: '100000',
      probabilitySource: 'cited',
      exceedancePoints: [
        { indexValue: 140, returnPeriodYears: 20 },
        { indexValue: 180, annualExceedanceProbability: 0.01 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.expectedLoss).toBeCloseTo(5000, 6);
    }
  });
});

describe('computeParametricExpectedLoss — UNMODELABLE (honest null)', () => {
  it('no cited probability source ⇒ unmodelable', () => {
    const r = computeParametricExpectedLoss({
      indexName: 'wind',
      payoutFormula: 'limit',
      limit: 1_000_000,
      probabilitySource: '   ',
      exceedancePoints: [{ indexValue: 140, annualExceedanceProbability: 0.05 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('no_cited_probability_source');
    }
  });

  it('missing payout formula / index name / points ⇒ unmodelable', () => {
    expect(
      computeParametricExpectedLoss({
        indexName: 'wind',
        payoutFormula: '',
        probabilitySource: 'cited',
        exceedancePoints: [{ indexValue: 1, annualExceedanceProbability: 0.1 }],
      }).ok,
    ).toBe(false);
    expect(
      computeParametricExpectedLoss({
        indexName: '',
        payoutFormula: 'limit',
        probabilitySource: 'cited',
        exceedancePoints: [{ indexValue: 1, annualExceedanceProbability: 0.1 }],
      }).ok,
    ).toBe(false);
    expect(
      computeParametricExpectedLoss({
        indexName: 'wind',
        payoutFormula: 'limit',
        probabilitySource: 'cited',
        exceedancePoints: [],
      }).ok,
    ).toBe(false);
  });

  it('invalid/unsafe payout formula ⇒ unmodelable (never executes)', () => {
    const r = computeParametricExpectedLoss({
      indexName: 'wind',
      payoutFormula: 'eval("1")',
      probabilitySource: 'cited',
      exceedancePoints: [{ indexValue: 140, annualExceedanceProbability: 0.05 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/payout_formula_invalid/);
    }
  });
});

describe('assembleParametricSpec', () => {
  it('registry methodParams override canonical data key-by-key; limit falls back', () => {
    const spec = assembleParametricSpec(
      { indexName: 'wind', payoutFormula: 'limit', probabilitySource: 'data-cite' },
      { payoutFormula: 'min(limit,wind)' }, // override formula only
      2_000_000, // limit fallback
    );
    expect(spec.indexName).toBe('wind');
    expect(spec.payoutFormula).toBe('min(limit,wind)');
    expect(spec.probabilitySource).toBe('data-cite');
    expect(spec.limit).toBe(2_000_000);
  });

  it('tolerates garbage shapes', () => {
    const spec = assembleParametricSpec(null, 'not-an-object', null);
    expect(spec.indexName).toBeNull();
    expect(spec.payoutFormula).toBeNull();
    expect(spec.exceedancePoints).toBeNull();
  });
});
