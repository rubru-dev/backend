"use client";

import { Fragment, useState } from "react";
import api from "@/lib/api";
import { BulkDeleteBar, Loading, Modal, PageTitle, Pagination, RowBox, SelectAllBox, Status, useBulkSelect, useGet, usePagination } from "@/components/erp/shared";
import { SERVICE_TYPES } from "@/lib/service-options";

const statusOptions = ["ACTIVE", "INACTIVE", "BLACKLISTED"];
const serviceOptions = SERVICE_TYPES;

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ts">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-tp">{value || "-"}</p>
    </div>
  );
}

function VendorDetail({ item, onEdit }: { item: any; onEdit: (item: any) => void }) {
  return (
    <div className="border-t border-[#d9ddeb] bg-[#f8fbff] p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <DetailItem label="Kode Vendor" value={item.code} />
        <DetailItem label="Nama Vendor" value={item.name} />
        <DetailItem label="Tipe Vendor" value={item.vendorType} />
        <DetailItem label="Status" value={item.status} />
        <DetailItem label="PIC Vendor" value={item.picName} />
        <DetailItem label="No. HP" value={item.phone} />
        <DetailItem label="Email" value={item.email} />
        <DetailItem label="Rating" value={item.rating ? `${item.rating}/5` : "-"} />
        <DetailItem label="Coverage Area" value={item.coverageArea} />
        <DetailItem label="NPWP" value={item.npwpNumber} />
        <DetailItem label="Bank" value={item.bankName} />
        <DetailItem label="No. Rekening" value={item.bankAccountNo} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <DetailItem label="Nama Rekening" value={item.bankAccountName} />
        <DetailItem label="Kategori Layanan" value={item.serviceCategories?.join(", ")} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <DetailItem label="Alamat" value={item.address} />
        <DetailItem label="Catatan" value={item.notes} />
      </div>
      <div className="mt-4 flex justify-end border-t border-[#d9ddeb] pt-4">
        <button className="btn btn-primary" onClick={() => onEdit(item)}>Edit Vendor</button>
      </div>
    </div>
  );
}

