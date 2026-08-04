# `organizations` route

CRUD over the `Organization` model, with capitalized-path aliases (`/Organizations`)
kept alongside the canonical lowercase paths for backward compatibility.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /organizations` (+ `/Organizations`) | List all organizations. |
| `POST /organizations` (+ `/Organizations`) | Create an organization. |
| `GET /organizations/:id` (+ `/Organizations/:id`) | Fetch one organization by id. |
| `PUT /organizations/:id` (+ `/Organizations/:id`) | Update an organization. |
| `DELETE /organizations/:id` (+ `/Organizations/:id`) | Delete an organization. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`organizationsRoute`). |
| `handlers.ts` | Request handlers backed by `OrganizationService`. |
| `organizations.test.ts` | Integration coverage for the capitalized route aliases. |

## Related

- `../../services/OrganizationService` — data access for organizations.
- Registered in `../../app.ts` as `organizationsRoute` under the `/api` prefix.
