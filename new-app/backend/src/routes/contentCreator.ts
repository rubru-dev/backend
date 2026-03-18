import express, { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole, requirePermission } from "../middleware/requireRole";
import { syncInstagram, syncTikTok, syncYouTube, syncInstagramAccountLevel } from "../lib/socialSync";
import { getPagination, paginateResponse } from "../middleware/pagination";
import { sendFonntToRoles, FRONTEND_URL } from "../lib/fontee";

const router = Router();

function serialize(c: { id: bigint; judul: string | null; deskripsi: string | null; platform: string | null; tanggal_publish: Date | null; tanggal_upload: Date | null; status: string | null; bulan: number | null; tahun: number | null; planning_status: string | null; produksi_status: string | null; upload_status: string | null; catatan_revisi: string | null; hd_bd_signature?: string | null; hd_bd_signed_at?: Date | null; task_image?: string | null; created_at: Date | null; user?: { id: bigint; name: string } | null }) {
  return {
    id: c.id,
    judul: c.judul,
    deskripsi: c.deskripsi,
    platform: c.platform,
    tanggal_publish: c.tanggal_publish ? c.tanggal_publish.toISOString().split("T")[0] : null,
    tanggal_upload: c.tanggal_upload ? c.tanggal_upload.toISOString().split("T")[0] : null,
    status: c.status,
    bulan: c.bulan,
    tahun: c.tahun,
    planning_status: c.planning_status,
    produksi_status: c.produksi_status,
    upload_status: c.upload_status,
    catatan_revisi: c.catatan_revisi,
    hd_bd_signature: c.hd_bd_signature ?? null,
    hd_bd_signed_at: c.hd_bd_signed_at?.toISOString() ?? null,
    task_image: c.task_image ?? null,
    user: c.user ? { id: c.user.id, name: c.user.name } : null,
    created_at: c.created_at?.toISOString() ?? null,
  };
}

// GET /timeline
router.get("/timeline", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query, 50, 200);
  const bulan = req.query.bulan ? parseInt(req.query.bulan as string) : undefined;
  const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (bulan) where.bulan = bulan;
  if (tahun) where.tahun = tahun;
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    prisma.contentTimeline.count({ where }),
    prisma.contentTimeline.findMany({
      where,
      include: { user: true },
      orderBy: { tanggal_publish: "asc" },
      skip,
      take: limit,
    }),
  ]);

  return res.json(paginateResponse(items.map(serialize), total, page, limit));
});

// GET /calendar
router.get("/calendar", async (req: Request, res: Response) => {
  const bulan = parseInt(req.query.bulan as string);
  const tahun = parseInt(req.query.tahun as string);
  if (!bulan || !tahun) {
    return res.status(400).json({ detail: "bulan dan tahun diperlukan" });
  }
  const items = await prisma.contentTimeline.findMany({
    where: { bulan, tahun },
    include: { user: true },
    orderBy: { tanggal_publish: "asc" },
  });
  return res.json(items.map(serialize));
});

// GET /upload-calendar — items by tanggal_upload (independent of planning bulan/tahun)
router.get("/upload-calendar", async (req: Request, res: Response) => {
  const bulan = parseInt(req.query.bulan as string);
  const tahun = parseInt(req.query.tahun as string);
  if (!bulan || !tahun) {
    return res.status(400).json({ detail: "bulan dan tahun diperlukan" });
  }
  const start = new Date(tahun, bulan - 1, 1);
  const end   = new Date(tahun, bulan, 0, 23, 59, 59, 999);

  const items = await prisma.contentTimeline.findMany({
    where: {
      upload_status: { not: null },
      tanggal_upload: { gte: start, lte: end },
    },
    include: { user: true },
    orderBy: { tanggal_upload: "asc" },
  });
  return res.json(items.map(serialize));
});

// GET /upload-pending — items with upload_status set but no tanggal_upload yet
router.get("/upload-pending", async (_req: Request, res: Response) => {
  const items = await prisma.contentTimeline.findMany({
    where: { upload_status: { not: null }, tanggal_upload: null },
    include: { user: true },
    orderBy: { created_at: "asc" },
  });
  return res.json(items.map(serialize));
});

