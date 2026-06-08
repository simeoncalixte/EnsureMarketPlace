/**
 * Slice 5.2 — cat_exposure strategy (defer + modeled) + registry wiring + the pure
 * point-in-bbox / exposure-normalization helpers (DB-free).
 */

import { catExposureModelStrategy, CAT_MODELING_METHOD } from './strategies';
import { selectModelStrategy, selectRatingStrategy } from '../registry/strategy';
import { resolveCurveSet } from './damageCurves';
import { normalizeDataExposure, zoneForPoint } from './service';
import type { CatExposure } from './eventLoss';

const CURVE_SET = resolveCurveSet(undefined); // cited default

const woodExp = (overrides: Partial<CatExposure> = {}): CatExposure => ({
  tiv: 1_000_000,
  latitude: 25.77,
  longitude: -80.19,
  construction: 'wood',
  occupancy: null,
  zoneId: null,
  ...overrides,
});

const CITED_EVENT_SET = {
  source: 'NHC FL landfall frequencies (illustrative)',
  events: [
    { eventId: 'FL_CAT4', peril: 'hurricane', annualRate: 0.05, footprint: { defaultIntensity: 155 } },
  ],
};

describe('registry wiring', () => {
  it('selectModelStrategy resolves cat_exposure to the real strategy', () => {
    expect(selectModelStrategy('cat_exposure').method).toBe('cat_exposure');
  });
  it('unknown modeling method still falls back to the generic default (unchanged)', () => {
    expect(selectModelStrategy('nope').method).toBe('generic_burning_cost');
  });
  it('generic + parametric model strategies + generic/casualty rating are unchanged', () => {
    expect(selectModelStrategy('generic_burning_cost').method).toBe('generic_burning_cost');
    expect(selectModelStrategy('parametric_trigger').method).toBe('parametric_trigger');
    expect(selectRatingStrategy('generic_loss_ratio').method).toBe('generic_loss_ratio');
    expect(selectRatingStrategy('casualty_ilf').method).toBe('casualty_ilf');
  });
});

describe('cat_exposure DEFER cases (never fabricate)', () => {
  it('no exposures ⇒ null + reason', () => {
    const out = catExposureModelStrategy.run(
      { data: { catEventSet: CITED_EVENT_SET }, catExposures: [] },
      { damageCurveSet: CURVE_SET },
    );
    expect(out.expectedLossCost).toBeNull();
    expect(out.detail.reason).toBe('no_exposures');
  });
  it('no cited event set ⇒ null + reason', () => {
    const out = catExposureModelStrategy.run(
      { data: {}, catExposures: [woodExp()] },
      { damageCurveSet: CURVE_SET },
    );
    expect(out.expectedLossCost).toBeNull();
    expect(out.detail.reason).toBe('no_cited_event_set');
  });
  it('event set WITHOUT a source citation ⇒ defer (founder rule)', () => {
    const out = catExposureModelStrategy.run(
      {
        data: {
          catEventSet: {
            events: [{ eventId: 'X', peril: 'hurricane', annualRate: 0.1, footprint: { defaultIntensity: 150 } }],
          },
        },
        catExposures: [woodExp()],
      },
      { damageCurveSet: CURVE_SET },
    );
    expect(out.expectedLossCost).toBeNull();
    expect(out.detail.reason).toBe('event_set_missing_source_citation');
  });
  it('exposures present but none with TIV ⇒ defer', () => {
    const out = catExposureModelStrategy.run(
      { data: { catEventSet: CITED_EVENT_SET }, catExposures: [woodExp({ tiv: 0 })] },
      { damageCurveSet: CURVE_SET },
    );
    expect(out.expectedLossCost).toBeNull();
    expect(out.detail.reason).toBe('no_exposures_with_tiv');
  });
});

