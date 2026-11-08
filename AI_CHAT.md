# Application-wide connected AI chat — AIN-143

The existing `withChatbot` wrapper now wraps the exported `AppRoutes` once. The
same provider surrounds every application route, including the workbench,
marketplace, Network host and settings. `App` supplies the router/theme outside
that wrapper. Route changes do not create another chat instance.

The authenticated chat uses the configured provider through the server. The
existing anonymous landing guide remains explicitly labelled a scripted demo;
its `answerFor` responses are never used by connected chat.

## Shared application interface

`EnsuredUI/src/components/marketplace/AIChatContext.tsx` exports `useAIChat`,
`AIChatStore` and `useChatFeatureState`. The shared store exposes connection state,
conversation, draft, open/minimized state, sending/errors, feature state and
context-sharing controls. Features can participate without adding wrappers:

```tsx
useChatFeatureState('risk-workbench', {
  tab: activeTab,
  selectedRows: selectedRows.length,
});
const { setDraft, setOpen, featureState } = useAIChat();
```

The app shell publishes its application/role and model settings publishes effective
model metadata. Route and selected submission references are derived by the host;
submission access is checked on the server. Feature contributions are namespaced,
cloned, cleaned up on unmount, and bounded. Publishers use a separate stable context
so typing in chat does not subscribe every publishing screen to each keystroke.
Embedded feature boundaries can pass this host interface explicitly; no separate
state store or global credentials object is required.

State publication is deliberate, not a scrape of all component props, cookies,
forms or the DOM. Credential-like fields and invalid/cyclic data are rejected.
Internal contributions are capped at 64 namespaces / 2,000 characters each.
Outbound context is capped at eight namespaces and 6,000 characters. Oversized
context produces a visible error and can be disabled; it is not silently truncated.
The user can inspect the outbound page context and turn it off. Context is sent
only with a user message. Context never grants permissions or triggers business
writes. The initial chat API has no tools that mutate application/financial state.

## Verified connection and account boundaries

A successful explicit model connection test records a server receipt for the exact
saved settings scope/revision. It expires 15 minutes after that test. Reload,
settings changes, route/focus changes and a 30-second metadata poll re-read server
state; these reads do not automatically invoke a model. Active chat does not
silently renew the test receipt. Expiry exposes a reconnect path in settings.

Saving a key alone does not unlock chat. Personal overrides require their own
verification; an organization test cannot unlock an unverified personal model.
Members can inherit a fresh organization receipt. Status, history and sends derive
identity and membership from the live server account, not browser flags.

Model/account changes clear private conversation and draft state. Logout or access
revocation clears it; transient same-configuration failures preserve an unsent
draft. Late tests and stale status/history responses cannot enable another
configuration. Returning to inheritance rechecks the currently effective receipt.
Provider failures invalidate the connection and offer a path back to settings.

## API and persistence

Migration: `EnsuredAPI/src/db/migrations/20261105020000-ai-chat.ts` adds connection
receipts and successful account/context-scoped chat turns. Existing model settings
and encrypted credentials remain owned by AIN-138/139. New endpoints:

- `GET /api/ai-chat/state`: effective identity/model and verified status.
- `GET /api/ai-chat/history`: at most ten successful turns for the current account
  and configuration (twenty messages).
- `POST /api/ai-chat/messages`: a UUID request ID, expected context key, user message
  and bounded application context. Provider/key/scope are resolved server-side.

Messages are limited to 4,000 characters; replies to 12,000. Provider history is
bounded to ten turns and trimmed to 16,000 characters. A request replays an existing
successful receipt without another model call; a changed payload cannot reuse its
ID. There is one in-flight reply per account. Different accounts can run concurrently
with a two-connection database pool. All checks inside a chat transaction reuse its
connection; membership/resource locks are taken only for the short final commit,
never during the provider call. Membership, settings revision, verification and
referenced submission access are rechecked before a reply is persisted/delivered.

There are no automatic sends/retries or provider fallbacks. Successful local receipt
replay does not guarantee exactly-once upstream billing across a process crash
before receipt commit. Failed/uncertain requests require an explicit user retry.
History persistence is private to the account/context; this API exposes only the
bounded current history. Broader archival/retention policy remains separate work.

## Ticket → component → evidence

