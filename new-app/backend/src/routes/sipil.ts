import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../config";
import { getPagination, paginateResponse } from "../middleware/pagination";

const router = Router();

// ── Multer for docs uploads ────────────────────────────────────────────────────
const sipilDocsDir = path.resolve(config.storagePath, "sipil-docs");
if (!fs.existsSync(sipilDocsDir)) fs.mkdirSync(sipilDocsDir, { recursive: true });
const docsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, sipilDocsDir),
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

function fmtDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

function calcProgress(tasks: { status: string | null }[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "Selesai").length;
  return Math.round((done / tasks.length) * 100);
}

// GET /employees
router.get("/employees", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.json(users.map((u) => ({ id: u.id, nama: u.name })));
});

// GET /projeks
router.get("/projeks", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const search = req.query.search as string | undefined;

  const where = search ? { nama_proyek: { contains: search, mode: "insensitive" as const } } : {};

  const [total, items] = await Promise.all([
    prisma.proyekBerjalan.count({ where }),
    prisma.proyekBerjalan.findMany({
      where,
      include: {
        termins: {
          include: { tasks: true },
          orderBy: { urutan: "asc" },
        },
        lead: true,
        ro: { select: { id: true, name: true } },
      },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const mapped = items.map((p) => {
    const allTasks = p.termins.flatMap((t) => t.tasks);
    return {
      id: p.id,
      nama_proyek: p.nama_proyek,
      lead: p.lead ? { id: p.lead.id, nama: p.lead.nama } : null,
      ro: p.ro ? { id: p.ro.id, nama: p.ro.name } : null,
      lokasi: p.lokasi,
      nilai_rab: parseFloat(String(p.nilai_rab ?? 0)),
      tanggal_mulai: fmtDate(p.tanggal_mulai),
      tanggal_selesai: fmtDate(p.tanggal_selesai),
      jumlah_termin: p.termins.length,
      jumlah_task: allTasks.length,
      tasks_selesai: allTasks.filter((t) => t.status === "Selesai").length,
      progress: calcProgress(allTasks),
    };
  });
  return res.json(paginateResponse(mapped, total, page, limit));
});

// POST /projeks
router.post("/projeks", async (req: Request, res: Response) => {
  const { nama_proyek, lead_id, ro_id, lokasi, nilai_rab, tanggal_mulai, tanggal_selesai } = req.body;
  const p = await prisma.proyekBerjalan.create({
    data: {
      nama_proyek: nama_proyek ?? null,
      lead_id: lead_id ? BigInt(lead_id) : null,
      ro_id: ro_id ? BigInt(ro_id) : null,
      lokasi: lokasi ?? null,
      nilai_rab: nilai_rab ?? 0,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: p.id });
});

// GET /projeks/:id
router.get("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.proyekBerjalan.findUnique({
    where: { id },
    include: {
      termins: {
        include: {
          tasks: {
            include: { assigned_user: { select: { id: true, name: true } } },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { urutan: "asc" },
      },
      lead: true,
      pic: { select: { id: true, name: true } },
      ro: { select: { id: true, name: true } },
    },
  });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });

  const allTasks = p.termins.flatMap((t) => t.tasks);
  return res.json({
    id: p.id,
    nama_proyek: p.nama_proyek,
    lead: p.lead ? { id: p.lead.id, nama: p.lead.nama } : null,
    ro: p.ro ? { id: p.ro.id, nama: p.ro.name } : null,
    lokasi: p.lokasi,
    nilai_rab: parseFloat(String(p.nilai_rab ?? 0)),
    tanggal_mulai: fmtDate(p.tanggal_mulai),
    tanggal_selesai: fmtDate(p.tanggal_selesai),
    dibuat_oleh: p.pic ? { id: p.pic.id, nama: p.pic.name } : null,
    progress: calcProgress(allTasks),
    termins: p.termins.map((t) => ({
      id: t.id,
      urutan: t.urutan,
      nama: t.nama,
      tanggal_mulai: fmtDate(t.tanggal_mulai),
      tanggal_selesai: fmtDate(t.tanggal_selesai),
      progress: calcProgress(t.tasks),
      jumlah_task: t.tasks.length,
      tasks_selesai: t.tasks.filter((tk) => tk.status === "Selesai").length,
      tasks: t.tasks.map((tk) => ({
        id: tk.id,
        nama_pekerjaan: tk.nama_pekerjaan,
        tanggal_mulai: fmtDate(tk.tanggal_mulai),
        tanggal_selesai: fmtDate(tk.tanggal_selesai),
        status: tk.status,
        pic: tk.assigned_user ? { id: tk.assigned_user.id, nama: tk.assigned_user.name } : null,
      })),
    })),
  });
});

// PATCH /projeks/:id
router.patch("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.proyekBerjalan.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });

  const { nama_proyek, lead_id, ro_id, lokasi, nilai_rab, tanggal_mulai, tanggal_selesai } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_proyek !== undefined) updates.nama_proyek = nama_proyek;
  if (lead_id !== undefined) updates.lead_id = lead_id ? BigInt(lead_id) : null;
  if (ro_id !== undefined) updates.ro_id = ro_id ? BigInt(ro_id) : null;
  if (lokasi !== undefined) updates.lokasi = lokasi;
  if (nilai_rab !== undefined) updates.nilai_rab = nilai_rab;
  if (tanggal_mulai !== undefined) updates.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;

  await prisma.proyekBerjalan.update({ where: { id }, data: updates });
  return res.json({ message: "Proyek diupdate" });
});

