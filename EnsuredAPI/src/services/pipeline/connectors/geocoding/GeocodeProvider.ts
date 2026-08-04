/**
 * Common interface shared by every geocoding / address-normalization integration.
 *
 * Each concrete provider is an **adapter** that maps a specific geocoding engine
 * (the open-source OpenStreetMap Nominatim service, the premium Google Geocoding
 * API, …) onto this interface, and the connector selects between them at runtime
 * via a **strategy** (see `selectGeocodeProvider`). Callers — the location-discovery
 * pipeline stage in particular — only ever depend on this interface, so the free
 * and premium options are fully interchangeable: same input, same `NormalizedLocation`
 * output shape, regardless of which engine resolved it.
 *
 * Mirrors the OCR connector (`connectors/ocr/OcrProvider.ts`) deliberately so the
 * two provider families read the same way.
 */

export interface GeocodeQuery {
  /** The raw, unparsed location/address string to resolve (e.g. "123 Main St, Tampa FL"). */
  query: string;
  /** Optional ISO-3166 alpha-2 country code to bias/scope the search (e.g. "US"). */
  countryCode?: string;
}

/**
 * The normalized, provider-agnostic shape every geocoder returns. The field set is
 * aligned with the geography `Address` book (`db/models/geography.models.ts`) so a
 * result maps straight onto a persisted address with no second translation. A
 * provider leaves any component it cannot determine as `null` — the contract is the
 * SAME for the free and premium engines; only `confidence` and the populated
 * component depth differ in practice.
 */
export interface NormalizedLocation {
  /** Single canonical one-line address as the provider formatted it. */
  formattedAddress: string | null;
  /** Street line (house number + road), when the provider resolves to that depth. */
  line1: string | null;
  /** Secondary line (unit/suite), rarely populated by geocoders. */
  line2: string | null;
  /** City / town / locality name. */
  city: string | null;
  /** State / province / administrative-area-1 name. */
  state: string | null;
  /** ZIP / postal code. */
  postalCode: string | null;
  /** ISO-3166 alpha-2 country code (uppercased), e.g. "US". */
  countryCode: string | null;
  /** WGS-84 latitude (decimal degrees). */
  latitude: number | null;
  /** WGS-84 longitude (decimal degrees). */
  longitude: number | null;
  /** Stable provider place identifier (Google place_id, Nominatim place_id), if any. */
  placeId: string | null;
  /**
   * Normalized 0..1 match confidence. Derived per-provider from its own quality
   * signal (Google `location_type`/`partial_match`, Nominatim `importance`) so the
   * pipeline can score and threshold uniformly across engines.
   */
  confidence: number;
  /** Name of the provider that produced this result (e.g. 'google', 'nominatim'). */
  provider: string;
}

export interface GeocodeProvider {
  /** Stable identifier, e.g. 'google' (premium) or 'nominatim' (free). */
  readonly name: string;
  /**
   * Whether this provider can run in the current environment (required config
   * present). The strategy picks the first available provider in priority order —
   * the premium Google adapter wins when its key is set, otherwise the always-on
   * open-source Nominatim adapter handles it.
   */
  isAvailable(): boolean;
  /**
   * Resolve a raw location string to a single best `NormalizedLocation`, or `null`
   * when the engine returns no usable match. Throws only on transport/engine errors
   * (non-2xx, network), which the caller treats as a per-subject warning.
   */
  geocode(query: GeocodeQuery): Promise<NormalizedLocation | null>;
}
