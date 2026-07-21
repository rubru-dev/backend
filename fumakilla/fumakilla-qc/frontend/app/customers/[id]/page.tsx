"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import { Loading, PageTitle, Status, useGet } from "@/components/erp/shared";
import { fileUrl } from "@/lib/utils";

const segments = ["Food & Beverage", "Pharmaceutical", "Cosmetics", "Manufacturing (Non-F&B)", "Warehouse / Logistics", "Hotel", "Mall", "Restaurant / Café", "Office / Office Building", "Hospital / Healthcare", "School / Education", "Retail Store", "Residential - House", "Residential - Apartment", "Residential - Ruko", "Apartment Building (Management)", "Housing Cluster / Developer", "Oil&Gas", "Power Generation", "Contractor/Construction"];
const options: Record<string, string[]> = { status: ["Renewal", "Kontrak", "Non-Kontrak"], segment: segments, segmentType: ["B2B", "B2C"], vendorName: ["Pestigo", "Istapest", "Pascal", "PCO", "SPC", "Riztra"], treatment: ["PC", "RC", "PCRC", "Termite", "Other"], agreementType: ["Simple", "Full"] };
const numericFields = new Set(["agreementDurationMonths", "invoiceAcceptanceLimitDays"]);
// Field bernilai panjang → pakai textarea + melebar full-width (jangan kepotong).
const longFields = new Set(["treatmentAddress", "npwpAddress", "invoicePicAddress"]);
const groups = [
  ["Data Customer", [["Nama Customer", "name"], ["Nama Perusahaan", "company"], ["Alamat Customer (Treatment)", "treatmentAddress"], ["DPP Vendor", "dppVendor"], ["DPP FI", "dppFi"]]],
  ["Status & Layanan", [["Status Customer", "status"], ["Customer Segment", "segment"], ["Segment Type", "segmentType"], ["Nama Vendor", "vendorName"], ["Treatment", "treatment"], ["Jenis Agreement", "agreementType"], ["Durasi Agreement (Bulan)", "agreementDurationMonths"]]],
  ["PIC Service & Schedule", [["Nama PIC Service", "picServiceName"], ["Kontak PIC Service", "picServicePhone"], ["Email PIC Service", "picServiceEmail"], ["PIC Schedule", "picScheduleName"], ["Kontak PIC Schedule", "picSchedulePhone"]]],
  ["Pajak & Quality", [["Nomor KTP Penanggung Jawab / Pemilik", "responsibleOwnerKtp"], ["Nama NPWP", "npwpName"], ["Nomor NPWP", "npwpNumber"], ["Alamat NPWP", "npwpAddress"], ["Frekuensi Monthly Report", "monthlyReportFrequency"], ["Lead Source", "leadSource"], ["Nama QC", "qcName"], ["Nama QA", "qaName"]]],
  ["Agreement & Invoice", [["Nama PIC Agreement", "agreementPicName"], ["Jabatan PIC Agreement", "agreementPicTitle"], ["PIC Invoice", "invoicePicName"], ["Kontak PIC Invoice", "invoicePicPhone"], ["Email PIC Invoice", "invoicePicEmail"], ["Alamat PIC Invoice", "invoicePicAddress"], ["Batas Penerimaan Invoice Customer (Hari)", "invoiceAcceptanceLimitDays"]]],
] as const;
const pretty = (value: any) => (value ? (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value).toLocaleDateString("id-ID") : String(value).replaceAll("_", " ")) : "—");

