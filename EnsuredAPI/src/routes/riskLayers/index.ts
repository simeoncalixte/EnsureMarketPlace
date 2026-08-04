import { FastifyPluginAsync } from 'fastify';
import { activeEventsHandler, faultLinesHandler } from './handlers';

/**
 * Risk layers API — toggleable map overlays that inform underwriting.
 *
 * `/risk-layers/active-events` aggregates live catastrophe feeds; `/risk-layers/fault-lines`
 * serves a static seismic-hazard overlay. See ./README.md for the concern map.
 *
 * Read-only and unauthenticated by design (same posture as `/cresta-zones`).
 */
export const riskLayersRoute: FastifyPluginAsync = async (app) => {
  app.get('/risk-layers/active-events', activeEventsHandler);
  app.get('/risk-layers/fault-lines', faultLinesHandler);
};
