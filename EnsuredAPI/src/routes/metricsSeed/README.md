# `metricsSeed` route

Seeds synthetic time-series capital-exposure `RiskMetric` rows for deals, deriving
a base exposure from tranche capital and applying a seasonal + noise pattern.

## Endpoints

| Method & path                    | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `POST /seed/exposure-time-series` | Generate synthetic capital-exposure metrics; 201.       |

## Files

| File          | Concern                                                          |
| ------------- | --------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export (`metricsSeedRoute`).     |
| `handlers.ts` | Request handler: transactional synthetic metric generation.    |
| `schemas.ts`  | Fastify JSON schema for the seed endpoint.                       |
| `service.ts`  | Pure helpers — `toNumber` and the `ACTIVE_DEAL_STATUSES` set.   |

## Related

- `../../db/models` — `Deal`, `Tranche`, `RiskMetric`.
- `../../config/database` — `getSequelize` for the seeding transaction.
- Registered in `../../app.ts` as `metricsSeedRoute` under the `/api` prefix.
