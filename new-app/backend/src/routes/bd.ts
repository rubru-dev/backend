import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole, requirePermission } from "../middleware/requireRole";
import { getPagination, paginateResponse } from "../middleware/pagination";
import { sendFonnte, FRONTEND_URL } from "../lib/fontee";

const router = Router();

// ── LEAD HELPERS ──────────────────────────────────────────────────────────────

function leadDict(l: {
  id: bigint; nama: string; nomor_telepon: string | null; alamat: string | null;
  sumber_leads: string | null; meta_ads_campaign_id?: bigint | null;
  tanggal_masuk?: Date | null;
  keterangan: string | null; jenis: string | null;
  week: number | null; status: string | null; tipe: string | null; bulan: number | null;
  tahun: number | null; rencana_survey: string | null; tanggal_survey: Date | null;
  jam_survey: string | null; pic_survey: string | null; modul: string | null;
  survey_approval_status: string | null;
  foto_survey?: string | null;
  luasan_tanah?: any;
  catatan_survey?: string | null;
  user?: { id: bigint; name: string } | null;
  created_at: Date | null;
  _count?: { follow_ups: number };
  follow_ups?: { id: bigint; tanggal: Date | null; catatan: string | null; user?: { name: string } | null }[];
}) {
  return {
    id: l.id, nama: l.nama, nomor_telepon: l.nomor_telepon, alamat: l.alamat,
    sumber_leads: l.sumber_leads,
    meta_ads_campaign_id: l.meta_ads_campaign_id ? String(l.meta_ads_campaign_id) : null,
    tanggal_masuk: l.tanggal_masuk ?? null,
    keterangan: l.keterangan, jenis: l.jenis,
    week: l.week, status: l.status, tipe: l.tipe, bulan: l.bulan, tahun: l.tahun,
    rencana_survey: l.rencana_survey, tanggal_survey: l.tanggal_survey,
    jam_survey: l.jam_survey, pic_survey: l.pic_survey, modul: l.modul,
    survey_approval_status: l.survey_approval_status?.toLowerCase() ?? null,
    foto_survey: l.foto_survey ?? null,
    luasan_tanah: l.luasan_tanah != null ? parseFloat(String(l.luasan_tanah)) : null,
    catatan_survey: l.catatan_survey ?? null,
    user: l.user ? { id: l.user.id, name: l.user.name } : null,
    created_at: l.created_at,
    follow_up_count: l._count?.follow_ups ?? undefined,
    last_follow_up: l.follow_ups?.[0]
      ? { tanggal: l.follow_ups[0].tanggal, catatan: l.follow_ups[0].catatan, by: l.follow_ups[0].user?.name ?? null }
      : undefined,
  };
}

// ── LEADS (BD module) ─────────────────────────────────────────────────────────

router.get("/leads", requirePermission("bd", "view"), async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const bulan = req.query.bulan ? parseInt(req.query.bulan as string) : undefined;
  const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;
  const modul = req.query.modul as string | undefined;
  const jenis = req.query.jenis as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) where.nama = { contains: search, mode: "insensitive" };
  if (status) where.status = status;
  if (bulan) where.bulan = bulan;
  if (tahun) where.tahun = tahun;
  if (modul) where.modul = modul;
  if (jenis) where.jenis = jenis;

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: { user: true },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return res.json(paginateResponse(leads.map(leadDict), total, page, limit));
});

// GET /bd/database-client/leads — accessible to sales_admin + telemarketing + BD (Super Admin bypass)
router.get("/database-client/leads", async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query, 20, 10000);
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const jenis = req.query.jenis as string | undefined;
  const modul = req.query.modul as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { nama: { contains: search, mode: "insensitive" } },
      { nomor_telepon: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (jenis) where.jenis = jenis;
  if (modul) where.modul = modul;

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        user: true,
        follow_ups: {
          orderBy: { created_at: "desc" },
          take: 5,
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const mapped = leads.map((l) => ({
    ...leadDict(l),
    follow_ups: (l as any).follow_ups?.map((fu: any) => ({
      id: String(fu.id),
      tanggal: fu.tanggal,
      catatan: fu.catatan,
      next_follow_up: fu.next_follow_up,
      created_by: fu.user ? { id: String(fu.user.id), nama: fu.user.name } : null,
      created_at: fu.created_at,
    })) ?? [],
  }));

  return res.json(paginateResponse(mapped, total, page, limit));
});

router.post("/leads", async (req: Request, res: Response) => {
  const b = req.body;
  const lead = await prisma.lead.create({
    data: {
      user_id: req.user!.id,
      nama: b.nama,
      nomor_telepon: b.nomor_telepon ?? null,
      alamat: b.alamat ?? null,
      sumber_leads: b.sumber_leads ?? null,
      meta_ads_campaign_id: b.meta_ads_campaign_id ? BigInt(b.meta_ads_campaign_id) : null,
      tanggal_masuk: b.tanggal_masuk ? new Date(b.tanggal_masuk) : null,
      keterangan: b.keterangan ?? null,
      jenis: b.jenis ?? null,
      week: b.week != null ? parseInt(b.week) : null,
      status: b.status ?? "Low",
      tipe: b.tipe ?? null,
      bulan: b.bulan != null ? parseInt(b.bulan) : null,
      tahun: b.tahun != null ? parseInt(b.tahun) : null,
      rencana_survey: b.rencana_survey ?? "Tidak",
      tanggal_survey: b.tanggal_survey ? new Date(b.tanggal_survey) : null,
      pic_survey: b.pic_survey ?? null,
      survey_approval_status: b.survey_approval_status ?? null,
      jam_survey: b.jam_survey ?? null,
      modul: b.modul ?? null,
    },
  });
  return res.status(201).json({ id: lead.id, nama: lead.nama, message: "Lead berhasil dibuat" });
});

router.get("/leads/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { user: true, follow_ups: true },
  });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  const d = leadDict(lead);
  return res.json({
    ...d,
    follow_ups: lead.follow_ups.map((f) => ({
      id: f.id, tanggal: f.tanggal, catatan: f.catatan, next_follow_up: f.next_follow_up,
    })),
  });
});

router.patch("/leads/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  const b = req.body;
  const updates: Record<string, unknown> = {};
  if (b.nama !== undefined) updates.nama = b.nama;
  if (b.nomor_telepon !== undefined) updates.nomor_telepon = b.nomor_telepon;
  if (b.alamat !== undefined) updates.alamat = b.alamat;
  if (b.sumber_leads !== undefined) updates.sumber_leads = b.sumber_leads;
  if (b.meta_ads_campaign_id !== undefined) updates.meta_ads_campaign_id = b.meta_ads_campaign_id ? BigInt(b.meta_ads_campaign_id) : null;
  if (b.tanggal_masuk !== undefined) updates.tanggal_masuk = b.tanggal_masuk ? new Date(b.tanggal_masuk) : null;
  if (b.keterangan !== undefined) updates.keterangan = b.keterangan;
  if (b.jenis !== undefined) updates.jenis = b.jenis;
  if (b.week !== undefined) updates.week = b.week != null ? parseInt(b.week) : null;
  if (b.status !== undefined) updates.status = b.status;
  if (b.tipe !== undefined) updates.tipe = b.tipe;
  if (b.bulan !== undefined) updates.bulan = b.bulan != null ? parseInt(b.bulan) : null;
  if (b.tahun !== undefined) updates.tahun = b.tahun != null ? parseInt(b.tahun) : null;
  if (b.rencana_survey !== undefined) updates.rencana_survey = b.rencana_survey;
  if (b.tanggal_survey !== undefined) updates.tanggal_survey = b.tanggal_survey ? new Date(b.tanggal_survey) : null;
  if (b.pic_survey !== undefined) updates.pic_survey = b.pic_survey;
  if (b.survey_approval_status !== undefined) updates.survey_approval_status = b.survey_approval_status;
  if (b.jam_survey !== undefined) updates.jam_survey = b.jam_survey;
  await prisma.lead.update({ where: { id }, data: updates });
  return res.json({ message: "Lead berhasil diupdate" });
});

router.delete("/leads/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  await prisma.lead.delete({ where: { id } });
  return res.json({ message: "Lead berhasil dihapus" });
});

router.post("/leads/:id/approve-survey", requirePermission("bd", "approve"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  await prisma.lead.update({
    where: { id },
    data: { survey_approval_status: "approved", survey_approved_by: req.user!.id, survey_approved_at: new Date() },
  });
  return res.json({ message: "Survey disetujui" });
});

router.post("/leads/:id/reject-survey", requirePermission("bd", "approve"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  await prisma.lead.update({
    where: { id },
    data: { survey_approval_status: "rejected", survey_approved_by: req.user!.id, survey_approved_at: new Date() },
  });
  return res.json({ message: "Survey ditolak" });
});

// ── FOLLOW UP ─────────────────────────────────────────────────────────────────

router.get("/follow-up", async (req: Request, res: Response) => {
  const leadId = req.query.lead_id ? parseInt(req.query.lead_id as string) : undefined;
  const where = leadId ? { lead_id: leadId } : {};
  const items = await prisma.followUpClient.findMany({
    where,
    include: { lead: true, user: true },
    orderBy: { tanggal: "desc" },
  });
  return res.json({
    items: items.map((f) => ({
      id: f.id, lead_id: f.lead_id, tanggal: f.tanggal, catatan: f.catatan, next_follow_up: f.next_follow_up,
      lead: f.lead ? { nama: f.lead.nama } : null,
    })),
  });
});

router.post("/follow-up", async (req: Request, res: Response) => {
  const { lead_id, tanggal, catatan, next_follow_up } = req.body;
  await prisma.followUpClient.create({
    data: {
      lead_id,
      user_id: req.user!.id,
      tanggal: new Date(tanggal),
      catatan: catatan ?? null,
      next_follow_up: next_follow_up ? new Date(next_follow_up) : null,
    },
  });
  return res.status(201).json({ message: "Follow up ditambahkan" });
});

router.delete("/follow-up/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const fu = await prisma.followUpClient.findUnique({ where: { id } });
  if (!fu) return res.status(404).json({ detail: "Follow up tidak ditemukan" });
  await prisma.followUpClient.delete({ where: { id } });
  return res.json({ message: "Follow up dihapus" });
});

// ── META ADS ──────────────────────────────────────────────────────────────────

