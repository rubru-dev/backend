import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { requirePermission } from "../middleware/requireRole";
import { config } from "../config";

const router = Router();

const uploadDir = path.resolve(config.storagePath, "website", "ruangkeruang");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
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

function imageUrl(filePath: string | null | undefined) {
  return filePath ? `/storage/${filePath}` : null;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 170) || "item";
}

async function uniqueSlug(title: string, currentId?: bigint) {
  const base = slugify(title);
  let slug = base;
  let counter = 1;
  while (true) {
    const found = await prisma.ruangkeruangPortfolio.findUnique({ where: { slug } });
    if (!found || found.id === currentId) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function uniqueArticleSlug(title: string, currentId?: bigint) {
  const base = slugify(title);
  let slug = base;
  let counter = 1;
  while (true) {
    const found = await prisma.ruangkeruangArticle.findUnique({ where: { slug } });
    if (!found || found.id === currentId) return slug;
    slug = `${base}-${counter++}`;
  }
}

function publicSetting(value: unknown) {
  return value && typeof value === "object" ? value : {};
}

// Public read API for the Next.js Ruangkeruang website.
router.get("/", async (_req, res) => {
  const [settings, services, portfolio] = await Promise.all([
    prisma.ruangkeruangSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.ruangkeruangService.findMany({ where: { is_published: true }, orderBy: [{ sort_order: "asc" }, { created_at: "desc" }] }),
    prisma.ruangkeruangPortfolio.findMany({ where: { is_published: true }, orderBy: [{ sort_order: "asc" }, { created_at: "desc" }] }),
  ]);

  const config = Object.fromEntries(settings.map((item) => [item.key, publicSetting(item.value)]));
  res.json({
    data: {
      config,
      services: services.map((item) => ({ ...item, image_url: imageUrl(item.image_url) })),
      portfolio: portfolio.map((item) => ({ ...item, cover_url: imageUrl(item.cover_url), images: Array.isArray(item.images) ? item.images.map((value) => imageUrl(String(value))) : [] })),
    },
  });
});

router.get("/portfolio/:slug", async (req, res) => {
  const item = await prisma.ruangkeruangPortfolio.findFirst({
    where: { slug: req.params.slug, is_published: true },
  });
  if (!item) return res.status(404).json({ detail: "Portfolio tidak ditemukan" });
  res.json({ data: { ...item, cover_url: imageUrl(item.cover_url), images: Array.isArray(item.images) ? item.images.map((value) => imageUrl(String(value))) : [] } });
});

// Public service detail is used by future service pages.
router.get("/service/:slug", async (req, res) => {
  const item = await prisma.ruangkeruangService.findFirst({ where: { slug: req.params.slug, is_published: true } });
  if (!item) return res.status(404).json({ detail: "Layanan tidak ditemukan" });
  res.json({ data: { ...item, image_url: imageUrl(item.image_url) } });
});

router.get("/articles", async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const items = await prisma.ruangkeruangArticle.findMany({
    where: { is_published: true, ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { category: { contains: search, mode: "insensitive" } }] } : {}) },
    orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
  });
  res.json({ data: items.map((item) => ({ ...item, cover_url: imageUrl(item.cover_url) })) });
});

router.get("/articles/:slug", async (req, res) => {
  const item = await prisma.ruangkeruangArticle.findFirst({ where: { slug: req.params.slug, is_published: true } });
  if (!item) return res.status(404).json({ detail: "Artikel tidak ditemukan" });
  res.json({ data: { ...item, cover_url: imageUrl(item.cover_url) } });
});

router.post("/leads", async (req, res) => {
  const { name, whatsapp, service_type, location, budget, detail } = req.body;
  if (!name?.trim() || !whatsapp?.trim()) return res.status(400).json({ detail: "Nama dan WhatsApp wajib diisi" });
  const lead = await prisma.ruangkeruangLead.create({ data: {
    name: name.trim(), whatsapp: whatsapp.trim(), service_type: service_type || null, location: location || null, budget: budget || null,
    detail: detail && typeof detail === "object" ? detail : {},
  }});
  res.status(201).json({ data: { id: lead.id.toString(), message: "Permintaan konsultasi berhasil dikirim" } });
});

