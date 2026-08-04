# `geolocation` route

One HTTP surface over the `GeolocationService`: forward/reverse geocoding,
boundary-shape fetch, and address verification. Local-dataset-first with cached
remote results; each response's `source` says where the answer came from
(`'local'`, a remote provider, or `'none'`). Read-only and unauthenticated by
design.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /geolocation/search` | Free-text forward search → ranked candidates. |
| `POST /geolocation/structured` | Structured (component-wise) forward search. |
| `GET /geolocation/reverse` | Reverse geocode a `lat`/`lng` point. |
| `GET /geolocation/shape` | Boundary shape for a country/state/city → one GeoJSON Feature. |
| `POST /geolocation/verify` | Verify/validate an address. |
| `GET /geolocation/autocomplete` | Prefix/typeahead suggestions. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`geolocationRoute`); owns the per-registration `GeolocationService` instance. |
| `handlers.ts` | Request handlers, built bound to the shared service instance. |
| `service.ts` | Pure request-shaping helpers (`badRequest`, `clampLimit`). |

## Related

- `../../pipeline/geolocation/service` — `GeolocationService`.
- `../../pipeline/connectors/geolocation/GeolocationProvider` — `ShapeRef`, `StructuredQuery`.
- Registered in `../../app.ts` as `geolocationRoute` under the `/api` prefix.