// GET /bd/meta-ads/campaigns-select — minimal list for lead form sumber dropdown (only visible campaigns)
router.get("/meta-ads/campaigns-select", async (_req: Request, res: Response) => {
  const camps = await prisma.metaAdsCampaign.findMany({
    where: { is_hidden: false },
    select: { id: true, campaign_name: true, platform: true, _count: { select: { leads: true } } },
    orderBy: { created_at: "desc" },
  });
  return res.json(camps.map((c) => ({
    id: String(c.id),
    campaign_name: c.campaign_name ?? "",
    platform: c.platform,
    leads_count: c._count.leads,
  })));
});

router.get("/meta-ads/campaigns", async (req: Request, res: Response) => {
  const includeHidden = req.query.include_hidden === "true";
  const where = includeHidden ? {} : { is_hidden: false };
  const camps = await prisma.metaAdsCampaign.findMany({
    where,
    include: { content_metrics: true, chat_metrics: true, _count: { select: { leads: true } } },
    orderBy: { id: "desc" },
  });
  const result = camps.map((c) => ({
    id: c.id, campaign_name: c.campaign_name, meta_campaign_id: c.meta_campaign_id,
    status: c.status, platform: c.platform, is_hidden: c.is_hidden, created_at: c.created_at,
    total_spend: c.content_metrics.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0),
    total_clicks: c.content_metrics.reduce((s, m) => s + (m.clicks ?? 0), 0),
    total_conversions: c.chat_metrics.reduce((s, m) => s + (m.total_conversions ?? 0), 0),
    leads_count: c._count.leads,
  }));
  return res.json({ items: result, total: result.length });
});

router.patch("/meta-ads/campaigns/:id/toggle-hidden", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.metaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ message: "Campaign tidak ditemukan" });
  const updated = await prisma.metaAdsCampaign.update({
    where: { id },
    data: { is_hidden: !camp.is_hidden },
  });
  return res.json({ id: updated.id, is_hidden: updated.is_hidden });
});

router.post("/meta-ads/campaigns", async (req: Request, res: Response) => {
  const { campaign_name, meta_campaign_id, platform, status, start_date, end_date, daily_budget, total_budget, content_type, content_description } = req.body;
  const camp = await prisma.metaAdsCampaign.create({
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
    },
  });
  return res.status(201).json({ id: camp.id, message: "Campaign dibuat" });
});

type MetaCostPerResult = string | Array<{ indicator: string; values: Array<{ value: string; attribution_windows: string[] }> }>;

type MetaInsightRow = {
  campaign_id: string; date_start?: string;
  spend: string; impressions: string; reach: string;
  inline_link_clicks: string;
  inline_link_click_ctr: string;
  cpc: string;
  frequency: string;
  cost_per_result: MetaCostPerResult;
  actions?: Array<{ action_type: string; value: string }>;
};

// Meta returns cost_per_result as array of objects (not simple string)
function parseCPR(cpr: MetaCostPerResult): number {
  if (Array.isArray(cpr)) return parseFloat(cpr[0]?.values?.[0]?.value ?? "0") || 0;
  return parseFloat((cpr as string) ?? "0") || 0;
}

// inline_link_clicks = "Klik Tautan" as shown in Meta Ads Manager (excludes likes/shares/profile clicks)
const META_FIELDS = "campaign_id,spend,impressions,reach,inline_link_clicks,inline_link_click_ctr,frequency,cost_per_result,cpc,actions";
const META_ACCOUNT_FIELDS = "spend,impressions,reach,inline_link_clicks,inline_link_click_ctr,cpc,cost_per_result,actions";

// Fetch account-level aggregated totals from Meta (no level grouping)
async function fetchMetaAccountTotals(
  token: string, adAccountId: string, since: string, until: string,
): Promise<MetaInsightRow | null> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = new URL(`https://graph.facebook.com/v19.0/${act}/insights`);
  url.searchParams.set("fields", META_ACCOUNT_FIELDS);
  url.searchParams.set("level", "account");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("access_token", token);
  const resp = await fetch(url.toString());
  const json = await resp.json() as { data?: MetaInsightRow[]; error?: { message: string } };
  if (json.error) throw new Error(`Meta API: ${json.error.message}`);
  return json.data?.[0] ?? null;
}

// Fetch aggregate (no time_increment) — accurate reach/result totals per campaign
async function fetchMetaAggregate(
  token: string, adAccountId: string, since: string, until: string, filterCampaignId?: string,
): Promise<MetaInsightRow[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = new URL(`https://graph.facebook.com/v19.0/${act}/insights`);
  url.searchParams.set("fields", META_FIELDS);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", token);
  if (filterCampaignId) url.searchParams.set("filtering", JSON.stringify([{ field: "campaign.id", operator: "IN", value: [filterCampaignId] }]));
  const resp = await fetch(url.toString());
  const json = await resp.json() as { data?: MetaInsightRow[]; error?: { message: string } };
  if (json.error) throw new Error(`Meta API: ${json.error.message}`);
  return json.data ?? [];
}

// Fetch daily (time_increment=1) — for chart breakdown
async function fetchMetaInsights(
  token: string, adAccountId: string, since: string, until: string, filterCampaignId?: string,
): Promise<MetaInsightRow[]> {
  const act = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = new URL(`https://graph.facebook.com/v19.0/${act}/insights`);
  url.searchParams.set("fields", META_FIELDS);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", token);
  if (filterCampaignId) url.searchParams.set("filtering", JSON.stringify([{ field: "campaign.id", operator: "IN", value: [filterCampaignId] }]));
  const resp = await fetch(url.toString());
  const json = await resp.json() as { data?: MetaInsightRow[]; error?: { message: string } };
  if (json.error) throw new Error(`Meta API: ${json.error.message}`);
  return json.data ?? [];
}

// Result = WhatsApp conversation started (primary objective for messaging campaigns)
const WHATSAPP_ACTIONS = [
  "onsite_conversion.messaging_conversation_started_7d",
  "messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
];

function calcResult(spend: number, costPerResult: number): number {
  return spend > 0 && costPerResult > 0 ? Math.round(spend / costPerResult) : 0;
}

function countWhatsappResult(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0;
  // Pick only the FIRST matching action type (they are the same metric with different names — summing = double-count)
  for (const type of WHATSAPP_ACTIONS) {
    const found = actions.find((a) => a.action_type === type);
    if (found) return parseInt(found.value ?? "0");
  }
  return 0;
}

function getResult(actions: Array<{ action_type: string; value: string }> | undefined, spend: number, costPerResult: number): number {
  // Prefer WhatsApp action count (explicit), fallback to spend/cpr formula
  const wa = countWhatsappResult(actions);
  if (wa > 0) return wa;
  return calcResult(spend, costPerResult);
}

router.get("/meta-ads/campaigns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { start_date, end_date } = req.query;

  const camp = await prisma.metaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });

  // DB-linked counts from Lead table
  const [totalLeads, hotLeads, surveyCount, paidConversions] = await Promise.all([
    prisma.lead.count({ where: { meta_ads_campaign_id: id } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: id, status: "Hot" } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: id, tanggal_survey: { not: null } } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: id, invoices: { some: { status: "Lunas" } } } }),
  ]);

  // Try real-time Meta API
  const metaAccount = await prisma.adPlatformAccount.findFirst({ where: { platform: "Meta", is_active: true } });
  if (metaAccount?.access_token && metaAccount?.ad_account_id && camp.meta_campaign_id) {
    const now = new Date();
    const since = start_date as string || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const until = end_date as string || now.toISOString().slice(0, 10);
    try {
      // Aggregate call → accurate reach (deduplicated) & result (from cost_per_result)
      const [aggRows, dailyRows] = await Promise.all([
        fetchMetaAggregate(metaAccount.access_token, metaAccount.ad_account_id, since, until, camp.meta_campaign_id),
        fetchMetaInsights(metaAccount.access_token, metaAccount.ad_account_id, since, until, camp.meta_campaign_id),
      ]);

      // Summary from aggregate (accurate totals)
      const agg = aggRows[0] ?? {} as MetaInsightRow;
      const totalSpend = parseFloat(agg.spend ?? "0");
      const totalImpressions = parseInt(agg.impressions ?? "0");
      const totalReach = parseInt(agg.reach ?? "0");   // deduplicated unique reach
      const totalClicks = parseInt(agg.inline_link_clicks ?? "0");
      const costPerResult = parseCPR(agg.cost_per_result);
      const totalResult = getResult(agg.actions, totalSpend, costPerResult); // WA clicks first, fallback cpr
      const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      const cpc = parseFloat(agg.cpc ?? "0") || (totalClicks > 0 ? totalSpend / totalClicks : 0);
      const avgCtr = parseFloat(agg.inline_link_click_ctr ?? "0");
      const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

      // Daily rows for chart
      const content_metrics = dailyRows.map((r) => {
        const spend = parseFloat(r.spend ?? "0");
        const impressions = parseInt(r.impressions ?? "0");
        const reach = parseInt(r.reach ?? "0");
        const clicks = parseInt(r.inline_link_clicks ?? "0");
        const cpr = parseCPR(r.cost_per_result);
        return {
          date: r.date_start, spend, impressions, reach, clicks,
          ctr: parseFloat(r.inline_link_click_ctr ?? "0"),
          frequency: parseFloat(r.frequency ?? "0"),
          cost_per_result: cpr,
          conversions: getResult(r.actions, spend, cpr),
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
          cpc: parseFloat(r.cpc ?? "0") || (clicks > 0 ? spend / clicks : 0),
        };
      });

      const dateWhere: Record<string, unknown> = {};
      if (start_date && end_date) dateWhere.date = { gte: new Date(start_date as string), lte: new Date(end_date as string) };
      const chatMetrics = await (prisma as any).whatsappChatMetric.findMany({ where: { meta_ads_campaign_id: id, ...dateWhere } });
      return res.json({
        id: camp.id, campaign_name: camp.campaign_name, meta_campaign_id: camp.meta_campaign_id,
        platform: camp.platform, status: camp.status, created_at: camp.created_at,
        total_spend: totalSpend, total_impressions: totalImpressions, total_reach: totalReach,
        total_clicks: totalClicks, total_result: totalResult,
        cpm, cpc, cpl, avg_ctr: avgCtr,
        total_leads: totalLeads, hot_leads: hotLeads, survey_count: surveyCount, paid_conversions: paidConversions,
        content_metrics, data_source: "realtime",
        chat_metrics: chatMetrics.map((m: any) => ({
          id: m.id, date: m.date, chats_received: m.chats_received, chats_responded: m.chats_responded,
          response_rate: parseFloat(String(m.response_rate ?? 0)),
          total_conversions: m.total_conversions, conversion_rate: parseFloat(String(m.conversion_rate ?? 0)),
        })),
      });
    } catch (err: any) {
      // Fall through to DB fallback
    }
  }

  // Fallback: read from local DB
  const dateWhere: Record<string, unknown> = {};
  if (start_date && end_date) dateWhere.date = { gte: new Date(start_date as string), lte: new Date(end_date as string) };
  const campWithMetrics = await prisma.metaAdsCampaign.findUnique({
    where: { id },
    include: { content_metrics: { where: dateWhere, orderBy: { date: "asc" } }, chat_metrics: { where: dateWhere } },
  });
  const cm = campWithMetrics!.content_metrics;
  const totalSpend = cm.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0);
  const totalImpressions = cm.reduce((s, m) => s + Number(m.impressions ?? 0), 0);
  const totalReach = cm.reduce((s, m) => s + Number(m.reach ?? 0), 0);
  const totalClicks = cm.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalResult = cm.reduce((s, m) => s + (m.conversions ?? 0), 0);
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  return res.json({
    id: camp.id, campaign_name: camp.campaign_name, meta_campaign_id: camp.meta_campaign_id,
    platform: camp.platform, status: camp.status, created_at: camp.created_at,
    total_spend: totalSpend, total_impressions: totalImpressions, total_reach: totalReach,
    total_clicks: totalClicks, total_result: totalResult,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0, cpl,
    avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    total_leads: totalLeads, hot_leads: hotLeads, survey_count: surveyCount, paid_conversions: paidConversions,
    content_metrics: cm.map((m) => ({
      id: m.id, date: m.date,
      impressions: Number(m.impressions ?? 0), reach: Number(m.reach ?? 0),
      clicks: m.clicks ?? 0, spend: parseFloat(String(m.spend ?? 0)),
      ctr: parseFloat(String(m.ctr ?? 0)), frequency: parseFloat(String(m.frequency ?? 0)),
      cost_per_result: parseFloat(String(m.cost_per_result ?? 0)), conversions: m.conversions ?? 0,
      cpm: Number(m.impressions ?? 0) > 0 ? (parseFloat(String(m.spend ?? 0)) / Number(m.impressions ?? 0)) * 1000 : 0,
      cpc: (m.clicks ?? 0) > 0 ? parseFloat(String(m.spend ?? 0)) / (m.clicks ?? 1) : 0,
    })),
    chat_metrics: campWithMetrics!.chat_metrics.map((m) => ({
      id: m.id, date: m.date, chats_received: m.chats_received, chats_responded: m.chats_responded,
      response_rate: parseFloat(String(m.response_rate ?? 0)),
      total_conversions: m.total_conversions, conversion_rate: parseFloat(String(m.conversion_rate ?? 0)),
    })),
    data_source: "local",
  });
});

