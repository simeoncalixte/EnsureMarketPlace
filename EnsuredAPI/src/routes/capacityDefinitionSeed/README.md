# `capacityDefinitionSeed` route

Seeds one active, fully-populated `CapacityDefinition` per organization (matching
the Capacity editor 1:1 plus the enforcement appetite block), so the
ingestion/validation pipeline can be exercised against each org's rules.

## Endpoints

| Method & path                    | Purpose                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `POST /seed/capacity-definitions` | Seed one active definition per org; 201, or 422 if no orgs. |

## Files

| File          | Concern                                                          |
| ------------- | --------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public exports (named + default `capacityDefinitionSeedRoute`). |
| `handlers.ts` | Request handler: org guard, seed call, archetype error mapping. |
| `schemas.ts`  | Fastify JSON schema for the seed endpoint.                       |

## Related

- `../../services/CapacityDefinitionSeedService` — the seeding logic.
- `../../db/models/identity.models` — `Organization` existence guard.
- Registered in `../../app.ts` as `capacityDefinitionSeedRoute` under the `/api` prefix.