// DELETE /projeks/:id
router.delete("/projeks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const p = await prisma.proyekBerjalan.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  await prisma.proyekBerjalan.delete({ where: { id } });
  return res.json({ message: "Proyek dihapus" });
});

// POST /projeks/:id/termins
router.post("/projeks/:id/termins", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const p = await prisma.proyekBerjalan.findUnique({ where: { id: proyekId } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });

  const { nama, tanggal_mulai, tanggal_selesai } = req.body;

  if (tanggal_mulai && p.tanggal_mulai && new Date(tanggal_mulai) < p.tanggal_mulai) {
    return res.status(400).json({ detail: `Tanggal mulai termin tidak boleh sebelum ${fmtDate(p.tanggal_mulai)}` });
  }
  if (tanggal_selesai && p.tanggal_selesai && new Date(tanggal_selesai) > p.tanggal_selesai) {
    return res.status(400).json({ detail: `Tanggal selesai termin tidak boleh melewati ${fmtDate(p.tanggal_selesai)}` });
  }

  const lastTermin = await prisma.proyekBerjalanTermin.findFirst({
    where: { proyek_berjalan_id: proyekId },
    orderBy: { urutan: "desc" },
  });
  const urutan = (lastTermin?.urutan ?? 0) + 1;

  const t = await prisma.proyekBerjalanTermin.create({
    data: {
      proyek_berjalan_id: proyekId,
      urutan,
      nama: nama ?? `Termin ${urutan}`,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
    },
  });
  return res.status(201).json({ id: t.id, urutan });
});

// PATCH /termins/:id
router.patch("/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.proyekBerjalanTermin.findUnique({
    where: { id },
    include: { proyek_berjalan: true },
  });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });

  const { nama, tanggal_mulai, tanggal_selesai, rab } = req.body;
  const p = t.proyek_berjalan;
  const updates: Record<string, unknown> = {};

  if (nama !== undefined) updates.nama = nama;
  if (rab !== undefined) updates.rab = rab ?? 0;
  if (tanggal_mulai !== undefined) {
    const newDate = tanggal_mulai ? new Date(tanggal_mulai) : null;
    if (newDate && p.tanggal_mulai && newDate < p.tanggal_mulai) {
      return res.status(400).json({ detail: `Tanggal mulai tidak boleh sebelum ${fmtDate(p.tanggal_mulai)}` });
    }
    updates.tanggal_mulai = newDate;
  }
  if (tanggal_selesai !== undefined) {
    const newDate = tanggal_selesai ? new Date(tanggal_selesai) : null;
    if (newDate && p.tanggal_selesai && newDate > p.tanggal_selesai) {
      return res.status(400).json({ detail: `Tanggal selesai tidak boleh melewati ${fmtDate(p.tanggal_selesai)}` });
    }
    updates.tanggal_selesai = newDate;
  }

  await prisma.proyekBerjalanTermin.update({ where: { id }, data: updates });
  return res.json({ message: "Termin diupdate" });
});

