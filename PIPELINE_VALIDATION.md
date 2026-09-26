# Pipeline migration validation

Validation date: 2026-09-16. TypeScript was retained to preserve the working-tree implementation, including existing uncommitted pipeline changes.

## Package verification

Every package passed a clean installation (`npm ci --ignore-scripts --offline`), strict TypeScript build, its test suite, and a compiled-entry-point load in `/tmp/ensured-pipeline-isolated`, outside the marketplace and without an EnsuredAPI checkout or node_modules directory. The table uses those isolated results.

| Package | Passed tests | Opt-in skipped tests |
| --- | ---: | ---: |
| @ensured/pipeline-shared | 132 | 4 |
| @ensured/pipeline-ingestion-amqp | 2 | 0 |
| @ensured/pipeline-ingestion | 16 | 0 |
| @ensured/pipeline-ocr | 117 | 0 |
| @ensured/pipeline-classification | 18 | 3 |
| @ensured/pipeline-extraction | 57 | 3 |
| @ensured/pipeline-location-discovery | 13 | 0 |
| @ensured/pipeline-normalization | 32 | 0 |
| @ensured/pipeline-validation | 164 | 1 |
| @ensured/pipeline-schema-generation | 155 | 1 |
| @ensured/pipeline-pre-rating | 3 | 0 |
| @ensured/pipeline-capacity | 4 | 0 |
| @ensured/pipeline-oracle-attestation | 2 | 0 |
| @ensured/pipeline-workflow | 9 | 2 |
| @ensured/pipeline-risk-compute | 218 | 0 |
| @ensured/pipeline-storage-search | 2 | 0 |

Total: **944 passed, 0 failed, 14 skipped**. Skips preserve the original live-provider opt-in gates; real paid-provider behavior was not exercised. This is full execution of the available default suites, not a claim of 100% code coverage.

## Behavior preservation

- `npm run pipeline:verify` passes 160 normalized runtime checks (159 source modules plus the separately extracted AMQP delivery method). Executable bodies are unchanged; import wiring, erased TypeScript declarations, and the AMQP persistence constructor injection are excluded from normalization.
- All original test cases are accounted for across the API and package repositories. No previously passing test regressed in the migration comparison.
- Four previously failing schema-generation assertions now pass after correcting missing test collaborators. Processing logic was not changed to accommodate the tests.
- Two new AMQP tests verify persistence-before-acknowledgement and the existing failure/dead-letter acknowledgement policy.
- Every compiled package entry point loads successfully. Shared Sequelize constructor identity is preserved.

## Application integration

The baseline API run had 1,169 passing tests, 79 failing tests, and 14 skipped tests. After moving stage tests to their repositories and fixing the stale schema-generation mocks, the API integration suite has 231 passing tests and 75 failing tests. All remaining failures existed in the baseline; the migrated package suites contribute the additional 944 passing tests and 14 skips above.

The API email integration command passes all 50 tests (including the extracted ingestion email suite). The existing API TypeScript build still reports pre-existing errors in migrations, routes, and integration tests; normalized diagnostic comparison found no new compiler errors. Each extracted package builds independently with strict TypeScript checks enabled.

Remaining API failures include authentication/seed expectations and pipeline settings/database fixture assumptions. They were not concealed or changed as part of packaging. This migration therefore does not claim that the entire pre-existing application suite is green.

## Published-repository check

All 16 GitHub repositories were verified private, with remote main commits matching the tested local commits. A fresh clone of the published schema-generation repository successfully ran `npm run bootstrap`, automatically cloned its shared dependency, built both packages, and passed 155 tests (1 opt-in live-provider test skipped).
