"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/lib/api";
import { Loading, Modal, PageTitle, Status, useGet } from "@/components/erp/shared";
import { LiveSurveyEvidence } from "@/components/erp/live-survey-evidence";
import { fileUrl } from "@/lib/utils";
import { downloadName } from "@/lib/download-name";
import { useAuth } from "@/hooks/useAuth";

const issueOptions = ["Lalat", "Nyamuk", "Semut", "Kecoa", "Serangga lain", "Tikus", "Rayap", "Burung", "Kelelawar", "Tipe Hama lain"];
const dateLabel = (value: string) => new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

// Dropdown Export (PDF/PPT). Pakai position:fixed supaya tidak terpotong overflow tabel.
function ExportMenu({ disabled, onExport }: { disabled: boolean; onExport: (format: "pdf" | "ppt") => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); };
  }, [open]);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const r = btnRef.current!.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: Math.max(8, r.right - 150) });
    setOpen(o => !o);
  };
  return (
    <span className="inline-block">
      <button
        ref={btnRef}
        disabled={disabled}
        onClick={toggle}
        title={disabled ? "Report harus di-approve dulu" : "Export report"}
        className="rounded border border-[#6b7280] px-2 py-1 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export ▾
      </button>
      {open && (
        <div
          style={{ position: "fixed", top: coords.top, left: coords.left, width: 150 }}
          className="z-50 overflow-hidden rounded-lg border border-bdr bg-white shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-[#f2f3fd]" onClick={() => { setOpen(false); onExport("pdf"); }}><span className="rounded bg-[#e5252a] px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white">PDF</span>Export PDF</button>
          <button className="flex w-full items-center gap-2 border-t border-bdr px-3 py-2 text-left text-xs font-medium hover:bg-[#f2f3fd]" onClick={() => { setOpen(false); onExport("ppt"); }}><span className="rounded bg-[#d24726] px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white">PPT</span>Export PPT</button>
        </div>
      )}
    </span>
  );
}

