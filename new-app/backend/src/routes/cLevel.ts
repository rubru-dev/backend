import { Router, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";
import { requireAnyPermission, requireRole } from "../middleware/requireRole";
import { summarizeWithSumoPod } from "../lib/sumopod";
import { config } from "../config";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ];
    const extension = file.originalname.toLowerCase().split(".").pop();
    if (!allowed.includes(file.mimetype) && !["xlsx", "xls"].includes(extension ?? "")) {
      cb(Object.assign(new Error("File harus berformat .xlsx atau .xls."), { status: 400 }));
      return;
    }
    cb(null, true);
  },
});

type ImportRow = { kind: "campaign" | "daily_metric" | "chat_metric"; row: Record<string, unknown>; sheet: string; row_number: number };
type ImportError = { sheet: string; row_number: number; message: string };

const text = (value: unknown, max = 255) => String(value ?? "").trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);
const num = (value: unknown) => {
  const cleaned = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};
const dateValue = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = text(value, 30);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function normalizedRows(sheet: XLSX.WorkSheet, kind: ImportRow["kind"], sheetName: string): ImportRow[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false });
  return rows.map((source, index) => {
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      row[key.trim().toLowerCase().replace(/[\s-]+/g, "_")] = value;
    }
    return { kind, row, sheet: sheetName, row_number: index + 2 };
  });
}

function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheet = (name: string) => workbook.Sheets[workbook.SheetNames.find((item) => item.toLowerCase() === name) ?? ""];
  const rows: ImportRow[] = [];
  if (sheet("campaigns")) rows.push(...normalizedRows(sheet("campaigns"), "campaign", "campaigns"));
  if (sheet("daily_metrics")) rows.push(...normalizedRows(sheet("daily_metrics"), "daily_metric", "daily_metrics"));
  if (sheet("chat_metrics")) rows.push(...normalizedRows(sheet("chat_metrics"), "chat_metric", "chat_metrics"));
  const errors: ImportError[] = [];
  if (!rows.length) errors.push({ sheet: "workbook", row_number: 1, message: "Sheet campaigns, daily_metrics, atau chat_metrics tidak ditemukan atau kosong." });
  if (rows.length > 5000) errors.push({ sheet: "workbook", row_number: 1, message: "Maksimal 5.000 baris per import." });
  for (const item of rows) {
    const campaign = text(item.row.campaign_name);
    if (item.kind === "campaign" && !campaign) errors.push({ sheet: item.sheet, row_number: item.row_number, message: "campaign_name wajib diisi." });
    if (item.kind !== "campaign" && !campaign && !text(item.row.meta_campaign_id)) errors.push({ sheet: item.sheet, row_number: item.row_number, message: "campaign_name atau meta_campaign_id wajib diisi." });
    if (item.kind !== "campaign" && !dateValue(item.row.date)) errors.push({ sheet: item.sheet, row_number: item.row_number, message: "date wajib berformat tanggal yang valid." });
  }
  return { rows, errors };
}

async function findCampaign(tx: any, row: Record<string, unknown>) {
  const metaId = text(row.meta_campaign_id, 100);
  const name = text(row.campaign_name);
  const platform = text(row.platform, 50) || "Meta";
  if (metaId) {
    const byMetaId = await tx.metaAdsCampaign.findFirst({ where: { meta_campaign_id: metaId } });
    if (byMetaId) return byMetaId;
  }
  if (name) {
    const byName = await tx.metaAdsCampaign.findFirst({ where: { campaign_name: name, platform } });
    if (byName) return byName;
  }
  return null;
}