function EditableField({ customerId, label, field, value, reload }: { customerId: string; label: string; field: string; value: any; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const isLong = longFields.has(field);
  const isSelect = Boolean(options[field]);

  const startEdit = () => { setDraft(value ?? ""); setEditing(true); };
  const cancel = () => { setDraft(value ?? ""); setEditing(false); };
  const save = async () => { setSaving(true); try { await api.patch(`/erp/customers/${customerId}`, { [field]: draft }); await reload(); setEditing(false); } finally { setSaving(false); } };

  return (
    <div className={`group rounded-lg p-2.5 transition-colors ${editing ? "col-span-full bg-[#f2f7ff] ring-1 ring-[#cfe0f7]" : "hover:bg-[#f8fbff]"} ${isLong && !editing ? "col-span-full" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <dt className="text-[11px] font-bold uppercase tracking-wide text-ts">{label}</dt>
        {!editing && (
          <button className="shrink-0 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:underline" onClick={startEdit}>Edit</button>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          {isSelect ? (
            <select value={draft} onChange={e => setDraft(e.target.value)} autoFocus>
              {options[field].map(option => <option key={option}>{option}</option>)}
            </select>
          ) : isLong ? (
            <textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Escape") cancel(); }} autoFocus />
          ) : (
            <input
              type={numericFields.has(field) ? "number" : "text"}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              autoFocus
            />
          )}
          <div className="mt-2 flex items-center justify-end gap-2">
            {!isSelect && <span className="mr-auto text-[11px] text-tm">{isLong ? "Esc untuk batal" : "Enter simpan · Esc batal"}</span>}
            <button className="btn !min-h-0 px-3 py-1.5 text-xs" onClick={cancel} disabled={saving}>Batal</button>
            <button className="btn btn-primary !min-h-0 px-4 py-1.5 text-xs" onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
          </div>
        </div>
      ) : (
        <dd
          className={`mt-1 cursor-text whitespace-pre-wrap break-words text-sm ${value ? "font-medium text-tp" : "text-tm"}`}
          onClick={startEdit}
          title="Klik untuk edit"
        >
          {pretty(value)}
        </dd>
      )}
    </div>
  );
}

function FilesTab({ customer, reload }: { customer: any; reload: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError("Pilih file terlebih dahulu.");
    setSaving(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file); form.append("name", name || file.name); form.append("category", category); form.append("description", description);
      await api.post(`/erp/customers/${customer.id}/files`, form);
      setFile(null); setName(""); setDescription(""); await reload();
    } catch (requestError: any) { setError(requestError.response?.data?.error || "Upload file gagal."); } finally { setSaving(false); }
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={upload} className="card h-fit p-6">
        <h2 className="text-lg font-bold">Upload File Customer</h2>
        <p className="mt-2 text-sm text-ts">PDF, gambar, Word, atau Excel. Maksimal 15 MB.</p>
        <div className="mt-5 space-y-4">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} />
          <input placeholder="Nama dokumen (opsional)" value={name} onChange={e => setName(e.target.value)} />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="CONTRACT">Agreement / Kontrak</option>
            <option value="TREATMENT_REPORT">Laporan Treatment</option>
            <option value="NPWP">NPWP</option>
            <option value="INVOICE">Invoice</option>
            <option value="OTHER">Lainnya</option>
          </select>
          <textarea rows={3} placeholder="Keterangan file (opsional)" value={description} onChange={e => setDescription(e.target.value)} />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn btn-primary w-full" disabled={saving}>{saving ? "Mengunggah..." : "Upload File"}</button>
        </div>
      </form>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-bdr p-6">
          <h2 className="text-lg font-bold">File Customer</h2>
          <span className="text-sm text-ts">{customer.files?.length || 0} file</span>
        </div>
        {customer.files?.length ? (
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Nama File</th><th>Kategori</th><th>Ukuran</th><th>Tanggal</th><th></th></tr></thead>
              <tbody>{customer.files.map((item: any) => (
                <tr key={item.id}>
                  <td className="max-w-xs"><b className="break-words">{item.name}</b>{item.description && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-ts">{item.description}</p>}</td>
                  <td><span className="badge badge-draft">{item.category.replaceAll("_", " ")}</span></td>
                  <td className="whitespace-nowrap">{Math.max(1, Math.ceil(item.size / 1024))} KB</td>
                  <td className="whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString("id-ID")}</td>
                  <td><a className="font-semibold text-accent hover:underline" href={fileUrl(item.filePath)} target="_blank">Buka</a></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="p-10 text-center text-sm text-ts">Belum ada file untuk customer ini.</div>}
      </section>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useGet<any>(`/erp/customers/${id}`);
  const [tab, setTab] = useState<"data" | "files">("data");

  if (loading) return <div className="p-9"><Loading /></div>;
  if (!data) return <div className="p-9"><Link className="text-accent underline" href="/customers">← Kembali ke Customer</Link><p className="mt-5 text-red-700">{error || "Customer tidak ditemukan."}</p></div>;

  return (
    <div className="p-9">
      <PageTitle title={data.name} subtitle={`${data.company || "Tanpa perusahaan"} · ${data.code}`} actions={<Link className="btn" href="/customers">← Kembali ke Customer</Link>} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Status value={data.status} />
        <span className="badge badge-draft">{data.segment || "Segment belum dipilih"}</span>
        {data.segmentType && <span className="badge badge-internal">{data.segmentType}</span>}
      </div>

      <div className="mt-7 flex gap-1 border-b border-bdr">
        <button onClick={() => setTab("data")} className={`px-5 py-3 text-sm font-semibold transition-colors ${tab === "data" ? "border-b-2 border-accent text-accent" : "text-ts hover:text-tp"}`}>Data Customer</button>
        <button onClick={() => setTab("files")} className={`px-5 py-3 text-sm font-semibold transition-colors ${tab === "files" ? "border-b-2 border-accent text-accent" : "text-ts hover:text-tp"}`}>Upload File <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs">{data.files?.length || 0}</span></button>
      </div>

      {tab === "data" ? (
        <>
          <p className="mt-5 flex items-center gap-2 text-sm text-ts"><span className="rounded-md bg-[#e9f2ff] px-2 py-1 text-xs font-semibold text-accent">Tips</span> Arahkan kursor ke sebuah field lalu klik <b>Edit</b> (atau klik nilainya) untuk memperbarui — tersimpan tanpa pindah halaman.</p>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
            {groups.map(([title, fields]) => (
              <section className="card p-6" key={title}>
                <h2 className="flex items-center gap-2 border-b border-bdr pb-4 text-base font-bold">
                  <span className="h-4 w-1 rounded-full bg-accent" />{title}
                </h2>
                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
                  {fields.map(([label, key]) => <EditableField key={key} customerId={data.id} label={label} field={key} value={data[key]} reload={reload} />)}
                </dl>
              </section>
            ))}
          </div>

        </>
      ) : <FilesTab customer={data} reload={reload} />}
    </div>
  );
}
