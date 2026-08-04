# `pipeline/ocr` route

HTTP entry point for the OCR stage. Logic lives in `src/pipeline/ocr`.

## Endpoints (under `/api`)

| Method & path | Purpose |
| ------------- | ------- |
| `GET /pipeline/ocr/health` | Liveness probe. |
| `POST /pipeline/ocr/process` | Run OCR and layout extraction; persists results via `persistOcrResult`. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | `ocrRoute` plugin; delegates to `OcrService` with the `persistOcrResult` success hook. |

Registered in `../../../app.ts` as `ocrRoute` under `/api`.
