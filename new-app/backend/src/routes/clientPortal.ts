import { Router, Request, Response } from "express";
import path from "path";
import { prisma } from "../lib/prisma";

import { verifyPassword, createClientPortalToken } from "../lib/security";
import { authenticateClientPortal } from "../middleware/auth";
import { deliver, NOTIFY_USER_SELECT, type NotifyRecipient } from "../lib/notify";
import { paidClientInvoiceWhere, resolveClientPortalScope, visibleClientInvoiceWhere } from "../lib/clientPortalScope";
import { thumbnailStoragePath } from "../lib/imageThumbnail";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
function toNum(v: unknown) { return parseFloat(String(v ?? 0)); }

const CLIENT_TIMELINE_BUFFER_DAYS = 7;

function clientTargetDate(date: Date | null) {
  if (!date) return null;
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + CLIENT_TIMELINE_BUFFER_DAYS);
  return result;
}

function clientTaskStatus(status: string) {
  return status === "Proses" ? "Dalam Proses" : status;
}

function progressFromCounts(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : null;
}

async function getLiveProjectProgress(sipilProjectIds: bigint[]) {
  if (sipilProjectIds.length === 0) return { progress: null as number | null, totalItems: 0, doneItems: 0 };

  const sipilProyeks = await prisma.proyekBerjalan.findMany({
    where: { id: { in: sipilProjectIds } },
    select: {
      id: true,
      termins: { select: { tasks: { select: { status: true } } } },
    },
  });

  const taskStatuses = sipilProyeks.flatMap((p) =>
    p.termins.flatMap((t) => t.tasks.map((task) => task.status))
  );
  if (taskStatuses.length > 0) {
    const taskDone = taskStatuses.filter((status) => status === "Selesai").length;
    return {
      progress: progressFromCounts(taskDone, taskStatuses.length),
      totalItems: taskStatuses.length,
      doneItems: taskDone,
    };
  }
  return { progress: 0, totalItems: 0, doneItems: 0 };
}

async function getLiveProjectSummary(projects: Array<{ id: bigint; type: "sipil" | "interior" }>) {
  const sipilIds = projects.filter((item) => item.type === "sipil").map((item) => item.id);
  const interiorIds = projects.filter((item) => item.type === "interior").map((item) => item.id);
  if (sipilIds.length === 0 && interiorIds.length === 0) return null;
  const [sipilProyeks, interiorProyeks] = await Promise.all([
    prisma.proyekBerjalan.findMany({
      where: { id: { in: sipilIds } },
      select: { nama_proyek: true, lokasi: true, tanggal_mulai: true, tanggal_selesai: true, updated_at: true },
      orderBy: { updated_at: "desc" },
    }),
    prisma.proyekInterior.findMany({
      where: { id: { in: interiorIds } },
      select: { nama_proyek: true, lokasi: true, tanggal_mulai: true, tanggal_selesai: true, updated_at: true },
      orderBy: { updated_at: "desc" },
    }),
  ]);
  const allProjects = [...sipilProyeks, ...interiorProyeks].sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  return allProjects[0] ?? null;
}

function portalGalleryFileUrl(filePath: string | null) {
  if (!filePath) return null;
  return filePath.startsWith("/storage/")
    ? filePath
    : `/storage/client-portal/galeri/${path.basename(filePath)}`;
}

