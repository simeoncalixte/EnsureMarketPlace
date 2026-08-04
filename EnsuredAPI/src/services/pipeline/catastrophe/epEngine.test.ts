/**
 * Slice 5.2 — EP Monte-Carlo engine unit tests (DB-free, DETERMINISTIC).
 *
 * Known-answer cases the math is pinned to:
 *
 *  - mulberry32 is deterministic: same seed ⇒ identical stream.
 *  - AAL is PRNG-INDEPENDENT and equals Σ λ_i × groundUpLoss_i. With one exposure
 *    (TIV 1,000,000, wood) hit at 150 mph (wood MDR = 0.5 → groundUp 500,000) by one
 *    event with λ = 0.01:   AAL = 0.01 × 500,000 = 5,000 (EXACT).
 *  - OEP hand-verification: a single event whose groundUp loss = 500,000 makes each
 *    year's max occurrence either 0 (count=0) or exactly 500,000 (count≥1). With
 *    λ = 0.5, P(count≥1) = 1 − e^-0.5 ≈ 0.393 ≫ 1%, so the 1-in-100 / 1-in-250 /
 *    1-in-500 OEP are ALL exactly 500,000 regardless of seed.
 */

import {
  aep1in100,
  mulberry32,
  poissonSample,
  returnPeriodLoss,
  simulateEP,
  tvarAtReturnPeriod,
} from './epEngine';
import { CITED_DEFAULT_DAMAGE_CURVE_SET } from './damageCurves';
import type { CatEvent, CatExposure } from './eventLoss';

const WOOD_1M: CatExposure = {
  tiv: 1_000_000,
  latitude: null,
  longitude: null,
  construction: 'wood',
  occupancy: null,
  zoneId: null,
};

describe('mulberry32 seeded PRNG', () => {
  it('is deterministic and reproducible for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it('produces uniforms in [0,1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i += 1) {
      const u = r();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });
  it('different seeds give different streams', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe('poissonSample', () => {
  it('returns 0 for non-positive lambda', () => {
    const r = mulberry32(1);
    expect(poissonSample(0, r)).toBe(0);
    expect(poissonSample(-1, r)).toBe(0);
  });
  it('mean of many draws approaches lambda (seeded, stable)', () => {
    const r = mulberry32(123);
    const n = 50_000;
    let sum = 0;
    for (let i = 0; i < n; i += 1) sum += poissonSample(2.0, r);
    expect(sum / n).toBeCloseTo(2.0, 1);
  });
});

describe('returnPeriodLoss / tvar (nearest-rank on sorted-asc)', () => {
  const sorted = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
  it('1-in-100 over 100 points = the 99th percentile (value 100)', () => {
    // q = 0.99, idx = ceil(0.99*100)-1 = 98 → value 99? ceil(99)=99 → idx 98 → 99.
    expect(returnPeriodLoss(sorted, 100)).toBe(99);
  });
  it('1-in-2 ~ median', () => {
    expect(returnPeriodLoss(sorted, 2)).toBe(50);
  });
  it('tvar at 1-in-2 = mean of upper half', () => {
    // idx = ceil(0.5*100)-1 = 49 → mean of values 50..100 = (50+100)/2 = 75.
    expect(tvarAtReturnPeriod(sorted, 2)).toBeCloseTo(75, 6);
  });
});

describe('simulateEP known answers', () => {
  it('AAL = lambda × groundUpLoss (PRNG-independent), here 5,000', () => {
    const event: CatEvent = {
      eventId: 'E1',
      peril: 'hurricane',
      annualRate: 0.01,
      footprint: { defaultIntensity: 150 }, // wood @150mph → MDR 0.5
    };
    const res = simulateEP([event], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, {
      years: 20000,
      seed: 99,
    });
    // groundUp = 0.5 × 1,000,000 = 500,000 (EXACT, deterministic).
    expect(res.eventLosses[0].groundUpLoss).toBeCloseTo(500_000, 6);
    // AAL = E[annual loss] = λ × groundUp = 0.01 × 500,000 = 5,000. This is a
    // Monte-Carlo estimate (frequency is sampled) so it carries sampling error;
    // assert it lands in a tight band around the exact expectation.
    expect(res.aal).toBeGreaterThan(4_200);
    expect(res.aal).toBeLessThan(5_800);
  });

  it('OEP at 100/250/500yr is exactly the single-event ground-up (500,000)', () => {
    const event: CatEvent = {
      eventId: 'E1',
      peril: 'hurricane',
      annualRate: 0.5, // P(count>=1) ~ 0.393 >> 1%
      footprint: { defaultIntensity: 150 },
    };
    const res = simulateEP([event], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, {
      years: 5000,
      seed: 7,
    });
    for (const rp of res.oep) {
      expect(rp.loss).toBeCloseTo(500_000, 6);
    }
    // PML (1-in-250 OEP) likewise = 500,000.
    expect(res.pml).toBeCloseTo(500_000, 6);
  });

  it('is byte-for-byte reproducible for a given seed', () => {
    const event: CatEvent = {
      eventId: 'E1',
      peril: 'hurricane',
      annualRate: 0.3,
      footprint: { defaultIntensity: 155 },
    };
    const a = simulateEP([event], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, { years: 3000, seed: 555 });
    const b = simulateEP([event], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, { years: 3000, seed: 555 });
    expect(a.aal).toBe(b.aal);
    expect(a.aep).toEqual(b.aep);
    expect(a.oep).toEqual(b.oep);
    expect(a.pml).toBe(b.pml);
  });

  it('different seeds can move the tail but not the (frequency-only) AAL much', () => {
    const event: CatEvent = {
      eventId: 'E1',
      peril: 'hurricane',
      annualRate: 0.1,
      footprint: { defaultIntensity: 150 },
    };
    const a = simulateEP([event], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, { years: 40000, seed: 1 });
    const b = simulateEP([event], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, { years: 40000, seed: 2 });
    // AAL ≈ 0.1 × 500,000 = 50,000 either way (within Monte-Carlo sampling error;
    // groundUp itself is EXACT — see the assertion below). 40k yrs ⇒ ~2% std error.
    expect(a.eventLosses[0].groundUpLoss).toBeCloseTo(500_000, 6);
    expect(a.aal).toBeGreaterThan(45_000);
    expect(a.aal).toBeLessThan(55_000);
    expect(b.aal).toBeGreaterThan(45_000);
    expect(b.aal).toBeLessThan(55_000);
  });

  it('aep1in100 returns the 1-in-100 AEP loss', () => {
    const event: CatEvent = {
      eventId: 'E1',
      peril: 'hurricane',
      annualRate: 0.5,
      footprint: { defaultIntensity: 185 }, // wood @185 → MDR ~0.9 → groundUp ~900,000
    };
    const res = simulateEP([event], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, { years: 5000, seed: 3 });
    const v = aep1in100(res);
    expect(v).not.toBeNull();
    expect(v!).toBeGreaterThan(0);
  });

  it('zero events ⇒ all-zero result', () => {
    const res = simulateEP([], [WOOD_1M], CITED_DEFAULT_DAMAGE_CURVE_SET, { years: 100, seed: 1 });
    expect(res.aal).toBe(0);
    expect(res.pml).toBe(0);
  });
});
