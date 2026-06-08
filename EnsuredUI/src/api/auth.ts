// Auth API — requests under `/api/auth`.
import { apiRequest } from './client';

/**
 * GET /api/auth/me — current user.
 * Returns the raw Response: `useAuthMe` inspects status and falls back to
 * decoding the JWT when the endpoint is unavailable, so it must not throw here.
 */
export function getAuthMe(): Promise<Response> {
  return apiRequest('/api/auth/me', { method: 'GET' });
}
