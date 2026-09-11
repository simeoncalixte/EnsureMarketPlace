# Ensured Network — microfrontend product and design guide

Version 1.2 · 10 September 2026 · Status: proposed product specification, grounded in the current EnsureMarketPlace checkout.

## 1. Purpose and instructions for the implementing LLM

Design and implement a professional social network that introduces independent insurance professionals and insurance organizations through a familiar short-post timeline. Use the interaction grammar of Twitter/X: a central feed, profiles, following, replies, reposts, search, and notifications. Give it Ensured's identity and insurance-specific discovery rather than reproducing X branding or its entire feature set.

Working product name: **Ensured Network**. Navigation label: **Network**. Proposed package: `@ensured/network`. Proposed sibling directory: `EnsuredNetwork`. The separate application owns a frontend package, backend service, database, and application contracts. These names are new proposals, not existing packages.

The central job is: **“Help me find credible insurance counterparts, understand their interests, and start a relevant professional introduction.”** Optimize for useful relationships rather than impressions, follower counts, or time spent scrolling.

This is a separate social application whose microfrontend is embedded inside EnsuredUI. The social application owns its own backend and social persistence, with a clear service boundary from EnsuredAPI. It does not own authentication. It consumes existing services through a host-supplied request function and explicit adapters. It must not build registration, login, password recovery, OAuth, token refresh, session storage, organization provisioning, or a second application shell.

Read this whole guide before implementation. “MUST” indicates a requirement; “SHOULD” indicates a default with room for a documented alternative. All interfaces and social endpoints below are proposed contracts unless explicitly listed as observed. Do not present proposed capabilities as already available. When working without the repository, use the observed-service inventory as a dated reference and revalidate it before live integration.

## 2. Product assumptions and vocabulary

The user's phrase “independent insurers” is interpreted broadly as independent professionals operating in insurance, including agents, brokers, consultants, and underwriters. Do not label every individual an insurance carrier. Professional role, employer affiliation, license status, and authority to publish for a company are different concepts.

| Term | Meaning |
| --- | --- |
| Person | A professional associated with an existing platform user; an organization affiliation is optional |
| Organization | An existing company entity, such as a carrier, brokerage, MGA/MGU, or reinsurer; supported type labels must map to actual service values |
| Actor | The visible publishing identity: a person or an organization |
| Operator | The authenticated human initiating an action; captured by the server for audit |
| Follow | A one-way subscription to an actor's network-visible posts |
| Introduction | A private, structured request to begin a professional relationship; recipient acceptance is required |
| Appetite | Published interest in lines of business, territories, or counterpart types; never automatically a quote or commitment |
| Network-visible | Available to eligible signed-in platform members across organizations, not public on the internet |

MVP assumptions: English first; responsive browser experience; existing signed-in members; cross-organization networking is intentional; profiles are discoverable only after explicit network profile activation; no anonymous read mode. Profile activation is social setup inside an existing account, not registration or KYC enrollment.

## 3. Scope and priorities

### Required first release

- Home feed with Following and Discover tabs; chronological ordering in each, with explicit discovery filters.
- Person and organization profiles with approved network fields, specialties, territories, and clear actor labels.
- Short text posts, replies, likes, reposts, bookmarks, and copied links.
- Search across people, organizations, and posts using line-of-business and territory filters.
- Follow/unfollow and structured introductions with accept, decline, cancel, and pending states.
- Organization publishing only for operators with a server-validated grant.
- In-app social notifications backed by a real endpoint when enabled.
- Report, mute, block, ownership-aware deletion, and a staffed report-processing workflow before external rollout.
- Complete loading, empty, denied, error, offline, and session-change behavior.
- Host integration, XDS themes, accessibility, responsive layouts, fixture stories, contract tests, and Storybook user journeys running against real isolated servers as specified in section 19.

### Deferred until a separate contract exists

Direct messaging, group conversations, document uploads, image/video posts, quote posts, polls, trending topics, ads, subscriptions, algorithmic ranking, public indexing, live audio, organization-only channels, and automatic matching scores. Do not add decorative controls for these features. “Message” is not an MVP button; use “Request introduction.”

Keep quoting, binding, claims, submission processing, underwriting decisions, payments, and capital commitments in their existing applications. The network can link to an authorized destination using host navigation. It must not duplicate those workflows or expose their private records in posts.

## 4. Verified repository context and integration inventory

Observed from local source on the date above; this was source inspection, not a runtime service audit.

| Existing surface | Evidence in repository | Use and limitations |
| --- | --- | --- |
| Host | `EnsuredUI/src/Pages/Marketplace/Marketplace.tsx`, `EnsuredUI/src/AppRoutes.tsx` | Existing host lazy-loads a packaged microfrontend and injects `apiRequest`; add Network through this pattern |
| Microfrontend precedent | `EnsuredMarketplace/README.md`, `package.json`, `src/api.tsx` | React/TypeScript, Vite library build, CSS and declarations; build-time composition, requiring a host rebuild |
| Shared UI | `EnsuredXDS/README.md`, `src/theme.tsx`, `src/components/index.ts` | Reuse `@ensured/xds`, shared theme, exported controls; host loads fonts |
| Request client | `EnsuredUI/src/api/client.ts` | Stable `(path, init) => Promise<Response>` seam; cookie credentials and underlying legacy bearer plumbing belong to host |
| Current membership | `EnsuredAPI/src/routes/auth.ts`, registered under `/api` in `src/app.ts` | `GET /api/auth/me` gives user id, email, names, role, organizationId; host consumes it, not the social package |
| Organizations | `EnsuredAPI/src/routes/organizations.ts` | `GET /api/organizations` and `GET /api/organizations/:id` exist; require an approved public-field projection before social use |
| Users | `EnsuredAPI/src/routes/users.ts` | Generic user routes exist; they are not an approved network directory or public profile API |
| Appetite | `EnsuredAPI/src/routes/organizationAppetite.ts` | `GET /api/organizations/:id/appetite` exists; internal appetite/rules must not be automatically published |
| Taxonomy | `EnsuredAPI/src/routes/marketplace.ts`, `EnsuredMarketplace/src/Pages/Marketplace/useMarketplaceData.ts` | `GET /api/marketplace/line-of-business-taxonomy` exists; preserve canonical codes and labels through an adapter |
| KYC | `EnsuredAPI/src/routes/kycStatus.ts`, `EnsuredKYC/README.md` | `GET /api/kyc/status` describes the current subject; it is not a public badge lookup for arbitrary profiles |
| Discovery | `EnsuredServices/README.md` | Gateway/server resolves services; registry tokens and internal service locations never enter the network browser bundle |
| Identity and gateway | Root README, `EnsuredAuth/src/gateway.ts` | Existing auth gateway owns identity transport; browser does not create gateway signatures or handle gateway secrets |
| Notifications | EnsuredAPI README lists a notifications model | A model alone does not establish a suitable social notification API; verify handlers and delivery ownership before integration |

Dedicated posts, follows, introductions, and social moderation routes were not identified in the inspected route files. Treat them as backend gaps. Existing generic users/organizations CRUD handlers do not establish safe publication, opt-in, object authorization, or redaction guarantees. A browser-side field filter cannot fix sensitive fields already returned over the network.

