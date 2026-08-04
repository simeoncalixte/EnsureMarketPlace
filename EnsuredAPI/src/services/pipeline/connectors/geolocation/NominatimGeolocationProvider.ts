import type { GeocodeProvider, GeocodeQuery, NormalizedLocation } from '../geocoding/GeocodeProvider';
import { mapNominatimResult } from '../geocoding/NominatimGeocodeProvider';
import type {
  ForwardQuery,
  GeolocationCapabilities,
  GeolocationProvider,
  GeoShape,
  PlaceCandidate,
  ReverseQuery,
  ShapeRef,
  StructuredQuery,
} from './GeolocationProvider';
import { num, str } from './util';

/**
 * Open-source geolocation adapter — the always-on **free** default, extending the
 * forward-only Nominatim geocoder to the full {@link GeolocationProvider} surface.
 *
 * Supports search / structured / reverse / shape. Boundary shapes come from
 * Nominatim's `polygon_geojson=1` (admin polygons) — fetched on demand and cached
 * by the orchestrator, so the public endpoint's ~1 req/s policy is respected.
 * Reuses `mapNominatimResult` so candidate mapping stays identical to the legacy
 * provider. Also implements the legacy `geocode()` so it can replace the old
 * provider over time.
 *
 * Config: NOMINATIM_BASE_URL (default https://nominatim.openstreetmap.org),
 *         NOMINATIM_USER_AGENT (mandatory contact string; sensible default provided).
 */
export class NominatimGeolocationProvider implements GeolocationProvider, GeocodeProvider {
  readonly name = 'nominatim';

  readonly capabilities: GeolocationCapabilities = {
    search: true,
    structured: true,
    reverse: true,
    shape: true,
    verify: false,
    autocomplete: false,
  };

  private readonly baseUrl: string;

  private readonly userAgent: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = (env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');
    this.userAgent = env.NOMINATIM_USER_AGENT ?? 'EnsuredMarketplace/1.0 (location-discovery)';
  }

  /** The open-source engine needs no credentials, so it is always available. */
  isAvailable(): boolean {
    return true;
  }

  private headers(): Record<string, string> {
    return { 'User-Agent': this.userAgent, Accept: 'application/json' };
  }

  private async getJson(path: string, params: URLSearchParams): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}?${params.toString()}`, { method: 'GET', headers: this.headers() });
    if (!res.ok) {
      throw new Error(`NominatimGeolocationProvider: ${path} API error ${res.status}`);
    }
    return res.json().catch(() => null);
  }

  async search(query: ForwardQuery): Promise<PlaceCandidate[]> {
    const q = String(query.query ?? '').trim();
    if (!q) return [];
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(clampLimit(query.limit)),
    });
    if (query.countryCode) params.set('countrycodes', query.countryCode.toLowerCase());

    const body = await this.getJson('/search', params);
    return Array.isArray(body) ? body.map((raw) => mapNominatimResult(raw as Record<string, unknown>, this.name)) : [];
  }

  async structured(query: StructuredQuery): Promise<PlaceCandidate[]> {
    const params = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: String(clampLimit(query.limit)) });
    const street = [query.line1, query.line2].filter(Boolean).join(' ').trim();
    if (street) params.set('street', street);
    if (query.city) params.set('city', query.city);
    if (query.state) params.set('state', query.state);
    if (query.postalCode) params.set('postalcode', query.postalCode);
    if (query.countryCode) params.set('country', query.countryCode);
    if ([...params.keys()].every((k) => ['format', 'addressdetails', 'limit'].includes(k))) return [];

    const body = await this.getJson('/search', params);
    return Array.isArray(body) ? body.map((raw) => mapNominatimResult(raw as Record<string, unknown>, this.name)) : [];
  }

  async reverse(query: ReverseQuery): Promise<NormalizedLocation | null> {
    if (!Number.isFinite(query.latitude) || !Number.isFinite(query.longitude)) return null;
    const params = new URLSearchParams({
      lat: String(query.latitude),
      lon: String(query.longitude),
      format: 'jsonv2',
      addressdetails: '1',
    });
    const body = (await this.getJson('/reverse', params)) as Record<string, unknown> | null;
    if (!body || body.error) return null;
    return mapNominatimResult(body, this.name);
  }

  async fetchShape(ref: ShapeRef): Promise<GeoShape | null> {
    const params = new URLSearchParams({ format: 'jsonv2', polygon_geojson: '1', addressdetails: '1', limit: '1' });
    // Structured params keep the lookup precise to the requested admin level.
    if (ref.kind === 'country') {
      params.set('country', ref.ref);
    } else if (ref.kind === 'state') {
      params.set('state', ref.ref);
      if (ref.countryCode) params.set('country', ref.countryCode);
    } else {
      params.set('city', ref.ref);
      if (ref.state) params.set('state', ref.state);
      if (ref.countryCode) params.set('country', ref.countryCode);
    }

    const body = await this.getJson('/search', params);
    const top = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : undefined;
    const geometry = top?.geojson;
    if (!top || !geometry) return null;

    const addr = (top.address && typeof top.address === 'object' ? top.address : {}) as Record<string, unknown>;
    return {
      kind: ref.kind,
      ref: ref.ref,
      name: str(top.display_name) ?? ref.ref,
      countryCode: str(addr.country_code)?.toUpperCase() ?? ref.countryCode?.toUpperCase() ?? null,
      geometry,
      bbox: parseNominatimBbox(top.boundingbox),
      provider: this.name,
      source: this.name,
    };
  }

  /** Legacy single-result forward geocode — keeps this drop-in for LocationDiscoveryService. */
  async geocode(query: GeocodeQuery): Promise<NormalizedLocation | null> {
    const results = await this.search({ query: query.query, countryCode: query.countryCode, limit: 1 });
    return results[0] ?? null;
  }
}

function clampLimit(limit: number | undefined): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(Math.floor(n), 10);
}

/** Nominatim boundingbox = [south, north, west, east] (strings) → [west, south, east, north]. */
function parseNominatimBbox(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const [south, north, west, east] = value.map((v) => num(v));
  if (south === null || north === null || west === null || east === null) return null;
  return [west, south, east, north];
}
