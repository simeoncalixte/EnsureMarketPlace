/**
 * Slice 5.2 — damage-curve interpolation / clamp / selection unit tests (DB-free).
 */

import {
  CITED_DEFAULT_DAMAGE_CURVE_SET,
  meanDamageRatio,
  parseDamageCurveSet,
  resolveCurveSet,
  selectCurve,
  type DamageCurveSet,
} from './damageCurves';

const SET = CITED_DEFAULT_DAMAGE_CURVE_SET;

describe('meanDamageRatio interpolation + clamp', () => {
  it('hits an exact wood-wind point (150 mph → 0.5)', () => {
    expect(meanDamageRatio('hurricane', 'wood', 'residential', 150, SET)).toBeCloseTo(0.5, 6);
  });
  it('linearly interpolates between wood-wind points (135 mph → 0.35)', () => {
    // points 120→0.2 and 150→0.5; midpoint-ish 135 → 0.2 + (15/30)*(0.3) = 0.35.
    expect(meanDamageRatio('hurricane', 'wood', null, 135, SET)).toBeCloseTo(0.35, 6);
  });
  it('clamps below the first point to the first MDR (0)', () => {
    expect(meanDamageRatio('hurricane', 'wood', null, 10, SET)).toBeCloseTo(0, 6);
  });
  it('clamps above the last point to the last MDR (1.0 for wood)', () => {
    expect(meanDamageRatio('hurricane', 'wood', null, 999, SET)).toBeCloseTo(1.0, 6);
  });
  it('returns null for a peril with no curve (defer, never 0)', () => {
    expect(meanDamageRatio('meteor', 'wood', null, 150, SET)).toBeNull();
  });
  it('returns null for a null/NaN intensity', () => {
    expect(meanDamageRatio('hurricane', 'wood', null, null, SET)).toBeNull();
    expect(meanDamageRatio('hurricane', 'wood', null, NaN, SET)).toBeNull();
  });
  it('masonry is less wind-vulnerable than wood at the same intensity', () => {
    const wood = meanDamageRatio('hurricane', 'wood', null, 150, SET)!;
    const masonry = meanDamageRatio('hurricane', 'masonry', null, 150, SET)!;
    expect(masonry).toBeLessThan(wood);
  });
  it('earthquake: unreinforced masonry is worse than steel at the same PGA', () => {
    const masonry = meanDamageRatio('earthquake', 'masonry', null, 0.5, SET)!;
    const steel = meanDamageRatio('earthquake', 'steel', null, 0.5, SET)!; // steel → wildcard
    expect(masonry).toBeGreaterThan(steel);
  });
});

describe('selectCurve specificity', () => {
  it('falls back to the construction wildcard when no occupancy-specific curve', () => {
    const c = selectCurve('hurricane', 'steel', 'industrial', SET);
    expect(c).not.toBeNull();
    expect(c!.peril).toBe('hurricane');
  });
  it('returns null for an unknown peril', () => {
    expect(selectCurve('volcano', 'wood', null, SET)).toBeNull();
  });
});

describe('parseDamageCurveSet / resolveCurveSet override', () => {
  it('parses a valid override curve set', () => {
    const override = {
      setName: 'org_custom',
      source: 'licensed vendor curve (org)',
      curves: [
        {
          peril: 'flood',
          construction: 'concrete',
          occupancy: 'commercial',
          source: 'org flood depth-damage',
          points: [
            { intensity: 0, mdr: 0 },
            { intensity: 5, mdr: 0.5 },
            { intensity: 10, mdr: 0.9 },
          ],
        },
      ],
    };
    const parsed = parseDamageCurveSet(override) as DamageCurveSet;
    expect(parsed).not.toBeNull();
    expect(parsed.setName).toBe('org_custom');
    expect(meanDamageRatio('flood', 'concrete', 'commercial', 5, parsed)).toBeCloseTo(0.5, 6);
  });
  it('rejects garbage and resolves to the cited default', () => {
    expect(parseDamageCurveSet(null)).toBeNull();
    expect(parseDamageCurveSet({ curves: [] })).toBeNull();
    expect(parseDamageCurveSet({ curves: [{ peril: 'x' }] })).toBeNull();
    expect(resolveCurveSet({ nope: true }).setName).toBe(SET.setName);
  });
  it('every cited default curve carries a source citation', () => {
    for (const c of SET.curves) {
      expect(typeof c.source).toBe('string');
      expect(c.source.length).toBeGreaterThan(10);
    }
  });
});
