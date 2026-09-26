# Pipeline packages

The pipeline now consists of 15 stage packages and a shared support package. Each package has a private GitHub repository, a TypeScript build, a dependency lockfile, and its own test command. Existing API URLs, operation keys, database schema, and job execution semantics are preserved.

## Repositories

| Stage | Repository |
| --- | --- |
| shared | [EnsuredPipelineShared](https://github.com/simeoncalixte/EnsuredPipelineShared) |
| ingestionAmqp | [EnsuredPipelineIngestionAmqp](https://github.com/simeoncalixte/EnsuredPipelineIngestionAmqp) |
| ingestion | [EnsuredPipelineIngestion](https://github.com/simeoncalixte/EnsuredPipelineIngestion) |
| ocr | [EnsuredPipelineOcr](https://github.com/simeoncalixte/EnsuredPipelineOcr) |
| classification | [EnsuredPipelineClassification](https://github.com/simeoncalixte/EnsuredPipelineClassification) |
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

## Development

From this marketplace checkout:

```sh
git submodule update --init --recursive
npm run pipeline:setup
npm --prefix EnsuredAPI install
npm run pipeline:test
npm run pipeline:verify
npm --prefix EnsuredAPI test
```

For a single repository, clone it and run `npm run bootstrap`, then `npm test`. Bootstrap clones missing private sibling dependencies using your existing Git credentials and builds dependencies before the selected package. No EnsuredAPI checkout is required. `file:../` dependencies deliberately match the existing repository's sibling-package convention; the superproject submodule revisions pin the compatible checkout set. Package artifacts are not published to the public npm registry.

Run all pipeline package tests with `npm run pipeline:test`, or one package with `npm --prefix EnsuredPipelineSubjectDiscovery test`. Each package's `tsconfig.json` includes tests and Jest globals for editor support without emitting files. Production builds use `tsconfig.build.json`, which excludes tests and loads only Node globals. If an open editor still reports missing `describe` or `expect` after pulling these configurations, restart its TypeScript server.

## Ownership and compatibility

- Stage repositories own their runtime implementations and original unit/regression tests. Simple Fastify stage adapters move with their route tests.
- Shared support owns the existing Sequelize model classes/connection, provider connectors, environment loading, form catalog, common contracts and settings. There is one runtime implementation of each model and provider.
- AMQP owns its original delivery/acknowledgement/dead-letter logic and accepts an ingestion persistence collaborator; ingestion supplies the existing implementation.
- The API retains authorization, board/job orchestration, authenticated schema-generation routes, migrations, and application/database/UI integration tests. Compatibility exports keep old module paths available.
- Canonicalization belongs to normalization. Pricing engines, catastrophe/casualty/parametric strategies and benchmark priors belong to risk computation.
- No package imports EnsuredAPI source. Packages continue to share the existing database schema; this is a package extraction, not independent service deployment or a database split.
- `pipeline-packages.json` records source ownership and dependency order. `pipeline-parity.json` records the migration's normalized runtime-body hashes. `pipeline:verify` checks the dependency layout and runtime-body preservation. Intentional future logic changes require reviewing and updating that migration audit.

## Validation

See [PIPELINE_VALIDATION.md](PIPELINE_VALIDATION.md) for build, test, parity, and isolated-install results. Default tests retain the original explicit opt-in gates for live paid providers. No secrets or environment files are included in the repositories.
