"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { storageUrl } from "@/lib/storage-url";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock, X, Plus, Trash2 } from "lucide-react";

type Visit = {
  id: string; lead_id: string; client_nama: string | null; tanggal: string | null; jam: string | null;
  keterangan_hasil: string | null;
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

function ClockButton({ visitId, type, onDone }: { visitId: string; type: "in" | "out"; onDone: () => void }) {
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
      await apiClient.post(`/sales-visit/${visitId}/clock-${type}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(type === "in" ? "Clock in tersimpan." : "Clock out tersimpan.");
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Gagal. Pastikan izin lokasi & kamera aktif.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white ${type === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"} ${busy ? "opacity-50" : ""}`}>
      <Clock className="h-4 w-4" /> {busy ? "Mengirim…" : type === "in" ? "Clock In" : "Clock Out"}
      <input disabled={busy} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { submit(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </label>
  );
}

export default function KalenderVisitClientPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<Visit | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ lead_id: "", tanggal: "", jam: "" });
  const [hasil, setHasil] = useState("");

  const { data: visitsData } = useQuery({ queryKey: ["sales-visits"], queryFn: () => apiClient.get("/sales-visit").then((r) => r.data) });
  const { data: leadsData } = useQuery({ queryKey: ["sales-client-leads-opt"], queryFn: () => apiClient.get("/bd/sales-client/leads", { params: { limit: 500 } }).then((r) => r.data) });
  const visits: Visit[] = Array.isArray(visitsData) ? visitsData : [];
  const leads: any[] = Array.isArray(leadsData) ? leadsData : leadsData?.items ?? [];

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

  const refresh = () => qc.invalidateQueries({ queryKey: ["sales-visits"] });
  const openDetail = (v: Visit) => { setSelected(v); setHasil(v.keterangan_hasil ?? ""); };

  const saveJadwal = async () => {
    if (!form.lead_id || !form.tanggal) return toast.error("Client dan tanggal wajib diisi.");
    const lead = leads.find((l) => String(l.id) === form.lead_id);
    const client_nama = lead ? (lead.salutation ? `${lead.salutation} ${lead.nama}` : lead.nama) : null;
    try {
      await apiClient.post("/sales-visit", { lead_id: form.lead_id, client_nama, tanggal: form.tanggal, jam: form.jam || null });
      toast.success("Jadwal visit ditambahkan.");
      setAddOpen(false); setForm({ lead_id: "", tanggal: "", jam: "" });
      refresh();
    } catch (e: any) { toast.error(e?.response?.data?.detail || "Gagal menyimpan jadwal."); }
  };

  const saveHasil = async () => {
    if (!selected) return;
    try {
      await apiClient.patch(`/sales-visit/${selected.id}`, { keterangan_hasil: hasil });
      toast.success("Keterangan hasil disimpan.");
      refresh();
    } catch { toast.error("Gagal menyimpan keterangan."); }
  };

  const delJadwal = async (id: string) => {
    if (!confirm("Hapus jadwal visit ini?")) return;
    try { await apiClient.delete(`/sales-visit/${id}`); toast.success("Jadwal dihapus."); setSelected(null); refresh(); }
    catch { toast.error("Gagal menghapus."); }
  };

  const sel = selected ? visits.find((v) => v.id === selected.id) ?? selected : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-blue-600" /> Kalender Visit Client</h1>
          <p className="text-muted-foreground">Jadwalkan visit ke client (dari Follow Up Leads Client), lalu clock in/out saat kunjungan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md border px-2 py-1.5 hover:bg-muted" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
          <b className="min-w-40 text-center">{monthTitle}</b>
          <button className="rounded-md border px-2 py-1.5 hover:bg-muted" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Tambah Jadwal
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-7 bg-muted/40 text-center text-xs font-bold text-muted-foreground">
          {["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"].map((d) => <div key={d} className="p-3">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const items = day ? visits.filter((v) => v.tanggal && sameDay(new Date(v.tanggal), day)) : [];
            return (
              <div key={i} className="min-h-28 border-b border-r p-2">
                {day && (
                  <>
                    <b className="text-sm">{day.getDate()}</b>
                    <div className="mt-1 space-y-1">
                      {items.map((v) => (
                        <button key={v.id} onClick={() => openDetail(v)} className="block w-full rounded border-l-4 border-blue-500 bg-blue-50 px-2 py-1 text-left text-xs hover:bg-blue-100">
                          <b className="block truncate">{v.client_nama || "Client"}</b>
                          <span className="text-muted-foreground">{v.jam || ""}</span>
                          {v.clock_in_at && <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700">{v.clock_out_at ? "✓ Selesai" : "● Clock in"}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tambah Jadwal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Tambah Jadwal Visit</h2><button onClick={() => setAddOpen(false)}><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Client / Lead</label>
                <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}>
                  <option value="">— Pilih client —</option>
                  {leads.map((l) => <option key={l.id} value={String(l.id)}>{l.salutation ? `${l.salutation} ${l.nama}` : l.nama}{l.nomor_telepon ? ` · ${l.nomor_telepon}` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Tanggal</label><input type="date" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Jam</label><input type="time" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="rounded-md border px-3 py-2 text-sm" onClick={() => setAddOpen(false)}>Batal</button>
                <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={saveJadwal}>Simpan Jadwal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail + clock in/out + keterangan hasil */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{sel.client_nama || "Client"}</h2>
                <p className="text-xs text-muted-foreground">Visit {sel.tanggal ? new Date(sel.tanggal).toLocaleDateString("id-ID") : "-"} {sel.jam || ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => delJadwal(sel.id)} title="Hapus jadwal" className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["in", "out"] as const).map((t) => {
                const at = t === "in" ? sel.clock_in_at : sel.clock_out_at;
                const loc = t === "in" ? sel.clock_in_location : sel.clock_out_location;
                const photo = t === "in" ? sel.clock_in_photo : sel.clock_out_photo;
                return (
                  <div key={t} className="rounded-lg border p-3">
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Clock {t}</p>
                    {at ? (
                      <>
                        <p className="text-sm font-semibold">{jam(at)}</p>
                        {photo && <img src={storageUrl(photo)} alt={`clock ${t}`} className="mt-2 h-24 w-full rounded object-cover" />}
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground"><MapPin className="mr-0.5 inline h-3 w-3" />{loc || "Lokasi tidak tersedia"}</p>
                      </>
                    ) : <p className="text-xs italic text-muted-foreground">Belum {t === "in" ? "clock in" : "clock out"}</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              {!sel.clock_in_at && <ClockButton visitId={sel.id} type="in" onDone={refresh} />}
              {sel.clock_in_at && !sel.clock_out_at && <ClockButton visitId={sel.id} type="out" onDone={refresh} />}
              {sel.clock_in_at && sel.clock_out_at && <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">✓ Visit selesai</span>}
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Keterangan Hasil Visit</label>
              <textarea className="mt-1 w-full min-h-[80px] rounded-md border px-3 py-2 text-sm" value={hasil} onChange={(e) => setHasil(e.target.value)} placeholder="Hasil kunjungan, catatan, tindak lanjut…" />
              <div className="mt-2 flex justify-end">
                <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={saveHasil}>Simpan Keterangan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
