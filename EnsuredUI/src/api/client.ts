// Shared API client used by every module in `src/api`.
//
// It composes the existing `apiFetch` (src/lib/auth.ts), which already resolves
// `/api/*` paths against `getApiBase()` and attaches an `Authorization: Bearer`
// header when a token is present. On top of that we always send cookie
// credentials, so a single call covers both auth schemes the app relied on.
//
// Two layers are exposed:
//   - `apiRequest`  -> raw `Response`, for callers that branch on status, read
//                      `res.text()` / `res.clone().json()`, or parse bespoke
//                      error bodies.
//   - `getJson` / `postJson` / ... -> parse JSON, tolerate 204, and throw
//                      `ApiError` on a non-ok response.
import { apiFetch, type ApiFetchOptions } from '../lib/auth';

export type { ApiFetchOptions };

/** Error thrown by the JSON helpers when the response is not ok. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Perform an API request and return the raw `Response`.
 * Always sends cookies; `apiFetch` adds the bearer token unless `useAuth:false`.
 */
export async function apiRequest(path: string, init: ApiFetchOptions = {}): Promise<Response> {
  return apiFetch(path, { credentials: 'include', ...init });
}

function jsonInit(method: string, body: unknown, init?: ApiFetchOptions): ApiFetchOptions {
  return {
    ...init,
    method,
    headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) },
    body: body === undefined ? init?.body : JSON.stringify(body),
  };
}

async function readErrorBody(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}

function errorMessage(body: unknown, res: Response): string {
  if (body && typeof body === 'object') {
    const maybe = body as { error?: unknown; message?: unknown };
    if (typeof maybe.error === 'string') return maybe.error;
    if (typeof maybe.message === 'string') return maybe.message;
  }
  if (typeof body === 'string' && body) return body;
  return res.statusText || `Request failed: ${res.status}`;
}

/** Parse a JSON response, tolerating 204/empty bodies and throwing on !ok. */
async function parse<T>(res: Response): Promise<T> {
  if (!res.ok && res.status !== 204) {
    const body = await readErrorBody(res);
    throw new ApiError(errorMessage(body, res), res.status, body);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function getJson<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  return parse<T>(await apiRequest(path, { ...init, method: 'GET' }));
}

export async function postJson<T>(path: string, body?: unknown, init?: ApiFetchOptions): Promise<T> {
  return parse<T>(await apiRequest(path, jsonInit('POST', body, init)));
}

export async function putJson<T>(path: string, body?: unknown, init?: ApiFetchOptions): Promise<T> {
  return parse<T>(await apiRequest(path, jsonInit('PUT', body, init)));
}

export async function patchJson<T>(path: string, body?: unknown, init?: ApiFetchOptions): Promise<T> {
  return parse<T>(await apiRequest(path, jsonInit('PATCH', body, init)));
}

export async function deleteJson<T = void>(path: string, body?: unknown, init?: ApiFetchOptions): Promise<T> {
  const requestInit = body === undefined ? { ...init, method: 'DELETE' } : jsonInit('DELETE', body, init);
  return parse<T>(await apiRequest(path, requestInit));
}
