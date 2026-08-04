# `analytics` route

Portfolio-level analytics dashboards computed from policies, claims, tranches and
risk metrics. Each endpoint returns real aggregates when data exists and falls
back to deterministic synthetic series otherwise.

## Endpoints

| Method & path                              | Purpose                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `GET /analytics/financial-health`          | Monthly GWP, earned premium, loss ratio, combined ratio.      |
| `GET /analytics/profitability-by-lob`      | Written premium, incurred losses and net per line of business.|
| `GET /analytics/capital-adequacy`          | Monthly solvency ratio: committed capital / VaR95.            |
| `GET /analytics/reinsurance-utilization`   | Retained vs ceded capital by tranche risk level.              |
| `GET /analytics/exposure-concentration`    | Exposure concentration by region × peril type.               |

## Files

| File          | Concern                                                            |
| ------------- | ----------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring — maps paths to handlers and is the export. |
| `handlers.ts` | Per-endpoint request handlers + their Sequelize queries.          |
| `schemas.ts`  | Fastify JSON schema objects per endpoint.                         |
| `service.ts`  | Pure helpers: `earnedInMonth`, `toN`, `pr`, `fmtMoney`.           |

## Related

- `../../db/models` — `Claim`, `Deal`, `RiskMetric`, `RiskPortfolio`, `Policy`, `Tranche`, `TrancheSubscription`.
- Registered in `../../app.ts` as `analyticsRoute` under the `/api` prefix.
