import { Router } from "express";
import prisma from "../prisma";
import { authenticate, type AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// List — ringan, tanpa payload `data` (bisa besar karena berisi gambar base64)
router.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.drawLayout.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
      },
    });
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

// Detail — termasuk `data` (shapes)
router.get("/:id", async (req, res, next) => {
  try {
    const row = await prisma.drawLayout.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: "Layout tidak ditemukan" });
    res.json({ data: row });
  } catch (e) {
    next(e);
  }
});

// Buat layout baru (cukup nama; data kosong)
router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ error: "Nama layout wajib diisi." });
    const row = await prisma.drawLayout.create({
      data: {
        name,
        data: req.body?.data ?? {},
        createdById: req.user?.id ?? null,
      },
    });
    res.status(201).json({ data: row });
  } catch (e) {
    next(e);
  }
});

// Simpan / update (nama dan/atau data)
router.put("/:id", async (req, res, next) => {
  try {
    const patch: { name?: string; data?: any } = {};
    if (typeof req.body?.name === "string") {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ error: "Nama layout tidak boleh kosong." });
      patch.name = name;
    }
    if (req.body?.data !== undefined) patch.data = req.body.data;
    const row = await prisma.drawLayout.update({ where: { id: req.params.id }, data: patch });
    res.json({ data: row });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.drawLayout.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
