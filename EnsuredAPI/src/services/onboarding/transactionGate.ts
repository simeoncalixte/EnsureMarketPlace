import { InvestorProfile, Subscription } from '../../db/models';

/**
 * Transaction gate — the server-side enforcement point that replaces up-front KYC.
 *
 * Onboarding is intentionally light (role + account + minimal org → working
 * workspace on a trial). Heavy compliance (full KYC/KYB, document packs, liveness)
 * and payment are deferred to the moment they are actually required: the first
 * value-bearing action — binding coverage, deploying capital, submitting a risk
 * for placement.
 *
 * This module is the SCAFFOLD for that gate. It centralizes "is this org/user
 * allowed to transact yet?" so individual bind/deploy/submit handlers call ONE
 * function instead of each re-implementing the checks. Full enforcement across
 * every action is tracked in the onboarding epic; today it returns a structured
 * decision the callers can begin consulting.
 */

export type TransactionKind = 'bind' | 'deploy-capital' | 'submit-risk';

export type GateReasonCode =
  | 'ok'
  | 'kyc-incomplete'
  | 'kyb-incomplete'
  | 'subscription-required'
  | 'trial-expired';

export interface GateDecision {
  allowed: boolean;
  reasons: GateReasonCode[];
  /** Where the UI should send the user to clear the block. */
  remediationStep: 'kyc' | 'billing' | null;
}

/**
 * Evaluate whether a user/org may perform a transaction. Best-effort and
 * non-throwing: a lookup failure degrades to "blocked, complete verification"
 * rather than silently allowing a transaction.
 *
 * NOTE: this is the deferred-compliance scaffold. The individual checks below are
 * deliberately conservative placeholders; wiring it into every bind/deploy/submit
 * handler (and the KYB document/liveness collection it points at) is the larger
 * follow-up in the onboarding epic. It is exported and unit-testable now so the
 * enforcement points can adopt it incrementally.
 */
export async function evaluateTransactionGate(params: {
  userId: number;
  organizationId: number | null;
  kind: TransactionKind;
}): Promise<GateDecision> {
  const reasons: GateReasonCode[] = [];

  try {
    // 1. Active or trialing subscription required to transact.
    const subscription = await Subscription.findOne({
      where: { userId: params.userId },
      order: [['createdAt', 'DESC']],
    });
    if (!subscription) {
      reasons.push('subscription-required');
    } else if (subscription.status === 'trialing') {
      const end = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : null;
      if (end !== null && end < gateNow()) reasons.push('trial-expired');
    } else if (subscription.status !== 'active') {
      reasons.push('subscription-required');
    }

    // 2. KYC must be cleared for capital deployment (investor profiles carry it).
    if (params.kind === 'deploy-capital') {
      const profile = await InvestorProfile.findOne({ where: { userId: params.userId } });
      if (!profile || profile.kycStatus !== 'verified') {
        reasons.push('kyc-incomplete');
      }
    }

    // TODO(onboarding-epic): KYB completeness for the organization (documents,
    // UBO, registry verification) once the deferred KYB collection is built.
  } catch {
    reasons.push('kyb-incomplete');
  }

  const blocking = reasons.filter((r) => r !== 'ok');
  const remediationStep = blocking.some((r) => r === 'kyc-incomplete' || r === 'kyb-incomplete')
    ? 'kyc'
    : blocking.length
      ? 'billing'
      : null;

  return {
    allowed: blocking.length === 0,
    reasons: blocking.length ? blocking : ['ok'],
    remediationStep,
  };
}

/**
 * Time source for the gate. Extracted so tests can stamp a deterministic clock;
 * production reads the wall clock.
 */
function gateNow(): number {
  return Date.now();
}
