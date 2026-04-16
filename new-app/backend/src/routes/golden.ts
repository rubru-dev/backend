import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requirePermission } from "../middleware/requireRole";

const router = Router();

// ── META ADS ──────────────────────────────────────────────────────────────────

// GET /golden/meta-ads/campaigns-select — minimal list for dropdown
router.get("/meta-ads/campaigns-select", requirePermission("golden", "view"), async (_req: Request, res: Response) => {
  const camps = await prisma.goldenMetaAdsCampaign.findMany({
    where: { is_hidden: false },
    select: { id: true, campaign_name: true, platform: true },
    orderBy: { created_at: "desc" },
  });
  return res.json(camps.map((c) => ({
    id: String(c.id),
    campaign_name: c.campaign_name ?? "",
    platform: c.platform,
  })));
});

// GET /golden/meta-ads/campaigns
router.get("/meta-ads/campaigns", requirePermission("golden", "view"), async (req: Request, res: Response) => {
  const includeHidden = req.query.include_hidden === "true";
  const where = includeHidden ? {} : { is_hidden: false };
  const camps = await prisma.goldenMetaAdsCampaign.findMany({
    where,
    include: { content_metrics: true, chat_metrics: true },
    orderBy: { id: "desc" },
  });
  const result = camps.map((c) => ({
    id: c.id,
    campaign_name: c.campaign_name,
    meta_campaign_id: c.meta_campaign_id,
    status: c.status,
    platform: c.platform,
    daily_budget: c.daily_budget ? parseFloat(String(c.daily_budget)) : null,
    total_budget: c.total_budget ? parseFloat(String(c.total_budget)) : null,
    start_date: c.start_date,
    end_date: c.end_date,
    content_type: c.content_type,
    content_description: c.content_description,
    account_name: c.account_name,
    // Credentials tidak dikembalikan ke client — hanya flag apakah sudah dikonfigurasi
    has_credentials: !!(c.access_token && c.ad_account_id),
    // Info credential yang aman untuk ditampilkan di UI
    app_id_set: !!c.app_id,
    ad_account_id_display: c.ad_account_id ?? null,
    pixel_id_display: c.pixel_id ?? null,
    is_hidden: c.is_hidden,
    last_synced_at: c.last_synced_at,
    token_refreshed_at: (c as any).token_refreshed_at ?? null,
    created_at: c.created_at,
    total_spend: c.content_metrics.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0),
    total_clicks: c.content_metrics.reduce((s, m) => s + (m.clicks ?? 0), 0),
    total_conversions: c.chat_metrics.reduce((s, m) => s + (m.total_conversions ?? 0), 0),
  }));
  return res.json({ items: result, total: result.length });
});

// POST /golden/meta-ads/campaigns
router.post("/meta-ads/campaigns", requirePermission("golden", "create"), async (req: Request, res: Response) => {
  const { campaign_name, meta_campaign_id, platform, status, start_date, end_date, daily_budget, total_budget, content_type, content_description, account_name, app_id, ad_account_id, pixel_id, app_secret, access_token } = req.body;
  const camp = await prisma.goldenMetaAdsCampaign.create({
    data: {
      campaign_name: campaign_name ?? null,
      meta_campaign_id: meta_campaign_id ?? null,
      platform: platform ?? "Meta",
      status: status ?? "aktif",
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      daily_budget: daily_budget ?? 0,
      total_budget: total_budget ?? 0,
      content_type: content_type ?? null,
      content_description: content_description ?? null,
      account_name: account_name ?? null,
      app_id: app_id ?? null,
      ad_account_id: ad_account_id ?? null,
      pixel_id: pixel_id ?? null,
      app_secret: app_secret ?? null,
      access_token: access_token ?? null,
      created_by: req.user!.id,
    },
  });
  return res.status(201).json({ id: camp.id });
});

