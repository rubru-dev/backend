import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { config } from "../config";

const router = Router();

// ── Storage dirs ──────────────────────────────────────────────────────────────
const baseDir = path.resolve(config.storagePath, "website");
const dirs = {
  banner: path.join(baseDir, "banner"),
  portfolio: path.join(baseDir, "portfolio"),
  project: path.join(baseDir, "project"),
  artikel: path.join(baseDir, "artikel"),
};
for (const dir of Object.values(dirs)) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeUpload(dest: string) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dest),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
        cb(null, `${Date.now()}_${base}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
      else cb(new Error("Hanya JPG, PNG, WEBP yang diizinkan"));
    },
  });
}

const bannerUpload = makeUpload(dirs.banner);
const portfolioUpload = makeUpload(dirs.portfolio);
const projectUpload = makeUpload(dirs.project);
const artikelUpload = makeUpload(dirs.artikel);

function imgUrl(p: string | null | undefined) {
  if (!p) return null;
  return `/storage/${p}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Site Config ───────────────────────────────────────────────────────────────

router.get("/config", async (_req, res) => {
  let cfg = await prisma.rbSiteConfig.findFirst();
  if (!cfg) {
    cfg = await prisma.rbSiteConfig.create({ data: { id: 1 } });
  }
  res.json({ data: cfg });
});

router.put("/config", async (req, res) => {
  const { whatsapp_number, alamat_kantor, alamat_workshop, telepon, email, jam_kerja, lokasi_maps, instagram, instagram_url, tiktok_url, facebook_url, stats_hari, stats_projek, stats_mitra } = req.body;
  const cfg = await prisma.rbSiteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      whatsapp_number: whatsapp_number ?? "",
      stats_hari: stats_hari ?? 0, stats_projek: stats_projek ?? 0, stats_mitra: stats_mitra ?? 0,
      alamat_kantor, alamat_workshop, telepon, email, jam_kerja, lokasi_maps, instagram, instagram_url, tiktok_url, facebook_url,
    },
    update: {
      whatsapp_number, alamat_kantor, alamat_workshop, telepon, email, jam_kerja, lokasi_maps,
      instagram, instagram_url, tiktok_url, facebook_url, stats_hari, stats_projek, stats_mitra, updated_at: new Date(),
    },
  });
  res.json({ data: cfg });
});

// ── Kalkulator Config ─────────────────────────────────────────────────────────

router.get("/kalkulator", async (_req, res) => {
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) {
    cfg = await prisma.rbKalkulatorConfig.create({
      data: {
        id: 1,
        base_prices: { MINIMALIS: 3000000, LUXURY: 5000000 },
        surcharges: {
          HEBEL: 100000, KERAMIK_60: 80000, GRANIT: 200000,
          GENTENG_KERAMIK: 50000, BAJA_RINGAN: 80000,
          PVC: -50000, KAYU_KAMPER: 120000, UPVC: 150000,
          KITCHEN_SET: 500000, CARPORT: 300000, GARASI: 600000,
          TAMAN_DEPAN: 200000,
        },
      },
    });
  }
  res.json({ data: cfg });
});

router.put("/kalkulator", async (req, res) => {
  const { base_prices, surcharges } = req.body;
  if (!base_prices || !surcharges) {
    return res.status(400).json({ detail: "base_prices dan surcharges wajib diisi" });
  }
  const cfg = await prisma.rbKalkulatorConfig.upsert({
    where: { id: 1 },
    create: { id: 1, base_prices, surcharges },
    update: { base_prices, surcharges, updated_at: new Date() },
  });
  res.json({ data: cfg });
});

// POST /website/kalkulator/paket — add paket item
router.post("/kalkulator/paket", async (req, res) => {
  const { key, label, harga, satuan } = req.body;
  if (!key || !label || harga === undefined) return res.status(400).json({ detail: "key, label, harga wajib diisi" });
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) cfg = await prisma.rbKalkulatorConfig.create({ data: { id: 1, base_prices: [], surcharges: [] } });
  const items: any[] = Array.isArray(cfg.base_prices) ? (cfg.base_prices as any[]) : Object.entries(cfg.base_prices as any).map(([k, v]) => ({ key: k, label: k, harga: v, satuan: "per m²" }));
  if (items.find((i: any) => i.key === key)) return res.status(400).json({ detail: "Key sudah ada" });
  items.push({ key, label, harga: Number(harga), satuan: satuan ?? "per m²" });
  const updated = await prisma.rbKalkulatorConfig.update({ where: { id: 1 }, data: { base_prices: items, updated_at: new Date() } });
  res.json({ data: updated });
});

