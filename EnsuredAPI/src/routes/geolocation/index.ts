import { FastifyPluginAsync } from 'fastify';
import { GeolocationService } from '../../services/pipeline/geolocation/service';
import { createGeolocationHandlers } from './handlers';

/**
 * Unified geolocation API.
 *
 * One HTTP surface over the {@link GeolocationService}: free-text + structured
 * forward search, reverse geocoding, boundary-shape fetch, and address
 * verification. The service runs local-dataset-first and caches remote results, so
 * `source` in each response tells the caller whether it came from our DB
 * (`'local'`), a remote provider, or nothing (`'none'`).
 *
 * Read-only and unauthenticated by design, mirroring `crestaZones`.
 * See ./README.md for the concern map.
 */
export const geolocationRoute: FastifyPluginAsync = async (app) => {
  const service = new GeolocationService();
  const handlers = createGeolocationHandlers(service);

  app.get('/geolocation/search', handlers.search);
  app.post('/geolocation/structured', handlers.structured);
  app.get('/geolocation/reverse', handlers.reverse);
  app.get('/geolocation/shape', handlers.shape);
  app.post('/geolocation/verify', handlers.verify);
  app.get('/geolocation/autocomplete', handlers.autocomplete);
};
