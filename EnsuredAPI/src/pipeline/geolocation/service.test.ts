// Mock the DB-touching write-back deps so the local-first logic is testable
// without Postgres. resolveAndPersistGeography already swallows DB errors in prod,
// but mocking lets us ASSERT that write-back fired on a remote hit.
jest.mock('../locationDiscovery/geography', () => ({
  resolveAndPersistGeography: jest.fn().mockResolvedValue({ addressId: 1, countryId: 1, stateProvinceId: null, cityId: null }),
}));
jest.mock('../../db/models', () => ({
  GeoShape: { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
}));

import { GeolocationService } from './service';
import { resolveAndPersistGeography } from '../locationDiscovery/geography';
import type {
  ForwardQuery,
  GeolocationCapabilities,
  GeolocationProvider,
  GeoShape,
  NormalizedLocation,
  PlaceCandidate,
  ReverseQuery,
  ShapeRef,
} from '../connectors/geolocation/GeolocationProvider';

const loc = (over: Partial<NormalizedLocation> = {}): NormalizedLocation => ({
  formattedAddress: 'X',
  line1: null,
  line2: null,
  city: 'Tampa',
  state: 'FL',
  postalCode: null,
  countryCode: 'US',
  latitude: 27.95,
  longitude: -82.45,
  placeId: null,
  confidence: 0.5,
  provider: 'test',
  ...over,
});

const caps = (over: Partial<GeolocationCapabilities> = {}): GeolocationCapabilities => ({
  search: false,
  structured: false,
  reverse: false,
  shape: false,
  verify: false,
  autocomplete: false,
  ...over,
});

/** Configurable fake provider that records whether it was called. */
class Fake implements GeolocationProvider {
  called = false;
  constructor(
    readonly name: string,
    readonly capabilities: GeolocationCapabilities,
    private readonly available = true,
    private readonly impl: Partial<{
      search: PlaceCandidate[];
      reverse: NormalizedLocation | null;
      shape: GeoShape | null;
    }> = {},
  ) {}
  isAvailable() {
    return this.available;
  }
  async search(_q: ForwardQuery) {
    this.called = true;
    return this.impl.search ?? [];
  }
  async reverse(_q: ReverseQuery) {
    this.called = true;
    return this.impl.reverse ?? null;
  }
  async fetchShape(_r: ShapeRef) {
    this.called = true;
    return this.impl.shape ?? null;
  }
}

beforeEach(() => jest.clearAllMocks());

describe('GeolocationService local-first orchestration', () => {
  it('short-circuits on a CONFIDENT local hit and never calls remote', async () => {
    const local = new Fake('local', caps({ search: true }), true, {
      search: [loc({ line1: '100 Bay St', confidence: 0.9 })],
    });
    const remote = new Fake('nominatim', caps({ search: true }), true, { search: [loc({ line1: 'remote' })] });
    const svc = new GeolocationService({ providers: [local, remote] });

    const res = await svc.search({ query: 'Tampa' });
    expect(res.source).toBe('local');
    expect(remote.called).toBe(false);
    expect(resolveAndPersistGeography).not.toHaveBeenCalled();
  });

  it('falls through to remote when the local hit is only COARSE, and writes back', async () => {
    const local = new Fake('local', caps({ search: true }), true, {
      search: [loc({ line1: null, confidence: 0.5 })], // coarse city-only
    });
    const remote = new Fake('nominatim', caps({ search: true }), true, {
      search: [loc({ line1: '100 Bay St', provider: 'nominatim' })],
    });
    const svc = new GeolocationService({ providers: [local, remote] });

    const res = await svc.search({ query: 'Tampa' });
    expect(remote.called).toBe(true);
    expect(res.source).toBe('nominatim');
    expect(resolveAndPersistGeography).toHaveBeenCalledTimes(1); // write-back fired
  });

  it('skips providers lacking the capability', async () => {
    const noSearch = new Fake('mapbox', caps({ reverse: true }), true, { search: [loc({ line1: 'should-not-be-used' })] });
    const yesSearch = new Fake('nominatim', caps({ search: true }), true, { search: [loc({ line1: '1 St', provider: 'nominatim' })] });
    const svc = new GeolocationService({ providers: [noSearch, yesSearch] });

    const res = await svc.search({ query: 'Tampa' });
    expect(noSearch.called).toBe(false);
    expect(res.provider).toBe('nominatim');
  });

  it('returns an empty, ok result (no throw) when every provider misses', async () => {
    const local = new Fake('local', caps({ search: true }), true, { search: [] });
    const remote = new Fake('nominatim', caps({ search: true }), true, { search: [] });
    const svc = new GeolocationService({ providers: [local, remote] });

    const res = await svc.search({ query: 'nowhere' });
    expect(res).toMatchObject({ ok: true, source: 'none', provider: null, candidates: [] });
  });

  it('records a warning and continues when a remote provider throws', async () => {
    const local = new Fake('local', caps({ search: true }), true, { search: [] });
    const boom = new Fake('google', caps({ search: true }), true);
    jest.spyOn(boom, 'search').mockRejectedValue(new Error('rate limited'));
    const ok = new Fake('nominatim', caps({ search: true }), true, { search: [loc({ line1: '1 St', provider: 'nominatim' })] });
    const svc = new GeolocationService({ providers: [local, boom, ok] });

    const res = await svc.search({ query: 'Tampa' });
    expect(res.provider).toBe('nominatim');
    expect(res.warnings.some((w) => w.includes('google') && w.includes('rate limited'))).toBe(true);
  });

  it('fetchShape serves the local cache without calling remote', async () => {
    const cached: GeoShape = { kind: 'country', ref: 'US', name: 'United States', countryCode: 'US', geometry: { type: 'Polygon', coordinates: [] }, bbox: null, provider: 'nominatim', source: 'local' };
    const local = new Fake('local', caps({ shape: true }), true, { shape: cached });
    const remote = new Fake('nominatim', caps({ shape: true }), true, { shape: { ...cached, source: 'nominatim' } });
    const svc = new GeolocationService({ providers: [local, remote] });

    const res = await svc.fetchShape({ kind: 'country', ref: 'US' });
    expect(res.source).toBe('local');
    expect(remote.called).toBe(false);
  });
});
