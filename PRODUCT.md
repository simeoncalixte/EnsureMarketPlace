# AInsured — Public Risk Participation and Decentralized Capital Marketplace

> **Status:** Authoritative product vision, provided by the project owner on 2026-11-20. Agents
> build against this document. [AGENTS.md](AGENTS.md) carries the always-loaded summary, the
> [roadmap](docs/product/roadmap.md) covers delivery sequencing, and [docs/README.md](docs/README.md)
> indexes all other documentation. Repositories and code use the `Ensured*` prefix.

## Expanded Mission

AInsured is an AI-powered insurance, reinsurance, risk participation, and capital marketplace that connects institutional insurance participants with independent capital providers.

The platform enables qualified organizations to seek insurance or reinsurance capacity while allowing eligible individual participants to provide investment capital without needing to belong to an insurance organization.

The long-term vision is to democratize access to insurance-linked opportunities while maintaining the regulatory, contractual, and financial safeguards required to support real insurance obligations.

AInsured combines concepts from:

- Lloyd's of London: syndicated risk participation and insurance capacity.
- Polymarket: accessible markets, opportunity discovery, visible participation, and simple user experiences.
- Investment crowdfunding: pooled capital contributions from individual investors.
- Insurance-linked securities: investment capital supporting insurance-related exposure.
- Professional networks: relationships and discovery between institutional and individual participants.

These are conceptual inspirations, not claims that their respective regulatory models are interchangeable.

## 1. Two Primary User Categories

### Institutional Participants

Institutional participants include insurers, reinsurers, brokers, MGAs, MGUs, underwriting organizations, insurance funds, and other industry entities.

Institutional users operate through organization accounts with explicit roles, authority, permissions, and organizational relationships.

They can create submissions, structure placements, negotiate facilities, seek capacity, participate in insurance transactions, and manage their obligations.

### Independent Public Participants

Independent users are first-class platform participants.

They do not require an organizational affiliation.

Depending on eligibility and applicable law, they may be able to:

- Create personal profiles.
- Browse publicly accessible opportunities.
- Follow organizations and insurance sectors.
- Examine publicly disclosed risk and investment information.
- Express interest in an opportunity.
- Complete identity and investor verification.
- Contribute eligible capital to available funding structures.
- Track capital commitments.
- View participation performance.
- Receive applicable distributions.
- Review exposure and loss information.
- Reinvest or withdraw eligible available funds according to contractual terms.

Public registration does not automatically authorize someone to underwrite insurance or participate in every capital offering.

## 2. Public Capital Participation Model

The platform should support several distinct participation mechanisms.

**Direct Institutional Risk Participation**

Authorized insurers, reinsurers, or other permitted risk-bearing entities assume contractual insurance obligations.

**Collateralized Risk Participation**

Eligible capital providers fund a legally structured and collateralized arrangement supporting insurance or reinsurance risk.

**Pooled Capital Participation**

Multiple individual investors contribute capital through an eligible fund, special-purpose vehicle, or equivalent structure.

**Insurance-Linked Investment Participation**

Eligible users invest in financial instruments whose returns depend on insurance-related risks or portfolio performance.

**Facility Funding**

Capital providers contribute to approved financing or collateral arrangements associated with capacity facilities.

The system must never treat an individual's investment commitment as automatically creating an insurance policy or reinsurance agreement.

## 3. Example Public Marketplace Opportunity

Opportunity: Commercial Property Risk Capacity Funding

- Coverage category: Commercial Property
- Geography: Florida, United States
- Funding target: $500,000
- Capital already committed: $325,000
- Funding remaining: $175,000
- Funding completion: 65%
- Participation structure: Collateralized investment vehicle
- Indicative return: Defined by offering documents
- Capital lockup: Defined by the investment agreement
- Maximum loss: Dependent on the legal structure
- Eligibility: Subject to investor verification and offering restrictions

A user could browse this opportunity, inspect its structure and disclosures, assess potential returns and losses, and submit a capital commitment if eligible.

The legal vehicle, rather than the investor personally, would enter the relevant insurance-related contractual arrangements where applicable.

All amounts and characteristics above are illustrative.

## 4. Public User Experience

Create a dedicated **Public Capital Marketplace** experience alongside the institutional marketplace.

The public experience should emphasize clarity, accessibility, risk disclosures, and portfolio visibility.

Core screens include:

### Discover

Browse insurance-linked opportunities with:

- Funding progress.
- Risk categories.
- Geographic exposures.
- Offering type.
- Minimum investment.
- Duration and liquidity restrictions.
- Risk and loss characteristics.
- Eligible participation requirements.

### Opportunity Details

Display:

