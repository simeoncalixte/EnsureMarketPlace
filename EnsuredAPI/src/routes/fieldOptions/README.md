# `fieldOptions` route

The single vocabulary the UI's `<DynamicSelect>` speaks for every dynamic
dropdown: tenant-overridable option sets and live org-scoped reference entities
(department / team / user / partner / peril). Org-scoped via the path.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /organizations/:id/field-options/option-set/:key` | Resolve a picklist (global default + tenant overlay). |
| `POST /organizations/:id/field-options/option-set/:key/items` | Add a tenant override item. |
| `DELETE /organizations/:id/field-options/option-set/:key/items/:value` | Remove a tenant override item. |
| `GET /organizations/:id/field-options/entity/:entity` | Live reference rows → `{value, label}` for `department`/`team`/`user`/`partner`/`peril`. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + exports (`fieldOptionsRoute`, named + default). |
| `handlers.ts` | Request handlers, module-level service singletons, and label helpers. |

## Related

- `../../services/FieldOptionsService` — option-set resolve/add/remove.
- `../../services/DepartmentService` — department/team/member entity lookups.
- `../../services/PartnerService` — `partnerService.list`.
- `../../db/models` — `Team`, `User`, `Peril`.
- Registered in `../../app.ts` as `fieldOptionsRoute` under the `/api` prefix.
