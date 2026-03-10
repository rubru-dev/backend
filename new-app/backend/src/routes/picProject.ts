import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /proyek-berjalan
router.get("/proyek-berjalan", async (req: Request, res: Response) => {
  const user = req.user!;
  const userRoles = user.roles.map((r) => r.role.name);
  const isSuperAdmin = userRoles.includes("Super Admin");

  const where = isSuperAdmin ? {} : { created_by: user.id };
  const items = await prisma.proyekBerjalan.findMany({
    where,
    include: { lead: true, pic: true },
    orderBy: { id: "desc" },
  });

  return res.json(
    items.map((p) => ({
      id: p.id,
      lokasi: p.lokasi,
      nilai_rab: parseFloat(String(p.nilai_rab ?? 0)),
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      lead: p.lead ? { nama: p.lead.nama } : null,
      pic: p.pic ? { name: p.pic.name } : null,
    }))
  );
});

// PATCH /proyek-berjalan/:id/progress
router.patch("/proyek-berjalan/:id/progress", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nilai_rab, tanggal_selesai, lokasi } = req.body;
  const user = req.user!;
  const userRoles = user.roles.map((r) => r.role.name);

  const p = await prisma.proyekBerjalan.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });

  if (!userRoles.includes("Super Admin") && p.created_by !== user.id) {
    return res.status(403).json({ detail: "Tidak memiliki akses ke proyek ini" });
  }

  const updates: Record<string, unknown> = {};
  if (nilai_rab !== undefined) updates.nilai_rab = nilai_rab;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (lokasi !== undefined) updates.lokasi = lokasi;

  if (Object.keys(updates).length > 0) {
    await prisma.proyekBerjalan.update({ where: { id }, data: updates });
  }
  return res.json({ message: "Proyek diupdate" });
});

export default router;
