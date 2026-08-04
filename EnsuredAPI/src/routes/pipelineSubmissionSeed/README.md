# `pipelineSubmissionSeed` route

Admin seed endpoints that populate the calling user's organization with incoming
submissions (and an optional simulated pipeline history) so the ingestion pipeline
and Pipeline Processes board can be exercised manually.

## Endpoints

| Method & path                   | Purpose                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| `POST /seed/pipeline-submissions` | Seed incoming submissions (scenario/transaction-type controllable) for the caller's org. |
| `POST /seed/pipeline-flow`        | Simulate a multi-stage pipeline history for the org's existing submissions. |

Both endpoints resolve the caller from their Bearer token and require the user to
belong to an organization.

## Files

| File          | Concern                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `index.ts`    | Fastify plugin wiring + public exports (named + default).                |
| `handlers.ts` | Request handlers — token auth, org resolution, delegation to the service. |
| `schemas.ts`  | Fastify JSON body/response schemas for both endpoints.                   |
| `pipelineSubmissionSeed.test.ts` | Integration coverage for `POST /api/seed/pipeline-submissions`. |

## Related

- `../../services/PipelineSubmissionSeedService` — performs the seeding/simulation.
- `../../services/submissionScenarios` — scenario keys/types.
- `../../db/seed-data/submissionTypeTaxonomy` — submission-type codes for the schema.
- Registered in `../../app.ts` as `pipelineSubmissionSeedRoute` under the `/api` prefix.