Preserve the parent/submodule layout. A future implementation must explicitly account for changes within each owning repository and parent references. This guide does not require changing any current service now.

## 5. Ownership and microfrontend architecture

```text
EnsuredUI host
  ├─ existing session, account UI, global navigation, router, theme, fonts
  ├─ stable request adapter, route adapter, telemetry adapter
  └─ @ensured/network
       ├─ feed, discovery, profiles, composer, introductions, social notifications
       └─ same-origin host request('/api/network/...')
            └─ existing gateway: routes /api/network/* to new service
                 └─ EnsuredNetwork API — separately deployed application
                      ├─ Network database: social records only
                      ├─ social authorization, persistence and moderation
                      └─ explicit server API adapters
                           ├─ EnsuredAPI: approved people/organization projections
                           ├─ taxonomy and approved public appetite projections
                           └─ approved verification source, when available
```

The separate application exports an **ESM microfrontend package composed at build time**, matching EnsuredMarketplace. Its backend is independently deployed from day one; package composition does not move backend ownership into the host. Export the entry component, public types, and scoped CSS. Use the host's installed compatible React, React DOM, styled-components, and XDS runtimes. Do not choose or upgrade dependency versions independently of the host.

Independent frontend deployment through Module Federation is a later architecture decision, not a requirement for the application boundary. Build-time frontend integration requires a host rebuild for frontend releases; the social backend still has its own deployment lifecycle. If adopted, configure actual runtime singletons and compatibility negotiation; peer dependencies alone do not supply them. Do not add an iframe, independent browser router, global store, or runtime service discovery for this MVP.

| Owner | Responsibilities |
| --- | --- |
| Host | Authenticate, establish viewer context, provide request transport, manage global routes/theme/session recovery and host chrome |
| Network microfrontend | Present social screens; collect user intent; validate forms for usability; manage instance-local state and capability-aware controls |
| Separate EnsuredNetwork backend | Authorize every social object/action; own social persistence and migrations; assemble safe projections through service APIs; enforce limits, visibility, idempotency and moderation |
| Existing identity/KYC/organization services | Remain authoritative for their existing records and status; no duplicate identity database |

**Required application boundary:** implement the social backend in EnsuredNetwork, not as routes, models, migrations, or business logic inside EnsuredAPI. The existing gateway forwards `/api/network/*` to the separate service before any generic `/api/*` catch-all. That URL namespace is a routing contract, not a statement that EnsuredAPI owns the route.

EnsuredNetwork owns its repository/application root, backend process/container, environment configuration, social database, migrations, API specification, test suite, and release lifecycle. The database may use shared PostgreSQL infrastructure but MUST use a separate logical database and service credentials. No cross-service SQL, shared ORM models, foreign keys into another service's database, or imports of another service's implementation. Store external user/organization IDs as references and use documented APIs for their approved projections. Network must not modify identity or organization master records.

The backend validates the existing gateway's trusted identity transport and authorizes social operations; this is not a new login/session system. Never trust unsigned browser identity headers. Reuse a documented gateway verification contract or isolated shared verifier package, not identity-service source imports. Define gateway-to-Network audience, signing/validation, replay bounds, trusted headers, and service-to-service credentials before enabling live traffic. Secrets remain server-side. The frontend receives presentation context only.

Register the new runtime service as proposed `ensured-network` in EnsuredServices and add gateway destination configuration through the owning repositories. Register the frontend as an embedded library with no runtime health URL when using package composition. The social service exposes liveness and readiness independently; feed reads should not fail solely because optional recommendations or a verification provider is down.

Integration adapters call approved APIs with explicit timeouts and error handling. Cache only minimal approved display projections with source IDs, versions/timestamps and a defined freshness policy. Revalidate permissions for sensitive actions; do not authorize from stale display caches. On deactivation, privacy changes, or membership revocation, invalidate affected projections and grants through a documented event contract or bounded refresh mechanism. Any event integration is proposed until an actual event schema, delivery and reconciliation process exists.

A standalone frontend harness supports independent development and previews. It uses synthetic context or the existing gateway's session context, never a new login implementation. A production standalone entry, if later needed, must be supplied by a thin host adapter that delegates authentication to the existing platform. Embedding in EnsuredUI remains the primary product entry.

### Host entry contract — proposed TypeScript

```ts
export type ActorRef = { kind: 'person' | 'organization'; id: string };
export type Capability =
  | 'post:create' | 'post:reply' | 'post:react' | 'actor:follow'
  | 'introduction:create' | 'profile:edit' | 'report:create';

export interface NetworkViewer {
  userId: string;
  // Opaque host-generated value; changes on session, tenant or grant changes.
  contextKey: string;
  personActor: ActorRef;
  activeActor: ActorRef;
  actorGrants: Array<{ actor: ActorRef; capabilities: Capability[] }>;
}

export interface NetworkProps {
  contractVersion: 1;
  viewer: NetworkViewer;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  route: { pathname: string; search: string }; // host-owned location
  basePath: string; // default '/network'
  navigate: (path: string, options?: { replace?: boolean }) => void;
  onActorChange: (actor: ActorRef) => void; // requests host context update
  onSessionRequired: () => void;
  onNavigateToEntity?: (entity: {
    kind: 'organization' | 'opportunity'; id: string;
  }) => void;
  features: {
    introductions: boolean;
    notifications: boolean;
    organizationPublishing: boolean;
  };
  locale?: string;
  timeZone?: string;
  onEvent?: (event: {
    name: string; properties: Record<string, string | number | boolean>;
  }) => void;
}
```

The viewer object is a presentation context, never proof of authorization. The server derives the operator from its authenticated request and rechecks the selected actor's grants. The current `/api/auth/me` response does not provide these actor grants: a host/backend adapter must obtain them. A single `organizationId` does not imply administrator or publisher permission.

Host wraps `<Network>` in its existing XDS theme and error boundary and imports Network CSS once. Host owns route registration at `/network/*` and passes location changes; Network parses its relative route and requests navigation through the callback. Network does not independently render a second `BrowserRouter`. Avoid nested `main` landmarks: host adapter and embedded root agree which owns `main`.

All requests use the injected function and relative allowlisted paths. No direct imports from EnsuredUI internals, identity SDKs, local storage tokens, hardcoded localhost origins, catalog clients, or private backend URLs. Request cancellation, non-2xx handling, and body parsing stay in a network API adapter. Session-expiry callbacks are deduplicated per context.

On `contextKey` change, unmount/reset the local provider tree, abort requests, discard sensitive drafts and caches, close dialogs, and ignore late responses from the previous context. Actor changes also reset actor-dependent queries and mutations. A same-person actor switch with an unsent draft asks whether to discard the draft before requesting the host update; never silently reassign the author. On involuntary logout/context revocation, clear it immediately.

On unmount, release observers, timers, subscriptions, portals, and pending requests. Use instance-scoped providers and namespaced IDs; two embedded instances must not share mutable viewer state.

## 6. Identity, visibility, and professional trust

A person profile references an existing user. An organization profile references an existing organization. Social profile activation stores only network-specific fields and publication choices. Do not create a new identity or organization through the composer or profile editor.

