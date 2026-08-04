import { FastifyPluginAsync } from 'fastify';
import { completeRegistrationHandler } from './handlers';
import { RegistrationPayload } from './service';

/**
 * Registration — the lean "Acquire" step of onboarding.
 *
 * Philosophy (onboarding epic): get a real account created with the least
 * friction, then defer heavy compliance and payment to the moment they are
 * actually required (see ../../onboarding/transactionGate). This route therefore:
 *   - creates an account from role + email + password (or social) only,
 *   - links an organization from an invitation code OR a legal name + country,
 *   - starts a time-limited TRIAL subscription so the user lands in a working
 *     workspace without entering a card,
 *   - does NOT collect KYC identity fields, document packs, or liveness here.
 *
 * The account/org/trial creation itself lives in ../../auth/provisioning so the
 * OAuth callback (Google / Microsoft — see ../oauth) provisions identically.
 *
 * Security fixes folded in:
 *   - `admin` is never self-registerable (#35).
 *   - the chosen password is really hashed (scrypt), not stored as a placeholder (#37).
 *   - no sensitive PII is required or buffered for collection-then-discard (#36).
 *
 * See ./README.md for the concern map.
 */
export const registrationRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegistrationPayload }>('/registration/complete', completeRegistrationHandler);
};

export default registrationRoute;
