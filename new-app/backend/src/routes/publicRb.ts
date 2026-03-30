import { Router } from "express";
import { prisma } from "../lib/prisma";
import { config } from "../config";

const router = Router();

function imgUrl(p: string | null | undefined): string | null {
  if (!p) return null;
  return `/storage/${p}`;
}

// GET /v1/public/rb/config
router.get("/config", async (_req, res) => {
  let cfg = await prisma.rbSiteConfig.findFirst();
  if (!cfg) {
    cfg = await prisma.rbSiteConfig.create({
      data: { id: 1, whatsapp_number: "", stats_hari: 0, stats_projek: 0, stats_mitra: 0 },
    });
  }
  res.json({ data: cfg });
});

// GET /v1/public/rb/banner
router.get("/banner", async (_req, res) => {
  const banners = await prisma.rbBanner.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });
  res.json({ data: banners.map((b) => ({ ...b, image_url: imgUrl(b.image_path), mobile_image_url: imgUrl(b.mobile_image_path) })) });
});

// GET /v1/public/rb/portfolio
router.get("/portfolio", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const per_page = Math.min(50, parseInt(req.query.per_page as string) || 12);
  const jenis_jasa = req.query.jenis_jasa as string | undefined;

  const where: Record<string, unknown> = { is_published: true };
  if (jenis_jasa) where.jenis_jasa = jenis_jasa;

  // Include SELESAI projects as portfolio items too
  const projectWhere: Record<string, unknown> = { is_published: true, status: "SELESAI" };
  if (jenis_jasa) projectWhere.jenis_jasa = jenis_jasa;

  const [portfolios, totalPortfolio, selesaiProjects] = await Promise.all([
    prisma.rbPortfolio.findMany({
      where,
      include: { images: { where: { is_cover: true }, take: 1, orderBy: { sort_order: "asc" } } },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
      skip: (page - 1) * per_page,
      take: per_page,
    }),
    prisma.rbPortfolio.count({ where }),
    prisma.rbProject.findMany({
      where: projectWhere,
      include: { images: { where: { is_cover: true }, take: 1, orderBy: { sort_order: "asc" } } },
      orderBy: { updated_at: "desc" },
    }),
  ]);

  const portfolioItems = portfolios.map((p) => ({
    ...p,
    budget: Number(p.budget),
    luas: Number(p.luas),
    cover: p.images[0] ? { ...p.images[0], image_url: imgUrl(p.images[0].image_path) } : null,
    images: undefined,
    source: "portfolio" as const,
  }));

  const projectItems = selesaiProjects.map((p) => ({
    id: p.id,
    slug: p.slug,
    nama_klien: p.nama_klien,
    jenis_jasa: p.jenis_jasa,
    deskripsi: p.deskripsi,
    budget: Number(p.budget),
    luas: Number(p.luas),
    tanggal_selesai: p.tanggal_selesai_estimasi ?? p.tanggal_mulai,
    is_published: p.is_published,
    sort_order: 999,
    created_at: p.created_at,
    updated_at: p.updated_at,
    cover: p.images[0] ? { ...p.images[0], image_url: imgUrl(p.images[0].image_path) } : null,
    images: undefined,
    source: "project" as const,
  }));

  // Merge: portfolios first, then selesai projects not already in portfolio by slug
  const portfolioSlugs = new Set(portfolioItems.map((p) => p.slug));
  const mergedExtras = projectItems.filter((p) => !portfolioSlugs.has(p.slug));
  const allItems = [...portfolioItems, ...mergedExtras];
  const total = totalPortfolio + mergedExtras.length;

  res.json({
    items: allItems,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  });
});

