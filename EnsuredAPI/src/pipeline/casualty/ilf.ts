/**
 * Slice 5.3 — Casualty Increased Limits Factor (ILF) curve math (PURE, DB-free).
 *
 * An ILF curve expresses how expected loss grows as the policy limit rises above a
 * basis (reference) limit. ILF(basisLimit) = 1.0 by definition; ILF(L) for L >
 * basisLimit is > 1 (more limit ⇒ more expected loss); for L < basisLimit it is
 * < 1. The curve is concave (diminishing marginal cost of higher layers) — a
 * standard casualty-pricing primitive (ISO/NCCI-style increased-limits tables).
 *
 * The curve lives in the EXISTING `benchmark_priors.paramsJson` as:
 *   paramsJson.ilf = {
 *     basisLimit: number,                       // the reference limit (ILF = 1.0 here)
 *     points: [{ limit: number, factor: number }, ...],   // table, any order
 *     interpolation: 'linear'                   // only 'linear' supported in 5.3
 *   }
 *
 * This module is the pure, hand-verifiable core: given a curve and a target
 * coverage limit it returns the ILF to apply. It NEVER fabricates: a malformed or
 * absent curve yields `{ ok: false }` and the caller degrades to the plain
 * loss-ratio result (factor 1.0, ilfApplied = false). No DB, no clock, no network.
 */

export type IlfPoint = { limit: number; factor: number };

export type IlfCurve = {
  basisLimit: number;
  points: IlfPoint[];
  interpolation?: 'linear';
};

function readNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse + validate a raw `paramsJson.ilf` blob into a usable curve. Returns null
 * (no opinion) when the blob is missing, malformed, or has fewer than one valid
 * point. We do not guess a curve — a bad curve must degrade, not lie.
 */
export function parseIlfCurve(raw: unknown): IlfCurve | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const basisLimit = readNumber(obj.basisLimit);
  if (basisLimit == null || basisLimit <= 0) return null;

  const rawPoints = Array.isArray(obj.points) ? obj.points : [];
  const points: IlfPoint[] = [];
  for (const p of rawPoints) {
    if (!p || typeof p !== 'object') continue;
    const limit = readNumber((p as Record<string, unknown>).limit);
    const factor = readNumber((p as Record<string, unknown>).factor);
    if (limit == null || factor == null || limit <= 0 || factor < 0) continue;
    points.push({ limit, factor });
  }
  if (points.length === 0) return null;

  // Sort ascending by limit; de-dup keeping the first factor for a given limit.
  points.sort((a, b) => a.limit - b.limit);
  const deduped: IlfPoint[] = [];
  const seen = new Set<number>();
  for (const p of points) {
    if (seen.has(p.limit)) continue;
    seen.add(p.limit);
    deduped.push(p);
  }

  const interpolation = obj.interpolation === 'linear' ? 'linear' : 'linear';
  return { basisLimit, points: deduped, interpolation };
}

export type IlfLookup =
  | { ok: true; factor: number; method: 'exact' | 'interpolated' | 'clamped_low' | 'clamped_high' }
  | { ok: false; reason: string };

/**
 * Look up the ILF for `limit` on `curve`, expressed RELATIVE TO the basis limit
 * (so the factor at basisLimit is normalized to 1.0). We derive a basis factor by
 * evaluating the raw curve at `basisLimit` and divide every evaluated factor by it,
 * so the returned factor is exactly 1.0 when limit == basisLimit regardless of how
 * the table was scaled.
 *
 * Interpolation: linear between the two bracketing points. Below the smallest
 * tabulated limit ⇒ clamp to the smallest point's factor (`clamped_low`); above the
 * largest ⇒ clamp to the largest point's factor (`clamped_high`). Clamping is the
 * conservative, non-fabricating choice (we do not extrapolate a curve we were not
 * given). Returns `{ ok: false }` only when the curve itself is unusable.
 */
export function lookupIlf(curve: IlfCurve | null, limit: number | null): IlfLookup {
  if (!curve) return { ok: false, reason: 'no_ilf_curve' };
  if (limit == null || !Number.isFinite(limit) || limit <= 0) {
    return { ok: false, reason: 'no_coverage_limit' };
  }

  const basisEval = evaluateRaw(curve.points, curve.basisLimit);
  if (basisEval.value == null || basisEval.value <= 0) {
    return { ok: false, reason: 'invalid_basis_factor' };
  }

  const rawAtLimit = evaluateRaw(curve.points, limit);
  if (rawAtLimit.value == null) {
    return { ok: false, reason: 'curve_evaluation_failed' };
  }

  const factor = rawAtLimit.value / basisEval.value;
  return { ok: true, factor, method: rawAtLimit.method };
}

type RawEval = {
  value: number | null;
  method: 'exact' | 'interpolated' | 'clamped_low' | 'clamped_high';
};

/** Evaluate the raw (un-normalized) curve at a limit. */
function evaluateRaw(points: IlfPoint[], limit: number): RawEval {
  if (points.length === 0) return { value: null, method: 'exact' };

  // Exact hit.
  const exact = points.find((p) => p.limit === limit);
  if (exact) return { value: exact.factor, method: 'exact' };

  const first = points[0];
  const last = points[points.length - 1];

  if (limit < first.limit) return { value: first.factor, method: 'clamped_low' };
  if (limit > last.limit) return { value: last.factor, method: 'clamped_high' };

  // Linear interpolation between bracketing points.
  for (let i = 0; i < points.length - 1; i += 1) {
    const lo = points[i];
    const hi = points[i + 1];
    if (limit >= lo.limit && limit <= hi.limit) {
      const span = hi.limit - lo.limit;
      if (span <= 0) return { value: lo.factor, method: 'exact' };
      const t = (limit - lo.limit) / span;
      const value = lo.factor + t * (hi.factor - lo.factor);
      return { value, method: 'interpolated' };
    }
  }

  return { value: last.factor, method: 'clamped_high' };
}
