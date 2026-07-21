"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { BulkDeleteBar, Loading, PageTitle, Pagination, RowBox, SelectAllBox, Status, useBulkSelect, useGet, usePagination } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import { showConfirm } from "@/lib/app-modal";

const blankLocation = { area: "", treatmentType: "", notes: "" };
const blankMaterial = { name: "", qty: "", unit: "", notes: "" };
const blankTechnician = { name: "", position: "", phone: "" };
const blankCost = { description: "", qty: "1", unitPrice: "", total: "" };
const blankDocument = { name: "", status: "" };
const defaultTerms = [
  "Vendor wajib melaksanakan pekerjaan sesuai jadwal yang telah ditentukan.",
  "Vendor wajib menggunakan APD dan mengikuti prosedur keselamatan kerja di lokasi customer.",
  "Vendor wajib mengirimkan dokumentasi pekerjaan berupa foto before-after.",
  "Vendor wajib menyerahkan laporan pekerjaan maksimal H+1 setelah pekerjaan selesai.",
  "Pembayaran dilakukan setelah pekerjaan selesai, laporan diterima, dan dokumen invoice lengkap.",
  "Setiap perubahan jadwal, area, atau metode kerja harus mendapatkan persetujuan PIC internal.",
];

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: any) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";
const customerInfo = (customer: any) => ({
  name: customer?.name || "",
  picName: customer?.picServiceName || customer?.picScheduleName || customer?.invoicePicName || customer?.ownerName || customer?.name || "",
  address: customer?.treatmentAddress || customer?.address || customer?.billingAddress || customer?.city || "",
  phone: customer?.phone || customer?.picServicePhone || customer?.picSchedulePhone || customer?.invoicePicPhone || "",
  email: customer?.email || customer?.picServiceEmail || customer?.picScheduleEmail || customer?.invoicePicEmail || "",
  customerType: customer?.customerType || customer?.segmentType || customer?.segment || "",
  serviceArea: customer?.serviceArea || "",
  locationNotes: customer?.notes || "",
});

