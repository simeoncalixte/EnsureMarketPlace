import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { Subscription, User } from '../db/models';
import {
  BillingInterval,
  SUBSCRIPTION_PLANS,
  getPlanByCode,
  getPlanForRole,
  isBillingInterval,
} from '../billing/plans';
import { PaymentError, createSubscription } from '../billing/stripe.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

type CheckoutBody = {
  planCode?: string;
  role?: string;
  billingInterval?: string;
  paymentMethodId?: string;
};

// Public-facing shape of a plan — prices are echoed as both cents (canonical) and
// a pre-formatted display amount so the UI doesn't re-implement currency math.
function serializePlan(plan: (typeof SUBSCRIPTION_PLANS)[number]) {
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

function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function authenticate(request: FastifyRequest, reply: FastifyReply): number | null {
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

export const subscriptionsRoute: FastifyPluginAsync = async (app) => {
  // Public pricing catalog — surfaced by the registration UI before the user has a token.
  app.get('/subscriptions/plans', async (_req, reply) => {
    return reply.send({ plans: SUBSCRIPTION_PLANS.map(serializePlan) });
  });

  // Collect the subscription fee for the just-registered user.
  app.post<{ Body: CheckoutBody }>('/subscriptions/checkout', async (request, reply) => {
    const userId = authenticate(request, reply);
    if (userId === null) return reply;

    const body = request.body ?? {};
    const interval: BillingInterval = isBillingInterval(body.billingInterval)
      ? body.billingInterval
      : 'monthly';

    const plan = getPlanByCode(body.planCode) ?? getPlanForRole(body.role);
    if (!plan) {
      return reply.code(400).send({ error: 'unknown_plan' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return reply.code(404).send({ error: 'user_not_found' });
    }

    // Idempotency: if this user already has an active subscription, return it
    // rather than charging again (e.g. a double-submit on the registration step).
    const existing = await Subscription.findOne({
      where: { userId, status: 'active' },
      order: [['createdAt', 'DESC']],
    });
    if (existing) {
      return reply.code(200).send({ subscription: serializeSubscription(existing), reused: true });
    }

    try {
      const result = await createSubscription({
        plan,
        interval,
        paymentMethodId: body.paymentMethodId ?? '',
        customer: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          userId: user.id,
          organizationId: user.organizationId,
        },
      });

      const subscription = await Subscription.create({
        userId: user.id,
        organizationId: user.organizationId,
        planCode: plan.code,
        role: plan.role,
        billingInterval: interval,
        amountCents: result.amountCents,
        currency: result.currency,
        status: result.status === 'trialing' ? 'active' : result.status,
        provider: result.provider,
        stripeCustomerId: result.stripeCustomerId,
        stripeSubscriptionId: result.stripeSubscriptionId,
        currentPeriodEnd: result.currentPeriodEnd,
      });

      return reply.code(201).send({
        subscription: serializeSubscription(subscription),
        clientSecret: result.clientSecret,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        return reply.code(402).send({ error: 'payment_failed', message: error.message, declineCode: error.declineCode });
      }
      throw error;
    }
  });
};

function serializeSubscription(subscription: Subscription) {
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

export default subscriptionsRoute;
