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

export default router;
