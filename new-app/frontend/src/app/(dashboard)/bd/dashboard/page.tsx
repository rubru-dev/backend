"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Megaphone, Share2, Target, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ComparisonPeriodDialog, comparisonQuery, defaultComparisonPeriod } from "@/components/bd/comparison-period-dialog";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const number = (value: unknown) => new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
const rupiah = (value: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
const percent = (value: unknown) => `${Number(value ?? 0).toFixed(1)}%`;

function SummaryMetric({ label, value, current, previous }: { label: string; value: string | number; current?: number; previous?: number }) {
  const change = current != null && previous != null && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;
  return <div className="rounded-lg bg-muted/45 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>{change != null && <p className="mt-1 text-[11px] font-medium text-muted-foreground">{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% dari pembanding</p>}</div>;
}

function ComparisonBars({ title, data, currentLabel, previousLabel, formatter = number }: { title: string; data: Array<{ name: string; current: number; previous: number }>; currentLabel: string; previousLabel: string; formatter?: (value: unknown) => string }) {
  return <Card className="border-2 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold">{title}</CardTitle><p className="text-xs text-muted-foreground"><span className="font-semibold text-blue-700">A: {currentLabel}</span> dibanding <span className="font-semibold text-orange-600">B: {previousLabel}</span></p></CardHeader><CardContent className="h-[250px] px-2 sm:px-6"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 28, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => Number(value).toLocaleString("id-ID", { notation: "compact" })} /><Tooltip formatter={(value) => formatter(value)} /><Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} /><Bar dataKey="current" name="Periode A" fill="#1d4ed8" radius={[5, 5, 0, 0]}><LabelList dataKey="current" position="top" formatter={(value: unknown) => Number(value).toLocaleString("id-ID", { notation: "compact" })} className="fill-blue-800 text-[10px] font-bold" /></Bar><Bar dataKey="previous" name="Periode B" fill="#f97316" radius={[5, 5, 0, 0]}><LabelList dataKey="previous" position="top" formatter={(value: unknown) => Number(value).toLocaleString("id-ID", { notation: "compact" })} className="fill-orange-700 text-[10px] font-bold" /></Bar></BarChart></ResponsiveContainer></CardContent></Card>;
}