// PUT /website/kalkulator/paket/:key — edit paket item
router.put("/kalkulator/paket/:key", async (req, res) => {
  const { label, harga, satuan } = req.body;
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) return res.status(404).json({ detail: "Config tidak ditemukan" });
  const items: any[] = Array.isArray(cfg.base_prices) ? (cfg.base_prices as any[]) : Object.entries(cfg.base_prices as any).map(([k, v]) => ({ key: k, label: k, harga: v, satuan: "per m²" }));
  const idx = items.findIndex((i: any) => i.key === req.params.key);
  if (idx < 0) return res.status(404).json({ detail: "Item tidak ditemukan" });
  if (label !== undefined) items[idx].label = label;
  if (harga !== undefined) items[idx].harga = Number(harga);
  if (satuan !== undefined) items[idx].satuan = satuan;
  const updated = await prisma.rbKalkulatorConfig.update({ where: { id: 1 }, data: { base_prices: items, updated_at: new Date() } });
  res.json({ data: updated });
});

// DELETE /website/kalkulator/paket/:key
router.delete("/kalkulator/paket/:key", async (req, res) => {
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) return res.status(404).json({ detail: "Config tidak ditemukan" });
  const items: any[] = Array.isArray(cfg.base_prices) ? (cfg.base_prices as any[]) : Object.entries(cfg.base_prices as any).map(([k, v]) => ({ key: k, label: k, harga: v, satuan: "per m²" }));
  const updated_items = items.filter((i: any) => i.key !== req.params.key);
  const updated = await prisma.rbKalkulatorConfig.update({ where: { id: 1 }, data: { base_prices: updated_items, updated_at: new Date() } });
  res.json({ data: updated });
});

// POST /website/kalkulator/surcharge — add surcharge item
router.post("/kalkulator/surcharge", async (req, res) => {
  const { key, label, harga, satuan, kategori } = req.body;
  if (!key || !label || harga === undefined) return res.status(400).json({ detail: "key, label, harga wajib diisi" });
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) cfg = await prisma.rbKalkulatorConfig.create({ data: { id: 1, base_prices: [], surcharges: [] } });
  const items: any[] = Array.isArray(cfg.surcharges) ? (cfg.surcharges as any[]) : Object.entries(cfg.surcharges as any).map(([k, v]) => ({ key: k, label: k, harga: v, satuan: "per m²", kategori: "" }));
  if (items.find((i: any) => i.key === key)) return res.status(400).json({ detail: "Key sudah ada" });
  items.push({ key, label, harga: Number(harga), satuan: satuan ?? "per m²", kategori: kategori ?? "" });
  const updated = await prisma.rbKalkulatorConfig.update({ where: { id: 1 }, data: { surcharges: items, updated_at: new Date() } });
  res.json({ data: updated });
});

// PUT /website/kalkulator/surcharge/:key
router.put("/kalkulator/surcharge/:key", async (req, res) => {
  const { label, harga, satuan, kategori } = req.body;
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) return res.status(404).json({ detail: "Config tidak ditemukan" });
  const items: any[] = Array.isArray(cfg.surcharges) ? (cfg.surcharges as any[]) : Object.entries(cfg.surcharges as any).map(([k, v]) => ({ key: k, label: k, harga: v, satuan: "per m²", kategori: "" }));
  const idx = items.findIndex((i: any) => i.key === req.params.key);
  if (idx < 0) return res.status(404).json({ detail: "Item tidak ditemukan" });
  if (label !== undefined) items[idx].label = label;
  if (harga !== undefined) items[idx].harga = Number(harga);
  if (satuan !== undefined) items[idx].satuan = satuan;
  if (kategori !== undefined) items[idx].kategori = kategori;
  const updated = await prisma.rbKalkulatorConfig.update({ where: { id: 1 }, data: { surcharges: items, updated_at: new Date() } });
  res.json({ data: updated });
});

