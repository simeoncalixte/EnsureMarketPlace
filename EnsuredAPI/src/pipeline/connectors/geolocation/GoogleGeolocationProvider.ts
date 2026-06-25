import type { GeocodeProvider, GeocodeQuery, NormalizedLocation } from '../geocoding/GeocodeProvider';
import { mapGoogleResult } from '../geocoding/GoogleGeocodeProvider';
import type {
  AddressVerification,
  ForwardQuery,
  GeolocationCapabilities,
  GeolocationProvider,
  PlaceCandidate,
  ReverseQuery,
  StructuredQuery,
  VerificationVerdict,
} from './GeolocationProvider';
import { num, str } from './util';

/**
 * Premium geolocation adapter — the **Google** engine, extending the forward-only
 * Google geocoder to search / structured / reverse plus **address verification**
 * via Google's Address Validation API. Available only when `GOOGLE_MAPS_API_KEY`
 * is set, so it naturally takes priority in production and is skipped in
 * dev/test. Reuses `mapGoogleResult`; does NOT provide boundary shapes.
 *
 * Config: GOOGLE_MAPS_API_KEY (required — presence = available),
 *         GOOGLE_GEOCODE_URL (default https://maps.googleapis.com/maps/api/geocode/json),
 *         GOOGLE_ADDRESS_VALIDATION_URL (default https://addressvalidation.googleapis.com/v1:validateAddress).
 */
export class GoogleGeolocationProvider implements GeolocationProvider, GeocodeProvider {
  readonly name = 'google';

  readonly capabilities: GeolocationCapabilities = {
    search: true,
    structured: true,
    reverse: true,
    shape: false,
    verify: true,
    autocomplete: false,
  };

  private readonly apiKey?: string;

  private readonly geocodeUrl: string;

  private readonly validationUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.GOOGLE_MAPS_API_KEY;
    this.geocodeUrl = env.GOOGLE_GEOCODE_URL ?? 'https://maps.googleapis.com/maps/api/geocode/json';
    this.validationUrl =
      env.GOOGLE_ADDRESS_VALIDATION_URL ?? 'https://addressvalidation.googleapis.com/v1:validateAddress';
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  private async geocodeJson(params: URLSearchParams): Promise<Record<string, unknown>[]> {
    params.set('key', this.apiKey as string);
    const res = await fetch(`${this.geocodeUrl}?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`GoogleGeolocationProvider: geocode API error ${res.status}`);
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const status = String(body.status ?? '');
    if (status === 'ZERO_RESULTS') return [];
    if (status && status !== 'OK') {
      throw new Error(`GoogleGeolocationProvider: geocode status ${status}${body.error_message ? ` — ${body.error_message}` : ''}`);
    }
    return Array.isArray(body.results) ? (body.results as Record<string, unknown>[]) : [];
  }

  async search(query: ForwardQuery): Promise<PlaceCandidate[]> {
    if (!this.apiKey) throw new Error('GoogleGeolocationProvider: GOOGLE_MAPS_API_KEY is not configured');
    const q = String(query.query ?? '').trim();
    if (!q) return [];
    const params = new URLSearchParams({ address: q });
    if (query.countryCode) params.set('components', `country:${query.countryCode.toUpperCase()}`);
    const results = await this.geocodeJson(params);
    return results.slice(0, clampLimit(query.limit)).map((r) => mapGoogleResult(r, this.name));
  }

  async structured(query: StructuredQuery): Promise<PlaceCandidate[]> {
    if (!this.apiKey) throw new Error('GoogleGeolocationProvider: GOOGLE_MAPS_API_KEY is not configured');
    const addressLine = [query.line1, query.line2, query.city, query.state, query.postalCode]
      .filter(Boolean)
      .join(', ')
      .trim();
    if (!addressLine) return [];
    const params = new URLSearchParams({ address: addressLine });
    const components: string[] = [];
    if (query.countryCode) components.push(`country:${query.countryCode.toUpperCase()}`);
    if (query.postalCode) components.push(`postal_code:${query.postalCode}`);
    if (components.length) params.set('components', components.join('|'));
    const results = await this.geocodeJson(params);
    return results.slice(0, clampLimit(query.limit)).map((r) => mapGoogleResult(r, this.name));
  }

  async reverse(query: ReverseQuery): Promise<NormalizedLocation | null> {
    if (!this.apiKey) throw new Error('GoogleGeolocationProvider: GOOGLE_MAPS_API_KEY is not configured');
    if (!Number.isFinite(query.latitude) || !Number.isFinite(query.longitude)) return null;
    const params = new URLSearchParams({ latlng: `${query.latitude},${query.longitude}` });
    const results = await this.geocodeJson(params);
    return results[0] ? mapGoogleResult(results[0], this.name) : null;
  }

  async verify(address: StructuredQuery): Promise<AddressVerification> {
    if (!this.apiKey) throw new Error('GoogleGeolocationProvider: GOOGLE_MAPS_API_KEY is not configured');
    const addressLines = [address.line1, address.line2].filter(Boolean) as string[];
    const requestBody = {
      address: {
        regionCode: address.countryCode ?? undefined,
        addressLines,
        locality: address.city ?? undefined,
        administrativeArea: address.state ?? undefined,
        postalCode: address.postalCode ?? undefined,
      },
    };
    const res = await fetch(`${this.validationUrl}?key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) throw new Error(`GoogleGeolocationProvider: address validation error ${res.status}`);
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return mapGoogleValidation(body, this.name);
  }

