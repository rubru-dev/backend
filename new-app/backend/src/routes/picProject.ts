import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { triggerEventReminder } from "../lib/fontee";
import { sendVisitProjectAssignedReminder } from "../lib/hardcodedReminderScheduler";
import { reverseGeocode, numOrNull } from "../lib/reverseGeocode";

const router = Router();

// ── Helper: parse tanggal ke UTC midnight dari calendar date yang user pilih ──
// Frontend bisa kirim "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.sssZ", atau
// "YYYY-MM-DDTHH:mm:ss+07:00". Ambil tahun/bulan/hari-nya saja di TZ Jakarta
// dan bangun Date di UTC midnight supaya @db.Date tidak drift ±1 hari.
function parseInputDate(input: string | Date): Date {
  const s = typeof input === "string" ? input : input.toISOString();
  // Match plain YYYY-MM-DD di awal string (cover "2026-04-10" dan "2026-04-10T...")
  const plain = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (plain) {
    return new Date(Date.UTC(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])));
  }
  // Fallback: parse biasa, ambil komponen tanggalnya di Asia/Jakarta
  const d = new Date(s);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  return new Date(Date.UTC(year, month - 1, day));
}

// ── Multer setup ──────────────────────────────────────────────────────────────
const picDocsDir = path.resolve(config.storagePath, "pic-docs");
if (!fs.existsSync(picDocsDir)) fs.mkdirSync(picDocsDir, { recursive: true });

const picStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, picDocsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const picUpload = multer({
  storage: picStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Hanya file gambar yang diizinkan"));
  },
});

function normalizeImageList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeImageList(parsed);
    } catch {
      return value.length > 0 ? [value] : [];
    }
  }
  return [];
}

function mapLaporanPic(row: any) {
  return { ...row, images: normalizeImageList(row.images) };
}

function getUploadedFiles(req: Request): Express.Multer.File[] {
  const files = req.files;
  if (Array.isArray(files)) return files;
  if (files && typeof files === "object") return Object.values(files).flat();
  return [];
}

let laporanPicImagesTableReady: Promise<void> | null = null;

function ensureLaporanPicImagesTable() {
  if (!laporanPicImagesTableReady) {
    laporanPicImagesTableReady = (async () => {
      await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS laporan_pic_projek_images (
        id BIGSERIAL PRIMARY KEY,
        laporan_id BIGINT NOT NULL REFERENCES laporan_pic_projeks(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        original_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_laporan_pic_projek_images_laporan
        ON laporan_pic_projek_images (laporan_id);
      `);
    })();
  }
  return laporanPicImagesTableReady;
}

async function insertLaporanPicImages(laporanId: bigint, files: Express.Multer.File[]) {
  if (files.length === 0) return [];
  await ensureLaporanPicImagesTable();
  const rows = await Promise.all(
    files.map((file) => {
      const filePath = `/storage/pic-docs/${file.filename}`;
      return prisma.$queryRawUnsafe<{ file_path: string }[]>(
        `INSERT INTO laporan_pic_projek_images (laporan_id, file_path, original_name)
         VALUES ($1, $2, $3)
         RETURNING file_path`,
        laporanId,
        filePath,
        file.originalname
      );
    })
  );
  return rows.flat().map((row) => row.file_path);
}

async function attachLaporanPicImages<T extends { id: bigint; images?: unknown }>(rows: T[]) {
  if (rows.length === 0) return [];
  await ensureLaporanPicImagesTable();
  const ids = rows.map((row) => row.id);
  const imageRows = await prisma.$queryRawUnsafe<{ laporan_id: bigint; file_path: string }[]>(
    `SELECT laporan_id, file_path
     FROM laporan_pic_projek_images
     WHERE laporan_id = ANY($1::bigint[])
     ORDER BY id ASC`,
    ids
  );
  const byReport = new Map<string, string[]>();
  for (const image of imageRows) {
    const key = String(image.laporan_id);
    byReport.set(key, [...(byReport.get(key) ?? []), image.file_path]);
  }
  return rows.map((row) => {
    const relationalImages = byReport.get(String(row.id)) ?? [];
    const legacyImages = normalizeImageList(row.images);
    return { ...row, images: relationalImages.length > 0 ? relationalImages : legacyImages };
  });
}

// ── GET /pic/projek-list — combined sipil + interior projects ─────────────────
router.get("/projek-list", async (req: Request, res: Response) => {
  const user = req.user!;
  // PIC Project & Super Admin melihat SEMUA projek (PIC ditugaskan, bukan pembuat projek).
  // Role lain hanya melihat projek yang dibuatnya sendiri.
  const seeAll = user.roles.some((r) => r.role.name === "Super Admin" || r.role.name === "PIC Project");

  const [sipilList, interiorList] = await Promise.all([
    prisma.proyekBerjalan.findMany({
      where: seeAll ? {} : { created_by: user.id },
      include: { lead: { select: { nama: true } } },
      orderBy: { id: "desc" },
    }),
    prisma.proyekInterior.findMany({
      where: seeAll ? {} : { created_by: user.id },
      include: { lead: { select: { nama: true } } },
      orderBy: { id: "desc" },
    }),
  ]);

  const result = [
    ...sipilList.map((p) => ({
      id: String(p.id),
      type: "sipil" as const,
      nama_proyek: p.nama_proyek ?? p.lead?.nama ?? `Proyek #${p.id}`,
      lokasi: p.lokasi,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
    })),
    ...interiorList.map((p) => ({
      id: String(p.id),
      type: "interior" as const,
      nama_proyek: p.nama_proyek ?? p.lead?.nama ?? `Interior #${p.id}`,
      lokasi: p.lokasi,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
    })),
  ];

  return res.json(result);
});