// DELETE /website/kalkulator/surcharge/:key
router.delete("/kalkulator/surcharge/:key", async (req, res) => {
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) return res.status(404).json({ detail: "Config tidak ditemukan" });
  const items: any[] = Array.isArray(cfg.surcharges) ? (cfg.surcharges as any[]) : Object.entries(cfg.surcharges as any).map(([k, v]) => ({ key: k, label: k, harga: v, satuan: "per m²", kategori: "" }));
  const updated_items = items.filter((i: any) => i.key !== req.params.key);
  const updated = await prisma.rbKalkulatorConfig.update({ where: { id: 1 }, data: { surcharges: updated_items, updated_at: new Date() } });
  res.json({ data: updated });
});

// ── Banner ────────────────────────────────────────────────────────────────────

const bannerFields = bannerUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "mobile_image", maxCount: 1 },
]);

function bannerRes(b: any) {
  return {
    ...b,
    image_url: imgUrl(b.image_path),
    mobile_image_url: imgUrl(b.mobile_image_path),
  };
}

router.get("/banner", async (_req, res) => {
  const items = await prisma.rbBanner.findMany({ orderBy: { sort_order: "asc" } });
  res.json({ data: items.map(bannerRes) });
});

router.post("/banner", bannerFields, async (req, res) => {
  const files = req.files as Record<string, Express.Multer.File[]>;
  const mainFile = files?.image?.[0];
  if (!mainFile) return res.status(400).json({ detail: "File gambar wajib diupload" });
  const image_path = `website/banner/${mainFile.filename}`;
  const mobileFile = files?.mobile_image?.[0];
  const mobile_image_path = mobileFile ? `website/banner/${mobileFile.filename}` : null;
  const count = await prisma.rbBanner.count();
  const banner = await prisma.rbBanner.create({
    data: {
      title: req.body.title || null,
      subtitle: req.body.subtitle || null,
      image_path,
      mobile_image_path,
      sort_order: count,
      is_active: req.body.is_active !== "false",
    },
  });
  res.json({ data: bannerRes(banner) });
});

router.patch("/banner/:id", bannerFields, async (req, res) => {
  const id = BigInt(req.params.id);
  const existing = await prisma.rbBanner.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ detail: "Banner tidak ditemukan" });

  const files = req.files as Record<string, Express.Multer.File[]>;
  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (req.body.title !== undefined) updateData.title = req.body.title || null;
  if (req.body.subtitle !== undefined) updateData.subtitle = req.body.subtitle || null;
  if (req.body.sort_order !== undefined) updateData.sort_order = parseInt(req.body.sort_order);
  if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active !== "false";

  const mainFile = files?.image?.[0];
  if (mainFile) {
    const oldPath = path.resolve(config.storagePath, existing.image_path);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    updateData.image_path = `website/banner/${mainFile.filename}`;
  }
  const mobileFile = files?.mobile_image?.[0];
  if (mobileFile) {
    if (existing.mobile_image_path) {
      const oldMobile = path.resolve(config.storagePath, existing.mobile_image_path);
      if (fs.existsSync(oldMobile)) fs.unlinkSync(oldMobile);
    }
    updateData.mobile_image_path = `website/banner/${mobileFile.filename}`;
  }

  const banner = await prisma.rbBanner.update({ where: { id }, data: updateData });
  res.json({ data: bannerRes(banner) });
});

router.delete("/banner/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const existing = await prisma.rbBanner.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ detail: "Banner tidak ditemukan" });
  const filePath = path.resolve(config.storagePath, existing.image_path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (existing.mobile_image_path) {
    const mobilePath = path.resolve(config.storagePath, existing.mobile_image_path);
    if (fs.existsSync(mobilePath)) fs.unlinkSync(mobilePath);
  }
  await prisma.rbBanner.delete({ where: { id } });
  res.json({ success: true });
});

// ── Portfolio ─────────────────────────────────────────────────────────────────

router.get("/portfolio", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const per_page = Math.min(50, parseInt(req.query.per_page as string) || 20);
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) where.nama_klien = { contains: search, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.rbPortfolio.findMany({
      where,
      include: { images: { where: { is_cover: true }, take: 1 } },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
      skip: (page - 1) * per_page,
      take: per_page,
    }),
    prisma.rbPortfolio.count({ where }),
  ]);

  res.json({
    items: items.map((p) => ({
      ...p,
      budget: Number(p.budget),
      luas: Number(p.luas),
      cover: p.images[0] ? { ...p.images[0], image_url: imgUrl(p.images[0].image_path) } : null,
      images: undefined,
    })),
    total, page, per_page, total_pages: Math.ceil(total / per_page),
  });
});

