import { perilCodes } from '../db/models/constants';

/**
 * Active (live) catastrophe events aggregated from open/public feeds, normalised into a single
 * GeoJSON FeatureCollection for the map "Active Events" risk layer.
 *
 * Feeds (no API key required):
 *  - USGS earthquakes  — https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
 *  - NOAA NHC cyclones — https://www.nhc.noaa.gov/CurrentStorms.json
 *
 * Resilient by design: each feed is fetched independently; a failing feed is reported in
 * `meta.sources` but never blanks the whole layer. The combined result is cached in-process with a
 * short TTL so the map can poll without hammering the upstream feeds.
 */

export type PerilCode = (typeof perilCodes)[number];
export type SeverityLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface ActiveEventProperties {
  peril: PerilCode;
  title: string;
  place: string | null;
  /** 0–100 normalised severity, comparable across perils for colour ramps. */
  severity: number;
  severityLevel: SeverityLevel;
  source: string;
  url: string | null;
  /** ISO-8601 observation/update time. */
  ts: string | null;
  /** Peril-specific raw detail shown in the popup (e.g. "M 5.2", "Cat 3 · 115 kt"). */
  detail: string;
}

export interface ActiveEventFeature {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: ActiveEventProperties;
}

export interface SourceStatus {
  source: string;
  peril: PerilCode;
  ok: boolean;
  count: number;
  error?: string;
}

export interface ActiveEventsCollection {
  type: 'FeatureCollection';
  features: ActiveEventFeature[];
  meta: { generatedAt: string; cached: boolean; sources: SourceStatus[] };
}

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const NHC_URL = 'https://www.nhc.noaa.gov/CurrentStorms.json';
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 5 * 60_000;
// NOAA/NWS politely require a descriptive User-Agent; USGS ignores it.
const USER_AGENT = 'EnsuredMarketplace/1.0 (risk-layers; active-events)';

let cache: { at: number; data: ActiveEventsCollection } | null = null;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// --- Earthquakes (USGS) -------------------------------------------------------------------------

function earthquakeSeverityLevel(mag: number): SeverityLevel {
  if (mag >= 6.5) return 'severe';
  if (mag >= 5) return 'high';
  if (mag >= 3) return 'moderate';
  return 'low';
}

interface UsgsFeed {
  features?: Array<{
    id?: string;
    geometry?: { coordinates?: number[] } | null;
    properties?: { mag?: number | null; place?: string | null; time?: number | null; url?: string | null } | null;
  }>;
}

async function loadEarthquakes(minMag: number): Promise<{ features: ActiveEventFeature[]; status: SourceStatus }> {
  const status: SourceStatus = { source: 'USGS', peril: 'earthquake', ok: false, count: 0 };
  try {
    const feed = await fetchJson<UsgsFeed>(USGS_URL);
    const features: ActiveEventFeature[] = [];
    for (const f of feed.features ?? []) {
      const coords = f.geometry?.coordinates;
      const mag = f.properties?.mag;
      if (!coords || coords.length < 2 || typeof mag !== 'number' || mag < minMag) continue;
      const [lng, lat] = coords;
      features.push({
        type: 'Feature',
        id: `usgs:${f.id ?? `${lat},${lng}`}`,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          peril: 'earthquake',
          title: `M ${mag.toFixed(1)} earthquake`,
          place: f.properties?.place ?? null,
          severity: clamp((mag / 8) * 100, 0, 100),
          severityLevel: earthquakeSeverityLevel(mag),
          source: 'USGS',
          url: f.properties?.url ?? null,
          ts: f.properties?.time ? new Date(f.properties.time).toISOString() : null,
          detail: `M ${mag.toFixed(1)}`,
        },
      });
    }
    status.ok = true;
    status.count = features.length;
    return { features, status };
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    return { features: [], status };
  }
}

// --- Tropical cyclones (NOAA NHC) ---------------------------------------------------------------

