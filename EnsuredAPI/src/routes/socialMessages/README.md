# `socialMessages` route

Direct messaging between connected users: conversations, messages, and sharing
submissions/files. Sharing a submission records an explicit, auditable
`SubmissionShare` grant; the shared-submission view is the only route that
honors those grants — all other pipeline/underwriting routes stay tenant-scoped.
Messages mirror to the recipient's external channel (WhatsApp/Telegram) when
verified.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /social/conversations` | List the caller's conversations with unread counts. |
| `POST /social/conversations` | Open (or reuse) a direct thread with a connection. |
| `GET /social/conversations/:id/messages` | Paginated message history. |
| `POST /social/conversations/:id/messages` | Send a text/share/attachment message. |
| `POST /social/conversations/:id/read` | Mark a conversation read. |
| `GET /social/shared-submissions/:id` | Read-only view of a shared submission. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public exports (`socialMessagesRoutes`, `canAccessSubmission`). |
| `handlers.ts` | The `socialMessagesRoutes` plugin and its request handlers. |
| `service.ts` | Access check (`canAccessSubmission`), participant lookups, and message serialization. |

## Related

- `../../db/models/social.models` — `Conversation`, `ConversationParticipant`, `SocialMessage`, `SubmissionShare`.
- `../../db/models/underwriting.models` — `Submission`; `../../db/models/ingestion.models` — `SubmissionFile`.
- `../../social/graph` — `areConnected`.
- `../../social/messaging/deliverMessage` — external delivery.
- `../../social/realtime/socketRegistry` — `broadcastToUser`.
- `../socialProfiles` — `profileSummariesFor`.
- `../helpers/resolveUser` — Bearer-token auth.
- Registered in `../../app.ts` as `socialMessagesRoutes`.
