# `underwritingSubmissions` route

The live underwriting submissions board (backend-configured lanes/cards) plus the
quote → bind → policy lifecycle actions: compute/price, pre-bind compliance
screening, quote issue/transition, bind, and policy endorse/list.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /underwriting/submissions` | Live submissions dashboard for the org. |
| `PUT /underwriting/submissions/config` | Update the org's board configuration. |
| `PATCH /underwriting/submissions/:id/status` | Advance a submission's stage (compliance-gated for bind-ready statuses). |
| `POST /underwriting/submissions/:id/compute` | Run the credibility-weighted compute spine. |
| `POST /underwriting/submissions/:id/compliance` | Run pre-bind compliance screening. |
| `POST /underwriting/submissions/:id/quote` | Issue / re-issue a quote (compliance-gated). |
| `PATCH /underwriting/submissions/:id/quote` | Transition a quote (accept/decline/withdraw). |
| `POST /underwriting/submissions/:id/bind` | Bind an accepted quote into a Policy. |
| `POST /underwriting/policies/:id/endorse` | Append a PolicyVersion (endorse/cancel/renew). |
| `GET /underwriting/policies` | List the org's in-force book. |
| `GET /underwriting/policies/:id` | A policy with its version history + exposures. |

The bind/quote compliance gate is enforced server-side: a submission cannot enter
a quote/bind-ready status unless its latest `ComplianceClearance` is `passed`.

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring — all route definitions, schemas, and the public export. |
| `service.ts` | Board config defaults + normalization, dashboard/board building (`buildDashboard`), compliance-gate helpers, and `policySummary`. |
| `types.ts` | Local board / dashboard DTO types. |
| `underwritingSubmissions.test.ts` | Direct route coverage. |
| `pipelineBoard.test.ts` | Board coverage built via `buildApp`. |
| `pipelinePlayback.test.ts` | Playback coverage built via `buildApp`. |

## Related

- `../../lib/boardFormat` — currency/relative-time/priority formatters.
- `../../lib/org` — `resolveOrganizationIdFromRequest` for tenant scoping.
- `../../pipeline/compute/service`, `../../pipeline/preBindCompliance/service` — compute + compliance.
- `../../underwriting/quote/service`, `../../underwriting/policy/service` — quote/bind/endorse logic.
- Registered in `../../app.ts` as `underwritingSubmissionsRoute` under the `/api` prefix.
