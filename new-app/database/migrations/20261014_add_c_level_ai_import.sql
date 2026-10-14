CREATE TABLE IF NOT EXISTS c_level_import_batches (
  id BIGSERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS idx_c_level_import_batches_created_at
  ON c_level_import_batches(created_at DESC);

INSERT INTO permissions (name, module, label)
VALUES
  ('c_level.view', 'c_level', 'Lihat Dashboard C-Level'),
  ('c_level.ai', 'c_level', 'Gunakan AI Diskusi dan Analisa C-Level'),
  ('c_level.import', 'c_level', 'Import Data Manual C-Level'),
  ('bd.import_data', 'bd', 'Sub-menu: Import Data Manual BD')
ON CONFLICT (name) DO UPDATE SET module = EXCLUDED.module, label = EXCLUDED.label;

INSERT INTO roles (name)
VALUES ('C-Level')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('c_level.view', 'c_level.ai', 'c_level.import')
WHERE r.name = 'C-Level'
ON CONFLICT (role_id, permission_id) DO NOTHING;
