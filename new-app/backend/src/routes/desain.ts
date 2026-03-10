import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";

const router = Router();

const DEFAULT_PEKERJAAN = [
  "Pembuatan Layout Eksisting & Perubahan",
  "Pembuatan Fasad 3D",
  "Pembuatan 3D Interior",
  "Pembuatan RAB",
  "Presentasi RAB",
];

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
      jumlah_item: t.items.length,
      items_selesai: t.items.filter((i) => i.status === "Selesai").length,
      progress: calcProgress(t.items),
    }))
  );
});

// POST /timeline
router.post("/timeline", async (req: Request, res: Response) => {
  const { lead_id, jenis_desain, bulan, tahun, tanggal_mulai, tanggal_selesai } = req.body;
  const t = await prisma.desainTimeline.create({
    data: {
      lead_id: lead_id ? BigInt(lead_id) : null,
      jenis_desain: jenis_desain ?? null,
      bulan: bulan ?? null,
      tahun: tahun ?? null,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      created_by: req.user!.id,
      items: {
        createMany: {
          data: DEFAULT_PEKERJAAN.map((nama) => ({
            item_pekerjaan: nama,
            status: "Belum Mulai",
          })),
        },
      },
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

  const { lead_id, jenis_desain, bulan, tahun, tanggal_mulai, tanggal_selesai } = req.body;
  const updates: Record<string, unknown> = {};
  if (lead_id !== undefined) updates.lead_id = lead_id ? BigInt(lead_id) : null;
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
    const validStatus = ["Belum Mulai", "Proses", "Selesai"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ detail: "Status tidak valid. Pilihan: Belum Mulai, Proses, Selesai" });
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
