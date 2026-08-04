# `pipeline/classification` route

HTTP entry point for the classification stage. Logic lives in `src/pipeline/classification`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/classification/health` | Liveness probe. |
| `POST /pipeline/classification/process` | Invoke document classification. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `classificationRoute` plugin; delegates to `ClassificationService`. |

Registered in `../../../app.ts` as `classificationRoute` under `/api`.
