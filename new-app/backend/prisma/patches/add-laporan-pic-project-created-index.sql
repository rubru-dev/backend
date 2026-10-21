-- Index komposit untuk paginasi Laporan PIC Project yang di-order by created_at desc
-- dalam satu proyek (GET /pic/laporan-pic). Membuat sort + offset tetap cepat walau
-- laporan menumpuk. Non-destruktif, idempoten.
CREATE INDEX IF NOT EXISTS idx_laporan_pic_projeks_project_created
  ON laporan_pic_projeks (project_type, project_id, created_at DESC);
