import {
  buildJudgeMessages,
  buildSemanticInput,
  capSeverity,
  describeOrgRules,
  interpretVerdict,
  parseVerdict,
  DEFAULT_SEMANTIC_POLICY,
  SemanticPolicy,
} from './semantic';
import { SemanticVerdict, ValidationFields } from './types';

const fields: ValidationFields = {
  normalized: {},
  extracted: {},
  address: null,
  domain: null,
  appetite: {
    riskType: 'wind',
    limit: 5_000_000,
    expectedYield: 0.09,
    jurisdiction: 'US',
    lineOfBusiness: 'property',
    dataQualityScore: null,
  },
};

describe('describeOrgRules', () => {
  test('renders structured profile constraints into plain-English lines', () => {
    const lines = describeOrgRules(
      {
        excludedPerils: ['Flood'],
        allowedLinesOfBusiness: ['Property'],
        maxLineSize: '10000000',
        minTargetYield: 0.08,
        capacityByPeril: { wind: 25_000_000 },
      } as any,
      [],
    );
    expect(lines).toContain('Excluded perils: flood');
    expect(lines).toContain('Allowed lines of business: property');
    expect(lines).toContain('Maximum line size: 10000000');
    expect(lines).toContain('Minimum target yield: 0.08');
    expect(lines).toContain('Capacity for wind: 25000000');
  });

  test('includes enabled custom rules and skips disabled ones', () => {
    const lines = describeOrgRules(null, [
      { name: 'No retail', field: 'lineOfBusiness', operator: 'not_in', value: ['retail'], severity: 'reject' },
      { name: 'Off rule', field: 'limit', operator: 'lte', value: 1, enabled: false },
    ]);
    expect(lines).toEqual(['No retail: lineOfBusiness not_in ["retail"] [reject]']);
  });

  test('no profile and no rules yields an empty list', () => {
    expect(describeOrgRules(null, [])).toEqual([]);
  });
});

describe('buildSemanticInput', () => {
  test('projects structured fields and pulls guidelines from the profile description', () => {
    const input = buildSemanticInput(fields, { description: 'No coastal wind above $1M' } as any);
    expect(input.riskType).toBe('wind');
    expect(input.limit).toBe(5_000_000);
    expect(input.guidelines).toBe('No coastal wind above $1M');
  });

  test('carries the organization rules through to the input', () => {
    const input = buildSemanticInput(
      fields,
      { excludedPerils: ['flood'] } as any,
      [{ name: 'cap', field: 'limit', operator: 'lte', value: 10 }],
    );
    expect(input.rules).toContain('Excluded perils: flood');
    expect(input.rules).toContain('cap: limit lte 10');
  });

  test('threads the computed data quality score through (so the agent can assess it)', () => {
    const scored: ValidationFields = { ...fields, appetite: { ...fields.appetite, dataQualityScore: 72 } };
    const input = buildSemanticInput(scored, null);
    expect(input.dataQualityScore).toBe(72);
    expect(buildJudgeMessages(input).user).toMatch(/"dataQualityScore": 72/);
  });
});

describe('buildJudgeMessages', () => {
  test('treats the submission as untrusted data and asks for JSON', () => {
    const { system, user } = buildJudgeMessages(buildSemanticInput(fields, null));
    expect(system).toMatch(/untrusted DATA/i);
    expect(system).toMatch(/JSON/i);
    expect(user).toMatch(/"riskType": "wind"/);
  });

  test('surfaces the organization appetite rules in the prompt', () => {
    const input = buildSemanticInput(fields, { excludedPerils: ['flood'] } as any);
    const { system, user } = buildJudgeMessages(input);
    expect(system).toMatch(/organization appetite rules/i);
    expect(user).toMatch(/Organization appetite rules/);
    expect(user).toMatch(/- Excluded perils: flood/);
  });
});

describe('parseVerdict', () => {
  test('parses a clean JSON verdict', () => {
    const v = parseVerdict('{"decision":"FLAGGED","confidence":0.8,"findings":[{"check":"c","severity":"flag","reason":"r"}]}');
    expect(v?.decision).toBe('FLAGGED');
    expect(v?.confidence).toBe(0.8);
    expect(v?.findings).toHaveLength(1);
  });

  test('tolerates surrounding prose / code fences', () => {
    const v = parseVerdict('Here is my answer:\n```json\n{"decision":"IN_APPETITE","confidence":1}\n```\nthanks');
    expect(v?.decision).toBe('IN_APPETITE');
  });

  test('returns null for non-JSON or missing decision', () => {
    expect(parseVerdict('not json')).toBeNull();
    expect(parseVerdict('{"confidence":0.5}')).toBeNull();
  });

  test('drops malformed findings and clamps confidence', () => {
    const v = parseVerdict('{"decision":"FLAGGED","confidence":5,"findings":[{"check":"c","severity":"nope","reason":"r"},{"check":"d","severity":"flag","reason":"ok"}]}');
    expect(v?.confidence).toBe(1);
    expect(v?.findings).toEqual([{ check: 'd', severity: 'flag', reason: 'ok' }]);
  });
});