function OrderSheetForm({ item, customers, vendors, onClose, onSaved }: { item?: any; customers: any[]; vendors: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(() => ({
    number: item?.number || "",
    orderDate: item?.orderDate ? String(item.orderDate).slice(0, 10) : today(),
    status: item?.status || "DRAFT",
    createdByName: item?.createdByName || "",
    vendorId: item?.vendorId || "",
    picInternal: item?.picInternal || "",
    agreementRef: item?.agreementRef || "",
    quotationRef: item?.quotationRef || "",
    customerId: item?.customerId || "",
    jobTitle: item?.jobTitle || "",
    serviceType: item?.serviceType || "",
    workMethod: item?.workMethod || "",
    priority: item?.priority || "Normal",
    workDate: item?.workDate ? String(item.workDate).slice(0, 10) : "",
    workTime: item?.workTime || "",
    estimatedDuration: item?.estimatedDuration || "",
    technicianCount: item?.technicianCount || "",
    specialInstruction: item?.specialInstruction || "",
    jobDescription: item?.jobDescription || "",
    treatmentLocations: item?.treatmentLocations?.length ? item.treatmentLocations : [blankLocation],
    materials: item?.materials?.length ? item.materials : [blankMaterial],
    vendorTechnicians: item?.vendorTechnicians?.length ? item.vendorTechnicians : [blankTechnician],
    costItems: item?.costItems?.length ? item.costItems : [blankCost],
    ppnPercent: item?.ppnPercent ?? 11,
    terms: item?.terms?.length ? item.terms : defaultTerms,
    supportingDocuments: item?.supportingDocuments?.length ? item.supportingDocuments : [
      { name: "Hasil Survey", status: "Ada" },
      { name: "Quotation", status: "Ada" },
      { name: "Agreement Customer", status: "Ada" },
      { name: "Jadwal Service", status: "Ada" },
      { name: "Foto Lokasi", status: "Ada / Dilampirkan" },
    ],
    preparedByName: item?.preparedByName || "",
    approvedByName: item?.approvedByName || "",
    receivedByName: item?.receivedByName || "",
    preparedAt: item?.preparedAt ? String(item.preparedAt).slice(0, 10) : "",
    approvedAt: item?.approvedAt ? String(item.approvedAt).slice(0, 10) : "",
    receivedAt: item?.receivedAt ? String(item.receivedAt).slice(0, 10) : "",
    notes: item?.notes || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const customer = customers.find((row) => row.id === form.customerId);
  const selectedCustomer = customerInfo(customer);
  const subtotal = useMemo(() => form.costItems.reduce((sum: number, row: any) => sum + Number(row.total || (Number(row.qty || 0) * Number(row.unitPrice || 0)) || 0), 0), [form.costItems]);
  const ppnAmount = Math.round(subtotal * Number(form.ppnPercent || 0) / 100);
  const grandTotal = subtotal + ppnAmount;
  const set = (field: string, value: any) => setForm((current: any) => ({ ...current, [field]: value }));
  const updateRow = (field: string, index: number, key: string, value: any) => setForm((current: any) => ({ ...current, [field]: current[field].map((row: any, i: number) => i === index ? { ...row, [key]: value } : row) }));
  const addRow = (field: string, row: any) => setForm((current: any) => ({ ...current, [field]: [...current[field], row] }));
  const removeRow = (field: string, index: number) => setForm((current: any) => ({ ...current, [field]: current[field].filter((_: any, i: number) => i !== index) }));
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, subtotal, ppnAmount, grandTotal };
      if (item?.id) await api.patch(`/erp/order-sheets/${item.id}`, payload);
      else await api.post("/erp/order-sheets", payload);
      await onSaved();
      onClose();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Order sheet gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="font-semibold">No. OS/PO<input className="mt-2" value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="Auto jika kosong" /></label>
        <label className="font-semibold">Tanggal<input className="mt-2" type="date" value={form.orderDate} onChange={(e) => set("orderDate", e.target.value)} /></label>
        <label className="font-semibold">Status<select className="mt-2" value={form.status} onChange={(e) => set("status", e.target.value)}>{["DRAFT", "FINAL", "SENT", "COMPLETED", "CANCELLED"].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="font-semibold">Dibuat oleh<input className="mt-2" value={form.createdByName} onChange={(e) => set("createdByName", e.target.value)} /></label>
        <label className="font-semibold md:col-span-2">Vendor<select className="mt-2" value={form.vendorId} onChange={(e) => set("vendorId", e.target.value)}><option value="">Pilih vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        <label className="font-semibold">PIC Internal<input className="mt-2" value={form.picInternal} onChange={(e) => set("picInternal", e.target.value)} /></label>
        <label className="font-semibold">Agreement<input className="mt-2" value={form.agreementRef} onChange={(e) => set("agreementRef", e.target.value)} /></label>
        <label className="font-semibold">Quotation<input className="mt-2" value={form.quotationRef} onChange={(e) => set("quotationRef", e.target.value)} /></label>
      </div>

      <section className="rounded-lg border border-bdr p-4">
        <h3 className="font-bold">1. Data Customer</h3>
        <label className="mt-3 block font-semibold">Ambil dari Database Customer<select className="mt-2" value={form.customerId} onChange={(e) => set("customerId", e.target.value)}><option value="">Pilih customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` - ${c.company}` : ""}</option>)}</select></label>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries({ "Nama Customer": selectedCustomer.name, "PIC Customer": selectedCustomer.picName, "Alamat Lokasi Service": selectedCustomer.address, "No. Telepon": selectedCustomer.phone, "Email Customer": selectedCustomer.email, "Jenis Customer": selectedCustomer.customerType, "Area Service": selectedCustomer.serviceArea, "Catatan Lokasi": selectedCustomer.locationNotes }).map(([label, value]) => <div key={label}><p className="text-[11px] font-bold uppercase text-ts">{label}</p><p className="mt-1 rounded bg-surface p-2 font-semibold">{String(value || "-")}</p></div>)}
        </div>
      </section>

      <section className="rounded-lg border border-bdr p-4">
        <h3 className="font-bold">2. Detail Pekerjaan</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <input placeholder="Jenis Pekerjaan" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
          <input placeholder="Jenis Service" value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)} />
          <input placeholder="Metode Pekerjaan" value={form.workMethod} onChange={(e) => set("workMethod", e.target.value)} />
          <input placeholder="Prioritas" value={form.priority} onChange={(e) => set("priority", e.target.value)} />
          <input type="date" value={form.workDate} onChange={(e) => set("workDate", e.target.value)} />
          <input placeholder="Jam Pengerjaan" value={form.workTime} onChange={(e) => set("workTime", e.target.value)} />
          <input placeholder="Estimasi Durasi" value={form.estimatedDuration} onChange={(e) => set("estimatedDuration", e.target.value)} />
          <input placeholder="Jumlah Teknisi" value={form.technicianCount} onChange={(e) => set("technicianCount", e.target.value)} />
          <textarea className="md:col-span-3" rows={2} placeholder="Instruksi Khusus" value={form.specialInstruction} onChange={(e) => set("specialInstruction", e.target.value)} />
          <textarea className="md:col-span-3" rows={3} placeholder="Deskripsi pekerjaan" value={form.jobDescription} onChange={(e) => set("jobDescription", e.target.value)} />
        </div>
      </section>

      <EditableRows title="3. Detail Lokasi Treatment" rows={form.treatmentLocations} columns={[["area", "Area"], ["treatmentType", "Jenis Treatment"], ["notes", "Keterangan"]]} onAdd={() => addRow("treatmentLocations", blankLocation)} onRemove={(i: number) => removeRow("treatmentLocations", i)} onChange={(i: number, k: string, v: string) => updateRow("treatmentLocations", i, k, v)} />
      <EditableRows title="4. Material / Chemical / Peralatan" rows={form.materials} columns={[["name", "Nama Material / Alat"], ["qty", "Qty"], ["unit", "Satuan"], ["notes", "Keterangan"]]} onAdd={() => addRow("materials", blankMaterial)} onRemove={(i: number) => removeRow("materials", i)} onChange={(i: number, k: string, v: string) => updateRow("materials", i, k, v)} />
      <EditableRows title="5. Tenaga Kerja Vendor" rows={form.vendorTechnicians} columns={[["name", "Nama Teknisi"], ["position", "Posisi"], ["phone", "No. HP"]]} onAdd={() => addRow("vendorTechnicians", blankTechnician)} onRemove={(i: number) => removeRow("vendorTechnicians", i)} onChange={(i: number, k: string, v: string) => updateRow("vendorTechnicians", i, k, v)} />
      <EditableRows title="6. Nilai Pekerjaan Vendor" rows={form.costItems} columns={[["description", "Deskripsi"], ["qty", "Qty"], ["unitPrice", "Harga Satuan"], ["total", "Total"]]} onAdd={() => addRow("costItems", blankCost)} onRemove={(i: number) => removeRow("costItems", i)} onChange={(i: number, k: string, v: string) => updateRow("costItems", i, k, v)} />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-surface p-3"><p className="text-xs font-bold text-ts">Subtotal</p><p className="mt-1 text-lg font-bold">{money(subtotal)}</p></div>
        <label className="font-semibold">PPN %<input className="mt-2" type="number" value={form.ppnPercent} onChange={(e) => set("ppnPercent", e.target.value)} /></label>
        <div className="rounded-lg bg-surface p-3"><p className="text-xs font-bold text-ts">Grand Total</p><p className="mt-1 text-lg font-bold">{money(grandTotal)}</p></div>
      </div>

      <EditableTextList title="7. Syarat dan Ketentuan" rows={form.terms} onAdd={() => set("terms", [...form.terms, ""])} onRemove={(i: number) => set("terms", form.terms.filter((_: string, index: number) => index !== i))} onChange={(i: number, value: string) => set("terms", form.terms.map((row: string, index: number) => index === i ? value : row))} />
      <EditableRows title="8. Dokumen Pendukung" rows={form.supportingDocuments} columns={[["name", "Dokumen"], ["status", "Status / Keterangan"]]} onAdd={() => addRow("supportingDocuments", blankDocument)} onRemove={(i: number) => removeRow("supportingDocuments", i)} onChange={(i: number, k: string, v: string) => updateRow("supportingDocuments", i, k, v)} />

      <section className="rounded-lg border border-bdr p-4">
        <h3 className="font-bold">9. Approval</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <input placeholder="Dibuat oleh" value={form.preparedByName} onChange={(e) => set("preparedByName", e.target.value)} />
          <input placeholder="Disetujui oleh" value={form.approvedByName} onChange={(e) => set("approvedByName", e.target.value)} />
          <input placeholder="Diterima oleh Vendor" value={form.receivedByName} onChange={(e) => set("receivedByName", e.target.value)} />
          <input type="date" value={form.preparedAt} onChange={(e) => set("preparedAt", e.target.value)} />
          <input type="date" value={form.approvedAt} onChange={(e) => set("approvedAt", e.target.value)} />
          <input type="date" value={form.receivedAt} onChange={(e) => set("receivedAt", e.target.value)} />
        </div>
      </section>

      {error && <p className="font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button className="btn" onClick={onClose} disabled={saving}>Batal</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Order Sheet"}</button></div>
    </div>
  );
}

