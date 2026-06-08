# Pipeline TODO — production-readiness

Status of the document-ingestion pipeline as audited 2026-06-01. The pipeline is
**manual-only by design**: submissions are advanced per-stage via the Pipeline
Processes board's "Run next stage" button → `POST /api/pipeline/processes/submissions/:id/advance`.
There is **no automatic orchestrator** (`pipeline/index.ts#processSubmission` is a
no-op); the previously dangling `startPipelineProcessor`/`runPipelineOnce` hooks
have been removed (see §6). To exercise the pipeline manually, seed "incoming"
submissions into your signed-in organization with `POST /api/seed/pipeline-submissions`
(admin Data Seeding panel → "Seed Incoming Submissions"), then advance them on the board.

Several stages are real (deterministic heuristics); a few are scaffolding/stubs;
and the document-understanding stages (OCR + LLM) are not wired to a real engine.
None of the external engines/providers are covered by tests — `base.test.ts`
mocks AMQP and OCR, so only the deterministic stage logic is exercised.

## Stage status at a glance

| Stage | Service | Status | Summary |
|---|---|---|---|
| Ingestion | `ingestion/service.ts` | ⚠️ Real, infra-dependent | Real AMQP/SFTP/file fetch + creates Submission/SubmissionFile; needs broker/SFTP/S3 + uninstalled deps |
| OCR | `ocr/*`, `connectors/ocr/*` | 🟨 Architected; engine not provisioned | Provider-agnostic Adapter+Strategy (Document-AI default, Tesseract fallback), callback-based service, unit-tested; output table provisioned. Still needs a real engine installed/configured to actually extract text |
| Classification | `classification/service.ts` | ✅ Real (heuristic) | Keyword/taxonomy LoB classifier; persists. Not ML/LLM |
| Extraction | `extraction/service.ts` | ✅ Real (regex) | Regex entity extraction from OCR text; persists `ExtractedField` |
| Normalization | `normalization/service.ts` | 🟥 Stub (passthrough) | Echoes extraction back as "normalized" — does nothing |
| Validation | `validation/service.ts` | ✅ Real (heuristic) | Address/domain/required-field checks + quality score; optional enrichment API |
| Pre-Rating | `preRating/service.ts` | ✅ Real (heuristic) | Heuristic grade/score. **No HTTP route** |
| Capacity Match | `capacity/service.ts` | ✅ Real (heuristic) | Deal-size vs env-configured capacity + routing. **No HTTP route** |
| Oracle Attestation | `oracleAttestation/service.ts` | ✅ Real (heuristic) | Trigger/source compatibility check. **No HTTP route** |
| Workflow | `workflow/service.ts` | ✅ Real | Aggregates prior outputs → decision; persists `TriageResult` + `WorkflowState` |
| Storage Search | `storageSearch/service.ts` | 🟥 Pure stub | `return { ok: true, received: payload }` — no implementation |

> "Real (heuristic)" means it runs deterministic rule-based logic that works today,
> but it is not a model/ML/actuarial implementation and should be reviewed before
> being called production-grade.

---

## 1. OCR — wire a real engine (Tesseract and/or a cloud provider)

**Files:** `ocr/service.ts`, `connectors/ocr.ts`

**Problem.** `OcrService` orchestration is real (reads each `SubmissionFile`, calls
`runOcr(buffer)`, persists `extractedText`), but `runOcr` has **no working engine**
in this environment:
- The external-API path requires `OCR_API_URL` — **not set**.
- The fallback uses `tesseract.js` — **not installed** (no dependency in
  `package.json`), and the code targets an **outdated tesseract.js API**
  (`createWorker()` + `load`/`loadLanguage`/`initialize`; modern versions use an
  async `createWorker('eng')`).
- Result: on any real document, `runOcr` throws `No OCR available`.
- It also returns plain text only — no layout/table/bounding-box data, despite the
  route advertising "layout extraction".

There is **no test of real OCR** — `base.test.ts` mocks `runOcr` to echo the buffer
as UTF-8, and `ocr/service.test.ts` only covers the health route + the
missing-submission guard.

### Why Tesseract vs. an external OCR provider

This is a real product decision; the connector should support **both** (it's already
structured that way) and choose by config.

- **Tesseract (`tesseract.js` / native Tesseract)** — open-source, runs locally/offline.
  - Pros: free (no per-page cost), no document ever leaves our infrastructure
    (important for PII / sensitive insurance submissions and data-governance), no
    external credentials or network dependency, fine for dev and low volume.
  - Cons: lower accuracy on complex layouts, scans, or handwriting; CPU-heavy and
    slower; English-by-default; **no structured layout/table/key-value output** —
    which matters because insurance docs (ACORD forms, SOVs, loss runs) are
    table-/form-heavy.

