import { randomUUID } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../../db/models';
import { hashPassword } from '../../services/auth/password';
import {
  SELF_SERVICE_ROLES,
  SelfServiceRole,
  provisionAccount,
  signUserToken,
} from '../../services/auth/provisioning';
import {
  MIN_PASSWORD_LENGTH,
  RegistrationPayload,
  resolveEmail,
  resolveOrganization,
} from './service';

export async function completeRegistrationHandler(
  req: FastifyRequest<{ Body: RegistrationPayload }>,
  reply: FastifyReply,
) {
  const payload = req.body ?? ({} as RegistrationPayload);

  // --- #35: admin is never self-registerable -------------------------------
  if (!payload.selectedRole) {
    return reply.code(400).send({ error: 'missing_selected_role' });
  }
  if (!SELF_SERVICE_ROLES.includes(payload.selectedRole as SelfServiceRole)) {
    return reply.code(403).send({ error: 'role_not_self_serviceable' });
  }
  const role = payload.selectedRole as SelfServiceRole;

  // --- account credentials -------------------------------------------------
  const email = resolveEmail(payload);
  if (!email) {
    return reply.code(400).send({ error: 'invalid_email' });
  }

  const isSocial = payload.accountMethod === 'social' && Boolean(payload.socialProvider);
  const password = (payload.password ?? '').toString();
  if (!isSocial && password.length < MIN_PASSWORD_LENGTH) {
    return reply.code(400).send({ error: 'weak_password', minLength: MIN_PASSWORD_LENGTH });
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return reply.code(409).send({ error: 'email_already_registered' });
  }

  // A social account has no local password to verify against; store a random,
  // unusable hash so the NOT-NULL column holds a real (non-placeholder) value.
  const passwordHash = await hashPassword(isSocial ? randomUUID() : password);

  const result = await provisionAccount({
    role,
    email,
    passwordHash,
    fullName: payload.fullName,
    organization: resolveOrganization(payload),
  });

  // Token is committed immediately — there is no payment wall to clear first.
  return reply.code(201).send({
    authToken: signUserToken(result.user),
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
      organizationId: result.user.organizationId,
    },
    investorProfileId: result.investorProfileId,
    trial: result.trial,
  });
}
