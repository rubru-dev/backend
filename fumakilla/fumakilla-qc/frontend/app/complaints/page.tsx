"use client";

import { Fragment, useMemo, useState } from "react";
import api from "@/lib/api";
import { BulkDeleteBar, Loading, Modal, PageTitle, Pagination, RowBox, SelectAllBox, Status, useBulkSelect, useGet, usePagination } from "@/components/erp/shared";

const sourceOptions = ["CUSTOMER", "INTERNAL", "VENDOR"];
const statusOptions = ["OPEN", "IN_PROGRESS", "WAITING_VENDOR", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"];
const priorityOptions = ["LOW", "NORMAL", "HIGH", "URGENT"];
const complaintTypes = ["Kualitas Pekerjaan", "Jadwal Terlambat", "Teknisi / SDM", "Material / Chemical", "Dokumentasi / Laporan", "Tagihan / Administrasi", "Komunikasi", "Repeat Complaint", "Lainnya"];
const internalTeams = ["Sales", "Surveyor", "Operational", "QA", "Admin", "Finance", "Vendor"];
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
const dateTimeLabel = (value?: string | null) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

function ComplaintForm({ item, customers, vendors, orderSheets, onClose, onSaved }: { item?: any; customers: any[]; vendors: any[]; orderSheets: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(() => ({
    number: item?.number || "",
    complaintDate: item?.complaintDate ? String(item.complaintDate).slice(0, 10) : today(),
    customerId: item?.customerId || "",
    vendorId: item?.vendorId || "",
    orderSheetId: item?.orderSheetId || "",
    source: item?.source || "CUSTOMER",
    internalTeam: item?.internalTeam || "",
    complaintType: item?.complaintType || "",
    priority: item?.priority || "NORMAL",
    status: item?.status || "OPEN",
    subject: item?.subject || "",
    description: item?.description || "",
    location: item?.location || "",
    reportedByName: item?.reportedByName || "",
    reportedByPhone: item?.reportedByPhone || "",
    picInternal: item?.picInternal || "",
    dueDate: item?.dueDate ? String(item.dueDate).slice(0, 10) : "",
    rootCause: item?.rootCause || "",
    correctiveAction: item?.correctiveAction || "",
    resolutionNotes: item?.resolutionNotes || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedCustomer = customers.find((row) => row.id === form.customerId);
  const relatedOrderSheets = form.customerId ? orderSheets.filter((row) => row.customerId === form.customerId) : orderSheets;
  const set = (field: string, value: any) => setForm((current: any) => ({ ...current, [field]: value }));
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      if (item?.id) await api.patch(`/erp/complaints/${item.id}`, form);
      else await api.post("/erp/complaints", form);
      await onSaved();
      onClose();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Complaint gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="font-semibold">No Complaint<input className="mt-2" value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="Auto jika kosong" /></label>
        <label className="font-semibold">Tanggal Complaint<input className="mt-2" type="date" value={form.complaintDate} onChange={(e) => set("complaintDate", e.target.value)} /></label>
        <label className="font-semibold">Source<select className="mt-2" value={form.source} onChange={(e) => set("source", e.target.value)}>{sourceOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="font-semibold">Status<select className="mt-2" value={form.status} onChange={(e) => set("status", e.target.value)}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="font-semibold md:col-span-2">Customer<select className="mt-2" value={form.customerId} onChange={(e) => set("customerId", e.target.value)}><option value="">Pilih customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` - ${c.company}` : ""}</option>)}</select></label>
        <label className="font-semibold">Segmentasi<input className="mt-2 bg-surface" value={selectedCustomer?.segmentType || selectedCustomer?.segment || selectedCustomer?.customerType || "-"} readOnly /></label>
        <label className="font-semibold">Priority<select className="mt-2" value={form.priority} onChange={(e) => set("priority", e.target.value)}>{priorityOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="font-semibold">Bentuk Complaint<select className="mt-2" value={form.complaintType} onChange={(e) => set("complaintType", e.target.value)}><option value="">Pilih bentuk complaint</option>{complaintTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="font-semibold">Tim Internal Terkait<select className="mt-2" value={form.internalTeam} onChange={(e) => set("internalTeam", e.target.value)}><option value="">Tidak ada</option>{internalTeams.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="font-semibold">Vendor Terkait<select className="mt-2" value={form.vendorId} onChange={(e) => set("vendorId", e.target.value)}><option value="">Tidak terkait vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        <label className="font-semibold">Order Sheet<select className="mt-2" value={form.orderSheetId} onChange={(e) => set("orderSheetId", e.target.value)}><option value="">Tidak terkait OS</option>{relatedOrderSheets.map((os) => <option key={os.id} value={os.id}>{os.number} - {os.jobTitle}</option>)}</select></label>
        <label className="font-semibold md:col-span-2">Subject<input className="mt-2" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Ringkasan complaint" /></label>
        <label className="font-semibold">Pelapor<input className="mt-2" value={form.reportedByName} onChange={(e) => set("reportedByName", e.target.value)} /></label>
        <label className="font-semibold">No. Pelapor<input className="mt-2" value={form.reportedByPhone} onChange={(e) => set("reportedByPhone", e.target.value)} /></label>
        <label className="font-semibold">PIC Internal<input className="mt-2" value={form.picInternal} onChange={(e) => set("picInternal", e.target.value)} /></label>
        <label className="font-semibold">Due Date<input className="mt-2" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
        <label className="font-semibold md:col-span-2">Lokasi Complaint<input className="mt-2" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Lokasi service / area complaint" /></label>
        <label className="font-semibold md:col-span-4">Deskripsi Complaint<textarea className="mt-2" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label className="font-semibold md:col-span-2">Root Cause<textarea className="mt-2" rows={3} value={form.rootCause} onChange={(e) => set("rootCause", e.target.value)} /></label>
        <label className="font-semibold md:col-span-2">Corrective Action<textarea className="mt-2" rows={3} value={form.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} /></label>
        <label className="font-semibold md:col-span-4">Resolution Notes<textarea className="mt-2" rows={3} value={form.resolutionNotes} onChange={(e) => set("resolutionNotes", e.target.value)} /></label>
      </div>
      {error && <p className="font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button className="btn" disabled={saving} onClick={onClose}>Batal</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan Complaint"}</button></div>
    </div>
  );
}

function FollowUpForm({ item, onSaved }: { item: any; onSaved: () => void }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(item.status || "IN_PROGRESS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post(`/erp/complaints/${item.id}/follow-ups`, { note, status });
      setNote("");
      await onSaved();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Follow up gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-lg border border-bdr bg-white p-4">
      <p className="font-bold">Tambah Follow Up</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_140px]">
        <input placeholder="Catatan follow up" value={note} onChange={(e) => setNote(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select>
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan"}</button>
      </div>
      {error && <p className="mt-2 font-semibold text-red-700">{error}</p>}
    </div>
  );
}

function ComplaintDetail({ item, onEdit, onSaved }: { item: any; onEdit: (item: any) => void; onSaved: () => void }) {
  const followUps: any[] = Array.isArray(item.followUps) ? item.followUps : [];
  return (
    <div className="border-t border-[#d9ddeb] bg-[#f8fbff] p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Customer" value={item.customer?.name} />
        <Info label="Segmentasi" value={item.segmentType} />
        <Info label="Source" value={item.source} />
        <Info label="Vendor / OS" value={`${item.vendor?.name || "-"}${item.orderSheet ? ` / ${item.orderSheet.number}` : ""}`} />
        <Info label="Pelapor" value={`${item.reportedByName || "-"} ${item.reportedByPhone || ""}`} />
        <Info label="PIC Internal" value={item.picInternal} />
        <Info label="Due Date" value={dateLabel(item.dueDate)} />
        <Info label="Lokasi" value={item.location} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Deskripsi</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.description || "-"}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Resolution Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.resolutionNotes || "-"}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Root Cause</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.rootCause || "-"}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Corrective Action</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.correctiveAction || "-"}</p></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><button className="btn" onClick={() => onEdit(item)}>Edit Complaint</button></div>
      <div className="mt-5"><FollowUpForm item={item} onSaved={onSaved} /></div>
      <div className="mt-5">
        <p className="mb-2 font-bold">Timeline Follow Up</p>
        <div className="space-y-2">
          {followUps.map((row) => <div key={row.id || row.at} className="rounded-lg border border-bdr bg-white p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{row.by || "-"}</b><span className="text-xs text-ts">{dateTimeLabel(row.at)}</span></div><div className="mt-1"><Status value={row.status || item.status} /></div><p className="mt-2 whitespace-pre-wrap text-ts">{row.note}</p></div>)}
          {!followUps.length && <p className="text-sm text-ts">Belum ada follow up.</p>}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">{label}</p><p className="mt-1 font-semibold">{value || "-"}</p></div>;
}

export default function ComplaintsPage() {
  const [filters, setFilters] = useState({ search: "", segmentType: "", source: "", status: "", priority: "", vendorId: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<any | undefined>(undefined);
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  params.set("limit", "100");
  const { data, loading, reload } = useGet<any>(`/erp/complaints?${params.toString()}`);
  const { data: customersData } = useGet<any>("/erp/customers?limit=100");
  const { data: vendorsData } = useGet<any>("/erp/vendors?limit=100");
  const { data: orderSheetsData } = useGet<any>("/erp/order-sheets?limit=100");
  const rows = data?.data || [];
  const customers = customersData?.data || [];
  const vendors = vendorsData?.data || [];
  const orderSheets = orderSheetsData?.data || [];
  const sel = useBulkSelect();
  const pg = usePagination(rows);
  const segmentOptions = useMemo(() => Array.from(new Set(customers.map((c: any) => c.segmentType || c.segment || c.customerType).filter(Boolean))).sort(), [customers]);
  const metric = (predicate: (row: any) => boolean) => rows.filter(predicate).length;

  return (
    <div className="p-9">
      <PageTitle title="Complaint Handling" subtitle="Kotak complaint untuk tracking keluhan customer, internal, dan pengerjaan vendor." actions={<button className="btn btn-primary" onClick={() => setFormItem(null)}>+ Input Complaint</button>} />
      <div className="mt-7 grid gap-4 md:grid-cols-4">
        <div className="card p-4"><p className="text-xs font-bold text-ts">OPEN</p><p className="mt-2 text-3xl font-extrabold">{metric((r) => r.status === "OPEN")}</p></div>
        <div className="card p-4"><p className="text-xs font-bold text-ts">IN PROGRESS</p><p className="mt-2 text-3xl font-extrabold">{metric((r) => ["IN_PROGRESS", "WAITING_VENDOR", "WAITING_CUSTOMER"].includes(r.status))}</p></div>
        <div className="card p-4"><p className="text-xs font-bold text-ts">VENDOR</p><p className="mt-2 text-3xl font-extrabold">{metric((r) => r.source === "VENDOR" || r.vendorId)}</p></div>
        <div className="card p-4"><p className="text-xs font-bold text-ts">RESOLVED</p><p className="mt-2 text-3xl font-extrabold">{metric((r) => ["RESOLVED", "CLOSED"].includes(r.status))}</p></div>
      </div>
      <section className="card mt-5 p-5">
        <div className="grid gap-3 md:grid-cols-6">
          <input placeholder="Cari complaint, customer, vendor, PIC" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          <select value={filters.segmentType} onChange={(e) => setFilters((f) => ({ ...f, segmentType: e.target.value }))}><option value="">Semua segmentasi</option>{segmentOptions.map((value: any) => <option key={value}>{value}</option>)}</select>
          <select value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}><option value="">Semua source</option>{sourceOptions.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}><option value="">Semua status</option>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}><option value="">Semua priority</option>{priorityOptions.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={filters.vendorId} onChange={(e) => setFilters((f) => ({ ...f, vendorId: e.target.value }))}><option value="">Semua vendor</option>{vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
        </div>
      </section>
      <div className="card mt-5 overflow-x-auto">
        {loading ? <Loading /> : (
          <table>
            <thead><tr><th className="w-8"><SelectAllBox all={pg.pageRows.map((r: any) => r.id)} sel={sel} /></th><th className="w-10"></th><th>No</th><th>Tanggal</th><th>Customer</th><th>Segmentasi</th><th>Bentuk</th><th>Source</th><th>Priority</th><th>Status</th><th>PIC</th></tr></thead>
            <tbody>{pg.pageRows.map((item: any) => <Fragment key={item.id}><tr className="table-row" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}><td className="text-center" onClick={(e) => e.stopPropagation()}><RowBox id={item.id} sel={sel} /></td><td className="text-center text-lg font-bold text-accent">{expandedId === item.id ? "-" : "+"}</td><td><b className="text-accent">{item.number}</b><p className="mt-0.5 text-xs text-ts">{item.subject}</p></td><td>{dateLabel(item.complaintDate)}</td><td>{item.customer?.name || "-"}</td><td>{item.segmentType}</td><td>{item.complaintType}</td><td><Status value={item.source} /></td><td><Status value={item.priority} /></td><td><Status value={item.status} /></td><td>{item.picInternal || "-"}</td></tr>{expandedId === item.id && <tr><td colSpan={11} className="p-0"><ComplaintDetail item={item} onEdit={setFormItem} onSaved={reload} /></td></tr>}</Fragment>)}</tbody>
          </table>
        )}
        {!loading && !rows.length && <p className="p-10 text-center text-sm text-ts">Belum ada complaint.</p>}
        {!loading && <Pagination pg={pg} />}
      </div>
      <BulkDeleteBar ids={sel.list} endpoint="/erp/complaints/bulk-delete" label="complaint" onDone={() => { sel.clear(); reload(); }} />
      <Modal open={formItem !== undefined} title={formItem?.id ? "Edit Complaint" : "Input Complaint"} onClose={() => setFormItem(undefined)}>
        <ComplaintForm item={formItem} customers={customers} vendors={vendors} orderSheets={orderSheets} onClose={() => setFormItem(undefined)} onSaved={reload} />
      </Modal>
    </div>
  );
}
