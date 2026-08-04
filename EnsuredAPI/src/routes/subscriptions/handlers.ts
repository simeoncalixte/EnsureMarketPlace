import { FastifyReply, FastifyRequest } from 'fastify';
import { Subscription, User } from '../../db/models';
import {
  BillingInterval,
  SUBSCRIPTION_PLANS,
  getPlanByCode,
  getPlanForRole,
  isBillingInterval,
} from '../../services/billing/plans';
import { PaymentError, createSubscription } from '../../services/billing/stripe.service';
import {
  CheckoutBody,
  authenticate,
  serializePlan,
  serializeSubscription,
} from './service';

// Public pricing catalog — surfaced by the registration UI before the user has a token.
export async function plansHandler(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ plans: SUBSCRIPTION_PLANS.map(serializePlan) });
}

// Collect the subscription fee for the just-registered user.
export async function checkoutHandler(
  request: FastifyRequest<{ Body: CheckoutBody }>,
  reply: FastifyReply,
) {
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
}
