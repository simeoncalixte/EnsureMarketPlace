/**
 * Slice 5.2 — Exceedance-Probability MONTE CARLO engine (PURE, DB-free, DETERMINISTIC).
 *
 * FOUNDER DECISION (locked): EP via Monte Carlo with a SEEDED PRNG (mulberry32).
 * NO Math.random anywhere. Given the same (events, exposures, curveSet, seed,
 * years) the result is byte-for-byte reproducible.
 *
 * Method:
 *   - Precompute each event's ground-up loss (deterministic — the footprint and
 *     exposures are fixed). The only randomness is event FREQUENCY.
 *   - Simulate `years` annual trials. In each year, draw a Poisson count for each
 *     event from its annualRate (λ). The event contributes its (fixed) ground-up
 *     loss once per occurrence.
 *   - Per year track: aggregate loss (sum over all occurrences) and max single
 *     occurrence loss.
 *   - AAL = mean annual aggregate loss.
 *   - AEP (aggregate exceedance probability) return-period losses = percentiles of
 *     the sorted annual-aggregate distribution.
 *   - OEP (occurrence exceedance probability) return-period losses = percentiles of
 *     the sorted per-year-max-occurrence distribution.
 *   - PML = the 1-in-250yr OEP (a standard PML convention; configurable).
 *   - TVaR (tail value at risk) at a return period = mean of the AEP losses at or
 *     beyond that return-period threshold.
 *
 * Return-period → percentile: a T-year loss is the (1 − 1/T) quantile of the annual
 * distribution (e.g. 1-in-100 = 99th percentile). We use the "nearest-rank on a
 * sorted ascending array" estimator: index = ceil((1 − 1/T) × N) − 1, clamped.
 */

import { eventGroundUpLoss, type CatEvent, type CatExposure } from './eventLoss';
import type { DamageCurveSet } from './damageCurves';

/** Seeded PRNG — mulberry32. Deterministic uniform in [0,1). NOT Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw a Poisson(λ) count using Knuth's algorithm with a supplied uniform RNG.
 * Deterministic given the RNG. For the small λ typical of a cited event set this
 * is exact and cheap.
 */
export function poissonSample(lambda: number, rng: () => number): number {
  if (!(lambda > 0)) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  // Guard against pathological large λ (Knuth degrades); cap iterations generously.
  do {
    k += 1;
    p *= rng();
  } while (p > L && k < 10000);
  return k - 1;
}

export type SimulateEPOptions = {
  /** Number of simulated years. Default 10,000. */
  years?: number;
  /** PRNG seed for reproducibility. Default 1. */
  seed?: number;
  /** Return periods (years) to report OEP/AEP losses at. Default [100,250,500]. */
  returnPeriods?: number[];
  /** Return period used for PML. Default 250 (1-in-250 OEP). */
  pmlReturnPeriod?: number;
};

export type ReturnPeriodLoss = { returnPeriod: number; loss: number };

export type SimulateEPResult = {
  aal: number;
  /** Standard deviation of annual aggregate loss (volatility, for provenance). */
  aggStdDev: number;
  oep: ReturnPeriodLoss[];
  aep: ReturnPeriodLoss[];
  /** 1-in-`pmlReturnPeriod` OEP loss. */
  pml: number;
  /** TVaR of annual aggregate loss at each requested return period. */
  tvar: ReturnPeriodLoss[];
  simYears: number;
  seed: number;
  eventCount: number;
  /** Per-event fixed ground-up loss (provenance / debugging). */
  eventLosses: Array<{ eventId: string; peril: string; annualRate: number; groundUpLoss: number }>;
};

/** Nearest-rank percentile loss for a T-year return period over a SORTED-ASC array. */
export function returnPeriodLoss(sortedAsc: number[], returnPeriod: number): number {
  const n = sortedAsc.length;
  if (n === 0 || !(returnPeriod > 1)) {
    return n > 0 ? sortedAsc[n - 1] : 0;
  }
  const q = 1 - 1 / returnPeriod; // e.g. 1-in-100 → 0.99
  let idx = Math.ceil(q * n) - 1;
  if (idx < 0) idx = 0;
  if (idx > n - 1) idx = n - 1;
  return sortedAsc[idx];
}