- Capital requirements.
- Insurance exposure.
- Transaction parties where disclosure is permitted.
- Legal investment structure.
- Expected cash flow mechanics.
- Loss allocation.
- Fees.
- Risk disclosures.
- Offering documentation.
- Participation history where available.

### Capital Commitment

Support:

1. User identification and verification.
2. Offering eligibility checks.
3. Investment amount selection.
4. Regulatory disclosures and acknowledgments.
5. Commitment submission.
6. Payment or funding through an authorized provider.
7. Commitment confirmation and allocation.
8. Ongoing reporting.

### Portfolio

Individual participants should be able to track:

- Total contributed capital.
- Pending commitments.
- Funded allocations.
- Capital currently at risk.
- Available uncommitted funds.
- Distributions received.
- Realized losses.
- Portfolio concentration.
- Investment maturity dates.
- Historical performance.

Do not display projected returns as guaranteed income.

## 5. Domain Model Extensions

The architecture must not require every user to belong to an organization.

Separate identity, legal participation, investor eligibility, and investment ownership.

Add the following domain concepts:

**Identity**

- IndividualProfile
- OrganizationMembership (optional)
- ParticipantIdentity
- ParticipantVerification
- InvestorEligibility

**Capital**

- CapitalProvider
- CapitalAccount
- CapitalContribution
- CapitalCommitment
- FundingAllocation
- FundingPool
- InvestmentPosition

**Legal and Investment Structures**

- InvestmentVehicle
- VehicleMembership
- InvestmentOffering
- OfferingEligibility
- SubscriptionAgreement
- CollateralArrangement
- RiskParticipationAgreement

**Financial Events**

- FundingTransaction
- CapitalReservation
- Distribution
- RealizedLoss
- CapitalRelease
- ReconciliationEvent

An individual may own multiple investment positions and contribute to multiple funding pools.

A funding pool may aggregate contributions from many users.

A legal investment vehicle may deploy that pool into one or more eligible risk-supporting arrangements.

Risk assumption, financial contributions, investment ownership, and insurance capacity allocations must be represented as separate relationships.

## 6. Matching Engine Extension

Expand the AI matching engine to support two directions.

**Risk-to-Capital Matching**

Match insurance organizations seeking additional support with eligible capital pools, investment vehicles, facilities, and institutional counterparties.

**Investor-to-Opportunity Discovery**

Help users find and understand opportunities compatible with their stated preferences and verified eligibility, without making unauthorized personalized investment recommendations.

The engine should evaluate:

- Opportunity structure.
- Jurisdiction.
- Investment eligibility.
- Available capital.
- Risk class.
- Duration.
- Capital requirements.
- Concentration constraints.
- Contractual restrictions.
- Regulatory limitations.

## 7. Critical Technical Requirements

- Organization membership must be optional for individual users.
- Individual and institutional profiles must share a consistent identity system.
- Maintain separate ledgers for cash, investment commitments, collateral, and risk-bearing capacity.
- Never double-count pooled capital across vehicles or placements.
- Prevent commitments exceeding available, eligible capital.
- Support atomic and idempotent financial operations.
- Preserve complete funding and contractual audit trails.
- Support investor eligibility, KYC/AML, sanctions checks, and geographic restrictions.
- Separate public opportunity information from confidential underwriting data.
- Use regulated financial partners and legally appropriate transaction structures when necessary.
- Model investment losses, liquidity restrictions, and distribution waterfalls explicitly.
- Do not assume all financial participation can be withdrawn or traded freely.

## 8. Product Design Principle

AInsured should be accessible to the general public without simplifying away the complexity of real insurance transactions.

The system must provide two complementary experiences:

**Institutional Experience:** Advanced insurance networking, underwriting, placements, facilities, capacity management, and servicing.

**Public Experience:** Accessible investment discovery, capital commitments, portfolio monitoring, and transparent exposure reporting.

Both experiences share the same underlying risk, capital, and transaction infrastructure while enforcing different permissions and eligibility requirements.

## 9. Long-Term Vision

Build a marketplace in which capital can flow efficiently from eligible individual and institutional providers into structured insurance and reinsurance opportunities.

AInsured should eventually support a broad spectrum of capital participation, from small individual investments through regulated structures to large institutional risk-bearing arrangements.

The ultimate ambition is an interconnected global ecosystem in which insurance risks can be matched with suitable capital, funded through legally valid structures, and serviced transparently throughout their lifecycle.

**Core principle: Anyone should be able to discover insurance-related opportunities. Eligible participants should be able to supply capital without requiring organizational membership. Actual risk-bearing authority and financial participation must remain subject to the applicable legal structure and regulatory requirements.**

---

## 10. Insurer Proposition: From Raised Capital to Dependable Protection

