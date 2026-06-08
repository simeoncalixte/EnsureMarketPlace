# Risk Class Registry & Org-Editable Dynamic Schema — Design

> **Author:** Risk Product Architect
> **Status:** DESIGN-ONLY — for founder review. No source, models, or migrations
> changed by this document.
> **Date:** 2026-06-07
> **Epic:** 0 (the agnostic spine — lands before every other Wave 1 epic)

This document specifies the **risk-class-agnostic spine** for Ensured: how an
organization defines and **edits its own schema per risk class through data**, how
each taxonomy entry binds to a declaration of modeling/rating/appetite methods, and
how the modeling/pricing/appetite engines select a strategy by config instead of
branching on a hardcoded line of business.

It is governed by two non-negotiable founder constraints:

1. **Enhance, never degrade.** Everything is additive and backward-compatible.
   Migrations add only new tables or new nullable/defaulted columns. The working
   build — multi-channel ingestion, OCR, Gemini extraction + regex fallback, the
   appetite engine, the append-only pipeline with replay, the green Jest suite —
   keeps working unchanged.
2. **Org-editable dynamic schema is the centerpiece.** Every organization defines
   and edits its own schema, per risk class / line of business, through data — not
   a deploy — with versioning that never silently breaks an in-flight submission.

---

## Part 1 — Ground truth: what already exists

All file paths are relative to `EnsuredAPI/`.

### 1.1 `PageTemplate` — the bones of dynamic schema (already org-scoped, versioned, LOB-keyed)

`src/db/models/pageTemplates.models.ts`. This model is **already 80% of the
org-editable schema system.** Its columns:

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `organizationId` | int, **nullable** | null ⇒ global/shared template |
| `scopeKey` | string, default `'global'` | org templates use `organization:<id>` (see schemaGeneration) |
| `pageKey` | string | e.g. the create-coverage page key (`PAGE_KEY`), `insured-subjects` |
| `version` | int, default 1 | **monotonic version per (scope,page,LOB,subtype)** |
| `status` | enum `draft\|published\|archived` | |
| `schemaVersion` | int, default 1 | structural schema version of `definitionJson` |
| `isDefault` | bool | |
| `source` | enum `human\|ai` | provenance — human builder vs LLM schemaGeneration |
| `lineOfBusinessCode` | string, default `''` | **LOB binding** |
| `lineOfBusinessSubTypeCode` | string, default `''` | sub-type binding |
| `parentTemplateId` | int, nullable, FK self | **parent/child layouts** |
| `createdByUserId` | int, nullable | |
| `publishedAt` | date, nullable | |
| `definitionJson` | JSONB | the actual field/section schema |

Unique index: `(scopeKey, pageKey, version, lineOfBusinessCode, lineOfBusinessSubTypeCode)`.

The `definitionJson` shape (`PageTemplateDefinition`) is rich and already typed:
- `schemaVersion`, `pageKey`, `title`, `description`
- `sections[]` → `{ key, label, order, description?, fields[], layout? }`
- `fields[]` → `PageTemplateFieldDefinition`:
  `{ key, label, type, order, required?, defaultValue?, options?, canonicalKey?, placeholder?, helperText?, dataSource?, dependsOn?, visibleWhen?, layout? }`
- `type` (`PageTemplateFieldType`) ∈ `text | textarea | number | integer | select | boolean | radio | date`
- `visibleWhen` already supports `{ lineOfBusinessCodes?, lineOfBusinessSubTypeCodes? }`
- **`canonicalKey`** already exists on each field — the hook that maps a form
  field to a canonical-schema path. This is the seam for base+extension mapping.

**Current usage of `PageTemplate`:**
- `src/pipeline/schemaGeneration/service.ts` — the `schemaGeneration` pipeline
  stage (runs after validation). It loads the org's published template for the
  LOB as a base (`loadOrgTemplate`), asks Gemini to tailor a form, prefills it
  from extracted data, and **promotes genuine LLM output back into the template
  library append-only** (`persistTemplateSafely` → `mergeTemplateDefinitions`,
  union of sections/fields, never overwrite). AI templates are written with
  `scopeKey = organization:<tenantId>`, `source = 'ai'`, `status = 'published'`.
