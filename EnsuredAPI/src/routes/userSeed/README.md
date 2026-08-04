# `userSeed` route

Seeds the users table with one user per role plus extra investor users,
resolving each user's organization either from a caller-supplied map or by
auto-looking-up organizations by type.

## Endpoints

| Method & path       | Purpose                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `POST /seed/users`  | Create one user per role + `extraInvestors`; 201, or 422 if no orgs. |

## Files

| File          | Concern                                                          |
| ------------- | --------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export (`userSeedRoute`).        |
| `handlers.ts` | Request handler: org-map resolution/normalization + `UserService`. |
| `schemas.ts`  | Fastify JSON schema for the seed endpoint.                       |
| `userSeed.test.ts` | Integration coverage for the seed endpoint.                |

## Related

- `../../services/UserService` — the user seeding logic.
- `../../db/models/identity.models` — `Organization` lookup for auto-resolve.
- Registered in `../../app.ts` as `userSeedRoute` under the `/api` prefix.
