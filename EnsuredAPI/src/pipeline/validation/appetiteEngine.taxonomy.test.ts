import { evaluateAppetite, AppetiteProfileLike, TaxonomyAppetiteInput } from './appetiteEngine';

/**
 * Slice 4 — the engine-level augmentation. These tests prove:
 *  (a) with NO taxonomy input, the engine behaves identically to the free-text
 *      LOB matcher (regression guard);
 *  (b) when a taxonomy decision applies, it replaces the free-text LOB check;
 *  (c) when the taxonomy path declines (no code / no declaration), the free-text
 *      check still runs.
 */

const profile: AppetiteProfileLike = { id: 1, allowedLinesOfBusiness: ['property'] };

describe('evaluateAppetite — free-text LOB unchanged when no taxonomy input', () => {
  test('LOB outside the allowed free-text set still flags (byte-for-byte)', () => {
    const res = evaluateAppetite({ lineOfBusiness: 'marine' }, profile);
    expect(res.decision).toBe('FLAGGED');
    expect(res.findings.some((f) => f.rule === 'allowed_line_of_business')).toBe(true);
  });

  test('LOB inside the allowed free-text set passes', () => {
    const res = evaluateAppetite({ lineOfBusiness: 'property' }, profile);
    expect(res.decision).toBe('IN_APPETITE');
  });

  test('explicit null taxonomy arg is identical to omitting it', () => {
    const omitted = evaluateAppetite({ lineOfBusiness: 'marine' }, profile);
    const explicitNull = evaluateAppetite({ lineOfBusiness: 'marine' }, profile, [], null);
    expect(explicitNull).toEqual(omitted);
  });
});

describe('evaluateAppetite — taxonomy decision replaces free-text LOB check', () => {
  test('taxonomy OUT overrides a free-text-allowed LOB', () => {
    // Free text "property" is in the allowed set (would pass free-text), but the
    // taxonomy declaration excludes the resolved subtype ⇒ OUT.
    const taxonomy: TaxonomyAppetiteInput = {
      resolved: { primaryCode: 'residential_property', subTypeCode: 'residential_property_single_family' },
      declaration: { allowedLineOfBusinessCodes: [], excludedLineOfBusinessCodes: ['residential_property'] },
    };
    const res = evaluateAppetite({ lineOfBusiness: 'property' }, profile, [], taxonomy);
    expect(res.decision).toBe('OUT_OF_APPETITE');
    expect(res.findings.some((f) => f.rule === 'taxonomy_excluded_line_of_business')).toBe(true);
    // The free-text LOB finding must NOT also be present (taxonomy replaced it).
    expect(res.findings.some((f) => f.rule === 'allowed_line_of_business')).toBe(false);
  });

  test('taxonomy IN suppresses a free-text flag', () => {
    // Free text "marine" is NOT in the allowed set (would flag free-text), but the
    // taxonomy path resolves and allows it ⇒ IN.
    const taxonomy: TaxonomyAppetiteInput = {
      resolved: { primaryCode: 'ocean_marine', subTypeCode: null },
      declaration: { allowedLineOfBusinessCodes: ['ocean_marine'], excludedLineOfBusinessCodes: [] },
    };
    const res = evaluateAppetite({ lineOfBusiness: 'marine' }, profile, [], taxonomy);
    expect(res.decision).toBe('IN_APPETITE');
    expect(res.findings.some((f) => f.rule === 'allowed_line_of_business')).toBe(false);
  });
});

describe('evaluateAppetite — taxonomy declines ⇒ free-text fallback', () => {
  test('no resolved code ⇒ free-text check runs (flags marine)', () => {
    const taxonomy: TaxonomyAppetiteInput = {
      resolved: { primaryCode: null, subTypeCode: null },
      declaration: { allowedLineOfBusinessCodes: ['ocean_marine'], excludedLineOfBusinessCodes: [] },
    };
    const res = evaluateAppetite({ lineOfBusiness: 'marine' }, profile, [], taxonomy);
    expect(res.decision).toBe('FLAGGED');
    expect(res.findings.some((f) => f.rule === 'allowed_line_of_business')).toBe(true);
  });

  test('empty declaration ⇒ free-text check runs', () => {
    const taxonomy: TaxonomyAppetiteInput = {
      resolved: { primaryCode: 'ocean_marine', subTypeCode: null },
      declaration: { allowedLineOfBusinessCodes: [], excludedLineOfBusinessCodes: [] },
    };
    const res = evaluateAppetite({ lineOfBusiness: 'marine' }, profile, [], taxonomy);
    expect(res.decision).toBe('FLAGGED');
    expect(res.findings.some((f) => f.rule === 'allowed_line_of_business')).toBe(true);
  });
});

describe('evaluateAppetite — taxonomy LOB composes with other dimensions', () => {
  test('an excluded peril still rejects even if taxonomy LOB is in appetite', () => {
    const p: AppetiteProfileLike = { id: 1, excludedPerils: ['nuclear'], allowedLinesOfBusiness: [] };
    const taxonomy: TaxonomyAppetiteInput = {
      resolved: { primaryCode: 'cyber', subTypeCode: null },
      declaration: { allowedLineOfBusinessCodes: ['cyber'], excludedLineOfBusinessCodes: [] },
    };
    const res = evaluateAppetite({ riskType: 'nuclear', lineOfBusiness: 'cyber' }, p, [], taxonomy);
    expect(res.decision).toBe('OUT_OF_APPETITE');
  });
});
