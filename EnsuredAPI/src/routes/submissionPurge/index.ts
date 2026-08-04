import { FastifyPluginAsync } from 'fastify';
import { purgeSubmissionsSchema } from './schemas';
import { purgeSubmissionsHandler } from './handlers';

/**
 * Destructive admin reset: removes all submissions and the business data derived
 * from them (pipeline, underwriting, capital markets), keeping organizations,
 * users and their profiles. Guarded by an explicit `{ confirm: true }` so it
 * can't fire by accident.
 */
export const submissionPurgeRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/purge-submissions', { schema: purgeSubmissionsSchema }, purgeSubmissionsHandler);
};

export default submissionPurgeRoute;