// GET /golden/meta-ads/campaigns/:id
router.get("/meta-ads/campaigns/:id", requirePermission("golden", "view"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.goldenMetaAdsCampaign.findUnique({
    where: { id },
    include: { content_metrics: { orderBy: { date: "asc" } }, chat_metrics: { orderBy: { date: "asc" } } },
  });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });

  const totalSpend = camp.content_metrics.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0);
  const totalImpressions = camp.content_metrics.reduce((s, m) => s + Number(m.impressions ?? 0), 0);
  const totalClicks = camp.content_metrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalConversions = camp.chat_metrics.reduce((s, m) => s + (m.total_conversions ?? 0), 0);

  return res.json({
    id: camp.id,
    campaign_name: camp.campaign_name,
    meta_campaign_id: camp.meta_campaign_id,
    platform: camp.platform,
    status: camp.status,
    start_date: camp.start_date,
    end_date: camp.end_date,
    daily_budget: parseFloat(String(camp.daily_budget ?? 0)),
    total_budget: parseFloat(String(camp.total_budget ?? 0)),
    content_type: camp.content_type,
    content_description: camp.content_description,
    account_name: camp.account_name,
    // Credentials tidak dikembalikan ke client — hanya flag
    has_credentials: !!(camp.access_token && camp.ad_account_id),
    thumbnail: camp.thumbnail,
    is_hidden: camp.is_hidden,
    created_at: camp.created_at,
    summary: {
      total_spend: totalSpend,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cost_per_result: totalConversions > 0 ? totalSpend / totalConversions : 0,
    },
    content_metrics: camp.content_metrics.map((m) => ({
      id: m.id, date: m.date,
      impressions: Number(m.impressions ?? 0), reach: Number(m.reach ?? 0),
      clicks: m.clicks, spend: parseFloat(String(m.spend ?? 0)),
      ctr: parseFloat(String(m.ctr ?? 0)), conversions: m.conversions,
      likes: m.likes, comments: m.comments, shares: m.shares, video_views: m.video_views,
      cost_per_result: parseFloat(String(m.cost_per_result ?? 0)),
    })),
    chat_metrics: camp.chat_metrics.map((m) => ({
      id: m.id, date: m.date,
      chats_received: m.chats_received, chats_responded: m.chats_responded,
      response_rate: parseFloat(String(m.response_rate ?? 0)),
      avg_response_time: parseFloat(String(m.avg_response_time ?? 0)),
      total_conversions: m.total_conversions,
      conversion_rate: parseFloat(String(m.conversion_rate ?? 0)),
    })),
  });
});

// PATCH /golden/meta-ads/campaigns/:id
router.patch("/meta-ads/campaigns/:id", requirePermission("golden", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.goldenMetaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });
  const b = req.body;
  const updates: Record<string, unknown> = {};
  if (b.campaign_name !== undefined) updates.campaign_name = b.campaign_name;
  if (b.meta_campaign_id !== undefined) updates.meta_campaign_id = b.meta_campaign_id;
  if (b.platform !== undefined) updates.platform = b.platform;
  if (b.status !== undefined) updates.status = b.status;
  if (b.start_date !== undefined) updates.start_date = b.start_date ? new Date(b.start_date) : null;
  if (b.end_date !== undefined) updates.end_date = b.end_date ? new Date(b.end_date) : null;
  if (b.daily_budget !== undefined) updates.daily_budget = b.daily_budget;
  if (b.total_budget !== undefined) updates.total_budget = b.total_budget;
  if (b.content_type !== undefined) updates.content_type = b.content_type;
  if (b.content_description !== undefined) updates.content_description = b.content_description;
  if (b.account_name !== undefined) updates.account_name = b.account_name;
  if (b.app_id !== undefined) updates.app_id = b.app_id;
  if (b.ad_account_id !== undefined) updates.ad_account_id = b.ad_account_id;
  if (b.pixel_id !== undefined) updates.pixel_id = b.pixel_id;
  if (b.app_secret !== undefined) updates.app_secret = b.app_secret;
  if (b.access_token !== undefined) updates.access_token = b.access_token;
  await prisma.goldenMetaAdsCampaign.update({ where: { id }, data: updates });
  return res.json({ message: "Campaign diupdate" });
});

// PATCH /golden/meta-ads/campaigns/:id/toggle-hidden
router.patch("/meta-ads/campaigns/:id/toggle-hidden", requirePermission("golden", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.goldenMetaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ message: "Campaign tidak ditemukan" });
  const updated = await prisma.goldenMetaAdsCampaign.update({
    where: { id },
    data: { is_hidden: !camp.is_hidden },
  });
  return res.json({ id: updated.id, is_hidden: updated.is_hidden });
});

