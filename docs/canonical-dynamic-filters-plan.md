# Canonical Dynamic Filters Plan

## Goal

Keep marketplace filters fully config-driven while making canonical submissions the source of truth for filtering across submissions, maps, and opportunities.

The filter UI should continue to be driven by `filters.config.json`. New behavior should be introduced by adding resolver metadata and canonical data projections, not by hard-coding filter behavior into endpoint-specific handlers.

## Principles

- Filter definitions remain declarative and dynamic.
- `CanonicalSubmission.data` becomes the normalized filtering substrate.
- Filters apply consistently to submissions, canonical submissions, maps, and marketplace opportunities.
- Subject-level perils replace the current generic opportunity peril.
- CAT peril remains distinct from subject peril.
- Broker, carrier, and cedent organizations are resolved deterministically from extracted/generated party data.
- Newly created organizations are always inactive until reviewed or activated through a trusted onboarding flow.

## Current Problem

The current filter surface is dynamic, but filtering behavior is split across multiple places:

- The filter dock is configured by `filters.config.json`.
- Opportunity filtering is partly client-side and uses opportunity/deal fields.
- Submissions map filtering is backend-side and uses submission joins plus CAT score filters.
- Generated submission facts live in `SubmissionOutput.structuredData`.
- Canonical submission rows exist, but are not yet the common filter target.
- The `peril` filter currently behaves like a generic opportunity peril rather than subject-level peril exposure.

This creates divergence between what a submission generated, what the filter config exposes, and what each endpoint actually applies.

## Target Architecture

### 1. Filter Config Remains Source Of Truth

Keep `filters.config.json` as the declarative definition of:

- field id
- label
- control type
- option source
- dependencies
- disabled/enabled state
- serialization behavior
- backend resolver metadata

Example resolver metadata:

```json
{
  "id": "peril",
  "type": "multiselect",
  "label": "Peril",
  "optionsSource": "subjectPerils",
  "resolver": {
    "source": "canonicalSubmission",
    "path": "filterIndex.subjects.perilCodes",
    "scope": "subject",
    "operator": "in",
    "combineWithSameScope": "sameSubject"
  }
}
```

### 2. Add A Dynamic Filter Resolver

Create a shared backend resolver that reads filter config and applies active filters based on each field's resolver metadata.

Supported resolver metadata:

- `source`: `submission`, `canonicalSubmission`, `catScore`, `organization`, `opportunity`
- `path`: model column path or JSON path
- `scope`: `submission`, `subject`, `catScore`, `opportunity`
- `operator`: `in`, `range`, `equals`, `contains`, `exists`
- `combine`: default `andAcrossFields`
- `combineWithSameScope`: `sameSubject` or `anySubject`

Default logic:

- OR within one multiselect field.
- AND across separate filter fields.
- Subject-scoped fields can require the same subject to satisfy all subject-level predicates.

### 3. Add Canonical Filter Index

Add a normalized `filterIndex` block to `CanonicalSubmission.data`.

Suggested shape:

```ts
type CanonicalFilterIndex = {
  submissionId: number;
  status: string | null;
  submissionTypeCode: string | null;
  submissionTypeLabel: string | null;
  brokerOrganizationId: number | null;
  brokerOrganizationName: string | null;
  brokerOrganizationStatus: 'active' | 'inactive' | null;
  carrierOrganizationId: number | null;
  carrierOrganizationName: string | null;
  carrierOrganizationStatus: 'active' | 'inactive' | null;
  lineOfBusinessCodes: string[];
  lineOfBusinessSubTypeCodes: string[];
  subjectPerilCodes: string[];
  geographyEntries: string[];
  subjectTivMin: number | null;
  subjectTivMax: number | null;
  subjectLimitMin: number | null;
  subjectLimitMax: number | null;
  subjectAttachmentMin: number | null;
  subjectAttachmentMax: number | null;
  subjects: Array<{
    index: number;
    lineOfBusinessCode: string | null;
    lineOfBusinessSubTypeCode: string | null;
    perilCodes: string[];
    geographyEntries: string[];
    tiv: number | null;
    limit: number | null;
    attachment: number | null;
    latitude: number | null;
    longitude: number | null;
  }>;
};
```

The filter config decides which indexed values are exposed.

### 4. Replace Generic Opportunity Peril

Keep the `peril` filter id for continuity, but change its resolver target.

Current behavior:

- `peril` maps to generic peril taxonomy / opportunity peril.

Target behavior:

- `peril` maps to `CanonicalSubmission.data.filterIndex.subjectPerilCodes`.
- Options are distinct subject-level peril codes, labelled through the canonical peril taxonomy.
- Opportunity filtering resolves eligible submission ids first, then returns linked opportunities.

CAT peril remains separate:

- `catPeril` continues to target CAT score records.

### 5. Dynamic Option Sources

Keep options dynamic through `optionsSource`, but move implementations behind canonical-aware option providers.

Option sources:

