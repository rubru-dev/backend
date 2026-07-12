"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, Users, UserCheck, CalendarCheck, ChevronDown, ChevronRight } from "lucide-react";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const WEEKS = ["W1", "W2", "W3", "W4"] as const;

type WeekDetail = {
  leads_masuk: { id: string; nama: string; tanggal: string | null }[];
  follow_ups: { lead_id: string; lead_nama: string; catatan: string | null; tanggal: string | null }[];
  closing_survey: { id: string; nama: string; tanggal: string | null }[];
};
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
type Stats = {
  total_follow_up: number; total_leads_followed: number; total_leads: number; closing_survey: number;
  weeks: Record<"W1" | "W2" | "W3" | "W4", WeekDetail>;
};
type BrandStats = { label: string; leadModul: string; stats: Stats };
type Brand = { label: string; leadModul: string };

export function FollowUpSummaryTab({ brands, showClosingSurvey }: { brands: Brand[]; showClosingSurvey: boolean }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery<BrandStats[]>({
    queryKey: ["fu-stats-detail", brands.map((b) => b.leadModul).join(","), month, year],
    queryFn: async () =>
      Promise.all(
        brands.map(async (b) => {
          const stats = await apiClient
            .get("/laporan-harian/follow-up-stats", { params: { lead_modul: b.leadModul, bulan: month, tahun: year } })
            .then((r) => r.data);
          return { label: b.label, leadModul: b.leadModul, stats };
        })
      ),
  });

  const agg = useMemo(() =>
    data.reduce((a, b) => ({
      total_follow_up: a.total_follow_up + (b.stats?.total_follow_up ?? 0),
      total_leads_followed: a.total_leads_followed + (b.stats?.total_leads_followed ?? 0),
      total_leads: a.total_leads + (b.stats?.total_leads ?? 0),
      closing_survey: a.closing_survey + (b.stats?.closing_survey ?? 0),
    }), { total_follow_up: 0, total_leads_followed: 0, total_leads: 0, closing_survey: 0 }), [data]);

  const cards = [
    { label: "Total Follow Up", value: agg.total_follow_up, Icon: PhoneCall, color: "text-blue-600" },
    { label: "Leads di-Follow Up", value: agg.total_leads_followed, Icon: UserCheck, color: "text-amber-600" },
    { label: "Leads Masuk", value: agg.total_leads, Icon: Users, color: "text-violet-600" },
    ...(showClosingSurvey ? [{ label: "Closing Survey", value: agg.closing_survey, Icon: CalendarCheck, color: "text-green-600" }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Periode */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Periode:</span>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Kartu ringkas */}
      <div className={`grid grid-cols-2 gap-4 ${showClosingSurvey ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        {isLoading
          ? Array.from({ length: cards.length }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : cards.map((c) => (
              <Card key={c.label}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <c.Icon className={`h-4 w-4 ${c.color}`} />
                  </div>
                  <p className="text-3xl font-bold mt-1">{c.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Detail per brand → per minggu (expandable) */}
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        data.map((b) => (
          <div key={b.leadModul} className="space-y-2">
            {brands.length > 1 && <p className="text-sm font-bold uppercase tracking-wide text-amber-700">{b.label}</p>}
            <Card>
              <CardContent className="divide-y p-0">
                {WEEKS.map((w) => {
                  const wd = b.stats?.weeks?.[w];
                  const key = `${b.leadModul}:${w}`;
                  const isOpen = expanded === key;
                  const nMasuk = wd?.leads_masuk.length ?? 0;
                  const nFu = wd?.follow_ups.length ?? 0;
                  const nClose = wd?.closing_survey.length ?? 0;
                  return (
                    <div key={w}>
                      <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30" onClick={() => setExpanded(isOpen ? null : key)}>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="w-8 font-semibold">{w}</span>
                        <span className="text-xs text-muted-foreground">
                          Leads masuk <b className="text-foreground">{nMasuk}</b> · Follow-up <b className="text-foreground">{nFu}</b>
                          {showClosingSurvey && <> · Closing survey <b className="text-foreground">{nClose}</b></>}
                        </span>
                      </button>
                      {isOpen && (() => {
                        const dates = Array.from(new Set([
                          ...(wd?.follow_ups ?? []).map((x) => x.tanggal),
                          ...(wd?.leads_masuk ?? []).map((x) => x.tanggal),
                          ...(showClosingSurvey ? (wd?.closing_survey ?? []).map((x) => x.tanggal) : []),
                        ].filter(Boolean) as string[])).sort();
                        return (
                          <div className="space-y-3 px-4 pb-4 pl-11 text-sm">
                            {dates.length === 0 ? (
                              <p className="text-xs italic text-muted-foreground">Tidak ada aktivitas di minggu ini.</p>
                            ) : dates.map((d) => {
                              const fus = (wd?.follow_ups ?? []).filter((x) => x.tanggal === d);
                              const masuk = (wd?.leads_masuk ?? []).filter((x) => x.tanggal === d);
                              const survey = showClosingSurvey ? (wd?.closing_survey ?? []).filter((x) => x.tanggal === d) : [];
                              return (
                                <div key={d} className="overflow-hidden rounded-md border">
                                  <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-bold">{fmtDate(d)}</div>
                                  <div className="space-y-2 p-3">
                                    {fus.length > 0 && (
                                      <div>
                                        <p className="mb-1 text-[11px] font-semibold text-amber-700">Follow Up ({fus.length})</p>
                                        <div className="space-y-1.5">
                                          {fus.map((fu, i) => (
                                            <div key={i} className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                                              <div className="font-medium text-amber-900">{fu.lead_nama}</div>
                                              {fu.catatan ? <p className="mt-0.5 text-xs text-amber-800">{fu.catatan}</p> : <p className="mt-0.5 text-xs italic text-muted-foreground/60">Tanpa catatan</p>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {masuk.length > 0 && (
                                      <div>
                                        <p className="mb-1 text-[11px] font-semibold text-violet-700">Leads Masuk ({masuk.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {masuk.map((l, i) => <span key={i} className="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs">{l.nama}</span>)}
                                        </div>
                                      </div>
                                    )}
                                    {survey.length > 0 && (
                                      <div>
                                        <p className="mb-1 text-[11px] font-semibold text-green-700">Closing Survey ({survey.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {survey.map((l, i) => <span key={i} className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs">{l.nama}</span>)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