/** TVaR: mean of losses at or beyond the T-year threshold over a SORTED-ASC array. */
export function tvarAtReturnPeriod(sortedAsc: number[], returnPeriod: number): number {
  const n = sortedAsc.length;
  if (n === 0 || !(returnPeriod > 1)) {
    return n > 0 ? sortedAsc[n - 1] : 0;
  }
  const q = 1 - 1 / returnPeriod;
  let idx = Math.ceil(q * n) - 1;
  if (idx < 0) idx = 0;
  if (idx > n - 1) idx = n - 1;
  let sum = 0;
  for (let i = idx; i < n; i += 1) sum += sortedAsc[i];
  return sum / (n - idx);
}

/**
 * Run the seeded Monte-Carlo EP simulation. Deterministic given the seed.
 *
 * Returns AAL (= mean annual aggregate loss), OEP/AEP return-period losses, PML,
 * TVaR, and the per-event ground-up losses. With zero events or zero loss-bearing
 * exposures the result is all-zero (caller decides whether that is a defer case).
 */
export function simulateEP(
  events: CatEvent[],
  exposures: CatExposure[],
  curveSet: DamageCurveSet,
  options?: SimulateEPOptions,
): SimulateEPResult {
  const years = Math.max(1, Math.floor(options?.years ?? 10000));
  const seed = options?.seed ?? 1;
  const returnPeriods = options?.returnPeriods ?? [100, 250, 500];
  const pmlReturnPeriod = options?.pmlReturnPeriod ?? 250;

  // Deterministic per-event ground-up loss (frequency is the only randomness).
  const eventLosses = events.map((e) => ({
    eventId: e.eventId,
    peril: e.peril,
    annualRate: e.annualRate,
    groundUpLoss: eventGroundUpLoss(exposures, e, curveSet),
  }));

  const rng = mulberry32(seed);
  const annualAggregate = new Array<number>(years);
  const annualMaxOccurrence = new Array<number>(years);
  let aggSum = 0;
  let aggSumSq = 0;

  for (let y = 0; y < years; y += 1) {
    let yearAgg = 0;
    let yearMax = 0;
    for (let i = 0; i < events.length; i += 1) {
      const count = poissonSample(events[i].annualRate, rng);
      if (count > 0) {
        const lossEach = eventLosses[i].groundUpLoss;
        yearAgg += count * lossEach;
        if (lossEach > yearMax) yearMax = lossEach;
      }
    }
    annualAggregate[y] = yearAgg;
    annualMaxOccurrence[y] = yearMax;
    aggSum += yearAgg;
    aggSumSq += yearAgg * yearAgg;
  }

  const aal = aggSum / years;
  const variance = Math.max(0, aggSumSq / years - aal * aal);
  const aggStdDev = Math.sqrt(variance);

  const sortedAgg = [...annualAggregate].sort((a, b) => a - b);
  const sortedOcc = [...annualMaxOccurrence].sort((a, b) => a - b);

  const aep = returnPeriods.map((rp) => ({ returnPeriod: rp, loss: returnPeriodLoss(sortedAgg, rp) }));
  const oep = returnPeriods.map((rp) => ({ returnPeriod: rp, loss: returnPeriodLoss(sortedOcc, rp) }));
  const tvar = returnPeriods.map((rp) => ({ returnPeriod: rp, loss: tvarAtReturnPeriod(sortedAgg, rp) }));
  const pml = returnPeriodLoss(sortedOcc, pmlReturnPeriod);

  return {
    aal,
    aggStdDev,
    oep,
    aep,
    pml,
    tvar,
    simYears: years,
    seed,
    eventCount: events.length,
    eventLosses,
  };
}

/** The 1-in-100 AEP (annual aggregate 99th percentile) — the value mapped to var99. */
export function aep1in100(result: SimulateEPResult): number | null {
  const hit = result.aep.find((r) => r.returnPeriod === 100);
  return hit ? hit.loss : null;
}