async function importRows(rows: ImportRow[], userId: bigint | undefined) {
  let imported = 0;
  await prisma.$transaction(async (tx) => {
    for (const item of rows) {
      const row = item.row;
      if (item.kind === "campaign") {
        const existing = await findCampaign(tx, row);
        const data = {
          campaign_name: text(row.campaign_name) || null,
          meta_campaign_id: text(row.meta_campaign_id, 100) || null,
          platform: text(row.platform, 50) || "Meta",
          status: text(row.status, 50) || "aktif",
          start_date: dateValue(row.start_date),
          end_date: dateValue(row.end_date),
          daily_budget: num(row.daily_budget),
          total_budget: num(row.total_budget),
          data_source: "manual",
          created_by: userId ?? null,
        };
        if (existing) await tx.metaAdsCampaign.update({ where: { id: existing.id }, data });
        else await tx.metaAdsCampaign.create({ data });
        imported += 1;
        continue;
      }
      const campaign = await findCampaign(tx, row);
      if (!campaign) throw new Error(`Campaign tidak ditemukan: ${text(row.campaign_name) || text(row.meta_campaign_id)}`);
      const date = dateValue(row.date)!;
      if (item.kind === "daily_metric") {
        await tx.adContentMetric.upsert({
          where: { meta_ads_campaign_id_date: { meta_ads_campaign_id: campaign.id, date } },
          update: {
            impressions: Math.round(num(row.impressions)), reach: Math.round(num(row.reach)), clicks: Math.round(num(row.clicks)),
            spend: num(row.spend), likes: Math.round(num(row.likes)), comments: Math.round(num(row.comments)), shares: Math.round(num(row.shares)),
            video_views: Math.round(num(row.video_views)), engagement_rate: num(row.engagement_rate), cost_per_result: num(row.cost_per_result),
            roas: num(row.roas), frequency: num(row.frequency), conversions: Math.round(num(row.conversions)), data_source: "manual",
          },
          create: {
            meta_ads_campaign_id: campaign.id, date, impressions: Math.round(num(row.impressions)), reach: Math.round(num(row.reach)),
            clicks: Math.round(num(row.clicks)), spend: num(row.spend), likes: Math.round(num(row.likes)), comments: Math.round(num(row.comments)),
            shares: Math.round(num(row.shares)), video_views: Math.round(num(row.video_views)), engagement_rate: num(row.engagement_rate),
            cost_per_result: num(row.cost_per_result), roas: num(row.roas), frequency: num(row.frequency), conversions: Math.round(num(row.conversions)), data_source: "manual",
          },
        });
      } else {
        await tx.whatsappChatMetric.upsert({
          where: { meta_ads_campaign_id_date: { meta_ads_campaign_id: campaign.id, date } },
          update: {
            chats_received: Math.round(num(row.chats_received)), chats_responded: Math.round(num(row.chats_responded)),
            avg_response_time: num(row.avg_response_time), total_conversions: Math.round(num(row.total_conversions)),
            response_rate: num(row.response_rate), conversion_rate: num(row.conversion_rate),
          },
          create: {
            meta_ads_campaign_id: campaign.id, date, chats_received: Math.round(num(row.chats_received)), chats_responded: Math.round(num(row.chats_responded)),
            avg_response_time: num(row.avg_response_time), total_conversions: Math.round(num(row.total_conversions)),
            response_rate: num(row.response_rate), conversion_rate: num(row.conversion_rate),
          },
        });
      }
      imported += 1;
    }
  });
  return imported;
}

router.get("/template", requireAnyPermission("bd.import_data", "c_level.import", "c_level.view"), (_req: Request, res: Response) => {
  const workbook = XLSX.utils.book_new();
  const campaigns = [
    ["campaign_name", "meta_campaign_id", "platform", "status", "start_date", "end_date", "daily_budget", "total_budget"],
    ["Contoh Campaign", "", "Meta", "aktif", "2026-01-01", "2026-01-31", 0, 0],
  ];
  const daily = [["date", "campaign_name", "meta_campaign_id", "spend", "impressions", "reach", "clicks", "conversions", "likes", "comments", "shares", "video_views", "engagement_rate", "cost_per_result", "roas", "frequency"], ["2026-01-01", "Contoh Campaign", "", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
  const chat = [["date", "campaign_name", "meta_campaign_id", "chats_received", "chats_responded", "avg_response_time", "total_conversions", "response_rate", "conversion_rate"], ["2026-01-01", "Contoh Campaign", "", 0, 0, 0, 0, 0, 0]];
  const guide = [["Petunjuk"], ["Isi baris data mulai dari baris kedua. Jangan ubah nama sheet dan nama kolom."], ["Tanggal memakai format YYYY-MM-DD. Angka tidak perlu memakai simbol Rupiah."], ["Campaign harus diisi sebelum daily_metrics atau chat_metrics."], ["Hapus baris contoh sebelum upload."]];
  for (const [name, data] of [["campaigns", campaigns], ["daily_metrics", daily], ["chat_metrics", chat], ["petunjuk", guide]] as const) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), name);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=template-import-bd.xlsx");
  return res.send(buffer);
});

