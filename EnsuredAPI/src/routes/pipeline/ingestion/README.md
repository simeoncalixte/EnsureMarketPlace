# `pipeline/ingestion` route

HTTP entry point for the ingestion stage. Logic lives in `src/pipeline/ingestion`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/ingestion/health` | Liveness probe. |
| `POST /pipeline/ingestion/process` | Invoke ingestion processing for a submission. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `ingestionRoute` plugin; delegates to `IngestionService`. |

Registered in `../../../app.ts` as `ingestionRoute` under `/api`.
