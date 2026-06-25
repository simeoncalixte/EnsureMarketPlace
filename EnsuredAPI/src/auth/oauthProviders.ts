/**
 * OAuth 2.0 / OIDC providers for social sign-up (Google, Microsoft).
 *
 * Same cost-guard pattern as billing/stripe.service.ts and the LLM stages:
 * when a provider's client credentials are present in the environment we run
 * the real authorization-code flow against the provider; when they are absent
 * the flow is SIMULATED — the start endpoint serves a local mock consent page
 * instead of redirecting to the provider, so register-with-Google/Microsoft is
 * testable end-to-end (UI → API → account → token) with zero credentials and
 * zero network calls. Simulated consent is refused in production.
 *
 * Env:
 *   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
 *   MICROSOFT_OAUTH_CLIENT_ID / MICROSOFT_OAUTH_CLIENT_SECRET
 *   MICROSOFT_OAUTH_TENANT (optional, default "common")
 *   OAUTH_CALLBACK_BASE_URL (optional, default http://localhost:3001 — the API origin
 *                            registered with the provider as the redirect URI base)
 */

export type OAuthProviderId = 'google' | 'microsoft';

export const OAUTH_PROVIDERS: readonly OAuthProviderId[] = ['google', 'microsoft'];

export function isOAuthProvider(value: string): value is OAuthProviderId {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/** Identity claims we need from a provider, however they were obtained. */
export type OAuthClaims = {
  email: string;
  emailVerified: boolean;
  fullName: string | null;
};

type ProviderEndpoints = {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
};

function microsoftTenant(): string {
  return process.env.MICROSOFT_OAUTH_TENANT || 'common';
}

function endpoints(provider: OAuthProviderId): ProviderEndpoints {
  if (provider === 'google') {
    return {
      label: 'Google',
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
    };
  }
  return {
    label: 'Microsoft',
    authorizeUrl: `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`,
    scope: 'openid email profile',
  };
}

export function providerLabel(provider: OAuthProviderId): string {
  return endpoints(provider).label;
}

function credentials(provider: OAuthProviderId): { clientId: string; clientSecret: string } | null {
  const prefix = provider === 'google' ? 'GOOGLE' : 'MICROSOFT';
  const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_OAUTH_CLIENT_SECRET`];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Real provider flow available? Otherwise the route falls back to simulated consent. */
export function isProviderConfigured(provider: OAuthProviderId): boolean {
  return credentials(provider) !== null;
}

export function callbackUrl(provider: OAuthProviderId): string {
  const base = (process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/api/auth/oauth/${provider}/callback`;
}

/** Provider consent-screen URL for the real authorization-code flow. */
export function buildAuthorizeUrl(provider: OAuthProviderId, state: string): string {
  const creds = credentials(provider);
  if (!creds) throw new Error(`oauth provider ${provider} is not configured`);
  const { authorizeUrl, scope } = endpoints(provider);
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: callbackUrl(provider),
    response_type: 'code',
    scope,
    state,
  });
  if (provider === 'google') {
    // Ask Google to include profile/email in the id_token and allow account choice.
    params.set('prompt', 'select_account');
  }
  return `${authorizeUrl}?${params.toString()}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Exchange an authorization code for identity claims.
 *
 * The id_token is read WITHOUT JWKS signature verification: it is received
 * directly from the provider's token endpoint over TLS in a server-to-server
 * call, so its origin is already authenticated — the signature adds nothing in
 * the code flow (it matters for tokens that arrive via the browser). We still
 * check `aud` so a token minted for another app can't be replayed here.
 */
export async function exchangeCodeForClaims(provider: OAuthProviderId, code: string): Promise<OAuthClaims> {
  const creds = credentials(provider);
  if (!creds) throw new Error(`oauth provider ${provider} is not configured`);
  const { tokenUrl } = endpoints(provider);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl(provider),
    }).toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`oauth token exchange failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const body = (await res.json()) as { id_token?: string };
  const idToken = body.id_token;
  const payload = idToken ? decodeJwtPayload(idToken) : null;
  if (!payload) throw new Error('oauth token response missing id_token');
  if (payload.aud !== creds.clientId) throw new Error('oauth id_token audience mismatch');

  const email = String(payload.email ?? payload.preferred_username ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('oauth id_token missing email');

  return {
    email,
    // Google sets email_verified; Microsoft v2 tokens omit it for org accounts,
    // where the account itself is the verification.
    emailVerified: payload.email_verified === undefined ? true : payload.email_verified === true || payload.email_verified === 'true',
    fullName: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null,
  };
}

/** Simulated consent must never be reachable in production. */
export function simulatedConsentAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * The mock consent page served in simulated mode: a plain HTML form that plays
 * the provider's role and submits the chosen identity straight back to the
 * callback (GET, so the fields ride in the query string exactly like a real
 * provider redirect).
 */
export function renderSimulatedConsentPage(provider: OAuthProviderId, state: string): string {
  const label = providerLabel(provider);
  const action = callbackUrl(provider);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simulated ${esc(label)} sign-in</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #f3f4f6; display: grid; place-items: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; width: 360px; box-shadow: 0 8px 24px rgba(0,0,0,.06); }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { color: #6b7280; font-size: 13px; margin: 0 0 20px; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
  button { width: 100%; padding: 10px; border: 0; border-radius: 8px; background: #1f2937; color: #fff; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
<main class="card">
  <h1>Simulated ${esc(label)} consent</h1>
  <p>No ${esc(label)} OAuth credentials are configured, so this development stand-in plays the provider. The identity you enter here is treated as ${esc(label)}-verified.</p>
  <form method="GET" action="${esc(action)}">
    <input type="hidden" name="state" value="${esc(state)}" />
    <label for="sim_email">Email</label>
    <input id="sim_email" name="sim_email" type="email" required placeholder="you@company.com" />
    <label for="sim_name">Full name</label>
    <input id="sim_name" name="sim_name" type="text" placeholder="Morgan Riskwell" />
    <button type="submit">Continue as this user</button>
  </form>
</main>
</body>
</html>`;
}