function ReportCard({ title, description, icon: Icon, href, children }: { title: string; description: string; icon: React.ElementType; href: string; children: React.ReactNode }) {
  return <Card className="flex h-full flex-col overflow-hidden">
    <CardHeader className="pb-3"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div><div><CardTitle className="text-base">{title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{description}</p></div></div></CardHeader>
    <CardContent className="flex flex-1 flex-col gap-4"><div className="grid grid-cols-2 gap-2">{children}</div><Button variant="ghost" className="mt-auto w-full justify-between" asChild><Link href={href}>Lihat detail <ArrowRight className="h-4 w-4" /></Link></Button></CardContent>
  </Card>;
}

export default function BdDashboardPage() {
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comparePeriod, setComparePeriod] = useState(defaultComparisonPeriod);
  const years = Array.from({ length: 10 }, (_, index) => today.getFullYear() - index);
  const params = useMemo(() => ({
    ...(startDate || endDate ? { start_date: startDate || undefined, end_date: endDate || undefined } : { bulan: month, tahun: year }),
    ads_source: "actual",
  }), [month, year, startDate, endDate]);
  const compareParams = useMemo(() => comparisonQuery(comparePeriod), [comparePeriod]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["bd-dashboard-summary", params],
    queryFn: () => apiClient.get("/bd/report-analytics", { params }).then((response) => response.data),
  });
  const { data: comparison, isLoading: comparisonLoading, isError: comparisonIsError } = useQuery({
    queryKey: ["bd-dashboard-comparison", params, compareParams],
    queryFn: () => apiClient.get("/bd/report-analytics/comparison", { params: { ...params, ...compareParams } }).then((response) => response.data),
    enabled: comparePeriod.mode === "custom" || (!startDate && !endDate) || Boolean(startDate && endDate),
  });

  const ads = data?.ads_organik?.ads_totals ?? {};
  const organic = data?.ads_organik ?? {};
  const socialPlatforms = [organic.instagram, organic.youtube, organic.tiktok].filter(Boolean);
  const social = socialPlatforms.reduce((acc: any, row: any) => ({
    content: acc.content + Number(row.total_konten ?? 0), views: acc.views + Number(row.total_views ?? 0),
    reach: acc.reach + Number(row.total_reach ?? 0), engagements: acc.engagements + Number(row.total_likes ?? 0) + Number(row.total_comments ?? 0) + Number(row.total_shares ?? 0) + Number(row.total_saves ?? 0),
  }), { content: 0, views: 0, reach: 0, engagements: 0 });
  const funnel = data?.funnel ?? {};
  const closing = data?.closing_detail ?? {};
  const currentComparison: any = {
    ads: {
      spend: Number(ads.spend ?? 0), result: Number(ads.result ?? 0), clicks: Number(ads.clicks ?? 0),
      impressions: Number(ads.impressions ?? 0), reach: Number(ads.reach ?? 0),
      ctr: Number(ads.impressions) ? Number(ads.clicks) / Number(ads.impressions) * 100 : 0,
      cpl: Number(ads.result) ? Number(ads.spend) / Number(ads.result) : 0,
    },
    social: { all: social },
    funnel: { leads: Number(funnel.total_leads ?? 0), survey: Number(funnel.survey ?? 0), design: Number(funnel.dp_desain ?? 0), spk: Number(funnel.spk ?? 0) },
    closing: { total: Number(closing.total_closing ?? 0), nominal: Number(closing.total_nominal ?? 0), sales: Number(closing.total_sales ?? 0) },
  };
  // Persentase pada kartu hanya relevan saat Periode A mengikuti filter aktif.
  const previousComparison = comparePeriod.mode === "custom" ? {} : comparison?.previous ?? {};
  const chartCurrent = comparison?.current ?? {};
  const chartPrevious = comparison?.previous ?? {};
  const topSales = closing.by_sales?.[0]?.sales ?? "Belum ada";
  const query = new URLSearchParams(startDate || endDate ? { ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) } : { bulan: month, tahun: year }).toString();
  const reportLink = (tab: string) => `/bd/report-analytics?tab=${tab}&${query}`;

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold tracking-tight">Dashboard BD</h1><p className="text-sm text-muted-foreground">Ringkasan performa Ads, Social Media, funnel, dan closing pada periode terpilih.</p></div>
    <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs text-muted-foreground">Tanggal mulai<Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">Tanggal selesai<Input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">Bulan<select className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50" value={month} disabled={Boolean(startDate || endDate)} onChange={(event) => setMonth(event.target.value)}><option value="">Semua bulan</option>{MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
      <label className="space-y-1 text-xs text-muted-foreground">Tahun<select className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50" value={year} disabled={Boolean(startDate || endDate)} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item}>{item}</option>)}</select></label>
      {(startDate || endDate) && <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-4"><p className="text-xs text-muted-foreground">Rentang tanggal aktif.</p><Button size="sm" variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); setMonth(String(today.getMonth() + 1)); setYear(String(today.getFullYear())); }}>Kembali ke bulan ini</Button></div>}
    </div>

    {isLoading ? <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64" />)}</div> : isError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">Gagal memuat ringkasan Dashboard BD.</div> : <>
      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard title="Ads Detail Report" description="Efisiensi dan hasil iklan Meta." icon={Megaphone} href={reportLink("ads")}><SummaryMetric label="Spend" value={rupiah(ads.spend)} current={currentComparison.ads?.spend} previous={previousComparison.ads?.spend} /><SummaryMetric label="Result" value={number(ads.result)} current={currentComparison.ads?.result} previous={previousComparison.ads?.result} /><SummaryMetric label="CTR" value={percent(Number(ads.impressions) ? Number(ads.clicks) / Number(ads.impressions) * 100 : 0)} current={currentComparison.ads?.ctr} previous={previousComparison.ads?.ctr} /><SummaryMetric label="CPL" value={rupiah(Number(ads.result) ? Number(ads.spend) / Number(ads.result) : 0)} current={currentComparison.ads?.cpl} previous={previousComparison.ads?.cpl} /></ReportCard>
        <ReportCard title="Social Media Detail Report" description="Jangkauan dan interaksi konten organik." icon={Share2} href={reportLink("social")}><SummaryMetric label="Konten" value={number(social.content)} current={currentComparison.social?.all?.content} previous={previousComparison.social?.all?.content} /><SummaryMetric label="Views" value={number(social.views)} current={currentComparison.social?.all?.views} previous={previousComparison.social?.all?.views} /><SummaryMetric label="Reach" value={number(social.reach)} current={currentComparison.social?.all?.reach} previous={previousComparison.social?.all?.reach} /><SummaryMetric label="Interaksi" value={number(social.engagements)} /></ReportCard>
        <ReportCard title="Funneling Detail" description="Lead masuk, survey, dan progres sampai menjadi SPK." icon={Target} href={reportLink("funnel")}><SummaryMetric label="Leads Masuk" value={number(funnel.total_leads)} current={currentComparison.funnel?.leads} previous={previousComparison.funnel?.leads} /><SummaryMetric label="Survey" value={number(funnel.survey)} current={currentComparison.funnel?.survey} previous={previousComparison.funnel?.survey} /><SummaryMetric label="DP Desain" value={`${number(funnel.dp_desain)} · ${percent(funnel.conversion_survey_to_design)}`} current={currentComparison.funnel?.design} previous={previousComparison.funnel?.design} /><SummaryMetric label="SPK" value={`${number(funnel.spk)} · ${percent(funnel.conversion_design_to_spk)}`} current={currentComparison.funnel?.spk} previous={previousComparison.funnel?.spk} /></ReportCard>
        <ReportCard title="Closing Detail" description="Hasil closing dan kontribusi sales." icon={Trophy} href={reportLink("closing")}><SummaryMetric label="Total Closing" value={number(closing.total_closing)} current={currentComparison.closing?.total} previous={previousComparison.closing?.total} /><SummaryMetric label="Nilai Proyeksi" value={rupiah(closing.total_nominal)} current={currentComparison.closing?.nominal} previous={previousComparison.closing?.nominal} /><SummaryMetric label="Sales Aktif" value={number(closing.total_sales)} current={currentComparison.closing?.sales} previous={previousComparison.closing?.sales} /><SummaryMetric label="Top Sales" value={topSales} /></ReportCard>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" />Ringkasan Funnel</CardTitle><p className="text-xs text-muted-foreground">Leads masuk dihitung dari tanggal masuk; Survey mengikuti Kalender Survey dan dikelompokkan berdasarkan sumber.</p></CardHeader><CardContent><div className="grid grid-cols-4 gap-1 sm:gap-3">{[["Leads Masuk", funnel.total_leads], ["Survey", funnel.survey], ["DP Desain", funnel.dp_desain], ["SPK", funnel.spk]].map(([label, value], index) => <div key={String(label)} className="relative"><div className="rounded-lg bg-primary/10 px-2 py-4 text-center sm:p-4"><p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p><p className="text-xl font-bold sm:text-2xl">{number(value)}</p></div>{index < 3 && <ArrowRight className="absolute -right-2 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full bg-background text-muted-foreground" />}</div>)}</div>{Array.isArray(funnel.survey_by_source) && funnel.survey_by_source.length > 0 && <div className="mt-4 border-t pt-3"><p className="mb-2 text-xs font-semibold text-muted-foreground">Sumber Survey</p><div className="flex flex-wrap gap-2">{funnel.survey_by_source.map((item: { sumber: string; total: number }) => <span key={item.sumber} className="rounded-full bg-muted px-2.5 py-1 text-xs"><span className="font-medium">{item.sumber}</span>: {number(item.total)}</span>)}</div></div>}</CardContent></Card>
      <section className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold">Perbandingan Periode</h2><p className="text-xs text-muted-foreground">Grafik ringkas periode aktif terhadap periode pembanding.</p></div><ComparisonPeriodDialog value={comparePeriod} onChange={setComparePeriod} className="w-full sm:w-auto sm:max-w-xs" /></div>
        {comparisonLoading ? <Skeleton className="h-64" /> : comparisonIsError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">Data periode pembanding gagal dimuat.</div> : comparison ? <div className="grid gap-4 md:grid-cols-2"><ComparisonBars title="Ads Result" currentLabel={comparison.ranges.current.label} previousLabel={comparison.ranges.previous.label} data={[{ name: "Result", current: chartCurrent.ads.result, previous: chartPrevious.ads.result }]} /><ComparisonBars title="Social Media Reach" currentLabel={comparison.ranges.current.label} previousLabel={comparison.ranges.previous.label} data={[{ name: "Reach", current: chartCurrent.social.all.reach, previous: chartPrevious.social.all.reach }]} /><ComparisonBars title="Total Closing" currentLabel={comparison.ranges.current.label} previousLabel={comparison.ranges.previous.label} data={[{ name: "Closing", current: chartCurrent.closing.total, previous: chartPrevious.closing.total }]} /><ComparisonBars title="Perbandingan Funnel" currentLabel={comparison.ranges.current.label} previousLabel={comparison.ranges.previous.label} data={[{ name: "Leads", current: chartCurrent.funnel.leads, previous: chartPrevious.funnel.leads }, { name: "Survey", current: chartCurrent.funnel.survey, previous: chartPrevious.funnel.survey }, { name: "DP Desain", current: chartCurrent.funnel.design, previous: chartPrevious.funnel.design }, { name: "SPK", current: chartCurrent.funnel.spk, previous: chartPrevious.funnel.spk }]} /></div> : (startDate || endDate) && <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Isi tanggal mulai dan tanggal selesai untuk menampilkan perbandingan.</div>}
      </section>
    </>}
  </div>;
}