// DELETE /golden/meta-ads/campaigns/:id
router.delete("/meta-ads/campaigns/:id", requirePermission("golden", "delete"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.goldenMetaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });
  await prisma.goldenMetaAdsCampaign.delete({ where: { id } });
  return res.json({ message: "Campaign dihapus" });
});

// POST /golden/meta-ads/campaigns/:id/sync
router.post("/meta-ads/campaigns/:id/sync", requirePermission("golden", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { bulan, tahun } = req.query;

  const camp = await prisma.goldenMetaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });
  if (!camp.access_token || !camp.ad_account_id) {
    return res.status(400).json({ detail: "Access Token dan Ad Account ID harus diisi terlebih dahulu di konfigurasi kampanye" });
  }

  const now = new Date();
  const m = bulan ? parseInt(bulan as string) : now.getMonth() + 1;
  const y = tahun ? parseInt(tahun as string) : now.getFullYear();
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const token = camp.access_token;
  const adAccountId = camp.ad_account_id.startsWith("act_") ? camp.ad_account_id : `act_${camp.ad_account_id}`;

  // Step 1: If no meta_campaign_id yet, resolve it from ad account campaigns list
  let metaCampaignId = camp.meta_campaign_id;
  if (!metaCampaignId) {
    const listUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/campaigns`);
    listUrl.searchParams.set("fields", "id,name,status");
    listUrl.searchParams.set("access_token", token);
    listUrl.searchParams.set("limit", "500");
    const listResp = await fetch(listUrl.toString());
    const listData = await listResp.json() as { data?: Array<{ id: string; name: string; status: string }>; error?: { message: string } };
    if (listData.error) return res.status(400).json({ detail: `Meta API: ${listData.error.message}` });
    // Match by name (case-insensitive)
    const match = (listData.data ?? []).find(
      (c) => c.name.toLowerCase() === (camp.campaign_name ?? "").toLowerCase()
    );
    if (match) {
      metaCampaignId = match.id;
      await prisma.goldenMetaAdsCampaign.update({ where: { id }, data: { meta_campaign_id: match.id, status: match.status } });
    }
  }

  // Step 2: Fetch daily insights (filter by campaign if id is known)
  const META_FIELDS = "campaign_id,spend,impressions,reach,inline_link_clicks,inline_link_click_ctr,frequency,cost_per_result,cpc,actions";
  const insUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/insights`);
  insUrl.searchParams.set("fields", META_FIELDS);
  insUrl.searchParams.set("level", "campaign");
  insUrl.searchParams.set("time_increment", "1");
  insUrl.searchParams.set("time_range", JSON.stringify({ since: startDate, until: endDate }));
  insUrl.searchParams.set("access_token", token);
  insUrl.searchParams.set("limit", "500");
  if (metaCampaignId) {
    insUrl.searchParams.set("filtering", JSON.stringify([{ field: "campaign.id", operator: "IN", value: [metaCampaignId] }]));
  }

  const insResp = await fetch(insUrl.toString());
  const insData = await insResp.json() as {
    data?: Array<{
      campaign_id: string; date_start: string;
      spend: string; impressions: string; reach?: string;
      inline_link_clicks?: string; inline_link_click_ctr?: string;
      frequency?: string; cost_per_result?: any; cpc?: string;
      actions?: Array<{ action_type: string; value: string }>;
    }>;
    error?: { message: string };
  };
  if (insData.error) return res.status(400).json({ detail: `Meta Insights: ${insData.error.message}` });

  function parseCPR(cpr: any): number {
    if (Array.isArray(cpr)) return parseFloat(cpr[0]?.values?.[0]?.value ?? "0") || 0;
    return parseFloat((cpr as string) ?? "0") || 0;
  }

  const CONVERSION_ACTIONS = [
    "offsite_conversion.fb_pixel_purchase", "purchase", "complete_registration", "lead",
    "onsite_conversion.messaging_conversation_started_7d",
    "messaging_conversation_started_7d", "onsite_conversion.lead_grouped",
  ];

  let synced = 0;
  for (const row of insData.data ?? []) {
    const date = new Date(row.date_start);
    const conversions = (row.actions ?? [])
      .filter((a) => CONVERSION_ACTIONS.includes(a.action_type))
      .reduce((s, a) => s + parseInt(a.value ?? "0"), 0);

    const data = {
      spend: parseFloat(row.spend ?? "0"),
      impressions: BigInt(row.impressions ?? "0"),
      reach: BigInt(row.reach ?? "0"),
      clicks: parseInt(row.inline_link_clicks ?? "0"),
      ctr: parseFloat(row.inline_link_click_ctr ?? "0"),
      frequency: parseFloat(row.frequency ?? "0"),
      cost_per_result: parseCPR(row.cost_per_result),
      conversions,
    };

    const existing = await prisma.goldenAdContentMetric.findFirst({
      where: { meta_ads_campaign_id: id, date },
    });
    if (existing) {
      await prisma.goldenAdContentMetric.update({ where: { id: existing.id }, data });
    } else {
      await prisma.goldenAdContentMetric.create({
        data: { meta_ads_campaign_id: id, date, ...data },
      });
    }
    synced++;
  }

  await prisma.goldenMetaAdsCampaign.update({ where: { id }, data: { last_synced_at: new Date() } });

  return res.json({ synced, message: `Berhasil sync ${synced} data dari Meta Ads (${startDate} s/d ${endDate})` });
});