// DELETE /termins/:id
router.delete("/termins/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const t = await prisma.proyekBerjalanTermin.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });
  await prisma.proyekBerjalanTermin.delete({ where: { id } });
  return res.json({ message: "Termin dihapus" });
});

// POST /termins/:id/tasks
router.post("/termins/:id/tasks", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const t = await prisma.proyekBerjalanTermin.findUnique({ where: { id: terminId } });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });

  const { nama_pekerjaan, tanggal_mulai, tanggal_selesai, status, pic } = req.body;

  if (tanggal_mulai && t.tanggal_mulai && new Date(tanggal_mulai) < t.tanggal_mulai) {
    return res.status(400).json({ detail: `Tanggal mulai tidak boleh sebelum ${fmtDate(t.tanggal_mulai)}` });
  }
  if (tanggal_selesai && t.tanggal_selesai && new Date(tanggal_selesai) > t.tanggal_selesai) {
    return res.status(400).json({ detail: `Tanggal selesai tidak boleh melewati ${fmtDate(t.tanggal_selesai)}` });
  }

  const task = await prisma.proyekBerjalanTask.create({
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

// PATCH /tasks/:id
router.patch("/tasks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const task = await prisma.proyekBerjalanTask.findUnique({
    where: { id },
    include: { termin: true },
  });
  if (!task) return res.status(404).json({ detail: "Pekerjaan tidak ditemukan" });

  const { nama_pekerjaan, tanggal_mulai, tanggal_selesai, status, pic } = req.body;
  const t = task.termin;
  const updates: Record<string, unknown> = {};

  if (nama_pekerjaan !== undefined) updates.nama_pekerjaan = nama_pekerjaan;
  if (status !== undefined) {
    const valid = ["Belum Mulai", "Proses", "Selesai"];
    if (!valid.includes(status)) return res.status(400).json({ detail: "Status tidak valid" });
    updates.status = status;
  }
  if (tanggal_mulai !== undefined) {
    const newDate = tanggal_mulai ? new Date(tanggal_mulai) : null;
    if (newDate && t.tanggal_mulai && newDate < t.tanggal_mulai) {
      return res.status(400).json({ detail: `Tanggal mulai tidak boleh sebelum ${fmtDate(t.tanggal_mulai)}` });
    }
    updates.tanggal_mulai = newDate;
  }
  if (tanggal_selesai !== undefined) {
    const newDate = tanggal_selesai ? new Date(tanggal_selesai) : null;
    if (newDate && t.tanggal_selesai && newDate > t.tanggal_selesai) {
      return res.status(400).json({ detail: `Tanggal selesai tidak boleh melewati ${fmtDate(t.tanggal_selesai)}` });
    }
    updates.tanggal_selesai = newDate;
  }
  if (pic !== undefined) updates.assigned_to = pic ? BigInt(pic) : null;

  await prisma.proyekBerjalanTask.update({ where: { id }, data: updates });
  return res.json({ message: "Pekerjaan diupdate" });
});

// DELETE /tasks/:id
router.delete("/tasks/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const task = await prisma.proyekBerjalanTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ detail: "Pekerjaan tidak ditemukan" });
  await prisma.proyekBerjalanTask.delete({ where: { id } });
  return res.json({ message: "Pekerjaan dihapus" });
});

// ── RAPP Endpoints ────────────────────────────────────────────────────────────

