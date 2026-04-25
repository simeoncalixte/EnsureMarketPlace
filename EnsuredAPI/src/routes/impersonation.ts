import { FastifyPluginAsync } from 'fastify';
import { createImpersonationToken } from '../services/impersonationService';
import { runPipelineOnce } from '../pipeline';
import { userRoles } from '../db/models/constants';
import { User } from '../db/models/identity.models';

export const impersonationRoute: FastifyPluginAsync = async (app) => {
  app.post('/admin/impersonate/:id', async (request, reply) => {
    const { id } = request.params as any;
    const targetUserId = Number(id);
    if (Number.isNaN(targetUserId)) {
      return reply.code(400).send({ error: 'invalid_user_id' });
    }

    // Previously we required an admin/impersonator id header here.
    // For now, do not gate impersonation by admin id — create a token for the target user.
    // Prefer using the initialized `User` model class directly.
    const target = await User.findByPk(targetUserId);
    if (!target) {
      return reply.code(404).send({ error: 'target_user_not_found' });
    }

    const { token, expiresAt } = createImpersonationToken({ id: target.id, role: target.role });

    // Return token and expiry; frontend should use this token as the user's auth token.
    return reply.send({ token, expiresAt });
  });

  app.post('/admin/pipeline/run',
    {
      schema: {
        description: 'Trigger a single-run of the pipeline processor (admin only)',
        response: { 200: { type: 'object', properties: { ok: { type: 'boolean' }, channelsProcessed: { type: 'integer' }, submissionsProcessed: { type: 'integer' } } } },
      },
    },
    async (request, reply) => {
        try {
          const result = await runPipelineOnce({ batchSize: 1 });
          return reply.send(result);
        } catch (err: any) {
          reply.code(500);
          return reply.send({ ok: false, error: err?.message ?? String(err) });
        }
    }
  );
};
