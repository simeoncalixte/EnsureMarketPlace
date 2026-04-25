-- Up migration: create pipeline_processes table

CREATE TABLE IF NOT EXISTS pipeline_processes (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id INTEGER,
  current_stage TEXT NOT NULL,
  status TEXT NOT NULL,
  last_event_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_processes_submission ON pipeline_processes(submission_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_processes_document ON pipeline_processes(document_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_processes_tenant ON pipeline_processes(tenant_id);
