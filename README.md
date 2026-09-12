# EnsureMarketPlace

This repository coordinates eight independent private repositories through Git submodules. Each directory has its own commits and remote; `.claude` and shared project files remain here. The earlier monorepo history is preserved in this parent repository. Child repositories start from the code snapshot at the split.

| Directory | Repository |
| --- | --- |
| `EnsuredAPI` | [EnsuredAPI](https://github.com/simeoncalixte/EnsuredAPI) |
| `EnsuredAuth` | [EnsuredAuth](https://github.com/simeoncalixte/EnsuredAuth) |
| `EnsuredKYC` | [EnsuredKYC](https://github.com/simeoncalixte/EnsuredKYC) |
| `EnsuredXDS` | [EnsuredXDS](https://github.com/simeoncalixte/EnsuredXDS) |
| `EnsuredUI` | [EnsuredUI](https://github.com/simeoncalixte/EnsuredUI) |
| `SubmissionUI` | [SubmissionUI](https://github.com/simeoncalixte/SubmissionUI) |
| `docs` | [EnsureMarketPlace-docs](https://github.com/simeoncalixte/EnsureMarketPlace-docs) |
| `pdfs` | [EnsureMarketPlace-pdfs](https://github.com/simeoncalixte/EnsureMarketPlace-pdfs) |

## Clone and work with the services

```sh
git clone --recurse-submodules https://github.com/simeoncalixte/EnsureMarketPlace.git
cd EnsureMarketPlace
```

For an existing checkout after pulling the conversion:

```sh
git submodule update --init --recursive
```

Commit and push service changes from within that service's directory, then commit and push its updated submodule reference in this parent. Submodule updates check out the parent's pinned commits; switch to `main` inside a child before developing there. Keep the sibling directory layout for the shared Docker configuration and cross-service integration tests.

Each application manages its own dependencies. Local environment files, dependencies, generated output and uploaded private documents are not versioned. Follow each application's README to install and configure it after cloning.


## Authentication

The reusable account interface lives in [EnsuredAuthUI](EnsuredAuthUI/README.md) and is mounted inside EnsuredUI. [EnsuredAuth](EnsuredAuth/README.md) owns registration, email/password login, social sign-in and session verification. Start its gateway alongside the API and UI, and use `http://localhost:3002` as the public entry point. The API requires `AUTH_GATEWAY_SECRET`; legacy browser JWTs are no longer accepted. See the authentication guide for provider setup and linking existing marketplace users.

## KYC

[EnsuredKYC](EnsuredKYC/README.md) owns KYC submissions, private evidence, review decisions and verification status in a separate service/database. Swagger is at `http://localhost:3002/kyc/docs/`. The marketplace consumes status only. See the service guide for setup, reviewer access and preservation/import of legacy records.

## Shared UI library

[EnsuredXDS](EnsuredXDS/README.md) provides `@ensured/xds`, consumed by EnsuredUI as a sibling package. After initializing submodules, run `npm run setup:ui`, then `npm run start`. Use `npm run build:ui` to build the accounts microfrontend, design system and marketplace, or `npm run storybook:xds` for the shared component catalogue.

## Service discovery and catalog

[EnsuredServices](EnsuredServices/README.md) is the standalone discovery wrapper and service catalog. Run `npm run start:services` and open `http://127.0.0.1:3010` to view configured applications, dependencies, endpoints, and observed health. It supports local health-checked configuration and Consul registrations, with a portable client SDK and an opt-in gateway integration. See its README for access tokens, deployment manifests, and Consul setup.

### Run applications in Docker

Run `npm run docker:services` to build and start Auth, KYC, the gateway, the catalog, and the submission UI/relay in Docker. The helper starts the shared PostgreSQL service and connects the existing marketplace API/UI, Mailpit, and RabbitMQ containers to the `ensured-platform` network. Auth and KYC run their migrations before starting. It expects those dependency containers from the local setup to already exist and starts them if stopped. All managed containers use `unless-stopped` restart policies. Stop any old host-run copies before starting Docker on the same ports.

The catalog remains at `http://127.0.0.1:3010`; the public application gateway is `http://localhost:3002`. Because the catalog now listens on a Docker network, it requires a read token. The helper generates and stores `SERVICES_READ_TOKEN` in the ignored `EnsuredServices/.env`; enter that value in the catalog's access form. Tokens are passed at runtime, never baked into images. Docker catalog endpoints are configured in `EnsuredServices/catalog.docker.json` and use Docker network names. Restart the catalog after editing that manifest.

Use `npm run docker:services -- ps` to inspect the application containers and `npm run docker:services -- logs --tail 50` for logs. The application stack uses the shared database service described below.


### Shared PostgreSQL

Run `npm run docker:database` from the repository root before starting applications or running host migrations. One PostgreSQL 16 service, defined in `docker-compose.database.yml`, exposes **127.0.0.1:5432** and contains three separate databases:

| Application | Database |
| --- | --- |
| Marketplace API | `ensured_marketplace` |
| Auth | `ensured_identity` |
| KYC | `ensured_kyc` |

Host applications use `127.0.0.1:5432`; Docker applications use `postgres:5432` on `ensured-platform`. Local development credentials are `postgres` / `postgres`. Update existing Auth/KYC `.env` database URLs from ports 5433/5434 to 5432. The database helper creates the network and missing databases, including when the marketplace volume already exists. API Compose extends the same PostgreSQL definition and uses the same `ensuredapi` project and `ensuredapi_postgres_data` volume. Run application migrations separately when developing on the host.

For an existing installation with separate identity/KYC containers, migrate before starting the shared stack:

1. Pause Auth, KYC, and the gateway, including any host processes that can write to these databases.
2. Back up all three databases with `pg_dump -Fc`. Store dumps outside version control (`docker-backups/` is ignored).
3. In `ensured-api-postgres`, create `ensured_identity` and `ensured_kyc` only if absent, then restore the matching dumps using `pg_restore --exit-on-error --single-transaction`. Do not overwrite existing destination databases; investigate them first.
4. Compare source and destination table row counts. Stop the old database containers and set their restart policy to `no`. Keep their volumes and backups for rollback.
5. Update host database URLs and run `npm run docker:services`. Verify Auth, KYC, and API health. The helper refuses startup while the legacy host-development database containers are still running.

If you previously used `EnsuredAPI/docker-compose.auth.yml`, its former `identity-db` and `kyc-db` containers also need this migration before using the updated override. Their old volumes are not automatically imported or deleted. Never run `down -v` when you need to retain database data. For rollback before accepting new writes, point Auth/KYC back at the old databases and restart those containers; after new writes, reconcile data before switching back.

## Marketplace microfrontend

[EnsuredMarketplace](EnsuredMarketplace/README.md) owns the TypeScript Marketplace view and shared investor map. EnsuredUI loads its built package and supplies authentication, theme, and Mapbox configuration. `npm run setup:ui` installs and builds the dependencies; `npm run build:ui` builds the host. Use `npm run marketplace:dev` for standalone development, `npm run storybook:marketplace` for stories, and `npm run test:marketplace` for TypeScript and browser interaction checks. See its [implementation review](EnsuredMarketplace/REVIEW.md) for existing product gaps.

## Insurance professional network

[EnsuredNetwork](EnsuredNetwork/README.md) is a separate social application with its own backend/database and an XDS microfrontend embedded at `/network`. Existing identity and gateway services own authentication. Its guide includes live-server Storybook journeys; see its README for isolated test setup and integration secrets.

## Email connectors

[EnsuredEmail](EnsuredEmail/README.md) owns Gmail and Microsoft Graph mailbox access and OAuth exchanges as a separate application. EnsuredAPI discovers `ensured-email` through EnsuredServices and calls it over authenticated HTTP and retains channel state, submission creation, parsing and validation. Configure `SERVICES_REGISTRY_URL`, `SERVICES_READ_TOKEN` (when required by the registry), and the shared `EMAIL_SERVICE_SECRET` before using email channels. See the project README for setup and migration instructions.
