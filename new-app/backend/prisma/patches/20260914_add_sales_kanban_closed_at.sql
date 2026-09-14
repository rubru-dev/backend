ALTER TABLE "sales_kanban_cards"
ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "idx_sales_kanban_cards_closed_at"
ON "sales_kanban_cards" ("closed_at");
