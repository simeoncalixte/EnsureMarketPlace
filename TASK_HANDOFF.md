# Task handoff

Navigation aid, not evidence. Reconcile with Jira and current code before resuming (see
[AGENTS.md](AGENTS.md)). Session history and evidence from 2026-11-03 to 2026-11-18 are in
[docs/history/task-handoff-archive-2026-11.md](docs/history/task-handoff-archive-2026-11.md).
Older docs that say evidence is "recorded in TASK_HANDOFF.md" now refer to that archive.

## XDS 0.2.0 published (2026-11-23)

Owner requested publication after the PR merges. Tag `v0.2.0` points to verified main commit
`96c69084b38e1bf1c67f34eec2868c7410540d25`. The [release workflow](https://github.com/simeoncalixte/EnsuredXDS/actions/runs/45258730788)
passed its install, lint, formatting, TypeScript build, version-match, pack and publish jobs.
Registry readback confirms `@simeoncalixte/ensured-xds@0.2.0` exists and `latest` is `0.2.0`.
This supersedes the earlier unpublished notes. Consumer dependency pins were not changed by
this publication request; application adoption remains separate.

Jira release updates verified: AIN-252/265/270/274/280/281 comments 10616–10621 now record
publication and supersede the earlier pending-release notes. Statuses are unchanged (AIN-274
already Done; AIN-281 still In Progress for remaining table/badge work). AIN-270 already owns
the consumer pin bump, so no duplicate ticket was created. EnsuredUI currently pins 0.1.3;
publication blockers are cleared only for the shipped components. Readback evidence:
`output/xds-publication-jira-2026-11-23/updates.json`.

## Merge all current PRs (2026-11-23)

Objective: owner requested all current PRs merged, extending the prior feature-only scope.
All **11 AInsured PRs** identified at the start are now merged; final search shows no remaining
AInsured PRs. Unrelated ARClassRooms, MicroServiceAutoInventory and NextJSTypeScriptStoryBookSetup
PRs were excluded because they are outside this workspace/product. No ticket was closed.

- EnsuredAPI #29 `6d93491`, #31 `a85e40b`, #30 `4334821` → main.
  Shared 0.3.0 was already published; brought its lockfile update into #29, verified it and removed
  draft status. Merged #29 before retargeting #30 to main. Resolved duplicated purge implementations
  using #31's impersonation refusal and placement-event guard, retaining the test stubs; replaced
  source const assertions with explicit readonly arrays. #31 merged before #30.
- EnsuredSubmissionFeedback #5 `1704ba6` → main.
- EnsuredUI #25 `618d620`, #23 `f16c79e` → main. Integrated the already-published XDS 0.1.3 pin and
  caret dependency ranges from current main; installed the exact merged lockfile.
- EnsureMarketPlace-docs #6 `523907d` → main.
- EnsuredXDS #13 `0281b84`, #15 `31befb1`, #16 `14932fb` integrated into release #14,
  merged to main as `96c6908`. All four PRs read back MERGED. README conflicts preserve all
  component sections; registries/manifests merge cleanly. Release is **0.2.0, not tagged/published**.
  Original XDS working branch/untracked handoff files were preserved; integration used an isolated clone.
- Four clean workspace submodules synced to merged main; root sprint-2 records their new pointers.

Verification and limits:

- API #29: final format/check pass; 136 submission tests plus 24 schema-authoring/converter tests pass.
- API combined #30/#31: 183 passing, 238 failing tests across 32 suites; all existing 141 submission
  tests pass. After the source type-style correction, final purge-only suite is 20/20. Later ancestry
  reconciliation changed no files. Known test-first failures remain under the owner's explicit
  exception: missing AIN-238/242/282 APIs, 117 ESLint errors and 10 formatting failures in acceptance
  files. No failing assertion was weakened. Broader implementation remains incomplete.
- Feedback unchanged from the verified prior turn: 40 pass, 19 fail, no skips on disposable PostgreSQL;
  build passes. Missing versionsExist is AIN-279; missing static scripts remain AIN-210.
- UI final npm run check, test:submissions and test:dashboard pass; static Storybook builds;
  all 17 play-function stories pass at both 1440x900 and 390x900. IDs are in the results mapping.
  Existing Vercel preview failure remains AIN-215; normal frontend CI passed before integration.
- XDS combined ESLint, Prettier, TypeScript/package build pass; npm test 18 pass, one opt-in sibling
  catalog check skipped. Static Storybook builds; all 32 new stories pass at their declared sizes:
  23 at 1440, 5 at 375, 4 at 768. Initial generic desktop run did not apply viewport metadata;
  final runs use real viewport sizes. Package tests required registry/cache access.
- Found/fixed a missing React import in UnsupportedField's NarrowViewport story; it previously
  rendered a router error page without a play function. Added ArrayOfRecords.play as a regression
  assertion. Commit `5fe53b7`. Before → After on AIN-265: attachments **10187**
  `Before-AIN-265-narrow-story-375.png` and **10188** `After-AIN-265-narrow-story-375.png`, both
  fetched successfully and visually reviewed. Story `xds-unsupportedfield--narrow-viewport`,
  Chromium 375x900, default dark, zoom 100%, scroll top, synthetic location schedule, no account;
  Before `0ecfdea` error screen → After labelled read-only table, no page overflow. Original component
  visual-evidence gaps remain with AIN-265/281; those tickets are not marked Done.
- Root npm run workspace:check passes. Evidence in `output/all-pr-merges-2026-11-23/`:
  pr-final.json, Jira comments, UI/XDS results.json mappings and local logs. Jira comments
  10603–10612 record outcomes on AIN-234/239/241/244/245/247/265/268/281/285.

Required ticket/PR map: AIN-244 design → 245/247 API authoring → 234/241 edits with feedback →
268 UI; AIN-239 purge overlaps API edits; AIN-285 is the UI manifest-only maintenance PR.
AIN-265 and 281 own the XDS additions; release #14 carries their commits. Live descriptions,
subtasks and links were refreshed. Existing unfinished shape subtasks, AIN-235/238/242/243/269/279/282
implementations and parent AIN-3 acceptance remain separate from this merge request; none is
silently replaced or claimed delivered. No new UI workflow was invented for this task.

No shared/deployed database migration or application deployment was manually initiated. The existing
XDS main workflow can deploy Storybook Pages automatically. Apply API schema-change/schema-pin and
feedback migrations before application deployment; XDS tag/publication and consumer upgrades are
separate follow-up work. The requested PR merges are complete; release readiness is not claimed.

## Test-branch merges and dependency update (2026-11-23)

Objective: push and merge the nine named test branches, update required packages and workspace
submodule references. Owner clarified **existing feature branches only**, then explicitly approved
merging test-first branches with known failing tests/typechecks as an exception to the pre-merge
check rule. Implementation tickets remain open; this is not acceptance or release completion.

- API target: `feat/ain-241-234-submission-edit`, `f7ec273`, pushed to [PR #30](https://github.com/simeoncalixte/EnsuredAPI/pull/30).
  Merged `tests/AIN-239`, `279`, `242`, `235`, `243`, `238`, `269`, `282` in that order.
  AIN-279's ancestry includes the AIN-239 purge-lockdown implementation (`fca88b7`).
- Feedback target: `feat/ain-234-edit-versions`, `a6fbc8a`, pushed to [PR #5](https://github.com/simeoncalixte/EnsuredSubmissionFeedback/pull/5).
  Merged `tests/AIN-279`. A verified stale branch lock was moved to a temporary backup to finish the merge.
- Dependency: published `@simeoncalixte/ensured-pipeline-shared@0.3.0` is available; shared PR #8 is merged.
  API lockfile updated from 0.2.1 to 0.3.0 in `cac5171`; replaced the stale local copied build with
  the registry artifact. No unrelated dependency upgrades. API PR #29 remains open/draft.
- Ticket map: all eight API tickets and the feedback half of AIN-279 are required for this merge request.
  AIN-239 precedes 279; AIN-242 precedes 235; AIN-238 precedes 282; 238/269/282 inherit the
  existing AIN-234/241 feature code. AIN-240 is already merged. Live parent AIN-3 and AIN-234/241
  criteria/subtasks were reviewed. No implementation completion inferred from their current statuses.
  Excluded: additional implementation on local `feature/AIN-242-draft-hard-delete`, UI AIN-280,
  referrals AIN-106, search AIN-283, broader shape subtasks, and open feature PR merges to main;
  these are outside the approved test-branch merge scope. AIN-210 records the existing feedback static-gate gap.
- Before adding test-first branches: API `npm run format`, `npm run check`, `npm run test:submissions`
  passed (141/141 plus API/feedback journey and 30/30 feedback tests) with the published dependency.
- Final merged API: `npm run check` fails on missing AIN-238/242/282 exports/modules.
  Separate checks: type-safety finds 88 casts, ESLint reports 117 errors, Prettier reports 10 files.
  Authored acceptance tests retained unchanged. `node scripts/test-api.mjs --testPathPattern
  '/test/(acceptance|submissions)/'` on disposable PostgreSQL: 17 suites passed, 14 failed;
  181 tests passed, 238 failed. Existing submissions remain 141/141 passing; AIN-239 is 18/18.
- Final feedback: `node --test --test-concurrency=1 test/*.test.js test/acceptance/AIN-279/*.test.js`
  with a disposable `FEEDBACK_TEST_DATABASE_URL`: 40 passed, 19 failed, zero skips. The new
  versionsExist method/route are unimplemented. `npm run build` passes. Typecheck/ESLint/Prettier
  scripts remain absent (AIN-210). Initial DB-startup failures were resolved by waiting for TCP readiness.
- Evidence: `output/test-branch-merges-2026-11-23/` (test-summary.json, static-results.json,
  feedback-results.json, Jira snapshots/comments, full local logs). Test mapping is each ticket's
  `test/acceptance/AIN-*/` directory; this merge adds no UI workflow or Storybook requirement.
- Jira comments 10582–10589 record results on all eight tickets; no status changed or ticket closed.
  Root `npm run workspace:check` passes.
- No main merge, deployment or shared-database migration. Root `sprint-2` references the two new
  feature heads. Other submodule changes and prior uncommitted handoff content are preserved.
- Merge/dependency request delivered by the root reference update. Broader implementation
  remains incomplete: implement the failing contracts through their existing tickets, reconcile newer
  AIN-269/282 criteria, then pass static gates and acceptance suites before release.

## AIN-240: submission envelope (2026-11-21, Jira Done; PRs merged)

Objective (user): work on AIN-240 (blocks AIN-234, 235, 238). Parent base branch `sprint-2`.
User decisions: status rule = **lookup table**; ORM fix = **publish shared 0.2.1 only + npm override
in EnsuredAPI** (17 pipeline packages pin shared@0.2.0).

- PRs merged on the owner's instruction: [EnsuredPipelineShared#7](https://github.com/simeoncalixte/EnsuredPipelineShared/pull/7) (`46d0356`),
  [EnsuredAPI#28](https://github.com/simeoncalixte/EnsuredAPI/pull/28) (`cf62f85`),
  [EnsureMarketPlace-docs#5](https://github.com/simeoncalixte/EnsureMarketPlace-docs/pull/5) (`6191650`), and parent #89 into `sprint-2`.
  Parent `release-parity` CI fails on every branch, `main` included: checkout has no submodule token secret.
- **Published:** `@simeoncalixte/ensured-pipeline-shared@0.2.1` (GitHub Packages, from `b762bc6`). The PR's
  first commit also records the previously uncommitted source of the published 0.2.0.
- **Design:** see [docs/data-models/submission-envelope.md](docs/data-models/submission-envelope.md),
  which covers the registry, the derived shared/quoted/bound view, the indexes, the recorded plans
  and rollback.
- **AI review** (owner's new lanes: AI Review, then Human Review; only the owner moves tickets to Done)
  found a bug. Legacy insurer-profile submissions (tenant_id NULL) could not use their
  organization's board statuses. Fixed in EnsuredAPI `669931c` with `submission_owner_organization()`;
  the whitespace rule now matches `trim()`, and `collectAllowedStatuses` filters the same way.
- **Verified:** API `npm run check` passes. `test:submissions` passes 136/136 (13 suites) plus the
  verifier, and the compiled-migration loader test passes. Root `npm test` has 21 failing suites and 80 failing tests, a set
  identical to the 11-20 baseline. `check-package-overrides --installed` passes.
- **Not done:** the migration is not applied to any shared or deployed database. Apply it before
  deploying an API on 0.2.1. Nothing is deployed.
- **Next:** AIN-239, AIN-241 and AIN-242.
  AIN-238 should list using the documented `ORDER BY ... NULLS LAST, id DESC` to hit the indexes.
  AIN-235/242 should use `submission_external_activity` for the hard-delete rule.

## Sprint assignment update (2026-11-21)

User requested AIN-239–243 in Sprint 2. Verified live Jira: AIN-239–242 were already in
`AIN S02: Submission CRUD` (sprint 37). Moved AIN-243 from S03 (38) to S02 and
read back all five assignments successfully. All remain To Do. Scope was sprint assignment
only; linked issues, implementation, sprint goals and workflow statuses were unchanged.
This scheduling request is complete; implementation remains outstanding.

## Sprint AIN S02 (Submission CRUD): AIN-237 review (2026-11-20)

Objective (user): start AIN-237 and work out how submission CRUD can meet the sprint goal while
submissions take different shapes for different lines of business. Then update the tickets and
sprint with the findings. This was a read-only review: no code, migration or deployment changes.

- **AIN-237 Done.** The findings comment (id 10438) holds the ER diagram, delete behaviour, gaps,
  canonical leftovers and the recommended model.
- **Model:** a shared envelope on `submissions` + a risk-class/schema-version pin + versions.
  Initial input stays in `manual_input`; edits stay in `submission_feedback.versions`.
- **New tickets, all To Do, under AIN-3:**
  - AIN-239 (Highest, S02): purge route open to any authenticated user; truncation bypasses
    immutability triggers. Blocks AIN-235.
  - AIN-240 (S02): archive, lifecycle and list indexes. Blocks AIN-234, 235, 238.
  - AIN-241 (S02): risk-class schema pin with a generic default. Blocks AIN-234; relates to 238.
  - AIN-242 (S02): draft hard delete across services. Blocks AIN-235.
  - AIN-243 (S02): protect the legacy canonical archive and remove leftovers.
- **Story comments:** scope-update comments added to AIN-234, 235 and 238.
- **Sprint goal:** sprint 37's goal now names the prerequisites; name and dates unchanged.
- **Not verified:** live database state; the `extracted_fields` FK re-add; the purge behaviour is
  inferred from PostgreSQL semantics and not yet reproduced (AIN-239 AC4).
- **Next:** AIN-239, then AIN-240 → AIN-241 → AIN-242. After those, AIN-238, AIN-234, AIN-235,
  then AIN-236 (end to end).
- **Open question:** the record-retention rule in AIN-235 still needs an owner decision.

## Frontend agent and UI skills (2026-11-20)

Direct user request, not ticket-driven: build a long-running agent that works on EnsuredUI,
commit the UI skills, and open PRs. No application source, dependency, migration or deployment
changes.

- EnsuredUI skills (`storybook`, `ui-engineer`): [EnsuredUI#22](https://github.com/simeoncalixte/EnsuredUI/pull/22)
  merged (`878a7b4`). Its `npm run check` passed, and ESLint passed on the skill scripts.
- Workspace: `.claude/agents/frontend-engineer.md` and `scripts/frontend-agent/` (runner,
  Stop-hook gate, PreToolUse guard, scoped settings, queue example, README). Runtime state is in
  the gitignored `/.frontend-agent/`. `gate.mjs` and `guard.mjs` are now covered by
  `npm run workspace:check`, which passed.
- Verified in isolation: guard allow/deny cases, the gate passes on EnsuredUI `main`, and the
  Stop hook blocks a `done` ticket that has no evidence.
- Not yet verified: a full `run.sh` session on a real ticket (it starts a paid session), and Jira
  updates from headless sessions (they depend on a Jira tool being available).
- Both PRs merged and local `main` branches synced. Next step: populate `.frontend-agent/queue.json`
  and run `scripts/frontend-agent/run.sh --once`.

## Agent skills delivery (2026-11-20)

Direct user request: create PRs for all current changes, merge them, and sync the project.
Scope is documentation and skill-directory symlinks in the parent and ten code submodules;
there are no application source, dependency, migration, or UI changes.

- Shared workspace skills: `.agents/skills/README.md`; `.claude/skills` links to it.
- Each code submodule has the corresponding repository skills README and local symlink.
- `AGENTS.md` points to the shared skills conventions.
- Validation: all eleven symlinks resolve to their local skills directory; whitespace checks
  passed; root `npm run workspace:check` passed (typecheck, ESLint, Prettier). The API commit
  hook also passed `npm run check`. Application suites were not rerun for these documentation
  and symlink changes; this is not evidence of application release readiness.
- No migrations or deployment were performed as part of this request.
- All ten service PRs are merged and local service `main` branches synced:
  - [EnsuredAPI#27](https://github.com/simeoncalixte/EnsuredAPI/pull/27) (`6ebda57`).
  - [EnsuredAuth#21](https://github.com/simeoncalixte/EnsuredAuth/pull/21) (`0125c44`).
  - [EnsuredEmail#6](https://github.com/simeoncalixte/EnsuredEmail/pull/6) (`ec69815`).
  - [EnsuredKYC#4](https://github.com/simeoncalixte/EnsuredKYC/pull/4) (`e2b2080`).
  - [EnsuredLogistics#5](https://github.com/simeoncalixte/EnsuredLogistics/pull/5) (`9346efc`).
  - [EnsuredNetwork#8](https://github.com/simeoncalixte/EnsuredNetwork/pull/8) (`4a77a30`).
  - [EnsuredServices#13](https://github.com/simeoncalixte/EnsuredServices/pull/13) (`6e6c71d`).
  - [EnsuredSubmissionFeedback#4](https://github.com/simeoncalixte/EnsuredSubmissionFeedback/pull/4) (`c08d58e`).
  - [EnsuredUI#21](https://github.com/simeoncalixte/EnsuredUI/pull/21) (`b8808c0`).
  - [SubmissionUI#6](https://github.com/simeoncalixte/SubmissionUI/pull/6) (`7621e38`).
- Parent PR carries the workspace files and updated submodule references; merge and sync it to complete delivery.

## Current work: project context and documentation cleanup (2026-11-20)

Direct user request, not ticket-driven: make the project's purpose the default context for agents, and
organize the docs so each one's intent is clear.

Delivered by merged PRs on 2026-11-20 (the owner asked for all pending changes, including earlier
sessions' work, to be merged and main synced). Not deployed, and no migrations applied:

- EnsureMarketPlace-docs#4 (`d5a0d39`): docs reorganization.
- EnsuredAPI#26 (`1ac47ca`): pipeline-free manual submissions (AIN-209), lineage migrations (AIN-205,
  AIN-208), submission test reorganization (AIN-211), pipeline packages 0.2.x.
- EnsuredUI#20 (`1c6ec05`): saved manual input in the workbench, plus ManualInput stories.
- EnsuredSubmissionFeedback#3 (`7c956c1`): nullable `base_execution_id` for manual-input baselines.
- Parent PR: these docs, the root test runner (`scripts/test-api.mjs`), VS Code test settings, evidence
  and the submodule pointers.

Verification: see `output/pr-delivery-2026-11-20/verification.json`.

- Passed: API format and check; API `test:submissions` 118/118 plus the API/feedback journey; UI check,
  tests and 6/6 manual-input interaction stories; feedback tests and build; root `workspace:check`.
- Root `npm test`: 21 of 140 suites fail (80 tests). An identical failure set occurs on unmodified
  `main`, so these are not regressions. Created AIN-212 (gateway auth in the test harness), AIN-213 (DB
  suites bypass the test DB), AIN-214 (stale expectations) and AIN-215 (UI Vercel check fails on main).
  The owner accepts known failures when they are ticketed.
- Gaps: the feedback service has no static gates (AIN-210), and parent CI cannot check out because a
  secret is missing (AIN-13).

Before deploying: apply the API migrations (`20261114000000` through `20261117000000`) and the feedback
`base_execution_id` migration, then deploy the API, feedback service and UI together.

Documentation work:

- `PRODUCT.md` (new, root): the owner's authoritative product vision, saved verbatim, plus draft
  sections 10–15 answering the insurer, broker and reinsurer reviews (owner decisions still open). The
  review files themselves were removed from disk by the owner and are not kept.
- `Claude.md` (owner-added): a pointer to AGENTS.md.
- `AGENTS.md`: new "Product purpose (read first)" section with the vision summary and build principles,
  plus a pointer to the docs index.
- `docs/` (separate repository, EnsureMarketPlace-docs) reorganized by intent into `product/`,
  `architecture/`, `features/`, `proposals/`, `history/` and the existing `data-models/`. Indexed in
  [docs/README.md](docs/README.md) with a current/proposed/historical status for each doc.
- Moved from the root into `docs/`: ROADMAP.md, pipeline.md, AI_CHAT.md, insurance_dashboard_erd.md and
  this handoff's history. The owner intentionally deleted MODEL_SETTINGS.md, PIPELINE_PACKAGES.md,
  PIPELINE_RELEASE.md, PIPELINE_VALIDATION.md and the three reinsurance route files. Dead references to
  them in `README.md` and `EnsuredAPI/README.md` were replaced.
- Status banners were added to moved docs that had none. Relative links were rewritten for the new
  locations and checked with a link checker.

Known gaps:

- Links in older proposals to code that now lives in separate package repositories (`EnsuredPipeline*`,
  `EnsuredXDS`, `EnsuredConstants`) were already unresolvable and are left as is.
- `docs/` already had someone else's uncommitted edits (data-models README, field dictionary, sequelize
  contracts, the risk-class registry design, and untracked submission lineage/revisions docs). They are
  preserved; the registry design was moved to `history/` with its edits intact.

Next steps:

- Owner decisions: the product name ("AInsured" vs `Ensured*`), whether the stablecoin proposal is in
  scope, and the open decisions in PRODUCT.md sections 10–13.
- Then create Jira user stories for PRODUCT.md section 14.
- Agent-context fixes proposed and not yet done:
  - Split the draft sections out of PRODUCT.md.
  - Add pointer files to each service repo.
  - Point `.claude/agents/` at PRODUCT.md.
  - `Claude.md` may need to be `CLAUDE.md` on case-sensitive systems.
- Fix AIN-212 to AIN-215.

## Open obligations carried from the archive (unverified against Jira)

Taken from the archived log on 2026-11-20. Refresh each in Jira before acting on it.

| Jira                                             | Open item                                                                                                                                                                                                         | Last logged |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| AIN-209                                          | Ticket Done, but migrations `20261117000000-manual-submission-input` and feedback nullable `base_execution_id` are not applied or deployed                                                                        | 11-17       |
| AIN-210                                          | Feedback package lacks typecheck/ESLint/Prettier scripts (To Do)                                                                                                                                                  | 11-17       |
| AIN-206                                          | Package check gaps: Shared and SchemaGeneration test-inclusive tsc failures; libraries lack ESLint/Prettier (To Do)                                                                                               | 11-14       |
| AIN-187, 188–203                                 | Unclaimed-party capture and verified claims (To Do). Start with the AIN-187 contract, then AIN-190. After screenshots are required.                                                                               | 11-14       |
| AIN-13                                           | Pipeline release gate. Parent CI fails at checkout because the `ENSURED_READ_TOKEN` secret is missing (In Progress).                                                                                              | 11-14       |
| AIN-137–140, 143–145                             | Model settings and chat: real-provider and staging gates. Blocked on provider access; the owner's own account test is deferred.                                                                                   | 11-12       |
| AIN-79                                           | Effective marketplace inventory filtering (To Do)                                                                                                                                                                 | 11-12       |
| AIN-48, 35, 59, 7, 30, 47                        | Data model, currency, identity, eligibility, pending vs funded (In Progress). Next: AIN-48 field semantics, AIN-35 writers/backfills, AIN-59 links.                                                               | 11-17       |
| AIN-18, 49, 50, 51, 54                           | Data-model slices only partly delivered                                                                                                                                                                           | 11-17       |
| AIN-14, 15, 20, 22, 26, 29, 36–40, 43–46, 53, 55 | Finance gaps (To Do as of 11-03). AIN-36 needs a provider sandbox.                                                                                                                                                | 11-04       |
| AIN-28, 31, 32, 80, 92, 41, 42                   | Finance/marketplace and sprint S01 items; status not stated                                                                                                                                                       | 11-14       |
| AIN-86–130, 131–136                              | Persona backlog (To Do). AIN-87 is the dependency-ready foundation.                                                                                                                                               | 11-04       |
| Not ticketed                                     | Submissions review follow-ups (dashboard DTO consolidation, artifact-writer extraction, seed decomposition); pipeline page data-service error; failing remote checks (Logistics E401, UI Vercel, Auth Cloudflare) | 11-13       |

Open parent outcomes: AIN-1 (release, staging, rollback, provider gates), AIN-2, AIN-3, AIN-95,
AIN-47, AIN-108, AIN-185, AIN-186 and AIN-12. Nothing has been deployed to production.

To check in Jira: AIN-151 is logged as both Done and To Do on 11-08, and AIN-156 was reopened on 11-07 with
no logged closure.

## Standing facts

- API gate: `npm --prefix EnsuredAPI run format`, then `npm --prefix EnsuredAPI run check`.
- Submission suite: `npm --prefix EnsuredAPI run test:submissions` (118 tests / 11 suites as of 11-18).
- Root `npm test` and `scripts/test-api.mjs` use a disposable PostgreSQL container; Docker Desktop must be
  running, and sandboxed sessions may need escalation for Docker.
- Host port 5432 belongs to another project; never use it for tests.
- Library source lives outside this workspace (`/Users/simeon/Projects/EnsuredPackages`); the workspace
  installs published packages only.
- Jira access is configured through the local, gitignored root `.env`. Its `JIRA_URL` points at a backlog
  page, so use its origin for API calls. Never copy credentials into docs or tickets.
