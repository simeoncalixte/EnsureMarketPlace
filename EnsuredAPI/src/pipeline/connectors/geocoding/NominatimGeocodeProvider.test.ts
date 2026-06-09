import { NominatimGeocodeProvider, mapNominatimResult } from './NominatimGeocodeProvider';

describe('NominatimGeocodeProvider (open-source adapter)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    (global as any).fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('is always available (no API key required)', () => {
    expect(new NominatimGeocodeProvider({} as NodeJS.ProcessEnv).isAvailable()).toBe(true);
  });

  it('GETs the search endpoint with an identifying User-Agent and returns a normalized location', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '27.9506',
          lon: '-82.4572',
          display_name: '100 Bay St, Tampa, FL 33602, USA',
          place_id: 12345,
          importance: 0.73,
          address: { house_number: '100', road: 'Bay St', city: 'Tampa', state: 'Florida', postcode: '33602', country_code: 'us' },
        },
      ],
    });
    (global as any).fetch = fetchMock;

    const provider = new NominatimGeocodeProvider({ NOMINATIM_USER_AGENT: 'TestAgent/1.0' } as NodeJS.ProcessEnv);
    const result = await provider.geocode({ query: '100 Bay St, Tampa FL', countryCode: 'US' });

    expect(result).toMatchObject({
      provider: 'nominatim',
      line1: '100 Bay St',
      city: 'Tampa',
      state: 'Florida',
      postalCode: '33602',
      countryCode: 'US',
      latitude: 27.9506,
      longitude: -82.4572,
      placeId: '12345',
      confidence: 0.73,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/search?');
    expect(String(url)).toContain('countrycodes=us');
    expect(init.headers['User-Agent']).toBe('TestAgent/1.0');
  });

  it('returns null when the engine has no match', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const provider = new NominatimGeocodeProvider({} as NodeJS.ProcessEnv);
    expect(await provider.geocode({ query: 'nowhere at all' })).toBeNull();
  });

  it('returns null for an empty query without calling the network', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    const provider = new NominatimGeocodeProvider({} as NodeJS.ProcessEnv);
    expect(await provider.geocode({ query: '   ' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on a non-ok API response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const provider = new NominatimGeocodeProvider({} as NodeJS.ProcessEnv);
    await expect(provider.geocode({ query: 'Tampa' })).rejects.toThrow(/geocode API error 429/);
  });

  it('maps the locality from town/village when city is absent and defaults confidence', () => {
    const mapped = mapNominatimResult(
      { lat: '1', lon: '2', display_name: 'X', address: { village: 'Smalltown', country_code: 'fr' } },
      'nominatim',
    );
    expect(mapped.city).toBe('Smalltown');
    expect(mapped.countryCode).toBe('FR');
    expect(mapped.confidence).toBe(0.5);
  });
});
