import { FastifyPluginAsync } from 'fastify';
import {
  capitalAdequacyHandler,
  exposureConcentrationHandler,
  financialHealthHandler,
  profitabilityByLobHandler,
  reinsuranceUtilizationHandler,
} from './handlers';
import {
  capitalAdequacySchema,
  exposureConcentrationSchema,
  financialHealthSchema,
  profitabilityByLobSchema,
  reinsuranceUtilizationSchema,
} from './schemas';

export const analyticsRoute: FastifyPluginAsync = async (app) => {
  app.get('/analytics/financial-health', { schema: financialHealthSchema }, financialHealthHandler);

  app.get('/analytics/profitability-by-lob', { schema: profitabilityByLobSchema }, profitabilityByLobHandler);

  app.get('/analytics/capital-adequacy', { schema: capitalAdequacySchema }, capitalAdequacyHandler);

  app.get('/analytics/reinsurance-utilization', { schema: reinsuranceUtilizationSchema }, reinsuranceUtilizationHandler);

  app.get('/analytics/exposure-concentration', { schema: exposureConcentrationSchema }, exposureConcentrationHandler);
};