// GET /termins/:id/rapp
router.get("/termins/:id/rapp", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const t = await prisma.proyekBerjalanTermin.findUnique({
    where: { id: terminId },
    include: {
      rapp_material_kategoris: {
        orderBy: { urutan: "asc" },
        include: {
          items: { orderBy: { urutan: "asc" } },
        },
      },
      rapp_sipil_items: { orderBy: { urutan: "asc" } },
      rapp_vendor_kategoris: {
        orderBy: { urutan: "asc" },
        include: {
          items: { orderBy: { urutan: "asc" } },
        },
      },
    },
  });
  if (!t) return res.status(404).json({ detail: "Termin tidak ditemukan" });

  const fmtNum = (v: any) => parseFloat(String(v ?? 0));

  return res.json({
    id: t.id,
    rab: fmtNum(t.rab),
    material_kategoris: t.rapp_material_kategoris.map((k) => ({
      id: k.id,
      kode: k.kode,
      nama: k.nama,
      urutan: k.urutan,
      items: k.items.map((i) => ({
        id: i.id,
        material: i.material,
        vol: fmtNum(i.vol),
        sat: i.sat,
        harga_satuan: fmtNum(i.harga_satuan),
        jumlah: fmtNum(i.jumlah),
        urutan: i.urutan,
      })),
    })),
    sipil_items: t.rapp_sipil_items.map((i) => ({
      id: i.id,
      nama: i.nama,
      vol: i.vol !== null ? fmtNum(i.vol) : null,
      sat: i.sat,
      harga_satuan: i.harga_satuan !== null ? fmtNum(i.harga_satuan) : null,
      keterangan: i.keterangan,
      jumlah: fmtNum(i.jumlah),
      urutan: i.urutan,
    })),
    vendor_kategoris: t.rapp_vendor_kategoris.map((k) => ({
      id: k.id,
      nama: k.nama,
      urutan: k.urutan,
      items: k.items.map((i) => ({
        id: i.id,
        nama: i.nama,
        vol: fmtNum(i.vol),
        sat: i.sat,
        harga_satuan: fmtNum(i.harga_satuan),
        jumlah: fmtNum(i.jumlah),
        urutan: i.urutan,
      })),
    })),
  });
});

