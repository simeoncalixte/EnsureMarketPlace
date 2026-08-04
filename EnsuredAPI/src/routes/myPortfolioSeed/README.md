# `myPortfolioSeed` route

Seeds a mock portfolio (deal + tranches + tokens, with policies + capital) for the
calling investor user, resolved from their Bearer token — bootstrapping any
missing investor/insurer/admin scaffolding inside a single transaction.

## Endpoints

| Method & path             | Purpose                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| `POST /seed/my-portfolio` | Seed a portfolio for the authenticated caller; 201, 401 if unauth. |

## Files

| File          | Concern                                                          |
| ------------- | --------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export (`myPortfolioSeedRoute`). |
| `handlers.ts` | Request handler: token auth + transactional portfolio seeding. |
| `schemas.ts`  | Fastify JSON schema for the seed endpoint.                       |

## Related

- `../../services/PolicySeedService`, `../../services/CapitalSeedService` — seeding logic.
- `../../db/models` — identity/capital models; `../../config/database` for `getSequelize`.
- Registered in `../../app.ts` as `myPortfolioSeedRoute` under the `/api` prefix.
