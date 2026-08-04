/**
 * Slice 5.3 — Casualty ILF rating strategy (PURE, DB-free).
 *
 * `casualty_ilf` — RatingStrategy. Builds a technical premium from the
 * (credibility-blended) expected loss the compute path injects as
 * `params.expectedLoss`, using the SAME transparent loss-ratio / load build-up the
 * generic and parametric strategies use, then APPLIES an Increased Limits Factor
 * (ILF) for the submission's coverage limit relative to the curve's basis limit.
 *
 * The ILF curve rides on the EXISTING `benchmark_priors.paramsJson.ilf` and arrives
 * in `params.ilf`. The coverage limit arrives in `params.limit` (the compute path
 * binds it the same way it does for parametric). If there is no ILF curve OR no
 * coverage limit OR the curve is unusable, the strategy DEGRADES to the plain
 * loss-ratio premium (factor 1.0, `ilfApplied = false`) — it never fabricates a
 * factor and never crashes.
 *
 * Build-up order (mirrors parametric_premium so behavior is consistent):
 *   1. base premium from expectedLoss:
 *        - load build-up   (when riskLoad / expenseRatio / marginTarget present):
 *            base = expectedLoss × (1 + riskLoad) / (1 − expense − margin)
 *        - else loss-ratio build-up:
 *            base = expectedLoss / targetLossRatio
 *   2. ilfFactor = ILF(limit) / ILF(basisLimit)   (1.0 at basis by construction)
 *   3. technicalPremium = base × ilfFactor
 *   4. expose lossOnLine = expectedLoss / limit and rateOnLine = technicalPremium / limit
 *
 * Registered in src/pipeline/registry/strategy.ts ALONGSIDE the generic defaults;
 * the generic strategies are untouched. No DB, no clock, no network.
 */

import type {
  PricingOutput,
  RatingStrategy,
  RatingStrategyInput,
} from '../registry/types';
import { lookupIlf, parseIlfCurve } from './ilf';

export const CASUALTY_ILF_RATING_METHOD = 'casualty_ilf';

function readNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Build the base technical premium (pre-ILF) from the blended expected loss. */
function buildBasePremium(
  expectedLoss: number,
  params: Record<string, unknown>,
): { base: number | null; buildUp: string | null; flags: string[] } {
  const targetLossRatio = readNumber(params?.targetLossRatio);
  const riskLoad = readNumber(params?.riskLoad);
  const expenseRatio = readNumber(params?.expenseRatio);
  const marginTarget = readNumber(params?.marginTarget);
  const flags: string[] = [];

  if (riskLoad != null || expenseRatio != null || marginTarget != null) {
    const riskLoaded = expectedLoss * (1 + (riskLoad ?? 0));
    const loadFactor = 1 - (expenseRatio ?? 0) - (marginTarget ?? 0);
    if (loadFactor > 0) {
      return { base: riskLoaded / loadFactor, buildUp: 'load_buildup', flags };
    }
    flags.push('premium:invalid_expense_margin_load');
    return { base: null, buildUp: null, flags };
  }

  if (targetLossRatio != null && targetLossRatio > 0) {
    return { base: expectedLoss / targetLossRatio, buildUp: 'loss_ratio', flags };
  }

  flags.push('premium:no_load_or_target_loss_ratio');
  return { base: null, buildUp: null, flags };
}

export const casualtyIlfRatingStrategy: RatingStrategy = {
  method: CASUALTY_ILF_RATING_METHOD,
  price(_input: RatingStrategyInput, params: Record<string, unknown>): PricingOutput {
    const expectedLoss = readNumber(params?.expectedLoss);
    const limit = readNumber(params?.limit);
    const flags: string[] = [];

    if (expectedLoss == null) {
      return {
        method: CASUALTY_ILF_RATING_METHOD,
        technicalPremium: null,
        detail: {
          strategy: 'casualty_ilf',
          buildUp: null,
          ilfApplied: false,
          ilfFactor: null,
          ilfMethod: null,
          ilfReason: 'no_expected_loss',
          expectedLoss: null,
          limit,
          basisLimit: null,
          rateOnLine: null,
          lossOnLine: null,
          flags: ['premium:no_expected_loss'],
          note: 'Casualty ILF rating: no expected loss to build a premium from.',
        },
      };
    }

    // 1. Base premium (pre-ILF) from the blended expected loss.
    const built = buildBasePremium(expectedLoss, params);
    flags.push(...built.flags);
    const basePremium = built.base;

    // 2. ILF factor for the coverage limit relative to the curve basis. Degrade to
    //    1.0 (no ILF) when there is no curve, no limit, or the curve is unusable.
    const curve = parseIlfCurve(params?.ilf);
    const lookup = lookupIlf(curve, limit);
    let ilfFactor = 1;
    let ilfApplied = false;
    let ilfMethod: string | null = null;
    let ilfReason: string | null = null;

    if (lookup.ok) {
      ilfFactor = lookup.factor;
      ilfApplied = true;
      ilfMethod = lookup.method;
    } else {
      ilfReason = lookup.reason;
      flags.push(`ilf:degraded_${lookup.reason}`);
    }

    // 3. Apply the ILF to the base premium (never to a null base).
    const technicalPremium = basePremium != null ? basePremium * ilfFactor : null;

    // 4. ROL / LOL when a limit is present.
    const rateOnLine =
      technicalPremium != null && limit != null && limit > 0 ? technicalPremium / limit : null;
    const lossOnLine = limit != null && limit > 0 ? expectedLoss / limit : null;

    if (technicalPremium != null && technicalPremium <= expectedLoss) {
      flags.push('premium:not_above_expected_loss');
    }

    return {
      method: CASUALTY_ILF_RATING_METHOD,
      technicalPremium,
      detail: {
        strategy: 'casualty_ilf',
        buildUp: built.buildUp,
        ilfApplied,
        ilfFactor: ilfApplied ? ilfFactor : null,
        ilfMethod,
        ilfReason,
        basePremium,
        expectedLoss,
        limit,
        basisLimit: curve?.basisLimit ?? null,
        targetLossRatio: readNumber(params?.targetLossRatio),
        riskLoad: readNumber(params?.riskLoad),
        expenseRatio: readNumber(params?.expenseRatio),
        marginTarget: readNumber(params?.marginTarget),
        rateOnLine,
        lossOnLine,
        flags,
        note:
          'Casualty ILF build-up: base premium from blended expected loss × ILF(limit)/ILF(basisLimit). Degrades to plain loss-ratio when no ILF curve or limit.',
      },
    };
  },
};
