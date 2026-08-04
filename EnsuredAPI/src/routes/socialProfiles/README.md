# `socialProfiles` route

Public-facing professional identity for the social network. Deliberately
cross-tenant: profiles, the people directory, coworkers and connection lists
skip tenant scoping so insurers, reinsurers and brokers can connect across
organizations.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /social/profiles/:userId` | A user's profile plus the viewer's connection status. |
| `PUT /social/profiles/me` | Update the caller's own headline/bio/avatar/location. |
| `GET /social/people` | Search/paginate the cross-tenant people directory. |
| `GET /social/profiles/:userId/coworkers` | Active users in the same organization. |
| `GET /social/profiles/:userId/connections` | A user's accepted connections. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public exports (`socialProfilesRoutes`, `profileSummariesFor`, `ProfileSummary`). |
| `handlers.ts` | The `socialProfilesRoutes` plugin and its request handlers. |
| `service.ts` | `profileSummariesFor` — batch-resolves users into profile summaries. |
| `types.ts` | The `ProfileSummary` interface. |

## Related

- `../../db/models/social.models` — `UserProfile`.
- `../../db/models/identity.models` — `User`, `Organization`.
- `../../social/graph` — connection lookups.
- `../helpers/resolveUser` — Bearer-token auth.
- Consumed by sibling routes `../socialConnections`, `../socialFeed`, `../socialMessages`.
- Registered in `../../app.ts` as `socialProfilesRoutes`.