// ── CONTENT METRICS ───────────────────────────────────────────────────────────

router.get("/meta-ads/campaigns/:id/content-metrics", requirePermission("golden", "view"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const metrics = await prisma.goldenAdContentMetric.findMany({
    where: { meta_ads_campaign_id: id },
    orderBy: { date: "desc" },
  });
  return res.json(metrics.map((m) => ({
    id: m.id, date: m.date,
    impressions: Number(m.impressions ?? 0), reach: Number(m.reach ?? 0),
    clicks: m.clicks, spend: parseFloat(String(m.spend ?? 0)),
    ctr: parseFloat(String(m.ctr ?? 0)), conversions: m.conversions,
    likes: m.likes, comments: m.comments, shares: m.shares, video_views: m.video_views,
    cost_per_result: parseFloat(String(m.cost_per_result ?? 0)),
    created_at: m.created_at,
  })));
});

router.post("/meta-ads/campaigns/:id/content-metrics", requirePermission("golden", "create"), async (req: Request, res: Response) => {
  const campId = BigInt(req.params.id);
  const { date, impressions, reach, clicks, spend, conversions, likes, comments, shares, video_views } = req.body;
  const clicksN = clicks ?? 0;
  const impressionsN = impressions ?? 0;
  const spendN = spend ?? 0;
  const conversionsN = conversions ?? 0;
  const ctr = impressionsN > 0 ? (clicksN / impressionsN) * 100 : 0;
  const costPerResult = conversionsN > 0 ? spendN / conversionsN : 0;
  await prisma.goldenAdContentMetric.create({
    data: {
      meta_ads_campaign_id: campId,
      date: new Date(date),
      impressions: impressionsN, reach: reach ?? 0,
      clicks: clicksN, spend: spendN,
      likes: likes ?? 0, comments: comments ?? 0, shares: shares ?? 0,
      video_views: video_views ?? 0, conversions: conversionsN,
      ctr, cost_per_result: costPerResult,
    },
  });
  return res.status(201).json({ message: "Metrik ditambahkan" });
});

router.patch("/meta-ads/content-metrics/:id", requirePermission("golden", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.goldenAdContentMetric.findUnique({ where: { id } });
  if (!m) return res.status(404).json({ detail: "Metrik tidak ditemukan" });
  const b = req.body;
  const updates: Record<string, unknown> = {};
  if (b.date !== undefined) updates.date = new Date(b.date);
  if (b.impressions !== undefined) updates.impressions = b.impressions;
  if (b.reach !== undefined) updates.reach = b.reach;
  if (b.clicks !== undefined) updates.clicks = b.clicks;
  if (b.spend !== undefined) updates.spend = b.spend;
  if (b.likes !== undefined) updates.likes = b.likes;
  if (b.comments !== undefined) updates.comments = b.comments;
  if (b.shares !== undefined) updates.shares = b.shares;
  if (b.video_views !== undefined) updates.video_views = b.video_views;
  if (b.conversions !== undefined) updates.conversions = b.conversions;
  const updated = await prisma.goldenAdContentMetric.update({ where: { id }, data: updates });
  const clicksN = Number(updated.clicks ?? 0);
  const impressionsN = Number(updated.impressions ?? 0);
  const spendN = parseFloat(String(updated.spend ?? 0));
  const conversionsN = updated.conversions ?? 0;
  await prisma.goldenAdContentMetric.update({
    where: { id },
    data: {
      ctr: impressionsN > 0 ? (clicksN / impressionsN) * 100 : 0,
      cost_per_result: conversionsN > 0 ? spendN / conversionsN : 0,
    },
  });
  return res.json({ message: "Metrik diupdate" });
});