router.get("/imports", requireAnyPermission("bd.import_data", "c_level.import", "c_level.view"), async (_req: Request, res: Response) => {
  const batches = await prisma.cLevelImportBatch.findMany({
    orderBy: { created_at: "desc" }, take: 20,
    select: { id: true, file_name: true, status: true, rows_total: true, rows_imported: true, error_count: true, errors: true, created_at: true, completed_at: true, uploader: { select: { name: true } } },
  });
  return res.json(batches);
});

router.post("/imports", requireAnyPermission("bd.import_data", "c_level.import"), upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ detail: "File Excel wajib diupload." });
  const parsed = parseWorkbook(req.file.buffer);
  const batch = await prisma.cLevelImportBatch.create({
    data: { file_name: text(req.file.originalname), status: parsed.errors.length ? "rejected" : "preview", rows_total: parsed.rows.length, error_count: parsed.errors.length, errors: parsed.errors, preview_data: parsed.rows as any, uploaded_by: req.user?.id ?? null },
  });
  return res.status(parsed.errors.length ? 422 : 201).json({ id: Number(batch.id), status: batch.status, rows_total: batch.rows_total, error_count: batch.error_count, errors: parsed.errors, preview: parsed.rows.slice(0, 100) });
});

router.post("/imports/:id/confirm", requireAnyPermission("bd.import_data", "c_level.import"), async (req: Request, res: Response) => {
  const id = BigInt(req.params.id);
  const batch = await prisma.cLevelImportBatch.findUnique({ where: { id } });
  if (!batch) return res.status(404).json({ detail: "Batch import tidak ditemukan." });
  if (batch.status !== "preview") return res.status(400).json({ detail: "Batch ini tidak berada pada tahap preview." });
  const rows = batch.preview_data as unknown as ImportRow[];
  const imported = await importRows(rows, req.user?.id);
  const updated = await prisma.cLevelImportBatch.update({ where: { id }, data: { status: "completed", rows_imported: imported, completed_at: new Date() } });
  return res.json({ id: Number(updated.id), status: updated.status, rows_imported: imported });
});

function isAllowedQuestion(question: string, hasHistory: boolean) {
  if (/\b(puisi|lirik|berita|cuaca|saham|politik|resep|game|film|selebrit|presiden|internet|google|youtube)\b/i.test(question)) return false;
  if (hasHistory) return true;
  return /\b(aplikasi|data|laporan|bisnis|penjualan|closing|lead|survey|proyek|project|finance|keuangan|invoice|cashflow|ads|campaign|marketing|sales|karyawan|absen|stok|material|konten|ruangkeruang|periode|bulan|tahun|analisa|analisis|bandingkan|kenapa|berapa)\b/i.test(question);
}