- `src/routes/marketplace.ts` — CRUD-ish endpoints for the **insured-subjects**
  page template only:
  - `GET  /marketplace/insured-subjects/page-template`
  - `POST /marketplace/insured-subjects/page-template`
  - `POST /marketplace/insured-subjects/page-template/fields`
  - `DELETE /marketplace/insured-subjects/page-template/fields`
  These already validate a full `pageTemplateSchema` (Fastify JSON Schema) and
  upsert published templates per org. **The editing API surface for one page
  already exists; the gap is generalizing it to any risk class and adding
  versioning.**
- `src/db/seed-data/pageTemplates.ts`, `src/db/pageTemplateDefaults.ts` — default
  definitions.

**Takeaway:** `PageTemplate` is already org-scoped, LOB-keyed, versioned-by-number,
status-tracked, provenance-tracked, and parent/child-capable, with a `canonicalKey`
per field and an LLM that already edits it through data. We **extend** it; we do
not replace it.

### 1.2 Taxonomy — `LineOfBusinessPrimaryType` / `LineOfBusinessSubType`

`src/db/models/lineOfBusiness.models.ts`, seeded from
`src/db/seed-data/lineOfBusinessTaxonomy.ts` (60+ primaries, each with 4 sub-types
— property, catastrophe_property, parametric_weather, general_liability,
workers_compensation, reinsurance_treaty, life, etc.).

- `LineOfBusinessPrimaryType`: PK `code` (e.g. `property`), `label`, `sortOrder`,
  `isActive`.
- `LineOfBusinessSubType`: PK `code` (e.g. `property_catastrophe`), FK
  `primaryCode`, `label`, `sortOrder`, `isActive`.

The taxonomy is **global** (not per-org) and carries no behavior — it's a code
list. There is **no table today binding a method/schema/dimension declaration to a
taxonomy code.** That gap is exactly the Risk Class Registry (Part 3B).

### 1.3 `CanonicalSubmission` and the ingestion models

`src/db/models/ingestion.models.ts`:

- `CanonicalSubmission`: `id`, `submissionId` (unique, FK), `tenantId`,
  **`data: JSONB` (freeform, default `{}`)**, **`version: int` (default 1)**,
  timestamps. The `version` column **already exists** — it is the natural pin for
  schema versioning (Part 2.3). `data` is the freeform canonical container with
  no governance today.
- Supporting models: `SubmissionDocument` (`structuredData` JSONB — where
  schemaGeneration persists the suggested form), `ExtractedField`
  (`fieldName/fieldValue/confidence/sourceLocation`), `EnrichmentData`,
  `IngestionEvent` (append-only event log), `TriageResult`, `WorkflowState`,
  `IngestionChannel`.
- `Submission` (`src/db/models/underwriting.models.ts`) has **no LOB column** —
  `insurerProfileId`, `portfolioId`, `status`, `tenantId`, `source`, `transport`,
  `receivedAt`, `ingestionChannelId`. **LOB is not first-class on the submission
  today; it lives as free text inside `CanonicalSubmission.data` / extracted
  fields.** This is the root cause of the appetite free-text matching.

### 1.4 `OrganizationPipelineConfig` / `OrganizationPipelineConfigOperation`

`src/db/models/pipelineConfig.models.ts`:

- `PipelineOperationCatalog`: catalog of pipeline operations
  (`operationKey`, `stageName`, `category`, `defaultOrder`, `defaultEnabled`,
  `canDisable`, `configSchemaJson`).
- `OrganizationPipelineConfig`: per-org named pipeline config
  (`organizationId`, `name`, `status`, `isDefault`).
- `OrganizationPipelineConfigOperation`: per-op overrides within a config
  (`enabled`, `stageOrder`, `required`, `failBehavior`, **`configJson` JSONB**).
- `PipelineLifecycleSubscription`: per-org event subscriptions.

**This is the precedent the registry follows:** a per-org config table whose
behavior is data (`configJson`) interpreted by stage code, never branched on.
The Risk Class Registry is the same pattern, keyed by taxonomy code instead of
operation key.

### 1.5 The appetite engine and its FREE-TEXT LOB matching (must not break)

`src/pipeline/validation/appetiteEngine.ts` + `logic.ts` + `service.ts`:

- `evaluateAppetite(fields, profile, rules)` is a **pure function**, no I/O. It
  runs peril / LOB / capacity / return / geographic / data-quality / custom-rule
  checks and returns a decision (`IN_APPETITE | FLAGGED | OUT_OF_APPETITE`).
