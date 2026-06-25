import { FastifyPluginAsync } from 'fastify';
import { GeolocationService } from '../pipeline/geolocation/service';
import type { ShapeRef, StructuredQuery } from '../pipeline/connectors/geolocation/GeolocationProvider';

/**
 * Unified geolocation API.
 *
 * One HTTP surface over the {@link GeolocationService}: free-text + structured
 * forward search, reverse geocoding, boundary-shape fetch, and address
 * verification. The service runs local-dataset-first and caches remote results, so
 * `source` in each response tells the caller whether it came from our DB
 * (`'local'`), a remote provider, or nothing (`'none'`).
 *
 * Read-only and unauthenticated by design, mirroring `crestaZones.ts`.
 */

function badRequest(message: string): Error {
  const err = new Error(message) as Error & { statusCode?: number; code?: string };
  err.statusCode = 400;
  err.code = 'REQUEST_ERROR';
  return err;
}

function clampLimit(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), 10);
}

export const geolocationRoute: FastifyPluginAsync = async (app) => {
  const service = new GeolocationService();

  // Free-text forward search → ranked candidates.
  app.get('/geolocation/search', async (request) => {
    const query = (request.query ?? {}) as { q?: string; country?: string; limit?: string };
    const q = String(query.q ?? '').trim();
    if (!q) throw badRequest('query parameter "q" is required');
    return service.search({ query: q, countryCode: query.country, limit: clampLimit(query.limit) });
  });

  // Structured (component-wise) forward search.
  app.post('/geolocation/structured', async (request) => {
    const body = (request.body ?? {}) as StructuredQuery;
    const hasAny = ['line1', 'line2', 'city', 'state', 'postalCode', 'countryCode'].some(
      (k) => String((body as Record<string, unknown>)[k] ?? '').trim().length > 0,
    );
    if (!hasAny) throw badRequest('at least one address component is required');
    return service.structured({ ...body, limit: clampLimit(body.limit) });
  });

  // Reverse geocode a point.
  app.get('/geolocation/reverse', async (request) => {
    const query = (request.query ?? {}) as { lat?: string; lng?: string };
    const latitude = Number(query.lat);
    const longitude = Number(query.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw badRequest('numeric "lat" and "lng" query parameters are required');
    }
    return service.reverse({ latitude, longitude });
  });

  // Boundary shape for a country / state / city → one GeoJSON Feature (or null geometry).
  app.get('/geolocation/shape', async (request) => {
    const query = (request.query ?? {}) as { kind?: string; ref?: string; country?: string; state?: string };
    const kind = query.kind as ShapeRef['kind'];
    if (kind !== 'country' && kind !== 'state' && kind !== 'city') {
      throw badRequest('"kind" must be one of: country, state, city');
    }
    const ref = String(query.ref ?? '').trim();
    if (!ref) throw badRequest('query parameter "ref" is required');

    const result = await service.fetchShape({ kind, ref, countryCode: query.country, state: query.state });
    const shape = result.shape;
    return {
      type: 'Feature' as const,
      geometry: shape?.geometry ?? null,
      properties: {
        kind,
        ref,
        name: shape?.name ?? null,
        countryCode: shape?.countryCode ?? null,
        bbox: shape?.bbox ?? null,
        source: result.source,
        provider: result.provider,
      },
    };
  });

  // Verify/validate an address.
  app.post('/geolocation/verify', async (request) => {
    const body = (request.body ?? {}) as StructuredQuery;
    const hasAny = ['line1', 'city', 'state', 'postalCode', 'countryCode'].some(
      (k) => String((body as Record<string, unknown>)[k] ?? '').trim().length > 0,
    );
    if (!hasAny) throw badRequest('at least one address component is required');
    return service.verify(body);
  });

  // Prefix/typeahead suggestions.
  app.get('/geolocation/autocomplete', async (request) => {
    const query = (request.query ?? {}) as { q?: string; country?: string; limit?: string };
    const q = String(query.q ?? '').trim();
    if (!q) throw badRequest('query parameter "q" is required');
    return service.autocomplete({ query: q, countryCode: query.country, limit: clampLimit(query.limit) });
  });
};