router.delete("/meta-ads/content-metrics/:id", requirePermission("golden", "delete"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.goldenAdContentMetric.findUnique({ where: { id } });
  if (!m) return res.status(404).json({ detail: "Metrik tidak ditemukan" });
  await prisma.goldenAdContentMetric.delete({ where: { id } });
  return res.json({ message: "Metrik dihapus" });
});

// ── CHAT METRICS ──────────────────────────────────────────────────────────────

router.get("/meta-ads/campaigns/:id/chat-metrics", requirePermission("golden", "view"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const metrics = await prisma.goldenWhatsappChatMetric.findMany({
    where: { meta_ads_campaign_id: id },
    orderBy: { date: "desc" },
  });
  return res.json(metrics.map((m) => ({
    id: m.id, date: m.date,
    chats_received: m.chats_received, chats_responded: m.chats_responded,
    response_rate: parseFloat(String(m.response_rate ?? 0)),
    avg_response_time: parseFloat(String(m.avg_response_time ?? 0)),
    total_conversions: m.total_conversions,
    conversion_rate: parseFloat(String(m.conversion_rate ?? 0)),
    created_at: m.created_at,
  })));
});

router.post("/meta-ads/campaigns/:id/chat-metrics", requirePermission("golden", "create"), async (req: Request, res: Response) => {
  const campId = BigInt(req.params.id);
  const { date, chats_received, chats_responded, avg_response_time, total_conversions } = req.body;
  const receivedN = chats_received ?? 0;
  const respondedN = chats_responded ?? 0;
  const conversionsN = total_conversions ?? 0;
  await prisma.goldenWhatsappChatMetric.create({
    data: {
      meta_ads_campaign_id: campId,
      date: new Date(date),
      chats_received: receivedN, chats_responded: respondedN,
      avg_response_time: avg_response_time ?? undefined, total_conversions: conversionsN,
      response_rate: receivedN > 0 ? (respondedN / receivedN) * 100 : undefined,
      conversion_rate: receivedN > 0 ? (conversionsN / receivedN) * 100 : undefined,
    },
  });
  return res.status(201).json({ message: "Chat metrik ditambahkan" });
});

router.patch("/meta-ads/chat-metrics/:id", requirePermission("golden", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.goldenWhatsappChatMetric.findUnique({ where: { id } });
  if (!m) return res.status(404).json({ detail: "Metrik tidak ditemukan" });
  const b = req.body;
  const updates: Record<string, unknown> = {};
  if (b.date !== undefined) updates.date = new Date(b.date);
  if (b.chats_received !== undefined) updates.chats_received = b.chats_received;
  if (b.chats_responded !== undefined) updates.chats_responded = b.chats_responded;
  if (b.avg_response_time !== undefined) updates.avg_response_time = b.avg_response_time;
  if (b.total_conversions !== undefined) updates.total_conversions = b.total_conversions;
  const updated = await prisma.goldenWhatsappChatMetric.update({ where: { id }, data: updates });
  const receivedN = Number(updated.chats_received ?? 0);
  const respondedN = Number(updated.chats_responded ?? 0);
  const conversionsN = Number(updated.total_conversions ?? 0);
  await prisma.goldenWhatsappChatMetric.update({
    where: { id },
    data: {
      response_rate: receivedN > 0 ? (respondedN / receivedN) * 100 : undefined,
      conversion_rate: receivedN > 0 ? (conversionsN / receivedN) * 100 : undefined,
    },
  });
  return res.json({ message: "Metrik diupdate" });
});

router.delete("/meta-ads/chat-metrics/:id", requirePermission("golden", "delete"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.goldenWhatsappChatMetric.findUnique({ where: { id } });
  if (!m) return res.status(404).json({ detail: "Metrik tidak ditemukan" });
  await prisma.goldenWhatsappChatMetric.delete({ where: { id } });
  return res.json({ message: "Metrik dihapus" });
});

