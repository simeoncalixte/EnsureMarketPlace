import { deriveLobCodes } from './deriveLob';

describe('deriveLobCodes (Slice 3, pure, DB-free)', () => {
  it('maps an exact free-text label to its primary code', () => {
    expect(deriveLobCodes({ lineOfBusiness: 'Property' })).toEqual({
      primaryCode: 'property',
      subTypeCode: null,
    });
  });

  it('normalizes separators and case (Commercial Property variants)', () => {
    for (const text of ['Commercial Property', 'commercial-property', 'commercial_property', 'COMMERCIAL  PROPERTY']) {
      expect(deriveLobCodes({ lineOfBusiness: text }).primaryCode).toBe('commercial_property');
    }
  });

  it('handles ampersand labels (Errors & Omissions, Farm & Ranch)', () => {
    expect(deriveLobCodes({ lineOfBusiness: 'Errors & Omissions' }).primaryCode).toBe('errors_omissions');
    expect(deriveLobCodes({ lineOfBusiness: 'Farm & Ranch' }).primaryCode).toBe('farm_ranch');
  });

  it('trusts an explicit, known structured primary code', () => {
    expect(deriveLobCodes({ lineOfBusinessCode: 'cyber' })).toEqual({
      primaryCode: 'cyber',
      subTypeCode: null,
    });
  });

  it('keeps a sub-type code only when consistent with the primary', () => {
    expect(
      deriveLobCodes({ lineOfBusinessCode: 'commercial_property', lineOfBusinessSubTypeCode: 'commercial_property_office' }),
    ).toEqual({ primaryCode: 'commercial_property', subTypeCode: 'commercial_property_office' });
  });

  it('drops an inconsistent sub-type code rather than guessing', () => {
    expect(
      deriveLobCodes({ lineOfBusinessCode: 'cyber', lineOfBusinessSubTypeCode: 'property_all_risk' }),
    ).toEqual({ primaryCode: 'cyber', subTypeCode: null });
  });

  it('infers primary + subtype from a <primary>_<suffix> free-text string (longest prefix wins)', () => {
    // Must resolve to commercial_property, NOT property.
    expect(deriveLobCodes({ lineOfBusiness: 'commercial_property_office' })).toEqual({
      primaryCode: 'commercial_property',
      subTypeCode: 'commercial_property_office',
    });
  });

  it('returns nulls for unmappable / ambiguous text (SAFE → no pin)', () => {
    expect(deriveLobCodes({ lineOfBusiness: 'something totally unknown' })).toEqual({
      primaryCode: null,
      subTypeCode: null,
    });
    expect(deriveLobCodes({ lineOfBusiness: '' })).toEqual({ primaryCode: null, subTypeCode: null });
    expect(deriveLobCodes({})).toEqual({ primaryCode: null, subTypeCode: null });
    expect(deriveLobCodes({ lineOfBusiness: 12345 as unknown })).toEqual({ primaryCode: null, subTypeCode: null });
  });
});
