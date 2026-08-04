# `pipeline/extraction` route

HTTP entry point for the extraction stage. Logic lives in `src/pipeline/extraction`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/extraction/health` | Liveness probe. |
| `POST /pipeline/extraction/process` | Run data extraction. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `extractionRoute` plugin; delegates to `ExtractionService`. |

Registered in `../../../app.ts` as `extractionRoute` under `/api`.