> **Status: Draft response, owner review required (2026-11-20).** Sections 10–15 answer the
> insurer, broker and reinsurer reviews of this document dated 2026-11-20 (the review files are
> not kept in the repository). Product positions are proposals
> until the owner confirms them. Items marked **Owner decision** cannot be settled by engineering.
> "Existing foundation" names what the code already has to build on. It is not a claim that the
> capability is complete; verify it against current code and Jira before reuse. Nothing in these
> sections is customer evidence. That must be gathered (section 15).

The insurer's buying decision depends on whether capital becomes **dependable contractual
protection**, not on access to capital itself. Sections 1–9 describe how capital arrives. Sections
10–12 define what each institutional participant is promised, who is accountable, and how contracts
are serviced until every obligation is settled. Section 13 sets the commitments that apply to all of
them. Where sections 10–13 are stricter than sections 1–9, they govern.

### 10.1 Why an insurer changes how it buys capacity

**Position.** AInsured complements the insurer's broker; it does not replace them. Brokers are
institutional participants who can bring and manage placements on the platform. The promised
outcome is **fully collateralized capacity for risks that are hard or costly to place, bound faster
from placement-ready submissions**. The AI intake pipeline turns broker PDFs, schedules and emails
into priced, appetite-checked submissions. Investor capital is the source of capacity, not the
product the insurer buys.

**Measurable outcome.** The pilot measures four things against the insurer's current process:
usable (bindable) capacity obtained, time from submission to bind, internal hours per placement,
and time from proof of loss to payment.

**Owner decision.** Pick the single primary outcome to lead with: additional capacity, lower
all-in cost, faster binding, or more dependable recoveries.

### 10.2 Capacity states: only bindable capacity counts

**Position.** Funding progress is never presented to the insurer as capacity. Every unit of capital
moves through explicit, audited states, and only **Bindable** capital may support a contract:

| State           | Meaning                                                                             | Confirmed by                      |
| --------------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| Indicated       | Non-binding interest.                                                               | Participant                       |
| Committed       | Signed subscription; cash not yet received.                                         | Vehicle, after eligibility review |
| Funded          | Cash received and reconciled.                                                       | Custodian or trustee              |
| Bindable        | Funded collateral allocated to this contract at the required collateral level.      | Trustee, reconciled by platform   |
| Bound / at risk | Contract in force; collateral restricted to its obligations.                        | Signed contract                   |
| Trapped         | Contract expired, but collateral is held for open claims, reserves and development. | Contract release terms            |
| Released        | Obligations extinguished or commuted; collateral is free to return or reinvest.     | Trustee, on contract terms        |

**Funding shortfall.** Each offering has a funding deadline before the inception date and a
required collateral amount. If Bindable capital does not reach it by the deadline, the offering
does not bind, commitments are released, and the insurer is notified by the deadline. Partial
binding happens only if the insurer agreed to a minimum in advance. A commitment that fails to
fund is replaced from a waitlist or reduces the offering; it never creates uncollateralized cover.

**Capital release.** Capital cannot leave before the obligations it supports are resolved. At
expiry, collateral stays trapped against reported claims, case reserves and an agreed buffer for
incurred-but-not-reported (IBNR) losses. It is released on schedule only as those reduce, or on
commutation.

**Renewal.** Renewal capacity is not guaranteed and is never implied. Renewal is a new offering
with an early indication window. Existing participants get first refusal, and the insurer sees
indicated renewal capacity before its renewal deadline. After a loss, trapped collateral is not
counted toward renewal.

**Existing foundation.** Capacity holds are kept separate from cash, and pending funding is labelled
Unverified ([marketplace participation](docs/data-models/marketplace-participation.md)). Ledgers
are separated (section 7). Calls, custody, settlement, reconciliation and capacity release are
owned by AIN-36.

**Features to add.** An insurer-visible capacity-state view per offering; funding deadlines,
minimums, waitlists and shortfall handling; per-contract collateral allocation confirmed by the
trustee; trapped-collateral and release schedules; a renewal indication workflow.

### 10.3 Accountability chain

**Position.** The platform provides technology and operations. It does not bear risk, hold
collateral or decide claims. Every transaction names an accountable party for each responsibility
before it can be published:

| Responsibility                  | Accountable party                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signs the risk-bearing contract | The legal vehicle: for example a segregated cell or series of a licensed (re)insurer, or a fronting carrier.                                             |
| Holds collateral                | An independent trustee or custodian, in an account acceptable to the cedent and its regulator.                                                           |
| Determines payable losses       | Set by the contract: indemnity follows the cedent's settlements subject to claims-control clauses, or a named calculation agent for parametric triggers. |
| Authorizes release of funds     | The trustee, on instruction under the contract terms, with cedent consent where the contract requires it.                                                |
| Resolves disputes               | The contract's dispute clause (for example arbitration). The platform is not the adjudicator.                                                            |
| Continues if the platform fails | Contracts and collateral sit with the vehicle and trustee, not the platform. A named backup servicer receives a complete, current data export.           |