// Dashboard CRUD for services.
router.get("/services", requirePermission("ruangkeruang", "view"), async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const items = await prisma.ruangkeruangService.findMany({
    where: search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { category: { contains: search, mode: "insensitive" } }] } : undefined,
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });
  res.json({ data: items.map((item) => ({ ...item, image_url: imageUrl(item.image_url) })) });
});

router.post("/services", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const { title, category, excerpt, description, features, is_published, sort_order } = req.body;
  if (!title || !category) return res.status(400).json({ detail: "title dan category wajib diisi" });
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (await prisma.ruangkeruangService.findUnique({ where: { slug } })) slug = `${base}-${n++}`;
  const item = await prisma.ruangkeruangService.create({ data: {
    slug, title, category, excerpt: excerpt || null, description: description || null,
    features: Array.isArray(features) ? features : [], is_published: is_published === true || is_published === "true",
    sort_order: Number.parseInt(sort_order ?? "0", 10) || 0,
  }});
  res.json({ data: item });
});

router.patch("/services/:id", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const id = BigInt(req.params.id);
  const { title, category, excerpt, description, features, is_published, sort_order } = req.body;
  const item = await prisma.ruangkeruangService.update({ where: { id }, data: {
    ...(title !== undefined ? { title } : {}), ...(category !== undefined ? { category } : {}),
    ...(excerpt !== undefined ? { excerpt: excerpt || null } : {}), ...(description !== undefined ? { description: description || null } : {}),
    ...(features !== undefined ? { features: Array.isArray(features) ? features : [] } : {}),
    ...(is_published !== undefined ? { is_published: is_published === true || is_published === "true" } : {}),
    ...(sort_order !== undefined ? { sort_order: Number.parseInt(sort_order, 10) || 0 } : {}),
  }});
  res.json({ data: item });
});

router.delete("/services/:id", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.ruangkeruangService.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Layanan tidak ditemukan" });
  if (item.image_url) { const file = path.resolve(config.storagePath, item.image_url); if (fs.existsSync(file)) fs.unlinkSync(file); }
  await prisma.ruangkeruangService.delete({ where: { id } });
  res.json({ success: true });
});

router.post("/services/:id/image", requirePermission("ruangkeruang", "manage"), imageUpload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "Gambar wajib diisi" });
  const id = BigInt(req.params.id);
  const current = await prisma.ruangkeruangService.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ detail: "Layanan tidak ditemukan" });
  if (current.image_url) { const old = path.resolve(config.storagePath, current.image_url); if (fs.existsSync(old)) fs.unlinkSync(old); }
  const image_path = `website/ruangkeruang/${req.file.filename}`;
  const item = await prisma.ruangkeruangService.update({ where: { id }, data: { image_url: image_path } });
  res.json({ data: { ...item, image_url: imageUrl(item.image_url) } });
});

// Dashboard CRUD for portfolios.
router.get("/portfolios", requirePermission("ruangkeruang", "view"), async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const items = await prisma.ruangkeruangPortfolio.findMany({
    where: search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { category: { contains: search, mode: "insensitive" } }, { location: { contains: search, mode: "insensitive" } }] } : undefined,
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });
  res.json({ data: items.map((item) => ({ ...item, cover_url: imageUrl(item.cover_url), images: Array.isArray(item.images) ? item.images : [] })) });
});

router.post("/portfolios", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const { title, category, location, excerpt, description, is_published, sort_order } = req.body;
  if (!title || !category) return res.status(400).json({ detail: "title dan category wajib diisi" });
  const item = await prisma.ruangkeruangPortfolio.create({ data: {
    slug: await uniqueSlug(title), title, category, location: location || null, excerpt: excerpt || null, description: description || null,
    images: [], is_published: is_published === true || is_published === "true", sort_order: Number.parseInt(sort_order ?? "0", 10) || 0,
  }});
  res.json({ data: item });
});

