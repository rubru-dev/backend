"use client";

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/lib/api";
import { PageTitle, useGet, Loading, Status, Modal } from "@/components/erp/shared";
import { fileUrl } from "@/lib/utils";
import { showAlert } from "@/lib/app-modal";
import { downloadName } from "@/lib/download-name";

const visitTypeLabel: Record<string, string> = {
  QC_VISIT: "QC Visit",
  MONTHLY_VISIT_B2C: "Monthly Visit B2C",
  MONTHLY_VISIT_B2B: "Monthly Visit B2B",
};

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error("Browser tidak mendukung geolocation."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });
}

function AttendanceButton({ visit, type, onDone }: { visit: any; type: "checkin" | "checkout"; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const disabled = busy || (type === "checkout" && !visit.checkInImagePath);
  const submit = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const pos = await getPosition();
      const fd = new FormData();
      fd.append("type", type);
      fd.append("photo", file);
      fd.append("latitude", String(pos.coords.latitude));
      fd.append("longitude", String(pos.coords.longitude));
      fd.append("accuracy", String(pos.coords.accuracy));
      await api.post(`/erp/service-visits/${visit.id}/attendance`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onDone();
    } catch (e: any) {
      showAlert({ title: "Gagal mengirim bukti", message: e?.response?.data?.error || e?.message || "Coba lagi.", tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className={`btn ${type === "checkin" ? "btn-primary" : ""}`} style={{ minHeight: 32, padding: "4px 10px", fontSize: 12, opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      {busy ? "Mengirim..." : type === "checkin" ? "Check In" : "Check Out"}
      <input disabled={disabled} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { submit(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </label>
  );
}

function VisitCalendar() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<any>(null);
  const { data, loading, reload } = useGet<any>(`/erp/service-visits`);
  const allVisits = data?.data || [];
  const monthVisits = useMemo(() => allVisits.filter((v: any) => {
    const d = new Date(v.scheduledAt);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  }), [allVisits, month]);
  const rows = useMemo(() => {
    if (!search.trim()) return monthVisits;
    const s = search.toLowerCase();
    return monthVisits.filter((v: any) => [v.customer?.name, v.customer?.company, v.agreement?.number, v.pic?.name, v.location, v.serviceType].filter(Boolean).join(" ").toLowerCase().includes(s));
  }, [monthVisits, search]);

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (start.getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= total ? new Date(month.getFullYear(), month.getMonth(), day) : null;
    });
  }, [month]);
  const monthTitle = month.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Visit QC - Fumakilla ERP", 14, 14);
    doc.setFontSize(9);
    doc.text(`Periode: ${monthTitle} | Export: ${new Date().toLocaleString("id-ID")} | Data: ${rows.length}`, 14, 21);
    autoTable(doc, {
      startY: 27,
      head: [["Jadwal", "Customer / Agreement", "Jenis Visit", "PIC", "Lokasi", "Status", "Check In", "Check Out"]],
      body: rows.map((v: any) => [
        new Date(v.scheduledAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
        `${v.customer?.company || v.customer?.name || "-"}${v.agreement?.number ? `\n${v.agreement.number}` : ""}`,
        visitTypeLabel[v.visitType] || v.visitType,
        v.pic?.name || "-",
        v.location || v.customer?.treatmentAddress || v.customer?.address || "-",
        String(v.status || "-").replaceAll("_", " "),
        v.checkInImagePath ? "✓" : "—",
        v.checkOutImagePath ? "✓" : "—",
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [40, 95, 144] },
    });
    doc.save(downloadName({ doc: "Kalender Visit QC", info: month.toLocaleDateString("id-ID", { month: "long", year: "numeric" }), ext: "pdf" }));
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {(["calendar", "list"] as const).map(v => (
            <button key={v}
              className={`px-4 py-2 text-sm font-semibold ${view === v ? "rounded bg-white text-accent shadow" : "text-ts"}`}
              onClick={() => setView(v)}>
              {v === "calendar" ? "Kalender" : "List"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button className="btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Prev</button>
            <b className="min-w-40 text-center">{monthTitle}</b>
            <button className="btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button>
          </div>
          <button className="btn" disabled={!rows.length} onClick={downloadPdf}>Download PDF</button>
        </div>
      </div>

      {view === "calendar" ? (
        loading
          ? <div className="card mt-5 p-8"><Loading /></div>
          : <div className="card mt-5 overflow-hidden">
              <div className="grid grid-cols-7 bg-surface text-center text-xs font-bold tracking-wider text-ts">
                {["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"].map(d => <div className="p-4" key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  const items = day ? monthVisits.filter((v: any) => new Date(v.scheduledAt).getDate() === day.getDate()) : [];
                  return (
                    <div className="min-h-32 border-b border-r border-bdr p-2" key={index}>
                      {day && (
                        <>
                          <b className="text-sm">{day.getDate()}</b>
                          <div className="mt-2 space-y-1">
                            {items.map((v: any) => (
                              <button key={v.id} className="block w-full rounded border-l-4 border-accent bg-surface p-2 text-left text-xs" onClick={() => setSelected(v)}>
                                <b className="block truncate">{v.customer?.company || v.customer?.name || "Customer"}</b>
                                <span>{new Date(v.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - {visitTypeLabel[v.visitType] || v.visitType}</span>
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
      ) : (
        <>
          <section className="card mt-5 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari customer, agreement, PIC, lokasi..." />
            </div>
          </section>
          <section className="card mt-5 overflow-x-auto">
            {loading ? <Loading /> : (
              <table>
                <thead>
                  <tr>
                    <th>Jadwal</th>
                    <th>Customer / Agreement</th>
                    <th>Jenis Visit</th>
                    <th>PIC</th>
                    <th>Lokasi</th>
                    <th>Status</th>
                    <th>Bukti</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v: any) => (
                    <tr key={v.id}>
                      <td>
                        <b>{new Date(v.scheduledAt).toLocaleDateString("id-ID")}</b>
                        <p className="text-xs text-ts">{new Date(v.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td>
                        <b className="text-accent">{v.customer?.company || v.customer?.name}</b>
                        <p className="text-xs text-ts">{v.agreement?.number} {v.serviceContract?.number ? `- ${v.serviceContract.number}` : ""}</p>
                      </td>
                      <td>{visitTypeLabel[v.visitType] || v.visitType}<p className="text-xs text-ts">{v.serviceType || v.agreement?.jenisLayanan || "-"}</p></td>
                      <td>{v.pic?.name || "-"}<p className="text-xs text-ts">{v.pic?.role || ""}</p></td>
                      <td className="max-w-xs whitespace-pre-wrap">{v.location || v.customer?.treatmentAddress || v.customer?.address || "-"}</td>
                      <td><Status value={v.status} /></td>
                      <td>
                        <div className="flex gap-2">
                          {v.checkInImagePath && <a className="text-xs font-semibold text-accent underline" href={fileUrl(v.checkInImagePath)} target="_blank">Check in</a>}
                          {v.checkOutImagePath && <a className="text-xs font-semibold text-accent underline" href={fileUrl(v.checkOutImagePath)} target="_blank">Check out</a>}
                          {!v.checkInImagePath && !v.checkOutImagePath && <span className="text-xs text-ts">Belum ada</span>}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {!v.checkInImagePath && <AttendanceButton visit={v} type="checkin" onDone={reload} />}
                          {v.checkInImagePath && !v.checkOutImagePath && <AttendanceButton visit={v} type="checkout" onDone={reload} />}
                          {v.checkOutImagePath && <span className="text-xs font-semibold text-[#16713b]">Selesai</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr><td colSpan={8} className="p-10 text-center text-sm text-ts">Belum ada jadwal visit.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <Modal open={Boolean(selected)} title="Detail Visit" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-ts">CUSTOMER / AGREEMENT</p>
                <p className="mt-1 font-bold text-accent">{selected.customer?.company || selected.customer?.name}</p>
                <p className="text-xs text-ts">{selected.agreement?.number} {selected.serviceContract?.number ? `- ${selected.serviceContract.number}` : ""}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-ts">JADWAL</p>
                <p className="mt-1 font-bold">{new Date(selected.scheduledAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="text-xs text-ts">{visitTypeLabel[selected.visitType] || selected.visitType}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-ts">PIC</p>
                <p className="mt-1">{selected.pic?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-ts">STATUS</p>
                <div className="mt-1"><Status value={selected.status} /></div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-ts">LOKASI</p>
                <p className="mt-1 whitespace-pre-wrap">{selected.location || selected.customer?.treatmentAddress || selected.customer?.address || "-"}</p>
              </div>
            </div>
            <hr className="border-bdr" />
            <div className="flex flex-wrap items-center gap-3">
              {selected.checkInImagePath && <a className="text-xs font-semibold text-accent underline" href={fileUrl(selected.checkInImagePath)} target="_blank">Foto Check In</a>}
              {selected.checkOutImagePath && <a className="text-xs font-semibold text-accent underline" href={fileUrl(selected.checkOutImagePath)} target="_blank">Foto Check Out</a>}
              <div className="ml-auto flex gap-2">
                {!selected.checkInImagePath && <AttendanceButton visit={selected} type="checkin" onDone={() => { reload(); setSelected(null); }} />}
                {selected.checkInImagePath && !selected.checkOutImagePath && <AttendanceButton visit={selected} type="checkout" onDone={() => { reload(); setSelected(null); }} />}
                {selected.checkOutImagePath && <span className="text-xs font-semibold text-[#16713b]">Selesai</span>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function VisitQcPage() {
  return (
    <div className="p-6 md:p-8">
      <PageTitle title="Visit QC" subtitle="Jadwal QC visit & monthly visit hasil approval agreement — kalender, list, dan bukti check in/out." />
      <VisitCalendar />
    </div>
  );
}