async function buildContext() {
  const [leadCount, leadStatuses, invoiceAgg, invoiceStatuses, invoiceMonthly, campaignCount, adsAgg, projectCount, interiorCount, designCount, latestImports] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { _count: { status: "desc" } } }),
    prisma.invoice.aggregate({ _count: { _all: true }, _sum: { grand_total: true } }),
    prisma.invoice.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.$queryRaw<Array<{ bulan: string; status: string; jumlah_invoice: number; nominal: unknown }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(tanggal, created_at)), 'YYYY-MM') AS bulan,
        status,
        COUNT(*)::int AS jumlah_invoice,
        COALESCE(SUM(grand_total), 0) AS nominal
      FROM invoices
      GROUP BY 1, 2
      ORDER BY 1 DESC, 2 ASC
      LIMIT 120
    `,
    prisma.metaAdsCampaign.count({ where: { is_hidden: false } }),
    prisma.adContentMetric.aggregate({ _sum: { spend: true, impressions: true, reach: true, clicks: true, conversions: true } }),
    prisma.proyekBerjalan.count(),
    prisma.proyekInterior.count(),
    prisma.desainTimeline.count(),
    prisma.cLevelImportBatch.findMany({ where: { status: "completed" }, orderBy: { created_at: "desc" }, take: 5, select: { file_name: true, rows_imported: true, completed_at: true } }),
  ]);
  return {
    batasan: "Ini adalah snapshot data dari database aplikasi Rubah Rumah, termasuk ringkasan bulanan yang tersedia. Tidak ada browsing atau sumber eksternal.",
    leads: { total: leadCount, per_status: leadStatuses.map((item) => ({ status: item.status ?? "Tanpa status", jumlah: item._count._all })) },
    finance: {
      invoice_total: invoiceAgg._count._all,
      invoice_nominal_total: Number(invoiceAgg._sum.grand_total ?? 0),
      invoice_per_status: invoiceStatuses.map((item) => ({ status: item.status, jumlah: item._count._all })),
      invoice_per_bulan: invoiceMonthly.map((item) => ({
        bulan: item.bulan,
        status: item.status,
        jumlah_invoice: Number(item.jumlah_invoice),
        nominal: Number(item.nominal ?? 0),
      })),
    },
    bd_ads: { campaign_total: campaignCount, metric_spend: Number(adsAgg._sum.spend ?? 0), impressions: Number(adsAgg._sum.impressions ?? 0), reach: Number(adsAgg._sum.reach ?? 0), clicks: Number(adsAgg._sum.clicks ?? 0), conversions: Number(adsAgg._sum.conversions ?? 0) },
    projects: { sipil: projectCount, interior: interiorCount, desain: designCount },
    import_manual_terakhir: latestImports,
  };
}

router.post("/ai/chat", requireRole("Super Admin"), async (req: Request, res: Response) => {
  const question = text(req.body?.question, 4000);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).filter((item: any) => ["user", "assistant"].includes(item?.role) && typeof item?.content === "string").map((item: any) => ({ role: item.role, content: text(item.content, 4000) })) : [];
  if (!question) return res.status(400).json({ detail: "Pertanyaan wajib diisi." });
  if (!isAllowedQuestion(question, history.length > 0)) return res.status(422).json({ detail: "Saya hanya dapat membantu menganalisa data dan proses yang tersedia di aplikasi Rubah Rumah." });
  const context = await buildContext();
  const answer = await summarizeWithSumoPod([
    { role: "system", content: "Anda adalah asisten diskusi C-Level untuk aplikasi Rubah Rumah. Jawab hanya berdasarkan DATA APLIKASI yang diberikan pada pesan ini. Jangan browsing, jangan memakai pengetahuan eksternal, jangan menebak angka, dan jangan mengarang data. Untuk pertanyaan penjualan bulanan, gunakan finance.invoice_per_bulan dan hitung/urutkan hanya dari data tersebut; jangan mengatakan breakdown bulanan tidak tersedia jika array itu berisi data. Jelaskan bahwa nominal invoice per bulan adalah nilai invoice berdasarkan tanggal invoice, atau created_at bila tanggal invoice kosong, bukan otomatis kas yang sudah diterima. Jika pertanyaan di luar data aplikasi atau data tidak cukup, katakan dengan jelas bahwa data tidak tersedia atau topik berada di luar cakupan. Gunakan Bahasa Indonesia yang natural dan langsung ke inti: mulai dengan kesimpulan singkat, lalu rincian seperlunya. Jangan gunakan heading Markdown, tanda pagar (#), tabel, atau format yang terasa seperti laporan teknis. Gunakan paragraf pendek dan bullet sederhana dengan tanda • jika perlu. Fokus pada ringkasan, hubungan antar-metrik, risiko, dan langkah tindak lanjut yang relevan dengan operasi perusahaan." },
    ...history,
    { role: "user", content: `DATA APLIKASI:\n${JSON.stringify(context).slice(0, 40_000)}\n\nPERTANYAAN:\n${question}` },
  ]);
  return res.json({ answer, provider: "sumopod", model: config.sumopodModel, generated_at: new Date().toISOString(), scope: "application-data-only" });
});

export default router;
