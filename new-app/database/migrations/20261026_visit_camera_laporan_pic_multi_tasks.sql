ALTER TABLE kalender_visit_pics
  ADD COLUMN IF NOT EXISTS foto_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS foto_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS foto_location TEXT,
  ADD COLUMN IF NOT EXISTS foto_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS foto_camera VARCHAR(20),
  ADD COLUMN IF NOT EXISTS clock_in_photo TEXT,
  ADD COLUMN IF NOT EXISTS clock_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_in_location TEXT,
  ADD COLUMN IF NOT EXISTS clock_in_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_in_camera VARCHAR(20),
  ADD COLUMN IF NOT EXISTS clock_out_photo TEXT,
  ADD COLUMN IF NOT EXISTS clock_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_out_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_out_location TEXT,
  ADD COLUMN IF NOT EXISTS clock_out_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clock_out_camera VARCHAR(20);

UPDATE kalender_visit_pics AS pic
SET
  clock_in_photo = visit.clock_in_photo,
  clock_in_at = visit.clock_in_at,
  clock_in_lat = visit.clock_in_lat,
  clock_in_lng = visit.clock_in_lng,
  clock_in_location = visit.clock_in_location,
  clock_out_photo = visit.clock_out_photo,
  clock_out_at = visit.clock_out_at,
  clock_out_lat = visit.clock_out_lat,
  clock_out_lng = visit.clock_out_lng,
  clock_out_location = visit.clock_out_location
FROM kalender_visits AS visit
WHERE pic.kalender_visit_id = visit.id
  AND (visit.clock_in_at IS NOT NULL OR visit.clock_out_at IS NOT NULL)
  AND (SELECT COUNT(*) FROM kalender_visit_pics AS assigned WHERE assigned.kalender_visit_id = visit.id) = 1
  AND pic.clock_in_at IS NULL
  AND pic.clock_out_at IS NULL;

CREATE TABLE IF NOT EXISTS laporan_pic_projek_tasks (
  id BIGSERIAL PRIMARY KEY,
  laporan_id BIGINT NOT NULL REFERENCES laporan_pic_projeks(id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL,
  pekerjaan_nama VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_laporan_pic_projek_tasks_laporan_task UNIQUE (laporan_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_laporan_pic_projek_tasks_task
  ON laporan_pic_projek_tasks (task_id);

INSERT INTO laporan_pic_projek_tasks (laporan_id, task_id, pekerjaan_nama)
SELECT id, task_id, pekerjaan_nama
FROM laporan_pic_projeks
WHERE task_id IS NOT NULL
ON CONFLICT (laporan_id, task_id) DO NOTHING;
