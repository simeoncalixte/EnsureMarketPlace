import { resolveLineOfBusinessTaxonomySlice } from './taxonomy';

describe('resolveLineOfBusinessTaxonomySlice', () => {
  it('returns the full primary catalog regardless of the classified value', () => {
    const slice = resolveLineOfBusinessTaxonomySlice('property');
    expect(slice.primaryTypes.length).toBeGreaterThan(1);
    expect(slice.primaryTypes).toContainEqual({ code: 'property', label: 'Property' });
    // Compact shape only — no nested sub-types on the catalog list.
    expect(Object.keys(slice.primaryTypes[0]).sort()).toEqual(['code', 'label']);
  });

  it('resolves sub-types for the classified primary by code', () => {
    const slice = resolveLineOfBusinessTaxonomySlice('property');
    expect(slice.recognized).toBe(true);
    expect(slice.matchedPrimary).toEqual({ code: 'property', label: 'Property' });
    const subCodes = slice.subTypes.map((s) => s.code);
    expect(subCodes).toContain('property_all_risk');
    expect(subCodes).toContain('property_catastrophe');
  });

  it('matches by label (case-insensitive) when no code is given', () => {
    const slice = resolveLineOfBusinessTaxonomySlice(null, 'OCEAN MARINE');
    expect(slice.recognized).toBe(true);
    expect(slice.matchedPrimary?.code).toBe('ocean_marine');
    expect(slice.subTypes.map((s) => s.code)).toContain('ocean_marine_cargo');
  });

  it('flags an unrecognized line of business but still returns the catalog', () => {
    const slice = resolveLineOfBusinessTaxonomySlice('not_a_real_lob', 'Nonsense');
    expect(slice.recognized).toBe(false);
    expect(slice.matchedPrimary).toBeNull();
    expect(slice.subTypes).toEqual([]);
    expect(slice.primaryTypes.length).toBeGreaterThan(1);
  });

  it('is unrecognized when nothing is classified', () => {
    const slice = resolveLineOfBusinessTaxonomySlice(null, null);
    expect(slice.recognized).toBe(false);
    expect(slice.subTypes).toEqual([]);
  });
});