People may publish for themselves without organization membership if the backend grants access. Organization publishing requires an explicit grant returned for that actor. The composer always shows “Posting as Maya Chen” or “Posting as Harbor Mutual.” Person avatars are circular; organization logos are rounded squares. Include a visible “Organization” label so shape is not the only distinction.

A person post may show “Underwriter · Harbor Mutual” when that affiliation is approved. It is still a person post. An organization post shows the company as author. The operator is retained in private audit data, not automatically exposed publicly. Membership revocation prevents new organization actions; historical posts retain the organization as author.

Network-visible profiles and posts cross tenant boundaries by explicit policy. Private source records, drafts, bookmarks, introductions, reports, and notification inboxes remain scoped. Organization affiliation does not grant every employee access to organization introductions: only authorized recipients/publishers can access that inbox.

Trust indicators are separate fields:

- “Identity verified” requires an approved status projection from an authoritative source.
- “Organization affiliation confirmed” requires a validated membership claim.
- License details require a separate authoritative integration and jurisdiction context; otherwise omit any license badge.
- Self-described specialties are labeled profile information, not independently certified expertise.

Never turn KYC completion into “Licensed insurer,” financial strength, solvency, regulatory endorsement, or authority to bind. Do not expose KYC documents, rejection reasons, birth dates, private email, or internal reviewer data. If public verification projection does not exist, omit that badge; do not call current-user KYC once per viewed profile.

## 7. Information architecture and routes

All routes below are proposed host routes. Use opaque IDs as canonical references; optional handles are presentation only. Encode IDs and query values before navigation.

| Route | Screen |
| --- | --- |
| `/network` | Home; Following and Discover tabs |
| `/network/explore` | Search and directory; query/filter state in URL |
| `/network/people/:id` | Person profile |
| `/network/organizations/:id` | Organization profile |
| `/network/posts/:id` | Post thread and replies |
| `/network/introductions` | Received/sent requests and accepted introductions |
| `/network/notifications` | Social notification inbox |
| `/network/bookmarks` | Private saved posts |
| `/network/profile/edit` | Current permitted actor's social profile editor |

Primary navigation: Home, Explore, Introductions, Notifications, Bookmarks, My profile. The host supplies global platform navigation; use a compact local section navigation only where the host has not already provided it. Avoid two left sidebars or two mobile tab bars.

If a feature is disabled, omit its navigation and actions. Direct links to a disabled route show “This feature isn't available in this workspace” with a route back home. Deep links must survive refresh and browser Back/Forward. Preserve the selected tab, filters, loaded pages, and scroll position during same-context return navigation when practical.

## 8. Visual direction and layout

Design a credible, calm professional network with a lively editorial feed. Posts are the primary content. Do not turn Home into an analytics dashboard with KPI tiles, charts, or a large marketing hero.

Use existing XDS colors and typography. The inspected themes use warm light surfaces, forest-green primary actions, and dark charcoal surfaces with pale-green actions in dark mode. Semantic tokens remain authoritative; do not hardcode these observed colors as an alternative theme.

| Social purpose | XDS mapping / proposed sizing |
| --- | --- |
| Canvas | `theme.colors.background` |
| Feed and panels | `surface`, `surfacePanel` |
| Primary action | `primary` with `onPrimary`; verify interaction-state contrast |
| Body and metadata | `textPrimary`, `textSecondary` |
| Dividers | `border` or `outlineVariant` |
| Error | `error` with suitable contrasting text/surface |
| Fonts | Host-loaded Inter for body; Manrope for headings if already configured |
| Body / metadata / heading | 16px at 1.5 line height / 13–14px / 22–28px |
| Spacing | 4, 8, 12, 16, 24, 32px; prefer corresponding existing tokens |
| Corner treatment | Inputs/buttons 8–12px; auxiliary cards 12–16px; feed divided into rows |
| Avatars | 40–44px in posts; 80px in profile header |
| Motion | Short 120–180ms transitions; honor reduced motion |

Breakpoint behavior uses **available content width after host chrome**, preferably container queries. Avoid assuming viewport width equals the microfrontend width.

- At 1180px and above: optional 208px local navigation, flexible 560–680px feed, 280px discovery rail, 24px gutters. If the host already supplies section navigation, reclaim that column.
- At 800–1179px: compact navigation or host navigation plus central feed; remove the discovery rail. Keep suggestions in Explore rather than hiding functionality.
- Below 800px: one column; compose opens a full-width dialog/sheet; filters move into an accessible sheet; host owns mobile navigation. At 320px, text and controls reflow without horizontal page scrolling.
- Center the feed when no rail is rendered. Do not stretch post text across a very wide monitor.

Conceptual desktop arrangement within the host content area:

```text
[Host header and platform navigation — already provided]
┌──────────────────┬─────────────────────────────────┬─────────────────────┐
│ Network sections │ Home          Following Discover│ Search professionals│
│ Home             │─────────────────────────────────│                     │
│ Explore          │ Posting as: Maya Chen           │ Suggested people    │
│ Introductions    │ Share an insurance perspective… │ Suggested companies │
│ Notifications    │                    [Post]       │                     │
│ Bookmarks        │─────────────────────────────────│ Relevant specialties│
│ My profile       │ Person/organization post        │                     │
│                  │ Reply · Repost · Like · Save    │                     │
│ [Create post]    │ Next post…                      │                     │
└──────────────────┴─────────────────────────────────┴─────────────────────┘
```

This is a layout specification, not a requirement to display an extra navigation column inside every host configuration.

## 9. Screen and interaction specifications

### Home feed

Default to Following when the actor follows someone; otherwise open Discover with a concise invitation to find relevant people. Retain the last explicit tab choice within the same viewer context. Following includes original posts/reposts from followed actors plus the actor's own posts; standalone replies appear in threads and profile Replies, not as unrelated home rows. Discover contains eligible network-visible original posts filtered by explicit interests, newest first. No opaque relevance scores in MVP.

Use a stable cursor sorted by `(createdAt, id)` and snapshot boundary. Fetch 20 rows by default. Deduplicate by feed-entry ID; a repost entry also references its original post. Never inject new posts above the reader automatically. Show a “New posts available” control only when a supported refresh mechanism reports them; otherwise offer manual refresh. “Load more” is always available even if intersection-based loading is used.

The right rail shows up to three explainable suggestions, for example “Also works in marine” or “Publishes in your selected territory.” These are based only on published profile fields, not private underwriting rules. No fabricated recommendation explanations.

### Post anatomy

Every post row has author avatar/logo, display name, person/organization marker, optional professional descriptor, timestamp with full accessible date, body, optional specialty/territory tags, and action row. Offer contextual actions in an overflow menu: copy link, mute author, block author, report; permitted owners also see delete.

Body is plain text with safe link and mention rendering. Show up to approximately eight lines before “Show more”; preserve the complete text for expansion. Prefer natural row height over clipping. Long URLs and names wrap. Render external links safely; MVP does not fetch arbitrary link-preview metadata.

Action order: Reply, Repost, Like, Bookmark, Copy link. Likes mean appreciation, not endorsement of risk or credit quality. Reposts share the original within its existing audience and are labeled with the reposting actor. Bookmarks are private. Copy link only copies a URL; recipients still need permission to view it.

### Composer