**Owner decision.** The vehicle structure, trustee or custodian, fronting carrier (if any), backup
servicer and governing law for the first offering. Until these are chosen and contracted, no
offering may be presented to insurers as bindable.

**Existing foundation.** Commercial records with parties, access, documents, decisions and events;
signature requests; signed submission bindings; append-only placement events.

**Features to add.** A per-transaction responsibility registry that blocks publication while any
role is unassigned; a contract document set; a backup-servicer data export with verified
completeness.

### 10.4 Insurer servicing journey

**Position.** The insurer journey is as fully specified as the investor journey and runs until
final release:

1. **Submit:** AI intake into a placement-ready submission.
2. **Evaluate:** appetite, pricing and structuring.
3. **Disclose:** the insurer approves the disclosure package (10.5).
4. **Fund:** capacity reaches Bindable (10.2).
5. **Bind:** signed contract, with collateral allocated.
6. **In force:** premium payments, endorsements, periodic reporting (bordereaux).
7. **Loss notice:** the cedent files a notice with the contract's required documents.
8. **Claim review:** the accountable party (10.3) evaluates it within contractual time limits.
9. **Dispute:** only the parties named in the contract may dispute, under its dispute clause.
10. **Payment:** paid from collateral within an agreed time after proof of loss.
11. **Development:** reserves are re-reported on schedule, and trapped collateral adjusts with them.
12. **Settle:** final settlement or commutation, then release.

**Worked adverse scenario (illustrative, to be completed with real terms).** The insurer reports a
loss and posts a case reserve. Part of it is paid from collateral after proof of loss. The rest
stays reserved and develops over several years. At expiry, collateral equal to the open reserve plus
the IBNR buffer stays trapped. A disputed portion goes to the contract's dispute process while
undisputed amounts are paid. Collateral is released in steps as reserves close or on commutation.
Each step names the document, the deciding party, the deadline and the ledger entry.

**Existing foundation.** Intake pipeline, submissions, quotes, binding, signing and reinsurance
placements. A basic claims table exists, but there is no claims workflow. Premiums, fees, claims
and distributions are owned by AIN-37–40.

**Features to add.** Loss notice and claim file; reserve tracking and development reporting;
payment from collateral; a dispute workflow; endorsements; bordereaux reporting; commutation and
final release.

### 10.5 Confidentiality and disclosure control

**Position.** Nothing about an insurer's risk is published without the insurer's explicit,
recorded approval of the exact disclosure. Disclosure is tiered:

| Tier           | Who sees it                                       | Content                                                       |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Private        | The insurer's organization                        | Full submission                                               |
| Invited        | Named counterparties, under confidentiality terms | The approved package for those recipients                     |
| Market         | Verified, eligible participants                   | The approved offering package                                 |
| Public summary | Anyone                                            | Generalized: risk class, broad region, size band, term window |

Before approval, the insurer sees exactly what each tier shows. Inference risk is reduced by
generalizing geography and amounts, optionally withholding the cedent's name, and optionally
delaying publication. The insurer can see every recipient-level access. Submission data is never
used to train models or to benefit other customers without the insurer's written consent. AI
processing uses only the models the insurer's organization configured.

**Existing foundation.** Placements already have `market` and `invited` visibility with a named
audience. A publication does not grant access to the private submission or its attachments.
Commercial record access controls exist, and AI chat context never grants permissions.

**Features to add.** A disclosure-package builder with insurer approval; generalized public
summaries; an insurer-visible access audit; enforced data-use consent.

### 10.6 Explainable matching instead of an "AI" label

**Position.** Matching produces an explainable shortlist, never a decision. Each candidate shows
the appetite rule it matched, the source and freshness of its evidence, current Bindable capacity,
terms and exclusions. The insurer can inspect, override and record the reason. Platform
compensation never affects ranking (10.7).

**Measurable outcome.** In the pilot, compare time to a usable shortlist and the shortlist-to-bind
rate against the insurer's existing process.

**Existing foundation.** Organization, participant and personal appetite profiles and the appetite
engine.

**Features to add.** Match explanations, evidence freshness, override logging and matching metrics.

### 10.7 All-in economics and conflicts

**Position.** Before binding, the insurer sees one all-in cost sheet: platform fee, broker or
intermediary fees, vehicle administration, trustee or custodian, fronting, servicing and expected
onboarding effort. It also states who pays AInsured and how. Compensation is disclosed and never
affects ranking or visibility. The section 3 example ($500,000) is illustrative. Fixed costs make
a dedicated vehicle unlikely to be economic at that size, so small offerings should use a cell or
series of a shared vehicle. This is a hypothesis to validate with real partner pricing.

