# Party finances and model audit — November 1, 2026

The project has several useful financial subsystems, but they do not yet form a reconciled account of who owes whom, who has paid, and who owns the resulting risk or capital. This review inspected the current local working tree, not a deployed release. Existing immutable snapshots, exact commercial ledger arithmetic, access checks and locking should be preserved.

## Current models and ownership

| Area | Existing models / implementation | What is tracked | Remaining boundary |
|---|---|---|---|
| Insurer underwriting | RiskPortfolio, Policy, ExposureUnit, CanonicalSubmission | Exposure, premium, policy currency and normalization fields | Approved canonical/workbench revision and financial inputs must stay aligned |
| Modeling and pricing | ModelRun, Pricing, PricingVersion, RiskMetric | Loss estimates, technical premiums, versions, assumptions, provenance | Wrong exposure selection, unavailable-price representation and atomic version persistence |
| Parties and contracts | CommercialSnapshot.parties, commercial records/revisions/decisions | Provider, recipient, intermediary and contracting-party roles; approved terms | Contract participation and posting actor do not identify payer/payee accounts or payment mandates |
| Capacity | commercial_capacity_entries, ledger.ts | Reservations, allocations, releases, referrals and remaining limits | Capacity is contractual risk availability, not proof of cash/collateral; pipeline integration is incomplete |
| Premium/claims servicing | commercial_servicing_entries, servicing.ts | Due/paid premiums, recognized claims, reductions, recoveries; totals per contract/currency | Missing explicit payer/payee, payment reversals and systematic gross/ceded/retained accounting |
| Quotes and binding | Quote store and submission_bindings | Frozen source snapshots, approval/acceptance/signatures and bound evidence | Existing binding needs integration with pricing, capacity and party obligations; do not rebuild it |
| Capital ownership | SPVEntity, SPV, SPVOwnership, CapitalCommitment, Tranche, TrancheSubscription | Ownership, commitment and deployment fields | Cash-confirmed lifecycle and reconciliation were not established; dashboard currently conflates commitments and funding |
| Collateral | CollateralAccount, CollateralMovement | Currency balance and movement references | External custody statements, settlement, reversals and independent reconciliation |
| Tokens / trading | Token, TokenHolder, Order, Trade, TokenTransaction, TokenLock | Instruments, holdings, orders and transaction records | Model presence is not evidence of an operational exchange or settlement system; secondary-market readiness was not tested |
| Fees | Fee; retrocession premium/commission fields | Rate/amount, charged entity, contract references | Currency, recipient, accrual/payment status and commission amount-versus-rate semantics |
| Platform billing | Subscription, plans.ts, stripe.service.ts | User/org plan, recurring amount, provider IDs/status/period | Plan authorization, production simulation, idempotent checkout, invoices and lifecycle reconciliation |

Capital monetary models do not all carry their own currency. Commercial records use BigInt cents and numeric(18,2); the supported-currency and FX contract needs to be explicit. A posting organization's identity is not interchangeable with the debtor, creditor, beneficiary or beneficial owner.

## Calculation models currently present

- Generic loss model: exposure base multiplied by a configured/benchmark loss rate; generic rating uses loss-ratio pricing.
- Credibility: Z = min(1, sqrt(n / nFull)); weighted experience/prior blend. Current compute fixes experience to null and observed claim count to zero.
- Cat: declared event/damage inputs, seeded Monte Carlo EP calculations, AAL, OEP/AEP, PML/tail metrics and accumulation.
- Parametric: declared probability/trigger curve and payout calculation.
- Casualty: ILF-based rating with configured/cited inputs; do not infer a complete loss-development/reserving implementation.
- Risk/return derivation: risk score from expected loss / technical premium; expected return from marginTarget. This is not a dated investor cash-flow IRR.
- Commercial capacity: exact cent arithmetic over append-only reservations/allocations/releases, subject to aggregate/per-risk/per-occurrence limits.
- Servicing: premium due minus paid; recognized claims minus reductions; recoverable claims minus recoveries. Recording an amount does not establish its treaty calculation or external payment.

## Reproduced findings

