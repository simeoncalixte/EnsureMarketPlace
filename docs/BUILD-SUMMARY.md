# Ensured — Build Summary (Wave 1)

> **Purpose:** one-page reference for everything built in this effort.
> **Period:** 2026-06-07 → 2026-06-08. **Status:** Wave-1 actuarial core complete.
> **Companion docs:** [ROADMAP.md](../ROADMAP.md), [docs/risk-class-registry-design.md](risk-class-registry-design.md), agent defs in `.claude/agents/`.

---

## 1. Strategic direction (aligned with founder)

- **North star:** feature breadth on the **insurer side** (AI underwriting pipeline is the wedge).
- **Compliance:** build it properly (first-class), for institutional credibility.
- **Agents:** insurance **domain experts** who design + implement correct features.
- **Hard architectural constraint:** the platform is **risk-class agnostic** — a line of business is *data* (taxonomy + schema + method config), never hardcoded. Engines interpret config; specialized math (cat/casualty/parametric) is a strategy selected by config, generic default otherwise.

### Standing founder constraints (applied to every slice)
1. **Enhance, never degrade** — additive, backward-compatible; existing build + tests stay green.
2. **Org-editable dynamic schema** — orgs define/edit schema per risk class through data, with versioning.
3. **Extend the current model structure, don't replace** — reuse existing tables/models; prefer JSONB extension over new tables.
4. **No undefended/fabricated numbers** — every loss/price traces to a documented method + cited inputs; honest defer (null + low-confidence) when unmodelable.
5. **Max 2 agents running at once.**

---

## 2. The agent fleet (`.claude/agents/`)

| Agent | Owns |
|---|---|
| `risk-product-architect` | Agnostic spine: registry, base+extension schema, strategy-selection, guardrail vs hardcoded LOB |
| `ingestion-extraction-lead` | Intake pipeline, canonical schema, extraction quality |
| `chief-underwriting-officer` | Appetite, risk selection, taxonomy-aware rules, scrub |
| `risk-modeling-lead` | Loss/exposure modeling registry (cat/casualty/parametric/generic) |
| `chief-actuary` | Pricing, credibility, technical premium, rate-on-line, ILF |

Wave-2 (queued, not built): compliance officer, capital/reinsurance structurer, claims lead.

---

## 3. The starting problem

Audit finding: **strong data plumbing, hollow actuarial core.** Loss/pricing were placeholders — `expectedLoss = premium × 0.36`, `premium = seed × 1.08`, `expectedReturn = '0.1280'` — all in seed services; **no live modeling/pricing compute existed**. Wave 1 filled this.

---

## 4. What was built

### Epic 0 — Risk Class Registry (the agnostic spine)

| Slice | What | Key files |
|---|---|---|
| **1** | Org-editable dynamic schema: immutable, content-hashed `risk_class_schema_versions` (extends `PageTemplate`); submissions **pin** to a version (edits never break in-flight) | migration `…030000-create-risk-class-schema-versions`, `db/models/riskClassSchema.models.ts`, `pipeline/schema/{compile,publish}.ts`, `/marketplace/risk-classes/:lob/schema*` |
| **2** | `risk_class_registry` + **total** `resolveRiskClass` (specificity ladder → generic default) + strategy sockets (`selectModelStrategy`/`selectRatingStrategy`) | migration `…040000-create-risk-class-registry`, `db/models/riskClassRegistry.models.ts`, `pipeline/registry/{types,resolve,strategy,upsert}.ts`, `/…/registry` |
| **3** | Pin submissions on canonicalization + opt-in schema enforcement (best-effort, non-degrading). **Finding:** `CanonicalSubmission` had no writer before — added the first | `pipeline/canonicalize/{deriveLob,pin,service}.ts`, normalization hook |
| **4** | Taxonomy-aware appetite (hierarchy: primary covers subtypes; excluded > allowed) as augmentation over the unchanged free-text matcher | `pipeline/validation/{taxonomyAppetite,taxonomyResolve}.ts`, `appetiteEngine.ts`, `service.ts` |
| **dedup** | `preRating` now consumes the real `validation.appetite.decision` instead of a hardcoded peril list (one appetite source of truth) | `pipeline/preRating/service.ts` |