async function getPortalGalleryItems(
  projectId: bigint,
  scope: Awaited<ReturnType<typeof resolveClientPortalScope>>,
  search = "",
) {
  const query = search.trim();
  const sipilIds = scope.operationalProjects.filter((item) => item.type === "sipil").map((item) => item.id);
  const interiorIds = scope.operationalProjects.filter((item) => item.type === "interior").map((item) => item.id);
  const reportProjectFilters: any[] = [];
  if (sipilIds.length > 0) reportProjectFilters.push({ project_type: "sipil", project_id: { in: sipilIds } });
  if (interiorIds.length > 0) reportProjectFilters.push({ project_type: "interior", project_id: { in: interiorIds } });

  const [manualItems, reports] = await Promise.all([
    prisma.clientPortalGaleri.findMany({
      where: {
        project_id: projectId,
        ...(query && {
          OR: [
            { judul: { contains: query, mode: "insensitive" } },
            { deskripsi: { contains: query, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [{ tanggal_foto: "desc" }, { created_at: "desc" }],
    }),
    reportProjectFilters.length === 0
      ? []
      : prisma.laporanPicProjek.findMany({
          where: {
            OR: reportProjectFilters,
            ...(query && {
              AND: [{
                OR: [
                  { termin_nama: { contains: query, mode: "insensitive" } },
                  { pekerjaan_nama: { contains: query, mode: "insensitive" } },
                  { kegiatan: { contains: query, mode: "insensitive" } },
                  { tasks: { some: { pekerjaan_nama: { contains: query, mode: "insensitive" } } } },
                ],
              }],
            }),
          },
          include: {
            tasks: { orderBy: { id: "asc" } },
            image_files: { orderBy: { id: "asc" } },
          },
          orderBy: [{ tanggal: "desc" }, { created_at: "desc" }],
        }),
  ]);

  const reportItems = reports.flatMap((report) => {
    const relationalImages = report.image_files.map((image) => image.file_path);
    const legacyImages = Array.isArray(report.images)
      ? report.images.filter((item): item is string => typeof item === "string")
      : [];
    const images = relationalImages.length > 0 ? relationalImages : legacyImages;
    const taskNames = report.tasks.map((task) => task.pekerjaan_nama).filter(Boolean);
    const taskLabel = taskNames.join(", ") || report.pekerjaan_nama || "Dokumentasi";
    const title = `${report.termin_nama || "Umum"} ‖ ${taskLabel}`;
    const description = [report.kegiatan, report.kendala ? `Kendala: ${report.kendala}` : ""].filter(Boolean).join("\n");
    return images.map((filePath, index) => ({
      id: `laporan-${report.id}-${index}`,
      judul: title,
      deskripsi: description || null,
      tanggal_foto: report.tanggal,
      file_url: thumbnailStoragePath(filePath),
      original_url: filePath,
      source: "laporan_pic",
    }));
  });

  const manualGalleryItems = manualItems.map((item) => {
    const fileUrl = portalGalleryFileUrl(item.file_path);
    return {
      id: `manual-${item.id}`,
      judul: item.judul,
      deskripsi: item.deskripsi,
      tanggal_foto: item.tanggal_foto,
      file_url: fileUrl,
      original_url: fileUrl,
      source: "manual",
    };
  });

  const seenFiles = new Set<string>();
  return [...reportItems, ...manualGalleryItems]
    .filter((item) => {
      const filePath = item.original_url || item.file_url;
      if (!filePath || seenFiles.has(filePath)) return false;
      seenFiles.add(filePath);
      return true;
    })
    .sort((a, b) => new Date(b.tanggal_foto ?? 0).getTime() - new Date(a.tanggal_foto ?? 0).getTime());
}

// ── POST /login ───────────────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ detail: "Username dan password wajib diisi" }); return;
  }

  const account = await prisma.clientPortalAccount.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    include: { lead: { include: { client_portal_project: true } } },
  });

  // Gunakan pesan yang sama untuk semua kasus gagal — mencegah user enumeration
  const INVALID_MSG = "Username atau password salah";
  if (!account || !account.is_active) { res.status(401).json({ detail: INVALID_MSG }); return; }
  if (!verifyPassword(password, account.password)) {
    res.status(401).json({ detail: INVALID_MSG }); return;
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

  const scope = await resolveClientPortalScope(project);
  const sipilProjectIds = scope.operationalProjects
    .filter((item) => item.type === "sipil")
    .map((item) => item.id);
  const [liveProgress, liveProject, galleryItems] = await Promise.all([
    getLiveProjectProgress(sipilProjectIds),
    getLiveProjectSummary(scope.operationalProjects),
    getPortalGalleryItems(projectId, scope),
  ]);

  // Hitung summary
  const [paymentCount, paidCount, dokumenManualCount, laporanPicCount, aktivitasCount, invCount, invLunasCount] = await Promise.all([
    prisma.clientPortalPayment.count({ where: { project_id: projectId } }),
    prisma.clientPortalPayment.count({ where: { project_id: projectId, status: "Sudah Dibayar" } }),
    prisma.clientPortalDokumen.count({ where: { project_id: projectId } }),
    sipilProjectIds.length
      ? prisma.laporanPicProjek.count({ where: { project_type: "sipil", project_id: { in: sipilProjectIds } } })
      : 0,
    prisma.clientPortalAktivitas.count({ where: { project_id: projectId } }),
    prisma.invoice.count({ where: visibleClientInvoiceWhere(scope) }),
    prisma.invoice.count({ where: paidClientInvoiceWhere(scope) }),
  ]);

  return res.json({
    id: project.id,
    nama_proyek: liveProject?.nama_proyek ?? project.nama_proyek,
    klien: project.klien,
    alamat: liveProject?.lokasi ?? project.alamat,
    tanggal_mulai: liveProject?.tanggal_mulai ?? project.tanggal_mulai,
    tanggal_selesai: project.tanggal_selesai ?? liveProject?.tanggal_selesai,
    status_proyek: liveProgress.progress !== null && liveProgress.progress >= 100 ? "Selesai" : project.status_proyek,
    progress_persen: liveProgress.progress ?? project.progress_persen,
    catatan: project.catatan,
    jenis: project.lead?.jenis ?? null,
    summary: {
      total_termin: invCount > 0 ? invCount : paymentCount,
      termin_lunas: invCount > 0 ? invLunasCount : paidCount,
      total_foto: galleryItems.length,
      total_dokumen: laporanPicCount + dokumenManualCount,
      total_aktivitas: liveProgress.totalItems || aktivitasCount,
      aktivitas_selesai: liveProgress.doneItems,
    },
  });
});

// ── GET /payments ─────────────────────────────────────────────────────────────
// Mengembalikan data manual lama + invoice resmi dari scope Administrasi Projek.
router.get("/payments", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const scope = await resolveClientPortalScope(project);

  const [payments, invoices] = await Promise.all([
    prisma.clientPortalPayment.findMany({
      where: { project_id: projectId },
      orderBy: { termin_ke: "asc" },
    }),
    // Ambil invoice dari scope Administrasi Projek. Relasi lead, assignment lama,
    // dan item RAB digabung agar invoice lama tidak hilang dari portal.
    prisma.invoice.findMany({
      where: visibleClientInvoiceWhere(scope),
      include: { kwitansi: { select: { tanggal: true, jumlah_diterima: true } } },
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
    invoice_id: String(inv.id),
    termin_ke: idx + 1,
    nama_termin: inv.invoice_number ?? `Invoice`,
    tagihan: toNum(inv.grand_total),
    retensi: 0,
    status: inv.status === "Lunas" || inv.kwitansi ? "Sudah Dibayar" : "Belum Dibayar",
    jatuh_tempo: inv.overdue_date,
    tanggal_bayar: inv.kwitansi?.tanggal ?? null,
    catatan: inv.catatan,
    source: "invoice",
  }));

  // Finance menjadi sumber utama. Baris manual lama hanya dipakai untuk proyek
  // yang belum memiliki invoice resmi agar data historis tidak langsung hilang.
  return res.json(invoicePayments.length > 0 ? invoicePayments : manualPayments);
});

// ── GET /invoices — invoice Finance terbit/lunas berdasarkan lead ────────────
router.get("/invoices", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const scope = await resolveClientPortalScope(project);
  const invoices = await prisma.invoice.findMany({
    where: visibleClientInvoiceWhere(scope),
    include: { kwitansi: { select: { tanggal: true, nomor_kwitansi: true, metode_bayar: true } } },
    orderBy: { tanggal: "asc" },
  });
  return res.json(invoices.map(inv => ({
    id: String(inv.id),
    invoice_number: inv.invoice_number,
    tanggal: inv.tanggal,
    overdue_date: inv.overdue_date,
    grand_total: toNum(inv.grand_total),
    subtotal: toNum(inv.subtotal),
    ppn_amount: toNum(inv.ppn_amount),
    status: inv.status === "Lunas" || inv.kwitansi ? "Lunas" : inv.status,
    catatan: inv.catatan,
    kwitansi: inv.kwitansi ? {
      tanggal_bayar: inv.kwitansi.tanggal,
      metode_bayar: inv.kwitansi.metode_bayar,
      nomor_kwitansi: inv.kwitansi.nomor_kwitansi,
    } : null,
  })));
});

// ── GET /invoices/:id — detail invoice untuk download/cetak ──────────────────
router.get("/invoices/:id", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const invId = BigInt(req.params.id);
  const project = await prisma.clientPortalProject.findUnique({
    where: { id: projectId },
    include: { lead: { select: { nama: true, jenis: true, alamat: true, nomor_telepon: true } } },
  });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const scope = await resolveClientPortalScope(project);
  const inv = await prisma.invoice.findFirst({
    where: { id: invId, ...visibleClientInvoiceWhere(scope) },
    include: {
      items: { orderBy: { id: "asc" } },
      lead: { select: { nama: true, jenis: true, alamat: true, nomor_telepon: true } },
      bank_account: { select: { bank_name: true, account_number: true, account_name: true } },
      kwitansi: true,
    },
  });
  if (!inv) { res.status(404).json({ detail: "Invoice tidak ditemukan" }); return; }

  return res.json({
    id: String(inv.id),
    invoice_number: inv.invoice_number,
    tanggal: inv.tanggal,
    overdue_date: inv.overdue_date,
    subtotal: toNum(inv.subtotal),
    ppn_percentage: toNum(inv.ppn_percentage),
    ppn_amount: toNum(inv.ppn_amount),
    grand_total: toNum(inv.grand_total),
    status: inv.status === "Lunas" || inv.kwitansi ? "Lunas" : inv.status,
    catatan: inv.catatan,
    klien: inv.lead?.nama ?? project.lead.nama,
    jenis: inv.lead?.jenis ?? project.lead.jenis,
    alamat: inv.lead?.alamat ?? project.lead.alamat,
    telepon: inv.lead?.nomor_telepon ?? project.lead.nomor_telepon,
    bank_account: inv.bank_account ?? null,
    items: inv.items.map(it => ({
      description: it.description,
      quantity: toNum(it.quantity),
      unit_price: toNum(it.unit_price),
      subtotal: toNum(it.subtotal),
    })),
    kwitansi: inv.kwitansi ? {
      nomor_kwitansi: inv.kwitansi.nomor_kwitansi,
      tanggal: inv.kwitansi.tanggal,
      jumlah_diterima: toNum(inv.kwitansi.jumlah_diterima),
      metode_bayar: inv.kwitansi.metode_bayar,
      detail_bayar: inv.kwitansi.detail_bayar,
    } : null,
  });
});

