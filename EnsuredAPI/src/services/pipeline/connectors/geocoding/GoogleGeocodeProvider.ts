import { GeocodeProvider, GeocodeQuery, NormalizedLocation } from './GeocodeProvider';

/**
 * Premium geocoder — the **Google Geocoding API** adapter.
 *
 * Available only when `GOOGLE_MAPS_API_KEY` is configured, so it naturally takes
 * priority in production (paid, high-accuracy, rooftop-level results) and is
 * skipped in local/dev/test where the open-source Nominatim fallback runs. Returns
 * the SAME `NormalizedLocation` shape as the free provider — callers never branch on
 * which engine answered.
 *
 * Config:
 *   GOOGLE_MAPS_API_KEY   required — its presence makes this provider available
 *   GOOGLE_GEOCODE_URL    default: https://maps.googleapis.com/maps/api/geocode/json
 */
export class GoogleGeocodeProvider implements GeocodeProvider {
  readonly name = 'google';

  private readonly apiKey?: string;

  private readonly apiUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.GOOGLE_MAPS_API_KEY;
    this.apiUrl = env.GOOGLE_GEOCODE_URL ?? 'https://maps.googleapis.com/maps/api/geocode/json';
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async geocode(query: GeocodeQuery): Promise<NormalizedLocation | null> {
    if (!this.apiKey) {
      throw new Error('GoogleGeocodeProvider: GOOGLE_MAPS_API_KEY is not configured');
    }
    const q = String(query.query ?? '').trim();
    if (!q) return null;

    const params = new URLSearchParams({ address: q, key: this.apiKey });
    // `components=country:XX` scopes the lookup, mirroring Nominatim's countrycodes.
    if (query.countryCode) params.set('components', `country:${query.countryCode.toUpperCase()}`);

    const res = await fetch(`${this.apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`GoogleGeocodeProvider: geocode API error ${res.status}`);
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const status = String(body.status ?? '');
    // ZERO_RESULTS is a normal "no match", not an error; anything else non-OK is.
    if (status === 'ZERO_RESULTS') return null;
    if (status && status !== 'OK') {
      throw new Error(`GoogleGeocodeProvider: geocode status ${status}${body.error_message ? ` — ${body.error_message}` : ''}`);
    }

    const results = Array.isArray(body.results) ? body.results : [];
    const top = results[0] as Record<string, unknown> | undefined;
    if (!top) return null;

    return mapGoogleResult(top, this.name);
  }
}

/** Pure: map one Google geocode result onto the shared `NormalizedLocation`. Exported for tests. */
export function mapGoogleResult(raw: Record<string, unknown>, provider: string): NormalizedLocation {
  const components = Array.isArray(raw.address_components)
    ? (raw.address_components as Array<Record<string, unknown>>)
    : [];

  const longName = (type: string) => componentName(components, type, 'long_name');
  const shortName = (type: string) => componentName(components, type, 'short_name');

  const houseNumber = longName('street_number');
  const route = longName('route');
  const line1 = [houseNumber, route].filter(Boolean).join(' ').trim() || null;

  const city = longName('locality') ?? longName('postal_town') ?? longName('sublocality') ?? longName('administrative_area_level_2');
  const state = longName('administrative_area_level_1');
  const countryCode = shortName('country')?.toUpperCase() ?? null;

  const geometry = (raw.geometry && typeof raw.geometry === 'object' ? raw.geometry : {}) as Record<string, unknown>;
  const location = (geometry.location && typeof geometry.location === 'object' ? geometry.location : {}) as Record<string, unknown>;

  return {
    formattedAddress: str(raw.formatted_address),
    line1,
    line2: null,
    city,
    state,
    postalCode: longName('postal_code'),
    countryCode,
    latitude: num(location.lat),
    longitude: num(location.lng),
    placeId: str(raw.place_id),
    confidence: googleConfidence(str(geometry.location_type), Boolean(raw.partial_match)),
    provider,
  };
}

/**
 * Map Google's qualitative `location_type` + `partial_match` flag onto a 0..1 score,
 * so it is directly comparable with Nominatim's `importance`.
 */
export function googleConfidence(locationType: string | null, partialMatch: boolean): number {
  const base =
    locationType === 'ROOFTOP'
      ? 1.0
      : locationType === 'RANGE_INTERPOLATED'
        ? 0.85
        : locationType === 'GEOMETRIC_CENTER'
          ? 0.7
          : locationType === 'APPROXIMATE'
            ? 0.5
            : 0.6;
  return clamp01(partialMatch ? base - 0.2 : base);
}

function componentName(
  components: Array<Record<string, unknown>>,
  type: string,
  field: 'long_name' | 'short_name',
): string | null {
  const match = components.find((c) => Array.isArray(c.types) && (c.types as unknown[]).includes(type));
  return match ? str(match[field]) : null;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
