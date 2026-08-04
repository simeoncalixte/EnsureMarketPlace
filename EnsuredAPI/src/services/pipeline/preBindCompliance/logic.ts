import type {
  ComplianceCheckEntry,
  ComplianceClearanceStatus,
  LicensingCheckResult,
  SanctionsCheckResult,
  SanctionsScreenResult,
} from '../../../db/models/compliance.models';

/**
 * Pure decision logic for the pre-bind compliance gate. No DB, no IO — so every
 * branch is unit-testable. The stage service (`service.ts`) loads the data and
 * persists the records; everything that decides *pass / fail / review* lives here.
 */

export type ScreeningParty = {
  name: string;
  /** 'cedent' | 'insured' | 'additional_insured' | 'beneficial_owner' */
  role: string;
};

export type JurisdictionResolution = {
  countryCode: string;
  stateCode: string | null;
};

/** The subset of a JurisdictionLicenseAuthority row the resolver needs. */
export type LicenseAuthorityRow = {
  countryCode: string;
  stateCode: string | null;
  lineOfBusinessCode: string | null;
  carrierOrganizationId: number | null;
  admitted: boolean;
  surplusLinesEligible: boolean;
  licenseNumber?: string | null;
};

export type LicensingResolution = {
  status: LicensingCheckResult;
  authority: LicenseAuthorityRow | null;
};

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  'united states of america': 'US',
  america: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  england: 'GB',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  japan: 'JP',
  singapore: 'SG',
  brazil: 'BR',
  'south africa': 'ZA',
};

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Collect the parties to screen from whatever the pipeline produced. The cedent
 * (the ceding carrier org) is always screened; named-insured / applicant fields
 * are screened when extraction surfaced them. Names are de-duplicated
 * case-insensitively so the same entity isn't screened twice.
 */
export function gatherScreeningParties(input: {
  cedentName: string | null;
  canonicalData: Record<string, unknown> | null;
}): ScreeningParty[] {
  const parties: ScreeningParty[] = [];
  const seen = new Set<string>();

  const add = (name: string | null, role: string) => {
    const value = clean(name);
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parties.push({ name: value, role });
  };

  add(input.cedentName, 'cedent');

  const data = input.canonicalData ?? {};
  add(clean(data.namedInsured) ?? clean(data.insuredName) ?? clean(data.insured) ?? clean(data.applicant), 'insured');

  const additional = Array.isArray((data as Record<string, unknown>).additionalInsureds)
    ? ((data as Record<string, unknown>).additionalInsureds as unknown[])
    : [];
  for (const entry of additional) {
    const name = typeof entry === 'string' ? entry : clean((entry as Record<string, unknown>)?.name);
    add(name, 'additional_insured');
  }

  return parties;
}

/**
 * Resolve the screening jurisdiction. Prefers an explicit ISO country code in the
 * canonical data, then a recognizable country name (from data or the portfolio
 * region), and otherwise defaults to the US — a documented platform assumption so
 * the deterministic licensing check has a jurisdiction to look up against.
 */
export function resolveJurisdiction(input: {
  canonicalData: Record<string, unknown> | null;
  portfolioRegion: string | null;
}): JurisdictionResolution {
  const data = input.canonicalData ?? {};

  const explicit = clean(data.countryCode);
  let countryCode = explicit && explicit.length === 2 ? explicit.toUpperCase() : null;

  if (!countryCode) {
    const candidates = [clean(data.country), input.portfolioRegion]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    for (const candidate of candidates) {
      for (const [name, iso] of Object.entries(COUNTRY_NAME_TO_ISO)) {
        if (candidate.includes(name)) {
          countryCode = iso;
          break;
        }
      }
      if (countryCode) break;
    }
  }

  const stateCode = clean(data.stateCode);
  return {
    countryCode: countryCode ?? 'US',
    stateCode: stateCode ? stateCode.toUpperCase() : null,
  };
}

/** Specificity score: a more-specific authority row wins over a broader one. */
function authoritySpecificity(row: LicenseAuthorityRow, carrierOrganizationId: number | null): number {
  let score = 0;
  if (row.carrierOrganizationId != null && row.carrierOrganizationId === carrierOrganizationId) score += 8;
  if (row.stateCode != null) score += 4;
  if (row.lineOfBusinessCode != null) score += 2;
  return score;
}