// POST /timeline
router.post("/timeline", async (req: Request, res: Response) => {
  const { judul, deskripsi, platform, tanggal_publish, bulan, tahun } = req.body;
  const c = await prisma.contentTimeline.create({
    data: {
      judul,
      deskripsi: deskripsi ?? null,
      platform: platform ?? null,
      tanggal_publish: tanggal_publish ? new Date(tanggal_publish) : null,
      bulan: bulan ?? null,
      tahun: tahun ?? null,
      user_id: req.user!.id,
      status: "Draft",
      planning_status: "pending",
      produksi_status: null,
      upload_status: null,
    },
  });

  // Notify BD roles via WhatsApp
  const creatorName = req.user!.name;
  const msg = `📋 *Konten Baru Perlu Approval*\n\nContent creator *${creatorName}* menambahkan konten baru:\n*${judul ?? "-"}*\nPlatform: ${platform ?? "-"}\n\nSilakan review dan approve di Timeline Konten.\n\n🔗 ${FRONTEND_URL}/content/timelines`;
  sendFonntToRoles(["BD", "Super Admin"], msg).catch(() => {});

  return res.status(201).json({ id: c.id, judul: c.judul, planning_status: c.planning_status });
});

// PATCH /timeline/:id
router.patch("/timeline/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { judul, deskripsi, platform, tanggal_publish, tanggal_upload, bulan, tahun } = req.body;
  const c = await prisma.contentTimeline.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  const updates: Record<string, unknown> = {};
  if (judul !== undefined) updates.judul = judul;
  if (deskripsi !== undefined) updates.deskripsi = deskripsi;
  if (platform !== undefined) updates.platform = platform;
  if (tanggal_publish !== undefined) updates.tanggal_publish = tanggal_publish ? new Date(tanggal_publish) : null;
  if (tanggal_upload !== undefined) updates.tanggal_upload = tanggal_upload ? new Date(tanggal_upload) : null;
  if (bulan !== undefined) updates.bulan = bulan;
  if (tahun !== undefined) updates.tahun = tahun;

  await prisma.contentTimeline.update({ where: { id }, data: updates });
  return res.json({ message: "Timeline diupdate" });
});

// DELETE /timeline/:id
router.delete("/timeline/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const c = await prisma.contentTimeline.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Timeline tidak ditemukan" });
  await prisma.contentTimeline.delete({ where: { id } });
  return res.json({ message: "Timeline dihapus" });
});

// POST /timeline/:id/approve (Super Admin only)
router.post("/timeline/:id/approve", requirePermission("content", "approve"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { stage } = req.body;
  const c = await prisma.contentTimeline.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  const updates: Record<string, unknown> = { catatan_revisi: null };
  if (stage === "planning") {
    updates.planning_status = "approved";
    updates.produksi_status = "pending";
  } else if (stage === "produksi") {
    if (c.planning_status !== "approved") {
      return res.status(400).json({ detail: "Planning belum diapprove" });
    }
    updates.produksi_status = "approved";
    updates.upload_status = "pending";
  } else if (stage === "upload") {
    if (c.produksi_status !== "approved") {
      return res.status(400).json({ detail: "Produksi belum diapprove" });
    }
    updates.upload_status = "approved";
  } else {
    return res.status(400).json({ detail: `Stage tidak valid: ${stage}` });
  }

  await prisma.contentTimeline.update({ where: { id }, data: updates });
  return res.json({ message: `Stage '${stage}' diapprove`, id });
});

// POST /timeline/:id/revisi (Super Admin only)
router.post("/timeline/:id/revisi", requirePermission("content", "approve"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { stage, catatan } = req.body;
  const c = await prisma.contentTimeline.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Timeline tidak ditemukan" });

  const updates: Record<string, unknown> = {};
  if (stage === "planning") updates.planning_status = "revised";
  else if (stage === "produksi") updates.produksi_status = "revised";
  else if (stage === "upload") updates.upload_status = "revised";
  else return res.status(400).json({ detail: `Stage tidak valid: ${stage}` });

  if (catatan) updates.catatan_revisi = catatan;

  await prisma.contentTimeline.update({ where: { id }, data: updates });
  return res.json({ message: `Stage '${stage}' ditandai revisi`, id });
});