// ── GET /galeri ───────────────────────────────────────────────────────────────
router.get("/galeri", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const { search } = req.query;
  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const scope = await resolveClientPortalScope(project);
  const items = await getPortalGalleryItems(projectId, scope, typeof search === "string" ? search : "");
  return res.json(items);
});

// ── GET /dokumen ──────────────────────────────────────────────────────────────
router.get("/dokumen", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const { search, kategori } = req.query;
  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const scope = await resolveClientPortalScope(project);
  const sipilProjectIds = scope.operationalProjects
    .filter((item) => item.type === "sipil")
    .map((item) => item.id);
  const query = typeof search === "string" ? search.trim() : "";
  const category = typeof kategori === "string" ? kategori : "";

  const [manualItems, reports] = await Promise.all([
    category === "Laporan PIC"
      ? []
      : prisma.clientPortalDokumen.findMany({
          where: {
            project_id: projectId,
            ...(query && { nama_file: { contains: query, mode: "insensitive" } }),
            ...(category && { kategori: category }),
          },
          orderBy: { tanggal_upload: "desc" },
        }),
    category && category !== "Laporan PIC"
      ? []
      : sipilProjectIds.length
        ? prisma.laporanPicProjek.findMany({
            where: {
              project_type: "sipil",
              project_id: { in: sipilProjectIds },
              ...(query && {
                OR: [
                  { kegiatan: { contains: query, mode: "insensitive" } },
                  { pekerjaan_nama: { contains: query, mode: "insensitive" } },
                  { termin_nama: { contains: query, mode: "insensitive" } },
                ],
              }),
            },
            include: {
              user: { select: { name: true } },
              tasks: { orderBy: { id: "asc" } },
              _count: { select: { image_files: true } },
            },
            orderBy: [{ tanggal: "desc" }, { created_at: "desc" }],
          })
        : [],
  ]);

  const manualDocuments = manualItems.map((d) => ({
    id: d.id,
    source: "manual",
    nama_file: d.nama_file,
    folder_name: (d as any).folder_name ?? null,
    deskripsi: d.deskripsi,
    kategori: d.kategori,
    file_type: d.file_type,
    tanggal_upload: d.tanggal_upload,
    file_url: d.file_path
      ? (d.file_path.startsWith("/storage/") ? d.file_path : `/storage/client-portal/dokumen/${path.basename(d.file_path)}`)
      : null,
  }));
  const reportDocuments = reports.map((report) => {
    const taskNames = report.tasks.map((task) => task.pekerjaan_nama).filter(Boolean);
    const pekerjaan = taskNames.join(", ") || report.pekerjaan_nama || "Laporan Harian PIC";
    return {
      id: `laporan-${report.id}`,
      report_id: String(report.id),
      source: "laporan_pic",
      nama_file: `${pekerjaan} - ${report.tanggal.toISOString().slice(0, 10)}`,
      folder_name: report.termin_nama || "Laporan PIC",
      deskripsi: report.kegiatan,
      kategori: "Laporan PIC",
      file_type: "report",
      tanggal_upload: report.tanggal,
      file_url: null,
      image_count: report._count.image_files,
      pic_nama: report.user?.name ?? "PIC",
      status: report.status_pekerjaan,
    };
  });

  return res.json([...reportDocuments, ...manualDocuments].sort((a, b) =>
    new Date(b.tanggal_upload).getTime() - new Date(a.tanggal_upload).getTime()
  ));
});

