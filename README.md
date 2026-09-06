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

Account registration, email/password login, social sign-in and session verification now live in [EnsuredAuth](EnsuredAuth/README.md). Start its gateway alongside the API and UI, and use `http://localhost:3002` as the public entry point. The API requires `AUTH_GATEWAY_SECRET`; legacy browser JWTs are no longer accepted. See the authentication guide for provider setup and linking existing marketplace users.

## KYC

[EnsuredKYC](EnsuredKYC/README.md) owns KYC submissions, private evidence, review decisions and verification status in a separate service/database. Swagger is at `http://localhost:3002/kyc/docs/`. The marketplace consumes status only. See the service guide for setup, reviewer access and preservation/import of legacy records.

## Shared UI library

[EnsuredXDS](EnsuredXDS/README.md) provides `@ensured/xds`, consumed by EnsuredUI as a sibling package. After initializing submodules, run `npm run setup:ui`, then `npm run start`. Use `npm run build:ui` to build both projects, or `npm run storybook:xds` for the shared component catalogue.