**Owner decision.** The fee model and minimum viable offering size.

**Existing foundation.** Reviewed per-request fee quotations are stored with the participation
receipt. Accruals, invoices and payments are owned by AIN-37.

**Features to add.** An all-in cost sheet per offering, a comparison with the insurer's current
channel, and a compensation disclosure.

### 10.8 A bounded first offering

**Position.** The long-term vision (section 9) stays. The first offering is deliberately narrow:
one insurer problem, one risk segment, one jurisdiction, one structure and named partners. Individual
participation in it goes through the vehicle and is limited to participants who are eligible under
that offering's rules.

**"Decentralized" means** capital comes from many independent providers, and participation and
discovery are open to eligible individuals. Authority is **not** decentralized: binding,
collateral, claims and release decisions always have the named accountable parties in 10.3.

**Owner decision.** Choose the first offering. A candidate to evaluate, not a decision: fully
collateralized property excess-of-loss reinsurance for small and mid-sized insurers or MGAs in one
U.S. state, through a segregated cell, with a named trustee and backup servicer.

## 11. Broker Proposition: A Better Placement Without Losing the Client

The broker's central objection is that they supply the relationships, data and expertise while the
platform captures the value. **Position:** AInsured is a placement tool and market venue for the
broker of record. It is not a competing intermediary. The broker keeps the client relationship,
controls distribution, and is paid as disclosed in each placement.

**Measurable outcome.** The pilot measures qualified market responses, time to a usable quote, time
to bind, duplicate data entry and total servicing effort against the broker's current process.

### 11.1 Broker role, mandates and client relationships

- **Client-controlled mandate.** The client grants a mandate (a broker-of-record appointment) that
  records scope (risk, class, term), authorized markets and expiry. The platform records it but does
  not decide it.
- **Broker of record.** It is stored on every placement and carried to renewal. A change of broker
  needs a new client-signed mandate with an effective date. It is recorded, never inferred.
- **Competing mandates.** Only one active mandate may cover the same client and risk scope.
  Conflicts are flagged and resolved by the client.
- **No direct solicitation.** While a mandate and its renewal window are active, markets may not
  contact the client through the platform about the brokered risk. Placement communication goes
  through the broker of record.
- **Introduction attribution.** Who introduced whom is recorded and carried to the placement it
  produces.
- **Delegated access.** Broker staff and client users get explicit, revocable, audited access.

**Owner decision.** The direct-solicitation policy and renewal-window length, and whether brokers
are the default distribution channel for the first offering (10.8).

**Existing foundation.** A party-role model that includes `broker`, `mga`, `cedent` and
`intermediary`. Network introductions, organization roles and impersonation controls.

### 11.2 Verified, responsive market access

- **Market status.** Markets move through statuses: Listed, then Verified (identity and authority
  confirmed for the class and jurisdiction), then Active (appetite dated within an agreed period and
  a declared response time). A directory listing alone is never shown as market access.
- **Executable capacity.** Interest is kept separate from executable capacity: only reserved or
  bindable capacity (10.2) is executable.
- **Response tracking.** Each market's response record (quoted, declined, no answer) is visible to
  brokers.

**Existing foundation.** Organization, participant and personal appetite profiles; offer statuses;
capacity reservations.

### 11.3 Broker-led placement workflow

1. **Prepare.** The broker prepares one master submission with AI intake from documents and email.
2. **Derive versions.** Market-specific versions are derived from it and stay linked to the master.
3. **Approve distribution.** The client approves the distribution list and the disclosure for each
   tier (10.5).
4. **Distribute.** Each market sees only its version.
5. **Negotiate.** Questions, answers, deadlines and tasks are tracked per market, with outstanding
   items visible.
6. **Compare and instruct.** Quotes are compared (11.4), then the client gives a recorded
   instruction.
7. **Bind and deliver.** Binding happens per 11.5, followed by document delivery.

Every step is in one audit trail, so no parallel spreadsheet or email trail is needed.

**Existing foundation.** Email and document intake connectors; immutable submission versions;
reinsurance placements with `invited` visibility and a named audience; placement events.

### 11.4 Quote comparison on material terms

- **Side-by-side terms.** Quotes are compared on material terms: limits, deductibles or retentions,
  exclusions, conditions, subjectivities, commissions, wording and price.
- **Source links.** Every normalized term links to its source clause.
- **Missing or unclear terms.** These are flagged as missing or ambiguous, never filled in by
  inference.
- **Recommendation and instruction.** The broker records a recommendation and rationale, and the
  client's instruction is recorded against the exact quote versions compared.

### 11.5 Multi-party placement and binding coordination

