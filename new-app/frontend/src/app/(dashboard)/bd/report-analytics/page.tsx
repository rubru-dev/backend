"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

const IDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("id-ID").format(n || 0);

const TABS = [
  ["all", "Semua"],
  ["ads", "Ads dan Organik"],
  ["rubahrumah", "Data Sales Admin Rubahrumah"],
  ["rkr", "Data Sales Admin Produk RKR"],
  ["golden", "Data Sales Admin Produk Golden"],
  ["filter-air", "Data Sales Admin Produk Filter Air"],
  ["closing-rkr", "Closing Rubahrumah dan RKR"],
  ["closing-golden-filter", "Closing Golden dan Filter Air"],
] as const;

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{value}</p></div>;
}

function Block({ title, children }: { title: string; children: any }) {
  return <section className="space-y-3"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>;
}

function LeadSurveyCards({ leads, survey, extra }: { leads: any; survey: any; extra?: any }) {
  return (
    <div className="grid md:grid-cols-4 gap-3">
      <MetricCard label="Total Leads" value={num(leads?.total)} />
      <MetricCard label="Total Survey" value={num(survey?.total)} />
      <MetricCard label="Survey Approved" value={num(survey?.approved)} />
      <MetricCard label="Survey Belum Approved" value={num(survey?.pending)} />
      {extra && <MetricCard label={extra.label} value={extra.value} />}
    </div>
  );
}

