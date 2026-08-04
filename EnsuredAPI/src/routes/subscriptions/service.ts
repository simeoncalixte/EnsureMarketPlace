import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { Subscription } from '../../db/models';
import { SUBSCRIPTION_PLANS } from '../../services/billing/plans';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

export type CheckoutBody = {
  planCode?: string;
  role?: string;
  billingInterval?: string;
  paymentMethodId?: string;
};

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Public-facing shape of a plan — prices are echoed as both cents (canonical) and
// a pre-formatted display amount so the UI doesn't re-implement currency math.
export function serializePlan(plan: (typeof SUBSCRIPTION_PLANS)[number]) {
  return {
    code: plan.code,
    role: plan.role,
    name: plan.name,
    tagline: plan.tagline,
    currency: plan.currency,
    features: plan.features,
    highlight: Boolean(plan.highlight),
    pricing: {
      monthly: { amountCents: plan.pricing.monthly, display: formatUsd(plan.pricing.monthly) },
      annual: { amountCents: plan.pricing.annual, display: formatUsd(plan.pricing.annual) },
    },
  };
}

export function serializeSubscription(subscription: Subscription) {
  return {
    id: subscription.id,
    planCode: subscription.planCode,
    role: subscription.role,
    billingInterval: subscription.billingInterval,
    amountCents: subscription.amountCents,
    amountDisplay: formatUsd(subscription.amountCents),
    currency: subscription.currency,
    status: subscription.status,
    provider: subscription.provider,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

export function authenticate(request: FastifyRequest, reply: FastifyReply): number | null {
  const authHeader = request.headers.authorization as string | undefined;
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    reply.code(401).send({ error: 'missing_authorization' });
    return null;
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as Record<string, unknown>;
    const userId = Number(payload?.userId ?? payload?.id ?? NaN);
    if (!Number.isFinite(userId)) {
      reply.code(401).send({ error: 'invalid_token' });
      return null;
    }
    return userId;
  } catch {
    reply.code(401).send({ error: 'invalid_token' });
    return null;
  }
}
