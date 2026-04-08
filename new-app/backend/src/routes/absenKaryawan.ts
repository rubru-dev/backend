import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
import { config } from "../config";

const router = Router();

// ── Haversine: hitung jarak (meter) antara dua koordinat ──────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Simpan foto base64 ke disk ────────────────────────────────────────────────
function saveBase64Photo(dataUrl: string, dir: string): string {
  const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) throw new Error("Format foto tidak valid");
  const ext = matches[1].split("/")[1] === "jpeg" ? "jpg" : matches[1].split("/")[1];
  const buffer = Buffer.from(matches[2], "base64");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/storage/absen-karyawan/${filename}`;
}

// ── GET /absen-karyawan/config — config kantor (public, semua karyawan bisa baca) ──
router.get("/config", async (_req: Request, res: Response) => {
  let cfg = await prisma.absenKaryawanConfig.findUnique({ where: { id: 1 } });
  if (!cfg) {
    cfg = await prisma.absenKaryawanConfig.create({ data: { id: 1 } });
  }
  return res.json(cfg);
});

// ── GET /absen-karyawan/today — record absen hari ini milik user ──────────────
router.get("/today", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await prisma.absenKaryawan.findUnique({
    where: { user_id_tanggal: { user_id: userId, tanggal: today } },
  });
  return res.json(record ?? null);
});

// ── GET /absen-karyawan/history — riwayat absen user (30 hari terakhir) ───────
router.get("/history", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const records = await prisma.absenKaryawan.findMany({
    where: { user_id: userId, tanggal: { gte: since } },
    orderBy: { tanggal: "desc" },
  });
  return res.json(records);
});

// ── POST /absen-karyawan/check-in ─────────────────────────────────────────────
router.post("/check-in", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { foto_masuk, lat, lng, alasan_luar } = req.body;
  if (!foto_masuk) return res.status(400).json({ detail: "Foto wajib diisi" });

  // Load config
  let cfg = await prisma.absenKaryawanConfig.findUnique({ where: { id: 1 } });
  if (!cfg) cfg = await prisma.absenKaryawanConfig.create({ data: { id: 1 } });

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Cek sudah absen masuk hari ini
  const existing = await prisma.absenKaryawan.findUnique({
    where: { user_id_tanggal: { user_id: userId, tanggal: today } },
  });
  if (existing?.foto_masuk) return res.status(400).json({ detail: "Anda sudah absen masuk hari ini" });

  // Hitung jarak dari kantor
  const jarak = (lat != null && lng != null)
    ? haversine(Number(lat), Number(lng), cfg.kantor_lat, cfg.kantor_lng)
    : null;
  const diLuarKantor = jarak != null ? jarak > cfg.radius_meter : false;

  // Cek keterlambatan
  const [awalH, awalM] = cfg.jam_masuk_akhir.split(":").map(Number);
  const batas = new Date(today);
  batas.setHours(awalH, awalM, 0, 0);
  const terlambat = now > batas;

  // Status
  let status = "Hadir";
  if (diLuarKantor) {
    if (!alasan_luar) return res.status(400).json({ detail: "Wajib isi alasan karena berada di luar kantor" });
    status = "Pending";
  } else if (terlambat) {
    status = "Terlambat";
  }

  // Simpan foto
  const photoDir = path.resolve(config.storagePath, "absen-karyawan");
  const filePath = saveBase64Photo(foto_masuk, photoDir);

  const data = {
    user_id: userId,
    tanggal: today,
    foto_masuk: filePath,
    jam_masuk: now,
    lat_masuk: lat != null ? Number(lat) : null,
    lng_masuk: lng != null ? Number(lng) : null,
    jarak_masuk: jarak,
    terlambat,
    di_luar_kantor: diLuarKantor,
    alasan_luar: diLuarKantor ? (alasan_luar as string) : null,
    status,
  };

  const record = existing
    ? await prisma.absenKaryawan.update({ where: { id: existing.id }, data })
    : await prisma.absenKaryawan.create({ data });

  return res.status(201).json(record);
});

// ── POST /absen-karyawan/check-out ────────────────────────────────────────────
router.post("/check-out", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { foto_keluar, lat, lng } = req.body;
  if (!foto_keluar) return res.status(400).json({ detail: "Foto wajib diisi" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.absenKaryawan.findUnique({
    where: { user_id_tanggal: { user_id: userId, tanggal: today } },
  });
  if (!record) return res.status(400).json({ detail: "Belum absen masuk hari ini" });
  if (record.foto_keluar) return res.status(400).json({ detail: "Anda sudah absen keluar hari ini" });

  let cfg = await prisma.absenKaryawanConfig.findUnique({ where: { id: 1 } });
  if (!cfg) cfg = await prisma.absenKaryawanConfig.create({ data: { id: 1 } });

  const jarak = (lat != null && lng != null)
    ? haversine(Number(lat), Number(lng), cfg.kantor_lat, cfg.kantor_lng)
    : null;

  const photoDir = path.resolve(config.storagePath, "absen-karyawan");
  const filePath = saveBase64Photo(foto_keluar, photoDir);

  const updated = await prisma.absenKaryawan.update({
    where: { id: record.id },
    data: {
      foto_keluar: filePath,
      jam_keluar: new Date(),
      lat_keluar: lat != null ? Number(lat) : null,
      lng_keluar: lng != null ? Number(lng) : null,
      jarak_keluar: jarak,
    },
  });
  return res.json(updated);
});

// ── GET /absen-karyawan/admin/list — semua absen (admin/head finance) ──────────
router.get("/admin/list", async (req: Request, res: Response) => {
  const { tanggal, tanggal_mulai, tanggal_selesai, bulan, tahun, user_id, status, page = "1", per_page = "100" } = req.query;
  const skip = (Number(page) - 1) * Number(per_page);

  const where: any = {};
  if (tanggal) {
    const d = new Date(tanggal as string);
    d.setHours(0, 0, 0, 0);
    where.tanggal = d;
  } else if (tanggal_mulai || tanggal_selesai) {
    where.tanggal = {};
    if (tanggal_mulai) {
      const d = new Date(tanggal_mulai as string); d.setHours(0, 0, 0, 0);
      where.tanggal.gte = d;
    }
    if (tanggal_selesai) {
      const d = new Date(tanggal_selesai as string); d.setHours(23, 59, 59, 999);
      where.tanggal.lte = d;
    }
  } else if (bulan || tahun) {
    const year = tahun ? parseInt(tahun as string) : new Date().getFullYear();
    const month = bulan ? parseInt(bulan as string) : null;
    if (month) {
      where.tanggal = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) };
    } else {
      where.tanggal = { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) };
    }
  }
  if (user_id) where.user_id = BigInt(user_id as string);
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.absenKaryawan.findMany({
      where,
      include: { user: { select: { id: true, name: true } }, approver: { select: { name: true } } },
      orderBy: [{ tanggal: "desc" }, { jam_masuk: "desc" }],
      skip,
      take: Number(per_page),
    }),
    prisma.absenKaryawan.count({ where }),
  ]);
  return res.json({ items, total, page: Number(page), per_page: Number(per_page) });
});

// ── GET /absen-karyawan/admin/pending — approval luar kantor ──────────────────
router.get("/admin/pending", async (_req: Request, res: Response) => {
  const items = await prisma.absenKaryawan.findMany({
    where: { status: "Pending" },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { tanggal: "desc" },
  });
  return res.json(items);
});

// ── PATCH /absen-karyawan/admin/:id/approve ───────────────────────────────────
router.patch("/admin/:id/approve", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const approverId = req.user!.id;
  const record = await prisma.absenKaryawan.findUnique({ where: { id } });
  if (!record) return res.status(404).json({ detail: "Record tidak ditemukan" });
  if (record.status !== "Pending") return res.status(400).json({ detail: "Hanya bisa approve status Pending" });

  const updated = await prisma.absenKaryawan.update({
    where: { id },
    data: {
      status: record.terlambat ? "Terlambat" : "Disetujui",
      approved_by: approverId,
      approved_at: new Date(),
      catatan_reject: null,
    },
  });
  return res.json(updated);
});

// ── PATCH /absen-karyawan/admin/:id/reject ────────────────────────────────────
router.patch("/admin/:id/reject", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const approverId = req.user!.id;
  const { catatan } = req.body;
  const record = await prisma.absenKaryawan.findUnique({ where: { id } });
  if (!record) return res.status(404).json({ detail: "Record tidak ditemukan" });
  if (record.status !== "Pending") return res.status(400).json({ detail: "Hanya bisa reject status Pending" });

  const updated = await prisma.absenKaryawan.update({
    where: { id },
    data: {
      status: "Ditolak",
      approved_by: approverId,
      approved_at: new Date(),
      catatan_reject: catatan || null,
    },
  });
  return res.json(updated);
});

// ── PUT /absen-karyawan/admin/config — update konfigurasi kantor ──────────────
router.put("/admin/config", async (req: Request, res: Response) => {
  const { kantor_lat, kantor_lng, radius_meter, jam_masuk_awal, jam_masuk_akhir, jam_pulang } = req.body;
  const cfg = await prisma.absenKaryawanConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      kantor_lat: Number(kantor_lat),
      kantor_lng: Number(kantor_lng),
      radius_meter: Number(radius_meter),
      jam_masuk_awal: jam_masuk_awal,
      jam_masuk_akhir: jam_masuk_akhir,
      jam_pulang: jam_pulang,
    },
    update: {
      kantor_lat: Number(kantor_lat),
      kantor_lng: Number(kantor_lng),
      radius_meter: Number(radius_meter),
      jam_masuk_awal: jam_masuk_awal,
      jam_masuk_akhir: jam_masuk_akhir,
      jam_pulang: jam_pulang,
      updated_at: new Date(),
    },
  });
  return res.json(cfg);
});

// ── GET /absen-karyawan/admin/karyawan-list — daftar user untuk filter ────────
router.get("/admin/karyawan-list", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.json(users.map((u) => ({ id: String(u.id), name: u.name })));
});

export default router;
