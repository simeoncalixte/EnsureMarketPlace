import { validateRuleConfig } from './ruleSchema';

describe('validateRuleConfig', () => {
  test('a well-formed rule has no issues', () => {
    expect(validateRuleConfig({ field: 'riskType', operator: 'in', value: ['wind'], severity: 'flag' })).toEqual([]);
  });

  test('rejects an unknown field', () => {
    const issues = validateRuleConfig({ field: 'constructionType', operator: 'eq', value: 'wood', severity: 'flag' });
    expect(issues.some((i) => /unknown field/.test(i))).toBe(true);
  });

  test('rejects an unknown operator', () => {
    const issues = validateRuleConfig({ field: 'riskType', operator: 'contains', value: 'x', severity: 'flag' });
    expect(issues.some((i) => /unknown operator/.test(i))).toBe(true);
  });

  test('list operators require a non-empty array value', () => {
    expect(validateRuleConfig({ field: 'riskType', operator: 'in', value: 'wind', severity: 'flag' }).length).toBeGreaterThan(0);
    expect(validateRuleConfig({ field: 'riskType', operator: 'in', value: [], severity: 'flag' }).length).toBeGreaterThan(0);
  });

  test('numeric operators require a numeric value and a numeric field', () => {
    expect(validateRuleConfig({ field: 'limit', operator: 'gte', value: 'abc', severity: 'flag' }).length).toBeGreaterThan(0);
    expect(
      validateRuleConfig({ field: 'riskType', operator: 'gte', value: 5, severity: 'flag' }).some((i) => /numeric field/.test(i)),
    ).toBe(true);
  });

  test('between requires a [min, max] numeric pair', () => {
    expect(validateRuleConfig({ field: 'limit', operator: 'between', value: [1], severity: 'flag' }).length).toBeGreaterThan(0);
    expect(validateRuleConfig({ field: 'limit', operator: 'between', value: [1, 2], severity: 'flag' })).toEqual([]);
  });

  test('required needs no value', () => {
    expect(validateRuleConfig({ field: 'riskType', operator: 'required', severity: 'flag' })).toEqual([]);
  });

  test('rejects an unknown severity', () => {
    expect(
      validateRuleConfig({ field: 'riskType', operator: 'required', severity: 'block' }).some((i) => /unknown severity/.test(i)),
    ).toBe(true);
  });
});
