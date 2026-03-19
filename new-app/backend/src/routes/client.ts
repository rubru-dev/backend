import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/security";
import { config } from "../config";

const router = Router();

// ── Multer setup ───────────────────────────────────────────────────────────────
const clientUploadDir = path.resolve(config.storagePath, "client-portal");
const galeriDir = path.join(clientUploadDir, "galeri");
const dokumenDir = path.join(clientUploadDir, "dokumen");
const aktivitasDir = path.join(clientUploadDir, "aktivitas");
for (const dir of [clientUploadDir, galeriDir, dokumenDir, aktivitasDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(dest: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      cb(null, `${Date.now()}_${base}${ext}`);
    },
  });
}

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_MIME = [
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const galeriUpload = multer({
  storage: makeStorage(galeriDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Hanya file gambar (JPG, PNG, WEBP, GIF) yang diizinkan."));
  },
});

const dokumenUpload = multer({
  storage: makeStorage(dokumenDir),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (DOC_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Hanya PDF, gambar, dan dokumen Office yang diizinkan."));
  },
});

const aktivitasUpload = multer({
  storage: makeStorage(path.join(clientUploadDir, "aktivitas")),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Hanya file gambar yang diizinkan untuk foto progress."));
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function toNum(v: unknown) { return parseFloat(String(v ?? 0)); }

function isSuperAdmin(req: Request) {
  return req.user?.roles?.some((r: any) => r.role.name === "Super Admin") ?? false;
}

async function _recalcProgress(projectId: bigint) {
  const [total, selesai] = await Promise.all([
    prisma.clientPortalAktivitas.count({ where: { project_id: projectId } }),
    prisma.clientPortalAktivitas.count({ where: { project_id: projectId, status: "Selesai" } }),
  ]);
  const persen = total > 0 ? Math.round((selesai / total) * 100) : 0;
  await prisma.clientPortalProject.update({ where: { id: projectId }, data: { progress_persen: persen } });
}

function projectDetail(p: any) {
  return {
    id: p.id,
    lead_id: p.lead_id,
    adm_finance_project_id: p.adm_finance_project_id,
    nama_proyek: p.nama_proyek,
    klien: p.klien,
    alamat: p.alamat,
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
    status_proyek: p.status_proyek,
    progress_persen: p.progress_persen,
    catatan: p.catatan,
    created_at: p.created_at,
    lead: p.lead ? { id: p.lead.id, nama: p.lead.nama, nomor_telepon: p.lead.nomor_telepon } : null,
    account: p.lead?.client_portal_account
      ? { username: p.lead.client_portal_account.username, is_active: p.lead.client_portal_account.is_active, last_login_at: p.lead.client_portal_account.last_login_at }
      : null,
  };
}

// ── GET /adm-projects-dropdown ────────────────────────────────────────────────
// Daftar AdmFinanceProject untuk dropdown link ke ClientPortalProject
router.get("/adm-projects-dropdown", async (_req: Request, res: Response) => {
  const items = await prisma.admFinanceProject.findMany({
    select: { id: true, nama_proyek: true, klien: true },
    orderBy: { id: "desc" },
  });
  return res.json(items.map((p) => ({ id: p.id, label: p.nama_proyek ?? `Projek #${p.id}`, klien: p.klien })));
});

// ── GET /leads-dropdown ───────────────────────────────────────────────────────
// Leads dengan status "Client" yang belum punya portal project
router.get("/leads-dropdown", async (_req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({
    where: {
      status: "Client",
      client_portal_project: null,
    },
    select: { id: true, nama: true, nomor_telepon: true, jenis: true, alamat: true },
    orderBy: { nama: "asc" },
  });
  return res.json(leads);
});

// ── GET /projects ─────────────────────────────────────────────────────────────
router.get("/projects", async (_req: Request, res: Response) => {
  const projects = await prisma.clientPortalProject.findMany({
    include: {
      lead: {
        select: {
          id: true, nama: true, nomor_telepon: true,
          client_portal_account: { select: { username: true, is_active: true, last_login_at: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
  return res.json(projects.map(projectDetail));
});

// ── POST /projects ────────────────────────────────────────────────────────────
router.post("/projects", async (req: Request, res: Response) => {
  const {
    lead_id, adm_finance_project_id, nama_proyek, klien, alamat,
    tanggal_mulai, tanggal_selesai, status_proyek, progress_persen, catatan,
    username, password,
  } = req.body;

  if (!lead_id || !nama_proyek || !username || !password) {
    res.status(400).json({ detail: "lead_id, nama_proyek, username, dan password wajib diisi" });
    return;
  }

  const leadId = BigInt(lead_id);

  // Cek lead exists
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) { res.status(404).json({ detail: "Lead tidak ditemukan" }); return; }

  // Cek belum ada project/account untuk lead ini
  const existing = await prisma.clientPortalProject.findUnique({ where: { lead_id: leadId } });
  if (existing) { res.status(400).json({ detail: "Lead ini sudah memiliki portal project" }); return; }

  const existingAccount = await prisma.clientPortalAccount.findUnique({ where: { username } });
  if (existingAccount) { res.status(400).json({ detail: "Username sudah digunakan" }); return; }

  const createdById = req.user?.id ?? null;

  // Buat project + account dalam satu transaksi
  const [project] = await prisma.$transaction([
    prisma.clientPortalProject.create({
      data: {
        lead_id: leadId,
        adm_finance_project_id: adm_finance_project_id ? BigInt(adm_finance_project_id) : null,
        nama_proyek,
        klien: klien ?? lead.nama,
        alamat: alamat ?? lead.alamat ?? null,
        tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
        tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
        status_proyek: status_proyek ?? "Berjalan",
        progress_persen: progress_persen ?? 0,
        catatan: catatan ?? null,
        created_by: createdById,
      },
    }),
    prisma.clientPortalAccount.create({
      data: {
        lead_id: leadId,
        username,
        password: hashPassword(password),
        is_active: true,
      },
    }),
  ]);

  return res.status(201).json({ id: project.id, message: "Portal project dan akun berhasil dibuat" });
});

// ── GET /projects/:id ─────────────────────────────────────────────────────────
router.get("/projects/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const project = await prisma.clientPortalProject.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true, nama: true, nomor_telepon: true,
          client_portal_account: { select: { username: true, is_active: true, last_login_at: true } },
        },
      },
    },
  });
  if (!project) { res.status(404).json({ detail: "Project tidak ditemukan" }); return; }
  return res.json(projectDetail(project));
});

// ── PATCH /projects/:id ───────────────────────────────────────────────────────
router.patch("/projects/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const {
    nama_proyek, klien, alamat, tanggal_mulai, tanggal_selesai,
    status_proyek, progress_persen, catatan, adm_finance_project_id,
  } = req.body;

  const project = await prisma.clientPortalProject.update({
    where: { id },
    data: {
      ...(nama_proyek !== undefined && { nama_proyek }),
      ...(klien !== undefined && { klien }),
      ...(alamat !== undefined && { alamat }),
      ...(tanggal_mulai !== undefined && { tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null }),
      ...(tanggal_selesai !== undefined && { tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null }),
      ...(status_proyek !== undefined && { status_proyek }),
      ...(progress_persen !== undefined && { progress_persen: parseInt(progress_persen) }),
      ...(catatan !== undefined && { catatan }),
      ...(adm_finance_project_id !== undefined && { adm_finance_project_id: adm_finance_project_id ? BigInt(adm_finance_project_id) : null }),
    },
  });
  return res.json({ id: project.id, message: "Project berhasil diupdate" });
});

// ── PATCH /projects/:id/account ───────────────────────────────────────────────
router.patch("/projects/:id/account", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { password, is_active } = req.body;

  const project = await prisma.clientPortalProject.findUnique({ where: { id } });
  if (!project) { res.status(404).json({ detail: "Project tidak ditemukan" }); return; }

  const account = await prisma.clientPortalAccount.findUnique({ where: { lead_id: project.lead_id } });
  if (!account) { res.status(404).json({ detail: "Akun tidak ditemukan" }); return; }

  await prisma.clientPortalAccount.update({
    where: { id: account.id },
    data: {
      ...(password && { password: hashPassword(password) }),
      ...(is_active !== undefined && { is_active: Boolean(is_active) }),
    },
  });
  return res.json({ message: "Akun berhasil diupdate" });
});

