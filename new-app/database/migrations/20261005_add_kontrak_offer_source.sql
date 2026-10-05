ALTER TABLE kontrak_dokumens
  ADD COLUMN IF NOT EXISTS offer_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS offer_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS offer_kind VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_kontrak_dokumens_offer
  ON kontrak_dokumens (offer_type, offer_id);
