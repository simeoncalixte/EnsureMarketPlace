import type { GeocodeProvider, GeocodeQuery, NormalizedLocation } from '../geocoding/GeocodeProvider';
import type {
  ForwardQuery,
  GeolocationCapabilities,
  GeolocationProvider,
  PlaceCandidate,
  ReverseQuery,
  StructuredQuery,
} from './GeolocationProvider';
import { clamp01, num, str } from './util';

/**
 * Premium geolocation adapter — **Mapbox Geocoding v6** (search / structured /
 * reverse). Available only when a server-side `MAPBOX_ACCESS_TOKEN` is set (distinct
 * from the UI's `VITE_MAPBOX_TOKEN`). Boundary shapes are a paid Mapbox Boundaries
 * add-on and are not provided here (`shape:false`).
 *
 * Config: MAPBOX_ACCESS_TOKEN (required — presence = available),
 *         MAPBOX_GEOCODE_URL (default https://api.mapbox.com/search/geocode/v6).
 */
export class MapboxGeolocationProvider implements GeolocationProvider, GeocodeProvider {
  readonly name = 'mapbox';

  readonly capabilities: GeolocationCapabilities = {
    search: true,
    structured: true,
    reverse: true,
    shape: false,
    verify: false,
    autocomplete: false,
  };

  private readonly token?: string;

  private readonly baseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.token = env.MAPBOX_ACCESS_TOKEN;
    this.baseUrl = (env.MAPBOX_GEOCODE_URL ?? 'https://api.mapbox.com/search/geocode/v6').replace(/\/+$/, '');
  }

  isAvailable(): boolean {
    return Boolean(this.token);
  }

  private async getJson(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
    params.set('access_token', this.token as string);
    const res = await fetch(`${this.baseUrl}${path}?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`MapboxGeolocationProvider: ${path} API error ${res.status}`);
    return (await res.json().catch(() => ({}))) as Record<string, unknown>;
  }

  async search(query: ForwardQuery): Promise<PlaceCandidate[]> {
    if (!this.token) throw new Error('MapboxGeolocationProvider: MAPBOX_ACCESS_TOKEN is not configured');
    const q = String(query.query ?? '').trim();
    if (!q) return [];
    const params = new URLSearchParams({ q, limit: String(clampLimit(query.limit)) });
    if (query.countryCode) params.set('country', query.countryCode.toLowerCase());
    return featuresOf(await this.getJson('/forward', params)).map((f) => mapMapboxFeature(f, this.name));
  }

  async structured(query: StructuredQuery): Promise<PlaceCandidate[]> {
    if (!this.token) throw new Error('MapboxGeolocationProvider: MAPBOX_ACCESS_TOKEN is not configured');
    const params = new URLSearchParams({ limit: String(clampLimit(query.limit)) });
    const line1 = [query.line1, query.line2].filter(Boolean).join(' ').trim();
    if (line1) params.set('address_line1', line1);
    if (query.city) params.set('place', query.city);
    if (query.state) params.set('region', query.state);
    if (query.postalCode) params.set('postcode', query.postalCode);
    if (query.countryCode) params.set('country', query.countryCode.toLowerCase());
    // v6 structured-input mode requires at least one component.
    if ([...params.keys()].every((k) => k === 'limit')) return [];
    return featuresOf(await this.getJson('/forward', params)).map((f) => mapMapboxFeature(f, this.name));
  }

  async reverse(query: ReverseQuery): Promise<NormalizedLocation | null> {
    if (!this.token) throw new Error('MapboxGeolocationProvider: MAPBOX_ACCESS_TOKEN is not configured');
    if (!Number.isFinite(query.latitude) || !Number.isFinite(query.longitude)) return null;
    const params = new URLSearchParams({ longitude: String(query.longitude), latitude: String(query.latitude) });
    const features = featuresOf(await this.getJson('/reverse', params));
    return features[0] ? mapMapboxFeature(features[0], this.name) : null;
  }

  /** Legacy single-result forward geocode — keeps this drop-in for LocationDiscoveryService. */
  async geocode(query: GeocodeQuery): Promise<NormalizedLocation | null> {
    const results = await this.search({ query: query.query, countryCode: query.countryCode, limit: 1 });
    return results[0] ?? null;
  }
}

function featuresOf(body: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(body.features) ? (body.features as Record<string, unknown>[]) : [];
}

/** Pure: map a Mapbox Geocoding v6 feature onto the shared `NormalizedLocation`. Exported for tests. */
export function mapMapboxFeature(feature: Record<string, unknown>, provider: string): NormalizedLocation {
  const props = (feature.properties && typeof feature.properties === 'object' ? feature.properties : {}) as Record<string, unknown>;
  const context = (props.context && typeof props.context === 'object' ? props.context : {}) as Record<string, unknown>;
  const ctx = (key: string): Record<string, unknown> =>
    (context[key] && typeof context[key] === 'object' ? context[key] : {}) as Record<string, unknown>;

  const coords = (props.coordinates && typeof props.coordinates === 'object' ? props.coordinates : {}) as Record<string, unknown>;
  const matchCode = (props.match_code && typeof props.match_code === 'object' ? props.match_code : {}) as Record<string, unknown>;

  const address = ctx('address');
  const street = ctx('street');
  const line1 =
    str(address.name) ?? (props.feature_type === 'address' ? str(props.name) : null) ?? str(street.name);

  return {
    formattedAddress: str(props.full_address) ?? str(props.name),
    line1,
    line2: null,
    city: str(ctx('place').name),
    state: str(ctx('region').name),
    postalCode: str(ctx('postcode').name),
    countryCode: str(ctx('country').country_code)?.toUpperCase() ?? null,
    latitude: num(coords.latitude),
    longitude: num(coords.longitude),
    placeId: str(props.mapbox_id),
    confidence: mapboxConfidence(str(matchCode.confidence)),
    provider,
  };
}

/** Map Mapbox v6 `match_code.confidence` to a 0..1 score comparable with the other engines. */
export function mapboxConfidence(confidence: string | null): number {
  const base =
    confidence === 'exact'
      ? 1.0
      : confidence === 'high'
        ? 0.85
        : confidence === 'medium'
          ? 0.7
          : confidence === 'low'
            ? 0.5
            : 0.7;
  return clamp01(base);
}

function clampLimit(limit: number | undefined): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(Math.floor(n), 10);
}
