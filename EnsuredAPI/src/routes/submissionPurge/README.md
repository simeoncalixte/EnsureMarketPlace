# `submissionPurge` route

Destructive admin reset: removes all submissions and the business data derived from
them (pipeline, underwriting, capital markets) while keeping organizations, users
and their profiles. Guarded by an explicit `{ confirm: true }`.

## Endpoints

| Method & path                | Purpose                                                          |
| ---------------------------- | --------------------------------------------------------------- |
| `POST /seed/purge-submissions` | Purge all submission-derived business data (requires confirm). |

## Files

| File          | Concern                                                          |
| ------------- | ---------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public exports (named + default).        |
| `handlers.ts` | Request handler — confirm guard + delegation to the service.     |
| `schemas.ts`  | Fastify JSON body/response schema.                              |
| `purgeSubmissions.test.ts` | Integration coverage for `POST /api/seed/purge-submissions`. |

## Related

- `../../services/SubmissionPurgeService` — performs the actual purge.
- Registered in `../../app.ts` as `submissionPurgeRoute` under the `/api` prefix.
