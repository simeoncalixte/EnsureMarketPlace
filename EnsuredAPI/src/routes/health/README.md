# `health` route

Liveness probe for the API. No auth, no dependencies.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /health` | Returns `{ status: 'ok' }`. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`healthRoute`); inline JSON response schema. |

## Related

- Registered in `../../app.ts` as `healthRoute` under the `/api` prefix.
