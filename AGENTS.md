# Product purpose (read first)

AInsured is an AI-powered insurance, reinsurance, risk-participation and capital marketplace that connects institutional insurance participants with independent capital providers. Repositories and code use the `Ensured*` prefix. [PRODUCT.md](PRODUCT.md) is the authoritative vision. Read it before planning product, domain-model or UI work, and build toward it.

- **Two first-class user categories.** Institutional participants (insurers, reinsurers, brokers, MGAs/MGUs, funds) act through organization accounts with explicit roles and authority. Independent public participants act without any organization membership. Never require one.
- **Two experiences, one infrastructure.** The Institutional experience covers networking, underwriting, placements, facilities, capacity and servicing. The Public Capital Marketplace covers discovery, opportunity details, capital commitment and portfolio. They differ in permissions and eligibility, not in duplicated systems.
- **Separate relationships.** Keep identity, investor eligibility, investment ownership, financial contribution, risk assumption and capacity allocation as distinct relationships. An investment commitment never creates a policy or reinsurance agreement. The legal vehicle, not the investor, enters risk-bearing contracts.
- **Financial integrity.** Keep separate ledgers for cash, commitments, collateral and risk-bearing capacity. Never double-count pooled capital or allow commitments beyond available eligible capital. Make operations atomic and idempotent, and keep complete audit trails.
- **Compliance is first-class.** Enforce KYC/AML, sanctions, investor eligibility and geographic restrictions. Keep public opportunity data separate from confidential underwriting data. Use regulated partners where the law requires them.
- **Honest numbers.** Never present projected returns as guaranteed. Model losses, lockups, liquidity limits and distribution waterfalls explicitly. Every price, loss or score must trace to a documented method.
- **Risk-class agnostic.** A line of business is configuration, never a code branch ([roadmap](docs/product/roadmap.md)).
- **Extend, don't duplicate.** Before adding the domain concepts named in PRODUCT.md, map them onto existing models and documents (for example investor profiles, `capitalCommitments`, `trancheSubscriptions`, [docs/data-models/](docs/data-models/)). Keep changes additive and backward-compatible.

Supporting context: [docs/README.md](docs/README.md) indexes all documentation by intent (product, architecture, features, data models, proposals, history) and marks each document current, proposed or historical. Treat proposals and history as background, not as requirements. The [roadmap](docs/product/roadmap.md) sequences delivery, with the insurer-side underwriting pipeline in Wave 1 and the capital bridge in Wave 2. Its audit table predates Wave 1 completion; see the [Wave 1 build summary](docs/history/wave-1-build-summary.md). The [stablecoin network design](docs/proposals/network-consensus-v0.1.md) is not part of the stated vision. Treat it as unconfirmed and do not build on it without owner direction.

Agent skills: project skills live only in [.agents/skills/](.agents/skills/README.md), shared by every provider. `.claude/skills` is a symlink to it. Add or edit skills there, keep them provider-neutral, and follow the portability rules in its README.

# Ticket-driven delivery and session continuity

## Establish the complete scope

- Read these instructions and `TASK_HANDOFF.md` at the start of each session. Refresh relevant Jira issue details and statuses before continuing; a previous session's report is not proof of the current state.
- For ticket-driven work, inspect the selected tickets, their subtasks, parent acceptance criteria, and linked dependencies before defining scope. Follow required dependencies until the work needed for the user's requested outcome is understood.
- Record a ticket map distinguishing required work from unrelated linked issues, with reasons for exclusions. Do not assume every link is a dependency or expand into unrelated work.
- New implementation tickets supplement existing obligations; they do not replace them. Do not silently narrow the user's outcome to a component or a convenient subset of tickets.

## Deliver and verify

- Before merging code, run and pass typechecking, ESLint, and Prettier checks in every affected Node/TypeScript package, along with the tests required for the change. Run them against the final changes; do not treat a previous run as evidence for later edits. If a package lacks a check, add the appropriate configuration or explicitly record the gap; do not silently skip it or claim merge readiness. For EnsuredAPI, use `npm run check` (typecheck, ESLint, and Prettier); use `npm run format` to apply source formatting before checking.
- Work through required tickets and subtasks sequentially, respecting dependencies. Move each through its actual Jira workflow as work starts and finishes.
- Mark an item Done only when its acceptance criteria are implemented and supported by appropriate verification. Record the changes, verification results, and any material limitations in the ticket.
- Check child subtasks and required dependencies before closing a parent. Do not equate completion of a component with completion of the broader outcome.
- Distinguish local implementation, integration verification, migration, and deployment. If acceptance criteria require deployment, local tests alone do not satisfy them.
- Add missing bug or gap tickets when necessary, link them to the appropriate parent or dependency, and include actionable acceptance criteria. Creating a ticket is not completion of the work it describes.
- Continue through the authorized required work. Do not stop after a narrower subset merely because it is useful or independently deliverable. Stop short of the requested outcome only when the user explicitly narrows or pauses scope, a concrete blocker prevents further progress, or an execution limit requires a handoff. Continue any unblocked work where possible.

