/**
 * Slice 5.2 — Catastrophe GROUND-UP EVENT LOSS (PURE, DB-free, deterministic).
 *
 * Given a declared stochastic event and a set of exposures (each with TIV, geo,
 * COPE, optional deductible/limit), compute the ground-up loss the event inflicts:
 *
 *   eventGroundUpLoss = Σ_exposures applyTerms( MDR(peril, construction, occupancy,
 *                       intensityAtExposure) × TIV , deductible, limit )
 *
 * Intensity at an exposure comes from the event footprint: footprint.byZone keyed
 * by the exposure's CRESTA zone id, falling back to footprint.defaultIntensity.
 * The DB CRESTA join lives in the compute service (Part C); here the exposure
 * already carries its resolved `zoneId` (or null → uses the default intensity).
 *
 * Per-exposure financial terms (when present): a simple, transparent application —
 *   gross   = MDR × TIV
 *   netDed  = max(0, gross − deductible)
 *   final   = min(netDed, limit)              (limit caps the recovery)
 * Deductible/limit are optional; absent terms mean ground-up = gross.
 */

import {
  type ConstructionType,
  type DamageCurveSet,
  type OccupancyType,
  meanDamageRatio,
} from './damageCurves';

/** A modeling-ready exposure: normalized from ExposureUnit or data.exposures[]. */
export type CatExposure = {
  /** Total insured value (replacement cost). Required to contribute loss. */
  tiv: number;
  latitude: number | null;
  longitude: number | null;
  construction: ConstructionType | null;
  occupancy: OccupancyType | null;
  /** Resolved CRESTA zone id (point-in-bbox), or null when unresolved/unloaded. */
  zoneId: string | null;
  /** Optional per-risk deductible (absolute, same currency as TIV). */
  deductible?: number | null;
  /** Optional per-risk limit (absolute cap on recovery). */
  limit?: number | null;
  /** Optional label for provenance. */
  ref?: string | null;
};

/** A declared stochastic event with a hazard footprint by zone. */
export type CatEvent = {
  eventId: string;
  peril: string;
  /** Expected occurrences per year (Poisson rate λ). */
  annualRate: number;
  footprint: CatEventFootprint;
};

export type CatEventFootprint = {
  /** Hazard intensity by CRESTA zone id. */
  byZone?: Record<string, number> | null;
  /** Fallback intensity for exposures without a resolved/zone-keyed intensity. */
  defaultIntensity?: number | null;
};

/** Apply optional deductible then limit to a gross loss. Pure. */
export function applyTerms(
  gross: number,
  deductible: number | null | undefined,
  limit: number | null | undefined,
): number {
  let net = gross;
  if (deductible != null && Number.isFinite(deductible) && deductible > 0) {
    net = Math.max(0, net - deductible);
  }
  if (limit != null && Number.isFinite(limit) && limit > 0) {
    net = Math.min(net, limit);
  }
  return net;
}

/** Intensity the event imposes at an exposure (zone-keyed, else default). */
export function intensityAtExposure(event: CatEvent, exposure: CatExposure): number | null {
  const fp = event.footprint ?? {};
  if (exposure.zoneId && fp.byZone && Object.prototype.hasOwnProperty.call(fp.byZone, exposure.zoneId)) {
    const v = fp.byZone[exposure.zoneId];
    if (Number.isFinite(v)) return v;
  }
  if (fp.defaultIntensity != null && Number.isFinite(fp.defaultIntensity)) {
    return fp.defaultIntensity;
  }
  return null;
}

/**
 * Ground-up loss a single event inflicts across all exposures. Pure & deterministic.
 * An exposure with no resolvable intensity OR no matching damage curve contributes
 * 0 (it is simply not hit by this event in the declared footprint) — never NaN.
 */
export function eventGroundUpLoss(
  exposures: CatExposure[],
  event: CatEvent,
  curveSet: DamageCurveSet,
): number {
  let total = 0;
  for (const exp of exposures) {
    if (!Number.isFinite(exp.tiv) || exp.tiv <= 0) continue;
    const intensity = intensityAtExposure(event, exp);
    if (intensity == null) continue;
    const mdr = meanDamageRatio(event.peril, exp.construction, exp.occupancy, intensity, curveSet);
    if (mdr == null) continue;
    const gross = mdr * exp.tiv;
    total += applyTerms(gross, exp.deductible, exp.limit);
  }
  return total;
}

/**
 * Parse a freeform value into a clean event set, or [] when unusable. Each event
 * needs an eventId, a peril, a finite positive annualRate, and a footprint with
 * either byZone or a defaultIntensity. Tolerant — drops malformed entries.
 */
export function parseEventSet(value: unknown): { events: CatEvent[]; source: string | null } {
  const empty = { events: [] as CatEvent[], source: null as string | null };
  if (!value || typeof value !== 'object') {
    return empty;
  }
  const v = value as Record<string, unknown>;
  const rawEvents = Array.isArray(v.events) ? v.events : Array.isArray(value) ? (value as unknown[]) : null;
  if (!Array.isArray(rawEvents)) {
    return empty;
  }
  const source = typeof v.source === 'string' && v.source.trim() ? v.source.trim() : null;
  const events: CatEvent[] = [];
  for (const re of rawEvents) {
    if (!re || typeof re !== 'object') continue;
    const e = re as Record<string, unknown>;
    if (typeof e.eventId !== 'string' || !e.eventId) continue;
    if (typeof e.peril !== 'string' || !e.peril) continue;
    const annualRate = typeof e.annualRate === 'number' ? e.annualRate : Number(e.annualRate);
    if (!Number.isFinite(annualRate) || annualRate <= 0) continue;
    const footprint = parseFootprint(e.footprint);
    if (!footprint) continue;
    events.push({ eventId: e.eventId, peril: e.peril, annualRate, footprint });
  }
  return { events, source };
}

function parseFootprint(value: unknown): CatEventFootprint | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const f = value as Record<string, unknown>;
  let byZone: Record<string, number> | null = null;
  if (f.byZone && typeof f.byZone === 'object' && !Array.isArray(f.byZone)) {
    byZone = {};
    for (const [zone, raw] of Object.entries(f.byZone as Record<string, unknown>)) {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(n)) byZone[zone] = n;
    }
    if (Object.keys(byZone).length === 0) byZone = null;
  }
  let defaultIntensity: number | null = null;
  if (f.defaultIntensity != null) {
    const n = typeof f.defaultIntensity === 'number' ? f.defaultIntensity : Number(f.defaultIntensity);
    if (Number.isFinite(n)) defaultIntensity = n;
  }
  if (byZone == null && defaultIntensity == null) {
    return null;
  }
  return { byZone, defaultIntensity };
}
