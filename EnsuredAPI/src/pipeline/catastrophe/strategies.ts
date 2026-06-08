/**
 * Slice 5.2 — Catastrophe exposure-rating MODEL STRATEGY (PURE, DB-free, SYNC).
 *
 * `cat_exposure` — RiskModelStrategy. The strategy socket is SYNCHRONOUS, so ALL
 * DB work (loading ExposureUnit rows, the CRESTA point-in-bbox join, reading the
 * declared event set + curve override) happens in the compute service's async cat
 * branch and is passed INTO this strategy via `input` / `params`:
 *
 *   input.catExposures   : CatExposure[]   (normalized, zone-resolved)
 *   input.data.catEventSet OR params.catEventSet : the CITED declared event set
 *   params.damageCurveSet : an OPTIONAL override curve set (else the cited default)
 *   params.simYears / params.seed / params.returnPeriods / params.pmlReturnPeriod
 *   input.accumulation   : OPTIONAL precomputed AccumulationResult (zone TIV)
 *
 * run() runs the pure engine and returns:
 *   { method:'cat_exposure', expectedLossCost: AAL, detail:{ aal, epCurve, oep, aep,
 *     pml, tvar, accumulationByZone, exposureCount, eventCount, simYears, seed,
 *     damageCurveSource, eventSetSource } }
 *
 * HONESTY (founder constraint): if there is NO cited event set, OR no exposures,
 * OR no usable damage curves ⇒ expectedLossCost = null + detail.reason. The compute
 * path then DEFERS to the catastrophe_property benchmark prior. NEVER a fabricated
 * cat number.
 *
 * Registered in src/pipeline/registry/strategy.ts ALONGSIDE the generic / parametric
 * / casualty strategies — none of those are modified. No DB, no clock, no network.
 */

import type {
  ModelOutput,
  RiskModelStrategy,
  RiskModelStrategyInput,
} from '../registry/types';
import {
  CITED_DEFAULT_DAMAGE_CURVE_SET,
  resolveCurveSet,
  type DamageCurveSet,
} from './damageCurves';
import { parseEventSet, type CatEvent, type CatExposure } from './eventLoss';
import { accumulateByZone, type AccumulationResult } from './accumulation';
import { aep1in100, simulateEP, type SimulateEPResult } from './epEngine';

export const CAT_MODELING_METHOD = 'cat_exposure';

function readNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readExposures(input: RiskModelStrategyInput): CatExposure[] {
  const raw = (input as Record<string, unknown>)?.catExposures;
  return Array.isArray(raw) ? (raw as CatExposure[]) : [];
}

function readEventSet(
  input: RiskModelStrategyInput,
  params: Record<string, unknown>,
): { events: CatEvent[]; source: string | null } {
  // params.catEventSet (registry override) wins; else input.data.catEventSet.
  const fromParams = params?.catEventSet;
  if (fromParams != null) {
    const parsed = parseEventSet(fromParams);
    if (parsed.events.length > 0) return parsed;
  }
  const data = input?.data && typeof input.data === 'object' ? (input.data as Record<string, unknown>) : {};
  return parseEventSet(data.catEventSet);
}

function defer(reason: string, extra?: Record<string, unknown>): ModelOutput {
  return {
    method: CAT_MODELING_METHOD,
    expectedLossCost: null,
    detail: {
      strategy: 'cat_exposure',
      modelable: false,
      reason,
      note:
        'Catastrophe exposure rating DEFERRED: no cited event set / no exposures / no damage curves. No cat number fabricated; compute falls back to the catastrophe_property benchmark prior.',
      ...(extra ?? {}),
    },
  };
}

export const catExposureModelStrategy: RiskModelStrategy = {
  method: CAT_MODELING_METHOD,
  run(input: RiskModelStrategyInput, params: Record<string, unknown>): ModelOutput {
    const exposures = readExposures(input);
    const { events, source: eventSetSource } = readEventSet(input, params);

    // Damage curve set: override (data/registry) ⊕ cited default.
    const curveSet: DamageCurveSet = resolveCurveSet(
      params?.damageCurveSet ??
        (input?.data && typeof input.data === 'object'
          ? (input.data as Record<string, unknown>).damageCurveSet
          : undefined),
    );

    // DEFER cases (honest null, never a fabricated number).
    if (exposures.length === 0) {
      return defer('no_exposures');
    }
    const loadBearing = exposures.filter((e) => Number.isFinite(e.tiv) && e.tiv > 0);
    if (loadBearing.length === 0) {
      return defer('no_exposures_with_tiv', { exposureCount: exposures.length });
    }
    if (events.length === 0) {
      return defer('no_cited_event_set', { exposureCount: loadBearing.length });
    }
    if (!eventSetSource) {
      // Founder rule: an event set MUST carry a citation to be modeled.
      return defer('event_set_missing_source_citation', {
        exposureCount: loadBearing.length,
        eventCount: events.length,
      });
    }
    if (!curveSet || curveSet.curves.length === 0) {
      return defer('no_damage_curves', {
        exposureCount: loadBearing.length,
        eventCount: events.length,
      });
    }

    const simYears = readNumber(params?.simYears) ?? 10000;
    const seed = readNumber(params?.seed) ?? 1;
    const returnPeriods = Array.isArray(params?.returnPeriods)
      ? (params.returnPeriods as unknown[]).map((v) => readNumber(v)).filter((v): v is number => v != null)
      : [100, 250, 500];
    const pmlReturnPeriod = readNumber(params?.pmlReturnPeriod) ?? 250;

    const sim: SimulateEPResult = simulateEP(events, loadBearing, curveSet, {
      years: simYears,
      seed,
      returnPeriods: returnPeriods.length > 0 ? returnPeriods : [100, 250, 500],
      pmlReturnPeriod,
    });

    // Accumulation: use a precomputed result (service did the CRESTA join) or
    // compute from the zone-resolved exposures here. Pure either way.
    const accumulation: AccumulationResult =
      ((input as Record<string, unknown>)?.accumulation as AccumulationResult) ??
      accumulateByZone(loadBearing);

    const var99Aep = aep1in100(sim);

    return {
      method: CAT_MODELING_METHOD,
      expectedLossCost: sim.aal,
      detail: {
        strategy: 'cat_exposure',
        modelable: true,
        aal: sim.aal,
        aggStdDev: sim.aggStdDev,
        oep: sim.oep,
        aep: sim.aep,
        pml: sim.pml,
        pmlReturnPeriod,
        tvar: sim.tvar,
        /** EP curve = the return-period loss pairs (OEP + AEP) for charting. */
        epCurve: { oep: sim.oep, aep: sim.aep },
        /** 1-in-100 AEP — the value the compute path maps into the var99 column. */
        var99Aep1in100: var99Aep,
        accumulationByZone: accumulation.byZone,
        accumulation: {
          totalTiv: accumulation.totalTiv,
          unassignedTiv: accumulation.unassignedTiv,
          unassignedCount: accumulation.unassignedCount,
          maxZone: accumulation.maxZone,
          hhi: accumulation.hhi,
        },
        exposureCount: loadBearing.length,
        eventCount: events.length,
        simYears: sim.simYears,
        seed: sim.seed,
        eventLosses: sim.eventLosses,
        damageCurveSet: curveSet.setName,
        damageCurveSource: curveSet.source,
        eventSetSource,
        note:
          'AAL = mean annual aggregate loss from a seeded Monte-Carlo (mulberry32) over Poisson event frequencies; hazard & damage curves are DECLARED/CITED. var99 ← 1-in-100 AEP.',
      },
    };
  },
};

export { CITED_DEFAULT_DAMAGE_CURVE_SET };
