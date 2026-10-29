ALTER TABLE "project_stock_movements"
  ADD COLUMN IF NOT EXISTS "receipt_key" VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_project_stock_movement_receipt_item"
  ON "project_stock_movements" ("receipt_key", "stock_item_id");

-- PR lama yang qty-nya berbeda dari PB dikembalikan ke tahap approval. Ini
-- memulihkan PB yang sebelumnya bisa selesai pada qty PR yang lebih kecil.
UPDATE "projek_prs" pr
SET "status" = 'Pending',
    "hf_signed_at" = NULL,
    "hf_signed_by" = NULL,
    "hf_name" = NULL,
    "hf_signature" = NULL
WHERE EXISTS (
  SELECT 1
  FROM "projek_pr_items" pri
  JOIN "project_pb_items" pbi ON pbi."id" = pri."project_pb_item_id"
  WHERE pri."projek_pr_id" = pr."id" AND pri."qty" <> pbi."qty"
);

UPDATE "projek_pr_items" pri
SET "qty" = pbi."qty"
FROM "project_pb_items" pbi
WHERE pbi."id" = pri."project_pb_item_id" AND pri."qty" <> pbi."qty";

UPDATE "project_pbs" pb
SET "status" = 'Sebagian Diterima'
WHERE pb."status" = 'Selesai'
  AND EXISTS (
    SELECT 1 FROM "project_pb_items" pbi
    WHERE pbi."pb_id" = pb."id" AND pbi."qty_received" < pbi."qty"
  );

-- Nomor lama berbasis timestamp seharusnya unik, tetapi data duplikat perlu
-- diamankan sebelum constraint dipasang.
WITH ranked AS (
  SELECT "id", "nomor_pb",
         ROW_NUMBER() OVER (PARTITION BY "nomor_pb" ORDER BY "id") AS duplicate_no
  FROM "project_pbs"
  WHERE "nomor_pb" IS NOT NULL
)
UPDATE "project_pbs" pb
SET "nomor_pb" = NULL
FROM ranked
WHERE pb."id" = ranked."id" AND ranked.duplicate_no > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "project_pbs_nomor_pb_key"
  ON "project_pbs" ("nomor_pb");

UPDATE "project_pbs" pb
SET "nomor_pb" = 'PB-' || lpad(pb."id"::text, 6, '0')
WHERE pb."nomor_pb" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "project_pbs" existing
    WHERE existing."nomor_pb" = 'PB-' || lpad(pb."id"::text, 6, '0')
  );
