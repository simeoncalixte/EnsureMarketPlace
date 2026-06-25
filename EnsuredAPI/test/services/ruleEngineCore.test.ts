import { evaluateExpression, evaluateCondition, getPath } from '../../src/pipeline/validation/ruleEngine';

const ctx = { submission: { status: 'New', limit: 2_000_000, dqs: 0.4, organization: { name: 'ACME' } } };

describe('ruleEngine — expressions', () => {
  it('evaluates arithmetic with precedence and parentheses', () => {
    expect(evaluateExpression('submission.limit * 0.1', ctx)).toBe(200_000);
    expect(evaluateExpression('(submission.limit / 1000000) + submission.dqs', ctx)).toBeCloseTo(2.4);
    expect(evaluateExpression('-submission.dqs', ctx)).toBeCloseTo(-0.4);
  });
  it('returns null for non-numeric / unresolved refs', () => {
    expect(evaluateExpression('submission.status + 1', ctx)).toBeNull(); // NaN → null
    expect(evaluateExpression('missing.path * 2', ctx)).toBeNull();
  });
  it('rejects malformed expressions', () => {
    expect(() => evaluateExpression('1 +', ctx)).toThrow();
    expect(() => evaluateExpression('1 + * 2', ctx)).toThrow();
  });
});

describe('ruleEngine — conditions', () => {
  it('resolves dot paths', () => {
    expect(getPath(ctx, 'submission.organization.name')).toBe('ACME');
  });
  it('compares with numeric and string operators', () => {
    expect(evaluateCondition({ field: 'submission.limit', operator: 'greater_than', value: 1_000_000 } as any, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'submission.status', operator: 'equals', value: 'New' } as any, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'submission.organization.name', operator: 'contains', value: 'acm' } as any, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'submission.status', operator: 'in_list', value: 'New, Bound' } as any, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'submission.missing', operator: 'not_exists' } as any, ctx)).toBe(true);
  });
  it('honours AND / OR / NOT and treats an empty group as true', () => {
    const and = { connector: 'AND', conditions: [
      { field: 'submission.status', operator: 'equals', value: 'New' },
      { field: 'submission.limit', operator: 'greater_than', value: 1_000_000 },
    ] };
    expect(evaluateCondition(and as any, ctx)).toBe(true);
    const or = { connector: 'OR', conditions: [
      { field: 'submission.status', operator: 'equals', value: 'Bound' },
      { field: 'submission.dqs', operator: 'less_than', value: 0.5 },
    ] };
    expect(evaluateCondition(or as any, ctx)).toBe(true);
    expect(evaluateCondition({ connector: 'NOT', conditions: [{ field: 'submission.status', operator: 'equals', value: 'New' }] } as any, ctx)).toBe(false);
    expect(evaluateCondition({ connector: 'AND', conditions: [] } as any, ctx)).toBe(true);
  });
});