  /** Legacy single-result forward geocode — keeps this drop-in for LocationDiscoveryService. */
  async geocode(query: GeocodeQuery): Promise<NormalizedLocation | null> {
    const results = await this.search({ query: query.query, countryCode: query.countryCode, limit: 1 });
    return results[0] ?? null;
  }
}

/** Pure: map a Google Address Validation response onto our verification shape. Exported for tests. */
export function mapGoogleValidation(body: Record<string, unknown>, provider: string): AddressVerification {
  const result = (body.result && typeof body.result === 'object' ? body.result : {}) as Record<string, unknown>;
  const verdict = (result.verdict && typeof result.verdict === 'object' ? result.verdict : {}) as Record<string, unknown>;

  const addressComplete = Boolean(verdict.addressComplete);
  const hasUnconfirmed = Boolean(verdict.hasUnconfirmedComponents);
  const hasInferred = Boolean(verdict.hasInferredComponents);
  const hasReplaced = Boolean(verdict.hasReplacedComponents);

  let outcome: VerificationVerdict;
  if (addressComplete && !hasUnconfirmed && !hasInferred && !hasReplaced) {
    outcome = 'verified';
  } else if (hasInferred || hasReplaced) {
    outcome = 'corrected';
  } else {
    outcome = 'unverified';
  }

  const changes: string[] = [];
  if (hasInferred) changes.push('inferred-components');
  if (hasReplaced) changes.push('replaced-components');
  if (hasUnconfirmed) changes.push('unconfirmed-components');

  const confidence = outcome === 'verified' ? 0.95 : outcome === 'corrected' ? 0.75 : 0.4;

  const addr = (result.address && typeof result.address === 'object' ? result.address : {}) as Record<string, unknown>;
  const postal = (addr.postalAddress && typeof addr.postalAddress === 'object' ? addr.postalAddress : {}) as Record<string, unknown>;
  const geocode = (result.geocode && typeof result.geocode === 'object' ? result.geocode : {}) as Record<string, unknown>;
  const location = (geocode.location && typeof geocode.location === 'object' ? geocode.location : {}) as Record<string, unknown>;
  const addressLines = Array.isArray(postal.addressLines) ? (postal.addressLines as unknown[]) : [];

  const normalized: NormalizedLocation = {
    formattedAddress: str(addr.formattedAddress),
    line1: str(addressLines[0]),
    line2: str(addressLines[1]),
    city: str(postal.locality),
    state: str(postal.administrativeArea),
    postalCode: str(postal.postalCode),
    countryCode: str(postal.regionCode)?.toUpperCase() ?? null,
    latitude: num(location.latitude),
    longitude: num(location.longitude),
    placeId: str(geocode.placeId),
    confidence,
    provider,
  };

  return { verdict: outcome, normalized, confidence, changes, provider };
}

function clampLimit(limit: number | undefined): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(Math.floor(n), 10);
}