### Slice 5 — credibility-weighted modeling & pricing

Core idea: **`estimate = Z·experience + (1−Z)·prior`**. `Z` (credibility) rises as loss data accrues; today `Z=0` → cited benchmark, flagged low-confidence. Honest defer when unmodelable. Public data + flywheel now; license a cat vendor later.

| Slice | What | Key files |
|---|---|---|
| **5.0** | Compute spine: `benchmark_priors` table, credibility blend, `RiskComputeService.computeForSubmission` → writes `ModelRun` + new `PricingVersion` + `RiskMetric` with full provenance + `Z`; `POST /underwriting/submissions/:id/compute` | migration `…000000-create-benchmark-priors`, `db/models/benchmarkPrior.models.ts`, `pipeline/benchmarkPriors/{resolve,upsert,seed}.ts`, `pipeline/compute/{credibility,assemble,service}.ts` |
| **5.1** | **Parametric — first genuinely-real line.** Sandboxed payout-formula evaluator (no eval/Function/vm), declared+cited exceedance curve, `EL = Σ marginalProb × payout` | `pipeline/parametric/{formula,definition,strategies}.ts` |
| **5.4** | Wire compute into the live pipeline (`riskCompute` stage + "Pricing" lane) + surface confidence in UI | `pipeline/riskCompute/service.ts`, `board/service.ts`, `routes/{pipelineProcesses,underwritingSubmissions}.ts`; **UI** `EnsuredUI/src/xds/components/ConfidenceBadge.tsx` + `IncomingSubmissionsPage.tsx` |
| **5.3** | Benchmark-coverage machinery: wired idempotent seed, CSV/JSON **importer** (rejects uncited rows), **coverage report**, **casualty ILF** rating (curve in existing `paramsJson`) + cited tranche of ~15 lines | `pipeline/casualty/{ilf,strategies}.ts`, `pipeline/benchmarkPriors/coverage.ts`, `registry/seed.ts`, `db/{import-benchmark-priors,seed-benchmark-priors}.ts`, `/…/benchmark-priors/coverage` |
| **5.2** | **Cat exposure-rating engine.** Declared cited stochastic event set + cited default damage curves (HAZUS/ASCE-style) → seeded **Monte-Carlo EP curve** → AAL, OEP/AEP 100/250/500yr, PML, TVaR; CRESTA point-in-bbox accumulation; populates `var99` (1-in-100 AEP) for modeled cat | `pipeline/catastrophe/{damageCurves,eventLoss,epEngine,accumulation,strategies,service}.ts`, `db/seed-data/catEventSet.ts` |

---

## 5. End-to-end flow (any line, agnostic)

```
intake → OCR/extract → CanonicalSubmission (base + per-LOB extension schema, pinned & validated)
  → taxonomy-aware appetite (org config) → preRating (consumes real appetite)
  → resolveRiskClass → selectModelStrategy:  cat_exposure | parametric_trigger | generic_burning_cost
  → credibility blend (Z·experience + (1−Z)·cited prior)
  → selectRatingStrategy:  casualty_ilf | parametric_premium | generic_loss_ratio
  → ModelRun + PricingVersion (provenance, Z, confidenceLabel, ROL, citation)
  → board GET → UI ConfidenceBadge
```
Every number is provenance- and confidence-tracked; nothing fabricated.

---

## 6. Validation

- **Integration (real Postgres, serial):** 7 suites / **17 tests** green — `riskClassSpine`, `taxonomyAppetite`, `riskComputeSpine`, `parametricCompute`, `riskComputePipeline`, `casualtyIlfCompute`, `catComputeSpine`.
- **Unit (DB-free, Node 24):** spine/compute/parametric/casualty/cat all green (e.g. cat 59, parametric 100, registry 24, schema 16, appetite+validation 167).
- **tsc:** zero errors in any created/modified file (repo has a pre-existing baseline elsewhere).
- Migrations apply cleanly to real Postgres; table structures + indexes + FKs verified via `psql`.