router.get("/portfolio/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.rbPortfolio.findUnique({
    where: { id },
    include: { images: { orderBy: { sort_order: "asc" } } },
  });
  if (!item) return res.status(404).json({ detail: "Portfolio tidak ditemukan" });
  res.json({
    data: {
      ...item,
      budget: Number(item.budget),
      luas: Number(item.luas),
      images: item.images.map((i) => ({ ...i, image_url: imgUrl(i.image_path) })),
    },
  });
});

router.post("/portfolio", async (req, res) => {
  const { nama_klien, jenis_jasa, deskripsi, budget, luas, tanggal_selesai, is_published, sort_order } = req.body;
  if (!nama_klien || !jenis_jasa || !tanggal_selesai) {
    return res.status(400).json({ detail: "nama_klien, jenis_jasa, tanggal_selesai wajib diisi" });
  }
  const baseSlug = slugify(nama_klien + "-" + jenis_jasa + "-" + new Date().getFullYear());
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.rbPortfolio.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }
  const item = await prisma.rbPortfolio.create({
    data: {
      slug,
      nama_klien,
      jenis_jasa,
      deskripsi: deskripsi || null,
      budget: budget ? parseFloat(budget) : 0,
      luas: luas ? parseFloat(luas) : 0,
      tanggal_selesai: new Date(tanggal_selesai),
      is_published: is_published === true || is_published === "true",
      sort_order: sort_order ? parseInt(sort_order) : 0,
    },
  });
  res.json({ data: { ...item, budget: Number(item.budget), luas: Number(item.luas) } });
});

router.patch("/portfolio/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const { nama_klien, jenis_jasa, deskripsi, budget, luas, tanggal_selesai, is_published, sort_order } = req.body;
  const update: Record<string, unknown> = { updated_at: new Date() };
  if (nama_klien !== undefined) update.nama_klien = nama_klien;
  if (jenis_jasa !== undefined) update.jenis_jasa = jenis_jasa;
  if (deskripsi !== undefined) update.deskripsi = deskripsi || null;
  if (budget !== undefined) update.budget = parseFloat(budget);
  if (luas !== undefined) update.luas = parseFloat(luas);
  if (tanggal_selesai !== undefined) update.tanggal_selesai = new Date(tanggal_selesai);
  if (is_published !== undefined) update.is_published = is_published === true || is_published === "true";
  if (sort_order !== undefined) update.sort_order = parseInt(sort_order);
  const item = await prisma.rbPortfolio.update({ where: { id }, data: update });
  res.json({ data: { ...item, budget: Number(item.budget), luas: Number(item.luas) } });
});

router.delete("/portfolio/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  // images cascade deleted by DB; delete files too
  const images = await prisma.rbPortfolioImage.findMany({ where: { portfolio_id: id } });
  for (const img of images) {
    const fp = path.resolve(config.storagePath, img.image_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await prisma.rbPortfolio.delete({ where: { id } });
  res.json({ success: true });
});

// Portfolio images
router.post("/portfolio/:id/images", portfolioUpload.array("images", 20), async (req, res) => {
  const portfolio_id = BigInt(req.params.id);
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) return res.status(400).json({ detail: "Minimal 1 gambar" });
  const group = (req.body.group as string) || "cover";
  const existingInGroup = await prisma.rbPortfolioImage.count({ where: { portfolio_id, group } });
  const allExisting = await prisma.rbPortfolioImage.count({ where: { portfolio_id } });
  const images = await prisma.rbPortfolioImage.createMany({
    data: files.map((f, i) => ({
      portfolio_id,
      image_path: `website/portfolio/${f.filename}`,
      group,
      sort_order: existingInGroup + i,
      is_cover: allExisting === 0 && i === 0 && group === "cover",
    })),
  });
  res.json({ success: true, count: images.count });
});

router.patch("/portfolio/:id/images/:imgId/cover", async (req, res) => {
  const portfolio_id = BigInt(req.params.id);
  const imgId = BigInt(req.params.imgId);
  await prisma.rbPortfolioImage.updateMany({ where: { portfolio_id }, data: { is_cover: false } });
  await prisma.rbPortfolioImage.update({ where: { id: imgId }, data: { is_cover: true } });
  res.json({ success: true });
});

