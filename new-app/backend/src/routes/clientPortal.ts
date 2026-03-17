import { Router, Request, Response } from "express";
import path from "path";
import { prisma } from "../lib/prisma";

import { verifyPassword, createClientPortalToken } from "../lib/security";
import { authenticateClientPortal } from "../middleware/auth";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
function toNum(v: unknown) { return parseFloat(String(v ?? 0)); }

// ── POST /login ───────────────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ detail: "Username dan password wajib diisi" }); return;
  }

  const account = await prisma.clientPortalAccount.findUnique({
    where: { username },
    include: { lead: { include: { client_portal_project: true } } },
  });

  if (!account) { res.status(401).json({ detail: "Username atau password salah" }); return; }
  if (!account.is_active) { res.status(403).json({ detail: "Akun tidak aktif" }); return; }
  if (!verifyPassword(password, account.password)) {
    res.status(401).json({ detail: "Username atau password salah" }); return;
  }
  const project = account.lead?.client_portal_project;
  if (!project) {
    res.status(403).json({ detail: "Proyek klien belum dikonfigurasi" }); return;
  }

  // Update last_login_at
  await prisma.clientPortalAccount.update({
    where: { id: account.id },
    data: { last_login_at: new Date() },
  });

  const token = createClientPortalToken(Number(account.id));
  return res.json({
    access_token: token,
    token_type: "bearer",
    project: {
      id: project.id,
      nama_proyek: project.nama_proyek,
      klien: project.klien,
    },
  });
});

// ── All routes below require client portal auth ───────────────────────────────
router.use(authenticateClientPortal);

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get("/me", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const project = await prisma.clientPortalProject.findUnique({
    where: { id: projectId },
    include: {
      lead: { select: { nama: true, nomor_telepon: true, alamat: true, jenis: true } },
    },
  });
  if (!project) { res.status(404).json({ detail: "Project tidak ditemukan" }); return; }

  // Hitung summary
  const [paymentCount, paidCount, galeriCount, dokumenCount, aktivitasCount, invCount, invLunasCount] = await Promise.all([
    prisma.clientPortalPayment.count({ where: { project_id: projectId } }),
    prisma.clientPortalPayment.count({ where: { project_id: projectId, status: "Sudah Dibayar" } }),
    prisma.clientPortalGaleri.count({ where: { project_id: projectId } }),
    prisma.clientPortalDokumen.count({ where: { project_id: projectId } }),
    prisma.clientPortalAktivitas.count({ where: { project_id: projectId } }),
    // Auto-link invoice via lead_id
    prisma.invoice.count({ where: { lead_id: project.lead_id, status: { in: ["Terbit", "Lunas"] } } }),
    prisma.invoice.count({ where: { lead_id: project.lead_id, status: "Lunas" } }),
  ]);

  return res.json({
    id: project.id,
    nama_proyek: project.nama_proyek,
    klien: project.klien,
    alamat: project.alamat,
    tanggal_mulai: project.tanggal_mulai,
    tanggal_selesai: project.tanggal_selesai,
    status_proyek: project.status_proyek,
    progress_persen: project.progress_persen,
    catatan: project.catatan,
    jenis: project.lead?.jenis ?? null,
    summary: {
      total_termin: paymentCount + invCount,
      termin_lunas: paidCount + invLunasCount,
      total_foto: galeriCount,
      total_dokumen: dokumenCount,
      total_aktivitas: aktivitasCount,
    },
  });
});