- **The LOB check is free-text, lowercased, exact-membership:**
  `evaluateLineOfBusinessAppetite` lowercases `fields.lineOfBusiness` and tests
  `allowedLinesOfBusiness.includes(lineOfBusiness)` — a flat string-set match with
  no taxonomy awareness and no hierarchy (`logic.ts:147-162`).
- `fields.lineOfBusiness` is pulled in `extractValidationFields`
  (`logic.ts:34`) from `normalized.lineOfBusiness` / `extracted.lineOfBusiness` —
  **free text from extraction.**
- The profile (`OrganizationAppetiteProfile`,
  `src/db/models/appetite.models.ts`) stores `allowedLinesOfBusiness: string[]`
  (JSONB), `preferredPerils`, `excludedPerils`, `capacityByPeril`,
  `requiredFields`, etc. One active default profile per org
  (`loadAppetiteForTenant`).
- `ValidationService.process` reads from the pipeline payload's
  `normalization`/`extraction` records — **not** from `CanonicalSubmission`.

**The transition rule:** the canonical free-text `lineOfBusiness` field and the
flat `allowedLinesOfBusiness` matching **must keep working byte-for-byte**. The
registry adds a *taxonomy-aware* path **alongside** it; the free-text path remains
the fallback. (The taxonomy-aware appetite work itself is Epic B / Chief
Underwriting Officer — Epic 0 only supplies the resolved taxonomy code and the
appetite-dimension declaration so B can be config-driven.)

### 1.6 How extraction/validation read `CanonicalSubmission.data` today

- `CanonicalSubmission.data` is written during normalization/canonicalization and
  read for display (`src/routes/underwritingSubmissions.ts:213` →
  `canonicalSummary: data ? 'Available' : null`) and purge
  (`src/services/SubmissionPurgeService.ts`).
- Validation does **not** read `CanonicalSubmission`; it reads the in-flight
  pipeline payload (`extractValidationFields`). So adding governance to
  `CanonicalSubmission.data` does not perturb the validation stage.
- There is **no JSON-Schema validation** of `data` today — it is freeform JSONB.
  This is the governance gap the base+extension contract fills (enforced by the
  Ingestion Lead, Epic A; the *contract* is defined here).

---

## Part 2 — The org-editable dynamic schema system (the centerpiece)

### 2.0 Decision summary (storage)

> **Decision: EXTEND `PageTemplate` as the org-editable schema authoring surface;
> add ONE new table, `risk_class_schema_versions`, as the immutable, validatable
> *compiled* schema artifact that submissions pin to. Do NOT introduce a parallel
> schema-definition model.**

Rationale below (2.1).

### 2.1 Why extend `PageTemplate` rather than build new schema tables

`PageTemplate` already provides, as data:

- Per-org scoping (`organizationId`, `scopeKey = organization:<id>`).
- Per-LOB + per-subtype binding (`lineOfBusinessCode`, `lineOfBusinessSubTypeCode`).
- Versioning by integer (`version`) with a unique index across
  `(scope, page, version, LOB, subtype)`.
- Lifecycle (`draft → published → archived`).
- Provenance (`source: human | ai`) — humans edit in the builder UI; the LLM
  edits via `schemaGeneration`. **Both already write the same model.**
- Field types, constraints (`required`, `options`), conditional visibility
  (`visibleWhen` by LOB), and a `canonicalKey` per field — the base/extension map.
- An append-only merge utility (`mergeTemplateDefinitions`) and live CRUD
  endpoints for one page.

Replacing this with a new schema model would (a) duplicate all of the above,
(b) orphan the working `schemaGeneration` stage and the insured-subjects editor,
and (c) violate "enhance, never degrade." So `PageTemplate` is **the authoring
and editing model.**

**What `PageTemplate` lacks** for a governance-grade schema, and that we add:

1. A way to declare, per field, the **canonical typing/constraints** beyond UI
   type (e.g. min/max, regex, units, enum source, whether it feeds modeling).
2. An **immutable, content-addressed snapshot** a submission can pin to so an
   edit never mutates the schema an in-flight submission was created under.
   `PageTemplate.version` increments, but published templates are edited in place
   today (`schemaGeneration` mutates `existing.definitionJson`), so the row is not
   safe to treat as immutable.
3. A **compiled JSON Schema** for validating `CanonicalSubmission.data`.

We solve 1 by **enriching `definitionJson` fields** (additive, optional keys — old
templates still parse). We solve 2 and 3 with one small new table.

