import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";

const router = Router();

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
const interiorUploadDir = path.resolve(config.storagePath, "interior");
if (!fs.existsSync(interiorUploadDir)) fs.mkdirSync(interiorUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, interiorUploadDir),
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
router.get("/timeline", async (_req: Request, res: Response) => {
  const timelines = await prisma.interiorTimeline.findMany({
    include: {
      items: { include: { user: { select: { id: true, name: true } } } },
      lead: true,
    },
    orderBy: { id: "desc" },
  });

  return res.json(
    timelines.map((t) => ({
      id: t.id,
      nama_proyek: t.nama_proyek,
      lead: t.lead ? { id: t.lead.id, nama: t.lead.nama } : null,
      tanggal_mulai: fmtDate(t.tanggal_mulai),
      tanggal_selesai: fmtDate(t.tanggal_selesai),
      jumlah_item: t.items.length,
      items_selesai: t.items.filter((i) => i.status === "Selesai").length,
      progress: calcProgress(t.items),
    }))
  );
});

// POST /timeline — no default items
router.post("/timeline", async (req: Request, res: Response) => {
  const { nama_proyek, lead_id, tanggal_mulai, tanggal_selesai } = req.body;
  const t = await prisma.interiorTimeline.create({
    data: {
      nama_proyek: nama_proyek ?? null,
      lead_id: lead_id ? BigInt(lead_id) : null,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: t.id });
});

// GET /timeline/:id
router.get("/timeline/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.interiorTimeline.findUnique({
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
    nama_proyek: t.nama_proyek,
    lead: t.lead ? { id: t.lead.id, nama: t.lead.nama } : null,
    tanggal_mulai: fmtDate(t.tanggal_mulai),
    tanggal_selesai: fmtDate(t.tanggal_selesai),
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
  const t = await prisma.interiorTimeline.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  const { nama_proyek, lead_id, tanggal_mulai, tanggal_selesai } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_proyek !== undefined) updates.nama_proyek = nama_proyek;
  if (lead_id !== undefined) updates.lead_id = lead_id ? BigInt(lead_id) : null;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;

  await prisma.interiorTimeline.update({ where: { id }, data: updates });
  return res.json({ message: "Timeline diupdate" });
});

// DELETE /timeline/:id
router.delete("/timeline/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.interiorTimeline.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });
  await prisma.interiorTimeline.delete({ where: { id } });
  return res.json({ message: "Timeline dihapus" });
});