// ── DELETE /projects/:id (Super Admin only) ───────────────────────────────────
router.delete("/projects/:id", async (req: Request, res: Response) => {
  if (!isSuperAdmin(req)) {
    res.status(403).json({ detail: "Hanya Super Admin yang dapat menghapus data klien" });
    return;
  }
  const id = BigInt(req.params.id);
  const project = await prisma.clientPortalProject.findUnique({
    where: { id },
    include: { lead: { select: { id: true } } },
  });
  if (!project) { res.status(404).json({ detail: "Project tidak ditemukan" }); return; }

  // Hapus file-file galeri & dokumen fisik
  const [galeris, dokumens, aktivitas] = await Promise.all([
    prisma.clientPortalGaleri.findMany({ where: { project_id: id } }),
    prisma.clientPortalDokumen.findMany({ where: { project_id: id } }),
    prisma.clientPortalAktivitas.findMany({ where: { project_id: id } }),
  ]);
  for (const g of galeris) { if (g.file_path && fs.existsSync(g.file_path)) fs.unlinkSync(g.file_path); }
  for (const d of dokumens) { if (d.file_path && fs.existsSync(d.file_path)) fs.unlinkSync(d.file_path); }
  for (const a of aktivitas) { if ((a as any).foto_progress && fs.existsSync((a as any).foto_progress)) fs.unlinkSync((a as any).foto_progress); }

  // Hapus akun portal (berdasarkan lead_id)
  await prisma.clientPortalAccount.deleteMany({ where: { lead_id: project.lead_id } });
  // Hapus project (cascade deletes terkait)
  await prisma.clientPortalProject.delete({ where: { id } });
  return res.json({ message: "Data klien berhasil dihapus" });
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

router.get("/projects/:id/payments", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const payments = await prisma.clientPortalPayment.findMany({
    where: { project_id: projectId },
    orderBy: { termin_ke: "asc" },
  });
  return res.json(payments.map((p) => ({ ...p, tagihan: toNum(p.tagihan), retensi: toNum(p.retensi) })));
});

router.post("/projects/:id/payments", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const { termin_ke, nama_termin, tagihan, retensi, status, jatuh_tempo, tanggal_bayar, catatan } = req.body;
  if (!termin_ke || !nama_termin) {
    res.status(400).json({ detail: "termin_ke dan nama_termin wajib diisi" }); return;
  }
  const payment = await prisma.clientPortalPayment.create({
    data: {
      project_id: projectId,
      termin_ke: parseInt(termin_ke),
      nama_termin,
      tagihan: tagihan ?? 0,
      retensi: retensi ?? 0,
      status: status ?? "Belum Dibayar",
      jatuh_tempo: jatuh_tempo ? new Date(jatuh_tempo) : null,
      tanggal_bayar: tanggal_bayar ? new Date(tanggal_bayar) : null,
      catatan: catatan ?? null,
    },
  });
  return res.status(201).json({ id: payment.id, message: "Payment berhasil ditambahkan" });
});

