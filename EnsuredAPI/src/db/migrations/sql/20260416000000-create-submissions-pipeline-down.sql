-- Down migration: drop submissions pipeline core tables (reverse order)
DROP TABLE IF EXISTS workflow_states;
DROP TABLE IF EXISTS triage_results;
DROP TABLE IF EXISTS enrichment_data;
DROP TABLE IF EXISTS canonical_submissions;
DROP TABLE IF EXISTS extracted_fields;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS ingestion_events;
DROP TABLE IF EXISTS submission_files;
DROP TABLE IF EXISTS submissions;
