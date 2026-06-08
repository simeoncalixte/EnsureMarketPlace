import type { BenchmarkPriorRow } from '../benchmarkPriors/resolve';
import type { ModelOutput, PricingOutput } from '../registry/types';
import type { BlendResult } from './credibility';

/**
 * Slice 5.0 — PURE compute helpers (DB-free, unit-tested).
 *
 * These are the deterministic core of the missing compute path: building the
 * strategy `params` object from the resolved prior + registry method params +
 * exposure, and mapping strategy outputs to the columns the platform persists.
 */

function readNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The exposure context a caller derives from canonical data. */
export type ExposureContext = {
  /** Exposure base (e.g. TIV / revenue / payroll amount) the model multiplies by a loss rate. */
  exposureBase: number | null;
  /** Which basis the exposureBase represents, when known (provenance only). */
  exposureBasis?: string | null;
};

/**
 * Build the strategy `params` object.
 *
 * Layering (least → most specific): benchmark prior → registry methodParams.
 *  - `exposureBase` comes from the exposure context (TIV/revenue/payroll amount).
 *  - `lossRate`, `targetLossRatio`, `expenseRatio`, `marginTarget` come from the
 *    PRIOR, then are OVERRIDDEN by anything the registry methodParams declares
 *    (an org's registry config beats the platform/benchmark prior).
 *  - `expectedLoss` is left for the caller to inject after the model runs (the
 *    rating strategy needs it); we seed it from params only if already present.
 *
 * Pure: no DB, no clock. Given the same inputs it always returns the same object.
 */
export function assembleParams(
  prior: BenchmarkPriorRow | null,
  registryMethodParams: Record<string, unknown> | null | undefined,
  exposure: ExposureContext,
): Record<string, unknown> {
  const reg = registryMethodParams && typeof registryMethodParams === 'object' ? registryMethodParams : {};

  const params: Record<string, unknown> = {};

  // Exposure base (from canonical data / caller).
  const exposureBase = readNumber(exposure?.exposureBase);
  if (exposureBase != null) {
    params.exposureBase = exposureBase;
  }
  if (exposure?.exposureBasis != null) {
    params.exposureBasis = exposure.exposureBasis;
  } else if (prior?.exposureBasis != null) {
    params.exposureBasis = prior.exposureBasis;
  }

  // Prior-derived rate/ratio inputs.
  if (prior?.lossRate != null) {
    params.lossRate = prior.lossRate;
  }
  if (prior?.targetLossRatio != null) {
    params.targetLossRatio = prior.targetLossRatio;
  }
  if (prior?.expenseRatio != null) {
    params.expenseRatio = prior.expenseRatio;
  }
  if (prior?.marginTarget != null) {
    params.marginTarget = prior.marginTarget;
  }

  // Registry methodParams OVERRIDE the prior. Spread last so org config wins.
  for (const [key, value] of Object.entries(reg)) {
    params[key] = value;
  }

  return params;
}

/**
 * Derive `expectedReturn` and `riskScore` HONESTLY from the build-up, or leave
 * them null + flagged. Founder constraint #2: never the old constants
 * 0.1280 / 0.6120.
 *
 *  - expectedReturn: target underwriting margin we actually used. If a
 *    `marginTarget` flowed through params, that IS the modeled expected return on
 *    premium (a defensible build-up component). Otherwise null + flagged.
 *  - riskScore: derived from the technical loss ratio implied by the build-up
 *    (expectedLoss / technicalPremium). A higher implied loss ratio ⇒ higher risk
 *    score. If we lack both numbers, null + flagged. NEVER a constant.
 */
export function deriveReturnAndRisk(
  expectedLossCost: number | null,
  technicalPremium: number | null,
  params: Record<string, unknown>,
): {
  expectedReturn: number | null;
  riskScore: number | null;
  flags: string[];
} {
  const flags: string[] = [];

  const marginTarget = readNumber(params?.marginTarget);
  let expectedReturn: number | null = null;
  if (marginTarget != null) {
    expectedReturn = marginTarget;
  } else {
    flags.push('expectedReturn:not_derived_no_margin_target');
  }

  let riskScore: number | null = null;
  if (expectedLossCost != null && technicalPremium != null && technicalPremium > 0) {
    // Implied technical loss ratio, clamped to [0,1] as a normalized risk score.
    const lossRatio = expectedLossCost / technicalPremium;
    riskScore = Math.min(1, Math.max(0, lossRatio));
  } else {
    flags.push('riskScore:not_derived_insufficient_inputs');
  }

  return { expectedReturn, riskScore, flags };
}

/** A DECIMAL column wants a string (or null). Convert a number safely. */
export function toDecimalString(value: number | null): string | null {
  return value != null && Number.isFinite(value) ? String(value) : null;
}

export type PersistenceMapping = {
  /** ModelRun.expectedLoss ← model expectedLossCost (string for DECIMAL). */
  expectedLoss: string | null;
  /** ModelRun.var99 is ALWAYS null until the cat engine (5.2). */
  var99: null;
  /** PricingVersion.premium ← rating technicalPremium (string for DECIMAL). */
  premium: string;
  /** PricingVersion.expectedReturn — derived or null. */
  expectedReturn: string | null;
  /** PricingVersion.riskScore — derived or null. */
  riskScore: string | null;
  /** RiskMetric expected_loss value (string), null when no loss cost. */
  riskMetricExpectedLoss: string | null;
};

/**
 * Map strategy outputs + credibility blend to the exact column values the platform
 * persists. This is the value-mapping logic the unit tests pin:
 *  - expectedLoss ← the BLENDED loss cost (Z*experience + (1-Z)*prior).
 *  - var99 ← null (NOT modeled until the cat engine, 5.2).
 *  - premium ← technicalPremium (0 when the strategy could not derive one — a
 *    PricingVersion's premium column is NOT NULL, so we floor at 0 and flag it).
 *  - expectedReturn / riskScore ← derived-or-null.
 */
export function mapToPersistence(
  model: ModelOutput,
  pricing: PricingOutput,
  blendedLossCost: BlendResult,
  expectedReturn: number | null,
  riskScore: number | null,
): PersistenceMapping {
  const lossCost = blendedLossCost.value;
  const technicalPremium = pricing.technicalPremium;

  return {
    expectedLoss: toDecimalString(lossCost),
    var99: null,
    // PricingVersion.premium is NOT NULL in the schema; floor an underivable
    // premium at '0.00' and let the assumptionsJson flag carry the honesty note.
    premium: technicalPremium != null && Number.isFinite(technicalPremium) ? String(technicalPremium) : '0',
    expectedReturn: toDecimalString(expectedReturn),
    riskScore: toDecimalString(riskScore),
    riskMetricExpectedLoss: toDecimalString(lossCost),
  };
}
