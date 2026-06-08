/**
 * Slice 5.0 — Credibility module (PURE, DB-free).
 *
 * Classical (limited-fluctuation) credibility: blend an organization's own loss
 * EXPERIENCE with an industry/benchmark PRIOR, weighted by Z, the credibility of
 * the experience. The square-root rule is the standard partial-credibility
 * formula (Z = sqrt(n / nFull), capped at 1).
 *
 * HONESTY CONTRACT (founder constraint #2): today the platform accrues NO internal
 * loss experience (no observed claim counts feed this), so callers pass
 * `experience = null` / `n = 0`, which yields Z = 0 and a pure-prior blend. This
 * module reports Z = 0 truthfully; it never fabricates experience.
 *
 * Nothing here touches a DB, a clock, or the network. Given the same inputs it
 * always returns the same result, so it is trivially unit-testable.
 */

/** Confidence label derived from Z — how much weight the experience earned. */
export type ConfidenceLabel = 'benchmark_low' | 'developing' | 'credible';

export type BlendResult = {
  /** The credibility-weighted value, or null when neither input is available. */
  value: number | null;
  /** Credibility actually applied (0 when experience is null/absent). */
  z: number;
  /** Human-readable confidence band derived from `z`. */
  confidenceLabel: ConfidenceLabel;
  /** Which input(s) actually drove the result — for provenance. */
  basis: 'experience_only' | 'prior_only' | 'blended' | 'none';
  experience: number | null;
  prior: number | null;
};

/**
 * Classical credibility Z = min(1, sqrt(n / nFull)).
 *
 * Safe handling: any non-finite, n <= 0, or nFull <= 0 ⇒ Z = 0 (no experience is
 * credible). n >= nFull ⇒ Z = 1 (full credibility). Always returns a number in
 * [0, 1].
 */
export function credibilityZ(n: number, nFull: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(nFull)) {
    return 0;
  }
  if (n <= 0 || nFull <= 0) {
    return 0;
  }
  const z = Math.sqrt(n / nFull);
  if (z >= 1) {
    return 1;
  }
  return z;
}

/**
 * Map a credibility Z to a confidence band:
 *   Z < 0.2          → 'benchmark_low'  (essentially the prior; little/no experience)
 *   0.2 <= Z <= 0.7  → 'developing'     (partial credibility)
 *   Z > 0.7          → 'credible'       (experience dominates)
 */
export function confidenceLabel(z: number): ConfidenceLabel {
  if (!Number.isFinite(z) || z < 0.2) {
    return 'benchmark_low';
  }
  if (z > 0.7) {
    return 'credible';
  }
  return 'developing';
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Credibility blend: value = Z * experience + (1 - Z) * prior.
 *
 * Null-handling, in order:
 *   - experience null/absent ⇒ return the prior, with Z forced to 0 and
 *     basis 'prior_only' (we never let an absent experience claim credibility).
 *   - prior null/absent (but experience present) ⇒ return the experience,
 *     basis 'experience_only' (Z is reported as the caller's Z; with nothing to
 *     blend against, the experience stands alone).
 *   - both present ⇒ the weighted blend, basis 'blended'.
 *   - both null ⇒ value null, Z 0, basis 'none'.
 *
 * `z` is clamped into [0, 1] defensively.
 */
export function blend(
  experience: number | null | undefined,
  prior: number | null | undefined,
  z: number,
): BlendResult {
  const exp = isFiniteNumber(experience) ? experience : null;
  const pri = isFiniteNumber(prior) ? prior : null;
  const clampedZ = !Number.isFinite(z) ? 0 : Math.min(1, Math.max(0, z));

  // No experience ⇒ pure prior, and we honestly report Z = 0.
  if (exp == null) {
    if (pri == null) {
      return {
        value: null,
        z: 0,
        confidenceLabel: confidenceLabel(0),
        basis: 'none',
        experience: null,
        prior: null,
      };
    }
    return {
      value: pri,
      z: 0,
      confidenceLabel: confidenceLabel(0),
      basis: 'prior_only',
      experience: null,
      prior: pri,
    };
  }

  // Experience present but no prior to blend against ⇒ experience stands alone.
  if (pri == null) {
    return {
      value: exp,
      z: clampedZ,
      confidenceLabel: confidenceLabel(clampedZ),
      basis: 'experience_only',
      experience: exp,
      prior: null,
    };
  }

  // Both present ⇒ the classical credibility blend.
  const value = clampedZ * exp + (1 - clampedZ) * pri;
  return {
    value,
    z: clampedZ,
    confidenceLabel: confidenceLabel(clampedZ),
    basis: 'blended',
    experience: exp,
    prior: pri,
  };
}