router.patch("/portfolios/:id", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const id = BigInt(req.params.id);
  const { title, category, location, excerpt, description, is_published, sort_order } = req.body;
  const item = await prisma.ruangkeruangPortfolio.update({ where: { id }, data: {
    ...(title !== undefined ? { title, slug: await uniqueSlug(title, id) } : {}), ...(category !== undefined ? { category } : {}),
    ...(location !== undefined ? { location: location || null } : {}), ...(excerpt !== undefined ? { excerpt: excerpt || null } : {}),
    ...(description !== undefined ? { description: description || null } : {}),
    ...(is_published !== undefined ? { is_published: is_published === true || is_published === "true" } : {}),
    ...(sort_order !== undefined ? { sort_order: Number.parseInt(sort_order, 10) || 0 } : {}),
  }});
  res.json({ data: item });
});

router.delete("/portfolios/:id", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.ruangkeruangPortfolio.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Portfolio tidak ditemukan" });
  const images = Array.isArray(item.images) ? item.images.filter((v): v is string => typeof v === "string") : [];
  for (const image of [item.cover_url, ...images]) { if (image) { const file = path.resolve(config.storagePath, image); if (fs.existsSync(file)) fs.unlinkSync(file); } }
  await prisma.ruangkeruangPortfolio.delete({ where: { id } });
  res.json({ success: true });
});

router.post("/portfolios/:id/images", requirePermission("ruangkeruang", "manage"), imageUpload.array("images", 20), async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.ruangkeruangPortfolio.findUnique({ where: { id } });
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!item) return res.status(404).json({ detail: "Portfolio tidak ditemukan" });
  if (!files.length) return res.status(400).json({ detail: "Minimal 1 gambar" });
  const oldImages = Array.isArray(item.images) ? item.images.filter((v): v is string => typeof v === "string") : [];
  const uploaded = files.map((file) => `website/ruangkeruang/${file.filename}`);
  const cover_url = item.cover_url ?? uploaded[0];
  const updated = await prisma.ruangkeruangPortfolio.update({ where: { id }, data: { cover_url, images: [...oldImages, ...uploaded] } });
  res.json({ data: { ...updated, cover_url: imageUrl(updated.cover_url), images: uploaded.map(imageUrl) } });
});

router.delete("/portfolios/:id/images", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const id = BigInt(req.params.id);
  const image = String(req.body.image ?? "");
  const item = await prisma.ruangkeruangPortfolio.findUnique({ where: { id } });
  if (!item || !image) return res.status(404).json({ detail: "Gambar tidak ditemukan" });
  const images = Array.isArray(item.images) ? item.images.filter((v): v is string => typeof v === "string" && v !== image) : [];
  const file = path.resolve(config.storagePath, image); if (fs.existsSync(file)) fs.unlinkSync(file);
  const cover_url = item.cover_url === image ? (images[0] ?? null) : item.cover_url;
  const updated = await prisma.ruangkeruangPortfolio.update({ where: { id }, data: { cover_url, images } });
  res.json({ data: updated });
});

// Dashboard CRUD for articles.
router.get("/articles-admin", requirePermission("ruangkeruang", "view"), async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const items = await prisma.ruangkeruangArticle.findMany({
    where: search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { category: { contains: search, mode: "insensitive" } }] } : undefined,
    orderBy: [{ updated_at: "desc" }],
  });
  res.json({ data: items.map((item) => ({ ...item, cover_url: imageUrl(item.cover_url) })) });
});

router.post("/articles-admin", requirePermission("ruangkeruang", "manage"), imageUpload.single("cover"), async (req, res) => {
  const { title, excerpt, content, category, author, read_time, is_published } = req.body;
  if (!title || !content || !category) return res.status(400).json({ detail: "title, content, dan category wajib diisi" });
  const item = await prisma.ruangkeruangArticle.create({ data: {
    slug: await uniqueArticleSlug(title), title, excerpt: excerpt || null, content, category, author: author || "Tim Ruangkeruang",
    read_time: Number.parseInt(read_time ?? "5", 10) || 5, is_published: is_published === true || is_published === "true",
    published_at: is_published === true || is_published === "true" ? new Date() : null,
    cover_url: req.file ? `website/ruangkeruang/${req.file.filename}` : null,
  }});
  res.json({ data: { ...item, cover_url: imageUrl(item.cover_url) } });
});