router.patch("/projects/:id/payments/:pid", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  const { termin_ke, nama_termin, tagihan, retensi, status, jatuh_tempo, tanggal_bayar, catatan } = req.body;
  const payment = await prisma.clientPortalPayment.update({
    where: { id: pid },
    data: {
      ...(termin_ke !== undefined && { termin_ke: parseInt(termin_ke) }),
      ...(nama_termin !== undefined && { nama_termin }),
      ...(tagihan !== undefined && { tagihan }),
      ...(retensi !== undefined && { retensi }),
      ...(status !== undefined && { status }),
      ...(jatuh_tempo !== undefined && { jatuh_tempo: jatuh_tempo ? new Date(jatuh_tempo) : null }),
      ...(tanggal_bayar !== undefined && { tanggal_bayar: tanggal_bayar ? new Date(tanggal_bayar) : null }),
      ...(catatan !== undefined && { catatan }),
    },
  });
  return res.json({ id: payment.id, message: "Payment berhasil diupdate" });
});

router.delete("/projects/:id/payments/:pid", async (req: Request, res: Response) => {
  const pid = BigInt(req.params.pid);
  await prisma.clientPortalPayment.delete({ where: { id: pid } });
  return res.json({ message: "Payment berhasil dihapus" });
});

// ── GALERI ────────────────────────────────────────────────────────────────────

