# `socialWebhooks` route

Inbound webhooks from external messaging providers (Telegram, WhatsApp) plus a
dev-only simulated endpoint. These carry no Bearer token — authenticity comes
from a shared secret in the path (and, for Telegram, an echoed header). Handlers
always return 200 fast so a malformed update can never build a retry storm;
failures are logged.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `POST /social/webhooks/telegram/:webhookSecret` | Telegram inbound update. |
| `POST /social/webhooks/whatsapp/:webhookSecret` | WhatsApp inbound message. |
| `POST /social/webhooks/simulated` | Dev-only stand-in driving the inbound flow. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring, the webhook handlers, and the public export (`socialWebhooksRoutes`). |

## Related

- `../../social/messaging/inbound` — `handleInboundMessage`.
- Registered in `../../app.ts` as `socialWebhooksRoutes`.
