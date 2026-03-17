"use client";
import { useState, useEffect, useCallback } from "react";
import { portalApi } from "@/lib/apiClient";

interface AktivitasItem {
  id: number;
  judul: string;
  deskripsi: string | null;
  tanggal: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  status: string;
}

interface KehadiranRecord {
  id: number;
  tanggal: string;
  keterangan: string | null;
  items: { id: number; tukang_name: string; hadir: boolean; keterangan: string | null }[];
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function addDays(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

const statusBg: Record<string, string> = {
  Selesai: "bg-green-50 text-green-600",
  "Dalam Proses": "bg-yellow-50 text-yellow-600",
  Tertunda: "bg-red-50 text-red-500",
};
const statusClass: Record<string, string> = {
  Selesai: "text-green-500",
  "Dalam Proses": "text-yellow-500",
  Tertunda: "text-red-500",
};
const hadirBg: Record<string, string> = {
  true: "bg-green-50 text-green-600",
  false: "bg-red-50 text-red-500",
};
const GANTT_COLOR: Record<string, string> = {
  Selesai: "bg-green-500",
  "Dalam Proses": "bg-yellow-400",
  Tertunda: "bg-red-500",
};
const DAY_W = 32; // px per hari

type Tab = "riwayat" | "kehadiran" | "gantt";

export default function AktivitasPage() {
  const [activeTab, setActiveTab] = useState<Tab>("riwayat");
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [aktivitas, setAktivitas] = useState<AktivitasItem[]>([]);
  const [kehadiran, setKehadiran] = useState<KehadiranRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loadingA, setLoadingA] = useState(true);
  const [loadingK, setLoadingK] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AktivitasItem | null>(null);

  useEffect(() => {
    setLoadingA(true);
    Promise.all([portalApi.me(), portalApi.aktivitas()])
      .then(([p, a]) => { setProject(p); setAktivitas(a); })
      .catch(console.error)
      .finally(() => setLoadingA(false));
  }, []);

  const fetchKehadiran = useCallback(() => {
    setLoadingK(true);
    portalApi.kehadiran()
      .then(setKehadiran)
      .catch(console.error)
      .finally(() => setLoadingK(false));
  }, []);

  useEffect(() => {
    if (activeTab === "kehadiran" && kehadiran.length === 0) fetchKehadiran();
  }, [activeTab, fetchKehadiran, kehadiran.length]);

  function handleSearch() {
    setLoadingA(true);
    portalApi.aktivitas(search || undefined)
      .then(setAktivitas)
      .catch(console.error)
      .finally(() => setLoadingA(false));
  }

  // ── Gantt chart helpers ──────────────────────────────────────────────────────
  const ganttItems = aktivitas.filter(
    (a) => (a.tanggal_mulai || a.tanggal) && (a.tanggal_selesai || a.tanggal)
  );

  // Build day array
  const days: Date[] = [];
  let ganttRangeStart = startOfDay(new Date());
  let ganttRangeEnd = startOfDay(addDays(new Date(), 29));

  if (ganttItems.length > 0) {
    const starts = ganttItems.map((a) => startOfDay(new Date(a.tanggal_mulai || a.tanggal!)));
    const ends = ganttItems.map((a) => startOfDay(new Date(a.tanggal_selesai || a.tanggal!)));
    ganttRangeStart = new Date(Math.min(...starts.map((d) => d.getTime())));
    ganttRangeEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
  }

  let cur = ganttRangeStart;
  while (cur <= ganttRangeEnd) { days.push(new Date(cur)); cur = addDays(cur, 1); }
  if (days.length === 0) { for (let i = 0; i < 30; i++) { days.push(addDays(ganttRangeStart, i)); } }

  const totalWidth = days.length * DAY_W;
  const rangeStartMs = ganttRangeStart.getTime();

  // Group days by month for header
  const monthGroups: { label: string; days: number }[] = [];
  for (const d of days) {
    const label = fmtMonth(d);
    if (monthGroups.length === 0 || monthGroups[monthGroups.length - 1].label !== label) {
      monthGroups.push({ label, days: 1 });
    } else {
      monthGroups[monthGroups.length - 1].days++;
    }
  }

  function barStyle(item: AktivitasItem) {
    const s = startOfDay(new Date(item.tanggal_mulai || item.tanggal!)).getTime();
    const e = startOfDay(new Date(item.tanggal_selesai || item.tanggal!)).getTime();
    const dayStart = Math.round((s - rangeStartMs) / 86400000);
    const dayEnd = Math.round((e - rangeStartMs) / 86400000);
    const left = Math.max(0, dayStart * DAY_W);
    const width = Math.max(DAY_W, (dayEnd - dayStart + 1) * DAY_W);
    return { left, width };
  }

  const today = startOfDay(new Date()).getTime();
  const todayIdx = Math.round((today - rangeStartMs) / 86400000);

  const tabLabels: Record<Tab, string> = {
    riwayat: "Riwayat Pekerjaan",
    kehadiran: "Kehadiran Tukang",
    gantt: "Gantt Chart",
  };

  return (
    <>
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#0F4C75] mb-1">
        {(project?.nama_proyek as string) ?? "Proyek"}
      </h1>
      <p className="text-sm text-slate-400 flex items-center gap-1 mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="6" r="3" stroke="#94a3b8" strokeWidth="1.2"/>
        </svg>
        {(project?.alamat as string) ?? "-"}
      </p>

      <h2 className="text-base font-semibold text-slate-700 mb-4">Aktivitas &amp; Progress Proyek</h2>

      {/* Tabs + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
          {(["riwayat", "kehadiran", "gantt"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 mr-4 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px flex-shrink-0 ${
                activeTab === tab
                  ? "border-[#0F4C75] text-[#0F4C75]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {activeTab === "riwayat" && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Cari aktivitas"
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white w-full sm:w-40 placeholder:text-slate-300"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-orange-600 transition"
            >
              Cari
            </button>
          </div>
        )}
      </div>

      {/* ── Tab: Riwayat Pekerjaan ── */}
      {activeTab === "riwayat" && (
        loadingA ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : aktivitas.length === 0 ? (
          <div className="text-center py-16 text-slate-400">Belum ada aktivitas</div>
        ) : (<>
          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-4 text-slate-400 font-medium w-10">No</th>
                  <th className="text-left px-5 py-4 text-slate-400 font-medium">Nama Aktivitas</th>
                  <th className="text-left px-5 py-4 text-slate-400 font-medium">Tgl Mulai</th>
                  <th className="text-left px-5 py-4 text-slate-400 font-medium">Tgl Selesai</th>
                  <th className="text-left px-5 py-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left px-5 py-4 text-slate-400 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {aktivitas.map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-orange-500 font-medium">{idx + 1}</td>
                    <td className="px-5 py-3 text-slate-600">{row.judul}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(row.tanggal_mulai || row.tanggal)}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(row.tanggal_selesai)}</td>
                    <td className="px-5 py-3">
                      <span className={`font-medium ${statusClass[row.status] ?? "text-slate-500"}`}>{row.status}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{row.deskripsi ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {aktivitas.map((row, idx) => (
              <div key={row.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs text-orange-500 font-bold">#{idx + 1}</span>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{row.judul}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBg[row.status] ?? "bg-slate-50 text-slate-500"}`}>
                    {row.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
                  <span>Mulai: {fmtDate(row.tanggal_mulai || row.tanggal)}</span>
                  {row.tanggal_selesai && <span>Selesai: {fmtDate(row.tanggal_selesai)}</span>}
                  {row.deskripsi && <span className="text-slate-500">{row.deskripsi}</span>}
                </div>
              </div>
            ))}
          </div>
        </>)
      )}

      {/* ── Tab: Kehadiran Tukang ── */}
      {activeTab === "kehadiran" && (
        loadingK ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : kehadiran.length === 0 ? (
          <div className="text-center py-16 text-slate-400">Belum ada data kehadiran</div>
        ) : (
          <div className="space-y-4">
            {kehadiran.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{fmtDate(rec.tanggal)}</span>
                  {rec.keterangan && <span className="text-xs text-slate-400">{rec.keterangan}</span>}
                </div>
                {rec.items.length === 0 ? (
                  <p className="px-5 py-3 text-xs text-slate-400">Tidak ada tukang</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="text-left px-5 py-2 text-xs text-slate-400 font-medium">Nama Pekerja</th>
                        <th className="text-left px-5 py-2 text-xs text-slate-400 font-medium">Status</th>
                        <th className="text-left px-5 py-2 text-xs text-slate-400 font-medium">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-5 py-2.5 text-slate-600">{item.tukang_name}</td>
                          <td className="px-5 py-2.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hadirBg[String(item.hadir)]}`}>
                              {item.hadir ? "Hadir" : "Tidak Hadir"}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-slate-400 text-xs">{item.keterangan ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tab: Gantt Chart ── */}
      {activeTab === "gantt" && (
        loadingA ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ganttItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            Belum ada data aktivitas dengan tanggal mulai &amp; selesai
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {/* Header Row 1: Bulan */}
                <div className="border-b border-slate-100" style={{ minWidth: 200 + totalWidth }}>
                  <div className="flex">
                    <div className="w-44 shrink-0 px-4 py-2 text-xs font-semibold text-slate-400 border-r border-slate-100 bg-slate-50">
                      Pekerjaan
                    </div>
                    {monthGroups.map((mg, i) => (
                      <div
                        key={i}
                        className="text-center text-xs font-semibold py-2 border-r border-slate-200 shrink-0 bg-slate-50 text-slate-600"
                        style={{ width: mg.days * DAY_W }}
                      >
                        {mg.label}
                      </div>
                    ))}
                  </div>
                  {/* Header Row 2: Tanggal */}
                  <div className="flex border-t border-slate-100">
                    <div className="w-44 shrink-0 border-r border-slate-100 bg-white" />
                    {days.map((d, i) => {
                      const isToday = startOfDay(d).getTime() === today;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={`shrink-0 text-center text-xs py-1 border-r border-slate-100 ${
                            isToday ? "bg-orange-500 text-white font-bold" :
                            isWeekend ? "bg-slate-50 text-slate-300" : "text-slate-400"
                          }`}
                          style={{ width: DAY_W }}
                        >
                          {d.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rows */}
                <div style={{ minWidth: 200 + totalWidth }}>
                  {ganttItems.map((task, idx) => {
                    const bar = barStyle(task);
                    const color = GANTT_COLOR[task.status] ?? "bg-slate-400";
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center border-b border-slate-50 last:border-0 ${idx % 2 === 1 ? "bg-orange-50/20" : ""}`}
                        style={{ height: 48 }}
                      >
                        <div className="w-44 shrink-0 px-3 border-r border-slate-100">
                          <p className="text-xs font-medium text-slate-600 truncate">{task.judul}</p>
                          <p className={`text-xs mt-0.5 ${
                            task.status === "Selesai" ? "text-green-500" :
                            task.status === "Dalam Proses" ? "text-yellow-500" :
                            task.status === "Tertunda" ? "text-red-500" : "text-slate-400"
                          }`}>{task.status}</p>
                        </div>
                        <div className="relative shrink-0" style={{ width: totalWidth, height: 48 }}>
                          {/* Today line */}
                          {todayIdx >= 0 && todayIdx < days.length && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-orange-400 opacity-50 z-10"
                              style={{ left: todayIdx * DAY_W + DAY_W / 2 }}
                            />
                          )}
                          {/* Weekend shading */}
                          {days.map((d, di) => (
                            (d.getDay() === 0 || d.getDay() === 6) ? (
                              <div
                                key={di}
                                className="absolute top-0 bottom-0 bg-slate-100/60"
                                style={{ left: di * DAY_W, width: DAY_W }}
                              />
                            ) : null
                          ))}
                          <div
                            className={`${color} rounded flex items-center px-2 py-1 absolute top-1/2 -translate-y-1/2 z-20 cursor-pointer hover:brightness-90 transition-all`}
                            style={{ left: bar.left, width: bar.width, minWidth: DAY_W }}
                            title="Klik untuk detail"
                            onClick={() => setSelectedTask(task)}
                          >
                            <span className="text-white text-xs font-medium truncate">{task.judul}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 border-t border-slate-100">
                {[
                  { color: "bg-green-500", label: "Selesai", text: "text-green-600" },
                  { color: "bg-yellow-400", label: "Dalam Proses", text: "text-yellow-500" },
                  { color: "bg-red-500", label: "Tertunda", text: "text-red-500" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${l.color} shrink-0`}/>
                    <span className={`${l.text} font-medium`}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center mt-3 sm:hidden">
              Geser ke kanan untuk melihat seluruh grafik
            </p>
          </>
        )
      )}
    </div>

    {/* ── Gantt Detail Modal ── */}
    {selectedTask && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => setSelectedTask(null)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Status badge */}
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${statusBg[selectedTask.status] ?? "bg-slate-50 text-slate-500"}`}>
            {selectedTask.status}
          </span>

          <h3 className="text-lg font-bold text-slate-800 mb-4">{selectedTask.judul}</h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <div className="flex gap-4">
                <span>Mulai: <span className="font-medium text-slate-700">{fmtDate(selectedTask.tanggal_mulai || selectedTask.tanggal)}</span></span>
                {selectedTask.tanggal_selesai && (
                  <span>Selesai: <span className="font-medium text-slate-700">{fmtDate(selectedTask.tanggal_selesai)}</span></span>
                )}
              </div>
            </div>

            {selectedTask.tanggal_mulai && selectedTask.tanggal_selesai && (
              <div className="flex items-center gap-3 text-slate-500">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span>
                  Durasi: <span className="font-medium text-slate-700">
                    {Math.round((new Date(selectedTask.tanggal_selesai).getTime() - new Date(selectedTask.tanggal_mulai).getTime()) / 86400000) + 1} hari
                  </span>
                </span>
              </div>
            )}

            {selectedTask.deskripsi && (
              <div className="bg-slate-50 rounded-xl p-3 text-slate-600 text-xs leading-relaxed">
                {selectedTask.deskripsi}
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedTask(null)}
            className="mt-5 w-full py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    )}
    </>
  );
}