function EditableRows({ title, rows, columns, onAdd, onRemove, onChange }: any) {
  const minWidth = 48 + (columns.length * 160) + 88;
  const gridTemplateColumns = `48px repeat(${columns.length}, minmax(160px, 1fr)) 80px`;
  return <section className="rounded-lg border border-bdr p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{title}</h3><button className="btn" onClick={onAdd}>+ Tambah</button></div><div className="mt-3 space-y-2 overflow-x-auto">{rows.map((row: any, index: number) => <div key={index} className="grid gap-2" style={{ gridTemplateColumns, minWidth }}><div className="rounded bg-surface p-2 text-center font-bold">{index + 1}</div>{columns.map(([key, label]: string[]) => <input key={key} placeholder={label} value={row[key] || ""} onChange={(e) => onChange(index, key, e.target.value)} />)}<button className="btn" onClick={() => onRemove(index)}>Hapus</button></div>)}</div></section>;
}

function EditableTextList({ title, rows, onAdd, onRemove, onChange }: any) {
  return <section className="rounded-lg border border-bdr p-4"><div className="flex items-center justify-between"><h3 className="font-bold">{title}</h3><button className="btn" onClick={onAdd}>+ Tambah</button></div><div className="mt-3 space-y-2">{rows.map((row: string, index: number) => <div key={index} className="grid gap-2 md:grid-cols-[1fr_80px]"><input value={row} onChange={(e) => onChange(index, e.target.value)} /><button className="btn" onClick={() => onRemove(index)}>Hapus</button></div>)}</div></section>;
}

