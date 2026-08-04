import { selectModelStrategy, selectRatingStrategy } from '../registry/strategy';
import type { RatingStrategy, RiskModelStrategy } from '../registry/types';

/**
 * The compute spine depends on this small port rather than the concrete strategy
 * registry. Production wires the registry here; tests or another runtime can
 * supply a different resolver without modifying compute orchestration.
 */
export interface ComputeStrategyPort {
  modelFor(method: string | null | undefined): RiskModelStrategy;
  ratingFor(method: string | null | undefined): RatingStrategy;
}

export const registryComputeStrategyPort: ComputeStrategyPort = {
  modelFor: selectModelStrategy,
  ratingFor: selectRatingStrategy,
};