router.patch("/meta-ads/campaigns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.metaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });
  const { nama_campaign, campaign_id, objective, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (nama_campaign !== undefined) updates.nama_campaign = nama_campaign;
  if (campaign_id !== undefined) updates.campaign_id = campaign_id;
  if (objective !== undefined) updates.objective = objective;
  if (status !== undefined) updates.status = status;
  await prisma.metaAdsCampaign.update({ where: { id }, data: updates });
  return res.json({ message: "Campaign diupdate" });
});

router.delete("/meta-ads/campaigns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.metaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });
  await prisma.metaAdsCampaign.delete({ where: { id } });
  return res.json({ message: "Campaign dihapus" });
});

router.get("/meta-ads/campaigns/:id/content-metrics", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const metrics = await prisma.adContentMetric.findMany({
    where: { meta_ads_campaign_id: id },
    orderBy: { date: "desc" },
  });
  return res.json(
    metrics.map((m) => ({
      id: m.id, date: m.date, impressions: m.impressions, reach: m.reach,
      clicks: m.clicks, spend: parseFloat(String(m.spend ?? 0)),
      likes: m.likes, comments: m.comments, shares: m.shares,
      video_views: m.video_views, conversions: m.conversions,
      ctr: parseFloat(String(m.ctr ?? 0)), cost_per_result: parseFloat(String(m.cost_per_result ?? 0)),
      created_at: m.created_at,
    }))
  );
});

router.post("/meta-ads/campaigns/:id/content-metrics", async (req: Request, res: Response) => {
  const campId = BigInt(req.params.id);
  const { date, impressions, reach, clicks, spend, conversions, likes, comments, shares, video_views } = req.body;
  const clicksN = clicks ?? 0;
  const impressionsN = impressions ?? 0;
  const spendN = spend ?? 0;
  const conversionsN = conversions ?? 0;
  const ctr = impressionsN > 0 ? (clicksN / impressionsN) * 100 : 0;
  const costPerResult = conversionsN > 0 ? spendN / conversionsN : 0;
  await prisma.adContentMetric.create({
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

router.patch("/meta-ads/content-metrics/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.adContentMetric.findUnique({ where: { id } });
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
  const updated = await prisma.adContentMetric.update({ where: { id }, data: updates });
  const clicksN = Number(updated.clicks ?? 0);
  const impressionsN = Number(updated.impressions ?? 0);
  const spendN = parseFloat(String(updated.spend ?? 0));
  const conversionsN = updated.conversions ?? 0;
  await prisma.adContentMetric.update({
    where: { id },
    data: {
      ctr: impressionsN > 0 ? (clicksN / impressionsN) * 100 : 0,
      cost_per_result: conversionsN > 0 ? spendN / conversionsN : 0,
    },
  });
  return res.json({ message: "Metrik diupdate" });
});

router.delete("/meta-ads/content-metrics/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.adContentMetric.findUnique({ where: { id } });
  if (!m) return res.status(404).json({ detail: "Metrik tidak ditemukan" });
  await prisma.adContentMetric.delete({ where: { id } });
  return res.json({ message: "Metrik dihapus" });
});

router.get("/meta-ads/campaigns/:id/chat-metrics", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const metrics = await prisma.whatsappChatMetric.findMany({
    where: { meta_ads_campaign_id: id },
    orderBy: { date: "desc" },
  });
  return res.json(
    metrics.map((m) => ({
      id: m.id, date: m.date, chats_received: m.chats_received, chats_responded: m.chats_responded,
      response_rate: parseFloat(String(m.response_rate ?? 0)),
      avg_response_time: m.avg_response_time,
      total_conversions: m.total_conversions, conversion_rate: parseFloat(String(m.conversion_rate ?? 0)),
      created_at: m.created_at,
    }))
  );
});

router.post("/meta-ads/campaigns/:id/chat-metrics", async (req: Request, res: Response) => {
  const campId = BigInt(req.params.id);
  const { date, chats_received, chats_responded, avg_response_time, total_conversions } = req.body;
  const receivedN = chats_received ?? 0;
  const respondedN = chats_responded ?? 0;
  const conversionsN = total_conversions ?? 0;
  await prisma.whatsappChatMetric.create({
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

router.patch("/meta-ads/chat-metrics/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.whatsappChatMetric.findUnique({ where: { id } });
  if (!m) return res.status(404).json({ detail: "Metrik tidak ditemukan" });
  const b = req.body;
  const updates: Record<string, unknown> = {};
  if (b.date !== undefined) updates.date = new Date(b.date);
  if (b.chats_received !== undefined) updates.chats_received = b.chats_received;
  if (b.chats_responded !== undefined) updates.chats_responded = b.chats_responded;
  if (b.avg_response_time !== undefined) updates.avg_response_time = b.avg_response_time;
  if (b.total_conversions !== undefined) updates.total_conversions = b.total_conversions;
  const updated = await prisma.whatsappChatMetric.update({ where: { id }, data: updates });
  const receivedN = Number(updated.chats_received ?? 0);
  const respondedN = Number(updated.chats_responded ?? 0);
  const conversionsN = Number(updated.total_conversions ?? 0);
  await prisma.whatsappChatMetric.update({
    where: { id },
    data: {
      response_rate: receivedN > 0 ? (respondedN / receivedN) * 100 : undefined,
      conversion_rate: receivedN > 0 ? (conversionsN / receivedN) * 100 : undefined,
    },
  });
  return res.json({ message: "Metrik diupdate" });
});

router.delete("/meta-ads/chat-metrics/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const m = await prisma.whatsappChatMetric.findUnique({ where: { id } });
  if (!m) return res.status(404).json({ detail: "Metrik tidak ditemukan" });
  await prisma.whatsappChatMetric.delete({ where: { id } });
  return res.json({ message: "Metrik dihapus" });
});

router.get("/meta-ads/dashboard", async (req: Request, res: Response) => {
  const { platform, campaign_id, bulan, tahun, start_date, end_date } = req.query;

  // Determine date range
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

  const camps = await prisma.metaAdsCampaign.findMany({
    where: campaignWhere,
    include: { _count: { select: { leads: true } } },
  });
  const campaignIds = camps.map((c) => c.id);

  const [totalLeadsDb, hotLeadsDb, surveyCountDb, paidConversionsDb, lowLeadsDb, mediumLeadsDb] = await Promise.all([
    prisma.lead.count({ where: { meta_ads_campaign_id: { in: campaignIds } } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: { in: campaignIds }, status: "Hot" } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: { in: campaignIds }, tanggal_survey: { not: null } } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: { in: campaignIds }, invoices: { some: { status: "Lunas" } } } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: { in: campaignIds }, status: "Low" } }),
    prisma.lead.count({ where: { meta_ads_campaign_id: { in: campaignIds }, status: "Medium" } }),
  ]);

  // Try real-time Meta API
  const metaAccount = await prisma.adPlatformAccount.findFirst({ where: { platform: "Meta", is_active: true } });
  if (metaAccount?.access_token && metaAccount?.ad_account_id) {
    try {
      // Use aggregate (no time_increment) → accurate deduplicated reach & result per campaign
      const filterCampId = campaign_id
        ? camps.find((c) => c.id === BigInt(campaign_id as string))?.meta_campaign_id ?? undefined
        : undefined;

      const [aggRows, accountTotals] = await Promise.all([
        fetchMetaAggregate(metaAccount.access_token, metaAccount.ad_account_id, since, until, filterCampId ?? undefined),
        // Only fetch account-level totals when not filtering by specific campaign
        !filterCampId ? fetchMetaAccountTotals(metaAccount.access_token, metaAccount.ad_account_id, since, until) : Promise.resolve(null),
      ]);

      // Key aggregate rows by campaign_id (each row = one campaign aggregate)
      const apiAgg: Record<string, MetaInsightRow> = {};
      for (const row of aggRows) apiAgg[row.campaign_id] = row;

      const campaigns = camps.map((c) => {
        const row = c.meta_campaign_id ? apiAgg[c.meta_campaign_id] : undefined;
        const spend = parseFloat(row?.spend ?? "0");
        const impressions = parseInt(row?.impressions ?? "0");
        const reach = parseInt(row?.reach ?? "0");        // accurate unique reach
        const clicks = parseInt((row as any)?.inline_link_clicks ?? "0");
        const cpr = parseCPR(row?.cost_per_result as any);
        const result = getResult(row?.actions, spend, cpr); // WA clicks first, fallback cpr
        return {
          id: Number(c.id), campaign_name: c.campaign_name, platform: c.platform, status: c.status,
          start_date: c.start_date, end_date: c.end_date, leads_count: c._count.leads,
          total_spend: spend, total_clicks: clicks, total_impressions: impressions,
          total_reach: reach, total_result: result,
          avg_ctr: parseFloat(row?.inline_link_click_ctr ?? "0"),
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
          cpc: parseFloat(row?.cpc ?? "0") || (clicks > 0 ? spend / clicks : 0),
        };
      });

      // Use account-level totals from Meta API directly for accuracy (Total Klik & CPC)
      const totalClicks = accountTotals
        ? parseInt(accountTotals.inline_link_clicks ?? "0")
        : campaigns.reduce((s, c) => s + c.total_clicks, 0);
      const totalSpend = accountTotals
        ? parseFloat(accountTotals.spend ?? "0")
        : campaigns.reduce((s, c) => s + c.total_spend, 0);
      const totalImpressions = accountTotals
        ? parseInt(accountTotals.impressions ?? "0")
        : campaigns.reduce((s, c) => s + c.total_impressions, 0);
      const totalReach = accountTotals
        ? parseInt(accountTotals.reach ?? "0")
        : campaigns.reduce((s, c) => s + c.total_reach, 0);
      const totalResult = campaigns.reduce((s, c) => s + c.total_result, 0);
      const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      // Use Meta's own CPC field directly
      const cpc = accountTotals
        ? (parseFloat(accountTotals.cpc ?? "0") || (totalClicks > 0 ? totalSpend / totalClicks : 0))
        : (totalClicks > 0 ? totalSpend / totalClicks : 0);
      // CPL dari data campaign Meta (cost_per_result per campaign) → total_spend / total_result
      const cpl_meta = totalResult > 0 ? totalSpend / totalResult : 0;

      return res.json({
        total_spend: totalSpend, total_clicks: totalClicks, total_impressions: totalImpressions,
        total_reach: totalReach, total_result: totalResult, total_conversions: totalResult,
        avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpm, cpc, cpl: cpl_meta, cpl_meta,
        total_leads_db: totalLeadsDb, hot_leads: hotLeadsDb,
        survey_count: surveyCountDb, paid_conversions: paidConversionsDb,
        low_leads: lowLeadsDb, medium_leads: mediumLeadsDb,
        campaigns, data_source: "realtime",
      });
    } catch (err: any) {
      // Fall through to DB fallback
    }
  }

  // Fallback: read from local DB
  const metricDateWhere: Record<string, unknown> = {};
  metricDateWhere.date = { gte: new Date(since), lte: new Date(until) };
  const campsWithMetrics = await prisma.metaAdsCampaign.findMany({
    where: campaignWhere,
    include: { content_metrics: { where: metricDateWhere }, chat_metrics: { where: metricDateWhere }, _count: { select: { leads: true } } },
  });
  const campaigns = campsWithMetrics.map((c) => {
    const totalSpend = c.content_metrics.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0);
    const totalClicks = c.content_metrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
    const totalImpressions = c.content_metrics.reduce((s, m) => s + Number(m.impressions ?? 0), 0);
    const totalReach = c.content_metrics.reduce((s, m) => s + Number(m.reach ?? 0), 0);
    const totalResult = c.content_metrics.reduce((s, m) => s + (m.conversions ?? 0), 0);
    return {
      id: Number(c.id), campaign_name: c.campaign_name, platform: c.platform,
      status: c.status, start_date: c.start_date, end_date: c.end_date, leads_count: c._count.leads,
      total_spend: totalSpend, total_clicks: totalClicks, total_impressions: totalImpressions,
      total_reach: totalReach, total_result: totalResult,
      avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    };
  });
  const totalImpressions = campaigns.reduce((s, c) => s + c.total_impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.total_clicks, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.total_spend, 0);
  return res.json({
    total_spend: totalSpend, total_clicks: totalClicks, total_impressions: totalImpressions,
    total_reach: campaigns.reduce((s, c) => s + c.total_reach, 0),
    total_result: campaigns.reduce((s, c) => s + c.total_result, 0), total_conversions: 0,
    avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    cpl: 0, cpl_meta: 0,
    total_leads_db: totalLeadsDb, hot_leads: hotLeadsDb,
    survey_count: surveyCountDb, paid_conversions: paidConversionsDb,
    low_leads: lowLeadsDb, medium_leads: mediumLeadsDb,
    campaigns, data_source: "local",
  });
});

