# `pipeline/schemaGeneration` route

HTTP entry point for the schema-generation stage. Logic lives in `src/pipeline/schemaGeneration`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/schemaGeneration/health` | Liveness probe. |
| `GET /pipeline/schemaGeneration/option-sets/:optionSetKey` | Lazy-load a generated field's selection options by its `optionSetKey`. |
| `GET /pipeline/schemaGeneration/baseline` | The deterministic baseline form, optionally tailored by line of business / portfolio size. |
| `GET /pipeline/schemaGeneration/:submissionId` | The AI-suggested form previously generated for a submission. |
| `POST /pipeline/schemaGeneration/process` | Generate a suggested submission form. |

Static segments (`option-sets`, `baseline`) are declared before `/:submissionId` so they resolve first.

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `schemaGenerationRoute` plugin; delegates to `SchemaGenerationService`, `buildBaselineForm`, `loadOptionSet`, `loadSuggestedForm`. |

Registered in `../../../app.ts` as `schemaGenerationRoute` under `/api`.
