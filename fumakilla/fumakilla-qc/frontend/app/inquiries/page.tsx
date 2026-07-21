"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/lib/api";
import { BulkDeleteBar, Loading, Modal, PageTitle, Pagination, RowBox, SelectAllBox, Status, useBulkSelect, useGet, usePagination } from "@/components/erp/shared";
import { useAuth } from "@/hooks/useAuth";
import { showAlert, showConfirm } from "@/lib/app-modal";
import { downloadName } from "@/lib/download-name";
import { SERVICE_TYPES, SERVICE_TYPE_DESCRIPTIONS } from "@/lib/service-options";

const progressOptions = ["New Inquiry", "Non Sales Inquiry", "Pricelist Sent", "Contacted", "Survey Scheduled", "Survey Completed", "Quotation Sent", "Waiting Agreement", "Won/Closing", "Lost/Not Interest"];
const resultOptions = ["On Going", "Won/Closing", "Lost"];
const monthOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const segmentOptions = ["B2C", "B2B"];
const sourceOptions = ["Whatsapp", "Instagram", "Tiktok", "Referal"];
const serviceTypeOptions = SERVICE_TYPES;
const cityOptions = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi", "Bandung", "Purwakarta", "Semarang", "Surabaya"];
const currentMonth = monthOptions[new Date().getMonth()];

const initial = {
  progress: "New Inquiry",
  result: "On Going",
  inquiryDate: new Date().toISOString().slice(0, 10),
  contactMonth: currentMonth,
  picFiId: "",
  customerName: "",
  segmentType: "B2C",
  companyName: "",
  phone: "",
  source: "Whatsapp",
  areaSizeM2: "",
  serviceType: "PC",
  customerCity: "Jakarta",
  closingDate: "",
  closingMonth: "",
  notes: "",
};

const emptyFilters = { search: "", progress: "", result: "", contactMonth: "", picFiId: "", segmentType: "", source: "", serviceType: "", customerCity: "", from: "", to: "" };

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID");
}