router.delete("/portfolio/:id/images/:imgId", async (req, res) => {
  const imgId = BigInt(req.params.imgId);
  const img = await prisma.rbPortfolioImage.findUnique({ where: { id: imgId } });
  if (!img) return res.status(404).json({ detail: "Gambar tidak ditemukan" });
  const fp = path.resolve(config.storagePath, img.image_path);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  await prisma.rbPortfolioImage.delete({ where: { id: imgId } });
  res.json({ success: true });
});

// ── Project Berjalan ──────────────────────────────────────────────────────────

router.get("/project", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const per_page = Math.min(50, parseInt(req.query.per_page as string) || 20);
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) where.nama_klien = { contains: search, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.rbProject.findMany({
      where,
      include: { images: { where: { is_cover: true }, take: 1 } },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
    prisma.rbProject.count({ where }),
  ]);

  res.json({
    items: items.map((p) => ({
      ...p,
      budget: Number(p.budget),
      luas: Number(p.luas),
      cover: p.images[0] ? { ...p.images[0], image_url: imgUrl(p.images[0].image_path) } : null,
      images: undefined,
    })),
    total, page, per_page, total_pages: Math.ceil(total / per_page),
  });
});

router.get("/project/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.rbProject.findUnique({
    where: { id },
    include: { images: { orderBy: { sort_order: "asc" } } },
  });
  if (!item) return res.status(404).json({ detail: "Projek tidak ditemukan" });
  res.json({
    data: {
      ...item,
      budget: Number(item.budget),
      luas: Number(item.luas),
      images: item.images.map((i) => ({ ...i, image_url: imgUrl(i.image_path) })),
    },
  });
});

router.post("/project", async (req, res) => {
  const { nama_klien, jenis_jasa, lokasi, budget, luas, tanggal_mulai, tanggal_selesai_estimasi, progress, progress_desc, status, deskripsi, is_published } = req.body;
  if (!nama_klien || !jenis_jasa || !tanggal_mulai) {
    return res.status(400).json({ detail: "nama_klien, jenis_jasa, tanggal_mulai wajib diisi" });
  }
  const baseSlug = slugify(nama_klien + "-" + jenis_jasa + "-" + new Date().getFullYear());
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.rbProject.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }
  const item = await prisma.rbProject.create({
    data: {
      slug, nama_klien, jenis_jasa,
      lokasi: lokasi || null,
      budget: budget ? parseFloat(budget) : 0,
      luas: luas ? parseFloat(luas) : 0,
      tanggal_mulai: new Date(tanggal_mulai),
      tanggal_selesai_estimasi: tanggal_selesai_estimasi ? new Date(tanggal_selesai_estimasi) : null,
      progress: progress ? parseInt(progress) : 0,
      progress_desc: progress_desc || null,
      status: status || "Dalam Proses",
      deskripsi: deskripsi || null,
      is_published: is_published === true || is_published === "true",
    },
  });
  res.json({ data: { ...item, budget: Number(item.budget), luas: Number(item.luas) } });
});

router.patch("/project/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const { nama_klien, jenis_jasa, lokasi, budget, luas, tanggal_mulai, tanggal_selesai_estimasi, progress, progress_desc, status, deskripsi, is_published } = req.body;
  const update: Record<string, unknown> = { updated_at: new Date() };
  if (nama_klien !== undefined) update.nama_klien = nama_klien;
  if (jenis_jasa !== undefined) update.jenis_jasa = jenis_jasa;
  if (lokasi !== undefined) update.lokasi = lokasi || null;
  if (budget !== undefined) update.budget = parseFloat(budget);
  if (luas !== undefined) update.luas = parseFloat(luas);
  if (tanggal_mulai !== undefined) update.tanggal_mulai = new Date(tanggal_mulai);
  if (tanggal_selesai_estimasi !== undefined) update.tanggal_selesai_estimasi = tanggal_selesai_estimasi ? new Date(tanggal_selesai_estimasi) : null;
  if (progress !== undefined) update.progress = parseInt(progress);
  if (progress_desc !== undefined) update.progress_desc = progress_desc || null;
  if (status !== undefined) update.status = status;
  if (deskripsi !== undefined) update.deskripsi = deskripsi || null;
  if (is_published !== undefined) update.is_published = is_published === true || is_published === "true";
  const item = await prisma.rbProject.update({ where: { id }, data: update });
  res.json({ data: { ...item, budget: Number(item.budget), luas: Number(item.luas) } });
});

