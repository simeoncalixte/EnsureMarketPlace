import { CapacityDefinition, CapacityValidationRule } from '../../db/models';
import { asNumber, toList } from './coerce';
import { definitionToAppetiteProfile } from './definitionToAppetiteProfile';
import { validateRuleConfig } from './ruleSchema';
import {
  evaluateTaxonomyLineOfBusinessAppetite,
  ResolvedLobCode,
  TaxonomyLobDeclaration,
} from './taxonomyAppetite';

export type AppetiteSeverity = 'reject' | 'flag' | 'warn';

/** Canonical appetite decision states (shared so consumers avoid string literals). */
export const AppetiteDecisions = {
  IN_APPETITE: 'IN_APPETITE',
  FLAGGED: 'FLAGGED',
  OUT_OF_APPETITE: 'OUT_OF_APPETITE',
} as const;
export type AppetiteDecision = (typeof AppetiteDecisions)[keyof typeof AppetiteDecisions];

export type AppetiteFinding = {
  rule: string;
  field: string;
  severity: AppetiteSeverity;
  status: 'pass' | 'fail';
  reason?: string;
};

/** A rule that could not be evaluated (unknown field/operator, bad value). */
export type AppetiteDiagnostic = { rule: string; issues: string[] };

export type AppetiteResult = {
  decision: AppetiteDecision;
  findings: AppetiteFinding[];
  reasons: string[];
  diagnostics: AppetiteDiagnostic[];
  profileId: number | null;
  profileName: string | null;
};

/** Subset of the appetite profile the engine reads (Sequelize instance or plain object). */
export type AppetiteProfileLike = {
  id?: number;
  name?: string;
  description?: string | null;
  minTargetYield?: string | number | null;
  maxLineSize?: string | number | null;
  minCoverageLimit?: string | number | null;
  maxCoverageLimit?: string | number | null;
  capacityByPeril?: Record<string, number> | null;
  preferredPerils?: string[] | null;
  excludedPerils?: string[] | null;
  allowedLinesOfBusiness?: string[] | null;
  preferredJurisdictions?: string[] | null;
  excludedJurisdictions?: string[] | null;
  minDataQualityScore?: number | null;
  requiredFields?: string[] | null;
};

export type AppetiteRuleLike = {
  name?: string;
  field: string;
  operator: string;
  value?: unknown;
  severity?: string;
  enabled?: boolean;
};

/** Fields extracted from the submission that appetite rules are evaluated against. */
export type AppetiteFields = {
  riskType?: string | null;
  limit?: number | null;
  expectedYield?: number | null;
  jurisdiction?: string | null;
  lineOfBusiness?: string | null;
  dataQualityScore?: number | null;
  [key: string]: unknown;
};

// Local alias kept for readability at call sites within this module.
const toNumberOrNull = asNumber;

function normalizeSeverity(value: unknown): AppetiteSeverity {
  const s = String(value ?? '').toLowerCase();
  if (s === 'reject' || s === 'flag' || s === 'warn') return s;
  return 'flag';
}

/** Rank severities so the strongest one drives the overall decision. */
function rankSeverity(severity: AppetiteSeverity): number {
  if (severity === 'reject') return 3;
  if (severity === 'flag') return 2;
  return 1;
}

/** Compare a value against a rule operator. Returns true when the rule PASSES. */
function evaluateOperator(operator: string, actual: unknown, expected: unknown): boolean {
  const op = String(operator).toLowerCase();
  const actualNum = toNumberOrNull(actual);
  const expectedNum = toNumberOrNull(expected);
  const actualStr = actual === null || actual === undefined ? '' : String(actual).trim().toLowerCase();

  const operators: Record<string, () => boolean> = {
    required: () => actualStr.length > 0,
    in: () => toList(expected).includes(actualStr),
    not_in: () => !toList(expected).includes(actualStr),
    eq: () => actualStr === String(expected ?? '').trim().toLowerCase(),
    neq: () => actualStr !== String(expected ?? '').trim().toLowerCase(),
    gte: () => actualNum !== null && expectedNum !== null && actualNum >= expectedNum,
    lte: () => actualNum !== null && expectedNum !== null && actualNum <= expectedNum,
    gt: () => actualNum !== null && expectedNum !== null && actualNum > expectedNum,
    lt: () => actualNum !== null && expectedNum !== null && actualNum < expectedNum,
    between: () => {
      const bounds = Array.isArray(expected) ? expected.map((v) => toNumberOrNull(v)) : [];
      const [min, max] = bounds;
      return actualNum !== null && min !== null && min !== undefined && max !== null && max !== undefined
        ? actualNum >= min && actualNum <= max
        : false;
    },
  };

  return (operators[op] ?? (() => false))();
}

