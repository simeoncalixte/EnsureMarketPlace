import { assetTypes, constructionTypes, occupancyTypes, policyChangeTypes, policyStatuses, policyTypes } from '../../../db/models/constants';

/**
 * Pure decision logic for policy issuance (bind) + versioning (endorsements).
 * No DB, no IO — the policy-number format, version numbering, and the default
 * policy period are unit-testable. The service persists and injects the clock.
 */

export type PolicyStatus = (typeof policyStatuses)[number];
export type PolicyChangeType = (typeof policyChangeTypes)[number];

/** Deterministic, unique policy number for a bound submission. */
export function formatPolicyNumber(submissionId: number): string {
  return `POL-${String(submissionId).padStart(6, '0')}`;
}

/** Next append-only policy version (issuance is 1, endorsements increment). */
export function nextPolicyVersionNumber(last: number | null | undefined): number {
  return (last ?? 0) + 1;
}

/**
 * Default expiration = effective + N months (default 12). Non-mutating and
 * computed in UTC so a policy period is deterministic regardless of server
 * timezone/DST (these are DATEONLY values).
 */
export function defaultExpiration(effective: Date, months = 12): Date {
  const d = new Date(effective.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Format a money value as a fixed-2 decimal string (or null). */
export function asMoneyString(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

/**
 * Map a canonical line-of-business code onto the `Policy.policyType` enum. Risk-
 * class-agnostic substring matching with a `commercial` default — the platform's
 * policyType taxonomy is coarse, so anything not clearly personal/auto/marine/life
 * lands in commercial. Used by bind when no explicit policyType is supplied.
 */
export function mapLineOfBusinessToPolicyType(lobCode: string | null | undefined): (typeof policyTypes)[number] {
  const code = String(lobCode ?? '').toLowerCase();
  if (code.includes('home') || code.includes('residential') || code.includes('dwelling')) return 'homeowners';
  if (code.includes('auto') || code.includes('motor') || code.includes('vehicle') || code.includes('fleet')) return 'auto';
  if (code.includes('marine') || code.includes('hull') || code.includes('cargo') || code.includes('ocean')) return 'marine';
  if (code.includes('life')) return 'life';
  return 'commercial';
}

/** Coerce a free-text asset hint onto the ExposureUnit asset enum (default building). */
export function coerceExposureAssetType(value: unknown): (typeof assetTypes)[number] {
  const v = String(value ?? '').toLowerCase();
  return ((assetTypes as readonly string[]).includes(v) ? v : 'building') as (typeof assetTypes)[number];
}

/** Coerce a value onto an allowed enum, else null (for nullable exposure fields). */
function coerceExposureEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  const v = String(value ?? '').toLowerCase();
  return (allowed as readonly string[]).includes(v) ? (v as T[number]) : null;
}

/** Deterministic per-policy exposure reference, e.g. POL-000123-EXP-0001. */
export function formatExposureRef(policyNumber: string, index: number): string {
  return `${policyNumber}-EXP-${String(index + 1).padStart(4, '0')}`;
}

/** The shape of one ExposureUnit row, minus the policyId the service injects. */
export type ExposureRow = {
  exposureRef: string;
  subjectLabel: string | null;
  subjectIndex: number;
  assetType: (typeof assetTypes)[number];
  constructionType: (typeof constructionTypes)[number] | null;
  occupancyType: (typeof occupancyTypes)[number] | null;
  replacementCost: string | null;
};

/**
 * Materialize the policy's schedule of values from the canonical submission's
 * `subjects[]`. Pure: each insured subject becomes one ExposureUnit row, coerced
 * onto the exposure taxonomy. Returns [] when the submission is a single
 * unitemized risk (no subjects) — the policy then carries no scheduled exposures.
 */
export function buildExposureRows(policyNumber: string, subjects: unknown): ExposureRow[] {
  if (!Array.isArray(subjects)) return [];
  return subjects.map((raw, index) => {
    const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
      exposureRef: formatExposureRef(policyNumber, index),
      subjectLabel: asText(s.label),
      subjectIndex: index,
      assetType: coerceExposureAssetType(s.assetType),
      constructionType: coerceExposureEnum(s.constructionType, constructionTypes),
      occupancyType: coerceExposureEnum(s.occupancyType, occupancyTypes),
      replacementCost: asMoneyString(s.insuredValue as string | number | null),
    };
  });
}
