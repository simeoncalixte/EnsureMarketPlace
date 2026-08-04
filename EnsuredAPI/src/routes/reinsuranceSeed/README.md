# `reinsuranceSeed` route

Admin seed endpoint that builds an end-to-end reinsurance package flow (identity,
policies/exposures, SPV, tranches, commitments, claims) in one call.

## Endpoints

| Method & path           | Purpose                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| `POST /seed/reinsurance` | Seed a full reinsurance package graph; returns the batch summary.   |

## Files

| File          | Concern                                                          |
| ------------- | ---------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export (`reinsuranceSeedRoute`).  |
| `handlers.ts` | Request handler delegating to `ReinsuranceSeedService`.          |
| `schemas.ts`  | Fastify JSON body schema for the seed request.                  |
| `reinsuranceSeed.test.ts` | Integration coverage for `POST /api/seed/reinsurance`.  |

## Related

- `../../services/ReinsuranceSeedService` — performs the actual seeding.
- Registered in `../../app.ts` as `reinsuranceSeedRoute` under the `/api` prefix.
- Imported by sibling tests (investors/marketplace) via `../reinsuranceSeed`.
