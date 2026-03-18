"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import {
  Users, TrendingUp, MessageSquare, DollarSign, MousePointerClick,
  Percent, Target, Zap, Eye, Printer, CalendarCheck, Award, BarChart2,
} from "lucide-react";
import { format } from "date-fns";
import { id as locId } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { metaAdsApi, adsTargetApi } from "@/lib/api/meta-ads";
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

const CHART_METRICS = [
  { value: "spend", label: "Spend (Rp)", color: "#ef4444" },
  { value: "impressions", label: "Impressions", color: "#8b5cf6" },
  { value: "reach", label: "Reach", color: "#06b6d4" },
  { value: "clicks", label: "Klik", color: "#3b82f6" },
  { value: "ctr", label: "CTR (%)", color: "#6366f1" },
  { value: "conversions", label: "Result/Conversions", color: "#10b981" },
  { value: "cpm", label: "CPM", color: "#f59e0b" },
  { value: "cpc", label: "CPC", color: "#f97316" },
];

const LEADS_METRICS = [
  { value: "total_leads", label: "Total Leads", color: "#6366f1" },
  { value: "hot_leads", label: "Hot Leads", color: "#ef4444" },
  { value: "medium_leads", label: "Medium Leads", color: "#f59e0b" },
  { value: "low_leads", label: "Low Leads", color: "#94a3b8" },
  { value: "survey_count", label: "Survey Terjadwal", color: "#3b82f6" },
  { value: "paid_conversions", label: "Paid Conversions", color: "#10b981" },
];

const ALL_COMPARE_METRICS = [
  ...CHART_METRICS,
  ...LEADS_METRICS,
];

