# Insurance Submission Intake System – Data Pipeline Flow

## Overview

This document describes the **end-to-end data pipeline flow** for an insurance submission intake system. It outlines how data moves from raw ingestion through processing, enrichment, decisioning, and workflow execution.

---

## Core Objective

Transform **unstructured, multi-channel inputs** into:

* Structured, normalized risk data
* Underwriting-ready submissions
* Actionable workflow tasks

---

## High-Level Pipeline Flow

```text
[Input Channels]
      ↓
[Raw Ingestion]
      ↓
[File Normalization]
      ↓
[Data Extraction]
      ↓
[Canonical Mapping]
      ↓
[Enrichment]
      ↓
[Triage & Decisioning]
      ↓
[Workflow & Task Management]
      ↓
[Analytics & Feedback Loop]
```

---

## Stage 1: Input Channels

### Description

Entry points where submissions originate.

### Sources

* Email (attachments, threads)
* Broker portals (form-based input)
* APIs (structured JSON payloads)
* SFTP / bulk uploads
* Internal systems (renewals)

### Output

```json
RawSubmissionInput {
  source,
  transport,
  files[],
  payload,
  metadata
}
```

---

## Stage 2: Raw Ingestion

### Description

Capture and persist all incoming data without modification.

### Responsibilities

* Assign `submission_id`
* Store raw files (immutable)
* Capture metadata (timestamp, sender, tenant)

### Output

```json
RawSubmission {
  submission_id,
  tenant_id,
  source,
  files[],
  received_at
}
```

---

## Stage 3: File Normalization

### Description

Convert raw files into machine-readable formats.

### Tasks

* OCR for PDFs and images
* Extract text from documents
* Parse Excel into structured tables
* Classify document types

### Output

```json
NormalizedDocument {
  document_id,
  document_type,
  extracted_text,
  tables[],
  key_values[]
}
```

---

## Stage 4: Data Extraction

### Description

Extract meaningful underwriting data from normalized documents.

### Extracted Data

* Insured information
* Locations
* Coverage details
* Exposure values (TIV, revenue, payroll)
* Loss history

### Output

```json
ExtractedData {
  insured,
  locations[],
  exposures,
  losses[],
  confidence_scores
}
```

---

## Stage 5: Canonical Mapping

### Description

Transform extracted data into a standardized internal schema.

### Responsibilities

* Normalize field names
* Align structures across document types
* Create a unified submission model

### Output

```json
CanonicalSubmission {
  submission_id,
  parties,
  risks,
  coverages,
  exposures,
  losses
}
```

---

## Stage 6: Enrichment

### Description

Enhance submission data with external intelligence.

### Enrichment Sources

* Geolocation (address → lat/long)
* Hazard and catastrophe scoring
* Industry classification (NAICS)
* Third-party risk data

### Output

```json
EnrichedSubmission {
  ...canonical,
  geo,
  hazard_scores,
  industry_codes,
  external_data
}
```

---

## Stage 7: Triage & Decisioning

### Description

Evaluate whether the submission fits underwriting criteria.

### Logic

* Risk appetite rules
* Completeness checks
* Threshold-based scoring

### Possible Outcomes

* ACCEPT
* DECLINE
* REFER (manual review)

### Output

```json
TriageDecision {
  submission_id,
  decision,
  score,
  reasons[]
}
```

---

## Stage 8: Workflow & Task Management

### Description

Convert decisions into operational tasks.

### Responsibilities

* Assign underwriters
* Create review tasks
* Track status progression

### Output

```json
WorkflowState {
  submission_id,
  status,
  assigned_to,
  tasks[],
  history[]
}
```

---

## Stage 9: Analytics & Feedback Loop

### Description

Capture performance and improve system intelligence.

### Metrics

* Submission volume
* Processing time per stage
* Quote turnaround time
* Hit ratio (quote → bind)

### Feedback Sources

* Underwriter corrections
* Extraction accuracy
* Decision overrides

---

## Event-Driven Pipeline

Each stage emits an event:

```text
submission.received
file.normalized
data.extracted
submission.canonicalized
submission.enriched
submission.triaged
workflow.created
```

### Benefits

* Loose coupling between services
* Retry and replay capability
* Horizontal scalability

---

## Error Handling Strategy

Each stage must support:

* Retry mechanisms
* Dead-letter queues
* Error logging with context

### Example

```json
PipelineError {
  submission_id,
  stage,
  error_message,
  retry_count,
  failed_at
}
```

---

## Observability

Track:

* Stage duration
* Failure rates
* Throughput per tenant

### Key Insight

Every submission should be fully traceable from:

```text
Raw Input → Final Decision
```

---

## Replayability

The system must support:

* Reprocessing from any stage
* Versioned outputs
* Non-destructive updates

---

## Final Notes

This pipeline is designed to:

* Handle unstructured and structured data
* Scale across tenants
* Enable real-time underwriting decisions
* Provide full auditability and transparency

---

**End of Document**