router.get("/projects/:id/galeri", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const items = await prisma.clientPortalGaleri.findMany({
    where: { project_id: projectId },
    orderBy: { tanggal_foto: "desc" },
  });
  return res.json(items.map((g) => ({
    ...g,
    file_url: g.file_path ? `/storage/client-portal/galeri/${path.basename(g.file_path)}` : null,
  })));
});

router.post("/projects/:id/galeri", galeriUpload.array("foto", 20), async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const { judul, deskripsi, tanggal_foto } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) { res.status(400).json({ detail: "File foto wajib diupload" }); return; }

  const created = await Promise.all(files.map((file) =>
    prisma.clientPortalGaleri.create({
      data: {
        project_id: projectId,
        judul: judul ?? null,
        deskripsi: deskripsi ?? null,
        file_path: file.path,
        tanggal_foto: tanggal_foto ? new Date(tanggal_foto) : new Date(),
        created_by: req.user?.id ?? null,
      },
    })
  ));
  return res.status(201).json({ ids: created.map((g) => g.id), message: `${created.length} foto berhasil diupload` });
});

router.delete("/projects/:id/galeri/:gid", async (req: Request, res: Response) => {
  const gid = BigInt(req.params.gid);
  const galeri = await prisma.clientPortalGaleri.findUnique({ where: { id: gid } });
  if (!galeri) { res.status(404).json({ detail: "Foto tidak ditemukan" }); return; }
  if (galeri.file_path && fs.existsSync(galeri.file_path)) fs.unlinkSync(galeri.file_path);
  await prisma.clientPortalGaleri.delete({ where: { id: gid } });
  return res.json({ message: "Foto berhasil dihapus" });
});

// ── DOKUMEN ───────────────────────────────────────────────────────────────────

router.get("/projects/:id/dokumen", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const items = await prisma.clientPortalDokumen.findMany({
    where: { project_id: projectId },
    orderBy: { tanggal_upload: "desc" },
  });
  return res.json(items.map((d) => ({
    ...d,
    folder_name: d.folder_name ?? null,
    file_url: d.file_path ? `/storage/client-portal/dokumen/${path.basename(d.file_path)}` : null,
  })));
});

router.post("/projects/:id/dokumen", dokumenUpload.array("file", 20), async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const { nama_file, deskripsi, kategori, folder_name, tanggal_upload } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) { res.status(400).json({ detail: "File wajib diupload" }); return; }

  const created = await Promise.all(files.map((file) =>
    prisma.clientPortalDokumen.create({
      data: {
        project_id: projectId,
        nama_file: files.length === 1 ? (nama_file ?? file.originalname) : file.originalname,
        folder_name: folder_name ?? null,
        deskripsi: deskripsi ?? null,
        kategori: kategori ?? "Umum",
        file_path: file.path,
        file_type: path.extname(file.originalname).replace(".", ""),
        tanggal_upload: tanggal_upload ? new Date(tanggal_upload) : new Date(),
        created_by: req.user?.id ?? null,
      },
    })
  ));
  return res.status(201).json({ ids: created.map((d) => d.id), message: `${created.length} dokumen berhasil diupload` });
});

router.delete("/projects/:id/dokumen/:did", async (req: Request, res: Response) => {
  const did = BigInt(req.params.did);
  const dok = await prisma.clientPortalDokumen.findUnique({ where: { id: did } });
  if (!dok) { res.status(404).json({ detail: "Dokumen tidak ditemukan" }); return; }
  if (dok.file_path && fs.existsSync(dok.file_path)) fs.unlinkSync(dok.file_path);
  await prisma.clientPortalDokumen.delete({ where: { id: did } });
  return res.json({ message: "Dokumen berhasil dihapus" });
});

