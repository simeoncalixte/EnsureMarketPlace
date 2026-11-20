# Task handoff

Navigation aid, not evidence. Reconcile with Jira and current code before resuming (see
[AGENTS.md](AGENTS.md)). Session history and evidence from 2026-11-03 to 2026-11-18 are in
[docs/history/task-handoff-archive-2026-11.md](docs/history/task-handoff-archive-2026-11.md).
Older docs that say evidence is "recorded in TASK_HANDOFF.md" now refer to that archive.

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