function Preview({ item }: { item: any }) {
  const customer = item.customerSnapshot || customerInfo(item.customer);
  return <div className="space-y-5 text-sm"><div className="border-b border-bdr pb-4 text-center"><h2 className="text-xl font-extrabold">ORDER SHEET / PURCHASE ORDER VENDOR</h2><p className="mt-1 text-ts">Dokumen Perintah Kerja Vendor untuk Pelaksanaan Service / Treatment</p></div><div className="grid gap-3 md:grid-cols-4">{[["No. OS/PO", item.number], ["Tanggal", dateLabel(item.orderDate)], ["Status", item.status], ["Dibuat oleh", item.createdByName], ["Vendor", item.vendor?.name], ["PIC Internal", item.picInternal], ["Referensi Agreement", item.agreementRef], ["Referensi Quotation", item.quotationRef]].map(([l, v]) => <div key={l}><p className="text-xs font-bold text-ts">{l}</p><p className="font-semibold">{v || "-"}</p></div>)}</div><PreviewSection title="1. Data Customer" rows={[["Nama Customer", customer.name], ["PIC Customer", customer.picName], ["Alamat Lokasi Service", customer.address], ["No. Telepon", customer.phone], ["Email Customer", customer.email], ["Jenis Customer", customer.customerType], ["Area Service", customer.serviceArea], ["Catatan Lokasi", customer.locationNotes]]} /><PreviewSection title="2. Detail Pekerjaan" rows={[["Jenis Pekerjaan", item.jobTitle], ["Jenis Service", item.serviceType], ["Metode Pekerjaan", item.workMethod], ["Prioritas", item.priority], ["Tanggal Pengerjaan", dateLabel(item.workDate)], ["Jam Pengerjaan", item.workTime], ["Estimasi Durasi", item.estimatedDuration], ["Jumlah Teknisi", item.technicianCount], ["Instruksi Khusus", item.specialInstruction], ["Deskripsi pekerjaan", item.jobDescription]]} /><PreviewTable title="3. Detail Lokasi Treatment" rows={item.treatmentLocations || []} cols={[["area", "Area"], ["treatmentType", "Jenis Treatment"], ["notes", "Keterangan"]]} /><PreviewTable title="4. Material / Chemical / Peralatan" rows={item.materials || []} cols={[["name", "Nama Material / Alat"], ["qty", "Qty"], ["unit", "Satuan"], ["notes", "Keterangan"]]} /><PreviewTable title="5. Tenaga Kerja Vendor" rows={item.vendorTechnicians || []} cols={[["name", "Nama Teknisi"], ["position", "Posisi"], ["phone", "No. HP"]]} /><PreviewTable title="6. Nilai Pekerjaan Vendor" rows={item.costItems || []} cols={[["description", "Deskripsi"], ["qty", "Qty"], ["unitPrice", "Harga Satuan"], ["total", "Total"]]} /><div className="text-right font-bold">Subtotal {money(item.subtotal)} | PPN {item.ppnPercent || 0}% {money(item.ppnAmount)} | Grand Total {money(item.grandTotal)}</div><div><h3 className="font-bold">7. Syarat dan Ketentuan</h3><ol className="mt-2 list-decimal space-y-1 pl-5">{(item.terms || []).map((term: string, i: number) => <li key={i}>{term}</li>)}</ol></div><PreviewTable title="8. Dokumen Pendukung" rows={item.supportingDocuments || []} cols={[["name", "Dokumen"], ["status", "Status / Keterangan"]]} /><div><h3 className="font-bold">9. Approval</h3><div className="mt-3 grid gap-4 text-center md:grid-cols-3">{[["Dibuat oleh", item.preparedByName, item.preparedAt], ["Disetujui oleh", item.approvedByName, item.approvedAt], ["Diterima oleh Vendor", item.receivedByName, item.receivedAt]].map(([label, name, at]) => <div key={label} className="rounded border border-bdr p-4"><p className="font-bold">{label}</p><div className="py-10">(____________________)</div><p>Nama: {name || "____________________"}</p><p>Tanggal: {dateLabel(at as string)}</p></div>)}</div></div></div>;
}

