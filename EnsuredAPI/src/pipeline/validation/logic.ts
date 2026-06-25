import { asNumber, asText, firstNonEmpty, toRecord } from './coerce';
import { toDomain } from './scrub';
import { AppetiteFields, AppetiteResult, AppetiteDecisions } from './appetiteEngine';
import { lineOfBusinessTaxonomy } from '../../db/seed-data/lineOfBusinessTaxonomy';

/** Canonical line-of-business codes, for the riskType→LOB fallback below. */
const LOB_CODE_SET = new Set(lineOfBusinessTaxonomy.map((primary) => primary.code));

/**
 * `riskType` is overloaded (it often holds a peril like 'wind'/'flood'), but when
 * it equals a canonical LOB code — e.g. 'property' — it is a valid line-of-business
 * fallback for when classification produced none. Non-LOB perils are NOT promoted
 * to a line of business (that would invent an "allowed LOB" the org never set).
 */
function riskTypeAsLineOfBusiness(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const text = asText(candidate);
    if (text && LOB_CODE_SET.has(text.toLowerCase().replace(/\s+/g, '_'))) return text;
  }
  return null;
}
import {
  DATA_QUALITY_WEIGHTS,
  ScrubFinding,
  ScrubSignals,
  SemanticAssessment,
  ValidationDecision,
  ValidationFields,
  ValidationResult,
} from './types';

/**
 * Pull the normalized/extracted records and the canonical fields the stage
 * cares about out of the raw payload. Pure: same payload → same fields.
 * `dataQualityScore` is computed later, so it is left null here.
 */
export function extractValidationFields(payload: unknown): ValidationFields {
  const root = toRecord(payload);
  const normalization = toRecord(root.normalization);
  const extraction = toRecord(root.extraction);
  const normalized = toRecord(normalization.normalized ?? normalization.data ?? {});
  const extracted = toRecord(extraction.structuredData ?? extraction.entities ?? extraction);

  const address = asText(firstNonEmpty(normalized.propertyLocation, normalized.location, extracted.propertyLocation));
  const domain = toDomain(firstNonEmpty(normalized.companyDomain, normalized.domain, extracted.companyDomain, extracted.website));

  const appetite: AppetiteFields = {
    riskType: asText(firstNonEmpty(normalized.riskType, extracted.riskType, extracted.perilType)),
    limit: asNumber(firstNonEmpty(normalized.limit, extracted.limit, extracted.dealSize, extracted.notional)),
    expectedYield: asNumber(firstNonEmpty(normalized.expectedYield, extracted.expectedYield, extracted.expectedReturn)),
    jurisdiction: asText(firstNonEmpty(normalized.jurisdiction, extracted.jurisdiction, normalized.country, extracted.country, address)),
    lineOfBusiness: asText(
      firstNonEmpty(
        normalized.lineOfBusiness,
        extracted.lineOfBusiness,
        // Fall back to the classification CODE, then to riskType when it is itself
        // a valid LOB code — so a 'property' riskType is no longer reported as a
        // null line of business.
        normalized.lineOfBusinessCode,
        extracted.lineOfBusinessCode,
        riskTypeAsLineOfBusiness(normalized.riskType, extracted.riskType, extracted.perilType),
      ),
    ),
    dataQualityScore: null,
  };

  return { normalized, extracted, address, domain, appetite };
}

/** Required fields with no populated value in either source. (pure) */
export function findMissingRequired(fields: ValidationFields, requiredFields: readonly string[]): string[] {
  return requiredFields.filter(
    (field) => asText(firstNonEmpty(fields.normalized[field], fields.extracted[field])) === null,
  );
}

/**
 * Wire the locationDiscovery stage into the hygiene signals: a location the
 * geocoder actually resolved is authoritative over the crude `looksLikeAddress`
 * heuristic, which rejects legitimate city-only locations like "Miami".
 * Strictly an upgrade — geocode results never invalidate an address the
 * heuristic already accepted. (pure)
 */
export function applyGeocodeSignal(signals: ScrubSignals, locationDiscovery: unknown): ScrubSignals {
  if (signals.addressValid) return signals;
  const ld = toRecord(locationDiscovery);
  if (ld.ok !== true) return signals;
  const resolved = asNumber(ld.resolved);
  if (resolved === null || resolved <= 0) return signals;
  return { ...signals, addressValid: true, provider: `${signals.provider}+geocode` };
}

