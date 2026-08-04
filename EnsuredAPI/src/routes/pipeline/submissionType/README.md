# `pipeline/submissionType` route

HTTP entry point for the submission-type stage. Logic lives in `src/pipeline/submissionType`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/submission-type/health` | Liveness probe. |
| `POST /pipeline/submission-type/process` | Determine the transaction type (new business, renewal, endorsement, claim, treaty, facultative …). |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `submissionTypeRoute` plugin; delegates to `SubmissionTypeService`. |

Registered in `../../../app.ts` as `submissionTypeRoute` under `/api`.
