import { casualtyIlfRatingStrategy } from './strategies';
import { parseIlfCurve, lookupIlf } from './ilf';
import { selectModelStrategy, selectRatingStrategy } from '../registry/strategy';

/**
 * Slice 5.3 — casualty ILF strategy + curve math (DB-free) + registry wiring.
 *
 * Hand-verified ILF example (the load-bearing known answer):
 *   curve: basis 1M, points (1M→1.0)(2M→1.5)(5M→2.2)(10M→2.8), linear
 *   expectedLoss 100,000, targetLossRatio 0.70 (loss-ratio build-up):
 *     base premium = 100,000 / 0.70                = 142,857.142857…
 *     ILF(2M) / ILF(1M) = 1.5 / 1.0               = 1.5
 *     technical premium = 142,857.142857 × 1.5     = 214,285.714286…
 */

const CURVE = {
  basisLimit: 1_000_000,
  interpolation: 'linear' as const,
  points: [
    { limit: 1_000_000, factor: 1.0 },
    { limit: 2_000_000, factor: 1.5 },
    { limit: 5_000_000, factor: 2.2 },
    { limit: 10_000_000, factor: 2.8 },
  ],
};

describe('registry wiring', () => {
  it('selectRatingStrategy resolves casualty_ilf to the real strategy', () => {
    expect(selectRatingStrategy('casualty_ilf').method).toBe('casualty_ilf');
  });
  it('unknown rating method still falls back to the generic default (unchanged)', () => {
    expect(selectRatingStrategy('nope').method).toBe('generic_loss_ratio');
  });
  it('generic + parametric model/rating strategies are unchanged', () => {
    expect(selectModelStrategy('generic_burning_cost').method).toBe('generic_burning_cost');
    expect(selectRatingStrategy('generic_loss_ratio').method).toBe('generic_loss_ratio');
    expect(selectRatingStrategy('parametric_premium').method).toBe('parametric_premium');
  });
});

describe('parseIlfCurve', () => {
  it('parses a valid curve and sorts points ascending', () => {
    const curve = parseIlfCurve({
      basisLimit: 1_000_000,
      points: [
        { limit: 5_000_000, factor: 2.2 },
        { limit: 1_000_000, factor: 1.0 },
        { limit: 2_000_000, factor: 1.5 },
      ],
    });
    expect(curve).not.toBeNull();
    expect(curve!.points.map((p) => p.limit)).toEqual([1_000_000, 2_000_000, 5_000_000]);
  });
  it('rejects a malformed / empty curve (returns null, no fabrication)', () => {
    expect(parseIlfCurve(null)).toBeNull();
    expect(parseIlfCurve({})).toBeNull();
    expect(parseIlfCurve({ basisLimit: 1_000_000, points: [] })).toBeNull();
    expect(parseIlfCurve({ basisLimit: -1, points: [{ limit: 1, factor: 1 }] })).toBeNull();
  });
});

describe('lookupIlf', () => {
  const curve = parseIlfCurve(CURVE)!;

  it('returns 1.0 at the basis limit by construction', () => {
    const r = lookupIlf(curve, 1_000_000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.factor).toBeCloseTo(1.0, 10);
      expect(r.method).toBe('exact');
    }
  });
  it('exact tabulated point (2M → 1.5)', () => {
    const r = lookupIlf(curve, 2_000_000);
    expect(r.ok && r.factor).toBeCloseTo(1.5, 10);
  });
  it('interpolates linearly (3M → 1.5 + (1/3)*0.7 = 1.733333)', () => {
    const r = lookupIlf(curve, 3_000_000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.factor).toBeCloseTo(1.5 + (1 / 3) * 0.7, 6);
      expect(r.method).toBe('interpolated');
    }
  });
  it('clamps below the smallest point', () => {
    const r = lookupIlf(curve, 500_000);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.method).toBe('clamped_low');
  });
  it('clamps above the largest point', () => {
    const r = lookupIlf(curve, 50_000_000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.factor).toBeCloseTo(2.8, 10);
      expect(r.method).toBe('clamped_high');
    }
  });
  it('no curve or no limit ⇒ not ok', () => {
    expect(lookupIlf(null, 2_000_000).ok).toBe(false);
    expect(lookupIlf(curve, null).ok).toBe(false);
  });
});

describe('casualtyIlfRatingStrategy', () => {
  it('hand-verified: 100k loss, LR 0.70, ILF(2M)=1.5 → premium 214,285.71', () => {
    const out = casualtyIlfRatingStrategy.price(
      {},
      { expectedLoss: 100_000, targetLossRatio: 0.7, limit: 2_000_000, ilf: CURVE },
    );
    expect(out.method).toBe('casualty_ilf');
    expect(out.technicalPremium).not.toBeNull();
    expect(out.technicalPremium!).toBeCloseTo((100_000 / 0.7) * 1.5, 2);
    const d = out.detail as Record<string, unknown>;
    expect(d.ilfApplied).toBe(true);
    expect(d.ilfFactor).toBeCloseTo(1.5, 10);
    expect(d.buildUp).toBe('loss_ratio');
    // ROL = premium / limit ; LOL = expectedLoss / limit
    expect(d.lossOnLine as number).toBeCloseTo(100_000 / 2_000_000, 10);
    expect(d.rateOnLine as number).toBeCloseTo(((100_000 / 0.7) * 1.5) / 2_000_000, 8);
  });

  it('load build-up: expense+margin present → base = loss/(1-exp-margin), then ILF', () => {
    // loadFactor = 1 - 0.30 - 0.10 = 0.60 ; base = 100000/0.60 = 166,666.6667
    // ILF(1M) = 1.0 → premium = base
    const out = casualtyIlfRatingStrategy.price(
      {},
      { expectedLoss: 100_000, expenseRatio: 0.3, marginTarget: 0.1, limit: 1_000_000, ilf: CURVE },
    );
    expect(out.technicalPremium!).toBeCloseTo(100_000 / 0.6, 2);
    expect((out.detail as any).buildUp).toBe('load_buildup');
    expect((out.detail as any).ilfFactor).toBeCloseTo(1.0, 10);
  });

  it('DEGRADE: no ILF curve → plain loss-ratio premium, ilfApplied=false', () => {
    const out = casualtyIlfRatingStrategy.price({}, { expectedLoss: 100_000, targetLossRatio: 0.7 });
    expect(out.technicalPremium!).toBeCloseTo(100_000 / 0.7, 2);
    const d = out.detail as Record<string, unknown>;
    expect(d.ilfApplied).toBe(false);
    expect(d.ilfFactor).toBeNull();
    expect((d.flags as string[]).some((f) => f.startsWith('ilf:degraded'))).toBe(true);
  });

  it('DEGRADE: ILF curve present but no limit → plain loss-ratio, ilfApplied=false', () => {
    const out = casualtyIlfRatingStrategy.price({}, { expectedLoss: 100_000, targetLossRatio: 0.7, ilf: CURVE });
    expect(out.technicalPremium!).toBeCloseTo(100_000 / 0.7, 2);
    expect((out.detail as any).ilfApplied).toBe(false);
    expect((out.detail as any).ilfReason).toBe('no_coverage_limit');
  });

  it('no expected loss → null premium, never fabricated', () => {
    const out = casualtyIlfRatingStrategy.price({}, { targetLossRatio: 0.7, limit: 2_000_000, ilf: CURVE });
    expect(out.technicalPremium).toBeNull();
    expect((out.detail as any).ilfApplied).toBe(false);
  });
});