The local audit harness transpiles and executes source methods with isolated fixture data and mocked persistence/providers. It does not connect to a database or payment provider.

1. Revenue basis selects 1,000,000 of TIV despite revenue being 100,000, and labels it revenue.
2. Unavailable technical premium is mapped to numerical zero.
3. Pending commitment 100 / deployed 0 is reported as funded 100 and invested 100.
4. Adding an unowned 90% opportunity changes an owned 10% return to 10.792079%.
5. NODE_ENV=production with no Stripe key returns a simulated active paid subscription.
6. An authenticated ordinary investor can select the free admin plan at checkout. This is a subscription eligibility defect; it does not prove administrator privilege escalation.

Other bug tickets document code-confirmed defects/unsafe sequences: pipeline parity failure, mixed-currency legacy board totals, non-atomic compute writes, hardcoded marketplace TVL and checkout concurrency/idempotency. The concurrency cases still need database/provider fault-injection reproduction.

## Verification

- `node output/finance-audit-2026-11-01/reproduce.cjs`: six observed cases recorded in `reproductions.json`.
- Existing `ledger.test.ts` and `participationAmounts.test.ts`: 2 suites / 2 tests passed. They verify exact capacity cents and participation calculation, not the full financial lifecycle.
- Previous review: API typechecking passed; pipeline parity failed. The complete build/test suite was not rerun here.
- No application implementation was changed. Jira tickets and local audit artifacts were created.

## Unverified areas

Production balances, migrations on production data, deployed secrets/configuration, real provider webhooks, custody/settlement, concurrency under load, payout mandates and jurisdiction-specific acceptance were not verified. There may be other defects. The coverage-register and invariant-suite tickets explicitly track these unknowns instead of labeling them confirmed bugs.

The child ticket inventory is in `tickets.json`; created Jira keys and parent epics are in `created-tickets.json`. Bugs use Jira Bug; gaps use Jira Task with the `gap` label. Priorities are planning labels because the project's create metadata does not expose a priority field.

## Created tickets

