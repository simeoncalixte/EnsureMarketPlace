// Registration API — requests under `/api/registration`.
import { apiRequest } from './client';

/**
 * POST /api/registration/complete — finalize onboarding.
 * `useAuth:false` because the user has no session token yet; the raw Response
 * lets KYCVerification parse `{ error }` and `{ registrationId, authToken }`.
 */
export function completeRegistration(body: unknown): Promise<Response> {
  return apiRequest('/api/registration/complete', {
    method: 'POST',
    useAuth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
