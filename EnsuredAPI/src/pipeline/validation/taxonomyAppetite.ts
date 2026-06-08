/**
 * Slice 4 — taxonomy-aware line-of-business appetite (PURE, DB-free).
 *
 * This is an AUGMENTATION over the existing free-text LOB matcher
 * (`evaluateLineOfBusinessAppetite` in ./appetiteEngine.ts). It is consulted only
 * when (a) a taxonomy code resolves for the submission AND (b) the org has declared
 * taxonomy-aware appetite data (allowed/excluded LOB codes). When either is absent,
 * this module signals "no decision" so the caller falls back to the unchanged
 * free-text path. It NEVER throws and performs no I/O.
 *
 * Hierarchy rules (taxonomy codes follow the seed convention `${primary}_${suffix}`,
 * e.g. primary `residential_property`, subtype `residential_property_single_family`):
 *   - An allowed/excluded entry that is a PRIMARY code matches the submission's
 *     primary AND all of that primary's subtypes.
 *   - An allowed/excluded entry equal to a SUBTYPE code matches that subtype exactly.
 *   - EXCLUDED takes precedence over ALLOWED: if the submission matches both an
 *     excluded entry and an allowed entry, it is OUT.
 *
 * Decision semantics (mirrors the free-text matcher's spirit):
 *   - Matches an excluded entry            → OUT_OF_APPETITE (severity reject)
 *   - Allowed list non-empty, no allowed
 *     match (and not excluded)             → FLAGGED (severity flag), same as the
 *                                            free-text "not in the allowed set"
 *   - Otherwise                            → IN_APPETITE
 */

import { AppetiteDecision, AppetiteDecisions, AppetiteFinding } from './appetiteEngine';

/** The org's taxonomy-aware LOB declaration: code lists with hierarchy support. */
export type TaxonomyLobDeclaration = {
  allowedLineOfBusinessCodes: string[];
  excludedLineOfBusinessCodes: string[];
};

/** The submission's resolved taxonomy LOB, as derived/resolved upstream. */
export type ResolvedLobCode = {
  primaryCode: string | null;
  subTypeCode: string | null;
};

/**
 * The result of a taxonomy-aware LOB evaluation. `applied: false` means the
 * function declined to decide (no resolved code or no declaration) and the caller
 * MUST fall back to the free-text matcher. `applied: true` carries a decision and
 * the findings to merge into the appetite result.
 */
export type TaxonomyLobOutcome =
  | { applied: false }
  | { applied: true; decision: AppetiteDecision; findings: AppetiteFinding[] };

