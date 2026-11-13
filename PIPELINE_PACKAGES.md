# Pipeline packages

Library repositories are separate from the application root. Package publishing and source tests run in those independent checkouts. Historical ownership metadata in `pipeline-packages.json` remains audit context, not a requirement to clone libraries into this root.

The pipeline now consists of 18 packages. Each package has a private GitHub repository, a TypeScript build, and its own test command. Existing API URLs, operation keys, database schema, and job execution semantics are preserved.

## Repositories

| Stage | Repository |
| --- | --- |
| shared | [EnsuredPipelineShared](https://github.com/simeoncalixte/EnsuredPipelineShared) |
| ingestionAmqp | [EnsuredPipelineIngestionAmqp](https://github.com/simeoncalixte/EnsuredPipelineIngestionAmqp) |
| ingestion | [EnsuredPipelineIngestion](https://github.com/simeoncalixte/EnsuredPipelineIngestion) |
| ocr | [EnsuredPipelineOcr](https://github.com/simeoncalixte/EnsuredPipelineOcr) |
| classification | [EnsuredPipelineClassification](https://github.com/simeoncalixte/EnsuredPipelineClassification) |
| subjectDiscovery | [EnsuredPipelineSubjectDiscovery](https://github.com/simeoncalixte/EnsuredPipelineSubjectDiscovery) |
| financialDiscovery | [EnsuredPipelineFinancialDiscovery](https://github.com/simeoncalixte/EnsuredPipelineFinancialDiscovery) |
| extraction | [EnsuredPipelineExtraction](https://github.com/simeoncalixte/EnsuredPipelineExtraction) |
| locationDiscovery | [EnsuredPipelineLocationDiscovery](https://github.com/simeoncalixte/EnsuredPipelineLocationDiscovery) |
| normalization | [EnsuredPipelineNormalization](https://github.com/simeoncalixte/EnsuredPipelineNormalization) |
| validation | [EnsuredPipelineValidation](https://github.com/simeoncalixte/EnsuredPipelineValidation) |
| schemaGeneration | [EnsuredPipelineSchemaGeneration](https://github.com/simeoncalixte/EnsuredPipelineSchemaGeneration) |
| preRating | [EnsuredPipelinePreRating](https://github.com/simeoncalixte/EnsuredPipelinePreRating) |
| capacity | [EnsuredPipelineCapacity](https://github.com/simeoncalixte/EnsuredPipelineCapacity) |
| oracleAttestation | [EnsuredPipelineOracleAttestation](https://github.com/simeoncalixte/EnsuredPipelineOracleAttestation) |
| workflow | [EnsuredPipelineWorkflow](https://github.com/simeoncalixte/EnsuredPipelineWorkflow) |
| riskCompute | [EnsuredPipelineRiskCompute](https://github.com/simeoncalixte/EnsuredPipelineRiskCompute) |
| storageSearch | [EnsuredPipelineStorageSearch](https://github.com/simeoncalixte/EnsuredPipelineStorageSearch) |

## Install published packages

Packages use the `@simeoncalixte/ensured-pipeline-*` scope. Exact versions are recorded in each consumer manifest and lockfile.
Both the API and pipeline packages declare exact registry versions. They do not
use npm workspaces or `file:` dependencies. Source checkouts are needed only when
editing the pipeline itself.

The committed `.npmrc` files map this scope to `https://npm.pkg.github.com` and
read credentials from `NODE_AUTH_TOKEN`. Use a GitHub token with `read:packages`
and access to the private packages. Never commit the token.

After the initial releases have been published:

```sh
npm --prefix EnsuredAPI ci --include=dev
npm --prefix EnsuredAPI run build
npm --prefix EnsuredAPI start
```

Committed lockfiles resolve private-registry artifacts with integrity hashes. Use `npm ci` for reproducible installs. `npm run pipeline:verify` verifies installed API/UI artifacts against those archives, without library source checkouts.

## Publishing

Initial publication must follow the dependency order in `pipeline-packages.json`.
Set `NODE_AUTH_TOKEN` to a token with `read:packages` and `write:packages` access,
then run:

```sh
PACKAGE_SOURCE_ROOT=/path/to/package-checkouts node scripts/pipeline-packages.mjs publish
npm --prefix EnsuredAPI install --package-lock-only --ignore-scripts
```

The publishing command installs released dependencies, regenerates lockfiles,
performs a clean TypeScript build through `prepack`, and publishes to GitHub
Packages. Shared is published first. Schema Generation also requires the existing
the Constants version pinned in its own manifest package to be accessible.

Each package repository includes `.github/workflows/packages.yml`. A `v*` tag
matching its package version or a manual dispatch builds and publishes the
package. For dependencies in other private repositories, grant the workflow
repository read access in each dependency package's **Manage Actions access**
settings, or configure a `PACKAGES_READ_TOKEN` secret with `read:packages` access.
The workflow publishes its own package with `GITHUB_TOKEN`.

Publish dependencies before their dependents. Increment versions for subsequent
releases; GitHub Packages cannot overwrite an existing version. Commit and push
each package repository separately, then update application dependency versions and lockfiles.

## Development

For a single package checkout, set `NODE_AUTH_TOKEN`, run `npm run bootstrap`,
then `npm test`. No sibling source checkout is required for building the package.
For coordinated library development, run `PACKAGE_SOURCE_ROOT=/path/to/package-checkouts node scripts/pipeline-packages.mjs setup` or `test`. The application workspace does not initialize these repositories. Cross-package integration tests may
require the other released pipeline packages as test dependencies; they no longer
resolve source from sibling folders.

Builds clear `dist` and compile runtime code and declarations. Only `dist` and npm's
standard metadata files are packed. Configuration comes from the host process or
`.env` in its working directory; `ENSURED_ENV_FILE` selects an explicit file.

## Render API service

After publishing and verifying application checks:

- For the superproject, root directory: `EnsuredAPI`. For the standalone EnsuredAPI
  repository, leave the root blank.
- Build command: `npm ci --include=dev && npm run build`.
- Start command: `npm start`.
- Set `NODE_AUTH_TOKEN` with `read:packages` and the API's runtime environment variables.

The API deployment downloads compiled pipeline packages and does not build them.

## Ownership and compatibility

- Stage repositories own their runtime implementations and original unit/regression tests. Simple Fastify stage adapters move with their route tests.
- Shared support owns the existing Sequelize model classes/connection, provider connectors, environment loading, form catalog, common contracts and settings. There is one runtime implementation of each model and provider.
- AMQP owns its original delivery/acknowledgement/dead-letter logic and accepts an ingestion persistence collaborator; ingestion supplies the existing implementation.
- The API retains authorization, board/job orchestration, authenticated schema-generation routes, migrations, and application/database/UI integration tests. Compatibility exports keep old module paths available.
- Canonicalization belongs to normalization. Pricing engines, catastrophe/casualty/parametric strategies and benchmark priors belong to risk computation.
- No package imports EnsuredAPI source. Packages continue to share the existing database schema; this is a package extraction, not independent service deployment or a database split.
- `pipeline-packages.json` records source ownership and dependency order. `pipeline-parity.json` records the migration's normalized runtime-body hashes. `pipeline:verify` checks current installed registry artifacts and component-policy compatibility. The historical runtime-body audit is an explicit external-source-workspace tool, not a current application gate. Intentional library logic changes belong in the owning repository tests and release review.

## Validation

See [PIPELINE_VALIDATION.md](PIPELINE_VALIDATION.md) for build, test, parity, and isolated-install results. Default tests retain the original explicit opt-in gates for live paid providers. No secrets or environment files are included in the repositories.