- **Placement status.** Each placement shows the requested order, written lines (offered shares)
  and signed lines (final shares), and how much remains to place. "Fully placed" means signed lines
  equal 100% of the order. Over-placement is signed down by a disclosed rule.
- **Expiry and withdrawal.** Quotes carry an expiry. When a market withdraws or a quote lapses, its
  share returns to "remaining" and the broker and client are notified.
- **Authoritative record.** The bound record shows exactly which participant is bound to which
  terms version. The hashed final agreement is authoritative.
- **No confusion with fundraising.** Funding progress is never displayed as bound coverage (10.2).

**Existing foundation.** Offers with versioned, hashed terms and statuses (offered, countered,
accepted, reserved, bound, declined, withdrawn), linked capacity reservations and allocations, and
agreement records. Quote expiry and written-versus-signed line handling were not found.

### 11.6 Compensation and payment operations

- **Disclosed compensation.** Broker commission or client fee and any platform fee are disclosed
  separately for each placement. A platform fee is never taken from commission without the broker's
  agreement.
- **Funds flow.** Each transaction states who holds premium and other funds (broker, regulated
  payment partner, or trustee) and what records the broker receives.
- **Adjustments.** Endorsements, cancellations, adjustments and return premiums are reconciled as
  adjusting entries, never as overwrites.

**Owner decision.** The broker fee model and the supported funds-flow models.

**Existing foundation.** Per-request fee quotations; accruals, invoices, payments and reversals are
owned by AIN-37 and AIN-39.

### 11.7 Client consent, confidentiality and retention

Section 10.5 applies, with the client as the approving party: the broker prepares the disclosure
under its mandate, and the client approves it. Submissions can stay restricted to named markets with
no public tier. Every access to every version is recorded. When a mandate ends, the broker's access
ends, and data is kept only as the law and the contract require (13.1).

### 11.8 Supervising AI output

Section 13.3 applies. Before anything goes to a market or client, the broker sees what was generated,
what was verified, what changed and who approved it. Corrections are sent to every recipient of the
affected version, with a notice of what changed.

**Owner decision (with legal input).** The contractual allocation of responsibility for AI-assisted
output.

### 11.9 Servicing and renewals

- **Post-bind journey.** It follows 10.4, plus evidence of cover (such as certificates), exposure
  updates and claims communications, each versioned with its open actions.
- **Renewal.** A renewal copies prior information forward, but every carried field is marked
  "unconfirmed from prior term" until it is revalidated. Stale terms or exposures are never silently
  reused.

### 11.10 Integration, off-platform participants and incentives

Sections 13.2 and 13.4 apply. Markets that work by email can still take part through email-in and
email-out, and brokers can export their placement records at any time.

## 12. Reinsurer Proposition: Better-Understood Business With Controlled Exposure

The reinsurer's central objection is that more accessible risk is not necessarily attractive risk.
**Position:** AInsured sends reinsurers fewer, better-documented submissions. Each comes with source
provenance, explicit data gaps and the cedent's disclosed reason for seeking capacity. Reinsurers
keep full control of pricing, authority and accumulation.

**Measurable outcome.** The pilot measures qualified submissions, quote and bind rates, underwriting
hours per submission, data-quality issues and turnaround. Loss performance is judged over an
appropriate observation period; early conversion is never presented as proof of it.

### 12.1 Source and quality of business

- **Origination.** Business comes from cedents and brokers through the intake pipeline.
- **Reason for seeking capacity.** Every submission must state it: new business, renewal, increased
  limit, replacement, or declined elsewhere. That disclosure is mandatory.
- **Quality filters.** Each reinsurer sets minimum quality criteria (completeness, data presence,
  loss history years). Submissions below them are not routed to that reinsurer.

**Owner decision.** The target cedent segments and origination channels for the first offering.

### 12.2 Underwriting readiness and provenance

- **Required data.** Each risk class declares the data a reinsurer needs, such as exposure data,
  loss history and development, underlying terms, cedent retention, and underwriting and claims
  practices. Completeness is validated against that list, and gaps are listed, not hidden.
- **Provenance.** Every field shows where it came from: a source document (with location),
  extracted (with confidence), inferred, or user-entered.
- **Changes after a quote.** If the submission changes after a quote, the quote is marked stale and
  must be reconfirmed. Bound terms reference the exact submission version.

**Existing foundation.** Immutable saved submission versions; normalization evidence with schema
pins; immutable snapshots and hashes for quote acceptance, signatures and bindings. Propagating
stale dependencies across services remains open (AIN-18, AIN-95).

### 12.3 Pricing and analytics

- **Advisory estimates.** Platform loss estimates are advisory analytics. Each shows its method,
  model version, inputs, assumptions and uncertainty.
