# Pipeline release gate (AIN-13)

`npm run pipeline:verify` validates package metadata, current source ownership,
fresh builds of Shared/Capacity/RiskCompute, the exact financial package versions
and integrity entries in the API lockfile, rejects installed source links/inherited installations, and checks byte parity of the artifacts actually
resolved by API and financial-package consumers. It compares the complete `dist`
file inventory, including JavaScript, declarations and JSON; missing and extra files
fail. It then runs the existing component-policy checks. Install dependencies first.
The gate rebuilds these three owners' generated `dist` directories; it does not
publish packages, stage copies into consumers, migrate databases or invoke providers.

A version number alone is insufficient: local packages previously staged as 0.1.0
can differ from the published 0.1.0 artifact. Local passes with staged packages or
links do not prove registry release parity. CI must install from the API lockfile
without staging source builds into its dependencies.

`.github/workflows/pipeline-parity.yml` uses Node 22.14.0, a recursive checkout and
locked installs. Configure `ENSURED_READ_TOKEN` with read access to the private
submodule repositories and GitHub Packages. Both npm token variable names are set
because existing repository `.npmrc` files differ. Capacity and RiskCompute now have
their own registry lockfiles; CI installs each independently without shared node_modules links.
Shared and Constants use their own lockfiles. The uploaded gate log contains package
versions, artifact file counts, SHA-256 inventory digests and mismatch diagnostics.
Never put credentials in the report. The workflow is prepared but has not run remotely.

## Historical extraction audit

`pipeline-parity.json` retains the original pre-extraction runtime hashes unchanged.
`npm run pipeline:audit-extraction` runs that historical comparison. It is expected
to fail against evolved packages and is not a current release baseline. It reports
all absent targets rather than crashing at the first missing file.

`pipeline-packages.json` retains removed mappings under `retiredFiles`, with the
replacement implementation paths and provenance. Schema-generation commit `e7b16ae`
removed the old subprocess implementation; the current stage documentation explains
its section snapshot, review and mapping contracts. The release gate verifies that
retired sources remain absent and their replacements exist. No historical hash was
updated merely to make the gate green. This check establishes ownership and artifact
consistency, not correctness of business behavior; domain/integration tests remain
independent release obligations.

## Scope and evidence (2026-11-04)

- Required: AIN-13, no subtasks or blocking links. Both criteria: clean-checkout
  verification and CI verification of actual compute/capacity/shared-model versions.
- Context: AIN-1 retains broader build, staging, rollback and restore criteria.
- Excluded: related AIN-55 owns database schema/direct-write/migration CI, not this
  package parity repair. Sprint peers AIN-41/42 own checkout guardrails. AIN-14/93/119/136
  own recovery/adapters. None are prerequisites to this bounded gate change.
- `npm run pipeline:test-gate`: 4 passing regression tests, including full temporary
  consumer resolution and stale same-version artifact rejection.
- `npm run pipeline:verify`: passed locally, including three fresh builds, five
  consumer artifact comparisons and component policy. Uses pre-existing local staging.
- `npm --prefix EnsuredPipelineCapacity test -- --silent`: 4 tests passed.
- `git diff --check`: passed.
- Evidence logs: `output/ain-13/{gate-tests,release-gate,capacity-tests}.log`.
- Registry download of each locked financial package: E401 unauthorized. Neither
  supported npm token variable nor a GitHub CLI credential is available. Clean
  recursive-checkout/registry-install proof and remote CI remain unverified.
- No user workflow changed: Storybook is not applicable. Gate regression fixtures
  are isolated temporary files and make no application/database/provider writes.

AIN-13 remains In Progress. Next: provide the CI read credential through secret
configuration, commit reviewed source/submodule revisions and the gate changes,
and run the clean workflow. Any actual registry/source drift requires reviewed
versioned package publication and API lock updates; never overwrite a published
version or copy local dist into CI to suppress the mismatch. No deployment or
application migration occurred. Unrelated dirty changes were preserved.
