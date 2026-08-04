/**
 * Slice 3 — best-effort, DB-free derivation of a taxonomy code from a submission's
 * free-text line of business.
 *
 * `Submission` has no LOB column today; LOB lives as free text inside
 * `CanonicalSubmission.data` / extracted fields. This helper maps that free text
 * to a `LineOfBusinessPrimaryType` / `LineOfBusinessSubType` code so a submission
 * can be pinned to the right published schema version.
 *
 * It is deliberately CONSERVATIVE: if it cannot confidently map the text it returns
 * `{ primaryCode: null, subTypeCode: null }`. An unmatched result is the safe path —
 * it yields no pin and therefore no enforcement (the non-degradation guarantee).
 * This function never throws and never touches the database.
 */

export type DerivedLob = {
  primaryCode: string | null;
  subTypeCode: string | null;
};

/**
 * The platform taxonomy primary codes + their labels, mirrored from
 * `src/db/seed-data/lineOfBusinessTaxonomy.ts`. Kept as a flat list here so the
 * derivation is a pure, DB-free function (the seed file is the source of truth;
 * this is a read-only projection of its primary codes/labels).
 *
 * Sub-type derivation intentionally reuses the seed's `${primary}_${suffix}`
 * convention but is only attempted when an exact code or label match is found, to
 * stay conservative.
 */
const TAXONOMY_PRIMARIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'property', label: 'Property' },
  { code: 'commercial_property', label: 'Commercial Property' },
  { code: 'residential_property', label: 'Residential Property' },
  { code: 'catastrophe_property', label: 'Catastrophe Property' },
  { code: 'inland_marine', label: 'Inland Marine' },
  { code: 'ocean_marine', label: 'Ocean Marine' },
  { code: 'cargo', label: 'Cargo' },
  { code: 'hull', label: 'Hull' },
  { code: 'aviation', label: 'Aviation' },
  { code: 'general_liability', label: 'General Liability' },
  { code: 'product_liability', label: 'Product Liability' },
  { code: 'excess_liability', label: 'Excess Liability' },
  { code: 'umbrella_liability', label: 'Umbrella Liability' },
  { code: 'professional_liability', label: 'Professional Liability' },
  { code: 'errors_omissions', label: 'Errors & Omissions' },
  { code: 'directors_officers', label: 'Directors & Officers' },
  { code: 'employment_practices', label: 'Employment Practices' },
  { code: 'fiduciary_liability', label: 'Fiduciary Liability' },
  { code: 'cyber', label: 'Cyber' },
  { code: 'data_breach', label: 'Data Breach' },
  { code: 'crime', label: 'Crime' },
  { code: 'fidelity', label: 'Fidelity' },
  { code: 'trade_credit', label: 'Trade Credit' },
  { code: 'surety', label: 'Surety' },
  { code: 'political_risk', label: 'Political Risk' },
  { code: 'mortgage_credit', label: 'Mortgage Credit' },
  { code: 'energy_property', label: 'Energy Property' },
  { code: 'energy_liability', label: 'Energy Liability' },
  { code: 'construction_all_risk', label: 'Construction All Risk' },
  { code: 'builders_risk', label: 'Builders Risk' },
  { code: 'equipment_breakdown', label: 'Equipment Breakdown' },
  { code: 'workers_compensation', label: 'Workers Compensation' },
  { code: 'employers_liability', label: 'Employers Liability' },
  { code: 'commercial_auto', label: 'Commercial Auto' },
  { code: 'personal_auto', label: 'Personal Auto' },
  { code: 'personal_umbrella', label: 'Personal Umbrella' },
  { code: 'farm_ranch', label: 'Farm & Ranch' },
  { code: 'crop', label: 'Crop' },
  { code: 'livestock', label: 'Livestock' },
  { code: 'forestry', label: 'Forestry' },
  { code: 'environmental_liability', label: 'Environmental Liability' },
  { code: 'terrorism', label: 'Terrorism' },
  { code: 'parametric_weather', label: 'Parametric Weather' },
  { code: 'catastrophe_bond', label: 'Catastrophe Bond' },
  { code: 'reinsurance_treaty', label: 'Reinsurance Treaty' },
  { code: 'stop_loss', label: 'Stop Loss' },
  { code: 'life', label: 'Life' },
  { code: 'term_life', label: 'Term Life' },
  { code: 'whole_life', label: 'Whole Life' },
  { code: 'universal_life', label: 'Universal Life' },
  { code: 'group_life', label: 'Group Life' },
  { code: 'accident_health', label: 'Accident & Health' },
  { code: 'disability_income', label: 'Disability Income' },
  { code: 'travel', label: 'Travel' },
  { code: 'pet', label: 'Pet' },
  { code: 'legal_expenses', label: 'Legal Expenses' },
  { code: 'public_entity', label: 'Public Entity' },
  { code: 'education', label: 'Education' },
  { code: 'healthcare', label: 'Healthcare' },
  { code: 'hospitality', label: 'Hospitality' },
];

