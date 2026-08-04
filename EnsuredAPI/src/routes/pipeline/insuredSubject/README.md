# `pipeline/insuredSubject` route

HTTP entry point for the insured-subject stage. Logic lives in `src/pipeline/insuredSubject`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/insured-subject/health` | Liveness probe. |
| `GET /pipeline/insured-subject/:submissionId` | Load the insured subjects and attributes previously extracted for a submission; field definitions resolve from the insured-subjects page template. |
| `POST /pipeline/insured-subject/process` | Determine insured subject(s) and extract every key-value pair per subject (SOV, address, TIV, construction …). |

The static `health` segment is declared before `/:submissionId` so it resolves first.

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `insuredSubjectRoute` plugin; delegates to `InsuredSubjectService` and `loadInsuredSubjects`. |

Registered in `../../../app.ts` as `insuredSubjectRoute` under `/api`.
