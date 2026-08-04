# `pipeline/normalization` route

HTTP entry point for the normalization stage. Logic lives in `src/pipeline/normalization`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/normalization/health` | Liveness probe. |
| `POST /pipeline/normalization/process` | Run normalization & enrichment. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `normalizationRoute` plugin; delegates to `NormalizationService`. |

Registered in `../../../app.ts` as `normalizationRoute` under `/api`.
