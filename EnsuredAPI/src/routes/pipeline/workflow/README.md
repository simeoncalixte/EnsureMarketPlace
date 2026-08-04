# `pipeline/workflow` route

HTTP entry point for the workflow stage. Logic lives in `src/pipeline/workflow`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/workflow/health` | Liveness probe. |
| `POST /pipeline/workflow/process` | Run workflow & routing. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `workflowRoute` plugin; delegates to `WorkflowService`. |

Registered in `../../../app.ts` as `workflowRoute` under `/api`.
