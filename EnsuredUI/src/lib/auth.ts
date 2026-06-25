export const AUTH_TOKEN_KEY = 'authToken';

import { getApiBase } from './api';

export type ApiFetchOptions = RequestInit & { useAuth?: boolean };

// Resolve the global `fetch` at call time (not import time) so it always uses
// the current `window.fetch`. This keeps it overridable — Storybook stories and
// tests can swap `window.fetch` to mock API responses and have it take effect.
const rawFetch: typeof fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof window !== 'undefined' && (window as any).fetch) {
    return (window as any).fetch(input, init);
  }
  return (globalThis as any).fetch(input, init);
}) as typeof fetch;

function resolveApiRequestInput(input: RequestInfo): RequestInfo {
  if (typeof window === 'undefined') {
    return input;
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return input;
  }

  try {
    const requestUrl = typeof input === 'string' ? new URL(input, window.location.origin) : new URL((input as Request).url, window.location.origin);
    if (requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith('/api')) {
      return `${apiBase}${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
    }
  } catch (e) {
    // ignore URL parsing errors and proceed with the original input
  }

  return input;
}

export async function apiFetch(input: RequestInfo, init?: ApiFetchOptions) {
  const opts: RequestInit = { ...(init || {}) };
  const useAuth = (init as ApiFetchOptions)?.useAuth ?? true;
  const resolvedInput = resolveApiRequestInput(input);

  if (!opts.headers) opts.headers = {};

  if (useAuth && typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        // Determine request origin and API origin — only attach token to API origin or same-origin requests
        const reqUrl = typeof resolvedInput === 'string' ? new URL(resolvedInput, window.location.origin) : new URL((resolvedInput as Request).url, window.location.origin);
        const apiBase = getApiBase();
        const apiOrigin = apiBase ? new URL(apiBase, window.location.origin).origin : window.location.origin;
        if (reqUrl.origin === apiOrigin) {
          // @ts-ignore
          (opts.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // ignore URL parsing errors and proceed without auth
    }
  }

  return rawFetch(resolvedInput, opts);
}

export function saveAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function decodeJwtPayload(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(padded).split('').map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}