// ── GET /pic/projeks/sipil/:id/termins — termins + tasks for sipil ─────────────
router.get("/projeks/sipil/:id/termins", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const proyek = await prisma.proyekBerjalan.findUnique({
    where: { id },
    include: {
      termins: {
        orderBy: { urutan: "asc" },
        include: {
          tasks: {
            orderBy: { id: "asc" },
            include: {
              fotos: {
                orderBy: { created_at: "desc" },
                include: { uploader: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!proyek) return res.status(404).json({ detail: "Proyek tidak ditemukan" });

  return res.json({
    id: String(proyek.id),
    nama_proyek: proyek.nama_proyek,
    termins: proyek.termins.map((t) => ({
      id: String(t.id),
      nama: t.nama,
      urutan: t.urutan,
      tasks: t.tasks.map((tk) => ({
        id: String(tk.id),
        nama_pekerjaan: tk.nama_pekerjaan,
        status: tk.status,
        fotos: tk.fotos.map((f) => ({
          id: String(f.id),
          file_path: f.file_path,
          keterangan: f.keterangan,
          kendala: f.kendala,
          uploader: f.uploader?.name ?? null,
          created_at: f.created_at,
        })),
      })),
    })),
  });
});

// ── GET /pic/projeks/interior/:id/termins — termins + tasks for interior ───────
router.get("/projeks/interior/:id/termins", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const proyek = await prisma.proyekInterior.findUnique({
    where: { id },
    include: {
      termins: {
        orderBy: { urutan: "asc" },
        include: {
          tasks: {
            orderBy: { id: "asc" },
            include: {
              fotos: {
                orderBy: { created_at: "desc" },
                include: { uploader: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!proyek) return res.status(404).json({ detail: "Proyek tidak ditemukan" });

  return res.json({
    id: String(proyek.id),
    nama_proyek: proyek.nama_proyek,
    termins: proyek.termins.map((t) => ({
      id: String(t.id),
      nama: t.nama,
      urutan: t.urutan,
      tasks: t.tasks.map((tk) => ({
        id: String(tk.id),
        nama_pekerjaan: tk.nama_pekerjaan,
        status: tk.status,
        fotos: tk.fotos.map((f) => ({
          id: String(f.id),
          file_path: f.file_path,
          keterangan: f.keterangan,
          kendala: f.kendala,
          uploader: f.uploader?.name ?? null,
          created_at: f.created_at,
        })),
      })),
    })),
  });
});

// ── POST /pic/tasks/sipil/:taskId/fotos ───────────────────────────────────────
router.post("/tasks/sipil/:taskId/fotos", picUpload.array("fotos", 20), async (req: Request, res: Response) => {
  const taskId = BigInt(req.params.taskId);
  const user = req.user!;
  const task = await prisma.proyekBerjalanTask.findUnique({
    where: { id: taskId },
    include: {
      termin: {
        include: {
          proyek_berjalan: {
            include: { lead: { include: { client_portal_project: true } } },
          },
        },
      },
    },
  });
  if (!task) return res.status(404).json({ detail: "Task tidak ditemukan" });
  const files = req.files as Express.Multer.File[];
  if (!files?.length) return res.status(400).json({ detail: "Minimal 1 foto wajib diupload" });

  const { keterangan, kendala } = req.body;
  const fotos = await Promise.all(
    files.map((file) =>
      prisma.proyekBerjalanTaskFoto.create({
        data: {
          task_id: taskId,
          file_path: `/storage/pic-docs/${file.filename}`,
          original_name: file.originalname,
          keterangan: keterangan || null,
          kendala: kendala || null,
          uploaded_by: user.id,
        },
        include: { uploader: { select: { name: true } } },
      })
    )
  );

  // ── Mirror ke ClientPortalGaleri (tab Galeri di portal klien) ──────────────
  // Format judul: "Termin Name ‖ Nama Pekerjaan" — delimiter " ‖ " dipakai
  // frontend portal untuk bikin nested folder (termin → item pekerjaan).
  const cpProject = task.termin?.proyek_berjalan?.lead?.client_portal_project;
  if (cpProject) {
    const terminName = task.termin?.nama || "Umum";
    const pekerjaan = task.nama_pekerjaan || "Dokumentasi";
    const judul = `${terminName} ‖ ${pekerjaan}`;
    await Promise.all(
      fotos.map((f) =>
        prisma.clientPortalGaleri.create({
          data: {
            project_id: cpProject.id,
            judul,
            deskripsi: keterangan || null,
            file_path: f.file_path,
            tanggal_foto: new Date(),
            created_by: user.id,
          },
        })
      )
    );
  }

  const namaProyek = (task as any).termin?.proyek_berjalan?.nama_proyek ?? "—";
  const namaTask = task.nama_pekerjaan ?? "—";
  triggerEventReminder("dokumentasi_projek_upload", {
    jenis: "sipil",
    nama_proyek: namaProyek,
    nama_task: namaTask,
    jumlah_foto: String(fotos.length),
    uploader: user.name ?? "—",
  }).catch(() => {});
  return res.status(201).json(
    fotos.map((f) => ({
      id: String(f.id),
      file_path: f.file_path,
      keterangan: f.keterangan,
      kendala: f.kendala,
      uploader: f.uploader?.name ?? null,
      created_at: f.created_at,
    }))
  );
});

// ── POST /pic/tasks/interior/:taskId/fotos ────────────────────────────────────
router.post("/tasks/interior/:taskId/fotos", picUpload.array("fotos", 20), async (req: Request, res: Response) => {
  const taskId = BigInt(req.params.taskId);
  const user = req.user!;
  const task = await prisma.proyekInteriorTask.findUnique({
    where: { id: taskId },
    include: {
      termin: {
        include: {
          proyek_interior: {
            include: { lead: { include: { client_portal_project: true } } },
          },
        },
      },
    },
  });
  if (!task) return res.status(404).json({ detail: "Task tidak ditemukan" });
  const files = req.files as Express.Multer.File[];
  if (!files?.length) return res.status(400).json({ detail: "Minimal 1 foto wajib diupload" });

  const { keterangan, kendala } = req.body;
  const fotos = await Promise.all(
    files.map((file) =>
      prisma.proyekInteriorTaskFoto.create({
        data: {
          task_id: taskId,
          file_path: `/storage/pic-docs/${file.filename}`,
          original_name: file.originalname,
          keterangan: keterangan || null,
          kendala: kendala || null,
          uploaded_by: user.id,
        },
        include: { uploader: { select: { name: true } } },
      })
    )
  );

  // ── Mirror ke ClientPortalGaleri (tab Galeri di portal klien) ──────────────
  // Format judul: "Termin Name ‖ Nama Pekerjaan" — delimiter " ‖ " dipakai
  // frontend portal untuk bikin nested folder (termin → item pekerjaan).
  const cpProject = task.termin?.proyek_interior?.lead?.client_portal_project;
  if (cpProject) {
    const terminName = task.termin?.nama || "Umum";
    const pekerjaan = task.nama_pekerjaan || "Dokumentasi";
    const judul = `${terminName} ‖ ${pekerjaan}`;
    await Promise.all(
      fotos.map((f) =>
        prisma.clientPortalGaleri.create({
          data: {
            project_id: cpProject.id,
            judul,
            deskripsi: keterangan || null,
            file_path: f.file_path,
            tanggal_foto: new Date(),
            created_by: user.id,
          },
        })
      )
    );
  }

  const namaProyekInterior = (task as any).termin?.proyek_interior?.nama_proyek ?? "—";
  triggerEventReminder("dokumentasi_projek_upload", {
    jenis: "interior",
    nama_proyek: namaProyekInterior,
    nama_task: task.nama_pekerjaan ?? "—",
    jumlah_foto: String(fotos.length),
    uploader: user.name ?? "—",
  }).catch(() => {});
  return res.status(201).json(
    fotos.map((f) => ({
      id: String(f.id),
      file_path: f.file_path,
      keterangan: f.keterangan,
      kendala: f.kendala,
      uploader: f.uploader?.name ?? null,
      created_at: f.created_at,
    }))
  );
});

// ── DELETE /pic/fotos/sipil/:fotoId ──────────────────────────────────────────
router.delete("/fotos/sipil/:fotoId", async (req: Request, res: Response) => {
  const fotoId = BigInt(req.params.fotoId);
  const foto = await prisma.proyekBerjalanTaskFoto.findUnique({ where: { id: fotoId } });
  if (!foto) return res.status(404).json({ detail: "Foto tidak ditemukan" });
  const filePath = path.resolve(config.storagePath, foto.file_path.replace(/^\/storage\//, ""));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  // Hapus mirror di ClientPortalGaleri (match by file_path)
  await prisma.clientPortalGaleri.deleteMany({ where: { file_path: foto.file_path } });
  await prisma.proyekBerjalanTaskFoto.delete({ where: { id: fotoId } });
  return res.json({ message: "Foto dihapus" });
});

// ── DELETE /pic/fotos/interior/:fotoId ───────────────────────────────────────
router.delete("/fotos/interior/:fotoId", async (req: Request, res: Response) => {
  const fotoId = BigInt(req.params.fotoId);
  const foto = await prisma.proyekInteriorTaskFoto.findUnique({ where: { id: fotoId } });
  if (!foto) return res.status(404).json({ detail: "Foto tidak ditemukan" });
  const filePath = path.resolve(config.storagePath, foto.file_path.replace(/^\/storage\//, ""));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  // Hapus mirror di ClientPortalGaleri (match by file_path)
  await prisma.clientPortalGaleri.deleteMany({ where: { file_path: foto.file_path } });
  await prisma.proyekInteriorTaskFoto.delete({ where: { id: fotoId } });
  return res.json({ message: "Foto dihapus" });
});

// ── GET /pic/proyek-berjalan (lama — tetap ada untuk backward compat) ─────────
router.get("/proyek-berjalan", async (req: Request, res: Response) => {
  const user = req.user!;
  const isSuperAdmin = user.roles.some((r) => r.role.name === "Super Admin");
  const where = isSuperAdmin ? {} : { created_by: user.id };
  const items = await prisma.proyekBerjalan.findMany({
    where,
    include: { lead: true, pic: true },
    orderBy: { id: "desc" },
  });
  return res.json(
    items.map((p) => ({
      id: p.id,
      lokasi: p.lokasi,
      nilai_rab: parseFloat(String(p.nilai_rab ?? 0)),
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      lead: p.lead ? { nama: p.lead.nama } : null,
      pic: p.pic ? { name: p.pic.name } : null,
    }))
  );
});

// ── PATCH /pic/proyek-berjalan/:id/progress ───────────────────────────────────
router.patch("/proyek-berjalan/:id/progress", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nilai_rab, tanggal_selesai, lokasi } = req.body;
  const user = req.user!;
  const isSuperAdmin = user.roles.some((r) => r.role.name === "Super Admin");
  const p = await prisma.proyekBerjalan.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ detail: "Proyek tidak ditemukan" });
  if (!isSuperAdmin && p.created_by !== user.id)
    return res.status(403).json({ detail: "Tidak memiliki akses ke proyek ini" });
  const updates: Record<string, unknown> = {};
  if (nilai_rab !== undefined) updates.nilai_rab = nilai_rab;
  if (tanggal_selesai !== undefined) updates.tanggal_selesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
  if (lokasi !== undefined) updates.lokasi = lokasi;
  if (Object.keys(updates).length > 0)
    await prisma.proyekBerjalan.update({ where: { id }, data: updates });
  return res.json({ message: "Proyek diupdate" });
});

// ── Kalender Visit ────────────────────────────────────────────────────────────

// GET /pic/kalender-visit/projek-options — semua projek sipil + interior untuk dropdown
router.get("/kalender-visit/projek-options", async (_req: Request, res: Response) => {
  const [sipil, interior] = await Promise.all([
    prisma.proyekBerjalan.findMany({
      select: { id: true, nama_proyek: true, lead: { select: { nama: true } } },
      orderBy: { id: "desc" },
    }),
    prisma.proyekInterior.findMany({
      select: { id: true, nama_proyek: true, lead: { select: { nama: true } } },
      orderBy: { id: "desc" },
    }),
  ]);
  return res.json([
    ...sipil.map(p => ({ id: String(p.id), type: "sipil", label: p.nama_proyek ?? p.lead?.nama ?? `Sipil #${p.id}` })),
    ...interior.map(p => ({ id: String(p.id), type: "interior", label: p.nama_proyek ?? p.lead?.nama ?? `Interior #${p.id}` })),
  ]);
});

// GET /pic/kalender-visit/my-schedule — jadwal milik PIC yang login
router.get("/kalender-visit/my-schedule", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { bulan, tahun } = req.query;
  const where: any = { user_id: userId };
  if (bulan && tahun) {
    // Pakai UTC supaya cocok dengan Prisma @db.Date (yang menormalisasi tanggal sebagai UTC).
    // Bila pakai local time (WIB), end date jadi mundur 1 hari → hari terakhir bulan ke-skip.
    const start = new Date(Date.UTC(Number(tahun), Number(bulan) - 1, 1));
    const end   = new Date(Date.UTC(Number(tahun), Number(bulan), 1));
    where.kalender_visit = { tanggal: { gte: start, lt: end } };
  }
  const items = await prisma.kalenderVisitPic.findMany({
    where,
    include: {
      kalender_visit: {
        include: { creator: { select: { id: true, name: true } } },
      },
    },
    orderBy: { kalender_visit: { tanggal: "asc" } },
  });
  return res.json(items);
});

// GET /pic/kalender-visit — list semua jadwal
router.get("/kalender-visit", async (req: Request, res: Response) => {
  const { bulan, tahun } = req.query;
  const where: any = {};
  if (bulan && tahun) {
    // Pakai UTC supaya cocok dengan Prisma @db.Date (lihat my-schedule untuk penjelasan).
    const start = new Date(Date.UTC(Number(tahun), Number(bulan) - 1, 1));
    const end   = new Date(Date.UTC(Number(tahun), Number(bulan), 1));
    where.tanggal = { gte: start, lt: end };
  }
  const items = await prisma.kalenderVisit.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true } },
      pics: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { tanggal: "asc" },
  });
  return res.json(items);
});

// POST /pic/kalender-visit — buat jadwal baru
router.post("/kalender-visit", async (req: Request, res: Response) => {
  const { nama_projek, projek_id, projek_type, tanggal, jam, keterangan, pic_user_ids } = req.body;
  if (!nama_projek || !tanggal) return res.status(400).json({ detail: "nama_projek dan tanggal wajib diisi" });
  if (!Array.isArray(pic_user_ids) || pic_user_ids.length === 0)
    return res.status(400).json({ detail: "Minimal 1 PIC harus dipilih" });

  const visit = await prisma.kalenderVisit.create({
    data: {
      nama_projek,
      projek_id: projek_id ? BigInt(projek_id) : null,
      projek_type: projek_type || null,
      tanggal: parseInputDate(tanggal),
      jam: jam || null,
      keterangan: keterangan || null,
      created_by: req.user!.id,
      pics: {
        create: pic_user_ids.map((uid: string | number) => ({
          user_id: BigInt(uid),
          status_konfirmasi: "Pending",
        })),
      },
    },
    include: {
      creator: { select: { id: true, name: true } },
      pics: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  sendVisitProjectAssignedReminder(visit.id).catch((err) => {
    console.error("[HardcodedReminder] visit projek assign error:", err);
  });
  return res.status(201).json(visit);
});

// PATCH /pic/kalender-visit/:id/hasil — simpan keterangan hasil visit
router.patch("/kalender-visit/:id/hasil", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const row = await prisma.kalenderVisit.update({
    where: { id },
    data: { keterangan_hasil: req.body.keterangan_hasil || null },
  });
  return res.json(row);
});

// POST /pic/kalender-visit/:id/clock-in|out — bukti kehadiran (foto + jam + nama lokasi)
async function kvClock(id: bigint, type: "in" | "out", req: Request) {
  const lat = numOrNull(req.body.lat);
  const lng = numOrNull(req.body.lng);
  const photo = (req as any).file ? `/storage/pic-docs/${(req as any).file.filename}` : null;
  const location = lat != null && lng != null ? await reverseGeocode(lat, lng) : null;
  const now = new Date();
  const data =
    type === "in"
      ? { clock_in_photo: photo, clock_in_at: now, clock_in_lat: lat, clock_in_lng: lng, clock_in_location: location }
      : { clock_out_photo: photo, clock_out_at: now, clock_out_lat: lat, clock_out_lng: lng, clock_out_location: location };
  return prisma.kalenderVisit.update({ where: { id }, data });
}
router.post("/kalender-visit/:id/clock-in", picUpload.single("photo"), async (req: Request, res: Response) => {
  const row = await kvClock(BigInt(req.params.id), "in", req);
  return res.json(row);
});
router.post("/kalender-visit/:id/clock-out", picUpload.single("photo"), async (req: Request, res: Response) => {
  const existing = await prisma.kalenderVisit.findUnique({ where: { id: BigInt(req.params.id) } });
  if (!existing?.clock_in_at) return res.status(400).json({ detail: "Harus clock in terlebih dahulu." });
  const row = await kvClock(BigInt(req.params.id), "out", req);
  return res.json(row);
});

// PATCH /pic/kalender-visit/:id — update jadwal
router.patch("/kalender-visit/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { nama_projek, projek_id, projek_type, tanggal, jam, keterangan, status, pic_user_ids } = req.body;
  const visit = await prisma.kalenderVisit.findUnique({ where: { id } });
  if (!visit) return res.status(404).json({ detail: "Jadwal tidak ditemukan" });

  const updates: any = {};
  if (nama_projek !== undefined) updates.nama_projek = nama_projek;
  if (projek_id !== undefined)   updates.projek_id = projek_id ? BigInt(projek_id) : null;
  if (projek_type !== undefined) updates.projek_type = projek_type || null;
  if (tanggal !== undefined)     updates.tanggal = parseInputDate(tanggal);
  if (jam !== undefined)         updates.jam = jam || null;
  if (keterangan !== undefined)  updates.keterangan = keterangan || null;
  if (status !== undefined)      updates.status = status;

  // Jika pic_user_ids dikirim, sync ulang
  if (Array.isArray(pic_user_ids)) {
    await prisma.kalenderVisitPic.deleteMany({ where: { kalender_visit_id: id } });
    updates.pics = {
      create: pic_user_ids.map((uid: string | number) => ({
        user_id: BigInt(uid),
        status_konfirmasi: "Pending",
      })),
    };
  }

  const updated = await prisma.kalenderVisit.update({
    where: { id },
    data: updates,
    include: {
      creator: { select: { id: true, name: true } },
      pics: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (Array.isArray(pic_user_ids) && pic_user_ids.length > 0) {
    sendVisitProjectAssignedReminder(updated.id).catch((err) => {
      console.error("[HardcodedReminder] visit projek assign update error:", err);
    });
  }
  return res.json(updated);
});

// DELETE /pic/kalender-visit/:id
router.delete("/kalender-visit/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.kalenderVisit.delete({ where: { id } });
  return res.json({ message: "Jadwal dihapus" });
});

// POST /pic/kalender-visit/:id/konfirmasi — PIC upload foto bukti konfirmasi
router.post("/kalender-visit/:id/konfirmasi", async (req: Request, res: Response) => {
  const kalenderVisitId = BigInt(req.params.id);
  const userId = req.user!.id;
  const { foto_bukti, catatan } = req.body;
  if (!foto_bukti) return res.status(400).json({ detail: "Foto bukti wajib diupload" });

  const pic = await prisma.kalenderVisitPic.findUnique({
    where: { kalender_visit_id_user_id: { kalender_visit_id: kalenderVisitId, user_id: userId } },
  });
  if (!pic) return res.status(404).json({ detail: "Anda tidak terdaftar sebagai PIC untuk jadwal ini" });

  // Simpan foto base64
  const saveDir = path.resolve(config.storagePath, "kalender-visit");
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
  const matches = foto_bukti.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) return res.status(400).json({ detail: "Format foto tidak valid" });
  const ext = matches[1].split("/")[1] === "jpeg" ? "jpg" : matches[1].split("/")[1];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  fs.writeFileSync(path.join(saveDir, filename), Buffer.from(matches[2], "base64"));
  const filePath = `/storage/kalender-visit/${filename}`;

  const updated = await prisma.kalenderVisitPic.update({
    where: { id: pic.id },
    data: {
      foto_bukti: filePath,
      status_konfirmasi: "Dikonfirmasi",
      catatan: catatan || null,
      uploaded_at: new Date(),
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return res.json(updated);
});

// GET /pic/pic-users — list semua karyawan untuk dropdown
router.get("/pic-users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.json(users);
});

// ── Laporan PIC Project (terhubung ke Projek Sipil/Interior) ──────────────────

// Opsi nama projek untuk dropdown saat PIC mengisi laporan
router.get("/laporan-pic/projek-options", async (req: Request, res: Response) => {
  const type = String(req.query.type || "sipil") === "interior" ? "interior" : "sipil";
  if (type === "interior") {
    const rows = await prisma.proyekInterior.findMany({ select: { id: true, nama_proyek: true }, orderBy: { id: "desc" } });
    return res.json(rows.map((r) => ({ id: r.id, nama: r.nama_proyek || `Interior #${r.id}` })));
  }
  const rows = await prisma.proyekBerjalan.findMany({ select: { id: true, nama_proyek: true }, orderBy: { id: "desc" } });
  return res.json(rows.map((r) => ({ id: r.id, nama: r.nama_proyek || `Sipil #${r.id}` })));
});

// PIC membuat laporan (teks + banyak gambar). Terima beberapa nama field supaya kompatibel
// dengan bundle lama/cache yang mungkin masih mengirim "fotos" atau "files".
router.post(
  "/laporan-pic",
  picUpload.fields([
    { name: "images", maxCount: 20 },
    { name: "fotos", maxCount: 20 },
    { name: "files", maxCount: 20 },
    { name: "file", maxCount: 20 },
  ]),
  async (req: Request, res: Response) => {
  const user = req.user!;
  const { project_type, project_id, kegiatan, kendala, expected_file_count } = req.body;
  const files = getUploadedFiles(req).slice(0, 20);
  const expectedFileCount = Number(expected_file_count ?? 0);
  console.log("[LaporanPIC] request upload diterima", {
    user_id: String(user.id),
    project_type,
    project_id,
    expected_file_count: expectedFileCount,
    received_file_count: files.length,
    file_fields: Array.isArray(req.files) ? ["array"] : Object.keys((req.files as Record<string, unknown>) ?? {}),
    files: files.map((file) => ({ field: file.fieldname, name: file.originalname, type: file.mimetype, size: file.size, saved_as: file.filename })),
  });
  if (!project_type || !project_id || !kegiatan) {
    console.warn("[LaporanPIC] upload gagal validasi field wajib", { project_type, project_id, has_kegiatan: Boolean(kegiatan) });
    return res.status(400).json({ detail: "Tipe projek, nama projek, dan kegiatan wajib diisi" });
  }
  const type = project_type === "interior" ? "interior" : "sipil";
  const pid = BigInt(project_id);
  const proj = type === "interior"
    ? await prisma.proyekInterior.findUnique({ where: { id: pid }, select: { nama_proyek: true } })
    : await prisma.proyekBerjalan.findUnique({ where: { id: pid }, select: { nama_proyek: true } });
  if (expectedFileCount > 0 && files.length === 0) {
    console.warn("[LaporanPIC] upload gagal: frontend kirim file tapi backend tidak menerima file", {
      expected_file_count: expectedFileCount,
      received_file_count: files.length,
    });
    return res.status(400).json({
      detail: "Foto tidak diterima backend. Coba refresh halaman lalu upload ulang.",
    });
  }
  const row = await prisma.laporanPicProjek.create({
    data: {
      user_id: user.id,
      project_type: type,
      project_id: pid,
      project_nama: proj?.nama_proyek ?? null,
      kegiatan: String(kegiatan),
      kendala: kendala ? String(kendala) : null,
      images: [],
    },
    include: { user: { select: { name: true } } },
  });
  const images = await insertLaporanPicImages(row.id, files);
  console.log("[LaporanPIC] upload berhasil disimpan", {
    laporan_id: String(row.id),
    image_count: images.length,
    images,
  });
  return res.status(201).json({ ...mapLaporanPic(row), images });
});

// List laporan: per-projek (tab Laporan PIC Project) atau milik sendiri (?mine=1)
router.get("/laporan-pic", async (req: Request, res: Response) => {
  const { project_type, project_id, mine } = req.query;
  const where: any = {};
  if (mine === "1") where.user_id = req.user!.id;
  if (project_type) where.project_type = project_type === "interior" ? "interior" : "sipil";
  if (project_id) where.project_id = BigInt(String(project_id));
  const rows = await prisma.laporanPicProjek.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: { user: { select: { name: true } } },
  });
  return res.json(await attachLaporanPicImages(rows));
});

// Hapus laporan (pemilik atau Super Admin)
router.delete("/laporan-pic/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const row = await prisma.laporanPicProjek.findUnique({ where: { id } });
  if (!row) return res.status(404).json({ detail: "Laporan tidak ditemukan" });
  const rows = await attachLaporanPicImages([row]);
  for (const imagePath of rows[0]?.images ?? []) {
    const filePath = path.resolve(config.storagePath, imagePath.replace(/^\/storage\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await prisma.laporanPicProjek.delete({ where: { id } });
  return res.json({ success: true });
});

export default router;
