# `registration` route

The lean "Acquire" step of onboarding: create a real account from role + email +
password (or social) with minimal friction, link an organization, and start a
TRIAL subscription. Heavy KYC/document/payment collection is deferred to the
transaction gate.

## Endpoints

| Method & path                  | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `POST /registration/complete`  | Provision account + org + trial; returns an auth token and profile.  |

`admin` is never self-registerable; passwords are stored as real scrypt hashes;
no collect-then-discard PII is required.

## Files

| File          | Concern                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export.                                       |
| `handlers.ts` | The `POST /registration/complete` handler (validation + provisioning).      |
| `service.ts`  | Payload types, email/organization normalization, password-length constant.  |
| `registration.test.ts` | Integration coverage of the lean-onboarding flow.                  |

## Related

- `../../auth/provisioning` — `provisionAccount`, `signUserToken`, self-service role list (shared with `../oauth`).
- `../../auth/password` — scrypt `hashPassword`.
- `../../onboarding/transactionGate` — where deferred compliance/payment is later enforced.
- Registered in `../../app.ts` as `registrationRoute` under the `/api` prefix.
