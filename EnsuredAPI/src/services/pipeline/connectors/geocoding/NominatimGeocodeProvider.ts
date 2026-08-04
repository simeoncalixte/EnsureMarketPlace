import { GeocodeProvider, GeocodeQuery, NormalizedLocation } from './GeocodeProvider';

/**
 * Open-source geocoder — the always-on **free** default.
 *
 * Adapter for the OpenStreetMap **Nominatim** search API. It needs no API key, so
 * it is always available and acts as the fallback whenever the premium Google
 * adapter is not configured. The public endpoint is used by default; point
 * `NOMINATIM_BASE_URL` at a self-hosted instance for volume/SLA.
 *
 * Nominatim's usage policy REQUIRES an identifying `User-Agent`; set
 * `NOMINATIM_USER_AGENT` to your contact string (a sensible default is provided).
 *
 * Config:
 *   NOMINATIM_BASE_URL    default: https://nominatim.openstreetmap.org
 *   NOMINATIM_USER_AGENT  default: EnsuredMarketplace/1.0 (location-discovery)
 */
export class NominatimGeocodeProvider implements GeocodeProvider {
  readonly name = 'nominatim';

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

  async geocode(query: GeocodeQuery): Promise<NormalizedLocation | null> {
    const q = String(query.query ?? '').trim();
    if (!q) return null;

    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
    });
    if (query.countryCode) params.set('countrycodes', query.countryCode.toLowerCase());

    const res = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
      method: 'GET',
      headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`NominatimGeocodeProvider: geocode API error ${res.status}`);
    }

    const body = (await res.json().catch(() => [])) as unknown;
    const top = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : undefined;
    if (!top) return null;

    return mapNominatimResult(top, this.name);
  }
}

/** Pure: map one Nominatim result object onto the shared `NormalizedLocation`. Exported for tests. */
export function mapNominatimResult(raw: Record<string, unknown>, provider: string): NormalizedLocation {
  const addr = (raw.address && typeof raw.address === 'object' ? raw.address : {}) as Record<string, unknown>;

  const houseNumber = str(addr.house_number);
  const road = str(addr.road);
  const line1 = [houseNumber, road].filter(Boolean).join(' ').trim() || null;

  // Nominatim splits the locality across city/town/village/hamlet depending on size.
  const city = str(addr.city) ?? str(addr.town) ?? str(addr.village) ?? str(addr.hamlet) ?? str(addr.municipality);
  const state = str(addr.state) ?? str(addr.region) ?? str(addr.state_district);
  const countryCode = str(addr.country_code)?.toUpperCase() ?? null;

  return {
    formattedAddress: str(raw.display_name),
    line1,
    line2: null,
    city,
    state,
    postalCode: str(addr.postcode),
    countryCode,
    latitude: num(raw.lat),
    longitude: num(raw.lon),
    placeId: raw.place_id != null ? String(raw.place_id) : null,
    // `importance` is Nominatim's 0..1 relevance signal; default mid-confidence when absent.
    confidence: clamp01(num(raw.importance) ?? 0.5),
    provider,
  };
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
