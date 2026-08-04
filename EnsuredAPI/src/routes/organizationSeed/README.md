# `organizationSeed` route

Seeds the organizations table with one organization per type plus a configurable
number of extra investor funds — a dev/test fixture endpoint.

## Endpoints

| Method & path              | Purpose                                                        |
| -------------------------- | ------------------------------------------------------------- |
| `POST /seed/organizations` | Create one org per type plus `extras` investor funds; 201.    |

## Files

| File          | Concern                                                          |
| ------------- | --------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export (`organizationSeedRoute`). |
| `handlers.ts` | Request handler delegating to `OrganizationService`.            |
| `schemas.ts`  | Fastify JSON schema for the seed endpoint.                       |
| `organizationSeed.test.ts` | Integration coverage for the seed endpoint.        |

## Related

- `../../services/OrganizationService` — the seeding logic.
- Registered in `../../app.ts` as `organizationSeedRoute` under the `/api` prefix.
