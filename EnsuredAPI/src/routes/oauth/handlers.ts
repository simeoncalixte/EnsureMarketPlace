import { randomUUID } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../../db/models';
import { hashPassword } from '../../services/auth/password';
import {
  OAuthClaims,
  buildAuthorizeUrl,
  exchangeCodeForClaims,
  isOAuthProvider,
  isProviderConfigured,
  renderSimulatedConsentPage,
  simulatedConsentAllowed,
} from '../../services/auth/oauthProviders';
import {
  SELF_SERVICE_ROLES,
  SelfServiceRole,
  provisionAccount,
  signUserToken,
} from '../../services/auth/provisioning';
import { CallbackQuery, StartQuery } from './types';
import {
  defaultWebBase,
  errorRedirect,
  resolveOrganization,
  resolveReturnTo,
  signState,
  verifyState,
} from './service';

export async function startHandler(
  request: FastifyRequest<{ Params: { provider: string }; Querystring: StartQuery }>,
  reply: FastifyReply,
) {
  const provider = request.params.provider;
  if (!isOAuthProvider(provider)) {
    return reply.code(404).send({ error: 'unknown_oauth_provider' });
  }

  const role = (request.query.role ?? '').trim();
  if (role && !SELF_SERVICE_ROLES.includes(role as SelfServiceRole)) {
    return reply.code(403).send({ error: 'role_not_self_serviceable' });
  }

  const state = signState({
    provider,
    returnTo: resolveReturnTo(request.query.redirect),
    role: role ? (role as SelfServiceRole) : null,
    organization: resolveOrganization(request.query),
  });

  if (isProviderConfigured(provider)) {
    return reply.redirect(buildAuthorizeUrl(provider, state));
  }
  if (!simulatedConsentAllowed()) {
    return reply.code(503).send({ error: 'oauth_provider_not_configured' });
  }
  return reply.type('text/html').send(renderSimulatedConsentPage(provider, state));
}

export async function callbackHandler(
  request: FastifyRequest<{ Params: { provider: string }; Querystring: CallbackQuery }>,
  reply: FastifyReply,
) {
  const provider = request.params.provider;
  if (!isOAuthProvider(provider)) {
    return reply.code(404).send({ error: 'unknown_oauth_provider' });
  }

  const state = verifyState(request.query.state, provider);
  if (!state) {
    // No trusted returnTo without a valid state — use the configured base.
    return reply.redirect(errorRedirect(defaultWebBase(), 'oauth_state_invalid'));
  }
  const { returnTo } = state;

  // The user declined on the provider's consent screen.
  if (request.query.error) {
    return reply.redirect(errorRedirect(returnTo, 'oauth_cancelled'));
  }

  let claims: OAuthClaims;
  try {
    if (isProviderConfigured(provider)) {
      if (!request.query.code) {
        return reply.redirect(errorRedirect(returnTo, 'oauth_failed'));
      }
      claims = await exchangeCodeForClaims(provider, request.query.code);
    } else {
      if (!simulatedConsentAllowed()) {
        return reply.code(503).send({ error: 'oauth_provider_not_configured' });
      }
      const email = (request.query.sim_email ?? '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.redirect(errorRedirect(returnTo, 'oauth_failed'));
      }
      claims = { email, emailVerified: true, fullName: (request.query.sim_name ?? '').trim() || null };
    }
  } catch (err) {
    request.log.error({ err, provider }, 'oauth code exchange failed');
    return reply.redirect(errorRedirect(returnTo, 'oauth_failed'));
  }

  if (!claims.emailVerified) {
    return reply.redirect(errorRedirect(returnTo, 'oauth_email_unverified'));
  }

  const existing = await User.findOne({ where: { email: claims.email } });
  if (existing) {
    if (!existing.isActive) {
      return reply.redirect(errorRedirect(returnTo, 'account_inactive'));
    }
    return reply.redirect(`${returnTo}/auth/social/callback#authToken=${encodeURIComponent(signUserToken(existing))}`);
  }

  if (!state.role) {
    // Sign-up needs a role and none was carried in the state (e.g. a future
    // login button) — send them to the form to pick one.
    return reply.redirect(errorRedirect(returnTo, 'oauth_role_required'));
  }

  // A social account has no local password to verify against; store a real
  // scrypt hash of a random unusable secret (same rationale as registration).
  const result = await provisionAccount({
    role: state.role,
    email: claims.email,
    passwordHash: await hashPassword(randomUUID()),
    fullName: claims.fullName,
    organization: state.organization,
  });

  return reply.redirect(
    `${returnTo}/auth/social/callback#authToken=${encodeURIComponent(signUserToken(result.user))}&newAccount=1`,
  );
}
