/**
 * Slice 5.2 — CRESTA-zone ACCUMULATION (PURE, DB-free, deterministic).
 *
 * Correlation/accumulation is the killer in cat: exposures in one zone do not
 * diversify. This module aggregates TIV by CRESTA zone and reports concentration
 * (the share of total TIV in the most-exposed zone, plus a Herfindahl-style index).
 *
 * The DB point-in-bbox lookup that assigns each exposure a zone lives in the
 * compute service (Part C). Here every exposure already carries a `zoneId` (or
 * null = unassigned, e.g. CRESTA table unloaded). Pure & deterministic.
 */

import type { CatExposure } from './eventLoss';

export type ZoneAccumulation = {
  zoneId: string;
  tiv: number;
  exposureCount: number;
  /** Share of total assigned TIV in this zone, [0,1]. */
  share: number;
};

export type AccumulationResult = {
  byZone: ZoneAccumulation[];
  totalTiv: number;
  /** TIV that could not be assigned to a zone (zoneId null). */
  unassignedTiv: number;
  unassignedCount: number;
  /** The single most-concentrated zone, or null when none assigned. */
  maxZone: ZoneAccumulation | null;
  /** Herfindahl-Hirschman index of zone TIV shares, [0,1]; 1 = fully concentrated. */
  hhi: number;
};

/**
 * Accumulate TIV by CRESTA zone. Exposures with a null zoneId are tallied as
 * unassigned (not silently dropped — the caller flags partial accumulation when the
 * CRESTA table is unloaded). Deterministic ordering: zones sorted by TIV desc.
 */
export function accumulateByZone(exposures: CatExposure[]): AccumulationResult {
  const byZoneMap = new Map<string, { tiv: number; count: number }>();
  let totalAssigned = 0;
  let unassignedTiv = 0;
  let unassignedCount = 0;

  for (const exp of exposures) {
    const tiv = Number.isFinite(exp.tiv) && exp.tiv > 0 ? exp.tiv : 0;
    if (!exp.zoneId) {
      unassignedTiv += tiv;
      unassignedCount += 1;
      continue;
    }
    const cur = byZoneMap.get(exp.zoneId) ?? { tiv: 0, count: 0 };
    cur.tiv += tiv;
    cur.count += 1;
    byZoneMap.set(exp.zoneId, cur);
    totalAssigned += tiv;
  }

  const byZone: ZoneAccumulation[] = [...byZoneMap.entries()]
    .map(([zoneId, v]) => ({
      zoneId,
      tiv: v.tiv,
      exposureCount: v.count,
      share: totalAssigned > 0 ? v.tiv / totalAssigned : 0,
    }))
    .sort((a, b) => b.tiv - a.tiv || a.zoneId.localeCompare(b.zoneId));

  const hhi = byZone.reduce((acc, z) => acc + z.share * z.share, 0);

  return {
    byZone,
    totalTiv: totalAssigned,
    unassignedTiv,
    unassignedCount,
    maxZone: byZone[0] ?? null,
    hhi,
  };
}
