"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonPeriodDialog, comparisonQuery, defaultComparisonPeriod } from "@/components/bd/comparison-period-dialog";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = Array.from({ length: 10 }, (_, index) => new Date().getFullYear() - index);
const PAGE_SIZE = 10;
const number = (value: unknown) => new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
const rupiah = (value: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const days = (value: unknown) => value == null ? "—" : `${number(value)} hari`;
const percentage = (value: unknown) => `${Number(value ?? 0).toFixed(1)}%`;

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="rounded-lg border bg-card p-3 sm:p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}

function ResponsiveTable({ headers, rows, renderRow, renderMobile, minWidth = "900px" }: { headers: string[]; rows: any[]; renderRow: (row: any) => React.ReactNode; renderMobile: (row: any) => React.ReactNode; minWidth?: string }) {
  if (!rows.length) return <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">Belum ada data pada periode ini.</div>;
  return <><div className="space-y-3 md:hidden">{rows.map((row, index) => <div key={String(row.id ?? row.lead_id ?? row.sales ?? index)}>{renderMobile(row)}</div>)}</div><div className="hidden overflow-x-auto rounded-lg border bg-card md:block"><table className="w-full text-sm" style={{ minWidth }}><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2.5 font-medium">{header}</th>)}</tr></thead><tbody>{rows.map(renderRow)}</tbody></table></div></>;
}

function DetailCard({ id, title, fields }: { id: string | number; title: React.ReactNode; fields: Array<[string, React.ReactNode]> }) {
  return <article key={id} className="rounded-lg border bg-card p-4"><div className="mb-3 font-medium">{title}</div><dl className="grid grid-cols-2 gap-x-3 gap-y-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="truncate text-sm tabular-nums">{value}</dd></div>)}</dl></article>;
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return <div className="flex items-center justify-between gap-3 pt-2 text-xs text-muted-foreground"><span>{number(total)} data · Halaman {page} dari {pages}</span><div className="flex gap-1"><Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

const ADS_COMPARISON_METRICS = [{ value: "spend", label: "Spend", money: true }, { value: "result", label: "Result" }, { value: "clicks", label: "Klik" }, { value: "impressions", label: "Impressions" }, { value: "reach", label: "Reach" }, { value: "ctr", label: "CTR" }, { value: "cpc", label: "CPC", money: true }, { value: "cpm", label: "CPM", money: true }, { value: "cpl", label: "CPL", money: true }];
const SOCIAL_COMPARISON_METRICS = [{ value: "content", label: "Konten" }, { value: "views", label: "Views" }, { value: "reach", label: "Reach" }, { value: "likes", label: "Likes" }, { value: "comments", label: "Komentar" }, { value: "shares", label: "Share" }, { value: "saves", label: "Saves" }, { value: "engagement_rate", label: "Engagement Rate" }, { value: "watch_time", label: "Watch Time" }];
const CLOSING_COMPARISON_METRICS = [{ value: "total", label: "Jumlah Closing" }, { value: "nominal", label: "Nilai Proyeksi", money: true }, { value: "sales", label: "Sales Aktif" }];

function ComparisonChart({ title, metric, onMetricChange, metrics, current, previous, ranges, data }: { title: string; metric?: string; onMetricChange?: (value: string) => void; metrics?: Array<{ value: string; label: string; money?: boolean }>; current?: Record<string, number>; previous?: Record<string, number>; ranges: any; data?: Array<{ name: string; current: number; previous: number }> }) {
  const selected = metrics?.find((item) => item.value === metric);
  const chartData = data ?? [{ name: selected?.label ?? title, current: Number(current?.[metric ?? ""] ?? 0), previous: Number(previous?.[metric ?? ""] ?? 0) }];
  const formatter = (value: unknown) => selected?.money ? rupiah(value) : selected?.value.includes("rate") || selected?.value === "ctr" ? percentage(value) : number(value);
  return <div className="rounded-lg border bg-card p-3 sm:p-4"><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-sm font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{ranges?.current?.label} dibanding {ranges?.previous?.label}</p></div>{metrics && metric && onMetricChange && <select className="h-9 rounded-md border bg-background px-3 text-sm" value={metric} onChange={(event) => onMetricChange(event.target.value)}>{metrics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}</div><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => Number(value).toLocaleString("id-ID", { notation: "compact" })} /><Tooltip formatter={(value) => formatter(value)} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="current" name="Periode aktif" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="previous" name="Pembanding" fill="#cbd5e1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>;
}

function ReportAnalyticsContent() {
  const searchParams = useSearchParams();
  const today = new Date();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(["ads", "social", "funnel", "closing"].includes(requestedTab ?? "") ? requestedTab! : "ads");
  const [socialTab, setSocialTab] = useState("Instagram");
  const [month, setMonth] = useState(searchParams.get("bulan") || String(today.getMonth() + 1));
  const [year, setYear] = useState(searchParams.get("tahun") || String(today.getFullYear()));
  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");
  const [adsSource, setAdsSource] = useState<"actual" | "manual">("actual");
  const [comparePeriod, setComparePeriod] = useState(defaultComparisonPeriod);
  const [adsCompareMetric, setAdsCompareMetric] = useState("result");
  const [socialCompareMetric, setSocialCompareMetric] = useState("reach");
  const [closingCompareMetric, setClosingCompareMetric] = useState("total");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); setSearch(""); }, [activeTab, socialTab]);
  const params = useMemo(() => ({
    ...(startDate || endDate ? { start_date: startDate || undefined, end_date: endDate || undefined } : { bulan: month, tahun: year }),
    ads_source: adsSource,
  }), [month, year, startDate, endDate, adsSource]);
  const compareParams = useMemo(() => comparisonQuery(comparePeriod), [comparePeriod]);
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["bd-report-analytics", params], queryFn: () => apiClient.get("/bd/report-analytics", { params }).then((response) => response.data) });
  const { data: comparison, isLoading: comparisonLoading, isError: comparisonIsError } = useQuery({ queryKey: ["bd-report-analytics-comparison", params, compareParams], queryFn: () => apiClient.get("/bd/report-analytics/comparison", { params: { ...params, ...compareParams } }).then((response) => response.data), enabled: (!startDate && !endDate) || Boolean(startDate && endDate) });
  const ads = data?.ads_organik?.ads ?? [];
  const totals = data?.ads_organik?.ads_totals ?? {};
  const social = data?.ads_organik?.social_posts ?? [];
  const funnel = data?.funnel ?? {};
  const closing = data?.closing_detail ?? {};
  const query = search.trim().toLowerCase();
  const filterRows = (rows: any[], fields: string[]) => rows.filter((row) => !query || fields.some((field) => String(row[field] ?? "").toLowerCase().includes(query)));
  const paginate = (rows: any[]) => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const changeTab = (value: string) => { setActiveTab(value); const url = new URL(window.location.href); url.searchParams.set("tab", value); window.history.replaceState({}, "", url.toString()); };
  const periodLabel = startDate || endDate ? `${startDate ? date(startDate) : "Awal"} – ${endDate ? date(endDate) : "Sekarang"}` : month ? `${MONTHS[Number(month) - 1]} ${year}` : `seluruh tahun ${year}`;

  const filteredAds = filterRows(ads, ["campaign_name", "platform", "status"]);
  const socialRows = social.filter((post: any) => String(post.platform).toLowerCase() === socialTab.toLowerCase());
  const filteredSocial = filterRows(socialRows, ["account_name", "judul_konten", "data_source"]);
  const filteredFunnel = filterRows(funnel.rows ?? [], ["nama", "sales"]);
  const filteredClosing = filterRows(closing.rows ?? [], ["nama", "sales", "jenis"]);
  const socialSummary = data?.ads_organik?.[socialTab.toLowerCase()] ?? {};
  const ctr = Number(totals.impressions) ? Number(totals.clicks) / Number(totals.impressions) * 100 : 0;
  const cpm = Number(totals.impressions) ? Number(totals.spend) / Number(totals.impressions) * 1000 : 0;
  const cpc = Number(totals.clicks) ? Number(totals.spend) / Number(totals.clicks) : 0;
  const cpl = Number(totals.result) ? Number(totals.spend) / Number(totals.result) : 0;
  const currentSocialComparison = {
    content: Number(socialSummary.total_konten ?? 0), views: Number(socialSummary.total_views ?? 0), reach: Number(socialSummary.total_reach ?? 0),
    likes: Number(socialSummary.total_likes ?? 0), comments: Number(socialSummary.total_comments ?? 0), shares: Number(socialSummary.total_shares ?? 0),
    saves: Number(socialSummary.total_saves ?? 0), engagement_rate: Number(socialSummary.avg_engagement_rate ?? 0), watch_time: Number(socialSummary.watch_time_minutes ?? 0),
  };
  const currentAdsComparison = { spend: Number(totals.spend ?? 0), result: Number(totals.result ?? 0), clicks: Number(totals.clicks ?? 0), impressions: Number(totals.impressions ?? 0), reach: Number(totals.reach ?? 0), ctr, cpc, cpm, cpl };
  const currentClosingComparison = { total: Number(closing.total_closing ?? 0), nominal: Number(closing.total_nominal ?? 0), sales: Number(closing.total_sales ?? 0) };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold">Report dan Analytics BD</h1><p className="text-sm text-muted-foreground">Detail keseluruhan performa pada {periodLabel}.</p></div><div className="flex flex-col gap-2 sm:flex-row print:hidden"><ComparisonPeriodDialog value={comparePeriod} onChange={setComparePeriod} className="w-full sm:max-w-xs" /><Button variant="outline" className="w-full sm:w-auto" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />Cetak / PDF</Button></div></div>

    <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 xl:grid-cols-5 print:hidden">
      <label className="space-y-1 text-xs text-muted-foreground">Tanggal mulai<Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">Tanggal selesai<Input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">Bulan<select value={month} disabled={Boolean(startDate || endDate)} onChange={(event) => setMonth(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"><option value="">Semua bulan</option>{MONTHS.map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}</select></label>
      <label className="space-y-1 text-xs text-muted-foreground">Tahun<select value={year} disabled={Boolean(startDate || endDate)} onChange={(event) => setYear(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50">{YEARS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="flex items-end"><div className="grid h-10 w-full grid-cols-2 rounded-md border bg-muted/30 p-1"><button type="button" onClick={() => setAdsSource("actual")} className={`rounded text-xs ${adsSource === "actual" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Actual Meta</button><button type="button" onClick={() => setAdsSource("manual")} className={`rounded text-xs ${adsSource === "manual" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Data lokal</button></div></div>
      {(startDate || endDate) && <div className="flex items-center justify-between sm:col-span-2 xl:col-span-5"><p className="text-xs text-muted-foreground">Rentang tanggal aktif; bulan dan tahun dinonaktifkan.</p><Button size="sm" variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); }}>Reset tanggal</Button></div>}
    </div>

    <Tabs value={activeTab} onValueChange={changeTab}>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 print:hidden"><TabsList className="inline-flex h-auto min-w-max justify-start lg:grid lg:w-full lg:grid-cols-4"><TabsTrigger className="whitespace-nowrap px-4" value="ads">Ads Detail Report</TabsTrigger><TabsTrigger className="whitespace-nowrap px-4" value="social">Social Media Detail Report</TabsTrigger><TabsTrigger className="whitespace-nowrap px-4" value="funnel">Funneling Detail</TabsTrigger><TabsTrigger className="whitespace-nowrap px-4" value="closing">Closing Detail</TabsTrigger></TabsList></div>
      {comparisonIsError && <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Data periode pembanding gagal dimuat. Laporan periode aktif tetap dapat digunakan.</div>}
      {Boolean(startDate) !== Boolean(endDate) && <div className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Isi tanggal mulai dan tanggal selesai untuk menampilkan grafik perbandingan.</div>}
      {isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Memuat laporan...</p> : isError ? <p className="py-12 text-center text-sm text-destructive">{(error as any)?.response?.data?.detail || "Gagal memuat laporan BD."}</p> : <>
        <TabsContent value="ads" className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Sumber: {data?.ads_organik?.ads_data_source === "realtime" ? "Meta Ads API" : data?.ads_organik?.ads_data_source === "manual" ? "Data lokal/manual" : "Data lokal (fallback)"}</p><SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Cari campaign..." /></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8"><Metric label="Spend" value={rupiah(totals.spend)} /><Metric label="Result" value={number(totals.result)} /><Metric label="Klik" value={number(totals.clicks)} /><Metric label="Reach" value={number(totals.reach)} /><Metric label="Impressions" value={number(totals.impressions)} /><Metric label="CTR" value={percentage(ctr)} /><Metric label="CPC" value={rupiah(cpc)} /><Metric label="CPL" value={rupiah(cpl)} detail={`CPM ${rupiah(cpm)}`} /></div>
          {comparisonLoading ? <div className="h-[290px] animate-pulse rounded-lg bg-muted" /> : comparison && <ComparisonChart title="Perbandingan Performa Ads" metric={adsCompareMetric} onMetricChange={setAdsCompareMetric} metrics={ADS_COMPARISON_METRICS} current={currentAdsComparison} previous={comparison.previous.ads} ranges={comparison.ranges} />}
          <ResponsiveTable headers={["Campaign", "Platform", "Status", "Spend", "Impressions", "Reach", "Klik", "CTR", "CPC", "Result", "CPL"]} rows={paginate(filteredAds)} minWidth="1180px" renderRow={(item) => <tr key={item.id} className="border-t"><td className="px-3 py-2 font-medium">{item.campaign_name || "Tanpa nama"}</td><td className="px-3 py-2">{item.platform || "Meta"}</td><td className="px-3 py-2">{item.status || "—"}</td><td className="px-3 py-2">{rupiah(item.spend)}</td><td className="px-3 py-2">{number(item.impressions)}</td><td className="px-3 py-2">{number(item.reach)}</td><td className="px-3 py-2">{number(item.clicks)}</td><td className="px-3 py-2">{percentage(Number(item.impressions) ? Number(item.clicks) / Number(item.impressions) * 100 : 0)}</td><td className="px-3 py-2">{rupiah(Number(item.clicks) ? Number(item.spend) / Number(item.clicks) : 0)}</td><td className="px-3 py-2">{number(item.result)}</td><td className="px-3 py-2">{rupiah(Number(item.result) ? Number(item.spend) / Number(item.result) : 0)}</td></tr>} renderMobile={(item) => <DetailCard id={item.id} title={item.campaign_name || "Tanpa nama"} fields={[["Platform", item.platform || "Meta"], ["Status", item.status || "—"], ["Spend", rupiah(item.spend)], ["Result", number(item.result)], ["Klik", number(item.clicks)], ["CTR", percentage(Number(item.impressions) ? Number(item.clicks) / Number(item.impressions) * 100 : 0)], ["CPC", rupiah(Number(item.clicks) ? Number(item.spend) / Number(item.clicks) : 0)], ["CPL", rupiah(Number(item.result) ? Number(item.spend) / Number(item.result) : 0)]]} />} /><Pager page={page} total={filteredAds.length} onChange={setPage} />
        </TabsContent>

        <TabsContent value="social" className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="inline-grid grid-cols-3 rounded-lg border bg-muted/30 p-1">{["Instagram", "YouTube", "TikTok"].map((platform) => <button key={platform} className={`rounded px-3 py-2 text-xs ${socialTab === platform ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setSocialTab(platform)}>{platform}</button>)}</div><SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Cari akun atau konten..." /></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6"><Metric label="Konten" value={number(socialSummary.total_konten)} /><Metric label="Views" value={number(socialSummary.total_views)} /><Metric label="Reach" value={number(socialSummary.total_reach)} /><Metric label="Likes" value={number(socialSummary.total_likes)} /><Metric label="Interaksi" value={number(Number(socialSummary.total_comments ?? 0) + Number(socialSummary.total_shares ?? 0) + Number(socialSummary.total_saves ?? 0))} /><Metric label="Avg. Engagement" value={percentage(socialSummary.avg_engagement_rate)} /></div>
          {comparisonLoading ? <div className="h-[290px] animate-pulse rounded-lg bg-muted" /> : comparison && <ComparisonChart title={`Perbandingan ${socialTab}`} metric={socialCompareMetric} onMetricChange={setSocialCompareMetric} metrics={SOCIAL_COMPARISON_METRICS} current={currentSocialComparison} previous={comparison.previous.social[socialTab.toLowerCase()]} ranges={comparison.ranges} />}
          {socialTab === "TikTok" && socialRows.length === 0 ? <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">Belum ada data TikTok. Struktur laporan sudah siap saat integrasi data tersedia.</div> : <><ResponsiveTable headers={["Tanggal", "Akun", "Konten", "Views", "Reach", "Likes", "Komentar", "Share", "Saves", "Repost", "Watch Time", "Engagement", "Sumber"]} rows={paginate(filteredSocial)} minWidth="1380px" renderRow={(post) => <tr key={post.id} className="border-t"><td className="px-3 py-2">{date(post.tanggal)}</td><td className="px-3 py-2">{post.account_name}</td><td className="max-w-[260px] truncate px-3 py-2">{post.link_konten ? <a className="text-primary underline" href={post.link_konten} target="_blank" rel="noreferrer">{post.judul_konten}</a> : post.judul_konten}</td><td className="px-3 py-2">{number(post.views)}</td><td className="px-3 py-2">{number(post.reach)}</td><td className="px-3 py-2">{number(post.likes)}</td><td className="px-3 py-2">{number(post.comments)}</td><td className="px-3 py-2">{number(post.shares)}</td><td className="px-3 py-2">{number(post.saves)}</td><td className="px-3 py-2">{number(post.reposts)}</td><td className="px-3 py-2">{number(post.watch_time_minutes)} menit</td><td className="px-3 py-2">{percentage(post.engagement_rate)}</td><td className="px-3 py-2">{post.data_source || "—"}</td></tr>} renderMobile={(post) => <DetailCard id={post.id} title={post.link_konten ? <a className="text-primary underline" href={post.link_konten} target="_blank" rel="noreferrer">{post.judul_konten}</a> : post.judul_konten} fields={[["Tanggal", date(post.tanggal)], ["Akun", post.account_name], ["Views", number(post.views)], ["Reach", number(post.reach)], ["Likes", number(post.likes)], ["Engagement", percentage(post.engagement_rate)], ["Watch Time", `${number(post.watch_time_minutes)} menit`], ["Sumber", post.data_source || "—"]]} />} /><Pager page={page} total={filteredSocial.length} onChange={setPage} /></>}
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4"><p className="text-xs text-muted-foreground">Cohort berdasarkan tanggal lead masuk Sales Admin. Tahap berikutnya tetap dihitung meskipun terjadi setelah periode tersebut.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Leads Sales Admin" value={number(funnel.total_leads)} /><Metric label="Masuk Survey" value={number(funnel.survey)} detail={`${percentage(funnel.conversion_lead_to_survey)} konversi · ${number(Math.max(0, (funnel.total_leads || 0) - (funnel.survey || 0)))} drop-off`} /><Metric label="DP Desain Lunas" value={number(funnel.dp_desain)} detail={`${percentage(funnel.conversion_survey_to_design)} konversi · ${number(Math.max(0, (funnel.survey || 0) - (funnel.dp_desain || 0)))} drop-off`} /><Metric label="SPK Projek" value={number(funnel.spk)} detail={`${percentage(funnel.conversion_design_to_spk)} konversi · ${number(Math.max(0, (funnel.dp_desain || 0) - (funnel.spk || 0)))} drop-off`} /></div>
          <div className="grid gap-3 sm:grid-cols-3"><Metric label="Lead → Survey" value={days(funnel.avg_days_lead_to_survey)} detail={`Median ${days(funnel.median_days_lead_to_survey)}`} /><Metric label="Survey → DP Desain" value={days(funnel.avg_days_survey_to_design_dp)} detail={`Median ${days(funnel.median_days_survey_to_design_dp)}`} /><Metric label="DP Desain → SPK" value={days(funnel.avg_days_design_to_spk)} detail={`Median ${days(funnel.median_days_design_to_spk)}`} /></div>
          {comparisonLoading ? <div className="h-[290px] animate-pulse rounded-lg bg-muted" /> : comparison && <ComparisonChart title="Perbandingan Funnel" ranges={comparison.ranges} data={[{ name: "Leads", current: Number(funnel.total_leads ?? 0), previous: comparison.previous.funnel.leads }, { name: "Survey", current: Number(funnel.survey ?? 0), previous: comparison.previous.funnel.survey }, { name: "DP Desain", current: Number(funnel.dp_desain ?? 0), previous: comparison.previous.funnel.design }, { name: "SPK", current: Number(funnel.spk ?? 0), previous: comparison.previous.funnel.spk }]} />}
          <SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Cari lead atau sales admin..." />
          <ResponsiveTable headers={["Lead", "Inputter / Sales Admin", "Tgl. Masuk", "Survey", "DP Desain", "SPK", "Lead → Survey", "Survey → DP", "DP → SPK", "DP Projek Lunas"]} rows={paginate(filteredFunnel)} minWidth="1250px" renderRow={(row) => <tr key={row.lead_id} className="border-t"><td className="px-3 py-2 font-medium">{row.nama}</td><td className="px-3 py-2">{row.sales}</td><td className="px-3 py-2">{date(row.tanggal_masuk)}</td><td className="px-3 py-2">{date(row.tanggal_survey)}</td><td className="px-3 py-2">{date(row.tanggal_dp_desain)}</td><td className="px-3 py-2">{date(row.tanggal_spk)}</td><td className="px-3 py-2">{days(row.days_lead_to_survey)}</td><td className="px-3 py-2">{days(row.days_survey_to_design_dp)}</td><td className="px-3 py-2">{days(row.days_design_to_spk)}</td><td className="px-3 py-2">{rupiah(row.dp_projek_lunas)}</td></tr>} renderMobile={(row) => <DetailCard id={row.lead_id} title={row.nama} fields={[["Inputter / Sales Admin", row.sales], ["Tanggal Masuk", date(row.tanggal_masuk)], ["Survey", date(row.tanggal_survey)], ["DP Desain", date(row.tanggal_dp_desain)], ["SPK", date(row.tanggal_spk)], ["Lead → Survey", days(row.days_lead_to_survey)], ["Survey → DP", days(row.days_survey_to_design_dp)], ["DP → SPK", days(row.days_design_to_spk)]]} />} /><Pager page={page} total={filteredFunnel.length} onChange={setPage} />
        </TabsContent>

        <TabsContent value="closing" className="space-y-4"><p className="text-xs text-muted-foreground">Closing dihitung saat kartu masuk ke kolom Closing. Data lama yang belum memiliki tanggal perpindahan memakai tanggal pembuatan kartu dan diberi penanda.</p>
          <div className="grid gap-3 sm:grid-cols-3"><Metric label="Sales Aktif" value={number(closing.total_sales)} /><Metric label="Total Closing" value={number(closing.total_closing)} /><Metric label="Nilai Proyeksi" value={rupiah(closing.total_nominal)} /></div>
          {comparisonLoading ? <div className="h-[290px] animate-pulse rounded-lg bg-muted" /> : comparison && <ComparisonChart title="Perbandingan Closing" metric={closingCompareMetric} onMetricChange={setClosingCompareMetric} metrics={CLOSING_COMPARISON_METRICS} current={currentClosingComparison} previous={comparison.previous.closing} ranges={comparison.ranges} />}
          <section className="space-y-2"><h2 className="text-sm font-semibold">Performa Sales</h2><ResponsiveTable headers={["Sales", "Jumlah Closing", "Nilai Proyeksi"]} rows={closing.by_sales ?? []} minWidth="640px" renderRow={(row) => <tr key={row.sales} className="border-t"><td className="px-3 py-2 font-medium">{row.sales}</td><td className="px-3 py-2">{number(row.total)}</td><td className="px-3 py-2">{rupiah(row.nominal)}</td></tr>} renderMobile={(row) => <DetailCard id={row.sales} title={row.sales} fields={[["Jumlah Closing", number(row.total)], ["Nilai Proyeksi", rupiah(row.nominal)]]} />} /></section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-semibold">Detail Closing</h2><SearchBox value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Cari client, sales, jenis..." /></div>
          <ResponsiveTable headers={["Client", "Sales", "Tanggal Closing", "Jenis", "Nilai Proyeksi", "Status Tanggal"]} rows={paginate(filteredClosing)} minWidth="920px" renderRow={(row) => <tr key={row.id} className="border-t"><td className="px-3 py-2 font-medium">{row.nama}</td><td className="px-3 py-2">{row.sales}</td><td className="px-3 py-2">{date(row.tanggal_closing)}</td><td className="px-3 py-2">{row.jenis}</td><td className="px-3 py-2">{rupiah(row.nominal)}</td><td className="px-3 py-2 text-xs">{row.closing_date_source === "actual" ? "Aktual" : "Data lama"}</td></tr>} renderMobile={(row) => <DetailCard id={row.id} title={row.nama} fields={[["Sales", row.sales], ["Tanggal Closing", date(row.tanggal_closing)], ["Jenis", row.jenis], ["Nilai Proyeksi", rupiah(row.nominal)], ["Status Tanggal", row.closing_date_source === "actual" ? "Aktual" : "Data lama"]]} />} /><Pager page={page} total={filteredClosing.length} onChange={setPage} />
        </TabsContent>
      </>}
    </Tabs>
  </div>;
}

export default function BdReportAnalyticsPage() {
  return <Suspense fallback={<p className="py-12 text-center text-sm text-muted-foreground">Memuat laporan...</p>}><ReportAnalyticsContent /></Suspense>;
}
