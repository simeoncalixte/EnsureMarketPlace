# `pipeline/validation` route

HTTP entry point for the validation stage. Logic lives in `src/pipeline/validation`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/validation/health` | Liveness probe. |
| `POST /pipeline/validation/process` | Run validation & QC. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `validationRoute` plugin; delegates to `ValidationService`. |

Registered in `../../../app.ts` as `validationRoute` under `/api`.
