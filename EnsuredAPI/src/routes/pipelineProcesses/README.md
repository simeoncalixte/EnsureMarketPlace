# `pipelineProcesses` route

The pipeline processing surface: the Kanban board / Sankey flow over in-flight
submissions, manual stage advance / re-run, replayable run + agent-activity
history, submission file previews, and per-organization lifecycle subscriptions.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/processes` | List generated process transformation reports. |
| `GET /pipeline/processes/board` | Active submissions grouped into processing stages (optionally `?type=`). |
| `GET /pipeline/processes/flow` | Forward stage-transition counts (Sankey flow). |
| `POST /pipeline/processes/submissions/:id/advance` | Run the next stage for a submission. |
| `POST /pipeline/processes/submissions/:id/rerun` | Re-run a stage (defaults to current/failed). |
| `GET /pipeline/processes/submissions/:id/runs` | Replayable run + stage-execution history. |
| `GET /pipeline/processes/submissions/:id/agent-activity` | The LLM-call transcript for a submission. |
| `GET /pipeline/processes/artifacts/:artifactId` | Fetch a single captured stage artifact. |
| `GET /pipeline/processes/submissions/:id/files` | List submission files + OCR text previews. |
| `GET /pipeline/processes/files/:fileId/content` | Stream a submission file inline. |
| `GET /pipeline/processes/subscriptions` | List the org's lifecycle event subscriptions. |
| `POST /pipeline/processes/subscriptions` | Subscribe/unsubscribe to a lifecycle event. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring (route definitions + schemas) and public export. |
| `service.ts` | Pure helpers: report normalization, file IO / MIME, OCR previews, auth resolution, subscription serialization. |
| `types.ts` | Local report / subscription / route-option types. |
| `pipelineProcesses.test.ts` | Integration coverage for the route. |

## Related

- `../../pipeline/board/service` — board/flow query projections.
- `../../pipeline/commands/service` — stage advance/re-run commands.
- `../../pipeline/playback/service` — run history, agent activity, artifacts.
- `../../pipeline/operations/catalog` — canonical process execution order.
- `../../pipeline/connectors/s3` — `getS3Object` for s3:// file content.
- Registered in `../../app.ts` as `pipelineProcessesRoute` under the `/api` prefix.