router.get("/dokumen/:reportId", async (req: Request, res: Response) => {
  if (!/^\d+$/.test(req.params.reportId)) return res.status(400).json({ detail: "ID laporan tidak valid" });
  const projectId = req.clientPortal!.projectId;
  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const scope = await resolveClientPortalScope(project);
  const sipilProjectIds = scope.operationalProjects
    .filter((item) => item.type === "sipil")
    .map((item) => item.id);
  const report = await prisma.laporanPicProjek.findFirst({
    where: {
      id: BigInt(req.params.reportId),
      project_type: "sipil",
      project_id: { in: sipilProjectIds },
    },
    include: {
      user: { select: { name: true } },
      tasks: { orderBy: { id: "asc" } },
      image_files: { orderBy: { id: "asc" } },
    },
  });
  if (!report) return res.status(404).json({ detail: "Laporan PIC tidak ditemukan" });
  const relationalImages = report.image_files.map((image) => image.file_path);
  const legacyImages = Array.isArray(report.images)
    ? report.images.filter((item): item is string => typeof item === "string")
    : [];
  const images = relationalImages.length > 0 ? relationalImages : legacyImages;
  return res.json({
    id: String(report.id),
    proyek_nama: report.project_nama,
    termin_nama: report.termin_nama,
    pekerjaan: report.tasks.map((task) => ({ id: String(task.task_id), nama: task.pekerjaan_nama })),
    tanggal: report.tanggal,
    kegiatan: report.kegiatan,
    kendala: report.kendala,
    status: report.status_pekerjaan,
    pic_nama: report.user?.name ?? "PIC",
    images,
    thumbnails: images.map(thumbnailStoragePath),
  });
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

  // Gunakan relasi Administrasi Projek yang sama dengan invoice dan info client.
  const scope = await resolveClientPortalScope(project);
  const admProjectId = scope.admProject?.id ?? null;
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
  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ detail: "Project tidak ditemukan" });
  const scope = await resolveClientPortalScope(project);
  const sipilProjectIds = scope.operationalProjects.filter((item) => item.type === "sipil").map((item) => item.id);
  const items = await prisma.proyekBerjalanTask.findMany({
    where: { termin: { proyek_berjalan_id: { in: sipilProjectIds } } },
    include: { termin: { select: { nama: true, proyek_berjalan: { select: { nama_proyek: true } } } } },
    orderBy: [{ tanggal_mulai: "asc" }, { created_at: "asc" }],
  });
  return res.json(items.map((a, idx) => ({
    id: a.id,
    nama_pekerjaan: a.nama_pekerjaan,
    proyek_nama: a.termin.proyek_berjalan.nama_proyek,
    termin_nama: a.termin.nama,
    tanggal_mulai: a.tanggal_mulai,
    tanggal_selesai: clientTargetDate(a.tanggal_selesai),
    status: clientTaskStatus(a.status),
    urutan: idx + 1,
  })));
});