- `primaryTypes`: line-of-business taxonomy.
- `subTypes`: line-of-business subtype taxonomy, dependent on `lob`.
- `subjectPerils`: distinct canonical subject-level peril codes.
- `catPerils`: distinct CAT score peril values.
- `catBands`: distinct CAT score risk bands.
- `catModelVersions`: distinct CAT score model versions.
- `catRecommendedActions`: distinct CAT score recommended actions.
- `brokers`: distinct resolved broker organizations from canonical filter index.
- `carriers`: distinct resolved carrier organizations from canonical filter index.
- `submissionStatuses`: submission table statuses.
- `submissionTypes`: distinct canonical submission type codes.

## Schema Generation Updates

### 1. Feed The Canonical Index

Update schema generation context and post-processing so generated fields map to stable canonical keys where possible.

The schema agent may propose dynamic fields, but deterministic post-processing should map known concepts to canonical keys:

- `brokerName`
- `carrierName`
- `cedentName`
- `subjectPerils`
- `subjectTiv`
- `subjectLimit`
- `subjectAttachment`
- `lineOfBusinessCode`
- `lineOfBusinessSubTypeCode`
- `submissionTypeCode`
- `locationText`
- `latitude`
- `longitude`

### 2. Extend Schema Agent Context

Include these inputs in `gatherContext()`:

- canonical submission view
- extracted party candidates
- resolved broker/carrier/cedent organization ids
- unresolved party candidates
- subject-level peril inventory
- subject-level financial/exposure attributes
- current filterable canonical keys

### 3. Post-Process Agent Output

The schema agent can identify candidate fields and parties, but deterministic code must:

- assign `canonicalKey` values
- normalize subject-level peril codes
- extract party candidates
- update `CanonicalSubmission.data.filterIndex`
- avoid direct model-driven organization activation

## Organization Resolution

### Invariant

Any organization created from submission/schema extraction is created as inactive on the platform.

Newly created organizations must not:

- grant platform access
- appear as active market participants
- affect active capacity or appetite logic
- be treated as onboarded brokers/carriers

### Resolution Flow

For broker, carrier, and cedent candidates:

1. Collect candidates from extraction, schema generation, email metadata, submitting user organization, and insurer profile.
2. Normalize names, aliases, and domains.
3. Match existing organizations first.
4. If a confident match exists, attach the existing organization.
5. If no match exists and confidence is above a strict threshold, create a new inactive organization.
6. If confidence is insufficient, store unresolved candidate metadata for review.

Suggested canonical record:

```ts
{
  brokerOrganizationId: 123,
  brokerOrganizationStatus: 'inactive',
  brokerResolution: {
    action: 'created_inactive',
    rawName: 'Acme Wholesale Brokers LLC',
    normalizedName: 'acme wholesale brokers',
    confidence: 0.94,
    source: 'schemaGeneration.parties.broker'
  }
}
```

The schema agent can propose parties. A deterministic resolver performs matching, creation, and attachment.

## Applying Filters

Use the shared dynamic resolver in:

- `GET /api/marketplace/filters/manifest`
- `GET /api/marketplace/filters/options/:fieldId`
- `GET /api/submissions-map`
- `GET /api/marketplace/opportunities/active-pending-funding`
- any future canonical-submission search/list endpoint

Endpoint behavior:

- Resolve active filters from query params using config metadata.
- Produce matching canonical submission ids.
- Apply endpoint-specific rendering after filtering.
- For opportunities, filter linked submissions first, then return eligible deals/tranches.

## Logical Intersections

Default:

- Values inside a field are OR.
- Separate fields are AND.

Subject-scoped filters:

- `sameSubject`: one subject must satisfy all subject-scoped predicates.
- `anySubject`: predicates may be satisfied across different subjects in the same submission.

Example:

- `peril = hurricane`
- `tiv > 10000000`
- `geography = Florida`

With `sameSubject`, the hurricane-exposed Florida subject must also satisfy the TIV threshold.

## Migration And Backfill

Add a backfill job that:

- rebuilds `CanonicalSubmission.data.filterIndex`
- derives subject-level peril aggregates
- resolves broker/carrier/cedent organizations
- creates missing organizations as inactive only
- marks unresolved party candidates for review
- records provenance for created/attached organizations

Compatibility:

- Keep `peril` as the field id.
- Temporarily support legacy opportunity peril as fallback only when canonical subject perils are absent.
- Remove fallback after backfill is complete and verified.

## Testing

Add integration tests for:

- filter config drives backend resolver behavior
- subject-level peril replaces generic opportunity peril
- CAT peril remains separate from subject peril
- broker/carrier filters use resolved organization ids
- newly created broker/carrier organizations are inactive
- unresolved party candidates do not create organizations
- LOB, subtype, peril, geography, and TIV intersections work with `sameSubject`
- submissions map and opportunities return consistent results for the same filters
- disabled fields remain no-ops
- adding a new resolver-backed filter requires config changes only

## Acceptance Criteria

- The filter UI remains fully config-driven.
- Filter behavior is driven by config resolver metadata.
- Canonical submissions provide the normalized filtering substrate.
- Subject-level perils replace generic opportunity peril.
- CAT filters continue to operate on CAT score data.
- Broker/carrier/cedent filters use resolved organization references.
- Any new organization created from extracted/generated submission data is inactive by default.
- Logical intersections are consistent across submissions, canonical submissions, maps, and opportunities.