### 2.2 New table: `risk_class_schema_versions` (the immutable compiled artifact)

Authoring stays in `PageTemplate`. **Publishing** a template version *compiles* it
into an immutable row here. Submissions pin to a row in this table, never to a
mutable `PageTemplate`.

```
risk_class_schema_versions
  id                     int PK
  organization_id        int  nullable   FK organizations  (null ⇒ platform base)
  line_of_business_code  string  default ''   FK lineOfBusinessPrimaryTypes.code (soft)
  line_of_business_sub_type_code string default ''  (soft FK)
  page_key               string             matches PageTemplate.pageKey
  source_template_id     int  nullable   FK pageTemplates.id (provenance, SET NULL)
  schema_version         int  not null   monotonic per (org, lob, subtype, page)
  status                 string default 'published'   published | archived
  base_schema_version_id int  nullable   FK self → the base this extends
  definition_json        JSONB not null   frozen copy of PageTemplateDefinition
  compiled_json_schema   JSONB not null   JSON Schema draft-07 for data validation
  content_hash           string not null  sha256 of definition_json (idempotent publish)
  published_by_user_id   int  nullable
  published_at           date  not null
  created_at, updated_at
  UNIQUE (organization_id, line_of_business_code, line_of_business_sub_type_code, page_key, schema_version)
  UNIQUE (organization_id, content_hash)   -- republishing identical content is a no-op
```

Properties:
- **Immutable by contract.** Rows are insert-only for `definition_json` /
  `compiled_json_schema`; an edit produces a **new** `schema_version`, never an
  in-place mutation. (Old `PageTemplate` in-place editing continues to work for
  authoring; only the *published snapshot* is frozen.)
- **`base_schema_version_id`** captures base→extension lineage (2.5).
- **`content_hash`** makes publish idempotent and gives a stable identity to pin to.
- Org-null rows are the **platform base schema** (the universal fields, 2.5).

### 2.3 Versioning & pinning (edits are auditable; in-flight submissions never break)

`CanonicalSubmission` **already has `version: int`.** We reinterpret/extend it to a
true pin with one additive nullable FK column:

```
ALTER canonical_submissions ADD COLUMN schema_version_id int NULL
    FK risk_class_schema_versions(id)
ALTER canonical_submissions ADD COLUMN line_of_business_code            string NULL
ALTER canonical_submissions ADD COLUMN line_of_business_sub_type_code   string NULL
```

Lifecycle:
1. When a submission is canonicalized, the pipeline resolves the active **published**
   `risk_class_schema_versions` row for `(org, LOB, subtype, page)` and stamps its
   `id` into `canonical_submissions.schema_version_id`. The submission is now
   **pinned**.
2. An org editing its schema publishes a **new** `schema_version` row. Existing
   submissions keep pointing at their old row → their data still validates against
   the exact schema they were created under. **An edit can never retroactively
   invalidate an in-flight submission.**
3. Re-validation/replay of an old submission uses its pinned `schema_version_id`,
   preserving append-only replay semantics.
4. `schema_version_id` is **nullable**: every existing `CanonicalSubmission` (null)
   keeps behaving exactly as today — unpinned ⇒ no schema enforcement, identical
   to current freeform behavior.

**Audit trail:** every published version is a row with `published_by_user_id`,
`published_at`, `source_template_id`, and `content_hash`. The full edit history of
an org's schema for a risk class is `SELECT … ORDER BY schema_version`. No data is
ever overwritten.

### 2.4 Field types, constraints, and validation of submission data

Authoring keeps the existing `PageTemplateFieldType`
(`text | textarea | number | integer | select | boolean | radio | date`). We add
**optional** constraint metadata to `PageTemplateFieldDefinition` (purely additive
keys in `definitionJson` — old templates omit them and behave unchanged):

```ts
// additive optional fields on PageTemplateFieldDefinition.definitionJson
constraints?: {
  min?: number; max?: number;          // number/integer
  minLength?: number; maxLength?: number;
  pattern?: string;                    // regex
  enumValues?: string[];               // for select/radio beyond options
  unit?: string;                       // 'USD' | 'sq_ft' | 'percent' | …
  nullable?: boolean;
};
canonicalKey?: string;                 // ALREADY EXISTS — maps to canonical path
feedsModeling?: boolean;               // declares the field as a modeling input
requiredForMethods?: string[];         // e.g. ['cat_exposure'] — links to registry required data fields
```