- **Reproducibility.** Reinsurers can export the inputs, reproduce the result and apply their own
  view of risk.
- **The reinsurer's price is final.** A reinsurer's own price is authoritative for its quote. A match
  score never implies adequate pricing.
- **Three separate steps.** Discovery, analysis and authorized underwriting decisions are kept
  separate in the interface and the data.

**Existing foundation.** Versioned pricing with assumptions and model-run parameters, published in
one atomic transaction with retry-safe receipts. Strategy-based risk modeling, with no hardcoded
lines of business.

### 12.4 Portfolio accumulation

- **Aggregate exposure.** Each reinsurer's exposure is aggregated across its platform contracts for
  the first segment, for example by peril and CRESTA zone for property catastrophe.
- **External business.** Reinsurers can upload exposure they hold outside the platform.
- **Overlapping risks.** These are detected by insured and location identity.
- **Limits enforced at quote time.** A quote reserves appetite against the reinsurer's limits
  atomically, so concurrent placements cannot both consume the same remaining capacity. Reservations
  expire with the quote.
- **Stated limits.** The platform states what it cannot measure from the data it has.

**Existing foundation.** CRESTA zone data and risk-layer views; capacity reservation and allocation
entries; atomic, idempotent financial operations. Enforced cross-contract accumulation limits were
not found.

### 12.5 Authority, negotiation and binding

- **Authority matrix.** Each organization defines who may quote, amend, approve exceptions (limits,
  pricing, subjectivities, clause changes), accept a signed line and bind. Limits are set by class,
  amount and terms. Every action is checked against the matrix, and exceptions need recorded
  approval.
- **Lead and following.** The lead agrees the wording version, and followers accept that exact
  hashed version.
- **Authoritative record.** The hashed agreement version is the authoritative wording, and binding is
  an auditable event.

**Existing foundation.** Organization roles; party roles including `reinsurer`, `retrocessionaire`
and `spv`; versioned offers; signed bindings. Transaction-level authority limits were not found.

### 12.6 The reinsurer's role

A reinsurer may act as a risk-bearing participant, a capacity supplier, an underwriting service
provider to a vehicle, a vehicle manager, or a buyer of protection (retrocession). Each role has its
own responsibilities, compensation and data-use limits, and one organization holding two roles on
one placement is a disclosed conflict.

**Owner decision.** Choose the first reinsurer role. A candidate to evaluate, not a decision:
**lead-and-follow**. The reinsurer leads on terms and pricing and takes a signed line, and vehicle
capital follows on the same terms. Public capital then complements the reinsurer instead of
competing with it. Lead compensation (for example an overrider or lead fee) is disclosed.

### 12.7 Claims and recoveries across participants

Section 10.4 applies, with multi-participant allocation added:

- **Loss allocation.** Each participant's share of a loss comes from its signed line.
- **Claims decisions.** The contract states whether the lead's claims agreement binds followers or
  each participant approves.
- **Payments and capital.** Payments are reconciled per participant. Open reserves keep collateral
  trapped (10.2), and investor distributions reflect unresolved obligations, not a maturity date
  alone.

### 12.8 Transaction diligence pack

Every offering publishes a diligence pack before quoting. It contains:

- A counterparty chart (who owes whom).
- Contractual cash flows.
- The security supporting each obligation.
- Who controls collateral movements.
- Failure scenarios: investor non-funding, vehicle default, trustee failure and platform failure.
- The documents needed for internal credit, legal, finance and risk approval.

The platform makes no generic claims of regulatory or accounting acceptability; those depend on each
transaction.

### 12.9 Integration and confidentiality

Sections 13.1, 13.2 and 13.4 apply. A reinsurer's appetite, quoted prices, declines, capacity use and
portfolio limits are its confidential data. They are never shown to other participants, used in
public displays, or used in models that serve others without written consent.

## 13. Shared Commitments to Institutional Participants

These commitments apply to insurers, brokers and reinsurers alike.

### 13.1 Data ownership and permitted use

- **Ownership.** Each participant owns the data it brings. The platform may use it only to operate
  the transactions the participant authorizes.
- **Secondary use.** No model training, cross-customer analytics or benchmarking without written
  consent. Any aggregated statistics must meet an anonymity threshold.
- **Information barriers.** Participants cannot see each other's confidential data. That includes
  appetite, prices, declines and portfolio limits.
- **Retention.** When a mandate or relationship ends, access ends, and data is kept only for its
  legal and contractual retention period, then deleted or returned.

### 13.2 Ranking neutrality and conflicts

- **Ranking.** Factors are visible and based on fit: appetite, authority, capacity, terms and
  response record. Platform compensation never affects ranking.
