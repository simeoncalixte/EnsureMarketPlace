# `users` route

CRUD over the `User` model, backed by `UserService`.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /users` | List all users. |
| `POST /users` | Create a user. |
| `GET /users/:id` | Fetch one user by id. |
| `PUT /users/:id` | Update a user. |
| `DELETE /users/:id` | Delete a user. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`usersRoute`); handlers backed by `UserService`. |

## Related

- `../../services/UserService` — data access for users.
- Registered in `../../app.ts` as `usersRoute` under the `/api` prefix.