**Compilation:** on publish, a pure `compileToJsonSchema(definitionJson)` function
walks sections/fields and emits a JSON Schema draft-07 object keyed by each field's
`canonicalKey` (falling back to `key`). UI `type` + `constraints` map to JSON
Schema (`type`, `minimum`, `pattern`, `enum`, `required[]`). This compiled schema
is stored in `risk_class_schema_versions.compiled_json_schema`.

**Validation of `CanonicalSubmission.data`** (enforced by Ingestion Lead, Epic A;
contract defined here): a pure
`validateCanonicalData(data, schemaVersion): { ok: true } | { ok: false; errors[] }`
runs the compiled schema with an existing JSON-Schema validator (Ajv is already in
the Fastify stack). It returns the `{ok:false}` stage contract on failure. **It is
opt-in:** if `schema_version_id` is null (legacy submissions, or orgs that have not
published a schema), validation is skipped → no degradation.

### 2.5 Base canonical schema + per-LOB, per-ORG extension

- **BASE (platform, `organization_id = null`, `line_of_business_code = ''`).** A
  small, truly universal schema — the only fields common to *all* insurance:
  - `insured.name`, `insured.domain?`
  - `lineOfBusiness.primaryCode`, `lineOfBusiness.subTypeCode` (**taxonomy codes**)
  - `coverage.effectiveDate`, `coverage.expiryDate`, `coverage.currency`
  - `financials.limit?`, `financials.premium?`, `financials.deductible?`
  - `location.jurisdiction?`
  - `dataQuality.score?`
  This is deliberately tiny. **No peril, TIV, COPE, loss triangle, or trigger lives
  in the base** — those are extensions. (Guardrail: any PR that adds a
  vertical-specific field to the base is rejected.)
- **EXTENSION (per-org, per-LOB/subtype).** A `risk_class_schema_versions` row with
  `base_schema_version_id` pointing at the base. Its `definition_json` adds the
  line-specific sections/fields the org wants (a cat org adds TIV/COPE/CRESTA; a
  casualty org adds loss-run history/ILF inputs; a parametric org adds
  trigger/index fields).
- **Merge semantics for `compiled_json_schema`:** base properties ∪ extension
  properties; extension may tighten (add constraints) but **not remove** base
  fields. `validateCanonicalData` validates against the merged schema of the pinned
  version. This is the same append-only union spirit as
  `mergeTemplateDefinitions`.

