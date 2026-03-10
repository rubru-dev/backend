import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";
import { getPagination, paginateResponse } from "../middleware/pagination";

const router = Router();

// ── Multer for laporan docs ────────────────────────────────────────────────────
const laporanDocsDir = path.resolve(config.storagePath, "laporan-docs");
if (!fs.existsSync(laporanDocsDir)) fs.mkdirSync(laporanDocsDir, { recursive: true });
const docsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, laporanDocsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Tipe file tidak diizinkan. Hanya PDF, gambar, dan dokumen Office yang diperbolehkan."));
  }
};
const docsUpload = multer({ storage: docsStorage, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter });

// GET /users (for user select dropdown)
router.get("/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return res.json(users.map((u) => ({ id: u.id, name: u.name })));
});

// GET /
router.get("/", async (req: Request, res: Response) => {
  const { modul, tanggal_mulai, tanggal_selesai, user_id } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const where: Record<string, unknown> = {};
  if (modul) where.modul = modul;
  if (tanggal_mulai) where.tanggal_mulai = { gte: new Date(tanggal_mulai as string) };
  if (tanggal_selesai) where.tanggal_selesai = { lte: new Date(tanggal_selesai as string) };
  if (user_id) where.user_id = parseInt(user_id as string);

  const [total, items] = await Promise.all([
    prisma.laporanHarian.count({ where }),
    prisma.laporanHarian.findMany({
      where,
      include: { user: true },
      orderBy: [{ tanggal_mulai: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  const mapped = items.map((lap) => ({
    id: lap.id,
    modul: lap.modul,
    tanggal_mulai: lap.tanggal_mulai,
    tanggal_selesai: lap.tanggal_selesai,
    kegiatan: lap.kegiatan,
    kendala: lap.kendala,
    user: lap.user ? { id: lap.user.id, name: lap.user.name } : null,
    created_at: lap.created_at,
  }));
  return res.json(paginateResponse(mapped, total, page, limit));
});

// POST /
router.post("/", async (req: Request, res: Response) => {
  const { modul, tanggal_mulai, tanggal_selesai, kegiatan, kendala, user_id } = req.body;
  const uid = user_id ?? req.user!.id;
  const lap = await prisma.laporanHarian.create({
    data: {
      modul,
      tanggal_mulai: new Date(tanggal_mulai),
      tanggal_selesai: new Date(tanggal_selesai),
      kegiatan,
      kendala: kendala ?? null,
      user_id: uid,
    },
  });
  return res.status(201).json({ id: lap.id, message: "Laporan harian disimpan" });
});

// DELETE /:id
router.delete("/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const lap = await prisma.laporanHarian.findUnique({ where: { id } });
  if (!lap) return res.status(404).json({ detail: "Laporan tidak ditemukan" });
  await prisma.laporanHarian.delete({ where: { id } });
  return res.json({ message: "Laporan dihapus" });
});

// ── Docs / Link / Catatan per laporan ─────────────────────────────────────────

// GET /:id/docs
router.get("/:id/docs", async (req: Request, res: Response) => {
  const linkableId = BigInt(req.params.id);
  const docs = await prisma.projectLink.findMany({
    where: { linkable_type: "laporan_harian", linkable_id: linkableId },
    orderBy: { created_at: "asc" },
    include: { users: { select: { id: true, name: true } } },
  });
  return res.json(docs.map((d) => ({ ...d, id: String(d.id), linkable_id: String(d.linkable_id), created_by: d.created_by ? String(d.created_by) : null })));
});

// POST /:id/docs (supports JSON url OR file upload)
router.post("/:id/docs", docsUpload.single("file"), async (req: Request, res: Response) => {
  const linkableId = BigInt(req.params.id);
  const { title, catatan } = req.body;
  let url: string = req.body.url ?? "";
  if (req.file) url = `/storage/laporan-docs/${req.file.filename}`;
  if (!title) return res.status(400).json({ detail: "title wajib diisi" });
  if (!url) return res.status(400).json({ detail: "url atau file wajib diisi" });
  const doc = await prisma.projectLink.create({
    data: { linkable_type: "laporan_harian", linkable_id: linkableId, title, url, catatan: catatan || null, created_by: (req as any).user?.id ?? null },
  });
  return res.json({ ...doc, id: String(doc.id), linkable_id: String(doc.linkable_id), created_by: doc.created_by ? String(doc.created_by) : null });
});

// DELETE /docs/:docId
router.delete("/docs/:docId", async (req: Request, res: Response) => {
  const id = BigInt(req.params.docId);
  const doc = await prisma.projectLink.findUnique({ where: { id } });
  if (doc?.url?.startsWith("/storage/laporan-docs/")) {
    const filePath = path.resolve(config.storagePath, doc.url.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await prisma.projectLink.delete({ where: { id } });
  return res.json({ message: "OK" });
});

export default router;
