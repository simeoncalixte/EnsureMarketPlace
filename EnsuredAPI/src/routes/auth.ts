import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { User } from '../db/models/identity.models';
import { verifyPassword } from '../auth/password';
import { signUserToken } from '../auth/provisioning';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

export const authRoute: FastifyPluginAsync = async (app) => {
  // Email + password sign-in. Pairs with registration, which now stores a real
  // scrypt hash (previously a placeholder, so the chosen password could never
  // authenticate — see ../auth/password and onboarding issue #37). A single
  // generic error is returned for both unknown-email and bad-password so the
  // endpoint does not reveal which emails are registered.
  app.post<{ Body: { email?: string; password?: string } }>('/auth/login', async (request, reply) => {
    const email = (request.body?.email ?? '').trim().toLowerCase();
    const password = (request.body?.password ?? '').toString();
    if (!email || !password) {
      return reply.code(400).send({ error: 'missing_credentials' });
    }

    const user = await User.findOne({ where: { email } });
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }
    if (!user.isActive) {
      return reply.code(403).send({ error: 'account_inactive' });
    }

    return reply.send({
      authToken: signUserToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  });

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
