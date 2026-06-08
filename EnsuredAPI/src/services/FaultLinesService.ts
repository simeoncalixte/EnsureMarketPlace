/**
 * Active fault lines (seismic hazard) for the map "Fault Lines" risk layer.
 *
 * Source (open, no API key): GEM Global Active Faults Database — a harmonised global compilation of
 * active faults published by the GEM Foundation.
 *   https://github.com/GEMScienceTools/gem-global-active-faults
 *
 * The upstream file is ~10 MB and effectively static, so we fetch it once and hold it in-process for
 * a long TTL. Each fault's verbose property tuples are trimmed to the few fields the map needs, and
 * the net slip rate (mm/yr) is parsed into a single number that drives the hazard colour ramp —
 * faster-slipping faults accumulate strain more quickly and are treated as higher risk.
 */

const GEM_FAULTS_URL =
  'https://raw.githubusercontent.com/GEMScienceTools/gem-global-active-faults/master/geojson/gem_active_faults_harmonized.geojson';
const FETCH_TIMEOUT_MS = 30_000;
// Fault geometry is static; refresh at most once a day.
const CACHE_TTL_MS = 24 * 60 * 60_000;
const USER_AGENT = 'EnsuredMarketplace/1.0 (risk-layers; fault-lines)';

export interface FaultLineProperties {
  name: string | null;
  /** Net slip rate (mm/yr), preferred value parsed from the GEM "(pref,min,max)" tuple; 0 if unknown. */
  slipRate: number;
  /** Categorical hazard bucket derived from slip rate, mirroring the active-events ramp. */
  hazardLevel: 'low' | 'moderate' | 'high' | 'severe';
  /** Kinematics, e.g. "Dextral", "Reverse", "Normal". */
  slipType: string | null;
  /** Source catalog name, e.g. "UCERF3". */
  catalog: string | null;
}

export interface FaultLineFeature {
  type: 'Feature';
  geometry: { type: 'LineString' | 'MultiLineString'; coordinates: unknown };
  properties: FaultLineProperties;
}

export interface FaultLinesCollection {
  type: 'FeatureCollection';
  features: FaultLineFeature[];
  meta: { generatedAt: string; cached: boolean; source: string; count: number; error?: string };
}

let cache: { at: number; data: FaultLinesCollection } | null = null;

/**
 * GEM encodes uncertain numeric fields as "(preferred,min,max)" strings (any part may be blank,
 * e.g. "(,,)"). Pull the preferred value; return null when it is absent or unparseable.
 */
function parsePreferred(tuple: unknown): number | null {
  if (typeof tuple !== 'string') return null;
  const match = tuple.match(/\(\s*([-\d.]+)?/);
  if (!match || match[1] == null) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function hazardLevel(slipRate: number): FaultLineProperties['hazardLevel'] {
  if (slipRate >= 15) return 'severe';
  if (slipRate >= 5) return 'high';
  if (slipRate >= 1) return 'moderate';
  return 'low';
}

interface RawFeature {
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
}

export interface FaultLinesOptions {
  /** Bypass the in-process cache. */
  fresh?: boolean;
}

export async function getFaultLines(opts: FaultLinesOptions = {}): Promise<FaultLinesCollection> {
  if (!opts.fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { ...cache.data, meta: { ...cache.data.meta, cached: true } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(GEM_FAULTS_URL, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const raw = (await res.json()) as { features?: RawFeature[] };

    const features: FaultLineFeature[] = [];
    for (const f of raw.features ?? []) {
      const geom = f.geometry;
      if (!geom || (geom.type !== 'LineString' && geom.type !== 'MultiLineString') || !geom.coordinates) continue;
      const props = f.properties ?? {};
      const slipRate = parsePreferred(props.net_slip_rate) ?? 0;
      features.push({
        type: 'Feature',
        geometry: { type: geom.type, coordinates: geom.coordinates },
        properties: {
          name: typeof props.name === 'string' ? props.name : null,
          slipRate,
          hazardLevel: hazardLevel(slipRate),
          slipType: typeof props.slip_type === 'string' ? props.slip_type : null,
          catalog: typeof props.catalog_name === 'string' ? props.catalog_name : null,
        },
      });
    }

    const data: FaultLinesCollection = {
      type: 'FeatureCollection',
      features,
      meta: {
        generatedAt: new Date().toISOString(),
        cached: false,
        source: 'GEM Global Active Faults',
        count: features.length,
      },
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Serve stale cache if a refresh fails; otherwise an empty collection with the error noted.
    if (cache) return { ...cache.data, meta: { ...cache.data.meta, cached: true, error: message } };
    return {
      type: 'FeatureCollection',
      features: [],
      meta: { generatedAt: new Date().toISOString(), cached: false, source: 'GEM Global Active Faults', count: 0, error: message },
    };
  } finally {
    clearTimeout(timer);
  }
}