router.post("/meta-ads/campaigns/:id/sync", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const camp = await prisma.metaAdsCampaign.findUnique({ where: { id } });
  if (!camp) return res.status(404).json({ detail: "Campaign tidak ditemukan" });
  const { config } = await import("../config");
  if (!config.metaAdsAccessToken || !camp.meta_campaign_id) {
    return res.json({ synced: 0, message: "Meta Ads API belum dikonfigurasi. Isi META_ADS_ACCESS_TOKEN dan meta_campaign_id di .env" });
  }
  return res.json({ synced: 0, message: "Sync tidak tersedia di Express backend" });
});

// ── AD PLATFORM ACCOUNTS ──────────────────────────────────────────────────────

router.get("/ads/accounts", async (_req: Request, res: Response) => {
  const accounts = await prisma.adPlatformAccount.findMany({ orderBy: [{ platform: "asc" }, { id: "asc" }] });
  return res.json(accounts.map((a) => ({
    id: Number(a.id),
    platform: a.platform,
    account_name: a.account_name,
    app_id: a.app_id,
    app_secret: a.app_secret ? "••••••" : null,
    access_token: a.access_token ? "••••••" : null,
    pixel_id: a.pixel_id,
    ad_account_id: a.ad_account_id,
    advertiser_id: a.advertiser_id,
    is_active: a.is_active,
    last_synced_at: a.last_synced_at,
    token_refreshed_at: a.token_refreshed_at,
    created_at: a.created_at,
  })));
});

router.post("/ads/accounts", async (req: Request, res: Response) => {
  const { platform, account_name, app_id, app_secret, access_token, pixel_id, ad_account_id, advertiser_id } = req.body;
  const acc = await prisma.adPlatformAccount.create({
    data: { platform, account_name, app_id: app_id ?? null, app_secret: app_secret ?? null, access_token: access_token ?? null, pixel_id: pixel_id ?? null, ad_account_id: ad_account_id ?? null, advertiser_id: advertiser_id ?? null },
  });
  return res.status(201).json({ id: Number(acc.id), message: "Akun dibuat" });
});

router.patch("/ads/accounts/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { platform, account_name, app_id, app_secret, access_token, pixel_id, ad_account_id, advertiser_id, is_active } = req.body;
  const updates: Record<string, unknown> = {};
  if (platform !== undefined) updates.platform = platform;
  if (account_name !== undefined) updates.account_name = account_name;
  if (app_id !== undefined) updates.app_id = app_id;
  if (app_secret !== undefined && app_secret !== "••••••") updates.app_secret = app_secret;
  if (access_token !== undefined && access_token !== "••••••") updates.access_token = access_token;
  if (pixel_id !== undefined) updates.pixel_id = pixel_id;
  if (ad_account_id !== undefined) updates.ad_account_id = ad_account_id;
  if (advertiser_id !== undefined) updates.advertiser_id = advertiser_id;
  if (is_active !== undefined) updates.is_active = is_active;
  await prisma.adPlatformAccount.update({ where: { id }, data: updates });
  return res.json({ message: "Akun diupdate" });
});

router.delete("/ads/accounts/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.adPlatformAccount.delete({ where: { id } });
  return res.json({ message: "Akun dihapus" });
});

