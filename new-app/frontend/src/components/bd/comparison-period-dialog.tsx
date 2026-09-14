"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CustomPeriod = {
  type: "range" | "month" | "year";
  startDate: string;
  endDate: string;
  month: string;
  year: string;
};

export type ComparisonPeriod = {
  mode: "previous_period" | "last_year" | "custom";
  periodA: CustomPeriod;
  periodB: CustomPeriod;
};

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function monthBefore(month: number, year: number) {
  const date = new Date(year, month - 2, 1);
  return { month: String(date.getMonth() + 1), year: String(date.getFullYear()) };
}

export const defaultComparisonPeriod = (): ComparisonPeriod => {
  const now = new Date();
  const previous = monthBefore(now.getMonth() + 1, now.getFullYear());
  const base = { type: "month" as const, startDate: "", endDate: "" };
  return {
    mode: "previous_period",
    periodA: { ...base, month: String(now.getMonth() + 1), year: String(now.getFullYear()) },
    periodB: { ...base, ...previous },
  };
};

function customPeriodQuery(prefix: "a" | "b", period: CustomPeriod) {
  if (period.type === "range") return { [`compare_${prefix}_type`]: "range", [`compare_${prefix}_start_date`]: period.startDate, [`compare_${prefix}_end_date`]: period.endDate };
  if (period.type === "month") return { [`compare_${prefix}_type`]: "month", [`compare_${prefix}_bulan`]: period.month, [`compare_${prefix}_tahun`]: period.year };
  return { [`compare_${prefix}_type`]: "year", [`compare_${prefix}_tahun`]: period.year };
}

export function comparisonQuery(period: ComparisonPeriod) {
  if (period.mode !== "custom") return { compare: period.mode };
  return { compare: "custom_pair", ...customPeriodQuery("a", period.periodA), ...customPeriodQuery("b", period.periodB) };
}

function customPeriodName(period: CustomPeriod) {
  if (period.type === "range") return period.startDate && period.endDate ? `${period.startDate} – ${period.endDate}` : "Rentang tanggal";
  if (period.type === "month") return `${MONTHS[Number(period.month) - 1]} ${period.year}`;
  return `Tahun ${period.year}`;
}

function comparisonName(period: ComparisonPeriod) {
  if (period.mode === "last_year") return "Aktif vs tahun lalu";
  if (period.mode === "previous_period") return "Aktif vs sebelumnya";
  return `${customPeriodName(period.periodA)} vs ${customPeriodName(period.periodB)}`;
}

function PeriodFields({ title, value, onChange }: { title: string; value: CustomPeriod; onChange: (value: CustomPeriod) => void }) {
  const years = Array.from({ length: 15 }, (_, index) => String(new Date().getFullYear() - index));
  return <section className="space-y-3 rounded-lg border p-3">
    <div><h3 className="text-sm font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{customPeriodName(value)}</p></div>
    <label className="space-y-1 text-xs text-muted-foreground">Jenis periode<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value as CustomPeriod["type"] })}><option value="range">Rentang tanggal</option><option value="month">Bulan</option><option value="year">Tahun</option></select></label>
    {value.type === "range" && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">Tanggal mulai<Input type="date" value={value.startDate} onChange={(event) => onChange({ ...value, startDate: event.target.value })} /></label><label className="space-y-1 text-xs text-muted-foreground">Tanggal selesai<Input type="date" min={value.startDate || undefined} value={value.endDate} onChange={(event) => onChange({ ...value, endDate: event.target.value })} /></label></div>}
    {value.type === "month" && <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-xs text-muted-foreground">Bulan<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.month} onChange={(event) => onChange({ ...value, month: event.target.value })}>{MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}</select></label><label className="space-y-1 text-xs text-muted-foreground">Tahun<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.year} onChange={(event) => onChange({ ...value, year: event.target.value })}>{years.map((year) => <option key={year}>{year}</option>)}</select></label></div>}
    {value.type === "year" && <label className="block space-y-1 text-xs text-muted-foreground">Tahun<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.year} onChange={(event) => onChange({ ...value, year: event.target.value })}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>}
  </section>;
}

function invalidPeriod(period: CustomPeriod) {
  if (period.type === "range") return !period.startDate || !period.endDate || period.startDate > period.endDate;
  if (period.type === "month") return !period.month || !period.year;
  return !period.year;
}

export function ComparisonPeriodDialog({ value, onChange, className = "" }: { value: ComparisonPeriod; onChange: (value: ComparisonPeriod) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  const invalid = draft.mode === "custom" && (invalidPeriod(draft.periodA) || invalidPeriod(draft.periodB));

  return <>
    <Button type="button" variant="outline" className={className} onClick={() => setOpen(true)}><CalendarRange className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{comparisonName(value)}</span></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Pilih Dua Periode</DialogTitle><DialogDescription>Kedua periode grafik dapat diatur terpisah dari filter data detail.</DialogDescription></DialogHeader>
        <label className="space-y-1 text-sm font-medium">Mode perbandingan<select className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as ComparisonPeriod["mode"] })}><option value="previous_period">Periode aktif vs periode sebelumnya</option><option value="last_year">Periode aktif vs periode sama tahun lalu</option><option value="custom">Pilih Periode A dan B</option></select></label>
        {draft.mode === "custom" ? <div className="grid gap-4 md:grid-cols-2"><PeriodFields title="Periode A" value={draft.periodA} onChange={(periodA) => setDraft({ ...draft, periodA })} /><PeriodFields title="Periode B" value={draft.periodB} onChange={(periodB) => setDraft({ ...draft, periodB })} /></div> : <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">Rentang dihitung otomatis berdasarkan periode laporan aktif. Pilih mode kustom untuk membandingkan Mei vs Juni atau dua rentang lain.</p>}
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button type="button" disabled={invalid} onClick={() => { onChange(draft); setOpen(false); }}>Terapkan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