/** Scrub findings derived from the hygiene signals — the single source of truth. (pure) */
export function buildScrubFindings(signals: ScrubSignals): ScrubFinding[] {
  return [
    {
      check: 'property_location',
      status: signals.addressValid ? 'pass' : 'fail',
      reason: signals.addressValid ? undefined : 'Invalid or missing property location',
    },
    {
      check: 'company_domain_security',
      status: signals.domainSecure ? 'pass' : 'fail',
      reason: signals.domainSecure ? undefined : 'Domain is insecure or unresolved',
    },
  ];
}

/** Human-readable reasons for the failed findings. (pure) */
export function findingReasons(findings: ScrubFinding[]): string[] {
  return findings.filter((f) => f.status === 'fail' && f.reason).map((f) => f.reason as string);
}

/** Data-quality score (0-100) from missing-field count and hygiene signals. (pure) */
export function scoreDataQuality(missingRequiredCount: number, signals: ScrubSignals): number {
  const { perMissingField, invalidAddress, insecureDomain } = DATA_QUALITY_WEIGHTS;
  const score = 100
    - missingRequiredCount * perMissingField
    - (signals.addressValid ? 0 : invalidAddress)
    - (signals.domainSecure ? 0 : insecureDomain);
  return Math.max(0, Math.round(score));
}

export type DecisionInput = {
  scrubFindings: ScrubFinding[];
  missingRequired: string[];
  appetiteResult: AppetiteResult;
  semantic?: SemanticAssessment | null;
};

export type DecisionOutcome = {
  decision: ValidationDecision;
  flaggedForMoreInfo: boolean;
  reasons: string[];
};

/**
 * Combine hygiene, schema, appetite, and (optional) semantic signals into one
 * decision. Any source reporting OUT_OF_APPETITE wins; otherwise any reason
 * routes to MORE_INFO, else PASS. `flaggedForMoreInfo` is derived, never stored
 * independently. (pure)
 */
export function aggregateDecision({ scrubFindings, missingRequired, appetiteResult, semantic }: DecisionInput): DecisionOutcome {
  const reasons = [
    ...findingReasons(scrubFindings),
    ...(missingRequired.length > 0 ? [`Missing required fields: ${missingRequired.join(', ')}`] : []),
    ...appetiteResult.reasons,
    ...(semantic?.available ? semantic.reasons : []),
  ];

  const outOfAppetite = appetiteResult.decision === AppetiteDecisions.OUT_OF_APPETITE
    || (semantic?.available === true && semantic.decision === AppetiteDecisions.OUT_OF_APPETITE);
  const decision: ValidationDecision = outOfAppetite
    ? ValidationDecision.OUT_OF_APPETITE
    : reasons.length > 0
      ? ValidationDecision.MORE_INFO
      : ValidationDecision.PASS;

  return { decision, flaggedForMoreInfo: reasons.length > 0 && !outOfAppetite, reasons };
}

export type ResultInput = {
  signals: ScrubSignals;
  scrubFindings: ScrubFinding[];
  missingRequired: string[];
  dataQualityScore: number;
  appetiteResult: AppetiteResult;
  semantic: SemanticAssessment;
  outcome: DecisionOutcome;
  now: Date;
};

/** Assemble the immutable validation result document. (pure; clock injected) */
export function buildValidationResult({
  signals,
  scrubFindings,
  missingRequired,
  dataQualityScore,
  appetiteResult,
  semantic,
  outcome,
  now,
}: ResultInput): ValidationResult {
  return {
    autoScrub: {
      provider: signals.provider,
      findings: scrubFindings,
      address: signals.address,
      domain: signals.domain,
    },
    schemaValidation: { missingRequired, dataQualityScore },
    appetite: {
      decision: appetiteResult.decision,
      profileId: appetiteResult.profileId,
      profileName: appetiteResult.profileName,
      findings: appetiteResult.findings,
      reasons: appetiteResult.reasons,
      diagnostics: appetiteResult.diagnostics,
    },
    semantic,
    flaggedForMoreInfo: outcome.flaggedForMoreInfo,
    decision: outcome.decision,
    reasons: outcome.reasons,
    validatedAt: now.toISOString(),
  };
}
