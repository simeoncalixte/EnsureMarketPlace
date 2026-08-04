# `routes/helpers`

Cross-route helpers shared by more than one route directory. This is **not** a
route — it has no Fastify plugin and is not registered in `app.ts`.

## Files

| File             | Concern                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `resolveUser.ts` | Resolve the authenticated `User` from a Bearer token (sends the 4xx envelope and returns `null` on failure), plus `verifyTokenUserId` for raw-token contexts (e.g. websocket query params). |

Imported from a route directory as `../helpers/resolveUser`.
