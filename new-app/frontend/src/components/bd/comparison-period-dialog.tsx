"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ComparisonPeriod = {
  mode: "previous_period" | "last_year" | "custom_range" | "custom_month" | "custom_year";
  startDate: string;
  endDate: string;
  month: string;
  year: string;
};

export const defaultComparisonPeriod = (): ComparisonPeriod => ({
  mode: "previous_period",
  startDate: "",
  endDate: "",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
});

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function comparisonQuery(period: ComparisonPeriod) {
  if (period.mode === "custom_range") return { compare: "custom", compare_start_date: period.startDate, compare_end_date: period.endDate };
  if (period.mode === "custom_month") return { compare: "custom", compare_bulan: period.month, compare_tahun: period.year };
  if (period.mode === "custom_year") return { compare: "custom", compare_tahun: period.year };
  return { compare: period.mode };
}

function periodName(period: ComparisonPeriod) {
  if (period.mode === "last_year") return "Periode sama tahun lalu";
  if (period.mode === "custom_range") return period.startDate && period.endDate ? `${period.startDate} – ${period.endDate}` : "Rentang tanggal khusus";
  if (period.mode === "custom_month") return `${MONTHS[Number(period.month) - 1]} ${period.year}`;
  if (period.mode === "custom_year") return `Tahun ${period.year}`;
  return "Periode sebelumnya";
}

export function ComparisonPeriodDialog({ value, onChange, className = "" }: { value: ComparisonPeriod; onChange: (value: ComparisonPeriod) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  const invalid = draft.mode === "custom_range"
    ? !draft.startDate || !draft.endDate || draft.startDate > draft.endDate
    : (draft.mode === "custom_month" && (!draft.month || !draft.year)) || (draft.mode === "custom_year" && !draft.year);
  const years = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() - index));

  return <>
    <Button type="button" variant="outline" className={className} onClick={() => setOpen(true)}><CalendarRange className="mr-2 h-4 w-4" /><span className="truncate">Pembanding: {periodName(value)}</span></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Pilih Periode Pembanding</DialogTitle><DialogDescription>Tentukan periode yang akan dibandingkan dengan periode laporan aktif.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <label className="space-y-1 text-sm font-medium">Jenis periode<select className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal" value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as ComparisonPeriod["mode"] })}><option value="previous_period">Periode sebelumnya</option><option value="last_year">Periode sama tahun lalu</option><option value="custom_range">Rentang tanggal khusus</option><option value="custom_month">Bulan tertentu</option><option value="custom_year">Tahun tertentu</option></select></label>
          {draft.mode === "custom_range" && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">Tanggal mulai<Input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label className="space-y-1 text-xs text-muted-foreground">Tanggal selesai<Input type="date" min={draft.startDate || undefined} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></div>}
          {draft.mode === "custom_month" && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">Bulan<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.month} onChange={(event) => setDraft({ ...draft, month: event.target.value })}>{MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}</select></label><label className="space-y-1 text-xs text-muted-foreground">Tahun<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })}>{years.map((year) => <option key={year}>{year}</option>)}</select></label></div>}
          {draft.mode === "custom_year" && <label className="block space-y-1 text-xs text-muted-foreground">Tahun<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>}
          {(draft.mode === "previous_period" || draft.mode === "last_year") && <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">Rentang pembanding dihitung otomatis mengikuti panjang periode laporan aktif.</p>}
        </div>
        <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button type="button" disabled={invalid} onClick={() => { onChange(draft); setOpen(false); }}>Terapkan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