- **Paid visibility.** It is either prohibited or clearly labelled.
- **No steering.** A funding target never steers business to a vehicle, and alternatives are always
  shown.
- **Rationale.** The reason behind each recommendation is kept.

**Owner decision.** Whether to allow paid visibility at all.

### 13.3 AI supervision and provenance

- **What AI may do.** It may draft, extract, summarize and suggest. It never sends, binds or approves.
- **Provenance.** Every AI-produced field or summary records its source, confidence and status
  (generated, verified or changed), plus who verified it.
- **Review checkpoints.** A named person approves before anything is sent outside the participant's
  organization.
- **Corrections.** These create a new version and notify every recipient of the old one.

### 13.4 System of record and integration

- **What the platform is the record for.** Placement communications, offers, signed lines and bound
  agreement records on the platform.
- **What participants keep.** Their own books and policy-admin systems remain their record. The
  platform provides exports, an API and reconciliation reports with exception queues.
- **Off-platform participants.** They can take part through email-in and email-out and document
  exchange, so not every participant has to adopt AInsured.
- **Duplicate entry.** The pilot measures it directly.

## 14. Capability Additions

These capabilities need Jira user stories, linked to the existing tickets where one owns the work
(see [AGENTS.md](AGENTS.md)). Stories have not been created yet.

| Capability                                                                        | Section    | Existing owner     |
| --------------------------------------------------------------------------------- | ---------- | ------------------ |
| Capacity-state view; funding deadline, minimum, waitlist, shortfall               | 10.2       | AIN-36 (partly)    |
| Trustee-confirmed collateral allocation, trapped collateral, release schedule     | 10.2       | AIN-36 (partly)    |
| Renewal indication and revalidation workflow                                      | 10.2, 11.9 | New story          |
| Responsibility registry that blocks publication; backup-servicer export           | 10.3       | New story          |
| Loss notice, claim file, reserves, payment from collateral, development reporting | 10.4, 12.7 | AIN-37–40 (partly) |
| Multi-participant loss allocation and per-participant reconciliation              | 12.7       | New story          |
| Disputes, endorsements, evidence of cover, bordereaux, commutation, final release | 10.4, 11.9 | New stories        |
| Disclosure-package builder, public summary, access audit, client approval         | 10.5, 11.7 | New story          |
| Match explanations, evidence freshness, override log, metrics                     | 10.6, 13.2 | New story          |
| All-in cost sheet, channel comparison, compensation disclosure                    | 10.7, 11.6 | AIN-37 (partly)    |
| Mandates, broker of record, change of broker, introduction attribution            | 11.1       | New story          |
| Market verification status, dated appetite, response record                       | 11.2       | New story          |
| Master submission with market versions, Q&A, deadlines and tasks                  | 11.3       | New story          |
| Source-linked quote comparison, recommendation and client instruction             | 11.4       | New story          |
| Quote expiry, written and signed lines, signing down, remaining capacity          | 11.5       | New story          |
| Funds-flow model per transaction; adjusting entries for endorsements and returns  | 11.6       | AIN-37, AIN-39     |
| Reason for seeking capacity; per-reinsurer quality filters                        | 12.1       | New story          |
| Field-level provenance; stale-quote marking on submission change                  | 12.2, 13.3 | AIN-18, AIN-95     |
| Pricing input export; uncertainty reporting                                       | 12.3       | New story          |
| Cross-contract accumulation, external portfolio upload, overlap detection         | 12.4       | New story          |
| Atomic appetite reservation at quote time                                         | 12.4       | New story          |
| Authority matrix; lead and following on hashed wording                            | 12.5       | New story          |
| Transaction diligence pack                                                        | 12.8       | New story          |
| Data-use consent, information barriers, retention and deletion                    | 13.1       | New story          |
| AI review checkpoints; correction propagation to recipients                       | 13.3       | New story          |
| Exports, API, reconciliation exceptions, email-in for off-platform participants   | 13.4       | New story          |

## 15. Evidence to Gather Before Adoption Claims

Engineering cannot produce this evidence. It must come from customer discovery, partners and the
pilot, and must not be invented in documents, fixtures or demos:

- The first customer's problem and its current cost, from insurer and broker interviews or data.
- Signed or indicative terms from the vehicle, trustee, fronting carrier, backup servicer and a lead
  reinsurer.
- Real all-in costs at the intended offering size, including broker compensation.
- Evidence that participating markets are active and responsive, with incremental capacity, in the
  first segment.
- A complete broker-led placement using real terms: client consent, negotiation, multi-party signed
  lines, binding and servicing.
- A complete transaction example, including failed fundraising and an adverse loss with disputed,
  developing and multi-party claims.
- Pilot results against the outcome measures in 10.1, 11 and 12. Loss performance is assessed over
  an appropriate observation period.
