# `auth` route

Session authentication for the API: verifying credentials and resolving the
current user from a Bearer token.

## Endpoints

| Method & path     | Purpose                                                      |
| ----------------- | ----------------------------------------------------------- |
| `POST /auth/login` | Email + password sign-in; returns an auth token + profile. |
| `GET /auth/me`     | Resolve the caller from their Bearer token; returns profile. |

`/auth/login` returns one generic `invalid_credentials` error for both unknown
emails and bad passwords so it never reveals which emails are registered.

## Files

| File          | Concern                                                            |
| ------------- | ----------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring — maps paths to handlers and is the export.  |
| `handlers.ts` | Request handlers (`loginHandler`, `meHandler`) and JWT decoding.   |
| `auth.test.ts` | Integration coverage for `GET /auth/me`.                         |

## Related

- `../../auth/password` — scrypt hashing / `verifyPassword`.
- `../../auth/provisioning` — `signUserToken`, shared with registration.
- Registered in `../../app.ts` as `authRoute` under the `/api` prefix.
