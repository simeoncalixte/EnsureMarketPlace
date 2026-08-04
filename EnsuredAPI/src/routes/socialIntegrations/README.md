# `socialIntegrations` route

Per-user external messaging integrations (WhatsApp/Telegram). Lets a user start
a verification handshake, list their integrations (with config redacted to
display-safe hints), and remove them. The inbound verification itself is handled
by the webhook routes.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /social/integrations` | List the caller's integrations (redacted). |
| `POST /social/integrations` | Provision/refresh an integration + verification code. |
| `DELETE /social/integrations/:id` | Remove an integration the caller owns. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`socialIntegrationsRoutes`). |
| `handlers.ts` | The `socialIntegrationsRoutes` plugin, its handlers, and the `redact` view helper. |

## Related

- `../../db/models/social.models` — `UserMessagingIntegration`, `messagingProviders`.
- `../../social/messaging/providers/selectMessagingProvider` — `defaultMessagingProviders`.
- `../helpers/resolveUser` — Bearer-token auth.
- Registered in `../../app.ts` as `socialIntegrationsRoutes`.
