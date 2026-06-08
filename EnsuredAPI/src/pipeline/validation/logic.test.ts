import {
  aggregateDecision,
  buildScrubFindings,
  buildValidationResult,
  extractValidationFields,
  findMissingRequired,
  findingReasons,
  scoreDataQuality,
} from './logic';
import { ScrubSignals, ValidationDecision } from './types';
import { evaluateAppetite } from './appetiteEngine';
import { interpretVerdict, DEFAULT_SEMANTIC_POLICY } from './semantic';

const noSemantic = interpretVerdict(null, DEFAULT_SEMANTIC_POLICY);

const cleanSignals: ScrubSignals = {
  addressValid: true,
  domainSecure: true,
  address: '123 Main St, Town',
  domain: 'acme.com',
  provider: 'local-heuristics',
};

const dirtySignals: ScrubSignals = {
  addressValid: false,
  domainSecure: false,
  address: 'x',
  domain: null,
  provider: 'local-heuristics',
};

const noAppetite = evaluateAppetite({}, null, []);

describe('extractValidationFields', () => {
  test('coalesces normalized over extracted and derives address/domain', () => {
    const fields = extractValidationFields({
      normalization: { normalized: { riskType: 'wind', limit: 5_000_000 } },
      extraction: { structuredData: { propertyLocation: '500 Ocean Ave, Miami', website: 'https://www.acme.com/contact', perilType: 'storm' } },
    });
    expect(fields.appetite.riskType).toBe('wind'); // normalized wins
    expect(fields.appetite.limit).toBe(5_000_000);
    expect(fields.address).toBe('500 Ocean Ave, Miami');
    expect(fields.domain).toBe('acme.com');
    expect(fields.appetite.jurisdiction).toBe('500 Ocean Ave, Miami'); // falls back to address
  });

  test('blank earlier source falls through to a populated later one', () => {
    const fields = extractValidationFields({
      normalization: { normalized: { riskType: '   ' } },
      extraction: { structuredData: { riskType: 'flood' } },
    });
    expect(fields.appetite.riskType).toBe('flood');
  });

  test('is pure — same input yields deeply equal output', () => {
    const payload = { normalization: { normalized: { riskType: 'wind' } } };
    expect(extractValidationFields(payload)).toEqual(extractValidationFields(payload));
  });
});

describe('findMissingRequired', () => {
  test('flags fields absent from both sources', () => {
    const fields = extractValidationFields({ normalization: { normalized: { riskType: 'wind' } } });
    expect(findMissingRequired(fields, ['riskType', 'limit', 'effectiveDate'])).toEqual(['limit', 'effectiveDate']);
  });
});

describe('buildScrubFindings + findingReasons', () => {
  test('reasons are derived from the findings (single source of truth)', () => {
    const findings = buildScrubFindings(dirtySignals);
    expect(findings.map((f) => f.status)).toEqual(['fail', 'fail']);
    expect(findingReasons(findings)).toEqual(['Invalid or missing property location', 'Domain is insecure or unresolved']);
  });

  test('clean signals produce no reasons', () => {
    expect(findingReasons(buildScrubFindings(cleanSignals))).toEqual([]);
  });
});

describe('scoreDataQuality', () => {
  test('perfect data scores 100', () => {
    expect(scoreDataQuality(0, cleanSignals)).toBe(100);
  });
  test('deducts per missing field and per hygiene failure, floored at 0', () => {
    expect(scoreDataQuality(2, dirtySignals)).toBe(Math.max(0, 100 - 36 - 20 - 20));
    expect(scoreDataQuality(10, dirtySignals)).toBe(0);
  });
});

describe('aggregateDecision', () => {
  test('PASS when nothing fails', () => {
    const outcome = aggregateDecision({ scrubFindings: buildScrubFindings(cleanSignals), missingRequired: [], appetiteResult: noAppetite });
    expect(outcome.decision).toBe(ValidationDecision.PASS);
    expect(outcome.flaggedForMoreInfo).toBe(false);
    expect(outcome.reasons).toEqual([]);
  });

  test('MORE_INFO with combined reasons when hygiene/schema fail', () => {
    const outcome = aggregateDecision({ scrubFindings: buildScrubFindings(dirtySignals), missingRequired: ['limit'], appetiteResult: noAppetite });
    expect(outcome.decision).toBe(ValidationDecision.MORE_INFO);
    expect(outcome.flaggedForMoreInfo).toBe(true);
    expect(outcome.reasons).toContain('Missing required fields: limit');
  });

  test('OUT_OF_APPETITE wins over MORE_INFO and is not "flagged for more info"', () => {
    const rejected = evaluateAppetite({ riskType: 'nuclear' }, { id: 1, excludedPerils: ['nuclear'] });
    const outcome = aggregateDecision({ scrubFindings: buildScrubFindings(dirtySignals), missingRequired: ['limit'], appetiteResult: rejected });
    expect(outcome.decision).toBe(ValidationDecision.OUT_OF_APPETITE);
    expect(outcome.flaggedForMoreInfo).toBe(false);
  });
});

describe('buildValidationResult', () => {
  test('uses the injected clock and assembles the full document', () => {
    const now = new Date('2026-06-03T00:00:00.000Z');
    const result = buildValidationResult({
      signals: cleanSignals,
      scrubFindings: buildScrubFindings(cleanSignals),
      missingRequired: [],
      dataQualityScore: 100,
      appetiteResult: noAppetite,
      semantic: noSemantic,
      outcome: { decision: ValidationDecision.PASS, flaggedForMoreInfo: false, reasons: [] },
      now,
    });
    expect(result.validatedAt).toBe('2026-06-03T00:00:00.000Z');
    expect(result.decision).toBe(ValidationDecision.PASS);
    expect(result.autoScrub.provider).toBe('local-heuristics');
  });
});

describe('aggregateDecision — semantic folding', () => {
  const base = { scrubFindings: buildScrubFindings(cleanSignals), missingRequired: [], appetiteResult: noAppetite };
  const semantic = (over: Record<string, unknown>): any => ({
    available: true, decision: 'IN_APPETITE', confidence: 0.9, reasons: [], findings: [], diagnostics: [], modelVersion: 'm', ...over,
  });

  test('available OUT_OF_APPETITE forces OUT_OF_APPETITE', () => {
    const o = aggregateDecision({ ...base, semantic: semantic({ decision: 'OUT_OF_APPETITE', reasons: ['fraud'] }) });
    expect(o.decision).toBe(ValidationDecision.OUT_OF_APPETITE);
    expect(o.reasons).toContain('fraud');
    expect(o.flaggedForMoreInfo).toBe(false);
  });

  test('available FLAGGED with a reason routes to MORE_INFO', () => {
    const o = aggregateDecision({ ...base, semantic: semantic({ decision: 'FLAGGED', reasons: ['weird'] }) });
    expect(o.decision).toBe(ValidationDecision.MORE_INFO);
  });

  test('an unavailable assessment is ignored even if it carries data', () => {
    const o = aggregateDecision({ ...base, semantic: semantic({ available: false, decision: 'OUT_OF_APPETITE', reasons: ['ignored'] }) });
    expect(o.decision).toBe(ValidationDecision.PASS);
    expect(o.reasons).not.toContain('ignored');
  });
});
