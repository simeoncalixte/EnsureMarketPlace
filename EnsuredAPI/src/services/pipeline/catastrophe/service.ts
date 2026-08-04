/**
 * Slice 5.2 — Catastrophe compute-side helpers (the ASYNC / DB part).
 *
 * The strategy socket is SYNCHRONOUS and the pure engine is DB-free, so all DB work
 * lives here and is passed INTO the strategy. This module:
 *   - loads exposures (ExposureUnit rows for the submission's policies, else the
 *     freeform data.exposures[]) and normalizes them to CatExposure,
 *   - resolves each exposure's CRESTA zone by a point-in-bbox query (graceful: when
 *     the crestaZones table is empty/unloaded, zoneId stays null and accumulation
 *     is flagged partial),
 *   - assembles the accumulation (pure) for provenance.
 *
 * Pure helpers (zone matching, exposure normalization) are exported for unit tests;
 * the DB-touching functions are thin and degrade safely (never throw out of a
 * non-error path — a missing table just yields null zones / empty exposures).
 */

import { Op } from 'sequelize';
import { ExposureUnit, Policy } from '../../../db/models';
import { CrestaZone, type CrestaBBox } from '../../../db/models/cresta.models';
import {
  type ConstructionType,
  type OccupancyType,
} from './damageCurves';
import type { CatExposure } from './eventLoss';
import { accumulateByZone, type AccumulationResult } from './accumulation';
import { constructionTypes, occupancyTypes } from '../../../db/models/constants';

function readNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asConstruction(v: unknown): ConstructionType | null {
  return typeof v === 'string' && (constructionTypes as readonly string[]).includes(v)
    ? (v as ConstructionType)
    : null;
}
function asOccupancy(v: unknown): OccupancyType | null {
  return typeof v === 'string' && (occupancyTypes as readonly string[]).includes(v)
    ? (v as OccupancyType)
    : null;
}

/** A lightweight zone shape for the pure point-in-bbox matcher. */
export type ZoneBox = { crestaId: string; bbox: CrestaBBox };

/**
 * PURE point-in-bbox: return the crestaId of the first zone whose bbox contains
 * (lat,lng), or null. Inclusive bounds. Tolerant of null bbox/coords.
 */
export function zoneForPoint(
  lat: number | null,
  lng: number | null,
  zones: ZoneBox[],
): string | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  for (const z of zones) {
    const b = z.bbox;
    if (!b || !b.sw || !b.ne) continue;
    if (lat >= b.sw.lat && lat <= b.ne.lat && lng >= b.sw.lng && lng <= b.ne.lng) {
      return z.crestaId;
    }
  }
  return null;
}

/**
 * Normalize a freeform data.exposures[] entry to a CatExposure (zoneId left null;
 * the caller resolves zones). PURE. Returns null when there is no usable TIV.
 */
export function normalizeDataExposure(raw: unknown): CatExposure | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const tiv =
    readNumber(e.tiv) ??
    readNumber(e.replacementCost) ??
    readNumber(e.insuredValue) ??
    readNumber((e as Record<string, unknown>)['financials.tiv']);
  if (tiv == null || tiv <= 0) return null;
  return {
    tiv,
    latitude: readNumber(e.latitude ?? e.lat),
    longitude: readNumber(e.longitude ?? e.lng),
    construction: asConstruction(e.construction ?? e.constructionType),
    occupancy: asOccupancy(e.occupancy ?? e.occupancyType),
    zoneId: null,
    deductible: readNumber(e.deductible),
    limit: readNumber(e.limit),
    ref: typeof e.ref === 'string' ? e.ref : typeof e.exposureRef === 'string' ? e.exposureRef : null,
  };
}

/** Normalize a persisted ExposureUnit row (DECIMAL columns arrive as strings). */
export function normalizeExposureUnit(row: ExposureUnit): CatExposure | null {
  const tiv = readNumber(row.replacementCost);
  if (tiv == null || tiv <= 0) return null;
  return {
    tiv,
    latitude: readNumber(row.latitude),
    longitude: readNumber(row.longitude),
    construction: asConstruction(row.constructionType),
    occupancy: asOccupancy(row.occupancyType),
    zoneId: null,
    deductible: null,
    limit: null,
    ref: row.exposureRef ?? null,
  };
}

export type LoadedCatExposures = {
  exposures: CatExposure[];
  /** 'exposure_units' (persisted SOV) or 'canonical_data' (freeform) or 'none'. */
  source: 'exposure_units' | 'canonical_data' | 'none';
};

/**
 * Load exposures for a submission: ExposureUnit rows linked through the submission's
 * policies FIRST (the seed-modeled SOV), else the freeform
 * `CanonicalSubmission.data.exposures[]`. Degrades to empty on any DB error.
 */
export async function loadCatExposures(
  submissionId: number,
  data: Record<string, unknown> | null | undefined,
): Promise<LoadedCatExposures> {
  try {
    const policies = await Policy.findAll({ where: { submissionId }, attributes: ['id'] });
    const policyIds = policies.map((p) => p.id);
    if (policyIds.length > 0) {
      const units = await ExposureUnit.findAll({ where: { policyId: { [Op.in]: policyIds } } });
      const normalized = units
        .map((u) => normalizeExposureUnit(u))
        .filter((e): e is CatExposure => e != null);
      if (normalized.length > 0) {
        return { exposures: normalized, source: 'exposure_units' };
      }
    }
  } catch {
    // fall through to canonical data
  }

  const rawExposures = data && Array.isArray((data as Record<string, unknown>).exposures)
    ? ((data as Record<string, unknown>).exposures as unknown[])
    : [];
  const fromData = rawExposures
    .map((r) => normalizeDataExposure(r))
    .filter((e): e is CatExposure => e != null);
  if (fromData.length > 0) {
    return { exposures: fromData, source: 'canonical_data' };
  }

  return { exposures: [], source: 'none' };
}

export type ZoneAssignmentResult = {
  exposures: CatExposure[];
  /** true when the crestaZones table had usable boundary zones to join against. */
  zonesAvailable: boolean;
  zoneCountConsidered: number;
  accumulation: AccumulationResult;
};

/**
 * Resolve each exposure's CRESTA zone by point-in-bbox, then accumulate. Graceful:
 * when no zones are loaded (table empty / error), exposures keep zoneId=null,
 * `zonesAvailable=false`, and accumulation is reported as fully unassigned (the
 * caller flags partial accumulation). Never throws out of a non-error path.
 */
export async function assignZonesAndAccumulate(
  exposures: CatExposure[],
): Promise<ZoneAssignmentResult> {
  let zones: ZoneBox[] = [];
  try {
    const rows = await CrestaZone.findAll({ attributes: ['crestaId', 'bbox'] });
    zones = rows
      .filter((r) => r.bbox != null)
      .map((r) => ({ crestaId: r.crestaId, bbox: r.bbox }));
  } catch {
    zones = [];
  }

  const zonesAvailable = zones.length > 0;
  const assigned = exposures.map((e) =>
    zonesAvailable ? { ...e, zoneId: zoneForPoint(e.latitude, e.longitude, zones) } : { ...e },
  );

  return {
    exposures: assigned,
    zonesAvailable,
    zoneCountConsidered: zones.length,
    accumulation: accumulateByZone(assigned),
  };
}
