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

ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module" VARCHAR(50) NOT NULL DEFAULT 'general';
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "label" VARCHAR(255) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "project_stock_movements" (
  "id" BIGSERIAL PRIMARY KEY,
  "stock_item_id" BIGINT NOT NULL REFERENCES "project_stock_items"("id") ON DELETE CASCADE,
  "movement_type" VARCHAR(30) NOT NULL,
  "qty" DECIMAL(15,3) NOT NULL,
  "reference_type" VARCHAR(30),
  "reference_id" BIGINT,
  "warehouse_id" BIGINT,
  "warehouse_stock_id" BIGINT,
  "project_type" VARCHAR(20) NOT NULL,
  "project_id" BIGINT NOT NULL,
  "tanggal" DATE NOT NULL,
  "catatan" TEXT,
  "created_by" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_pbs" (
  "id" BIGSERIAL PRIMARY KEY,
  "project_type" VARCHAR(20) NOT NULL,
  "project_id" BIGINT NOT NULL,
  "nomor_pb" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
  "catatan" TEXT,
  "created_by" BIGINT,
  "approved_by" BIGINT,
  "approved_at" TIMESTAMPTZ,
  "submitted_at" TIMESTAMPTZ,
  "finance_approved_by" BIGINT,
  "finance_approved_at" TIMESTAMPTZ,
  "sa_approved_by" BIGINT,
  "sa_approved_at" TIMESTAMPTZ,
  "reviewed_by" BIGINT,
  "reviewed_at" TIMESTAMPTZ,
  "catatan_review" TEXT,
  "pr_id" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_pb_items" (
  "id" BIGSERIAL PRIMARY KEY,
  "pb_id" BIGINT NOT NULL REFERENCES "project_pbs"("id") ON DELETE CASCADE,
  "stock_item_id" BIGINT NOT NULL REFERENCES "project_stock_items"("id") ON DELETE CASCADE,
  "qty" DECIMAL(15,3) NOT NULL,
  "qty_received" DECIMAL(15,3) NOT NULL DEFAULT 0,
  "catatan" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_project_pb_item" UNIQUE ("pb_id", "stock_item_id")
);

ALTER TABLE "project_stock_movements" ADD COLUMN IF NOT EXISTS "warehouse_stock_id" BIGINT;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMPTZ;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "finance_approved_by" BIGINT;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "finance_approved_at" TIMESTAMPTZ;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "sa_approved_by" BIGINT;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "sa_approved_at" TIMESTAMPTZ;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "reviewed_by" BIGINT;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "catatan_review" TEXT;
ALTER TABLE "project_pbs" ADD COLUMN IF NOT EXISTS "pr_id" BIGINT;
ALTER TABLE "project_pb_items" ADD COLUMN IF NOT EXISTS "catatan" TEXT;
ALTER TABLE "project_pb_items" ADD COLUMN IF NOT EXISTS "qty_received" DECIMAL(15,3) NOT NULL DEFAULT 0;
ALTER TABLE "projek_pr_items" ADD COLUMN IF NOT EXISTS "project_pb_item_id" BIGINT;
ALTER TABLE "adm_finance_projects" ADD COLUMN IF NOT EXISTS "proyek_interior_id" BIGINT;

UPDATE "projek_pr_items" pri
SET "project_pb_item_id" = candidate."pb_item_id"
FROM (
  SELECT MIN(pbi."id") AS "pb_item_id", MIN(pri2."id") AS "pr_item_id"
  FROM "project_pbs" pb
  JOIN "project_pb_items" pbi ON pbi."pb_id" = pb."id"
  JOIN "project_stock_items" psi ON psi."id" = pbi."stock_item_id"
  JOIN "projek_pr_items" pri2 ON pri2."projek_pr_id" = pb."pr_id"
    AND lower(trim(pri2."nama_item")) = lower(trim(psi."nama_item"))
    AND lower(trim(COALESCE(pri2."satuan", ''))) = lower(trim(psi."satuan"))
  WHERE pri2."project_pb_item_id" IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM "project_pb_items" pbi_other
      JOIN "project_stock_items" psi_other ON psi_other."id" = pbi_other."stock_item_id"
      WHERE pbi_other."pb_id" = pb."id" AND pbi_other."id" <> pbi."id"
        AND lower(trim(psi_other."nama_item")) = lower(trim(psi."nama_item"))
        AND lower(trim(psi_other."satuan")) = lower(trim(psi."satuan"))
    )
  GROUP BY pb."id", pbi."id"
  HAVING COUNT(pri2."id") = 1
) candidate
WHERE pri."id" = candidate."pr_item_id" AND pri."project_pb_item_id" IS NULL;

