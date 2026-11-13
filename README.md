# Application workspace

This root contains runnable applications and services. Reusable libraries are installed from pinned private-registry packages, not sibling source checkouts. Initialize the remaining submodules and install each application's lockfile with the configured package credential.

Package source development belongs in separate checkouts (locally preserved under `/Users/simeon/Projects/EnsuredPackages`). The removed repositories are the 18 EnsuredPipeline packages, EnsuredConstants, EnsuredXDS, EnsuredAuthUI, EnsuredMarketplace and EnsuredCallGraph. Clone their independent GitHub repositories to change them, run their checks, publish a version, then update application manifests and lockfiles. Do not use npm links or file dependencies in application delivery.

`npm run packages:verify` verifies installed API/UI/Network internal packages, including nested versions, against registry tarballs and lockfile integrity. It catches modified files, missing/extra files and source links. `npm run component-policy:check` compares published Constants/XDS policy and application catalogs/adapters. `npm run pipeline:verify` runs both. These checks require registry credentials and network/cache access; they do not claim to compare against unpublished library source. `npm run pipeline:test-gate` runs verifier regressions. `npm run component-policy:sync` regenerates application catalogs from the installed registry. Theme sync reads the installed XDS CSS.

Application-owned services remain: EnsuredAPI, EnsuredUI, EnsuredAuth/gateway, EnsuredKYC, EnsuredNetwork (including its service-owned frontend), EnsuredServices, SubmissionUI/relay, EnsuredEmail, EnsuredLogistics and EnsuredSubmissionFeedback. Docs and PDF assets remain. Published UI libraries can be developed separately without being part of the application workspace.

Historical source extraction tooling and fixtures remain for audit provenance. `scripts/pipeline-packages.mjs` and `scripts/audit-pipeline-extraction.mjs` require explicit `PACKAGE_SOURCE_ROOT`; they are not application build gates. Package-specific screenshot tools require an explicit external Storybook path. The historical source-parity test fixtures remain regression coverage for the comparison primitives.

---

# EnsureMarketPlace

This repository coordinates eight independent private repositories through Git submodules. Each directory has its own commits and remote; `.claude` and shared project files remain here. The earlier monorepo history is preserved in this parent repository. Child repositories start from the code snapshot at the split.