// GET /timeline/:id/gantt
router.get("/timeline/:id/gantt", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.interiorTimeline.findUnique({
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
    nama_proyek: t.nama_proyek,
    lead: t.lead ? { nama: t.lead.nama } : null,
    tanggal_mulai: fmtDate(t.tanggal_mulai),
    tanggal_selesai: fmtDate(t.tanggal_selesai),
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
  const t = await prisma.interiorTimeline.findUnique({
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

  const fmtLocal = (d: Date | null | undefined) =>
    d ? d.toLocaleDateString("id-ID") : "—";

  return res.json({
    judul: `Timeline Interior - ${t.nama_proyek ?? "-"}`,
    klien: t.lead?.nama ?? "-",
    periode:
      t.tanggal_mulai && t.tanggal_selesai
        ? `${fmtLocal(t.tanggal_mulai)} s.d. ${fmtLocal(t.tanggal_selesai)}`
        : "-",
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
  const t = await prisma.interiorTimeline.findUnique({ where: { id: timelineId } });
  if (!t) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  const { item_pekerjaan, tanggal_mulai, target_selesai, status, pic } = req.body;

  if (status === "Selesai") {
    return res.status(400).json({
      detail: "Tidak dapat langsung membuat pekerjaan dengan status Selesai. Upload file bukti terlebih dahulu.",
    });
  }

  if (tanggal_mulai && t.tanggal_mulai && new Date(tanggal_mulai) < t.tanggal_mulai) {
    return res.status(400).json({ detail: `Tanggal mulai tidak boleh sebelum ${fmtDate(t.tanggal_mulai)}` });
  }
  if (target_selesai && t.tanggal_selesai && new Date(target_selesai) > t.tanggal_selesai) {
    return res.status(400).json({ detail: `Tanggal selesai tidak boleh melewati ${fmtDate(t.tanggal_selesai)}` });
  }

  const item = await prisma.interiorTimelineItem.create({
    data: {
      interior_timeline_id: timelineId,
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
    const item = await prisma.interiorTimelineItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });
    if (!req.file) return res.status(400).json({ detail: "Tidak ada file yang diupload" });

    if (item.file_bukti) {
      const oldPath = path.resolve(config.storagePath, item.file_bukti.replace(/^\/storage\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const relativePath = `/storage/interior/${req.file.filename}`;
    await prisma.interiorTimelineItem.update({ where: { id }, data: { file_bukti: relativePath } });

    return res.json({ file_bukti: relativePath, message: "File berhasil diupload" });
  }
);

// PATCH /timeline/items/:id
router.patch("/timeline/items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const item = await prisma.interiorTimelineItem.findUnique({
    where: { id },
    include: { interior_timeline: true },
  });
  if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });

  const { item_pekerjaan, tanggal_mulai, target_selesai, status, pic } = req.body;
  const updates: Record<string, unknown> = {};
  const tl = item.interior_timeline;

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

  await prisma.interiorTimelineItem.update({ where: { id }, data: updates });
  return res.json({ message: "Item diupdate" });
});

// DELETE /timeline/items/:id
router.delete("/timeline/items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const item = await prisma.interiorTimelineItem.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Item tidak ditemukan" });

  if (item.file_bukti) {
    const filePath = path.resolve(config.storagePath, item.file_bukti.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await prisma.interiorTimelineItem.delete({ where: { id } });
  return res.json({ message: "Item dihapus" });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── ProyekInterior Routes (2-layer: list → detail with Termin/Gantt/RAPP) ──────
// ═══════════════════════════════════════════════════════════════════════════════

function calcProgressTasks(tasks: { status: string | null }[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "Selesai").length;
  return Math.round((done / tasks.length) * 100);
}

// GET /interior/projeks
router.get("/projeks", async (_req: Request, res: Response) => {
  const items = await prisma.proyekInterior.findMany({
    include: {
      termins: { include: { tasks: true }, orderBy: { urutan: "asc" } },
      lead: true,
    },
    orderBy: { id: "desc" },
  });
  return res.json(items.map((p) => {
    const allTasks = p.termins.flatMap((t) => t.tasks);
    return {
      id: p.id,
      nama_proyek: p.nama_proyek,
      lead: p.lead ? { id: p.lead.id, nama: p.lead.nama } : null,
      lokasi: p.lokasi,
      budget: parseFloat(String(p.budget ?? 0)),
      tanggal_mulai: fmtDate(p.tanggal_mulai),
      tanggal_selesai: fmtDate(p.tanggal_selesai),
      jumlah_termin: p.termins.length,
      jumlah_task: allTasks.length,
      tasks_selesai: allTasks.filter((t) => t.status === "Selesai").length,
      progress: calcProgressTasks(allTasks),
    };
  }));
});

// POST /interior/projeks
router.post("/projeks", async (req: Request, res: Response) => {
  const { nama_proyek, lead_id, lokasi, budget, tanggal_mulai, tanggal_selesai } = req.body;
  const p = await prisma.proyekInterior.create({
    data: {
      nama_proyek: nama_proyek ?? null,
      lead_id: lead_id ? BigInt(lead_id) : null,
      lokasi: lokasi ?? null,
      budget: budget ? parseFloat(budget) : 0,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: p.id });
});

// GET /interior/projeks/:id
router.get("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.proyekInterior.findUnique({
    where: { id },
    include: {
      lead: true,
      pic: { select: { id: true, name: true } },
      termins: {
        orderBy: { urutan: "asc" },
        include: {
          tasks: {
            include: { assigned_user: { select: { id: true, name: true } } },
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });

  const allTasks = p.termins.flatMap((t) => t.tasks);
  return res.json({
    id: p.id,
    nama_proyek: p.nama_proyek,
    lead: p.lead ? { id: p.lead.id, nama: p.lead.nama } : null,
    lokasi: p.lokasi,
    budget: parseFloat(String(p.budget ?? 0)),
    tanggal_mulai: fmtDate(p.tanggal_mulai),
    tanggal_selesai: fmtDate(p.tanggal_selesai),
    progress: calcProgressTasks(allTasks),
    jumlah_termin: p.termins.length,
    jumlah_task: allTasks.length,
    tasks_selesai: allTasks.filter((t) => t.status === "Selesai").length,
    dibuat_oleh: p.pic ? { id: p.pic.id, nama: p.pic.name } : null,
    termins: p.termins.map((t) => {
      const tTasks = t.tasks;
      return {
        id: t.id,
        urutan: t.urutan,
        nama: t.nama,
        tanggal_mulai: fmtDate(t.tanggal_mulai),
        tanggal_selesai: fmtDate(t.tanggal_selesai),
        progress: calcProgressTasks(tTasks),
        jumlah_task: tTasks.length,
        tasks_selesai: tTasks.filter((tk) => tk.status === "Selesai").length,
        tasks: tTasks.map((tk) => ({
          id: tk.id,
          nama_pekerjaan: tk.nama_pekerjaan,
          tanggal_mulai: fmtDate(tk.tanggal_mulai),
          tanggal_selesai: fmtDate(tk.tanggal_selesai),
          status: tk.status,
          pic: tk.assigned_user ? { id: tk.assigned_user.id, nama: tk.assigned_user.name } : null,
        })),
      };
    }),
  });
});

// PATCH /interior/projeks/:id
router.patch("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama_proyek, lead_id, lokasi, budget, tanggal_mulai, tanggal_selesai } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_proyek !== undefined) updates.nama_proyek = nama_proyek;
  if (lead_id !== undefined) updates.lead_id = lead_id ? BigInt(lead_id) : null;
  if (lokasi !== undefined) updates.lokasi = lokasi;
  if (budget !== undefined) updates.budget = budget ? parseFloat(budget) : 0;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  await prisma.proyekInterior.update({ where: { id }, data: updates });
  return res.json({ message: "Proyek diupdate" });
});

// DELETE /interior/projeks/:id
router.delete("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.proyekInterior.delete({ where: { id } });
  return res.json({ message: "Proyek dihapus" });
});

// POST /interior/projeks/:id/termins
router.post("/projeks/:id/termins", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const p = await prisma.proyekInterior.findUnique({ where: { id: proyekId } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  const { nama, tanggal_mulai, tanggal_selesai } = req.body;
  const last = await prisma.proyekInteriorTermin.findFirst({ where: { proyek_interior_id: proyekId }, orderBy: { urutan: "desc" } });
  const urutan = (last?.urutan ?? 0) + 1;
  const t = await prisma.proyekInteriorTermin.create({
    data: {
      proyek_interior_id: proyekId,
      urutan,
      nama: nama ?? `Termin ${urutan}`,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
    },
  });
  return res.status(201).json({ id: t.id, urutan });
});

// PATCH /interior/projeks/termins/:id
router.patch("/projeks/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama, tanggal_mulai, tanggal_selesai, rab } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama !== undefined) updates.nama = nama;
  if (rab !== undefined) updates.rab = rab ?? 0;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  await prisma.proyekInteriorTermin.update({ where: { id }, data: updates });
  return res.json({ message: "Termin diupdate" });
});

// DELETE /interior/projeks/termins/:id
router.delete("/projeks/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.proyekInteriorTermin.delete({ where: { id } });
  return res.json({ message: "Termin dihapus" });
});

// POST /interior/projeks/termins/:id/tasks
router.post("/projeks/termins/:id/tasks", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const { nama_pekerjaan, tanggal_mulai, tanggal_selesai, status, pic } = req.body;
  const task = await prisma.proyekInteriorTask.create({
    data: {
      termin_id: terminId,
      nama_pekerjaan: nama_pekerjaan ?? null,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      status: status ?? "Belum Mulai",
      assigned_to: pic ? BigInt(pic) : null,
    },
  });
  return res.status(201).json({ id: task.id });
});

// PATCH /interior/projeks/tasks/:id
router.patch("/projeks/tasks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama_pekerjaan, tanggal_mulai, tanggal_selesai, status, pic } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_pekerjaan !== undefined) updates.nama_pekerjaan = nama_pekerjaan;
  if (status !== undefined) updates.status = status;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (pic !== undefined) updates.assigned_to = pic ? BigInt(pic) : null;
  await prisma.proyekInteriorTask.update({ where: { id }, data: updates });
  return res.json({ message: "Pekerjaan diupdate" });
});

// DELETE /interior/projeks/tasks/:id
router.delete("/projeks/tasks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.proyekInteriorTask.delete({ where: { id } });
  return res.json({ message: "Pekerjaan dihapus" });
});

// ── Interior RAPP ──────────────────────────────────────────────────────────────
const fmtNum = (v: any) => parseFloat(String(v ?? 0));

// GET /interior/projeks/termins/:id/rapp
router.get("/projeks/termins/:id/rapp", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const t = await prisma.proyekInteriorTermin.findUnique({
    where: { id: terminId },
    include: {
      rapp_material_kategoris: { orderBy: { urutan: "asc" }, include: { items: { orderBy: { urutan: "asc" } } } },
      rapp_sipil_items: { orderBy: { urutan: "asc" } },
      rapp_vendor_kategoris: { orderBy: { urutan: "asc" }, include: { items: { orderBy: { urutan: "asc" } } } },
    },
  });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  return res.json({
    id: t.id,
    rab: 0,
    material_kategoris: t.rapp_material_kategoris.map((k) => ({
      id: k.id, kode: k.kode, nama: k.nama, urutan: k.urutan,
      items: k.items.map((i) => ({ id: i.id, material: i.material, vol: fmtNum(i.vol), sat: i.sat, harga_satuan: fmtNum(i.harga_satuan), jumlah: fmtNum(i.jumlah), urutan: i.urutan })),
    })),
    sipil_items: t.rapp_sipil_items.map((i) => ({
      id: i.id, nama: i.nama, vol: fmtNum(i.vol), sat: i.sat, harga_satuan: fmtNum(i.harga_satuan), jumlah: fmtNum(i.jumlah), urutan: i.urutan, keterangan: null,
    })),
    vendor_kategoris: t.rapp_vendor_kategoris.map((k) => ({
      id: k.id, nama: k.nama, urutan: k.urutan,
      items: k.items.map((i) => ({ id: i.id, nama: i.vendor, vol: fmtNum(i.vol), sat: i.sat, harga_satuan: fmtNum(i.harga_satuan), jumlah: fmtNum(i.jumlah), urutan: i.urutan })),
    })),
  });
});

