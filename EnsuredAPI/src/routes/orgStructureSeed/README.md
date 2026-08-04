# `orgStructureSeed` route

Seeds a full organizational structure (departments + teams) for one organization
— or every organization — and populates it with role-assigned members, optionally
backfilling existing users with a department/team/org assignment.

## Endpoints

| Method & path             | Purpose                                                         |
| ------------------------- | -------------------------------------------------------------- |
| `POST /seed/org-structure` | Seed departments/teams/members; 201, or 422 if no orgs exist. |

## Files

| File          | Concern                                                          |
| ------------- | --------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public exports (named + default `orgStructureSeedRoute`). |
| `handlers.ts` | Request handler: single-org and seed-all branches.              |
| `schemas.ts`  | Fastify JSON schema (incl. the shared `userItem` shape).         |

## Related

- `../../services/OrgStructureSeedService` — seeding logic + `OrgStructureSeedError`.
- Registered in `../../app.ts` as `orgStructureSeedRoute` under the `/api` prefix.
