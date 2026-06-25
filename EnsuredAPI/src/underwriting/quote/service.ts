import { ComplianceClearance, Pricing, PricingVersion, Quote, QuoteVersion, Submission } from '../../db/models';
import {
  buildQuoteSnapshot,
  defaultValidUntil,
  formatQuoteNumber,
  nextVersionNumber,
  QuoteAction,
  QuoteOverrides,
  resolveTransition,
} from './logic';

/**
 * Quote issuance + lifecycle orchestration. Mirrors the compute/compliance
 * services: a submission-scoped action that creates/append-only-versions a
 * separate entity. The compliance gate (latest clearance must be `passed`) is the
 * SAME gate that guards the `approved` status — you cannot issue a quote on an
 * uncleared risk. Re-issuing appends a new QuoteVersion (audit trail preserved).
 */

export type IssueQuoteOptions = {
  issuedByUserId?: number | null;
  validityDays?: number;
  overrides?: QuoteOverrides;
  now?: () => Date;
};

export type IssueQuoteResult = {
  quoteId: number;
  quoteNumber: string;
  versionNumber: number;
  status: string;
  premium: string;
  validUntil: string;
  pricingVersionId: number | null;
};

class ComplianceGateError extends Error {
  complianceStatus: string | null;
  constructor(status: string | null) {
    super('compliance_gate_blocked');
    this.name = 'ComplianceGateError';
    this.complianceStatus = status;
  }
}

export async function issueQuoteForSubmission(
  submissionId: number,
  options: IssueQuoteOptions = {},
): Promise<IssueQuoteResult> {
  const submission = await Submission.findByPk(submissionId);
  if (!submission) throw new Error('submission_not_found');

  // Gate: the latest pre-bind ComplianceClearance must have passed — the same
  // server-side gate the status route enforces for `approved` (close-the-loop).
  const clearance = await ComplianceClearance.findOne({
    where: { submissionId },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
  if (!clearance || clearance.status !== 'passed') {
    throw new ComplianceGateError(clearance?.status ?? null);
  }

  // The offer is built on the latest PricingVersion (the priced technical premium).
  const pricing = await Pricing.findOne({ where: { submissionId } });
  const pricingVersion = pricing
    ? await PricingVersion.findOne({ where: { pricingId: pricing.id }, order: [['versionNumber', 'DESC']] })
    : null;

  const snapshot = buildQuoteSnapshot({ pricingPremium: pricingVersion?.premium ?? null, overrides: options.overrides });

  const [quote] = await Quote.findOrCreate({
    where: { submissionId },
    defaults: {
      submissionId,
      organizationId: submission.organizationId ?? null,
      insurerProfileId: submission.insurerProfileId ?? null,
      quoteNumber: formatQuoteNumber(submissionId),
      status: 'issued',
      currentVersionNumber: 0,
      boundPolicyId: null,
      createdByUserId: options.issuedByUserId ?? null,
    },
  });
  if (quote.status === 'bound') throw new Error('quote_already_bound');

  const last = await QuoteVersion.findOne({ where: { quoteId: quote.id }, order: [['versionNumber', 'DESC']] });
  const versionNumber = nextVersionNumber(last?.versionNumber);
  const now = (options.now ?? (() => new Date()))();
  const validUntil = defaultValidUntil(now, options.validityDays ?? 30);

  await QuoteVersion.create({
    quoteId: quote.id,
    versionNumber,
    pricingVersionId: pricingVersion?.id ?? null,
    status: 'issued',
    premium: snapshot.premium,
    currency: snapshot.currency,
    commissionRate: snapshot.commissionRate,
    coverageLimit: snapshot.coverageLimit,
    attachmentPoint: snapshot.attachmentPoint,
    deductible: snapshot.deductible,
    effectiveDate: snapshot.effectiveDate ? new Date(snapshot.effectiveDate) : null,
    expirationDate: snapshot.expirationDate ? new Date(snapshot.expirationDate) : null,
    termsJson: snapshot.termsJson,
    validUntil,
    documentRef: null,
    issuedAt: now,
    issuedByUserId: options.issuedByUserId ?? null,
    decisionAt: null,
    decisionByUserId: null,
    decisionReason: null,
    createdByUserId: options.issuedByUserId ?? null,
  });

  await quote.update({
    status: 'issued',
    currentVersionNumber: versionNumber,
    insurerProfileId: quote.insurerProfileId ?? submission.insurerProfileId ?? null,
  });

  // Reflect issuance on the submission lifecycle.
  await submission.update({ status: 'quoted' });

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    versionNumber,
    status: 'issued',
    premium: snapshot.premium,
    validUntil: validUntil.toISOString(),
    pricingVersionId: pricingVersion?.id ?? null,
  };
}

export type TransitionQuoteOptions = { userId?: number | null; reason?: string | null; now?: () => Date };

export type TransitionQuoteResult = { quoteId: number; status: string; versionNumber: number | null };

export async function transitionQuote(
  submissionId: number,
  action: QuoteAction,
  options: TransitionQuoteOptions = {},
): Promise<TransitionQuoteResult> {
  const quote = await Quote.findOne({ where: { submissionId } });
  if (!quote) throw new Error('quote_not_found');

  const resolved = resolveTransition(action, quote.status);
  if (!resolved.ok) throw new Error(resolved.reason);

  const version = await QuoteVersion.findOne({ where: { quoteId: quote.id }, order: [['versionNumber', 'DESC']] });
  const now = (options.now ?? (() => new Date()))();

  if (version) {
    await version.update({
      status: resolved.to,
      ...(action === 'accept' || action === 'decline'
        ? { decisionAt: now, decisionByUserId: options.userId ?? null, decisionReason: options.reason ?? null }
        : {}),
    });
  }
  await quote.update({ status: resolved.to });

  return { quoteId: quote.id, status: resolved.to, versionNumber: version?.versionNumber ?? null };
}

export { ComplianceGateError };
export type { QuoteAction } from './logic';
