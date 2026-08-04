import { FastifyPluginAsync } from 'fastify';
import {
  worldcitiesStatusHandler,
  worldcitiesStartHandler,
  worldcitiesStopHandler,
} from './handlers';

/**
 * Worldcities seed API (admin trigger).
 *
 * Loads SimpleMaps' worldcities.csv (~1.94M rows) into `stateProvinces` + `cities`. The import is a
 * long-running, streaming, two-pass job, so the trigger is fire-and-forget: POST starts it in the
 * background and returns immediately; poll GET /seed/worldcities/status for run state + live row
 * counts. Idempotent — safe to re-run; existing states/cities are skipped.
 */
export const worldcitiesSeedRoute: FastifyPluginAsync = async (app) => {
  app.get('/seed/worldcities/status', worldcitiesStatusHandler);
  app.post('/seed/worldcities', worldcitiesStartHandler);
  app.post('/seed/worldcities/stop', worldcitiesStopHandler);
};

export default worldcitiesSeedRoute;
