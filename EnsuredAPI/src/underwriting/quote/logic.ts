import { quoteStatuses } from '../../db/models/constants';

/**
 * Pure decision logic for quote issuance + lifecycle. No DB, no IO — so version
 * numbering, the quote-number format, the offer snapshot mapping, and the
 * lifecycle state machine are all unit-testable. The service (`service.ts`) loads
 * the data, persists the rows, and injects the clock.
 */

export type QuoteStatus = (typeof quoteStatuses)[number];

/** Deterministic, unique human reference for a submission's quote thread. */
export function formatQuoteNumber(submissionId: number): string {
  return `Q-${String(submissionId).padStart(6, '0')}`;
}

/** Next append-only version number given the last one (or none). */
export function nextVersionNumber(last: number | null | undefined): number {
  return (last ?? 0) + 1;
}

/** Quote validity window: issuedAt + N days (default 30). Clock is injected. */
export function defaultValidUntil(issuedAt: Date, days = 30): Date {
  return new Date(issuedAt.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Format a money value as a fixed-2 decimal string (or null). */
export function asMoneyString(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

/** Format a rate value as a fixed-4 decimal string (or null). */
export function asRateString(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[%\s]/g, ''));
  return Number.isFinite(n) ? n.toFixed(4) : null;
}

export type QuoteAction = 'accept' | 'decline' | 'withdraw' | 'expire';

/**
 * Allowed lifecycle transitions. `issued` is the entry state (a quote is created
 * already issued/delivered); `accepted` is the only state bind reads. `declined`,
 * `withdrawn`, `expired`, and `bound` are terminal.
 */
const TRANSITIONS: Record<QuoteAction, { from: QuoteStatus[]; to: QuoteStatus }> = {
  accept: { from: ['issued'], to: 'accepted' },
  decline: { from: ['issued'], to: 'declined' },
  withdraw: { from: ['issued', 'accepted'], to: 'withdrawn' },
  expire: { from: ['issued'], to: 'expired' },
};

export type TransitionResult = { ok: true; to: QuoteStatus } | { ok: false; reason: string };

export function resolveTransition(action: QuoteAction, current: QuoteStatus): TransitionResult {
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, reason: `unknown_action:${action}` };
  if (!rule.from.includes(current)) return { ok: false, reason: `invalid_transition:${current}->${rule.to}` };
  return { ok: true, to: rule.to };
}

export type QuoteOverrides = {
  premium?: string | number | null;
  currency?: string | null;
  commissionRate?: string | number | null;
  coverageLimit?: string | number | null;
  attachmentPoint?: string | number | null;
  deductible?: string | number | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  terms?: Record<string, unknown> | null;
};

export type QuoteSnapshot = {
  premium: string;
  currency: string;
  commissionRate: string | null;
  coverageLimit: string | null;
  attachmentPoint: string | null;
  deductible: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  termsJson: Record<string, unknown> | null;
};

/**
 * Assemble the immutable offer snapshot. Premium defaults to the priced technical
 * premium and may be overridden (an underwriter loading on top). Throws when there
 * is neither a priced premium nor an override — a quote MUST carry a price.
 */
export function buildQuoteSnapshot(input: { pricingPremium: string | null; overrides?: QuoteOverrides }): QuoteSnapshot {
  const o = input.overrides ?? {};
  const premium = asMoneyString(o.premium) ?? asMoneyString(input.pricingPremium);
  if (premium === null) throw new Error('quote_requires_premium');
  return {
    premium,
    currency: o.currency ?? 'USD',
    commissionRate: o.commissionRate != null ? asRateString(o.commissionRate) : null,
    coverageLimit: asMoneyString(o.coverageLimit),
    attachmentPoint: asMoneyString(o.attachmentPoint),
    deductible: asMoneyString(o.deductible),
    effectiveDate: o.effectiveDate ?? null,
    expirationDate: o.expirationDate ?? null,
    termsJson: o.terms ?? null,
  };
}
