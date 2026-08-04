import { FastifyPluginAsync } from 'fastify';
import { checkoutHandler, plansHandler } from './handlers';
import { CheckoutBody } from './service';

/**
 * Subscription billing — the public pricing catalog and the post-registration
 * checkout that collects the subscription fee (real Stripe or the deterministic
 * simulated charge when STRIPE_SECRET_KEY is unset). See ./README.md for the
 * concern map.
 */
export const subscriptionsRoute: FastifyPluginAsync = async (app) => {
  app.get('/subscriptions/plans', plansHandler);
  app.post<{ Body: CheckoutBody }>('/subscriptions/checkout', checkoutHandler);
};

export default subscriptionsRoute;
