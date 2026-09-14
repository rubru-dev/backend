"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Megaphone, Share2, Target, Trophy } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const number = (value: unknown) => new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
const rupiah = (value: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
const percent = (value: unknown) => `${Number(value ?? 0).toFixed(1)}%`;

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-muted/45 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>;
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
  const years = Array.from({ length: 10 }, (_, index) => today.getFullYear() - index);
  const params = useMemo(() => ({
    ...(startDate || endDate ? { start_date: startDate || undefined, end_date: endDate || undefined } : { bulan: month, tahun: year }),
    ads_source: "actual",
  }), [month, year, startDate, endDate]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["bd-dashboard-summary", params],
    queryFn: () => apiClient.get("/bd/report-analytics", { params }).then((response) => response.data),
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
        <ReportCard title="Ads Detail Report" description="Efisiensi dan hasil iklan Meta." icon={Megaphone} href={reportLink("ads")}><SummaryMetric label="Spend" value={rupiah(ads.spend)} /><SummaryMetric label="Result" value={number(ads.result)} /><SummaryMetric label="CTR" value={percent(Number(ads.impressions) ? Number(ads.clicks) / Number(ads.impressions) * 100 : 0)} /><SummaryMetric label="CPL" value={rupiah(Number(ads.result) ? Number(ads.spend) / Number(ads.result) : 0)} /></ReportCard>
        <ReportCard title="Social Media Detail Report" description="Jangkauan dan interaksi konten organik." icon={Share2} href={reportLink("social")}><SummaryMetric label="Konten" value={number(social.content)} /><SummaryMetric label="Views" value={number(social.views)} /><SummaryMetric label="Reach" value={number(social.reach)} /><SummaryMetric label="Interaksi" value={number(social.engagements)} /></ReportCard>
        <ReportCard title="Funneling Detail" description="Perpindahan lead sampai menjadi SPK." icon={Target} href={reportLink("funnel")}><SummaryMetric label="Leads" value={number(funnel.total_leads)} /><SummaryMetric label="Survey" value={`${number(funnel.survey)} · ${percent(funnel.conversion_lead_to_survey)}`} /><SummaryMetric label="DP Desain" value={`${number(funnel.dp_desain)} · ${percent(funnel.conversion_survey_to_design)}`} /><SummaryMetric label="SPK" value={`${number(funnel.spk)} · ${percent(funnel.conversion_design_to_spk)}`} /></ReportCard>
        <ReportCard title="Closing Detail" description="Hasil closing dan kontribusi sales." icon={Trophy} href={reportLink("closing")}><SummaryMetric label="Total Closing" value={number(closing.total_closing)} /><SummaryMetric label="Nilai Proyeksi" value={rupiah(closing.total_nominal)} /><SummaryMetric label="Sales Aktif" value={number(closing.total_sales)} /><SummaryMetric label="Top Sales" value={topSales} /></ReportCard>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" />Ringkasan Funnel</CardTitle></CardHeader><CardContent><div className="grid grid-cols-4 gap-1 sm:gap-3">{[["Leads", funnel.total_leads], ["Survey", funnel.survey], ["DP Desain", funnel.dp_desain], ["SPK", funnel.spk]].map(([label, value], index) => <div key={String(label)} className="relative"><div className="rounded-lg bg-primary/10 px-2 py-4 text-center sm:p-4"><p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p><p className="text-xl font-bold sm:text-2xl">{number(value)}</p></div>{index < 3 && <ArrowRight className="absolute -right-2 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full bg-background text-muted-foreground" />}</div>)}</div></CardContent></Card>
    </>}
  </div>;
}
