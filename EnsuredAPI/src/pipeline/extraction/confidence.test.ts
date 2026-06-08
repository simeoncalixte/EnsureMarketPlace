import { scoreFieldConfidence } from './confidence';

describe('scoreFieldConfidence (derived, deterministic)', () => {
  it('applies a higher source prior to gemini than to regex for the same valid value', () => {
    const gemini = scoreFieldConfidence('limit', '$3,000,000', 'gemini_extraction');
    const regex = scoreFieldConfidence('limit', '$3,000,000', 'ocr_ner');
    expect(gemini).toBeGreaterThan(regex);
    expect(gemini).toBeCloseTo(0.9, 5); // 0.70 prior + 0.20 strong
    expect(regex).toBeCloseTo(0.75, 5); // 0.55 prior + 0.20 strong
  });

  it('boosts valid money / date / domain values', () => {
    expect(scoreFieldConfidence('deductible', 250000, 'gemini_extraction')).toBeCloseTo(0.9, 5);
    expect(scoreFieldConfidence('effectiveDate', '05/01/2026', 'gemini_extraction')).toBeCloseTo(0.9, 5);
    expect(scoreFieldConfidence('effectiveDate', 'May 1, 2026', 'gemini_extraction')).toBeCloseTo(0.9, 5);
    expect(scoreFieldConfidence('companyDomain', 'acme.com', 'gemini_extraction')).toBeCloseTo(0.9, 5);
    expect(scoreFieldConfidence('expectedYield', 0.09, 'gemini_extraction')).toBeCloseTo(0.9, 5);
  });

  it('penalizes invalid money (zero/negative/unparseable) below the source prior', () => {
    expect(scoreFieldConfidence('limit', '0', 'ocr_ner')).toBeCloseTo(0.3, 5); // 0.55 - 0.25
    expect(scoreFieldConfidence('limit', 'lots', 'gemini_extraction')).toBeCloseTo(0.45, 5); // 0.70 - 0.25
  });

  it('penalizes a malformed date and a domain with no TLD', () => {
    expect(scoreFieldConfidence('effectiveDate', 'soon', 'gemini_extraction')).toBeCloseTo(0.45, 5);
    expect(scoreFieldConfidence('companyDomain', 'acme', 'gemini_extraction')).toBeCloseTo(0.45, 5);
  });

  it('penalizes too-short short-labels but rewards reasonable ones', () => {
    expect(scoreFieldConfidence('riskType', 'x', 'ocr_ner')).toBeCloseTo(0.4, 5); // 0.55 - 0.15 weak
    expect(scoreFieldConfidence('riskType', 'hurricane', 'ocr_ner')).toBeCloseTo(0.75, 5); // 0.55 + 0.20
    expect(scoreFieldConfidence('triggerType', 'parametric', 'gemini_extraction')).toBeCloseTo(0.9, 5);
  });

  it('treats a mis-scaled percent yield (0.5..1) as weak, not strong', () => {
    expect(scoreFieldConfidence('expectedYield', 0.9, 'gemini_extraction')).toBeCloseTo(0.55, 5); // 0.70 - 0.15
    expect(scoreFieldConfidence('expectedYield', 9, 'gemini_extraction')).toBeCloseTo(0.45, 5); // >1 invalid
  });

  it('collapses to the source prior for unknown fields (no magic per-field constants)', () => {
    expect(scoreFieldConfidence('somethingNew', 'whatever', 'gemini_extraction')).toBeCloseTo(0.7, 5);
    expect(scoreFieldConfidence('somethingNew', 'whatever', 'ocr_ner')).toBeCloseTo(0.55, 5);
  });

  it('uses a conservative default prior for an unknown source', () => {
    expect(scoreFieldConfidence('riskType', 'cyber', 'mystery_source')).toBeCloseTo(0.8, 5); // 0.60 + 0.20
  });

  it('always clamps to [0, 1]', () => {
    for (const f of ['limit', 'deductible', 'effectiveDate', 'companyDomain', 'riskType', 'subjectCount']) {
      for (const v of ['', null, '$5,000,000', '0', 'x', 'acme.com', 9999]) {
        const c = scoreFieldConfidence(f, v, 'gemini_extraction');
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('empty values are penalized regardless of source', () => {
    expect(scoreFieldConfidence('limit', '', 'gemini_extraction')).toBeCloseTo(0.45, 5);
    expect(scoreFieldConfidence('limit', null, 'ocr_ner')).toBeCloseTo(0.3, 5);
  });
});