// POST /timeline/:id/sign-hd — Head BD signature after upload approved
router.post("/timeline/:id/sign-hd", requirePermission("content", "approve"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { hd_bd_signature } = req.body;
  if (!hd_bd_signature) return res.status(400).json({ detail: "Tanda tangan wajib diisi" });
  const c = await prisma.contentTimeline.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Timeline tidak ditemukan" });
  if (c.upload_status !== "approved") return res.status(400).json({ detail: "Upload harus disetujui dulu sebelum TTD" });
  await prisma.contentTimeline.update({ where: { id }, data: { hd_bd_signature, hd_bd_signed_at: new Date() } });
  return res.json({ ok: true });
});

// PATCH /timeline/:id/image — upload task image (base64, needs larger body limit)
router.patch("/timeline/:id/image", express.json({ limit: "50mb" }), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { task_image } = req.body;
  if (!task_image) return res.status(400).json({ detail: "Gambar wajib diisi" });
  const c = await prisma.contentTimeline.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Timeline tidak ditemukan" });
  await prisma.contentTimeline.update({ where: { id }, data: { task_image } });
  return res.json({ ok: true });
});

// POST /timeline/:id/resubmit — resubmit after revision
router.post("/timeline/:id/resubmit", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const c = await prisma.contentTimeline.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Timeline tidak ditemukan" });
  const updates: Record<string, unknown> = { catatan_revisi: null };
  if (c.planning_status === "revised") updates.planning_status = "pending";
  else if (c.produksi_status === "revised") updates.produksi_status = "pending";
  else if (c.upload_status === "revised") updates.upload_status = "pending";
  else return res.status(400).json({ detail: "Tidak ada revisi yang perlu disubmit ulang" });
  await prisma.contentTimeline.update({ where: { id }, data: updates });
  return res.json({ ok: true });
});

// ── GET /dashboard ────────────────────────────────────────────────────────
router.get("/dashboard", async (_req: Request, res: Response) => {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [total, planning_pending, planning_approved, upload_approved] = await Promise.all([
    prisma.contentTimeline.count({ where: { bulan, tahun } }),
    prisma.contentTimeline.count({ where: { bulan, tahun, planning_status: "pending" } }),
    prisma.contentTimeline.count({ where: { bulan, tahun, planning_status: "approved" } }),
    prisma.contentTimeline.count({ where: { bulan, tahun, upload_status: "approved" } }),
  ]);

  const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Twitter", "LinkedIn"];
  const perPlatform = await Promise.all(
    PLATFORMS.map(async (p) => ({
      platform: p,
      jumlah: await prisma.contentTimeline.count({ where: { platform: p } }),
    })),
  );

  return res.json({
    total_konten: total,
    planning_pending,
    planning_approved,
    upload_selesai: upload_approved,
    sudah_posting: upload_approved,
    draft: await prisma.contentTimeline.count({ where: { bulan, tahun, planning_status: "pending" } }),
    siap_posting: await prisma.contentTimeline.count({ where: { bulan, tahun, produksi_status: "approved" } }),
    per_platform: perPlatform.filter((p) => p.jumlah > 0),
    bulan_ini: (await prisma.contentTimeline.findMany({
      where: { bulan, tahun },
      select: { id: true, judul: true, platform: true, upload_status: true },
      orderBy: { created_at: "desc" },
      take: 10,
    })).map((k) => ({
      id: k.id,
      judul: k.judul,
      platform: k.platform,
      status: k.upload_status === "approved" ? "Sudah Posting"
            : k.upload_status === "pending" ? "Siap Posting"
            : "Draft",
    })),
  });
});

// ── Social Media Accounts ──────────────────────────────────────────────────

function serializeAccount(a: any) {
  return {
    id: a.id,
    platform: a.platform,
    account_name: a.account_name,
    username: a.username,
    profile_url: a.profile_url,
    is_active: a.is_active,
    last_synced_at: a.last_synced_at?.toISOString() ?? null,
    // Return credential presence flags (NOT the actual tokens)
    has_instagram_token: !!a.instagram_access_token,
    instagram_user_id: a.instagram_user_id,
    instagram_page_id: a.instagram_page_id,
    has_tiktok_token: !!a.tiktok_access_token,
    tiktok_open_id: a.tiktok_open_id,
    youtube_channel_id: a.youtube_channel_id,
    has_youtube_token: !!a.youtube_access_token,
    created_at: a.created_at?.toISOString() ?? null,
  };
}

