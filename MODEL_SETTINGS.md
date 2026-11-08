# Multi-model library update — 2026-11-06

The current Settings page uses `ModelLibrary.tsx` and `ModelLibrary.styles.ts`, following the supplied navy/teal card/detail design. User explicitly requested multiple saved models and default selection, then clarified that only available saved records should appear, with no unknown defaults. Add begins with empty provider/model; the provider menu lists implemented adapters only (Gemini/Ollama/Qwen/Muse), not sample connected records. Saving does not select a default. Failed/untested records remain editable; Connected requires current successful proof with 15-minute freshness.

AIN-138 remains the actor/intent story. Its approved scope extension was recorded in Jira, with backend AIN-139 and UI AIN-140 evidence comments. Both subtasks and the parent remain In Progress because their original real-provider/staging criteria remain open; this local redesign does not close broader obligations. AIN-137 adapter and AIN-143 connection-gated chat are preserved dependencies; financial/hosting/training work and unimplemented OpenAI/Anthropic adapters pictured in the reference are excluded.

Backend: `EnsuredAPI/src/models/library.ts`, `routes/modelLibrary.ts`, migration `20261106010000-model-library.ts`. The additive migration imports existing credentials/defaults into a scope-bound encrypted library; `ai_model_settings` remains the active projection consumed by chat and pipeline resolution. Explicit selection is protected by entry and default revisions plus a scope lock. Edits invalidate proof; test completion checks revision, latest probe and current membership. Unauthorized/cross-account operations fail; API responses/audits never return credentials. Legacy saves import on the next library read. New library inheritance clears the active override but retains saved models, superseding the prior single-record UI behavior below. Explicit Remove model confirmation deletes the saved credential and clears its default atomically without selecting a replacement. The legacy API remains available for compatibility.

UI interaction mapping: AIN-138/140 → ModelLibrary → `pages-settings-model-library--{saved-records-only,add-without-default,select-default,edit-keeps-credential,test-connection,failure-retry,search-pagination,inherit-keeps-library,permissions,validation-and-cancel,save-failure-retains-draft,load-failure-retry,loading,keyboard-and-expired-proof,remove-credential}`. All 15 pass at 375px and 1440px with external/application requests blocked. All 14 retained legacy fixture stories also pass. Live story `pages-settings-model-library-live--saved-library-journey` exercises signed-gateway API/PostgreSQL persistence, reload, connection test, default selection and inheritance; only external provider transport is synthetic.

Verification:
- `npm --prefix EnsuredAPI run build` passed.
- `npm --prefix EnsuredUI run build` and `npm --prefix EnsuredUI run build-storybook` passed.
- `node scripts/verify-model-library-stories.mjs` and `STORY_WIDTH=1440 node scripts/verify-model-library-stories.mjs`: 15/15 each.
- `node scripts/verify-model-settings-stories.mjs`: 14/14.
- `npm run test:finance:docker -- --runTestsByPath test/relationships/modelLibrary.db.test.ts test/relationships/modelSettings.db.test.ts test/relationships/aiChat.db.test.ts`: 29 tests / 3 suites passed, including three authenticated browser journeys, migration up/down, encryption, authorization, default races, stale tests and removal. Disposable database removed.
- Full UI typecheck retains 21 existing unrelated errors; none in new library files. API/UI diff whitespace checks pass.

Evidence: `output/model-library-2026-11-06/` contains logs, result JSON and mobile/desktop screenshots. Local API/UI refreshed. Development server automatically applied the staged migration once; verification confirmed existing default configuration and encrypted credential exactly preserved (1/1). Settings and component module, API/gateway health return 200; unauthenticated library returns 401. Authenticated browser showed exactly the one actual saved Muse record. No real provider requests or user account-setting edits during this redesign, no production deployment/package publication/commit. Earlier Muse 401/invalid_api_key and real-provider/staging completion remain independent open gates. Local redesign is ready for user testing.

---

# Organization and personal AI model settings