Inline compact composer on Home; expanded dialog for detail. Fields: active actor, body, optional up to three canonical specialty tags and three territory tags, network visibility label, character counter, Post button. Replies use the same text rules and inherit thread visibility. No uploads in MVP.

Proposed limits: 500 Unicode code points for body, 160 for profile headline, 1,000 for profile bio, 300 for an introduction note. Frontend and backend must use the same code-point counting rule (`Array.from(text).length`), trim for empty validation, preserve meaningful newlines, and return field-level errors. Do not enforce only native UTF-16 `maxLength` and call it equivalent. Service configuration may change these limits, but must then update contracts and UI together.

Post is disabled for whitespace-only, over-limit, pending, denied, or unavailable service states. Enter inserts a newline. Ctrl/Cmd+Enter may submit when valid; provide a visible hint, and never submit while an input method is composing text. On success, replace pending state with the canonical server record and clear draft. On failure, keep the draft for this context with inline error and retry. Never show “Posted” before server acknowledgement.

Drafts remain in instance memory only for MVP; no browser persistence or background autosending. Intentional navigation with an unsent draft offers Keep editing / Discard through a host-compatible blocker. Session expiration clears sensitive draft data on context revocation.

### Thread

Show parent context, selected post, and replies with oldest-first cursor pagination to maintain conversation order. MVP supports replies to the root; replies to a reply reference that comment but render at one indentation level. Deleted/restricted parent posts use a neutral tombstone and server-authorized reply behavior. Do not leak deleted text through cached quote snippets or notifications.

### Person profile

Header: avatar, display name, professional role/headline, approved affiliation, broad location, specialties, territories, and optional authoritative trust labels. Actions: Follow and Request introduction, or Edit profile for the permitted owner. Tabs: Posts, Replies, About. Keep follower counts secondary. About includes a professional bio, approved website, and declared networking interests.

Do not expose private email/phone by default. Blank fields collapse cleanly; never manufacture endorsements or verified badges. A person with no organization displays their own role and specialties without an “incomplete” warning solely for being independent.

### Organization profile

Header: logo, legal/display name as approved for publication, organization type, headquarters region, territories served, specialties, website, and permitted verification labels. Tabs: Posts, About, People. People lists only members who opted into visible affiliation. “No public team members yet” is valid.

Show only an explicitly approved public appetite summary and publication timestamp. Never expose the raw rules editor, internal acceptance thresholds, confidential capacity, or private submission statistics. “Edit appetite” routes authorized users to the owning host workflow; it is not a Network editor for internal rules.

### Explore and search

One labeled search field with People / Organizations / Posts tabs. Filters: specialty from existing taxonomy, territory from an agreed vocabulary, actor type where relevant. Search waits about 300ms after typing and cancels obsolete requests. Search/filter changes reset the cursor and are URL-addressable; encode all values. The backend applies eligibility and visibility before counting or ranking results.

Start with deterministic text relevance and an explicit stable tiebreaker. Explain matching specialties in result cards. Display “No results for these filters” with Clear filters, not unrelated filler data. When taxonomy is unavailable, retain the feed and show the specialty filter as temporarily unavailable; do not replace service values with invented canonical codes.

### Introductions

The primary relationship flow is Discover → Profile → Request introduction → Receive decision → View accepted introduction. Follow is independent and never implies consent to a private conversation.

Dialog: destination actor, sender actor, purpose (market appetite, placement partnership, reinsurance relationship, professional networking, other), and a 300-character note. Explain that it is private to the counterpart's authorized recipients. No risk documents or insured-person details.

States: `pending → accepted | declined | cancelled`; accepted is terminal in MVP. Only authorized recipients accept/decline; only the sender cancels a pending request. One pending request per unordered actor pair; a reverse attempt returns the existing pending relationship. Declined requests enforce a server-managed cooldown. Block prevents new requests. Avoid optimistic acceptance or submission.

Acceptance opens a persistent private introduction detail with the original note, participants, timestamps, and any contact method explicitly supplied for this relationship. It does not silently email anyone, reveal account email, or create a nonexistent DM room. If an approved host messaging integration is added later, expose its callback as a separately flagged action.

### Notifications and bookmarks

Notifications are scoped to the active actor and authorized operator; private personal inboxes do not merge with company inboxes. Types: reply, mention, follow, introduction received, introduction accepted. Coalesce noisy likes/reposts if enabled later. Read/unread state and unread count come from the same backend. Notifications link only to currently accessible resources and use tombstones for removed content.

Bookmarks belong to the human viewer in MVP, regardless of selected publishing actor. Their query scope still includes current permissions. A bookmarked post that becomes inaccessible loses its content and appears as “This post is no longer available.” Saved content is not a permission bypass.

## 10. Component system and state model

Reuse XDS Button, Input, Select, Badge, Modal, FormField, ValidationMessage, and existing typography exports where their actual APIs fit. Inspect exports before importing. Add network-specific components within the package; propose generic XDS additions separately.

Suggested component boundaries: `NetworkRoot`, `NetworkNavigation`, `FeedTabs`, `FeedList`, `PostCard`, `PostActions`, `PostComposer`, `ActorIdentity`, `ActorSwitcher`, `ProfileHeader`, `ProfileAbout`, `SpecialtyChips`, `DiscoveryCard`, `SearchFilters`, `IntroductionDialog`, `IntroductionCard`, `NotificationRow`, `ReportDialog`, and `AsyncState`.

Each interactive component documents props, accessibility labels, ownership/capability conditions, and state stories. All list keys use stable IDs. Do not use array positions for live content.

| Situation | Required behavior |
| --- | --- |
| First load | Three proportionate skeleton rows; scoped loading announcement; no fake content |
| Empty following | “Follow people and organizations to build your feed.” → Explore |
| Empty profile | “No posts yet.” Owner can create a post; visitors can follow |
| Partial failure | Feed remains usable if suggestions or taxonomy fail; local retry in failed region |
| Initial feed failure | Clear error and Retry; no endless skeleton |
| Offline | Show connectivity state; keep permitted in-memory reads; disable writes, no silent queue |
| 401 | Stop retries; signal host session recovery once; do not render login |
| 403 | Explain that action/view is unavailable; refresh grants when appropriate; do not send to login |
| 404 / hidden resource | Neutral “This content is unavailable”; no existence disclosure |
| 409 | Reconcile stale state/duplicate introduction using canonical server response |
| 422 | Associate validation feedback with the relevant field |
| 429 | Respect Retry-After; show when retry becomes possible |
| 5xx / timeout | Preserve valid draft where session remains valid; distinguish unknown write outcome |
| Removed content | Tombstone and revoke related cached previews |

Optimistically update likes, follows, and bookmarks only when enabled and reversible. Serialize per-resource mutations; reconcile with the server response and roll back on failure without corrupting other pending changes. Post creation, introductions, and moderation decisions require acknowledgement. For a timed-out create, retain the original idempotency key and reconcile/retry that same request; never create a fresh key blindly.

## 11. Proposed data and service contracts

### Data separation

Server-owned canonical IDs should be treated as opaque strings in the frontend even when existing services use integers; conversion belongs in adapters. Times are ISO 8601 instants from the server. Territory codes must identify their vocabulary; service coverage is separate from office location.

