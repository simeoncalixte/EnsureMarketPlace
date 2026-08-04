import { evaluateAppetite, AppetiteProfileLike, AppetiteRuleLike, AppetiteFields } from './appetiteEngine';

const baseProfile: AppetiteProfileLike = {
  id: 1,
  name: 'Default Appetite',
  preferredPerils: ['wind', 'hurricane', 'storm', 'flood'],
  excludedPerils: ['nuclear'],
  capacityByPeril: { wind: 125_000_000 },
  maxLineSize: 100_000_000,
  minTargetYield: 0.08,
  excludedJurisdictions: ['cu', 'ir'],
  preferredJurisdictions: ['us'],
  minDataQualityScore: 60,
  requiredFields: ['riskType', 'limit', 'effectiveDate'],
};

describe('evaluateAppetite', () => {
  test('returns IN_APPETITE with no profile (backward compatible)', () => {
    const result = evaluateAppetite({ riskType: 'wind' }, null, []);
    expect(result.decision).toBe('IN_APPETITE');
    expect(result.reasons).toEqual([]);
    expect(result.profileId).toBeNull();
  });

  test('an in-appetite submission passes', () => {
    const result = evaluateAppetite(
      { riskType: 'wind', limit: 50_000_000, expectedYield: 0.1, jurisdiction: 'US', dataQualityScore: 90 },
      baseProfile,
    );
    expect(result.decision).toBe('IN_APPETITE');
    expect(result.reasons).toEqual([]);
  });

  test('excluded peril rejects (OUT_OF_APPETITE)', () => {
    const result = evaluateAppetite({ riskType: 'nuclear', limit: 1_000_000 }, baseProfile);
    expect(result.decision).toBe('OUT_OF_APPETITE');
    expect(result.reasons.some((r) => /exclusion/i.test(r))).toBe(true);
  });

  test('excluded jurisdiction rejects', () => {
    const result = evaluateAppetite({ riskType: 'wind', jurisdiction: 'CU' }, baseProfile);
    expect(result.decision).toBe('OUT_OF_APPETITE');
  });

  test('yield below target flags for review', () => {
    const result = evaluateAppetite({ riskType: 'wind', expectedYield: 0.03 }, baseProfile);
    expect(result.decision).toBe('FLAGGED');
    expect(result.reasons.some((r) => /yield/i.test(r))).toBe(true);
  });

  test('limit over peril capacity flags', () => {
    const result = evaluateAppetite({ riskType: 'wind', limit: 200_000_000 }, baseProfile);
    expect(result.decision).toBe('FLAGGED');
  });

  test('non-preferred peril only warns, stays in appetite', () => {
    const result = evaluateAppetite({ riskType: 'earthquake', limit: 10_000_000 }, baseProfile);
    expect(result.decision).toBe('IN_APPETITE');
    expect(result.findings.some((f) => f.rule === 'preferred_peril' && f.severity === 'warn')).toBe(true);
  });

  test('custom reject rule takes submission out of appetite', () => {
    const rules: AppetiteRuleLike[] = [
      { name: 'No cyber', field: 'riskType', operator: 'not_in', value: ['cyber'], severity: 'reject' },
    ];
    const result = evaluateAppetite({ riskType: 'cyber', limit: 1_000 }, baseProfile, rules);
    expect(result.decision).toBe('OUT_OF_APPETITE');
    expect(result.reasons.some((r) => /No cyber/.test(r))).toBe(true);
  });

  test('disabled custom rule is ignored', () => {
    const rules: AppetiteRuleLike[] = [
      { name: 'No cyber', field: 'riskType', operator: 'not_in', value: ['cyber'], severity: 'reject', enabled: false },
    ];
    const result = evaluateAppetite({ riskType: 'cyber' }, baseProfile, rules);
    expect(result.decision).not.toBe('OUT_OF_APPETITE');
  });

  test('data quality below minimum flags', () => {
    const result = evaluateAppetite({ riskType: 'wind', dataQualityScore: 40 }, baseProfile);
    expect(result.decision).toBe('FLAGGED');
  });
});