router.patch("/articles-admin/:id", requirePermission("ruangkeruang", "manage"), imageUpload.single("cover"), async (req, res) => {
  const id = BigInt(req.params.id);
  const current = await prisma.ruangkeruangArticle.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ detail: "Artikel tidak ditemukan" });
  const { title, excerpt, content, category, author, read_time, is_published } = req.body;
  const published = is_published === true || is_published === "true";
  const update: any = {
    ...(title !== undefined ? { title, slug: await uniqueArticleSlug(title, id) } : {}), ...(excerpt !== undefined ? { excerpt: excerpt || null } : {}),
    ...(content !== undefined ? { content } : {}), ...(category !== undefined ? { category } : {}), ...(author !== undefined ? { author } : {}),
    ...(read_time !== undefined ? { read_time: Number.parseInt(read_time, 10) || 5 } : {}),
    ...(is_published !== undefined ? { is_published: published, published_at: published ? (current.published_at ?? new Date()) : null } : {}),
  };
  if (req.file) {
    if (current.cover_url) { const old = path.resolve(config.storagePath, current.cover_url); if (fs.existsSync(old)) fs.unlinkSync(old); }
    update.cover_url = `website/ruangkeruang/${req.file.filename}`;
  }
  const item = await prisma.ruangkeruangArticle.update({ where: { id }, data: update });
  res.json({ data: { ...item, cover_url: imageUrl(item.cover_url) } });
});

router.delete("/articles-admin/:id", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const id = BigInt(req.params.id);
  const item = await prisma.ruangkeruangArticle.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ detail: "Artikel tidak ditemukan" });
  if (item.cover_url) { const file = path.resolve(config.storagePath, item.cover_url); if (fs.existsSync(file)) fs.unlinkSync(file); }
  await prisma.ruangkeruangArticle.delete({ where: { id } });
  res.json({ success: true });
});

// Dashboard lead inbox. Leads are created publicly, but read/update requires access.
router.get("/leads", requirePermission("ruangkeruang", "view"), async (req, res) => {
  const status = String(req.query.status ?? "").trim();
  const items = await prisma.ruangkeruangLead.findMany({ where: status ? { status } : undefined, orderBy: { created_at: "desc" } });
  res.json({ data: items });
});

router.patch("/leads/:id", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const id = BigInt(req.params.id);
  const status = String(req.body.status ?? "").trim();
  if (!["baru", "dihubungi", "survey", "selesai", "arsip"].includes(status)) return res.status(400).json({ detail: "Status lead tidak valid" });
  const item = await prisma.ruangkeruangLead.update({ where: { id }, data: { status } });
  res.json({ data: item });
});

// Dashboard settings API. Content CRUD can be added without touching existing website routes.
router.get("/settings", requirePermission("ruangkeruang", "view"), async (_req, res) => {
  const settings = await prisma.ruangkeruangSetting.findMany({ orderBy: { key: "asc" } });
  res.json({ data: settings });
});

router.put("/settings/:key", requirePermission("ruangkeruang", "manage"), async (req, res) => {
  const key = req.params.key.trim();
  if (!key || key.length > 100) return res.status(400).json({ detail: "Key pengaturan tidak valid" });
  const setting = await prisma.ruangkeruangSetting.upsert({
    where: { key },
    update: { value: req.body.value ?? {}, updated_by: req.user?.id },
    create: { key, value: req.body.value ?? {}, updated_by: req.user?.id },
  });
  res.json({ data: setting });
});

router.post("/settings/hero-image", requirePermission("ruangkeruang", "manage"), imageUpload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "Gambar hero wajib diisi" });
  const current = await prisma.ruangkeruangSetting.findUnique({ where: { key: "site" } });
  const currentValue = publicSetting(current?.value) as Record<string, unknown>;
  const oldImage = typeof currentValue.hero_image_url === "string" ? currentValue.hero_image_url : null;
  if (oldImage) { const old = path.resolve(config.storagePath, oldImage); if (fs.existsSync(old)) fs.unlinkSync(old); }
  const hero_image_url = `website/ruangkeruang/${req.file.filename}`;
  const value = { ...currentValue, hero_image_url };
  const setting = await prisma.ruangkeruangSetting.upsert({ where: { key: "site" }, update: { value, updated_by: req.user?.id }, create: { key: "site", value, updated_by: req.user?.id } });
  res.json({ data: { ...setting, value: { ...value, hero_image_url: imageUrl(hero_image_url) } } });
});

export default router;
