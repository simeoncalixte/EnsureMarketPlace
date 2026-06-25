// Auth API — requests under `/api/auth`.
import { apiRequest, postJson } from './client';
import { getApiBase } from '../lib/api';

export type LoginUser = {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  organizationId?: number | null;
};

export type LoginResult = {
  authToken: string;
  user: LoginUser;
};

/**
 * POST /api/auth/login — email + password sign-in.
 *
 * Resolves to the auth token + user on success. On bad credentials the API
 * returns 401 `invalid_credentials`; `postJson` throws an `ApiError` (with
 * `.status === 401`) the caller can branch on to notify the user.
 */
export function login(email: string, password: string): Promise<LoginResult> {
  return postJson<LoginResult>('/api/auth/login', { email, password }, { useAuth: false });
}

/**
 * GET /api/auth/me — current user.
 * Returns the raw Response: `useAuthMe` inspects status and falls back to
 * decoding the JWT when the endpoint is unavailable, so it must not throw here.
 */
export function getAuthMe(): Promise<Response> {
  return apiRequest('/api/auth/me', { method: 'GET' });
}

export type OAuthProvider = 'google' | 'microsoft';

export type OAuthStartParams = {
  role?: string;
  invitationCode?: string;
  legalName?: string;
  country?: string;
};

/**
 * GET /api/auth/oauth/:provider/start — social sign-up entry point.
 *
 * Returns a URL for a full-page navigation (not an XHR): the API redirects the
 * browser to the provider's consent screen, then back to /auth/social/callback
 * with the token in the URL fragment. The chosen role and any org details ride
 * along as query params so the API can provision the account after consent;
 * `redirect` tells it which web origin to return the browser to.
 */
export function oauthStartUrl(provider: OAuthProvider, params: OAuthStartParams = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim()) query.set(key, value.trim());
  }
  if (typeof window !== 'undefined') query.set('redirect', window.location.origin);
  return `${getApiBase()}/api/auth/oauth/${provider}/start?${query.toString()}`;
}