- **Cloud OCR / Document AI (AWS Textract, Google Document AI, Azure AI Document
  Intelligence, etc.)** — managed APIs.
  - Pros: much higher accuracy on real-world scans; native **forms/tables/key-value
    + layout (bounding boxes)** extraction; scalable; multi-language; less
    maintenance.
  - Cons: per-page cost; documents are sent to a third party (needs data-governance
    review / contractual terms for PII); requires credentials + network; vendor
    lock-in.

**Recommendation.** Keep the provider-agnostic connector. Default to a cloud
Document-AI provider in production (insurance forms need layout/table extraction),
with Tesseract as the local/offline/dev fallback. Make the engine selectable via env.

### Done (2026-06-01) — architecture
The OCR connector was restructured into a clean Adapter + Strategy design under
`connectors/ocr/`, and the stage service was made callback-based:
- [x] Provider-agnostic connector kept (`connectors/ocr/index.ts#runOcr`) — selects a provider via the strategy.
- [x] **Adapter pattern**: `OcrProvider` interface (`OcrProvider.ts`) with `DocumentAiOcrProvider.ts` (cloud, prod default — configured by `OCR_API_URL`/`OCR_API_KEY`) and `TesseractOcrProvider.ts` (local/dev fallback, modern tesseract.js v5 API).
- [x] **Strategy pattern**: `selectOcrProvider.ts` picks the first available provider in priority order (Document-AI → Tesseract).
- [x] Each provider in its own file in one directory, **unit-tested** (`*.test.ts` for both providers + the strategy).
- [x] Connector result type carries optional `layout` for structured/table output.
- [x] **`OcrService` accepts `onSuccess`/`onFailure` callbacks** (purity): the service no longer persists directly — persistence moved to `ocr/persistOcrResult.ts`, passed in by the route and the advance runner.

### Remaining — make it actually extract text in an environment
- [x] **Dependency-free text path (2026-06-01):** added `PlainTextOcrProvider` (`connectors/ocr/PlainTextOcrProvider.ts`); `runOcr` degrades to it **only when the local Tesseract fallback can't run** (optional dep missing) — so text-based documents (email bodies, CSV/JSON extracts, `.txt`, text-layer exports) now yield extracted text with no engine installed. It refuses binary input (NUL/control-byte sniff) so scanned images/PDFs don't get a garbage byte-decode, and a configured cloud Document-AI failure still surfaces (never degrades). The `POST /api/seed/pipeline-submissions` seeder attaches a sample ACORD-style text doc per submission, so advancing to OCR populates `submission_outputs.extracted_text` end-to-end.
- [ ] Provision a real engine for **scanned images / binary PDFs**: install `tesseract.js` (+ ship English traineddata) for local OCR, or set `OCR_API_URL` to a real Document-AI integration in prod. The plain-text path above only covers already-text documents; binary docs still need a real engine.
- [ ] Have a `DocumentAiOcrProvider` variant call a specific vendor SDK and populate `layout`; then have Extraction consume `layout`/tables instead of regex.
- [ ] Add a fixture-based test that exercises a **real** engine end-to-end (current provider tests cover config/selection + the not-installed error path, not real recognition).
- [ ] Add timeout + retry around the provider call; surface per-file failures as pipeline events (not just `warnings`).
- [ ] Make the silent caps explicit/configurable (`limit: 5` files, 12k-char truncation).
- [x] Provision the `submission_outputs` table (see §8) so `persistOcrResult` can actually persist extracted text on the live DB. *(Done — migration `20260601010000-create-submission-outputs`.)*

---

## 2. Normalization — implement (currently a passthrough stub)

**File:** `normalization/service.ts`

`process()` returns `extraction.structuredData` unchanged as `normalized` — there is
no normalization at all.

### Tasks
- [ ] Implement real normalization: currency conversion to a base currency, unit/number/date parsing, country/region canonicalization, and mapping extracted fields onto the canonical submission schema.
- [ ] Persist a `CanonicalSubmission` row (the model/table exist and are unused by this stage).
- [ ] Add tests with messy inputs (mixed currencies/units/date formats) asserting canonical output.

---

## 3. Storage Search — implement (pure stub)

**File:** `storageSearch/service.ts`

`process()` just echoes the payload. No implementation.

### Tasks
- [ ] Define what this stage should do (e.g. dedupe/search prior submissions, retrieve related documents, index into a search store) and implement it — or remove the stage if it is not needed.
- [ ] Add tests once behavior is defined.

---

## 4. Ingestion — finish the live intake paths

**Files:** `ingestion/service.ts`, `strategies.ts`, `connectors/{amqp,sftp,s3}.ts`

Substantial real code (AMQP consumer, SFTP poller, S3/local file fetch, creates
`Submission`/`SubmissionFile`/`IngestionEvent`), but:
- `connectors/s3.ts` needs `@aws-sdk/client-s3` (**not installed**) + credentials.
- `connectors/sftp.ts` needs `ssh2-sftp-client` (**not installed**) + credentials.
- `amqplib` **is** installed, but needs a running broker.
- `IngestionService.process()` only fetches files and returns — it does not hand off to OCR/downstream.