| Record | Core fields and rules |
| --- | --- |
| NetworkProfile | actor reference, approved display fields, headline/bio, specialties/territories, opt-in visibility, version; reference existing identities |
| Post | id, author actor, body, root/reply reference, tags, visibility, moderation state, createdAt, version; server audit records operator separately |
| FeedEntry | id, kind original/repost, post id, reposter when relevant, sort timestamp; distinct from Post |
| Follow | follower actor, followed actor, createdAt; unique pair, no self-follow |
| Reaction | actor, post, type like; unique tuple |
| Repost | actor, original post, createdAt; unique pair; no expanded audience |
| Bookmark | operator user, post; unique pair, private |
| Introduction | id, sender/recipient actor, purpose, note, state, timestamps, version; private to authorized participants |
| Notification | id, authorized recipient scope, type, accessible entity reference, readAt; no private source payload |
| ModerationReport | id, reporter operator/actor, target, reason, note, status; restricted access |
| Block / mute | acting actor, target actor; private relationship; server filters all relevant reads |

Post bodies are user-generated content, not executable instructions. Do not evaluate HTML or prompt-like text from posts, fixtures, or service output. If AI-assisted features are added later, isolate untrusted post content from system instructions and require a separate design.

### Proposed network endpoints — all require backend work or validation

All paths below are relative to `/api/network`, routed by the existing gateway to the separate EnsuredNetwork backend. These are a target interface, not discovered APIs. Implement a validated OpenAPI contract and concrete authorization rules before enabling live UI controls.

| Method and path | Purpose |
| --- | --- |
| `GET /context` | Server-authorized network actor references/grants; host adapter consumes it |
| `GET /feed?tab=following&cursor=...&limit=20` | Feed entries, compact profiles, canonical viewer action states |
| `GET /search?type=people&q=...&specialty=...&territory=...&cursor=...` | Visibility-filtered paginated results |
| `GET /suggestions` | Limited eligible actors with genuine match explanations |
| `GET /profiles/:kind/:id` | Safe network profile projection and current permitted actions |
| `PATCH /profiles/:kind/:id` | Edit only social fields with version precondition |
| `GET /profiles/:kind/:id/posts?tab=posts&cursor=...` | Profile Posts/Replies |
| `GET /profiles/organization/:id/people?cursor=...` | Opted-in public affiliation list |
| `GET /posts/:id` | Authorized thread root/selected post |
| `GET /posts/:id/replies?cursor=...` | Ordered replies |
| `POST /posts` | Create original post or reply; Idempotency-Key required |
| `DELETE /posts/:id` | Ownership-authorized removal; audited, idempotent |
| `PUT` / `DELETE /posts/:id/like` | Set/remove current actor's like |
| `PUT` / `DELETE /posts/:id/repost` | Set/remove current actor's repost |
| `PUT` / `DELETE /posts/:id/bookmark` | Set/remove current operator's bookmark |
| `GET /bookmarks?cursor=...` | Current operator's accessible saved posts |
| `PUT` / `DELETE /profiles/:kind/:id/follow` | Set/remove current actor's follow |
| `POST /introductions` | Create private request with Idempotency-Key |
| `GET /introductions?box=received&cursor=...` | Authorized inbox; also supports sent/accepted |
| `GET /introductions/:id` | Private accepted or pending introduction detail |
| `PATCH /introductions/:id` | Explicit transition with If-Match version |
| `GET /notifications?cursor=...` | Authorized social inbox and unreadCount |
| `PATCH /notifications/:id` | Mark read; only permitted recipient |
| `POST /reports` | Submit report, return reference; Idempotency-Key |
| `PUT` / `DELETE /profiles/:kind/:id/mute` | Set/remove actor mute |
| `PUT` / `DELETE /profiles/:kind/:id/block` | Set/remove actor block |

Actor-scoped requests carry proposed `X-Network-Actor: person:<id>` or `organization:<id>`, assembled from viewer context by the network adapter. The header selects intent only; it grants no authority. The server validates membership/grants on every request. Define this header in the gateway allowlist and server contract before using it. Never accept a client-supplied operator ID as identity proof.

Server determines effective audience, timestamps, counts, moderation state, operator audit fields, and permitted actions. Client may request only `network` visibility in MVP. Replies/reposts cannot broaden access. Do not embed tenant context in a forged auth claim.

Proposed response envelopes:

```ts
interface Page<T> {
  data: T[];
  nextCursor: string | null;
  snapshotAt: string;
}
interface NetworkError {
  error: {
    code: string;
    message: string;
    requestId: string;
    fieldErrors?: Record<string, string>;
  };
}
```

Use opaque cursors with a stable snapshot; reject a cursor reused with different filters or actors. Enforce default limit 20, maximum 50. Mutation responses return canonical entities/action state and version; DELETE may return 204. API adapter tolerates empty 204 bodies. Return Retry-After on rate limiting. Use If-Match/ETag for profile edits and introduction transitions; return a consistent conflict code for stale versions and map it to refetch/review.

Idempotency is server-enforced and scoped to operator, actor, method, path and payload hash. Reuse with a different payload is a conflict. Proposed retention is at least 24 hours; beyond that window, require reconciliation before a create retry. One browser disabling a button is not sufficient duplicate prevention.

Before any live connection, confirm: actual route existence, payload schema, auth forwarding, server-side field allowlist, cross-organization read policy, object/action authorization, pagination, error shape, and response versioning. Provide adapters for existing envelope/ID differences. Never infer an endpoint from a table name or a UI label.

## 12. Security, privacy, and moderation behavior

This section describes product and engineering requirements, not a claim of regulatory compliance.

- Server performs authentication through existing infrastructure and authorization per actor, object, recipient, and operation. Hidden buttons are only presentation.
- Use the existing host/gateway protections for cookie-based mutations, including the established CSRF/origin controls. Network does not invent a competing auth mechanism or weaken them.
- Return only approved profile fields from a backend projection. Private identity, KYC, appetite rules, claims, and submission data must never reach the social browser response.
- Render user text safely without raw HTML injection. Allow only approved URL protocols; external links use appropriate opener isolation. No arbitrary server-side URL preview fetch in MVP.
- Do not allow uploading policy schedules, insured personal information, loss runs, claims evidence, or customer documents. Composer copy: “Share professional insights. Keep client and policy details private.”
- Mute hides an actor from the muter's feed/suggestions/notifications without notifying the target. Block also prevents new follows, replies to the blocker, and introductions between the pair, removes existing follows, and suppresses mutual discovery. The server enforces it on reads and writes; define organizational block permissions explicitly.
- Report reasons: spam, impersonation, harassment, confidential information, misleading professional claims, other. Give a confirmation reference; do not reveal reporter identity to the subject.
- Backend moderation must support triage, restricted reviewer access, recorded decisions, removed-content behavior, and escalation ownership. A report dialog without any processing owner is not launch-complete.
- Post deletion removes visible text and references from feed/search/cache projections. Backend retention/audit treatment must be documented by the service owner. Do not promise immediate deletion from every audit store.
- Logs and analytics exclude post bodies, introduction notes, private contacts, raw search text, auth material and KYC data. Use request IDs and categorized failures.