// ── DEBUG META RAW RESPONSE ───────────────────────────────────────────────────
router.get("/ads/accounts/debug-meta", async (req: Request, res: Response) => {
  const account = await prisma.adPlatformAccount.findFirst({ where: { platform: "Meta", is_active: true } });
  if (!account?.access_token || !account?.ad_account_id) return res.json({ error: "Akun tidak ada" });
  const since = (req.query.since as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const until = (req.query.until as string) || new Date().toISOString().slice(0, 10);
  const act = account.ad_account_id.startsWith("act_") ? account.ad_account_id : `act_${account.ad_account_id}`;
  const url = new URL(`https://graph.facebook.com/v19.0/${act}/insights`);
  url.searchParams.set("fields", META_FIELDS);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("limit", "10");
  url.searchParams.set("access_token", account.access_token);
  const resp = await fetch(url.toString());
  const data = await resp.json();
  return res.json({ since, until, raw: data });
});

// ── TEST META CONNECTION ───────────────────────────────────────────────────────
router.get("/ads/accounts/test-meta", async (_req: Request, res: Response) => {
  const account = await prisma.adPlatformAccount.findFirst({ where: { platform: "Meta", is_active: true } });
  if (!account) return res.json({ ok: false, error: "Tidak ada akun Meta aktif di database" });
  if (!account.access_token) return res.json({ ok: false, error: "Access token kosong" });
  if (!account.ad_account_id) return res.json({ ok: false, error: "Ad Account ID kosong" });

  const act = account.ad_account_id.startsWith("act_") ? account.ad_account_id : `act_${account.ad_account_id}`;
  const url = new URL(`https://graph.facebook.com/v19.0/${act}`);
  url.searchParams.set("fields", "id,name,currency,account_status");
  url.searchParams.set("access_token", account.access_token);

  const resp = await fetch(url.toString());
  const data = await resp.json() as { id?: string; name?: string; currency?: string; account_status?: number; error?: { message: string; code: number } };
  if (data.error) return res.json({ ok: false, error: data.error.message, code: data.error.code });
  return res.json({ ok: true, account_id: data.id, account_name: data.name, currency: data.currency });
});

// ── REFRESH META TOKEN ────────────────────────────────────────────────────────
// POST /ads/accounts/:id/refresh-token
// Exchanges current short-lived token for a new long-lived token (~60 days)
// Requires app_id + app_secret + access_token stored on the account
router.post("/ads/accounts/:id/refresh-token", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const account = await prisma.adPlatformAccount.findUnique({ where: { id } });
  if (!account) return res.status(404).json({ detail: "Akun tidak ditemukan" });
  if (account.platform !== "Meta") return res.status(400).json({ detail: "Refresh token hanya untuk platform Meta" });
  if (!account.app_id || !account.app_secret || !account.access_token) {
    return res.status(400).json({ detail: "app_id, app_secret, dan access_token harus diisi terlebih dahulu" });
  }

  const url = new URL("https://graph.facebook.com/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", account.app_id);
  url.searchParams.set("client_secret", account.app_secret);
  url.searchParams.set("fb_exchange_token", account.access_token);

  const resp = await fetch(url.toString());
  const data = await resp.json() as { access_token?: string; token_type?: string; expires_in?: number; error?: { message: string } };
  if (data.error) return res.status(400).json({ detail: `Meta API: ${data.error.message}` });
  if (!data.access_token) return res.status(400).json({ detail: "Tidak mendapat token baru dari Meta" });

  await prisma.adPlatformAccount.update({
    where: { id },
    data: { access_token: data.access_token, token_refreshed_at: new Date() },
  });

  const expiresInDays = data.expires_in ? Math.floor(data.expires_in / 86400) : null;
  return res.json({
    message: `Token berhasil diperbarui${expiresInDays ? `, berlaku ${expiresInDays} hari` : ""}`,
    expires_in_days: expiresInDays,
  });
});

// ── SYNC ACCOUNT ──────────────────────────────────────────────────────────────

router.post("/ads/accounts/:id/sync", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const { bulan, tahun } = req.query;

  const account = await prisma.adPlatformAccount.findUnique({ where: { id } });
  if (!account) return res.status(404).json({ detail: "Akun tidak ditemukan" });

  const now = new Date();
  const m = bulan ? parseInt(bulan as string) : now.getMonth() + 1;
  const y = tahun ? parseInt(tahun as string) : now.getFullYear();
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let synced = 0;

  if (account.platform === "Meta") {
    if (!account.access_token || !account.ad_account_id) {
      return res.status(400).json({ detail: "Access Token dan Ad Account ID harus diisi terlebih dahulu" });
    }
    const adAccountId = account.ad_account_id.startsWith("act_") ? account.ad_account_id : `act_${account.ad_account_id}`;
    const token = account.access_token;

    // 1. Fetch campaigns
    const campUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/campaigns`);
    campUrl.searchParams.set("fields", "id,name,status,objective");
    campUrl.searchParams.set("access_token", token);
    campUrl.searchParams.set("limit", "500");
    const campResp = await fetch(campUrl.toString());
    const campData = await campResp.json() as { data?: Array<{ id: string; name: string; status: string; objective?: string }>; error?: { message: string } };
    if (campData.error) return res.status(400).json({ detail: `Meta API: ${campData.error.message}` });

    const campaignIdMap: Record<string, bigint> = {};
    for (const c of campData.data ?? []) {
      const existing = await prisma.metaAdsCampaign.findFirst({ where: { meta_campaign_id: c.id, platform: "Meta" } });
      if (existing) {
        await prisma.metaAdsCampaign.update({ where: { id: existing.id }, data: { campaign_name: c.name, status: c.status, data_source: "api" } });
        campaignIdMap[c.id] = existing.id;
      } else {
        const created = await prisma.metaAdsCampaign.create({
          data: { campaign_name: c.name, meta_campaign_id: c.id, platform: "Meta", status: c.status, data_source: "api", created_by: req.user!.id },
        });
        campaignIdMap[c.id] = created.id;
      }
    }

    // 2. Fetch daily insights
    const insUrl = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/insights`);
    insUrl.searchParams.set("fields", "campaign_id,spend,impressions,reach,clicks,ctr,frequency,cost_per_result,actions");
    insUrl.searchParams.set("level", "campaign");
    insUrl.searchParams.set("time_increment", "1");
    insUrl.searchParams.set("time_range", JSON.stringify({ since: startDate, until: endDate }));
    insUrl.searchParams.set("access_token", token);
    insUrl.searchParams.set("limit", "500");
    const insResp = await fetch(insUrl.toString());
    const insData = await insResp.json() as {
      data?: Array<{
        campaign_id: string; date_start: string;
        spend: string; impressions: string; reach?: string; clicks: string;
        ctr?: string; frequency?: string; cost_per_result?: string;
        actions?: Array<{ action_type: string; value: string }>;
      }>;
      error?: { message: string };
    };
    if (insData.error) return res.status(400).json({ detail: `Meta Insights: ${insData.error.message}` });

    for (const row of insData.data ?? []) {
      const dbId = campaignIdMap[row.campaign_id];
      if (!dbId) continue;
      const date = new Date(row.date_start);
      const conversions = (row.actions ?? [])
        .filter((a) => [
          "offsite_conversion.fb_pixel_purchase", "purchase", "complete_registration", "lead",
          "onsite_conversion.messaging_conversation_started_7d",
          "messaging_conversation_started_7d", "onsite_conversion.lead_grouped",
        ].includes(a.action_type))
        .reduce((s, a) => s + parseInt(a.value ?? "0"), 0);
      const data = {
        spend: parseFloat(row.spend ?? "0"),
        impressions: BigInt(row.impressions ?? "0"),
        reach: BigInt(row.reach ?? "0"),
        clicks: parseInt((row as any).inline_link_clicks ?? "0"),
        ctr: parseFloat((row as any).inline_link_click_ctr ?? "0"),
        frequency: parseFloat(row.frequency ?? "0"),
        cost_per_result: parseCPR(row?.cost_per_result as any),
        conversions,
        data_source: "api",
      };
      const existing = await prisma.adContentMetric.findFirst({ where: { meta_ads_campaign_id: dbId, date } });
      if (existing) {
        await prisma.adContentMetric.update({ where: { id: existing.id }, data });
      } else {
        await prisma.adContentMetric.create({ data: { meta_ads_campaigns: { connect: { id: dbId } }, date, ...data } });
      }
      synced++;
    }

    await prisma.adPlatformAccount.update({ where: { id }, data: { last_synced_at: new Date() } });

  } else if (account.platform === "TikTok") {
    if (!account.access_token || !account.advertiser_id) {
      return res.status(400).json({ detail: "Access Token dan Advertiser ID harus diisi terlebih dahulu" });
    }
    const token = account.access_token;
    const advertiserId = account.advertiser_id;

    // 1. Fetch campaigns
    const campUrl = new URL("https://business-api.tiktok.com/open_api/v1.3/campaign/get/");
    campUrl.searchParams.set("advertiser_id", advertiserId);
    campUrl.searchParams.set("fields", JSON.stringify(["campaign_id", "campaign_name", "status"]));
    campUrl.searchParams.set("page_size", "100");
    const campResp = await fetch(campUrl.toString(), { headers: { "Access-Token": token } });
    const campData = await campResp.json() as { code: number; data?: { list?: Array<{ campaign_id: string; campaign_name: string; status: string }> }; message?: string };
    if (campData.code !== 0) return res.status(400).json({ detail: `TikTok API: ${campData.message}` });

    const campaignIdMap: Record<string, bigint> = {};
    for (const c of campData.data?.list ?? []) {
      const existing = await prisma.metaAdsCampaign.findFirst({ where: { meta_campaign_id: c.campaign_id, platform: "TikTok" } });
      if (existing) {
        await prisma.metaAdsCampaign.update({ where: { id: existing.id }, data: { campaign_name: c.campaign_name, status: c.status, data_source: "api" } });
        campaignIdMap[c.campaign_id] = existing.id;
      } else {
        const created = await prisma.metaAdsCampaign.create({
          data: { campaign_name: c.campaign_name, meta_campaign_id: c.campaign_id, platform: "TikTok", status: c.status, data_source: "api", created_by: req.user!.id },
        });
        campaignIdMap[c.campaign_id] = created.id;
      }
    }

    // 2. Fetch reports
    const repUrl = new URL("https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/");
    repUrl.searchParams.set("advertiser_id", advertiserId);
    repUrl.searchParams.set("report_type", "BASIC");
    repUrl.searchParams.set("data_level", "AUCTION_CAMPAIGN");
    repUrl.searchParams.set("dimensions", JSON.stringify(["campaign_id", "stat_time_day"]));
    repUrl.searchParams.set("metrics", JSON.stringify(["spend", "impressions", "reach", "clicks", "ctr", "frequency", "conversion"]));
    repUrl.searchParams.set("start_date", startDate);
    repUrl.searchParams.set("end_date", endDate);
    repUrl.searchParams.set("page_size", "1000");
    const repResp = await fetch(repUrl.toString(), { headers: { "Access-Token": token } });
    const repData = await repResp.json() as {
      code: number;
      data?: { list?: Array<{ dimensions: { campaign_id: string; stat_time_day: string }; metrics: { spend: string; impressions: string; reach: string; clicks: string; ctr: string; frequency: string; conversion: string } }> };
      message?: string;
    };
    if (repData.code !== 0) return res.status(400).json({ detail: `TikTok Report: ${repData.message}` });

    for (const row of repData.data?.list ?? []) {
      const dbId = campaignIdMap[row.dimensions.campaign_id];
      if (!dbId) continue;
      const date = new Date(row.dimensions.stat_time_day);
      const mx = row.metrics;
      const data = {
        spend: parseFloat(mx.spend ?? "0"),
        impressions: BigInt(mx.impressions ?? "0"),
        reach: BigInt(mx.reach ?? "0"),
        clicks: parseInt(mx.clicks ?? "0"),
        ctr: parseFloat(mx.ctr ?? "0"),
        frequency: parseFloat(mx.frequency ?? "0"),
        conversions: parseInt(mx.conversion ?? "0"),
        data_source: "api",
      };
      const existing = await prisma.adContentMetric.findFirst({ where: { meta_ads_campaign_id: dbId, date } });
      if (existing) {
        await prisma.adContentMetric.update({ where: { id: existing.id }, data });
      } else {
        await prisma.adContentMetric.create({ data: { meta_ads_campaigns: { connect: { id: dbId } }, date, ...data } });
      }
      synced++;
    }

    await prisma.adPlatformAccount.update({ where: { id }, data: { last_synced_at: new Date() } });

  } else {
    return res.status(400).json({ detail: `Platform tidak didukung: ${account.platform}` });
  }

  return res.json({ synced, message: `Berhasil sync ${synced} data metrik` });
});

