// Risk layers API — toggleable map overlays under `/api/risk-layers`.
import { getJson } from './client';

/**
 * GET /api/risk-layers/active-events — live catastrophe events (USGS earthquakes, NOAA NHC
 * cyclones) as a GeoJSON FeatureCollection. Each feature's `properties` carries `peril`,
 * `severity` (0–100), `severityLevel`, `title`, `place`, `source`, `url` and `ts`.
 */
export function getActiveEvents<T = unknown>(): Promise<T> {
  return getJson<T>('/api/risk-layers/active-events');
}

/**
 * GET /api/risk-layers/fault-lines — active fault lines (GEM Global Active Faults) as a GeoJSON
 * FeatureCollection of LineStrings. Each feature's `properties` carries `name`, `slipRate` (mm/yr),
 * `hazardLevel`, `slipType` and `catalog`. Large but effectively static — cached aggressively.
 */
export function getFaultLines<T = unknown>(): Promise<T> {
  return getJson<T>('/api/risk-layers/fault-lines');
}
