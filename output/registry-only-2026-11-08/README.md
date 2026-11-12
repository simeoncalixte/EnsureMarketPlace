# Registry-only package delivery — 2026-11-08

`published.json` records all 24 package versions, source heads, successful GitHub Actions run IDs and registry integrity values. `verification.json` summarizes final evidence. Release sources are committed/tagged/pushed; consumer and configuration edits remain local working-tree changes.

- `final-provenance.log`: `node scripts/check-package-overrides.mjs --installed` across all workspace consumers.
- `final-pipeline-parity.log`: `npm run pipeline:verify` compares actual registry financial artifacts to fresh owner builds and checks component policy.
- `override-regressions.log`: 5 source-link/stale-artifact regressions.
- `EnsuredAPI-registry-validation.log`: clean registry install and API typecheck.
- `EnsuredUI-registry-validation.log`: clean registry install, host build and 52 unit tests.
- `pricing-registry-integration.log` and `pricing-registry-results.json`: 10 pricing atomicity/concurrency/replay tests against disposable PostgreSQL, using published RiskCompute/Shared.
- `EnsuredLogistics-registry-sdk.log`: registry SDK installation and typecheck. Earlier updated-consumer logs preceded the final cached-tarball cleanup; this log and final-provenance.log supersede them.
- `theme-check.log`: theme ownership and generated asset agreement.
- `api-ui-docker-build.log`, `submission-docker-build.log`, `runtime-after.json`: registry-only image builds and runtime package/mount/HTTP verification.

Historical failure/install logs are retained as diagnostics, not final results. The final release receipts supersede the earlier failed publication attempt. No database volume deleted; prior internal-only PostgreSQL setup restored to avoid the other project's host port. No production deployment or manual migration. API startup retains its existing automatic migration behavior.

AIN-161 bounded package delivery and AIN-151 XDS boundary repair are verified. AIN-13 remote CI remains open: parent ENSURED_READ_TOKEN is absent, distinct from the configured package-read secrets. AIN-1 broader staging and release obligations remain open.