/**
 * Resolve carrier admitted-status for the (jurisdiction, LOB, carrier) tuple
 * against the authority table. Picks the most specific matching row; maps it to
 * admitted / surplus-lines / not-authorized. No matching row ⇒ `review` (a
 * licensing gap routes to a human, it is not a hard block by itself).
 */
export function resolveLicensing(
  authorities: LicenseAuthorityRow[],
  query: {
    countryCode: string;
    stateCode: string | null;
    lineOfBusinessCode: string | null;
    carrierOrganizationId: number | null;
  },
): LicensingResolution {
  const candidates = authorities.filter((row) => {
    if (row.countryCode.toUpperCase() !== query.countryCode.toUpperCase()) return false;
    if (row.stateCode != null && row.stateCode.toUpperCase() !== (query.stateCode ?? '').toUpperCase()) return false;
    if (row.lineOfBusinessCode != null && row.lineOfBusinessCode !== query.lineOfBusinessCode) return false;
    if (row.carrierOrganizationId != null && row.carrierOrganizationId !== query.carrierOrganizationId) return false;
    return true;
  });

  if (candidates.length === 0) {
    return { status: 'review', authority: null };
  }

  candidates.sort(
    (a, b) => authoritySpecificity(b, query.carrierOrganizationId) - authoritySpecificity(a, query.carrierOrganizationId),
  );
  const best = candidates[0];

  if (best.admitted) return { status: 'admitted', authority: best };
  if (best.surplusLinesEligible) return { status: 'surplus_lines', authority: best };
  return { status: 'not_authorized', authority: best };
}

/** Reduce per-party screen results to the worst overall sanctions outcome. */
export function worstSanctionsResult(results: SanctionsScreenResult[]): SanctionsCheckResult {
  if (results.length === 0) return 'skipped';
  if (results.includes('hit')) return 'hit';
  if (results.includes('potential_match')) return 'potential_match';
  return 'clear';
}

const SANCTIONS_DETAIL: Record<SanctionsCheckResult, string> = {
  hit: 'Confirmed sanctions match — bind blocked.',
  potential_match: 'Potential sanctions match — manual review required.',
  clear: 'No sanctions matches against the screened lists.',
  skipped: 'No parties were screened.',
};

const LICENSING_DETAIL: Record<LicensingCheckResult, string> = {
  admitted: 'Carrier is admitted for this line in the jurisdiction.',
  surplus_lines: 'Not admitted — eligible via the surplus-lines path.',
  not_authorized: 'Carrier is not authorized for this line in the jurisdiction — bind blocked.',
  review: 'No licensing authority on file — manual review required.',
  skipped: 'Licensing was not checked.',
};

/**
 * Roll the two checks up into the overall clearance status + the per-check entries
 * stored on the clearance. A hard block (hit / not_authorized) ⇒ `failed`; a soft
 * flag (potential_match / review) ⇒ `review`; both clean ⇒ `passed`.
 */
export function rollupClearance(input: {
  sanctionsStatus: SanctionsCheckResult;
  licensingStatus: LicensingCheckResult;
  partyCount: number;
  jurisdictionLabel: string;
}): { status: ComplianceClearanceStatus; checks: ComplianceCheckEntry[] } {
  const checks: ComplianceCheckEntry[] = [
    {
      key: 'sanctions',
      label: `Sanctions / OFAC screening (${input.partyCount} part${input.partyCount === 1 ? 'y' : 'ies'})`,
      status: input.sanctionsStatus,
      detail: SANCTIONS_DETAIL[input.sanctionsStatus],
    },
    {
      key: 'carrier_licensing',
      label: `Carrier admitted-status (${input.jurisdictionLabel})`,
      status: input.licensingStatus,
      detail: LICENSING_DETAIL[input.licensingStatus],
    },
  ];

  const hardBlock = input.sanctionsStatus === 'hit' || input.licensingStatus === 'not_authorized';
  const needsReview =
    input.sanctionsStatus === 'potential_match' ||
    input.sanctionsStatus === 'skipped' ||
    input.licensingStatus === 'review' ||
    input.licensingStatus === 'skipped';
  const clean =
    input.sanctionsStatus === 'clear' &&
    (input.licensingStatus === 'admitted' || input.licensingStatus === 'surplus_lines');

  const status: ComplianceClearanceStatus = hardBlock ? 'failed' : clean ? 'passed' : needsReview ? 'review' : 'review';

  return { status, checks };
}
