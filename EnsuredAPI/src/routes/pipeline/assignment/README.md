# `pipeline/assignment` route

HTTP entry point for the assignment stage. Logic lives in `src/pipeline/assignment`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/assignment/health` | Liveness probe. |
| `POST /pipeline/assignment/process` | Assign a submission to a department, team, and person by the role that owns its transaction type. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `assignmentRoute` plugin; delegates to `AssignmentService`. |

Registered in `../../../app.ts` as `assignmentRoute` under `/api`.
