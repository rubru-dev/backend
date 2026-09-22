CREATE TABLE IF NOT EXISTS projek_cashflow_attachments (
    id            BIGSERIAL PRIMARY KEY,
    cashflow_id   BIGINT NOT NULL REFERENCES projek_cashflows(id) ON DELETE CASCADE,
    file_path     VARCHAR(500) NOT NULL,
    original_name VARCHAR(255),
    mime_type     VARCHAR(150),
    file_size     INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projek_cashflow_attachments_cashflow
  ON projek_cashflow_attachments(cashflow_id);