// ── GET /payments ─────────────────────────────────────────────────────────────
// Mengembalikan ClientPortalPayment manual + Invoice Terbit/Lunas dari lead yang sama
router.get("/payments", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;

  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId }, select: { lead_id: true } });

  const [payments, invoices] = await Promise.all([
    prisma.clientPortalPayment.findMany({
      where: { project_id: projectId },
      orderBy: { termin_ke: "asc" },
    }),
    // Auto-link: invoice dengan lead_id yang sama otomatis masuk
    prisma.invoice.findMany({
      where: { lead_id: project?.lead_id ?? BigInt(0), status: { in: ["Terbit", "Lunas"] } },
      include: { kwitansi: { select: { tanggal: true } } },
      orderBy: { tanggal: "asc" },
    }),
  ]);

  const manualPayments = payments.map((p) => ({
    id: Number(p.id),
    termin_ke: p.termin_ke,
    nama_termin: p.nama_termin,
    tagihan: toNum(p.tagihan),
    retensi: toNum(p.retensi),
    status: p.status,
    jatuh_tempo: p.jatuh_tempo,
    tanggal_bayar: p.tanggal_bayar,
    catatan: p.catatan,
    source: "manual",
  }));

  const invoicePayments = invoices.map((inv, idx) => ({
    id: Number(inv.id) + 100000, // offset agar tidak tabrakan dengan manual payments
    termin_ke: payments.length + idx + 1,
    nama_termin: inv.invoice_number ?? `Invoice`,
    tagihan: toNum(inv.grand_total),
    retensi: 0,
    status: inv.status === "Lunas" ? "Sudah Dibayar" : "Belum Dibayar",
    jatuh_tempo: inv.overdue_date,
    tanggal_bayar: inv.kwitansi?.tanggal ?? null,
    catatan: inv.catatan,
    source: "invoice",
  }));

  return res.json([...manualPayments, ...invoicePayments]);
});

// ── GET /galeri ───────────────────────────────────────────────────────────────
router.get("/galeri", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const { search } = req.query;
  const items = await prisma.clientPortalGaleri.findMany({
    where: {
      project_id: projectId,
      ...(search && { judul: { contains: search as string, mode: "insensitive" } }),
    },
    orderBy: { tanggal_foto: "desc" },
  });
  return res.json(items.map((g) => ({
    id: g.id,
    judul: g.judul,
    deskripsi: g.deskripsi,
    tanggal_foto: g.tanggal_foto,
    file_url: g.file_path ? `/storage/client-portal/galeri/${path.basename(g.file_path)}` : null,
  })));
});

// ── GET /dokumen ──────────────────────────────────────────────────────────────
router.get("/dokumen", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const { search, kategori } = req.query;
  const items = await prisma.clientPortalDokumen.findMany({
    where: {
      project_id: projectId,
      ...(search && { nama_file: { contains: search as string, mode: "insensitive" } }),
      ...(kategori && { kategori: kategori as string }),
    },
    orderBy: { tanggal_upload: "desc" },
  });
  return res.json(items.map((d) => ({
    id: d.id,
    nama_file: d.nama_file,
    deskripsi: d.deskripsi,
    kategori: d.kategori,
    file_type: d.file_type,
    tanggal_upload: d.tanggal_upload,
    file_url: d.file_path ? `/storage/client-portal/dokumen/${path.basename(d.file_path)}` : null,
  })));
});

// ── GET /aktivitas ────────────────────────────────────────────────────────────
router.get("/aktivitas", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const { search, status } = req.query;
  const items = await prisma.clientPortalAktivitas.findMany({
    where: {
      project_id: projectId,
      ...(search && { judul: { contains: search as string, mode: "insensitive" } }),
      ...(status && { status: status as string }),
    },
    orderBy: [{ tanggal_mulai: "desc" }, { tanggal: "desc" }],
  });
  return res.json(items.map((a) => ({
    id: a.id,
    judul: a.judul,
    deskripsi: a.deskripsi,
    tanggal: a.tanggal,
    tanggal_mulai: a.tanggal_mulai,
    tanggal_selesai: a.tanggal_selesai,
    status: a.status,
    foto_url: a.foto_progress ? `/storage/client-portal/aktivitas/${path.basename(a.foto_progress)}` : null,
  })));
});

