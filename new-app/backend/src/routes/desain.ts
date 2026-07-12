import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";
import { sendFonntToRoles, FRONTEND_URL } from "../lib/fontee";

const router = Router();

const DEFAULT_PEKERJAAN = [
  "Pembuatan Layout Eksisting & Perubahan",
  "Pembuatan Fasad 3D",
  "Shop Drawing",
  "Pembuatan 3D Interior",
  "Pembuatan RAB",
];

const KANBAN_PAKET_STAGES = [
  "Pembuatan Layout Eksisting & Perubahan",
  "Pembuatan Fasad 3D",
  "Shop Drawing",
  "Pembuatan 3D Interior",
  "Pembuatan RAB",
];

// Template item pekerjaan + durasi (hari) per jenis desain. Timeline dibuat otomatis dari tanggal mulai.
const TIMELINE_TEMPLATES: Record<string, { nama: string; durasi: number }[]> = {
  Basic: [
    { nama: "Pembuatan Layout Eksisting & Perubahan", durasi: 2 },
    { nama: "Shop Drawing", durasi: 1 },
    { nama: "3D Interior", durasi: 2 },
    { nama: "Pembuatan RAB", durasi: 2 },
  ],
  Standart: [
    { nama: "Pembuatan Layout Eksisting & Perubahan", durasi: 2 },
    { nama: "Pembuatan Fasad 3D", durasi: 3 },
    { nama: "Shop Drawing", durasi: 2 },
    { nama: "3D Interior", durasi: 5 },
    { nama: "Pembuatan RAB", durasi: 2 },
  ],
  Premium: [
    { nama: "Pembuatan Layout Eksisting & Perubahan", durasi: 2 },
    { nama: "Pembuatan Fasad 3D", durasi: 5 },
    { nama: "Shop Drawing", durasi: 4 },
    { nama: "3D Interior", durasi: 6 },
    { nama: "Pembuatan RAB", durasi: 4 },
  ],
  Deluxe: [
    { nama: "Pembuatan Layout Eksisting & Perubahan", durasi: 3 },
    { nama: "Pembuatan Fasad 3D", durasi: 5 },
    { nama: "Shop Drawing", durasi: 5 },
    { nama: "3D Interior", durasi: 8 },
    { nama: "Pembuatan RAB", durasi: 3 },
  ],
};

// Bangun daftar item timeline dengan tanggal berurutan dari tanggal mulai (durasi hari inklusif per item).
function buildTimelineItems(jenis: string | null, start: Date | null) {
  const tpl = (jenis && TIMELINE_TEMPLATES[jenis]) || DEFAULT_PEKERJAAN.map((nama) => ({ nama, durasi: 0 }));
  let cursor = start ? new Date(start) : null;
  const items = tpl.map(({ nama, durasi }) => {
    let mulai: Date | null = null;
    let selesai: Date | null = null;
    if (cursor && durasi > 0) {
      mulai = new Date(cursor);
      selesai = new Date(cursor);
      selesai.setDate(selesai.getDate() + durasi - 1);
      cursor = new Date(selesai);
      cursor.setDate(cursor.getDate() + 1);
    }
    return { item_pekerjaan: nama, status: "Belum Mulai", tanggal_mulai: mulai, target_selesai: selesai };
  });
  const end = items.length ? items[items.length - 1].target_selesai : null;
  return { items, end };
}

const BULAN_NAMES = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function calcProgress(items: { status: string | null }[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.status === "Selesai").length;
  return Math.round((done / items.length) * 100);
}

function fmtDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

// ── Multer setup ──────────────────────────────────────────────────────────────
const desainUploadDir = path.resolve(config.storagePath, "desain");
if (!fs.existsSync(desainUploadDir)) fs.mkdirSync(desainUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, desainUploadDir),
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
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter });

// GET /employees
router.get("/employees", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.json(users.map((u) => ({ id: u.id, nama: u.name })));
});

