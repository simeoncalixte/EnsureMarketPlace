# `pipeline` routes

HTTP layer for the document/data ingestion **pipeline stages**. Each subdirectory
is one stage's Fastify plugin — a thin transport wrapper that validates the
request and delegates to the stage's service. **The stage logic itself lives in
`src/pipeline/<stage>/`** (service, agents, persistence); only the route
definition lives here.

All of these plugins are registered in `../../app.ts` under the `/api` prefix, so
every path below is served at `/api/pipeline/<stage>/…`.

Each stage exposes a `GET …/health` probe and a `POST …/process` entry point that
runs the stage over a submission payload. A few stages add read endpoints the
create-coverage UI hydrates from.

## Stages

| Directory | Plugin export | URL namespace (under `/api`) | Stage service |
| --------- | ------------- | ---------------------------- | ------------- |
| `ingestion/` | `ingestionRoute` | `/pipeline/ingestion/*` | `pipeline/ingestion` |
| `ocr/` | `ocrRoute` | `/pipeline/ocr/*` | `pipeline/ocr` |
| `classification/` | `classificationRoute` | `/pipeline/classification/*` | `pipeline/classification` |
| `submissionType/` | `submissionTypeRoute` | `/pipeline/submission-type/*` | `pipeline/submissionType` |
| `assignment/` | `assignmentRoute` | `/pipeline/assignment/*` | `pipeline/assignment` |
| `extraction/` | `extractionRoute` | `/pipeline/extraction/*` | `pipeline/extraction` |
| `insuredSubject/` | `insuredSubjectRoute` | `/pipeline/insured-subject/*` | `pipeline/insuredSubject` |
| `locationDiscovery/` | `locationDiscoveryRoute` | `/pipeline/location-discovery/*` | `pipeline/locationDiscovery` |
| `normalization/` | `normalizationRoute` | `/pipeline/normalization/*` | `pipeline/normalization` |
| `validation/` | `validationRoute` | `/pipeline/validation/*` | `pipeline/validation` |
| `schemaGeneration/` | `schemaGenerationRoute` | `/pipeline/schemaGeneration/*` | `pipeline/schemaGeneration` |
| `workflow/` | `workflowRoute` | `/pipeline/workflow/*` | `pipeline/workflow` |
| `storageSearch/` | `storageSearchRoute` | `/pipeline/storage-search/*` | `pipeline/storageSearch` |

## Why the split

Routes are the API's transport seam; stage services are domain logic reused by
the orchestrator and tests. Keeping the plugins here (next to every other route)
and the services in `src/pipeline/` keeps each concern in one place — see the
top-level `src/routes` convention and the per-stage READMEs.
