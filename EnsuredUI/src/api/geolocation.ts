// Unified geolocation API — requests under `/api/geolocation`.
//
// Thin typed wrappers over the backend GeolocationService (local-dataset-first,
// caches remote results). Each response carries `source` ('local' | provider name
// | 'none') so callers can tell where the answer came from. No UI wiring here —
// e.g. the RegionAppetiteMap can later call `fetchShape` to render state/city
// boundaries.
import { getJson, postJson } from './client';

/** Provider-agnostic place candidate (mirror of the backend `NormalizedLocation`). */
export interface PlaceCandidate {
  formattedAddress: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  confidence: number;
  provider: string;
}

export interface StructuredQuery {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  limit?: number;
}

export type VerificationVerdict = 'verified' | 'corrected' | 'unverified';

export interface AddressVerification {
  verdict: VerificationVerdict;
  normalized: PlaceCandidate | null;
  confidence: number;
  changes: string[];
  provider: string;
}

export interface CandidatesResponse {
  ok: true;
  source: string;
  provider: string | null;
  candidates: PlaceCandidate[];
  warnings: string[];
}

export interface ReverseResponse {
  ok: true;
  source: string;
  provider: string | null;
  result: PlaceCandidate | null;
  warnings: string[];
}

/** GeoJSON Feature with appetite/shape metadata in `properties`. */
export interface ShapeFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry | null;
  properties: {
    kind: 'country' | 'state' | 'city';
    ref: string;
    name: string | null;
    countryCode: string | null;
    bbox: [number, number, number, number] | null;
    source: string;
    provider: string | null;
  };
}

export interface VerifyResponse {
  ok: true;
  source: string;
  provider: string | null;
  verification: AddressVerification;
  warnings: string[];
}

const qs = (params: Record<string, string | number | undefined>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/** GET /api/geolocation/search — free-text forward search. */
export function searchPlaces(
  query: string,
  opts: { country?: string; limit?: number } = {},
): Promise<CandidatesResponse> {
  return getJson<CandidatesResponse>(`/api/geolocation/search${qs({ q: query, country: opts.country, limit: opts.limit })}`);
}

/** POST /api/geolocation/structured — component-wise forward search. */
export function structuredSearch(query: StructuredQuery): Promise<CandidatesResponse> {
  return postJson<CandidatesResponse>('/api/geolocation/structured', query);
}

/** GET /api/geolocation/reverse — reverse geocode a point. */
export function reverseGeocode(lat: number, lng: number): Promise<ReverseResponse> {
  return getJson<ReverseResponse>(`/api/geolocation/reverse${qs({ lat, lng })}`);
}

/** GET /api/geolocation/shape — boundary GeoJSON for a country/state/city. */
export function fetchShape(
  kind: 'country' | 'state' | 'city',
  ref: string,
  opts: { country?: string; state?: string } = {},
): Promise<ShapeFeature> {
  return getJson<ShapeFeature>(`/api/geolocation/shape${qs({ kind, ref, country: opts.country, state: opts.state })}`);
}

/** POST /api/geolocation/verify — verify/validate an address. */
export function verifyAddress(query: StructuredQuery): Promise<VerifyResponse> {
  return postJson<VerifyResponse>('/api/geolocation/verify', query);
}

/** GET /api/geolocation/autocomplete — prefix/typeahead suggestions. */
export function autocompletePlaces(
  query: string,
  opts: { country?: string; limit?: number } = {},
): Promise<CandidatesResponse> {
  return getJson<CandidatesResponse>(`/api/geolocation/autocomplete${qs({ q: query, country: opts.country, limit: opts.limit })}`);
}
