"use client";
import { useState } from "react";
import Link from "next/link";
import { Loading, PageTitle, useGet } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import api from "@/lib/api";
import { showConfirm } from "@/lib/app-modal";

const NAVY = "#2c3e5c";

function fmt(d: any) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtRp(v: any) {
  if (v == null) return "-";
  return "Rp " + Number(v).toLocaleString("id-ID");
}
function daysLeft(d: any) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  UPCOMING:    { bg: "#fef3c7", color: "#92400e", label: "Menunggu Keputusan" },
  IN_PROGRESS: { bg: "#dbeafe", color: "#1e40af", label: "Sedang Diproses" },
  RENEWED:     { bg: "#d1fae5", color: "#065f46", label: "Disetujui / Renewed" },
  EXPIRED:     { bg: "#f3f4f6", color: "#6b7280", label: "Ditolak / Kadaluarsa" },
};

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
          <button onClick={onClose} style={{ padding: "8px 24px", borderRadius: 8, background: isOk ? "#065f46" : "#dc2626", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RenewalsPage() {
  const { data, loading, reload } = useGet<{ data: any[] }>("/erp/renewals");
  const rows = data?.data ?? [];
  const [acting, setActing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const activeFilters = [statusFilter].filter(Boolean).length;

  const filtered = statusFilter ? rows.filter((r: any) => r.status === statusFilter) : rows;

  const stats = {
    total: rows.length,
    upcoming: rows.filter((r: any) => r.status === "UPCOMING").length,
    renewed: rows.filter((r: any) => r.status === "RENEWED").length,
    expired: rows.filter((r: any) => r.status === "EXPIRED").length,
  };

  async function approve(id: string) {
    setActing(id);
    try {
      const res = await api.post(`/erp/renewals/${id}/approve`, {});
      const agNum = res.data?.agreement?.number ?? "-";
      const osNum = res.data?.orderSheet?.number ?? "-";
      setMsg({ type: "success", title: "Renewal Disetujui!", body: `Agreement draft baru telah dibuat:\n• Agreement: ${agNum}\n• Order Sheet: ${osNum}\n\nSilakan lengkapi data Agreement dan Order Sheet sebelum diaktifkan.` });
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Menyetujui", body: e?.response?.data?.error || e?.message || "Terjadi kesalahan." });
    } finally { setActing(null); }
  }

  async function doReject(id: string) {
    setActing(id);
    try {
      await api.post(`/erp/renewals/${id}/reject`, { reason: rejectReason });
      setRejectId(null);
      setRejectReason("");
      setMsg({ type: "success", title: "Renewal Ditolak", body: "Status renewal telah diubah menjadi Ditolak / Kadaluarsa." });
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Menolak", body: e?.response?.data?.error || e?.message || "Terjadi kesalahan." });
    } finally { setActing(null); }
  }

  return (
    <div className="p-6 md:p-8">
      <PageTitle
        title="Renewal Kontrak"
        subtitle="Pembaruan kontrak dari agreement aktif yang mendekati masa berakhir."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={ROUTES.serviceContracts} className="btn">← Service Contract Active</Link>
            <button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button>
          </div>
        }
      />

      {showFilters && (
        <section className="card mt-4 p-4" style={{ marginBottom: 16 }}>
          <div className="grid gap-3 md:grid-cols-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="UPCOMING">Menunggu Keputusan</option>
              <option value="IN_PROGRESS">Sedang Diproses</option>
              <option value="RENEWED">Disetujui / Renewed</option>
              <option value="EXPIRED">Ditolak / Kadaluarsa</option>
            </select>
            <button className="btn" onClick={() => setStatusFilter("")}>Reset Filter</button>
          </div>
          <p className="mt-2 text-xs text-ts">Menampilkan <b>{filtered.length}</b> dari {rows.length} renewal</p>
        </section>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "20px 0" }}>
        {[
          { label: "Total Renewal", value: stats.total, color: NAVY, bg: "#f0f4ff" },
          { label: "Menunggu Keputusan", value: stats.upcoming, color: "#92400e", bg: "#fef3c7" },
          { label: "Disetujui / Renewed", value: stats.renewed, color: "#065f46", bg: "#d1fae5" },
          { label: "Ditolak / Kadaluarsa", value: stats.expired, color: "#6b7280", bg: "#f3f4f6" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "14px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? <Loading /> : (
        <div className="card overflow-hidden">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: NAVY, color: "#fff" }}>
                  {["No. Renewal","Customer","Jenis Layanan","Kontrak Lama Berakhir","Sisa Hari","Nilai Kontrak Lama","Status","Dibuat Oleh / Tanggal Approve","Agreement Baru","Order Sheet Baru","Aksi"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length && (
                  <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
                    Belum ada data renewal.{" "}
                    <Link href={ROUTES.serviceContracts} style={{ color: "#0369a1" }}>Buat dari Service Contract Active →</Link>
                  </td></tr>
                )}
                {filtered.map((r: any, i: number) => {
                  const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.UPCOMING;
                  const days = daysLeft(r.expiryDate);
                  const daysColor = days !== null && days <= 0 ? "#dc2626" : days !== null && days <= 30 ? "#d97706" : "#374151";
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: NAVY }}>{r.number}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <b>{r.customer?.company || r.customer?.name}</b>
                        {r.customer?.company && <p style={{ fontSize: 11, color: "#9ca3af" }}>{r.customer.name}</p>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{r.service || "-"}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {fmt(r._sourceAgreement?.tanggalBerakhir ?? r.expiryDate)}
                        {r._sourceAgreement && (
                          <p style={{ fontSize: 10, color: "#9ca3af" }}>
                            <Link href={ROUTES.agreement(r.sourceAgreementId)} style={{ color: "#0369a1" }}>
                              {r._sourceAgreement.number} →
                            </Link>
                          </p>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: daysColor, fontWeight: 700 }}>
                        {days === null ? "-" : days <= 0 ? "Sudah berakhir" : `${days} hari`}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fmtRp(r._sourceAgreement?.nilaiKontrak)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: ss.bg, color: ss.color }}>{ss.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11 }}>
                        {r.approvedByName && <p><b>{r.approvedByName}</b></p>}
                        {r.approvedAt && <p style={{ color: "#9ca3af" }}>{fmt(r.approvedAt)}</p>}
                        {!r.approvedByName && <span style={{ color: "#9ca3af" }}>-</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {r._createdAgreement
                          ? <Link href={ROUTES.agreement(r.createdAgreementId)} style={{ fontWeight: 600, color: "#0369a1", fontSize: 11 }}>
                              {r._createdAgreement.number}
                              <span style={{ marginLeft: 4, fontSize: 10, color: "#6b7280" }}>({r._createdAgreement.status})</span>
                            </Link>
                          : <span style={{ color: "#9ca3af" }}>-</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {r._createdOrderSheet
                          ? <Link href={ROUTES.orderSheet(r.createdOrderSheetId)} style={{ fontWeight: 600, color: "#0369a1", fontSize: 11 }}>
                              {r._createdOrderSheet.number}
                              <span style={{ marginLeft: 4, fontSize: 10, color: "#6b7280" }}>({r._createdOrderSheet.status})</span>
                            </Link>
                          : <span style={{ color: "#9ca3af" }}>-</span>}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {r.status === "UPCOMING" || r.status === "IN_PROGRESS" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              disabled={acting === r.id}
                              onClick={async () => {
                                const ok = await showConfirm({
                                  title: "Setujui renewal?",
                                  message: "Menyetujui renewal ini akan otomatis membuat Agreement baru (DRAFT) dan Order Sheet baru (DRAFT) dengan penanda RENEWAL.",
                                  confirmLabel: "Ya, setujui",
                                });
                                if (ok) approve(r.id);
                              }}
                              style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "#065f46", color: "#fff", border: "none", cursor: "pointer", opacity: acting === r.id ? 0.6 : 1 }}>
                              {acting === r.id ? "..." : "✓ Setujui"}
                            </button>
                            <button
                              disabled={!!acting}
                              onClick={() => { setRejectId(r.id); setRejectReason(""); }}
                              style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                              ✗ Tolak
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ padding: 28, width: 400, maxWidth: "90vw" }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Tolak Renewal</p>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Alasan penolakan (opsional)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Tuliskan alasan..."
              style={{ marginTop: 6, marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setRejectId(null)}>Batal</button>
              <button
                disabled={acting === rejectId}
                onClick={() => doReject(rejectId)}
                style={{ fontWeight: 700, padding: "8px 18px", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                {acting === rejectId ? "..." : "Tolak Renewal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {msg && <MsgModal msg={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}