function evaluatePerilAppetite(props: {
  riskType: string;
  excludedPerils: string[];
  preferredPerils: string[];
}): AppetiteFinding[] {
  const findings: AppetiteFinding[] = [];
  if (!props.riskType) return findings;

  if (props.excludedPerils.includes(props.riskType)) {
    findings.push({
      rule: 'excluded_peril',
      field: 'riskType',
      severity: 'reject',
      status: 'fail',
      reason: `Peril "${props.riskType}" is on the exclusion list`,
    });
  } else if (props.preferredPerils.length > 0 && !props.preferredPerils.includes(props.riskType)) {
    findings.push({
      rule: 'preferred_peril',
      field: 'riskType',
      severity: 'warn',
      status: 'fail',
      reason: `Peril "${props.riskType}" is outside the preferred appetite`,
    });
  }
  return findings;
}

function evaluateLineOfBusinessAppetite(props: {
  lineOfBusiness: string;
  allowedLinesOfBusiness: string[];
}): AppetiteFinding[] {
  const findings: AppetiteFinding[] = [];
  if (props.lineOfBusiness && props.allowedLinesOfBusiness.length > 0 && !props.allowedLinesOfBusiness.includes(props.lineOfBusiness)) {
    findings.push({
      rule: 'allowed_line_of_business',
      field: 'lineOfBusiness',
      severity: 'flag',
      status: 'fail',
      reason: `Line of business "${props.lineOfBusiness}" is not in the allowed set`,
    });
  }
  return findings;
}

function evaluateCapitalAppetite(props: {
  limit: number | null;
  riskType: string;
  maxLineSize: number | null;
  maxCoverageLimit: number | null;
  minCoverageLimit: number | null;
  capacityByPeril: Record<string, number>;
}): AppetiteFinding[] {
  const findings: AppetiteFinding[] = [];
  if (props.limit === null) return findings;

  if (props.maxLineSize !== null && props.limit > props.maxLineSize) {
    findings.push({
      rule: 'max_line_size',
      field: 'limit',
      severity: 'flag',
      status: 'fail',
      reason: `Limit ${props.limit} exceeds max line size ${props.maxLineSize}`,
    });
  }
  if (props.maxCoverageLimit !== null && props.limit > props.maxCoverageLimit) {
    findings.push({
      rule: 'max_coverage_limit',
      field: 'limit',
      severity: 'flag',
      status: 'fail',
      reason: `Limit ${props.limit} exceeds max coverage limit ${props.maxCoverageLimit}`,
    });
  }
  if (props.minCoverageLimit !== null && props.limit < props.minCoverageLimit) {
    findings.push({
      rule: 'min_coverage_limit',
      field: 'limit',
      severity: 'flag',
      status: 'fail',
      reason: `Limit ${props.limit} is below min coverage limit ${props.minCoverageLimit}`,
    });
  }

  const perilCapacity = props.riskType ? toNumberOrNull(props.capacityByPeril[props.riskType]) : null;
  if (perilCapacity !== null && props.limit > perilCapacity) {
    findings.push({
      rule: 'peril_capacity',
      field: 'limit',
      severity: 'flag',
      status: 'fail',
      reason: `Limit ${props.limit} exceeds ${props.riskType} capacity ${perilCapacity}`,
    });
  }
  return findings;
}

function evaluateReturnAppetite(props: {
  minTargetYield: number | null;
  expectedYield: number | null;
}): AppetiteFinding[] {
  const findings: AppetiteFinding[] = [];
  if (props.minTargetYield !== null && props.expectedYield !== null && props.expectedYield < props.minTargetYield) {
    findings.push({
      rule: 'min_target_yield',
      field: 'expectedYield',
      severity: 'flag',
      status: 'fail',
      reason: `Expected yield ${props.expectedYield} is below target ${props.minTargetYield}`,
    });
  }
  return findings;
}

