# Task handoff

Navigation aid, not evidence. Reconcile with Jira and current code before resuming (see
[AGENTS.md](AGENTS.md)). Session history and evidence from 2026-11-03 to 2026-11-18 are in
[docs/history/task-handoff-archive-2026-11.md](docs/history/task-handoff-archive-2026-11.md).
Older docs that say evidence is "recorded in TASK_HANDOFF.md" now refer to that archive.

## review-merger run 2 (2026-11-25, scheduled, ~13:00 UTC)

Scope: every non-draft open PR in the root repo and its submodules. That is the same 8 PRs as the
earlier run today (draft EnsureMarketPlace#92 has that run's table and logs). All other open PRs are
drafts: root #90, #91 and #93; EnsuredAPI #32 and #33; EnsuredUI #29, #31–#34; EnsuredXDS #21; docs #7–#10.

Logs: `output/review-merger-2026-11-25b/<repo>-<pr>/`. The story runner (play functions + axe) is
`output/review-merger-2026-11-25b/run-stories.cjs`.

**One PR merged:** EnsuredXDS#17 → `main` `3d16d71`. Every pair of the four XDS PRs conflicts (the
`package.json` test line, index exports, README), so only one could land this run.

| PR                      | Head verified | Decision           | Failed gates                                                           | Jira subtasks      |
| ----------------------- | ------------- | ------------------ | ---------------------------------------------------------------------- | ------------------ |
| EnsuredXDS#17 (AIN-281) | 51d6918       | **merged** 3d16d71 | none                                                                   | n/a                |
| EnsuredXDS#18 (AIN-281) | 73bd39d       | blocked            | 1 (conflicts with main after #17: package.json, README.md)             | AIN-324 (existing) |
| EnsuredXDS#19 (AIN-278) | 0675651       | blocked            | 1 (conflicts with main after #17: package.json)                        | AIN-338 (new)      |
| EnsuredXDS#20 (AIN-278) | a6ec930       | blocked            | 1 (conflicts with main after #17: package.json)                        | AIN-338 (new)      |
| EnsuredUI#28 (AIN-298)  | 27f646d       | changes requested  | 4 (no Before/After on Jira; the story was added and passes 2/2, axe 0) | AIN-329 (existing) |
| EnsuredUI#26 (AIN-289)  | 0888b8d       | changes requested  | 4 (unchanged head and evidence; the first run's review stands)         | AIN-327 (existing) |
| EnsuredUI#27 (AIN-294)  | a5461c0       | changes requested  | 4 (unchanged; the first run's review stands)                           | AIN-328 (existing) |
| EnsuredUI#30 (AIN-296)  | 6a35b2c       | changes requested  | 3 and 4 (unchanged; still blocked by AIN-278/281)                      | AIN-330, AIN-331   |

- XDS#17 verification: `lint` 0, `format:check` 0, `npm test` 22 tests (21 pass, 0 fail, 1 skipped),
  Storybook build ok, Badge play functions 7/7 with axe 0. Evidence: AIN-281 comment 10779.
- UI#28 verification: `npm run check` 0, `test:submissions` 4/4, `test:dashboard` 5/5, stories 2/2 with axe 0.
- AIN-281 stays In Progress, not Human Review, because #18 (scope item 1) is still open. AIN-323 is
  satisfied by comments 10779 and 10799.
- Reviews were posted as COMMENT, because GitHub refuses APPROVE or REQUEST_CHANGES on your own PR.

Next:

- Rebase XDS#18 (AIN-324), then #19 and #20 (AIN-338). Each one needs a fresh review on its new head.
- Then the XDS 0.3.0 release, then EnsuredUI#30 (after AIN-331).
- Attach Before/After evidence for EnsuredUI #26, #27 and #28.
- No PR is unblocked for merge right now.

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
- Parent [EnsureMarketPlace#85](https://github.com/simeoncalixte/EnsureMarketPlace/pull/85) (`af6bdb2`) is merged
  and synced. Reconciled afterwards: every submodule pointer matches its `main`, all eleven `.claude/skills`
  entries are stored as symlinks to `../.agents/skills`, and the merged local branches were deleted.
- No skills exist yet; only the READMEs. Agents started inside a submodule see only that repository's
  skills (see `.agents/skills/README.md`).

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
