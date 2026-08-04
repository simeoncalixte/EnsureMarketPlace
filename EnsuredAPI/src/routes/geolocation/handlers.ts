import type { FastifyRequest } from 'fastify';
import { GeolocationService } from '../../services/pipeline/geolocation/service';
import type { ShapeRef, StructuredQuery } from '../../services/pipeline/connectors/geolocation/GeolocationProvider';
import { badRequest, clampLimit } from './service';

/**
 * Builds the geolocation request handlers bound to a single {@link GeolocationService}
 * instance (one per plugin registration, matching the previous closure behaviour).
 */
export function createGeolocationHandlers(service: GeolocationService) {
  // Free-text forward search → ranked candidates.
  async function search(request: FastifyRequest) {
    const query = (request.query ?? {}) as { q?: string; country?: string; limit?: string };
    const q = String(query.q ?? '').trim();
    if (!q) throw badRequest('query parameter "q" is required');
    return service.search({ query: q, countryCode: query.country, limit: clampLimit(query.limit) });
  }

  // Structured (component-wise) forward search.
  async function structured(request: FastifyRequest) {
    const body = (request.body ?? {}) as StructuredQuery;
    const hasAny = ['line1', 'line2', 'city', 'state', 'postalCode', 'countryCode'].some(
      (k) => String((body as Record<string, unknown>)[k] ?? '').trim().length > 0,
    );
    if (!hasAny) throw badRequest('at least one address component is required');
    return service.structured({ ...body, limit: clampLimit(body.limit) });
  }

  // Reverse geocode a point.
  async function reverse(request: FastifyRequest) {
    const query = (request.query ?? {}) as { lat?: string; lng?: string };
    const latitude = Number(query.lat);
    const longitude = Number(query.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw badRequest('numeric "lat" and "lng" query parameters are required');
    }
    return service.reverse({ latitude, longitude });
  }

  // Boundary shape for a country / state / city → one GeoJSON Feature (or null geometry).
  async function shape(request: FastifyRequest) {
    const query = (request.query ?? {}) as { kind?: string; ref?: string; country?: string; state?: string };
    const kind = query.kind as ShapeRef['kind'];
    if (kind !== 'country' && kind !== 'state' && kind !== 'city') {
      throw badRequest('"kind" must be one of: country, state, city');
    }
    const ref = String(query.ref ?? '').trim();
    if (!ref) throw badRequest('query parameter "ref" is required');

    const result = await service.fetchShape({ kind, ref, countryCode: query.country, state: query.state });
    const shapeResult = result.shape;
    return {
      type: 'Feature' as const,
      geometry: shapeResult?.geometry ?? null,
      properties: {
        kind,
        ref,
        name: shapeResult?.name ?? null,
        countryCode: shapeResult?.countryCode ?? null,
        bbox: shapeResult?.bbox ?? null,
        source: result.source,
        provider: result.provider,
      },
    };
  }

  // Verify/validate an address.
  async function verify(request: FastifyRequest) {
    const body = (request.body ?? {}) as StructuredQuery;
    const hasAny = ['line1', 'city', 'state', 'postalCode', 'countryCode'].some(
      (k) => String((body as Record<string, unknown>)[k] ?? '').trim().length > 0,
    );
    if (!hasAny) throw badRequest('at least one address component is required');
    return service.verify(body);
  }

  // Prefix/typeahead suggestions.
  async function autocomplete(request: FastifyRequest) {
    const query = (request.query ?? {}) as { q?: string; country?: string; limit?: string };
    const q = String(query.q ?? '').trim();
    if (!q) throw badRequest('query parameter "q" is required');
    return service.autocomplete({ query: q, countryCode: query.country, limit: clampLimit(query.limit) });
  }

  return { search, structured, reverse, shape, verify, autocomplete };
}