export default function BdReportAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number][0]>("all");
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = useMemo(() => ({
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    ...(!startDate && !endDate && bulan ? { bulan } : {}),
    ...(!startDate && !endDate && tahun ? { tahun } : {}),
  }), [bulan, tahun, startDate, endDate]);

  const { data, isLoading } = useQuery({
    queryKey: ["bd-report-analytics", params],
    queryFn: () => apiClient.get("/bd/report-analytics", { params }).then((r) => r.data),
  });

  const ig = data?.ads_organik?.instagram ?? {};
  const yt = data?.ads_organik?.youtube ?? {};
  const ads = data?.ads_organik?.ads ?? [];
  const adTotals = ads.reduce((acc: any, a: any) => ({
    spend: acc.spend + a.spend,
    clicks: acc.clicks + a.clicks,
    impressions: acc.impressions + a.impressions,
    reach: acc.reach + a.reach,
    result: acc.result + a.result,
  }), { spend: 0, clicks: 0, impressions: 0, reach: 0, result: 0 });

  const show = (key: typeof activeTab) => activeTab === "all" || activeTab === key;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Report dan Analytics BD</h1>
          <p className="text-sm text-muted-foreground">Jika filter kosong, semua data ditampilkan.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4 mr-2" /> PDF</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end rounded-lg border bg-white p-3 print:hidden">
        <div><label className="text-xs text-muted-foreground">Tanggal mulai</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Tanggal selesai</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Bulan</label><Input type="number" min={1} max={12} value={bulan} onChange={(e) => setBulan(e.target.value)} placeholder="Semua" /></div>
        <div><label className="text-xs text-muted-foreground">Tahun</label><Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} placeholder="Semua" /></div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b print:hidden">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Memuat data...</p> : (
        <div className="space-y-8">
          {show("ads") && <Block title="Ads dan Organik">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Ads</h3>
                <div className="grid md:grid-cols-5 gap-3">
                  <MetricCard label="Spend" value={IDR(adTotals.spend)} />
                  <MetricCard label="Klik" value={num(adTotals.clicks)} />
                  <MetricCard label="Impressions" value={num(adTotals.impressions)} />
                  <MetricCard label="Reach" value={num(adTotals.reach)} />
                  <MetricCard label="Result" value={num(adTotals.result)} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Organik - Instagram</h3>
                <div className="grid md:grid-cols-4 gap-3">
                  <MetricCard label="Total View" value={num(ig.total_views)} />
                  <MetricCard label="Total Likes" value={num(ig.total_likes)} />
                  <MetricCard label="Total Komen" value={num(ig.total_comments)} />
                  <MetricCard label="Total Share" value={num(ig.total_shares)} />
                  <MetricCard label="Avg Engagement Rate" value={`${Number(ig.avg_engagement_rate || 0).toFixed(2)}%`} />
                  <MetricCard label="Total Saves" value={num(ig.total_saves)} />
                  <MetricCard label="Total Reach" value={num(ig.total_reach)} />
                  <MetricCard label="Total Repost" value={num(ig.total_repost)} />
                  <MetricCard label="Profile Visits" value={num(ig.profile_visits)} />
                  <MetricCard label="Link Klik (Bio)" value={num(ig.link_clicks_bio)} />
                  <MetricCard label="Total Followers" value={num(ig.total_followers)} />
                  <MetricCard label="Watch Time (mnt)" value={num(ig.watch_time_minutes)} />
                  <MetricCard label="Total Konten" value={num(ig.total_konten)} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Organik - YouTube</h3>
                <div className="grid md:grid-cols-4 gap-3">
                  <MetricCard label="Total Views" value={num(yt.total_views)} />
                  <MetricCard label="Total Likes" value={num(yt.total_likes)} />
                  <MetricCard label="Total Komentar" value={num(yt.total_comments)} />
                  <MetricCard label="Total Shares" value={num(yt.total_shares)} />
                  <MetricCard label="Avg Engagement Rate" value={`${Number(yt.avg_engagement_rate || 0).toFixed(2)}%`} />
                  <MetricCard label="Watch Time (mnt)" value={num(yt.watch_time_minutes)} />
                  <MetricCard label="Total Konten" value={num(yt.total_konten)} />
                </div>
              </div>
            </div>
          </Block>}

          {show("rubahrumah") && <Block title="Data Sales Admin Rubahrumah"><LeadSurveyCards leads={data?.sales_admin_rubahrumah?.leads} survey={data?.sales_admin_rubahrumah?.survey} /></Block>}
          {show("rkr") && <Block title="Data Sales Admin Produk RKR"><LeadSurveyCards leads={data?.sales_admin_rkr_mitra?.rkr?.leads} survey={data?.sales_admin_rkr_mitra?.rkr?.survey} /></Block>}
          {show("golden") && <Block title="Data Sales Admin Produk Golden"><LeadSurveyCards leads={data?.sales_admin_rkr_mitra?.golden?.leads} survey={data?.sales_admin_rkr_mitra?.golden?.survey} extra={{ label: "Kalender After Pengerjaan", value: `${num(data?.sales_admin_rkr_mitra?.golden?.pengerjaan?.total)} total / ${num(data?.sales_admin_rkr_mitra?.golden?.pengerjaan?.approved)} approved` }} /></Block>}
          {show("filter-air") && <Block title="Data Sales Admin Produk Filter Air"><LeadSurveyCards leads={data?.sales_admin_rkr_mitra?.filter_air?.leads} survey={data?.sales_admin_rkr_mitra?.filter_air?.survey} extra={{ label: "Kalender Instalasi Filter Air", value: `${num(data?.sales_admin_rkr_mitra?.filter_air?.pengerjaan?.total)} total / ${num(data?.sales_admin_rkr_mitra?.filter_air?.pengerjaan?.approved)} approved` }} /></Block>}

          {show("closing-rkr") && <Block title="Closing Rubahrumah dan RKR">
            <div className="grid md:grid-cols-3 gap-3">
              <MetricCard label="Total Closing Kanban Sales" value={IDR(data?.closing_rubahrumah_rkr?.total_closing)} />
              <MetricCard label="Total Card Closing" value={num(data?.closing_rubahrumah_rkr?.total_cards)} />
              <MetricCard label="Kategori Payment" value={Object.entries(data?.closing_rubahrumah_rkr?.by_payment_category ?? {}).map(([k, v]) => `${k}: ${IDR(Number(v))}`).join(" | ") || "-"} />
            </div>
          </Block>}

          {show("closing-golden-filter") && <Block title="Closing Golden dan Filter Air">
            <div className="grid md:grid-cols-4 gap-3">
              <MetricCard label="Total Closing Golden" value={IDR(data?.closing_golden?.total_harga)} />
              <MetricCard label="Invoice Golden" value={num(data?.closing_golden?.total_invoice)} />
              <MetricCard label="Total Closing Filter Air" value={IDR(data?.closing_filter_air?.total_harga)} />
              <MetricCard label="Jenis Filter Air" value={Object.entries(data?.closing_filter_air?.by_jenis ?? {}).map(([k, v]) => `${k}: ${IDR(Number(v))}`).join(" | ") || "-"} />
            </div>
          </Block>}
        </div>
      )}
    </div>
  );
}
