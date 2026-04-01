import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { config } from "../config";

const router = Router();

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

// ── GET /pic/projek-list — combined sipil + interior projects ─────────────────
router.get("/projek-list", async (req: Request, res: Response) => {
  const user = req.user!;
  const isSuperAdmin = user.roles.some((r) => r.role.name === "Super Admin");

  const [sipilList, interiorList] = await Promise.all([
    prisma.proyekBerjalan.findMany({
      where: isSuperAdmin ? {} : { created_by: user.id },
      include: { lead: { select: { nama: true } } },
      orderBy: { id: "desc" },
    }),
    prisma.proyekInterior.findMany({
      where: isSuperAdmin ? {} : { created_by: user.id },
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
  const task = await prisma.proyekBerjalanTask.findUnique({ where: { id: taskId } });
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
  const task = await prisma.proyekInteriorTask.findUnique({ where: { id: taskId } });
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
    const start = new Date(Number(tahun), Number(bulan) - 1, 1);
    const end   = new Date(Number(tahun), Number(bulan), 1);
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
    const start = new Date(Number(tahun), Number(bulan) - 1, 1);
    const end   = new Date(Number(tahun), Number(bulan), 1);
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
      tanggal: new Date(tanggal),
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
  return res.status(201).json(visit);
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
  if (tanggal !== undefined)     updates.tanggal = new Date(tanggal);
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

export default router;