function PreviewSection({ title, rows }: any) {
  return <div><h3 className="mb-2 font-bold">{title}</h3><div className="grid gap-2 md:grid-cols-2">{rows.map(([label, value]: string[]) => <div key={label} className="rounded border border-bdr p-2"><b>{label}</b><p>{value || "-"}</p></div>)}</div></div>;
}

function PreviewTable({ title, rows, cols }: any) {
  return <div><h3 className="mb-2 font-bold">{title}</h3><div className="overflow-x-auto"><table><thead><tr><th>No</th>{cols.map(([_, label]: string[]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row: any, i: number) => <tr key={i}><td>{i + 1}</td>{cols.map(([key]: string[]) => <td key={key}>{row[key] || "-"}</td>)}</tr>)}</tbody></table></div></div>;
}

type Msg = { type: "success" | "error"; title: string; body: string };

function MsgModal({ msg, onClose }: { msg: Msg; onClose: () => void }) {
  const isOk = msg.type === "success";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 420, padding: 28, background: "#fff", maxWidth: "90vw" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <span style={{ fontSize: 28 }}>{isOk ? "✅" : "❌"}</span>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: isOk ? "#065f46" : "#dc2626", marginBottom: 6 }}>{msg.title}</p>
            <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.6 }}>{msg.body}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 24px", borderRadius: 8, background: isOk ? "#065f46" : "#dc2626", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

