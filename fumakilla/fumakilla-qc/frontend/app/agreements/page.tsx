"use client";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { PageTitle, useGet, Loading } from "@/components/erp/shared";
import { showConfirm } from "@/lib/app-modal";
import { SERVICE_TYPES } from "@/lib/service-options";

const NAVY = "#2c3e5c";
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: "#f3f4f6", color: "#374151", label: "Draft" },
  SENT:      { bg: "#fef3c7", color: "#92400e", label: "Sent" },
  SIGNED:    { bg: "#dbeafe", color: "#1e40af", label: "Signed" },
  ACTIVE:    { bg: "#d1fae5", color: "#065f46", label: "Active" },
  EXPIRED:   { bg: "#fee2e2", color: "#991b1b", label: "Expired" },
  CANCELLED: { bg: "#f3f4f6", color: "#6b7280", label: "Cancelled" },
};

const JENIS_LAYANAN = SERVICE_TYPES;

type Customer = { id: string; name: string; company: string | null; code: string };
type Quotation = { id: string; number: string; title: string; amount: number };

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
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

function CreateModal({ onClose }: { onClose: () => void }) {
  const { data: custData } = useGet<{ data: Customer[] }>("/agreements/dropdown/customers");
  const customers = custData?.data ?? [];
  const [customerId, setCustomerId] = useState("");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [form, setForm] = useState({
    quotationId: "",
    jenisLayanan: "Pest Control",
    lokasiPekerjaan: "",
    tanggalMulai: "",
    tanggalBerakhir: "",
    nilaiKontrak: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const onCustomerChange = async (id: string) => {
    setCustomerId(id);
    setForm(f => ({ ...f, quotationId: "" }));
    if (!id) { setQuotations([]); return; }
    setLoadingQ(true);
    try {
      const r = await api.get(`/agreements/dropdown/quotations/${id}`);
      setQuotations(r.data.data ?? []);
    } finally { setLoadingQ(false); }
  };

  const submit = async () => {
    if (!customerId) { setFormError("Pilih customer terlebih dahulu."); return; }
    if (!form.tanggalMulai || !form.tanggalBerakhir) { setFormError("Isi periode kontrak (tanggal mulai & berakhir)."); return; }
    if (!form.nilaiKontrak) { setFormError("Isi nilai kontrak."); return; }
    setFormError("");
    setSaving(true);
    try {
      const r = await api.post("/agreements", { customerId, ...form });
      window.location.href = `/agreements/${r.data.id}`;
    } catch (e: any) { setFormError(e?.response?.data?.error || "Gagal membuat agreement."); setSaving(false); }
  };

  const inp = (style?: object) => ({
    display: "block" as const, width: "100%", border: "1px solid #d1d5db", borderRadius: 6,
    padding: "6px 10px", fontSize: 13, fontFamily: "inherit", marginTop: 4, ...style,
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 540, padding: 28, background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontWeight: 800, fontSize: 16, color: NAVY, marginBottom: 20 }}>Buat Agreement Baru</h2>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span className="label">Customer *</span>
          <select style={inp()} value={customerId} onChange={e => onCustomerChange(e.target.value)}>
            <option value="">-- Pilih Customer --</option>
            {customers.map(c => <option key={c.id} value={c.id}>[{c.code}] {c.company || c.name}</option>)}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span className="label">Quotation (opsional)</span>
          <select style={inp()} value={form.quotationId} onChange={e => setForm(f => ({ ...f, quotationId: e.target.value }))} disabled={!customerId || loadingQ}>
            <option value="">-- Tanpa Quotation --</option>
            {quotations.map(q => <option key={q.id} value={q.id}>{q.number} — {q.title}</option>)}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span className="label">Jenis Layanan *</span>
          <select style={inp()} value={form.jenisLayanan} onChange={e => setForm(f => ({ ...f, jenisLayanan: e.target.value }))}>
            {JENIS_LAYANAN.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span className="label">Lokasi Pekerjaan</span>
          <input style={inp()} value={form.lokasiPekerjaan} onChange={e => setForm(f => ({ ...f, lokasiPekerjaan: e.target.value }))} placeholder="Alamat lokasi service" />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <label>
            <span className="label">Tanggal Mulai *</span>
            <input type="date" style={inp()} value={form.tanggalMulai} onChange={e => setForm(f => ({ ...f, tanggalMulai: e.target.value }))} />
          </label>
          <label>
            <span className="label">Tanggal Berakhir *</span>
            <input type="date" style={inp()} value={form.tanggalBerakhir} onChange={e => setForm(f => ({ ...f, tanggalBerakhir: e.target.value }))} />
          </label>
        </div>

        <label style={{ display: "block", marginBottom: 20 }}>
          <span className="label">Nilai Kontrak (Rp) *</span>
          <input type="number" style={inp()} value={form.nilaiKontrak} onChange={e => setForm(f => ({ ...f, nilaiKontrak: e.target.value }))} placeholder="0" />
        </label>

        {formError && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            {formError}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn" style={{ minHeight: 36 }}>Batal</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary" style={{ minHeight: 36 }}>
            {saving ? "Membuat..." : "Buat Agreement"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUSES = ["", "DRAFT", "SENT", "SIGNED", "ACTIVE", "EXPIRED", "CANCELLED"];

export default function AgreementsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const activeFilters = [search, statusFilter].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setStatusFilter(""); setPage(1); };

  const { data, loading, reload } = useGet<{ data: any[]; total: number; totalPages: number }>(
    `/agreements?search=${encodeURIComponent(search)}&status=${statusFilter}&page=${page}&limit=20`
  );

  const handleDelete = async (id: string, label: string) => {
    const ok = await showConfirm({
      title: "Hapus Agreement?",
      message: `Agreement "${label}" akan dihapus permanen dan tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (ok) doDelete(id);
  };

  const doDelete = async (id: string) => {
    setDeleting(id);
    try { await api.delete(`/agreements/${id}`); reload(); }
    catch { setMsg({ type: "error", title: "Gagal Menghapus", body: "Terjadi kesalahan saat menghapus agreement." }); }
    finally { setDeleting(null); }
  };

  const handleStatusChange = async (ag: any, newStatus: string) => {
    if (newStatus === ag.status) return;
    setChangingStatus(ag.id);
    try {
      if (newStatus === "ACTIVE") {
        const r = await api.post(`/agreements/${ag.id}/activate`, {});
        const sc = r.data.serviceContract;
        const mr = r.data.monthlyReport;
        const lines = [
          `✓ Agreement ${ag.number} diaktifkan.`,
          sc ? `• Service Contract ${sc.number} berhasil dibuat.` : "",
          `• Status customer diperbarui ke "Kontrak".`,
          mr
            ? `• Monthly Report bulan ini sudah disiapkan (Pending) → pilih jenisnya di menu Monthly Report.`
            : `• Monthly Report perlu dibuat manual (inquiry tidak terhubung ke agreement ini).`,
        ].filter(Boolean).join("\n");
        setPushMsg(lines);
      } else {
        await api.patch(`/agreements/${ag.id}`, { status: newStatus });
      }
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Mengubah Status", body: e?.response?.data?.error || "Terjadi kesalahan saat mengubah status." });
    } finally { setChangingStatus(null); }
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
  const fmtRp = (v: any) => v != null ? "Rp " + Number(v).toLocaleString("id-ID") : "-";

  return (
    <div className="p-6 md:p-8">
      <PageTitle title="Agreement" subtitle="Manajemen kontrak perjanjian kerja sama dengan klien" actions={<div className="flex gap-2"><button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button><button onClick={() => setShowModal(true)} className="btn btn-primary">+ Buat Agreement</button></div>} />
      {showFilters && (
        <section className="card mt-4 p-4" style={{ marginBottom: 16 }}>
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Cari customer / no. agreement..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              {STATUSES.map(s => <option key={s} value={s}>{s ? (STATUS_COLORS[s]?.label ?? s) : "Semua Status"}</option>)}
            </select>
            <button className="btn" onClick={clearFilters}>Reset Filter</button>
          </div>
        </section>
      )}
      {pushMsg && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#065f46" }}>
          <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{pushMsg}</pre>
          <button onClick={() => setPushMsg(null)} style={{ fontWeight: 700, background: "none", border: "none", cursor: "pointer", color: "#065f46", flexShrink: 0 }}>✕</button>
        </div>
      )}

      {loading ? <Loading /> : (

        <div className="card overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: NAVY, color: "#fff" }}>
                {["No. Agreement", "Customer", "Jenis Layanan", "Periode Kontrak", "Nilai Kontrak", "Status", "Aksi"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data?.data?.length && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>Belum ada agreement.</td></tr>
              )}
              {data?.data?.map((ag, i) => {
                const sc = STATUS_COLORS[ag.status] ?? STATUS_COLORS.DRAFT;
                const isChanging = changingStatus === ag.id;
                return (
                  <tr key={ag.id} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontWeight: 700, color: NAVY, fontFamily: "monospace", fontSize: 12 }}>{ag.number}</p>
                        {ag.isRenewal && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: "#f0abfc", color: "#701a75", letterSpacing: "0.05em" }}>RENEWAL</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "#9ca3af" }}>{fmt(ag.tanggal)}</p>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <p style={{ fontWeight: 700 }}>{ag.customer?.company || ag.customer?.name}</p>
                      {ag.customer?.company && <p style={{ fontSize: 12, color: "#6b7280" }}>{ag.customer.name}</p>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>{ag.jenisLayanan}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12 }}>
                      <p>{fmt(ag.tanggalMulai)}</p>
                      <p style={{ color: "#6b7280" }}>s/d {fmt(ag.tanggalBerakhir)}</p>
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fmtRp(ag.nilaiKontrak)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <select
                        value={ag.status}
                        disabled={isChanging || ag.status === "ACTIVE"}
                        onChange={e => handleStatusChange(ag, e.target.value)}
                        style={{
                          background: sc.bg, color: sc.color,
                          border: `1px solid ${sc.color}40`, borderRadius: 6,
                          padding: "3px 8px", fontSize: 11, fontWeight: 700,
                          cursor: ag.status === "ACTIVE" ? "default" : "pointer",
                          opacity: isChanging ? 0.5 : 1,
                        }}
                      >
                        {STATUSES.filter(Boolean).map(s => (
                          <option key={s} value={s}>{STATUS_COLORS[s]?.label ?? s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link href={`/agreements/${ag.id}`} className="btn" style={{ minHeight: 30, padding: "4px 12px", fontSize: 12 }}>Buka</Link>
                        <button
                          onClick={() => handleDelete(ag.id, ag.number)}
                          disabled={deleting === ag.id}
                          style={{ minHeight: 30, padding: "4px 12px", fontSize: 12, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer" }}
                        >
                          {deleting === ag.id ? "..." : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(data?.totalPages ?? 0) > 1 && (
            <div style={{ display: "flex", gap: 8, padding: "12px 16px", justifyContent: "flex-end", alignItems: "center" }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn" style={{ minHeight: 30, padding: "4px 12px", fontSize: 12 }}>← Prev</button>
              <span style={{ fontSize: 12, color: "#374151" }}>Hal {page} / {data?.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === (data?.totalPages ?? 1)} className="btn" style={{ minHeight: 30, padding: "4px 12px", fontSize: 12 }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {showModal && <CreateModal onClose={() => setShowModal(false)} />}

      {msg && <MsgModal msg={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}
