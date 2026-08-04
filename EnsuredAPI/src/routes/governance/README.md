# `governance` route

Governance / Capacity Configuration API — capacity definitions (the spine) plus the
authority levels, referral rules, rule sets, simulations, audit trail, validation
rules, per-location limits, the model field catalog, and seeded option sets layered
on top. All routes are organization-scoped.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET/POST /organizations/:id/governance/capacity-definitions` | List / create capacity definitions. |
| `GET/PUT/DELETE /organizations/:id/governance/capacity-definitions/:defId` | Read / update / delete one definition. |
| `POST .../capacity-definitions/:defId/transition` | Transition a definition's lifecycle state. |
| `POST .../capacity-definitions/:defId/clone` | Clone a definition. |
| `GET/POST .../capacity-definitions/:defId/authority-levels`, `PUT/DELETE .../authority-levels/:rowId` | Authority levels (Section 11). |
| `GET/POST .../capacity-definitions/:defId/referral-rules`, `PUT/DELETE .../referral-rules/:rowId` | Referral rules (Section 14). |
| `GET .../governance/model-catalog` | Dot-notation model field catalog (org-aware). |
| `GET/POST .../capacity-definitions/:defId/rule-sets`, `PUT/DELETE .../rule-sets/:rowId`, `POST .../rule-sets/:rowId/run` | Rules-engine rule sets (Section 15). |
| `GET/POST .../governance/simulations`, `DELETE .../simulations/:simId` | Simulations (Section 18). |
| `GET .../governance/audit` | Audit trail (Section 17). |
| `GET/POST .../capacity-definitions/:defId/validation-rules`, `PUT/DELETE .../validation-rules/:rowId` | Appetite validation rules. |
| `GET/PUT .../capacity-definitions/:defId/location-limits`, `DELETE .../location-limits/:limitId` | Per-location limits (LOB × location). |
| `GET .../governance/capacity-layer` | Capacity utilization map layer. |
| `GET .../governance/option-sets/:key` | Seeded option set (per-org override → global fallback). |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`governanceRoute`); handlers backed by the capacity-governance and location-capacity services. |

## Related

- `../../services/CapacityGovernanceService`, `../../services/modelFieldCatalog`.
- `../../pipeline/validation/ruleSchema` (`RuleValidationError`), `../../pipeline/capacity/locationUtilizationService`, `../../pipeline/schemaGeneration/service` (`loadOptionSet`).
- `../../lib/org` (`resolveOrganizationIdFromRequest`).
- Registered in `../../app.ts` as `governanceRoute` under the `/api` prefix.