router.delete("/project/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const images = await prisma.rbProjectImage.findMany({ where: { project_id: id } });
  for (const img of images) {
    const fp = path.resolve(config.storagePath, img.image_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await prisma.rbProject.delete({ where: { id } });
  res.json({ success: true });
});

// Project images
router.post("/project/:id/images", projectUpload.array("images", 20), async (req, res) => {
  const project_id = BigInt(req.params.id);
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) return res.status(400).json({ detail: "Minimal 1 gambar" });
  const group = (req.body.group as string) || "cover";
  const existingInGroup = await prisma.rbProjectImage.count({ where: { project_id, group } });
  const allExisting = await prisma.rbProjectImage.count({ where: { project_id } });
  await prisma.rbProjectImage.createMany({
    data: files.map((f, i) => ({
      project_id,
      image_path: `website/project/${f.filename}`,
      group,
      sort_order: existingInGroup + i,
      is_cover: allExisting === 0 && i === 0 && group === "cover",
    })),
  });
  res.json({ success: true });
});

router.patch("/project/:id/images/:imgId/cover", async (req, res) => {
  const project_id = BigInt(req.params.id);
  const imgId = BigInt(req.params.imgId);
  await prisma.rbProjectImage.updateMany({ where: { project_id }, data: { is_cover: false } });
  await prisma.rbProjectImage.update({ where: { id: imgId }, data: { is_cover: true } });
  res.json({ success: true });
});

router.delete("/project/:id/images/:imgId", async (req, res) => {
  const imgId = BigInt(req.params.imgId);
  const img = await prisma.rbProjectImage.findUnique({ where: { id: imgId } });
  if (!img) return res.status(404).json({ detail: "Gambar tidak ditemukan" });
  const fp = path.resolve(config.storagePath, img.image_path);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  await prisma.rbProjectImage.delete({ where: { id: imgId } });
  res.json({ success: true });
});

// ── Artikel Kategori ──────────────────────────────────────────────────────────

router.get("/artikel-kategori", async (_req, res) => {
  const items = await prisma.rbArtikelKategori.findMany({ orderBy: { nama: "asc" } });
  res.json({ data: items });
});

router.post("/artikel-kategori", async (req, res) => {
  const { nama } = req.body;
  if (!nama) return res.status(400).json({ detail: "Nama kategori wajib diisi" });
  const item = await prisma.rbArtikelKategori.create({ data: { nama } });
  res.json({ data: item });
});

router.delete("/artikel-kategori/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  await prisma.rbArtikelKategori.delete({ where: { id } });
  res.json({ success: true });
});

// ── Artikel ───────────────────────────────────────────────────────────────────

router.get("/artikel", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const per_page = Math.min(50, parseInt(req.query.per_page as string) || 20);
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) where.judul = { contains: search, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.rbArtikel.findMany({
      where,
      select: {
        id: true, slug: true, judul: true, excerpt: true, cover_path: true,
        kategori: true, author: true, read_time: true,
        is_published: true, published_at: true, created_at: true, updated_at: true,
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
    prisma.rbArtikel.count({ where }),
  ]);

  res.json({
    items: items.map((a) => ({ ...a, cover_url: imgUrl(a.cover_path) })),
    total, page, per_page, total_pages: Math.ceil(total / per_page),
  });
});

router.get("/artikel/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.rbArtikel.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Artikel tidak ditemukan" });
  res.json({ data: { ...item, cover_url: imgUrl(item.cover_path) } });
});

router.post("/artikel", artikelUpload.single("cover"), async (req, res) => {
  const { judul, excerpt, konten, kategori, author, read_time, is_published } = req.body;
  if (!judul || !konten || !kategori) {
    return res.status(400).json({ detail: "judul, konten, kategori wajib diisi" });
  }
  const baseSlug = slugify(judul);
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.rbArtikel.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }
  const publish = is_published === true || is_published === "true";
  const item = await prisma.rbArtikel.create({
    data: {
      slug, judul, excerpt: excerpt || null, konten,
      cover_path: req.file ? `website/artikel/${req.file.filename}` : null,
      kategori, author: author || "Tim RubahRumah",
      read_time: read_time ? parseInt(read_time) : 5,
      is_published: publish,
      published_at: publish ? new Date() : null,
    },
  });
  res.json({ data: { ...item, cover_url: imgUrl(item.cover_path) } });
});

