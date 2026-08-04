# `crestaZones` route

Serves real CRESTA zones as GeoJSON and exposes the resumable CRESTA import job.
Read-only zone data plus admin-triggered seeding. Read-only and unauthenticated
by design.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /cresta-zones` | Zones as a GeoJSON FeatureCollection; defaults to the `state_province` layer. Filter with `?iso3=XXX` and `?level=city\|state_province`. |
| `GET /cresta-zones/catalog` | Per-country import progress (status + counts) from `crestaImportProgress`. |
| `POST /cresta-zones/import` | Start the throttled, resumable CRESTA import as a background job. |
| `POST /cresta-zones/import/stop` | Cooperatively stop a running import at the next page boundary. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`crestaZonesRoute`). |
| `handlers.ts` | Request handlers — zone GeoJSON shaping and import lifecycle. |

## Related

- `../../db/models` — `CrestaZone`.
- `../../db/models/cresta.models` — `CrestaLevel`.
- `../../db/cresta-import-runner` — background import state + lifecycle.
- `../../config/database` — `getSequelize` for the catalog query.
- Registered in `../../app.ts` as `crestaZonesRoute` under the `/api` prefix.
