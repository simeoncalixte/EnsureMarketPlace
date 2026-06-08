import { lineOfBusinessTaxonomy } from '../../db/seed-data/lineOfBusinessTaxonomy';

export type TaxonomyOption = { code: string; label: string };

export type LineOfBusinessTaxonomySlice = {
  /** Every primary line of business in the catalog (compact {code,label}). */
  primaryTypes: TaxonomyOption[];
  /** The classified primary, when it matched the catalog. */
  matchedPrimary: TaxonomyOption | null;
  /** Valid sub-types under the matched primary (empty when unmatched). */
  subTypes: TaxonomyOption[];
  /** Whether the classified line-of-business code/label was found in the catalog. */
  recognized: boolean;
};

function norm(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Resolve the slice of the line-of-business taxonomy relevant to one submission:
 * the full (compact) list of primary lines, plus the valid sub-types under the
 * primary the classification stage chose. This is what makes the schema agent
 * taxonomy-aware — it can constrain any line-of-business / sub-type choice fields
 * to real values and offer a corrective sub-type selector when the classification
 * looks off. Pure: reads only the static seed catalog, no DB.
 */
export function resolveLineOfBusinessTaxonomySlice(
  lineOfBusinessCode: string | null,
  lineOfBusinessLabel?: string | null,
): LineOfBusinessTaxonomySlice {
  const primaryTypes = lineOfBusinessTaxonomy.map((primary) => ({ code: primary.code, label: primary.label }));
  const code = norm(lineOfBusinessCode);
  const label = norm(lineOfBusinessLabel);
  const matched = lineOfBusinessTaxonomy.find(
    (primary) => (code && norm(primary.code) === code) || (label && norm(primary.label) === label),
  ) ?? null;

  return {
    primaryTypes,
    matchedPrimary: matched ? { code: matched.code, label: matched.label } : null,
    subTypes: matched ? matched.subTypes.map((sub) => ({ code: sub.code, label: sub.label })) : [],
    recognized: Boolean(matched),
  };
}
