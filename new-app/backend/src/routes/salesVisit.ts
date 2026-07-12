import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";
import { reverseGeocode, numOrNull } from "../lib/reverseGeocode";

const router = Router();

// ── Upload foto absen visit ─────────────────────────────────────────────────────
const visitDir = path.resolve(config.storagePath, "sales-visit");
if (!fs.existsSync(visitDir)) fs.mkdirSync(visitDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, visitDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//i.test(file.mimetype)),
});

// GET / — daftar jadwal visit (frontend filter per bulan)
router.get("/", async (_req: Request, res: Response) => {
  const rows = await prisma.salesVisitAttendance.findMany({ orderBy: { tanggal: "desc" } });
  return res.json(rows);
});

// POST / — Tambah Jadwal visit (lead + tanggal + jam)
router.post("/", async (req: Request, res: Response) => {
  const { lead_id, client_nama, tanggal, jam } = req.body;
  if (!lead_id || !tanggal) return res.status(400).json({ detail: "Client dan tanggal wajib diisi." });
  const row = await prisma.salesVisitAttendance.create({
    data: {
      lead_id: BigInt(lead_id),
      client_nama: client_nama ?? null,
      tanggal: new Date(tanggal),
      jam: jam || null,
      created_by: req.user?.id ?? null,
    },
  });
  return res.status(201).json(row);
});

// PATCH /:id — update jadwal / keterangan hasil
router.patch("/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { tanggal, jam, keterangan_hasil } = req.body;
  const data: any = {};
  if (tanggal !== undefined) data.tanggal = tanggal ? new Date(tanggal) : null;
  if (jam !== undefined) data.jam = jam || null;
  if (keterangan_hasil !== undefined) data.keterangan_hasil = keterangan_hasil || null;
  const row = await prisma.salesVisitAttendance.update({ where: { id }, data });
  return res.json(row);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.salesVisitAttendance.delete({ where: { id: BigInt(req.params.id) } });
  return res.json({ ok: true });
});

async function clock(id: bigint, type: "in" | "out", req: Request) {
  const lat = numOrNull(req.body.lat);
  const lng = numOrNull(req.body.lng);
  const photo = (req as any).file ? `/storage/sales-visit/${(req as any).file.filename}` : null;
  const location = lat != null && lng != null ? await reverseGeocode(lat, lng) : null;
  const now = new Date();
  const data =
    type === "in"
      ? { clock_in_photo: photo, clock_in_at: now, clock_in_lat: lat, clock_in_lng: lng, clock_in_location: location }
      : { clock_out_photo: photo, clock_out_at: now, clock_out_lat: lat, clock_out_lng: lng, clock_out_location: location };
  return prisma.salesVisitAttendance.update({ where: { id }, data });
}

// POST /:id/clock-in
router.post("/:id/clock-in", upload.single("photo"), async (req: Request, res: Response) => {
  const row = await clock(BigInt(req.params.id), "in", req);
  return res.json(row);
});

// POST /:id/clock-out
router.post("/:id/clock-out", upload.single("photo"), async (req: Request, res: Response) => {
  const existing = await prisma.salesVisitAttendance.findUnique({ where: { id: BigInt(req.params.id) } });
  if (!existing?.clock_in_at) return res.status(400).json({ detail: "Harus clock in terlebih dahulu." });
  const row = await clock(BigInt(req.params.id), "out", req);
  return res.json(row);
});

export default router;