// ── AKTIVITAS ─────────────────────────────────────────────────────────────────

router.get("/projects/:id/aktivitas", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const items = await prisma.clientPortalAktivitas.findMany({
    where: { project_id: projectId },
    orderBy: [{ tanggal_mulai: "desc" }, { tanggal: "desc" }],
  });
  return res.json(items.map((a) => ({
    ...a,
    foto_url: a.foto_progress ? `/storage/client-portal/aktivitas/${path.basename(a.foto_progress)}` : null,
  })));
});

router.post("/projects/:id/aktivitas", aktivitasUpload.single("foto_progress"), async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const { judul, deskripsi, status, tanggal_mulai, tanggal_selesai } = req.body;
  if (!judul) { res.status(400).json({ detail: "judul wajib diisi" }); return; }
  const mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  const item = await prisma.clientPortalAktivitas.create({
    data: {
      project_id: projectId,
      tanggal: mulai ?? new Date(),
      tanggal_mulai: mulai,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      judul,
      deskripsi: deskripsi ?? null,
      status: status ?? "Dalam Proses",
      foto_progress: req.file?.path ?? null,
      created_by: req.user?.id ?? null,
    },
  });
  // Auto-update project progress
  await _recalcProgress(projectId);
  return res.status(201).json({ id: item.id, message: "Aktivitas berhasil ditambahkan" });
});

router.patch("/projects/:id/aktivitas/:aid", aktivitasUpload.single("foto_progress"), async (req: Request, res: Response) => {
  const aid = BigInt(req.params.aid);
  const projectId = BigInt(req.params.id);
  const { judul, deskripsi, status, tanggal_mulai, tanggal_selesai } = req.body;
  const item = await prisma.clientPortalAktivitas.update({
    where: { id: aid },
    data: {
      ...(tanggal_mulai !== undefined && { tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null, tanggal: tanggal_mulai ? new Date(tanggal_mulai) : undefined }),
      ...(tanggal_selesai !== undefined && { tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null }),
      ...(judul !== undefined && { judul }),
      ...(deskripsi !== undefined && { deskripsi }),
      ...(status !== undefined && { status }),
      ...(req.file && { foto_progress: req.file.path }),
    },
  });
  // Auto-update project progress
  await _recalcProgress(projectId);
  return res.json({ id: item.id, message: "Aktivitas berhasil diupdate" });
});

router.delete("/projects/:id/aktivitas/:aid", async (req: Request, res: Response) => {
  const aid = BigInt(req.params.aid);
  const projectId = BigInt(req.params.id);
  const item = await prisma.clientPortalAktivitas.findUnique({ where: { id: aid } });
  if (item?.foto_progress && fs.existsSync(item.foto_progress)) fs.unlinkSync(item.foto_progress);
  await prisma.clientPortalAktivitas.delete({ where: { id: aid } });
  await _recalcProgress(projectId);
  return res.json({ message: "Aktivitas berhasil dihapus" });
});

// ── GANTT ─────────────────────────────────────────────────────────────────────

router.get("/projects/:id/gantt", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const items = await prisma.clientPortalGanttItem.findMany({
    where: { project_id: projectId },
    orderBy: { urutan: "asc" },
  });
  return res.json(items);
});

router.post("/projects/:id/gantt", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const { nama_pekerjaan, tanggal_mulai, tanggal_selesai, status, urutan } = req.body;
  if (!nama_pekerjaan) { res.status(400).json({ detail: "nama_pekerjaan wajib diisi" }); return; }
  const item = await prisma.clientPortalGanttItem.create({
    data: {
      project_id: projectId,
      nama_pekerjaan,
      tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null,
      tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
      status: status ?? "Dalam Proses",
      urutan: urutan ?? 0,
    },
  });
  return res.status(201).json({ id: item.id, message: "Item Gantt berhasil ditambahkan" });
});