Cross-tenant tests must verify both permitted network discovery and denied private data access. “Tenant isolation” must not accidentally eliminate the intended cross-company network or accidentally publish internal records.

## 13. Accessibility and performance

Target WCAG 2.2 AA and verify the actual implementation. Text contrast, keyboard operability, visible focus, reflow, and focus not obscured by sticky regions must be assessed in both themes. Use 44px action targets as this product's touch-friendly default; WCAG 2.2 AA minimum target-size criteria use 24px with exceptions. Sources: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

Use semantic lists/articles for posts rather than a complex ARIA feed unless its full keyboard model is implemented. Buttons have names such as “Like Maya Chen's post,” with pressed state for toggles. Announce mutation failures politely, without rereading the whole timeline. Modal focus is trapped and restored, Escape closes when safe, and validation messages link to fields. Tabs support keyboard navigation, forms have visible labels, and color alone never communicates author type, error, or verification.

Proposed performance budgets, to validate rather than claim as measured: Network route code at most 200KB gzip excluding host-shared runtimes; first feed response at most 100KB compressed for 20 text entries; no per-post profile requests. Route rendering must not wait on recommendations, taxonomy, or optional verification. Measure a cold Network navigation in the integrated host on a mid-tier mobile profile and record actual results.

Use aggregate profile projections in feed responses. Abort stale searches, batch state updates, paginate before virtualization, and add virtualization only after profiling and keyboard/screen-reader verification. Pause polling in background tabs if polling is later introduced. Avoid autoplay, heavy charts, maps, and media libraries on the Network route.

## 14. Build structure and delivery sequence

Suggested separate application structure (frontend feature details follow):

```text
EnsuredNetwork/
  frontend/
    src/
      index.ts          # exported @ensured/network entry
      Network.tsx
      adapters/         # injected host request/navigation
      context/          # per-instance viewer and dependencies
      routes/           # host-relative route resolution
      features/         # feed, profiles, discovery, introductions,
                        # notifications, moderation
      components/
      fixtures/         # synthetic Storybook/test data only
      styles/           # scoped CSS
      stories/
    package.json
    vite.config.ts
    tsconfig.json
  backend/
    src/
      gateway/          # existing trusted identity verification contract
      routes/           # social API, never login/session endpoints
      domain/           # social operations and authorization
      integrations/     # documented existing-service API adapters
      persistence/      # Network-owned database access only
    migrations/
    tests/
    package.json
    Dockerfile
  contracts/            # Network-owned OpenAPI and shared DTO schemas
  dev-host/             # standalone fixture/gateway adapter, no auth system
  README.md
```


Do not import sibling source paths or create global element resets. Host owns document title policy, fonts, theme toggle, global keyboard shortcuts, and global toast placement. Use a host-provided overlay root or a documented scoped portal boundary so themes and stacking work without body-wide side effects.

1. **Inventory and contracts.** Recheck repository instructions and services. Produce an integration matrix marking observed/proposed/blocked. Confirm safe projection, actor grants, separate Network database ownership, and gateway routing/identity transport. No backend availability assumptions.
2. **Fixture-based UI.** Create the separate application skeleton, exported frontend package and XDS stories for feed, composer, profiles, search and introductions. Fixture mode is explicit in the standalone harness; production never silently falls back to fixtures.
3. **Host embedding.** Add lazy route, injected request/viewer/navigation, theme inheritance, error boundary, and lifecycle reset tests. Standalone harness uses synthetic viewer context or a host-approved session adapter; it has no login implementation.
4. **Read integration.** Connect approved profile projections, taxonomy, feed and search. When unavailable, show honest unavailable states. Keep confidential source endpoints out of browser adapters.
5. **Social mutations.** Implement publishing, replies, relationships and introductions in the separate Network backend with its own migrations, backend permissions, idempotency, canonical responses and conflict handling. Feature flags default off until the corresponding contract is ready.
6. **Moderation and notification integration.** Verify inbox scoping, removals, reports, block/mute and real operational ownership.
7. **Release verification.** Test packed exports, host build, two-instance isolation, story interactions, accessible responsive rendering, gateway integration, and cross-actor/cross-tenant permissions. Record missing dependencies rather than calling the release complete.

Documentation and fixture UI can be completed before backend changes; live social behavior cannot. Delivery is not complete merely because every button exists.

## 15. Acceptance criteria and test scenarios

| Area | Required evidence |
| --- | --- |
| Separate application | Network API runs and deploys separately; owns its database/migrations; no social models/routes added to EnsuredAPI; no cross-database access or sibling source imports |
| Authentication boundary | Package contains no login routes, password/token handling, identity client, session polling, or browser credential storage |
| Host composition | Packed package mounts in EnsuredUI with inherited theme; direct routes and Back/Forward work; host continues working after Network error |
| Independent professional | Existing person without organization can activate a network profile and publish when granted |
| Organization publishing | Authorized operator publishes visibly as organization; forged actor header and revoked grant fail server-side |
| Session isolation | Switch users/tenants while requests are in flight; old records and drafts never appear afterward |
| Two instances | Separate viewers, caches, overlays, and callbacks; one instance's unmount does not break the other |
| Feed | Populated/loading/empty/error stories; pagination has no duplicates; updates do not jump scroll position |
| Composer | Unicode limit, whitespace, input-method composition, double click, failed retry, timeout and original-key reconciliation |
| Relationships | Follow/like/bookmark rapid toggles converge to server state; failed optimistic mutation rolls back accurately |
| Introductions | Duplicate/reverse request, unauthorized decision, cooldown, stale version, block, and private inbox scope are tested |
| Privacy | Cross-organization network records are available as intended; raw user, KYC, appetite-rule and private inbox fields never appear in responses |
| Removed content | Feed, thread, search, bookmarks and notifications no longer reveal removed text |
| Accessibility | Keyboard-only flow through search, compose, profile and introduction; screen-reader spot check; contrast/focus/reflow in both themes |
| Responsive | 320, 390, 768, 1024 and 1440px viewport checks, plus narrow host-content containers |
| Resilience | Taxonomy outage does not take down feed; 401/403/429/5xx have distinct recovery behavior |
| Production honesty | Disabled integrations show no dead actions or fabricated data; mocks exist only in explicit dev/test mode |

Use existing repository-compatible TypeScript, Storybook interaction, and browser-test conventions. Prioritize meaningful integration and authorization tests; snapshots alone do not prove functionality. No running application was changed or tested as part of writing this guide.

## 16. Product measures and realistic fixtures

Primary measure: accepted introductions between distinct professional actors, with deduplication and abuse exclusions. Supporting measures: discovery-to-profile conversion, profile-to-introduction conversion, introduction acceptance rate, time to first useful relationship, and participating organizations/independent professionals. Guardrails: reports per active actor, blocked introductions, spam prevalence, mutation failures, and accessible task completion.

Emit minimal structured events through the host callback: `network.profile_viewed`, `network.follow_completed`, `network.post_published`, `network.introduction_submitted`, `network.introduction_accepted`, `network.search_completed`. Record coarse categories and completion state; avoid contact details, content bodies and raw queries. Actual event policy and retention follow the host's existing governance.

Synthetic examples, never real companies or performance claims:

- Maya Chen — independent commercial insurance broker; marine and logistics; “Interested in meeting underwriting teams supporting regional logistics operators.”
- Harbor Mutual — fictional insurance organization; commercial property; “Our team is expanding professional relationships in commercial property. View our profile for the regions we discuss.”
- Daniel Okoro — reinsurance professional at fictional Cedar Re; “What information makes an initial introduction most useful to your treaty team?”
- Introduction note: “I work with regional logistics businesses and would like to understand whether our areas of focus overlap. Open to an introductory conversation?”

Fixture set must also include no-organization users, long names, non-Latin text, emoji sequences, unknown verification, no public appetite, organization without publish permission, removed posts, blocked counterparts, and expired-session transitions. Fixture specialties map to real taxonomy values only after those values are verified; placeholder codes stay confined to tests.

## 17. Copy-ready implementation prompt

Supply this entire guide to the implementing LLM together with repository access. The following instruction establishes the intended execution:

> Implement Ensured Network as a separate insurance-industry social application with its own backend, database, contracts and exported microfrontend as described in this guide. Do not put social business logic or persistence inside EnsuredAPI. Route the existing gateway to the new backend and integrate other services only through explicit APIs. First inspect repository instructions, EnsuredMarketplace, EnsuredUI, EnsuredXDS, and relevant service routes. Reuse the current packaged React/TypeScript microfrontend pattern and host-injected request client. Keep authentication entirely in the host and existing identity/gateway services. Deliver a familiar short-post social interface focused on people, organizations, professional discovery, and structured introductions. Follow the visual, behavioral, privacy, accessibility, and acceptance requirements in this guide. Treat every proposed endpoint and grant contract as unimplemented until verified. Establish safe backend projections instead of exposing generic user/organization records. Build explicit fixture stories and unavailable states for missing integrations; never present fixtures as live data. Keep backend/domain work and host adapters in their owning repositories, avoid unrelated rewrites, and document each remaining dependency. Implement both deterministic fixture stories and the mandatory live-server Storybook user journeys in section 19. Run the live journeys through the existing gateway and real isolated services without mocked API responses, using host-owned authentication setup and persistence assertions. Validate the package and integrated host with meaningful interaction and authorization checks. Report completed behavior, verification evidence, and any live feature still blocked by missing backend capability. Do not add login, registration, OAuth, token handling, payments, underwriting workflows, or messaging without a separately approved contract.

## 18. Decisions to revisit before live rollout

These are explicit product defaults, not permission requests blocking design work: confirm final name; eligible professional types; network-profile activation policy; authoritative territory vocabulary; public verification projection; organization publishing/inbox grants; introduction contact handoff; moderation owner; rate limits/cooldown duration; backend retention; and whether existing notification infrastructure can serve the proposed inbox contract.

Until changed, the defaults in this guide govern fixture design and package interfaces. Missing backend permissions, safe projections, moderation processing, or social persistence block the affected live feature, not the design deliverable.


## 19. Mandatory Storybook user stories against live servers

### 19.1 Deliverable and meaning of “live”

The implementation MUST include executable Storybook user stories that exercise the separate Network app against running real services. Component fixture stories remain useful for visual states, but cannot substitute for this requirement.

“Live” means the actual Network backend, its migrated database, the existing identity service/gateway, and relevant existing APIs are running in an isolated development or CI stack. Synthetic test people and companies are persisted in that stack. It does not mean real customers, a production database, or simulated HTTP services. Do not intercept requests with successful fixture responses, MSW, route fulfillment, or a memory-only social repository in the live suite.

Current repository precedent: `EnsuredMarketplace` has Storybook `play` interactions and a Playwright runner; its documented tests use fixtures. `EnsuredAuthUI/test/registration/README.md` separately documents fixture browser journeys and a real-server account test. Neither establishes existing live Network stories. Implement the following as new work and explicitly report which suite ran.

### 19.2 Separate story modes

| Story group | Purpose | Service behavior |
| --- | --- | --- |
| `Network/Fixtures/*` | Deterministic layout, empty/error/loading, accessibility and component interactions | Explicit fixture adapter, no live claims |
| `Network/Live/*` | Actual user journeys and persistence across actors | Real injected request adapter through the existing gateway |
| Integrated host browser suite | Prove actual EnsuredUI route, host navigation, theme and session lifecycle | Real host plus real servers; complements Storybook |

Use separate fixture and live Storybook configurations/build outputs. The live configuration includes only live stories and cannot load a fixture request decorator. A permanently visible harness banner identifies “LIVE TEST STACK” and an environment alias. This banner belongs to the development harness, not the shipped microfrontend.

Each live story declares its user story, prerequisites, actor, Given/When/Then acceptance criteria, expected requests, records created, and cleanup policy in Storybook documentation. It renders the exported microfrontend through a thin host harness with real theme, router adapter, request function and authorized viewer context. Storybook Args may control layout/theme but MUST NOT manufacture grants or impersonate actors. Change actors through valid sessions or server-authorized grants.

Opening a story must not silently create posts or introductions. Provide an explicit “Run journey” harness control for mutation journeys; the automated runner activates it. The story's `play` flow uses observable UI actions and assertions. Isolate setup from rerenders/hot reload; a runner-owned run ID and idempotency keys prevent duplicate data when replayed. Documentation/thumbnail rendering must not trigger mutations.

### 19.3 Real session setup without adding authentication to Network

A Playwright setup project signs into the **existing host account interface** using pre-provisioned test users, or follows an already-supported test-session provisioning contract if the platform has one. Do not invent a session bypass, set unsigned identity headers, or seed browser tokens manually. Setup is outside the Network package and its stories. Network receives the same host-style viewer and request adapters it uses when embedded.

Run live Storybook through a test-only gateway route such as `/__network_stories/`, with the actual gateway forwarding `/api/network/*` to Network and identity paths to the existing identity service. The Storybook route is proposed infrastructure, not an existing route. Keep manager, iframe, assets, API requests and host sign-in on the configured test origin so real cookie scope and CSRF behavior work. Configure the Storybook base path and asset routing accordingly. The runner must verify its final frame origin, authenticated requests and gateway routing before executing stories. Disable this route outside the isolated test deployment.

After the host establishes a session, the live harness resolves current membership and the proposed `/api/network/context` through real host adapters. It must not use a hardcoded viewer object. Network itself still does not call login, refresh tokens, or implement account UI. Keep saved browser session files out of source control and build artifacts; store them only in protected temporary test output and remove them afterward. Redact cookies, credentials and private payloads from reports/traces before publishing artifacts.

For two-party journeys, create separate browser contexts with separate real sessions. The runner coordinates sender and recipient tabs, each showing its own live Storybook story. Actor switching within one legitimate organization publisher session is distinct from changing the human session. Do not use shared global browser storage to coordinate the two users.

### 19.4 Required environment and proposed commands

The test stack needs the gateway, identity service/database, Network service/database, existing API and its database, and live Storybook. Add KYC only to scenarios that require an approved verification projection; unknown/unavailable verification remains valid elsewhere. Use the registry when testing discovery-enabled routing. Liveness alone is insufficient: preflight checks must verify migrations, readiness, current test-session identity, social context, a safe profile projection, and taxonomy contract availability for filter stories.