// ── GET /monitoring ───────────────────────────────────────────────────────────
import { hlsUrl as mediamtxHlsUrl } from "../lib/mediamtx";

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
    hls_url: s.stream_path ? mediamtxHlsUrl(s.stream_path) : null,
  })));
});

// ── GET /kontak ───────────────────────────────────────────────────────────────
// POST /tiket — klien kirim pesan/tiket ke PIC (Telegram + email)
// `whatsapp_target` dipertahankan di body demi kompatibilitas dengan portal klien
// yang sudah terpasang, tapi TIDAK lagi dipakai sebagai alamat pengiriman —
// dulu nomor WA ini dikirim sebagai chat_id Telegram sehingga selalu gagal 500.
router.post("/tiket", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const { whatsapp_target, nama_pic, pesan } = req.body;
  if (!pesan) {
    return res.status(400).json({ detail: "pesan wajib diisi" });
  }
  const project = await prisma.clientPortalProject.findUnique({
    where: { id: projectId },
    select: { nama_proyek: true, klien: true },
  });
  const clientName = project?.klien ?? project?.nama_proyek ?? "Klien";
  const projectName = project?.nama_proyek ?? "—";

  // Cari PIC tujuan: baris kontak proyek ini yang cocok nama / nomor WA-nya.
  const kontak = await prisma.clientPortalKontak.findFirst({
    where: {
      project_id: projectId,
      OR: [
        ...(nama_pic ? [{ nama: String(nama_pic) }] : []),
        ...(whatsapp_target ? [{ whatsapp: String(whatsapp_target) }] : []),
      ],
    },
    select: { nama: true, email: true },
  });

  // Akun user internal dengan nama yang sama dipakai untuk channel Telegram.
  const picName = kontak?.nama ?? (nama_pic ? String(nama_pic) : null);
  const picUser = picName
    ? await prisma.user.findFirst({
        where: { name: picName, NOT: { email: { startsWith: "deleted+" } } },
        select: NOTIFY_USER_SELECT,
      })
    : null;

  const target: NotifyRecipient | null = picUser
    ? picUser
    : kontak?.email
      ? { name: kontak.nama, email: kontak.email }
      : null;

  if (!target) {
    return res.status(400).json({
      detail: "PIC tujuan tidak punya email atau akun terdaftar. Lengkapi kontak proyek terlebih dulu.",
    });
  }

  const msg = `🎫 *Tiket dari Klien*\n\nKlien: *${clientName}*\nProyek: ${projectName}\nKepada: ${picName || "PIC"}\n\n${pesan}`;
  const hasil = await deliver(target, msg, `Tiket dari klien — ${projectName}`);
  if (!hasil.telegram && !hasil.email) {
    return res.status(502).json({ detail: `Gagal mengirim pesan${hasil.errors.length ? `: ${hasil.errors.join("; ")}` : ""}` });
  }
  return res.json({ message: "Pesan berhasil dikirim" });
});

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

