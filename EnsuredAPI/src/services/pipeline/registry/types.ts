/**
 * Strategy-selection contracts for the Risk Class Registry (Slice 2).
 *
 * These types are the seam every domain engine (Risk Modeling Lead, Chief
 * Actuary, Chief Underwriting Officer, Ingestion & Extraction Lead) builds
 * against. An engine resolves a risk class to a `RiskClassResolution`, then looks
 * the resolved method strings up in a strategy registry — it never branches on a
 * known line of business.
 *
 * NOTHING in the running pipeline consumes these yet; Slice 2 ships the spine and
 * the socket only. Adoption is Slices 4 (appetite) and 5 (modeling/rating).
 */

/**
 * Where a resolution came from in the specificity ladder. `generic_default` means
 * no registry row matched and the platform-wide generic strategy was used.
 */
export type RiskClassResolvedFrom =
  | 'org_subtype'
  | 'org_primary'
  | 'platform_subtype'
  | 'platform_primary'
  | 'generic_default';

/**
 * The total, never-null result of resolving a risk class. `riskModelingMethod` and
 * `ratingMethod` are always non-empty (the generic default fills them when unset),
 * so a brand-new risk class flows end-to-end on day one with zero code changes.
 */
export type RiskClassResolution = {
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  schemaVersionId: number | null;
  /** Resolved modeling method, never empty (generic default if unset). */
  riskModelingMethod: string;
  /** Resolved rating method, never empty (generic default if unset). */
  ratingMethod: string;
  appetiteDimensions: Record<string, unknown>;
  requiredDataFields: string[];
  methodParams: Record<string, unknown>;
  resolvedFrom: RiskClassResolvedFrom;
};

/**
 * Minimal modeling-strategy input. Deliberately open-shaped in Slice 2: the real
 * cat / casualty / parametric inputs are defined by the Risk Modeling Lead in
 * Slice 5. The generic default does not depend on any specific field.
 */
export type RiskModelStrategyInput = {
  /** Canonical submission data (or any subset a caller chooses to pass). */
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Minimal modeling-strategy output. `expectedLossCost` is the one universal
 * quantity a generic burning-cost model produces; specialized strategies add
 * their own keys (EP curves, loss triangles, trigger probabilities) in Slice 5.
 */
export type ModelOutput = {
  method: string;
  expectedLossCost: number | null;
  /** Free-form strategy detail; never interpreted by the spine. */
  detail: Record<string, unknown>;
};

export type RatingStrategyInput = {
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export type PricingOutput = {
  method: string;
  /** Technical premium the strategy derives, or null when it cannot. */
  technicalPremium: number | null;
  detail: Record<string, unknown>;
};

/**
 * A named risk-modeling strategy. Engines select one by name from the registry;
 * the spine never knows what math it does.
 */
export interface RiskModelStrategy {
  method: string;
  run(input: RiskModelStrategyInput, params: Record<string, unknown>): ModelOutput;
}

/**
 * A named rating strategy. Engines select one by name from the registry.
 */
export interface RatingStrategy {
  method: string;
  price(input: RatingStrategyInput, params: Record<string, unknown>): PricingOutput;
}

/**
 * The generic-default method names. These are the resolution and strategy
 * fallbacks — the roadmap's stated generic default (loss-cost / loss-ratio from
 * experience). Real specialized methods are registered in Slice 5.
 */
export const GENERIC_MODELING_METHOD = 'generic_burning_cost';
export const GENERIC_RATING_METHOD = 'generic_loss_ratio';