/** Normalize a single code the same way derivation/seed codes are shaped. */
function normalizeCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Normalize, de-blank and de-dupe a list of codes. */
function normalizeCodeList(values: readonly unknown[] | null | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    const code = normalizeCode(value);
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

/**
 * Does a declared entry match the submission's resolved taxonomy code, honoring
 * hierarchy? An entry that equals the primary matches the primary and every
 * subtype under it (subtypes are `${primary}_...`). An entry that equals the
 * subtype matches exactly. Returns the matched entry (for explainability) or null.
 *
 * `subTypeMatch` distinguishes a primary-level match from a subtype-level match so
 * the reason can name which one fired.
 */
function findMatch(
  entries: string[],
  primary: string,
  subType: string,
): { entry: string; level: 'primary' | 'subtype' } | null {
  for (const entry of entries) {
    // Exact subtype match (e.g. entry === 'residential_property_single_family').
    if (subType && entry === subType) {
      return { entry, level: 'subtype' };
    }
    // Exact primary match (entry === the submission's primary).
    if (primary && entry === primary) {
      return { entry, level: 'primary' };
    }
    // Primary entry that subsumes the submission's subtype
    // (entry === 'residential_property' matches subtype 'residential_property_single_family').
    if (subType && entry && subType.startsWith(`${entry}_`)) {
      return { entry, level: 'primary' };
    }
  }
  return null;
}

/** The most specific code on the submission, used in human-readable reasons. */
function describeSubject(primary: string, subType: string): string {
  return subType || primary;
}

/**
 * Evaluate the submission's resolved taxonomy LOB against the org's taxonomy-aware
 * declaration. PURE. See module header for hierarchy + decision semantics.
 *
 * Returns `{ applied: false }` (defer to the free-text matcher) when:
 *   - the submission has no resolved taxonomy code (no primary and no subtype), OR
 *   - the org declared no taxonomy-aware codes (both lists empty).
 */
export function evaluateTaxonomyLineOfBusinessAppetite(
  resolved: ResolvedLobCode,
  declaration: TaxonomyLobDeclaration,
): TaxonomyLobOutcome {
  const primary = normalizeCode(resolved.primaryCode);
  const subType = normalizeCode(resolved.subTypeCode);

  // No resolved taxonomy code at all ⇒ this path cannot decide; defer to free text.
  if (!primary && !subType) {
    return { applied: false };
  }

  const allowed = normalizeCodeList(declaration.allowedLineOfBusinessCodes);
  const excluded = normalizeCodeList(declaration.excludedLineOfBusinessCodes);

  // No taxonomy-aware declaration ⇒ nothing to evaluate; defer to free text.
  if (allowed.length === 0 && excluded.length === 0) {
    return { applied: false };
  }

  const subject = describeSubject(primary, subType);

  // EXCLUDED takes precedence over allowed.
  const excludedHit = findMatch(excluded, primary, subType);
  if (excludedHit) {
    const matchPhrase =
      excludedHit.level === 'primary'
        ? `matched excluded primary '${excludedHit.entry}'`
        : `matched excluded subtype '${excludedHit.entry}'`;
    return {
      applied: true,
      decision: AppetiteDecisions.OUT_OF_APPETITE,
      findings: [
        {
          rule: 'taxonomy_excluded_line_of_business',
          field: 'lineOfBusiness',
          severity: 'reject',
          status: 'fail',
          reason: `Line of business '${subject}' excluded by appetite (${matchPhrase})`,
        },
      ],
    };
  }

  // If the org declared an allow-list, the submission must match it.
  if (allowed.length > 0) {
    const allowedHit = findMatch(allowed, primary, subType);
    if (!allowedHit) {
      return {
        applied: true,
        decision: AppetiteDecisions.FLAGGED,
        findings: [
          {
            rule: 'taxonomy_allowed_line_of_business',
            field: 'lineOfBusiness',
            severity: 'flag',
            status: 'fail',
            reason: `Line of business '${subject}' is not in the allowed taxonomy set`,
          },
        ],
      };
    }
  }

  // In appetite by the taxonomy path: a decision was made, with no failing finding.
  return { applied: true, decision: AppetiteDecisions.IN_APPETITE, findings: [] };
}

/**
 * Build the taxonomy-aware declaration from the two additive, optional sources:
 *
 *   1. The registry resolution's `appetiteDimensions` — when the org declared a
 *      registry row carrying `allowedLineOfBusinessCodes` /
 *      `excludedLineOfBusinessCodes` (preferred, explicit source).
 *   2. The existing `OrganizationAppetiteProfile.allowedLinesOfBusiness` entries
 *      interpreted AS taxonomy codes — but ONLY the entries that ARE known taxonomy
 *      codes (decided by the caller via `isTaxonomyCode`). Free-text entries are
 *      left untouched and continue to flow through the unchanged free-text matcher.
 *
 * Both sources are unioned. Either may be empty. This is pure; the caller supplies
 * the registry dimensions and the (already-filtered) profile codes.
 */
export function buildTaxonomyLobDeclaration(input: {
  appetiteDimensions?: Record<string, unknown> | null;
  /** allowedLinesOfBusiness entries that the caller confirmed are taxonomy codes. */
  profileAllowedCodes?: readonly string[] | null;
}): TaxonomyLobDeclaration {
  const dims = input.appetiteDimensions ?? {};
  const fromDimsAllowed = normalizeCodeList(asStringArray(dims.allowedLineOfBusinessCodes));
  const fromDimsExcluded = normalizeCodeList(asStringArray(dims.excludedLineOfBusinessCodes));
  const fromProfileAllowed = normalizeCodeList(input.profileAllowedCodes ?? []);

  const allowed: string[] = [];
  for (const code of [...fromDimsAllowed, ...fromProfileAllowed]) {
    if (!allowed.includes(code)) allowed.push(code);
  }

  return {
    allowedLineOfBusinessCodes: allowed,
    excludedLineOfBusinessCodes: fromDimsExcluded,
  };
}

function asStringArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
