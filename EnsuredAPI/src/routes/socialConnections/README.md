# `socialConnections` route

The connection graph: requesting, accepting, declining and removing connections
between users, plus listing them and their counts. Notifications and realtime
events are emitted on each state change.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `POST /social/connections` | Send a connection request (reuses a previously declined pair). |
| `POST /social/connections/:id/accept` | Accept a pending request (addressee only). |
| `POST /social/connections/:id/decline` | Decline a pending request (addressee only). |
| `DELETE /social/connections/:id` | Remove a connection (either participant). |
| `GET /social/connections` | List connections by status filter. |
| `GET /social/connections/counts` | Accepted + pending-incoming counts. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`socialConnectionsRoutes`). |
| `handlers.ts` | The `socialConnectionsRoutes` plugin and its request handlers. |

## Related

- `../../db/models/social.models` — `Connection`.
- `../../db/models/identity.models` — `User`, `Notification`.
- `../../social/graph` — `findPairConnection`.
- `../../social/realtime/socketRegistry` — `broadcastToUser`.
- `../socialProfiles` — `profileSummariesFor`.
- `../helpers/resolveUser` — Bearer-token auth.
- Registered in `../../app.ts` as `socialConnectionsRoutes`.
