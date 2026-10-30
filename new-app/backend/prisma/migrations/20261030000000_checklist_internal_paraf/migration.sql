ALTER TABLE "checklist_sipils"
  ADD COLUMN "head_teknik_paraf" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "head_teknik_paraf_by" BIGINT,
  ADD COLUMN "head_teknik_paraf_at" TIMESTAMPTZ(6);

ALTER TABLE "checklist_interiors"
  ADD COLUMN "head_teknik_paraf" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "head_teknik_paraf_by" BIGINT,
  ADD COLUMN "head_teknik_paraf_at" TIMESTAMPTZ(6);
