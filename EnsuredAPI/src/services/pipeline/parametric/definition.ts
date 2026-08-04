/**
 * Slice 5.1 — Parametric spec on CANONICAL DATA (PURE, DB-free).
 *
 * The parametric trigger spec rides on the Slice-1 canonical-data framework: it is
 * DATA inside `CanonicalSubmission.data.parametric` (and/or registry
 * `methodParams.parametric`), NOT a new table. This module:
 *   - defines the canonical extension keys the parametric strategy reads,
 *   - normalizes the structurer's CITED exceedance curve into a clean band set,
 *   - computes expected annual loss = Σ_bands [ marginalProb × payout(indexValue) ],
 *     where `payout` is the SAFE formula evaluator applied to `payoutFormula`.
 *
 * FOUNDER DECISIONS (locked):
 *   1. PROBABILITY = DECLARED + CITED ONLY. The structurer supplies the exceedance
 *      curve and a `probabilitySource` citation. We NEVER derive or fabricate a
 *      probability. No cited probability ⇒ the model is UNMODELABLE (expectedLoss
 *      null) and the compute path falls back to the benchmark default low-confidence.
 *   2. PAYOUT = SAFE PARSER. Payout per band is `evaluateFormula(payoutFormula,
 *      { [indexName]: indexValue, limit })` — a hand-written sandboxed evaluator.
 *
 * Marginal probability between consecutive SORTED exceedance points (ascending
 * index value) = AEP(thisPoint) − AEP(nextHigherPoint). The highest point keeps its
 * own AEP as the tail mass. A BINARY trigger is the single-point case:
 * expectedLoss = AEP × payout(threshold).
 */

import { evaluateFormula } from './formula';

/**
 * Canonical parametric extension shape, read from `data.parametric` and/or merged
 * registry `methodParams.parametric`. Documented here as the single source of truth.
 */
export type ParametricExceedancePointInput = {
  /** The index/trigger value at this point (e.g. wind speed 130, rainfall mm 200). */
  indexValue: number | string;
  /** Annual exceedance probability at this index value (0..1). Either this ... */
  annualExceedanceProbability?: number | string | null;
  /** ... or a return period in years (AEP = 1/T). One of the two is required. */
  returnPeriodYears?: number | string | null;
};

export type ParametricSpecInput = {
  /** Variable name the payout formula binds the index to (e.g. 'wind'). */
  indexName?: string | null;
  /** The payout formula string, e.g. 'min(limit,(wind-130)*125000)'. */
  payoutFormula?: string | null;
  /** The CITED exceedance curve points (>= 1). */
  exceedancePoints?: ParametricExceedancePointInput[] | null;
  /** Citation for the probability source (REQUIRED — uncited ⇒ unmodelable). */
  probabilitySource?: string | null;
  /** Optional coverage limit; falls back to data.financials.limit / Deal limit. */
  limit?: number | string | null;
};

/** A normalized, validated exceedance point (AEP resolved, index numeric). */
export type NormalizedExceedancePoint = {
  indexValue: number;
  annualExceedanceProbability: number;
};

/** A priced band: the marginal probability mass and the payout at its index value. */
export type ParametricBand = {
  indexValue: number;
  /** Marginal probability mass attributed to this band. */
  marginalProb: number;
  /** Payout evaluated at this band's index value (safe formula). */
  payout: number;
};

export type ParametricModelOk = {
  ok: true;
  expectedLoss: number;
  bands: ParametricBand[];
  indexName: string;
  probabilitySource: string;
};

export type ParametricModelErr = {
  ok: false;
  reason: string;
};

export type ParametricModelResult = ParametricModelOk | ParametricModelErr;