// GET /social-accounts
router.get("/social-accounts", async (_req: Request, res: Response) => {
  const accounts = await prisma.socialMediaAccount.findMany({
    orderBy: [{ platform: "asc" }, { account_name: "asc" }],
  });
  return res.json(accounts.map(serializeAccount));
});

// POST /social-accounts
router.post("/social-accounts", async (req: Request, res: Response) => {
  const { platform, account_name, username, profile_url,
    instagram_user_id, instagram_access_token, instagram_page_id,
    tiktok_open_id, tiktok_access_token, tiktok_refresh_token,
    youtube_channel_id, youtube_access_token, youtube_refresh_token,
    is_active } = req.body;

  const acc = await prisma.socialMediaAccount.create({
    data: {
      platform,
      account_name: account_name ?? null,
      username: username ?? null,
      profile_url: profile_url ?? null,
      instagram_user_id: instagram_user_id ?? null,
      instagram_access_token: instagram_access_token ?? null,
      instagram_page_id: instagram_page_id ?? null,
      tiktok_open_id: tiktok_open_id ?? null,
      tiktok_access_token: tiktok_access_token ?? null,
      tiktok_refresh_token: tiktok_refresh_token ?? null,
      youtube_channel_id: youtube_channel_id ?? null,
      youtube_access_token: youtube_access_token ?? null,
      youtube_refresh_token: youtube_refresh_token ?? null,
      is_active: is_active ?? true,
    },
  });
  return res.status(201).json(serializeAccount(acc));
});

// PATCH /social-accounts/:id
router.patch("/social-accounts/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const fields = [
    "platform","account_name","username","profile_url","is_active",
    "instagram_user_id","instagram_access_token","instagram_page_id",
    "tiktok_open_id","tiktok_access_token","tiktok_refresh_token",
    "youtube_channel_id","youtube_access_token","youtube_refresh_token",
  ];
  const updates: Record<string, unknown> = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  const acc = await prisma.socialMediaAccount.update({ where: { id }, data: updates });
  return res.json(serializeAccount(acc));
});

// DELETE /social-accounts/:id
router.delete("/social-accounts/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.socialMediaAccount.delete({ where: { id } });
  return res.json({ message: "Akun dihapus" });
});

// POST /social-accounts/:id/sync — trigger API data fetch
router.post("/social-accounts/:id/sync", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const acc = await prisma.socialMediaAccount.findUnique({ where: { id } });
  if (!acc) return res.status(404).json({ detail: "Akun tidak ditemukan" });

  let rawPosts: Awaited<ReturnType<typeof syncInstagram>> = [];

  try {
    if (acc.platform === "INSTAGRAM" && acc.instagram_user_id && acc.instagram_access_token) {
      rawPosts = await syncInstagram(acc.instagram_user_id, acc.instagram_access_token);
    } else if (acc.platform === "TIKTOK" && acc.tiktok_open_id && acc.tiktok_access_token) {
      rawPosts = await syncTikTok(acc.tiktok_open_id, acc.tiktok_access_token);
    } else if (acc.platform === "YOUTUBE" && acc.youtube_channel_id && acc.youtube_access_token) {
      rawPosts = await syncYouTube(acc.youtube_channel_id, acc.youtube_access_token);
    } else {
      return res.status(400).json({ detail: "Kredensial tidak lengkap untuk platform ini" });
    }
  } catch (err: any) {
    const axiosDetail = err?.response?.data ? JSON.stringify(err.response.data) : "";
    console.error("[sync error]", err.message, axiosDetail);
    return res.status(502).json({ detail: `Error dari API platform: ${err.message ?? String(err)}`, meta_error: err?.response?.data });
  }

  // Upsert per post_id_platform to avoid duplicates
  let synced = 0;
  try {
    for (const post of rawPosts) {
      const postData: any = {
        judul_konten: post.judul_konten,
        link_konten: post.link_konten,
        tanggal: new Date(post.tanggal),
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        saves: post.saves,
        reach: post.reach,
        data_source: "api",
      };
      if (post.media_type !== undefined) postData.media_type = post.media_type;
      if (post.reposts !== undefined) postData.reposts = post.reposts;
      if (post.watch_time_minutes !== undefined && post.watch_time_minutes !== null) postData.watch_time_minutes = post.watch_time_minutes;
      if (post.engagement_rate !== undefined && post.engagement_rate !== null) postData.engagement_rate = post.engagement_rate;

      const existing = await prisma.socialMediaPostMetric.findFirst({
        where: { account_id: id, post_id_platform: post.post_id_platform },
      });
      if (existing) {
        await prisma.socialMediaPostMetric.update({ where: { id: existing.id }, data: postData });
      } else {
        await prisma.socialMediaPostMetric.create({
          data: { account_id: id, post_id_platform: post.post_id_platform, ...postData },
        });
        synced++;
      }
    }
  } catch (err: any) {
    console.error("[sync upsert error]", err?.message ?? err);
    return res.status(500).json({ detail: `Error saat menyimpan data post: ${err?.message ?? String(err)}` });
  }

  // Fetch account-level metrics for Instagram
  let accountLevelData: Record<string, unknown> = {};
  if (acc.platform === "INSTAGRAM" && acc.instagram_user_id && acc.instagram_access_token) {
    try {
      const acct = await syncInstagramAccountLevel(acc.instagram_user_id, acc.instagram_access_token);
      accountLevelData = {
        ig_profile_visits: acct.profile_visits,
        ig_website_clicks: acct.website_clicks,
        ig_followers_count: acct.followers_count,
        ig_follower_reach: acct.follower_reach,
        ig_non_follower_reach: acct.non_follower_reach,
      };
    } catch { /* skip */ }
  }

  // Update last_synced_at + account-level metrics
  try {
    await prisma.socialMediaAccount.update({
      where: { id },
      data: { last_synced_at: new Date(), ...accountLevelData },
    });
  } catch (err: any) {
    console.error("[sync account update error]", err?.message ?? err);
  }

  return res.json({ synced, total: rawPosts.length, ...accountLevelData });
});

