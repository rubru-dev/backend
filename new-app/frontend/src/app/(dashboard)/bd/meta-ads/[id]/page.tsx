"use client";

import { use, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { metaAdsApi } from "@/lib/api/meta-ads";
import { formatRupiah } from "@/lib/utils";

const CHART_METRICS = [
  { value: "spend", label: "Spend (Rp)", color: "#ef4444" },
  { value: "impressions", label: "Impressions", color: "#8b5cf6" },
  { value: "reach", label: "Reach", color: "#06b6d4" },
  { value: "clicks", label: "Klik", color: "#3b82f6" },
  { value: "ctr", label: "CTR (%)", color: "#6366f1" },
  { value: "conversions", label: "Result", color: "#10b981" },
  { value: "cpm", label: "CPM", color: "#f59e0b" },
  { value: "cpc", label: "CPC", color: "#f97316" },
];

export default function MetaAdsCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [metricA, setMetricA] = useState("spend");
  const [metricB, setMetricB] = useState("clicks");

  const dateParams = useMemo(() => ({
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  }), [startDate, endDate]);

  const { data: campaign, isLoading } = useQuery({
    queryKey: [`/bd/meta-ads/campaigns/${campaignId}`, dateParams],
    queryFn: () => metaAdsApi.getCampaignDetail(Number(campaignId), dateParams),
  });

  const { data: chatMetrics } = useQuery({
    queryKey: [`/bd/meta-ads/campaigns/${campaignId}/chat-metrics`],
    queryFn: () => metaAdsApi.getChatMetrics(Number(campaignId)),
    enabled: !!campaign,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!campaign) return null;

  const chartData = (campaign.content_metrics ?? []).map((m) => ({
    date: format(new Date(m.date), "d MMM", { locale: id }),
    spend: m.spend,
    impressions: m.impressions,
    reach: m.reach,
    clicks: m.clicks,
    ctr: m.ctr,
    conversions: m.conversions,
    cpm: m.cpm,
    cpc: m.cpc,
  }));

  const metricADef = CHART_METRICS.find((m) => m.value === metricA)!;
  const metricBDef = CHART_METRICS.find((m) => m.value === metricB)!;

  const statCards = [
    { label: "Total Spend", value: formatRupiah(campaign.total_spend ?? 0), color: "text-red-600" },
    { label: "Total Impressions", value: (campaign.total_impressions ?? 0).toLocaleString("id-ID"), color: "text-violet-600" },
    { label: "Total Reach", value: (campaign.total_reach ?? 0).toLocaleString("id-ID"), color: "text-cyan-600" },
    { label: "Result / Conversions", value: (campaign.total_result ?? 0).toLocaleString("id-ID"), color: "text-emerald-600" },
    { label: "Total Klik", value: (campaign.total_clicks ?? 0).toLocaleString("id-ID"), color: "text-blue-600" },
    { label: "Rata-rata CTR", value: `${Number(campaign.avg_ctr ?? 0).toFixed(2)}%`, color: "text-indigo-600" },
    { label: "CPM", value: formatRupiah(campaign.cpm ?? 0), color: "text-orange-600" },
    { label: "CPC", value: formatRupiah(campaign.cpc ?? 0), color: "text-amber-600" },
  ];

  const leadCards = [
    { label: "Total Leads", value: campaign.total_leads ?? 0, color: "text-indigo-600", sub: "Leads terhubung ke iklan" },
    { label: "Hot Leads", value: campaign.hot_leads ?? 0, color: "text-red-600", sub: "Status Hot dari sales admin" },
    { label: "CPL (per leads)", value: formatRupiah(campaign.cpl ?? 0), color: "text-pink-600", sub: null },
    { label: "Paid Conversions", value: campaign.paid_conversions ?? 0, color: "text-emerald-700", sub: "Invoice Lunas" },
    { label: "Survey Terjadwal", value: campaign.survey_count ?? 0, color: "text-blue-600", sub: "Dari kalender survey" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{campaign.campaign_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {campaign.meta_campaign_id && (
              <span className="text-xs font-mono text-muted-foreground">{campaign.meta_campaign_id}</span>
            )}
            {campaign.status && (
              <Badge variant={campaign.status === "ACTIVE" || campaign.status === "aktif" ? "default" : "secondary"}>
                {campaign.status}
              </Badge>
            )}
          </div>
        </div>
        {/* Date range filter */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Label className="text-xs whitespace-nowrap">Filter tanggal:</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
          <span className="text-xs text-muted-foreground">s/d</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStartDate(""); setEndDate(""); }}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Ad metric cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metrik Iklan</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Lead metric cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metrik Leads</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {leadCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-xl font-bold ${s.color}`}>
                  {typeof s.value === "number" ? s.value.toLocaleString("id-ID") : s.value}
                </p>
                {s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dual metric chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-3">
              <span>Perbandingan Metrik Harian</span>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Metrik A:</Label>
                <Select value={metricA} onValueChange={setMetricA}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHART_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label className="text-xs whitespace-nowrap">Metrik B:</Label>
                <Select value={metricB} onValueChange={setMetricB}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHART_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
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

      {/* WhatsApp Chat funnel */}
      {chatMetrics && chatMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WhatsApp Chat Funnel (Total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: "Total Chat", key: "chats_received", color: "bg-blue-100 text-blue-700" },
                { label: "Direspons", key: "chats_responded", color: "bg-emerald-100 text-emerald-700" },
                { label: "Converted", key: "total_conversions", color: "bg-indigo-100 text-indigo-700" },
              ].map((f) => {
                const total = chatMetrics.reduce((s, m) => s + ((m as any)[f.key] ?? 0), 0);
                return (
                  <div key={f.key} className={`rounded-lg p-4 text-center ${f.color}`}>
                    <p className="text-2xl font-bold">{total}</p>
                    <p className="text-xs font-medium mt-1">{f.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