export default function OrderSheetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, reload } = useGet<any>("/erp/order-sheets?limit=100");
  const { data: customersData } = useGet<any>("/erp/customers?limit=100");
  const { data: vendorsData } = useGet<any>("/erp/vendors?limit=100");
  const [formItem, setFormItem] = useState<any | undefined>(undefined);
  const [deletingId, setDeletingId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const allRows = data?.data || [];
  const customers = customersData?.data || [];
  const vendors = vendorsData?.data || [];
  const activeFilters = [search, statusFilter].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setStatusFilter(""); };
  const rows = useMemo(() => allRows.filter((item: any) => {
    const q = search.toLowerCase();
    const matchSearch = !search || [item.number, item.customer?.name, item.vendor?.name, item.jobTitle].join(" ").toLowerCase().includes(q);
    const matchStatus = !statusFilter || item.status === statusFilter;
    return matchSearch && matchStatus;
  }), [allRows, search, statusFilter]);
  const sel = useBulkSelect();
  const pg = usePagination(rows);

  const deleteOrderSheet = async (item: any) => {
    const ok = await showConfirm({
      title: "Hapus Order Sheet?",
      message: `Order Sheet ${item.number} akan dihapus permanen dan tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (ok) doDelete(item);
  };

  const doDelete = async (item: any) => {
    setDeletingId(item.id);
    try {
      await api.delete(`/erp/order-sheets/${item.id}`);
      await reload();
    } catch (requestError: any) {
      setMsg({ type: "error", title: "Gagal Menghapus", body: requestError.response?.data?.error || "Order sheet gagal dihapus." });
    } finally {
      setDeletingId("");
    }
  };

  // Auto-open edit modal when ?edit={id} is in URL (from OS detail page)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && rows.length) {
      const target = rows.find((r: any) => r.id === editId);
      if (target) setFormItem(target);
    }
  }, [searchParams, rows]);
  const closeForm = () => {
    setFormItem(undefined);
    if (searchParams.get("edit")) router.replace(ROUTES.orderSheets);
  };

  if (formItem !== undefined) {
    return <div className="p-9"><PageTitle title={formItem?.id ? "Edit Order Sheet" : "Buat Order Sheet"} subtitle={formItem?.id ? `${formItem.number} - ubah data order sheet.` : "Isi data order sheet baru."} actions={<button className="btn" onClick={closeForm}>Kembali</button>} /><section className="card mt-7 p-6"><OrderSheetForm item={formItem} customers={customers} vendors={vendors} onClose={closeForm} onSaved={async () => { window.location.href = ROUTES.orderSheets; }} /></section></div>;
  }

  return (
    <div className="p-9">
      <PageTitle title="Order Sheet" subtitle="Format OS/PO vendor sesuai contoh dokumen, dengan data customer diambil dari database client." actions={<div className="flex gap-2"><button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button><button className="btn btn-primary" onClick={() => setFormItem(null)}>+ Buat Order Sheet</button></div>} />
      {showFilters && (
        <section className="card mt-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Cari no. OS, customer, vendor, pekerjaan..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Final</option>
              <option value="SENT">Sent</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button className="btn" onClick={clearFilters}>Reset Filter</button>
          </div>
          <p className="mt-2 text-xs text-ts">Menampilkan <b>{rows.length}</b> dari {allRows.length} order sheet</p>
        </section>
      )}
      <div className="card mt-7 overflow-x-auto">
        {loading ? <Loading /> : (
          <table>
            <thead><tr><th className="w-8"><SelectAllBox all={pg.pageRows.map((r: any) => r.id)} sel={sel} /></th><th>No OS/PO</th><th>Tanggal</th><th>Customer</th><th>Vendor</th><th>Pekerjaan</th><th>Status</th><th>Total</th><th>Aksi</th></tr></thead>
            <tbody>{pg.pageRows.map((item: any) => (
              <tr key={item.id} className="table-row cursor-pointer" onClick={() => router.push(ROUTES.orderSheet(item.id))}>
                <td className="text-center" onClick={(e) => e.stopPropagation()}><RowBox id={item.id} sel={sel} /></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <b className="text-accent">{item.number}</b>
                    {item.isRenewal && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: "#f0abfc", color: "#701a75", letterSpacing: "0.05em" }}>RENEWAL</span>
                    )}
                  </div>
                </td>
                <td>{dateLabel(item.orderDate)}</td>
                <td>{item.customer?.name || "-"}</td>
                <td>{item.vendor?.name || "-"}</td>
                <td>{item.jobTitle}</td>
                <td><Status value={item.status} /></td>
                <td>{money(item.grandTotal)}</td>
                <td><div className="flex gap-2">
                  <button className="btn" onClick={(e) => { e.stopPropagation(); setFormItem(item); }}>Edit</button>
                  <button className="btn border-red-200 bg-red-50 text-red-700 hover:bg-red-100" disabled={deletingId === item.id} onClick={(e) => { e.stopPropagation(); deleteOrderSheet(item); }}>{deletingId === item.id ? "..." : "Hapus"}</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {!loading && !rows.length && <p className="p-10 text-center text-sm text-ts">Belum ada order sheet{activeFilters > 0 ? " yang cocok dengan filter." : "."}</p>}
        {!loading && <Pagination pg={pg} />}
      </div>
      <BulkDeleteBar ids={sel.list} endpoint="/erp/order-sheets/bulk-delete" label="order sheet" onDone={() => { sel.clear(); reload(); }} />

      {msg && <MsgModal msg={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}