// GET /timeline
router.get("/timeline", async (req: Request, res: Response) => {
  const jenis_desain = req.query.jenis_desain as string | undefined;
  const where: Record<string, unknown> = {};
  if (jenis_desain) where.jenis_desain = jenis_desain;

  const timelines = await prisma.desainTimeline.findMany({
    where,
    include: {
      items: { include: { user: { select: { id: true, name: true } } } },
      lead: true,
      ro: { select: { id: true, name: true } },
    },
    orderBy: { id: "desc" },
  });

  return res.json(
    timelines.map((t) => ({
      id: t.id,
      jenis_desain: t.jenis_desain,
      bulan: t.bulan,
      tahun: t.tahun,
      tanggal_mulai: fmtDate(t.tanggal_mulai),
      tanggal_selesai: fmtDate(t.tanggal_selesai),
      lead: t.lead ? { id: t.lead.id, nama: t.lead.nama } : null,
      ro: t.ro ? { id: String(t.ro.id), nama: t.ro.name } : null,
      jumlah_item: t.items.length,
      items_selesai: t.items.filter((i) => i.status === "Selesai").length,
      progress: calcProgress(t.items),
    }))
  );
});

// POST /timeline
router.post("/timeline", async (req: Request, res: Response) => {
  const { lead_id, ro_id, jenis_desain, bulan, tahun, tanggal_mulai } = req.body;
  const start = tanggal_mulai ? new Date(tanggal_mulai) : null;
  // Item pekerjaan + tanggal dibuat otomatis sesuai jenis desain; user cukup isi tanggal mulai.
  const { items, end } = buildTimelineItems(jenis_desain ?? null, start);
  const t = await prisma.desainTimeline.create({
    data: {
      lead_id: lead_id ? BigInt(lead_id) : null,
      ro_id: ro_id ? BigInt(ro_id) : null,
      jenis_desain: jenis_desain ?? null,
      bulan: bulan ?? null,
      tahun: tahun ?? null,
      tanggal_mulai: start,
      tanggal_selesai: end, // otomatis dari total durasi template
      created_by: req.user!.id,
      items: { createMany: { data: items } },
    },
  });
  return res.status(201).json({ id: t.id });
});

// GET /timeline/:id
router.get("/timeline/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.desainTimeline.findUnique({
    where: { id },
    include: {
      items: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: "asc" },
      },
      lead: true,
      creator: { select: { id: true, name: true } },
      ro: { select: { id: true, name: true } },
    },
  });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  return res.json({
    id: t.id,
    jenis_desain: t.jenis_desain,
    bulan: t.bulan,
    tahun: t.tahun,
    tanggal_mulai: fmtDate(t.tanggal_mulai),
    tanggal_selesai: fmtDate(t.tanggal_selesai),
    lead: t.lead ? { id: t.lead.id, nama: t.lead.nama } : null,
    ro: t.ro ? { id: String(t.ro.id), nama: t.ro.name } : null,
    dibuat_oleh: t.creator ? { id: t.creator.id, nama: t.creator.name } : null,
    progress: calcProgress(t.items),
    items: t.items.map((i) => ({
      id: i.id,
      item_pekerjaan: i.item_pekerjaan,
      tanggal_mulai: fmtDate(i.tanggal_mulai),
      target_selesai: fmtDate(i.target_selesai),
      status: i.status,
      file_bukti: i.file_bukti ?? null,
      pic: i.user ? { id: i.user.id, nama: i.user.name } : null,
    })),
  });
});

// PATCH /timeline/:id
router.patch("/timeline/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.desainTimeline.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  const { lead_id, ro_id, jenis_desain, bulan, tahun, tanggal_mulai, tanggal_selesai } = req.body;
  const updates: Record<string, unknown> = {};
  if (lead_id !== undefined) updates.lead_id = lead_id ? BigInt(lead_id) : null;
  if (ro_id !== undefined) updates.ro_id = ro_id ? BigInt(ro_id) : null;
  if (jenis_desain !== undefined) updates.jenis_desain = jenis_desain;
  if (bulan !== undefined) updates.bulan = bulan;
  if (tahun !== undefined) updates.tahun = tahun;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;

  await prisma.desainTimeline.update({ where: { id }, data: updates });
  return res.json({ message: "Timeline diupdate" });
});

// DELETE /timeline/:id
router.delete("/timeline/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.desainTimeline.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });
  await prisma.desainTimeline.delete({ where: { id } });
  return res.json({ message: "Timeline dihapus" });
});