describe('evaluateAppetite — misconfigured rules fail safe', () => {
  const profile: AppetiteProfileLike = { id: 1, name: 'P' };

  test('unknown operator becomes a non-blocking diagnostic, never fail-open', () => {
    const res = evaluateAppetite({ riskType: 'wind' }, profile, [
      { name: 'bad-op', field: 'riskType', operator: 'contains', value: 'x', severity: 'reject' },
    ]);
    expect(res.decision).toBe('IN_APPETITE');
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0].issues.some((i) => /unknown operator/.test(i))).toBe(true);
  });

  test('unknown field becomes a diagnostic, not a spurious finding', () => {
    const res = evaluateAppetite({ riskType: 'wind' }, profile, [
      { name: 'bad-field', field: 'constructionType', operator: 'eq', value: 'wood', severity: 'reject' },
    ]);
    expect(res.decision).toBe('IN_APPETITE');
    expect(res.diagnostics).toHaveLength(1);
    expect(res.findings).toHaveLength(0);
  });

  test('malformed value becomes a diagnostic', () => {
    const res = evaluateAppetite({ limit: 10 }, profile, [
      { name: 'bad-value', field: 'limit', operator: 'in', value: 'not-a-list', severity: 'reject' },
    ]);
    expect(res.decision).toBe('IN_APPETITE');
    expect(res.diagnostics).toHaveLength(1);
  });

  test('a valid rule still evaluates alongside an invalid one', () => {
    const res = evaluateAppetite({ riskType: 'cyber' }, profile, [
      { name: 'broken', field: 'nope', operator: 'eq', value: 'y', severity: 'reject' },
      { name: 'no cyber', field: 'riskType', operator: 'not_in', value: ['cyber'], severity: 'reject' },
    ]);
    expect(res.diagnostics).toHaveLength(1);
    expect(res.decision).toBe('OUT_OF_APPETITE');
  });
});

describe('evaluateAppetite — every custom-rule operator', () => {
  const profile: AppetiteProfileLike = { id: 1 };
  const flag = (field: string, operator: string, value?: unknown): AppetiteRuleLike =>
    ({ name: `${field} ${operator}`, field, operator, value, severity: 'flag' });

  const cases: Array<[string, AppetiteRuleLike, AppetiteFields, 'FLAGGED' | 'IN_APPETITE']> = [
    ['eq fail', flag('riskType', 'eq', 'wind'), { riskType: 'flood' }, 'FLAGGED'],
    ['eq pass', flag('riskType', 'eq', 'wind'), { riskType: 'wind' }, 'IN_APPETITE'],
    ['neq fail', flag('riskType', 'neq', 'flood'), { riskType: 'flood' }, 'FLAGGED'],
    ['neq pass', flag('riskType', 'neq', 'flood'), { riskType: 'wind' }, 'IN_APPETITE'],
    ['in fail', flag('riskType', 'in', ['wind']), { riskType: 'flood' }, 'FLAGGED'],
    ['not_in fail', flag('riskType', 'not_in', ['flood']), { riskType: 'flood' }, 'FLAGGED'],
    ['gte fail', flag('limit', 'gte', 100), { limit: 50 }, 'FLAGGED'],
    ['gte pass', flag('limit', 'gte', 100), { limit: 150 }, 'IN_APPETITE'],
    ['lte fail', flag('limit', 'lte', 10), { limit: 50 }, 'FLAGGED'],
    ['gt fail', flag('limit', 'gt', 100), { limit: 50 }, 'FLAGGED'],
    ['lt fail', flag('limit', 'lt', 10), { limit: 50 }, 'FLAGGED'],
    ['between fail', flag('limit', 'between', [10, 20]), { limit: 50 }, 'FLAGGED'],
    ['between pass', flag('limit', 'between', [10, 100]), { limit: 50 }, 'IN_APPETITE'],
    ['required fail', flag('jurisdiction', 'required'), {}, 'FLAGGED'],
    ['required pass', flag('jurisdiction', 'required'), { jurisdiction: 'US' }, 'IN_APPETITE'],
  ];

  test.each(cases)('%s', (_label, rule, fields, expected) => {
    expect(evaluateAppetite(fields, profile, [rule]).decision).toBe(expected);
  });
});

describe('evaluateAppetite — structured built-in checks', () => {
  test('limit over max line size flags', () => {
    expect(evaluateAppetite({ limit: 200 }, { id: 1, maxLineSize: 100 }).decision).toBe('FLAGGED');
  });
  test('limit over max coverage limit flags', () => {
    expect(evaluateAppetite({ limit: 200 }, { id: 1, maxCoverageLimit: 100 }).decision).toBe('FLAGGED');
  });
  test('limit under min coverage limit flags', () => {
    expect(evaluateAppetite({ limit: 50 }, { id: 1, minCoverageLimit: 100 }).decision).toBe('FLAGGED');
  });
  test('line of business outside allowed set flags', () => {
    const res = evaluateAppetite({ lineOfBusiness: 'marine' }, { id: 1, allowedLinesOfBusiness: ['property'] });
    expect(res.decision).toBe('FLAGGED');
  });
  test('non-preferred jurisdiction only warns, stays in appetite', () => {
    const res = evaluateAppetite({ jurisdiction: 'FR' }, { id: 1, preferredJurisdictions: ['us'] });
    expect(res.decision).toBe('IN_APPETITE');
    expect(res.findings.some((f) => f.rule === 'preferred_jurisdiction' && f.severity === 'warn')).toBe(true);
  });
});