### Tasks
- [ ] Install/verify connector deps (`@aws-sdk/client-s3`, `ssh2-sftp-client`) and wire credentials/config per channel.
- [ ] Add integration tests for the AMQP/SFTP/S3 intake paths (currently only mocked AMQP in `base.test.ts`).

---

## 5. Heuristic stages — confirm they are intended as production logic

`classification`, `extraction`, `validation`, `preRating`, `capacity`,
`oracleAttestation`, `workflow` all run **deterministic heuristics** (keyword
scoring, regex, env-configured thresholds). They work, but are not models/ML and
have hardcoded confidences/appetites.

### Tasks
- [ ] Product/underwriting review: are the heuristics acceptable, or do these need real models (cat/actuarial pre-rating, ML/LLM classification + extraction, real capacity/portfolio integration, real oracle/smart-contract attestation)?
- [ ] Extraction currently uses regex; once OCR returns layout/tables, replace regex with structured extraction (and consider the LLM path — see §7).
- [ ] Replace hardcoded extraction confidences with engine-provided confidences.
- [ ] Validation: wire `RISK_ENRICHMENT_API_URL` to a real enrichment provider for production (currently local heuristics).

---

## 6. Orchestration + inter-stage data flow

**Files:** `pipeline/index.ts`, `pipeline/board/service.ts` (`advanceSubmissionToNextStage`), `routes/pipelineSubmissionSeed.ts` (manual seeding)

- [x] **Manual-only adopted (2026-06-01):** removed the dangling `startPipelineProcessor` (`app.ts`) and `runPipelineOnce` (`routes/impersonation.ts`, along with its dead `POST /admin/pipeline/run` route) hooks. The pipeline is advanced per-stage from the board; incoming submissions for manual testing are created via `POST /api/seed/pipeline-submissions` (`services/PipelineSubmissionSeedService.ts`), which seeds into the caller's organization and subscribes it to every stage so the cards are visible/advanceable. `processSubmission` remains a no-op stub; a future automatic orchestrator can still be layered on top.
- [ ] **Thread stage outputs between stages.** Stages expect prior outputs on the payload (`payload.ocr.text`, `payload.extraction.structuredData`, `payload.normalization`, `payload.preRating`, …). The manual "advance" endpoint only passes `{ submission: { id } }`, so most downstream stages currently run on **empty inputs** (classification partially recovers by reloading `extractedText` from the DB; others do not). Either have the orchestrator/advance endpoint thread prior outputs, or make each stage load its inputs from persisted DB rows.
- [ ] Add HTTP routes for `preRating`, `capacity`, `oracleAttestation` (currently **no routes** and not run by anything except `base.test.ts`), or invoke them only via the orchestrator.
- [ ] Reconcile board lane granularity: the board groups pre-rating/capacity/oracle/workflow/storage into one "Rating & Workflow" lane, and manual advance into that lane runs only `WorkflowService`.

---

## 7. Connectors & cleanup

- [ ] `connectors/llm.ts` (OpenAI `classifyDocument` / `extractStructured` with heuristic fallbacks) is **orphaned — never imported**. Either adopt it (Classification/Extraction) behind `OPENAI_API_KEY`, or remove it.
- [ ] Connector deps not installed: `tesseract.js`, `@aws-sdk/client-s3`, `ssh2-sftp-client` (these surface as `tsc` "Cannot find module" errors and runtime `import()` failures).

---

## 8. Schema / data gaps

- [x] **`submission_outputs` table** — was missing (the `20260514000000-rename-submission-documents-to-outputs` migration ran but never created a table), so OCR/Classification/Extraction persistence failed with `relation "submission_outputs" does not exist`. **Created** via migration `20260601010000-create-submission-outputs` (with `created_at`/`updated_at` + a `submission_id` index); `SubmissionDocument` restored to manage timestamps. OCR persistence verified end-to-end.
- [ ] Audit the rest of the pipeline tables against their models (the entry point that exposed this was a model↔table timestamp drift).

### Already fixed (2026-06-01)
- Model↔table `updated_at`/timestamp drift that broke `IngestionEvent.create` and reads on `submission_files`/`extracted_fields`/`enrichment_data` (and `submission_outputs`): the ingestion models were aligned with their actual tables (`updatedAt: false` / `timestamps: false`). This unblocked recording stage events and reading submission files (so manual OCR advance now succeeds for file-less submissions).

---

## 9. Test coverage

Current pipeline tests pass but mostly assert health endpoints, the
missing-submission guard, and the deterministic stage logic with **mocked**
I/O (`base.test.ts` mocks `connectors/amqp` and `connectors/ocr`). There is **no
test of any real external engine/provider**.

### Tasks
- [ ] Add tests that exercise the real OCR engine (fixture-based), the enrichment API path, and (if adopted) the LLM path.
- [ ] Add an end-to-end orchestration test once the orchestrator threads stage outputs.