// GET /v1/public/rb/portfolio/:slug
router.get("/portfolio/:slug", async (req, res) => {
  // Try RbPortfolio first, then fall back to SELESAI RbProject
  const item = await prisma.rbPortfolio.findUnique({
    where: { slug: req.params.slug, is_published: true },
    include: { images: { orderBy: [{ group: "asc" }, { sort_order: "asc" }] } },
  });
  if (item) {
    const byGroup: Record<string, typeof item.images> = {};
    for (const img of item.images) {
      if (!byGroup[img.group]) byGroup[img.group] = [];
      byGroup[img.group].push(img);
    }
    return res.json({
      data: {
        ...item,
        budget: Number(item.budget),
        luas: Number(item.luas),
        images: item.images.map((i) => ({ ...i, image_url: imgUrl(i.image_path) })),
        images_by_group: Object.fromEntries(
          Object.entries(byGroup).map(([g, imgs]) => [g, imgs.map((i) => ({ ...i, image_url: imgUrl(i.image_path) }))])
        ),
      },
    });
  }
  // Fall back to SELESAI project
  const proj = await prisma.rbProject.findUnique({
    where: { slug: req.params.slug, is_published: true },
    include: { images: { orderBy: [{ group: "asc" }, { sort_order: "asc" }] } },
  });
  if (!proj || proj.status !== "SELESAI") return res.status(404).json({ detail: "Portfolio tidak ditemukan" });
  const byGroup: Record<string, typeof proj.images> = {};
  for (const img of proj.images) {
    if (!byGroup[img.group]) byGroup[img.group] = [];
    byGroup[img.group].push(img);
  }
  res.json({
    data: {
      id: proj.id, slug: proj.slug, nama_klien: proj.nama_klien,
      jenis_jasa: proj.jenis_jasa, deskripsi: proj.deskripsi,
      budget: Number(proj.budget), luas: Number(proj.luas),
      tanggal_selesai: proj.tanggal_selesai_estimasi ?? proj.tanggal_mulai,
      is_published: proj.is_published, sort_order: 0,
      created_at: proj.created_at, updated_at: proj.updated_at,
      images: proj.images.map((i) => ({ ...i, image_url: imgUrl(i.image_path) })),
      images_by_group: Object.fromEntries(
        Object.entries(byGroup).map(([g, imgs]) => [g, imgs.map((i) => ({ ...i, image_url: imgUrl(i.image_path) }))])
      ),
    },
  });
});

// GET /v1/public/rb/project
router.get("/project", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const per_page = Math.min(50, parseInt(req.query.per_page as string) || 12);

  const where = { is_published: true };

  const [items, total] = await Promise.all([
    prisma.rbProject.findMany({
      where,
      include: { images: { where: { is_cover: true }, take: 1, orderBy: { sort_order: "asc" } } },
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
      cover: p.images[0]
        ? { ...p.images[0], image_url: imgUrl(p.images[0].image_path) }
        : null,
      images: undefined,
    })),
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  });
});

// GET /v1/public/rb/project/:slug
router.get("/project/:slug", async (req, res) => {
  const item = await prisma.rbProject.findUnique({
    where: { slug: req.params.slug, is_published: true },
    include: { images: { orderBy: [{ group: "asc" }, { sort_order: "asc" }] } },
  });
  if (!item) return res.status(404).json({ detail: "Projek tidak ditemukan" });
  const byGroup: Record<string, typeof item.images> = {};
  for (const img of item.images) {
    if (!byGroup[img.group]) byGroup[img.group] = [];
    byGroup[img.group].push(img);
  }
  res.json({
    data: {
      ...item,
      budget: Number(item.budget),
      luas: Number(item.luas),
      images: item.images.map((i) => ({ ...i, image_url: imgUrl(i.image_path) })),
      images_by_group: Object.fromEntries(
        Object.entries(byGroup).map(([g, imgs]) => [g, imgs.map((i) => ({ ...i, image_url: imgUrl(i.image_path) }))])
      ),
    },
  });
});

// GET /v1/public/rb/artikel/kategori  (must be before /:slug)
router.get("/artikel/kategori", async (_req, res) => {
  const rows = await prisma.rbArtikel.groupBy({
    by: ["kategori"],
    where: { is_published: true },
    orderBy: { _count: { kategori: "desc" } },
  });
  res.json({ data: rows.map((r) => r.kategori) });
});