---

## 7. Honest caveats / known state

- **`Z = 0` today.** No internal loss experience is accrued yet, so every number is the cited benchmark/declared input, flagged low-confidence. The blend is built and waiting. **Next unlock = the flywheel:** turn extracted loss runs into queryable experience records so `Z` climbs.
- **Cat & casualty inputs are declared/cited simplifications**, not licensed vendor data (damage curves, event sets, ILF curves). Orgs override; a vendor swaps in later. Labeled as such in provenance.
- **`var99`/tail** only populated for modeled cat; null elsewhere (never fabricated).
- **RiskMetric** rows require a `Deal` (FK) — written when a deal exists; expected loss always lands on `ModelRun`.
- **3 pre-existing `pipelineBoard` `/rerun` test failures** — Fastify "body must be object", unrelated to this work.
- **Several pipeline dirs are untracked working-tree files** (`validation/`, `board/service.ts`, `pipelineProcesses.ts`) — no committed baseline. **Nothing has been committed in this effort.**
- Casualty benchmark priors have `lossRate: null` (loss-per-revenue isn't flat) → need a rate via registry `methodParams`/org config for ILF to scale.

---

## 8. How to run & test (env gotchas)

- **Node 24 required:** shell nvm default may be Node 14 (breaks ts-node/jest/tsc). `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24`.
- **Postgres:** container `ensured-api-postgres` on `127.0.0.1:5432` (`postgres/postgres`). `open -a Docker` then `docker start ensured-api-postgres` if down.
- **Sandbox blocks loopback to 5432** — run DB tests with the sandbox disabled.
- **DB-free jest:** `npx jest <files> --globalSetup=`. **DB-backed:** `--runInBand` (suites share the DB).
- **Migrations:** `npx tsx src/db/run-migrations.ts`. **Seed priors:** `npm run seed:benchmark-priors`. **Import priors:** `npm run import:benchmark-priors -- --file=...`.

---

## 9. Monetization model (discussion summary)

The technical premium is a **pass-through** (risk cost insurer→capital), **not** platform revenue. Ensured earns a thin **fee layer** for making the transaction work:

| # | Revenue line | Pricing model | Side | Timing |
|---|---|---|---|---|
| 1 | SaaS subscription (underwriting brain) | per-seat/org tier | insurers | now (paywall exists) |
| 2 | Usage / metering | per submission / model-run / bind | insurers | now |
| 3 | Marketplace take | bps on premium ceded / capital placed | the match | Wave 2 |
| 4 | Asset-management fees | mgmt fee on AUM + performance/carry | investors | Wave 2 |
| 5 | Secondary-market / trading | per-trade fee / spread | investors | later |
| 6 | Data & analytics | API/subscription | both | later (needs flywheel) |
| 7 | Principal / MGA | ceding + profit commission | — | later (licensed) |

**Near-term defensible revenue = #1/#2** (software valuable even with zero marketplace activity); #3–#5 are the bigger prize but depend on two-sided liquidity + securities/insurance compliance. The pricing engine is the **trust/conversion layer** that makes fees collectible; the data flywheel becomes the moat (#6).

---

## 10. Next steps (recommended order)

1. **Spin the flywheel** — loss-experience accrual → `Z > 0` → proprietary, self-improving pricing (the moat).
2. **Capacity↔appetite dedup** — `capacity/service.ts` still has a hardcoded peril list + caps duplicating the appetite profile.
3. **Benchmark data-curation** — load more cited lines via the importer (data task).
4. **Visual UI pass** — run the app, confirm confidence flags/pricing render for a demo.
5. **License a cat vendor** — swap declared event sets/curves for RMS/Verisk (engine already supports it).
6. **Commit the work** — much of it is uncommitted/untracked working-tree state.
