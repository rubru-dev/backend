"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
const number = (value: unknown) => new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
const rupiah = (value: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const days = (value: unknown) => value == null ? "—" : `${number(value)} hari`;

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}

function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-medium">{header}</th>)}</tr></thead><tbody>{empty ? <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-muted-foreground">Belum ada data pada periode ini.</td></tr> : children}</tbody></table></div>;
}

export default function BdReportAnalyticsPage() {
  const today = new Date();
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(today.getFullYear()));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adsSource, setAdsSource] = useState<"actual" | "manual">("actual");
  const params = useMemo(() => ({
    ...(startDate || endDate ? { start_date: startDate || undefined, end_date: endDate || undefined } : {}),
    ...(!startDate && !endDate && month ? { bulan: month } : {}),
    ...(!startDate && !endDate && year ? { tahun: year } : {}),
    ads_source: adsSource,
  }), [month, year, startDate, endDate, adsSource]);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["bd-report-analytics", params],
    queryFn: () => apiClient.get("/bd/report-analytics", { params }).then((response) => response.data),
  });
  const ads = data?.ads_organik?.ads ?? [];
  const totals = data?.ads_organik?.ads_totals ?? {};
  const social = data?.ads_organik?.social_posts ?? [];
  const funnel = data?.funnel ?? {};
  const funnelRows = funnel.rows ?? [];
  const closing = data?.closing_detail ?? {};
  const closingRows = closing.rows ?? [];

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Report dan Analytics BD</h1><p className="text-sm text-muted-foreground">Detail performa iklan, media sosial, funnel lead, dan closing sales.</p></div>
        <Button variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />Cetak / PDF</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3 print:hidden">
        <label className="space-y-1 text-xs text-muted-foreground">Tanggal mulai<Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Tanggal selesai<Input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label className="space-y-1 text-xs text-muted-foreground">Bulan<select value={month} onChange={(event) => setMonth(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Semua bulan</option>{MONTHS.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}</select></label>
        <label className="space-y-1 text-xs text-muted-foreground">Tahun<select value={year} onChange={(event) => setYear(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">{YEARS.map((value) => <option key={value} value={String(value)}>{value}</option>)}</select></label>
        <div className="ml-auto flex rounded-md border bg-muted/30 p-1"><button type="button" onClick={() => setAdsSource("actual")} className={`rounded px-3 py-1.5 text-xs ${adsSource === "actual" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>Actual Meta</button><button type="button" onClick={() => setAdsSource("manual")} className={`rounded px-3 py-1.5 text-xs ${adsSource === "manual" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>Data lokal</button></div>
        {(startDate || endDate) && <p className="w-full text-xs text-muted-foreground">Rentang tanggal aktif; filter bulan dan tahun diabaikan selama rentang tanggal digunakan.</p>}
      </div>

      <Tabs defaultValue="ads">
        <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4 print:hidden">
          <TabsTrigger value="ads">Ads Detail Report</TabsTrigger>
          <TabsTrigger value="social">Social Media Detail Report</TabsTrigger>
          <TabsTrigger value="funnel">Funneling Detail</TabsTrigger>
          <TabsTrigger value="closing">Closing Detail</TabsTrigger>
        </TabsList>
        {isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Memuat laporan...</p> : isError ? <p className="py-10 text-center text-sm text-destructive">{(error as any)?.response?.data?.detail || "Gagal memuat laporan BD."}</p> : <>
          <TabsContent value="ads" className="space-y-4">
            <p className="text-xs text-muted-foreground">Sumber: {data?.ads_organik?.ads_data_source === "realtime" ? "Meta Ads API" : data?.ads_organik?.ads_data_source === "manual" ? "Data lokal/manual" : "Data lokal (fallback)"}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Spend" value={rupiah(totals.spend)} /><Metric label="Klik" value={number(totals.clicks)} /><Metric label="Impressions" value={number(totals.impressions)} /><Metric label="Reach" value={number(totals.reach)} /><Metric label="Result" value={number(totals.result)} /></div>
            <DataTable headers={["Campaign", "Platform", "Status", "Spend", "Impressions", "Reach", "Klik", "Result"]} empty={ads.length === 0}>{ads.map((item: any) => <tr key={item.id} className="border-t"><td className="px-3 py-2 font-medium">{item.campaign_name || "Tanpa nama"}</td><td className="px-3 py-2">{item.platform || "Meta"}</td><td className="px-3 py-2">{item.status || "—"}</td><td className="px-3 py-2">{rupiah(item.spend)}</td><td className="px-3 py-2">{number(item.impressions)}</td><td className="px-3 py-2">{number(item.reach)}</td><td className="px-3 py-2">{number(item.clicks)}</td><td className="px-3 py-2">{number(item.result)}</td></tr>)}</DataTable>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            {(["Instagram", "YouTube", "TikTok"] as const).map((platform) => {
              const rows = social.filter((post: any) => String(post.platform).toLowerCase() === platform.toLowerCase());
              const totalViews = rows.reduce((sum: number, post: any) => sum + Number(post.views || 0), 0);
              const totalLikes = rows.reduce((sum: number, post: any) => sum + Number(post.likes || 0), 0);
              return <section key={platform} className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">{platform}</h2><span className="text-xs text-muted-foreground">{rows.length ? `${number(rows.length)} konten` : "Placeholder — data belum tersedia"}</span></div>
                <div className="grid gap-3 sm:grid-cols-3"><Metric label="Konten" value={number(rows.length)} /><Metric label="Views" value={number(totalViews)} /><Metric label="Likes" value={number(totalLikes)} /></div>
                {platform === "TikTok" && rows.length === 0 ? <div className="rounded-lg border border-dashed bg-white p-5 text-sm text-muted-foreground">Belum ada data TikTok. Bagian ini siap menampilkan metrik saat data tersedia.</div> : <DataTable headers={["Tanggal", "Akun", "Konten", "Views", "Reach", "Likes", "Komentar", "Share", "Saves", "Engagement"]} empty={rows.length === 0}>{rows.map((post: any) => <tr key={`${platform}-${post.id}`} className="border-t"><td className="px-3 py-2">{date(post.tanggal)}</td><td className="px-3 py-2">{post.account_name}</td><td className="max-w-[260px] truncate px-3 py-2">{post.link_konten ? <a className="text-primary underline" href={post.link_konten} target="_blank" rel="noreferrer">{post.judul_konten}</a> : post.judul_konten}</td><td className="px-3 py-2">{number(post.views)}</td><td className="px-3 py-2">{number(post.reach)}</td><td className="px-3 py-2">{number(post.likes)}</td><td className="px-3 py-2">{number(post.comments)}</td><td className="px-3 py-2">{number(post.shares)}</td><td className="px-3 py-2">{number(post.saves)}</td><td className="px-3 py-2">{Number(post.engagement_rate || 0).toFixed(2)}%</td></tr>)}</DataTable>}</section>;
            })}
          </TabsContent>

          <TabsContent value="funnel" className="space-y-4">
            <p className="text-xs text-muted-foreground">Cohort berdasarkan tanggal lead masuk di Sales Admin. DP dihitung dari invoice Payment Desain berstatus Lunas dan memiliki kwitansi; SPK dihitung jika proyek tercatat dan pembayaran Payment Projek lunas mencapai Rp10.000.000.</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Leads Sales Admin" value={number(funnel.total_leads)} /><Metric label="Masuk Survey" value={number(funnel.survey)} detail={`Selisih: ${number(Math.max(0, (funnel.total_leads || 0) - (funnel.survey || 0)))} lead`} /><Metric label="DP Desain Lunas" value={number(funnel.dp_desain)} detail={`Selisih dari survey: ${number(Math.max(0, (funnel.survey || 0) - (funnel.dp_desain || 0)))}`} /><Metric label="SPK Projek" value={number(funnel.spk)} detail={`Selisih dari DP desain: ${number(Math.max(0, (funnel.dp_desain || 0) - (funnel.spk || 0)))}`} /></div>
            <div className="grid gap-3 sm:grid-cols-3"><Metric label="Lead → Survey" value={days(funnel.avg_days_lead_to_survey)} detail="Rata-rata waktu" /><Metric label="Survey → DP Desain" value={days(funnel.avg_days_survey_to_design_dp)} detail="Rata-rata waktu" /><Metric label="DP Desain → SPK" value={days(funnel.avg_days_design_to_spk)} detail="Rata-rata waktu" /></div>
            <DataTable headers={["Lead", "Sales Admin", "Tgl. Masuk", "Survey", "DP Desain", "SPK", "Lead → Survey", "Survey → DP", "DP → SPK", "DP Projek Lunas"]} empty={funnelRows.length === 0}>{funnelRows.map((row: any) => <tr key={row.lead_id} className="border-t"><td className="px-3 py-2 font-medium">{row.nama}</td><td className="px-3 py-2">{row.sales}</td><td className="px-3 py-2">{date(row.tanggal_masuk)}</td><td className="px-3 py-2">{date(row.tanggal_survey)}</td><td className="px-3 py-2">{date(row.tanggal_dp_desain)}</td><td className="px-3 py-2">{date(row.tanggal_spk)}</td><td className="px-3 py-2">{days(row.days_lead_to_survey)}</td><td className="px-3 py-2">{days(row.days_survey_to_design_dp)}</td><td className="px-3 py-2">{days(row.days_design_to_spk)}</td><td className="px-3 py-2">{rupiah(row.dp_projek_lunas)}</td></tr>)}</DataTable>
          </TabsContent>

          <TabsContent value="closing" className="space-y-4">
            <p className="text-xs text-muted-foreground">Closing dihitung dari kartu di kolom Closing pada Kanban Sales dalam periode yang dipilih.</p>
            <div className="grid gap-3 sm:grid-cols-3"><Metric label="Jumlah Sales" value={number(closing.total_sales)} /><Metric label="Total Closing" value={number(closing.total_closing)} /><Metric label="Proyeksi Nominal" value={rupiah(closing.total_nominal)} /></div>
            <DataTable headers={["Sales", "Jumlah Closing", "Proyeksi Nominal"]} empty={(closing.by_sales ?? []).length === 0}>{(closing.by_sales ?? []).map((row: any) => <tr key={row.sales} className="border-t"><td className="px-3 py-2 font-medium">{row.sales}</td><td className="px-3 py-2">{number(row.total)}</td><td className="px-3 py-2">{rupiah(row.nominal)}</td></tr>)}</DataTable>
            <DataTable headers={["Client", "Sales", "Tanggal Closing", "Jenis", "Nominal"]} empty={closingRows.length === 0}>{closingRows.map((row: any) => <tr key={row.id} className="border-t"><td className="px-3 py-2 font-medium">{row.nama}</td><td className="px-3 py-2">{row.sales}</td><td className="px-3 py-2">{date(row.tanggal_closing)}</td><td className="px-3 py-2">{row.jenis}</td><td className="px-3 py-2">{rupiah(row.nominal)}</td></tr>)}</DataTable>
          </TabsContent>
        </>}
      </Tabs>
    </div>
  );
}