function evaluateGeographicAppetite(props: {
  jurisdiction: string;
  excludedJurisdictions: string[];
  preferredJurisdictions: string[];
}): AppetiteFinding[] {
  const findings: AppetiteFinding[] = [];
  if (!props.jurisdiction) return findings;

  const matchesExcluded = props.excludedJurisdictions.some((j) => props.jurisdiction.includes(j) || j.includes(props.jurisdiction));
  if (matchesExcluded) {
    findings.push({
      rule: 'excluded_jurisdiction',
      field: 'jurisdiction',
      severity: 'reject',
      status: 'fail',
      reason: `Jurisdiction "${props.jurisdiction}" is excluded`,
    });
  } else if (props.preferredJurisdictions.length > 0) {
    const matchesPreferred = props.preferredJurisdictions.some((j) => props.jurisdiction.includes(j) || j.includes(props.jurisdiction));
    if (!matchesPreferred) {
      findings.push({
        rule: 'preferred_jurisdiction',
        field: 'jurisdiction',
        severity: 'warn',
        status: 'fail',
        reason: `Jurisdiction "${props.jurisdiction}" is outside the preferred regions`,
      });
    }
  }
  return findings;
}

function evaluateDataQualityAppetite(props: {
  minDataQualityScore: number | null;
  dataQualityScore: number | null;
}): AppetiteFinding[] {
  const findings: AppetiteFinding[] = [];
  if (props.minDataQualityScore !== null && props.minDataQualityScore !== undefined && props.dataQualityScore !== null) {
    if (props.dataQualityScore < props.minDataQualityScore) {
      findings.push({
        rule: 'min_data_quality',
        field: 'dataQualityScore',
        severity: 'flag',
        status: 'fail',
        reason: `Data quality ${props.dataQualityScore} is below minimum ${props.minDataQualityScore}`,
      });
    }
  }
  return findings;
}

function evaluateCustomRules(props: {
  rules: AppetiteRuleLike[];
  fields: AppetiteFields;
}): { findings: AppetiteFinding[]; diagnostics: AppetiteDiagnostic[] } {
  const findings: AppetiteFinding[] = [];
  const diagnostics: AppetiteDiagnostic[] = [];

  for (const rule of props.rules) {
    if (rule.enabled === false) continue;

    const issues = validateRuleConfig(rule);
    if (issues.length > 0) {
      diagnostics.push({ rule: rule.name ?? `${rule.field} ${rule.operator}`, issues });
      continue;
    }

    const severity = normalizeSeverity(rule.severity);
    const passed = evaluateOperator(rule.operator, props.fields[rule.field], rule.value);
    if (!passed) {
      findings.push({
        rule: rule.name ?? `${rule.field} ${rule.operator}`,
        field: rule.field,
        severity,
        status: 'fail',
        reason: `${rule.name ?? rule.field}: failed ${rule.operator} check`,
      });
    }
  }

  return { findings, diagnostics };
}

/**
 * Optional, additive taxonomy-aware augmentation for the LOB dimension (Slice 4).
 * When present AND it yields a decision, it REPLACES the free-text LOB check for
 * this submission. When absent — or when the taxonomy path declines to decide
 * (no resolved code / no taxonomy declaration) — the engine uses the existing
 * free-text `evaluateLineOfBusinessAppetite` exactly as before. The resolution is
 * done in the service layer (DB) and threaded in here so the engine stays pure.
 */
export type TaxonomyAppetiteInput = {
  resolved: ResolvedLobCode;
  declaration: TaxonomyLobDeclaration;
};

/**
 * Evaluate a submission's fields against an organization's structured appetite
 * profile and its custom rules. Pure function — no I/O. Severity precedence:
 * any `reject` failure ⇒ OUT_OF_APPETITE; else any `flag` ⇒ FLAGGED; else
 * IN_APPETITE. `warn` failures are recorded but never change the decision.
 *
 * `taxonomy` is an OPTIONAL augmentation (Slice 4): when supplied and it produces
 * a decision, the taxonomy-aware LOB check is used INSTEAD OF the free-text LOB
 * check for this submission; otherwise the free-text check runs unchanged. Every
 * other dimension (peril, capacity, return, geo, data-quality, custom rules) is
 * untouched.
 */
