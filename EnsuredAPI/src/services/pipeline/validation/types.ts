import type { AppetiteFields, AppetiteFinding, AppetiteDecision, AppetiteDiagnostic, AppetiteSeverity } from './appetiteEngine';

/**
 * Canonical decision states for the validation stage. Shared so the validation
 * service, the appetite engine, and downstream workflow routing all reference
 * the same string constants instead of scattering literals.
 */
export const ValidationDecision = {
  PASS: 'PASS',
  MORE_INFO: 'MORE_INFO',
  OUT_OF_APPETITE: 'OUT_OF_APPETITE',
} as const;
export type ValidationDecision = (typeof ValidationDecision)[keyof typeof ValidationDecision];

/** Points deducted per data-quality issue. Centralized scoring policy. */
export const DATA_QUALITY_WEIGHTS = {
  perMissingField: 18,
  invalidAddress: 20,
  insecureDomain: 20,
} as const;

/** Default required fields when the org appetite profile does not specify any. */
export const DEFAULT_REQUIRED_FIELDS = ['riskType', 'limit', 'effectiveDate'] as const;

export type ScrubSignals = {
  addressValid: boolean;
  domainSecure: boolean;
  domain: string | null;
  address: string | null;
  provider: string;
};

export type ScrubFinding = { check: string; status: 'pass' | 'fail'; reason?: string };

/** Raw, untrusted verdict returned by the LLM judge (before clamping). */
export type SemanticDecision = AppetiteDecision | 'ABSTAIN';
export type SemanticVerdict = {
  decision: SemanticDecision;
  confidence: number;
  findings: { check: string; severity: AppetiteSeverity; reason: string }[];
  modelVersion: string;
};

/** Clamped, policy-applied view of the judge's verdict — safe to act on. */
export type SemanticAssessment = {
  available: boolean;
  decision: AppetiteDecision;
  confidence: number | null;
  reasons: string[];
  findings: AppetiteFinding[];
  diagnostics: AppetiteDiagnostic[];
  modelVersion: string | null;
};

/** Normalized inputs extracted once from the raw stage payload. */
export type ValidationFields = {
  normalized: Record<string, unknown>;
  extracted: Record<string, unknown>;
  address: string | null;
  domain: string | null;
  appetite: AppetiteFields;
};

export type ValidationResult = {
  autoScrub: {
    provider: string;
    findings: ScrubFinding[];
    address: string | null;
    domain: string | null;
  };
  schemaValidation: {
    missingRequired: string[];
    dataQualityScore: number;
  };
  appetite: {
    decision: AppetiteDecision;
    profileId: number | null;
    profileName: string | null;
    findings: AppetiteFinding[];
    reasons: string[];
    diagnostics: AppetiteDiagnostic[];
  };
  semantic: SemanticAssessment;
  flaggedForMoreInfo: boolean;
  decision: ValidationDecision;
  reasons: string[];
  validatedAt: string;
};
