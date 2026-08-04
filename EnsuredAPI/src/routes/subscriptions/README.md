# `subscriptions` route

Subscription billing: the public pricing catalog the registration UI shows
before a token exists, and the authenticated checkout that collects the
subscription fee (real Stripe, or a deterministic simulated charge when
`STRIPE_SECRET_KEY` is unset).

## Endpoints

| Method & path                   | Purpose                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `GET /subscriptions/plans`      | Public pricing catalog (cents + pre-formatted display amounts).          |
| `POST /subscriptions/checkout`  | Charge the just-registered user; idempotent on an active subscription.   |

## Files

| File          | Concern                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export.                                              |
| `handlers.ts` | The `plans` and `checkout` request handlers.                                       |
| `service.ts`  | Bearer-token auth, plan/subscription serialization, USD formatting, `CheckoutBody`. |
| `subscriptions.test.ts` | Simulated-Stripe integration coverage of plans + checkout.               |

## Related

- `../../billing/plans` — plan catalog, lookups, billing-interval guard.
- `../../billing/stripe.service` — `createSubscription`, `PaymentError`.
- `../../db/models` — `Subscription`, `User`.
- Registered in `../../app.ts` as `subscriptionsRoute` under the `/api` prefix.
