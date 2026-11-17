ALTER TABLE "checklist_sipils"
  ADD COLUMN "mandor_paraf" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mandor_paraf_by" BIGINT,
  ADD COLUMN "mandor_paraf_at" TIMESTAMPTZ(6);
