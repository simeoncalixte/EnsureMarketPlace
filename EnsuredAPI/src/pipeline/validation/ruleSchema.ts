import { asNumber } from './coerce';

// Single source of truth for the custom-rule vocabulary. Both the write path
// (service validation) and the read path (engine evaluation) reference these,
// so "unknown field/operator" is defined in exactly one place. The UI mirrors
// these lists in EnsuredUI; keep them in sync.

export type FieldKind = 'text' | 'number';

/** Fields a rule may reference — exactly those `extractValidationFields` maps. */
export const EVALUABLE_FIELDS: Record<string, FieldKind> = {
  riskType: 'text',
  limit: 'number',
  expectedYield: 'number',
  jurisdiction: 'text',
  lineOfBusiness: 'text',
  dataQualityScore: 'number',
};

/** What shape of `value` each operator expects. */
export type OperatorArity = 'none' | 'scalar' | 'number' | 'list' | 'range';

export const RULE_OPERATORS: Record<string, OperatorArity> = {
  required: 'none',
  in: 'list',
  not_in: 'list',
  eq: 'scalar',
  neq: 'scalar',
  gte: 'number',
  lte: 'number',
  gt: 'number',
  lt: 'number',
  between: 'range',
};

export const RULE_SEVERITIES = ['reject', 'flag', 'warn'] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

export type RuleConfigInput = {
  field?: unknown;
  operator?: unknown;
  value?: unknown;
  severity?: unknown;
};

/** Validate the value matches the operator's expected arity. (pure) */
function validateValueArity(operator: string, arity: OperatorArity, value: unknown): string[] {
  switch (arity) {
    case 'none':
      return [];
    case 'list':
      return Array.isArray(value) && value.length > 0
        ? []
        : [`operator "${operator}" requires a non-empty list value`];
    case 'range': {
      const ok = Array.isArray(value) && value.length === 2 && value.every((v) => asNumber(v) !== null);
      return ok ? [] : [`operator "${operator}" requires a [min, max] numeric pair`];
    }
    case 'number':
      return asNumber(value) !== null ? [] : [`operator "${operator}" requires a numeric value`];
    case 'scalar':
      return value === null || value === undefined || String(value).trim() === ''
        ? [`operator "${operator}" requires a value`]
        : [];
    default:
      return [];
  }
}

/**
 * Returns a list of configuration problems for a rule (empty = valid). Pure and
 * shared by the write path (to reject 400s) and the eval path (to skip-with-
 * diagnostic). Checks field/operator/severity membership, value arity, and
 * numeric-operator-on-text-field mismatches.
 */
export function validateRuleConfig(input: RuleConfigInput): string[] {
  const issues: string[] = [];
  const field = String(input.field ?? '').trim();
  const operator = String(input.operator ?? '').trim().toLowerCase();
  const severity = String(input.severity ?? 'flag').trim().toLowerCase();

  if (!field) {
    issues.push('field is required');
  } else if (!(field in EVALUABLE_FIELDS)) {
    issues.push(`unknown field "${field}"; allowed: ${Object.keys(EVALUABLE_FIELDS).join(', ')}`);
  }

  const arity = RULE_OPERATORS[operator];
  if (!arity) {
    issues.push(`unknown operator "${operator}"; allowed: ${Object.keys(RULE_OPERATORS).join(', ')}`);
  } else {
    issues.push(...validateValueArity(operator, arity, input.value));
    if ((arity === 'number' || arity === 'range') && field in EVALUABLE_FIELDS && EVALUABLE_FIELDS[field] !== 'number') {
      issues.push(`operator "${operator}" requires a numeric field, but "${field}" is ${EVALUABLE_FIELDS[field]}`);
    }
  }

  if (!(RULE_SEVERITIES as readonly string[]).includes(severity)) {
    issues.push(`unknown severity "${severity}"; allowed: ${RULE_SEVERITIES.join(', ')}`);
  }

  return issues;
}

/** Thrown by the service when a rule fails write-time validation. */
export class RuleValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Invalid validation rule: ${issues.join('; ')}`);
    this.name = 'RuleValidationError';
    this.issues = issues;
  }
}