| Epic | Type | Ticket |
|---|---|---|
| AIN-1 | Bug | [AIN-13: Repair the failing pipeline parity gate before financial releases](https://simeoncalixte1990.atlassian.net/browse/AIN-13) |
| AIN-1 | Gap | [AIN-14: Prove consistent financial backups and cross-service recovery](https://simeoncalixte1990.atlassian.net/browse/AIN-14) |
| AIN-2 | Gap | [AIN-15: Preserve party, currency and valuation evidence from financial documents](https://simeoncalixte1990.atlassian.net/browse/AIN-15) |
| AIN-2 | Gap | [AIN-16: Implement tenant-scoped search for financial evidence](https://simeoncalixte1990.atlassian.net/browse/AIN-16) |
| AIN-3 | Bug | [AIN-17: Stop combining different currencies in legacy board premium totals](https://simeoncalixte1990.atlassian.net/browse/AIN-17) |
| AIN-3 | Gap | [AIN-18: Pin a common financial revision across workbench, pricing, quotes and servicing](https://simeoncalixte1990.atlassian.net/browse/AIN-18) |
| AIN-4 | Bug | [AIN-19: Select exposure by the declared rating basis instead of always preferring TIV](https://simeoncalixte1990.atlassian.net/browse/AIN-19) |
| AIN-4 | Bug | [AIN-20: Preserve unavailable model premium instead of persisting numeric zero](https://simeoncalixte1990.atlassian.net/browse/AIN-20) |
| AIN-4 | Bug | [AIN-21: Make model and pricing-version persistence atomic and concurrency safe](https://simeoncalixte1990.atlassian.net/browse/AIN-21) |
| AIN-4 | Gap | [AIN-22: Feed validated party loss experience into credibility-weighted pricing](https://simeoncalixte1990.atlassian.net/browse/AIN-22) |
| AIN-4 | Gap | [AIN-23: Publish a financial model inventory and independent validation suite](https://simeoncalixte1990.atlassian.net/browse/AIN-23) |
| AIN-5 | Gap | [AIN-24: Use committed facility balances for underwriting capacity decisions](https://simeoncalixte1990.atlassian.net/browse/AIN-24) |
| AIN-5 | Gap | [AIN-25: Define and enforce unknown-capacity and currency policy](https://simeoncalixte1990.atlassian.net/browse/AIN-25) |
| AIN-6 | Gap | [AIN-26: Link existing bindings to authoritative pricing, capacity and party obligations](https://simeoncalixte1990.atlassian.net/browse/AIN-26) |
| AIN-6 | Gap | [AIN-27: Specify financial completeness and exception policy for all binding paths](https://simeoncalixte1990.atlassian.net/browse/AIN-27) |
| AIN-7 | Gap | [AIN-28: Apply versioned eligibility checks to parties incurring financial obligations](https://simeoncalixte1990.atlassian.net/browse/AIN-28) |
| AIN-7 | Gap | [AIN-29: Verify beneficiary mandates and separate payment approval duties](https://simeoncalixte1990.atlassian.net/browse/AIN-29) |
| AIN-8 | Bug | [AIN-30: Do not report pending commitments as funded or invested capital](https://simeoncalixte1990.atlassian.net/browse/AIN-30) |
| AIN-8 | Bug | [AIN-31: Exclude unowned opportunities from portfolio return and stop calling weighted yield IRR](https://simeoncalixte1990.atlassian.net/browse/AIN-31) |
| AIN-8 | Bug | [AIN-32: Remove hardcoded financial totals from the live marketplace](https://simeoncalixte1990.atlassian.net/browse/AIN-32) |
| AIN-8 | Gap | [AIN-33: Connect marketplace actions to authorized financial workflows](https://simeoncalixte1990.atlassian.net/browse/AIN-33) |
| AIN-9 | Gap | [AIN-34: Add explicit payer/payee financial accounts and a reconciled party subledger](https://simeoncalixte1990.atlassian.net/browse/AIN-34) |
| AIN-9 | Gap | [AIN-35: Define currency and minor-unit rules across all financial models](https://simeoncalixte1990.atlassian.net/browse/AIN-35) |
| AIN-9 | Gap | [AIN-36: Implement funded-capital and collateral reconciliation beyond seeded records](https://simeoncalixte1990.atlassian.net/browse/AIN-36) |
| AIN-9 | Gap | [AIN-37: Model gross-to-net premium, commissions, taxes and platform fees per party](https://simeoncalixte1990.atlassian.net/browse/AIN-37) |
| AIN-10 | Gap | [AIN-38: Calculate gross, ceded and retained claims using approved treaty terms](https://simeoncalixte1990.atlassian.net/browse/AIN-38) |
| AIN-10 | Gap | [AIN-39: Support auditable payment reversals and financial adjustments](https://simeoncalixte1990.atlassian.net/browse/AIN-39) |
| AIN-10 | Gap | [AIN-40: Implement party-specific recoveries and investor distribution waterfalls](https://simeoncalixte1990.atlassian.net/browse/AIN-40) |
| AIN-11 | Bug | [AIN-41: Reject paid subscription simulation in production when Stripe is unconfigured](https://simeoncalixte1990.atlassian.net/browse/AIN-41) |
| AIN-11 | Bug | [AIN-42: Restrict checkout plans to the authenticated participant eligibility](https://simeoncalixte1990.atlassian.net/browse/AIN-42) |
| AIN-11 | Bug | [AIN-43: Prevent duplicate external subscriptions on concurrent checkout or retry](https://simeoncalixte1990.atlassian.net/browse/AIN-43) |
| AIN-11 | Gap | [AIN-44: Reconcile subscription lifecycle, invoices and usage into platform receivables](https://simeoncalixte1990.atlassian.net/browse/AIN-44) |
| AIN-12 | Gap | [AIN-45: Create a cross-party financial invariant and failure-injection suite](https://simeoncalixte1990.atlassian.net/browse/AIN-45) |
| AIN-12 | Gap | [AIN-46: Maintain a finance model/coverage register and investigate untested risks](https://simeoncalixte1990.atlassian.net/browse/AIN-46) |
