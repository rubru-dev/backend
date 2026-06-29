"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Loading, Modal, PageTitle, Status, useGet } from "@/components/erp/shared";

const statusOptions = ["ACTIVE", "INACTIVE", "BLACKLISTED"];
const serviceOptions = ["General Pest Control", "Termite Control", "Rodent Control", "Fumigation", "Disinfection", "Bird Control", "Chemical Supply", "Equipment Rental"];

function VendorForm({ item, onClose, onSaved }: { item?: any; onClose: () => void; onSaved: () => void }) {
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
  const save = async () => {
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
      <div className="grid gap-4 md:grid-cols-3">
        <label className="font-semibold">Kode Vendor<input className="mt-2" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="Auto jika kosong" /></label>
        <label className="font-semibold md:col-span-2">Nama Vendor<input className="mt-2" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="font-semibold">Tipe Vendor<input className="mt-2" value={form.vendorType} onChange={(e) => set("vendorType", e.target.value)} /></label>
        <label className="font-semibold">PIC Vendor<input className="mt-2" value={form.picName} onChange={(e) => set("picName", e.target.value)} /></label>
        <label className="font-semibold">No. HP<input className="mt-2" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
        <label className="font-semibold">Email<input className="mt-2" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label className="font-semibold">Coverage Area<input className="mt-2" value={form.coverageArea} onChange={(e) => set("coverageArea", e.target.value)} placeholder="Jakarta, Bogor, Bekasi" /></label>
        <label className="font-semibold">Rating<select className="mt-2" value={form.rating} onChange={(e) => set("rating", e.target.value)}><option value="">Belum dinilai</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="font-semibold">Status<select className="mt-2" value={form.status} onChange={(e) => set("status", e.target.value)}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="font-semibold md:col-span-3">Alamat<textarea className="mt-2" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
      </div>
      <div>
        <p className="font-bold">Kategori Layanan</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {serviceOptions.map((name) => <label key={name} className="flex items-center gap-2 rounded-lg border border-bdr p-3"><input className="h-4 w-4" type="checkbox" checked={form.serviceCategories.includes(name)} onChange={() => toggleService(name)} />{name}</label>)}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="font-semibold">NPWP<input className="mt-2" value={form.npwpNumber} onChange={(e) => set("npwpNumber", e.target.value)} /></label>
        <label className="font-semibold">Bank<input className="mt-2" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></label>
        <label className="font-semibold">Nama Rekening<input className="mt-2" value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} /></label>
        <label className="font-semibold">No. Rekening<input className="mt-2" value={form.bankAccountNo} onChange={(e) => set("bankAccountNo", e.target.value)} /></label>
        <label className="font-semibold md:col-span-4">Catatan<textarea className="mt-2" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="SLA, histori performa, syarat pembayaran, catatan operasional" /></label>
      </div>
      {error && <p className="font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button className="btn" disabled={saving} onClick={onClose}>Batal</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan Vendor"}</button></div>
    </div>
  );
}

export default function VendorsPage() {
  const { data, loading, reload } = useGet<any>("/erp/vendors?limit=100");
  const [formItem, setFormItem] = useState<any | undefined>(undefined);
  const [search, setSearch] = useState("");
  const rows = (data?.data || []).filter((item: any) => [item.code, item.name, item.picName, item.coverageArea, item.vendorType].join(" ").toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-9">
      <PageTitle title="Data Vendor" subtitle="Master vendor untuk order sheet: kontak, layanan, area, legal, rekening, rating, dan status vendor." actions={<button className="btn btn-primary" onClick={() => setFormItem(null)}>+ Tambah Vendor</button>} />
      <section className="card mt-7 p-5"><input placeholder="Cari vendor, PIC, coverage, atau tipe vendor" value={search} onChange={(e) => setSearch(e.target.value)} /></section>
      <div className="card mt-5 overflow-x-auto">
        {loading ? <Loading /> : (
          <table>
            <thead><tr><th>Kode</th><th>Vendor</th><th>Layanan</th><th>PIC</th><th>Coverage</th><th>Rating</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>{rows.map((item: any) => <tr key={item.id}><td><b className="text-accent">{item.code}</b></td><td><b>{item.name}</b><p className="mt-0.5 text-xs text-ts">{item.vendorType}</p></td><td>{item.serviceCategories?.join(", ") || "-"}</td><td>{item.picName || "-"}<p className="text-xs text-ts">{item.phone || item.email || ""}</p></td><td>{item.coverageArea || "-"}</td><td>{item.rating ? `${item.rating}/5` : "-"}</td><td><Status value={item.status} /></td><td><button className="btn" onClick={() => setFormItem(item)}>Edit</button></td></tr>)}</tbody>
          </table>
        )}
        {!loading && !rows.length && <p className="p-10 text-center text-sm text-ts">Belum ada data vendor.</p>}
      </div>
      <Modal open={formItem !== undefined} title={formItem?.id ? "Edit Vendor" : "Tambah Vendor"} onClose={() => setFormItem(undefined)}>
        <VendorForm item={formItem} onClose={() => setFormItem(undefined)} onSaved={reload} />
      </Modal>
    </div>
  );
}
