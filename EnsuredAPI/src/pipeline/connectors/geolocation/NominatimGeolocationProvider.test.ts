import { NominatimGeolocationProvider } from './NominatimGeolocationProvider';

describe('NominatimGeolocationProvider (open-source unified adapter)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    (global as any).fetch = realFetch;
    jest.restoreAllMocks();
  });

  const make = () => new NominatimGeolocationProvider({ NOMINATIM_USER_AGENT: 'TestAgent/1.0' } as NodeJS.ProcessEnv);

  it('is always available and declares search/structured/reverse/shape (no verify)', () => {
    const p = make();
    expect(p.isAvailable()).toBe(true);
    expect(p.capabilities).toMatchObject({ search: true, structured: true, reverse: true, shape: true, verify: false });
  });

  it('search returns MULTIPLE ranked candidates', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: '27.95', lon: '-82.45', display_name: 'Tampa, FL, USA', place_id: 1, importance: 0.7, address: { city: 'Tampa', state: 'Florida', country_code: 'us' } },
        { lat: '27.94', lon: '-82.46', display_name: 'Tampa Heights, FL, USA', place_id: 2, importance: 0.5, address: { city: 'Tampa', state: 'Florida', country_code: 'us' } },
      ],
    });
    const results = await make().search({ query: 'Tampa', countryCode: 'US', limit: 5 });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ provider: 'nominatim', city: 'Tampa', countryCode: 'US' });
  });

  it('structured sends component params (street/city/state)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
    (global as any).fetch = fetchMock;
    await make().structured({ line1: '100 Bay St', city: 'Tampa', state: 'Florida', countryCode: 'US' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('street=100+Bay+St');
    expect(url).toContain('city=Tampa');
    expect(url).toContain('state=Florida');
    expect(url).toContain('country=US');
  });

  it('reverse maps a single result', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lat: '27.95', lon: '-82.45', display_name: 'Tampa, FL', place_id: 9, address: { city: 'Tampa', country_code: 'us' } }),
    });
    const result = await make().reverse({ latitude: 27.95, longitude: -82.45 });
    expect(result).toMatchObject({ city: 'Tampa', countryCode: 'US', provider: 'nominatim' });
  });

  it('fetchShape parses polygon_geojson + boundingbox into geometry/bbox', async () => {
    const geometry = { type: 'Polygon', coordinates: [[[-82.6, 27.6], [-82.3, 27.6], [-82.3, 28.1], [-82.6, 28.1], [-82.6, 27.6]]] };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { display_name: 'Florida, USA', boundingbox: ['27.6', '28.1', '-82.6', '-82.3'], geojson: geometry, address: { country_code: 'us' } },
      ],
    });
    (global as any).fetch = fetchMock;
    const shape = await make().fetchShape({ kind: 'state', ref: 'Florida', countryCode: 'US' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('polygon_geojson=1');
    expect(shape).toMatchObject({
      kind: 'state',
      geometry,
      // boundingbox [south,north,west,east] -> bbox [west,south,east,north]
      bbox: [-82.6, 27.6, -82.3, 28.1],
      countryCode: 'US',
      provider: 'nominatim',
      source: 'nominatim',
    });
  });

  it('fetchShape returns null when no geometry is present', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ display_name: 'X' }] });
    expect(await make().fetchShape({ kind: 'country', ref: 'US' })).toBeNull();
  });

  it('throws on a non-2xx response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(make().search({ query: 'Tampa' })).rejects.toThrow(/503/);
  });
});
