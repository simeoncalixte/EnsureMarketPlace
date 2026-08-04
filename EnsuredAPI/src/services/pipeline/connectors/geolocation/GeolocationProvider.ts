/**
 * Unified geolocation provider interface — the single seam every location feature
 * (the appetite map, the pipeline, address verification …) depends on.
 *
 * This is a **superset** of the narrow forward-only `GeocodeProvider`
 * (`../geocoding/GeocodeProvider`): it keeps the same `NormalizedLocation` output
 * shape but adds search (multi-candidate), structured lookup, reverse geocoding,
 * boundary-shape fetching, and address verification. Each concrete provider is an
 * **adapter** over one engine (our own DB, OpenStreetMap/Nominatim, Google,
 * Mapbox …) and declares which of these it actually supports via `capabilities`;
 * the orchestrator (`pipeline/geolocation/service.ts`) checks the capability
 * before calling an optional method, so a partial provider (e.g. the local DB
 * cannot `verify`, Google cannot return `shape`) is perfectly legal.
 *
 * It deliberately does NOT extend `GeocodeProvider` — that would force the legacy
 * single-result `geocode()` onto every new adapter. The remote adapters implement
 * both interfaces so they stay drop-in for the existing `LocationDiscoveryService`
 * while gaining the superset surface here.
 *
 * Mirrors the existing connector strategy/adapter pattern
 * (`connectors/ocr/OcrProvider.ts`, `connectors/geocoding/selectGeocodeProvider.ts`).
 */

import type { NormalizedLocation } from '../geocoding/GeocodeProvider';

export type { NormalizedLocation };

/** A forward-geocode candidate is just a `NormalizedLocation`. */
export type PlaceCandidate = NormalizedLocation;

/** Free-text forward query. */
export interface ForwardQuery {
  /** Raw text to resolve (e.g. "123 Main St, Tampa FL"). */
  query: string;
  /** Optional ISO-3166 alpha-2 to bias/scope the search (e.g. "US"). */
  countryCode?: string;
  /** Max candidates to return (providers clamp to their own ceiling). Default 5. */
  limit?: number;
}

/** Structured (component-wise) forward query. */
export interface StructuredQuery {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  /** ISO-3166 alpha-2 country code. */
  countryCode?: string;
  limit?: number;
}

/** Reverse-geocode query — a WGS-84 point. */
export interface ReverseQuery {
  latitude: number;
  longitude: number;
}

/** Which administrative boundary to fetch. */
export interface ShapeRef {
  kind: 'country' | 'state' | 'city';
  /** ISO-2 for country; name or code for state/city. */
  ref: string;
  /** Scopes state/city lookups to a country. */
  countryCode?: string;
  /** Scopes city lookups to a state/province. */
  state?: string;
}

/**
 * Provider-agnostic boundary result: an RFC 7946 geometry plus identity. Aligns
 * with the new `geo_shapes` cache table so a fetched shape persists with no second
 * translation.
 */
export interface GeoShape {
  kind: 'country' | 'state' | 'city';
  ref: string;
  name: string | null;
  countryCode: string | null;
  /** RFC 7946 geometry object (Polygon | MultiPolygon | Point). */
  geometry: unknown;
  /** [west, south, east, north] when known. */
  bbox: [number, number, number, number] | null;
  provider: string;
  /** 'local' when served from our DB, else the remote provider name. */
  source: string;
}

export type VerificationVerdict = 'verified' | 'corrected' | 'unverified';

/** Result of verifying a (typically structured) address. */
export interface AddressVerification {
  verdict: VerificationVerdict;
  /** Best normalized form — corrected where the provider could improve it. */
  normalized: NormalizedLocation | null;
  /** 0..1 confidence in the verdict. */
  confidence: number;
  /** Human-readable list of components the provider changed/inferred/added. */
  changes: string[];
  provider: string;
}

/** Declares which optional methods a provider actually supports. */
export interface GeolocationCapabilities {
  search: boolean;
  structured: boolean;
  reverse: boolean;
  shape: boolean;
  verify: boolean;
  autocomplete: boolean;
}

/** A single capability key, used by the orchestrator to filter providers. */
export type GeolocationCapability = keyof GeolocationCapabilities;

export interface GeolocationProvider {
  /** Stable identifier, e.g. 'local', 'nominatim', 'google', 'mapbox'. */
  readonly name: string;
  /** Whether the provider can run in the current environment (required config present). */
  isAvailable(): boolean;
  /** Which optional methods below are implemented. */
  readonly capabilities: GeolocationCapabilities;

  /** Free-text forward geocode → ranked candidates (best first). */
  search?(query: ForwardQuery): Promise<PlaceCandidate[]>;
  /** Component-wise forward geocode → ranked candidates. */
  structured?(query: StructuredQuery): Promise<PlaceCandidate[]>;
  /** Reverse geocode a point → best address, or null. */
  reverse?(query: ReverseQuery): Promise<NormalizedLocation | null>;
  /** Fetch an administrative boundary as GeoJSON, or null when unavailable. */
  fetchShape?(ref: ShapeRef): Promise<GeoShape | null>;
  /** Verify/validate an address. */
  verify?(address: StructuredQuery): Promise<AddressVerification>;
  /** Prefix/typeahead suggestions → candidates. */
  autocomplete?(query: ForwardQuery): Promise<PlaceCandidate[]>;
}