// ── AD MONTHLY TARGETS ────────────────────────────────────────────────────────

router.get("/ads/targets", async (req: Request, res: Response) => {
  const { platform, bulan, tahun } = req.query;
  const where: Record<string, unknown> = {};
  if (platform) where.platform = platform;
  if (bulan) where.bulan = parseInt(bulan as string);
  if (tahun) where.tahun = parseInt(tahun as string);
  const targets = await prisma.adMonthlyTarget.findMany({ where, orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { platform: "asc" }] });
  return res.json(targets.map((t) => ({
    id: Number(t.id),
    platform: t.platform,
    bulan: t.bulan,
    tahun: t.tahun,
    target_spend: t.target_spend != null ? parseFloat(String(t.target_spend)) : null,
    target_impressions: t.target_impressions != null ? Number(t.target_impressions) : null,
    target_clicks: t.target_clicks,
    target_conversions: t.target_conversions,
    target_ctr: t.target_ctr != null ? parseFloat(String(t.target_ctr)) : null,
    target_roas: t.target_roas != null ? parseFloat(String(t.target_roas)) : null,
  })));
});

router.post("/ads/targets", async (req: Request, res: Response) => {
  const { platform, bulan, tahun, target_spend, target_impressions, target_clicks, target_conversions, target_ctr, target_roas } = req.body;
  const target = await prisma.adMonthlyTarget.upsert({
    where: { platform_bulan_tahun: { platform, bulan, tahun } },
    update: {
      target_spend: target_spend ?? undefined,
      target_impressions: target_impressions ?? undefined,
      target_clicks: target_clicks ?? undefined,
      target_conversions: target_conversions ?? undefined,
      target_ctr: target_ctr ?? undefined,
      target_roas: target_roas ?? undefined,
    },
    create: { platform, bulan, tahun, target_spend: target_spend ?? null, target_impressions: target_impressions ?? null, target_clicks: target_clicks ?? null, target_conversions: target_conversions ?? null, target_ctr: target_ctr ?? null, target_roas: target_roas ?? null },
  });
  return res.status(201).json({ id: Number(target.id), message: "Target disimpan" });
});

router.delete("/ads/targets/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  await prisma.adMonthlyTarget.delete({ where: { id } });
  return res.json({ message: "Target dihapus" });
});

// ── KANBAN (BD) ───────────────────────────────────────────────────────────────

async function getBdBoard() {
  return prisma.kanbanColumn.findMany({
    include: {
      cards: {
        include: { labels: true, assigned_user: true, comments: true },
      },
    },
    orderBy: { urutan: "asc" },
  });
}

function boardCols(cols: Awaited<ReturnType<typeof getBdBoard>>) {
  return cols.map((col) => ({
    id: col.id, title: col.title, urutan: col.urutan, color: col.color ?? "#e2e8f0",
    cards: col.cards.map((c) => ({
      id: c.id, title: c.title, description: c.description, deadline: c.deadline,
      urutan: c.urutan, color: c.color,
      assigned_user: c.assigned_user ? { id: c.assigned_user.id, name: c.assigned_user.name } : null,
      labels: c.labels.map((lb) => ({ id: lb.id, label_name: lb.label_name, color: lb.color })),
      comments_count: c.comments.length, created_at: c.created_at,
    })),
  }));
}

router.get("/kanban", async (_req: Request, res: Response) => {
  const cols = await getBdBoard();
  return res.json({ columns: boardCols(cols) });
});

router.get("/kanban/columns", async (_req: Request, res: Response) => {
  const cols = await getBdBoard();
  return res.json(boardCols(cols));
});

router.post("/kanban/columns", async (req: Request, res: Response) => {
  const { title, urutan, color } = req.body;
  const col = await prisma.kanbanColumn.create({
    data: { title, urutan: urutan ?? 0, color: color ?? "#e2e8f0" },
  });
  return res.status(201).json({ id: col.id, message: "Kolom dibuat" });
});

router.patch("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.kanbanColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  const { title, urutan, color } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (urutan !== undefined) updates.urutan = urutan;
  if (color !== undefined) updates.color = color;
  await prisma.kanbanColumn.update({ where: { id }, data: updates });
  return res.json({ message: "Kolom diupdate" });
});

router.delete("/kanban/columns/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const col = await prisma.kanbanColumn.findUnique({ where: { id } });
  if (!col) return res.status(404).json({ detail: "Kolom tidak ditemukan" });
  await prisma.kanbanColumn.delete({ where: { id } });
  return res.json({ message: "Kolom dihapus" });
});

router.post("/kanban/cards", async (req: Request, res: Response) => {
  const { column_id, title, description, deadline, assigned_user_id, color, urutan } = req.body;
  const card = await prisma.kanbanCard.create({
    data: {
      column_id, title, description: description ?? null,
      deadline: deadline ? new Date(deadline) : null,
      assigned_user_id: assigned_user_id ?? null,
      color: color ?? null, urutan: urutan ?? 0,
    },
  });
  return res.status(201).json({ id: card.id, message: "Card dibuat" });
});

router.patch("/kanban/cards/:id/move", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.kanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  await prisma.kanbanCard.update({ where: { id }, data: { column_id: req.body.column_id, urutan: req.body.position ?? 0 } });
  return res.json({ message: "Card dipindah" });
});

router.patch("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.kanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  const { column_id, title, description, deadline, assigned_user_id, color, urutan } = req.body;
  const updates: Record<string, unknown> = {};
  if (column_id !== undefined) updates.column_id = column_id;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;
  if (assigned_user_id !== undefined) updates.assigned_user_id = assigned_user_id;
  if (color !== undefined) updates.color = color;
  if (urutan !== undefined) updates.urutan = urutan;
  await prisma.kanbanCard.update({ where: { id }, data: updates });
  return res.json({ message: "Card diupdate" });
});

router.delete("/kanban/cards/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const card = await prisma.kanbanCard.findUnique({ where: { id } });
  if (!card) return res.status(404).json({ detail: "Card tidak ditemukan" });
  await prisma.kanbanCard.delete({ where: { id } });
  return res.json({ message: "Card dihapus" });
});

router.post("/kanban/cards/:id/comments", async (req: Request, res: Response) => {
  const cardId = BigInt(req.params.id);
  const comment = await prisma.kanbanComment.create({
    data: { card_id: cardId, comment: req.body.body, user_id: req.user!.id },
  });
  return res.status(201).json({ id: comment.id, message: "Komentar ditambahkan" });
});

router.delete("/kanban/comments/:id", async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const c = await prisma.kanbanComment.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ detail: "Komentar tidak ditemukan" });
  await prisma.kanbanComment.delete({ where: { id } });
  return res.json({ message: "Komentar dihapus" });
});

router.get("/kanban/metrics", async (req: Request, res: Response) => {
  const now = new Date();
  const year = parseInt(req.query.year as string) || now.getFullYear();
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
  const cols = await getBdBoard();

  const byColumn = cols.map((col) => ({
    column_id: col.id, title: col.title, color: col.color ?? "#e2e8f0", count: col.cards.length,
  }));
  const total = byColumn.reduce((s, c) => s + c.count, 0);

  const lastDay = new Date(year, month, 0).getDate();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month - 1, lastDay, 23, 59, 59);
  const monthlyCards = await prisma.kanbanCard.findMany({
    where: { created_at: { gte: start, lte: end } },
  });

  const daily: Record<number, number> = {};
  for (let d = 1; d <= lastDay; d++) daily[d] = 0;
  for (const card of monthlyCards) {
    const day = card.created_at ? new Date(card.created_at).getDate() : 0;
    if (day) daily[day] = (daily[day] ?? 0) + 1;
  }
  const timeline = Object.entries(daily).map(([d, c]) => ({ day: parseInt(d), count: c }));

  return res.json({
    summary: { total, this_month: monthlyCards.length },
    by_column: byColumn, timeline,
  });
});

router.get("/kanban/labels", async (_req: Request, res: Response) => {
  return res.json([]);
});

router.post("/kanban/labels", async (_req: Request, res: Response) => {
  return res.status(201).json({ message: "Label dibuat" });
});

// ── MODULAR LEADS (sales-admin / telemarketing) ───────────────────────────────

const VALID_MODUL = new Set(["sales-admin", "telemarketing", "database-client", "golden"]);

function validateModul(modul: string, res: Response): boolean {
  if (!VALID_MODUL.has(modul)) {
    res.status(404).json({ detail: "Modul tidak ditemukan" });
    return false;
  }
  return true;
}

router.get("/:modul/leads", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;

  const { page, limit, skip } = getPagination(req.query, 20, 10000);
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const jenis = req.query.jenis as string | undefined;
  const rencana_survey = req.query.rencana_survey as string | undefined;
  const bulan = req.query.bulan as string | undefined;
  const tahun = req.query.tahun as string | undefined;
  const tanggal_mulai = req.query.tanggal_mulai as string | undefined;
  const tanggal_selesai = req.query.tanggal_selesai as string | undefined;

  const where: Record<string, unknown> = { modul };
  if (search) where.nama = { contains: search, mode: "insensitive" };
  if (status) where.status = status;
  if (jenis) where.jenis = jenis;
  if (rencana_survey) where.rencana_survey = rencana_survey;

  // Date filter on created_at
  if (tanggal_mulai || tanggal_selesai) {
    const dateFilter: Record<string, Date> = {};
    if (tanggal_mulai) dateFilter.gte = new Date(tanggal_mulai);
    if (tanggal_selesai) {
      const d = new Date(tanggal_selesai);
      d.setHours(23, 59, 59, 999);
      dateFilter.lte = d;
    }
    where.created_at = dateFilter;
  } else if (bulan || tahun) {
    const y = tahun ? parseInt(tahun) : new Date().getFullYear();
    if (bulan) {
      const m = parseInt(bulan) - 1;
      where.created_at = { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    } else {
      where.created_at = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59, 999) };
    }
  }

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        user: true,
        _count: { select: { follow_ups: true } },
        follow_ups: {
          orderBy: { tanggal: "desc" },
          take: 1,
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return res.json(paginateResponse(leads.map(leadDict), total, page, limit));
});