describe('capSeverity', () => {
  test('clamps to the ceiling', () => {
    expect(capSeverity('reject', 'flag')).toBe('flag');
    expect(capSeverity('warn', 'flag')).toBe('warn');
    expect(capSeverity('reject', 'reject')).toBe('reject');
  });
});

describe('interpretVerdict', () => {
  test('null / abstain / low-confidence verdicts are unavailable', () => {
    expect(interpretVerdict(null, DEFAULT_SEMANTIC_POLICY).available).toBe(false);
    expect(interpretVerdict({ decision: 'ABSTAIN', confidence: 1, findings: [], modelVersion: 'm' }, DEFAULT_SEMANTIC_POLICY).available).toBe(false);
    expect(interpretVerdict({ decision: 'FLAGGED', confidence: 0.1, findings: [], modelVersion: 'm' }, DEFAULT_SEMANTIC_POLICY).available).toBe(false);
  });

  test('default policy caps a confident reject down to a flag', () => {
    const verdict: SemanticVerdict = { decision: 'OUT_OF_APPETITE', confidence: 0.99, findings: [{ check: 'fraud', severity: 'reject', reason: 'r' }], modelVersion: 'm' };
    const a = interpretVerdict(verdict, DEFAULT_SEMANTIC_POLICY);
    expect(a.available).toBe(true);
    expect(a.decision).toBe('FLAGGED');
    expect(a.findings[0].severity).toBe('flag');
  });

  test('an opt-in policy honors a high-confidence reject', () => {
    const policy: SemanticPolicy = { maxSeverity: 'reject', minConfidenceToAct: 0.6, rejectConfidence: 0.9 };
    const verdict: SemanticVerdict = { decision: 'OUT_OF_APPETITE', confidence: 0.95, findings: [], modelVersion: 'm' };
    expect(interpretVerdict(verdict, policy).decision).toBe('OUT_OF_APPETITE');
  });

  test('a reject below the confidence bar is downgraded to a flag even under an opt-in policy', () => {
    const policy: SemanticPolicy = { maxSeverity: 'reject', minConfidenceToAct: 0.6, rejectConfidence: 0.9 };
    const verdict: SemanticVerdict = { decision: 'OUT_OF_APPETITE', confidence: 0.7, findings: [], modelVersion: 'm' };
    expect(interpretVerdict(verdict, policy).decision).toBe('FLAGGED');
  });

  test('a flag with no findings still yields a reason', () => {
    const a = interpretVerdict({ decision: 'FLAGGED', confidence: 0.8, findings: [], modelVersion: 'm' }, DEFAULT_SEMANTIC_POLICY);
    expect(a.decision).toBe('FLAGGED');
    expect(a.reasons.length).toBeGreaterThan(0);
  });

  test('a flag finding escalates an IN_APPETITE verdict to FLAGGED', () => {
    const a = interpretVerdict(
      { decision: 'IN_APPETITE', confidence: 0.8, findings: [{ check: 'c', severity: 'flag', reason: 'odd' }], modelVersion: 'm' },
      DEFAULT_SEMANTIC_POLICY,
    );
    expect(a.decision).toBe('FLAGGED');
    expect(a.reasons).toContain('odd');
  });

  test('a warn-only policy ceiling downgrades a flag verdict to no-op', () => {
    const policy: SemanticPolicy = { maxSeverity: 'warn', minConfidenceToAct: 0.6, rejectConfidence: 0.9 };
    const a = interpretVerdict(
      { decision: 'FLAGGED', confidence: 0.8, findings: [{ check: 'c', severity: 'flag', reason: 'r' }], modelVersion: 'm' },
      policy,
    );
    expect(a.available).toBe(true);
    expect(a.decision).toBe('IN_APPETITE');
    expect(a.reasons).toEqual([]);
  });
});

describe('parseVerdict edge cases', () => {
  test('unbalanced braces -> null', () => {
    expect(parseVerdict('{"decision":"FLAGGED"')).toBeNull();
  });
  test('an invalid decision value -> null', () => {
    expect(parseVerdict('{"decision":"MAYBE","confidence":1}')).toBeNull();
  });
  test('no object at all -> null', () => {
    expect(parseVerdict('   ')).toBeNull();
    expect(parseVerdict('hello world')).toBeNull();
  });
});
