import { asNumber, toRecord } from './coerce';
import { AppetiteProfileLike } from './appetiteEngine';

/**
 * Projects an active CapacityDefinition into the `AppetiteProfileLike` shape the
 * pure appetite engine consumes. The dedicated `appetite` JSONB block is
 * authoritative; the natural spec-domain block is a fallback so the generic
 * governance editor can also drive enforcement where it already has fields.
 *
 * Pure, total and null-safe: a definition with an empty `appetite` block yields a
 * no-op profile (every field []/null), preserving the "no appetite ⇒ no
 * constraints ⇒ IN_APPETITE" contract of `loadAppetiteForTenant`.
 */

/** Structural subset of CapacityDefinition this adapter reads (keeps it pure/testable). */
export type CapacityDefinitionLike = {
  id?: number;
  name?: string;
  description?: string | null;
  appetite?: unknown;
  riskEligibility?: unknown;
  geographicControls?: unknown;
  exposureConstraints?: unknown;
  pricingControls?: unknown;
  riskScoring?: unknown;
  workflowConfig?: unknown;
};

/** Coerce to a string[] (preserving case), or null when not a non-empty array. */
function strArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const list = value.map((item) => String(item).trim()).filter((item) => item.length > 0);
  return list.length > 0 ? list : null;
}

/** Pass through a money-ish value (string|number) or null. */
function moneyOrNull(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  return null;
}

/** Coerce a peril→capacity map: object with finite numeric values, lowercased keys. */
function capacityMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const rec = toRecord(value);
  for (const [key, raw] of Object.entries(rec)) {
    const num = asNumber(raw);
    if (num !== null && num >= 0) out[key.trim().toLowerCase()] = num;
  }
  return out;
}

export function definitionToAppetiteProfile(def: CapacityDefinitionLike): AppetiteProfileLike {
  const appetite = toRecord(def.appetite);
  const eligibility = toRecord(def.riskEligibility);
  const geo = toRecord(def.geographicControls);
  const exposure = toRecord(def.exposureConstraints);
  const pricing = toRecord(def.pricingControls);
  const scoring = toRecord(def.riskScoring);
  const workflow = toRecord(def.workflowConfig);

  /** appetite[key] wins when present; otherwise the spec-block fallback value. */
  const pick = (key: string, fallback: unknown): unknown =>
    Object.prototype.hasOwnProperty.call(appetite, key) && appetite[key] !== undefined ? appetite[key] : fallback;

  return {
    id: def.id,
    name: def.name,
    description: def.description ?? null,
    preferredPerils: strArray(pick('preferredPerils', eligibility.eligibleRiskCategories)),
    excludedPerils: strArray(pick('excludedPerils', eligibility.excludedRiskCategories)),
    allowedLinesOfBusiness: strArray(pick('allowedLinesOfBusiness', eligibility.eligibleLinesOfBusiness)),
    preferredJurisdictions: strArray(pick('preferredJurisdictions', geo.allowedTerritories)),
    excludedJurisdictions: strArray(pick('excludedJurisdictions', geo.excludedTerritories)),
    maxLineSize: moneyOrNull(pick('maxLineSize', exposure.maxLineSize)),
    minCoverageLimit: moneyOrNull(pick('minCoverageLimit', exposure.minCoverageLimit)),
    maxCoverageLimit: moneyOrNull(pick('maxCoverageLimit', exposure.maxCoverageLimit)),
    capacityByPeril: capacityMap(pick('capacityByPeril', null)),
    minTargetYield: moneyOrNull(pick('minTargetYield', pricing.minTargetYield)),
    minDataQualityScore: asNumber(pick('minDataQualityScore', scoring.minDataQualityScore)),
    requiredFields: strArray(pick('requiredFields', workflow.requiredFields)),
  };
}