| Ticket | Component / outcome | Verification |
| --- | --- | --- |
| AIN-143 | AppRoutes root wrapper; shared store and connected chat outcome | All evidence below; live-provider/staging gates remain incomplete |
| AIN-144 | API `models/chat.ts`, `routes/aiChat.ts`, connection-test receipts, additive migration | Real PostgreSQL/API tests, signed identities, scope/revision/replay/revocation cases |
| AIN-145 | Existing `withChatbot`/`Chatbot`; `AIChatContext`, `ConnectedChatbot`; app/model-settings publication | Sixteen executable fixture stories and the whole-app authenticated browser story |
| AIN-146 | Pool starvation during scope rechecks | Two concurrent accounts with pool max=2; duplicate-send and in-flight membership regressions |
| AIN-147 | New drafts cleared by a completed reply | `draft-typed-during-reply`, including Escape/minimize focus restoration |
| AIN-148 | Initial history discarded after account/config reset | `reload-restores-history` and API/browser reload verification |
| AIN-149 | External icon-font fallback overflow | Self-contained SVG controls, offline-font narrow screenshot, long model-label story |

Related AIN-138/139/140 retain their broader settings obligations. AIN-137 retains
Muse adapter/provider evidence. AIN-2/87 and AIN-13 release gates are not closed by
this component. Pricing/capital implementation, unimplemented provider adapters,
autonomous business tools and private-record retrieval outside current permissions
are excluded. The user's earlier hands-on account test remains deferred.

## Verification (2026-11-05)

- `npm --prefix EnsuredUI run build-storybook`, then
  `node scripts/verify-ai-chat-stories.mjs`: **16/16 passed**, at 375px with external
  network traffic blocked. Stories assert visibility, exact send payloads, shared
  context/navigation, reload, stale response rejection, personal/account changes,
  retry request IDs, omitted/sensitive context, duplicate prevention, new drafts,
  keyboard focus, font fallback and long labels.
- Fixture IDs: `ai-application-chat--{hidden-until-verified,shared-across-application,
  connection-established,model-change-locks-chat,logout-clears-state,
  failure-retry-same-request,context-can-be-omitted,reload-restores-history,
  sending-prevents-duplicates,keyboard-and-empty-message,stale-refresh-cannot-unlock,
  account-switch-clears-private-state,connection-loss-preserves-unsent-draft,
  sensitive-feature-state-rejected,draft-typed-during-reply,long-model-label-fits-mobile}`.
- `npm run test:finance:docker -- --runTestsByPath
  test/relationships/aiChat.db.test.ts test/relationships/modelSettings.db.test.ts`:
  **18 passed**. Disposable PostgreSQL, real Fastify API, signed gateway identities,
  encryption, verification, scope/concurrency/replay/revocation and migration tests.
- Live wrapper story: `ai-application-chat-live--authenticated-whole-app`. It uses
  the existing HOC around a full route tree, saves/tests through the real API,
  receives server replies, navigates with a draft, reloads history, then overrides
  the model and verifies the chat is locked until re-tested. External model
  transport is synthetic; durable records and permissions are real.
- Existing settings regression runner: **14/14 stories passed**; its authenticated
  live browser journey also passes in the combined database suite.
- API typecheck and UI production/Storybook builds passed. UI full typecheck retains
  21 unrelated baseline errors and no errors in the chat/settings changes.
- Visual QA: `output/chat-2026-11-05/screens/application-chat-mobile.png`. The prior
  font-fallback defect screenshot is retained alongside it.
- Explicit configured-provider test uses only a disposable synthetic account and
  synthetic messages: `CHAT_REAL_PROVIDER=1 npm run test:finance:docker --
  --runTestsByPath test/relationships/aiChatProvider.db.test.ts`. **Blocked** before
  chat unlock. Configured Qwen returned HTTP 400 / `Arrearage`; earlier Muse
  verification returned 401. No provider account/billing changes were attempted.

Results/logs: `output/chat-2026-11-05/`, including API/UI build/typechecks,
`storybook/results.json`, `live-storybook/results.json`, `database-tests.log`,
`settings-story-regressions.log`, redacted provider results/diagnostic and local
source/deployment checksums. Synthetic fixtures never write to the application.
The browser harness allows only its own isolated API and Storybook origins.

## Deployment and remaining work

The verified code is staged in the local development API/UI, with fourteen source
files checksum-verified against the checkout. Services restarted healthy, the new
migration is recorded once, and Vite serves the application-wide wrapper/context.
The workspace database remains on its private Docker network; the other project's
host PostgreSQL was not changed. No account model setting or credential was edited
for the user's account, no package was published and no production deployment or
commit was performed. This is local development integration, not shared staging.

The four bounded regression bugs AIN-146/147/148/149 are Done, with verification
evidence recorded and Jira statuses read back. AIN-143/144/145 remain In Progress: successful real provider conversation
and integrated staging/version rollout are still required. The overall requested
outcome is therefore **incomplete**, despite completed local implementation and
synthetic/API/browser checks. Next: restore valid provider account access, repeat
the synthetic configured-provider test, then verify the staged application and
complete the deferred account test when the user returns. Do not manufacture a
connection result or silently switch providers to close the ticket.
