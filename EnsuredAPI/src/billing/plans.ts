// Subscription plan catalog — the single source of truth for what Sovereign Re
// charges to onboard each class of participant.
//
// Pricing rationale (institutional reinsurance / ILS capital marketplace, B2B SaaS):
//   - Seats are organizations, not consumers, so prices sit in the enterprise band.
//   - Each role gets the plan matched to the value it extracts from the platform:
//       capital providers (deal flow + allocation) pay the most, claims/distribution
//       desks (operational access) the least, and the platform's own admins are free.
//   - Annual billing is priced at 10x the monthly rate (two months free, ~17% off),
//     the standard SaaS annual-commit incentive.
// Amounts are in the smallest currency unit (USD cents) to stay aligned with Stripe.

export type BillingInterval = 'monthly' | 'annual';

export const planRoles = [
  'institutional',
  'insurer',
  'underwriter',
  'claims',
  'broker',
  'admin',
] as const;

export type PlanRole = (typeof planRoles)[number];

export interface SubscriptionPlan {
  /** Stable identifier used by Stripe products/prices and stored on the subscription. */
  code: string;
  role: PlanRole;
  name: string;
  tagline: string;
  currency: 'usd';
  /** Recurring price in cents, keyed by billing interval. */
  pricing: Record<BillingInterval, number>;
  features: string[];
  /** Marketing emphasis flag for the UI. */
  highlight?: boolean;
}

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  {
    code: 'capital-partner',
    role: 'institutional',
    name: 'Capital Partner',
    tagline: 'Institutional capital deployment across the live deal book.',
    currency: 'usd',
    pricing: { monthly: 250_000, annual: 2_500_000 },
    highlight: true,
    features: [
      'Full marketplace deal flow & allocation tooling',
      'Portfolio analytics and exposure modelling',
      'Priority access to oversubscribed tranches',
      'Dedicated capital onboarding desk',
    ],
  },
  {
    code: 'cedent-access',
    role: 'insurer',
    name: 'Cedent Access',
    tagline: 'Cede risk and place programs with the capital network.',
    currency: 'usd',
    pricing: { monthly: 150_000, annual: 1_500_000 },
    features: [
      'Unlimited submission intake & AI pipeline processing',
      'Placement to the institutional capital network',
      'Treaty & facultative program structuring',
      'Bordereaux and settlement reporting',
    ],
  },
  {
    code: 'underwriting-syndicate',
    role: 'underwriter',
    name: 'Underwriting Syndicate',
    tagline: 'Assume risk with full underwriting and pricing controls.',
    currency: 'usd',
    pricing: { monthly: 190_000, annual: 1_900_000 },
    features: [
      'Appetite-driven submission triage',
      'Pricing models with versioned audit trail',
      'Line-size and aggregate exposure governance',
      'Bind authority workflow',
    ],
  },
  {
    code: 'distribution-desk',
    role: 'broker',
    name: 'Distribution Desk',
    tagline: 'Broker and distribute risk into the marketplace.',
    currency: 'usd',
    pricing: { monthly: 90_000, annual: 900_000 },
    features: [
      'Multi-market submission routing',
      'Quote comparison & client packets',
      'Commission tracking',
      'White-label client portal',
    ],
  },
  {
    code: 'claims-operations',
    role: 'claims',
    name: 'Claims Operations',
    tagline: 'Adjudicate and settle claims against bound programs.',
    currency: 'usd',
    pricing: { monthly: 75_000, annual: 750_000 },
    features: [
      'Claims intake & adjudication workflow',
      'Parametric trigger monitoring',
      'Payout calculation & ledger reconciliation',
      'Document and evidence vault',
    ],
  },
  {
    code: 'platform-operations',
    role: 'admin',
    name: 'Platform Operations',
    tagline: 'Internal platform administration and UBO review.',
    currency: 'usd',
    pricing: { monthly: 0, annual: 0 },
    features: [
      'Tenant & user administration',
      'UBO / KYC review queues',
      'Audit log and compliance exports',
    ],
  },
];

const PLAN_BY_ROLE = new Map<PlanRole, SubscriptionPlan>(
  SUBSCRIPTION_PLANS.map((plan) => [plan.role, plan]),
);
const PLAN_BY_CODE = new Map<string, SubscriptionPlan>(
  SUBSCRIPTION_PLANS.map((plan) => [plan.code, plan]),
);

export function getPlanForRole(role: string | null | undefined): SubscriptionPlan | undefined {
  if (!role) return undefined;
  return PLAN_BY_ROLE.get(role as PlanRole);
}

export function getPlanByCode(code: string | null | undefined): SubscriptionPlan | undefined {
  if (!code) return undefined;
  return PLAN_BY_CODE.get(code);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'monthly' || value === 'annual';
}

/** Recurring price (in cents) for the given plan + interval. */
export function priceForPlan(plan: SubscriptionPlan, interval: BillingInterval): number {
  return plan.pricing[interval];
}

/** True when the plan is free (no payment instrument required to subscribe). */
export function isFreePlan(plan: SubscriptionPlan): boolean {
  return plan.pricing.monthly === 0 && plan.pricing.annual === 0;
}