// ── DASHBOARD ADS ─────────────────────────────────────────────────────────────

router.get("/meta-ads/dashboard", requirePermission("golden", "view"), async (req: Request, res: Response) => {
  const { platform, campaign_id, bulan, tahun, start_date, end_date } = req.query;

  const now = new Date();
  let since: string;
  let until: string;
  if (start_date && end_date) {
    since = start_date as string;
    until = end_date as string;
  } else if (bulan && tahun) {
    const m = parseInt(bulan as string);
    const y = parseInt(tahun as string);
    since = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    until = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  } else {
    since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    until = now.toISOString().slice(0, 10);
  }

  const campaignWhere: Record<string, unknown> = { is_hidden: false };
  if (platform && platform !== "all") campaignWhere.platform = platform;
  if (campaign_id) campaignWhere.id = BigInt(campaign_id as string);

  const sinceDate = new Date(since);
  const untilDate = new Date(until + "T23:59:59");

  const camps = await prisma.goldenMetaAdsCampaign.findMany({ where: campaignWhere });
  const campaignIds = camps.map((c) => c.id);

  const [contentMetrics, chatMetrics] = await Promise.all([
    prisma.goldenAdContentMetric.findMany({
      where: { meta_ads_campaign_id: { in: campaignIds }, date: { gte: sinceDate, lte: untilDate } },
    }),
    prisma.goldenWhatsappChatMetric.findMany({
      where: { meta_ads_campaign_id: { in: campaignIds }, date: { gte: sinceDate, lte: untilDate } },
    }),
  ]);

  const totalSpend = contentMetrics.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0);
  const totalImpressions = contentMetrics.reduce((s, m) => s + Number(m.impressions ?? 0), 0);
  const totalReach = contentMetrics.reduce((s, m) => s + Number(m.reach ?? 0), 0);
  const totalClicks = contentMetrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalConversions = contentMetrics.reduce((s, m) => s + (m.conversions ?? 0), 0);

  // Survey terjadwal: leads with rencana_survey=Ya and modul=golden in current period
  const surveyTerjadwal = await prisma.lead.count({
    where: { modul: "golden", rencana_survey: "Ya", tanggal_survey: { gte: sinceDate, lte: untilDate } },
  });

  const campaigns = camps.map((c) => {
    const cm = contentMetrics.filter((m) => m.meta_ads_campaign_id === c.id);
    const spend = cm.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0);
    const impressions = cm.reduce((s, m) => s + Number(m.impressions ?? 0), 0);
    const reach = cm.reduce((s, m) => s + Number(m.reach ?? 0), 0);
    const clicks = cm.reduce((s, m) => s + (m.clicks ?? 0), 0);
    const conversions = cm.reduce((s, m) => s + (m.conversions ?? 0), 0);
    return {
      id: c.id, campaign_name: c.campaign_name, platform: c.platform, status: c.status,
      spend, impressions, reach, clicks, conversions,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cost_per_result: conversions > 0 ? spend / conversions : 0,
    };
  });

  // Daily time series from content metrics
  const dailyMap: Record<string, { date: string; spend: number; impressions: number; clicks: number; conversions: number }> = {};
  for (const m of contentMetrics) {
    const d = m.date.toISOString().slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { date: d, spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    dailyMap[d].spend += parseFloat(String(m.spend ?? 0));
    dailyMap[d].impressions += Number(m.impressions ?? 0);
    dailyMap[d].clicks += m.clicks ?? 0;
  }
  for (const m of chatMetrics) {
    const d = m.date.toISOString().slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { date: d, spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    dailyMap[d].conversions += m.total_conversions ?? 0;
  }
  const time_series = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return res.json({
    since, until,
    summary: {
      total_spend: totalSpend,
      total_impressions: totalImpressions,
      total_reach: totalReach,
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpl: totalConversions > 0 ? totalSpend / totalConversions : 0,
    },
    survey_terjadwal: surveyTerjadwal,
    campaigns,
    time_series,
  });
});

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
// POST /golden/meta-ads/campaigns/:id/refresh-token
router.post("/meta-ads/campaigns/:id/refresh-token", requirePermission("golden", "edit"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.goldenMetaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });
  if (camp.platform !== "Meta") return res.status(400).json({ detail: "Refresh token hanya untuk platform Meta" });
  if (!camp.app_id || !camp.app_secret || !camp.access_token) {
    return res.status(400).json({ detail: "App ID, App Secret, dan Access Token harus dikonfigurasi terlebih dahulu" });
  }

  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", camp.app_id);
  url.searchParams.set("client_secret", camp.app_secret);
  url.searchParams.set("fb_exchange_token", camp.access_token);

  const resp = await fetch(url.toString());
  const data = await resp.json() as { access_token?: string; expires_in?: number; error?: { message: string } };
  if (data.error || !data.access_token) {
    return res.status(400).json({ detail: data.error?.message ?? "Gagal refresh token dari Meta" });
  }

  await prisma.goldenMetaAdsCampaign.update({
    where: { id },
    data: { access_token: data.access_token, token_refreshed_at: new Date() } as any,
  });

  const expiresInDays = data.expires_in ? Math.floor(data.expires_in / 86400) : null;
  return res.json({ message: `Token berhasil diperbarui${expiresInDays ? ` — berlaku ${expiresInDays} hari` : ""}`, expires_in_days: expiresInDays });
});

