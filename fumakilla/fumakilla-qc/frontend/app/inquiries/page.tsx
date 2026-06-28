"use client";

import { Fragment, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/lib/api";
import { Loading, Modal, PageTitle, Status, useGet } from "@/components/erp/shared";
import { useAuth } from "@/hooks/useAuth";

const progressOptions = ["New Inquiry", "Non Sales Inquiry", "Pricelist Sent", "Contacted", "Survey Scheduled", "Survey Completed", "Quotation Sent", "Waiting Agreement", "Won/Closing", "Lost/Not Interest"];
const resultOptions = ["On Going", "Won/Closing", "Lost"];
const monthOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const segmentOptions = ["B2C", "B2B"];
const sourceOptions = ["Whatsapp", "Instagram", "Tiktok", "Referal"];
const serviceTypeOptions = ["PC", "RC", "PCRC", "Termite Control", "Other Control"];
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

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold"><span>{label}{required && <span className="ml-1 text-red-700">*</span>}</span>{children}{error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}</label>;
}

function optionSelect(options: string[], value: string, onChange: (value: string) => void, className = "mt-2", emptyLabel?: string) {
  return <select className={className} value={value || ""} onChange={(event) => onChange(event.target.value)}>{emptyLabel !== undefined && <option value="">{emptyLabel}</option>}{options.map((item) => <option key={item}>{item}</option>)}</select>;
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

function ConfirmModal({ title, message, tone = "default", confirmLabel, loading, onCancel, onConfirm }: { title: string; message: string; tone?: "default" | "danger"; confirmLabel: string; loading?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal open title={title} tone={tone} onClose={onCancel}>
      <div className="space-y-5">
        <p className={tone === "danger" ? "text-sm text-red-100" : "text-sm text-ts"}>{message}</p>
        <div className="flex justify-end gap-3">
          <button className={tone === "danger" ? "danger-cancel" : "btn"} disabled={loading} onClick={onCancel}>Batal</button>
          <button className={tone === "danger" ? "danger-confirm" : "btn btn-primary"} disabled={loading} onClick={onConfirm}>{loading ? "Memproses..." : confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

function InquiryDetailPanel({ item, qaUsers, admin, onSaved, onDeleted }: { item: any; qaUsers: any[]; admin: boolean; onSaved: () => void; onDeleted: () => void }) {
  const { data: surveyors } = useGet<any>("/erp/survey-pics");
  const { data: detail } = useGet<any>(`/erp/inquiries/${item.id}`);
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
  const update = (key: string, value: string) => setDraft((current: any) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/erp/inquiries/${item.id}`, draft);
      setEditing(false);
      setConfirmSave(false);
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
      setConfirmDelete(false);
      onDeleted();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Inquiry gagal dihapus.");
    } finally {
      setDeleting(false);
    }
  };
  const submitSchedule = async () => {
    setScheduleSaving(true);
    setError("");
    try {
      await api.post(`/erp/inquiries/${item.id}/survey-request`, schedule);
      setScheduling(false);
      setSchedule({ scheduledAt: "", location: item.address || item.customerCity || "", shareLocationUrl: "", picIds: [] });
      onSaved();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Jadwal survey gagal disimpan.");
    } finally {
      setScheduleSaving(false);
    }
  };
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
          {editing ? <><button className="btn" disabled={saving} onClick={() => setEditing(false)}>Batal</button><button className="btn btn-primary" disabled={saving} onClick={() => setConfirmSave(true)}>{saving ? "Menyimpan..." : "Simpan"}</button></> : <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Data</button>}
          {!editing && <button className="btn" onClick={() => setScheduling((value) => !value)}>Jadwalkan Survey</button>}
          {admin && !editing && <button className="btn text-[#ba1a1a]" onClick={() => setConfirmDelete(true)}>Hapus</button>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      {scheduling && !editing && (
        <div className="mt-5 rounded-xl border border-bdr bg-white p-5">
          <h4 className="font-bold">Jadwalkan Survey</h4>
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
          <div className="mt-4 flex justify-end gap-3"><button className="btn" onClick={() => setScheduling(false)}>Batal</button><button className="btn btn-primary" disabled={scheduleSaving} onClick={submitSchedule}>{scheduleSaving ? "Menyimpan..." : "Simpan Jadwal"}</button></div>
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
              {detail.surveys.map((s: any) => (
                <div key={s.id} className="rounded-xl border border-bdr bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-accent">{s.number}</p>
                    <Status value={s.status} />
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p><span className="text-xs font-bold text-ts">Surveyor: </span>{s.picAssignments?.length ? s.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ") : (s.pic?.name || "-")}</p>
                    <p><span className="text-xs font-bold text-ts">Jadwal: </span>{new Date(s.scheduledAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="line-clamp-2"><span className="text-xs font-bold text-ts">Lokasi: </span>{s.location}</p>
                  </div>
                  <div className="mt-3 flex gap-4 border-t border-bdr pt-3">
                    <span className={`text-xs font-semibold ${s.evidenceImagePath ? "text-green-700" : "text-ts"}`}>
                      Check In: {s.evidenceImagePath ? "✓ Sudah" : "Belum"}
                    </span>
                    <span className={`text-xs font-semibold ${s.checkoutImagePath ? "text-green-700" : "text-ts"}`}>
                      Check Out: {s.checkoutImagePath ? "✓ Sudah" : "Belum"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {confirmSave && <ConfirmModal title="Simpan perubahan?" message={`Perubahan data inquiry ${item.number} akan disimpan.`} confirmLabel="Ya, Simpan" loading={saving} onCancel={() => setConfirmSave(false)} onConfirm={save} />}
      {confirmDelete && <ConfirmModal title="Hapus inquiry?" message={`Inquiry ${item.number} akan dihapus permanen dan tindakan ini tidak dapat dibatalkan.`} tone="danger" confirmLabel="Ya, Hapus" loading={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={remove} />}
    </div>
  );
}

export default function Inquiries() {
  const { user } = useAuth();
  const { data: qaUsers } = useGet<any>("/erp/qa-users");
  const [filters, setFilters] = useState<any>(emptyFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, value]) => value).map(([key, value]) => [key, String(value)])).toString(), [filters]);
  const { data, loading, reload } = useGet<any>(`/erp/inquiries?limit=100${query ? `&${query}` : ""}`);
  const rows = data?.data || [];
  const admin = user?.role === "ADMIN";
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
      head: [["No", "Progress", "Result", "Tanggal", "Bulan", "PIC FI", "Customer", "Perusahaan", "Segment", "No Customer", "Source", "Area", "Service", "Kota", "Closing", "Keterangan"]],
      body: rows.map((item: any) => [item.number, item.progress || "", item.result || "", formatDate(item.inquiryDate), item.contactMonth || "", item.picFiName || "", item.customerName || "", item.companyName || "", item.segmentType || "", item.phone || "", item.source || "", item.areaSizeM2 || "", item.serviceType || item.service || "", item.customerCity || "", `${formatDate(item.closingDate)} ${item.closingMonth || ""}`.trim(), item.notes || ""]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [40, 95, 144] },
    });
    doc.save(`inquiry-filtered-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-9">
      <PageTitle title="Inquiry" subtitle="Data kontak masuk dan progress calon customer." actions={<div className="flex flex-wrap gap-2"><button className="btn" onClick={() => setShowFilters((value) => !value)}>Filter</button><button className="btn" disabled={!rows.length} onClick={downloadPdf}>Download PDF</button><button className="btn btn-primary" onClick={() => setOpen(true)}>+ Inquiry Baru</button></div>} />
      {showFilters && <section className="card mt-6 p-4"><div className="grid gap-3 md:grid-cols-4"><input placeholder="Cari no, customer, perusahaan, nomor..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />{optionSelect(progressOptions, filters.progress, (value) => updateFilter("progress", value), "", "Semua progress")}{optionSelect(resultOptions, filters.result, (value) => updateFilter("result", value), "", "Semua result")}{optionSelect(monthOptions, filters.contactMonth, (value) => updateFilter("contactMonth", value), "", "Semua bulan kontak")}<select value={filters.picFiId} onChange={(event) => updateFilter("picFiId", event.target.value)}><option value="">Semua PIC FI</option>{qaUsers?.data?.map((qa: any) => <option key={qa.id} value={qa.id}>{qa.name}</option>)}</select>{optionSelect(segmentOptions, filters.segmentType, (value) => updateFilter("segmentType", value), "", "Semua segmentasi")}{optionSelect(sourceOptions, filters.source, (value) => updateFilter("source", value), "", "Semua source")}{optionSelect(serviceTypeOptions, filters.serviceType, (value) => updateFilter("serviceType", value), "", "Semua service")}{optionSelect(cityOptions, filters.customerCity, (value) => updateFilter("customerCity", value), "", "Semua kota")}<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} /><input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} /><button className="btn" onClick={clearFilters}>Reset Filter</button></div></section>}
      <div className="card mt-7 overflow-x-auto">
        {loading ? <Loading /> : <table><thead><tr><th></th><th>No. Inquiry</th><th>Progress</th><th>Result</th><th>Kontak Masuk</th><th>PIC FI</th><th>Customer</th><th>Segmentasi</th><th>Source</th><th>Service</th><th>Kota</th></tr></thead><tbody>{rows.map((item: any) => <Fragment key={item.id}><tr className="table-row" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}><td className="w-10 text-center text-lg font-bold text-accent">{expandedId === item.id ? "-" : "+"}</td><td className="font-semibold text-accent">{item.number}</td><td><Status value={item.progress || "New Inquiry"} /></td><td>{item.result || "On Going"}</td><td>{formatDate(item.inquiryDate)}<p className="text-xs text-ts">{item.contactMonth || "-"}</p></td><td>{item.picFiName || "-"}</td><td><b>{item.customerName || item.customer?.name || "-"}</b><p className="text-xs text-ts">{item.companyName || "-"}</p></td><td>{item.segmentType || "-"}</td><td>{item.source || "-"}</td><td>{item.serviceType || item.service || "-"}</td><td>{item.customerCity || "-"}</td></tr>{expandedId === item.id && <tr><td colSpan={11} className="p-0"><InquiryDetailPanel item={item} qaUsers={qaUsers?.data || []} admin={admin} onSaved={reload} onDeleted={() => { setExpandedId(null); reload(); }} /></td></tr>}</Fragment>)}</tbody></table>}
      </div>
      <Modal open={open} title="Inquiry Baru" onClose={() => setOpen(false)}><InquiryForm onSaved={() => { setOpen(false); reload(); }} /></Modal>
    </div>
  );
}