function cycloneSeverityLevel(knots: number): SeverityLevel {
  if (knots >= 113) return 'severe'; // Cat 4–5
  if (knots >= 64) return 'high'; // hurricane (Cat 1–3)
  if (knots >= 34) return 'moderate'; // tropical storm
  return 'low'; // tropical depression
}

function cycloneCategory(knots: number): string {
  if (knots >= 137) return 'Cat 5';
  if (knots >= 113) return 'Cat 4';
  if (knots >= 96) return 'Cat 3';
  if (knots >= 83) return 'Cat 2';
  if (knots >= 64) return 'Cat 1';
  if (knots >= 34) return 'Tropical Storm';
  return 'Tropical Depression';
}

interface NhcStorm {
  id?: string;
  name?: string;
  classification?: string;
  intensity?: string | number;
  latitudeNumeric?: number;
  longitudeNumeric?: number;
  lastUpdate?: string;
  publicAdvisory?: { url?: string } | null;
}

async function loadCyclones(): Promise<{ features: ActiveEventFeature[]; status: SourceStatus }> {
  const status: SourceStatus = { source: 'NOAA NHC', peril: 'hurricane', ok: false, count: 0 };
  try {
    const feed = await fetchJson<{ activeStorms?: NhcStorm[] }>(NHC_URL);
    const features: ActiveEventFeature[] = [];
    for (const s of feed.activeStorms ?? []) {
      const lat = s.latitudeNumeric;
      const lng = s.longitudeNumeric;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      const knots = Number(s.intensity) || 0;
      const name = s.name?.trim() || 'Tropical cyclone';
      features.push({
        type: 'Feature',
        id: `nhc:${s.id ?? name}`,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          peril: 'hurricane',
          title: name,
          place: s.classification ?? null,
          severity: clamp((knots / 160) * 100, 0, 100),
          severityLevel: cycloneSeverityLevel(knots),
          source: 'NOAA NHC',
          url: s.publicAdvisory?.url ?? 'https://www.nhc.noaa.gov/',
          ts: s.lastUpdate ?? null,
          detail: knots ? `${cycloneCategory(knots)} · ${knots} kt` : cycloneCategory(knots),
        },
      });
    }
    status.ok = true;
    status.count = features.length;
    return { features, status };
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    return { features: [], status };
  }
}

// --- Aggregation --------------------------------------------------------------------------------

export interface ActiveEventsOptions {
  /** Subset of perils to include; defaults to all supported live perils. */
  perils?: PerilCode[];
  /** Minimum earthquake magnitude to include (default 2.5). */
  minMag?: number;
  /** Bypass the in-process cache. */
  fresh?: boolean;
}

const SUPPORTED: PerilCode[] = ['earthquake', 'hurricane'];

export async function getActiveEvents(opts: ActiveEventsOptions = {}): Promise<ActiveEventsCollection> {
  const minMag = typeof opts.minMag === 'number' ? opts.minMag : 2.5;
  const wanted = (opts.perils?.length ? opts.perils : SUPPORTED).filter((p) => SUPPORTED.includes(p));

  // Serve from cache only when the request shape matches the default (no narrowing/threshold change).
  const isDefault = !opts.perils?.length && minMag === 2.5;
  if (!opts.fresh && isDefault && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.data, meta: { ...cache.data.meta, cached: true } };
  }

  const loaders: Array<Promise<{ features: ActiveEventFeature[]; status: SourceStatus }>> = [];
  if (wanted.includes('earthquake')) loaders.push(loadEarthquakes(minMag));
  if (wanted.includes('hurricane')) loaders.push(loadCyclones());

  const results = await Promise.all(loaders);
  const data: ActiveEventsCollection = {
    type: 'FeatureCollection',
    features: results.flatMap((r) => r.features),
    meta: {
      generatedAt: new Date().toISOString(),
      cached: false,
      sources: results.map((r) => r.status),
    },
  };

  if (isDefault) cache = { at: Date.now(), data };
  return data;
}
