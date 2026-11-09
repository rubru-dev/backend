ALTER TABLE "invoices"
ADD COLUMN "adm_finance_project_id" BIGINT;

CREATE INDEX "idx_invoices_adm_finance_project"
ON "invoices"("adm_finance_project_id");

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_adm_finance_project_id_fkey"
FOREIGN KEY ("adm_finance_project_id")
REFERENCES "adm_finance_projects"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;

-- Assignment portal yang sudah eksplisit adalah sumber backfill paling kuat.
UPDATE "invoices" AS invoice
SET "adm_finance_project_id" = portal."adm_finance_project_id"
FROM "client_portal_projects" AS portal
WHERE invoice."adm_finance_project_id" IS NULL
  AND invoice."client_portal_project_id" = portal."id"
  AND portal."adm_finance_project_id" IS NOT NULL;

-- Item RAB mengarah langsung ke proyek Sipil. Isi hanya jika proyek tersebut
-- mempunyai tepat satu Administrasi Projek agar tidak salah menghubungkan data.
WITH candidates AS (
  SELECT
    invoice."id" AS invoice_id,
    MIN(adm."id") AS adm_id
  FROM "invoices" AS invoice
  JOIN "sipil_rab_items" AS rab ON rab."id" = invoice."rab_item_id"
  JOIN "adm_finance_projects" AS adm ON adm."proyek_berjalan_id" = rab."proyek_id"
  WHERE invoice."adm_finance_project_id" IS NULL
  GROUP BY invoice."id"
  HAVING COUNT(DISTINCT adm."id") = 1
)
UPDATE "invoices" AS invoice
SET "adm_finance_project_id" = candidates.adm_id
FROM candidates
WHERE invoice."id" = candidates.invoice_id;

-- Lead hanya aman dipakai bila tepat satu Administrasi Projek memakai lead itu.
-- Nama klien sengaja tidak digunakan karena production memiliki nama yang sama
-- pada beberapa lead/proyek berbeda.
WITH candidates AS (
  SELECT
    invoice."id" AS invoice_id,
    MIN(adm."id") AS adm_id
  FROM "invoices" AS invoice
  JOIN "adm_finance_projects" AS adm ON adm."lead_id" = invoice."lead_id"
  WHERE invoice."adm_finance_project_id" IS NULL
    AND invoice."lead_id" IS NOT NULL
  GROUP BY invoice."id"
  HAVING COUNT(DISTINCT adm."id") = 1
)
UPDATE "invoices" AS invoice
SET "adm_finance_project_id" = candidates.adm_id
FROM candidates
WHERE invoice."id" = candidates.invoice_id;