This makes the existing `canonicalKey` the **single mapping** from an org's
form field → a canonical path in `CanonicalSubmission.data`, and the same path is
what modeling/pricing read. Data-source→canonical mapping (Epic 0 deliverable #4)
is the same mechanism: a connector's field maps to a `canonicalKey`.

### 2.6 API surface (org creates / edits / versions schemas)

Generalize the existing insured-subjects endpoints (which already exist and prove
the pattern) to **any page/risk class**, and add explicit publish/version routes.
All new routes; the three insured-subjects routes stay as thin aliases (no removed
endpoints).

```
# Authoring (mutable drafts on PageTemplate)
GET    /marketplace/risk-classes                         list taxonomy + per-org registry status
GET    /marketplace/risk-classes/:lob/schema             active draft+published template for org+LOB
POST   /marketplace/risk-classes/:lob/schema             create/replace draft template (definitionJson)
POST   /marketplace/risk-classes/:lob/schema/fields      add a field (reuses addTemplateField)
DELETE /marketplace/risk-classes/:lob/schema/fields      remove a field (reuses removeTemplateField)

# Versioning / publish (immutable risk_class_schema_versions)
POST   /marketplace/risk-classes/:lob/schema/publish     compile current draft → new schema_version row
GET    /marketplace/risk-classes/:lob/schema/versions    list published versions (audit history)
GET    /marketplace/risk-classes/:lob/schema/versions/:v fetch a frozen version + compiled JSON Schema

# Registry (Part 3B) — declaration bound to the risk class
GET    /marketplace/risk-classes/:lob/registry           get { schema, modeling, rating, appetite, requiredFields }
PUT    /marketplace/risk-classes/:lob/registry           upsert the declaration (data, not code)
```

`:lob` accepts `primaryCode` or `primaryCode/subTypeCode`. Auth/tenant resolution
reuses the existing marketplace route middleware. Publishing is idempotent via
`content_hash`.

---

## Part 3 — Risk Class Registry & Strategy Selection

### 3.1 (Part B) New table: `risk_class_registry`

Binds a behavior declaration to a taxonomy code, **per org**, additively. This is
the table that does not exist today.

```
risk_class_registry
  id                       int PK
  organization_id          int nullable  FK organizations (null ⇒ platform default row)
  line_of_business_code    string not null  (soft FK lineOfBusinessPrimaryTypes.code)
  line_of_business_sub_type_code string default ''  (soft FK)
  active_schema_version_id int nullable  FK risk_class_schema_versions(id)
  risk_modeling_method     string nullable   e.g. 'cat_exposure' | 'loss_triangle' | 'parametric_trigger' | 'generic_burning_cost'
  rating_method            string nullable   e.g. 'technical_premium' | 'rate_on_line' | 'generic_loss_ratio'
  appetite_dimensions_json JSONB default '{}' declared dimensions: perils, geo basis, capacity keys, required fields
  required_data_fields_json JSONB default '[]' canonicalKeys required for this risk class
  method_params_json       JSONB default '{}' default parameters for the selected methods
  status                   string default 'active'   active | inactive
  created_by_user_id       int nullable
  created_at, updated_at
  UNIQUE (organization_id, line_of_business_code, line_of_business_sub_type_code)
```

- **Resolution order:** org+subtype → org+primary → platform-default+subtype →
  platform-default+primary → **generic default** (3.3). First hit wins.
- Method fields are **strings naming a strategy**, never code. Engines look the
  string up in a strategy registry. Unknown/empty ⇒ generic default.
- `appetite_dimensions_json` / `required_data_fields_json` are what Epic B (CUO)
  and Epic A (Ingestion) consume — declaratively, not by branching.

### 3.2 (Part C) Strategy-selection interface

A single pure resolver the modeling, pricing, and appetite engines call. Lives in
new module `src/pipeline/registry/` (no engine imports it yet — it ships with a
generic default and is adopted slice-by-slice).

```ts
// src/pipeline/registry/types.ts
export type RiskClassResolution = {
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  schemaVersionId: number | null;
  riskModelingMethod: string;      // resolved, never empty (generic default if unset)
  ratingMethod: string;            // resolved, never empty
  appetiteDimensions: Record<string, unknown>;
  requiredDataFields: string[];
  methodParams: Record<string, unknown>;
  resolvedFrom: 'org_subtype' | 'org_primary' | 'platform_subtype' | 'platform_primary' | 'generic_default';
};

// src/pipeline/registry/resolve.ts
export async function resolveRiskClass(
  tenantId: number | null,
  lineOfBusinessCode: string | null,
  lineOfBusinessSubTypeCode?: string | null,
): Promise<RiskClassResolution>;   // ALWAYS returns a resolution (generic default fallback)

// Strategy registries: name → implementation. Each engine owns its registry.
export interface RiskModelStrategy { method: string; run(input, params): ModelOutput; }
export interface RatingStrategy    { method: string; price(input, params): PricingOutput; }

export function selectModelStrategy(method: string): RiskModelStrategy;  // → generic if unknown
export function selectRatingStrategy(method: string): RatingStrategy;    // → generic if unknown
```

**Contract the fleet builds against:**
- **Risk Modeling Lead (Epic C):** calls `resolveRiskClass(...)` then
  `selectModelStrategy(resolution.riskModelingMethod)`. Replaces the 36% flat-loss
  multiplier with strategy output. Never writes `if (lob === 'property')`.
- **Chief Actuary (Epic D):** calls `selectRatingStrategy(resolution.ratingMethod)`.
- **Chief Underwriting Officer (Epic B):** reads `resolution.appetiteDimensions` +
  taxonomy code to drive taxonomy-aware appetite, **alongside** the existing
  free-text path.
- **Ingestion & Extraction Lead (Epic A):** reads `resolution.schemaVersionId` +
  `resolution.requiredDataFields` to enforce base+extension on
  `CanonicalSubmission.data`.

### 3.3 The generic default (no engine branches on a known line)

`resolveRiskClass` **always** returns a usable resolution. When no registry row
matches, it returns:
- `riskModelingMethod: 'generic_burning_cost'` (loss-cost / loss-ratio from
  experience — the roadmap's stated generic default),
- `ratingMethod: 'generic_loss_ratio'`,
- `appetiteDimensions: {}`, `requiredDataFields: []`,
- `resolvedFrom: 'generic_default'`.

The strategy registries (`selectModelStrategy` / `selectRatingStrategy`) likewise
fall back to a generic strategy for any unknown method string. **Result: a brand-new
risk class flows end-to-end on day one with zero code changes — exactly the
two-unlike-lines proof.**

---

## Part 4 — Backward-compatibility plan

### 4.1 Exact additive migration list (all nullable or defaulted; no breaking change)

1. **NEW TABLE** `risk_class_schema_versions` (Part 2.2). New table ⇒ no impact on
   existing rows/queries.
2. **NEW TABLE** `risk_class_registry` (Part 3.1). New table.
3. **ALTER `canonical_submissions`** — add nullable columns (Part 2.3):
   - `schema_version_id int NULL` FK `risk_class_schema_versions(id)`
   - `line_of_business_code string NULL`
   - `line_of_business_sub_type_code string NULL`
   All NULL on every existing row ⇒ identical legacy behavior.
4. **No `PageTemplate` migration required.** The new constraint metadata
   (`constraints`, `feedsModeling`, `requiredForMethods`) lives **inside** the
   existing `definitionJson` JSONB as optional keys — no column change. (Optionally,
   a future slice may add a `compiledSchemaVersionId` convenience column to
   `pageTemplates`, also nullable — not required for v1.)
5. **No taxonomy migration.** `risk_class_registry` references taxonomy codes by
   soft FK; the taxonomy tables are untouched.

No column is dropped, renamed, or made non-nullable. No endpoint is removed. No
existing migration is edited.

### 4.2 How existing submissions keep working

- Legacy `CanonicalSubmission` rows have `schema_version_id = NULL` ⇒
  `validateCanonicalData` is skipped ⇒ `data` stays freeform exactly as today.
- The display/purge readers of `CanonicalSubmission.data` are unaffected (new
  columns are additive).

### 4.3 How the current appetite free-text matching keeps working (compatibility shim)

- `evaluateAppetite` and `evaluateLineOfBusinessAppetite` are **not modified by
  Epic 0.** The free-text `fields.lineOfBusiness` path and flat
  `allowedLinesOfBusiness` membership remain the active behavior.
- Epic 0 only **adds** a resolver (`resolveRiskClass`) and a registry table. The
  *taxonomy-aware* appetite that consumes them is Epic B, and even there the
  contract is **augment, don't replace**: the engine tries the resolved taxonomy
  code first and **falls back to the existing free-text match** when no registry
  row / no code is present. A submission with only a free-text LOB string behaves
  identically before and after.
- `OrganizationAppetiteProfile.allowedLinesOfBusiness` is untouched; it continues
  to be honored.

### 4.4 How the existing Jest suite stays green

- New tables/columns are additive; model `init` calls for existing models are
  unchanged, so all existing model tests pass.
- `resolveRiskClass` is a **new** pure-ish function with its own unit tests
  (resolution order + generic default with known-answer fixtures). It is not yet
  wired into validation/modeling/pricing, so those suites don't move.
- `validateCanonicalData` is opt-in (null pin ⇒ skip), so the ingestion/validation
  suites are unaffected until Epic A explicitly turns it on with new tests.
- The `schemaGeneration` stage keeps using `PageTemplate` exactly as today;
  publishing-to-`risk_class_schema_versions` is an additive step invoked by the new
  publish endpoint, not by the existing stage. (A later slice can have
  `schemaGeneration` also emit a published version; that slice ships with its own
  tests.)
- Follows LLM-primary/heuristic-fallback and `{ok:false}` contracts: compilation
  and validation are deterministic; any schema-resolution failure degrades to the
  generic default rather than throwing.

### 4.5 Degradation risks and mitigations

| Risk | Mitigation |
|---|---|
| Pinning to a mutable template could let an edit retroactively break a submission | Submissions pin to the **immutable** `risk_class_schema_versions` row, never to `PageTemplate`. Edits create new versions. |
| Compiled schema rejects data that the old freeform path accepted | Validation is **opt-in** (null pin ⇒ skip) and base fields are never removed, only optionally tightened; orgs must publish a schema to enable enforcement. |
| Resolver throws and breaks the pipeline | `resolveRiskClass` is total — always returns the generic default; DB errors fall back like `loadAppetiteForTenant` does today. |
| Taxonomy-aware appetite silently changes a decision | Epic B keeps the free-text path as fallback; taxonomy match only **adds** precision when a registry row exists. |
| New nullable columns confuse purge/display | Display reads are additive-safe; purge already deletes the row wholesale. |

---

## Part 5 — Sequenced implementation slices

Each slice is independently shippable and non-degrading. **Slice 1 is the
org-editable dynamic schema — the centerpiece — and lands first.**

**Slice 1 — Org-editable dynamic schema (authoring + publish + versioning).**
*Consumed by: Ingestion & Extraction Lead (Epic A).*
- Migration: `risk_class_schema_versions` table; nullable
  `canonical_submissions.schema_version_id / line_of_business_code /
  line_of_business_sub_type_code`.
- Additive optional `constraints` / `feedsModeling` / `requiredForMethods` keys in
  `PageTemplateFieldDefinition` (type only; no migration).
- Pure functions: `compileToJsonSchema(definitionJson)`,
  `validateCanonicalData(data, version)` (opt-in), `computeContentHash`.
- API: generalized `/marketplace/risk-classes/:lob/schema*` authoring routes +
  `…/publish`, `…/versions`, `…/versions/:v`; keep insured-subjects routes as
  aliases.
- Tests: compile known-answer fixtures; publish idempotency via `content_hash`;
  pin/immutability (editing draft never changes a published version); validation
  skipped when pin is null.

**Slice 2 — Risk Class Registry table + strategy-selection resolver.**
*Consumed by: Risk Modeling Lead (C), Chief Actuary (D), CUO (B), Ingestion (A).*
- Migration: `risk_class_registry` table.
- `src/pipeline/registry/`: `resolveRiskClass`, `selectModelStrategy`,
  `selectRatingStrategy`, generic default strategy.
- Registry API: `GET/PUT /marketplace/risk-classes/:lob/registry`.
- Tests: resolution order, generic-default fallback, unknown-method fallback.

**Slice 3 — Pin submissions on canonicalization + opt-in enforcement.**
*Consumed by: Ingestion & Extraction Lead (A).*
- On canonicalization, resolve `(org, LOB, subtype)` → stamp `schema_version_id`
  and the taxonomy codes onto `CanonicalSubmission`. Run `validateCanonicalData`
  when a pin exists; surface errors via `{ok:false}`. Legacy/unpinned unchanged.
- Tests: pinned submission validates; unpinned skips; replay uses the pinned
  version.

**Slice 4 — Taxonomy-aware appetite (augmentation only).**
*Consumed by / owned with: Chief Underwriting Officer (B).*
- Appetite reads `resolution.appetiteDimensions` + taxonomy code with hierarchy
  support; **falls back to existing free-text match** when absent. No change to the
  free-text default behavior.

**Slice 5 — Modeling & rating strategy adoption.**
*Consumed by: Risk Modeling Lead (C), Chief Actuary (D).*
- Modeling calls `resolveRiskClass` + `selectModelStrategy`; replaces the 36% flat
  multiplier with the selected strategy's output, stored in
  `ModelRun.parametersJson`. Pricing calls `selectRatingStrategy`. Generic default
  preserves current numeric behavior where no method is declared, so nothing
  regresses before real strategies land.

**Two-unlike-lines proof** is achievable after Slice 3 for schema and Slice 5 for
math: a property-cat risk class and a casualty/long-tail risk class flow the same
pipeline with **config-only** differences (two registry rows + two published
schema versions), zero engine branches.

---

## Appendix — Guardrail notes (hardcoded-LOB scan)

Confirmed during grounding, to hand to downstream agents:
- **Appetite LOB match is free-text/flat** (`validation/logic.ts:147-162`,
  `extractValidationFields` `logic.ts:34`). Not a defect to fix in Epic 0
  (compatibility shim depends on it), but it is the thing Slice 4 augments.
- **`Submission` has no LOB column** (`underwriting.models.ts:83-96`); LOB is
  free-text inside `CanonicalSubmission.data`. Slice 1/3 promote the taxonomy code
  to first-class on `CanonicalSubmission` (additive), which is the precondition for
  removing free-text reliance later — without breaking it now.
- **`schemaGeneration` mutates published templates in place**
  (`schemaGeneration/service.ts:251-262`). Safe for authoring, but it's why
  submissions must pin to an immutable `risk_class_schema_versions` snapshot, not to
  `PageTemplate`.
- No `if (lob === 'property')`-style branch found in engine code today — the
  generic-default strategy interface must keep it that way.
