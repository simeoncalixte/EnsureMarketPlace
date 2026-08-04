# `ingestionChannelSeed` route

Admin seed endpoint that creates one ingestion channel per current channel config
and the submissions each produced for the insurer organization.

## Endpoints

| Method & path                  | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `POST /seed/ingestion-channels` | Seed ingestion channels + their submissions; returns summary. |

## Files

| File       | Concern                                                          |
| ---------- | ---------------------------------------------------------------- |
| `index.ts` | Fastify plugin wiring + public exports (named + default).        |

## Related

- `../../services/ChannelSeedService` — performs the actual seeding.
- Registered in `../../app.ts` as `ingestionChannelSeedRoute` under the `/api` prefix.
