"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { BulkDeleteBar, Loading, Modal, PageTitle, Pagination, RowBox, SelectAllBox, useBulkSelect, useGet, usePagination } from "@/components/erp/shared";
import { useAuth } from "@/hooks/useAuth";

const NAVY = "#2c3e5c";
const ACCENT = "#285f90";

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  "Kontrak":     { bg: "#d1fae5", color: "#065f46" },
  "Non-Kontrak": { bg: "#f3f4f6", color: "#374151" },
  "Renewal":     { bg: "#fef3c7", color: "#92400e" },
};
const SEG_COLOR: Record<string, { bg: string; color: string }> = {
  "B2B": { bg: "#dbeafe", color: "#1e40af" },
  "B2C": { bg: "#fce7f3", color: "#9d174d" },
};

function StatusBadge({ value }: { value: string }) {
  const c = STATUS_COLOR[value] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {value || "—"}
    </span>
  );
}

function SegBadge({ value }: { value: string }) {
  const c = SEG_COLOR[value] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: c.bg, color: c.color }}>
      {value || "—"}
    </span>
  );
}

function DeleteCustomerModal({ customer, onClose, onDeleted }: { customer: any; onClose: () => void; onDeleted: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    setSaving(true); setError("");
    try { await api.delete(`/erp/customers/${customer.id}`); onDeleted(); }
    catch (e: any) { setError(e.response?.data?.error || "Gagal menghapus."); }
    finally { setSaving(false); }
  };
  return (
    <Modal open title="Hapus Customer" tone="danger" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="text-base font-bold">Hapus {customer.name}?</p>
          <p className="mt-2 text-sm text-ts">Inquiry, quotation, survey, file, dan semua data terkait customer ini akan terhapus permanen.</p>
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button className="danger-cancel" disabled={saving} onClick={onClose}>Batal</button>
          <button className="danger-confirm" disabled={saving} onClick={remove}>{saving ? "Menghapus..." : "Ya, Hapus"}</button>
        </div>
      </div>
    </Modal>
  );
}

function NewCustomerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", segmentType: "B2B" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try { await api.post("/erp/customers", form); onSaved(); }
    catch (err: any) { setError(err.response?.data?.error || "Gagal menyimpan."); }
    finally { setSaving(false); }
  };
  return (
    <Modal open title="Customer Baru" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ts">Data lengkap bisa dilengkapi dari halaman detail customer.</p>
        <label className="block text-sm font-semibold">
          Nama Customer <span className="text-red-700">*</span>
          <input className="mt-2" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama pemilik / kontak" />
        </label>
        <label className="block text-sm font-semibold">
          Nama Perusahaan
          <input className="mt-2" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="PT / CV / Nama Usaha" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="block text-sm font-semibold">
            Email
            <input className="mt-2" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block text-sm font-semibold">
            Telepon
            <input className="mt-2" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Segment
          <select className="mt-2 input" value={form.segmentType} onChange={e => setForm({ ...form, segmentType: e.target.value })}>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, reload } = useGet<{ data: any[] }>("/erp/customers?limit=500");
  const [target, setTarget] = useState<any>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [segFilter, setSegFilter] = useState("");
  const admin = ["ADMIN", "Super Admin"].includes(user?.role || "");
  const activeFilters = [search, statusFilter, segFilter].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setStatusFilter(""); setSegFilter(""); };

  const customers = data?.data ?? [];

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter(c => c.status === statusFilter);
    if (segFilter) list = list.filter(c => c.segmentType === segFilter);
    return list;
  }, [customers, search, statusFilter, segFilter]);
  const sel = useBulkSelect();
  const pg = usePagination(filtered);

  const stats = useMemo(() => ({
    total: customers.length,
    kontrak: customers.filter(c => c.status === "Kontrak").length,
    nonKontrak: customers.filter(c => c.status === "Non-Kontrak").length,
    b2b: customers.filter(c => c.segmentType === "B2B").length,
    b2c: customers.filter(c => c.segmentType === "B2C").length,
  }), [customers]);

  const fmt = (d: any) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : null;

  return (
    <div className="p-6 md:p-8">
      <PageTitle
        title="Database Client"
        subtitle="Daftar seluruh customer, status kontrak, segment, dan informasi kontak."
        actions={<div className="flex gap-2"><button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button><button className="btn btn-primary" onClick={() => setNewOpen(true)}>+ Customer Baru</button></div>}
      />

      {/* Stats cards */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, margin: "20px 0" }}>
          {([
            { label: "Total Customer",  value: stats.total,      bg: "#f8faff", border: "#d9ddeb", color: NAVY },
            { label: "Kontrak Aktif",   value: stats.kontrak,    bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
            { label: "Non-Kontrak",     value: stats.nonKontrak, bg: "#f9fafb", border: "#e5e7eb", color: "#374151" },
            { label: "B2B",             value: stats.b2b,        bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
            { label: "B2C",             value: stats.b2c,        bg: "#fdf2f8", border: "#fbcfe8", color: "#9d174d" },
          ] as const).map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "14px 18px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <section className="card mt-4 p-4" style={{ marginBottom: 16 }}>
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Cari nama, perusahaan, kode, kota..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="Kontrak">Kontrak</option>
              <option value="Non-Kontrak">Non-Kontrak</option>
              <option value="Renewal">Renewal</option>
            </select>
            <select value={segFilter} onChange={e => setSegFilter(e.target.value)}>
              <option value="">Semua Segment</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
            <button className="btn" onClick={clearFilters}>Reset Filter</button>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 10 }}>Menampilkan <b>{filtered.length}</b> dari {customers.length} customer</p>
        </section>
      )}

      {/* Table */}
      {loading ? <Loading /> : (
        <div className="card overflow-hidden">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: NAVY, color: "#fff" }}>
                  {admin && <th style={{ padding: "10px 12px", width: 36 }}><SelectAllBox all={pg.pageRows.map((r: any) => r.id)} sel={sel} /></th>}
                  {["No", "Kode", "Nama / Perusahaan", "Segment", "Status", "Kontak", "Kota / Alamat", "Agreement", "Aksi"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length && (
                  <tr>
                    <td colSpan={admin ? 10 : 9} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
                      {customers.length === 0
                        ? "Belum ada data customer. Klik \"+ Customer Baru\" untuk menambahkan."
                        : "Tidak ada customer yang cocok dengan filter saat ini."}
                    </td>
                  </tr>
                )}
                {pg.pageRows.map((item, i) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/customers/${item.id}`)}
                    style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f9fafb" : "#fff", cursor: "pointer", transition: "background .1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#f9fafb" : "#fff")}
                  >
                    {admin && <td style={{ padding: "10px 12px", textAlign: "center" }} onClick={e => e.stopPropagation()}><RowBox id={item.id} sel={sel} /></td>}
                    <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 11 }}>{pg.from + i}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>
                        {item.code}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <p style={{ fontWeight: 700, color: ACCENT }}>{item.company || item.name}</p>
                      {item.company && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{item.name}</p>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <SegBadge value={item.segmentType || item.segment || ""} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusBadge value={item.status || "Non-Kontrak"} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {item.phone && <p style={{ fontSize: 12 }}>{item.phone}</p>}
                      {item.email && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{item.email}</p>}
                      {!item.phone && !item.email && <span style={{ color: "#d1d5db" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.city && <p style={{ fontWeight: 600, fontSize: 12 }}>{item.city}</p>}
                      {item.treatmentAddress && (
                        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }} title={item.treatmentAddress}>
                          {item.treatmentAddress}
                        </p>
                      )}
                      {!item.city && !item.treatmentAddress && <span style={{ color: "#d1d5db" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {item.agreementNumber ? (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#065f46", fontFamily: "monospace" }}>{item.agreementNumber}</p>
                          {item.agreementEnd && (
                            <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>s/d {fmt(item.agreementEnd)}</p>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/customers/${item.id}`)}
                          style={{ minHeight: 28, padding: "3px 10px", fontSize: 11, fontWeight: 600, background: "#eff6ff", color: ACCENT, border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer" }}>
                          Detail
                        </button>
                        {admin && (
                          <button
                            onClick={() => setTarget(item)}
                            style={{ minHeight: 28, padding: "3px 10px", fontSize: 11, fontWeight: 600, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer" }}>
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pg={pg} />
        </div>
      )}

      {admin && <BulkDeleteBar ids={sel.list} endpoint="/erp/customers/bulk-delete" label="customer" onDone={() => { sel.clear(); reload(); }} />}

      {target && (
        <DeleteCustomerModal
          customer={target}
          onClose={() => setTarget(null)}
          onDeleted={() => { setTarget(null); reload(); }}
        />
      )}
      {newOpen && (
        <NewCustomerModal
          onClose={() => setNewOpen(false)}
          onSaved={() => { setNewOpen(false); reload(); }}
        />
      )}
    </div>
  );
}
