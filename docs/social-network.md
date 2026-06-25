# The Ensured Social Network

*A professional trust layer connecting insurers, reinsurers, and brokers — built so that risk moves through relationships, not cold submissions.*

---

## Why a marketplace needs a social layer

Reinsurance is, and always has been, a relationship business. Capacity follows trust: a cedent shares a Statement of Values with a reinsurer because an underwriter knows the broker, has seen their book perform, and can pick up the phone. A pure transactional marketplace strips that context away — and with it, the willingness to commit capital.

The Ensured social network puts that context back, natively, inside the platform where the risk already lives. Every participant — ceding insurer, reinsurance capital, broker analyst — gets a professional identity, a visible network, and a direct line to counterparties. The result is that the *trust-building* and the *risk-transfer* happen in the same system, with the same audit trail.

## The pillars

### 1. Professional identity — Profiles

Every user has a profile (`/profile/:userId`): name, headline, bio, location, organization affiliation, and role badge (insurer / investor / analyst / admin). Two trust signals are computed live:

- **Connection count** — the size of their verified professional graph.
- **Coworkers** — everyone sharing their organization, so you can see the team behind a counterparty, not just one inbox.

Profiles are deliberately **cross-tenant**: the directory spans every organization on the platform, because the entire point is discovering counterparties *outside* your own walls.

### 2. The trust graph — Connections

LinkedIn-style connect/accept mechanics (`/network`):

- **Find People** — a cross-organization directory with search.
- **Invitations** — incoming requests are accepted or declined explicitly; a declined pair can re-request later.
- **My Connections** — the accepted graph, with one-click messaging.
- **Coworkers** — your organization's internal roster.

The graph is not cosmetic — it is an **access-control primitive**. Direct messaging requires an accepted connection. You cannot cold-DM the market; you build the relationship first, exactly as the real market works.

### 3. Market voice — Feed

A feed (`/feed`) of short stories and updates with likes and comments. Posts carry a visibility choice:

- **Public** — visible to the entire marketplace (capacity announcements, appetite changes, renewal-season commentary).
- **Connections only** — scoped to your verified network (softer signals: "we're seeing rate hardening in Gulf wind").

Authors are notified of engagement in real time, so the feed doubles as a lightweight market-sentiment channel.

### 4. Deal-flow conversations — Messages

Direct messaging (`/messages`) between connected users, delivered in real time over WebSockets. A message is more than text — it can carry the actual subject of negotiation:

- **Text** — ordinary conversation.
- **Submission share** — attach an entire risk submission to the thread.
- **File attachment** — attach a specific submission document (SOV, loss runs, slip…), streamed from the same storage the underwriting pipeline uses.

### 5. Meet the market where it lives — WhatsApp & Telegram

Much of the real reinsurance market negotiates on WhatsApp. Rather than fight that, each user can connect **WhatsApp or Telegram** in Settings → Messaging:

1. Choose a provider; the platform issues a 6-digit verification code.
2. Send the code to the Ensured bot (Telegram) or WhatsApp number — this binds your chat identity.
3. From then on, in-app DMs are mirrored to your phone (sender-prefixed for context), and your replies flow back into the same platform conversation thread.

Providers are pluggable behind one interface: real Telegram Bot API and Twilio WhatsApp adapters activate when credentials are configured; a **simulated provider** keeps the entire flow working in development and demos. Inbound webhooks are deduplicated and secret-validated.

---

## How this facilitates cohesive market risk sharing

### Trust before transaction
Capacity providers see *who* is behind a submission — profile, organization, team, network size, shared connections — before committing a dollar. The connection handshake replicates the market's introduction ritual digitally, so counterparty discovery is no longer limited to whoever your brokers already know.

### The submission is the conversation
The decisive design choice: **sharing a submission inside a message creates an explicit, auditable access grant** (`SubmissionShare`). When a cedent shares submission #42 with a connected reinsurer:

- The recipient gains **read-only** access to that one submission and its documents — through a single dedicated endpoint, never to the cedent's wider book.
- The grant is recorded with who shared, with whom, when, and through which message — a compliance-grade provenance trail for every disclosure.
- Pipeline actions (re-pricing, validation, workflow) remain strictly tenant-scoped; sharing discloses, it never delegates control.

This turns the most fragile step of risk transfer — emailing spreadsheets to counterparties — into a governed, revocation-ready disclosure mechanism inside the platform.

### Shrinking the distance between signal and placement
- An insurer posts appetite to the feed → a broker sees it in their network → opens a DM → shares the live submission → the reinsurer reviews the actual SOV and pipeline-extracted data — all without leaving the platform or losing the thread.
- Real-time delivery (WebSockets in-app, WhatsApp/Telegram out-of-app) means negotiation keeps the cadence of a phone call with the record-keeping of a deal file.

### A network effect for the marketplace itself
Every connection, post, and shared submission deepens the data tying participants together. Cross-organization visibility (deliberately exempt from tenant isolation, *except* for risk data) makes the marketplace feel like one market rather than a set of silos — which is precisely what makes risk-sharing *cohesive*: shared context, shared counterparty knowledge, and a common, auditable rail for moving the risk itself.

---

## Feature ↔ trust mapping

| Capability | Market problem it solves | Trust mechanism |
|---|---|---|
| Profiles + connection counts | "Who am I dealing with?" | Verifiable identity + visible network size |
| Coworkers | "Is this a real organization?" | Team transparency behind every counterparty |
| Connect/accept graph | Cold outreach noise | Mutual opt-in before any messaging |
| Feed (public/connections) | Opaque market appetite | Broadcast signals scoped by relationship |
| DMs over WebSockets | Negotiation scattered across email | One persistent, real-time deal thread |
| Submission/file sharing | Spreadsheets over email, zero audit trail | Explicit read-only grants with full provenance |
| WhatsApp/Telegram bridge | "The market lives on WhatsApp" | Off-platform reach, on-platform record |

## Where it lives in the codebase

| Layer | Location |
|---|---|
| Data model | `EnsuredAPI/src/db/models/social.models.ts` (+ migration `20260612000000-create-social-network.ts`) |
| API routes | `EnsuredAPI/src/routes/social{Profiles,Connections,Feed,Messages,Integrations,Webhooks,Socket}.ts` |
| Realtime | `EnsuredAPI/src/social/realtime/socketRegistry.ts`; UI `EnsuredUI/src/app-sections/SocialSocket/` |
| Messaging providers | `EnsuredAPI/src/social/messaging/providers/` (Telegram, WhatsApp/Twilio, Simulated, selector) |
| UI pages | `EnsuredUI/src/Pages/Social/` (`/network`, `/feed`, `/messages`, `/profile/:userId`, Settings → Messaging) |
| Design system | 9 xds components (Avatar, ProfileCard, ConnectionButton, PostCard, PostComposer, CommentThread, MessageBubble, ConversationListItem, IntegrationCard), each with Storybook stories |
| Tests | `EnsuredAPI/test/social/` — 32 tests covering the connection lifecycle, feed visibility, messaging permissions, share grants, websocket delivery, and the full simulated Telegram round trip |

### Deliberate v1 limits (on the roadmap)
- Share grants have no revocation endpoint yet (the model supports it).
- External replies route to the user's most-recently-active conversation (external channels carry no thread id); outbound messages are sender-prefixed to keep context clear.
- Direct (1:1) conversations only; the schema already accommodates group threads.