router.patch("/projects/:id/gantt/:gid", async (req: Request, res: Response) => {
  const gid = BigInt(req.params.gid);
  const { nama_pekerjaan, tanggal_mulai, tanggal_selesai, status, urutan } = req.body;
  const item = await prisma.clientPortalGanttItem.update({
    where: { id: gid },
    data: {
      ...(nama_pekerjaan !== undefined && { nama_pekerjaan }),
      ...(tanggal_mulai !== undefined && { tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : null }),
      ...(tanggal_selesai !== undefined && { tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null }),
      ...(status !== undefined && { status }),
      ...(urutan !== undefined && { urutan: parseInt(urutan) }),
    },
  });
  return res.json({ id: item.id, message: "Item Gantt berhasil diupdate" });
});

router.delete("/projects/:id/gantt/:gid", async (req: Request, res: Response) => {
  const gid = BigInt(req.params.gid);
  await prisma.clientPortalGanttItem.delete({ where: { id: gid } });
  return res.json({ message: "Item Gantt berhasil dihapus" });
});

// ── KONTAK ────────────────────────────────────────────────────────────────────

router.get("/projects/:id/kontak", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const items = await prisma.clientPortalKontak.findMany({
    where: { project_id: projectId },
    orderBy: { urutan: "asc" },
  });
  return res.json(items);
});

router.post("/projects/:id/kontak", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const { role, nama, telepon, whatsapp, email, urutan } = req.body;
  if (!role || !nama) { res.status(400).json({ detail: "role dan nama wajib diisi" }); return; }
  const item = await prisma.clientPortalKontak.create({
    data: {
      project_id: projectId,
      role, nama,
      telepon: telepon ?? null,
      whatsapp: whatsapp ?? null,
      email: email ?? null,
      urutan: urutan ?? 0,
    },
  });
  return res.status(201).json({ id: item.id, message: "Kontak berhasil ditambahkan" });
});

router.patch("/projects/:id/kontak/:kid", async (req: Request, res: Response) => {
  const kid = BigInt(req.params.kid);
  const { role, nama, telepon, whatsapp, email, urutan } = req.body;
  const item = await prisma.clientPortalKontak.update({
    where: { id: kid },
    data: {
      ...(role !== undefined && { role }),
      ...(nama !== undefined && { nama }),
      ...(telepon !== undefined && { telepon }),
      ...(whatsapp !== undefined && { whatsapp }),
      ...(email !== undefined && { email }),
      ...(urutan !== undefined && { urutan: parseInt(urutan) }),
    },
  });
  return res.json({ id: item.id, message: "Kontak berhasil diupdate" });
});

router.delete("/projects/:id/kontak/:kid", async (req: Request, res: Response) => {
  const kid = BigInt(req.params.kid);
  await prisma.clientPortalKontak.delete({ where: { id: kid } });
  return res.json({ message: "Kontak berhasil dihapus" });
});

// ── INVOICES dari Finance (hanya yg sudah ditandatangani keduanya) ────────────

router.get("/projects/:id/invoices", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const project = await prisma.clientPortalProject.findUnique({
    where: { id },
    include: { lead: { select: { id: true } } },
  });
  if (!project?.lead_id) { return res.json([]); }

  const invoices = await prisma.invoice.findMany({
    where: {
      lead_id: project.lead_id,
      head_finance_at: { not: null },
      admin_finance_at: { not: null },
    },
    orderBy: { created_at: "desc" },
  });

  return res.json(invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    status: inv.status,
    grand_total: toNum(inv.grand_total),
    tanggal: inv.tanggal,
    created_at: inv.created_at,
    head_finance_at: inv.head_finance_at,
    admin_finance_at: inv.admin_finance_at,
    is_assigned: inv.client_portal_project_id !== null,
  })));
});

// ── KEHADIRAN TUKANG (dari AbsenTukang via adm_finance_project_id) ────────────

router.get("/projects/:id/kehadiran", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const project = await prisma.clientPortalProject.findUnique({ where: { id } });
  if (!project || !project.adm_finance_project_id) {
    return res.json([]);
  }

  const { tanggal_mulai, tanggal_selesai } = req.query;
  const absen = await prisma.absenTukang.findMany({
    where: {
      adm_finance_project_id: project.adm_finance_project_id,
      ...(tanggal_mulai && tanggal_selesai && {
        tanggal: { gte: new Date(tanggal_mulai as string), lte: new Date(tanggal_selesai as string) },
      }),
    },
    include: { items: true },
    orderBy: { tanggal: "desc" },
  });

  return res.json(absen.map((a) => ({
    id: a.id,
    tanggal: a.tanggal,
    keterangan: a.keterangan,
    items: a.items.map((item) => ({
      id: item.id,
      tukang_name: item.tukang_name,
      hadir: item.hadir,
      keterangan: item.keterangan,
    })),
  })));
});

