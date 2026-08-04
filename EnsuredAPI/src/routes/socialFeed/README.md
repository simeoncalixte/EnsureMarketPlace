# `socialFeed` route

The activity feed: creating, reading, liking and commenting on posts. The feed
shows own posts, connections' posts and anything public, paginated with a keyset
cursor. Likes and comments notify the author in realtime.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /social/feed` | Paginated feed of visible posts (keyset cursor). |
| `POST /social/posts` | Create a post (`public` or `connections` visibility). |
| `DELETE /social/posts/:id` | Soft-delete own post. |
| `POST /social/posts/:id/like` | Like a visible post. |
| `DELETE /social/posts/:id/like` | Unlike a post. |
| `GET /social/posts/:id/comments` | List a post's comments. |
| `POST /social/posts/:id/comments` | Comment on a visible post. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`socialFeedRoutes`). |
| `handlers.ts` | The `socialFeedRoutes` plugin, its handlers, and post-visibility check. |
| `service.ts` | Cursor parsing (`parseCursor`) and post decoration (`decoratePosts`). |

## Related

- `../../db/models/social.models` — `Post`, `PostComment`, `PostLike`.
- `../../social/graph` — `acceptedConnectionUserIds`.
- `../../social/realtime/socketRegistry` — `broadcastToUser`.
- `../socialProfiles` — `profileSummariesFor`.
- `../helpers/resolveUser` — Bearer-token auth.
- Registered in `../../app.ts` as `socialFeedRoutes`.
