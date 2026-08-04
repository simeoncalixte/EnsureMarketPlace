import { CASUALTY_ILF_RATING_METHOD } from '../casualty/strategies';
import { CAT_MODELING_METHOD } from '../catastrophe/strategies';
import { GENERIC_MODELING_METHOD, GENERIC_RATING_METHOD } from './types';
import { upsertRegistry } from './upsert';
import { RiskClassRegistry } from '../../../db/models/riskClassRegistry.models';

/**
 * Slice 5.3 — PLATFORM-DEFAULT risk-class registry rows that select the
 * `casualty_ilf` rating strategy for the casualty lines in the benchmark tranche.
 *
 * These are `organizationId = null` (platform default) rows in the EXISTING
 * `risk_class_registry` table. They declare:
 *   - ratingMethod        = 'casualty_ilf'          (so compute applies the ILF curve)
 *   - riskModelingMethod  = 'generic_burning_cost'  (modeling stays generic)
 *
 * The ILF curve itself lives in the benchmark prior's paramsJson.ilf (not here); the
 * compute path reads it when the resolved rating method is casualty_ilf. We declare
 * registry rows ONLY for lines that carry an ILF curve in the tranche — workers_comp
 * and surety are intentionally left on the generic rating method (statutory / non
 * increased-limit-rated lines).
 *
 * Idempotent: uses the existing `upsertRegistry` path keyed by
 * (organizationId, lob, subtype). Re-running changes nothing. Does NOT run
 * automatically; callers invoke it explicitly (server dev-seed + seed script).
 * NO new table, NO schema change — pure data on the existing registry.
 */

/** Casualty primary lines that have an ILF curve in the tranche → casualty_ilf rating. */
export const CASUALTY_ILF_REGISTRY_LINES = [
  'professional_liability',
  'directors_officers',
  'errors_omissions',
  'product_liability',
  'commercial_auto',
  'cyber',
] as const;

export async function seedCasualtyRegistryRows(): Promise<RiskClassRegistry[]> {
  const results: RiskClassRegistry[] = [];
  for (const lob of CASUALTY_ILF_REGISTRY_LINES) {
    const row = await upsertRegistry({
      organizationId: null,
      lineOfBusinessCode: lob,
      lineOfBusinessSubTypeCode: '',
      riskModelingMethod: GENERIC_MODELING_METHOD,
      ratingMethod: CASUALTY_ILF_RATING_METHOD,
      createdByUserId: null,
    });
    results.push(row);
  }
  return results;
}

/**
 * Slice 5.2 — PLATFORM-DEFAULT registry row selecting the `cat_exposure` modeling
 * strategy for `catastrophe_property`. organizationId = null (platform default) in
 * the EXISTING risk_class_registry table. Declares:
 *   - riskModelingMethod = 'cat_exposure'        (compute runs the cat engine)
 *   - ratingMethod       = 'generic_loss_ratio'  (rating stays generic; the cat
 *      engine produces AAL, the generic rater prices it / targetLossRatio)
 *
 * The cited default damage-curve set lives on the catastrophe_property benchmark
 * prior's paramsJson (and as a code default); the cited EVENT SET rides on each
 * submission's data.catEventSet. When neither is present the engine DEFERS to the
 * catastrophe_property benchmark prior — no fabricated cat number.
 *
 * Idempotent via upsertRegistry (keyed by org+lob+subtype). NO new table.
 */
export const CAT_EXPOSURE_REGISTRY_LINE = 'catastrophe_property';

export async function seedCatRegistryRows(): Promise<RiskClassRegistry[]> {
  const row = await upsertRegistry({
    organizationId: null,
    lineOfBusinessCode: CAT_EXPOSURE_REGISTRY_LINE,
    lineOfBusinessSubTypeCode: '',
    riskModelingMethod: CAT_MODELING_METHOD,
    ratingMethod: GENERIC_RATING_METHOD,
    createdByUserId: null,
  });
  return [row];
}
