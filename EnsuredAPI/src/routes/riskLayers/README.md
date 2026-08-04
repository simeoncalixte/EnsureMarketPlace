# `riskLayers` route

Toggleable map overlays that inform underwriting: live catastrophe events and a
static seismic-hazard overlay, both as GeoJSON FeatureCollections. Read-only and
unauthenticated by design (same posture as `/cresta-zones`).

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /risk-layers/active-events` | Live catastrophe feeds (USGS quakes, NOAA NHC cyclones) aggregated with normalised `severity`/`severityLevel`. Cached `max-age=120`. |
| `GET /risk-layers/fault-lines` | GEM Global Active Faults overlay, coloured by net slip rate. Cached `max-age=86400`. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`riskLayersRoute`). |
| `handlers.ts` | Request handlers — query parsing, service calls, cache headers. |

## Related

- `../../services/ActiveEventsService` — `getActiveEvents`, `PerilCode`.
- `../../services/FaultLinesService` — `getFaultLines`.
- `../../db/models/constants` — `perilCodes`.
- Registered in `../../app.ts` as `riskLayersRoute` under the `/api` prefix.