// GET /timeline/:id/gantt
router.get("/timeline/:id/gantt", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.desainTimeline.findUnique({
    where: { id },
    include: {
      items: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: "asc" },
      },
      lead: true,
      ro: { select: { id: true, name: true } },
    },
  });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  return res.json({
    id: t.id,
    jenis_desain: t.jenis_desain,
    bulan: t.bulan,
    tahun: t.tahun,
    tanggal_mulai: fmtDate(t.tanggal_mulai),
    tanggal_selesai: fmtDate(t.tanggal_selesai),
    lead: t.lead ? { nama: t.lead.nama } : null,
    ro: t.ro ? { id: String(t.ro.id), nama: t.ro.name } : null,
    progress: calcProgress(t.items),
    tasks: t.items.map((i) => ({
      id: i.id,
      nama: i.item_pekerjaan,
      start: fmtDate(i.tanggal_mulai),
      end: fmtDate(i.target_selesai),
      status: i.status ?? "Belum Mulai",
      pic: i.user ? i.user.name : null,
      file_bukti: i.file_bukti ?? null,
      progress: i.status === "Selesai" ? 100 : i.status === "Proses" ? 50 : 0,
    })),
  });
});

// GET /timeline/:id/export
router.get("/timeline/:id/export", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.desainTimeline.findUnique({
    where: { id },
    include: {
      items: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: "asc" },
      },
      lead: true,
      creator: { select: { id: true, name: true } },
      ro: { select: { id: true, name: true } },
    },
  });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  return res.json({
    judul: `Timeline Desain - ${t.jenis_desain ?? "-"}`,
    periode:
      t.bulan && t.tahun
        ? `${BULAN_NAMES[t.bulan]} ${t.tahun}`
        : "-",
    klien: t.lead?.nama ?? "-",
    ro: t.ro?.name ?? "-",
    dibuat_oleh: t.creator?.name ?? "-",
    progress_total: calcProgress(t.items),
    pekerjaan: t.items.map((i) => ({
      nama_pekerjaan: i.item_pekerjaan ?? "-",
      tanggal_mulai: fmtDate(i.tanggal_mulai),
      tanggal_selesai: fmtDate(i.target_selesai),
      pic: i.user?.name ?? "-",
      status: i.status ?? "Belum Mulai",
      file_bukti: i.file_bukti ?? null,
    })),
  });
});

// POST /timeline/:id/items
router.post("/timeline/:id/items", async (req: Request, res: Response) => {
  const timelineId = BigInt(req.params.id);
  const t = await prisma.desainTimeline.findUnique({ where: { id: timelineId } });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  const { item_pekerjaan, tanggal_mulai, target_selesai, status, pic } = req.body;

  if (status === "Selesai") {
    return res.status(400).json({
      detail: "Tidak dapat langsung membuat pekerjaan dengan status Selesai. Upload file bukti terlebih dahulu.",
    });
  }

  // Validate dates against timeline range
  if (tanggal_mulai && t.tanggal_mulai && new Date(tanggal_mulai) < t.tanggal_mulai) {
    return res.status(400).json({ detail: `Tanggal mulai tidak boleh sebelum ${fmtDate(t.tanggal_mulai)}` });
  }
  if (target_selesai && t.tanggal_selesai && new Date(target_selesai) > t.tanggal_selesai) {
    return res.status(400).json({ detail: `Tanggal selesai tidak boleh melewati ${fmtDate(t.tanggal_selesai)}` });
  }

  const item = await prisma.desainTimelineItem.create({
    data: {
      desain_timeline_id: timelineId,
      item_pekerjaan: item_pekerjaan ?? null,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      target_selesai: target_selesai ? new Date(target_selesai) : null,
      status: status ?? "Belum Mulai",
      pic: pic ? BigInt(pic) : null,
    },
  });
  return res.status(201).json({ id: item.id });
});

