# Closing the Loop: Quote-to-Bind Funnel

Notes from the 2026-06-12 lifecycle review. The pipeline today ends at pricing:
ingestion → OCR → classification → extraction → location discovery → normalization →
validation/appetite → schema generation → workflow (pre-rating, capacity, oracle
attestation, triage) → risk compute (`PricingVersion` with premium) — and stops.

There is no quote, no pre-bind compliance, no acceptance, no payment, no binder, no
policy issuance. "Closing the loop" = building the quote-to-bind funnel after
`riskCompute`, plus the legal scaffolding that makes the bind enforceable.

**Design anchors:**

1. **Licensed paper is a business dependency, not just schema.** "Legally bound"
   requires a carrier or fronting partner whose regulatory authority the platform
   binds against. Software enforces and evidences every gate; the authority comes
   from the capacity partner.
2. **The signed application protects the platform from extraction errors.** The AI
   pipeline produces the data, but the insured must warrant it before bind —
   material misrepresentation voids coverage.

---

## Issue 1 — Pre-bind compliance stage (sanctions, licensing, authority)

New pipeline stage between `riskCompute` and quote issuance. Legally non-negotiable;
nothing downstream is safe to build without it. Chief-underwriting-officer domain.

- **Sanctions/OFAC screening** of insured, beneficial owners, named additional
  insureds against OFAC SDN + EU/UN consolidated lists. Nothing exists
  submission-side today (`KYCRecord`/`AccreditationCheck` are investor-side only,
  `governance.models.ts`). Screening provider behind the standard provider
  interface (real API + simulated fallback). Hard block on hits; human-review
  queue for fuzzy matches. Persist every screen with timestamp + list version —
  regulators require proof of screening *at bind time*.
- **Carrier licensing/admitted-status check**: is the carrier (or capacity partner
  from capacity match) licensed/admitted for this LOB in the insured's
  jurisdiction? Needs a jurisdiction–LOB–carrier authority table. If
  non-admitted → surplus lines path (surplus lines broker license number,
  diligent-search affidavit in many states, surplus lines tax calc).
- **Producer licensing**: verify the submitting broker holds an active license in
  the risk's state (NIPR lookup in the US).
- **Underwriting authority check**: block release of quotes exceeding the
  underwriter's delegated authority (limit, LOB, hazard grade) → referral queue.
- Output: `ComplianceClearance` record per submission — pass/fail per check,
  evidence, list versions, reviewer. Quote issuance blocked without it.

## Issue 2 — Quote model + forms engine + document generation

Turns the existing `PricingVersion` into something offerable.

