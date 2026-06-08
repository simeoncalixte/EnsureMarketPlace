import fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { initTestDb, truncateTables } from '../helpers/db';
import { Organization, Subscription, User } from '../../src/db/models';
import { subscriptionsRoute } from '../../src/routes/subscriptions';

// The default test environment leaves STRIPE_SECRET_KEY unset, so the checkout
// runs the deterministic SIMULATED charge — no billable Stripe call is made.

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

describe('subscriptions route', () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(async () => {
    await initTestDb();
    app = fastify();
    app.register(subscriptionsRoute, { prefix: '/api' });
    await app.ready();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('subscriptions', 'users', 'organizations');
  });

  async function createUserWithToken(role: 'investor' | 'insurer' | 'analyst' | 'admin' = 'investor') {
    const user = await User.create({
      email: `partner+${Date.now()}@sovereignre.test`,
      passwordHash: 'x',
      firstName: 'Morgan',
      lastName: 'Riskwell',
      role,
      organizationId: null,
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    return { user, token };
  }

  describe('GET /api/subscriptions/plans', () => {
    it('returns the full pricing catalog with cents and display amounts', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/subscriptions/plans' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);

      expect(Array.isArray(body.plans)).toBe(true);
      const capitalPartner = body.plans.find((p: any) => p.code === 'capital-partner');
      expect(capitalPartner).toBeTruthy();
      expect(capitalPartner.role).toBe('institutional');
      expect(capitalPartner.pricing.monthly.amountCents).toBe(250_000);
      expect(capitalPartner.pricing.monthly.display).toBe('$2,500');
      expect(capitalPartner.pricing.annual.amountCents).toBe(2_500_000);
    });
  });

  describe('POST /api/subscriptions/checkout', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/checkout',
        payload: { planCode: 'capital-partner', billingInterval: 'monthly', paymentMethodId: 'pm_card_visa' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('creates a simulated subscription and persists it', async () => {
      const { user, token } = await createUserWithToken('investor');
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/checkout',
        headers: { Authorization: `Bearer ${token}` },
        payload: { planCode: 'capital-partner', billingInterval: 'annual', paymentMethodId: 'pm_card_visa' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.subscription.status).toBe('active');
      expect(body.subscription.provider).toBe('simulated');
      expect(body.subscription.planCode).toBe('capital-partner');
      expect(body.subscription.billingInterval).toBe('annual');
      expect(body.subscription.amountCents).toBe(2_500_000);
      expect(body.subscription.amountDisplay).toBe('$25,000');

      const stored = await Subscription.findOne({ where: { userId: user.id } });
      expect(stored).toBeTruthy();
      expect(stored?.stripeSubscriptionId).toMatch(/^sub_sim_/);
      expect(stored?.stripeCustomerId).toMatch(/^cus_sim_/);
    });

    it('resolves the plan from the role when no planCode is given', async () => {
      const { token } = await createUserWithToken('insurer');
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/checkout',
        headers: { Authorization: `Bearer ${token}` },
        payload: { role: 'insurer', billingInterval: 'monthly', paymentMethodId: 'pm_card_visa' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.subscription.planCode).toBe('cedent-access');
      expect(body.subscription.amountCents).toBe(150_000);
    });

    it('returns 402 when the test card declines', async () => {
      const { token } = await createUserWithToken('investor');
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/checkout',
        headers: { Authorization: `Bearer ${token}` },
        payload: { planCode: 'capital-partner', billingInterval: 'monthly', paymentMethodId: 'pm_card_chargeDeclined' },
      });
      expect(res.statusCode).toBe(402);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('payment_failed');
    });

    it('activates a free admin plan without a payment method', async () => {
      const { token } = await createUserWithToken('admin');
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/checkout',
        headers: { Authorization: `Bearer ${token}` },
        payload: { planCode: 'platform-operations', billingInterval: 'monthly' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.subscription.status).toBe('active');
      expect(body.subscription.amountCents).toBe(0);
    });

    it('is idempotent — a second checkout reuses the active subscription', async () => {
      const { user, token } = await createUserWithToken('investor');
      const payload = { planCode: 'capital-partner', billingInterval: 'monthly', paymentMethodId: 'pm_card_visa' };

      const first = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/checkout',
        headers: { Authorization: `Bearer ${token}` },
        payload,
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: 'POST',
        url: '/api/subscriptions/checkout',
        headers: { Authorization: `Bearer ${token}` },
        payload,
      });
      expect(second.statusCode).toBe(200);
      expect(JSON.parse(second.payload).reused).toBe(true);

      const count = await Subscription.count({ where: { userId: user.id } });
      expect(count).toBe(1);
    });
  });
});
