/**
 * Slice 5.2 — eventGroundUpLoss + terms + parsing unit tests (DB-free).
 */

import {
  applyTerms,
  eventGroundUpLoss,
  intensityAtExposure,
  parseEventSet,
  type CatEvent,
  type CatExposure,
} from './eventLoss';
import { CITED_DEFAULT_DAMAGE_CURVE_SET } from './damageCurves';

const SET = CITED_DEFAULT_DAMAGE_CURVE_SET;

const woodExp = (overrides: Partial<CatExposure> = {}): CatExposure => ({
  tiv: 1_000_000,
  latitude: null,
  longitude: null,
  construction: 'wood',
  occupancy: null,
  zoneId: null,
  ...overrides,
});

describe('applyTerms (deductible then limit)', () => {
  it('no terms ⇒ ground-up', () => {
    expect(applyTerms(500_000, null, null)).toBe(500_000);
  });
  it('deductible subtracts and floors at 0', () => {
    expect(applyTerms(500_000, 100_000, null)).toBe(400_000);
    expect(applyTerms(50_000, 100_000, null)).toBe(0);
  });
  it('limit caps recovery', () => {
    expect(applyTerms(500_000, null, 300_000)).toBe(300_000);
  });
  it('deductible THEN limit', () => {
    // gross 500k − ded 100k = 400k, capped at limit 250k → 250k.
    expect(applyTerms(500_000, 100_000, 250_000)).toBe(250_000);
  });
});

describe('intensityAtExposure (zone-keyed, else default)', () => {
  const event: CatEvent = {
    eventId: 'E',
    peril: 'hurricane',
    annualRate: 0.1,
    footprint: { byZone: { Z1: 150 }, defaultIntensity: 120 },
  };
  it('uses the zone-keyed intensity when the exposure is in that zone', () => {
    expect(intensityAtExposure(event, woodExp({ zoneId: 'Z1' }))).toBe(150);
  });
  it('falls back to defaultIntensity when zone is absent/unmatched', () => {
    expect(intensityAtExposure(event, woodExp({ zoneId: 'ZX' }))).toBe(120);
    expect(intensityAtExposure(event, woodExp({ zoneId: null }))).toBe(120);
  });
  it('null when neither zone nor default intensity present', () => {
    const noDefault: CatEvent = { ...event, footprint: { byZone: { Z1: 150 } } };
    expect(intensityAtExposure(noDefault, woodExp({ zoneId: 'ZX' }))).toBeNull();
  });
});

describe('eventGroundUpLoss', () => {
  const event150: CatEvent = {
    eventId: 'E',
    peril: 'hurricane',
    annualRate: 0.1,
    footprint: { defaultIntensity: 150 }, // wood @150 → MDR 0.5
  };

  it('sums MDR × TIV across exposures (no terms)', () => {
    // wood 1M @150 → 0.5 × 1M = 500,000.
    expect(eventGroundUpLoss([woodExp()], event150, SET)).toBeCloseTo(500_000, 6);
  });
  it('applies per-exposure deductible and limit', () => {
    // gross 500k − ded 50k = 450k, limit 200k → 200k.
    const exp = woodExp({ deductible: 50_000, limit: 200_000 });
    expect(eventGroundUpLoss([exp], event150, SET)).toBeCloseTo(200_000, 6);
  });
  it('exposure with no matching curve / no intensity contributes 0', () => {
    const noIntensityEvent: CatEvent = { ...event150, footprint: { byZone: { OTHER: 150 } } };
    expect(eventGroundUpLoss([woodExp({ zoneId: 'NOPE' })], noIntensityEvent, SET)).toBe(0);
    const badPeril: CatEvent = { ...event150, peril: 'meteor' };
    expect(eventGroundUpLoss([woodExp()], badPeril, SET)).toBe(0);
  });
  it('skips zero/negative TIV exposures', () => {
    expect(eventGroundUpLoss([woodExp({ tiv: 0 })], event150, SET)).toBe(0);
  });
  it('aggregates multiple exposures', () => {
    const total = eventGroundUpLoss([woodExp(), woodExp({ tiv: 2_000_000 })], event150, SET);
    expect(total).toBeCloseTo(500_000 + 1_000_000, 6);
  });
});

describe('parseEventSet', () => {
  it('parses a cited event set with source', () => {
    const { events, source } = parseEventSet({
      source: 'NHC landfall frequencies',
      events: [
        { eventId: 'A', peril: 'hurricane', annualRate: 0.05, footprint: { defaultIntensity: 150 } },
      ],
    });
    expect(source).toBe('NHC landfall frequencies');
    expect(events).toHaveLength(1);
  });
  it('drops malformed events and footprints', () => {
    const { events } = parseEventSet({
      source: 's',
      events: [
        { eventId: '', peril: 'hurricane', annualRate: 0.1, footprint: { defaultIntensity: 1 } }, // no id
        { eventId: 'B', peril: 'hurricane', annualRate: -1, footprint: { defaultIntensity: 1 } }, // bad rate
        { eventId: 'C', peril: 'hurricane', annualRate: 0.1, footprint: {} }, // empty footprint
        { eventId: 'D', peril: 'hurricane', annualRate: 0.1, footprint: { defaultIntensity: 150 } }, // ok
      ],
    });
    expect(events.map((e) => e.eventId)).toEqual(['D']);
  });
  it('returns empty + null source for garbage', () => {
    expect(parseEventSet(null)).toEqual({ events: [], source: null });
    expect(parseEventSet({}).events).toEqual([]);
  });
});