// ── Social Media Post Metrics ──────────────────────────────────────────────

function serializePostMetric(m: any) {
  return {
    id: m.id,
    account_id: m.account_id,
    platform: m.account?.platform ?? null,
    account_name: m.account?.account_name ?? null,
    judul_konten: m.judul_konten,
    link_konten: m.link_konten,
    post_id_platform: m.post_id_platform,
    tanggal: m.tanggal ? m.tanggal.toISOString().split("T")[0] : null,
    media_type: (m as any).media_type ?? null,
    views: Number(m.views),
    likes: m.likes,
    comments: m.comments,
    shares: m.shares,
    saves: m.saves,
    reposts: (m as any).reposts ?? 0,
    reach: Number(m.reach),
    watch_time_minutes: m.watch_time_minutes ? parseFloat(String(m.watch_time_minutes)) : null,
    engagement_rate: m.engagement_rate ? parseFloat(String(m.engagement_rate)) : null,
    data_source: m.data_source,
    created_at: m.created_at?.toISOString() ?? null,
  };
}

// GET /social-post-metrics — list with filters
router.get("/social-post-metrics", async (req: Request, res: Response) => {
  const { account_id, platform, date_from, date_to, judul, page = "1", per_page = "50" } = req.query;
  const where: Record<string, unknown> = {};
  if (account_id) where.account_id = BigInt(account_id as string);
  if (platform) where.account = { platform: platform as string };
  if (date_from || date_to) {
    const dateFilter: Record<string, Date> = {};
    if (date_from) dateFilter.gte = new Date(date_from as string);
    if (date_to) dateFilter.lte = new Date(date_to as string);
    where.tanggal = dateFilter;
  }
  if (judul) where.judul_konten = { contains: judul as string, mode: "insensitive" };

  const skip = (parseInt(page as string) - 1) * parseInt(per_page as string);
  const take = Math.min(parseInt(per_page as string), 200);

  const [total, items] = await Promise.all([
    prisma.socialMediaPostMetric.count({ where }),
    prisma.socialMediaPostMetric.findMany({
      where,
      include: { account: { select: { platform: true, account_name: true } } },
      orderBy: { tanggal: "desc" },
      skip,
      take,
    }),
  ]);

  return res.json({ items: items.map(serializePostMetric), total, page: parseInt(page as string), per_page: take });
});

