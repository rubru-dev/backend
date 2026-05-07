"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

const IDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("id-ID").format(n || 0);

function Card({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border bg-white p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{value}</p></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>;
}

export default function BdReportAnalyticsPage() {
  const now = new Date();
  const [bulan, setBulan] = useState(String(now.getMonth() + 1));
  const [tahun, setTahun] = useState(String(now.getFullYear()));
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

  function downloadPdf() {
    window.print();
  }

  const ig = data?.ads_organik?.instagram ?? {};
  const yt = data?.ads_organik?.youtube ?? {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Report dan Analytics BD</h1>
          <p className="text-sm text-muted-foreground">Tarikan data Ads, organik, leads, survey, dan closing.</p>
        </div>
        <Button variant="outline" onClick={downloadPdf}><Download className="h-4 w-4 mr-2" /> PDF</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end rounded-lg border bg-white p-3 print:hidden">
        <div><label className="text-xs text-muted-foreground">Tanggal mulai</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Tanggal selesai</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Bulan</label><Input type="number" min={1} max={12} value={bulan} onChange={(e) => setBulan(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Tahun</label><Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} /></div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Memuat data...</p> : (
        <>
          <Section title="Section 1 - Data Ads dan Organik">
            <div className="grid md:grid-cols-4 gap-3">
              <Card label="Total Spend Ads" value={IDR((data?.ads_organik?.ads ?? []).reduce((s: number, a: any) => s + a.spend, 0))} />
              <Card label="Total Klik Ads" value={num((data?.ads_organik?.ads ?? []).reduce((s: number, a: any) => s + a.clicks, 0))} />
              <Card label="Instagram Views" value={num(ig.total_views)} />
              <Card label="YouTube Views" value={num(yt.total_views)} />
              <Card label="IG Likes/Komen/Share" value={`${num(ig.total_likes)} / ${num(ig.total_comments)} / ${num(ig.total_shares)}`} />
              <Card label="IG Reach/Saves/Repost" value={`${num(ig.total_reach)} / ${num(ig.total_saves)} / ${num(ig.total_repost)}`} />
              <Card label="IG Followers/Profile/Link" value={`${num(ig.total_followers)} / ${num(ig.profile_visits)} / ${num(ig.link_clicks_bio)}`} />
              <Card label="YT Likes/Komen/Share" value={`${num(yt.total_likes)} / ${num(yt.total_comments)} / ${num(yt.total_shares)}`} />
            </div>
          </Section>

          <Section title="Section 2 - Data Sales Admin Rubahrumah">
            <div className="grid md:grid-cols-4 gap-3">
              <Card label="Total Leads" value={num(data?.sales_admin_rubahrumah?.leads?.total)} />
              <Card label="Total Survey" value={num(data?.sales_admin_rubahrumah?.survey?.total)} />
              <Card label="Survey Approved" value={num(data?.sales_admin_rubahrumah?.survey?.approved)} />
              <Card label="Survey Belum Approved" value={num(data?.sales_admin_rubahrumah?.survey?.pending)} />
            </div>
          </Section>

          <Section title="Section 3 - Data Sales Admin RKR dan Mitra">
            <div className="grid md:grid-cols-4 gap-3">
              <Card label="Leads RKR" value={num(data?.sales_admin_rkr_mitra?.rkr?.leads?.total)} />
              <Card label="Survey RKR Approved/Belum" value={`${num(data?.sales_admin_rkr_mitra?.rkr?.survey?.approved)} / ${num(data?.sales_admin_rkr_mitra?.rkr?.survey?.pending)}`} />
              <Card label="Leads Golden" value={num(data?.sales_admin_rkr_mitra?.golden?.leads?.total)} />
              <Card label="Survey Golden Approved/Belum" value={`${num(data?.sales_admin_rkr_mitra?.golden?.survey?.approved)} / ${num(data?.sales_admin_rkr_mitra?.golden?.survey?.pending)}`} />
            </div>
          </Section>

          <Section title="Section 4 - Closing Rubahrumah dan RKR">
            <div className="grid md:grid-cols-3 gap-3">
              <Card label="Total Closing" value={IDR(data?.closing_rubahrumah_rkr?.total_closing)} />
              <Card label="Total Card Closing" value={num(data?.closing_rubahrumah_rkr?.total_cards)} />
              <Card label="Jenis Closing" value={Object.entries(data?.closing_rubahrumah_rkr?.by_jenis ?? {}).map(([k, v]) => `${k}: ${IDR(Number(v))}`).join(" | ") || "-"} />
            </div>
          </Section>

          <Section title="Section 5 - Closing Golden">
            <div className="grid md:grid-cols-2 gap-3">
              <Card label="Total Harga Golden" value={IDR(data?.closing_golden?.total_harga)} />
              <Card label="Total Invoice" value={num(data?.closing_golden?.total_invoice)} />
            </div>
          </Section>

          <Section title="Section 6 - Closing Filter Air">
            <div className="grid md:grid-cols-3 gap-3">
              <Card label="Total Harga Filter Air" value={IDR(data?.closing_filter_air?.total_harga)} />
              <Card label="Total Invoice" value={num(data?.closing_filter_air?.total_invoice)} />
              <Card label="Jenis" value={Object.entries(data?.closing_filter_air?.by_jenis ?? {}).map(([k, v]) => `${k}: ${IDR(Number(v))}`).join(" | ") || "-"} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