function StatCard({
  label, value, numericValue, icon: Icon, color, sub, target, targetLabel,
}: {
  label: string; value: string | number; numericValue?: number;
  icon: React.ElementType; color: string; sub?: string;
  target?: number | null; targetLabel?: string;
}) {
  const pct = target && target > 0 && numericValue != null
    ? Math.round((numericValue / target) * 100) : null;
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
  const [filterMode, setFilterMode] = useState<"monthly" | "range">("monthly");
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [platform, setPlatform] = useState("all");
  const [campaignId, setCampaignId] = useState<string>("all");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [metricA, setMetricA] = useState("spend");
  const [metricB, setMetricB] = useState("clicks");
  const [compareX, setCompareX] = useState("spend");
  const [compareY, setCompareY] = useState("total_leads");

  const years = [now.getFullYear(), now.getFullYear() - 1];

  const { data: allCampaignsData } = useQuery({
    queryKey: ["/bd/meta-ads/campaigns"],
    queryFn: () => metaAdsApi.list({ per_page: 500 }),
    staleTime: 60_000,
  });
  const allCampaigns = allCampaignsData?.items ?? [];

  const filteredCampaignOptions = useMemo<MetaAdsCampaign[]>(() => {
    if (platform === "all") return allCampaigns;
    return allCampaigns.filter((c) => c.platform === platform);
  }, [allCampaigns, platform]);

  const dashParams = useMemo(() => {
    const base: Record<string, unknown> = {
      platform: platform === "all" ? undefined : platform,
      campaign_id: campaignId !== "all" ? Number(campaignId) : undefined,
    };
    if (filterMode === "range" && startDate && endDate) {
      base.start_date = startDate;
      base.end_date = endDate;
    } else {
      base.bulan = bulan;
      base.tahun = tahun;
    }
    return base;
  }, [platform, campaignId, filterMode, bulan, tahun, startDate, endDate]);

  const { data: adsDash, isLoading } = useQuery({
    queryKey: ["/bd/meta-ads/dashboard", dashParams],
    queryFn: () => metaAdsApi.getDashboard(dashParams as Parameters<typeof metaAdsApi.getDashboard>[0]),
  });

  // Fetch campaign detail for chart when a specific campaign is selected
  const { data: campDetail } = useQuery({
    queryKey: ["/bd/meta-ads/campaigns", campaignId, dashParams],
    queryFn: () => metaAdsApi.getCampaignDetail(Number(campaignId), {
      start_date: filterMode === "range" && startDate ? startDate : undefined,
      end_date: filterMode === "range" && endDate ? endDate : undefined,
    }),
    enabled: campaignId !== "all",
  });

  const { data: targetsData } = useQuery({
    queryKey: ["/bd/ads/targets", platform, bulan, tahun],
    queryFn: () => adsTargetApi.list({ platform: platform === "all" ? undefined : platform, bulan, tahun }),
    enabled: platform !== "all" && filterMode === "monthly",
  });
  const target = platform !== "all" ? (targetsData ?? []).find((t) => t.platform === platform) : null;

  // Chart data — from campaign detail metrics when one campaign selected, else per-campaign summary
  const chartData = useMemo(() => {
    if (campaignId !== "all" && campDetail?.content_metrics) {
      return campDetail.content_metrics.map((m) => ({
        date: format(new Date(m.date), "d MMM", { locale: locId }),
        spend: m.spend,
        impressions: m.impressions,
        reach: m.reach,
        clicks: m.clicks,
        ctr: m.ctr,
        conversions: m.conversions,
        cpm: m.cpm,
        cpc: m.cpc,
      }));
    }
    // All campaigns: bar chart by campaign name
    return (adsDash?.campaigns ?? []).map((c) => ({
      date: (c.campaign_name ?? "").slice(0, 20),
      spend: c.total_spend,
      impressions: c.total_impressions,
      reach: c.total_reach ?? 0,
      clicks: c.total_clicks,
      ctr: Number((c.avg_ctr ?? 0).toFixed(2)),
      conversions: c.total_result ?? 0,
      cpm: c.cpm ?? 0,
      cpc: c.cpc ?? 0,
    }));
  }, [campaignId, campDetail, adsDash]);

  const metricADef = CHART_METRICS.find((m) => m.value === metricA)!;
  const metricBDef = CHART_METRICS.find((m) => m.value === metricB)!;

  const compareXDef = ALL_COMPARE_METRICS.find((m) => m.value === compareX)!;
  const compareYDef = ALL_COMPARE_METRICS.find((m) => m.value === compareY)!;

  // Iklan vs Leads comparison — per campaign data point
  const compareChartData = useMemo(() => {
    const leadsSnapshot = {
      total_leads: adsDash?.total_leads_db ?? 0,
      hot_leads: adsDash?.hot_leads ?? 0,
      medium_leads: adsDash?.medium_leads ?? 0,
      low_leads: adsDash?.low_leads ?? 0,
      survey_count: adsDash?.survey_count ?? 0,
      paid_conversions: adsDash?.paid_conversions ?? 0,
    };
    return (adsDash?.campaigns ?? []).map((c) => ({
      name: (c.campaign_name ?? "").slice(0, 20),
      spend: c.total_spend,
      impressions: c.total_impressions,
      reach: (c as any).total_reach ?? 0,
      clicks: c.total_clicks,
      ctr: Number(((c as any).avg_ctr ?? 0).toFixed(2)),
      conversions: (c as any).total_result ?? 0,
      cpm: (c as any).cpm ?? 0,
      cpc: (c as any).cpc ?? 0,
      // leads metrics use aggregate values (not per campaign in DB)
      ...leadsSnapshot,
    }));
  }, [adsDash]);

  const selectedCampaign = allCampaigns.find((c) => String(c.id) === campaignId);
  const platformLabel = PLATFORMS.find((p) => p.value === platform)?.label ?? "Iklan";

  function handlePrint() {
    setPdfLoading(true);
    try {
      const fmt = formatRupiah;
      const periodLabel = filterMode === "range" && startDate && endDate
        ? `${startDate} s/d ${endDate}`
        : `${MONTHS[bulan - 1]} ${tahun}`;
      const filterLabel = platform !== "all" ? platformLabel : "Semua Platform";
      const campaignLabel = selectedCampaign
        ? (selectedCampaign.campaign_name ?? selectedCampaign.nama_campaign ?? "")
        : "Semua Postingan";

      const totalSpend = adsDash?.total_spend ?? 0;
      const totalImpressions = adsDash?.total_impressions ?? 0;
      const totalClicks = adsDash?.total_clicks ?? 0;
      const totalReach = adsDash?.total_reach ?? 0;
      const totalResult = adsDash?.total_result ?? 0;
      const avgCtr = Number(adsDash?.avg_ctr ?? 0);
      const cpm = adsDash?.cpm ?? 0;
      const cpc = adsDash?.cpc ?? 0;
      const cpl = adsDash?.cpl ?? 0;
      const totalLeads = adsDash?.total_leads_db ?? 0;
      const hotLeads = adsDash?.hot_leads ?? 0;
      const surveyCount = adsDash?.survey_count ?? 0;
      const paidConversions = adsDash?.paid_conversions ?? 0;

      const summaryCards = [
        { label: "Total Spend", value: fmt(totalSpend) },
        { label: "Total Impressions", value: totalImpressions.toLocaleString("id-ID") },
        { label: "Total Reach", value: totalReach.toLocaleString("id-ID") },
        { label: "Total Klik", value: totalClicks.toLocaleString("id-ID") },
        { label: "CTR", value: `${avgCtr.toFixed(2)}%` },
        { label: "Result/Conversions", value: totalResult.toLocaleString("id-ID") },
        { label: "CPM", value: fmt(cpm) },
        { label: "CPC", value: fmt(cpc) },
        { label: "CPL", value: fmt(cpl) },
        { label: "Total Leads (DB)", value: totalLeads.toString() },
        { label: "Hot Leads", value: hotLeads.toString() },
        { label: "Survey Terjadwal", value: surveyCount.toString() },
        { label: "Paid Conversions", value: paidConversions.toString() },
      ].map((c) => `<div class="card"><div class="card-label">${c.label}</div><div class="card-value">${c.value}</div></div>`).join("");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Laporan Dashboard BD</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px;}
.cards-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;}
.card{border:1px solid #e2e8f0;border-radius:6px;padding:10px;background:#f8fafc;}
.card-label{font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:4px;}
.card-value{font-size:14px;font-weight:700;}
h1{font-size:16px;margin-bottom:4px;}
.sub{font-size:11px;color:#64748b;margin-bottom:16px;}
</style></head><body>
<h1>Laporan Dashboard BD</h1>
<div class="sub">Platform: ${filterLabel} | Iklan: ${campaignLabel} | Periode: ${periodLabel}</div>
<div class="cards-row">${summaryCards}</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

      const w = window.open("", "_blank");
      if (!w) { alert("Popup diblokir."); return; }
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
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={pdfLoading || isLoading}>
              <Printer className="h-4 w-4 mr-1" />
              {pdfLoading ? "Menyiapkan..." : "Save to PDF"}
            </Button>
            <Select value={platform} onValueChange={(v) => { setPlatform(v); setCampaignId("all"); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
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
            {/* Filter mode toggle */}
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "monthly" | "range")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Per Bulan</SelectItem>
                <SelectItem value="range">Rentang Tanggal</SelectItem>
              </SelectContent>
            </Select>
            {filterMode === "monthly" ? (
              <>
                <Select value={String(bulan)} onValueChange={(v) => setBulan(Number(v))}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Label className="text-xs whitespace-nowrap">Dari</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
                <Label className="text-xs whitespace-nowrap">s/d</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
              </div>
            )}
          </div>
        }
      />

      {(platform !== "all" || campaignId !== "all") && (
        <div className="flex gap-2 flex-wrap">
          {platform !== "all" && <Badge variant="secondary" className="text-xs">Platform: {platformLabel}</Badge>}
          {selectedCampaign && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {selectedCampaign.campaign_name ?? selectedCampaign.nama_campaign}
            </Badge>
          )}
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* Row 1: Ad metrics */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metrik Iklan</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Spend" value={formatRupiah(adsDash?.total_spend ?? 0)}
                numericValue={adsDash?.total_spend ?? 0} icon={DollarSign} color="text-red-600"
                target={target?.target_spend ?? null}
                targetLabel={target?.target_spend != null ? formatRupiah(target.target_spend) : undefined} />
              <StatCard label="Total Impressions" value={(adsDash?.total_impressions ?? 0).toLocaleString("id-ID")}
                numericValue={adsDash?.total_impressions ?? 0} icon={Eye} color="text-violet-600"
                target={target?.target_impressions ?? null}
                targetLabel={target?.target_impressions != null ? target.target_impressions.toLocaleString("id-ID") : undefined} />
              <StatCard label="Total Reach" value={(adsDash?.total_reach ?? 0).toLocaleString("id-ID")}
                icon={BarChart2} color="text-cyan-600" />
              <StatCard label="Result / Conversions" value={(adsDash?.total_result ?? 0).toLocaleString("id-ID")}
                numericValue={adsDash?.total_result ?? 0} icon={Target} color="text-emerald-600"
                target={target?.target_conversions ?? null}
                targetLabel={target?.target_conversions != null ? target.target_conversions.toLocaleString("id-ID") : undefined} />
            </div>
          </div>
          {/* Row 2: Click & cost metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Klik" value={(adsDash?.total_clicks ?? 0).toLocaleString("id-ID")}
              numericValue={adsDash?.total_clicks ?? 0} icon={MousePointerClick} color="text-blue-600"
              target={target?.target_clicks ?? null}
              targetLabel={target?.target_clicks != null ? target.target_clicks.toLocaleString("id-ID") : undefined} />
            <StatCard label="Rata-rata CTR" value={`${Number(adsDash?.avg_ctr ?? 0).toFixed(2)}%`}
              numericValue={Number(adsDash?.avg_ctr ?? 0)} icon={Percent} color="text-indigo-600"
              target={target?.target_ctr ?? null}
              targetLabel={target?.target_ctr != null ? `${target.target_ctr}%` : undefined} />
            <StatCard label="CPM (per 1000 tayangan)" value={formatRupiah(adsDash?.cpm ?? 0)}
              icon={TrendingUp} color="text-orange-600" />
            <StatCard label="CPC (per klik)" value={formatRupiah(adsDash?.cpc ?? 0)}
              icon={MousePointerClick} color="text-amber-600" />
          </div>
          {/* Row 2b: CPL from Meta */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="CPL (per result)" value={formatRupiah(adsDash?.cpl_meta ?? adsDash?.cpl ?? 0)}
              icon={DollarSign} color="text-pink-600"
              sub="Spend ÷ WA conversations" />
          </div>
          {/* Row 3: Lead metrics */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metrik Leads</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Leads" value={adsDash?.total_leads_db ?? 0}
                icon={Users} color="text-indigo-600"
                sub="Leads terhubung ke iklan ini" />
              <StatCard label="Hot Leads" value={adsDash?.hot_leads ?? 0}
                icon={Zap} color="text-red-600"
                sub={`${(adsDash?.total_leads_db ?? 0) > 0 ? Math.round(((adsDash?.hot_leads ?? 0) / (adsDash?.total_leads_db ?? 1)) * 100) : 0}% dari total`} />
              <StatCard label="Medium Leads" value={adsDash?.medium_leads ?? 0}
                icon={Users} color="text-yellow-600"
                sub={`${(adsDash?.total_leads_db ?? 0) > 0 ? Math.round(((adsDash?.medium_leads ?? 0) / (adsDash?.total_leads_db ?? 1)) * 100) : 0}% dari total`} />
              <StatCard label="Low Leads" value={adsDash?.low_leads ?? 0}
                icon={Users} color="text-slate-500"
                sub={`${(adsDash?.total_leads_db ?? 0) > 0 ? Math.round(((adsDash?.low_leads ?? 0) / (adsDash?.total_leads_db ?? 1)) * 100) : 0}% dari total`} />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Paid Conversions" value={adsDash?.paid_conversions ?? 0}
              icon={Award} color="text-emerald-700" sub="Invoice Lunas" />
            <StatCard label="Survey Terjadwal" value={adsDash?.survey_count ?? 0}
              icon={CalendarCheck} color="text-blue-600" sub="Dari kalender survey" />
          </div>
        </>
      )}

      {/* ── Dual Metric Comparison Chart ─────────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-3">
              <span className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Perbandingan Metrik Iklan
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs whitespace-nowrap">Sumbu Kiri (Y):</Label>
                <Select value={metricA} onValueChange={setMetricA}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHART_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label className="text-xs whitespace-nowrap">Sumbu Kanan (Y2):</Label>
                <Select value={metricB} onValueChange={setMetricB}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHART_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
            <p className="text-xs text-muted-foreground">Sumbu X: Waktu/Postingan · Garis Penuh = {metricADef.label} · Garis Putus = {metricBDef.label}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: metricADef.label, angle: -90, position: "insideLeft", style: { fontSize: 9 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: metricBDef.label, angle: 90, position: "insideRight", style: { fontSize: 9 } }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey={metricA} name={metricADef.label}
                  stroke={metricADef.color} dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey={metricB} name={metricBDef.label}
                  stroke={metricBDef.color} dot={false} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Metriks Iklan vs Metriks Leads Comparison Chart ──────────────────── */}
      {compareChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-3">
              <span className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Perbandingan Metriks Iklan vs Metriks Leads
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs whitespace-nowrap">Sumbu Kiri (Y):</Label>
                <Select value={compareX} onValueChange={setCompareX}>
                  <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__group_ads" disabled className="text-xs text-muted-foreground font-semibold">— Metriks Iklan —</SelectItem>
                    {CHART_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    <SelectItem value="__group_leads" disabled className="text-xs text-muted-foreground font-semibold">— Metriks Leads —</SelectItem>
                    {LEADS_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label className="text-xs whitespace-nowrap">Sumbu Kanan (Y2):</Label>
                <Select value={compareY} onValueChange={setCompareY}>
                  <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__group_ads" disabled className="text-xs text-muted-foreground font-semibold">— Metriks Iklan —</SelectItem>
                    {CHART_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    <SelectItem value="__group_leads" disabled className="text-xs text-muted-foreground font-semibold">— Metriks Leads —</SelectItem>
                    {LEADS_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
            <p className="text-xs text-muted-foreground">Sumbu X: Per Postingan Iklan · Garis Penuh = {compareXDef?.label} · Garis Putus = {compareYDef?.label}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={compareChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: compareXDef?.label, angle: -90, position: "insideLeft", style: { fontSize: 9 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: compareYDef?.label, angle: 90, position: "insideRight", style: { fontSize: 9 } }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey={compareX} name={compareXDef?.label}
                  stroke={compareXDef?.color} dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey={compareY} name={compareYDef?.label}
                  stroke={compareYDef?.color} dot={false} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Per-campaign table ─────────────────────────────────────────────────── */}
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
                    <th className="pb-2 font-medium text-right">Reach</th>
                    <th className="pb-2 font-medium text-right">Klik</th>
                    <th className="pb-2 font-medium text-right">CTR</th>
                    <th className="pb-2 font-medium text-right">Result</th>
                    <th className="pb-2 font-medium text-right">Spend</th>
                    <th className="pb-2 font-medium text-right">CPM</th>
                    <th className="pb-2 font-medium text-right">CPC</th>
                    <th className="pb-2 font-medium text-right">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {(adsDash?.campaigns ?? []).map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium max-w-[180px] truncate">
                        {c.campaign_name ?? (c as any).nama_campaign ?? "-"}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.platform === "Meta" ? "bg-blue-100 text-blue-700" : "bg-slate-900 text-white"}`}>
                          {c.platform ?? "Meta"}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-xs">{(c.total_impressions ?? 0).toLocaleString("id-ID")}</td>
                      <td className="py-2 text-right tabular-nums text-xs">{((c as any).total_reach ?? 0).toLocaleString("id-ID")}</td>
                      <td className="py-2 text-right tabular-nums text-xs">{(c.total_clicks ?? 0).toLocaleString("id-ID")}</td>
                      <td className="py-2 text-right tabular-nums text-xs">{Number(c.avg_ctr ?? 0).toFixed(2)}%</td>
                      <td className="py-2 text-right tabular-nums text-xs font-medium text-emerald-700">{(c as any).total_result ?? 0}</td>
                      <td className="py-2 text-right tabular-nums text-xs">{formatRupiah(c.total_spend ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums text-xs">{formatRupiah((c as any).cpm ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums text-xs">{formatRupiah((c as any).cpc ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums text-xs">
                        <span className="font-semibold text-indigo-600">{(c as any).leads_count ?? 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
