ALTER TABLE "proyek_berjalan_tasks"
  ADD COLUMN IF NOT EXISTS "checklist_jenis" VARCHAR(20) NOT NULL DEFAULT 'RAB_AWAL';

ALTER TABLE "proyek_interior_tasks"
  ADD COLUMN IF NOT EXISTS "checklist_jenis" VARCHAR(20) NOT NULL DEFAULT 'RAB_AWAL';

ALTER TABLE "proyek_berjalans"
  ADD COLUMN IF NOT EXISTS "pic_user_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "ro_nama_snapshot" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "pic_nama_snapshot" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "client_nama_snapshot" VARCHAR(255);

ALTER TABLE "proyek_interiors"
  ADD COLUMN IF NOT EXISTS "ro_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "pic_user_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "ro_nama_snapshot" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "pic_nama_snapshot" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "client_nama_snapshot" VARCHAR(255);

ALTER TABLE "checklist_sipils"
  ADD COLUMN IF NOT EXISTS "task_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "termin_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "item_jenis" VARCHAR(20) NOT NULL DEFAULT 'RAB_AWAL',
  ADD COLUMN IF NOT EXISTS "pic_paraf" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "pic_paraf_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "pic_paraf_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "client_paraf" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "client_paraf_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "client_paraf_at" TIMESTAMPTZ(6);

ALTER TABLE "checklist_interiors"
  ADD COLUMN IF NOT EXISTS "task_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "termin_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "item_jenis" VARCHAR(20) NOT NULL DEFAULT 'RAB_AWAL',
  ADD COLUMN IF NOT EXISTS "pic_paraf" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "pic_paraf_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "pic_paraf_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "client_paraf" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "client_paraf_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "client_paraf_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_checklist_sipil_task" ON "checklist_sipils" ("task_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_checklist_interior_task" ON "checklist_interiors" ("task_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_checklist_sipil_project_task" ON "checklist_sipils" ("proyek_id", "task_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_checklist_interior_project_task" ON "checklist_interiors" ("proyek_id", "task_id");

ALTER TABLE "stok_warehouses"
  ADD COLUMN IF NOT EXISTS "jenis" VARCHAR(20) NOT NULL DEFAULT 'Material',
  ADD COLUMN IF NOT EXISTS "kondisi_barang" VARCHAR(30) NOT NULL DEFAULT 'Baik';

ALTER TABLE "laporan_pic_projeks"
  ADD COLUMN IF NOT EXISTS "status_pekerjaan" VARCHAR(30) NOT NULL DEFAULT 'On Progress',
  ADD COLUMN IF NOT EXISTS "status_approval" VARCHAR(30) NOT NULL DEFAULT 'Tidak Ada';

ALTER TABLE "proyek_berjalan_tasks"
  ADD COLUMN IF NOT EXISTS "status_approval" VARCHAR(30) NOT NULL DEFAULT 'Tidak Ada',
  ADD COLUMN IF NOT EXISTS "status_requested_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "status_requested_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "status_approved_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "status_approved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "status_rejection_reason" TEXT;

ALTER TABLE "proyek_interior_tasks"
  ADD COLUMN IF NOT EXISTS "status_approval" VARCHAR(30) NOT NULL DEFAULT 'Tidak Ada',
  ADD COLUMN IF NOT EXISTS "status_requested_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "status_requested_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "status_approved_by" BIGINT,
  ADD COLUMN IF NOT EXISTS "status_approved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "status_rejection_reason" TEXT;

CREATE INDEX IF NOT EXISTS "idx_proyek_berjalan_tasks_status_approval" ON "proyek_berjalan_tasks" ("status_approval");
CREATE INDEX IF NOT EXISTS "idx_proyek_interior_tasks_status_approval" ON "proyek_interior_tasks" ("status_approval");
