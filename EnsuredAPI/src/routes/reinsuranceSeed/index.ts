import { FastifyPluginAsync } from 'fastify';
import { seedReinsuranceSchema } from './schemas';
import { seedReinsuranceHandler } from './handlers';

export const reinsuranceSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/reinsurance', { schema: seedReinsuranceSchema }, seedReinsuranceHandler);
};
