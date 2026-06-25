import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

/**
 * Password hashing for registration/login — uses Node's built-in `scrypt`
 * (memory-hard KDF) so there is no third-party dependency to install. The stored
 * form is self-describing: `scrypt$N$<saltHex>$<hashHex>`, so the parameters can
 * evolve without a migration.
 *
 * Previously the registration route stored a non-secret placeholder
 * (`registration:<uuid>`) as the passwordHash, which meant the password a user
 * chose was discarded and could never authenticate them. These helpers replace
 * that: the chosen password is hashed here and verified by `/auth/login`.
 */

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;
const SCHEME = 'scrypt';

/** Hash a plaintext password into a self-describing, salted scrypt digest. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(plain, salt, KEYLEN)) as Buffer;
  return `${SCHEME}$${KEYLEN}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Constant-time verification of a plaintext against a stored scrypt digest. */
export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== SCHEME) return false;

  const keylen = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  if (!Number.isFinite(keylen) || keylen <= 0 || salt.length === 0 || expected.length !== keylen) {
    return false;
  }

  const derived = (await scryptAsync(plain, salt, keylen)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Whether a stored value is a real scrypt hash (vs. a legacy placeholder). */
export function isHashedPassword(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(`${SCHEME}$`);
}
