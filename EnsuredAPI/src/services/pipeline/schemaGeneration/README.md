# Schema Generation

This directory builds the create-coverage form that the UI renders for a submission. It turns the output of the earlier pipeline stages into a structured, submission-specific form schema, then persists that schema so future submissions can reuse it.

## What it does

The schema-generation flow is split into a deterministic core and an optional AI layer:

1. Gather context from the pipeline payload.
2. Build a baseline schema for the create-coverage page.
3. Optionally tailor that schema with an LLM-generated form.
4. Coerce the result into a safe, standardized structure.
5. Prefill fields from extracted submission data.
6. Persist the schema and any choice-field option sets.

## Main modules

- logic.ts
  - Contains the pure schema-building logic.
  - Builds the baseline create-coverage form.
  - Gathers context from classification, extraction, and validation outputs.
  - Coerces raw model output into a safe form definition.
  - Prefills fields from canonical values.
  - Extracts option-set data from select/radio fields.
  - Converts generated schemas into reusable templates.

- service.ts
  - Implements the production service layer.
  - Uses the deterministic logic as the fallback path.
  - Attempts to use the Gemini-backed schema agent when available.
  - Persists generated schemas to the submission output.
  - Promotes successful AI-generated forms into reusable page templates.
  - Stores option sets for lazy-loaded UI choices.

- GeminiSchemaProvider.ts
  - Wraps the Gemini-based schema agent.
  - Produces a tailored schema when the integration is configured.
  - Returns a structured result that the service can safely consume.

- taxonomy.ts
  - Resolves the relevant line-of-business taxonomy slice.
  - Helps the schema generation process stay aligned with recognized LOB codes and subtypes.

- fieldRemoval.ts
  - Supports removing AI-generated fields from an organization’s reusable create-coverage template.
  - Protects the base scaffold and only removes fields that were introduced by the schema agent.

- types.ts
  - Defines the shared schema, field, context, and result types.

## Core flow

### 1. Context gathering

The process begins with gatherContext(), which distills prior-stage output into a SubmissionFormContext. This context includes submission identifiers, LOB details, extracted subject information, dates, limits, and validation status.

### 2. Baseline schema creation

The system builds a standard create-coverage page structure. This baseline includes general information, financials, and workflow sections such as insured subjects, documents, tranche structure, validation, submission, and signing.

If an organization already has a published create-coverage template for the relevant line of business, that template is adopted as the base instead of the hardcoded fallback.

### 3. AI augmentation or fallback

The service tries to use the Gemini schema agent first when it is available. If the agent is unavailable or fails, the deterministic baseline schema is used instead.

This gives the system a reliable fallback while still supporting richer, submission-specific forms when AI generation is available.

### 4. Schema coercion

The AI-produced form is not trusted blindly. The coercion stage merges it into the baseline in a conservative way:

- base sections and fields are preserved,
- AI content may add new fields to existing base sections,
- AI content may add wholly new sections,
- component-based workflow sections such as insured subjects, documents, tranche structure, validation, submission, and signing are not field-extended,
- empty or low-value scaffold is discarded.

This ensures the final schema remains consistent with the standard create-coverage page.

### 5. Prefill and option sets

After the schema is built, values are prefilled from the submission’s extracted data using canonical field mappings. Choice fields such as select and radio fields also have their options lifted into reusable option sets so the UI can lazy-load them.

### 6. Persistence

The final schema is persisted in two places:

- the submission output for the current submission, and
- optionally the reusable page template library for future submissions of the same line of business.

## Important behavior

- The generated schema is advisory, not authoritative. If generation fails, the UI still receives a usable fallback schema.
- The system preserves the base scaffold and only extends it.
- AI-generated fields can later be removed from the organization template without mutating existing submission snapshots.
- The logic is deliberately pure where possible so it can be tested without network or database access.

## Tests

The directory includes unit and integration tests covering:

- baseline schema construction,
- context gathering,
- taxonomy-aware behavior,
- field removal rules,
- Gemini schema generation behavior,
- end-to-end schema generation.
