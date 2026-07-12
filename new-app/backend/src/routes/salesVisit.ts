import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";

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

// Reverse geocode lat/lng → nama lokasi (OpenStreetMap Nominatim, gratis tanpa key)
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`;
    const r = await fetch(url, { headers: { "User-Agent": "RubahRumah-ERP/1.0 (visit-attendance)" } });
    if (!r.ok) return null;
    const j: any = await r.json();
    return j?.display_name ?? null;
  } catch {
    return null;
  }
}

function numOrNull(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

// GET / — daftar absensi (frontend map by lead_id untuk status di kalender)
router.get("/", async (_req: Request, res: Response) => {
  const rows = await prisma.salesVisitAttendance.findMany({ orderBy: { updated_at: "desc" } });
  return res.json(rows);
});

async function upsertClock(leadId: bigint, type: "in" | "out", req: Request) {
  const lat = numOrNull(req.body.lat);
  const lng = numOrNull(req.body.lng);
  const photo = (req as any).file ? `/storage/sales-visit/${(req as any).file.filename}` : null;
  const location = lat != null && lng != null ? await reverseGeocode(lat, lng) : null;
  const now = new Date();
  const data =
    type === "in"
      ? { clock_in_photo: photo, clock_in_at: now, clock_in_lat: lat, clock_in_lng: lng, clock_in_location: location }
      : { clock_out_photo: photo, clock_out_at: now, clock_out_lat: lat, clock_out_lng: lng, clock_out_location: location };
  return prisma.salesVisitAttendance.upsert({
    where: { lead_id: leadId },
    create: { lead_id: leadId, ...data },
    update: data,
  });
}

// POST /:leadId/clock-in — foto + lat + lng
router.post("/:leadId/clock-in", upload.single("photo"), async (req: Request, res: Response) => {
  const row = await upsertClock(BigInt(req.params.leadId), "in", req);
  return res.json(row);
});

// POST /:leadId/clock-out
router.post("/:leadId/clock-out", upload.single("photo"), async (req: Request, res: Response) => {
  const existing = await prisma.salesVisitAttendance.findUnique({ where: { lead_id: BigInt(req.params.leadId) } });
  if (!existing?.clock_in_at) return res.status(400).json({ detail: "Harus clock in terlebih dahulu." });
  const row = await upsertClock(BigInt(req.params.leadId), "out", req);
  return res.json(row);
});

export default router;
