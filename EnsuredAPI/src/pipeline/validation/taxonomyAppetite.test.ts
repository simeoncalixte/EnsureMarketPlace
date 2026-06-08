import {
  buildTaxonomyLobDeclaration,
  evaluateTaxonomyLineOfBusinessAppetite,
  TaxonomyLobDeclaration,
} from './taxonomyAppetite';

const decl = (allowed: string[], excluded: string[] = []): TaxonomyLobDeclaration => ({
  allowedLineOfBusinessCodes: allowed,
  excludedLineOfBusinessCodes: excluded,
});

describe('evaluateTaxonomyLineOfBusinessAppetite — hierarchy', () => {
  test('an ALLOWED primary matches a submission subtype under it (primary→subtype)', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: 'residential_property_single_family' },
      decl(['residential_property']),
    );
    expect(out.applied).toBe(true);
    if (out.applied) {
      expect(out.decision).toBe('IN_APPETITE');
      expect(out.findings).toHaveLength(0);
    }
  });

  test('an EXCLUDED primary takes the submission subtype OUT, with an explainable reason', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: 'residential_property_single_family' },
      decl([], ['residential_property']),
    );
    expect(out.applied).toBe(true);
    if (out.applied) {
      expect(out.decision).toBe('OUT_OF_APPETITE');
      expect(out.findings[0].reason).toContain('residential_property_single_family');
      expect(out.findings[0].reason).toContain("matched excluded primary 'residential_property'");
      expect(out.findings[0].severity).toBe('reject');
    }
  });

  test('exact SUBTYPE allow matches only that subtype', () => {
    const allowed = decl(['residential_property_single_family']);
    const inSub = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: 'residential_property_single_family' },
      allowed,
    );
    expect(inSub.applied && inSub.decision).toBe('IN_APPETITE');

    // A different subtype under the same primary is NOT allowed (no primary entry).
    const otherSub = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: 'residential_property_condo' },
      allowed,
    );
    expect(otherSub.applied).toBe(true);
    if (otherSub.applied) expect(otherSub.decision).toBe('FLAGGED');
  });

  test('exact SUBTYPE exclusion matches only that subtype, siblings stay allowed', () => {
    const d = decl(['residential_property'], ['residential_property_condo']);
    const condo = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: 'residential_property_condo' },
      d,
    );
    expect(condo.applied && condo.decision).toBe('OUT_OF_APPETITE');

    const single = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: 'residential_property_single_family' },
      d,
    );
    expect(single.applied && single.decision).toBe('IN_APPETITE');
  });
});

describe('evaluateTaxonomyLineOfBusinessAppetite — excluded precedence', () => {
  test('excluded wins when the submission matches both allowed and excluded', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: 'residential_property_single_family' },
      decl(['residential_property'], ['residential_property_single_family']),
    );
    expect(out.applied && out.decision).toBe('OUT_OF_APPETITE');
  });

  test('excluded subtype beats allowed primary', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'commercial_property', subTypeCode: 'commercial_property_office' },
      decl(['commercial_property'], ['commercial_property_office']),
    );
    expect(out.applied && out.decision).toBe('OUT_OF_APPETITE');
  });
});

describe('evaluateTaxonomyLineOfBusinessAppetite — defer to free-text', () => {
  test('no resolved code ⇒ applied:false (defer to free-text)', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: null, subTypeCode: null },
      decl(['residential_property']),
    );
    expect(out.applied).toBe(false);
  });

  test('no taxonomy declaration ⇒ applied:false (defer to free-text)', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'residential_property', subTypeCode: null },
      decl([], []),
    );
    expect(out.applied).toBe(false);
  });

  test('primary-only submission still decides against a primary declaration', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'cyber', subTypeCode: null },
      decl([], ['cyber']),
    );
    expect(out.applied && out.decision).toBe('OUT_OF_APPETITE');
  });
});

describe('evaluateTaxonomyLineOfBusinessAppetite — normalization', () => {
  test('codes match regardless of case/separator style', () => {
    const out = evaluateTaxonomyLineOfBusinessAppetite(
      { primaryCode: 'Residential Property', subTypeCode: 'Residential-Property-Single-Family' },
      decl(['residential_property']),
    );
    expect(out.applied && out.decision).toBe('IN_APPETITE');
  });
});

describe('buildTaxonomyLobDeclaration', () => {
  test('unions registry dimensions and profile codes', () => {
    const d = buildTaxonomyLobDeclaration({
      appetiteDimensions: {
        allowedLineOfBusinessCodes: ['commercial_property'],
        excludedLineOfBusinessCodes: ['residential_property'],
      },
      profileAllowedCodes: ['cyber'],
    });
    expect(d.allowedLineOfBusinessCodes.sort()).toEqual(['commercial_property', 'cyber']);
    expect(d.excludedLineOfBusinessCodes).toEqual(['residential_property']);
  });

  test('empty inputs yield empty declaration', () => {
    const d = buildTaxonomyLobDeclaration({});
    expect(d.allowedLineOfBusinessCodes).toEqual([]);
    expect(d.excludedLineOfBusinessCodes).toEqual([]);
  });

  test('non-array dimension values are ignored safely', () => {
    const d = buildTaxonomyLobDeclaration({
      appetiteDimensions: { allowedLineOfBusinessCodes: 'not-an-array' as unknown as string[] },
    });
    expect(d.allowedLineOfBusinessCodes).toEqual([]);
  });
});