function AttendancePhoto({ label, path, capturedAt, lat, lng }: { label: string; path?: string | null; capturedAt?: string | null; lat?: number | null; lng?: number | null }) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const hasLocation = lat != null && lng != null;
  const location = hasLocation ? (address || "Mengambil alamat...") : "Lokasi tidak tersedia";
  const time = capturedAt ? new Date(capturedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Jam tidak tersedia";
  useEffect(() => {
    if (!open || !hasLocation || address) return;
    let cancelled = false;
    api.get("/erp/reverse-geocode", { params: { lat, lng } })
      .then(res => { if (!cancelled) setAddress(res.data?.address || "Alamat tidak tersedia"); })
      .catch(() => { if (!cancelled) setAddress("Alamat tidak tersedia"); });
    return () => { cancelled = true; };
  }, [open, hasLocation, lat, lng, address]);
  if (!path) return <p className="mt-2 text-xs text-ts">Belum {label.toLowerCase()}</p>;
  return (
    <>
      <button type="button" className="mt-2 block w-full overflow-hidden rounded" onClick={() => setOpen(true)} title={`Lihat foto ${label}`}>
        <img className="max-h-24 w-full object-cover" src={fileUrl(path)} alt={label} />
      </button>
      {capturedAt && <p className="mt-1 text-xs text-ts">{time}</p>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-xl bg-black shadow-2xl" onClick={e => e.stopPropagation()}>
            <img className="max-h-[90vh] max-w-full object-contain" src={fileUrl(path)} alt={label} />
            <div className="absolute bottom-3 right-3 rounded-lg bg-black/75 px-3 py-2 text-right text-xs font-semibold text-white shadow">
              <p>{label} - {time}</p>
              <p className="mt-1">{location}</p>
            </div>
            <button className="absolute right-3 top-3 rounded bg-black/70 px-3 py-1 text-sm font-bold text-white" onClick={() => setOpen(false)}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
}

function B2CSurveyForm({ survey, onSaved }: { survey: any; onSaved: (item: any) => void }) {
  const { data: vendors } = useGet<any>("/erp/vendor-options");
  const [floors, setFloors] = useState<any[]>(() => Array.isArray(survey.b2cFloorDescriptions) && survey.b2cFloorDescriptions.length ? survey.b2cFloorDescriptions : [{ floor: 1, description: "" }]);
  const [issues, setIssues] = useState<string[]>(() => Array.isArray(survey.b2cIssues) ? survey.b2cIssues.map((item: any) => typeof item === "string" ? item : item.name) : []);
  const [issueOther, setIssueOther] = useState(() => Array.isArray(survey.b2cIssues) ? survey.b2cIssues.find((item: any) => item.name === "Serangga lain")?.description || "" : "");
  const [pestOther, setPestOther] = useState(() => Array.isArray(survey.b2cIssues) ? survey.b2cIssues.find((item: any) => item.name === "Tipe Hama lain")?.description || "" : "");
  const [findings, setFindings] = useState<any[]>(() => Array.isArray(survey.b2cPestFindings) && survey.b2cPestFindings.length ? survey.b2cPestFindings : [{ description: "", file: null }]);
  const [unitName, setUnitName] = useState(survey.b2cUnitName || "");
  const [quantity, setQuantity] = useState(survey.b2cQuantity || "");
  const [treatments, setTreatments] = useState<string[]>(() => survey.b2cTreatments?.length ? survey.b2cTreatments : [""]);
  const [visitQty, setVisitQty] = useState(survey.b2cVisitQty || "");
  const [visitPerMonth, setVisitPerMonth] = useState(survey.b2cVisitPerMonth || "");
  const [totalCost, setTotalCost] = useState(survey.b2cTotalCost || "");
  const [vendorName, setVendorName] = useState(survey.b2cVendorName || "");
  const [existingPestControl, setExistingPestControl] = useState(survey.b2cExistingPestControl || "");
  const [pointNotes, setPointNotes] = useState<string[]>(() => survey.b2cPointNotes?.length ? survey.b2cPointNotes : [""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleIssue = (name: string) => setIssues((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const selectedIssues = issues.map((name) => ({ name, ...(name === "Serangga lain" ? { description: issueOther } : {}), ...(name === "Tipe Hama lain" ? { description: pestOther } : {}) }));
      const body = new FormData();
      body.append("floors", JSON.stringify(floors.filter((floor) => String(floor.description || "").trim())));
      body.append("issues", JSON.stringify(selectedIssues));
      body.append("pestFindings", JSON.stringify(findings.map((finding) => ({ description: finding.description || "", filePath: finding.filePath || "" }))));
      findings.forEach((finding, index) => {
        if (finding.file instanceof File) body.append("photos", finding.file);
        body.append(`photoDescription_${index}`, finding.description || "");
      });
      body.append("unitName", unitName);
      body.append("quantity", String(quantity || ""));
      body.append("treatments", JSON.stringify(treatments.map((item) => item.trim()).filter(Boolean)));
      body.append("visitQty", String(visitQty || ""));
      body.append("visitPerMonth", String(visitPerMonth || ""));
      body.append("totalCost", String(totalCost || ""));
      body.append("vendorName", vendorName);
      body.append("existingPestControl", existingPestControl);
      body.append("pointNotes", JSON.stringify(pointNotes.map((item) => item.trim()).filter(Boolean)));
      const res = await api.post(`/erp/surveys/${survey.id}/b2c`, body);
      onSaved(res.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Data survey B2C gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6 rounded-xl border border-bdr bg-white p-5">
      <div>
        <h3 className="text-base font-bold">Data Survey B2C</h3>
        <p className="mt-1 text-sm text-ts">Isi detail area, issue hama, dokumentasi, treatment, visit, vendor, dan catatan.</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h4 className="font-bold">Deskripsi Area</h4><button className="btn" onClick={() => setFloors((rows) => [...rows, { floor: rows.length + 1, description: "" }])}>+ Tambah Lantai</button></div>
        {floors.map((row, index) => <label className="block text-sm font-semibold" key={index}>Lantai {index + 1}<textarea className="mt-2" rows={2} value={row.description || ""} onChange={(event) => setFloors((rows) => rows.map((item, i) => i === index ? { ...item, floor: index + 1, description: event.target.value } : item))} /></label>)}
      </div>
      <div>
        <h4 className="font-bold">Issue</h4>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{issueOptions.map((item) => <label className="flex items-center gap-2 text-sm" key={item}><input type="checkbox" checked={issues.includes(item)} onChange={() => toggleIssue(item)} />{item}</label>)}</div>
        {issues.includes("Serangga lain") && <input className="mt-3" placeholder="Isi manual serangga lain" value={issueOther} onChange={(event) => setIssueOther(event.target.value)} />}
        {issues.includes("Tipe Hama lain") && <input className="mt-3" placeholder="Isi manual tipe hama lain" value={pestOther} onChange={(event) => setPestOther(event.target.value)} />}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h4 className="font-bold">Dokumentasi Temuan Hama</h4><button className="btn" onClick={() => setFindings((rows) => [...rows, { description: "", file: null }])}>+ Tambah Foto</button></div>
        {findings.map((row, index) => <div className="rounded-lg border border-bdr p-4" key={index}><div className="grid gap-3 md:grid-cols-2"><input type="file" accept="image/*" onChange={(event) => setFindings((rows) => rows.map((item, i) => i === index ? { ...item, file: event.target.files?.[0] || null } : item))} /><input placeholder="Deskripsi lokasi" value={row.description || ""} onChange={(event) => setFindings((rows) => rows.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} /></div>{row.filePath && <img className="mt-3 max-h-40 rounded-lg object-cover" src={fileUrl(row.filePath)} alt="Dokumentasi temuan" />}</div>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Unit: Nama Item<input className="mt-2" value={unitName} onChange={(event) => setUnitName(event.target.value)} /></label>
        <label className="text-sm font-semibold">Quantity<input className="mt-2" type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h4 className="font-bold">Treatment</h4><button className="btn" onClick={() => setTreatments((rows) => [...rows, ""])}>+ Tambah Treatment</button></div>
        {treatments.map((item, index) => <input key={index} value={item} placeholder={`Treatment ${index + 1}`} onChange={(event) => setTreatments((rows) => rows.map((value, i) => i === index ? event.target.value : value))} />)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold">Jumlah Visit<input className="mt-2" type="number" min="0" value={visitQty} onChange={(event) => setVisitQty(event.target.value)} /></label>
        <label className="text-sm font-semibold">Visit / Bulan<input className="mt-2" type="number" min="0" value={visitPerMonth} onChange={(event) => setVisitPerMonth(event.target.value)} /></label>
        <label className="text-sm font-semibold">Rp. Biaya Total<input className="mt-2" type="number" min="0" value={totalCost} onChange={(event) => setTotalCost(event.target.value)} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Vendor<select className="mt-2" value={vendorName} onChange={(event) => setVendorName(event.target.value)}><option value="">Pilih Vendor</option>{vendors?.data?.map((item: string) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-sm font-semibold">Pest Control Eksisting<input className="mt-2" value={existingPestControl} onChange={(event) => setExistingPestControl(event.target.value)} /></label>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h4 className="font-bold">Catatan Poin</h4><button className="btn" onClick={() => setPointNotes((rows) => [...rows, ""])}>+ Tambah Poin</button></div>
        {pointNotes.map((item, index) => <input key={index} value={item} placeholder={`Poin ${index + 1}`} onChange={(event) => setPointNotes((rows) => rows.map((value, i) => i === index ? event.target.value : value))} />)}
      </div>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      <div className="flex justify-end"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan Data B2C"}</button></div>
    </section>
  );
}

function B2CReadView({ survey }: { survey: any }) {
  const floors: any[] = Array.isArray(survey.b2cFloorDescriptions) ? survey.b2cFloorDescriptions : [];
  const issues: any[] = Array.isArray(survey.b2cIssues) ? survey.b2cIssues : [];
  const findings: any[] = Array.isArray(survey.b2cPestFindings) ? survey.b2cPestFindings : [];
  const treatments: string[] = Array.isArray(survey.b2cTreatments) ? survey.b2cTreatments : [];
  const pointNotes: string[] = Array.isArray(survey.b2cPointNotes) ? survey.b2cPointNotes : [];
  const rd = (label: string, value: any) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-ts">{label}</p>
      <p className="mt-1 text-sm font-semibold text-tp">{String(value || "-")}</p>
    </div>
  );
  return (
    <div className="space-y-5">
      {floors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold">Deskripsi Area</p>
          <div className="space-y-2">
            {floors.map((f: any, i: number) => (
              <div key={i} className="rounded-lg border border-bdr bg-white p-3 text-sm">
                <b>Lantai {i + 1}:</b> {f.description || "-"}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {rd("Issue Hama", issues.map((item: any) => item.name || item).join(", ") || "-")}
        {rd("Vendor", survey.b2cVendorName)}
        {rd("Unit / Item", survey.b2cUnitName)}
        {rd("Quantity", survey.b2cQuantity)}
        {rd("Jumlah Visit", survey.b2cVisitQty)}
        {rd("Visit / Bulan", survey.b2cVisitPerMonth)}
        {rd("Total Biaya", survey.b2cTotalCost ? `Rp ${Number(survey.b2cTotalCost).toLocaleString("id-ID")}` : null)}
        {rd("Pest Control Eksisting", survey.b2cExistingPestControl)}
      </div>
      {treatments.filter(Boolean).length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold">Treatment</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {treatments.filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}
      {findings.some((f: any) => f.filePath) && (
        <div>
          <p className="mb-2 text-sm font-bold">Dokumentasi Temuan Hama</p>
          <div className="grid gap-3 md:grid-cols-3">
            {findings.filter((f: any) => f.filePath).map((f: any, i: number) => (
              <div key={i} className="rounded-lg border border-bdr p-2">
                <img className="h-32 w-full rounded object-cover" src={fileUrl(f.filePath)} alt={f.description || `Temuan ${i + 1}`} />
                {f.description && <p className="mt-1 text-xs text-ts">{f.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {pointNotes.filter(Boolean).length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold">Catatan Poin</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {pointNotes.filter(Boolean).map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function SurveyDetailPanel({ survey, segment, onSaved }: { survey: any; segment: "B2C" | "B2B"; onSaved: () => void }) {
  const router = useRouter();
  const b2cFilled = Boolean(survey.b2cReportData && Object.keys(survey.b2cReportData).length > 0);
  // Report hanya bisa dibuat kalau sudah check in DAN check out
  const checkedInOut = Boolean(survey.evidenceImagePath && survey.checkoutImagePath);

  return (
    <div className="border-t border-[#d9ddeb] bg-[#f8fbff] p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Customer</p><p className="mt-1 text-sm font-semibold">{survey.customer?.name}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">No. Survey</p><p className="mt-1 text-sm font-semibold text-accent">{survey.number}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Surveyor</p><p className="mt-1 text-sm font-semibold">{survey.picAssignments?.length ? survey.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : (survey.pic?.name || "-")}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Status</p><div className="mt-1"><Status value={survey.status} /></div></div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_300px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ts">Alamat Lengkap</p>
          <p className="mt-1 text-sm">{survey.location}</p>
          {survey.shareLocationUrl && (
            <a href={survey.shareLocationUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-accent hover:underline">
              Lihat di Google Maps ↗
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-bdr bg-white p-3">
            <p className="text-[11px] font-bold text-ts">CHECK IN</p>
            <AttendancePhoto label="Check In" path={survey.evidenceImagePath} capturedAt={survey.evidenceCapturedAt} lat={survey.evidenceLatitude} lng={survey.evidenceLongitude} />
          </div>
          <div className="rounded-lg border border-bdr bg-white p-3">
            <p className="text-[11px] font-bold text-ts">CHECK OUT</p>
            <AttendancePhoto label="Check Out" path={survey.checkoutImagePath} capturedAt={survey.checkoutCapturedAt} lat={survey.checkoutLatitude} lng={survey.checkoutLongitude} />
          </div>
        </div>
      </div>

      {segment === "B2C" && (
        <div className="mt-5 border-t border-[#d9ddeb] pt-5">
          <div className="flex items-center justify-between">
            <div />
            <div className="flex gap-2">
              <button
                className="btn"
                style={{ borderColor: checkedInOut ? "#1a4d8c" : "#c9ced9", color: checkedInOut ? "#1a4d8c" : "#9aa1b2" }}
                disabled={!checkedInOut}
                title={!checkedInOut ? "Check in & check out survey harus selesai dulu" : undefined}
                onClick={() => checkedInOut && router.push(`/b2c-report/${survey.id}`)}
              >
                📄 Buka Report B2C
              </button>
            </div>
          </div>
          {!checkedInOut && <p className="mt-2 text-xs font-medium text-amber-700">⚠ Report hanya bisa dibuat setelah check in dan check out survey selesai.</p>}
        </div>
      )}

      {segment === "B2B" && (
        <div className="mt-5 border-t border-[#d9ddeb] pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold">Report After Survey B2B</h4>
              <p className="mt-1 text-xs text-ts">Buat laporan survei B2B lengkap sesuai template Fumakilla (18 halaman).</p>
            </div>
            <button
              className="btn btn-primary"
              disabled={!checkedInOut}
              title={!checkedInOut ? "Check in & check out survey harus selesai dulu" : undefined}
              onClick={() => checkedInOut && router.push(`/b2b-report/${survey.id}`)}
            >
              📄 Buka Report Builder
            </button>
          </div>
          {!checkedInOut && <p className="mt-2 text-xs font-medium text-amber-700">⚠ Report hanya bisa dibuat setelah check in dan check out survey selesai.</p>}
        </div>
      )}
    </div>
  );
}

export default function Surveys() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, reload } = useGet<any>("/erp/surveys");
  const [tab, setTab] = useState<"calendar" | "b2c" | "b2b">("calendar");
  const [calView, setCalView] = useState<"calendar" | "list">("calendar");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const surveys = data?.data || [];
  const activeFilters = [search, statusFilter].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setStatusFilter(""); };

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
  const applyFilters = (list: any[]) => list.filter((s: any) => {
    const q = search.toLowerCase();
    const matchSearch = !search || [s.number, s.customer?.name, s.customer?.company, s.pic?.name].join(" ").toLowerCase().includes(q);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const b2cSurveys = useMemo(() => applyFilters(surveys.filter((s: any) => (s.inquiry?.segmentType || s.customer?.segmentType) === "B2C")), [surveys, search, statusFilter]);
  const b2bSurveys = useMemo(() => applyFilters(surveys.filter((s: any) => (s.inquiry?.segmentType || s.customer?.segmentType) === "B2B")), [surveys, search, statusFilter]);
  const monthSurveys = useMemo(() => applyFilters(surveys.filter((s: any) => {
    const d = new Date(s.scheduledAt);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  })), [surveys, month, search, statusFilter]);

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Kalender Survey - Fumakilla ERP", 14, 14);
    doc.setFontSize(9);
    doc.text(`Periode: ${monthTitle} | Export: ${new Date().toLocaleString("id-ID")} | Data: ${monthSurveys.length}`, 14, 21);
    autoTable(doc, {
      startY: 27,
      head: [["Jadwal", "No. Survey", "Customer", "Segmentasi", "PIC Survey", "Status", "Check In", "Check Out"]],
      body: monthSurveys.map((s: any) => [
        new Date(s.scheduledAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
        s.number || "-",
        s.customer?.name || "-",
        s.inquiry?.segmentType || s.customer?.segmentType || "-",
        s.picAssignments?.length ? s.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : (s.pic?.name || "-"),
        String(s.status || "-").replaceAll("_", " "),
        s.evidenceImagePath ? "✓" : "—",
        s.checkoutImagePath ? "✓" : "—",
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [40, 95, 144] },
    });
    doc.save(downloadName({ doc: "Kalender Survey", info: month.toLocaleDateString("id-ID", { month: "long", year: "numeric" }), ext: "pdf" }));
  };

  const tabLabel: Record<string, string> = { calendar: "Kalender Survey", b2c: "Report After Survey B2C", b2b: "Report After Survey B2B" };
  const exportReport = (segment: "B2C" | "B2B", surveyId: string, format: "pdf" | "ppt") => {
    router.push(`/${segment === "B2C" ? "b2c-report" : "b2b-report"}/${surveyId}?export=${format}`);
  };

  const renderSurveyTable = (rows: any[], seg: "B2C" | "B2B") => (
    <div className="card mt-6 overflow-x-auto">
      {loading ? <Loading /> : (
        <>
          <table>
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>No. Survey</th>
                <th>Jadwal</th>
                <th>Customer</th>
                <th>PIC Survey</th>
                <th>Status</th>
                <th>Check In/Out</th>
                {seg === "B2C" && <th>Report B2C</th>}
                {seg === "B2B" && <th>Report</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((item: any) => (
                <Fragment key={item.id}>
                  <tr
                    className="table-row cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <td className="text-center text-lg font-bold text-accent select-none">
                      {expandedId === item.id ? "−" : "+"}
                    </td>
                    <td>
                      <b className="text-accent">{item.number}</b>
                      {item.inquiry && <p className="mt-0.5 text-xs text-ts">{item.inquiry.number}</p>}
                    </td>
                    <td><b>{dateLabel(item.scheduledAt)}</b></td>
                    <td>{item.customer?.name || "-"}</td>
                    <td>{item.picAssignments?.length ? item.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : (item.pic?.name || "-")}</td>
                    <td><Status value={item.status} /></td>
                    <td>
                      <span className={`mr-2 text-xs font-semibold ${item.evidenceImagePath ? "text-green-700" : "text-ts"}`}>
                        CI: {item.evidenceImagePath ? "✓" : "—"}
                      </span>
                      <span className={`text-xs font-semibold ${item.checkoutImagePath ? "text-green-700" : "text-ts"}`}>
                        CO: {item.checkoutImagePath ? "✓" : "—"}
                      </span>
                    </td>
                    {seg === "B2C" && (
                      <td>
                        <div className="flex items-center gap-2">
                          {item.b2cReportData && Object.keys(item.b2cReportData).length > 0
                            ? <span className="badge badge-completed">{item.b2cReportData.approvedAt ? "Approved" : "Terisi"}</span>
                            : <span className="badge badge-new">Belum diisi</span>}
                          <ExportMenu disabled={!item.b2cReportData?.approvedAt} onExport={f => exportReport("B2C", item.id, f)} />
                        </div>
                      </td>
                    )}
                    {seg === "B2B" && (
                      <td>
                        <div className="flex items-center gap-2">
                          {item.b2bReport
                            ? <span className="badge badge-completed">{item.b2bReport.approvedAt ? "Approved" : "Terisi"}</span>
                            : <span className="badge badge-new">Belum diisi</span>}
                          <ExportMenu disabled={!item.b2bReport?.approvedAt} onExport={f => exportReport("B2B", item.id, f)} />
                        </div>
                      </td>
                    )}
                  </tr>
                  {expandedId === item.id && (
                    <tr>
                      <td colSpan={seg === "B2C" ? 8 : seg === "B2B" ? 8 : 7} className="p-0">
                        <SurveyDetailPanel
                          survey={item}
                          segment={seg}
                          onSaved={() => reload()}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-10 text-center text-sm text-ts">Belum ada data survey {seg}.</p>}
        </>
      )}
    </div>
  );

  return (
    <div className="p-9">
      <PageTitle title="Kalender Survey" subtitle="Jadwal survey dari inquiry yang telah dibuat." actions={tab !== "calendar" ? <button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button> : undefined} />
      {showFilters && tab !== "calendar" && (
        <section className="card mt-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Cari no. survey, customer, PIC..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Done</option>
              <option value="POSTPONED">Postponed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button className="btn" onClick={clearFilters}>Reset Filter</button>
          </div>
        </section>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {(["calendar", "b2c", "b2b"] as const).map((t) => (
            <button
              key={t}
              className={`px-4 py-2 text-sm font-semibold ${tab === t ? "rounded bg-white text-accent shadow" : "text-ts"}`}
              onClick={() => { setTab(t); setExpandedId(null); }}
            >
              {tabLabel[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === "calendar" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-lg bg-surface p-1">
            {(["calendar", "list"] as const).map(v => (
              <button key={v}
                className={`px-4 py-2 text-sm font-semibold ${calView === v ? "rounded bg-white text-accent shadow" : "text-ts"}`}
                onClick={() => setCalView(v)}>
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
            <button className="btn" disabled={!monthSurveys.length} onClick={downloadPdf}>Download PDF</button>
          </div>
        </div>
      )}

      {tab === "calendar" && calView === "calendar" && (
        loading
          ? <div className="card mt-6 p-8"><Loading /></div>
          : <div className="card mt-6 overflow-hidden">
              <div className="grid grid-cols-7 bg-surface text-center text-xs font-bold tracking-wider text-ts">
                {["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"].map((d) => <div className="p-4" key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  const items = day ? monthSurveys.filter((item: any) => new Date(item.scheduledAt).getDate() === day.getDate()) : [];
                  return (
                    <div className="min-h-32 border-b border-r border-bdr p-2" key={index}>
                      {day && (
                        <>
                          <b className="text-sm">{day.getDate()}</b>
                          <div className="mt-2 space-y-1">
                            {items.map((item: any) => (
                              <button key={item.id} className="block w-full rounded border-l-4 border-accent bg-surface p-2 text-left text-xs" onClick={() => setSelected(item)}>
                                <b className="block truncate">{item.customer?.name || "Customer"}</b>
                                <span>{new Date(item.scheduledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - {item.picAssignments?.length ? item.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : item.pic?.name}</span>
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
      )}

      {tab === "calendar" && calView === "list" && (
        <div className="card mt-6 overflow-x-auto">
          {loading ? <Loading /> : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Jadwal</th>
                    <th>No. Survey</th>
                    <th>Customer</th>
                    <th>Segmentasi</th>
                    <th>PIC Survey</th>
                    <th>Status</th>
                    <th>Check In/Out</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthSurveys].sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()).map((item: any) => (
                    <tr key={item.id} className="table-row cursor-pointer" onClick={() => setSelected(item)}>
                      <td><b>{dateLabel(item.scheduledAt)}</b></td>
                      <td>
                        <b className="text-accent">{item.number}</b>
                        {item.inquiry && <p className="mt-0.5 text-xs text-ts">{item.inquiry.number}</p>}
                      </td>
                      <td>{item.customer?.name || "-"}</td>
                      <td>{item.inquiry?.segmentType || item.customer?.segmentType || "-"}</td>
                      <td>{item.picAssignments?.length ? item.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : (item.pic?.name || "-")}</td>
                      <td><Status value={item.status} /></td>
                      <td>
                        <span className={`mr-2 text-xs font-semibold ${item.evidenceImagePath ? "text-green-700" : "text-ts"}`}>CI: {item.evidenceImagePath ? "✓" : "—"}</span>
                        <span className={`text-xs font-semibold ${item.checkoutImagePath ? "text-green-700" : "text-ts"}`}>CO: {item.checkoutImagePath ? "✓" : "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!monthSurveys.length && <p className="p-10 text-center text-sm text-ts">Belum ada data survey di {monthTitle}.</p>}
            </>
          )}
        </div>
      )}

      {tab === "b2c" && renderSurveyTable(b2cSurveys, "B2C")}
      {tab === "b2b" && renderSurveyTable(b2bSurveys, "B2B")}

      <Modal open={Boolean(selected)} title="Check In / Check Out Survey" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-ts">CUSTOMER</p>
                <p className="mt-1 font-bold">{selected.customer?.name}</p>
                <p className="text-xs text-ts">Segmentasi: {selected.inquiry?.segmentType || selected.customer?.segmentType || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-ts">JADWAL & PIC</p>
                <p className="mt-1">{dateLabel(selected.scheduledAt)} - {selected.picAssignments?.length ? selected.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : selected.pic?.name}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-ts">ALAMAT LENGKAP</p>
                <p className="mt-1 whitespace-pre-wrap">{selected.location}</p>
              </div>
            </div>
            <hr className="border-bdr" />
            <h3 className="text-base font-bold">Bukti Kehadiran Survey</h3>
            <LiveSurveyEvidence survey={selected} onSaved={async () => { setSelected(null); await reload(); }} />
          </div>
        )}
      </Modal>
    </div>
  );
}


