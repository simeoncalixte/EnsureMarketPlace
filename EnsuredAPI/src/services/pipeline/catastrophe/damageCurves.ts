/**
 * Slice 5.2 — Catastrophe DAMAGE CURVES (PURE, DB-free, deterministic).
 *
 * A damage curve maps hazard INTENSITY → mean damage ratio (MDR ∈ [0,1]) for a
 * (peril, constructionType, occupancyType) class. MDR × TIV = expected ground-up
 * loss for an exposure subjected to that intensity.
 *
 * FOUNDER DECISION (locked): the default curve set is CITED + simplified. Every
 * curve carries a `source` string. The shapes below are deliberately simple,
 * monotone, public-literature-style vulnerability functions — NOT a vendor model.
 * Submission / registry methodParams may OVERRIDE any curve (see `resolveCurveSet`).
 *
 * Honesty: we have ZERO licensed vulnerability data. These are documented,
 * defensible simplifications labeled as such. They are the pluggable default; an
 * org that licenses real curves overrides them through data.
 *
 * Curve representation: a sorted list of (intensity, mdr) points. `meanDamageRatio`
 * does piecewise-linear interpolation between points and CLAMPS below the first
 * point (→ first point's mdr) and above the last point (→ last point's mdr), then
 * clamps the result into [0,1]. No extrapolation beyond the curve.
 */

import { constructionTypes, occupancyTypes } from '../../../db/models/constants';

export type ConstructionType = (typeof constructionTypes)[number];
export type OccupancyType = (typeof occupancyTypes)[number];

/** A single (intensity → mean damage ratio) point on a vulnerability curve. */
export type DamageCurvePoint = {
  /** Hazard intensity (peril-specific unit, e.g. wind mph, PGA in g). */
  intensity: number;
  /** Mean damage ratio at this intensity, in [0,1]. */
  mdr: number;
};

/** A cited damage curve keyed by (peril, construction, occupancy). */
export type DamageCurve = {
  peril: string;
  /** null construction/occupancy = wildcard (applies to any value of that dim). */
  construction: ConstructionType | null;
  occupancy: OccupancyType | null;
  points: DamageCurvePoint[];
  /** Required citation for the curve shape. */
  source: string;
};