// Konversi nilai sel Excel (Date / serial number / string DD-MM-YYYY / ISO) → "YYYY-MM-DD" untuk import.
function toISODate(v: any): string {
  if (v == null || v === "") return "";
  const fmt = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return fmt(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === "number" && Number.isFinite(v)) {
    const dt = new Date(Math.round((v - 25569) * 86400000));
    return Number.isNaN(dt.getTime()) ? "" : fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);          // ISO / YYYY-MM-DD
  if (m) return fmt(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);   // DD/MM/YYYY (format id-ID)
  if (m) return fmt(+m[3], +m[2], +m[1]);
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? "" : fmt(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold"><span>{label}{required && <span className="ml-1 text-red-700">*</span>}</span>{children}{error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}</label>;
}

function optionSelect(options: string[], value: string, onChange: (value: string) => void, className = "mt-2", emptyLabel?: string) {
  return <select className={className} value={value || ""} onChange={(event) => onChange(event.target.value)}>{emptyLabel !== undefined && <option value="">{emptyLabel}</option>}{options.map((item) => <option key={item} title={SERVICE_TYPE_DESCRIPTIONS[item]}>{item}</option>)}</select>;
}

function InquiryForm({ onSaved }: { onSaved: () => void }) {
  const { data: qaUsers } = useGet<any>("/erp/qa-users");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const steps = ["Progress", "Kontak Masuk", "Data Customer", "Service", "Closing"];
  const inputClass = (key: string) => `mt-2 ${errors[key] ? "border-red-600 ring-1 ring-red-600" : ""}`;
  const update = (key: string, value: string) => { setForm((current: any) => ({ ...current, [key]: value })); setErrors((current) => { const next = { ...current }; delete next[key]; return next; }); };
  const getStepErrors = (targetStep: number) => {
    const next: Record<string, string> = {};
    if (targetStep === 0) ["progress", "result"].forEach((key) => { if (!String(form[key] || "").trim()) next[key] = "Field ini wajib diisi."; });
    if (targetStep === 1) ["inquiryDate", "contactMonth", "picFiId"].forEach((key) => { if (!String(form[key] || "").trim()) next[key] = "Field ini wajib diisi."; });
    if (targetStep === 2) {
      ["customerName", "segmentType", "phone", "source"].forEach((key) => { if (!String(form[key] || "").trim()) next[key] = "Field ini wajib diisi."; });
      if (form.segmentType === "B2B" && !form.companyName.trim()) next.companyName = "Nama perusahaan wajib diisi untuk B2B.";
    }
    if (targetStep === 3) ["serviceType", "customerCity"].forEach((key) => { if (!String(form[key] || "").trim()) next[key] = "Field ini wajib diisi."; });
    return next;
  };
  const validateStep = (targetStep: number) => { const next = getStepErrors(targetStep); setErrors(next); return Object.keys(next).length === 0; };
  const validateAll = () => { const allErrors = [0, 1, 2, 3, 4].reduce((acc, targetStep) => ({ ...acc, ...getStepErrors(targetStep) }), {}); setErrors(allErrors); return Object.keys(allErrors).length === 0; };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    if (!validateAll()) { const firstInvalid = [0, 1, 2, 3, 4].find((targetStep) => Object.keys(getStepErrors(targetStep)).length); if (firstInvalid !== undefined) setStep(firstInvalid); return; }
    setSaving(true);
    try { await api.post("/erp/inquiries", form); setForm(initial); onSaved(); }
    catch (error: any) { const apiErrors = error.response?.data?.errors as Record<string, string> | undefined; if (apiErrors) setErrors(apiErrors); setSubmitError(apiErrors ? "Periksa field yang ditandai merah." : error.response?.data?.error || "Inquiry gagal disimpan."); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-accent">Langkah {step + 1} dari {steps.length}</p><p className="mt-1 text-xs text-ts">{steps[step]} - field bertanda * wajib diisi</p></div><div className="h-2 w-40 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div>
        <div className="mt-5 grid grid-cols-5 gap-2">{steps.map((item, index) => <button key={item} type="button" onClick={() => { if (index <= step || validateStep(step)) setStep(index); }} className={`min-h-10 rounded-lg border px-2 text-xs font-bold ${index === step ? "border-accent bg-[#d0e4ff] text-accent" : "border-bdr bg-white text-ts"}`}>{item}</button>)}</div>
      </div>
      {step === 0 && <div className="grid gap-4 md:grid-cols-2"><Field label="Progress" required error={errors.progress}>{optionSelect(progressOptions, form.progress, (value) => update("progress", value), inputClass("progress"))}</Field><Field label="Result" required error={errors.result}>{optionSelect(resultOptions, form.result, (value) => update("result", value), inputClass("result"))}</Field></div>}
      {step === 1 && <div className="grid gap-4 md:grid-cols-2"><Field label="Tanggal Kontak Masuk" required error={errors.inquiryDate}><input className={inputClass("inquiryDate")} type="date" value={form.inquiryDate} onChange={(event) => update("inquiryDate", event.target.value)} /></Field><Field label="Bulan Kontak Masuk" required error={errors.contactMonth}>{optionSelect(monthOptions, form.contactMonth, (value) => update("contactMonth", value), inputClass("contactMonth"))}</Field><Field label="PIC FI" required error={errors.picFiId}><select className={inputClass("picFiId")} value={form.picFiId} onChange={(event) => update("picFiId", event.target.value)}><option value="">Pilih karyawan QA</option>{qaUsers?.data?.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>}
      {step === 2 && <div className="grid gap-4 md:grid-cols-2"><Field label="Nama Customer" required error={errors.customerName}><input className={inputClass("customerName")} value={form.customerName} onChange={(event) => update("customerName", event.target.value)} /></Field><Field label="Segmentasi" required error={errors.segmentType}>{optionSelect(segmentOptions, form.segmentType, (value) => update("segmentType", value), inputClass("segmentType"))}</Field>{form.segmentType === "B2B" && <Field label="Nama Perusahaan" required error={errors.companyName}><input className={inputClass("companyName")} value={form.companyName} onChange={(event) => update("companyName", event.target.value)} /></Field>}<Field label="Nomor Customer" required error={errors.phone}><input className={inputClass("phone")} value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field><Field label="Source" required error={errors.source}>{optionSelect(sourceOptions, form.source, (value) => update("source", value), inputClass("source"))}</Field></div>}
      {step === 3 && <div className="grid gap-4 md:grid-cols-2"><Field label="Luas Area (m2)"><input className="mt-2" type="number" min="0" step="0.01" value={form.areaSizeM2} onChange={(event) => update("areaSizeM2", event.target.value)} /></Field><Field label="Tipe Service" required error={errors.serviceType}>{optionSelect(serviceTypeOptions, form.serviceType, (value) => update("serviceType", value), inputClass("serviceType"))}</Field><Field label="Alamat Customer" required error={errors.customerCity}>{optionSelect(cityOptions, form.customerCity, (value) => update("customerCity", value), inputClass("customerCity"))}</Field></div>}
      {step === 4 && <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Tanggal Closing"><input className="mt-2" type="date" value={form.closingDate} onChange={(event) => update("closingDate", event.target.value)} /></Field><Field label="Bulan Closing">{optionSelect(monthOptions, form.closingMonth, (value) => update("closingMonth", value), "mt-2", "Belum closing")}</Field></div><Field label="Keterangan"><textarea className="mt-2" rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field></div>}
      {!qaUsers?.data?.length && <p className="rounded-lg bg-[#fff0d8] p-3 text-sm font-medium text-[#9a4f00]">Belum ada user aktif dengan role QA. Buat user QA dari Modul G - Management User.</p>}
      {submitError && <p className="text-sm font-medium text-red-700">{submitError}</p>}
      <div className="flex justify-between gap-3"><button type="button" className="btn" disabled={step === 0} onClick={() => { setErrors({}); setStep((current) => Math.max(current - 1, 0)); }}>Kembali</button>{step < steps.length - 1 ? <button type="button" className="btn btn-primary" onClick={() => { setSubmitError(""); if (validateStep(step)) setStep((current) => Math.min(current + 1, steps.length - 1)); }}>Lanjut</button> : <button className="btn btn-primary" disabled={saving || !qaUsers?.data?.length}>{saving ? "Menyimpan..." : "Simpan Inquiry"}</button>}</div>
    </form>
  );
}

function InquiryDetailPanel({ item, qaUsers, admin, onSaved, onDeleted }: { item: any; qaUsers: any[]; admin: boolean; onSaved: () => void; onDeleted: () => void }) {
  const { data: surveyors } = useGet<any>("/erp/survey-pics");
  const { data: detail } = useGet<any>(`/erp/inquiries/${item.id}`);
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<any>(() => ({
    progress: item.progress || "New Inquiry",
    result: item.result || "On Going",
    inquiryDate: toDateInput(item.inquiryDate),
    contactMonth: item.contactMonth || "",
    picFiId: item.picFiId || "",
    customerName: item.customerName || "",
    segmentType: item.segmentType || "B2C",
    companyName: item.companyName || "",
    phone: item.phone || "",
    source: item.source || "",
    areaSizeM2: item.areaSizeM2 ? String(item.areaSizeM2) : "",
    serviceType: item.serviceType || item.service || "",
    customerCity: item.customerCity || "",
    closingDate: toDateInput(item.closingDate),
    closingMonth: item.closingMonth || "",
    notes: item.notes || "",
  }));
  const [schedule, setSchedule] = useState<any>(() => ({ scheduledAt: "", location: item.address || item.customerCity || "", shareLocationUrl: "", picIds: [] as string[] }));
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const update = (key: string, value: string) => setDraft((current: any) => ({ ...current, [key]: value }));

  const submitCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await api.post(`/erp/surveys/${cancelTarget.id}/cancel`, { reason: cancelReason });
      setCancelTarget(null);
      setCancelReason("");
      onSaved();
    } catch (e: any) {
      setError(e.response?.data?.error || "Gagal membatalkan survey.");
    } finally {
      setCancelling(false);
    }
  };
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/erp/inquiries/${item.id}`, draft);
      setEditing(false);
      onSaved();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Data inquiry gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/erp/inquiries/${item.id}`);
      onDeleted();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Inquiry gagal dihapus.");
    } finally {
      setDeleting(false);
    }
  };
  const toLocalInput = (iso: string) => { const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const openSchedule = () => { setRescheduleId(null); setSchedule({ scheduledAt: "", location: item.address || item.customerCity || "", shareLocationUrl: "", picIds: [] }); setScheduling(true); };
  const openReschedule = (s: any) => {
    setRescheduleId(s.id);
    setSchedule({
      scheduledAt: s.scheduledAt ? toLocalInput(s.scheduledAt) : "",
      location: s.location || "",
      shareLocationUrl: s.shareLocationUrl || "",
      picIds: s.picAssignments?.length ? s.picAssignments.map((a: any) => a.picId).filter(Boolean) : (s.picId ? [s.picId] : []),
    });
    setScheduling(true);
  };
  const closeSchedule = () => { setScheduling(false); setRescheduleId(null); };
  const submitSchedule = async () => {
    setScheduleSaving(true);
    setError("");
    try {
      if (rescheduleId) await api.patch(`/erp/surveys/${rescheduleId}/reschedule`, schedule);
      else await api.post(`/erp/inquiries/${item.id}/survey-request`, schedule);
      setScheduling(false);
      setRescheduleId(null);
      setSchedule({ scheduledAt: "", location: item.address || item.customerCity || "", shareLocationUrl: "", picIds: [] });
      onSaved();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Jadwal survey gagal disimpan.");
    } finally {
      setScheduleSaving(false);
    }
  };
  // Survey hanya boleh dijadwalkan sekali. Selama masih ada survey aktif (belum dibatalkan),
  // tombol "Jadwalkan Survey" disembunyikan — untuk reschedule, batalkan dulu survey yang ada.
  const hasActiveSurvey = !!detail?.surveys?.some((s: any) => s.status !== "CANCELLED");
  const display = editing ? draft : item;
  const read = (label: string, value: any) => <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">{label}</p><p className="mt-1 text-sm font-semibold text-tp">{value || "-"}</p></div>;
  const editField = (label: string, key: string, type: "text" | "date" | "number" | "textarea" | string[], required = false) => (
    <Field label={label} required={required}>
      {Array.isArray(type) ? optionSelect(type, draft[key], (value) => update(key, value), "mt-2", key === "closingMonth" ? "Belum closing" : undefined) : type === "textarea" ? <textarea className="mt-2" rows={3} value={draft[key] || ""} onChange={(event) => update(key, event.target.value)} /> : <input className="mt-2" type={type} value={draft[key] || ""} onChange={(event) => update(key, event.target.value)} />}
    </Field>
  );
  return (
    <div className="border-t border-[#d9ddeb] bg-[#f8fbff] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-base font-extrabold text-accent">{item.number}</h3><p className="mt-1 text-sm text-ts">{item.customerName || item.customer?.name || "-"} {item.companyName ? `- ${item.companyName}` : ""}</p></div>
        <div className="flex gap-2">
          {editing ? <><button className="btn" disabled={saving} onClick={() => setEditing(false)}>Batal</button><button className="btn btn-primary" disabled={saving} onClick={async () => {
            const ok = await showConfirm({ title: "Simpan perubahan?", message: `Perubahan data inquiry ${item.number} akan disimpan.`, confirmLabel: "Ya, simpan" });
            if (ok) save();
          }}>{saving ? "Menyimpan..." : "Simpan"}</button></> : <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Data</button>}
          {!editing && !hasActiveSurvey && <button className="btn" onClick={openSchedule}>Jadwalkan Survey</button>}
          {admin && !editing && <button className="btn text-[#ba1a1a]" onClick={async () => {
            const ok = await showConfirm({ title: "Hapus inquiry?", message: `Inquiry ${item.number} akan dihapus permanen dan tindakan ini tidak dapat dibatalkan.`, confirmLabel: "Ya, hapus", tone: "danger" });
            if (ok) remove();
          }}>Hapus</button>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      {scheduling && !editing && (
        <div className="mt-5 rounded-xl border border-bdr bg-white p-5">
          <h4 className="font-bold">{rescheduleId ? "Ubah Jadwal Survey" : "Jadwalkan Survey"}</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Tanggal & Jam" required><input className="mt-2" type="datetime-local" value={schedule.scheduledAt} onChange={(event) => setSchedule({ ...schedule, scheduledAt: event.target.value })} /></Field>
            <Field label="Link Google Maps" required><input className="mt-2" type="url" value={schedule.shareLocationUrl} onChange={(event) => setSchedule({ ...schedule, shareLocationUrl: event.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Lokasi / Alamat Lengkap" required><textarea className="mt-2" rows={3} value={schedule.location} onChange={(event) => setSchedule({ ...schedule, location: event.target.value })} /></Field></div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold">Pilih Surveyor <span className="text-red-700">*</span></p>
              <p className="mb-2 text-xs text-ts">Bisa memilih lebih dari satu. Check-in/out cukup satu orang.</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">{surveyors?.data?.map((surveyor: any) => <label className="flex items-center gap-2 rounded-lg border border-bdr p-3 text-sm" key={surveyor.id}><input type="checkbox" checked={schedule.picIds.includes(surveyor.id)} onChange={(event) => setSchedule((current: any) => ({ ...current, picIds: event.target.checked ? [...current.picIds, surveyor.id] : current.picIds.filter((id: string) => id !== surveyor.id) }))} />{surveyor.name}</label>)}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3"><button className="btn" onClick={closeSchedule}>Batal</button><button className="btn btn-primary" disabled={scheduleSaving} onClick={submitSchedule}>{scheduleSaving ? "Menyimpan..." : rescheduleId ? "Simpan Perubahan" : "Simpan Jadwal"}</button></div>
        </div>
      )}
      {editing ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {editField("Progress", "progress", progressOptions, true)}
          {editField("Result", "result", resultOptions, true)}
          {editField("Tanggal Kontak Masuk", "inquiryDate", "date", true)}
          {editField("Bulan Kontak Masuk", "contactMonth", monthOptions, true)}
          <Field label="PIC FI" required><select className="mt-2" value={draft.picFiId || ""} onChange={(event) => update("picFiId", event.target.value)}><option value="">Pilih karyawan QA</option>{qaUsers.map((qa) => <option key={qa.id} value={qa.id}>{qa.name}</option>)}</select></Field>
          {editField("Nama Customer", "customerName", "text", true)}
          {editField("Segmentasi", "segmentType", segmentOptions, true)}
          {draft.segmentType === "B2B" && editField("Nama Perusahaan", "companyName", "text", true)}
          {editField("Nomor Customer", "phone", "text", true)}
          {editField("Source", "source", sourceOptions, true)}
          {editField("Luas Area (m2)", "areaSizeM2", "number")}
          {editField("Tipe Service", "serviceType", serviceTypeOptions, true)}
          {editField("Alamat Customer", "customerCity", cityOptions, true)}
          {editField("Tanggal Closing", "closingDate", "date")}
          {editField("Bulan Closing", "closingMonth", monthOptions)}
          <div className="md:col-span-3">{editField("Keterangan", "notes", "textarea")}</div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {read("Progress", display.progress)}
          {read("Result", display.result)}
          {read("Tanggal Kontak", `${formatDate(display.inquiryDate)} / ${display.contactMonth || "-"}`)}
          {read("PIC FI", display.picFiName)}
          {read("Segmentasi", display.segmentType)}
          {read("Nomor Customer", display.phone)}
          {read("Source", display.source)}
          {read("Luas Area", display.areaSizeM2 ? `${display.areaSizeM2} m2` : "-")}
          {read("Tipe Service", display.serviceType || display.service)}
          {read("Alamat Customer", display.customerCity)}
          {read("Closing", `${formatDate(display.closingDate)} / ${display.closingMonth || "-"}`)}
          {read("Keterangan", display.notes)}
        </div>
      )}
      {!editing && (
        <div className="mt-5 border-t border-[#d9ddeb] pt-5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">Survey Terjadwal</h4>
            <span className="text-xs text-ts">{detail?.surveys?.length || 0} survey</span>
          </div>
          {!detail ? (
            <p className="mt-2 text-sm text-ts">Memuat data survey...</p>
          ) : !detail.surveys?.length ? (
            <p className="mt-2 text-sm text-ts">Belum ada survey untuk inquiry ini.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {detail.surveys.map((s: any) => {
                const isCancelled = s.status === "CANCELLED";
                const canCancel = ["SCHEDULED", "POSTPONED"].includes(s.status);
                return (
                <div key={s.id} className={`rounded-xl border bg-white p-4 ${isCancelled ? "border-red-200 opacity-75" : "border-bdr"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-accent">{s.number}</p>
                    <div className="flex items-center gap-2">
                      <Status value={s.status} />
                      {canCancel && (
                        <button
                          onClick={() => openReschedule(s)}
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          Ubah Jadwal
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => { setCancelTarget(s); setCancelReason(""); }}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p><span className="text-xs font-bold text-ts">Surveyor: </span>{s.picAssignments?.length ? s.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : (s.pic?.name || "-")}</p>
                    <p><span className="text-xs font-bold text-ts">Jadwal: </span>{new Date(s.scheduledAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="line-clamp-2"><span className="text-xs font-bold text-ts">Lokasi: </span>{s.location}</p>
                  </div>
                  {Array.isArray(s.rescheduleHistory) && s.rescheduleHistory.length > 0 && (
                    <details className="mt-3 rounded-lg bg-[#f2f3fd] p-3">
                      <summary className="cursor-pointer text-xs font-bold text-ts">Riwayat Jadwal Sebelumnya ({s.rescheduleHistory.length})</summary>
                      <ul className="mt-2 space-y-2">
                        {[...s.rescheduleHistory].reverse().map((h: any, i: number) => (
                          <li key={i} className="border-l-2 border-bdr pl-2 text-xs text-ts">
                            <p><span className="font-semibold">Jadwal lama: </span><span className="line-through">{new Date(h.scheduledAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span></p>
                            <p>Surveyor: {h.picNames?.length ? h.picNames.join(", ") : "-"}</p>
                            <p className="text-[11px] text-ts/80">Diubah oleh {h.rescheduledBy || "-"}{h.rescheduledAt ? ` · ${new Date(h.rescheduledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {isCancelled ? (
                    <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Dibatalkan</p>
                      <p className="mt-1 text-xs text-red-600"><span className="font-semibold">Alasan: </span>{s.cancelledReason || "-"}</p>
                      {s.cancelledBy && <p className="mt-0.5 text-xs text-red-500">Oleh: {s.cancelledBy} · {s.cancelledAt ? new Date(s.cancelledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""}</p>}
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-4 border-t border-bdr pt-3">
                      <span className={`text-xs font-semibold ${s.evidenceImagePath ? "text-green-700" : "text-ts"}`}>
                        Check In: {s.evidenceImagePath ? "✓ Sudah" : "Belum"}
                      </span>
                      <span className={`text-xs font-semibold ${s.checkoutImagePath ? "text-green-700" : "text-ts"}`}>
                        Check Out: {s.checkoutImagePath ? "✓ Sudah" : "Belum"}
                      </span>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {cancelTarget && (
        <Modal open title={`Batalkan Survey ${cancelTarget.number}`} tone="danger" onClose={() => setCancelTarget(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
              <p className="font-semibold text-red-800">{cancelTarget.number}</p>
              <p className="text-red-700 mt-0.5">Jadwal: {new Date(cancelTarget.scheduledAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <p className="text-sm text-ts">Pembatalan akan dicatat dan dapat dilihat oleh owner. Jika tidak ada survey aktif lain untuk inquiry ini, progress akan dikembalikan ke "Contacted".</p>
            <label className="block text-sm font-semibold text-tp">
              Alasan Pembatalan <span className="text-red-600">*</span>
              <textarea
                className="mt-2 w-full rounded-lg border border-bdr p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                rows={3}
                placeholder="Contoh: Client tidak jadi, reschedule, atau alasan lainnya..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3">
              <button className="danger-cancel" disabled={cancelling} onClick={() => setCancelTarget(null)}>Tutup</button>
              <button className="danger-confirm" disabled={cancelling || !cancelReason.trim()} onClick={submitCancel}>
                {cancelling ? "Membatalkan..." : "Ya, Batalkan Survey"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function Inquiries() {
  const { user } = useAuth();
  const { data: qaUsers } = useGet<any>("/erp/qa-users");
  const [filters, setFilters] = useState<any>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, value]) => value).map(([key, value]) => [key, String(value)])).toString(), [filters]);
  const { data, loading, reload } = useGet<any>(`/erp/inquiries?limit=100${query ? `&${query}` : ""}`);
  const rows = data?.data || [];
  const sel = useBulkSelect();
  const pg = usePagination(rows);
  const admin = ["ADMIN", "Super Admin"].includes(user?.role || "");
  const updateFilter = (key: string, value: string) => setFilters((current: any) => ({ ...current, [key]: value }));
  const clearFilters = () => setFilters(emptyFilters);
  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Inquiry Fumakilla ERP", 14, 14);
    doc.setFontSize(9);
    doc.text(`Export: ${new Date().toLocaleString("id-ID")} | Data: ${rows.length}`, 14, 21);
    autoTable(doc, {
      startY: 27,
      head: [EXPORT_HEAD],
      body: rows.map(exportRow),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [40, 95, 144] },
    });
    doc.save(downloadName({ doc: "Daftar Inquiry", info: "terfilter", ext: "pdf" }));
  };

  const EXPORT_HEAD = ["No", "Progress", "Result", "Tanggal", "Bulan", "PIC FI", "Customer", "Perusahaan", "Segment", "No Customer", "Source", "Area", "Service", "Kota", "Closing", "Keterangan"];
  const exportRow = (item: any) => [item.number, item.progress || "", item.result || "", formatDate(item.inquiryDate), item.contactMonth || "", item.picFiName || "", item.customerName || "", item.companyName || "", item.segmentType || "", item.phone || "", item.source || "", item.areaSizeM2 || "", item.serviceType || item.service || "", item.customerCity || "", `${formatDate(item.closingDate)} ${item.closingMonth || ""}`.trim(), item.notes || ""];

  const downloadExcel = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEAD, ...rows.map(exportRow)]);
    ws["!cols"] = EXPORT_HEAD.map((h) => ({ wch: Math.max(h.length + 2, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inquiry");
    XLSX.writeFile(wb, downloadName({ doc: "Daftar Inquiry", info: "terfilter", ext: "xlsx" }));
  };

  // ─── Import Excel ───────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; total: number; skipped: { row: number; reason: string }[] } | null>(null);

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const example = ["(otomatis)", "New Inquiry", "On Going", "2026-07-16", "Juli", qaUsers?.data?.[0]?.name || "Nama User QA", "Budi Santoso", "PT Contoh Jaya", "B2B", "08123456789", "Whatsapp", "120", "PC", "Jakarta", "", "Baris contoh — hapus sebelum upload"];
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEAD, example]);
    ws["!cols"] = EXPORT_HEAD.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    const guide = [
      ["PANDUAN PENGISIAN — isi persis salah satu pilihan valid di bawah. Kolom 'No' diabaikan (nomor dibuat otomatis)."],
      [],
      ["Progress", ...progressOptions],
      ["Result", ...resultOptions],
      ["Segment", ...segmentOptions],
      ["Source", ...sourceOptions],
      ["Service", ...serviceTypeOptions],
      ["Kota", ...cityOptions],
      ["PIC FI (user QA aktif)", ...((qaUsers?.data || []).map((u: any) => u.name))],
      [],
      ["Tanggal & Closing: format YYYY-MM-DD (mis. 2026-07-16). Closing boleh dikosongkan."],
      ["Bulan: kosongkan untuk diisi otomatis dari Tanggal."],
      ["No Customer: ketik sebagai TEKS agar angka 0 di depan tidak hilang."],
      ["Perusahaan: wajib diisi jika Segment = B2B."],
    ];
    const wg = XLSX.utils.aoa_to_sheet(guide);
    wg["!cols"] = [{ wch: 28 }, ...Array(10).fill({ wch: 18 })];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inquiry");
    XLSX.utils.book_append_sheet(wb, wg, "Panduan");
    XLSX.writeFile(wb, downloadName({ doc: "Template Import Inquiry", ext: "xlsx" }));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset agar file sama bisa dipilih ulang
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });

      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      const pick = (row: any, name: string) => { const k = Object.keys(row).find((key) => norm(key) === norm(name)); return k === undefined ? "" : row[k]; };

      const parsed = json.map((r, idx) => {
        const iso = toISODate(pick(r, "Tanggal"));
        let bulan = String(pick(r, "Bulan") || "").trim();
        if (!bulan && iso) { const dt = new Date(`${iso}T00:00:00`); if (!Number.isNaN(dt.getTime())) bulan = monthOptions[dt.getMonth()]; }
        return {
          __row: idx + 2,
          inquiryDate: iso,
          contactMonth: bulan,
          progress: String(pick(r, "Progress") || "").trim(),
          result: String(pick(r, "Result") || "").trim(),
          picFiName: String(pick(r, "PIC FI") || "").trim(),
          customerName: String(pick(r, "Customer") || "").trim(),
          companyName: String(pick(r, "Perusahaan") || "").trim(),
          segmentType: String(pick(r, "Segment") || "").trim(),
          phone: String(pick(r, "No Customer") || "").trim(),
          source: String(pick(r, "Source") || "").trim(),
          areaSizeM2: String(pick(r, "Area") || "").trim(),
          serviceType: String(pick(r, "Service") || "").trim(),
          customerCity: String(pick(r, "Kota") || "").trim(),
          closingDate: toISODate(pick(r, "Closing")),
          notes: String(pick(r, "Keterangan") || "").trim(),
        };
      }).filter((r) => r.customerName || r.phone || r.inquiryDate || r.companyName);

      if (!parsed.length) { showAlert({ title: "Tidak ada data", message: "File tidak berisi baris data yang bisa dibaca. Pastikan header kolom sesuai template." }); return; }
      const ok = await showConfirm({ title: "Import inquiry?", message: `Terbaca ${parsed.length} baris dari file. Baris yang tidak valid akan dilewati.`, confirmLabel: "Import" });
      if (!ok) return;
      const res = await api.post("/erp/inquiries/import", { rows: parsed });
      setImportResult(res.data);
      reload();
    } catch (err: any) {
      showAlert({ title: "Gagal import", message: err?.response?.data?.error || err?.message || "File tidak dapat diproses.", tone: "danger" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-9">
      <PageTitle title="Inquiry" subtitle="Data kontak masuk dan progress calon customer." actions={<div className="flex flex-wrap gap-2"><button className="btn" onClick={() => setShowFilters((value) => !value)}>Filter</button><input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} /><button className="btn" disabled={importing} onClick={() => fileRef.current?.click()}>{importing ? "Mengimport…" : "⬆ Upload Excel"}</button><div className="relative"><button className="btn" onClick={() => setDlOpen((v) => !v)}>⬇ Download ▾</button>{dlOpen && (<><div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} /><div className="card absolute right-0 z-50 mt-1 w-48 overflow-hidden p-1 shadow-2xl"><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[#f2f7ff] disabled:opacity-40" disabled={!rows.length} onClick={() => { setDlOpen(false); downloadPdf(); }}>📄 Download PDF</button><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[#f2f7ff] disabled:opacity-40" disabled={!rows.length} onClick={() => { setDlOpen(false); downloadExcel(); }}>📊 Download Excel</button><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[#f2f7ff]" onClick={() => { setDlOpen(false); downloadTemplate(); }}>📥 Template Import</button></div></>)}</div><button className="btn btn-primary" onClick={() => setOpen(true)}>+ Inquiry Baru</button></div>} />
      {showFilters && <section className="card mt-6 p-4"><div className="grid gap-3 md:grid-cols-4"><input placeholder="Cari no, customer, perusahaan, nomor..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />{optionSelect(progressOptions, filters.progress, (value) => updateFilter("progress", value), "", "Semua progress")}{optionSelect(resultOptions, filters.result, (value) => updateFilter("result", value), "", "Semua result")}{optionSelect(monthOptions, filters.contactMonth, (value) => updateFilter("contactMonth", value), "", "Semua bulan kontak")}<select value={filters.picFiId} onChange={(event) => updateFilter("picFiId", event.target.value)}><option value="">Semua PIC FI</option>{qaUsers?.data?.map((qa: any) => <option key={qa.id} value={qa.id}>{qa.name}</option>)}</select>{optionSelect(segmentOptions, filters.segmentType, (value) => updateFilter("segmentType", value), "", "Semua segmentasi")}{optionSelect(sourceOptions, filters.source, (value) => updateFilter("source", value), "", "Semua source")}{optionSelect(serviceTypeOptions, filters.serviceType, (value) => updateFilter("serviceType", value), "", "Semua service")}{optionSelect(cityOptions, filters.customerCity, (value) => updateFilter("customerCity", value), "", "Semua kota")}<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} /><input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} /><button className="btn" onClick={clearFilters}>Reset Filter</button></div></section>}
      <div className="card mt-7 overflow-x-auto">
        {loading ? <Loading /> : <table><thead><tr><th style={{ width: 36 }}><SelectAllBox all={pg.pageRows.map((r: any) => r.id)} sel={sel} /></th><th></th><th>No. Inquiry</th><th>Progress</th><th>Result</th><th>Kontak Masuk</th><th>PIC FI</th><th>Customer</th><th>Segmentasi</th><th>Source</th><th>Service</th><th>Kota</th></tr></thead><tbody>{pg.pageRows.map((item: any) => <Fragment key={item.id}><tr className="table-row" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}><td className="text-center" onClick={(e) => e.stopPropagation()}><RowBox id={item.id} sel={sel} /></td><td className="w-10 text-center text-lg font-bold text-accent">{expandedId === item.id ? "-" : "+"}</td><td className="font-semibold text-accent">{item.number}</td><td><Status value={item.progress || "New Inquiry"} /></td><td>{item.result || "On Going"}</td><td>{formatDate(item.inquiryDate)}<p className="text-xs text-ts">{item.contactMonth || "-"}</p></td><td>{item.picFiName || "-"}</td><td><b>{item.customerName || item.customer?.name || "-"}</b><p className="text-xs text-ts">{item.companyName || "-"}</p></td><td>{item.segmentType || "-"}</td><td>{item.source || "-"}</td><td>{item.serviceType || item.service || "-"}</td><td>{item.customerCity || "-"}</td></tr>{expandedId === item.id && <tr><td colSpan={12} className="p-0"><InquiryDetailPanel item={item} qaUsers={qaUsers?.data || []} admin={admin} onSaved={reload} onDeleted={() => { setExpandedId(null); reload(); }} /></td></tr>}</Fragment>)}</tbody></table>}
        {!loading && <Pagination pg={pg} />}
      </div>
      <BulkDeleteBar ids={sel.list} endpoint="/erp/inquiries/bulk-delete" label="inquiry" onDone={() => { sel.clear(); reload(); }} />
      <Modal open={open} title="Inquiry Baru" onClose={() => setOpen(false)}><InquiryForm onSaved={() => { setOpen(false); reload(); }} /></Modal>
      <Modal open={!!importResult} title="Hasil Import Excel" onClose={() => setImportResult(null)}>
        <div className="space-y-3 text-sm">
          <p><b className="text-lg text-[#16713b]">{importResult?.created ?? 0}</b> baris berhasil diimport{typeof importResult?.total === "number" ? ` dari ${importResult.total}` : ""}.</p>
          {importResult?.skipped?.length ? (
            <>
              <p className="font-semibold text-[#9a4f00]">{importResult.skipped.length} baris dilewati:</p>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-[#e4e7f0]">
                <table className="w-full text-xs">
                  <thead><tr><th className="px-3 py-2 text-left">Baris</th><th className="px-3 py-2 text-left">Alasan</th></tr></thead>
                  <tbody>{importResult.skipped.map((s, i) => <tr key={i}><td className="px-3 py-1.5 align-top font-semibold">{s.row}</td><td className="px-3 py-1.5">{s.reason}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="text-xs text-ts">Tip: nomor baris mengikuti baris di file Excel (baris 1 = header). Perbaiki lalu upload lagi — yang sudah masuk tidak akan dobel selama tidak diupload ulang.</p>
            </>
          ) : <p className="text-ts">Semua baris valid 🎉</p>}
          <div className="flex justify-end"><button className="btn btn-primary" onClick={() => setImportResult(null)}>Tutup</button></div>
        </div>
      </Modal>
    </div>
  );
}
