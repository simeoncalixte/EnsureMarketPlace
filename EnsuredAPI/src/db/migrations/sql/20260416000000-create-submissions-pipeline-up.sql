-- Up migration: create submissions pipeline core tables

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  source TEXT NOT NULL,
  transport TEXT NOT NULL,
  status TEXT NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure tenant_id exists (idempotent) in case the table pre-exists with a different schema
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON submissions(tenant_id);

CREATE TABLE IF NOT EXISTS submission_files (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  tenant_id INTEGER,
  file_name TEXT,
  file_type TEXT,
  file_size INT,
  storage_path TEXT NOT NULL,
  checksum TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_submission ON submission_files(submission_id);

-- Ensure tenant_id exists on submission_files
ALTER TABLE submission_files ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

CREATE TABLE IF NOT EXISTS ingestion_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  submission_id INTEGER NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  input_ref TEXT,
  output_ref TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure tenant_id exists on ingestion_events before creating compound indexes
ALTER TABLE ingestion_events ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_ingestion_submission ON ingestion_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_stage ON ingestion_events(stage);
CREATE INDEX IF NOT EXISTS idx_events_tenant_stage ON ingestion_events(tenant_id, stage, status);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  document_type TEXT,
  classification_confidence FLOAT,
  extracted_text TEXT,
  structured_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure tenant_id exists on documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

CREATE TABLE IF NOT EXISTS extracted_fields (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  field_name TEXT,
  field_value TEXT,
  confidence FLOAT,
  source_location JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure tenant_id exists on extracted_fields
ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

CREATE TABLE IF NOT EXISTS canonical_submissions (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  data JSONB NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure tenant_id exists on canonical_submissions
ALTER TABLE canonical_submissions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

CREATE TABLE IF NOT EXISTS enrichment_data (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  enrichment_type TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure tenant_id exists on enrichment_data
ALTER TABLE enrichment_data ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

CREATE TABLE IF NOT EXISTS triage_results (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  decision TEXT,
  score FLOAT,
  reasons JSONB,
  decided_at TIMESTAMP DEFAULT NOW()
);

-- Ensure tenant_id exists on triage_results
ALTER TABLE triage_results ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

CREATE TABLE IF NOT EXISTS workflow_states (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  status TEXT,
  assigned_to INTEGER,
  tasks JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure tenant_id exists on workflow_states
ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
