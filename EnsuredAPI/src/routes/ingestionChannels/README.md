# `ingestionChannels` route

CRUD + operations surface for ingestion channels (the tenant's inbound sources):
AMQP/RabbitMQ connection testing and queue management, plus the email connector's
OAuth consent/callback and background-polling lifecycle.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /ingestion-channels` | List a tenant's channels (with submission counts). |
| `POST /ingestion-channels` | Create a channel. |
| `GET /ingestion-channels/:id` | Get a channel by id. |
| `GET /ingestion-channels/:id/submissions` | List submissions a channel produced. |
| `PATCH /ingestion-channels/:id` | Update a channel (enabled/status/meta/config). |
| `DELETE /ingestion-channels/:id` | Delete a channel. |
| `POST /ingestion-channels/test-connection` | Test an AMQP connection from posted config. |
| `POST /ingestion-channels/:id/test-connection` | Test a saved channel's connection (email or AMQP). |
| `GET /ingestion-channels/:id/queues` | List queues via the RabbitMQ Management API. |
| `POST /ingestion-channels/:id/queues/create` | Create a queue and persist its name. |
| `DELETE /ingestion-channels/:id/queues/:queueName` | Delete a queue from the broker. |
| `PATCH /ingestion-channels/:id/queues/:queueName/config` | Save per-queue config. |
| `PATCH /ingestion-channels/:id/queues-config` | Remove a queue name from config. |
| `POST /ingestion-channels/:id/queues` | Get queue stats for a saved channel. |
| `GET /ingestion-channels/:id/oauth/start` | Start the email OAuth consent flow. |
| `GET /ingestion-channels/oauth/callback` | OAuth redirect callback (token exchange). |
| `POST /ingestion-channels/:id/poll/start` | Start background email polling. |
| `POST /ingestion-channels/:id/poll/stop` | Stop background email polling. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring — all route definitions, schemas, and inline AMQP/management-API logic; the public export. |
| `service.ts` | Module-level helpers: email-channel type set, shared `IngestionService`, `isEmailChannel`, OAuth redirect URI. |
| `ingestionChannels.test.ts` | Integration coverage for channel CRUD + queue ops. |
| `ingestionChannelsOauth.test.ts` | Integration coverage for the OAuth + polling lifecycle. |

## Related

- `../../lib/org` — `resolveOrganizationIdFromRequest` for tenant scoping.
- `../../pipeline/ingestion/service` — `IngestionService` poller registry.
- `../../pipeline/connectors/email` — provider/credential/OAuth helpers.
- Registered in `../../app.ts` as `ingestionChannelsRoute` under the `/api` prefix.
