/**
 * Slice 4 — service-layer bridge that resolves the taxonomy-aware appetite input
 * for a submission and threads it into the pure `evaluateAppetite` engine.
 *
 * This is where the (best-effort) DB resolution lives so the pure engine stays
 * I/O-free. It is total and fail-safe: any failure (or absence of taxonomy data)
 * yields `null`, which makes `evaluateAppetite` fall back to the unchanged
 * free-text LOB matcher. It NEVER throws.
 *
 * Sources of taxonomy-aware appetite data (both optional/additive):
 *   1. The registry's `resolution.appetiteDimensions`
 *      (`allowedLineOfBusinessCodes` / `excludedLineOfBusinessCodes`) when the org
 *      declared a registry row — resolved via `resolveRiskClass`.
 *   2. `OrganizationAppetiteProfile.allowedLinesOfBusiness` entries that ARE known
 *      taxonomy codes (free-text entries are left for the unchanged matcher).
 */

import { deriveLobCodes } from '../canonicalize/deriveLob';
import { resolveRiskClass } from '../registry/resolve';
import { TaxonomyAppetiteInput } from './appetiteEngine';
import { buildTaxonomyLobDeclaration, ResolvedLobCode } from './taxonomyAppetite';

/** Injectable resolver seam (defaults to the real registry resolver). */
export type RiskClassResolver = typeof resolveRiskClass;

/**
 * Decide whether a single `allowedLinesOfBusiness` entry is a taxonomy code (as
 * opposed to free text). It is a taxonomy code iff `deriveLobCodes` confidently
 * maps it to a primary code. Returns the entry's resolved code(s), or null.
 *
 * Reuses the spine's `deriveLobCodes` rather than duplicating the taxonomy list,
 * so this stays in sync with the canonical taxonomy without modifying spine code.
 */
function entryAsTaxonomyCode(entry: string): { primaryCode: string; subTypeCode: string | null } | null {
  const derived = deriveLobCodes({ lineOfBusiness: entry });
  if (!derived.primaryCode) return null;
  return { primaryCode: derived.primaryCode, subTypeCode: derived.subTypeCode };
}

/**
 * Project an org's free-text `allowedLinesOfBusiness` into the taxonomy codes it
 * contains. The most specific resolved code is kept (subtype if present, else
 * primary). Non-taxonomy entries are dropped here — they remain the free-text
 * matcher's responsibility.
 */
export function extractProfileTaxonomyCodes(allowedLinesOfBusiness: readonly unknown[] | null | undefined): string[] {
  if (!Array.isArray(allowedLinesOfBusiness)) return [];
  const codes: string[] = [];
  for (const raw of allowedLinesOfBusiness) {
    if (typeof raw !== 'string') continue;
    const resolved = entryAsTaxonomyCode(raw);
    if (!resolved) continue;
    const code = resolved.subTypeCode ?? resolved.primaryCode;
    if (code && !codes.includes(code)) codes.push(code);
  }
  return codes;
}

/**
 * Resolve the optional taxonomy-aware appetite input for a submission. Returns
 * `null` (⇒ free-text fallback) when no taxonomy code resolves for the submission,
 * or when neither the registry nor the profile supplies taxonomy-aware codes.
 *
 * `fields` are the same appetite fields the engine already uses (so the LOB text
 * comes from the same source). `extracted`/`normalized` are passed through to allow
 * a structured `lineOfBusinessCode` to be honored if present.
 *
 * Total + fail-safe: any error degrades to `null`.
 */
export async function resolveTaxonomyAppetiteInput(input: {
  tenantId: number | null;
  lineOfBusiness?: unknown;
  lineOfBusinessCode?: unknown;
  lineOfBusinessSubTypeCode?: unknown;
  allowedLinesOfBusiness?: readonly unknown[] | null;
  resolver?: RiskClassResolver;
}): Promise<TaxonomyAppetiteInput | null> {
  try {
    const derived = deriveLobCodes({
      lineOfBusiness: input.lineOfBusiness,
      lineOfBusinessCode: input.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: input.lineOfBusinessSubTypeCode,
    });

    // No resolved taxonomy code ⇒ taxonomy path cannot decide ⇒ free-text fallback.
    if (!derived.primaryCode && !derived.subTypeCode) {
      return null;
    }

    const resolved: ResolvedLobCode = {
      primaryCode: derived.primaryCode,
      subTypeCode: derived.subTypeCode,
    };

    // Source 1: registry-declared appetite dimensions (best-effort, total).
    const resolver = input.resolver ?? resolveRiskClass;
    const resolution = await resolver(input.tenantId, derived.primaryCode, derived.subTypeCode);

    // Source 2: profile allowedLinesOfBusiness entries that are taxonomy codes.
    const profileCodes = extractProfileTaxonomyCodes(input.allowedLinesOfBusiness);

    const declaration = buildTaxonomyLobDeclaration({
      appetiteDimensions: resolution.appetiteDimensions,
      profileAllowedCodes: profileCodes,
    });

    // If neither source produced any taxonomy-aware codes, there is nothing to
    // evaluate ⇒ defer to free text. (The engine would also defer, but returning
    // null here avoids threading an inert input.)
    if (
      declaration.allowedLineOfBusinessCodes.length === 0 &&
      declaration.excludedLineOfBusinessCodes.length === 0
    ) {
      return null;
    }

    return { resolved, declaration };
  } catch {
    // Fail safe: degrade to free-text fallback rather than breaking the stage.
    return null;
  }
}
