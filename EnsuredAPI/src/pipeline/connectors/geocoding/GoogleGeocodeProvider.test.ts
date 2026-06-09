import { GoogleGeocodeProvider, mapGoogleResult, googleConfidence } from './GoogleGeocodeProvider';

const SAMPLE_RESULT = {
  formatted_address: '100 Bay St, Tampa, FL 33602, USA',
  place_id: 'ChIJ_google_place',
  partial_match: false,
  geometry: { location: { lat: 27.9506, lng: -82.4572 }, location_type: 'ROOFTOP' },
  address_components: [
    { long_name: '100', short_name: '100', types: ['street_number'] },
    { long_name: 'Bay Street', short_name: 'Bay St', types: ['route'] },
    { long_name: 'Tampa', short_name: 'Tampa', types: ['locality', 'political'] },
    { long_name: 'Florida', short_name: 'FL', types: ['administrative_area_level_1', 'political'] },
    { long_name: 'United States', short_name: 'US', types: ['country', 'political'] },
    { long_name: '33602', short_name: '33602', types: ['postal_code'] },
  ],
};

describe('GoogleGeocodeProvider (premium adapter)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    (global as any).fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('is available only when GOOGLE_MAPS_API_KEY is configured', () => {
    expect(new GoogleGeocodeProvider({} as NodeJS.ProcessEnv).isAvailable()).toBe(false);
    expect(new GoogleGeocodeProvider({ GOOGLE_MAPS_API_KEY: 'k' } as NodeJS.ProcessEnv).isAvailable()).toBe(true);
  });

  it('GETs the geocode endpoint with the key and returns the same NormalizedLocation shape as the free provider', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'OK', results: [SAMPLE_RESULT] }) });
    (global as any).fetch = fetchMock;

    const provider = new GoogleGeocodeProvider({ GOOGLE_MAPS_API_KEY: 'secret' } as NodeJS.ProcessEnv);
    const result = await provider.geocode({ query: '100 Bay St, Tampa FL', countryCode: 'US' });

    expect(result).toMatchObject({
      provider: 'google',
      line1: '100 Bay Street',
      city: 'Tampa',
      state: 'Florida',
      postalCode: '33602',
      countryCode: 'US',
      latitude: 27.9506,
      longitude: -82.4572,
      placeId: 'ChIJ_google_place',
      confidence: 1,
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('key=secret');
    expect(String(url)).toContain('components=country%3AUS');
  });

  it('returns null on ZERO_RESULTS (a normal no-match, not an error)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ZERO_RESULTS', results: [] }) });
    const provider = new GoogleGeocodeProvider({ GOOGLE_MAPS_API_KEY: 'k' } as NodeJS.ProcessEnv);
    expect(await provider.geocode({ query: 'nowhere' })).toBeNull();
  });

  it('throws on an error status such as REQUEST_DENIED', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'REQUEST_DENIED', error_message: 'bad key' }),
    });
    const provider = new GoogleGeocodeProvider({ GOOGLE_MAPS_API_KEY: 'k' } as NodeJS.ProcessEnv);
    await expect(provider.geocode({ query: 'Tampa' })).rejects.toThrow(/REQUEST_DENIED — bad key/);
  });

  it('throws when no API key is configured', async () => {
    const provider = new GoogleGeocodeProvider({} as NodeJS.ProcessEnv);
    await expect(provider.geocode({ query: 'Tampa' })).rejects.toThrow(/GOOGLE_MAPS_API_KEY is not configured/);
  });

  it('maps location_type + partial_match onto a 0..1 confidence comparable to Nominatim importance', () => {
    expect(googleConfidence('ROOFTOP', false)).toBe(1);
    expect(googleConfidence('APPROXIMATE', false)).toBe(0.5);
    expect(googleConfidence('ROOFTOP', true)).toBeCloseTo(0.8);
    expect(mapGoogleResult(SAMPLE_RESULT, 'google').confidence).toBe(1);
  });
});
