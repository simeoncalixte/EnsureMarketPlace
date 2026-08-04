import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { User } from '../../db/models/identity.models';
import { buildNavigationForRole, homePathForRole } from '../../services/navigation/catalog';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

/**
 * Resolve the authenticated user from the Bearer token. On any failure it sends
 * the appropriate 4xx envelope and returns null, so the handler can early-out
 * with `if (!user) return reply;`.
 */
async function resolveUser(request: FastifyRequest, reply: FastifyReply): Promise<User | null> {
  const authHeader = (request.headers.authorization as string) || (request.headers.Authorization as string) || undefined;
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    reply.code(401).send({ error: 'missing_authorization' });
    return null;
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as { userId?: unknown; id?: unknown };
    const userId = Number(payload?.userId ?? payload?.id ?? NaN);
    if (!Number.isFinite(userId)) {
      reply.code(401).send({ error: 'invalid_token_payload' });
      return null;
    }
    const user = await User.findByPk(userId);
    if (!user) {
      reply.code(404).send({ error: 'user_not_found' });
      return null;
    }
    return user;
  } catch {
    reply.code(401).send({ error: 'invalid_token' });
    return null;
  }
}

/** Build the role-scoped navigation payload for the current session. */
export async function navigationHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = await resolveUser(request, reply);
  if (!user) return reply;

  return reply.send({
    role: user.role,
    home: homePathForRole(user.role),
    items: buildNavigationForRole(user.role),
    generatedAt: new Date().toISOString(),
  });
}