// GET /social-post-metrics/summary — aggregated totals for dashboard
router.get("/social-post-metrics/summary", async (req: Request, res: Response) => {
  const { platform, date_from, date_to, account_id } = req.query;
  const where: Record<string, unknown> = {};
  if (account_id) where.account_id = BigInt(account_id as string);
  if (platform) where.account = { platform: platform as string };
  if (date_from || date_to) {
    const dateFilter: Record<string, Date> = {};
    if (date_from) dateFilter.gte = new Date(date_from as string);
    if (date_to) dateFilter.lte = new Date(date_to as string);
    where.tanggal = dateFilter;
  }

  const metrics = await prisma.socialMediaPostMetric.findMany({
    where,
    include: { account: { select: { platform: true, account_name: true } } },
    orderBy: { tanggal: "asc" },
  });

  const totals = metrics.reduce(
    (acc, m) => ({
      views: acc.views + Number(m.views),
      likes: acc.likes + m.likes,
      comments: acc.comments + m.comments,
      shares: acc.shares + m.shares,
      saves: acc.saves + m.saves,
      reposts: acc.reposts + (m.reposts ?? 0),
      reach: acc.reach + Number(m.reach),
      watch_time_minutes: acc.watch_time_minutes + (m.watch_time_minutes ? parseFloat(String(m.watch_time_minutes)) : 0),
      count: acc.count + 1,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reposts: 0, reach: 0, watch_time_minutes: 0, count: 0 },
  );

  const avgEngagement =
    metrics.filter((m) => m.engagement_rate != null).length > 0
      ? metrics.reduce((sum, m) => sum + (m.engagement_rate ? parseFloat(String(m.engagement_rate)) : 0), 0) /
        metrics.filter((m) => m.engagement_rate != null).length
      : 0;

  // Time series: daily aggregated
  const byDate: Record<string, Record<string, number>> = {};
  for (const m of metrics) {
    const dk = m.tanggal.toISOString().split("T")[0];
    if (!byDate[dk]) byDate[dk] = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 };
    byDate[dk].views += Number(m.views);
    byDate[dk].likes += m.likes;
    byDate[dk].comments += m.comments;
    byDate[dk].shares += m.shares;
    byDate[dk].saves += m.saves;
    byDate[dk].reach += Number(m.reach);
  }
  const timeSeries = Object.entries(byDate).map(([date, vals]) => ({ date, ...vals }));

  // Per platform breakdown
  const byPlatform: Record<string, { views: number; likes: number; comments: number; count: number }> = {};
  for (const m of metrics) {
    const plt = m.account?.platform ?? "unknown";
    if (!byPlatform[plt]) byPlatform[plt] = { views: 0, likes: 0, comments: 0, count: 0 };
    byPlatform[plt].views += Number(m.views);
    byPlatform[plt].likes += m.likes;
    byPlatform[plt].comments += m.comments;
    byPlatform[plt].count++;
  }

  // Account-level metrics (profile_visits, website_clicks) from SocialMediaAccount
  const accountsInFilter = await prisma.socialMediaAccount.findMany({
    where: account_id ? { id: BigInt(account_id as string) } : platform ? { platform: platform as string } : {},
    select: {
      ig_profile_visits: true, ig_website_clicks: true,
      ig_followers_count: true, ig_follower_reach: true, ig_non_follower_reach: true,
    },
  });
  const ig_profile_visits = accountsInFilter.reduce((s, a) => s + (a.ig_profile_visits ?? 0), 0);
  const ig_website_clicks = accountsInFilter.reduce((s, a) => s + (a.ig_website_clicks ?? 0), 0);
  const ig_followers_count = accountsInFilter.reduce((s, a) => s + ((a as any).ig_followers_count ?? 0), 0);
  const ig_follower_reach = accountsInFilter.reduce((s, a) => s + ((a as any).ig_follower_reach ?? 0), 0);
  const ig_non_follower_reach = accountsInFilter.reduce((s, a) => s + ((a as any).ig_non_follower_reach ?? 0), 0);

  return res.json({
    totals: {
      ...totals,
      engagement_rate: parseFloat(avgEngagement.toFixed(4)),
      ig_profile_visits, ig_website_clicks,
      ig_followers_count, ig_follower_reach, ig_non_follower_reach,
    },
    time_series: timeSeries,
    by_platform: Object.entries(byPlatform).map(([platform, vals]) => ({ platform, ...vals })),
    posts_count: metrics.length,
  });
});