describe('cat_exposure MODELED case', () => {
  it('returns AAL + EP curve + var99 1-in-100 AEP + accumulation; deterministic by seed', () => {
    const input = { data: { catEventSet: CITED_EVENT_SET }, catExposures: [woodExp({ zoneId: 'Z1' })] };
    const params = { damageCurveSet: CURVE_SET, simYears: 5000, seed: 42 };

    const out = catExposureModelStrategy.run(input, params);
    expect(out.method).toBe(CAT_MODELING_METHOD);
    expect(out.expectedLossCost).not.toBeNull();

    const d = out.detail as Record<string, any>;
    // EXACT deterministic ground-up: wood 1M @155mph; MDR interpolates 150→0.5,
    // 180→0.85 ⇒ 155 → 0.5 + (5/30)*0.35 = 0.558333…; groundUp = 558,333.33.
    expect(d.eventLosses[0].groundUpLoss).toBeCloseTo(558_333.33, 1);
    // AAL ≈ λ × groundUp = 0.05 × 558,333 ≈ 27,917 (within Monte-Carlo sampling).
    expect(out.expectedLossCost!).toBeGreaterThan(23_000);
    expect(out.expectedLossCost!).toBeLessThan(34_000);

    expect(d.eventSetSource).toMatch(/NHC/);
    expect(d.damageCurveSource).toMatch(/Ensured cited default/);
    expect(d.seed).toBe(42);
    expect(d.simYears).toBe(5000);
    expect(Array.isArray(d.aep)).toBe(true);
    expect(Array.isArray(d.oep)).toBe(true);
    expect(typeof d.var99Aep1in100).toBe('number');
    expect(d.accumulationByZone[0].zoneId).toBe('Z1');

    // Reproducible.
    const out2 = catExposureModelStrategy.run(input, params);
    expect(out2.expectedLossCost).toBe(out.expectedLossCost);
    expect((out2.detail as any).var99Aep1in100).toBe(d.var99Aep1in100);
  });

  it('registry catEventSet param overrides absent data event set', () => {
    const out = catExposureModelStrategy.run(
      { data: {}, catExposures: [woodExp()] },
      { damageCurveSet: CURVE_SET, catEventSet: CITED_EVENT_SET, simYears: 2000, seed: 1 },
    );
    expect(out.expectedLossCost).not.toBeNull();
  });
});

describe('pure point-in-bbox + exposure normalization (service helpers)', () => {
  const zones = [
    { crestaId: 'FL', bbox: { sw: { lat: 24, lng: -88 }, ne: { lat: 31, lng: -80 } } },
    { crestaId: 'CA', bbox: { sw: { lat: 32, lng: -124 }, ne: { lat: 42, lng: -114 } } },
  ];
  it('assigns a point to the containing zone', () => {
    expect(zoneForPoint(25.77, -80.19, zones)).toBe('FL');
    expect(zoneForPoint(37.0, -120.0, zones)).toBe('CA');
  });
  it('returns null outside all zones or for null coords', () => {
    expect(zoneForPoint(0, 0, zones)).toBeNull();
    expect(zoneForPoint(null, null, zones)).toBeNull();
    expect(zoneForPoint(25, -80, [])).toBeNull();
  });
  it('normalizes a freeform data.exposures entry', () => {
    const e = normalizeDataExposure({
      tiv: 2_000_000,
      latitude: 25.7,
      longitude: -80.2,
      construction: 'masonry',
      occupancy: 'commercial',
      deductible: 50_000,
      limit: 1_000_000,
      ref: 'BLDG-1',
    });
    expect(e).toMatchObject({
      tiv: 2_000_000,
      construction: 'masonry',
      occupancy: 'commercial',
      deductible: 50_000,
      limit: 1_000_000,
      ref: 'BLDG-1',
      zoneId: null,
    });
  });
  it('rejects an entry with no usable TIV', () => {
    expect(normalizeDataExposure({ latitude: 1 })).toBeNull();
    expect(normalizeDataExposure({ tiv: 0 })).toBeNull();
  });
});
