# `investors` route

Read-only investor-facing endpoints: resolving a default investor and serving an
investor's deal dashboard / active-deal list.

## Endpoints

| Method & path                                   | Purpose                                                    |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `GET /investors/default`                        | Return a default active investor (id + profile + email).   |
| `GET /investors/:investorUserId/dashboard`      | Backend-calculated dashboard summary + deals for investor. |
| `GET /investors/:investorUserId/deals/active`   | List active deals applicable to an investor.               |

A non-investor (or unknown) user id yields a `404 investor_not_found`.

## Files

| File          | Concern                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring — maps paths to handlers and is the export.      |
| `handlers.ts` | Request handlers + the `InvestorDealsService` instance they delegate to. |
| `schemas.ts`  | Fastify JSON schemas for params/responses (shared deal item shape).   |
| `investors.test.ts` | Integration coverage over the three endpoints (seeds via reinsurance route). |

## Related

- `../../services/InvestorDealsService` — all business/data logic + `InvestorNotFoundError`.
- `../reinsuranceSeed` — sibling route used by the test to seed deals/investors.
- Registered in `../../app.ts` as `investorsRoute` under the `/api` prefix.