// POST /interior/projeks/termins/:id/rapp/material-kategori
router.post("/projeks/termins/:id/rapp/material-kategori", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const termin = await prisma.proyekInteriorTermin.findUnique({ where: { id: terminId } });
  if (!termin) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  const { kode, nama } = req.body;
  const last = await prisma.rappInteriorMaterialKategori.findFirst({ where: { termin_id: terminId }, orderBy: { urutan: "desc" } });
  const k = await prisma.rappInteriorMaterialKategori.create({
    data: { termin_id: terminId, proyek_id: termin.proyek_interior_id, kode: kode ?? null, nama: nama ?? "Kategori Baru", urutan: (last?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: k.id });
});

// PATCH /interior/projeks/rapp/material-kategori/:id
router.patch("/projeks/rapp/material-kategori/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { kode, nama } = req.body;
  const updates: Record<string, unknown> = {};
  if (kode !== undefined) updates.kode = kode;
  if (nama !== undefined) updates.nama = nama;
  await prisma.rappInteriorMaterialKategori.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /interior/projeks/rapp/material-kategori/:id
router.delete("/projeks/rapp/material-kategori/:id", async (req: Request, res: Response) => {
  await prisma.rappInteriorMaterialKategori.delete({ where: { id: BigInt(req.params.id) } });
  return res.json({ message: "OK" });
});

// POST /interior/projeks/rapp/material-kategori/:id/items
router.post("/projeks/rapp/material-kategori/:id/items", async (req: Request, res: Response) => {
  const kategoriId = BigInt(req.params.id);
  const { material, vol, sat, harga_satuan } = req.body;
  const last = await prisma.rappInteriorMaterialItem.findFirst({ where: { kategori_id: kategoriId }, orderBy: { urutan: "desc" } });
  const vol2 = parseFloat(vol ?? 0); const harga2 = parseFloat(harga_satuan ?? 0);
  const item = await prisma.rappInteriorMaterialItem.create({
    data: { kategori_id: kategoriId, material: material ?? "", vol: vol2, sat: sat ?? null, harga_satuan: harga2, jumlah: vol2 * harga2, urutan: (last?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: item.id });
});

// PATCH /interior/projeks/rapp/material-items/:id
router.patch("/projeks/rapp/material-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { material, vol, sat, harga_satuan } = req.body;
  const updates: Record<string, unknown> = {};
  if (material !== undefined) updates.material = material;
  if (sat !== undefined) updates.sat = sat;
  if (vol !== undefined || harga_satuan !== undefined) {
    const cur = await prisma.rappInteriorMaterialItem.findUnique({ where: { id } });
    const v = vol !== undefined ? parseFloat(vol) : fmtNum(cur?.vol);
    const h = harga_satuan !== undefined ? parseFloat(harga_satuan) : fmtNum(cur?.harga_satuan);
    if (vol !== undefined) updates.vol = v;
    if (harga_satuan !== undefined) updates.harga_satuan = h;
    updates.jumlah = v * h;
  }
  await prisma.rappInteriorMaterialItem.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /interior/projeks/rapp/material-items/:id
router.delete("/projeks/rapp/material-items/:id", async (req: Request, res: Response) => {
  await prisma.rappInteriorMaterialItem.delete({ where: { id: BigInt(req.params.id) } });
  return res.json({ message: "OK" });
});

// POST /interior/projeks/termins/:id/rapp/sipil-items
router.post("/projeks/termins/:id/rapp/sipil-items", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const termin = await prisma.proyekInteriorTermin.findUnique({ where: { id: terminId } });
  if (!termin) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  const { nama, vol, sat, harga_satuan, jumlah } = req.body;
  const last = await prisma.rappInteriorSipilItem.findFirst({ where: { termin_id: terminId }, orderBy: { urutan: "desc" } });
  const vol2 = vol != null ? parseFloat(vol) : 0; const harga2 = harga_satuan != null ? parseFloat(harga_satuan) : 0;
  const jumlah2 = jumlah != null ? parseFloat(jumlah) : vol2 * harga2;
  const item = await prisma.rappInteriorSipilItem.create({
    data: { termin_id: terminId, proyek_id: termin.proyek_interior_id, nama: nama ?? "", vol: vol2, sat: sat ?? null, harga_satuan: harga2, jumlah: jumlah2, urutan: (last?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: item.id });
});

// PATCH /interior/projeks/rapp/sipil-items/:id
router.patch("/projeks/rapp/sipil-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama, vol, sat, harga_satuan, jumlah } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama !== undefined) updates.nama = nama;
  if (sat !== undefined) updates.sat = sat;
  if (vol !== undefined) updates.vol = parseFloat(vol);
  if (harga_satuan !== undefined) updates.harga_satuan = parseFloat(harga_satuan);
  if (jumlah !== undefined) updates.jumlah = parseFloat(jumlah);
  else if (vol !== undefined || harga_satuan !== undefined) {
    const cur = await prisma.rappInteriorSipilItem.findUnique({ where: { id } });
    const v = vol !== undefined ? parseFloat(vol) : fmtNum(cur?.vol);
    const h = harga_satuan !== undefined ? parseFloat(harga_satuan) : fmtNum(cur?.harga_satuan);
    updates.jumlah = v * h;
  }
  await prisma.rappInteriorSipilItem.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /interior/projeks/rapp/sipil-items/:id
router.delete("/projeks/rapp/sipil-items/:id", async (req: Request, res: Response) => {
  await prisma.rappInteriorSipilItem.delete({ where: { id: BigInt(req.params.id) } });
  return res.json({ message: "OK" });
});

// POST /interior/projeks/termins/:id/rapp/vendor-kategori
router.post("/projeks/termins/:id/rapp/vendor-kategori", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const termin = await prisma.proyekInteriorTermin.findUnique({ where: { id: terminId } });
  if (!termin) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  const { nama } = req.body;
  const last = await prisma.rappInteriorVendorKategori.findFirst({ where: { termin_id: terminId }, orderBy: { urutan: "desc" } });
  const k = await prisma.rappInteriorVendorKategori.create({
    data: { termin_id: terminId, proyek_id: termin.proyek_interior_id, nama: nama ?? "Pekerjaan Vendor", urutan: (last?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: k.id });
});

// PATCH /interior/projeks/rapp/vendor-kategori/:id
router.patch("/projeks/rapp/vendor-kategori/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama } = req.body;
  if (nama !== undefined) await prisma.rappInteriorVendorKategori.update({ where: { id }, data: { nama } });
  return res.json({ message: "OK" });
});

// DELETE /interior/projeks/rapp/vendor-kategori/:id
router.delete("/projeks/rapp/vendor-kategori/:id", async (req: Request, res: Response) => {
  await prisma.rappInteriorVendorKategori.delete({ where: { id: BigInt(req.params.id) } });
  return res.json({ message: "OK" });
});

// POST /interior/projeks/rapp/vendor-kategori/:id/items
router.post("/projeks/rapp/vendor-kategori/:id/items", async (req: Request, res: Response) => {
  const kategoriId = BigInt(req.params.id);
  const { nama, vol, sat, harga_satuan } = req.body;
  const last = await prisma.rappInteriorVendorItem.findFirst({ where: { kategori_id: kategoriId }, orderBy: { urutan: "desc" } });
  const vol2 = parseFloat(vol ?? 0); const harga2 = parseFloat(harga_satuan ?? 0);
  const item = await prisma.rappInteriorVendorItem.create({
    data: { kategori_id: kategoriId, vendor: nama ?? "", vol: vol2, sat: sat ?? null, harga_satuan: harga2, jumlah: vol2 * harga2, urutan: (last?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: item.id });
});

// PATCH /interior/projeks/rapp/vendor-items/:id
router.patch("/projeks/rapp/vendor-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama, vol, sat, harga_satuan } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama !== undefined) updates.vendor = nama;
  if (sat !== undefined) updates.sat = sat;
  if (vol !== undefined || harga_satuan !== undefined) {
    const cur = await prisma.rappInteriorVendorItem.findUnique({ where: { id } });
    const v = vol !== undefined ? parseFloat(vol) : fmtNum(cur?.vol);
    const h = harga_satuan !== undefined ? parseFloat(harga_satuan) : fmtNum(cur?.harga_satuan);
    if (vol !== undefined) updates.vol = v;
    if (harga_satuan !== undefined) updates.harga_satuan = h;
    updates.jumlah = v * h;
  }
  await prisma.rappInteriorVendorItem.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /interior/projeks/rapp/vendor-items/:id
router.delete("/projeks/rapp/vendor-items/:id", async (req: Request, res: Response) => {
  await prisma.rappInteriorVendorItem.delete({ where: { id: BigInt(req.params.id) } });
  return res.json({ message: "OK" });
});

// ── Task Foto Endpoints ────────────────────────────────────────────────────────

// GET /interior/projeks/tasks/:id/fotos
router.get("/projeks/tasks/:id/fotos", async (req: Request, res: Response) => {
  const taskId = BigInt(req.params.id);
  const fotos = await prisma.proyekInteriorTaskFoto.findMany({
    where: { task_id: taskId },
    orderBy: { created_at: "asc" },
  });
  return res.json(fotos.map((f) => ({ ...f, id: String(f.id), task_id: String(f.task_id) })));
});

// POST /interior/projeks/tasks/:id/fotos
router.post("/projeks/tasks/:id/fotos", upload.array("fotos", 10), async (req: Request, res: Response) => {
  const taskId = BigInt(req.params.id);
  const task = await prisma.proyekInteriorTask.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ detail: "Task tidak ditemukan" });
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) return res.status(400).json({ detail: "Tidak ada file yang diupload" });
  const created = await prisma.$transaction(
    files.map((f) =>
      prisma.proyekInteriorTaskFoto.create({
        data: { task_id: taskId, file_path: `/storage/interior/${f.filename}`, original_name: f.originalname },
      })
    )
  );
  return res.status(201).json(created.map((f) => ({ ...f, id: String(f.id), task_id: String(f.task_id) })));
});

// DELETE /interior/projeks/tasks/fotos/:fotoId
router.delete("/projeks/tasks/fotos/:fotoId", async (req: Request, res: Response) => {
  const fotoId = BigInt(req.params.fotoId);
  const foto = await prisma.proyekInteriorTaskFoto.findUnique({ where: { id: fotoId } });
  if (!foto) return res.status(404).json({ detail: "Foto tidak ditemukan" });
  const filePath = path.resolve(config.storagePath, foto.file_path.replace(/^\/storage\//, ""));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await prisma.proyekInteriorTaskFoto.delete({ where: { id: fotoId } });
  return res.json({ message: "Foto dihapus" });
});

// ── Form Checklist Interior ──────────────────────────────────────────────────

function serializeChecklist(i: any) {
  return {
    ...i,
    id: String(i.id),
    proyek_id: String(i.proyek_id),
    gambar_paths: i.gambar_paths ? JSON.parse(i.gambar_paths) : (i.gambar_path ? [i.gambar_path] : []),
    gambar_selesai_paths: i.gambar_selesai_paths ? JSON.parse(i.gambar_selesai_paths) : (i.gambar_selesai_path ? [i.gambar_selesai_path] : []),
  };
}

// GET /projeks/:id/checklist
router.get("/projeks/:id/checklist", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const items = await prisma.checklistInterior.findMany({
    where: { proyek_id: proyekId },
    orderBy: { urutan: "asc" },
  });
  return res.json(items.map(serializeChecklist));
});

// POST /projeks/:id/checklist
router.post("/projeks/:id/checklist", upload.array("gambar", 10), async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const proyek = await prisma.proyekInterior.findUnique({ where: { id: proyekId } });
  if (!proyek) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  const { nama_pekerjaan, area_pekerjaan } = req.body;
  if (!nama_pekerjaan) return res.status(400).json({ detail: "nama_pekerjaan wajib diisi" });
  const maxUrutan = await prisma.checklistInterior.aggregate({ where: { proyek_id: proyekId }, _max: { urutan: true } });
  const files = (req.files as Express.Multer.File[]) ?? [];
  const paths = files.map((f) => `/storage/interior/${f.filename}`);
  const item = await prisma.checklistInterior.create({
    data: {
      proyek_id: proyekId,
      nama_pekerjaan,
      area_pekerjaan: area_pekerjaan || null,
      gambar_path: paths[0] ?? null,
      gambar_paths: paths.length > 0 ? JSON.stringify(paths) : null,
      urutan: (maxUrutan._max.urutan ?? -1) + 1,
    },
  });
  return res.status(201).json(serializeChecklist(item));
});

// PATCH /projeks/checklist/:cid
router.patch("/projeks/checklist/:cid", upload.fields([{ name: "gambar", maxCount: 10 }, { name: "gambar_selesai", maxCount: 10 }]), async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  const existing = await prisma.checklistInterior.findUnique({ where: { id: cid } });
  if (!existing) return res.status(404).json({ detail: "Checklist item tidak ditemukan" });
  const data: any = {};
  if (req.body.nama_pekerjaan !== undefined) data.nama_pekerjaan = req.body.nama_pekerjaan;
  if (req.body.area_pekerjaan !== undefined) data.area_pekerjaan = req.body.area_pekerjaan || null;
  if (req.body.is_checked !== undefined) data.is_checked = req.body.is_checked === "true" || req.body.is_checked === true;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  const gambarFiles = files?.gambar ?? [];
  if (gambarFiles.length > 0) {
    const oldPaths: string[] = existing.gambar_paths ? JSON.parse(existing.gambar_paths) : (existing.gambar_path ? [existing.gambar_path] : []);
    for (const p of oldPaths) {
      const fp = path.resolve(config.storagePath, p.replace(/^\/storage\//, ""));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    const newPaths = gambarFiles.map((f) => `/storage/interior/${f.filename}`);
    data.gambar_path = newPaths[0];
    data.gambar_paths = JSON.stringify(newPaths);
  }

  const gambarSelesaiFiles = files?.gambar_selesai ?? [];
  if (gambarSelesaiFiles.length > 0) {
    const oldPaths: string[] = existing.gambar_selesai_paths ? JSON.parse(existing.gambar_selesai_paths) : (existing.gambar_selesai_path ? [existing.gambar_selesai_path] : []);
    for (const p of oldPaths) {
      const fp = path.resolve(config.storagePath, p.replace(/^\/storage\//, ""));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    const newPaths = gambarSelesaiFiles.map((f) => `/storage/interior/${f.filename}`);
    data.gambar_selesai_path = newPaths[0];
    data.gambar_selesai_paths = JSON.stringify(newPaths);
  }

  const updated = await prisma.checklistInterior.update({ where: { id: cid }, data });
  return res.json(serializeChecklist(updated));
});

// DELETE /projeks/checklist/:cid
router.delete("/projeks/checklist/:cid", async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  const existing = await prisma.checklistInterior.findUnique({ where: { id: cid } });
  if (!existing) return res.status(404).json({ detail: "Checklist item tidak ditemukan" });
  const allPaths: string[] = [
    ...(existing.gambar_paths ? JSON.parse(existing.gambar_paths) : (existing.gambar_path ? [existing.gambar_path] : [])),
    ...(existing.gambar_selesai_paths ? JSON.parse(existing.gambar_selesai_paths) : (existing.gambar_selesai_path ? [existing.gambar_selesai_path] : [])),
  ];
  for (const p of allPaths) {
    const filePath = path.resolve(config.storagePath, p.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await prisma.checklistInterior.delete({ where: { id: cid } });
  return res.json({ message: "Checklist item dihapus" });
});

export default router;