function VendorForm({ item, onClose, onSaved }: { item?: any; onClose: () => void; onSaved: () => void }) {
  const steps = ["Identitas", "Kontak & Area", "Layanan", "Legal & Rekening", "Review"];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>(() => ({
    code: item?.code || "",
    name: item?.name || "",
    vendorType: item?.vendorType || "Pest Control",
    serviceCategories: item?.serviceCategories || [],
    picName: item?.picName || "",
    phone: item?.phone || "",
    email: item?.email || "",
    address: item?.address || "",
    coverageArea: item?.coverageArea || "",
    npwpNumber: item?.npwpNumber || "",
    bankName: item?.bankName || "",
    bankAccountName: item?.bankAccountName || "",
    bankAccountNo: item?.bankAccountNo || "",
    rating: item?.rating || "",
    status: item?.status || "ACTIVE",
    notes: item?.notes || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (field: string, value: any) => setForm((current: any) => ({ ...current, [field]: value }));
  const toggleService = (name: string) => set("serviceCategories", form.serviceCategories.includes(name) ? form.serviceCategories.filter((item: string) => item !== name) : [...form.serviceCategories, name]);
  const next = () => {
    if (step === 0 && !String(form.name || "").trim()) {
      setError("Nama vendor wajib diisi.");
      return;
    }
    setError("");
    setStep((current) => Math.min(steps.length - 1, current + 1));
  };
  const previous = () => {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  };
  const save = async () => {
    if (!String(form.name || "").trim()) {
      setStep(0);
      setError("Nama vendor wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (item?.id) await api.patch(`/erp/vendors/${item.id}`, form);
      else await api.post("/erp/vendors", form);
      await onSaved();
      onClose();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Vendor gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-5 text-sm">
      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-lg border px-3 py-2 text-left text-xs font-bold ${index === step ? "border-accent bg-[#eff6ff] text-accent" : index < step ? "border-[#b7dfc2] bg-[#f0fdf4] text-[#16713b]" : "border-bdr bg-white text-ts"}`}
          >
            <span className="block text-[10px]">Langkah {index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <section className="rounded-lg border border-bdr p-4">
          <h3 className="font-bold">Identitas Vendor</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="font-semibold">Kode Vendor<input className="mt-2" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="Auto jika kosong" /></label>
            <label className="font-semibold md:col-span-2">Nama Vendor <span className="text-red-700">*</span><input className="mt-2" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label className="font-semibold">Tipe Vendor<input className="mt-2" value={form.vendorType} onChange={(e) => set("vendorType", e.target.value)} /></label>
            <label className="font-semibold">Status<select className="mt-2" value={form.status} onChange={(e) => set("status", e.target.value)}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="font-semibold">Rating<select className="mt-2" value={form.rating} onChange={(e) => set("rating", e.target.value)}><option value="">Belum dinilai</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="rounded-lg border border-bdr p-4">
          <h3 className="font-bold">Kontak & Area Operasional</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="font-semibold">PIC Vendor<input className="mt-2" value={form.picName} onChange={(e) => set("picName", e.target.value)} /></label>
            <label className="font-semibold">No. HP<input className="mt-2" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
            <label className="font-semibold">Email<input className="mt-2" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
            <label className="font-semibold md:col-span-3">Coverage Area<input className="mt-2" value={form.coverageArea} onChange={(e) => set("coverageArea", e.target.value)} placeholder="Jakarta, Bogor, Bekasi" /></label>
            <label className="font-semibold md:col-span-3">Alamat<textarea className="mt-2" rows={3} value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-lg border border-bdr p-4">
          <h3 className="font-bold">Kategori Layanan</h3>
          <p className="mt-1 text-xs text-ts">Pilih layanan yang biasa dikerjakan vendor.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {serviceOptions.map((name) => <label key={name} className={`flex items-center gap-2 rounded-lg border p-3 ${form.serviceCategories.includes(name) ? "border-accent bg-[#eff6ff]" : "border-bdr"}`}><input className="h-4 w-4" type="checkbox" checked={form.serviceCategories.includes(name)} onChange={() => toggleService(name)} />{name}</label>)}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-lg border border-bdr p-4">
          <h3 className="font-bold">Legal & Rekening</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="font-semibold">NPWP<input className="mt-2" value={form.npwpNumber} onChange={(e) => set("npwpNumber", e.target.value)} /></label>
            <label className="font-semibold">Bank<input className="mt-2" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></label>
            <label className="font-semibold">Nama Rekening<input className="mt-2" value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} /></label>
            <label className="font-semibold">No. Rekening<input className="mt-2" value={form.bankAccountNo} onChange={(e) => set("bankAccountNo", e.target.value)} /></label>
            <label className="font-semibold md:col-span-4">Catatan<textarea className="mt-2" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="SLA, histori performa, syarat pembayaran, catatan operasional" /></label>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-lg border border-bdr p-4">
          <h3 className="font-bold">Review Data Vendor</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["Kode", form.code || "Auto"],
              ["Nama Vendor", form.name || "-"],
              ["Tipe", form.vendorType || "-"],
              ["Status", form.status || "-"],
              ["Rating", form.rating ? `${form.rating}/5` : "-"],
              ["PIC", form.picName || "-"],
              ["No. HP", form.phone || "-"],
              ["Email", form.email || "-"],
              ["Coverage", form.coverageArea || "-"],
              ["NPWP", form.npwpNumber || "-"],
              ["Bank", form.bankName || "-"],
              ["No. Rekening", form.bankAccountNo || "-"],
            ].map(([label, value]) => <div key={label} className="rounded bg-surface p-3"><p className="text-[11px] font-bold uppercase text-ts">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
          </div>
          <div className="mt-3 rounded bg-surface p-3"><p className="text-[11px] font-bold uppercase text-ts">Layanan</p><p className="mt-1 font-semibold">{form.serviceCategories.length ? form.serviceCategories.join(", ") : "-"}</p></div>
          <div className="mt-3 rounded bg-surface p-3"><p className="text-[11px] font-bold uppercase text-ts">Alamat</p><p className="mt-1 font-semibold">{form.address || "-"}</p></div>
        </section>
      )}

      {error && <p className="font-semibold text-red-700">{error}</p>}
      <div className="flex justify-between gap-2 border-t border-bdr pt-4">
        <button className="btn" disabled={saving} onClick={onClose}>Batal</button>
        <div className="flex gap-2">
          <button className="btn" disabled={saving || step === 0} onClick={previous}>Sebelumnya</button>
          {step < steps.length - 1 ? (
            <button className="btn btn-primary" disabled={saving} onClick={next}>Lanjut</button>
          ) : (
            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan Vendor"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const { data, loading, reload } = useGet<any>("/erp/vendors?limit=100");
  const [formItem, setFormItem] = useState<any | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const allRows = data?.data || [];
  const activeFilters = [search, statusFilter].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setStatusFilter(""); };
  const rows = allRows.filter((item: any) => {
    const matchSearch = !search || [item.code, item.name, item.picName, item.coverageArea, item.vendorType].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || item.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const sel = useBulkSelect();
  const pg = usePagination(rows);
  return (
    <div className="p-9">
      <PageTitle title="Data Vendor" subtitle="Master vendor untuk order sheet: kontak, layanan, area, legal, rekening, rating, dan status vendor." actions={<div className="flex gap-2"><button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button><button className="btn btn-primary" onClick={() => setFormItem(null)}>+ Tambah Vendor</button></div>} />
      {showFilters && (
        <section className="card mt-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Cari vendor, PIC, coverage, tipe vendor..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="BLACKLISTED">Blacklisted</option>
            </select>
            <button className="btn" onClick={clearFilters}>Reset Filter</button>
          </div>
          <p className="mt-2 text-xs text-ts">Menampilkan <b>{rows.length}</b> dari {allRows.length} vendor</p>
        </section>
      )}
      <div className="card mt-5 overflow-x-auto">
        {loading ? <Loading /> : (
          <table>
            <thead><tr><th className="w-8"><SelectAllBox all={pg.pageRows.map((r: any) => r.id)} sel={sel} /></th><th className="w-10"></th><th>Kode</th><th>Vendor</th><th>Layanan</th><th>PIC</th><th>Coverage</th><th>Rating</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>{pg.pageRows.map((item: any) => {
              const expanded = expandedId === item.id;
              return (
                <Fragment key={item.id}>
                  <tr className="table-row cursor-pointer" onClick={() => setExpandedId(expanded ? null : item.id)}>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}><RowBox id={item.id} sel={sel} /></td>
                    <td className="text-center text-lg font-bold text-accent select-none">{expanded ? "-" : "+"}</td>
                    <td><b className="text-accent">{item.code}</b></td>
                    <td><b>{item.name}</b><p className="mt-0.5 text-xs text-ts">{item.vendorType}</p></td>
                    <td>{item.serviceCategories?.join(", ") || "-"}</td>
                    <td>{item.picName || "-"}<p className="text-xs text-ts">{item.phone || item.email || ""}</p></td>
                    <td>{item.coverageArea || "-"}</td>
                    <td>{item.rating ? `${item.rating}/5` : "-"}</td>
                    <td><Status value={item.status} /></td>
                    <td>
                      <button className="btn" onClick={(event) => { event.stopPropagation(); setFormItem(item); }}>Edit</button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={10} className="p-0">
                        <VendorDetail item={item} onEdit={setFormItem} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}</tbody>
          </table>
        )}
        {!loading && !rows.length && <p className="p-10 text-center text-sm text-ts">Belum ada data vendor.</p>}
        {!loading && <Pagination pg={pg} />}
      </div>
      <BulkDeleteBar ids={sel.list} endpoint="/erp/vendors/bulk-delete" label="vendor" onDone={() => { sel.clear(); reload(); }} />
      <Modal open={formItem !== undefined} title={formItem?.id ? "Edit Vendor" : "Tambah Vendor"} onClose={() => setFormItem(undefined)}>
        <VendorForm item={formItem} onClose={() => setFormItem(undefined)} onSaved={reload} />
      </Modal>
    </div>
  );
}
