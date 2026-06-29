"use client";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageTitle, useGet, Loading } from "@/components/erp/shared";

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const NAVY = "#2c3e5c";

type Customer = { id: string; name: string; company: string | null; code: string; address: string | null; segmentType: string | null; agreementNumber: string | null; agreementType: string | null };
type Report = { id: string; customerId: string; bulan: number; tahun: number; createdAt: string; customer: Customer };

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: custData } = useGet<{ data: Customer[] }>("/erp/agreement-reports-customers");
  const customers = custData?.data ?? [];
  const now = new Date();
  const [form, setForm] = useState({ customerId: "", bulan: now.getMonth() + 1, tahun: now.getFullYear() });
  const [saving, setSaving] = useState(false);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const submit = async () => {
    if (!form.customerId) { alert("Pilih customer terlebih dahulu"); return; }
    setSaving(true);
    try {
      const r = await api.post("/erp/agreement-reports", form);
      window.location.href = `/agreements/${r.data.id}`;
    } catch { alert("Gagal membuat laporan."); setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="card" style={{ width:480, padding:28, background:"#fff" }}>
        <h2 style={{ fontWeight:800, fontSize:16, color:NAVY, marginBottom:18 }}>Buat Agreement Report</h2>

        <label style={{ display:"block", marginBottom:14 }}>
          <span className="label">Customer</span>
          <select className="input" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} style={{ minHeight:38 }}>
            <option value="">-- Pilih Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>[{c.code}] {c.company || c.name}</option>
            ))}
          </select>
          {form.customerId && (() => {
            const sel = customers.find(c => c.id === form.customerId);
            return sel ? <p style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>{sel.name}{sel.company ? ` · ${sel.company}` : ""}{sel.agreementNumber ? ` · No. ${sel.agreementNumber}` : ""}</p> : null;
          })()}
        </label>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
          <label>
            <span className="label">Bulan</span>
            <select className="input" value={form.bulan} onChange={e => setForm(f => ({ ...f, bulan: Number(e.target.value) }))} style={{ minHeight:38 }}>
              {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Tahun</span>
            <select className="input" value={form.tahun} onChange={e => setForm(f => ({ ...f, tahun: Number(e.target.value) }))} style={{ minHeight:38 }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} className="btn" style={{ minHeight:36 }}>Batal</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary" style={{ minHeight:36 }}>
            {saving ? "Membuat..." : "Buat Laporan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgreementsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data, loading, reload: refetch } = useGet<{ data: Report[]; total: number; totalPages: number }>(
    `/erp/agreement-reports?search=${encodeURIComponent(search)}&page=${page}&limit=20`
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus laporan untuk "${name}"?`)) return;
    setDeleting(id);
    try { await api.delete(`/erp/agreement-reports/${id}`); refetch(); }
    catch { alert("Gagal menghapus."); }
    finally { setDeleting(null); }
  };

  return (
    <div className="p-6 md:p-8">
      <PageTitle title="Agreement" subtitle="Pest Control Report untuk customer berdasarkan perjanjian" />

      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center" }}>
        <input
          placeholder="Cari nama customer..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input" style={{ maxWidth:280, minHeight:36 }}
        />
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ minHeight:36 }}>
          + Buat Laporan
        </button>
      </div>

      {loading ? <Loading /> : (
        <div className="card overflow-hidden">
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:NAVY, color:"#fff" }}>
                {["Customer","No. Agreement","Periode","Dibuat","Aksi"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data?.data?.length && (
                <tr><td colSpan={5} style={{ padding:32, textAlign:"center", color:"#9CA3AF" }}>Belum ada agreement report.</td></tr>
              )}
              {data?.data?.map((r, i) => (
                <tr key={r.id} style={{ borderBottom:"1px solid #e5e7eb", background: i%2===0 ? "#f9fafb" : "#fff" }}>
                  <td style={{ padding:"10px 14px" }}>
                    <p style={{ fontWeight:700 }}>{r.customer?.company || r.customer?.name}</p>
                    {r.customer?.company && <p style={{ fontSize:12, color:"#6b7280" }}>{r.customer.name}</p>}
                    <p style={{ fontSize:11, color:"#9ca3af" }}>{r.customer?.code}</p>
                  </td>
                  <td style={{ padding:"10px 14px", color:"#374151" }}>{r.customer?.agreementNumber || "-"}</td>
                  <td style={{ padding:"10px 14px", fontWeight:600 }}>{MONTHS[(r.bulan ?? 1) - 1]} {r.tahun}</td>
                  <td style={{ padding:"10px 14px", color:"#6b7280", fontSize:12 }}>
                    {new Date(r.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", gap:8 }}>
                      <Link href={`/agreements/${r.id}`} className="btn" style={{ minHeight:30, padding:"4px 12px", fontSize:12 }}>Buka</Link>
                      <button onClick={() => handleDelete(r.id, r.customer?.company || r.customer?.name)} disabled={deleting === r.id}
                        style={{ minHeight:30, padding:"4px 12px", fontSize:12, background:"#fee2e2", color:"#dc2626", border:"1px solid #fca5a5", borderRadius:6, cursor:"pointer" }}>
                        {deleting === r.id ? "..." : "Hapus"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data?.totalPages ?? 0) > 1 && (
            <div style={{ display:"flex", gap:8, padding:"12px 16px", justifyContent:"flex-end", alignItems:"center" }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn" style={{ minHeight:30, padding:"4px 12px", fontSize:12 }}>← Prev</button>
              <span style={{ fontSize:12, color:"#374151" }}>Hal {page} / {data?.totalPages}</span>
              <button onClick={() => setPage(p => p+1)} disabled={page===(data?.totalPages??1)} className="btn" style={{ minHeight:30, padding:"4px 12px", fontSize:12 }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); refetch(); }} />}
    </div>
  );
}
