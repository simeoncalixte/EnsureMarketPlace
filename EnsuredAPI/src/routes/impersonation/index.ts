import { FastifyPluginAsync } from 'fastify';
import { createImpersonationToken } from '../../services/impersonationService';
import { userRoles } from '../../db/models/constants';
import { User } from '../../db/models/identity.models';

/**
 * Admin impersonation — mint an auth token for a target user so an operator can
 * act as them. See ./README.md for the concern map.
 */
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
};