Proposed environment names and scripts below MUST be implemented; they are not runnable commands in the current guide-only deliverable:

```sh
# Proposed application scripts, run from the parent workspace once implemented.
NETWORK_TEST_BASE_URL=http://localhost:3002 \
NETWORK_TEST_STORYBOOK_PATH=/__network_stories/ \
NETWORK_TEST_ENVIRONMENT=isolated-local \
npm --prefix EnsuredNetwork run test:storybook:live

npm --prefix EnsuredNetwork run storybook:fixtures
npm --prefix EnsuredNetwork run storybook:live
npm --prefix EnsuredNetwork run test:storybook:fixtures
```

The live runner generates a unique run ID and obtains test credentials through its server-side environment or CI secret provider. Never put credentials or service tokens into `VITE_*`/Storybook client variables. Preflight verifies an explicit isolated-environment marker and allowlisted origin before mutations. Missing configuration, unavailable mandatory services, invalid credentials, or missing endpoints cause a nonzero exit, never silent skipping or fallback to fixtures.

Provision independent person A; person B in another organization; organization publisher C; organization member D without publishing grants; and a moderation reviewer only where a real reviewer workflow exists. Provision through each owning service's supported seed/admin tooling. There is no cross-database test seeding through Network. External identities reference valid master records. Distinct test actors/organizations or isolated stacks per parallel worker prevent follows, blocks and inboxes from affecting another scenario.

### 19.5 Executable journey catalog

| ID / Storybook name | User story and live interaction | Required assertion |
| --- | --- | --- |
| LIVE-01 `IndependentDiscovery` | As an independent broker without an organization, I search real published profiles by specialty and open an organization | Real taxonomy populates filters; only opted-in eligible profiles appear; correct canonical organization ID opens; no organization-required error |
| LIVE-02 `FollowAndReadFeed` | As person A, I follow B; B publishes a unique run-tagged post in a second session; A refreshes Following | Follow survives reload; B's acknowledged post appears once; unfollow removes future subscription behavior without deleting B's post |
| LIVE-03 `PublishAsPerson` | As person A, I write and publish a short professional post | Post has server ID/time and correct person author; a fresh page/context read returns identical content; body is not merely optimistic state |
| LIVE-04 `PublishAsOrganization` | As authorized C, I select the company actor and publish | Server persists organization author; private audit resolves real operator through an authorized test-side check; public response omits private operator details |
| LIVE-05 `OrganizationPermissionDenied` | As member D, I view the same company and attempt an unauthorized organization mutation through an authenticated test-side request | UI lacks publish grant; server rejects forged actor selection with 403; no organization post is created |
| LIVE-06 `ReplyAcrossOrganizations` | As B, I reply to A's network-visible post | A sees the reply after refresh; correct root reference/author/order persists; unrelated private company data is absent |
| LIVE-07 `ReactRepostAndBookmark` | As A, I like, repost and bookmark B's post, reload, then undo | Server state survives reload; repost references original and does not duplicate the post; B cannot read A's private bookmark list |
| LIVE-08 `IntroductionAccepted` | As A, I send B a purpose and note; B opens received requests and accepts | Pending/accepted states persist for both sessions; third actor receives no private details; accepted detail works without inventing a DM room |
| LIVE-09 `IntroductionConflict` | As A, I retry the same request and B attempts the reverse; A/B exercise cancel/decline on separate seeded requests | One pending pair; idempotent retry returns same record; invalid/stale transitions fail; UI reconciles actual service state |
| LIVE-10 `NotificationReadState` | As B, I open A's actual introduction/reply notification and mark it read | Authorized inbox delivery occurs within declared timeout; unread count and read state persist; another actor cannot read the item |
| LIVE-11 `PublicProfilePrivacy` | As C, I edit permitted social bio fields; A reopens the company profile | Approved edits persist; raw appetite rules, private membership/contact and KYC evidence are absent in actual responses; edits do not alter master identity |
| LIVE-12 `BlockAndReport` | As A, I report and block B, then B attempts another introduction | Report reference persists in real restricted workflow; server blocks request and filters discovery; no reporter identity leaks to B |
| LIVE-13 `DeleteAndRevisit` | As A, I delete my post; B revisits thread, search, saved item and notification | Authorized projections remove content or show tombstones; cached body is not exposed; B cannot delete A's other posts |
| LIVE-14 `SessionAndGrantRevocation` | External test orchestration revokes C's organization grant, then ends the real session while Network is mounted | Next mutation fails without publishing; refreshed context clears organization state; session failure delegates recovery to host and clears stale data |
| LIVE-15 `ServiceOutageRecovery` | In an isolated stack, orchestration stops/restarts the real Network service; separately disables an optional integration | Gateway returns actual failure; appropriate retry/unavailable state appears; recovery reads persisted data; optional outage does not blank the feed |
| LIVE-16 `CrossTenantIsolation` | As A/B, I browse intentionally published cross-company posts and request another actor's private introduction/notification IDs | Network reads succeed where intended; private reads return policy-consistent denied/not-found responses with no sensitive body |

For scenarios involving unavailable proposed features, report “blocked: required contract missing” and fail the required live release gate. A separate read-only smoke suite may cover available services, but cannot be reported as the full suite passing. Fault/revocation scenarios may run serially in a dedicated isolated environment; request interception does not count as a live outage test.

### 19.6 Assertions, repeatability, cleanup and reporting

Use Storybook `play` functions with the repository-compatible interaction/assertion tools for the browser steps. The external Playwright runner manages host sign-in, readiness, multi-user contexts, service orchestration, and persistence verification. Both layers fail on uncaught exceptions, unhandled requests or unsuccessful assertions. Match content by the run's unique record IDs/markers rather than arbitrary first rows, timestamps or pre-existing counts. Use bounded polling on observable state, not fixed sleeps; proposed upper bounds are 10 seconds for ordinary UI transitions and 30 seconds for asynchronous notification delivery, with actual latency recorded.

Every mutation journey must assert the rendered result AND a fresh authorized read after reload or from another legitimate session. Negative authorization checks use the real server and verify that no forbidden mutation persisted. Where audit evidence requires elevated access, perform it server-side through an approved test interface, never a privileged browser adapter.

Track all created IDs in a runner-owned manifest. Clean up through supported application APIs or documented service-owned test teardown; deletes apply only to the run's records. Never truncate shared databases. Restore revoked grants and restarted services in `finally` teardown; if restoration fails, mark the environment unusable and fail the run. Post-test cleanup errors remain failures. Retain failed-run data only under a documented isolated-environment retention policy, with a retryable cleanup manifest.

Output JUnit plus a readable scenario report containing run ID, environment alias, service/application versions, each journey's pass/fail/blocked status, request correlation IDs and created record IDs. Capture failure screenshots and sanitized traces. Do not publish session-state files, credentials or raw private payloads. Overall exit is nonzero for any required failed/blocked journey. Report fixture results, live Storybook results and integrated host results separately.

The release acceptance criterion is: **all required live user journeys pass against actual isolated servers, with persistence and authorization evidence, in addition to fixture visual/accessibility coverage and the real host embedding checks.** This guide adds their specification; it does not claim they have been implemented or executed.
