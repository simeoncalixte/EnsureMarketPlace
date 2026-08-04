# `pipeline/locationDiscovery` route

HTTP entry point for the location-discovery stage. Logic lives in `src/pipeline/locationDiscovery`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/location-discovery/health` | Liveness probe. |
| `POST /pipeline/location-discovery/process` | Discover and normalize insured-subject locations. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `locationDiscoveryRoute` plugin; delegates to `LocationDiscoveryService`. |

Registered in `../../../app.ts` as `locationDiscoveryRoute` under `/api`.
