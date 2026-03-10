"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
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
import { metaAdsApi } from "@/lib/api/meta-ads";
import { formatRupiah } from "@/lib/utils";

export default function MetaAdsCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);
  const router = useRouter();

  const { data: campaign, isLoading } = useQuery({
    queryKey: [`/bd/meta-ads/campaigns/${campaignId}`],
    queryFn: () => metaAdsApi.get(Number(campaignId)),
  });

  const { data: contentMetrics } = useQuery({
    queryKey: [`/bd/meta-ads/campaigns/${campaignId}/content-metrics`],
    queryFn: () => metaAdsApi.getContentMetrics(Number(campaignId)),
    enabled: !!campaign,
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
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!campaign) return null;

  // Chart data: merge content metrics by date
  const chartData = (contentMetrics ?? []).map((m) => ({
    date: format(new Date(m.tanggal), "d MMM", { locale: id }),
    spend: Number(m.spend ?? 0),
    clicks: m.clicks ?? 0,
    ctr: Number(m.ctr ?? 0),
    results: m.results ?? 0,
  }));

  const statCards = [
    { label: "Total Spend", value: formatRupiah(campaign.total_spend), color: "text-red-600" },
    { label: "Total Klik", value: (campaign.total_clicks ?? 0).toLocaleString("id-ID"), color: "text-blue-600" },
    { label: "Rata-rata CTR", value: `${Number(campaign.avg_ctr ?? 0).toFixed(2)}%`, color: "text-indigo-600" },
    { label: "Total Conversions", value: (campaign.total_conversions ?? 0).toLocaleString("id-ID"), color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{campaign.nama_campaign}</h1>
          <div className="flex items-center gap-2 mt-1">
            {campaign.campaign_id && (
              <span className="text-xs font-mono text-muted-foreground">{campaign.campaign_id}</span>
            )}
            {campaign.status && (
              <Badge variant={campaign.status === "ACTIVE" ? "success" : "secondary"}>
                {campaign.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spend & Clicks chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performa Harian</CardTitle>
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
                <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend (Rp)" stroke="#ef4444" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="clicks" name="Klik" stroke="#3b82f6" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="results" name="Conversions" stroke="#10b981" dot={false} />
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
                { label: "Total Chat", key: "total_chat", color: "bg-blue-100 text-blue-700" },
                { label: "Direspons", key: "responded", color: "bg-emerald-100 text-emerald-700" },
                { label: "Tdk Direspons", key: "not_responded", color: "bg-red-100 text-red-700" },
                { label: "Converted", key: "converted", color: "bg-indigo-100 text-indigo-700" },
                { label: "Follow Up", key: "follow_up", color: "bg-amber-100 text-amber-700" },
              ].map((f) => {
                const total = chatMetrics.reduce((s, m) => s + (m[f.key as keyof typeof m] as number ?? 0), 0);
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
