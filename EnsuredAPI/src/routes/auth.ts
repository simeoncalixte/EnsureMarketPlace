import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { User } from '../db/models/identity.models';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

export const authRoute: FastifyPluginAsync = async (app) => {
  app.get('/auth/me', async (request, reply) => {
    const authHeader = (request.headers.authorization as string) || request.headers.Authorization as string | undefined;
    if (!authHeader) return reply.code(401).send({ error: 'missing_authorization' });
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return reply.code(401).send({ error: 'invalid_authorization' });
    const token = m[1];

    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      const userId = payload?.userId ?? payload?.id ?? null;
      if (!userId) return reply.code(401).send({ error: 'invalid_token_payload' });

      const user = await User.findByPk(Number(userId));
      if (!user) return reply.code(404).send({ error: 'user_not_found' });

      return reply.send({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      });
    } catch (err) {
      return reply.code(401).send({ error: 'invalid_token' });
    }
  });
};