router.patch("/artikel/:id", artikelUpload.single("cover"), async (req, res) => {
  const id = BigInt(req.params.id);
  const existing = await prisma.rbArtikel.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ detail: "Artikel tidak ditemukan" });

  const { judul, excerpt, konten, kategori, author, read_time, is_published } = req.body;
  const update: Record<string, unknown> = { updated_at: new Date() };
  if (judul !== undefined) update.judul = judul;
  if (excerpt !== undefined) update.excerpt = excerpt || null;
  if (konten !== undefined) update.konten = konten;
  if (kategori !== undefined) update.kategori = kategori;
  if (author !== undefined) update.author = author;
  if (read_time !== undefined) update.read_time = parseInt(read_time);
  if (is_published !== undefined) {
    const publish = is_published === true || is_published === "true";
    update.is_published = publish;
    if (publish && !existing.published_at) update.published_at = new Date();
    if (!publish) update.published_at = null;
  }
  if (req.file) {
    if (existing.cover_path) {
      const old = path.resolve(config.storagePath, existing.cover_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    update.cover_path = `website/artikel/${req.file.filename}`;
  }

  const item = await prisma.rbArtikel.update({ where: { id }, data: update });
  res.json({ data: { ...item, cover_url: imgUrl(item.cover_path) } });
});

router.delete("/artikel/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.rbArtikel.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Artikel tidak ditemukan" });
  if (item.cover_path) {
    const fp = path.resolve(config.storagePath, item.cover_path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await prisma.rbArtikel.delete({ where: { id } });
  res.json({ success: true });
});

// ── Upload Inline Image ───────────────────────────────────────────────────────

router.post("/upload-image", artikelUpload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "Tidak ada file" });
  res.json({ url: `/storage/website/artikel/${req.file.filename}` });
});

// ── Testimoni ─────────────────────────────────────────────────────────────────

router.get("/testimoni", async (_req, res) => {
  const items = await prisma.rbTestimoni.findMany({ orderBy: [{ sort_order: "asc" }, { created_at: "desc" }] });
  res.json({ data: items });
});

router.post("/testimoni", async (req, res) => {
  const { youtube_url, nama_klien, jenis_jasa, is_published, sort_order } = req.body;
  if (!youtube_url || !nama_klien || !jenis_jasa) return res.status(400).json({ detail: "youtube_url, nama_klien, jenis_jasa wajib diisi" });
  const item = await prisma.rbTestimoni.create({
    data: {
      youtube_url, nama_klien, jenis_jasa,
      is_published: is_published === true || is_published === "true",
      sort_order: parseInt(sort_order) || 0,
    },
  });
  res.json({ data: item });
});

router.patch("/testimoni/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  const { youtube_url, nama_klien, jenis_jasa, is_published, sort_order } = req.body;
  const update: Record<string, unknown> = { updated_at: new Date() };
  if (youtube_url !== undefined) update.youtube_url = youtube_url;
  if (nama_klien !== undefined) update.nama_klien = nama_klien;
  if (jenis_jasa !== undefined) update.jenis_jasa = jenis_jasa;
  if (is_published !== undefined) update.is_published = is_published === true || is_published === "true";
  if (sort_order !== undefined) update.sort_order = parseInt(sort_order) || 0;
  const item = await prisma.rbTestimoni.update({ where: { id }, data: update });
  res.json({ data: item });
});

router.delete("/testimoni/:id", async (req, res) => {
  const id = BigInt(req.params.id);
  await prisma.rbTestimoni.delete({ where: { id } });
  res.json({ success: true });
});

// ── Website Leads (read-only from dashboard) ──────────────────────────────────

router.get("/leads", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const per_page = Math.min(50, parseInt(req.query.per_page as string) || 20);
  const [items, total] = await Promise.all([
    prisma.rbWebsiteLead.findMany({
      orderBy: { created_at: "desc" },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
    prisma.rbWebsiteLead.count(),
  ]);
  res.json({ items, total, page, per_page, total_pages: Math.ceil(total / per_page) });
});

export default router;
