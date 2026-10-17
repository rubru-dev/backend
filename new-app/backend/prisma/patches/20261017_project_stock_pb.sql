CREATE TABLE IF NOT EXISTS "project_stock_items" (
  "id" BIGSERIAL PRIMARY KEY,
  "project_type" VARCHAR(20) NOT NULL,
  "project_id" BIGINT NOT NULL,
  "jenis" VARCHAR(20) NOT NULL,
  "nama_item" VARCHAR(255) NOT NULL,
  "satuan" VARCHAR(50) NOT NULL,
  "qty_total" DECIMAL(15,3) NOT NULL DEFAULT 0,
  "keterangan" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_project_stock_items_project" ON "project_stock_items" ("project_type", "project_id");
CREATE INDEX IF NOT EXISTS "idx_project_stock_items_jenis" ON "project_stock_items" ("jenis");

CREATE TABLE IF NOT EXISTS "project_stock_movements" (
  "id" BIGSERIAL PRIMARY KEY,
  "stock_item_id" BIGINT NOT NULL REFERENCES "project_stock_items"("id") ON DELETE CASCADE,
  "movement_type" VARCHAR(30) NOT NULL,
  "qty" DECIMAL(15,3) NOT NULL,
  "reference_type" VARCHAR(30),
  "reference_id" BIGINT,
  "warehouse_id" BIGINT,
  "project_type" VARCHAR(20) NOT NULL,
  "project_id" BIGINT NOT NULL,
  "tanggal" DATE NOT NULL,
  "catatan" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_project_stock_movements_item_type" ON "project_stock_movements" ("stock_item_id", "movement_type");
CREATE INDEX IF NOT EXISTS "idx_project_stock_movements_project" ON "project_stock_movements" ("project_type", "project_id");

CREATE TABLE IF NOT EXISTS "project_pbs" (
  "id" BIGSERIAL PRIMARY KEY,
  "project_type" VARCHAR(20) NOT NULL,
  "project_id" BIGINT NOT NULL,
  "nomor_pb" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'Diajukan',
  "catatan" TEXT,
  "created_by" BIGINT,
  "approved_by" BIGINT,
  "approved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_project_pbs_project" ON "project_pbs" ("project_type", "project_id");
CREATE INDEX IF NOT EXISTS "idx_project_pbs_status" ON "project_pbs" ("status");

CREATE TABLE IF NOT EXISTS "project_pb_items" (
  "id" BIGSERIAL PRIMARY KEY,
  "pb_id" BIGINT NOT NULL REFERENCES "project_pbs"("id") ON DELETE CASCADE,
  "stock_item_id" BIGINT NOT NULL REFERENCES "project_stock_items"("id") ON DELETE CASCADE,
  "qty" DECIMAL(15,3) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_project_pb_item" UNIQUE ("pb_id", "stock_item_id")
);

ALTER TABLE "adm_finance_projects"
  ADD COLUMN IF NOT EXISTS "proyek_interior_id" BIGINT;
CREATE INDEX IF NOT EXISTS "idx_adm_finance_projects_proyek_interior"
  ON "adm_finance_projects" ("proyek_interior_id");
DO $$ BEGIN
  ALTER TABLE "adm_finance_projects"
    ADD CONSTRAINT "fk_adm_finance_projects_proyek_interior"
    FOREIGN KEY ("proyek_interior_id") REFERENCES "proyek_interiors"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "project_pbs"
  ADD COLUMN IF NOT EXISTS "pr_id" BIGINT;
CREATE INDEX IF NOT EXISTS "idx_project_pbs_pr_id" ON "project_pbs" ("pr_id");

ALTER TABLE "project_stock_movements"
  ADD COLUMN IF NOT EXISTS "warehouse_stock_id" BIGINT;
CREATE INDEX IF NOT EXISTS "idx_project_stock_movements_warehouse_stock"
  ON "project_stock_movements" ("warehouse_stock_id");
DO $$ BEGIN
  ALTER TABLE "project_stock_movements"
    ADD CONSTRAINT "fk_project_stock_movements_warehouse_stock"
    FOREIGN KEY ("warehouse_stock_id") REFERENCES "stok_warehouses"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
