import { MapboxGeolocationProvider, mapboxConfidence, mapMapboxFeature } from './MapboxGeolocationProvider';

describe('MapboxGeolocationProvider (Geocoding v6 unified adapter)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    (global as any).fetch = realFetch;
    jest.restoreAllMocks();
  });

  const make = () => new MapboxGeolocationProvider({ MAPBOX_ACCESS_TOKEN: 'tok' } as NodeJS.ProcessEnv);

  it('is gated on MAPBOX_ACCESS_TOKEN and does not offer shape/verify', () => {
    expect(new MapboxGeolocationProvider({} as NodeJS.ProcessEnv).isAvailable()).toBe(false);
    expect(make().isAvailable()).toBe(true);
    expect(make().capabilities).toMatchObject({ search: true, reverse: true, structured: true, shape: false, verify: false });
  });

  it('maps a v6 feature onto NormalizedLocation', () => {
    const feature = {
      properties: {
        mapbox_id: 'mbx-100-bay',
        feature_type: 'address',
        full_address: '100 Bay St, Tampa, Florida 33602, United States',
        name: '100 Bay St',
        coordinates: { longitude: -82.45, latitude: 27.95 },
        match_code: { confidence: 'exact' },
        context: {
          place: { name: 'Tampa' },
          region: { name: 'Florida', region_code: 'FL' },
          postcode: { name: '33602' },
          country: { name: 'United States', country_code: 'us' },
        },
      },
    };
    expect(mapMapboxFeature(feature, 'mapbox')).toMatchObject({
      line1: '100 Bay St',
      city: 'Tampa',
      state: 'Florida',
      postalCode: '33602',
      countryCode: 'US',
      latitude: 27.95,
      longitude: -82.45,
      placeId: 'mbx-100-bay',
      confidence: 1,
      provider: 'mapbox',
    });
  });

  it('confidence ramp maps exact/high/medium/low', () => {
    expect(mapboxConfidence('exact')).toBe(1);
    expect(mapboxConfidence('high')).toBeCloseTo(0.85);
    expect(mapboxConfidence('low')).toBeCloseTo(0.5);
    expect(mapboxConfidence(null)).toBeCloseTo(0.7);
  });

  it('search hits /forward with the token and returns candidates', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ properties: { mapbox_id: 'x', full_address: 'Tampa, FL', coordinates: { longitude: -82.45, latitude: 27.95 }, context: { country: { country_code: 'us' } } } }] }),
    });
    (global as any).fetch = fetchMock;
    const results = await make().search({ query: 'Tampa', countryCode: 'US' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/forward?');
    expect(String(fetchMock.mock.calls[0][0])).toContain('access_token=tok');
    expect(results[0]).toMatchObject({ countryCode: 'US', provider: 'mapbox' });
  });
});