// GET /:modul/leads/follow-up-report — must be BEFORE /:id to avoid route collision
router.get("/:modul/leads/follow-up-report", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;

  const where: Record<string, unknown> = { modul };
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const jenis = req.query.jenis as string | undefined;
  const sumber = req.query.sumber as string | undefined;
  const bulan = req.query.bulan as string | undefined;
  const tahun = req.query.tahun as string | undefined;
  const tanggal_mulai = req.query.tanggal_mulai as string | undefined;
  const tanggal_selesai = req.query.tanggal_selesai as string | undefined;
  if (search) where.nama = { contains: search, mode: "insensitive" };
  if (status) where.status = status;
  if (jenis) where.jenis = jenis;
  if (sumber) where.sumber_leads = sumber;
  if (tanggal_mulai || tanggal_selesai) {
    const dateFilter: Record<string, Date> = {};
    if (tanggal_mulai) dateFilter.gte = new Date(tanggal_mulai);
    if (tanggal_selesai) { const d = new Date(tanggal_selesai); d.setHours(23, 59, 59, 999); dateFilter.lte = d; }
    where.created_at = dateFilter;
  } else if (bulan || tahun) {
    const y = tahun ? parseInt(tahun) : new Date().getFullYear();
    if (bulan) {
      const m = parseInt(bulan) - 1;
      where.created_at = { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    } else {
      where.created_at = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59, 999) };
    }
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      user: true,
      follow_ups: {
        orderBy: { tanggal: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { id: "desc" },
  });

  return res.json(leads.map((l) => ({
    ...leadDict(l),
    follow_ups: l.follow_ups.map((f) => ({
      id: f.id,
      tanggal: f.tanggal,
      catatan: f.catatan,
      next_follow_up: f.next_follow_up,
      user: f.user ? { name: f.user.name } : null,
    })),
  })));
});

router.get("/:modul/leads/:id", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findFirst({
    where: { id, modul },
    include: { user: true, follow_ups: true },
  });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  const d = leadDict(lead);
  return res.json({
    ...d,
    follow_ups: lead.follow_ups.map((f) => ({
      id: f.id, tanggal: f.tanggal, catatan: f.catatan, next_follow_up: f.next_follow_up,
    })),
  });
});

router.post("/:modul/leads", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const b = req.body;
  const lead = await prisma.lead.create({
    data: {
      user_id: req.user!.id,
      modul,
      nama: b.nama,
      nomor_telepon: b.nomor_telepon ?? null,
      alamat: b.alamat ?? null,
      sumber_leads: b.sumber_leads ?? null,
      meta_ads_campaign_id: b.meta_ads_campaign_id ? BigInt(b.meta_ads_campaign_id) : null,
      tanggal_masuk: b.tanggal_masuk ? new Date(b.tanggal_masuk) : null,
      keterangan: b.keterangan ?? null,
      jenis: b.jenis ?? null,
      week: b.week != null ? parseInt(b.week) : null,
      status: b.status ?? "Low",
      tipe: b.tipe ?? null,
      bulan: b.bulan != null ? parseInt(b.bulan) : null,
      tahun: b.tahun != null ? parseInt(b.tahun) : null,
      rencana_survey: b.rencana_survey ?? "Tidak",
      tanggal_survey: b.tanggal_survey ? new Date(b.tanggal_survey) : null,
      pic_survey: b.pic_survey ?? null,
      survey_approval_status: b.survey_approval_status ?? null,
      jam_survey: b.jam_survey ?? null,
      projection: b.projection ?? null,
    },
  });

  // Auto-add ke Kanban jika projection diisi
  if (b.projection && (modul === "sales-admin" || modul === "telemarketing")) {
    const now = new Date();
    const bln = b.bulan != null ? parseInt(b.bulan) : now.getMonth() + 1;
    const thn = b.tahun != null ? parseInt(b.tahun) : now.getFullYear();
    if (modul === "sales-admin") {
      let col = await prisma.adminKanbanColumn.findFirst({ where: { title: b.projection, bulan: bln, tahun: thn } });
      if (col) {
        await prisma.adminKanbanCard.create({
          data: { column_id: col.id, title: lead.nama, lead_id: lead.id, urutan: 0 },
        });
      }
    } else {
      let col = await prisma.telemarketingKanbanColumn.findFirst({ where: { title: b.projection, bulan: bln, tahun: thn } });
      if (col) {
        await prisma.telemarketingKanbanCard.create({
          data: { column_id: col.id, title: lead.nama, lead_id: lead.id, urutan: 0 },
        });
      }
    }
  }

  return res.status(201).json({ id: lead.id, nama: lead.nama, message: "Lead berhasil dibuat" });
});

router.patch("/:modul/leads/:id", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findFirst({ where: { id, modul } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  const b = req.body;
  const updates: Record<string, unknown> = {};
  if (b.nama !== undefined) updates.nama = b.nama;
  if (b.nomor_telepon !== undefined) updates.nomor_telepon = b.nomor_telepon;
  if (b.alamat !== undefined) updates.alamat = b.alamat;
  if (b.sumber_leads !== undefined) updates.sumber_leads = b.sumber_leads;
  if (b.meta_ads_campaign_id !== undefined) updates.meta_ads_campaign_id = b.meta_ads_campaign_id ? BigInt(b.meta_ads_campaign_id) : null;
  if (b.tanggal_masuk !== undefined) updates.tanggal_masuk = b.tanggal_masuk ? new Date(b.tanggal_masuk) : null;
  if (b.keterangan !== undefined) updates.keterangan = b.keterangan;
  if (b.jenis !== undefined) updates.jenis = b.jenis;
  if (b.week !== undefined) updates.week = b.week != null ? parseInt(b.week) : null;
  if (b.status !== undefined) updates.status = b.status;
  if (b.tipe !== undefined) updates.tipe = b.tipe;
  if (b.bulan !== undefined) updates.bulan = b.bulan != null ? parseInt(b.bulan) : null;
  if (b.tahun !== undefined) updates.tahun = b.tahun != null ? parseInt(b.tahun) : null;
  if (b.rencana_survey !== undefined) updates.rencana_survey = b.rencana_survey;
  if (b.tanggal_survey !== undefined) updates.tanggal_survey = b.tanggal_survey ? new Date(b.tanggal_survey) : null;
  if (b.pic_survey !== undefined) updates.pic_survey = b.pic_survey;
  if (b.survey_approval_status !== undefined) updates.survey_approval_status = b.survey_approval_status;
  if (b.jam_survey !== undefined) updates.jam_survey = b.jam_survey;
  if (b.projection !== undefined) updates.projection = b.projection;
  const updatedLead = await prisma.lead.update({ where: { id }, data: updates, select: { id: true, nama: true, bulan: true, tahun: true, tanggal_survey: true } });

  // Auto-add ke Kanban jika projection diisi/berubah
  if (b.projection && (modul === "sales-admin" || modul === "telemarketing")) {
    const now = new Date();
    const bln = updatedLead.bulan != null ? updatedLead.bulan : now.getMonth() + 1;
    const thn = updatedLead.tahun != null ? updatedLead.tahun : now.getFullYear();
    if (modul === "sales-admin") {
      const col = await prisma.adminKanbanColumn.findFirst({ where: { title: b.projection, bulan: bln, tahun: thn } });
      if (col) {
        const exists = await prisma.adminKanbanCard.findFirst({ where: { column_id: col.id, lead_id: updatedLead.id } });
        if (!exists) {
          await prisma.adminKanbanCard.create({ data: { column_id: col.id, title: updatedLead.nama, lead_id: updatedLead.id, urutan: 0 } });
        }
      }
    } else {
      const col = await prisma.telemarketingKanbanColumn.findFirst({ where: { title: b.projection, bulan: bln, tahun: thn } });
      if (col) {
        const exists = await prisma.telemarketingKanbanCard.findFirst({ where: { column_id: col.id, lead_id: updatedLead.id } });
        if (!exists) {
          await prisma.telemarketingKanbanCard.create({ data: { column_id: col.id, title: updatedLead.nama, lead_id: updatedLead.id, urutan: 0 } });
        }
      }
    }
  }

  // Notify PIC via WhatsApp if survey and pic_survey both set in this update
  if (b.pic_survey && b.tanggal_survey) {
    const picUser = await prisma.user.findFirst({ where: { name: b.pic_survey }, select: { whatsapp_number: true } });
    if (picUser?.whatsapp_number) {
      const calendarPath = modul === "telemarketing" ? "telemarketing/kalender-survey" : "sales-admin/kalender-survey";
      const msg = `📅 *Assign Survey Baru*\n\nAnda ditugaskan sebagai PIC Survey:\n*Klien:* ${updatedLead.nama}\n*Tanggal:* ${b.tanggal_survey}\n*Jam:* ${b.jam_survey ?? "-"}\n\n🔗 ${FRONTEND_URL}/${calendarPath}`;
      sendFonnte(picUser.whatsapp_number, msg).catch(() => {});
    }
  }

  return res.json({ message: "Lead berhasil diupdate" });
});

router.delete("/:modul/leads/:id", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findFirst({ where: { id, modul } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  await prisma.lead.delete({ where: { id } });
  return res.json({ message: "Lead berhasil dihapus" });
});

// GET /:modul/leads/:id/follow-up — history follow up untuk 1 lead
router.get("/:modul/leads/:id/follow-up", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const leadId = BigInt(req.params.id);
  const items = await prisma.followUpClient.findMany({
    where: { lead_id: leadId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { tanggal: "desc" },
  });
  return res.json(items.map((f) => ({
    id: f.id,
    tanggal: f.tanggal,
    catatan: f.catatan,
    next_follow_up: f.next_follow_up,
    user: f.user ? { id: f.user.id, name: f.user.name } : null,
    created_at: f.created_at,
  })));
});

router.post("/:modul/leads/:id/follow-up", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const leadId = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  await prisma.followUpClient.create({
    data: {
      lead_id: leadId, user_id: req.user!.id,
      tanggal: new Date(),
      catatan: req.body.catatan ?? null,
      next_follow_up: req.body.next_follow_up ? new Date(req.body.next_follow_up) : null,
    },
  });
  return res.status(201).json({ message: "Follow up dicatat" });
});

router.get("/:modul/survey-kalender", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const bulan = req.query.bulan ? parseInt(req.query.bulan as string) : undefined;
  const tahun = req.query.tahun ? parseInt(req.query.tahun as string) : undefined;
  // show_all=true → gabungkan semua modul (untuk Database Client / Super Admin)
  const showAll = req.query.show_all === "true";
  const filterUser = req.query.user_id ? BigInt(req.query.user_id as string) : undefined;

  const where: Record<string, unknown> = {
    rencana_survey: "Ya",
    tanggal_survey: { not: null },
  };

  // showAll hanya berlaku untuk sales-admin & telemarketing (gabung keduanya).
  // Golden selalu difilter sendiri — tidak ikut campuran showAll.
  if (modul === "golden") {
    where.modul = "golden";
  } else if (showAll) {
    where.modul = { in: ["sales-admin", "telemarketing", "database-client"] };
  } else {
    where.modul = modul;
  }

  // Filter by inputter (user_id yang membuat lead)
  if (filterUser) where.user_id = filterUser;

  // Mitra: hanya bisa lihat survey yang di-assign ke nama mereka
  if (req.user?.sub_role === "Mitra") {
    where.pic_survey = req.user.name;
  }

  if (bulan && tahun) {
    const startOfMonth = new Date(tahun, bulan - 1, 1);
    const endOfMonth = new Date(tahun, bulan, 0, 23, 59, 59);
    where.tanggal_survey = { gte: startOfMonth, lte: endOfMonth };
  } else if (tahun) {
    const startOfYear = new Date(tahun, 0, 1);
    const endOfYear = new Date(tahun, 11, 31, 23, 59, 59);
    where.tanggal_survey = { gte: startOfYear, lte: endOfYear };
  }

  const leads = await prisma.lead.findMany({
    where,
    include: { user: true },
    orderBy: { tanggal_survey: "asc" },
  });
  return res.json({ items: leads.map(leadDict), total: leads.length });
});

