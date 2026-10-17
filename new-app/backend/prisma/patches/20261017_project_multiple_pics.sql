CREATE TABLE IF NOT EXISTS "proyek_berjalan_pics" (
  "proyek_id" BIGINT NOT NULL REFERENCES "proyek_berjalans"("id") ON DELETE CASCADE,
  "user_id" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("proyek_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_proyek_berjalan_pics_user" ON "proyek_berjalan_pics" ("user_id");

CREATE TABLE IF NOT EXISTS "proyek_interior_pics" (
  "proyek_id" BIGINT NOT NULL REFERENCES "proyek_interiors"("id") ON DELETE CASCADE,
  "user_id" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("proyek_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_proyek_interior_pics_user" ON "proyek_interior_pics" ("user_id");

INSERT INTO "proyek_berjalan_pics" ("proyek_id", "user_id")
SELECT "id", "pic_user_id" FROM "proyek_berjalans"
WHERE "pic_user_id" IS NOT NULL
ON CONFLICT ("proyek_id", "user_id") DO NOTHING;

INSERT INTO "proyek_interior_pics" ("proyek_id", "user_id")
SELECT "id", "pic_user_id" FROM "proyek_interiors"
WHERE "pic_user_id" IS NOT NULL
ON CONFLICT ("proyek_id", "user_id") DO NOTHING;