- **Quote assembly**: wrap the active `PricingVersion` in commercial terms —
  limits, deductibles/attachment, sublimits, coverage form references, exclusions,
  **subjectivities** (signed application, loss runs, inspection, certifications),
  premium breakdown (base + fees + surplus lines tax + state taxes/surcharges),
  commission, **validity window** (~30 days, tied to the pricing version so a
  stale model run can't be bound).
- **Forms engine**: the legally binding artifact is the policy wording. Each risk
  class in the Risk Class Registry maps to filed/approved forms (ISO or
  proprietary filed wordings for admitted; freer wording for surplus lines) plus
  state-mandated endorsements. Quote document generated from these templates with
  submission data merged — natural extension of the dynamic-template work.
- **Versioning**: quotes immutable once issued; revisions create a new quote
  version linked to a (possibly new) pricing version. Same pattern as
  `PricingVersion`.
- New models: `Quote` (draft → issued → accepted → expired/declined/superseded),
  `QuoteVersion`, `Subjectivity`.

## Issue 3 — Negotiation, acceptance & e-signature

- Broker receives quote (portal, or existing social/DM layer), can request
  changes → new quote version, re-triggering risk compute if exposure changed.
- **Acceptance requires**: written order to bind from the broker, a **signed
  application** (insured warrants accuracy of submission data — legal protection
  against extraction errors), all subjectivities-precedent resolved.
- **E-signature** integration (DocuSign/Dropbox Sign behind a provider interface
  with simulated fallback, consistent with other connectors). Signed artifacts
  stored immutably with hash + timestamp; extend the `LegalDocument` model rather
  than building new.

## Issue 4 — Bind transaction (the legal moment)

One atomic transaction per submission:

1. **Re-run gates at bind time**: sanctions re-screen (lists change), quote not
   expired, pricing version unchanged, capacity still available (**reserve it** —
   two submissions racing for the last capacity must not both bind), authority
   sufficient, subjectivities-precedent satisfied.
2. **Issue the binder**: a binder is a legal contract of temporary insurance —
   named insured, coverage, limits, effective date/time **to the minute**,
   premium, conditions, expiry (lapses at 30–90 days or upon policy issuance).
   New `Binder` model linked to submission, quote version, pricing version.
3. **Event-sourced bind record** (per the existing error-handling/event-sourcing
   contract): immutable event capturing who bound, under what authority, against
   which quote/pricing/clearance versions. This is the audit spine for
   regulators/courts.
4. **Oracle/smart-contract path**: for parametric business that passed oracle
   attestation, instantiate + fund the trigger contract here; binder references
   the contract address. The *legal* contract is still the written policy —
   issue paper regardless.
5. Wire the existing `Policy` table (`underwriting.models.ts` — has a
   `submissionId` FK but nothing writes to it from the pipeline) as the terminal
   write at policy issuance.

## Issue 5 — Payment & billing (agency bill + direct bill)

- **Agency bill** (market norm for commercial lines): bind on broker billing
  terms; model the receivable with a premium-payment-warranty window (e.g., 30
  days) and automatic cancellation provision if unpaid.
- **Direct bill**: extend the existing Stripe integration (registration paywall,
  `billing.models.ts`) into per-submission premium payment, with the same
  simulated fallback.
- Return-premium handling (pro-rata / short-rate) for cancellations.

## Issue 6 — Policy issuance + statutory reporting + subjectivity tracking

- **Policy document generation** from the forms engine: declarations page,
  coverage forms, all endorsements, state-mandated notices. Deliver to
  broker/insured; binder superseded. Populate the `Policy` table.
- **Statutory follow-through** per jurisdiction: surplus lines tax filings +
  stamping-office submissions, state premium tax accrual, bordereaux to capacity
  providers/reinsurers (capacity-match routing implies cession reporting),
  immutable policy data retention (5–7+ years).
- **Subjectivities-subsequent tracking**: post-bind conditions (e.g., inspection
  within 60 days) get a task queue with automatic escalation to
  notice-of-cancellation if unmet.

## Issue 7 — Endorsements (mid-term changes)

- Mid-term changes re-enter the pipeline as **delta submissions**: re-extract →
  re-validate → re-price the delta → endorsement document → premium adjustment.
  Nothing exists for this today.

## Issue 8 — Claims FNOL, cancellation & renewal (in-force loop)

- **Claims**: FNOL intake reusing the ingestion pipeline (claims documents are
  just another document class); reserving feeds the loss triangles the actuarial
  core needs (closes the claims-feed gap); payout via existing governance
  `Claim`/`Payout` models.
- **Cancellation/non-renewal**: statutory notice periods per state; pro-rata /
  short-rate return premium.
- **Renewal**: at expiry−90 days, clone the submission with updated exposure data
  + prior-term loss experience and re-enter the pipeline at validation — where
  the credibility blend in risk compute starts earning its keep with own
  experience data.

---

## Build order

1. Pre-bind compliance stage (Issue 1)
2. Quote model + forms engine (Issue 2)
3. Acceptance + e-signature (Issue 3)
4. Bind transaction (Issue 4)
5. Payment/billing (Issue 5)
6. Statutory reporting + subjectivities (Issue 6), then endorsements (7) and
   claims/renewal (8) as the in-force loop.