/** A named set of curves (the cited default, or an org/submission override). */
export type DamageCurveSet = {
  setName: string;
  source: string;
  curves: DamageCurve[];
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Mean damage ratio for a (peril, construction, occupancy) class at `intensity`.
 *
 * Curve selection (most specific first): exact (peril, construction, occupancy),
 * then (peril, construction, *), then (peril, *, occupancy), then (peril, *, *).
 * Returns null when no curve matches the peril at all (caller defers — never a 0).
 *
 * Interpolation: piecewise-linear between sorted points; clamp to endpoint MDR
 * outside the curve's intensity range; final MDR clamped into [0,1].
 */
export function meanDamageRatio(
  peril: string,
  construction: ConstructionType | null,
  occupancy: OccupancyType | null,
  intensity: number | null,
  curveSet: DamageCurveSet,
): number | null {
  if (intensity == null || !Number.isFinite(intensity)) {
    return null;
  }
  const curve = selectCurve(peril, construction, occupancy, curveSet);
  if (!curve) {
    return null;
  }
  return clamp01(interpolate(curve.points, intensity));
}

/** Select the most specific matching curve for the class; null when peril absent. */
export function selectCurve(
  peril: string,
  construction: ConstructionType | null,
  occupancy: OccupancyType | null,
  curveSet: DamageCurveSet,
): DamageCurve | null {
  const perilCurves = (curveSet?.curves ?? []).filter((c) => c.peril === peril);
  if (perilCurves.length === 0) {
    return null;
  }
  const matchers: Array<(c: DamageCurve) => boolean> = [
    (c) => c.construction === construction && c.occupancy === occupancy,
    (c) => c.construction === construction && c.occupancy === null,
    (c) => c.construction === null && c.occupancy === occupancy,
    (c) => c.construction === null && c.occupancy === null,
  ];
  for (const m of matchers) {
    const hit = perilCurves.find(m);
    if (hit) return hit;
  }
  // Last resort: any curve for this peril (keeps the engine total).
  return perilCurves[0] ?? null;
}

/** Piecewise-linear interpolation over sorted points; clamp at endpoints. */
function interpolate(points: DamageCurvePoint[], x: number): number {
  if (!Array.isArray(points) || points.length === 0) {
    return 0;
  }
  const sorted = [...points].sort((a, b) => a.intensity - b.intensity);
  if (x <= sorted[0].intensity) {
    return sorted[0].mdr;
  }
  const last = sorted[sorted.length - 1];
  if (x >= last.intensity) {
    return last.mdr;
  }
  for (let i = 1; i < sorted.length; i += 1) {
    const lo = sorted[i - 1];
    const hi = sorted[i];
    if (x <= hi.intensity) {
      const span = hi.intensity - lo.intensity;
      if (span <= 0) return hi.mdr;
      const t = (x - lo.intensity) / span;
      return lo.mdr + t * (hi.mdr - lo.mdr);
    }
  }
  return last.mdr;
}

/**
 * CITED DEFAULT damage-curve set. Simplified, monotone vulnerability functions in
 * the spirit of public wind/earthquake fragility literature. NOT a licensed vendor
 * model — every curve is a documented simplification.
 *
 * Wind: intensity = 3-second peak gust in mph. Wood frame is more vulnerable than
 * masonry/steel/concrete; near-total loss approached at extreme gusts. Shape echoes
 * HAZUS-MH / ASCE public wind vulnerability discussion (qualitative, simplified).
 *
 * Earthquake: intensity = peak ground acceleration (PGA) in g. Construction order
 * of vulnerability (most→least): masonry > wood > concrete > steel, reflecting that
 * unreinforced masonry performs worst in shaking. Shape echoes public HAZUS /
 * FEMA P-58-style fragility discussion (qualitative, simplified).
 *
 * Flood: intensity = water depth above first floor in feet. Depth-damage curves are
 * the most public of all (USACE / FEMA depth-damage functions); content/structure
 * damage rises steeply in the first several feet then flattens.
 */
const WIND_SOURCE =
  'Simplified wind vulnerability (3-sec gust mph → MDR), shape per public HAZUS-MH / ASCE 7 wind damage discussion; defensible default, not a licensed vendor curve.';
const QUAKE_SOURCE =
  'Simplified seismic fragility (PGA g → MDR), shape per public HAZUS-MH / FEMA P-58 discussion; URM worst, steel best; defensible default, not a licensed vendor curve.';
const FLOOD_SOURCE =
  'Simplified depth-damage (feet above first floor → MDR), shape per public USACE / FEMA depth-damage functions; defensible default, not a licensed vendor curve.';

export const CITED_DEFAULT_DAMAGE_CURVE_SET: DamageCurveSet = {
  setName: 'ensured_cited_default_v1',
  source:
    'Ensured cited default catastrophe damage-ratio curve set v1 — simplified public-literature vulnerability shapes (HAZUS-MH / FEMA / USACE style). Pluggable: orgs override with licensed curves through data.',
  curves: [
    // ---- WIND (hurricane / storm), intensity = 3-sec gust mph ----
    {
      peril: 'hurricane',
      construction: 'wood',
      occupancy: null,
      source: WIND_SOURCE,
      points: [
        { intensity: 50, mdr: 0.0 },
        { intensity: 90, mdr: 0.05 },
        { intensity: 120, mdr: 0.2 },
        { intensity: 150, mdr: 0.5 },
        { intensity: 180, mdr: 0.85 },
        { intensity: 210, mdr: 1.0 },
      ],
    },
    {
      peril: 'hurricane',
      construction: 'masonry',
      occupancy: null,
      source: WIND_SOURCE,
      points: [
        { intensity: 50, mdr: 0.0 },
        { intensity: 90, mdr: 0.03 },
        { intensity: 120, mdr: 0.12 },
        { intensity: 150, mdr: 0.35 },
        { intensity: 180, mdr: 0.65 },
        { intensity: 210, mdr: 0.9 },
      ],
    },
    {
      // steel & concrete share a low-vulnerability wind shape (wildcard fallback).
      peril: 'hurricane',
      construction: null,
      occupancy: null,
      source: WIND_SOURCE,
      points: [
        { intensity: 50, mdr: 0.0 },
        { intensity: 90, mdr: 0.02 },
        { intensity: 120, mdr: 0.08 },
        { intensity: 150, mdr: 0.22 },
        { intensity: 180, mdr: 0.45 },
        { intensity: 210, mdr: 0.7 },
      ],
    },
    // 'storm' reuses the same wind shapes (windstorm).
    {
      peril: 'storm',
      construction: 'wood',
      occupancy: null,
      source: WIND_SOURCE,
      points: [
        { intensity: 50, mdr: 0.0 },
        { intensity: 90, mdr: 0.05 },
        { intensity: 120, mdr: 0.2 },
        { intensity: 150, mdr: 0.5 },
        { intensity: 180, mdr: 0.85 },
        { intensity: 210, mdr: 1.0 },
      ],
    },
    {
      peril: 'storm',
      construction: null,
      occupancy: null,
      source: WIND_SOURCE,
      points: [
        { intensity: 50, mdr: 0.0 },
        { intensity: 90, mdr: 0.02 },
        { intensity: 120, mdr: 0.08 },
        { intensity: 150, mdr: 0.22 },
        { intensity: 180, mdr: 0.45 },
        { intensity: 210, mdr: 0.7 },
      ],
    },

    // ---- EARTHQUAKE, intensity = PGA in g ----
    {
      peril: 'earthquake',
      construction: 'masonry',
      occupancy: null,
      source: QUAKE_SOURCE,
      points: [
        { intensity: 0.05, mdr: 0.0 },
        { intensity: 0.15, mdr: 0.08 },
        { intensity: 0.3, mdr: 0.3 },
        { intensity: 0.5, mdr: 0.6 },
        { intensity: 0.8, mdr: 0.9 },
        { intensity: 1.2, mdr: 1.0 },
      ],
    },
    {
      peril: 'earthquake',
      construction: 'wood',
      occupancy: null,
      source: QUAKE_SOURCE,
      points: [
        { intensity: 0.05, mdr: 0.0 },
        { intensity: 0.15, mdr: 0.04 },
        { intensity: 0.3, mdr: 0.18 },
        { intensity: 0.5, mdr: 0.4 },
        { intensity: 0.8, mdr: 0.7 },
        { intensity: 1.2, mdr: 0.9 },
      ],
    },
    {
      peril: 'earthquake',
      construction: 'concrete',
      occupancy: null,
      source: QUAKE_SOURCE,
      points: [
        { intensity: 0.05, mdr: 0.0 },
        { intensity: 0.15, mdr: 0.03 },
        { intensity: 0.3, mdr: 0.12 },
        { intensity: 0.5, mdr: 0.3 },
        { intensity: 0.8, mdr: 0.55 },
        { intensity: 1.2, mdr: 0.8 },
      ],
    },
    {
      // steel + wildcard: lowest seismic vulnerability.
      peril: 'earthquake',
      construction: null,
      occupancy: null,
      source: QUAKE_SOURCE,
      points: [
        { intensity: 0.05, mdr: 0.0 },
        { intensity: 0.15, mdr: 0.02 },
        { intensity: 0.3, mdr: 0.08 },
        { intensity: 0.5, mdr: 0.2 },
        { intensity: 0.8, mdr: 0.4 },
        { intensity: 1.2, mdr: 0.65 },
      ],
    },

    // ---- FLOOD, intensity = water depth (ft) above first floor ----
    {
      peril: 'flood',
      construction: null,
      occupancy: null,
      source: FLOOD_SOURCE,
      points: [
        { intensity: 0, mdr: 0.0 },
        { intensity: 1, mdr: 0.15 },
        { intensity: 3, mdr: 0.35 },
        { intensity: 6, mdr: 0.55 },
        { intensity: 10, mdr: 0.7 },
        { intensity: 15, mdr: 0.8 },
      ],
    },
  ],
};

/**
 * Parse a freeform JSONB value into a DamageCurveSet, or null when it isn't a
 * usable curve-set shape. Tolerant: a malformed override is ignored (caller uses
 * the cited default). Each curve must have a peril, a non-empty points array of
 * {intensity, mdr}, and a source string.
 */
export function parseDamageCurveSet(value: unknown): DamageCurveSet | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const v = value as Record<string, unknown>;
  const rawCurves = v.curves;
  if (!Array.isArray(rawCurves) || rawCurves.length === 0) {
    return null;
  }
  const curves: DamageCurve[] = [];
  for (const rc of rawCurves) {
    if (!rc || typeof rc !== 'object') continue;
    const c = rc as Record<string, unknown>;
    if (typeof c.peril !== 'string' || !c.peril) continue;
    if (typeof c.source !== 'string' || !c.source) continue;
    if (!Array.isArray(c.points) || c.points.length === 0) continue;
    const points: DamageCurvePoint[] = [];
    for (const rp of c.points) {
      if (!rp || typeof rp !== 'object') continue;
      const p = rp as Record<string, unknown>;
      const intensity = typeof p.intensity === 'number' ? p.intensity : Number(p.intensity);
      const mdr = typeof p.mdr === 'number' ? p.mdr : Number(p.mdr);
      if (Number.isFinite(intensity) && Number.isFinite(mdr)) {
        points.push({ intensity, mdr });
      }
    }
    if (points.length === 0) continue;
    curves.push({
      peril: c.peril,
      construction: isConstruction(c.construction) ? (c.construction as ConstructionType) : null,
      occupancy: isOccupancy(c.occupancy) ? (c.occupancy as OccupancyType) : null,
      points,
      source: c.source,
    });
  }
  if (curves.length === 0) {
    return null;
  }
  return {
    setName: typeof v.setName === 'string' ? v.setName : 'override',
    source: typeof v.source === 'string' ? v.source : 'org/submission override curve set',
    curves,
  };
}

function isConstruction(v: unknown): boolean {
  return typeof v === 'string' && (constructionTypes as readonly string[]).includes(v);
}
function isOccupancy(v: unknown): boolean {
  return typeof v === 'string' && (occupancyTypes as readonly string[]).includes(v);
}

/**
 * Resolve the effective curve set: a parseable OVERRIDE (from submission data or
 * registry methodParams) wins; otherwise the cited default. Total — always returns
 * a usable set.
 */
export function resolveCurveSet(override: unknown): DamageCurveSet {
  return parseDamageCurveSet(override) ?? CITED_DEFAULT_DAMAGE_CURVE_SET;
}
