import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { triggerEventReminder } from "../lib/fontee";

const router = Router();
const TYPES = new Set(["desain", "rkr", "golden", "filter-air"]);
const KINDS = new Set(["offer", "discount"]);

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

  await ensureTable();
  const id = String(data.id || randomUUID());
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
  triggerEventReminder("penawaran_baru", {
    jenis: type,
    kind,
    nama: String(data.klien ?? data.nama ?? data.client ?? "—"),
  }).catch(() => {});
  return res.status(201).json(result);
});

router.delete("/offers/:id", async (req: Request, res: Response) => {
  await ensureTable();
  const id = String(req.params.id);
  await prisma.$executeRaw`DELETE FROM penawaran_offers WHERE id = ${id}`;
  return res.json({ message: "Penawaran dihapus" });
});

export default router;
