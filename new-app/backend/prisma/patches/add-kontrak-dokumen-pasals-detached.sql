-- Fitur: edit pasal pada Dokumen Kontrak (addendum) yang sudah dipublish ke klien,
-- tanpa mengubah template. Kolom menandai bahwa pasal template sudah disalin
-- ("detach") ke kontrak_dokumen_pasals milik dokumen ini sehingga bisa diedit
-- khusus kontrak tersebut. Idempoten.
ALTER TABLE kontrak_dokumens
  ADD COLUMN IF NOT EXISTS pasals_detached boolean NOT NULL DEFAULT false;