// POST /social-post-metrics — manual create
router.post("/social-post-metrics", async (req: Request, res: Response) => {
  const {
    account_id, judul_konten, link_konten, tanggal,
    views, likes, comments, shares, saves, reach, watch_time_minutes, engagement_rate,
  } = req.body;

  const m = await prisma.socialMediaPostMetric.create({
    data: {
      account_id: BigInt(account_id),
      judul_konten: judul_konten ?? null,
      link_konten: link_konten ?? null,
      tanggal: new Date(tanggal),
      views: views ?? 0,
      likes: likes ?? 0,
      comments: comments ?? 0,
      shares: shares ?? 0,
      saves: saves ?? 0,
      reach: reach ?? 0,
      watch_time_minutes: watch_time_minutes ?? undefined,
      engagement_rate: engagement_rate ?? undefined,
      data_source: "manual",
    },
    include: { account: { select: { platform: true, account_name: true } } },
  });
  return res.status(201).json(serializePostMetric(m));
});

// PATCH /social-post-metrics/:id
router.patch("/social-post-metrics/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const fields = ["judul_konten","link_konten","tanggal","views","likes","comments","shares","saves","reach","watch_time_minutes","engagement_rate"];
  const updates: Record<string, unknown> = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates[f] = f === "tanggal" ? new Date(req.body[f]) : req.body[f];
    }
  }
  await prisma.socialMediaPostMetric.update({ where: { id }, data: updates });
  return res.json({ message: "Metrik diupdate" });
});

// DELETE /social-post-metrics/:id
router.delete("/social-post-metrics/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.socialMediaPostMetric.delete({ where: { id } });
  return res.json({ message: "Metrik dihapus" });
});

// ── Social Media Targets ───────────────────────────────────────────────────────

function serializeTarget(t: any) {
  return {
    id: t.id,
    platform: t.platform,
    bulan: t.bulan,
    tahun: t.tahun,
    target_views: Number(t.target_views),
    target_likes: t.target_likes,
    target_comments: t.target_comments,
    target_shares: t.target_shares,
    target_saves: t.target_saves,
    target_reach: Number(t.target_reach),
    target_watch_time_minutes: t.target_watch_time_minutes ? parseFloat(String(t.target_watch_time_minutes)) : null,
    target_engagement_rate: t.target_engagement_rate ? parseFloat(String(t.target_engagement_rate)) : null,
    created_at: t.created_at?.toISOString() ?? null,
  };
}

// GET /social-targets — list targets
router.get("/social-targets", requirePermission("content", "target"), async (req: Request, res: Response) => {
  const { bulan, tahun, platform } = req.query;
  const where: Record<string, unknown> = {};
  if (bulan) where.bulan = parseInt(bulan as string);
  if (tahun) where.tahun = parseInt(tahun as string);
  if (platform) where.platform = platform as string;
  const targets = await prisma.socialMediaTarget.findMany({ where, orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { platform: "asc" }] });
  return res.json(targets.map(serializeTarget));
});

// POST /social-targets — upsert target (platform+bulan+tahun unique)
router.post("/social-targets", requirePermission("content", "target"), async (req: Request, res: Response) => {
  const {
    platform, bulan, tahun,
    target_views, target_likes, target_comments, target_shares,
    target_saves, target_reach, target_watch_time_minutes, target_engagement_rate,
  } = req.body;

  if (!platform || !bulan || !tahun) {
    return res.status(400).json({ detail: "platform, bulan, dan tahun diperlukan" });
  }

  const data = {
    target_views: target_views ?? 0,
    target_likes: target_likes ?? 0,
    target_comments: target_comments ?? 0,
    target_shares: target_shares ?? 0,
    target_saves: target_saves ?? 0,
    target_reach: target_reach ?? 0,
    target_watch_time_minutes: target_watch_time_minutes ?? undefined,
    target_engagement_rate: target_engagement_rate ?? undefined,
  };

  const t = await prisma.socialMediaTarget.upsert({
    where: { platform_bulan_tahun: { platform, bulan: parseInt(bulan), tahun: parseInt(tahun) } },
    create: { platform, bulan: parseInt(bulan), tahun: parseInt(tahun), ...data },
    update: data,
  });
  return res.json(serializeTarget(t));
});

