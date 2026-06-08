// Stripe subscription service.
//
// Mirrors the codebase's "real provider when configured, deterministic fallback
// otherwise" pattern (see the LLM judgment stages / cost guard in test/setup-env.ts):
//   - When STRIPE_SECRET_KEY is set, calls the real Stripe API to create a
//     customer + subscription and returns the live identifiers + client secret.
//   - When it is NOT set (local dev, the default test suite, Storybook CI without
//     credentials), it runs a deterministic *simulated* charge so the whole
//     registration → payment flow is exercisable end-to-end for free.
//
// Card handling: the frontend submits a Stripe PaymentMethod id (test mode uses
// Stripe's published test tokens such as `pm_card_visa`). In production the UI
// should tokenize the card with Stripe.js Elements to obtain that id — raw PAN
// never reaches this server.

import { randomUUID } from 'crypto';
import type Stripe from 'stripe';
import {
  BillingInterval,
  SubscriptionPlan,
  isFreePlan,
  priceForPlan,
} from './plans';

export type SubscriptionStatus = 'active' | 'trialing' | 'incomplete' | 'past_due';

export interface SubscriptionResult {
  provider: 'stripe' | 'simulated';
  status: SubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  /** Present when the payment requires client-side confirmation (SCA / 3DS). */
  clientSecret: string | null;
  amountCents: number;
  currency: string;
  currentPeriodEnd: Date;
}

export class PaymentError extends Error {
  declineCode: string;
  constructor(message: string, declineCode = 'card_declined') {
    super(message);
    this.name = 'PaymentError';
    this.declineCode = declineCode;
  }
}

export interface CreateSubscriptionInput {
  plan: SubscriptionPlan;
  interval: BillingInterval;
  /** Stripe PaymentMethod id (e.g. `pm_card_visa` in test mode). */
  paymentMethodId: string;
  customer: {
    email: string;
    name?: string | null;
    userId: number;
    organizationId?: number | null;
  };
}

// Stripe's published test PaymentMethod tokens that simulate a decline, so the
// simulated path produces the same failure shape as the live one.
const DECLINING_TEST_METHODS = new Set([
  'pm_card_chargeDeclined',
  'pm_card_chargeDeclinedInsufficientFunds',
  'pm_card_visaChargeDeclined',
]);

function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim());
}

function billingPeriodEnd(interval: BillingInterval): Date {
  const end = new Date();
  if (interval === 'annual') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/**
 * Create (or simulate) a subscription for a newly-registered user.
 * Free plans short-circuit to an active subscription with no payment instrument.
 */
export async function createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
  const { plan, interval, paymentMethodId, customer } = input;
  const amountCents = priceForPlan(plan, interval);
  const currency = plan.currency;

  if (isFreePlan(plan)) {
    return {
      provider: isStripeConfigured() ? 'stripe' : 'simulated',
      status: 'active',
      stripeCustomerId: `cus_free_${randomUUID().slice(0, 12)}`,
      stripeSubscriptionId: `sub_free_${randomUUID().slice(0, 12)}`,
      clientSecret: null,
      amountCents,
      currency,
      currentPeriodEnd: billingPeriodEnd(interval),
    };
  }

  if (!paymentMethodId || !paymentMethodId.trim()) {
    throw new PaymentError('A payment method is required for this plan.', 'missing_payment_method');
  }

  if (!isStripeConfigured()) {
    return simulateSubscription({ plan, interval, paymentMethodId, amountCents, currency });
  }

  return createStripeSubscription({ plan, interval, paymentMethodId, amountCents, currency, customer });
}

function simulateSubscription(args: {
  plan: SubscriptionPlan;
  interval: BillingInterval;
  paymentMethodId: string;
  amountCents: number;
  currency: string;
}): SubscriptionResult {
  if (DECLINING_TEST_METHODS.has(args.paymentMethodId)) {
    throw new PaymentError('Your card was declined.', 'card_declined');
  }

  return {
    provider: 'simulated',
    status: 'active',
    stripeCustomerId: `cus_sim_${randomUUID().slice(0, 12)}`,
    stripeSubscriptionId: `sub_sim_${randomUUID().slice(0, 12)}`,
    clientSecret: null,
    amountCents: args.amountCents,
    currency: args.currency,
    currentPeriodEnd: billingPeriodEnd(args.interval),
  };
}

let stripeClient: Stripe | null = null;

async function getStripeClient(): Promise<Stripe> {
  if (stripeClient) return stripeClient;
  // Lazy import so the dependency is only loaded when a key is configured —
  // keeps the simulated path (and the default test suite) free of the SDK.
  const { default: StripeSDK } = await import('stripe');
  stripeClient = new StripeSDK(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
  return stripeClient;
}

async function createStripeSubscription(args: {
  plan: SubscriptionPlan;
  interval: BillingInterval;
  paymentMethodId: string;
  amountCents: number;
  currency: string;
  customer: CreateSubscriptionInput['customer'];
}): Promise<SubscriptionResult> {
  const stripe = await getStripeClient();
  const { plan, interval, paymentMethodId, amountCents, currency, customer } = args;

  try {
    const stripeCustomer = await stripe.customers.create({
      email: customer.email,
      name: customer.name ?? undefined,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
      metadata: {
        userId: String(customer.userId),
        organizationId: customer.organizationId != null ? String(customer.organizationId) : '',
        planCode: plan.code,
      },
    });

    const product = await stripe.products.create({
      name: `Sovereign Re — ${plan.name}`,
      metadata: { planCode: plan.code },
    });

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [
        {
          price_data: {
            currency,
            product: product.id,
            unit_amount: amountCents,
            recurring: { interval: interval === 'annual' ? 'year' : 'month' },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { planCode: plan.code, billingInterval: interval, userId: String(customer.userId) },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;

    return {
      provider: 'stripe',
      status: normalizeStatus(subscription.status),
      stripeCustomerId: stripeCustomer.id,
      stripeSubscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
      amountCents,
      currency,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    if (stripeError?.type === 'StripeCardError') {
      throw new PaymentError(stripeError.message, stripeError.decline_code ?? 'card_declined');
    }
    throw error;
  }
}

function normalizeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
      return status;
    default:
      // incomplete / incomplete_expired / unpaid / canceled / paused all map to
      // "incomplete" for our purposes — the client must confirm or retry payment.
      return 'incomplete';
  }
}

export const __testing = { isStripeConfigured, billingPeriodEnd };
