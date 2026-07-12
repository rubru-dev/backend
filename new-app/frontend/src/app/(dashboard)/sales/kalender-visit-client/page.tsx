"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { storageUrl } from "@/lib/storage-url";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock, X } from "lucide-react";

type Att = {
  lead_id: string;
  clock_in_at: string | null; clock_in_location: string | null; clock_in_photo: string | null;
  clock_out_at: string | null; clock_out_location: string | null; clock_out_photo: string | null;
};

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Browser tidak mendukung lokasi."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });
}

const jam = (d?: string | null) => (d ? new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-");

function ClockButton({ leadId, type, disabled, onDone }: { leadId: string; type: "in" | "out"; disabled?: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const pos = await getPosition();
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("lat", String(pos.coords.latitude));
      fd.append("lng", String(pos.coords.longitude));
      await apiClient.post(`/sales-visit/${leadId}/clock-${type}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(type === "in" ? "Clock in tersimpan." : "Clock out tersimpan.");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Gagal. Pastikan izin lokasi & kamera aktif.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white ${type === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"} ${disabled || busy ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <Clock className="h-4 w-4" /> {busy ? "Mengirim…" : type === "in" ? "Clock In" : "Clock Out"}
      <input disabled={disabled || busy} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { submit(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </label>
  );
}

export default function KalenderVisitClientPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<any>(null);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["sales-client-leads-visit"],
    queryFn: () => apiClient.get("/bd/sales-client/leads", { params: { limit: 500 } }).then((r) => r.data),
  });
  const { data: attData } = useQuery({
    queryKey: ["sales-visit-att"],
    queryFn: () => apiClient.get("/sales-visit").then((r) => r.data),
  });

  const leads: any[] = Array.isArray(leadsData) ? leadsData : leadsData?.items ?? [];
  const visits = useMemo(() => leads.filter((l) => l.tanggal_survey), [leads]);
  const attMap = useMemo(() => {
    const m: Record<string, Att> = {};
    (Array.isArray(attData) ? attData : []).forEach((a: Att) => { m[String(a.lead_id)] = a; });
    return m;
  }, [attData]);

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (start.getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, i) => {
      const day = i - offset + 1;
      return day > 0 && day <= total ? new Date(month.getFullYear(), month.getMonth(), day) : null;
    });
  }, [month]);
  const monthTitle = month.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const sel = selected ? attMap[String(selected.id)] : undefined;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["sales-visit-att"] }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarDays className="h-6 w-6 text-blue-600" /> Kalender Visit Client
          </h1>
          <p className="text-muted-foreground">Jadwal visit dari leads Follow Up Leads Client. Klik jadwal untuk clock in/out.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md border px-2 py-1.5 hover:bg-muted" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
          <b className="min-w-40 text-center">{monthTitle}</b>
          <button className="rounded-md border px-2 py-1.5 hover:bg-muted" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-7 bg-muted/40 text-center text-xs font-bold text-muted-foreground">
          {["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"].map((d) => <div key={d} className="p-3">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const items = day ? visits.filter((v) => sameDay(new Date(v.tanggal_survey), day)) : [];
            return (
              <div key={i} className="min-h-28 border-b border-r p-2">
                {day && (
                  <>
                    <b className="text-sm">{day.getDate()}</b>
                    <div className="mt-1 space-y-1">
                      {items.map((v) => {
                        const a = attMap[String(v.id)];
                        return (
                          <button key={v.id} onClick={() => setSelected(v)} className="block w-full rounded border-l-4 border-blue-500 bg-blue-50 px-2 py-1 text-left text-xs hover:bg-blue-100">
                            <b className="block truncate">{v.nama}</b>
                            <span className="text-muted-foreground">{v.jam_survey || ""} · {v.jenis || "-"}</span>
                            {a?.clock_in_at && <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700">{a.clock_out_at ? "✓ Selesai" : "● Clock in"}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isLoading && <p className="text-center text-sm text-muted-foreground">Memuat…</p>}
      {!isLoading && visits.length === 0 && <p className="text-center text-sm text-muted-foreground">Belum ada jadwal visit dari leads client.</p>}

      {/* Modal clock in/out */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.nama}</h2>
                <p className="text-xs text-muted-foreground">{selected.jenis || "-"} · Visit {selected.tanggal_survey ? new Date(selected.tanggal_survey).toLocaleDateString("id-ID") : "-"} {selected.jam_survey || ""}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>
            {selected.alamat && <p className="mb-3 text-sm"><MapPin className="mr-1 inline h-3.5 w-3.5" />{selected.alamat}</p>}

            <div className="grid grid-cols-2 gap-3">
              {(["in", "out"] as const).map((t) => {
                const at = t === "in" ? sel?.clock_in_at : sel?.clock_out_at;
                const loc = t === "in" ? sel?.clock_in_location : sel?.clock_out_location;
                const photo = t === "in" ? sel?.clock_in_photo : sel?.clock_out_photo;
                return (
                  <div key={t} className="rounded-lg border p-3">
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Clock {t}</p>
                    {at ? (
                      <>
                        <p className="text-sm font-semibold">{jam(at)}</p>
                        {photo && <img src={storageUrl(photo)} alt={`clock ${t}`} className="mt-2 h-24 w-full rounded object-cover" />}
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground"><MapPin className="mr-0.5 inline h-3 w-3" />{loc || "Lokasi tidak tersedia"}</p>
                      </>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">Belum {t === "in" ? "clock in" : "clock out"}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              {!sel?.clock_in_at && <ClockButton leadId={String(selected.id)} type="in" onDone={refresh} />}
              {sel?.clock_in_at && !sel?.clock_out_at && <ClockButton leadId={String(selected.id)} type="out" onDone={refresh} />}
              {sel?.clock_in_at && sel?.clock_out_at && <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">✓ Visit selesai</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