UPDATE "project_pb_items" pbi
SET "qty_received" = LEAST(pbi."qty", received."qty")
FROM (
  SELECT pb."id" AS "pb_id", psm."stock_item_id", SUM(psm."qty") AS "qty"
  FROM "project_pbs" pb
  JOIN "project_stock_movements" psm ON psm."reference_type" = 'PR' AND psm."reference_id" = pb."pr_id" AND psm."movement_type" = 'BARANG_MASUK'
  GROUP BY pb."id", psm."stock_item_id"
) received
WHERE pbi."pb_id" = received."pb_id" AND pbi."stock_item_id" = received."stock_item_id" AND pbi."qty_received" = 0;

UPDATE "project_pb_items" item
SET "qty_received" = item."qty"
FROM "project_pbs" pb
WHERE item."pb_id" = pb."id" AND pb."status" = 'Selesai' AND item."qty_received" = 0;

UPDATE "project_pbs" pb
SET "status" = CASE
  WHEN NOT EXISTS (SELECT 1 FROM "project_pb_items" pbi WHERE pbi."pb_id" = pb."id" AND pbi."qty_received" < pbi."qty") THEN 'Selesai'
  ELSE 'Sebagian Diterima'
END
WHERE pb."status" = 'Diproses PR'
  AND EXISTS (SELECT 1 FROM "project_pb_items" pbi WHERE pbi."pb_id" = pb."id" AND pbi."qty_received" > 0);

UPDATE "project_pbs" pb SET "pr_id" = NULL
WHERE pb."pr_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "projek_prs" pr WHERE pr."id" = pb."pr_id");

CREATE INDEX IF NOT EXISTS "idx_project_stock_items_project" ON "project_stock_items" ("project_type", "project_id");
CREATE INDEX IF NOT EXISTS "idx_project_stock_items_jenis" ON "project_stock_items" ("jenis");
CREATE INDEX IF NOT EXISTS "idx_project_stock_movements_item_type" ON "project_stock_movements" ("stock_item_id", "movement_type");
CREATE INDEX IF NOT EXISTS "idx_project_stock_movements_project" ON "project_stock_movements" ("project_type", "project_id");
CREATE INDEX IF NOT EXISTS "idx_project_stock_movements_warehouse_stock" ON "project_stock_movements" ("warehouse_stock_id");
CREATE INDEX IF NOT EXISTS "idx_project_pbs_project" ON "project_pbs" ("project_type", "project_id");
CREATE INDEX IF NOT EXISTS "idx_project_pbs_status" ON "project_pbs" ("status");
CREATE INDEX IF NOT EXISTS "idx_project_pbs_pr_id" ON "project_pbs" ("pr_id");
CREATE UNIQUE INDEX IF NOT EXISTS "projek_pr_items_project_pb_item_id_key" ON "projek_pr_items" ("project_pb_item_id");
CREATE INDEX IF NOT EXISTS "idx_adm_finance_projects_proyek_interior" ON "adm_finance_projects" ("proyek_interior_id");

DO $$ BEGIN ALTER TABLE "project_stock_movements" ADD CONSTRAINT "project_stock_movements_warehouse_stock_id_fkey" FOREIGN KEY ("warehouse_stock_id") REFERENCES "stok_warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "project_pbs" ADD CONSTRAINT "project_pbs_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "projek_prs"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "projek_pr_items" ADD CONSTRAINT "projek_pr_items_project_pb_item_id_fkey" FOREIGN KEY ("project_pb_item_id") REFERENCES "project_pb_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "adm_finance_projects" ADD CONSTRAINT "adm_finance_projects_proyek_interior_id_fkey" FOREIGN KEY ("proyek_interior_id") REFERENCES "proyek_interiors"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