// GET /v1/public/rb/artikel
router.get("/artikel", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const per_page = Math.min(50, parseInt(req.query.per_page as string) || 10);
  const kategori = req.query.kategori as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = { is_published: true };
  if (kategori) where.kategori = kategori;
  if (search) {
    where.OR = [
      { judul: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.rbArtikel.findMany({
      where,
      select: {
        id: true, slug: true, judul: true, excerpt: true, cover_path: true,
        kategori: true, author: true, read_time: true,
        is_published: true, published_at: true, created_at: true, updated_at: true,
      },
      orderBy: { published_at: "desc" },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
    prisma.rbArtikel.count({ where }),
  ]);

  res.json({
    items: items.map((a) => ({ ...a, cover_url: imgUrl(a.cover_path) })),
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  });
});

// GET /v1/public/rb/artikel/:slug
router.get("/artikel/:slug", async (req, res) => {
  const item = await prisma.rbArtikel.findUnique({
    where: { slug: req.params.slug, is_published: true },
  });
  if (!item) return res.status(404).json({ detail: "Artikel tidak ditemukan" });
  res.json({ data: { ...item, cover_url: imgUrl(item.cover_path) } });
});

const DEFAULT_SPESIFIKASI_PUBLIC: Record<string, string[]> = {
  MINIMALIS: [
    "Pondasi batu kali + besi cakar ayam",
    "Sloof & ring balk beton bertulang",
    "Kolom & balok struktur standar SNI",
    "Instalasi listrik & titik lampu",
    "Cat dinding interior & eksterior",
    "Instalasi air bersih & pembuangan",
    "Closet duduk & wastafel keramik",
    "Pintu panel & jendela kaca",
    "Rangka atap & penutup atap",
    "Garansi konstruksi 10 tahun",
  ],
  LUXURY: [
    "Pondasi bore pile & besi ulir",
    "Sloof & ring balk beton prategang",
    "Kolom & balok struktur premium",
    "Instalasi listrik 3 phase + smart home",
    "Cat premium & wallpaper pilihan",
    "Instalasi air panas & dingin",
    "Sanitary premium (TOTO/American Standard)",
    "Pintu kayu solid & jendela tempered",
    "Rangka baja ringan + atap premium",
    "Garansi konstruksi 15 tahun",
  ],
};

// GET /v1/public/rb/kalkulator
router.get("/kalkulator", async (_req, res) => {
  let cfg = await prisma.rbKalkulatorConfig.findFirst();
  if (!cfg) {
    cfg = await prisma.rbKalkulatorConfig.create({
      data: {
        id: 1,
        base_prices: [
          { key: "MINIMALIS", label: "Minimalis", harga: 3000000, satuan: "per m²" },
          { key: "LUXURY",    label: "Luxury",    harga: 5000000, satuan: "per m²" },
        ],
        surcharges: [
          { key: "KAMAR_TIDUR",     label: "Kamar Tidur",      harga: 50000,  satuan: "per kamar", kategori: "kamar" },
          { key: "KAMAR_MANDI",     label: "Kamar Mandi",      harga: 80000,  satuan: "per kamar", kategori: "kamar" },
          { key: "HEBEL",           label: "Hebel",             harga: 100000, satuan: "per m²",   kategori: "dinding" },
          { key: "KERAMIK_60",      label: "Keramik 60x60",     harga: 80000,  satuan: "per m²",   kategori: "lantai" },
          { key: "GRANIT",          label: "Granit",            harga: 200000, satuan: "per m²",   kategori: "lantai" },
          { key: "GENTENG_KERAMIK", label: "Genteng Keramik",   harga: 50000,  satuan: "per m²",   kategori: "atap" },
          { key: "BAJA_RINGAN",     label: "Baja Ringan",       harga: 80000,  satuan: "per m²",   kategori: "atap" },
          { key: "PVC",             label: "Plafon PVC",        harga: -50000, satuan: "per m²",   kategori: "plafon" },
          { key: "KAYU_KAMPER",     label: "Kusen Kayu Kamper", harga: 120000, satuan: "per m²",   kategori: "kusen" },
          { key: "UPVC",            label: "Kusen UPVC",        harga: 150000, satuan: "per m²",   kategori: "kusen" },
          { key: "KITCHEN_SET",     label: "Kitchen Set",       harga: 500000, satuan: "per m²",   kategori: "dapur" },
          { key: "CARPORT",         label: "Carport",           harga: 300000, satuan: "per m²",   kategori: "carport" },
          { key: "GARASI",          label: "Garasi",            harga: 600000, satuan: "per m²",   kategori: "carport" },
          { key: "TAMAN_DEPAN",     label: "Taman Depan",       harga: 200000, satuan: "per m²",   kategori: "taman" },
        ],
        spesifikasi: DEFAULT_SPESIFIKASI_PUBLIC,
      },
    });
  }
  if (!cfg.spesifikasi) {
    cfg = await prisma.rbKalkulatorConfig.update({
      where: { id: 1 },
      data: { spesifikasi: DEFAULT_SPESIFIKASI_PUBLIC },
    });
  }
  res.json({ data: cfg });
});

// GET /v1/public/rb/testimoni
router.get("/testimoni", async (_req, res) => {
  const items = await prisma.rbTestimoni.findMany({
    where: { is_published: true },
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });
  res.json({ data: items });
});

// GET /v1/public/rb/layanan/:jenis (legacy compat)
router.get("/layanan/:jenis", async (req, res) => {
  res.json({ data: null, message: "Gunakan /kalkulator untuk data harga" });
});

// POST /v1/public/rb/leads
router.post("/leads", async (req, res) => {
  const { jenis_jasa, nama, whatsapp, alamat, instagram, detail } = req.body;
  if (!jenis_jasa || !nama || !whatsapp) {
    return res.status(400).json({ detail: "jenis_jasa, nama, dan whatsapp wajib diisi" });
  }
  const lead = await prisma.rbWebsiteLead.create({
    data: { jenis_jasa, nama, whatsapp, alamat, instagram, detail: detail ?? undefined },
  });
  res.json({ success: true, data: lead });
});

export default router;
