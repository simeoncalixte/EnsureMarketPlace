# `worldcitiesSeed` route

Admin trigger for the worldcities import — streams SimpleMaps' worldcities.csv
(~1.94M rows) into `stateProvinces` + `cities` as a long-running, resumable,
idempotent background job.

## Endpoints

| Method & path                | Purpose                                                          |
| ---------------------------- | --------------------------------------------------------------- |
| `GET /seed/worldcities/status` | Import run state + live `stateProvinces`/`cities` row counts.  |
| `POST /seed/worldcities`       | Start the streaming import in the background (fire-and-forget). |
| `POST /seed/worldcities/stop`  | Cooperatively stop a running import at the next batch boundary. |

## Files

| File          | Concern                                                          |
| ------------- | ---------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public exports (named + default).        |
| `handlers.ts` | Request handlers — status query, start, and stop.                |

## Related

- `../../db/worldcities-import-runner` — the background import runner + run state.
- `../../config/database` — Sequelize instance used for the count query.
- Registered in `../../app.ts` as `worldcitiesSeedRoute` under the `/api` prefix.
