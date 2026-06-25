import { randomUUID } from 'crypto';
import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { User } from '../db/models';
import { hashPassword } from '../auth/password';
import {
  OAuthClaims,
  buildAuthorizeUrl,
  exchangeCodeForClaims,
  isOAuthProvider,
  isProviderConfigured,
  renderSimulatedConsentPage,
  simulatedConsentAllowed,
} from '../auth/oauthProviders';
import {
  OrganizationLink,
  provisionAccount,
  SELF_SERVICE_ROLES,
  SelfServiceRole,
  signUserToken,
} from '../auth/provisioning';

/**
 * Social sign-up / sign-in (Google, Microsoft) — authorization-code flow.
 *
 *   GET /auth/oauth/:provider/start     browser entry point; carries the chosen
 *                                       role + optional org in the query, packs
 *                                       them into a signed `state`, and redirects
 *                                       to the provider (or serves the simulated
 *                                       consent page when unconfigured).
 *   GET /auth/oauth/:provider/callback  provider redirect target; exchanges the
 *                                       code for identity claims, provisions or
 *                                       signs in the user, and redirects back to
 *                                       the web app with the token in the URL
 *                                       FRAGMENT (fragments never reach server
 *                                       logs or Referer headers).
 *
 * An existing account with the provider's email is signed in rather than
 * rejected — "Register with Google" on an existing email is a sign-in intent,
 * and a duplicate-account error would leak nothing useful anyway since the
 * provider has already verified the address belongs to the requester.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
const STATE_TTL_SECONDS = 10 * 60;

type OAuthState = {
  purpose: 'oauth_state';
  provider: string;
  returnTo: string;
  role: SelfServiceRole | null;
  organization: OrganizationLink | null;
};

type StartQuery = {
  role?: string;
  redirect?: string;
  invitationCode?: string;
  legalName?: string;
  country?: string;
};

type CallbackQuery = {
  state?: string;
  code?: string;
  error?: string;
  sim_email?: string;
  sim_name?: string;
};

function defaultWebBase(): string {
  return (process.env.WEB_APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * The post-auth redirect target is attacker-suppliable (it rides the start
 * URL), so constrain it: the configured web origin always passes, loopback
 * hosts pass outside production (Vite on 3000/5173, Storybook on 6006), and
 * anything else falls back to the configured origin — never an open redirect.
 */
function resolveReturnTo(redirect: string | undefined): string {
  const fallback = defaultWebBase();
  if (!redirect) return fallback;
  try {
    const url = new URL(redirect);
    if (url.origin === fallback) return url.origin;
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (isLoopback && process.env.NODE_ENV !== 'production') return url.origin;
  } catch {
    // not a URL — fall through to the configured base
  }
  return fallback;
}

function resolveOrganization(query: StartQuery): OrganizationLink | null {
  const invitationCode = (query.invitationCode ?? '').trim() || null;
  const legalName = (query.legalName ?? '').trim();
  const country = (query.country ?? '').trim() || null;
  if (invitationCode) return { name: `Organization ${invitationCode}`, country, invitationCode };
  if (legalName) return { name: legalName, country, invitationCode: null };
  return null;
}

function signState(state: Omit<OAuthState, 'purpose'>): string {
  return jwt.sign({ purpose: 'oauth_state', ...state }, JWT_SECRET, { expiresIn: STATE_TTL_SECONDS });
}

function verifyState(token: string | undefined, provider: string): OAuthState | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as OAuthState;
    if (payload.purpose !== 'oauth_state' || payload.provider !== provider) return null;
    return payload;
  } catch {
    return null;
  }
}

function errorRedirect(returnTo: string, code: string): string {
  return `${returnTo}/auth/register?error=${encodeURIComponent(code)}`;
}

export const oauthRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { provider: string }; Querystring: StartQuery }>(
    '/auth/oauth/:provider/start',
    async (request, reply) => {
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
    },
  );

  app.get<{ Params: { provider: string }; Querystring: CallbackQuery }>(
    '/auth/oauth/:provider/callback',
    async (request, reply) => {
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
    },
  );
};

export default oauthRoute;