| Directory | Repository |
| --- | --- |
| `EnsuredAPI` | [EnsuredAPI](https://github.com/simeoncalixte/EnsuredAPI) |
| `EnsuredAuth` | [EnsuredAuth](https://github.com/simeoncalixte/EnsuredAuth) |
| `EnsuredKYC` | [EnsuredKYC](https://github.com/simeoncalixte/EnsuredKYC) |
| Published XDS library | [Independent repository](https://github.com/simeoncalixte/EnsuredXDS) |
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

The reusable account interface lives in [EnsuredAuthUI](https://github.com/simeoncalixte/EnsuredAuthUI) and is mounted inside EnsuredUI. [EnsuredAuth](EnsuredAuth/README.md) owns registration, email/password login, social sign-in and session verification. Start its gateway alongside the API and UI, and use `http://localhost:3002` as the public entry point. The API requires `AUTH_GATEWAY_SECRET`; legacy browser JWTs are no longer accepted. See the authentication guide for provider setup and linking existing marketplace users.

## KYC

[EnsuredKYC](EnsuredKYC/README.md) owns KYC submissions, private evidence, review decisions and verification status in a separate service/database. Swagger is at `http://localhost:3002/kyc/docs/`. The marketplace consumes status only. See the service guide for setup, reviewer access and preservation/import of legacy records.

## Shared UI library

[EnsuredXDS](https://github.com/simeoncalixte/EnsuredXDS) provides `@ensured/xds`, consumed through its pinned private-registry npm alias. After initializing submodules, run `npm run setup:ui`, then `npm run start`. Use `npm run build:ui` to build the host using its published dependencies, or run Storybook in the independent XDS checkout for the shared component catalogue.

## Service discovery and catalog

[EnsuredServices](EnsuredServices/README.md) is the standalone discovery wrapper and service catalog. Run `npm run start:services` and open `http://127.0.0.1:3010` to view configured applications, dependencies, endpoints, and observed health. It supports local health-checked configuration and Consul registrations, with a portable client SDK and an opt-in gateway integration. See its README for access tokens, deployment manifests, and Consul setup.

### Run applications in Docker

Run `npm run docker:services` to build and start Auth, KYC, the gateway, the catalog, and the submission UI/relay in Docker. The helper starts the shared PostgreSQL service and connects the existing marketplace API/UI, Mailpit, and RabbitMQ containers to the `ensured-platform` network. Auth and KYC run their migrations before starting. It expects those dependency containers from the local setup to already exist and starts them if stopped. All managed containers use `unless-stopped` restart policies. Stop any old host-run copies before starting Docker on the same ports.

The catalog remains at `http://127.0.0.1:3010`; the public application gateway is `http://localhost:3002`. Because the catalog now listens on a Docker network, it requires a read token. The helper generates and stores `SERVICES_READ_TOKEN` in the ignored `EnsuredServices/.env`; enter that value in the catalog's access form. Tokens are passed at runtime, never baked into images. Docker catalog endpoints are configured in `EnsuredServices/catalog.docker.json` and use Docker network names. Restart the catalog after editing that manifest.

Use `npm run docker:services -- ps` to inspect the application containers and `npm run docker:services -- logs --tail 50` for logs. The application stack uses the shared database service described below.


### Shared PostgreSQL

Run `npm run docker:database` from the repository root before starting applications or running host migrations. One PostgreSQL 16 service, defined in `docker-compose.database.yml`, exposes **127.0.0.1:5432**. The helper reads each immediate package's own `.env` (directories with `package.json`); exported shell variables take precedence. New packages need no database registration list.

Database provisioning is implemented in `scripts/database-config.mjs`. It discovers `DATABASE_URL`, `DB_URL`, `*_DATABASE_URL`, `*_DB_URL`, and `DB_NAME`/`DATABASE_NAME` with optional prefixes and matching `HOST`, `PORT`, `USER`, and `PASSWORD` fields. URLs take precedence over split settings for the same prefix. Use `postgres://` or `postgresql://` with an explicit user and database; URL-encode special characters in credentials and names. Query options such as `sslmode` are preserved, but connection-coordinate query overrides are rejected. Conflicting owners or credentials fail before provisioning. Service-local declarations supersede duplicate prefixed settings left in the former shared API file.

Only targets on the shared server's local aliases at port 5432 are provisioned. Remote servers and other ports are reported and skipped. Missing login roles and databases are created; existing data, ownership, and passwords are never changed. Existing-role credentials must match the service configuration. Database names are safely quoted, and repeated setup is idempotent. The initial Marketplace default remains `ensured_marketplace`; other databases come from configuration. Application tables still require the owning package's migrations.

Host applications use `127.0.0.1:5432`; Docker applications use `postgres:5432` on `ensured-platform`. `docker:services` translates local Auth/KYC URLs from their package files for Docker without changing credentials, database names, or query options. Local development administrator credentials are `postgres` / `postgres`. The helper handles both fresh and existing volumes; run it even when using a Compose compatibility entry point. It refuses startup while legacy host-development database containers are still running.

Run `node --test scripts/test/database-config.test.mjs` for configuration tests. The optional isolated PostgreSQL test uses a temporary container with no published ports or persistent volume: `DATABASE_DOCKER_TEST=1 node --test scripts/test/database-provision.integration.test.mjs`.

For an existing installation with separate identity/KYC containers, migrate before starting the shared stack:

1. Pause Auth, KYC, and the gateway, including any host processes that can write to these databases.
2. Back up all three databases with `pg_dump -Fc`. Store dumps outside version control (`docker-backups/` is ignored).
3. In `ensured-api-postgres`, create `ensured_identity` and `ensured_kyc` only if absent, then restore the matching dumps using `pg_restore --exit-on-error --single-transaction`. Do not overwrite existing destination databases; investigate them first.
4. Compare source and destination table row counts. Stop the old database containers and set their restart policy to `no`. Keep their volumes and backups for rollback.
5. Update host database URLs and run `npm run docker:services`. Verify Auth, KYC, and API health. The helper refuses startup while the legacy host-development database containers are still running.

If you previously used `EnsuredAPI/docker-compose.auth.yml`, its former `identity-db` and `kyc-db` containers also need this migration before using the updated override. Their old volumes are not automatically imported or deleted. Never run `down -v` when you need to retain database data. For rollback before accepting new writes, point Auth/KYC back at the old databases and restart those containers; after new writes, reconcile data before switching back.

## Marketplace microfrontend

[EnsuredMarketplace](https://github.com/simeoncalixte/EnsuredMarketplace) owns the TypeScript Marketplace view and shared investor map. EnsuredUI loads its built package and supplies authentication, theme, and Mapbox configuration. `npm run setup:ui` installs and builds the dependencies; `npm run build:ui` builds the host. Run standalone development, stories and library interaction checks in the independent Marketplace checkout. See its [implementation review](https://github.com/simeoncalixte/EnsuredMarketplace/blob/main/REVIEW.md) for existing product gaps.

## Insurance professional network

[EnsuredNetwork](EnsuredNetwork/README.md) is a separate social application with its own backend/database and an XDS microfrontend embedded at `/network`. Existing identity and gateway services own authentication. Its guide includes live-server Storybook journeys; see its README for isolated test setup and integration secrets.

## Email connectors

[EnsuredEmail](EnsuredEmail/README.md) owns Gmail and Microsoft Graph mailbox access and OAuth exchanges as a separate application. EnsuredAPI discovers `ensured-email` through EnsuredServices and calls it over authenticated HTTP and retains channel state, submission creation, parsing and validation. Configure `SERVICES_REGISTRY_URL`, `SERVICES_READ_TOKEN` (when required by the registry), and the shared `EMAIL_SERVICE_SECRET` before using email channels. See the project README for setup and migration instructions.

## Standalone pipeline stage repositories

The pipeline consists of 18 versioned npm packages configured for GitHub Packages, with shared persistence/provider support. Their source repositories are developed separately; application consumers install the published versions with `npm ci`. Run `npm run pipeline:verify` to check installed artifacts. See [PIPELINE_PACKAGES.md](PIPELINE_PACKAGES.md) for repository links, standalone bootstrap instructions, and migration boundaries.

### Package environments

Each package owns its `.env` configuration. Start packages through their npm scripts (which run in the package directory); injected shell/container variables take precedence. The shared pipeline configuration loader reads the consuming package's `.env`, with `ENSURED_ENV_FILE` available for an explicit override. Vite reads the frontend package's environment and exposes only `VITE_` settings; never use that prefix for secrets.

When moving away from the former shared `EnsuredAPI/.env`, put each service's settings in that service's `.env` and frontend settings in the corresponding frontend package. Matching integration secrets must be configured in both participating services. Package loaders no longer fall back to the API file. Restart applications after configuration changes. Docker applications also load their package-owned files.

### Submission feedback service

`EnsuredSubmissionFeedback/` is an independent local Git repository and HTTP service for field feedback, immutable submission versions and restores. See [its README](EnsuredSubmissionFeedback/README.md). Run it with `docker-compose.feedback.yml`; EnsuredAPI forwards authorized requests using `SUBMISSION_FEEDBACK_URL` and `SUBMISSION_FEEDBACK_TOKEN`. The service owns its PostgreSQL schema and does not mutate pipeline artifacts.