// POST /termins/:id/rapp/material-kategori
router.post("/termins/:id/rapp/material-kategori", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const { kode, nama } = req.body;
  const last = await prisma.rappMaterialKategori.findFirst({
    where: { termin_id: terminId },
    orderBy: { urutan: "desc" },
  });
  const k = await prisma.rappMaterialKategori.create({
    data: { termin_id: terminId, kode: kode ?? null, nama: nama ?? "Kategori Baru", urutan: (last?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: k.id });
});

// PATCH /rapp/material-kategori/:id
router.patch("/rapp/material-kategori/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { kode, nama } = req.body;
  const updates: Record<string, unknown> = {};
  if (kode !== undefined) updates.kode = kode;
  if (nama !== undefined) updates.nama = nama;
  await prisma.rappMaterialKategori.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /rapp/material-kategori/:id
router.delete("/rapp/material-kategori/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.rappMaterialKategori.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// POST /rapp/material-kategori/:id/items
router.post("/rapp/material-kategori/:id/items", async (req: Request, res: Response) => {
  const kategoriId = BigInt(req.params.id);
  const { material, vol, sat, harga_satuan } = req.body;
  const last = await prisma.rappMaterialItem.findFirst({
    where: { kategori_id: kategoriId },
    orderBy: { urutan: "desc" },
  });
  const vol2 = parseFloat(vol ?? 0);
  const harga2 = parseFloat(harga_satuan ?? 0);
  const jumlah = vol2 * harga2;
  const item = await prisma.rappMaterialItem.create({
    data: {
      kategori_id: kategoriId,
      material: material ?? "",
      vol: vol2,
      sat: sat ?? null,
      harga_satuan: harga2,
      jumlah,
      urutan: (last?.urutan ?? 0) + 1,
    },
  });
  return res.status(201).json({ id: item.id });
});

// PATCH /rapp/material-items/:id
router.patch("/rapp/material-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { material, vol, sat, harga_satuan } = req.body;
  const updates: Record<string, unknown> = {};
  if (material !== undefined) updates.material = material;
  if (sat !== undefined) updates.sat = sat;
  if (vol !== undefined || harga_satuan !== undefined) {
    const cur = await prisma.rappMaterialItem.findUnique({ where: { id } });
    const v = vol !== undefined ? parseFloat(vol) : parseFloat(String(cur?.vol ?? 0));
    const h = harga_satuan !== undefined ? parseFloat(harga_satuan) : parseFloat(String(cur?.harga_satuan ?? 0));
    if (vol !== undefined) updates.vol = v;
    if (harga_satuan !== undefined) updates.harga_satuan = h;
    updates.jumlah = v * h;
  }
  await prisma.rappMaterialItem.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /rapp/material-items/:id
router.delete("/rapp/material-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.rappMaterialItem.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// POST /termins/:id/rapp/sipil-items
router.post("/termins/:id/rapp/sipil-items", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const { nama, vol, sat, harga_satuan, keterangan, jumlah } = req.body;
  const last = await prisma.rappSipilItem.findFirst({
    where: { termin_id: terminId },
    orderBy: { urutan: "desc" },
  });
  const vol2 = vol !== undefined && vol !== null ? parseFloat(vol) : null;
  const harga2 = harga_satuan !== undefined && harga_satuan !== null ? parseFloat(harga_satuan) : null;
  const jumlah2 = jumlah !== undefined ? parseFloat(jumlah) : (vol2 !== null && harga2 !== null ? vol2 * harga2 : 0);
  const item = await prisma.rappSipilItem.create({
    data: {
      termin_id: terminId,
      nama: nama ?? "",
      vol: vol2 ?? undefined,
      sat: sat ?? null,
      harga_satuan: harga2 ?? undefined,
      keterangan: keterangan ?? null,
      jumlah: jumlah2,
      urutan: (last?.urutan ?? 0) + 1,
    },
  });
  return res.status(201).json({ id: item.id });
});

// PATCH /rapp/sipil-items/:id
router.patch("/rapp/sipil-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama, vol, sat, harga_satuan, keterangan, jumlah } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama !== undefined) updates.nama = nama;
  if (sat !== undefined) updates.sat = sat;
  if (keterangan !== undefined) updates.keterangan = keterangan;
  if (vol !== undefined) updates.vol = vol !== null ? parseFloat(vol) : null;
  if (harga_satuan !== undefined) updates.harga_satuan = harga_satuan !== null ? parseFloat(harga_satuan) : null;
  if (jumlah !== undefined) {
    updates.jumlah = parseFloat(jumlah);
  } else if (vol !== undefined || harga_satuan !== undefined) {
    const cur = await prisma.rappSipilItem.findUnique({ where: { id } });
    const v = vol !== undefined ? (vol !== null ? parseFloat(vol) : null) : (cur?.vol !== null ? parseFloat(String(cur?.vol)) : null);
    const h = harga_satuan !== undefined ? (harga_satuan !== null ? parseFloat(harga_satuan) : null) : (cur?.harga_satuan !== null ? parseFloat(String(cur?.harga_satuan)) : null);
    if (v !== null && h !== null) updates.jumlah = v * h;
  }
  await prisma.rappSipilItem.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /rapp/sipil-items/:id
router.delete("/rapp/sipil-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.rappSipilItem.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// POST /termins/:id/rapp/vendor-kategori
router.post("/termins/:id/rapp/vendor-kategori", async (req: Request, res: Response) => {
  const terminId = BigInt(req.params.id);
  const { nama } = req.body;
  const last = await prisma.rappVendorKategori.findFirst({
    where: { termin_id: terminId },
    orderBy: { urutan: "desc" },
  });
  const k = await prisma.rappVendorKategori.create({
    data: { termin_id: terminId, nama: nama ?? "Pekerjaan Vendor", urutan: (last?.urutan ?? 0) + 1 },
  });
  return res.status(201).json({ id: k.id });
});

// PATCH /rapp/vendor-kategori/:id
router.patch("/rapp/vendor-kategori/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama } = req.body;
  if (nama !== undefined) await prisma.rappVendorKategori.update({ where: { id }, data: { nama } });
  return res.json({ message: "OK" });
});

// DELETE /rapp/vendor-kategori/:id
router.delete("/rapp/vendor-kategori/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.rappVendorKategori.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// POST /rapp/vendor-kategori/:id/items
router.post("/rapp/vendor-kategori/:id/items", async (req: Request, res: Response) => {
  const kategoriId = BigInt(req.params.id);
  const { nama, vol, sat, harga_satuan } = req.body;
  const last = await prisma.rappVendorItem.findFirst({
    where: { kategori_id: kategoriId },
    orderBy: { urutan: "desc" },
  });
  const vol2 = parseFloat(vol ?? 0);
  const harga2 = parseFloat(harga_satuan ?? 0);
  const item = await prisma.rappVendorItem.create({
    data: {
      kategori_id: kategoriId,
      nama: nama ?? "",
      vol: vol2,
      sat: sat ?? null,
      harga_satuan: harga2,
      jumlah: vol2 * harga2,
      urutan: (last?.urutan ?? 0) + 1,
    },
  });
  return res.status(201).json({ id: item.id });
});

// PATCH /rapp/vendor-items/:id
router.patch("/rapp/vendor-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama, vol, sat, harga_satuan } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama !== undefined) updates.nama = nama;
  if (sat !== undefined) updates.sat = sat;
  if (vol !== undefined || harga_satuan !== undefined) {
    const cur = await prisma.rappVendorItem.findUnique({ where: { id } });
    const v = vol !== undefined ? parseFloat(vol) : parseFloat(String(cur?.vol ?? 0));
    const h = harga_satuan !== undefined ? parseFloat(harga_satuan) : parseFloat(String(cur?.harga_satuan ?? 0));
    if (vol !== undefined) updates.vol = v;
    if (harga_satuan !== undefined) updates.harga_satuan = h;
    updates.jumlah = v * h;
  }
  await prisma.rappVendorItem.update({ where: { id }, data: updates });
  return res.json({ message: "OK" });
});

// DELETE /rapp/vendor-items/:id
router.delete("/rapp/vendor-items/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.rappVendorItem.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// ── Stock Opname ───────────────────────────────────────────────────────────

// GET /projeks/:id/stock-opname/rapp — flat list of all RAPP items across termins
router.get("/projeks/:id/stock-opname/rapp", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const termins = await prisma.proyekBerjalanTermin.findMany({
    where: { proyek_berjalan_id: proyekId },
    orderBy: { urutan: "asc" },
    include: {
      rapp_material_kategoris: { orderBy: { urutan: "asc" }, include: { items: { orderBy: { urutan: "asc" } } } },
      rapp_sipil_items: { orderBy: { urutan: "asc" } },
      rapp_vendor_kategoris: { orderBy: { urutan: "asc" }, include: { items: { orderBy: { urutan: "asc" } } } },
    },
  });
  const fmtNum = (v: any) => parseFloat(String(v ?? 0));
  return res.json(
    termins.map((t) => ({
      id: t.id,
      urutan: t.urutan,
      nama: t.nama,
      material_kategoris: t.rapp_material_kategoris.map((k) => ({
        id: k.id,
        nama: k.nama,
        items: k.items.map((i) => ({ id: i.id, nama: i.material, vol: fmtNum(i.vol), sat: i.sat, type: "material" })),
      })),
      sipil_items: t.rapp_sipil_items.map((i) => ({ id: i.id, nama: i.nama, vol: i.vol !== null ? fmtNum(i.vol) : null, sat: i.sat, type: "sipil" })),
      vendor_kategoris: t.rapp_vendor_kategoris.map((k) => ({
        id: k.id,
        nama: k.nama,
        items: k.items.map((i) => ({ id: i.id, nama: i.nama, vol: fmtNum(i.vol), sat: i.sat, type: "vendor" })),
      })),
    }))
  );
});

// GET /projeks/:id/stock-opname/logs
router.get("/projeks/:id/stock-opname/logs", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const { page, limit, skip } = getPagination(req.query, 50, 200);

  const [total, logs] = await Promise.all([
    prisma.sipilUsageLog.count({ where: { proyek_id: proyekId } }),
    prisma.sipilUsageLog.findMany({
      where: { proyek_id: proyekId },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  const mapped = logs.map((l) => ({
    id: String(l.id),
    item_ref_type: l.item_ref_type,
    item_ref_id: String(l.item_ref_id),
    item_nama: l.item_nama,
    item_satuan: l.item_satuan,
    qty_pakai: parseFloat(String(l.qty_pakai)),
    tanggal: l.tanggal.toISOString().split("T")[0],
    catatan: l.catatan,
    created_by: l.creator ? { id: String(l.creator.id), name: l.creator.name } : null,
    created_at: l.created_at,
  }));
  return res.json(paginateResponse(mapped, total, page, limit));
});

// POST /projeks/:id/stock-opname/logs
router.post("/projeks/:id/stock-opname/logs", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const { item_ref_type, item_ref_id, item_nama, item_satuan, qty_pakai, tanggal, catatan } = req.body;
  if (!item_ref_type || !item_ref_id || !item_nama || !qty_pakai || !tanggal)
    return res.status(400).json({ detail: "item_ref_type, item_ref_id, item_nama, qty_pakai, tanggal wajib diisi" });
  const log = await prisma.sipilUsageLog.create({
    data: {
      proyek_id: proyekId,
      item_ref_type,
      item_ref_id: BigInt(item_ref_id),
      item_nama,
      item_satuan: item_satuan ?? null,
      qty_pakai: parseFloat(qty_pakai),
      tanggal: new Date(tanggal),
      catatan: catatan ?? null,
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: String(log.id) });
});

// DELETE /stock-opname/logs/:id
router.delete("/stock-opname/logs/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.sipilUsageLog.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// ── Docs/Link ──────────────────────────────────────────────────────────────

// GET /projeks/:id/links
router.get("/projeks/:id/links", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const links = await prisma.projectLink.findMany({
    where: { linkable_type: "sipil_projek", linkable_id: proyekId },
    orderBy: { created_at: "asc" },
    include: { users: { select: { id: true, name: true } } },
  });
  return res.json(links.map((l) => ({ ...l, id: String(l.id), linkable_id: String(l.linkable_id), created_by: l.created_by ? String(l.created_by) : null })));
});

// POST /projeks/:id/links (supports JSON url OR multipart file upload)
router.post("/projeks/:id/links", docsUpload.single("file"), async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const { title, catatan } = req.body;
  let url: string = req.body.url ?? "";
  if (req.file) {
    url = `/storage/sipil-docs/${req.file.filename}`;
  }
  if (!title) return res.status(400).json({ detail: "title wajib diisi" });
  if (!url) return res.status(400).json({ detail: "url atau file wajib diisi" });
  const link = await prisma.projectLink.create({
    data: { linkable_type: "sipil_projek", linkable_id: proyekId, title, url, catatan: catatan || null, created_by: (req as any).user?.id ?? null },
  });
  return res.json({ ...link, id: String(link.id), linkable_id: String(link.linkable_id), created_by: link.created_by ? String(link.created_by) : null });
});

// DELETE /links/:id
router.delete("/links/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const link = await prisma.projectLink.findUnique({ where: { id } });
  if (link?.url?.startsWith("/storage/sipil-docs/")) {
    const filePath = path.resolve(config.storagePath, link.url.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await prisma.projectLink.delete({ where: { id } });
  return res.json({ message: "OK" });
});

// ── Task Foto Endpoints ────────────────────────────────────────────────────────

// GET /tasks/:id/fotos
router.get("/tasks/:id/fotos", async (req: Request, res: Response) => {
  const taskId = BigInt(req.params.id);
  const fotos = await prisma.proyekBerjalanTaskFoto.findMany({
    where: { task_id: taskId },
    orderBy: { created_at: "asc" },
  });
  return res.json(fotos.map((f) => ({ ...f, id: String(f.id), task_id: String(f.task_id) })));
});

// POST /tasks/:id/fotos
router.post("/tasks/:id/fotos", docsUpload.array("fotos", 10), async (req: Request, res: Response) => {
  const taskId = BigInt(req.params.id);
  const task = await prisma.proyekBerjalanTask.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ detail: "Task tidak ditemukan" });
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) return res.status(400).json({ detail: "Tidak ada file yang diupload" });
  const created = await prisma.$transaction(
    files.map((f) =>
      prisma.proyekBerjalanTaskFoto.create({
        data: { task_id: taskId, file_path: `/storage/sipil-docs/${f.filename}`, original_name: f.originalname },
      })
    )
  );
  return res.status(201).json(created.map((f) => ({ ...f, id: String(f.id), task_id: String(f.task_id) })));
});

// DELETE /tasks/fotos/:fotoId
router.delete("/tasks/fotos/:fotoId", async (req: Request, res: Response) => {
  const fotoId = BigInt(req.params.fotoId);
  const foto = await prisma.proyekBerjalanTaskFoto.findUnique({ where: { id: fotoId } });
  if (!foto) return res.status(404).json({ detail: "Foto tidak ditemukan" });
  const filePath = path.resolve(config.storagePath, foto.file_path.replace(/^\/storage\//, ""));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await prisma.proyekBerjalanTaskFoto.delete({ where: { id: fotoId } });
  return res.json({ message: "Foto dihapus" });
});

// ── Form Checklist Sipil ─────────────────────────────────────────────────────

// GET /projeks/:id/checklist
router.get("/projeks/:id/checklist", async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const items = await prisma.checklistSipil.findMany({
    where: { proyek_id: proyekId },
    orderBy: { urutan: "asc" },
  });
  return res.json(items.map((i) => ({ ...i, id: String(i.id), proyek_id: String(i.proyek_id) })));
});

// POST /projeks/:id/checklist
router.post("/projeks/:id/checklist", docsUpload.single("gambar"), async (req: Request, res: Response) => {
  const proyekId = BigInt(req.params.id);
  const proyek = await prisma.proyekBerjalan.findUnique({ where: { id: proyekId } });
  if (!proyek) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  const { nama_pekerjaan } = req.body;
  if (!nama_pekerjaan) return res.status(400).json({ detail: "nama_pekerjaan wajib diisi" });
  const maxUrutan = await prisma.checklistSipil.aggregate({ where: { proyek_id: proyekId }, _max: { urutan: true } });
  const file = req.file as Express.Multer.File | undefined;
  const item = await prisma.checklistSipil.create({
    data: {
      proyek_id: proyekId,
      nama_pekerjaan,
      gambar_path: file ? `/storage/sipil-docs/${file.filename}` : null,
      urutan: (maxUrutan._max.urutan ?? -1) + 1,
    },
  });
  return res.status(201).json({ ...item, id: String(item.id), proyek_id: String(item.proyek_id) });
});

// PATCH /checklist/:cid
router.patch("/checklist/:cid", docsUpload.fields([{ name: "gambar", maxCount: 1 }, { name: "gambar_selesai", maxCount: 1 }]), async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  const existing = await prisma.checklistSipil.findUnique({ where: { id: cid } });
  if (!existing) return res.status(404).json({ detail: "Checklist item tidak ditemukan" });
  const data: any = {};
  if (req.body.nama_pekerjaan !== undefined) data.nama_pekerjaan = req.body.nama_pekerjaan;
  if (req.body.is_checked !== undefined) data.is_checked = req.body.is_checked === "true" || req.body.is_checked === true;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const gambar = files?.gambar?.[0];
  if (gambar) {
    if (existing.gambar_path) {
      const oldPath = path.resolve(config.storagePath, existing.gambar_path.replace(/^\/storage\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    data.gambar_path = `/storage/sipil-docs/${gambar.filename}`;
  }
  const gambarSelesai = files?.gambar_selesai?.[0];
  if (gambarSelesai) {
    if (existing.gambar_selesai_path) {
      const oldPath = path.resolve(config.storagePath, existing.gambar_selesai_path.replace(/^\/storage\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    data.gambar_selesai_path = `/storage/sipil-docs/${gambarSelesai.filename}`;
  }
  const updated = await prisma.checklistSipil.update({ where: { id: cid }, data });
  return res.json({ ...updated, id: String(updated.id), proyek_id: String(updated.proyek_id) });
});

// DELETE /checklist/:cid
router.delete("/checklist/:cid", async (req: Request, res: Response) => {
  const cid = BigInt(req.params.cid);
  const existing = await prisma.checklistSipil.findUnique({ where: { id: cid } });
  if (!existing) return res.status(404).json({ detail: "Checklist item tidak ditemukan" });
  for (const p of [existing.gambar_path, existing.gambar_selesai_path]) {
    if (p) {
      const filePath = path.resolve(config.storagePath, p.replace(/^\/storage\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
  await prisma.checklistSipil.delete({ where: { id: cid } });
  return res.json({ message: "Checklist item dihapus" });
});

export default router;
