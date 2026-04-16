"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, MessageSquare, TrendingUp, MousePointerClick, Eye, Target,
  DollarSign, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { goldenMetaAdsApi } from "@/lib/api/golden-meta-ads";

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

const now = new Date();
const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

const CHART_METRICS = [
  { value: "impressions", label: "Impressions", color: "#8b5cf6" },
  { value: "reach",       label: "Reach",       color: "#06b6d4" },
  { value: "clicks",      label: "Klik",         color: "#3b82f6" },
  { value: "conversions", label: "Conversions",  color: "#10b981" },
  { value: "spend",       label: "Spend (Rp)",   color: "#ef4444" },
];

function StatCard({
  title, value, icon: Icon, color,
}: { title: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{title}</p>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatRupiah(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

function formatShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function GoldenDashboardAdsPage() {
  const [bulan, setBulan] = useState<number | null>(null);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [lineMetric, setLineMetric] = useState("impressions");
  const [barMetric, setBarMetric] = useState("impressions");

  const params = {
    bulan: bulan ?? undefined,
    tahun,
    campaign_id: campaignId ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["/golden/meta-ads/dashboard", params],
    queryFn: () => goldenMetaAdsApi.getDashboard(params),
    staleTime: 60_000,
  });

  const { data: campaignsData } = useQuery({
    queryKey: ["/golden/meta-ads/campaigns"],
    queryFn: () => goldenMetaAdsApi.listCampaigns(),
    staleTime: 5 * 60_000,
  });
  const campaigns = (campaignsData?.items ?? []).filter((c) => !c.is_hidden);

  const summary = (data as any)?.summary ?? {};
  const totalSpend        = summary.total_spend ?? 0;
  const totalImpressions  = summary.total_impressions ?? 0;
  const totalReach        = summary.total_reach ?? 0;
  const totalClicks       = summary.total_clicks ?? 0;
  const totalConversions  = summary.total_conversions ?? 0;
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const cpm    = totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0;
  const cpc    = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
  const cpl    = totalConversions > 0 ? (totalSpend / totalConversions) : 0;

  const allCampaigns: any[] = (data as any)?.campaigns ?? [];
  const timeSeries: any[]   = (data as any)?.time_series ?? [];

  // Format time series for chart
  const chartData = timeSeries.map((d: any) => ({
    ...d,
    label: d.date?.slice(5), // MM-DD
  }));

  // Per-campaign bar data
  const barData = allCampaigns.map((c: any) => ({
    name: c.campaign_name?.length > 15 ? c.campaign_name.slice(0, 15) + "…" : c.campaign_name,
    impressions: c.impressions ?? 0,
    reach:       c.reach ?? 0,
    clicks:      c.clicks ?? 0,
    conversions: c.conversions ?? 0,
    spend:       c.spend ?? 0,
  }));

  const lineMetricDef = CHART_METRICS.find((m) => m.value === lineMetric)!;
  const barMetricDef  = CHART_METRICS.find((m) => m.value === barMetric)!;
  const isCurrency = (m: string) => m === "spend";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Ads Golden"
        description="Ringkasan performa iklan RubahrumahxGolden"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={bulan === null ? "all" : String(bulan)}
          onValueChange={(v) => setBulan(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="w-36"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={campaignId === null ? "all" : String(campaignId)}
          onValueChange={(v) => setCampaignId(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="w-56"><SelectValue placeholder="Semua Kampanye" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kampanye</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.campaign_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 11 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* Performa Iklan */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Performa Iklan</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard title="Total Impressions"    value={totalImpressions.toLocaleString("id-ID")} icon={Eye}              color="text-purple-500" />
              <StatCard title="Total Reach"          value={totalReach.toLocaleString("id-ID")}       icon={Users}            color="text-blue-500" />
              <StatCard title="Result / Conversions" value={totalConversions.toLocaleString("id-ID")} icon={Target}           color="text-emerald-500" />
              <StatCard title="Total Klik"           value={totalClicks.toLocaleString("id-ID")}      icon={MousePointerClick} color="text-indigo-500" />
              <StatCard title="Rata-rata CTR"        value={`${avgCtr}%`}                             icon={TrendingUp}       color="text-cyan-500" />
              <StatCard title="CPM (per 1000 tayang)" value={formatRupiah(cpm)}                       icon={BarChart3}        color="text-orange-500" />
              <StatCard title="CPC (per klik)"       value={formatRupiah(cpc)}                        icon={DollarSign}       color="text-rose-500" />
              <StatCard title="CPL (per result)"     value={formatRupiah(cpl)}                        icon={DollarSign}       color="text-amber-500" />
            </div>
          </div>

          {/* Metriks Leads */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Metriks Leads</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard title="Total Leads"       value={totalConversions.toLocaleString("id-ID")}    icon={Users}        color="text-emerald-600" />
              <StatCard title="Paid Conversions"  value={allCampaigns.reduce((s: number, c: any) => s + (c.conversions ?? 0), 0).toLocaleString("id-ID")} icon={Target} color="text-blue-600" />
              <StatCard title="Survey Terjadwal"  value={(data as any)?.survey_terjadwal ?? 0}        icon={MessageSquare} color="text-violet-600" />
            </div>
          </div>

          {/* Line Chart — Tren Harian */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm">Tren Harian</CardTitle>
                  <Select value={lineMetric} onValueChange={setLineMetric}>
                    <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHART_METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => isCurrency(lineMetric) ? formatShort(v) : formatShort(v)}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v: number) => isCurrency(lineMetric) ? formatRupiah(v) : v.toLocaleString("id-ID")}
                    />
                    <Line
                      type="monotone"
                      dataKey={lineMetric}
                      stroke={lineMetricDef.color}
                      strokeWidth={2}
                      dot={false}
                      name={lineMetricDef.label}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Bar Chart — Per Kampanye */}
          {barData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm">Perbandingan Per Kampanye</CardTitle>
                  <Select value={barMetric} onValueChange={setBarMetric}>
                    <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHART_METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatShort}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v: number) => isCurrency(barMetric) ? formatRupiah(v) : v.toLocaleString("id-ID")}
                    />
                    <Bar dataKey={barMetric} fill={barMetricDef.color} radius={[3, 3, 0, 0]} name={barMetricDef.label} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Per Campaign Detail */}
          {allCampaigns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detail Per Kampanye</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {allCampaigns.map((c: any) => {
                  const imp  = c.impressions ?? 0;
                  const clk  = c.clicks ?? 0;
                  const conv = c.conversions ?? 0;
                  const spd  = c.spend ?? 0;
                  const ctrC = imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0.00";
                  if (imp === 0 && clk === 0 && conv === 0) return null;
                  return (
                    <Card key={c.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{c.campaign_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{c.platform}</p>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-y-1 text-xs">
                        {imp > 0 && <><span className="text-muted-foreground">Impressions</span><span className="font-medium text-right">{imp.toLocaleString("id-ID")}</span></>}
                        {(c.reach ?? 0) > 0 && <><span className="text-muted-foreground">Reach</span><span className="font-medium text-right">{(c.reach ?? 0).toLocaleString("id-ID")}</span></>}
                        {clk > 0 && <><span className="text-muted-foreground">Klik</span><span className="font-medium text-right">{clk.toLocaleString("id-ID")}</span></>}
                        <><span className="text-muted-foreground">CTR</span><span className="font-medium text-right">{ctrC}%</span></>
                        {conv > 0 && <><span className="text-muted-foreground">Conversions</span><span className="font-medium text-right">{conv.toLocaleString("id-ID")}</span></>}
                        {spd > 0 && <><span className="text-muted-foreground">Spend</span><span className="font-medium text-right">{formatRupiah(spd)}</span></>}
                        {spd > 0 && conv > 0 && <><span className="text-muted-foreground">CPL</span><span className="font-medium text-right">{formatRupiah(spd / conv)}</span></>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
