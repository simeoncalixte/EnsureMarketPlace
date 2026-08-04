# `socialSocket` route

The realtime WebSocket channel for the social network (new messages,
notifications, connection events). The JWT travels as a query param because
browsers cannot set headers on WebSocket upgrades; it is redacted from logs via
the app's logger serializer config. Maintains a heartbeat and registers/
unregisters the socket in the shared registry.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /social/ws` | WebSocket upgrade; authenticates via `?token=` and joins the registry. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring, the WebSocket handler, and the public export (`socialSocketRoute`). |

## Related

- `../../social/realtime/socketRegistry` — `registerSocket`, `unregisterSocket`.
- `../helpers/resolveUser` — `verifyTokenUserId`.
- Registered in `../../app.ts` as `socialSocketRoute`.