// ── INVOICE ASSIGN ke Client Portal ──────────────────────────────────────────
// GET /projects/:id/assignable-invoices — daftar invoice Terbit/Lunas dari lead yang bisa di-assign
router.get("/projects/:id/assignable-invoices", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const project = await prisma.clientPortalProject.findUnique({ where: { id } });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });

  const invoices = await prisma.invoice.findMany({
    where: {
      lead_id: project.lead_id,
      status: { in: ["Terbit", "Lunas"] },
    },
    orderBy: { created_at: "desc" },
  });
  return res.json(invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    grand_total: toNum(inv.grand_total),
    status: inv.status,
    tanggal: inv.tanggal,
    is_assigned: inv.client_portal_project_id === id,
  })));
});

// POST /projects/:id/invoices/:invId/assign
router.post("/projects/:id/invoices/:invId/assign", async (req: Request, res: Response) => {
  const projectId = BigInt(req.params.id);
  const invId = BigInt(req.params.invId);
  await prisma.invoice.update({
    where: { id: invId },
    data: { client_portal_project_id: projectId },
  });
  return res.json({ message: "Invoice berhasil di-assign ke portal klien" });
});

// DELETE /projects/:id/invoices/:invId/assign
router.delete("/projects/:id/invoices/:invId/assign", async (req: Request, res: Response) => {
  const invId = BigInt(req.params.invId);
  await prisma.invoice.update({
    where: { id: invId },
    data: { client_portal_project_id: null },
  });
  return res.json({ message: "Invoice berhasil di-unassign dari portal klien" });
});

// ── CCTV STREAMS ──────────────────────────────────────────────────────────────
router.get("/projects/:id/cctv", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const streams = await (prisma as any).clientPortalCctvStream.findMany({
    where: { project_id: id },
    orderBy: { urutan: "asc" },
  });
  return res.json(streams.map((s: any) => ({
    id: s.id,
    nama: s.nama,
    stream_url: s.stream_url,
    stream_type: s.stream_type,
    is_active: s.is_active,
    urutan: s.urutan,
  })));
});

router.post("/projects/:id/cctv", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama, stream_url, stream_type, is_active, urutan } = req.body;
  if (!nama || !stream_url) return res.status(400).json({ detail: "nama dan stream_url wajib diisi" });
  const stream = await (prisma as any).clientPortalCctvStream.create({
    data: {
      project_id: id,
      nama,
      stream_url,
      stream_type: stream_type ?? "youtube",
      is_active: is_active !== false,
      urutan: urutan ?? 0,
    },
  });
  return res.status(201).json({ id: stream.id, message: "CCTV stream berhasil ditambahkan" });
});

router.patch("/projects/:id/cctv/:sid", async (req: Request, res: Response) => {
  const sid = BigInt(req.params.sid);
  const { nama, stream_url, stream_type, is_active, urutan } = req.body;
  const stream = await (prisma as any).clientPortalCctvStream.update({
    where: { id: sid },
    data: {
      ...(nama !== undefined && { nama }),
      ...(stream_url !== undefined && { stream_url }),
      ...(stream_type !== undefined && { stream_type }),
      ...(is_active !== undefined && { is_active }),
      ...(urutan !== undefined && { urutan }),
    },
  });
  return res.json({ id: stream.id, message: "CCTV stream berhasil diupdate" });
});

router.delete("/projects/:id/cctv/:sid", async (req: Request, res: Response) => {
  const sid = BigInt(req.params.sid);
  await (prisma as any).clientPortalCctvStream.delete({ where: { id: sid } });
  return res.json({ message: "CCTV stream berhasil dihapus" });
});

export default router;