function toNumberOrNull(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Merge the canonical `data.parametric` with registry `methodParams.parametric`
 * (registry overrides canonical key-by-key) and an explicit `limit` fallback.
 * Pure; tolerant of missing/garbage shapes (returns an empty-ish spec).
 */
export function assembleParametricSpec(
  dataParametric: unknown,
  methodParamsParametric: unknown,
  limitFallback: number | null | undefined,
): ParametricSpecInput {
  const base =
    dataParametric && typeof dataParametric === 'object' && !Array.isArray(dataParametric)
      ? (dataParametric as Record<string, unknown>)
      : {};
  const override =
    methodParamsParametric && typeof methodParamsParametric === 'object' && !Array.isArray(methodParamsParametric)
      ? (methodParamsParametric as Record<string, unknown>)
      : {};

  const merged: Record<string, unknown> = { ...base, ...override };

  const spec: ParametricSpecInput = {
    indexName: typeof merged.indexName === 'string' ? merged.indexName : null,
    payoutFormula: typeof merged.payoutFormula === 'string' ? merged.payoutFormula : null,
    exceedancePoints: Array.isArray(merged.exceedancePoints)
      ? (merged.exceedancePoints as ParametricExceedancePointInput[])
      : null,
    probabilitySource: typeof merged.probabilitySource === 'string' ? merged.probabilitySource : null,
    limit: merged.limit != null ? (merged.limit as number | string) : (limitFallback ?? null),
  };

  return spec;
}

/**
 * Normalize the structurer's exceedance points:
 *   - resolve AEP from `annualExceedanceProbability` OR `returnPeriodYears` (1/T),
 *   - require a numeric index value and a valid AEP in (0, 1],
 *   - sort ASCENDING by index value,
 *   - reject duplicates / non-monotonic AEP (AEP must be non-increasing as the
 *     index rises — a higher trigger is rarer).
 *
 * Returns `{ ok:false }` with a reason on any violation; never throws.
 */
export function normalizeExceedancePoints(
  points: ParametricExceedancePointInput[] | null | undefined,
): { ok: true; points: NormalizedExceedancePoint[] } | { ok: false; reason: string } {
  if (!Array.isArray(points) || points.length === 0) {
    return { ok: false, reason: 'no exceedance points declared' };
  }

  const normalized: NormalizedExceedancePoint[] = [];
  for (const p of points) {
    if (!p || typeof p !== 'object') {
      return { ok: false, reason: 'malformed exceedance point' };
    }
    const indexValue = toNumberOrNull(p.indexValue);
    if (indexValue == null) {
      return { ok: false, reason: 'exceedance point missing numeric indexValue' };
    }

    let aep = toNumberOrNull(p.annualExceedanceProbability);
    if (aep == null) {
      const t = toNumberOrNull(p.returnPeriodYears);
      if (t != null && t > 0) {
        aep = 1 / t;
      }
    }
    if (aep == null) {
      return { ok: false, reason: 'exceedance point missing AEP and returnPeriodYears' };
    }
    if (!(aep > 0) || aep > 1) {
      return { ok: false, reason: `AEP out of range (0,1]: ${aep}` };
    }

    normalized.push({ indexValue, annualExceedanceProbability: aep });
  }

  normalized.sort((a, b) => a.indexValue - b.indexValue);

  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i].indexValue === normalized[i - 1].indexValue) {
      return { ok: false, reason: `duplicate indexValue ${normalized[i].indexValue}` };
    }
    // A higher index value (rarer event) must not have a HIGHER AEP than a lower
    // one — that would be a non-physical curve and would yield negative marginal
    // mass. Reject rather than silently clamp.
    if (normalized[i].annualExceedanceProbability > normalized[i - 1].annualExceedanceProbability) {
      return {
        ok: false,
        reason: 'AEP must be non-increasing as index value increases (monotonic exceedance curve)',
      };
    }
  }

  return { ok: true, points: normalized };
}

/**
 * Compute expected annual loss for a parametric trigger from a CITED exceedance
 * curve + a payout formula. Returns the band breakdown for provenance.
 *
 * Math:
 *   sorted points p[0..k] ascending by index value, AEP non-increasing.
 *   marginalProb(i) = AEP(i) − AEP(i+1)   for i < k
 *   marginalProb(k) = AEP(k)              (the tail keeps its own mass)
 *   payout(i) = evaluateFormula(payoutFormula, { [indexName]: indexValue(i), limit })
 *   expectedLoss = Σ_i marginalProb(i) × payout(i)
 *
 * Binary (single point): marginalProb = AEP, expectedLoss = AEP × payout(threshold).
 *
 * UNMODELABLE (returns { ok:false }) when:
 *   - no cited `probabilitySource`,
 *   - no/invalid exceedance points,
 *   - no `payoutFormula`,
 *   - the formula fails to evaluate at any band (invalid/unsafe formula).
 */
export function computeParametricExpectedLoss(spec: ParametricSpecInput): ParametricModelResult {
  const probabilitySource = typeof spec.probabilitySource === 'string' ? spec.probabilitySource.trim() : '';
  if (!probabilitySource) {
    return { ok: false, reason: 'no_cited_probability_source' };
  }

  const indexName = typeof spec.indexName === 'string' ? spec.indexName.trim() : '';
  if (!indexName) {
    return { ok: false, reason: 'no_index_name' };
  }

  const payoutFormula = typeof spec.payoutFormula === 'string' ? spec.payoutFormula.trim() : '';
  if (!payoutFormula) {
    return { ok: false, reason: 'no_payout_formula' };
  }

  const limit = toNumberOrNull(spec.limit);

  const norm = normalizeExceedancePoints(spec.exceedancePoints);
  if (!norm.ok) {
    return { ok: false, reason: norm.reason };
  }
  const pts = norm.points;

  const bands: ParametricBand[] = [];
  let expectedLoss = 0;

  for (let i = 0; i < pts.length; i += 1) {
    const point = pts[i];
    const nextAep = i + 1 < pts.length ? pts[i + 1].annualExceedanceProbability : 0;
    const marginalProb = point.annualExceedanceProbability - nextAep;
    // marginalProb should be >= 0 given the monotonic check; guard anyway.
    if (marginalProb < 0) {
      return { ok: false, reason: 'negative marginal probability' };
    }

    const vars: Record<string, number> = { [indexName]: point.indexValue };
    if (limit != null) {
      vars.limit = limit;
    }

    const evaluated = evaluateFormula(payoutFormula, vars);
    if (!evaluated.ok) {
      return { ok: false, reason: `payout_formula_invalid: ${evaluated.error}` };
    }
    const payout = evaluated.value;

    bands.push({ indexValue: point.indexValue, marginalProb, payout });
    expectedLoss += marginalProb * payout;
  }

  if (!Number.isFinite(expectedLoss)) {
    return { ok: false, reason: 'expected loss non-finite' };
  }

  return { ok: true, expectedLoss, bands, indexName, probabilitySource };
}
