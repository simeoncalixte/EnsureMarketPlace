# Submissions Pipeline Schema

This document describes the schema for representing a submission through the data pipeline. It captures the raw source metadata, the title of the source, raw sample rows (optional), and column-level transformation history.

- JSON Schema: [docs/submissions_pipeline_schema.json](docs/submissions_pipeline_schema.json)

## Overview

- **submissionId**: Unique identifier for the submission.
- **sourceTitle**: Human-readable title for the raw source (e.g., "Broker CSV Upload").
- **rawData**: Optional small sample of raw rows for debugging/inspection.
- **columns**: Array of column metadata objects; each includes the column name, original source name, data type, sample values and a list of transformations applied.
- **pipeline**: Ordered list of process steps (ingest, validate, enrich, transform, load) with timestamps and status.

## Example

```json
{
  "submissionId": "sub-2026-04-16-0001",
  "receivedAt": "2026-04-16T14:12:00Z",
  "sourceTitle": "Broker CSV Upload",
  "sourceType": "csv",
  "sourceLocation": "s3://ensured-bucket/uploads/broker-2026-04-16.csv",
  "rawData": [
    { "policy_no": "  P-1001 ", "premium_amt": "1000.00", "insured_name": "Acme Co" },
    { "policy_no": "P-1002", "premium_amt": "2500", "insured_name": "Beta LLC" }
  ],
  "columns": [
    {
      "name": "policy_id",
      "originalName": "policy_no",
      "dataType": "string",
      "isKey": true,
      "isSensitive": false,
      "rawSampleValues": ["  P-1001 ", "P-1002"],
      "transformations": [
        { "name": "trim_whitespace", "type": "cleanse", "description": "Trim leading/trailing whitespace", "appliedBy": "ingest-service", "appliedAt": "2026-04-16T14:12:05Z", "outputName": "policy_id", "outputType": "string" }
      ]
    },
    {
      "name": "premium",
      "originalName": "premium_amt",
      "dataType": "number",
      "isKey": false,
      "isSensitive": false,
      "rawSampleValues": ["1000.00", "2500"],
      "transformations": [
        { "name": "cast_to_number", "type": "cast", "description": "Cast string to decimal", "parameters": { "scale": 2 }, "appliedBy": "transform-service", "appliedAt": "2026-04-16T14:12:20Z", "outputName": "premium", "outputType": "number" }
      ]
    }
  ],
  "pipeline": [
    { "step": "ingest", "status": "completed", "startedAt": "2026-04-16T14:12:00Z", "completedAt": "2026-04-16T14:12:06Z" },
    { "step": "validate", "status": "completed", "startedAt": "2026-04-16T14:12:06Z", "completedAt": "2026-04-16T14:12:10Z", "details": "All rows passed basic schema validation" },
    { "step": "transform", "status": "completed", "startedAt": "2026-04-16T14:12:10Z", "completedAt": "2026-04-16T14:12:25Z" },
    { "step": "load", "status": "pending" }
  ],
  "schemaVersion": "1.0",
  "pipelineVersion": "2026-04-release"
}
```

## Notes

- Use `columns[].transformations` to record any rename, cast, mapping, enrichment, or validation steps applied to each field.
- Keep `rawData` small (sample rows) to aid debugging; don't store full payloads inline unless necessary.
- The JSON Schema file provides machine-readable validation and should be referenced by ingestion and QA tooling.
