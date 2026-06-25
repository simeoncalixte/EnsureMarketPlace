import { randomUUID } from 'crypto';
import { FastifyPluginAsync } from 'fastify';
import { User } from '../db/models';
import { hashPassword } from '../auth/password';
import {
  OrganizationLink,
  provisionAccount,
  SELF_SERVICE_ROLES,
  SelfServiceRole,
  signUserToken,
} from '../auth/provisioning';

/**
 * Registration — the lean "Acquire" step of onboarding.
 *
 * Philosophy (onboarding epic): get a real account created with the least
 * friction, then defer heavy compliance and payment to the moment they are
 * actually required (see ../onboarding/transactionGate). This route therefore:
 *   - creates an account from role + email + password (or social) only,
 *   - links an organization from an invitation code OR a legal name + country,
 *   - starts a time-limited TRIAL subscription so the user lands in a working
 *     workspace without entering a card,
 *   - does NOT collect KYC identity fields, document packs, or liveness here.
 *
 * The account/org/trial creation itself lives in ../auth/provisioning so the
 * OAuth callback (Google / Microsoft — see ./oauth) provisions identically.
 *
 * Security fixes folded in:
 *   - `admin` is never self-registerable (#35).
 *   - the chosen password is really hashed (scrypt), not stored as a placeholder (#37).
 *   - no sensitive PII is required or buffered for collection-then-discard (#36).
 */

type AccountAccessMethod = 'organization-email' | 'username-password' | 'social';
type SocialProvider = 'gmail' | 'google' | 'facebook' | 'microsoft';

type OrganizationInput = {
  invitationCode?: string | null;
  legalName?: string | null;
  country?: string | null;
};

type RegistrationPayload = {
  selectedRole: SelfServiceRole | 'admin';
  email?: string | null;
  password?: string | null;
  fullName?: string | null;
  accountMethod?: AccountAccessMethod | null;
  socialProvider?: SocialProvider | null;
  organization?: OrganizationInput | null;
  // --- legacy fields tolerated for back-compat; never required, never the
  //     vehicle for collect-then-discard PII. ---
  emailAddress?: string | null;
  organizationName?: string | null;
  organizationReference?: string | null;
  businessDetails?: Record<string, unknown> | null;
};

const MIN_PASSWORD_LENGTH = 8;

function resolveEmail(payload: RegistrationPayload): string | null {
  const email = (payload.email ?? payload.emailAddress ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function resolveOrganization(payload: RegistrationPayload): OrganizationLink | null {
  const org = payload.organization ?? {};
  const invitationCode = (org.invitationCode ?? payload.organizationReference ?? '').trim() || null;
  const legalName =
    (org.legalName
      ?? payload.organizationName
      ?? (typeof payload.businessDetails?.legalName === 'string' ? payload.businessDetails.legalName : '')
      ?? '').trim();
  const country = (org.country ?? '').trim() || null;

  if (invitationCode) {
    // Joining an existing org by code — the code is the org reference.
    return { name: `Organization ${invitationCode}`, country, invitationCode };
  }
  if (legalName) {
    return { name: legalName, country, invitationCode: null };
  }
  return null;
}

export const registrationRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegistrationPayload }>('/registration/complete', async (req, reply) => {
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
  });
};

export default registrationRoute;