// ── GET /aktivitas-projek ─────────────────────────────────────────────────────
router.get("/aktivitas-projek", async (req: Request, res: Response) => {
  const projectId = req.clientPortal!.projectId;
  const project = await prisma.clientPortalProject.findUnique({ where: { id: projectId } });
  if (!project) return res.json([]);
  const scope = await resolveClientPortalScope(project);
  const sipilProjectIds = scope.operationalProjects
    .filter((item) => item.type === "sipil")
    .map((item) => item.id);
  if (sipilProjectIds.length === 0) return res.json([]);

  const sipilProyeks = await prisma.proyekBerjalan.findMany({
      where: { id: { in: sipilProjectIds } },
      include: {
        termins: {
          orderBy: { urutan: "asc" },
          include: { tasks: { orderBy: { created_at: "asc" } } },
        },
      },
    });

  const result: any[] = [];

  for (const p of sipilProyeks) {
    for (const t of p.termins) {
      for (const task of t.tasks) {
        result.push({
          id: `sipil_${task.id}`,
          type: "sipil",
          task_id: Number(task.id),
          proyek_nama: p.nama_proyek,
          termin_nama: t.nama,
          judul: task.nama_pekerjaan,
          tanggal_mulai: task.tanggal_mulai,
          tanggal_selesai: clientTargetDate(task.tanggal_selesai),
          status: clientTaskStatus(task.status),
          timeline_buffer_days: CLIENT_TIMELINE_BUFFER_DAYS,
        });
      }
    }
  }

  // Hanya task Gantt Sipil. Laporan PIC disajikan di menu Dokumen Projek.
  result.sort((a, b) => {
    const done = (s: string) => s === "Selesai";
    if (done(a.status) !== done(b.status)) return done(a.status) ? 1 : -1;
    if (!a.tanggal_selesai) return 1;
    if (!b.tanggal_selesai) return -1;
    return new Date(a.tanggal_selesai).getTime() - new Date(b.tanggal_selesai).getTime();
  });

  return res.json(result);
});

// ── PATCH /aktivitas-projek/:type/:taskId ─────────────────────────────────────
// Update status/tanggal task di ProyekBerjalanTask atau ProyekInteriorTask.
// Perubahan langsung masuk ke tabel projek sipil/interior (data live).
router.patch("/aktivitas-projek/:type/:taskId", async (req: Request, res: Response) => {
  const { type, taskId } = req.params;
  const { status, tanggal_mulai, tanggal_selesai } = req.body;

  const id = BigInt(taskId);
  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (tanggal_mulai !== undefined) data.tanggal_mulai = tanggal_mulai ? new Date(tanggal_mulai) : null;
  if (tanggal_selesai !== undefined) data.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;

  if (Object.keys(data).length === 0) {
    res.status(400).json({ detail: "Tidak ada field yang diubah" }); return;
  }

  if (type === "sipil") {
    await prisma.proyekBerjalanTask.update({ where: { id }, data });
  } else if (type === "interior") {
    await prisma.proyekInteriorTask.update({ where: { id }, data });
  } else {
    res.status(400).json({ detail: "Type harus sipil atau interior" }); return;
  }

  return res.json({ ok: true });
});

export default router;
