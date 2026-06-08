/**
 * Shared plumbing for mailbox clients: silent token refresh (single-flight),
 * and an authenticated fetch helper with 429/503 backoff.
 */

import { refreshAccessToken, resolveScopes } from './oauth';
import {
  MailboxClient,
  MailboxCredentials,
  MailboxOptions,
  ProviderName,
  ReauthRequiredError,
} from './types';

/** Refresh slightly ahead of expiry to avoid using a token that dies mid-request. */
const EXPIRY_SKEW_MS = 60_000;
const MAX_HTTP_RETRIES = 3;

export interface AuthedFetchInit extends RequestInit {
  /** When true, a non-2xx response returns the Response instead of throwing. */
  raw?: boolean;
}

export abstract class BaseMailboxClient implements MailboxClient {
  abstract readonly provider: ProviderName;

  protected creds: MailboxCredentials;
  protected options: MailboxOptions;
  private refreshPromise: Promise<string> | null = null;

  constructor(creds: MailboxCredentials, options: MailboxOptions = {}) {
    this.creds = creds;
    this.options = options;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (
      this.creds.accessToken &&
      this.creds.accessTokenExpiresAt &&
      this.creds.accessTokenExpiresAt - now > EXPIRY_SKEW_MS
    ) {
      return this.creds.accessToken;
    }
    // Single-flight: concurrent callers share one refresh request.
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async doRefresh(): Promise<string> {
    if (!this.creds.refreshToken) {
      throw new ReauthRequiredError('Missing refresh token; channel must be re-authorized');
    }
    const scopes = resolveScopes(
      this.provider,
      Boolean(this.creds.allowWrite),
      this.creds.scopes,
      this.creds.tenantId,
    );
    const result = await refreshAccessToken({
      provider: this.provider,
      clientId: this.creds.clientId,
      clientSecret: this.creds.clientSecret,
      refreshToken: this.creds.refreshToken,
      tenantId: this.creds.tenantId,
      scopes,
    });
    this.creds.accessToken = result.accessToken;
    this.creds.accessTokenExpiresAt = Date.now() + Math.max(0, result.expiresIn - 60) * 1000;
    if (result.refreshToken) this.creds.refreshToken = result.refreshToken;

    if (this.options.onTokenRefresh) {
      try {
        await this.options.onTokenRefresh({
          accessToken: this.creds.accessToken,
          accessTokenExpiresAt: this.creds.accessTokenExpiresAt,
          ...(result.refreshToken ? { refreshToken: result.refreshToken } : {}),
        });
      } catch (_) {
        // Persistence is best-effort; an in-memory token still works this cycle.
      }
    }
    return this.creds.accessToken;
  }

  /** Authenticated fetch with bearer token, JSON-friendly errors, and 429/503 backoff. */
  protected async authedFetch(url: string, init: AuthedFetchInit = {}): Promise<Response> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const token = await this.getAccessToken();
      const headers = new Headers(init.headers as HeadersInit);
      headers.set('Authorization', `Bearer ${token}`);
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');

      let res: Response;
      try {
        res = await fetch(url, { ...init, headers });
      } catch (err: any) {
        if (attempt < MAX_HTTP_RETRIES) {
          attempt += 1;
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`Request to ${url} failed: ${err?.message ?? String(err)}`);
      }

      if ((res.status === 429 || res.status === 503) && attempt < MAX_HTTP_RETRIES) {
        attempt += 1;
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt));
        continue;
      }
      if (res.status === 401) {
        // Token rejected: force one refresh + retry before giving up.
        if (attempt < 1) {
          attempt += 1;
          this.creds.accessTokenExpiresAt = 0;
          continue;
        }
        throw new ReauthRequiredError(`Authorization rejected (401) for ${url}`);
      }
      return res;
    }
  }

  /** authedFetch + JSON parse + throw on non-2xx (unless caller wants the raw Response). */
  protected async json<T = any>(url: string, init: AuthedFetchInit = {}): Promise<T> {
    const res = await this.authedFetch(url, init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${this.provider} API ${res.status} for ${url}: ${text.slice(0, 500)}`);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  abstract listNewMessages(cursor: string | null, max: number): ReturnType<MailboxClient['listNewMessages']>;
  abstract getMessage(id: string): ReturnType<MailboxClient['getMessage']>;
  abstract markProcessed(id: string): Promise<void>;
  abstract verifyConnection(): ReturnType<MailboxClient['verifyConnection']>;
}

export function backoffMs(attempt: number): number {
  return Math.min(8000, 250 * 2 ** (attempt - 1));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convert base64url (Gmail) to standard base64. Safe to call on standard base64 too. */
export function base64urlToBase64(data: string): string {
  return Buffer.from(data, 'base64url').toString('base64');
}