// ── GET /kehadiran ────────────────────────────────────────────────────────────
// Menampilkan absen tukang yang sudah disetujui admin (dari TukangAbsenFoto)
router.get("/kehadiran", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const { tanggal_mulai, tanggal_selesai } = req.query;

  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.json([]);

  // Cari adm_finance_project_id: pakai yang tersimpan, atau auto-find via lead_id
  let admProjectId = project.adm_finance_project_id;
  if (!admProjectId && project.lead_id) {
    const admProject = await prisma.admFinanceProject.findFirst({ where: { lead_id: project.lead_id }, select: { id: true } });
    admProjectId = admProject?.id ?? null;
  }
  if (!admProjectId) return res.json([]);

  // Ambil semua tukang di project ini
  const tukangList = await prisma.tukangRegistry.findMany({
    where: { adm_finance_project_id: admProjectId },
    select: { id: true, nama: true },
  });
  if (tukangList.length === 0) return res.json([]);

  const tukangIds = tukangList.map((t) => t.id);
  const tukangMap = new Map(tukangList.map((t) => [String(t.id), t.nama]));

  // Ambil foto absen yang sudah disetujui
  const fotos = await prisma.tukangAbsenFoto.findMany({
    where: {
      tukang_id: { in: tukangIds },
      status: "Disetujui",
      ...(tanggal_mulai && tanggal_selesai && {
        tanggal: { gte: new Date(tanggal_mulai as string), lte: new Date(tanggal_selesai as string) },
      }),
    },
    orderBy: { tanggal: "desc" },
  });

  // Group by tanggal
  const byDate = new Map<string, typeof fotos>();
  for (const f of fotos) {
    const key = f.tanggal ? f.tanggal.toISOString().slice(0, 10) : "unknown";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(f);
  }

  const result = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateStr, items], idx) => ({
      id: idx + 1,
      tanggal: items[0].tanggal,
      keterangan: null,
      items: items.map((f) => ({
        id: f.id,
        tukang_name: tukangMap.get(String(f.tukang_id)) ?? "Tukang",
        hadir: true,
        keterangan: f.catatan ?? null,
        foto_url: f.foto ?? null,
        foto_timestamp: f.foto_timestamp,
      })),
    }));

  return res.json(result);
});

// ── GET /gantt ────────────────────────────────────────────────────────────────
// Returns aktivitas items formatted as gantt — auto-synced from aktivitas CRUD
router.get("/gantt", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const items = await prisma.clientPortalAktivitas.findMany({
    where: { project_id: projectId },
    orderBy: [{ tanggal_mulai: "asc" }, { tanggal: "asc" }],
  });
  return res.json(items.map((a, idx) => ({
    id: a.id,
    nama_pekerjaan: a.judul,
    tanggal_mulai: a.tanggal_mulai ?? a.tanggal,
    tanggal_selesai: a.tanggal_selesai,
    status: a.status,
    urutan: idx + 1,
  })));
});

// ── GET /monitoring ───────────────────────────────────────────────────────────
router.get("/monitoring", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const streams = await (prisma as any).clientPortalCctvStream.findMany({
    where: { project_id: projectId, is_active: true },
    orderBy: { urutan: "asc" },
  });
  return res.json(streams.map((s: any) => ({
    id: s.id,
    nama: s.nama,
    stream_url: s.stream_url,
    stream_type: s.stream_type,
  })));
});

// ── GET /kontak ───────────────────────────────────────────────────────────────
router.get("/kontak", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const items = await prisma.clientPortalKontak.findMany({
    where: { project_id: projectId },
    orderBy: { urutan: "asc" },
  });
  if (items.length > 0) {
    return res.json(items.map((k) => ({
      id: k.id,
      role: k.role,
      nama: k.nama,
      telepon: k.telepon,
      whatsapp: k.whatsapp,
      email: k.email,
    })));
  }
  // Default contact fallback when none configured
  return res.json([{
    id: 0,
    role: "Admin",
    nama: "Admin Rubahrumah",
    telepon: "081376405550",
    whatsapp: "081376405550",
    email: "info.rubahrumah@gmail.com",
  }]);
});

export default router;