// ── AD MONTHLY TARGETS ────────────────────────────────────────────────────────
// GET /golden/ads/targets
router.get("/ads/targets", requirePermission("golden", "view"), async (req: Request, res: Response) => {
  const { platform, bulan, tahun } = req.query;
  const where: Record<string, unknown> = {};
  if (platform) where.platform = platform;
  if (bulan) where.bulan = parseInt(bulan as string);
  if (tahun) where.tahun = parseInt(tahun as string);

  const targets = await (prisma as any).goldenAdMonthlyTarget.findMany({ where, orderBy: [{ tahun: "desc" }, { bulan: "desc" }] });
  return res.json(targets.map((t: any) => ({
    id: t.id, platform: t.platform, bulan: t.bulan, tahun: t.tahun,
    target_spend: t.target_spend != null ? parseFloat(String(t.target_spend)) : null,
    target_impressions: t.target_impressions != null ? Number(t.target_impressions) : null,
    target_clicks: t.target_clicks,
    target_conversions: t.target_conversions,
    target_ctr: t.target_ctr != null ? parseFloat(String(t.target_ctr)) : null,
    target_roas: t.target_roas != null ? parseFloat(String(t.target_roas)) : null,
  })));
});

// POST /golden/ads/targets (upsert)
router.post("/ads/targets", requirePermission("golden", "edit"), async (req: Request, res: Response) => {
  const { platform, bulan, tahun, target_spend, target_impressions, target_clicks, target_conversions, target_ctr, target_roas } = req.body;
  if (!platform || !bulan || !tahun) return res.status(400).json({ detail: "platform, bulan, dan tahun wajib diisi" });

  const existing = await (prisma as any).goldenAdMonthlyTarget.findFirst({ where: { platform, bulan: parseInt(bulan), tahun: parseInt(tahun) } });
  const data = {
    target_spend: target_spend ?? null,
    target_impressions: target_impressions != null ? BigInt(target_impressions) : null,
    target_clicks: target_clicks ?? null,
    target_conversions: target_conversions ?? null,
    target_ctr: target_ctr ?? null,
    target_roas: target_roas ?? null,
    updated_at: new Date(),
  };

  let result;
  if (existing) {
    result = await (prisma as any).goldenAdMonthlyTarget.update({ where: { id: existing.id }, data });
  } else {
    result = await (prisma as any).goldenAdMonthlyTarget.create({ data: { platform, bulan: parseInt(bulan), tahun: parseInt(tahun), ...data } });
  }
  return res.json({ id: result.id });
});

// DELETE /golden/ads/targets/:id
router.delete("/ads/targets/:id", requirePermission("golden", "delete"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await (prisma as any).goldenAdMonthlyTarget.delete({ where: { id } });
  return res.json({ message: "Target dihapus" });
});

// GET /golden/meta-ads/campaigns — expose has_credentials + token_refreshed_at for Setup tab
// (already handled above, but need token_refreshed_at in list response)

export default router;
