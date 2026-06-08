// CRESTA zones API — requests under `/api/cresta-zones`.
import { apiRequest, getJson, type ApiFetchOptions } from './client';

/** GET /api/cresta-zones — zone GeoJSON FeatureCollection for the map layer. */
export function getCrestaZones<T = unknown>(): Promise<T> {
  return getJson<T>('/api/cresta-zones');
}

/**
 * GET /api/cresta-zones/catalog — import catalog + progress (polled).
 * Raw Response: the SeedingPanel poll ignores errors and reads JSON on ok.
 */
export function getCrestaCatalog(): Promise<Response> {
  return apiRequest('/api/cresta-zones/catalog', { method: 'GET' });
}

/**
 * POST /api/cresta-zones/import — start the (resumable) import job.
 * Raw Response: caller reads `json.message` and branches on `res.ok`.
 */
export function startCrestaImport(body?: { only?: string; level?: string }): Promise<Response> {
  const init: ApiFetchOptions = { method: 'POST' };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return apiRequest('/api/cresta-zones/import', init);
}

/** POST /api/cresta-zones/import/stop — stop a running import. Raw Response. */
export function stopCrestaImport(): Promise<Response> {
  return apiRequest('/api/cresta-zones/import/stop', { method: 'POST' });
}
