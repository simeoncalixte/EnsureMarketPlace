import { FastifyPluginAsync } from 'fastify';
import { UserPreference } from '../../db/models';
import { resolveUserIdFromRequest } from '../../services/lib/org';

/**
 * Per-user UI preferences — `GET`/`PUT /me/preferences/:key`. A lean personal
 * key/value store (e.g. `map_submission_type_colors`) that syncs across devices.
 * Scoped to the authenticated user via the Bearer JWT; unauthenticated requests
 * read as empty and cannot write.
 */
export const userPreferencesRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/me/preferences/:key',
    {
      schema: {
        description: 'Read one of the current user\'s preferences by key.',
        params: { type: 'object', required: ['key'], properties: { key: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const userId = resolveUserIdFromRequest(request);
      if (!userId) return reply.code(200).send({ value: null });
      const { key } = request.params as { key: string };
      const row = await UserPreference.findOne({ where: { userId, key } });
      return reply.code(200).send({ value: row?.value ?? null });
    },
  );

  app.put(
    '/me/preferences/:key',
    {
      schema: {
        description: 'Upsert one of the current user\'s preferences by key.',
        params: { type: 'object', required: ['key'], properties: { key: { type: 'string' } } },
        body: { type: 'object', required: ['value'], properties: { value: {} }, additionalProperties: false },
      },
    },
    async (request, reply) => {
      const userId = resolveUserIdFromRequest(request);
      if (!userId) return reply.code(401).send({ error: 'authentication_required' });
      const { key } = request.params as { key: string };
      const { value } = request.body as { value: Record<string, unknown> | null };

      const [row] = await UserPreference.findOrCreate({
        where: { userId, key },
        defaults: { userId, key, value },
      });
      if (row.value !== value) {
        await row.update({ value });
      }
      return reply.code(200).send({ value: row.value });
    },
  );
};

export default userPreferencesRoute;