export function evaluateAppetite(
  fields: AppetiteFields,
  profile: AppetiteProfileLike | null,
  rules: AppetiteRuleLike[] = [],
  taxonomy?: TaxonomyAppetiteInput | null,
): AppetiteResult {
  if (!profile) {
    return { decision: AppetiteDecisions.IN_APPETITE, findings: [], reasons: [], diagnostics: [], profileId: null, profileName: null };
  }

  const riskType = String(fields.riskType ?? '').trim().toLowerCase();
  const jurisdiction = String(fields.jurisdiction ?? '').trim().toLowerCase();
  const lineOfBusiness = String(fields.lineOfBusiness ?? '').trim().toLowerCase();
  const limit = toNumberOrNull(fields.limit);
  const expectedYield = toNumberOrNull(fields.expectedYield);
  const dataQualityScore = toNumberOrNull(fields.dataQualityScore);

  const allFindings: AppetiteFinding[] = [];
  const allDiagnostics: AppetiteDiagnostic[] = [];

  allFindings.push(
    ...evaluatePerilAppetite({
      riskType,
      excludedPerils: toList(profile.excludedPerils),
      preferredPerils: toList(profile.preferredPerils),
    }),
  );

  // LOB dimension: try the taxonomy-aware path first (Slice 4 augmentation). It
  // only "applies" when a taxonomy code resolved AND taxonomy-aware appetite data
  // exists; otherwise we fall back to the unchanged free-text matcher below.
  const taxonomyOutcome = taxonomy
    ? evaluateTaxonomyLineOfBusinessAppetite(taxonomy.resolved, taxonomy.declaration)
    : { applied: false as const };

  if (taxonomyOutcome.applied) {
    allFindings.push(...taxonomyOutcome.findings);
  } else {
    allFindings.push(
      ...evaluateLineOfBusinessAppetite({
        lineOfBusiness,
        allowedLinesOfBusiness: toList(profile.allowedLinesOfBusiness),
      }),
    );
  }

  allFindings.push(
    ...evaluateCapitalAppetite({
      limit,
      riskType,
      maxLineSize: toNumberOrNull(profile.maxLineSize),
      maxCoverageLimit: toNumberOrNull(profile.maxCoverageLimit),
      minCoverageLimit: toNumberOrNull(profile.minCoverageLimit),
      capacityByPeril: (profile.capacityByPeril ?? {}) as Record<string, number>,
    }),
  );

  allFindings.push(
    ...evaluateReturnAppetite({
      minTargetYield: toNumberOrNull(profile.minTargetYield),
      expectedYield,
    }),
  );

  allFindings.push(
    ...evaluateGeographicAppetite({
      jurisdiction,
      excludedJurisdictions: toList(profile.excludedJurisdictions),
      preferredJurisdictions: toList(profile.preferredJurisdictions),
    }),
  );

  allFindings.push(
    ...evaluateDataQualityAppetite({
      minDataQualityScore: profile.minDataQualityScore ?? null,
      dataQualityScore,
    }),
  );

  const customRules = evaluateCustomRules({ rules, fields });
  allFindings.push(...customRules.findings);
  allDiagnostics.push(...customRules.diagnostics);

  const failures = allFindings.filter((f) => f.status === 'fail');
  const strongest = failures.reduce((max, f) => Math.max(max, rankSeverity(f.severity)), 0);
  const decision: AppetiteDecision = strongest >= 3
    ? AppetiteDecisions.OUT_OF_APPETITE
    : strongest >= 2
      ? AppetiteDecisions.FLAGGED
      : AppetiteDecisions.IN_APPETITE;
  const reasons = failures.filter((f) => f.severity !== 'warn').map((f) => f.reason ?? f.rule);

  return {
    decision,
    findings: allFindings,
    reasons,
    diagnostics: allDiagnostics,
    profileId: profile.id ?? null,
    profileName: profile.name ?? null,
  };
}

/**
 * Load the active capacity definition (projected to an appetite profile) and its
 * enabled validation rules for the organization that received the submission.
 * Returns null when there is no tenant or no active definition, so the validation
 * stage stays permissive (no constraints ⇒ IN_APPETITE) — the same contract the
 * legacy appetite profile honoured.
 */
export async function loadAppetiteForTenant(
  organizationId: number | null | undefined,
): Promise<{ profile: AppetiteProfileLike; rules: AppetiteRuleLike[] } | null> {
  if (!organizationId) return null;
  const definition = await CapacityDefinition.findOne({
    where: { organizationId: Number(organizationId), isActive: true },
    order: [['id', 'ASC']],
  });
  if (!definition) return null;
  const rules = await CapacityValidationRule.findAll({
    where: { capacityDefinitionId: definition.id, enabled: true },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  });
  return { profile: definitionToAppetiteProfile(definition), rules };
}
