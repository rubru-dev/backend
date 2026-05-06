import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requirePermission, requireRole } from "../middleware/requireRole";

const router = Router();

function fmtDate(d: Date | null | undefined) {
  return d ? d.toISOString().split("T")[0] : null;
}

function sopDict(sop: {
  id: bigint;
  nama_sop: string;
  role: string | null;
  tanggal: Date;
  deskripsi: string;
  created_by: bigint | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: Number(sop.id),
    nama_sop: sop.nama_sop,
    role: sop.role,
    tanggal: fmtDate(sop.tanggal),
    deskripsi: sop.deskripsi,
    created_by: sop.created_by ? Number(sop.created_by) : null,
    created_at: sop.created_at,
    updated_at: sop.updated_at,
  };
}

router.get("/sop", requirePermission("tutorial", "sop"), async (_req: Request, res: Response) => {
  const items = await prisma.sop.findMany({ orderBy: [{ tanggal: "desc" }, { id: "desc" }] });
  return res.json(items.map(sopDict));
});

router.get("/sop/:id", requirePermission("tutorial", "sop"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sop = await prisma.sop.findUnique({ where: { id } });
  if (!sop) return res.status(404).json({ detail: "SOP tidak ditemukan" });
  return res.json(sopDict(sop));
});

router.post("/sop", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const { nama_sop, role, tanggal, deskripsi } = req.body;
  if (!nama_sop?.trim() || !tanggal || !deskripsi?.trim()) {
    return res.status(400).json({ detail: "Nama SOP, tanggal, dan deskripsi wajib diisi" });
  }
  const sop = await prisma.sop.create({
    data: {
      nama_sop: nama_sop.trim(),
      role: role?.trim() || null,
      tanggal: new Date(tanggal),
      deskripsi: deskripsi.trim(),
      created_by: req.user!.id,
    },
  });
  return res.status(201).json(sopDict(sop));
});

router.patch("/sop/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sop = await prisma.sop.findUnique({ where: { id } });
  if (!sop) return res.status(404).json({ detail: "SOP tidak ditemukan" });

  const { nama_sop, role, tanggal, deskripsi } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_sop !== undefined) updates.nama_sop = String(nama_sop).trim();
  if (role !== undefined) updates.role = role ? String(role).trim() : null;
  if (tanggal !== undefined) updates.tanggal = new Date(tanggal);
  if (deskripsi !== undefined) updates.deskripsi = String(deskripsi).trim();

  const updated = await prisma.sop.update({ where: { id }, data: updates });
  return res.json(sopDict(updated));
});

router.delete("/sop/:id", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const sop = await prisma.sop.findUnique({ where: { id } });
  if (!sop) return res.status(404).json({ detail: "SOP tidak ditemukan" });
  await prisma.sop.delete({ where: { id } });
  return res.json({ message: "SOP dihapus" });
});

export default router;
