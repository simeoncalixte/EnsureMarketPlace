#!/usr/bin/env python3
"""Create the 8 quote-to-bind funnel issues via the GitHub REST API.

Auth: pulls the stored github.com token from the git credential helper.
The token is never printed.
"""
import json
import subprocess
import sys
import urllib.request

REPO = "simeoncalixte/EnsureMarketPlace"
DOC = "docs/close-the-loop-bind-funnel.md"


def get_token() -> str:
    out = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True, text=True, check=True,
    ).stdout
    for line in out.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    sys.exit("no github.com credential found")


ISSUES = [
    (
        "Pre-bind compliance stage: sanctions, licensing, underwriting authority",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **1 of 8**. Legally non-negotiable; nothing downstream is safe to build without it.

New pipeline stage between `riskCompute` and quote issuance:

- **Sanctions/OFAC screening** of insured, beneficial owners, and named additional insureds against OFAC SDN + EU/UN consolidated lists. Nothing exists submission-side today (`KYCRecord`/`AccreditationCheck` in `governance.models.ts` are investor-side only). Screening provider behind the standard provider interface (real API + simulated fallback). Hard block on hits; human-review queue for fuzzy matches. Persist every screen with timestamp + list version — regulators require proof of screening *at bind time*.
- **Carrier licensing/admitted-status check**: is the carrier/capacity partner (from capacity match) licensed/admitted for this LOB in the insured's jurisdiction? Requires a jurisdiction–LOB–carrier authority table. Non-admitted → surplus lines path (surplus lines broker license number, diligent-search affidavit, surplus lines tax calc).
- **Producer licensing**: verify the submitting broker holds an active license in the risk's state (NIPR lookup in the US).
- **Underwriting authority check**: block quotes exceeding the underwriter's delegated authority (limit, LOB, hazard grade) → referral queue.

Output: a `ComplianceClearance` record per submission — pass/fail per check, evidence, list versions, reviewer. Quote issuance is blocked without it.

Note: the carrier-authority table is a real business dependency (licensed paper), not just schema.""",
    ),
    (
        "Quote model, forms engine, and quote document generation",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **2 of 8**. Turns the existing `PricingVersion` into something offerable.

- **Quote assembly**: wrap the active `PricingVersion` in commercial terms — limits, deductibles/attachment, sublimits, coverage form references, exclusions, subjectivities (signed application, loss runs, inspection, certifications), premium breakdown (base + fees + surplus lines tax + state taxes/surcharges), commission, and a validity window (~30 days, tied to the pricing version so a stale model run can't be bound).
- **Forms engine**: the legally binding artifact is the policy wording. Map each risk class in the Risk Class Registry to filed/approved forms (ISO or proprietary filed wordings for admitted business; freer wording for surplus lines) plus state-mandated endorsements. Generate the quote document from these templates with submission data merged — natural extension of the dynamic-template work.
- **Versioning**: quotes are immutable once issued; a revision creates a new quote version linked to a (possibly new) pricing version. Same pattern as `PricingVersion`.
- New models: `Quote` (draft → issued → accepted → expired/declined/superseded), `QuoteVersion`, `Subjectivity`.""",
    ),
    (
        "Negotiation, acceptance, and e-signature",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **3 of 8**.

- Broker receives the quote (portal, or the existing social/DM layer) and can request changes → new quote version, re-triggering risk compute if exposure data changed.
- **Acceptance requires**: a written order to bind from the broker, a signed application (the insured warrants accuracy of the submission data — this is the platform's legal protection against extraction errors; material misrepresentation voids coverage), and resolution of all subjectivities-precedent.
- **E-signature** integration (DocuSign/Dropbox Sign) behind a provider interface with simulated fallback, consistent with other connectors. Store signed artifacts immutably with hash + timestamp; extend the existing `LegalDocument` model rather than building new.""",
    ),
    (
        "Bind transaction: gate re-checks, capacity reservation, binder issuance, event-sourced bind record",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **4 of 8**. The legal moment — one atomic transaction per submission.

1. **Re-run gates at bind time**: sanctions re-screen (lists change), quote not expired, pricing version unchanged, capacity still available (reserve it — two submissions racing for the last capacity must not both bind), authority sufficient, subjectivities-precedent satisfied.
2. **Issue the binder**: a binder is a legal contract of temporary insurance — named insured, coverage, limits, effective date/time to the minute, premium, conditions, expiry (lapses at 30–90 days or upon policy issuance). New `Binder` model linked to submission, quote version, and pricing version.
3. **Event-sourced bind record** (per the existing error-handling/event-sourcing contract): an immutable event capturing who bound, under what authority, against which quote/pricing/clearance versions. This is the audit spine for regulators and courts.
4. **Oracle/smart-contract path**: for parametric business that passed oracle attestation, instantiate and fund the trigger contract here; the binder references the contract address. The legal contract is still the written policy — issue paper regardless.
5. Wire the existing `Policy` table (`underwriting.models.ts` — has a `submissionId` FK but nothing writes to it from the pipeline) as the terminal write at policy issuance.""",
    ),
    (
        "Premium payment & billing: agency bill receivable + Stripe direct bill",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **5 of 8**.

- **Agency bill** (market norm for commercial lines): bind on broker billing terms; model the receivable with a premium-payment-warranty window (e.g., 30 days) and an automatic cancellation provision if unpaid.
- **Direct bill**: extend the existing Stripe integration (registration paywall, `billing.models.ts`) into per-submission premium payment, with the same simulated fallback.
- Return-premium handling (pro-rata / short-rate) for cancellations.""",
    ),
    (
        "Policy issuance, statutory reporting, and subjectivity tracking",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **6 of 8**.

- **Policy document generation** from the forms engine: declarations page, coverage forms, all endorsements, state-mandated notices. Deliver to broker/insured; the binder is superseded. Populate the `Policy` table.
- **Statutory follow-through** per jurisdiction: surplus lines tax filings + stamping-office submissions, state premium tax accrual, bordereaux to capacity providers/reinsurers (capacity-match routing implies cession reporting obligations), and immutable policy data retention (5–7+ years).
- **Subjectivities-subsequent tracking**: post-bind conditions (e.g., inspection within 60 days) get a task queue with automatic escalation to notice-of-cancellation if unmet.""",
    ),
    (
        "Endorsements: mid-term changes as delta submissions",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **7 of 8**.

Mid-term policy changes re-enter the pipeline as delta submissions: re-extract → re-validate → re-price the delta → endorsement document → premium adjustment. Nothing exists for this today.""",
    ),
    (
        "In-force loop: claims FNOL, cancellation/non-renewal, renewal",
        f"""Part of the quote-to-bind funnel (see {DOC}). Build order: **8 of 8**.

- **Claims**: FNOL intake reusing the ingestion pipeline (claims documents are just another document class); reserving feeds the loss triangles the actuarial core needs (closes the claims-feed gap); payout via the existing governance `Claim`/`Payout` models.
- **Cancellation/non-renewal**: statutory notice periods per state; pro-rata / short-rate return premium calculation.
- **Renewal**: at expiry minus 90 days, clone the submission with updated exposure data and prior-term loss experience and re-enter the pipeline at validation — where the credibility blend in risk compute starts earning its keep with own experience data.""",
    ),
]


def main() -> None:
    token = get_token()
    created = []
    for title, body in ISSUES:
        req = urllib.request.Request(
            f"https://api.github.com/repos/{REPO}/issues",
            data=json.dumps({"title": title, "body": body}).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read())
                created.append((data["number"], data["html_url"], title))
                print(f"created #{data['number']}: {title}")
        except urllib.error.HTTPError as e:
            print(f"FAILED ({e.code}) {title}: {e.read().decode()[:300]}")
            sys.exit(1)
    print("\nAll issues created:")
    for num, url, title in created:
        print(f"  #{num} {url}")


if __name__ == "__main__":
    main()
