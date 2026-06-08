# Ensured — Insurer-Side Domain Roadmap

> **Owner:** CEO / Chief Underwriting strategy
> **Status:** Active — Wave 1
> **Last reviewed:** 2026-06-07

This is the document the domain agents execute against. It exists to keep
*breadth* coherent: we are deliberately widening the insurer side of the
marketplace, and without a shared spine that turns into sprawl.

---

## 1. Strategy in one paragraph

Ensured wins by being the platform an insurer/MGA/cedent adopts **before** any
capital shows up. The wedge is the **AI underwriting pipeline** — risk arrives
messy (broker PDFs, SOVs, email, SFTP), and we turn it into canonical, priced,
appetite-checked, audit-trailed submissions. We are building **breadth on the
insurer side**, treating **compliance as first-class**, and our engineering is
done by **insurance domain experts** who make decisions that are correct by the
standards of a real underwriting shop — not merely plausible.

**The platform is risk-class agnostic.** A line of business is *data* — a row in
the `LineOfBusinessPrimaryType` / `SubType` taxonomy that the insurer/reinsurer
configures, plus the schema/template and pipeline config bound to it, plus the
data they connect. It is **never** a hardcoded vertical. Property-cat is one
configured instance, not special-cased code. Every engine (extraction, appetite,
risk modeling, pricing) is an **interpreter of configuration + connected data**,
not a switch over known lines. Specialized math is a strategy selected by config
(EP curve vs. loss triangle vs. trigger probability), with a generic default when
none is declared.

## 2. The brutal truth (from the codebase audit, 2026-06-07)

We have **strong data plumbing and a hollow actuarial core.**

| Domain | Reality today |
|---|---|
| Ingestion / extraction | **Real.** Multi-channel connectors, OCR providers, Gemini extraction with regex fallback. BUT: no enforced canonical schema, confidence scores are hardcoded scalars, no extraction versioning, enrichment is an empty shell. |
| Appetite / validation | **Real engine.** `evaluateAppetite()` does peril/LOB/capacity/geo/quality/custom-rule checks. BUT: LOB taxonomy exists yet appetite matches on free-text substrings; jurisdiction is substring matching; third-party scrub signals (OFAC/sanctions) return empty; one appetite profile per org. |
| Cat modeling / exposure | **Placeholder.** `expectedLoss = totalPremium * 0.36`; `var99 = expectedLoss * 1.75`. No Monte Carlo, no peril damage functions, CRESTA zones imported but never used in aggregation, no PML/AAL, no exposure data-quality gates. |
| Pricing / actuarial | **Placeholder.** `premium = totalPremium * 1.08`; `expectedReturn = '0.1280'`; `riskScore = '0.6120'` hardcoded. Pre-rating grade is naive heuristics. Capacity is hardcoded constants, not treaty-backed. |

**Implication:** our differentiation narrative ("AI underwriting") is credible at
the *intake* layer and fiction at the *risk-and-price* layer. Wave 1 closes that
gap. No demo or pilot should show a number we can't defend.

## 3. Operating principles for all domain agents

1. **No undefended numbers.** Every loss, premium, score, or return must trace
   to a documented method, inputs, and assumptions. Delete or flag any magic
   multiplier you find; replace it with a real (even if simple) model and log
   the assumptions in the existing `*.assumptionsJson` / `parametersJson` fields.
2. **Insurance-correct by default.** Use real terminology and real structures
   (TIV, AAL, PML, OEP/AEP, loss cost, rate-on-line, attachment/exhaustion,
   ceding commission, occurrence vs aggregate). If a model is simplified, say so
   in code comments and surface it as an explicit assumption — never disguise a
   simplification as rigor.
3. **Respect the platform contracts.** Pipeline stages return the `{ok:false}`
   contract; errors flow through the global Fastify envelope; the pipeline is
   append-only with `StageExecution` + `PipelineArtifact` lineage. Don't break
   replay/rerun. (See `error-handling-contract`, `llm-primary-pipeline` memory.)
4. **LLM-primary, heuristic-fallback.** Judgment stages prefer Gemini with a
   deterministic fallback so the free test suite stays green. Keep that pattern;
   gate any real-LLM tests behind `RUN_REAL_LLM=1`.
5. **Test what you build.** Backend changes ship with Jest tests. New actuarial
   methods get unit tests with known-answer fixtures so a regression is obvious.
6. **Schema before feature.** When a domain has freeform JSONB standing in for a
   contract (canonical submission, model parameters), define the schema first.
7. **Risk-class agnostic, always.** Never branch on a specific line of business in
   engine code. Read the risk class's declared schema/method/dimensions from the
   registry (Epic 0) and interpret them. If you catch yourself writing `if (lob ===
   'property')`, you're building the wrong thing — make it config-driven.

## 4. Wave 1 epics (the insurer wedge)

Each epic is owned by one agent. Priority is top-to-bottom. **Epic 0 is the spine
every other epic plugs into — it lands first.**

