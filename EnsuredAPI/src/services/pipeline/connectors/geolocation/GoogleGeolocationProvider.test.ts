import { GoogleGeolocationProvider, mapGoogleValidation } from './GoogleGeolocationProvider';

describe('GoogleGeolocationProvider (premium unified adapter)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    (global as any).fetch = realFetch;
    jest.restoreAllMocks();
  });

  const make = () => new GoogleGeolocationProvider({ GOOGLE_MAPS_API_KEY: 'k' } as NodeJS.ProcessEnv);

  it('is unavailable without a key, and never offers shapes', () => {
    expect(new GoogleGeolocationProvider({} as NodeJS.ProcessEnv).isAvailable()).toBe(false);
    expect(make().capabilities).toMatchObject({ search: true, reverse: true, verify: true, shape: false });
  });

  it('search maps Google results (up to limit)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            formatted_address: '100 Bay St, Tampa, FL 33602, USA',
            address_components: [
              { types: ['street_number'], long_name: '100', short_name: '100' },
              { types: ['route'], long_name: 'Bay St', short_name: 'Bay St' },
              { types: ['locality'], long_name: 'Tampa', short_name: 'Tampa' },
              { types: ['administrative_area_level_1'], long_name: 'Florida', short_name: 'FL' },
              { types: ['country'], long_name: 'United States', short_name: 'US' },
            ],
            geometry: { location: { lat: 27.95, lng: -82.45 }, location_type: 'ROOFTOP' },
            place_id: 'abc',
          },
        ],
      }),
    });
    const results = await make().search({ query: '100 Bay St Tampa', limit: 3 });
    expect(results[0]).toMatchObject({ line1: '100 Bay St', city: 'Tampa', state: 'Florida', countryCode: 'US', confidence: 1, provider: 'google' });
  });

  describe('verify (Address Validation) verdict mapping', () => {
    it('verified when complete with no issues', () => {
      const v = mapGoogleValidation(
        { result: { verdict: { addressComplete: true }, address: { formattedAddress: '1 A St', postalAddress: { addressLines: ['1 A St'], locality: 'Tampa', administrativeArea: 'FL', regionCode: 'US' } } } },
        'google',
      );
      expect(v).toMatchObject({ verdict: 'verified', provider: 'google' });
      expect(v.confidence).toBeGreaterThan(0.9);
      expect(v.normalized).toMatchObject({ city: 'Tampa', countryCode: 'US' });
    });

    it('corrected when components were inferred/replaced', () => {
      const v = mapGoogleValidation(
        { result: { verdict: { addressComplete: true, hasInferredComponents: true }, address: { postalAddress: {} } } },
        'google',
      );
      expect(v.verdict).toBe('corrected');
      expect(v.changes).toContain('inferred-components');
    });

    it('unverified otherwise', () => {
      const v = mapGoogleValidation({ result: { verdict: { addressComplete: false, hasUnconfirmedComponents: true } } }, 'google');
      expect(v.verdict).toBe('unverified');
    });
  });

  it('verify POSTs to the Address Validation endpoint with the key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { verdict: { addressComplete: true }, address: { postalAddress: {} } } }) });
    (global as any).fetch = fetchMock;
    await make().verify({ line1: '100 Bay St', city: 'Tampa', state: 'FL', countryCode: 'US' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('validateAddress');
    expect(String(url)).toContain('key=k');
    expect(init.method).toBe('POST');
  });
});