AIN-138 expands the original AIN-137 Muse request. Under Settings → AI models,
organization administrators can save an organization provider/model/credential.
Members can inherit that configuration or save a personal override. Independent
accounts can save personal settings too. The provider adapters currently support
Gemini, Ollama, Qwen and Meta Muse. Model IDs are configurable; no per-model
allowlist is used. Models must support the required text/structured-output task.
Adding another provider requires an adapter, not merely entering its name.

Effective selection is personal → current organization → existing platform
configuration. Returning to inheritance removes the personal credential. Clearing
an organization default returns it to the platform configuration. The page shows
the effective source and provides an explicit saved-configuration connection test
with a synthetic prompt. It never reads a saved key back into the browser.

Manual pipeline requests/jobs use the current requesting account. Automatic
organization jobs use the organization's configuration; personal automatic work
uses its owner. Membership is checked again when work starts. A per-request/job
AsyncLocalStorage context carries credentials without mutating process.env.
Execution metadata records the source and revision; usage retains provider/model.
Generated-form input snapshots retain the selected provider/model without keys.
Existing specialized OCR and independent TypeSafe review keep their separate
service contracts; these settings configure the shared text-generation adapter.

## Storage, access and migration

Migration: `EnsuredAPI/src/db/migrations/20261105010000-model-settings.ts`.
The new settings and redacted event tables are additive. The migration's up/down
cycle was exercised in disposable PostgreSQL. It was also applied by the running
local development API and recorded in SequelizeMeta. No production or shared
staging deployment occurred.

Credentials use AES-256-GCM with a random IV and scope-bound authenticated data.
Set `MODEL_SETTINGS_ENCRYPTION_KEY` to 32 random bytes encoded as 64 hexadecimal
characters. A local key was generated in the ignored `EnsuredAPI/.env`; its value
was never printed or saved in source/evidence. Preserve that key alongside backups;
changing it requires re-encryption or credential replacement. Missing/wrong keys
fail explicitly rather than exposing ciphertext or using another scope's key.

Authorization derives from active users and current organization membership.
Only an administrator of the current organization can write/test organization
settings. Personal scope always means the current account. Impersonation cannot
manage credentials or invoke the scoped model workflow. Save revisions and database
locks prevent stale/concurrent updates, including delete/recreate conflicts.

Endpoint changes require an exact operator-approved base URL. The default Muse
endpoint is `https://api.meta.ai/v1`; Qwen and Ollama can use their configured
operator endpoints. `MODEL_ALLOWED_BASE_URLS` approves additional exact bases.
HTTP is limited to operator-approved Ollama endpoints; URL credentials, queries,
fragments and redirects are rejected. The model-settings API never returns stored
keys. Save/test failures omit provider bodies and request secrets.

## Ticket and verification map

| Ticket | Component / responsibility | Evidence |
| --- | --- | --- |
| AIN-137 | Shared `agents/muse.ts`, `llm.ts`, `providerResponse.ts`; schema model replay; healthcheck/env example | Provider regressions; real Meta request reached official endpoint but returned 401 |
| AIN-138 | Organization/individual workflow and all original outcome gates | Fixture stories, authenticated API/DB/browser journey; user's account controls inspected; manual save/test deferred by user |
| AIN-139 | API `models/{settings,execution,requestContext}.ts`, `routes/modelSettings.ts`; migration; jobs/context/provenance | Disposable PostgreSQL and signed gateway assertions; encryption, inheritance, permissions, revocation, concurrent contexts/saves, worker model resolution |
| AIN-140 | UI `Pages/InsurerDashboard/ModelSettings.tsx`, Settings integration; analyst navigation | 14 executable fixture stories plus authenticated real API/browser story at 375px |
| AIN-141 | Stale local UI package metadata/source image | Applied existing Compose package mounts and current local UI source; missing-export/CSS overlays resolved; actual signed-in account displays AI models and organization controls |
| AIN-142 | Manual-job actor regression | Advance/rerun/schema enqueue requesting actor; route and durable-worker regression |

Fixture story IDs have prefix `pages-settings-ai-models--` and suffixes:
`inheritance`, `personal-override`, `organization-default`, `return-to-inheritance`,
`independent-account`, `member-permissions`, `validation`, `save-failure-retry`,
`load-failure-retry`, `loading`, `connection-failure`, `keyboard`,
`clear-organization-default`, `revoked-access`.
They assert observable results and exact submitted scope/model/revision/credential
payloads. The runner blocks all non-Storybook network traffic. No application
writes occur from these fixtures. There is no pagination for the single setting
and bounded provider list; model ID is free text.

