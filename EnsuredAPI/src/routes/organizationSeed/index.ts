import { FastifyPluginAsync } from 'fastify';
import { seedOrganizationsSchema } from './schemas';
import { seedOrganizationsHandler } from './handlers';

export const organizationSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/organizations', { schema: seedOrganizationsSchema }, seedOrganizationsHandler);
};
