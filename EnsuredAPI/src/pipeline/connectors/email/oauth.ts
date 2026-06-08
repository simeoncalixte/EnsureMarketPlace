/**
 * OAuth 2.0 authorization-code helpers for Gmail and Microsoft Graph.
 *
 * Uses the global `fetch` (Node 18+) — no SDK dependency — matching how
 * src/pipeline/validation/service.ts already calls external APIs.
 *
 * Flow:
 *   1. buildAuthorizeUrl()  -> redirect the admin to the provider consent screen.
 *   2. exchangeCodeForTokens() in the callback -> capture a long-lived refresh_token.
 *   3. refreshAccessToken() at poll time -> mint short-lived access tokens unattended.
 */

import { ProviderName, ReauthRequiredError } from './types';

export interface ProviderOAuthMeta {
  authUrl: string;
  tokenUrl: string;
  /** Default scopes when the channel does not override them. */
  readScopes: string[];
  /** Scopes when write access (mark-as-read / labels) is enabled. */
  writeScopes: string[];
}

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

function microsoftBase(tenant?: string): string {
  const t = (tenant && tenant.trim()) || process.env.MS_TENANT || 'common';
  return `https://login.microsoftonline.com/${encodeURIComponent(t)}/oauth2/v2.0`;
}

export function providerMeta(provider: ProviderName, tenantId?: string): ProviderOAuthMeta {
  if (provider === 'google') {
    return {
      authUrl: GOOGLE_AUTH,
      tokenUrl: GOOGLE_TOKEN,
      readScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      writeScopes: ['https://www.googleapis.com/auth/gmail.modify'],
    };
  }
  if (provider === 'microsoft') {
    const base = microsoftBase(tenantId);
    return {
      authUrl: `${base}/authorize`,
      tokenUrl: `${base}/token`,
      // offline_access is required to receive a refresh_token.
      readScopes: ['offline_access', 'https://graph.microsoft.com/Mail.Read'],
      writeScopes: ['offline_access', 'https://graph.microsoft.com/Mail.ReadWrite'],
    };
  }
  throw new Error(`Unsupported email provider: ${provider}`);
}

/** Resolve the scopes for a channel given provider + whether write is allowed. */
export function resolveScopes(
  provider: ProviderName,
  allowWrite: boolean,
  override?: string[],
  tenantId?: string,
): string[] {
  if (override && override.length > 0) return override;
  const meta = providerMeta(provider, tenantId);
  return allowWrite ? meta.writeScopes : meta.readScopes;
}

export interface BuildAuthorizeUrlArgs {
  provider: ProviderName;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  tenantId?: string;
}

export function buildAuthorizeUrl(args: BuildAuthorizeUrlArgs): string {
  const meta = providerMeta(args.provider, args.tenantId);
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: 'code',
    scope: args.scopes.join(' '),
    state: args.state,
  });
  if (args.provider === 'google') {
    // access_type=offline + prompt=consent guarantees a refresh_token is issued.
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
    params.set('include_granted_scopes', 'true');
  } else {
    params.set('response_mode', 'query');
  }
  return `${meta.authUrl}?${params.toString()}`;
}

export interface TokenResponse {
  refreshToken: string | null;
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  scope?: string;
}

async function postToken(tokenUrl: string, form: URLSearchParams): Promise<any> {
  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form.toString(),
    });
  } catch (err: any) {
    throw new Error(`Token request failed: ${err?.message ?? String(err)}`);
  }
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_) {
    body = { raw: text };
  }
  if (!res.ok) {
    const code = String(body?.error ?? '');
    const desc = String(body?.error_description ?? text ?? res.statusText);
    // invalid_grant => the refresh token / auth code is revoked or expired.
    if (code === 'invalid_grant') {
      throw new ReauthRequiredError(`OAuth invalid_grant: ${desc}`);
    }
    throw new Error(`OAuth token endpoint ${res.status}: ${code || ''} ${desc}`.trim());
  }
  return body;
}

export interface ExchangeCodeArgs {
  provider: ProviderName;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  tenantId?: string;
  scopes?: string[];
}

export async function exchangeCodeForTokens(args: ExchangeCodeArgs): Promise<TokenResponse> {
  const meta = providerMeta(args.provider, args.tenantId);
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
  });
  // Microsoft requires scope on the token request too.
  if (args.provider === 'microsoft' && args.scopes && args.scopes.length) {
    form.set('scope', args.scopes.join(' '));
  }
  const body = await postToken(meta.tokenUrl, form);
  return {
    refreshToken: body.refresh_token ?? null,
    accessToken: String(body.access_token ?? ''),
    expiresIn: Number(body.expires_in ?? 3600),
    scope: body.scope,
  };
}

export interface RefreshArgs {
  provider: ProviderName;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId?: string;
  scopes?: string[];
}

export async function refreshAccessToken(
  args: RefreshArgs,
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const meta = providerMeta(args.provider, args.tenantId);
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: args.refreshToken,
    client_id: args.clientId,
    client_secret: args.clientSecret,
  });
  if (args.provider === 'microsoft' && args.scopes && args.scopes.length) {
    form.set('scope', args.scopes.join(' '));
  }
  const body = await postToken(meta.tokenUrl, form);
  return {
    accessToken: String(body.access_token ?? ''),
    expiresIn: Number(body.expires_in ?? 3600),
    // Microsoft may rotate the refresh token; Google usually does not.
    refreshToken: body.refresh_token ?? undefined,
  };
}

/** Encode OAuth `state` carrying the channel id (callback hits a fixed redirect URI). */
export function encodeState(payload: { channelId: number; nonce: string; ts: number }): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeState(state: string): { channelId: number; nonce: string; ts: number } | null {
  try {
    const obj = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (typeof obj?.channelId !== 'number') return null;
    return obj;
  } catch (_) {
    return null;
  }
}