Live story: `pages-settings-ai-models-live--authenticated-account`. Its harness
starts a real Fastify API with signed gateway identity and disposable PostgreSQL;
the browser saves organization settings, inherits, overrides personally, reloads,
tests and returns to inheritance. Only the external provider transport is synthetic.
The test verifies durable encrypted state after the browser completes. It cannot
establish real provider availability or settlement/business workflow correctness.

Commands and logs:

- `npm --prefix EnsuredPipelineShared test -- --runTestsByPath src/pipeline/agents/muse.test.ts src/pipeline/agents/llm.test.ts src/pipeline/agents/qwen.test.ts src/pipeline/agents/tokenUsage.test.ts` — 55 passed.
- `npm run test:finance:docker -- --runTestsByPath test/relationships/modelSettings.db.test.ts` — 9 passing isolated API/database/job/browser tests.
- `npm --prefix EnsuredUI run build-storybook` and `node scripts/verify-model-settings-stories.mjs` — 14 stories passed, including narrow layout and keyboard checks.
- `npm --prefix EnsuredAPI run typecheck` and Shared build — passed.
- `npm --prefix EnsuredUI run build` — passed. UI `tsc --noEmit` retains 22 baseline errors outside the model settings files; no new settings-file errors.
- `node output/model-settings-2026-11-05/check-muse.cjs` — one synthetic-document request; HTTP 401. It does not print keys or provider response bodies.
- Focused schema-generation replay and route regressions: 18 tests passed using `EnsuredAPI/jest.model-settings.config.cjs`.
- Diff whitespace checks passed in root/API/UI/Shared.

Logs/results: `output/model-settings-2026-11-05/`, including `tickets.json`,
`provider-tests.log`, `database-tests.log`, `storybook-tests.log`,
`storybook/results.json`, `live-storybook/results.json`, builds/typechecks,
`schema-regressions.log`, and redacted `muse-provider-result.json`.

## Local account test and remaining gates

The current local development API/UI have the feature and the encryption key
configuration. The existing workspace PostgreSQL volume is running on the private
`ensured-platform` Docker network. Another project occupies host port 5432, so use
`output/model-settings-2026-11-05/internal-database.yml` alongside the API Compose
file for local Compose commands; it removes only the database host-port publication.
Do not stop the other project's PostgreSQL or discard any volume. The workspace
helper provisioned missing configured databases while retaining existing data,
roles and credentials. Other service issues remain independent of this feature.

The user signed in, and the actual Settings screen shows effective platform Qwen
configuration and editable organization settings. No personal/organization model
record or credential was changed for that account. The user explicitly deferred
hands-on save/test on 2026-11-05. On return, open:
`http://localhost:3000/insurer/settings`.
Select My organization to set a default; select My account to inherit or override.
Enter the provider key in the application, save, then test the saved connection.

With user authorization the ignored local .env Muse endpoint/model were corrected
to Meta's documented `https://api.meta.ai/v1` and `muse-spark-1.3`. The existing
platform provider remains Qwen. The configured Muse key returned HTTP 401, so a
valid key/model grant is still needed. References: https://dev.meta.ai/docs/overview,
https://dev.meta.ai/docs/protocols/chat-completions and
https://dev.meta.ai/docs/structured-output.

AIN-141 and AIN-142 are complete for their bounded local bug criteria. AIN-137, AIN-138, AIN-139 and AIN-140 remain In Progress because the broader required gates below are incomplete.

Overall objective remains incomplete: real Muse success/generated-form validation,
user account save/test (deferred), reviewed registry/version rollout and integrated
staging evidence remain. AIN-137/138 and their broader implementation obligations
must not be closed from synthetic/local checks. AIN-13 remains its own release
parity work; AIN-2/87 retain their original children and acceptance criteria.
Unrelated financial-model, hosting/training and unsupported-provider expansion are
excluded. No production deployment, package publication or commit was performed.
