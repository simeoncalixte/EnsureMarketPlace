import { FastifyPluginAsync } from 'fastify';

/**
 * Liveness probe (`GET /health`). See ./README.md for the concern map.
 */
export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        description: 'Health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({ status: 'ok' })
  );
};
