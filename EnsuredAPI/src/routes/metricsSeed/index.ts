import { FastifyPluginAsync } from 'fastify';
import { seedExposureTimeSeriesSchema } from './schemas';
import { seedExposureTimeSeriesHandler } from './handlers';

export const metricsSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/exposure-time-series', { schema: seedExposureTimeSeriesSchema }, seedExposureTimeSeriesHandler);
};
