// Subscription billing API — requests under `/api/subscriptions`.
import { getJson, postJson } from './client';

export type BillingInterval = 'monthly' | 'annual';

export type PlanPrice = { amountCents: number; display: string };

export type SubscriptionPlanDTO = {
  code: string;
  role: string;
  name: string;
  tagline: string;
  currency: string;
  features: string[];
  highlight: boolean;
  pricing: Record<BillingInterval, PlanPrice>;
};

export type SubscriptionDTO = {
  id: number;
  planCode: string;
  role: string;
  billingInterval: BillingInterval;
  amountCents: number;
  amountDisplay: string;
  currency: string;
  status: 'active' | 'trialing' | 'incomplete' | 'past_due' | 'canceled';
  provider: 'stripe' | 'simulated';
  currentPeriodEnd: string | null;
};

export type CheckoutResponse = {
  subscription: SubscriptionDTO;
  clientSecret?: string | null;
  reused?: boolean;
};

/** GET /api/subscriptions/plans — public pricing catalog. */
export function getSubscriptionPlans(): Promise<{ plans: SubscriptionPlanDTO[] }> {
  return getJson('/api/subscriptions/plans', { useAuth: false });
}

/**
 * POST /api/subscriptions/checkout — charge the registration subscription fee.
 * The auth token is passed explicitly because, during registration, it has not
 * yet been committed to local storage (committing it would flip the app into the
 * authenticated state and skip this paywall step).
 */
export function checkoutSubscription(
  body: { planCode: string; billingInterval: BillingInterval; paymentMethodId?: string },
  authToken: string,
): Promise<CheckoutResponse> {
  return postJson('/api/subscriptions/checkout', body, {
    useAuth: false,
    headers: { Authorization: `Bearer ${authToken}` },
  });
}

// Stripe's published test cards mapped to their canonical test PaymentMethod
// tokens. In production the UI would tokenize the entered card with Stripe.js
// Elements to obtain a real `pm_...` id (raw PAN never touches our servers);
// in test/demo mode these fixed tokens drive the same Stripe code paths
// deterministically — including the decline tokens for the failure flow.
const TEST_CARD_TO_PAYMENT_METHOD: Record<string, string> = {
  '4242424242424242': 'pm_card_visa',
  '4000056655665556': 'pm_card_visa', // visa (debit)
  '5555555555554444': 'pm_card_mastercard',
  '2223003122003222': 'pm_card_mastercard',
  '378282246310005': 'pm_card_amex',
  '4000000000000002': 'pm_card_chargeDeclined',
  '4000000000009995': 'pm_card_chargeDeclinedInsufficientFunds',
};

/**
 * Resolve the entered card number to a Stripe test PaymentMethod id.
 * Recognised decline cards return their decline token; any other plausible
 * (13–19 digit) number falls back to `pm_card_visa` so the demo stays usable.
 */
export function resolveTestPaymentMethod(rawCardNumber: string): string | null {
  const digits = rawCardNumber.replace(/\D/g, '');
  if (TEST_CARD_TO_PAYMENT_METHOD[digits]) {
    return TEST_CARD_TO_PAYMENT_METHOD[digits];
  }
  if (digits.length >= 13 && digits.length <= 19) {
    return 'pm_card_visa';
  }
  return null;
}
