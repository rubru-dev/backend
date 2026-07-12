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
  if (tanggal_selesai) {
    // sertakan sampai akhir hari agar laporan di tanggal terakhir tidak terpotong
    const end = new Date(tanggal_selesai as string);
    end.setHours(23, 59, 59, 999);
    where.tanggal_selesai = { lte: end };
  }
  if (user_id) where.user_id = parseInt(user_id as string);

  // Saat difilter per periode (rentang tanggal), tampilkan SELURUH data periode itu —
  // bukan dipotong pagination 20-baris. Tanpa filter tanggal, tetap paginasi demi kecepatan.
  const hasDateFilter = !!(tanggal_mulai || tanggal_selesai);

  const [total, items] = await Promise.all([
    prisma.laporanHarian.count({ where }),
    prisma.laporanHarian.findMany({
      where,
      include: { user: true },
      orderBy: [{ tanggal_mulai: "desc" }, { id: "desc" }],
      skip: hasDateFilter ? undefined : skip,
      take: hasDateFilter ? undefined : limit,
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

const LEAD_MODUL_TO_MODUL: Record<string, string> = {
  "sales-admin": "Sales Admin",
  "telemarketing": "Telemarketing",
  "golden": "Golden",
};

function isoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

// GET /follow-up-summary — ringkasan follow-up per tanggal per user (untuk tab laporan harian)
router.get("/follow-up-summary", async (req: Request, res: Response) => {
  const { lead_modul, tanggal_mulai, tanggal_selesai, user_id, bulan, tahun } = req.query;
  if (!lead_modul) return res.json([]);

  const where: Record<string, unknown> = {
    lead: { modul: lead_modul as string },
  };

  // bulan+tahun takes priority over date range
  const bulanNum = bulan ? parseInt(bulan as string) : undefined;
  const tahunNum = tahun ? parseInt(tahun as string) : undefined;

  if (bulanNum && tahunNum) {
    const m = bulanNum - 1;
    where.tanggal = { gte: new Date(tahunNum, m, 1), lte: new Date(tahunNum, m + 1, 0) };
  } else if (tahunNum) {
    where.tanggal = { gte: new Date(tahunNum, 0, 1), lte: new Date(tahunNum, 11, 31) };
  } else if (tanggal_mulai || tanggal_selesai) {
    const dateFilter: Record<string, Date> = {};
    if (tanggal_mulai) dateFilter.gte = new Date(tanggal_mulai as string);
    if (tanggal_selesai) {
      const d = new Date(tanggal_selesai as string);
      d.setHours(23, 59, 59, 999);
      dateFilter.lte = d;
    }
    where.tanggal = dateFilter;
  }

  if (user_id) where.user_id = BigInt(user_id as string);

  const followUps = await prisma.followUpClient.findMany({
    where,
    include: {
      lead: { select: { id: true, nama: true, tanggal_masuk: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    take: 2000,
  });

  // Group by date + user
  const grouped: Record<string, any> = {};
  for (const fu of followUps) {
    const dateStr = isoDate(fu.tanggal) ?? "unknown";
    const userId = fu.user_id ? String(fu.user_id) : "unknown";
    const key = `${dateStr}_${userId}`;
    if (!grouped[key]) {
      grouped[key] = {
        tanggal: dateStr,
        user: fu.user ? { id: String(fu.user.id), name: fu.user.name } : null,
        follow_ups: [],
        laporan_harian: null,
      };
    }
    grouped[key].follow_ups.push({
      id: String(fu.id),
      lead_id: String(fu.lead_id),
      lead_nama: fu.lead?.nama ?? "—",
      catatan: fu.catatan ?? null,
      next_follow_up: isoDate(fu.next_follow_up as Date | null),
      // tanggal input lead — untuk memisah "leads baru hari ini" vs "follow-up leads lama"
      lead_tanggal_masuk: isoDate(fu.lead?.tanggal_masuk as Date | null),
    });
  }

  // Join laporan harian entries per date+user group
  const modul = LEAD_MODUL_TO_MODUL[lead_modul as string];
  const uniqueDates = [...new Set(
    Object.values(grouped).map((g: any) => g.tanggal).filter((d: string) => d !== "unknown")
  )].sort() as string[];
  const uniqueUserIds = [...new Set(
    Object.values(grouped).map((g: any) => g.user?.id).filter(Boolean)
  )].map((id: any) => BigInt(id));

  if (modul && uniqueDates.length > 0) {
    const laporans = await prisma.laporanHarian.findMany({
      where: {
        modul,
        tanggal_mulai: {
          gte: new Date(uniqueDates[0]),
          lte: new Date(uniqueDates[uniqueDates.length - 1] + "T23:59:59"),
        },
        ...(uniqueUserIds.length > 0 ? { user_id: { in: uniqueUserIds } } : {}),
      },
      orderBy: { tanggal_mulai: "asc" },
    });
    for (const lap of laporans) {
      const dateStr = isoDate(lap.tanggal_mulai) ?? "";
      const userId = String(lap.user_id);
      const key = `${dateStr}_${userId}`;
      if (grouped[key] && !grouped[key].laporan_harian) {
        grouped[key].laporan_harian = {
          id: String(lap.id),
          kegiatan: lap.kegiatan,
          kendala: lap.kendala ?? null,
        };
      }
    }
  }

  const result = Object.values(grouped).sort((a: any, b: any) =>
    b.tanggal > a.tanggal ? 1 : b.tanggal < a.tanggal ? -1 : 0
  );
  return res.json(result);
});

// GET /follow-up-stats — ringkasan Summary Follow Up per bulan (untuk tab Summary Follow Up)
function weekOfMonthNum(d: Date): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, Math.ceil(d.getDate() / 7))) as 1 | 2 | 3 | 4;
}
type WeekDetail = {
  leads_masuk: { id: string; nama: string }[];
  follow_ups: { lead_id: string; lead_nama: string; catatan: string | null; tanggal: string | null }[];
  closing_survey: { id: string; nama: string }[];
};
const emptyWeeks = (): Record<"W1" | "W2" | "W3" | "W4", WeekDetail> => ({
  W1: { leads_masuk: [], follow_ups: [], closing_survey: [] },
  W2: { leads_masuk: [], follow_ups: [], closing_survey: [] },
  W3: { leads_masuk: [], follow_ups: [], closing_survey: [] },
  W4: { leads_masuk: [], follow_ups: [], closing_survey: [] },
});

router.get("/follow-up-stats", async (req: Request, res: Response) => {
  const { lead_modul } = req.query;
  const bulan = req.query.bulan ? parseInt(req.query.bulan as string) : new Date().getMonth() + 1;
  const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : new Date().getFullYear();
  const base = { total_follow_up: 0, total_leads_followed: 0, total_leads: 0, closing_survey: 0, weeks: emptyWeeks() };
  if (!lead_modul) return res.json(base);

  const start = new Date(tahun, bulan - 1, 1);
  const end = new Date(tahun, bulan, 0, 23, 59, 59, 999);

  const [leads, fus, surveys] = await Promise.all([
    prisma.lead.findMany({
      where: { modul: lead_modul as string, tanggal_masuk: { gte: start, lte: end } },
      select: { id: true, nama: true, tanggal_masuk: true },
    }),
    prisma.followUpClient.findMany({
      where: { lead: { modul: lead_modul as string }, tanggal: { gte: start, lte: end } },
      select: { tanggal: true, lead_id: true, catatan: true, lead: { select: { nama: true } } },
      orderBy: { tanggal: "asc" },
    }),
    prisma.lead.findMany({
      where: { modul: lead_modul as string, rencana_survey: "Ya", tanggal_survey: { gte: start, lte: end } },
      select: { id: true, nama: true, tanggal_survey: true },
    }),
  ]);

  const weeks = emptyWeeks();
  const wk = (d: Date) => `W${weekOfMonthNum(d)}` as keyof typeof weeks;
  for (const l of leads) if (l.tanggal_masuk) weeks[wk(l.tanggal_masuk)].leads_masuk.push({ id: String(l.id), nama: l.nama });
  const distinctLeads = new Set<string>();
  for (const fu of fus) {
    if (!fu.tanggal) continue;
    weeks[wk(fu.tanggal)].follow_ups.push({
      lead_id: String(fu.lead_id), lead_nama: fu.lead?.nama ?? "—",
      catatan: fu.catatan ?? null, tanggal: isoDate(fu.tanggal),
    });
    if (fu.lead_id != null) distinctLeads.add(String(fu.lead_id));
  }
  for (const s of surveys) if (s.tanggal_survey) weeks[wk(s.tanggal_survey)].closing_survey.push({ id: String(s.id), nama: s.nama });

  return res.json({
    total_follow_up: fus.length,
    total_leads_followed: distinctLeads.size,
    total_leads: leads.length,
    closing_survey: surveys.length,
    weeks,
  });
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
