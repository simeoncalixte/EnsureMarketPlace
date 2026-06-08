/**
 * Slice 5.2 — accumulateByZone unit tests (DB-free, deterministic).
 */

import { accumulateByZone } from './accumulation';
import type { CatExposure } from './eventLoss';

const exp = (tiv: number, zoneId: string | null): CatExposure => ({
  tiv,
  latitude: null,
  longitude: null,
  construction: 'wood',
  occupancy: null,
  zoneId,
});

describe('accumulateByZone', () => {
  it('aggregates TIV by zone, sorted desc, with shares + HHI', () => {
    const res = accumulateByZone([
      exp(1_000_000, 'A'),
      exp(3_000_000, 'B'),
      exp(1_000_000, 'A'),
    ]);
    expect(res.totalTiv).toBe(5_000_000);
    expect(res.byZone[0]).toMatchObject({ zoneId: 'B', tiv: 3_000_000, exposureCount: 1 });
    expect(res.byZone[1]).toMatchObject({ zoneId: 'A', tiv: 2_000_000, exposureCount: 2 });
    expect(res.byZone[0].share).toBeCloseTo(0.6, 6);
    expect(res.byZone[1].share).toBeCloseTo(0.4, 6);
    // HHI = 0.6^2 + 0.4^2 = 0.52.
    expect(res.hhi).toBeCloseTo(0.52, 6);
    expect(res.maxZone!.zoneId).toBe('B');
  });

  it('tallies unassigned TIV separately (zones unloaded)', () => {
    const res = accumulateByZone([exp(1_000_000, null), exp(2_000_000, null)]);
    expect(res.unassignedTiv).toBe(3_000_000);
    expect(res.unassignedCount).toBe(2);
    expect(res.byZone).toHaveLength(0);
    expect(res.maxZone).toBeNull();
    expect(res.totalTiv).toBe(0);
  });

  it('full concentration ⇒ HHI 1.0', () => {
    const res = accumulateByZone([exp(1_000_000, 'A'), exp(2_000_000, 'A')]);
    expect(res.hhi).toBeCloseTo(1.0, 6);
  });

  it('ignores zero/negative TIV in totals', () => {
    const res = accumulateByZone([exp(0, 'A'), exp(1_000_000, 'A')]);
    expect(res.byZone[0].tiv).toBe(1_000_000);
  });
});
