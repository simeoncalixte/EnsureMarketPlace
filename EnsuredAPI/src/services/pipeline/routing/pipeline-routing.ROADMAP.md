# Submission-type pipeline routing — design & roadmap

## Why this exists

The pipeline used to advance **every** submission down one hard-coded linear
order (the stage registry). Once the `submissionType`
stage tells us *what kind* of submission this is (new business, renewal,
endorsement, claim, cancellation, treaty, facultative, audit, inquiry), most of
the new-business underwriting tail — appetite, schema generation, pricing, bind —
is wrong for the other types. A claim should never be priced; a cancellation
should never get a generated submission form.

Routing makes the path **data** instead of branching code.

## The model: shared prefix → fork → type-specific tail

```
ingestion → ocr → submissionType        ← SHARED_PREFIX: runs before the type is known
                       │  (fork point — submissionType persists submissionTypeCode)
   ┌───────────────────┼───────────────────────┬───────────────┬───────────────┐
new_business /     endorsement /             claim          treaty /        inquiry
quote / renewal /  cancellation                              audit
fac (FULL path)    (trimmed FULL)            (loss-data tail) (terms tail)   (triage only)
```

- **`routes.ts`** is the pure core: `PIPELINE_ROUTES` (code → ordered stage keys),
  plus `routeForType`, `nextStageKeyInRoute`, `prevStageKeyInRoute`,
  `applyEnabledOverride`. No I/O — fully unit-tested in `routes.test.ts`.
- **`resolveRoute.ts`** is the DB bridge: reads `submissionTypeCode` from
  `SubmissionOutput.structuredData`, applies the org's disabled-stage override,
  and is **best-effort** — any failure degrades to the full default route.
- **`commands/service.ts`** `PipelineCommandService.advance` / `.rerun`
  resolve the route and advance *within* it. The resolved `routeKey` is recorded
  on each `IngestionEvent.metadata.route` so runs stay replayable/auditable.

### Invariants (enforced by `routes.test.ts`)

1. Every route is a **subsequence** of `CANONICAL_STAGE_ORDER` — routes only omit
   stages, never reorder them, so the board lanes stay coherent left-to-right.
2. Every route begins with `SHARED_PREFIX`. Until `submissionType` runs, the
   resolver uses the default route; because every route shares this prefix, the
   early advances are identical regardless of the eventual type.
3. Routes reference only stage keys that have an executor in the stage composition root.
4. `CANONICAL_STAGE_ORDER` mirrors the stage registry `PIPELINE_STAGE_CATALOG` (drift guard).

## Current status of each route

| Type | Today's route | Status |
|------|---------------|--------|
| `new_business` | full canonical path | ✅ complete |
| `quote_request` | full canonical path | ✅ complete |
| `renewal` | full canonical path | ⚠️ interim — needs renewal tail |
| `facultative_reinsurance` | full canonical path | ⚠️ interim — needs reinsurance pricing |
| `endorsement` | full minus `schemaGeneration` | ⚠️ interim — needs delta/re-rate |
| `cancellation` | ingest→ocr→type→extraction→normalization→compliance | ⚠️ interim — needs refund calc |
| `claim` | ingest→ocr→type→extraction→location→normalization | 🔲 loss-data only — needs claims tail |
| `treaty_reinsurance` | ingest→ocr→type→extraction→normalization | 🔲 terms-only — needs treaty analysis |
| `audit` | ingest→ocr→type→extraction→normalization | 🔲 terms-only — needs audit reconciliation |
| `inquiry` | shared prefix only | ✅ triage-only by design |

Interim routes deliberately **stop at the last existing stage that is honest for
the type** rather than fabricating an underwriting result. They are correct, just
incomplete.

## Target tails (net-new stages to build)

These stages do not exist yet. Each is a normal pipeline stage (a `service.ts`
implementing the `{ ok }` contract, a registry definition, an executor entry, and an
`operations/catalog.ts` row) added **after** the shared/structuring stages and
appended to the relevant route.

### Endorsement
`policyLocate → changeExtract → endorsementRate → preBindCompliance`
- **policyLocate** — match the submission to the in-force `Policy`/`PolicyVersion`
  it amends (see `underwriting/` quote/policy lifecycle).
- **changeExtract** — isolate the *delta* (added/removed location, limit change,
  named-insured change) rather than re-reading the whole risk.
- **endorsementRate** — re-rate only the delta against the bound policy; reuses
  the `riskCompute` engine with the change as input, writes a new `PricingVersion`.

### Renewal
`policyLocate → priorTermDiff → (classification…riskCompute) → preBindCompliance`
- **priorTermDiff** — pull the expiring term, diff exposures/loss experience,
  flag what changed; feeds appetite + pricing as a renewal (not a cold quote).

### Claim / loss notice
`claimIntake → coverageVerify → reserveEstimate → adjusterAssign`
- **claimIntake** — open a `Claim` record, capture FNOL fields, claimant, date of
  loss. (New `Claim`/`ClaimEvent` models — none exist yet.)
- **coverageVerify** — confirm an in-force policy covers the loss date/peril.
- **reserveEstimate** — set an initial reserve (triage severity).
- **adjusterAssign** — route to a human adjuster by line/severity/territory.

### Cancellation
`policyLocate → cancellationCalc → preBindCompliance`
- **cancellationCalc** — compute effective date + pro-rata/short-rate return
  premium, post the policy transition.

### Treaty reinsurance
`treatyTermsExtract → portfolioAnalysis → treatyPricing`
- **portfolioAnalysis** — aggregate the *ceded book* (not a single risk); EP/PML
  at portfolio level via `risk-modeling-lead` strategies.
- **treatyPricing** — quota-share / surplus / XoL / stop-loss structures.

### Premium audit
`auditIntake → exposureReconcile → premiumAdjust`
- reconcile audited vs. estimated exposures, post the additional/return premium.

## Per-org overrides

`resolveRoute.ts` already reads the org's **default** `OrganizationPipelineConfig`
and drops any operations it has marked `enabled: false` (shared-prefix stages are
protected and never dropped). Two extensions are intentionally deferred:

1. **Type-scoped org configs.** Add a nullable `submissionTypeCode` column to
   `organizationPipelineConfigs` so an org can define, e.g., its own *claim*
   pipeline distinct from its *new business* one. The resolver would prefer a
   type-scoped config over the default. (Requires a migration —
   see `migration-describeTable-deadlock` note before writing one.)
2. **Reordering / insertion.** Today the override only enables/disables. Honoring
   `stageOrder` to reorder, or letting an org insert a custom stage, is a larger
   change and should keep invariant #1 (no backwards moves on the board).

## How to add a stage to a route

1. Build the stage (`src/pipeline/<stage>/service.ts`, `{ ok }` contract).
2. Register it in the stage registry, operations catalog, and executor composition
   root; application startup synchronizes the operation catalog.
3. Add its key to `CANONICAL_STAGE_ORDER` (in board order) and to each route in
   `PIPELINE_ROUTES` that should run it.
4. `routes.test.ts` will fail if the new key breaks the subsequence/drift
   invariants — that's the guard working.
