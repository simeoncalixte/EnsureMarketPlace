import { FastifyPluginAsync } from 'fastify';
import { navigationHandler } from './handlers';

/**
 * Navigation for the current session. The UI renders exactly what this returns,
 * so the menu — and the set of links a user can even click — is governed by
 * their role on the server rather than trusted client-side state. See
 * ./README.md for the concern map.
 */
export const navigationRoute: FastifyPluginAsync = async (app) => {
  app.get('/navigation', navigationHandler);
};