// POST /timeline/items/:id/upload
router.post(
  "/timeline/items/:id/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const id = BigInt(req.params.id);
    const item = await prisma.desainTimelineItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });
    if (!req.file) return res.status(400).json({ detail: "Tidak ada file yang diupload" });

    if (item.file_bukti) {
      const oldPath = path.resolve(config.storagePath, item.file_bukti.replace(/^\/storage\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const relativePath = `/storage/desain/${req.file.filename}`;
    await prisma.desainTimelineItem.update({ where: { id }, data: { file_bukti: relativePath } });

    return res.json({ file_bukti: relativePath, message: "File berhasil diupload" });
  }
);

// PATCH /timeline/items/:id
router.patch("/timeline/items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const item = await prisma.desainTimelineItem.findUnique({
    where: { id },
    include: { desain_timeline: true },
  });
  if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });

  const { item_pekerjaan, tanggal_mulai, target_selesai, status, pic } = req.body;
  const updates: Record<string, unknown> = {};
  const tl = item.desain_timeline;

  if (status !== undefined) {
    const validStatus = ["Belum Mulai", "Proses", "Submit Gambar", "Selesai"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ detail: "Status tidak valid. Pilihan: Belum Mulai, Proses, Submit Gambar, Selesai" });
    }
    // Approve "Selesai" hanya boleh oleh Super Admin
    const isSuperAdmin = (req.user?.roles ?? []).some((r) => r.role.name === "Super Admin");
    if (status === "Selesai" && !isSuperAdmin) {
      return res.status(403).json({ detail: "Hanya Super Admin yang dapat menyetujui pekerjaan sebagai Selesai." });
    }
    if (status === "Selesai" && !item.file_bukti) {
      return res.status(400).json({
        detail: "Harap upload file bukti terlebih dahulu sebelum menandai pekerjaan sebagai Selesai.",
      });
    }
    updates.status = status;
  }

  if (item_pekerjaan !== undefined) updates.item_pekerjaan = item_pekerjaan;

  if (tanggal_mulai !== undefined) {
    const newDate = tanggal_mulai ? new Date(tanggal_mulai) : null;
    if (newDate && tl.tanggal_mulai && newDate < tl.tanggal_mulai) {
      return res.status(400).json({ detail: `Tanggal mulai tidak boleh sebelum ${fmtDate(tl.tanggal_mulai)}` });
    }
    updates.tanggal_mulai = newDate;
  }

  if (target_selesai !== undefined) {
    const newDate = target_selesai ? new Date(target_selesai) : null;
    if (newDate && tl.tanggal_selesai && newDate > tl.tanggal_selesai) {
      return res.status(400).json({ detail: `Tanggal selesai tidak boleh melewati ${fmtDate(tl.tanggal_selesai)}` });
    }
    updates.target_selesai = newDate;
  }

  if (pic !== undefined) updates.pic = pic ? BigInt(pic) : null;

  await prisma.desainTimelineItem.update({ where: { id }, data: updates });

  // When Shop Drawing is marked Selesai → notify Sales Admin + Admin Finance for sisa 50% invoice
  if (status === "Selesai" && item.item_pekerjaan === "Shop Drawing" && tl.lead_id) {
    const PRICING: Record<string, number> = {
      Basic: 2_500_000, Standart: 6_800_000, Premium: 8_500_000, Deluxe: 15_800_000,
    };
    const lead = await prisma.lead.findUnique({ where: { id: tl.lead_id }, select: { nama: true } });
    const harga = tl.jenis_desain ? (PRICING[tl.jenis_desain] ?? 0) : 0;
    const sisa = harga * 0.5;
    const sisaFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(sisa);
    const msg =
      `🎨 *Shop Drawing Selesai*\n` +
      `Client: *${lead?.nama ?? "-"}*\n` +
      `Paket Desain: *${tl.jenis_desain ?? "-"}*\n` +
      `Tagihan sisa 50%: *${sisaFmt}*\n` +
      `Harap buat invoice Payment Desain atas nama client tersebut.\n` +
      `${FRONTEND_URL}/finance/invoice-kwitansi`;
    sendFonntToRoles(["Sales Admin", "Admin Finance"], msg).catch(() => {});
  }

  return res.json({ message: "Item diupdate" });
});

