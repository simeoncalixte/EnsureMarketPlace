import { policyTypes } from '../../db/models/constants';
import { CanonicalSubmission, ExposureUnit, Policy, PolicyVersion, Quote, QuoteVersion, Submission } from '../../db/models';
import {
  asMoneyString,
  buildExposureRows,
  defaultExpiration,
  formatPolicyNumber,
  mapLineOfBusinessToPolicyType,
  nextPolicyVersionNumber,
  PolicyChangeType,
  PolicyStatus,
} from './logic';

/**
 * Bind + policy-lifecycle orchestration. `bindQuoteForSubmission` turns an
 * ACCEPTED quote into an in-force Policy + its first (issuance) PolicyVersion,
 * closing the loop: submission → quote → policy. `endorsePolicy` appends an
 * immutable PolicyVersion (endorsement / cancellation / renewal) and updates the
 * Policy header's denormalized current snapshot — append-only, fully auditable.
 */

export type BindQuoteOptions = {
  userId?: number | null;
  insurerProfileId?: number | null;
  policyType?: (typeof policyTypes)[number];
  effectiveDate?: Date | string | null;
  expirationDate?: Date | string | null;
  now?: () => Date;
};

export type BindQuoteResult = {
  policyId: number;
  policyNumber: string;
  status: string;
  versionNumber: number;
  quoteId: number;
  premium: string;
  policyType: string;
  exposuresCreated: number;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function bindQuoteForSubmission(
  submissionId: number,
  options: BindQuoteOptions = {},
): Promise<BindQuoteResult> {
  const submission = await Submission.findByPk(submissionId);
  if (!submission) throw new Error('submission_not_found');

  const quote = await Quote.findOne({ where: { submissionId } });
  if (!quote) throw new Error('quote_not_found');
  if (quote.status === 'bound') throw new Error('quote_already_bound');
  if (quote.status !== 'accepted') throw new Error('quote_not_accepted');

  const qv = await QuoteVersion.findOne({ where: { quoteId: quote.id }, order: [['versionNumber', 'DESC']] });
  if (!qv) throw new Error('quote_version_not_found');

  // A bound policy must belong to an insurer profile.
  const insurerProfileId = options.insurerProfileId ?? submission.insurerProfileId ?? null;
  if (insurerProfileId == null) throw new Error('insurer_profile_required');

  const now = (options.now ?? (() => new Date()))();
  const effectiveDate = toDate(qv.effectiveDate) ?? toDate(options.effectiveDate) ?? now;
  const expirationDate =
    toDate(qv.expirationDate) ?? toDate(options.expirationDate) ?? defaultExpiration(effectiveDate, 12);

  const premium = asMoneyString(qv.premium) ?? '0.00';
  const coverageLimit = asMoneyString(qv.coverageLimit);
  const deductible = asMoneyString(qv.deductible);
  // Policy.insuredValue is NOT NULL — fall back to the coverage limit, then the premium.
  const insuredValue = coverageLimit ?? premium;

  // The canonical submission drives policyType (LOB→type) and the schedule of
  // insured subjects we materialize as ExposureUnit rows below.
  const canonical = await CanonicalSubmission.findOne({ where: { submissionId } });
  const canonicalData = (canonical?.data ?? {}) as Record<string, unknown>;
  const policyType =
    options.policyType ?? mapLineOfBusinessToPolicyType(canonical?.lineOfBusinessCode ?? null);
  const policyNumber = formatPolicyNumber(submissionId);

  const policy = await Policy.create({
    externalPolicyId: policyNumber,
    insurerProfileId,
    portfolioId: submission.portfolioId ?? null,
    submissionId,
    sourceQuoteId: quote.id,
    status: 'in_force',
    currentVersionNumber: 1,
    policyType,
    effectiveDate,
    expirationDate,
    premium,
    insuredValue,
    deductible,
    coverageLimit,
  });

  // Materialize the policy's schedule of values: one ExposureUnit per insured
  // subject from the canonical submission. A single unitemized risk yields none.
  const exposureRows = buildExposureRows(policyNumber, canonicalData.subjects);
  for (const row of exposureRows) {
    await ExposureUnit.create({ ...row, policyId: policy.id });
  }

  await PolicyVersion.create({
    policyId: policy.id,
    versionNumber: 1,
    changeType: 'issuance',
    status: 'in_force',
    sourceQuoteVersionId: qv.id,
    premium,
    coverageLimit,
    deductible,
    effectiveDate,
    expirationDate,
    effectiveFrom: effectiveDate,
    termsJson: qv.termsJson ?? null,
    reason: 'Initial issuance from bound quote',
    createdByUserId: options.userId ?? null,
  });

  await quote.update({ status: 'bound', boundPolicyId: policy.id });
  await qv.update({ status: 'bound' });
  await submission.update({ status: 'bound' });

  return {
    policyId: policy.id,
    policyNumber: policy.externalPolicyId,
    status: 'in_force',
    versionNumber: 1,
    quoteId: quote.id,
    premium,
    policyType,
    exposuresCreated: exposureRows.length,
  };
}

export type EndorsePolicyChanges = {
  changeType?: PolicyChangeType; // default 'endorsement'
  status?: PolicyStatus; // default 'in_force'; a cancellation sets 'cancelled'
  premium?: string | number | null;
  coverageLimit?: string | number | null;
  deductible?: string | number | null;
  expirationDate?: Date | string | null;
  effectiveFrom?: Date | string | null;
  terms?: Record<string, unknown> | null;
  reason?: string | null;
};

export type EndorsePolicyOptions = { userId?: number | null; now?: () => Date };

export type EndorsePolicyResult = {
  policyId: number;
  versionNumber: number;
  changeType: PolicyChangeType;
  status: PolicyStatus;
};

export async function endorsePolicy(
  policyId: number,
  changes: EndorsePolicyChanges = {},
  options: EndorsePolicyOptions = {},
): Promise<EndorsePolicyResult> {
  const policy = await Policy.findByPk(policyId);
  if (!policy) throw new Error('policy_not_found');
  if (policy.status !== 'in_force') throw new Error('policy_not_in_force');

  const last = await PolicyVersion.findOne({ where: { policyId }, order: [['versionNumber', 'DESC']] });
  const versionNumber = nextPolicyVersionNumber(last?.versionNumber);
  const now = (options.now ?? (() => new Date()))();

  const changeType: PolicyChangeType = changes.changeType ?? 'endorsement';
  const status: PolicyStatus = changes.status ?? 'in_force';

  // Merge: a provided change overrides the current header snapshot; otherwise keep.
  const premium = changes.premium != null ? asMoneyString(changes.premium) ?? policy.premium : policy.premium;
  const coverageLimit =
    changes.coverageLimit !== undefined ? asMoneyString(changes.coverageLimit) : policy.coverageLimit;
  const deductible = changes.deductible !== undefined ? asMoneyString(changes.deductible) : policy.deductible;
  const expirationDate = toDate(changes.expirationDate) ?? policy.expirationDate;
  const effectiveFrom = toDate(changes.effectiveFrom) ?? now;

  await PolicyVersion.create({
    policyId,
    versionNumber,
    changeType,
    status,
    sourceQuoteVersionId: null,
    premium,
    coverageLimit,
    deductible,
    effectiveDate: policy.effectiveDate,
    expirationDate,
    effectiveFrom,
    termsJson: changes.terms ?? null,
    reason: changes.reason ?? null,
    createdByUserId: options.userId ?? null,
  });

  // The Policy header always reflects the latest version's terms.
  await policy.update({ premium, coverageLimit, deductible, expirationDate, status, currentVersionNumber: versionNumber });

  return { policyId, versionNumber, changeType, status };
}
