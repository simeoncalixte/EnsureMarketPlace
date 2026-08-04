# `impersonation` route

Admin impersonation: mints an auth token for a target user so an operator can
act as them. The returned token is used by the frontend as the user's auth
token.

## Endpoints

| Method & path                  | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `POST /admin/impersonate/:id`  | Mint an impersonation token for the target user `:id`.   |

> Note: impersonation is not currently gated by an admin/impersonator id header.

## Files

| File       | Concern                                            |
| ---------- | -------------------------------------------------- |
| `index.ts` | Fastify plugin wiring, the handler, and the export. |

## Related

- `../../services/impersonationService` — `createImpersonationToken`.
- `../../db/models/identity.models` — `User` lookup of the target.
- Registered in `../../app.ts` as `impersonationRoute`.
