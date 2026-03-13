"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, TrendingUp, MessageSquare, DollarSign, MousePointerClick,
  Percent, Target, Zap, Eye, Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { metaAdsApi, adsTargetApi } from "@/lib/api/meta-ads";
import { leadsApi } from "@/lib/api/leads";
import { formatRupiah } from "@/lib/utils";
import type { MetaAdsCampaign } from "@/types";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const PLATFORMS = [
  { value: "all", label: "Semua Platform" },
  { value: "Meta", label: "Meta Ads" },
  { value: "TikTok", label: "TikTok Ads" },
];

function StatCard({
  label, value, numericValue, icon: Icon, color, sub, target, targetLabel,
}: {
  label: string;
  value: string | number;
  numericValue?: number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  target?: number | null;
  targetLabel?: string;
}) {
  const pct = target && target > 0 && numericValue != null
    ? Math.round((numericValue / target) * 100)
    : null;
  const pctColor = pct == null ? "" : pct >= 100 ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-red-500";
  const barColor = pct == null ? "" : pct >= 100 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-400" : "bg-red-400";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {target != null && targetLabel && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Target: {targetLabel}</span>
              {pct != null && <span className={`font-semibold ${pctColor}`}>{pct}%</span>}
            </div>
            {pct != null && (
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            )}
          </div>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function BdDashboardPage() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [platform, setPlatform] = useState("all");
  const [campaignId, setCampaignId] = useState<string>("all");
  const [pdfLoading, setPdfLoading] = useState(false);

  const years = [now.getFullYear(), now.getFullYear() - 1];

  // Fetch all campaigns (for dropdown)
  const { data: allCampaignsData } = useQuery({
    queryKey: ["/bd/meta-ads/campaigns"],
    queryFn: () => metaAdsApi.list({ per_page: 500 }),
    staleTime: 60_000,
  });
  const allCampaigns = allCampaignsData?.items ?? [];

  // Filter campaign dropdown by selected platform
  const filteredCampaignOptions = useMemo<MetaAdsCampaign[]>(() => {
    if (platform === "all") return allCampaigns;
    return allCampaigns.filter((c) => c.platform === platform);
  }, [allCampaigns, platform]);

  // Build dashboard query params
  const dashParams = useMemo(() => ({
    platform: platform === "all" ? undefined : platform,
    campaign_id: campaignId !== "all" ? Number(campaignId) : undefined,
    bulan,
    tahun,
  }), [platform, campaignId, bulan, tahun]);

  const { data: adsDash, isLoading: adsLoading } = useQuery({
    queryKey: ["/bd/meta-ads/dashboard", dashParams],
    queryFn: () => metaAdsApi.getDashboard(dashParams),
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["/bd/leads/summary", bulan, tahun],
    queryFn: () => leadsApi.list({ bulan, tahun, per_page: 1000 }),
  });

  // Fetch monthly target for selected platform (only when a specific platform is selected)
  const { data: targetsData } = useQuery({
    queryKey: ["/bd/ads/targets", platform, bulan, tahun],
    queryFn: () => adsTargetApi.list({ platform: platform === "all" ? undefined : platform, bulan, tahun }),
    enabled: platform !== "all",
  });
  const target = platform !== "all" ? (targetsData ?? []).find((t) => t.platform === platform) : null;

  const isLoading = adsLoading || leadsLoading;

  // Leads stats
  const leads = leadsData?.items ?? [];
  const leadsByStatus = {
    Low: leads.filter((l) => l.status === "Low").length,
    Medium: leads.filter((l) => l.status === "Medium").length,
    Hot: leads.filter((l) => l.status === "Hot").length,
  };
  const leadStatusData = [
    { name: "Low", jumlah: leadsByStatus.Low, fill: "#94a3b8" },
    { name: "Medium", jumlah: leadsByStatus.Medium, fill: "#f59e0b" },
    { name: "Hot", jumlah: leadsByStatus.Hot, fill: "#ef4444" },
  ];

  const sourceCount: Record<string, number> = {};
  leads.forEach((l) => {
    if (l.sumber_leads) sourceCount[l.sumber_leads] = (sourceCount[l.sumber_leads] ?? 0) + 1;
  });
  const topSources = Object.entries(sourceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, jumlah]) => ({ name, jumlah }));

  const platformLabel = PLATFORMS.find((p) => p.value === platform)?.label ?? "Iklan";
  const selectedCampaign = allCampaigns.find((c) => String(c.id) === campaignId);

  function handlePrint() {
    setPdfLoading(true);
    try {
      const fmt = formatRupiah;
      const periodLabel = `${MONTHS[bulan - 1]} ${tahun}`;
      const filterLabel = platform !== "all" ? platformLabel : "Semua Platform";
      const campaignLabel = selectedCampaign
        ? (selectedCampaign.campaign_name ?? selectedCampaign.nama_campaign ?? "")
        : "Semua Postingan";

      const totalSpend = adsDash?.total_spend ?? 0;
      const totalImpressions = adsDash?.total_impressions ?? 0;
      const totalClicks = adsDash?.total_clicks ?? 0;
      const avgCtr = Number(adsDash?.avg_ctr ?? 0);
      const totalConversions = adsDash?.total_conversions ?? 0;
      const surveyLeads = leads.filter((l) => l.rencana_survey === "Ya").length;

      // ── Summary cards HTML ───────────────────────────────────────────────────
      const summaryCards = [
        { label: "Total Spend", value: fmt(totalSpend) },
        { label: "Total Impressions", value: totalImpressions.toLocaleString("id-ID") },
        { label: "Total Klik", value: totalClicks.toLocaleString("id-ID") },
        { label: "Rata-rata CTR", value: `${avgCtr.toFixed(2)}%` },
        { label: "Total Conversions", value: totalConversions.toLocaleString("id-ID") },
        { label: "Total Leads", value: leads.length.toString() },
        { label: "Hot Leads", value: leadsByStatus.Hot.toString() },
        { label: "Survey Direncanakan", value: surveyLeads.toString() },
      ].map((c) => `
        <div class="card">
          <div class="card-label">${c.label}</div>
          <div class="card-value">${c.value}</div>
        </div>`).join("");

      // ── Target comparison ────────────────────────────────────────────────────
      let targetSection = "";
      if (target) {
        const tRows = [
          { label: "Spend", actual: fmt(totalSpend), tgt: target.target_spend != null ? fmt(target.target_spend) : null, num: totalSpend, tNum: target.target_spend },
          { label: "Impressions", actual: totalImpressions.toLocaleString("id-ID"), tgt: target.target_impressions != null ? target.target_impressions.toLocaleString("id-ID") : null, num: totalImpressions, tNum: target.target_impressions },
          { label: "Klik", actual: totalClicks.toLocaleString("id-ID"), tgt: target.target_clicks != null ? target.target_clicks.toLocaleString("id-ID") : null, num: totalClicks, tNum: target.target_clicks },
          { label: "CTR", actual: `${avgCtr.toFixed(2)}%`, tgt: target.target_ctr != null ? `${target.target_ctr}%` : null, num: avgCtr, tNum: target.target_ctr },
          { label: "Conversions", actual: totalConversions.toLocaleString("id-ID"), tgt: target.target_conversions != null ? target.target_conversions.toLocaleString("id-ID") : null, num: totalConversions, tNum: target.target_conversions },
        ].map((r) => {
          const pct = r.tNum && r.tNum > 0 ? Math.round((r.num / r.tNum) * 100) : null;
          const color = pct == null ? "#64748b" : pct >= 100 ? "#16a34a" : pct >= 75 ? "#d97706" : "#dc2626";
          return `<tr>
            <td>${r.label}</td>
            <td class="num">${r.actual}</td>
            <td class="num">${r.tgt ?? "—"}</td>
            <td class="num" style="color:${color};font-weight:600">${pct != null ? pct + "%" : "—"}</td>
          </tr>`;
        }).join("");
        targetSection = `
          <div class="section">
            <div class="section-title">Target vs Aktual — ${filterLabel} — ${periodLabel}</div>
            <table>
              <thead><tr><th>Metrik</th><th class="num">Aktual</th><th class="num">Target</th><th class="num">Pencapaian</th></tr></thead>
              <tbody>${tRows}</tbody>
            </table>
          </div>`;
      }

      // ── Per-campaign table ───────────────────────────────────────────────────
      const campaigns = adsDash?.campaigns ?? [];
      let campaignSection = "";
      if (campaigns.length > 0 && campaignId === "all") {
        const rows = campaigns.map((c, i) => {
          const leadsCount = allCampaigns.find((ac) => ac.id === c.id)?.leads_count ?? 0;
          return `<tr>
            <td class="num">${i + 1}</td>
            <td><strong>${c.campaign_name ?? c.nama_campaign ?? "-"}</strong></td>
            <td class="center"><span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:10px;${c.platform === "TikTok" ? "background:#0f172a;color:#fff" : "background:#dbeafe;color:#1d4ed8"}">${c.platform ?? "Meta"}</span></td>
            <td class="num">${(c.total_impressions ?? 0).toLocaleString("id-ID")}</td>
            <td class="num">${(c.total_clicks ?? 0).toLocaleString("id-ID")}</td>
            <td class="num">${Number(c.avg_ctr ?? 0).toFixed(2)}%</td>
            <td class="num">${fmt(c.total_spend ?? 0)}</td>
            <td class="num">${c.total_conversions ?? 0}</td>
            <td class="num" style="font-weight:600;color:#4f46e5">${leadsCount}</td>
          </tr>`;
        }).join("");
        campaignSection = `
          <div class="section">
            <div class="section-title">Performa Per Postingan Iklan</div>
            <table>
              <thead><tr>
                <th class="num">#</th><th>Nama Iklan</th><th class="center">Platform</th>
                <th class="num">Impressions</th><th class="num">Klik</th><th class="num">CTR</th>
                <th class="num">Spend</th><th class="num">Conversions</th><th class="num">Leads</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      }

      // ── Leads table ──────────────────────────────────────────────────────────
      const sourceRows = topSources.map((s, i) => `
        <tr><td class="num">${i + 1}</td><td>${s.name}</td><td class="num">${s.jumlah}</td></tr>`).join("");

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Laporan Dashboard BD — ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 24px 32px; }
    .letterhead { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
    .letterhead-logo { height: 64px; width: auto; object-fit: contain; flex-shrink: 0; }
    .letterhead-info { flex: 1; }
    .company-name { font-size: 15px; font-weight: 700; color: #1e293b; letter-spacing: 0.02em; text-transform: uppercase; }
    .company-detail { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.5; }
    .letterhead-divider { border: none; border-top: 2px solid #1e293b; margin: 10px 0 16px; }
    h1 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 2px; }
    .meta { font-size: 11px; color: #94a3b8; margin-bottom: 20px; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 12px; font-weight: 700; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    .cards-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 4px; }
    .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; background: #f8fafc; }
    .card-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
    .card-value { font-size: 16px; font-weight: 700; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .center { text-align: center; }
    .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px 20px; } .cards-row { grid-template-columns: repeat(4, 1fr); } }
  </style>
</head>
<body>
  <div class="letterhead">
    <img src="${window.location.origin}/images/logo.png" alt="Logo" class="letterhead-logo" onerror="this.style.display='none'"/>
    <div class="letterhead-info">
      <div class="company-name">PT. Rubah Rumah Inovasi Pemuda</div>
      <div class="company-detail">Telp: 081376405550</div>
      <div class="company-detail">Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116</div>
    </div>
  </div>
  <hr class="letterhead-divider"/>

  <div class="section">
    <h1>Laporan Dashboard BD</h1>
    <div class="subtitle">Platform: ${filterLabel} &nbsp;|&nbsp; Postingan: ${campaignLabel} &nbsp;|&nbsp; Periode: ${periodLabel}</div>
    <div class="meta">Dibuat: ${now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
  </div>

  <div class="section">
    <div class="section-title">Ringkasan Metrik — ${periodLabel}</div>
    <div class="cards-row">${summaryCards}</div>
  </div>

  ${targetSection}
  ${campaignSection}

  <div class="section">
    <div class="section-title">Distribusi Leads per Status</div>
    <table>
      <thead><tr><th>Status</th><th class="num">Jumlah</th><th class="num">%</th></tr></thead>
      <tbody>
        <tr><td>Hot</td><td class="num">${leadsByStatus.Hot}</td><td class="num" style="color:#ef4444">${leads.length ? Math.round((leadsByStatus.Hot / leads.length) * 100) : 0}%</td></tr>
        <tr><td>Medium</td><td class="num">${leadsByStatus.Medium}</td><td class="num" style="color:#f59e0b">${leads.length ? Math.round((leadsByStatus.Medium / leads.length) * 100) : 0}%</td></tr>
        <tr><td>Low</td><td class="num">${leadsByStatus.Low}</td><td class="num" style="color:#94a3b8">${leads.length ? Math.round((leadsByStatus.Low / leads.length) * 100) : 0}%</td></tr>
        <tr style="font-weight:600"><td>Total</td><td class="num">${leads.length}</td><td class="num">100%</td></tr>
      </tbody>
    </table>
  </div>

  ${topSources.length > 0 ? `
  <div class="section">
    <div class="section-title">Top Sumber Leads</div>
    <table>
      <thead><tr><th class="num">#</th><th>Sumber</th><th class="num">Jumlah Leads</th></tr></thead>
      <tbody>${sourceRows}</tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Laporan Dashboard BD</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

      const w = window.open("", "_blank", "width=900,height=700");
      if (!w) { alert("Popup diblokir. Izinkan popup untuk halaman ini."); return; }
      w.document.write(html);
      w.document.close();
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard BD"
        description="Ringkasan performa business development"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* PDF */}
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={pdfLoading || isLoading}>
              <Printer className="h-4 w-4 mr-1" />
              {pdfLoading ? "Menyiapkan..." : "Save to PDF"}
            </Button>
            {/* Platform */}
            <Select value={platform} onValueChange={(v) => { setPlatform(v); setCampaignId("all"); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Campaign/Postingan */}
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Semua Postingan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Postingan</SelectItem>
                {filteredCampaignOptions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.campaign_name ?? c.nama_campaign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Month */}
            <Select value={String(bulan)} onValueChange={(v) => setBulan(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Year */}
            <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Active filter chips */}
      {(platform !== "all" || campaignId !== "all") && (
        <div className="flex gap-2 flex-wrap">
          {platform !== "all" && (
            <Badge variant="secondary" className="text-xs">Platform: {platformLabel}</Badge>
          )}
          {selectedCampaign && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {selectedCampaign.campaign_name ?? selectedCampaign.nama_campaign}
            </Badge>
          )}
        </div>
      )}

      {/* ── Ads summary stats ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {platformLabel} — {MONTHS[bulan - 1]} {tahun}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Spend" value={formatRupiah(adsDash?.total_spend ?? 0)}
                numericValue={adsDash?.total_spend ?? 0}
                icon={DollarSign} color="text-red-600"
                target={target?.target_spend ?? null}
                targetLabel={target?.target_spend != null ? formatRupiah(target.target_spend) : undefined}
              />
              <StatCard
                label="Total Impressions" value={(adsDash?.total_impressions ?? 0).toLocaleString("id-ID")}
                numericValue={adsDash?.total_impressions ?? 0}
                icon={Eye} color="text-violet-600"
                target={target?.target_impressions ?? null}
                targetLabel={target?.target_impressions != null ? target.target_impressions.toLocaleString("id-ID") : undefined}
              />
              <StatCard
                label="Total Klik" value={(adsDash?.total_clicks ?? 0).toLocaleString("id-ID")}
                numericValue={adsDash?.total_clicks ?? 0}
                icon={MousePointerClick} color="text-blue-600"
                target={target?.target_clicks ?? null}
                targetLabel={target?.target_clicks != null ? target.target_clicks.toLocaleString("id-ID") : undefined}
              />
              <StatCard
                label="Rata-rata CTR"
                value={`${Number(adsDash?.avg_ctr ?? 0).toFixed(2)}%`}
                numericValue={Number(adsDash?.avg_ctr ?? 0)}
                icon={Percent} color="text-indigo-600"
                sub={`${(adsDash?.campaigns ?? []).length} postingan`}
                target={target?.target_ctr ?? null}
                targetLabel={target?.target_ctr != null ? `${target.target_ctr}%` : undefined}
              />
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Conversions" value={(adsDash?.total_conversions ?? 0).toLocaleString("id-ID")}
                numericValue={adsDash?.total_conversions ?? 0}
                icon={Target} color="text-emerald-600"
                target={target?.target_conversions ?? null}
                targetLabel={target?.target_conversions != null ? target.target_conversions.toLocaleString("id-ID") : undefined}
              />
              <StatCard label="Total Leads" value={leads.length} icon={Users} color="text-indigo-600" />
              <StatCard label="Hot Leads" value={leadsByStatus.Hot} icon={Zap} color="text-red-600"
                sub={`${leads.length ? Math.round((leadsByStatus.Hot / leads.length) * 100) : 0}% dari total`} />
              <StatCard label="Survey Direncanakan" value={leads.filter((l) => l.rencana_survey === "Ya").length} icon={MessageSquare} color="text-blue-600" />
            </div>
          </div>
        </>
      )}

      {/* ── Per-postingan breakdown ───────────────────────────────────────────── */}
      {(adsDash?.campaigns ?? []).length > 0 && campaignId === "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performa Per Postingan Iklan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Nama Iklan</th>
                    <th className="pb-2 font-medium text-center">Platform</th>
                    <th className="pb-2 font-medium text-right">Impressions</th>
                    <th className="pb-2 font-medium text-right">Klik</th>
                    <th className="pb-2 font-medium text-right">CTR</th>
                    <th className="pb-2 font-medium text-right">Spend</th>
                    <th className="pb-2 font-medium text-right">Conversions</th>
                    <th className="pb-2 font-medium text-right">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {(adsDash?.campaigns ?? []).map((c) => {
                    const leadsCount = allCampaigns.find((ac) => ac.id === c.id)?.leads_count ?? 0;
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 font-medium max-w-[200px] truncate">
                          {c.campaign_name ?? c.nama_campaign ?? "-"}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.platform === "Meta" ? "bg-blue-100 text-blue-700" : "bg-slate-900 text-white"}`}>
                            {c.platform ?? "Meta"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{(c.total_impressions ?? 0).toLocaleString("id-ID")}</td>
                        <td className="py-2.5 text-right tabular-nums">{(c.total_clicks ?? 0).toLocaleString("id-ID")}</td>
                        <td className="py-2.5 text-right tabular-nums">{Number(c.avg_ctr ?? 0).toFixed(2)}%</td>
                        <td className="py-2.5 text-right tabular-nums">{formatRupiah(c.total_spend ?? 0)}</td>
                        <td className="py-2.5 text-right tabular-nums">{c.total_conversions ?? 0}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {leadsCount > 0
                            ? <span className="font-semibold text-indigo-600">{leadsCount}</span>
                            : <span className="text-muted-foreground">0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Leads per campaign (all campaigns with leads) ─────────────────────── */}
      {allCampaigns.filter((c) => (c.leads_count ?? 0) > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              Leads per Iklan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Nama Iklan</th>
                    <th className="pb-2 font-medium text-center">Platform</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Jumlah Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {allCampaigns
                    .filter((c) => (platform === "all" || c.platform === platform))
                    .sort((a, b) => (b.leads_count ?? 0) - (a.leads_count ?? 0))
                    .map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 font-medium">{c.campaign_name ?? c.nama_campaign ?? "-"}</td>
                        <td className="py-2.5 text-center">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.platform === "Meta" ? "bg-blue-100 text-blue-700" : "bg-slate-900 text-white"}`}>
                            {c.platform ?? "Meta"}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {c.status ?? "—"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          {(c.leads_count ?? 0) > 0
                            ? <span className="font-bold text-indigo-600 text-base">{c.leads_count}</span>
                            : <span className="text-muted-foreground">0</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads per Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadStatusData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="jumlah" name="Jumlah" radius={[4, 4, 0, 0]}>
                  {leadStatusData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Sumber Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {topSources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data sumber leads</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSources} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Leads" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medium Leads supplementary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Medium Leads" value={leadsByStatus.Medium} icon={TrendingUp} color="text-amber-600" />
        <StatCard label="Low Leads" value={leadsByStatus.Low} icon={Users} color="text-slate-500" />
      </div>
    </div>
  );
}
