import {
  GENERIC_MODELING_METHOD,
  GENERIC_RATING_METHOD,
  ModelOutput,
  PricingOutput,
  RatingStrategy,
  RatingStrategyInput,
  RiskModelStrategy,
  RiskModelStrategyInput,
} from './types';
import {
  PARAMETRIC_MODELING_METHOD,
  PARAMETRIC_RATING_METHOD,
  parametricPremiumRatingStrategy,
  parametricTriggerModelStrategy,
} from '../parametric/strategies';
import {
  CASUALTY_ILF_RATING_METHOD,
  casualtyIlfRatingStrategy,
} from '../casualty/strategies';
import { CAT_MODELING_METHOD, catExposureModelStrategy } from '../catastrophe/strategies';

/**
 * Strategy registries for the Risk Class Registry (Slice 2).
 *
 * `selectModelStrategy(method)` / `selectRatingStrategy(method)` map a method name
 * to its implementation. ANY unknown or empty name falls back to the generic
 * default, so an engine can never crash on an unrecognized method string.
 *
 * Slice 2 registers ONLY the generic defaults. The real cat / casualty /
 * parametric / technical-premium strategies are the Risk Modeling Lead's and
 * Chief Actuary's work in Slice 5 — they register additional entries here without
 * touching this default or any engine.
 *
 * These functions are pure: no DB, no network, no clock. Given the same method
 * name they always return the same strategy object.
 */

function readNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * GENERIC DEFAULT modeling strategy — `generic_burning_cost`.
 *
 * Deliberately minimal and clearly labeled as a default. It applies a burning-cost
 * (loss-cost) estimate: expected loss = exposure base × loss rate, where both are
 * read from `methodParams` when present and otherwise produce `null` (no opinion).
 * It contains NO line-of-business-specific math. Real modeling math lands in
 * Slice 5; this only keeps the contract total so a brand-new line still flows.
 */
export const genericBurningCostModelStrategy: RiskModelStrategy = {
  method: GENERIC_MODELING_METHOD,
  run(_input: RiskModelStrategyInput, params: Record<string, unknown>): ModelOutput {
    const exposureBase = readNumber(params?.exposureBase);
    const lossRate = readNumber(params?.lossRate);

    const expectedLossCost =
      exposureBase != null && lossRate != null ? exposureBase * lossRate : null;

    return {
      method: GENERIC_MODELING_METHOD,
      expectedLossCost,
      detail: {
        strategy: 'generic_default',
        note: 'Generic burning-cost placeholder; specialized modeling lands in Slice 5.',
        exposureBase,
        lossRate,
      },
    };
  },
};

/**
 * GENERIC DEFAULT rating strategy — `generic_loss_ratio`.
 *
 * Minimal, clearly labeled default. Derives a technical premium from an expected
 * loss and a target loss ratio (premium = expectedLoss / targetLossRatio), both
 * read from `methodParams` when present, otherwise `null`. No line-specific rating
 * math. Real rating (technical premium, rate-on-line, etc.) lands in Slice 5.
 */
export const genericLossRatioRatingStrategy: RatingStrategy = {
  method: GENERIC_RATING_METHOD,
  price(_input: RatingStrategyInput, params: Record<string, unknown>): PricingOutput {
    const expectedLoss = readNumber(params?.expectedLoss);
    const targetLossRatio = readNumber(params?.targetLossRatio);

    const technicalPremium =
      expectedLoss != null && targetLossRatio != null && targetLossRatio > 0
        ? expectedLoss / targetLossRatio
        : null;

    return {
      method: GENERIC_RATING_METHOD,
      technicalPremium,
      detail: {
        strategy: 'generic_default',
        note: 'Generic loss-ratio placeholder; specialized rating lands in Slice 5.',
        expectedLoss,
        targetLossRatio,
      },
    };
  },
};

// Registry maps. Generic defaults (Slice 2) PLUS specialized strategies (Slice 5).
// The generic defaults above are unmodified; Slice 5.1 adds the parametric entries
// alongside them. Any unknown/empty method still falls back to the generic default.
const modelStrategyRegistry = new Map<string, RiskModelStrategy>([
  [GENERIC_MODELING_METHOD, genericBurningCostModelStrategy],
  [PARAMETRIC_MODELING_METHOD, parametricTriggerModelStrategy],
  // Slice 5.2 — catastrophe exposure-rating model registered alongside the generic
  // + parametric defaults. The generic/parametric/casualty entries are unchanged.
  [CAT_MODELING_METHOD, catExposureModelStrategy],
]);

const ratingStrategyRegistry = new Map<string, RatingStrategy>([
  [GENERIC_RATING_METHOD, genericLossRatioRatingStrategy],
  [PARAMETRIC_RATING_METHOD, parametricPremiumRatingStrategy],
  // Slice 5.3 — casualty ILF rating registered alongside the generic + parametric
  // defaults. Generic strategies above are unmodified.
  [CASUALTY_ILF_RATING_METHOD, casualtyIlfRatingStrategy],
]);

/**
 * Select a modeling strategy by method name. Unknown/empty ⇒ generic default.
 * Never throws, never returns undefined.
 */
export function selectModelStrategy(method: string | null | undefined): RiskModelStrategy {
  const key = typeof method === 'string' ? method.trim() : '';
  return modelStrategyRegistry.get(key) ?? genericBurningCostModelStrategy;
}

/**
 * Select a rating strategy by method name. Unknown/empty ⇒ generic default.
 * Never throws, never returns undefined.
 */
export function selectRatingStrategy(method: string | null | undefined): RatingStrategy {
  const key = typeof method === 'string' ? method.trim() : '';
  return ratingStrategyRegistry.get(key) ?? genericLossRatioRatingStrategy;
}
