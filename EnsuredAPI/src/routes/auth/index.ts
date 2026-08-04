import { FastifyPluginAsync } from 'fastify';
import { loginHandler, meHandler } from './handlers';

/**
 * Authentication routes — email/password sign-in (`POST /auth/login`) and
 * current-session lookup (`GET /auth/me`). See ./README.md for the concern map.
 */
export const authRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { email?: string; password?: string } }>('/auth/login', loginHandler);
  app.get('/auth/me', meHandler);
};
