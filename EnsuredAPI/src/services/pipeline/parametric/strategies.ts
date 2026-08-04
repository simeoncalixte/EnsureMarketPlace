/**
 * Slice 5.1 — Parametric modeling + rating strategies (PURE, DB-free).
 *
 * `parametric_trigger`  — RiskModelStrategy: reads the parametric spec from
 *   `input.data.parametric` (⊕ `params.parametric` registry override ⊕ `params.limit`),
 *   evaluates the CITED exceedance curve × the SAFE payout formula, and returns the
 *   expected annual loss + per-band breakdown. Null expectedLossCost (with a reason)
 *   when there is no cited probability or the formula is invalid — NEVER a guess.
 *
 * `parametric_premium` — RatingStrategy: transparent build-up from the (credibility-
 *   blended) expected loss. Two supported build-ups, chosen by available params:
 *     - loss-ratio:   premium = expectedLoss / targetLossRatio        (uses the
 *                     parametric benchmark prior's targetLossRatio 0.75)
 *     - load build-up: premium = expectedLoss × (1 + riskLoad) / (1 − expense − margin)
 *   Exposes rateOnLine = premium/limit and lossOnLine = expectedLoss/limit, and a
 *   sanity flag when premium <= expectedLoss.
 *
 * These are REGISTERED in src/pipeline/registry/strategy.ts ALONGSIDE the generic
 * defaults — the generic strategies are not modified. No DB, no clock, no network.
 */

import type {
  ModelOutput,
  PricingOutput,
  RatingStrategy,
  RatingStrategyInput,
  RiskModelStrategy,
  RiskModelStrategyInput,
} from '../registry/types';
import {
  assembleParametricSpec,
  computeParametricExpectedLoss,
  type ParametricBand,
} from './definition';

export const PARAMETRIC_MODELING_METHOD = 'parametric_trigger';
export const PARAMETRIC_RATING_METHOD = 'parametric_premium';

function readNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parametric modeling strategy. Reads `data.parametric` and the registry
 * `params.parametric` override; `params.limit` (or the spec's own limit) binds the
 * `limit` variable in the payout formula.
 */
export const parametricTriggerModelStrategy: RiskModelStrategy = {
  method: PARAMETRIC_MODELING_METHOD,
  run(input: RiskModelStrategyInput, params: Record<string, unknown>): ModelOutput {
    const data = input?.data && typeof input.data === 'object' ? input.data : {};
    const dataParametric = (data as Record<string, unknown>).parametric;
    const methodParamsParametric = params?.parametric;
    const limitFallback = readNumber(params?.limit);

    const spec = assembleParametricSpec(dataParametric, methodParamsParametric, limitFallback);
    const result = computeParametricExpectedLoss(spec);

    if (!result.ok) {
      // UNMODELABLE — honest null with a machine-readable reason. The compute path
      // falls back to the benchmark default with a low-confidence flag.
      return {
        method: PARAMETRIC_MODELING_METHOD,
        expectedLossCost: null,
        detail: {
          strategy: 'parametric_trigger',
          modelable: false,
          reason: result.reason,
          basisRisk: true,
          indexName: typeof spec.indexName === 'string' ? spec.indexName : null,
          probabilitySource: typeof spec.probabilitySource === 'string' ? spec.probabilitySource : null,
          note:
            'Parametric trigger UNMODELABLE: no cited probability or invalid payout formula. No probability fabricated; falls back to benchmark default.',
        },
      };
    }

    return {
      method: PARAMETRIC_MODELING_METHOD,
      expectedLossCost: result.expectedLoss,
      detail: {
        strategy: 'parametric_trigger',
        modelable: true,
        bands: result.bands as unknown as ParametricBand[],
        basisRisk: true,
        probabilitySource: result.probabilitySource,
        indexName: result.indexName,
        bandCount: result.bands.length,
        note: 'Expected annual loss = Σ marginalProb × payout(indexValue); probability DECLARED + CITED by structurer.',
      },
    };
  },
};

/**
 * Parametric rating strategy. Transparent build-up from the blended expected loss
 * (injected as `params.expectedLoss` by the compute path).
 */
export const parametricPremiumRatingStrategy: RatingStrategy = {
  method: PARAMETRIC_RATING_METHOD,
  price(_input: RatingStrategyInput, params: Record<string, unknown>): PricingOutput {
    const expectedLoss = readNumber(params?.expectedLoss);
    const limit = readNumber(params?.limit);
    const targetLossRatio = readNumber(params?.targetLossRatio);
    const riskLoad = readNumber(params?.riskLoad);
    const expenseRatio = readNumber(params?.expenseRatio);
    const marginTarget = readNumber(params?.marginTarget);

    const flags: string[] = [];
    let technicalPremium: number | null = null;
    let buildUp: string | null = null;

    if (expectedLoss == null) {
      flags.push('premium:no_expected_loss');
    } else if (riskLoad != null || expenseRatio != null || marginTarget != null) {
      // Explicit load build-up:
      //   technical = expectedLoss × (1 + riskLoad); then gross up for expense+margin.
      const riskLoaded = expectedLoss * (1 + (riskLoad ?? 0));
      const loadFactor = 1 - (expenseRatio ?? 0) - (marginTarget ?? 0);
      if (loadFactor > 0) {
        technicalPremium = riskLoaded / loadFactor;
        buildUp = 'load_buildup';
      } else {
        flags.push('premium:invalid_expense_margin_load');
      }
    } else if (targetLossRatio != null && targetLossRatio > 0) {
      // Loss-ratio build-up (the parametric prior carries targetLossRatio 0.75).
      technicalPremium = expectedLoss / targetLossRatio;
      buildUp = 'loss_ratio';
    } else {
      flags.push('premium:no_load_or_target_loss_ratio');
    }

    const rateOnLine =
      technicalPremium != null && limit != null && limit > 0 ? technicalPremium / limit : null;
    const lossOnLine = expectedLoss != null && limit != null && limit > 0 ? expectedLoss / limit : null;

    if (technicalPremium != null && expectedLoss != null && technicalPremium <= expectedLoss) {
      flags.push('premium:not_above_expected_loss');
    }

    return {
      method: PARAMETRIC_RATING_METHOD,
      technicalPremium,
      detail: {
        strategy: 'parametric_premium',
        buildUp,
        expectedLoss,
        limit,
        targetLossRatio,
        riskLoad,
        expenseRatio,
        marginTarget,
        rateOnLine,
        lossOnLine,
        flags,
        note: 'Transparent parametric build-up; ROL = premium/limit, LOL = expectedLoss/limit.',
      },
    };
  },
};
