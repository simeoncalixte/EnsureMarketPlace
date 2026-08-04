# `pipeline/storageSearch` route

HTTP entry point for the storage-and-search stage. Logic lives in `src/pipeline/storageSearch`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/storage-search/health` | Liveness probe. |
| `POST /pipeline/storage-search/process` | Run storage and search ingestion. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `storageSearchRoute` plugin; delegates to `StorageSearchService`. |

Registered in `../../../app.ts` as `storageSearchRoute` under `/api`.