// DELETE /social-targets/:id
router.delete("/social-targets/:id", requirePermission("content", "target"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.socialMediaTarget.delete({ where: { id } });
  return res.json({ message: "Target dihapus" });
});

// GET /social-targets/comparison — target vs aktual per platform untuk bulan/tahun tertentu
router.get("/social-targets/comparison", requirePermission("content", "target"), async (req: Request, res: Response) => {
  const bulan = parseInt(req.query.bulan as string);
  const tahun = parseInt(req.query.tahun as string);
  const platform = req.query.platform as string | undefined;

  if (!bulan || !tahun) {
    return res.status(400).json({ detail: "bulan dan tahun diperlukan" });
  }

  // Date range for the month
  const dateFrom = new Date(tahun, bulan - 1, 1);
  const dateTo = new Date(tahun, bulan, 0, 23, 59, 59, 999);

  const targetWhere: Record<string, unknown> = { bulan, tahun };
  if (platform) targetWhere.platform = platform;

  // Fetch targets & actual metrics in parallel
  const [targets, metrics] = await Promise.all([
    prisma.socialMediaTarget.findMany({ where: targetWhere }),
    prisma.socialMediaPostMetric.findMany({
      where: {
        tanggal: { gte: dateFrom, lte: dateTo },
        ...(platform ? { account: { platform } } : {}),
      },
      include: { account: { select: { platform: true } } },
    }),
  ]);

  // Aggregate actual metrics per platform
  const actualByPlatform: Record<string, {
    views: number; likes: number; comments: number; shares: number;
    saves: number; reach: number; watch_time_minutes: number; engagement_rate_sum: number; count: number;
  }> = {};

  for (const m of metrics) {
    const plt = m.account?.platform ?? "UNKNOWN";
    if (!actualByPlatform[plt]) {
      actualByPlatform[plt] = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, watch_time_minutes: 0, engagement_rate_sum: 0, count: 0 };
    }
    actualByPlatform[plt].views += Number(m.views);
    actualByPlatform[plt].likes += m.likes;
    actualByPlatform[plt].comments += m.comments;
    actualByPlatform[plt].shares += m.shares;
    actualByPlatform[plt].saves += m.saves;
    actualByPlatform[plt].reach += Number(m.reach);
    actualByPlatform[plt].watch_time_minutes += m.watch_time_minutes ? parseFloat(String(m.watch_time_minutes)) : 0;
    if (m.engagement_rate) { actualByPlatform[plt].engagement_rate_sum += parseFloat(String(m.engagement_rate)); actualByPlatform[plt].count++; }
  }

  // Build comparison result
  const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];
  const comparison = PLATFORMS.map((plt) => {
    const target = targets.find((t) => t.platform === plt);
    const actual = actualByPlatform[plt] ?? { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, watch_time_minutes: 0, engagement_rate_sum: 0, count: 0 };
    const avgEngagement = actual.count > 0 ? parseFloat((actual.engagement_rate_sum / actual.count).toFixed(4)) : 0;

    return {
      platform: plt,
      has_target: !!target,
      target: target ? serializeTarget(target) : null,
      actual: {
        views: actual.views,
        likes: actual.likes,
        comments: actual.comments,
        shares: actual.shares,
        saves: actual.saves,
        reach: actual.reach,
        watch_time_minutes: parseFloat(actual.watch_time_minutes.toFixed(2)),
        engagement_rate: avgEngagement,
      },
      // Achievement % for each metric (null if no target)
      achievement: target ? {
        views: Number(target.target_views) > 0 ? parseFloat(((actual.views / Number(target.target_views)) * 100).toFixed(1)) : null,
        likes: target.target_likes > 0 ? parseFloat(((actual.likes / target.target_likes) * 100).toFixed(1)) : null,
        comments: target.target_comments > 0 ? parseFloat(((actual.comments / target.target_comments) * 100).toFixed(1)) : null,
        shares: target.target_shares > 0 ? parseFloat(((actual.shares / target.target_shares) * 100).toFixed(1)) : null,
        saves: target.target_saves > 0 ? parseFloat(((actual.saves / target.target_saves) * 100).toFixed(1)) : null,
        reach: Number(target.target_reach) > 0 ? parseFloat(((actual.reach / Number(target.target_reach)) * 100).toFixed(1)) : null,
      } : null,
    };
  });

  return res.json({ bulan, tahun, comparison });
});

export default router;
