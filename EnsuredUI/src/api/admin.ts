// Admin API — requests under `/api/admin`.
import { apiRequest } from './client';

/**
 * POST /api/admin/impersonate/{userId} — mint an impersonation token.
 * Returns the raw Response: the caller reads `{ token, expiresAt, error }` and
 * surfaces `error || statusText || status` in its own alert copy.
 */
export function impersonateUser(userId: number): Promise<Response> {
  return apiRequest(`/api/admin/impersonate/${userId}`, { method: 'POST' });
}
