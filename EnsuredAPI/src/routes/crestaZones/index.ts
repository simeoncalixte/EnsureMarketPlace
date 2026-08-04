import { FastifyPluginAsync } from 'fastify';
import {
  listCrestaZonesHandler,
  crestaCatalogHandler,
  startCrestaImportHandler,
  stopCrestaImportHandler,
} from './handlers';

/**
 * CRESTA zones API.
 *
 * Serves real CRESTA zones (loaded from the CRESTA API by `import-cresta-zones`) as a GeoJSON
 * FeatureCollection. See ./README.md for the concern map.
 *
 * Read-only and unauthenticated by design.
 */
export const crestaZonesRoute: FastifyPluginAsync = async (app) => {
  app.get('/cresta-zones', listCrestaZonesHandler);
  app.get('/cresta-zones/catalog', crestaCatalogHandler);
  app.post('/cresta-zones/import', startCrestaImportHandler);
  app.post('/cresta-zones/import/stop', stopCrestaImportHandler);
};
