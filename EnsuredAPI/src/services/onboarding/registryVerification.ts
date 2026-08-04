/**
 * Registry verification — NAIC (insurer) and NPN/NIPR (broker/producer) numbers.
 *
 * These are registry IDENTIFIERS, not documents: an insurer's NAIC number and a
 * broker's NPN are verifiable against free public registries (NAIC Company Search,
 * NIPR for producers). Collecting them as validated text fields and verifying them
 * against the registry is both lower-friction and stronger compliance than an
 * uploaded PDF nobody validates — see onboarding issue #41.
 *
 * This module is the SCAFFOLD. It validates the FORMAT now (cheap, offline, useful
 * immediately) and returns `pending` for the live registry lookup, which is the
 * external-integration follow-up (it needs the registry endpoints/credentials and
 * cannot be exercised in this environment). The contract is stable so the deferred
 * KYB step can call it and later swap `pending` for a real verified/failed result
 * without changing callers.
 */

export type RegistryKind = 'naic' | 'npn';
export type RegistryStatus = 'verified' | 'failed' | 'invalid-format' | 'pending';

export interface RegistryVerification {
  kind: RegistryKind;
  value: string;
  status: RegistryStatus;
  /** Human-readable detail for the UI / audit log. */
  detail: string;
}

/** NAIC company codes are numeric, typically up to 6 digits. */
const NAIC_RE = /^\d{3,6}$/;
/** National Producer Numbers are numeric, up to ~10 digits. */
const NPN_RE = /^\d{1,10}$/;

function normalize(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

/**
 * Validate format and (eventually) verify against the registry. Today: format
 * check + `pending` for the live lookup. Never throws — an unverifiable input
 * returns a status, not an exception.
 */
export async function verifyRegistryNumber(kind: RegistryKind, raw: string): Promise<RegistryVerification> {
  const value = normalize(String(raw ?? ''));
  const re = kind === 'naic' ? NAIC_RE : NPN_RE;

  if (!re.test(value)) {
    return {
      kind,
      value,
      status: 'invalid-format',
      detail: kind === 'naic'
        ? 'NAIC number must be 3–6 digits.'
        : 'NPN must be up to 10 digits.',
    };
  }

  // TODO(onboarding-epic): live lookup against NAIC Company Search / NIPR. Until
  // that integration lands, a well-formed number is accepted as pending-review so
  // onboarding is not blocked on an external call we cannot make here.
  return {
    kind,
    value,
    status: 'pending',
    detail: 'Format valid; registry verification pending (live lookup not yet enabled).',
  };
}