### 0. Risk Class Registry (the agnostic spine)  — *Risk Product Architect*
> **Founder constraints (non-negotiable):** (a) **enhance, never degrade** — all
> work is additive and backward-compatible; the working build and green tests stay
> intact; migrations are additive only. (b) **Org-editable dynamic schema is a
> must** — every organization can define and edit its own schema per risk class,
> through data (not a deploy), built on `PageTemplate` + taxonomy, with versioning.

- Make a line of business a first-class, data-driven **risk class**: bind to the
  existing `LineOfBusinessPrimaryType` / `SubType` taxonomy a declaration of
  `{ schema extension, risk-modeling method, rating method, appetite dimensions,
  required data fields }`. Stored and editable per insurer/reinsurer — no code per
  line.
- Define the **base canonical schema + per-LOB extension** contract (built on
  `PageTemplate` and the taxonomy) that the Ingestion Lead enforces.
- Define the **strategy-selection interface** the modeling and pricing engines
  read, plus a generic default strategy when a line declares none.
- Establish **data-source → canonical field mapping** as configuration, so what an
  insurer connects drives the available schema (agnostic to source shape).
- Guardrail the whole fleet: **review every domain change for hardcoded
  assumptions about the line of business** and reject them.

### A. Canonical Submission Schema  — *Ingestion & Extraction Lead*
- Define a formal canonical submission schema (TS interface + JSON Schema):
  insured, LOB (taxonomy code, not free text), perils, locations, TIV/limits,
  deductibles/attachment, effective/expiry, financials, data-quality fields.
- Enforce it on `CanonicalSubmission` write; expose validation errors.
- Replace hardcoded extraction confidence with real model/OCR confidence; add
  extraction versioning so reruns don't silently overwrite history.
- Make schedule/SOV extraction handle tables, not just the one regex shape.

### B. Taxonomy-Aware Appetite + Real Scrub  — *Chief Underwriting Officer*
- Wire the LOB taxonomy into `evaluateAppetite()` so rules target codes and
  support hierarchy (accept `PROPERTY_COMMERCIAL_*`, reject residential).
- Add peril-interaction rules (co-peril requirements, geo-conditioned perils,
  e.g. wind excluded in TX but accepted in FL).
- Implement real third-party scrub signals (OFAC/sanctions/address) behind a
  provider interface with a deterministic stub default — compliance-grade.
- Support per-underwriter / per-program appetite carve-outs, not just one org
  profile.

### C. Risk Modeling Registry  — *Risk Modeling Lead*
- Replace the 36% flat-loss multiplier with a **strategy registry** that selects a
  loss model from the risk class's declared method (Epic 0) and the connected
  data — never a hardcoded peril assumption. Implement, as pluggable strategies:
  - **Property/Cat:** exposure rating (TIV × damage ratio by peril/COPE) → Monte
    Carlo event set → EP curve → AAL, PML, OEP/AEP at return periods; CRESTA-zone
    accumulation and concentration limits.
  - **Long-tail/Casualty:** experience rating via loss triangles, development
    factors, IBNR; exposure rating via ILFs.
  - **Parametric:** trigger-probability × payout (uses `Trigger` /
    `ParametricDefinition`).
  - **Generic default:** burning-cost / loss-ratio-from-experience when a line
    declares no specialized method.
- Store method + parameters in `ModelRun.parametersJson` against a schema.
- Add data-quality gates appropriate to the selected method (e.g. no NULL TIV/geo
  for cat; sufficient loss history for triangles).
- Output a clean **loss-cost / AAL contract** the Chief Actuary prices on,
  regardless of which strategy produced it.

### D. Real Pricing / Rating Engine  — *Chief Actuary (Pricing)*
- Build a technical-premium calculator: loss cost (from the cat/exposure model)
  + LAE + expense + risk load + profit/cost-of-capital → technical premium;
  derive rate-on-line for reinsurance layers.
- Drive `riskScore` and `expectedReturn` from the model, not constants.
- Add rate relativity factors (territory, construction, occupancy, deductible).
- Pricing audit trail: every version logs drivers ("cat load +X due to …").
- Tie capacity to treaty/portfolio state instead of hardcoded per-peril caps.

## 5. Wave 2 (queued — credibility & capital bridge)

- **Compliance & Regulatory Officer:** KYC/accreditation rigor, Reg D / accredited
  investor gating, immutable audit + ledger integrity, legal-doc lifecycle.
- **Capital & Reinsurance Structurer:** treaty/ILS structures, SPV/tranche/token
  mechanics, collateral & attachment/exhaustion accounting.
- **Claims & Parametric Lead:** parametric triggers, loss settlement, investor
  payout waterfall.

## 6. Definition of done for Wave 1

A submission **of any configured risk class** can flow intake → canonical (base +
LOB-extension schema, validated) → appetite (taxonomy + scrub) → risk model (the
strategy selected by that line's config, producing real AAL/loss cost) → pricing
(defensible technical premium) — with **every number traceable to a documented
method**, **no engine branching on a hardcoded line of business**, tests green,
and pipeline replay intact. Proof point: stand up two unlike lines (e.g. a
property-cat risk and a casualty/long-tail risk) through the same pipeline with no
code changes — only configuration. At that point the "agnostic AI underwriting"
story is true, not staged.