// GET /bd/survey-kalender/users — list users who have inputted surveys (for filter dropdown)
router.get("/survey-kalender/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: {
      leads_leads_user_idTousers: {
        some: { rencana_survey: "Ya", tanggal_survey: { not: null } },
      },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.json(users.map((u) => ({ id: String(u.id), nama: u.name })));
});

router.post("/:modul/leads/:id/approve-survey", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const { foto_survey, luasan_tanah, catatan_survey } = req.body;
  if (!foto_survey) return res.status(400).json({ detail: "Foto survey wajib diupload untuk persetujuan" });
  // Normalise foto_survey → always store as JSON array string
  const fotosArr: string[] = Array.isArray(foto_survey) ? foto_survey : [foto_survey];
  const fotoStored = JSON.stringify(fotosArr);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  await prisma.lead.update({
    where: { id },
    data: {
      survey_approval_status: "approved",
      survey_approved_by: req.user!.id,
      survey_approved_at: new Date(),
      foto_survey: fotoStored,
      luasan_tanah: luasan_tanah !== undefined && luasan_tanah !== "" ? parseFloat(String(luasan_tanah)) : undefined,
      catatan_survey: catatan_survey ?? undefined,
    },
  });
  return res.json({ message: "Survey disetujui" });
});

router.post("/:modul/leads/:id/reject-survey", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  // Only update status, keep tanggal_survey and jam_survey for rescheduling
  await prisma.lead.update({
    where: { id },
    data: { survey_approval_status: "rejected", survey_approved_by: req.user!.id, survey_approved_at: new Date() },
  });
  return res.json({ message: "Survey ditolak" });
});

router.patch("/:modul/leads/:id/survey", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  const { tanggal_survey, jam_survey, pic_survey } = req.body;
  const updates: Record<string, unknown> = {};
  if (tanggal_survey !== undefined) {
    updates.tanggal_survey = tanggal_survey ? new Date(tanggal_survey) : null;
    // Reset approval when rescheduling
    updates.survey_approval_status = null;
    updates.survey_approved_by = null;
    updates.survey_approved_at = null;
    updates.foto_survey = null;
  }
  if (jam_survey !== undefined) updates.jam_survey = jam_survey;
  if (pic_survey !== undefined) updates.pic_survey = pic_survey;
  await prisma.lead.update({ where: { id }, data: updates });

  // Notify PIC via WhatsApp when survey is assigned
  if (pic_survey && tanggal_survey) {
    const picUser = await prisma.user.findFirst({ where: { name: pic_survey }, select: { whatsapp_number: true } });
    if (picUser?.whatsapp_number) {
      const modul = req.params.modul;
      const calendarPath = modul === "telemarketing" ? "telemarketing/kalender-survey" : "sales-admin/kalender-survey";
      const msg = `📅 *Assign Survey Baru*\n\nAnda ditugaskan sebagai PIC Survey:\n*Klien:* ${lead.nama}\n*Tanggal:* ${tanggal_survey}\n*Jam:* ${jam_survey ?? "-"}\n\n🔗 ${FRONTEND_URL}/${calendarPath}`;
      sendFonnte(picUser.whatsapp_number, msg).catch(() => {});
    }
  }

  return res.json({ message: "Jadwal survey diupdate" });
});

// GET /bd/survey-pic-users — list users for PIC dropdown
router.get("/survey-pic-users", async (req: Request, res: Response) => {
  const subRole = req.query.sub_role as string | undefined;
  const where: Record<string, unknown> = {};
  if (subRole) where.sub_role = subRole;
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, sub_role: true },
    orderBy: { name: "asc" },
  });
  return res.json(users);
});

// ── Kalender After Pengerjaan ─────────────────────────────────────────────────

// GET /bd/:modul/pengerjaan-kalender — leads approved survey, for pengerjaan calendar
router.get("/:modul/pengerjaan-kalender", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const bulan = req.query.bulan ? parseInt(String(req.query.bulan)) : undefined;
  const tahun = req.query.tahun ? parseInt(String(req.query.tahun)) : undefined;
  const where: Record<string, unknown> = {
    modul,
    survey_approval_status: "approved",
  };
  // If bulan/tahun given, filter by pengerjaan date in that month (OR include unscheduled)
  // We return ALL approved leads; frontend handles filtering display
  const leads = await prisma.lead.findMany({
    where,
    select: {
      id: true, nama: true, nomor_telepon: true, alamat: true, jenis: true, status: true,
      tanggal_survey: true, pic_survey: true, luasan_tanah: true, catatan_survey: true,
      tanggal_pengerjaan: true, pengerjaan_approval_status: true,
      foto_pengerjaan: true, pengerjaan_approved_at: true,
      survey_approved_at: true,
    },
    orderBy: { survey_approved_at: "desc" },
  });
  return res.json(leads.map((l) => ({
    ...l,
    luasan_tanah: l.luasan_tanah != null ? parseFloat(String(l.luasan_tanah)) : null,
  })));
});

// PATCH /bd/:modul/leads/:id/pengerjaan-schedule — set tanggal pengerjaan
router.patch("/:modul/leads/:id/pengerjaan-schedule", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const { tanggal_pengerjaan } = req.body;
  if (!tanggal_pengerjaan) return res.status(400).json({ detail: "tanggal_pengerjaan wajib diisi" });
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  if (lead.survey_approval_status !== "approved")
    return res.status(400).json({ detail: "Survey belum disetujui" });
  await prisma.lead.update({
    where: { id },
    data: { tanggal_pengerjaan: new Date(tanggal_pengerjaan) },
  });
  return res.json({ message: "Tanggal pengerjaan berhasil diset" });
});

// POST /bd/:modul/leads/:id/approve-pengerjaan — approve pengerjaan with photos
router.post("/:modul/leads/:id/approve-pengerjaan", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const id = BigInt(req.params.id);
  const { foto_pengerjaan } = req.body;
  if (!foto_pengerjaan) return res.status(400).json({ detail: "Foto pengerjaan wajib diupload" });
  const fotosArr: string[] = Array.isArray(foto_pengerjaan) ? foto_pengerjaan : [foto_pengerjaan];
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ detail: "Lead tidak ditemukan" });
  if (lead.survey_approval_status !== "approved")
    return res.status(400).json({ detail: "Survey belum disetujui" });
  await prisma.lead.update({
    where: { id },
    data: {
      pengerjaan_approval_status: "approved",
      pengerjaan_approved_by: req.user!.id,
      pengerjaan_approved_at: new Date(),
      foto_pengerjaan: JSON.stringify(fotosArr),
    },
  });
  return res.json({ message: "Pengerjaan disetujui" });
});

// POST /bd/:modul/leads/bulk — import leads from Excel
router.post("/:modul/leads/bulk", async (req: Request, res: Response) => {
  const { modul } = req.params;
  if (!validateModul(modul, res)) return;
  const leads = req.body as any[];
  if (!Array.isArray(leads) || leads.length === 0)
    return res.status(400).json({ detail: "Array leads wajib diisi" });
  const now = new Date();
  const created = await prisma.$transaction(
    leads.map((l) => {
      const tanggalMasuk = l.tanggal_masuk ? new Date(l.tanggal_masuk) : now;
      return prisma.lead.create({
        data: {
          nama: l.nama, nomor_telepon: l.nomor_telepon || null,
          alamat: l.alamat || null, sumber_leads: l.sumber_leads || null,
          jenis: l.jenis || null, status: l.status || "Low",
          keterangan: l.keterangan || null,
          tanggal_masuk: tanggalMasuk,
          modul, user_id: req.user!.id,
          bulan: tanggalMasuk.getMonth() + 1, tahun: tanggalMasuk.getFullYear(),
        },
      });
    })
  );
  return res.json({ inserted: created.length });
});

export default router;
