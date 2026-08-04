# `partners` route

Distribution-partner writes. Reads go through the unified field-options entity API
(`/field-options/entity/partner`); this route owns creating, removing, and claiming
partner stubs.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /organizations/:id/partners` | List partner stubs (mirrors the field-options read). |
| `POST /organizations/:id/partners` | Create a partner stub (org or user). |
| `DELETE /organizations/:id/partners/:value` | Remove a partner stub by `org:<id>`/`user:<id>` value. |
| `POST /partners/claim` | Claim a partner stub by token. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`partnersRoute`); handlers backed by `partnerService`. |

## Related

- `../../services/PartnerService` — `partnerService`, `PartnerKind`.
- Registered in `../../app.ts` as `partnersRoute` under the `/api` prefix.
