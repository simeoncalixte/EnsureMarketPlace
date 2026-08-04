import jwt from 'jsonwebtoken';
import { OrganizationLink, SelfServiceRole } from '../../services/auth/provisioning';
import { OAuthState, StartQuery } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
const STATE_TTL_SECONDS = 10 * 60;

export function defaultWebBase(): string {
  return (process.env.WEB_APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * The post-auth redirect target is attacker-suppliable (it rides the start
 * URL), so constrain it: the configured web origin always passes, loopback
 * hosts pass outside production (Vite on 3000/5173, Storybook on 6006), and
 * anything else falls back to the configured origin — never an open redirect.
 */
export function resolveReturnTo(redirect: string | undefined): string {
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

export function resolveOrganization(query: StartQuery): OrganizationLink | null {
  const invitationCode = (query.invitationCode ?? '').trim() || null;
  const legalName = (query.legalName ?? '').trim();
  const country = (query.country ?? '').trim() || null;
  if (invitationCode) return { name: `Organization ${invitationCode}`, country, invitationCode };
  if (legalName) return { name: legalName, country, invitationCode: null };
  return null;
}

export function signState(state: Omit<OAuthState, 'purpose'>): string {
  return jwt.sign({ purpose: 'oauth_state', ...state }, JWT_SECRET, { expiresIn: STATE_TTL_SECONDS });
}

export function verifyState(token: string | undefined, provider: string): OAuthState | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as OAuthState;
    if (payload.purpose !== 'oauth_state' || payload.provider !== provider) return null;
    return payload;
  } catch {
    return null;
  }
}

export function errorRedirect(returnTo: string, code: string): string {
  return `${returnTo}/auth/register?error=${encodeURIComponent(code)}`;
}
