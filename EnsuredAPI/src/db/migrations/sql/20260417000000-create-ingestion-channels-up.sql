-- Up migration: create ingestion_channels table

CREATE TABLE IF NOT EXISTS ingestion_channels (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER,
  type        TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
  status      TEXT        NOT NULL DEFAULT 'idle',
  meta        TEXT,
  config      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_channels_tenant  ON ingestion_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_channels_type    ON ingestion_channels(type);
CREATE INDEX IF NOT EXISTS idx_ingestion_channels_enabled ON ingestion_channels(enabled);