## Preserve continuity

- Maintain a concise, version-controlled `TASK_HANDOFF.md` at the repository root for active multi-ticket work. Create it when beginning such work and update it after significant milestones and before ending a session.
- Include the original objective and user-approved scope changes; required tickets and subtasks with dependencies and acceptance criteria; excluded links and reasons; implementation status and relevant file paths; verification commands and results; migration and deployment status; concrete blockers; and the next unfinished step.
- Include Jira keys or links, but never credentials, tokens, or sensitive environment-file contents. Reference existing documentation rather than copying large logs.
- Treat the handoff as a navigation aid, not authoritative evidence. Reconcile it with Jira and the current code before resuming. Preserve unrelated existing changes.

## Reconcile before ending

- Compare the original requested outcome with every required ticket and subtask. Verify that none were omitted or silently deferred.
- Report completed work, remaining work, concrete blockers, and deployment status. If anything remains, say explicitly that the overall objective is incomplete and identify the next step.
- Update Jira and `TASK_HANDOFF.md` consistently. Never claim the broader outcome is complete solely because newly created implementation tickets are Done.

## User stories and interaction evidence

- Every new user-facing workflow must map to a Jira user story with an actor, intent, benefit, acceptance criteria, and links to its implementation tasks. Reuse an adequate existing story; create missing stories without replacing broader obligations.
- Every new or materially changed UI workflow must have Storybook stories with executable play functions that exercise user actions and assert observable results and submitted payloads. Include relevant validation, failure/retry, empty/loading, pagination and permission states; static screenshots alone are not interaction evidence.
- Maintain a ticket → component → Storybook story → verification mapping. Run the interaction stories and record results before marking their tickets Done. Log and fix discovered bugs, with regression stories.
- Use isolated synthetic transports for Storybook and block accidental application writes. Mocked stories prove UI behavior; retain API/database integration tests for authorization, durable state, accounting and concurrency. Backend-only changes require integration evidence and links to affected user stories, not artificial UI components.
- Carry story IDs, execution commands, coverage gaps and test evidence into Jira and TASK_HANDOFF.md across sessions.

## Before-and-after visual evidence

- For every UI placement, layout, styling or interaction change, capture the existing behavior before editing and attach clearly labeled **Before** screenshots to its Jira issue. Review requests must include this evidence when creating tickets, not defer it until implementation.
- Record the route or Storybook story ID, viewport dimensions, theme, browser zoom, scroll position, fixture/account role and relevant UI state for each capture. Include desktop and narrow-screen views when responsive behavior is affected. Prefer synthetic data; never upload credentials or private account, customer or financial details.
- Define the intended visual outcome and measurable acceptance criteria in the ticket. Keep the original Before attachments throughout the work. Screenshots of an open panel alone do not prove that its closed-state trigger is correctly positioned: capture both states when relevant.
- After implementation and verification, capture matching **After** screenshots using the same route/story, viewport, theme, zoom, scroll position and comparable data/state. Attach them to the same issue and add a short Before → After comparison, identifying the build/commit and verification results. Record unavoidable differences explicitly; never present mockups, old captures or another environment as proof of a completed change.
- Verify the Before and After attachments are readable and accessible from Jira, and carry attachment names/IDs plus the evidence mapping into TASK_HANDOFF.md. A local image path alone does not satisfy the attachment requirement.
- Do not mark a UI ticket or its parent Done until the required matching screenshots and executable interaction evidence are attached and reviewed. Planning-only tickets remain To Do with Before evidence and an explicit After-evidence requirement. If capture or upload is blocked, record the concrete gap and keep implementation completion unclaimed.

## Network and marketplace discovery

- For Social Network or marketplace planning/discovery, inspect **both EnsuredNetwork and EnsuredMarketplace**, plus their EnsuredUI host, EnsuredAPI projections and EnsuredAuth gateway boundaries. Include existing fixture stories and real-service journeys.
- Distinguish existing profiles, publications and deep-link handoffs from missing end-to-end behavior. Verify older review findings against current source before proposing duplicate stories. Preserve independent Network members, opt-in visibility, domain ownership and private financial mandates.
