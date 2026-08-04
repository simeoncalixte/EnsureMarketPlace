# `navigation` route

Server-authoritative navigation for the current session: the UI renders exactly
what this returns, so the menu — and the set of links a user can click — is
governed by their role on the server, not by trusted client state.

## Endpoints

| Method & path     | Purpose                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `GET /navigation` | Resolve the caller from their Bearer token; return their role nav tree. |

## Files

| File          | Concern                                                              |
| ------------- | ------------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public export.                              |
| `handlers.ts` | Bearer-token user resolution and the navigation payload handler.    |
| `navigation.test.ts` | Catalog invariants + `GET /api/navigation` role-scoping coverage. |

## Related

- `../../navigation/catalog` — `buildNavigationForRole`, `homePathForRole`, the backing catalog.
- `../../db/models/identity.models` — `User` for session resolution.
- Registered in `../../app.ts` as `navigationRoute` under the `/api` prefix.
