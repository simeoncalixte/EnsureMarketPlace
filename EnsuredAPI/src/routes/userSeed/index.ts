import { FastifyPluginAsync } from 'fastify';
import { seedUsersSchema } from './schemas';
import { seedUsersHandler } from './handlers';

export const userSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/users', { schema: seedUsersSchema }, seedUsersHandler);
};
