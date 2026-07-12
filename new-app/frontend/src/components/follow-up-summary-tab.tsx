"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, Users, UserCheck, CalendarCheck } from "lucide-react";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const WEEKS = ["W1", "W2", "W3", "W4"] as const;

type Stats = {
  total_follow_up: number;
  total_leads_followed: number;
  total_leads: number;
  closing_survey: number;
  leads_by_week: Record<"W1" | "W2" | "W3" | "W4", number>;
  followups_by_week: Record<"W1" | "W2" | "W3" | "W4", number>;
};

export function FollowUpSummaryTab({ leadModul }: { leadModul: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["fu-stats", leadModul, month, year],
    queryFn: () =>
      apiClient
        .get("/laporan-harian/follow-up-stats", { params: { lead_modul: leadModul, bulan: month, tahun: year } })
        .then((r) => r.data),
  });

  const cards = [
    { label: "Total Follow Up", value: data?.total_follow_up ?? 0, Icon: PhoneCall, color: "text-blue-600" },
    { label: "Leads di-Follow Up", value: data?.total_leads_followed ?? 0, Icon: UserCheck, color: "text-amber-600" },
    { label: "Leads Masuk", value: data?.total_leads ?? 0, Icon: Users, color: "text-violet-600" },
    { label: "Closing Survey", value: data?.closing_survey ?? 0, Icon: CalendarCheck, color: "text-green-600" },
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
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

      {/* Breakdown per minggu (W1–W4) */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2 font-medium">Per Minggu</th>
                {WEEKS.map((w) => <th key={w} className="px-4 py-2 font-medium text-center">{w}</th>)}
                <th className="px-4 py-2 font-medium text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3 font-medium">Leads masuk</td>
                {WEEKS.map((w) => <td key={w} className="px-4 py-3 text-center">{data?.leads_by_week?.[w] ?? 0}</td>)}
                <td className="px-4 py-3 text-center font-bold">{data?.total_leads ?? 0}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Aktivitas follow-up</td>
                {WEEKS.map((w) => <td key={w} className="px-4 py-3 text-center">{data?.followups_by_week?.[w] ?? 0}</td>)}
                <td className="px-4 py-3 text-center font-bold">{data?.total_follow_up ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