/**
 * Normalize free text for matching: lowercase, trim, collapse separators
 * (spaces / hyphens / ampersands) to a single underscore. Mirrors the
 * `${code}_${suffix}` convention so `"Commercial Property"`, `"commercial-property"`,
 * and `"commercial_property"` all normalize identically.
 */
function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const NORMALIZED_LABEL_TO_CODE: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const primary of TAXONOMY_PRIMARIES) {
    map.set(primary.code, primary.code);
    map.set(normalizeForMatch(primary.label), primary.code);
  }
  return map;
})();

/**
 * Derive a taxonomy `{ primaryCode, subTypeCode }` from free-text inputs.
 *
 * Resolution is conservative and CODE-FIRST:
 *   1. If a structured `lineOfBusinessCode` is already present and is a known
 *      taxonomy primary code, use it directly (and honor a structured
 *      `lineOfBusinessSubTypeCode` if it is consistent with that primary).
 *   2. Otherwise normalize the free-text `lineOfBusiness` string and match it
 *      against known primary codes / labels (exact, normalized).
 *   3. If still unmatched, attempt a single conservative sub-type inference: when
 *      the normalized text starts with a known primary code followed by `_<suffix>`
 *      (e.g. `commercial_property_office`), pin the primary and carry the
 *      remainder as the sub-type code.
 *
 * Anything ambiguous returns nulls. NEVER throws.
 */
export function deriveLobCodes(input: {
  lineOfBusiness?: unknown;
  lineOfBusinessCode?: unknown;
  lineOfBusinessSubTypeCode?: unknown;
}): DerivedLob {
  const none: DerivedLob = { primaryCode: null, subTypeCode: null };

  const structuredPrimary = asNonEmptyString(input.lineOfBusinessCode);
  const structuredSubType = asNonEmptyString(input.lineOfBusinessSubTypeCode);

  // 1. Trust an explicit, known structured primary code.
  if (structuredPrimary) {
    const normalizedPrimary = normalizeForMatch(structuredPrimary);
    const knownPrimary = NORMALIZED_LABEL_TO_CODE.get(normalizedPrimary);
    if (knownPrimary) {
      const subType = pickConsistentSubType(knownPrimary, structuredSubType);
      return { primaryCode: knownPrimary, subTypeCode: subType };
    }
  }

  // 2. Match the free-text line-of-business string.
  const freeText = asNonEmptyString(input.lineOfBusiness);
  if (!freeText) {
    return none;
  }

  const normalized = normalizeForMatch(freeText);
  if (!normalized) {
    return none;
  }

  const directPrimary = NORMALIZED_LABEL_TO_CODE.get(normalized);
  if (directPrimary) {
    const subType = pickConsistentSubType(directPrimary, structuredSubType);
    return { primaryCode: directPrimary, subTypeCode: subType };
  }

  // 3. Conservative `<primary>_<suffix>` inference. Longest primary-code prefix wins
  //    so `commercial_property_office` resolves to primary `commercial_property`,
  //    not `property`.
  let bestPrimary: string | null = null;
  for (const primary of TAXONOMY_PRIMARIES) {
    const prefix = `${primary.code}_`;
    if (normalized.startsWith(prefix) && normalized.length > prefix.length) {
      if (bestPrimary == null || primary.code.length > bestPrimary.length) {
        bestPrimary = primary.code;
      }
    }
  }
  if (bestPrimary) {
    const remainder = normalized.slice(bestPrimary.length + 1);
    const inferredSubType = remainder ? `${bestPrimary}_${remainder}` : null;
    const subType = pickConsistentSubType(bestPrimary, structuredSubType ?? inferredSubType ?? undefined);
    return { primaryCode: bestPrimary, subTypeCode: subType };
  }

  return none;
}

/**
 * A sub-type code is only kept when it is consistent with the resolved primary
 * (i.e. it begins with `<primary>_`). Inconsistent / unknown sub-types are dropped
 * rather than guessed — the primary pin alone is still safe.
 */
function pickConsistentSubType(primaryCode: string, subType: string | null | undefined): string | null {
  const candidate = asNonEmptyString(subType);
  if (!candidate) {
    return null;
  }
  const normalized = normalizeForMatch(candidate);
  if (normalized.startsWith(`${primaryCode}_`) && normalized.length > primaryCode.length + 1) {
    return normalized;
  }
  return null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
