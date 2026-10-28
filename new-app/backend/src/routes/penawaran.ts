import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { triggerEventReminder } from "../lib/notify";

const router = Router();
const TYPES = new Set(["desain", "rkr", "rubru"]);
const KINDS = new Set(["offer", "discount", "berita_acara"]);
const BA_STATUSES = new Set(["Draft", "Final", "Ditandatangani"]);

async function ensureTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS penawaran_offers (
      id VARCHAR(64) PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      kind VARCHAR(50) NOT NULL DEFAULT 'offer',
      data JSONB NOT NULL,
      created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_penawaran_offers_type_kind_created ON penawaran_offers(type, kind, created_at DESC)`;
}

function validType(type: string) {
  return TYPES.has(type);
}

function validKind(kind: string) {
  return KINDS.has(kind);
}

function validateBeritaAcara(data: any) {
  if (!String(data.judul ?? "").trim()) return "Judul Berita Acara wajib diisi";
  if (!String(data.nomor ?? "").trim()) return "Nomor Berita Acara wajib diisi";
  if (!String(data.tanggal ?? "").trim()) return "Tanggal Berita Acara wajib diisi";
  if (!BA_STATUSES.has(String(data.status ?? ""))) return "Status Berita Acara tidak valid";
  if (data.status === "Ditandatangani" && (!String(data.pihakPertamaNama ?? "").trim() || !String(data.pihakKeduaNama ?? "").trim())) {
    return "Nama kedua pihak wajib diisi untuk status Ditandatangani";
  }
  if (!Array.isArray(data.poin) || !data.poin.some((item: unknown) => String(item ?? "").trim())) return "Minimal satu poin Berita Acara wajib diisi";
  if (data.poin.length > 50) return "Poin Berita Acara maksimal 50";
  if (data.sertakanRincian) {
    if (!Array.isArray(data.rincian) || !data.rincian.some((item: any) => String(item?.uraian ?? "").trim())) return "Minimal satu rincian pekerjaan wajib diisi";
    if (data.rincian.length > 100) return "Rincian pekerjaan maksimal 100 baris";
  }
  return null;
}

function mapRow(row: any) {
  return {
    id: String(row.id),
    type: row.type,
    kind: row.kind,
    data: row.data,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.get("/:type/offers", async (req: Request, res: Response) => {
  const type = String(req.params.type);
  const kind = String(req.query.kind ?? "offer");
  if (!validType(type) || !validKind(kind)) return res.status(400).json({ detail: "Tipe penawaran tidak valid" });
  await ensureTable();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, type, kind, data, created_by, created_at, updated_at
    FROM penawaran_offers
    WHERE type = ${type} AND kind = ${kind}
    ORDER BY created_at DESC
  `;
  return res.json({ items: rows.map(mapRow) });
});

router.post("/:type/offers", async (req: Request, res: Response) => {
  const type = String(req.params.type);
  const kind = String(req.body?.kind ?? "offer");
  const data = req.body?.data;
  if (!validType(type) || !validKind(kind)) return res.status(400).json({ detail: "Tipe penawaran tidak valid" });
  if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ detail: "Data penawaran wajib diisi" });
  if (kind === "berita_acara") {
    const validationError = validateBeritaAcara(data);
    if (validationError) return res.status(400).json({ detail: validationError });
  }

  await ensureTable();
  if (kind === "berita_acara" && String(data.sourceOfferId ?? "").trim()) {
    const sourceRows = await prisma.$queryRaw<any[]>`
      SELECT id FROM penawaran_offers
      WHERE id = ${String(data.sourceOfferId)} AND type = ${type} AND kind = 'offer'
      LIMIT 1
    `;
    if (!sourceRows.length) return res.status(400).json({ detail: "Penawaran sumber tidak ditemukan" });
  }
  const id = String(data.id || randomUUID());
  const existingRows = await prisma.$queryRaw<any[]>`SELECT type, kind FROM penawaran_offers WHERE id = ${id} LIMIT 1`;
  if (existingRows.length && (existingRows[0].type !== type || existingRows[0].kind !== kind)) {
    return res.status(409).json({ detail: "ID dokumen sudah digunakan oleh jenis dokumen lain" });
  }
  const normalizedData = { ...data, id };
  const rows = await prisma.$queryRaw<any[]>`
    INSERT INTO penawaran_offers (id, type, kind, data, created_by)
    VALUES (${id}, ${type}, ${kind}, ${normalizedData}, ${req.user?.id ?? null})
    ON CONFLICT (id) DO UPDATE SET
      type = EXCLUDED.type,
      kind = EXCLUDED.kind,
      data = EXCLUDED.data,
      updated_at = now()
    RETURNING id, type, kind, data, created_by, created_at, updated_at
  `;
  const result = mapRow(rows[0]);
  if (kind === "offer") triggerEventReminder("penawaran_baru", {
    jenis: type,
    kind,
    nama: String(data.klien ?? data.nama ?? data.client ?? "-"),
  }).catch(() => {});
  return res.status(201).json(result);
});

router.delete("/offers/:id", async (req: Request, res: Response) => {
  await ensureTable();
  const id = String(req.params.id);
  const rows = await prisma.$queryRaw<any[]>`SELECT kind, data FROM penawaran_offers WHERE id = ${id} LIMIT 1`;
  if (!rows.length) return res.status(404).json({ detail: "Dokumen tidak ditemukan" });
  if (rows[0].kind === "berita_acara" && rows[0].data?.status !== "Draft") {
    return res.status(409).json({ detail: "Hanya Berita Acara berstatus Draft yang dapat dihapus" });
  }
  if (rows[0].kind === "offer") {
    const dependentRows = await prisma.$queryRaw<any[]>`
      SELECT id FROM penawaran_offers
      WHERE kind = 'berita_acara' AND data->>'sourceOfferId' = ${id}
      LIMIT 1
    `;
    if (dependentRows.length) {
      return res.status(409).json({ detail: "Penawaran tidak dapat dihapus karena masih memiliki Berita Acara" });
    }
  }
  await prisma.$executeRaw`DELETE FROM penawaran_offers WHERE id = ${id}`;
  return res.json({ message: rows[0].kind === "berita_acara" ? "Berita Acara dihapus" : "Penawaran dihapus" });
});

export default router;