// DELETE /timeline/items/:id
router.delete("/timeline/items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const item = await prisma.desainTimelineItem.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });

  if (item.file_bukti) {
    const filePath = path.resolve(config.storagePath, item.file_bukti.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await prisma.desainTimelineItem.delete({ where: { id } });
  return res.json({ message: "Item dihapus" });
});

// ── Desain Kanban (Follow Up After Survey) ────────────────────────────────

const DEFAULT_KANBAN_COLUMNS = [
  { title: "Setelah Survey", color: "#6366f1", urutan: 0, is_permanent: true },
  { title: "Proses Desain",  color: "#f59e0b", urutan: 1, is_permanent: true },
  { title: "Revisi",         color: "#ec4899", urutan: 2, is_permanent: true },
  { title: "Presentasi",     color: "#10b981", urutan: 3, is_permanent: true },
  { title: "Closing",        color: "#14b8a6", urutan: 4, is_permanent: true },
  { title: "Outstanding",    color: "#ef4444", urutan: 5, is_permanent: true },
];

async function ensureDesainColumns() {
  const existing = await prisma.desainKanbanColumn.findMany({ select: { title: true, urutan: true } });
  if (existing.length === 0) {
    await prisma.desainKanbanColumn.createMany({ data: DEFAULT_KANBAN_COLUMNS });
    return;
  }
  const titleSet = new Set(existing.map((c) => c.title));
  const missing = DEFAULT_KANBAN_COLUMNS.filter((col) => !titleSet.has(col.title));
  if (missing.length > 0) {
    const maxUrutan = existing.reduce((max, col) => Math.max(max, col.urutan), 0);
    await prisma.desainKanbanColumn.createMany({
      data: missing.map((col, index) => ({ ...col, urutan: maxUrutan + index + 1 })),
    });
  }
}

// GET /desain/kanban
router.get("/kanban", async (req: Request, res: Response) => {
  await ensureDesainColumns();
  const columns = await prisma.desainKanbanColumn.findMany({
    orderBy: { urutan: "asc" },
    include: {
      cards: {
        orderBy: { urutan: "asc" },
        include: {
          lead: { select: { id: true, nama: true, nomor_telepon: true, jenis: true, status: true } },
          assignee: { select: { id: true, name: true } },
          ro: { select: { id: true, name: true } },
        },
      },
    },
  });
  return res.json(columns.map((col) => ({
    id: col.id,
    title: col.title,
    color: col.color,
    urutan: col.urutan,
    is_permanent: col.is_permanent,
    cards: col.cards.map((c) => ({
      id: c.id,
      column_id: c.column_id,
      catatan: c.catatan,
      deadline: c.deadline ? c.deadline.toISOString().split("T")[0] : null,
      created_at: c.created_at,
      urutan: c.urutan,
      lead: c.lead ? { id: String(c.lead.id), nama: c.lead.nama, telepon: c.lead.nomor_telepon, jenis: c.lead.jenis, status: c.lead.status } : null,
      assignee: c.assignee ? { id: String(c.assignee.id), nama: c.assignee.name } : null,
      ro: c.ro ? { id: String(c.ro.id), nama: c.ro.name } : null,
    })),
  })));
});

// GET /desain/kanban/leads - leads dropdown (surveyed / status Hot/Client)
router.get("/kanban/leads", async (_req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({
    where: { rencana_survey: "Ya", tanggal_survey: { not: null } },
    select: { id: true, nama: true, nomor_telepon: true, jenis: true, status: true },
    orderBy: { nama: "asc" },
    take: 200,
  });
  return res.json(leads.map((l) => ({ id: String(l.id), nama: l.nama, telepon: l.nomor_telepon, jenis: l.jenis, status: l.status })));
});

// POST /desain/kanban/columns
router.post("/kanban/columns", async (req: Request, res: Response) => {
  const { title, color } = req.body;
  if (!title) return res.status(400).json({ detail: "title wajib diisi" });
  const lastCol = await prisma.desainKanbanColumn.findFirst({ orderBy: { urutan: "desc" } });
  const col = await prisma.desainKanbanColumn.create({
    data: { title, color: color || null, urutan: (lastCol?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: col.id, title: col.title, color: col.color, urutan: col.urutan, is_permanent: col.is_permanent, cards: [] });
});

// PATCH /desain/kanban/columns/:id
router.patch("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.desainKanbanColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  const { title, color } = req.body;
  await prisma.desainKanbanColumn.update({ where: { id }, data: { title, color } });
  return res.json({ message: "OK" });
});

// DELETE /desain/kanban/columns/:id
router.delete("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.desainKanbanColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  if (col.is_permanent) return res.status(400).json({ detail: "Kolom permanen tidak bisa dihapus" });
  await prisma.desainKanbanColumn.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// POST /desain/kanban/carryover — copy previous-month cards into target month
router.post("/kanban/carryover", async (req: Request, res: Response) => {
  await ensureDesainColumns();
  const { month, year } = req.body as { month: number; year: number };
  if (!month || !year || month < 1 || month > 12) {
    return res.status(400).json({ detail: "month dan year wajib valid" });
  }

  const now = new Date();
  if (new Date(year, month - 1, 1) > now) return res.json({ copied: 0 });

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const columns = await prisma.desainKanbanColumn.findMany();
  let copied = 0;

  for (const col of columns) {
    const prevCards = await prisma.desainKanbanCard.findMany({
      where: { column_id: col.id, created_at: { gte: prevStart, lte: prevEnd } },
    });
    if (prevCards.length === 0) continue;

    const existing = await prisma.desainKanbanCard.findMany({
      where: { column_id: col.id, created_at: { gte: targetStart, lte: targetEnd } },
      select: { lead_id: true, catatan: true },
    });
    const existingKeys = new Set(existing.map((c) => c.lead_id ? `lead:${c.lead_id}` : `catatan:${c.catatan ?? ""}`));

    for (const card of prevCards) {
      const key = card.lead_id ? `lead:${card.lead_id}` : `catatan:${card.catatan ?? ""}`;
      if (existingKeys.has(key)) continue;
      const shiftedDeadline = card.deadline
        ? new Date(year, month - 1, Math.min(card.deadline.getDate(), new Date(year, month, 0).getDate()))
        : null;
      const created = await prisma.desainKanbanCard.create({
        data: {
          column_id: col.id,
          lead_id: card.lead_id,
          catatan: card.catatan,
          assigned_to: card.assigned_to,
          ro_id: card.ro_id,
          deadline: shiftedDeadline,
          urutan: card.urutan,
        },
      });
      await prisma.$executeRaw`
        UPDATE desain_kanban_cards
        SET created_at = ${targetStart}, updated_at = ${targetStart}
        WHERE id = ${created.id}
      `;
      copied++;
    }
  }

  return res.json({ copied });
});

// POST /desain/kanban/columns/:id/cards
router.post("/kanban/columns/:id/cards", async (req: Request, res: Response) => {
  const column_id = BigInt(req.params.id);
  const col = await prisma.desainKanbanColumn.findUnique({ where: { id: column_id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  const { lead_id, catatan, assigned_to, ro_id, deadline } = req.body;
  const lastCard = await prisma.desainKanbanCard.findFirst({ where: { column_id }, orderBy: { urutan: "desc" } });
  const card = await prisma.desainKanbanCard.create({
    data: {
      column_id,
      lead_id: lead_id ? BigInt(lead_id) : null,
      catatan: catatan || null,
      assigned_to: assigned_to ? BigInt(assigned_to) : null,
      ro_id: ro_id ? BigInt(ro_id) : null,
      deadline: deadline ? new Date(deadline) : null,
      urutan: (lastCard?.urutan ?? 0) + 1,
    },
    include: {
      lead: { select: { id: true, nama: true, nomor_telepon: true, jenis: true, status: true } },
      assignee: { select: { id: true, name: true } },
      ro: { select: { id: true, name: true } },
    },
  });
  return res.status(201).json({
    id: card.id, column_id: card.column_id, catatan: card.catatan,
    deadline: card.deadline ? card.deadline.toISOString().split("T")[0] : null,
    lead: card.lead ? { id: String(card.lead.id), nama: card.lead.nama, telepon: card.lead.nomor_telepon, jenis: card.lead.jenis, status: card.lead.status } : null,
    assignee: card.assignee ? { id: String(card.assignee.id), nama: card.assignee.name } : null,
    ro: card.ro ? { id: String(card.ro.id), nama: card.ro.name } : null,
  });
});

// PATCH /desain/kanban/cards/:id  (update card, including move to column)
router.patch("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.desainKanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  const { column_id, lead_id, catatan, assigned_to, ro_id, deadline, urutan } = req.body;
  const updates: Record<string, unknown> = {};
  if (column_id !== undefined) updates.column_id = BigInt(column_id);
  if (lead_id !== undefined) updates.lead_id = lead_id ? BigInt(lead_id) : null;
  if (catatan !== undefined) updates.catatan = catatan;
  if (assigned_to !== undefined) updates.assigned_to = assigned_to ? BigInt(assigned_to) : null;
  if (ro_id !== undefined) updates.ro_id = ro_id ? BigInt(ro_id) : null;
  if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;
  if (urutan !== undefined) updates.urutan = urutan;
  await prisma.desainKanbanCard.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /desain/kanban/cards/:id
router.delete("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.desainKanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  await prisma.desainKanbanCard.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// ── Kanban Paket Desain (linked to DesainTimeline) ───────────────────────────

// GET /desain/kanban-paket — board with 6 fixed columns, cards = DesainTimeline
router.get("/kanban-paket", async (_req: Request, res: Response) => {
  const timelines = await prisma.desainTimeline.findMany({
    include: {
      lead: { select: { id: true, nama: true } },
      creator: { select: { id: true, name: true } },
      ro: { select: { id: true, name: true } },
      items: { select: { status: true } },
    },
    orderBy: { id: "desc" },
  });

  const columns = KANBAN_PAKET_STAGES.map((title, idx) => ({
    id: idx,
    title,
    cards: timelines
      .filter((t) => (t.paket_stage ?? 0) === idx)
      .map((t) => ({
        id: String(t.id),
        lead: t.lead ? { id: String(t.lead.id), nama: t.lead.nama } : null,
        dibuat_oleh: t.creator ? { id: String(t.creator.id), nama: t.creator.name } : null,
        ro: t.ro ? { id: String(t.ro.id), nama: t.ro.name } : null,
        jenis_desain: t.jenis_desain,
        bulan: t.bulan,
        tahun: t.tahun,
        progress: t.items.length > 0
          ? Math.round(t.items.filter((i) => i.status === "Selesai").length / t.items.length * 100)
          : 0,
        paket_stage: t.paket_stage ?? 0,
      })),
  }));
  return res.json(columns);
});

// PATCH /desain/kanban-paket/cards/:id/move — move timeline to another stage
// Also auto-updates item statuses: before stage → Proses, at stage → Proses, after → Belum Mulai
router.patch("/kanban-paket/cards/:id/move", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { stage } = req.body;
  if (stage === undefined || stage < 0 || stage >= KANBAN_PAKET_STAGES.length) {
    return res.status(400).json({ detail: "stage tidak valid (0–5)" });
  }
  const t = await prisma.desainTimeline.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  // Update paket_stage on the timeline only — tidak auto-update item status Projek Desain
  await prisma.desainTimeline.update({ where: { id }, data: { paket_stage: stage } });

  return res.json({ message: "OK" });
});

// ── Docs/Link ──────────────────────────────────────────────────────────────

// GET /timeline/:id/links
router.get("/timeline/:id/links", async (req: Request, res: Response) => {
  const timelineId = BigInt(req.params.id);
  const links = await prisma.projectLink.findMany({
    where: { linkable_type: "desain_timeline", linkable_id: timelineId },
    orderBy: { created_at: "asc" },
    include: { users: { select: { id: true, name: true } } },
  });
  return res.json(links.map((l) => ({ ...l, id: String(l.id), linkable_id: String(l.linkable_id), created_by: l.created_by ? String(l.created_by) : null })));
});

// POST /timeline/:id/links
router.post("/timeline/:id/links", async (req: Request, res: Response) => {
  const timelineId = BigInt(req.params.id);
  const { title, url, catatan } = req.body;
  if (!title || !url) return res.status(400).json({ detail: "title dan url wajib diisi" });
  const link = await prisma.projectLink.create({
    data: { linkable_type: "desain_timeline", linkable_id: timelineId, title, url, catatan: catatan || null, created_by: (req as any).user?.id ?? null },
  });
  return res.json({ ...link, id: String(link.id), linkable_id: String(link.linkable_id), created_by: link.created_by ? String(link.created_by) : null });
});

// DELETE /timeline/links/:id
router.delete("/timeline/links/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.projectLink.delete({ where: { id } });
  return res.json({ message: "OK" });
});

export default router;
