"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { Loading, PageTitle, useGet } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import api from "@/lib/api";

const NAVY = "#2c3e5c";
const ACCENT = "#285f90";

function fmt(d: any) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtRp(v: any) {
  if (v == null) return "-";
  return "Rp " + Number(v).toLocaleString("id-ID");
}
function reminderH3(tanggalBerakhir: any) {
  if (!tanggalBerakhir) return "-";
  const d = new Date(tanggalBerakhir);
  d.setMonth(d.getMonth() - 3);
  return fmt(d.toISOString());
}
function daysLeft(tanggalBerakhir: any) {
  if (!tanggalBerakhir) return null;
  return Math.ceil((new Date(tanggalBerakhir).getTime() - Date.now()) / 86400000);
}

function DocLink({ label, href, number, status }: { label: string; href?: string | null; number?: string | null; status?: string | null }) {
  const hasLink = !!href;
  return (
    <div style={{ border: `1px solid ${hasLink ? "#bfdbfe" : "#e5e7eb"}`, borderRadius: 8, padding: "10px 14px", background: hasLink ? "#eff6ff" : "#f9fafb", minWidth: 160 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</p>
      {hasLink ? (
        <Link href={href!} style={{ fontWeight: 700, fontSize: 12, color: ACCENT, textDecoration: "none" }} onClick={e => e.stopPropagation()}>
          {number || "Buka →"}
          {status && <span style={{ marginLeft: 6, fontSize: 10, color: "#6b7280", fontWeight: 400 }}>({status})</span>}
        </Link>
      ) : (
        <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>{number || "Belum ada"}</p>
      )}
    </div>
  );
}

function DetailPanel({ ag }: { ag: any }) {
  const links = ag._links || {};
  const os = links.orderSheet;
  const survey = links.survey;
  const sc = links.serviceContract;
  return (
    <div style={{ background: "#f8faff", borderTop: "1px solid #e0e8f7", padding: "16px 24px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Dokumen Terkait</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <DocLink label="Database Client" href={ROUTES.customer(ag.customerId)} number={ag.customer?.company || ag.customer?.name} />
        <DocLink
          label="Survey Report"
          href={survey ? (survey.hasB2bReport ? ROUTES.b2bReport(survey.id) : ROUTES.surveys) : null}
          number={survey?.number || undefined}
          status={survey ? (survey.hasB2bReport ? survey.status : `${survey.status} · buka di menu Survey`) : undefined}
        />
        <DocLink label="Quotation" href={ag.quotationId ? ROUTES.quotation(ag.quotationId) : null} number={ag.quotation?.number} />
        <DocLink label="Agreement" href={ROUTES.agreement(ag.id)} number={ag.number} status="ACTIVE" />
        <DocLink label="Order Sheet" href={os ? ROUTES.orderSheet(os.id) : null} number={os?.number} status={os?.status} />
        <DocLink
          label="Monthly Report"
          href={ag.quotation?.inquiryId ? `${ROUTES.monthlyReports}?inquiry=${ag.quotation.inquiryId}&segment=${ag.quotation.segmentType || ag.customer?.segmentType || "B2B"}` : `${ROUTES.monthlyReports}?segment=${ag.customer?.segmentType || "B2B"}`}
          number={ag.quotation?.inquiryId ? "Lihat Laporan →" : null}
        />
      </div>
      {(os?.picInternal || os?.vendorName) && (
        <div style={{ marginTop: 14, display: "flex", gap: 24, fontSize: 12, color: "#374151" }}>
          {os.picInternal && <span><span style={{ color: "#6b7280" }}>PIC Internal: </span><b>{os.picInternal}</b></span>}
          {os.vendorName && <span><span style={{ color: "#6b7280" }}>Vendor: </span><b>{os.vendorName}</b></span>}
        </div>
      )}
    </div>
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
          <button onClick={onClose} style={{ padding: "8px 24px", borderRadius: 8, background: isOk ? "#065f46" : "#dc2626", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServiceContractActivePage() {
  const { data, loading, reload } = useGet<{ data: any[] }>("/agreements/active-hub");
  const allRows = data?.data ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [thresholdDays, setThresholdDays] = useState(90);
  const [creatingRenewal, setCreatingRenewal] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const activeFilters = [search, expiryFilter].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setExpiryFilter(""); };

  async function buatRenewal(agreementId: string) {
    setCreatingRenewal(agreementId);
    try {
      await api.post(`/erp/renewals/from-agreement/${agreementId}`, { thresholdDays });
      setMsg({ type: "success", title: "Renewal Dibuat!", body: "Renewal telah dibuat dan siap untuk diproses.\nBuka menu Renewal untuk menyetujui atau menolaknya." });
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Membuat Renewal", body: e?.response?.data?.error || e?.message || "Terjadi kesalahan." });
    } finally {
      setCreatingRenewal(null);
    }
  }
  const rows = allRows.filter((r: any) => {
    const q = search.toLowerCase();
    const matchSearch = !search || [r.number, r.customer?.name, r.customer?.company, r.jenisLayanan].join(" ").toLowerCase().includes(q);
    const d = daysLeft(r.tanggalBerakhir);
    const matchExpiry = !expiryFilter
      || (expiryFilter === "expiring" && d !== null && d <= thresholdDays && d > 0)
      || (expiryFilter === "expired" && d !== null && d <= 0)
      || (expiryFilter === "normal" && d !== null && d > thresholdDays);
    return matchSearch && matchExpiry;
  });

  return (
    <div className="p-6 md:p-8">
      <PageTitle title="Service Contract Active" subtitle="Kontrak layanan aktif — hub terintegrasi dari Agreement, Survey, Quotation, dan Order Sheet." actions={<button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button>} />
      {showFilters && (
        <section className="card mt-4 p-4" style={{ marginBottom: 16 }}>
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Cari nama client, no. contract, jenis service..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)}>
              <option value="">Semua Status Expiry</option>
              <option value="normal">Normal (&gt;{thresholdDays} hari)</option>
              <option value="expiring">Akan Habis (≤{thresholdDays} hari)</option>
              <option value="expired">Sudah Berakhir</option>
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>Threshold hari:</label>
              <input type="number" min={1} max={365} value={thresholdDays} onChange={e => setThresholdDays(Number(e.target.value))} style={{ width: 80 }} />
            </div>
            <button className="btn" onClick={clearFilters}>Reset Filter</button>
          </div>
          <p className="mt-2 text-xs text-ts">Menampilkan <b>{rows.length}</b> dari {allRows.length} kontrak</p>
        </section>
      )}

      {loading ? <Loading /> : (
        <>
          <div className="card overflow-hidden">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: NAVY, color: "#fff" }}>
                    {["", "No", "Contract ID", "Nama Client", "Segmentasi", "Jenis Service", "Lokasi", "Tgl Mulai", "Tgl Berakhir", "Reminder H-3 Bln", "Nilai Kontrak", "PIC Client", "Status Renewal", "Catatan", "Aksi"].map(h => (
                      <th key={h} style={{ padding: "9px 11px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!rows.length && (
                    <tr>
                      <td colSpan={15} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
                        Belum ada kontrak aktif.<br />
                        <span style={{ fontSize: 11 }}>Aktifkan agreement dari menu Modul B → Agreement (status SIGNED → klik "Aktifkan").</span>
                      </td>
                    </tr>
                  )}
                  {rows.map((ag, i) => {
                    const expanded = expandedId === ag.id;
                    const days = daysLeft(ag.tanggalBerakhir);
                    const expiryColor = days !== null && days <= 0 ? "#dc2626" : days !== null && days <= thresholdDays ? "#d97706" : "#374151";
                    const renewalStatus = ag._links?.renewal?.status;
                    const renewalId = ag._links?.renewal?.id;
                    const nearExpiry = days !== null && days <= thresholdDays;
                    const seg = ag.quotation?.segmentType || ag.customer?.customerType;
                    return (
                      <Fragment key={ag.id}>
                        <tr
                          style={{ borderBottom: "1px solid #e5e7eb", background: expanded ? "#eff6ff" : i % 2 === 0 ? "#f9fafb" : "#fff", cursor: "pointer" }}
                          onClick={() => setExpandedId(expanded ? null : ag.id)}
                        >
                          <td style={{ padding: "9px 11px", textAlign: "center", fontSize: 16, fontWeight: 800, color: ACCENT }}>{expanded ? "−" : "+"}</td>
                          <td style={{ padding: "9px 11px", color: "#6b7280" }}>{i + 1}</td>
                          <td style={{ padding: "9px 11px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", whiteSpace: "nowrap" }}>{ag.number}</td>
                          <td style={{ padding: "9px 11px" }}>
                            <p style={{ fontWeight: 700 }}>{ag.customer?.company || ag.customer?.name}</p>
                            {ag.customer?.company && <p style={{ fontSize: 11, color: "#6b7280" }}>{ag.customer.name}</p>}
                          </td>
                          <td style={{ padding: "9px 11px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, background: seg === "B2B" ? "#dbeafe" : "#fce7f3", color: seg === "B2B" ? "#1e40af" : "#9d174d", padding: "2px 8px", borderRadius: 999 }}>
                              {seg || "-"}
                            </span>
                          </td>
                          <td style={{ padding: "9px 11px" }}>{ag.jenisLayanan || "-"}</td>
                          <td style={{ padding: "9px 11px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ag.lokasiPekerjaan}>{ag.lokasiPekerjaan || "-"}</td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap" }}>{fmt(ag.tanggalMulai)}</td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", color: expiryColor, fontWeight: days !== null && days <= 90 ? 700 : 400 }}>
                            {fmt(ag.tanggalBerakhir)}
                            {days !== null && days <= 90 && <p style={{ fontSize: 10 }}>{days <= 0 ? "Sudah berakhir" : `${days} hari lagi`}</p>}
                          </td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", color: "#6b7280" }}>{reminderH3(ag.tanggalBerakhir)}</td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", fontWeight: 600 }}>{fmtRp(ag.nilaiKontrak)}</td>
                          <td style={{ padding: "9px 11px" }}>{ag.picKlienNama || "-"}</td>
                          <td style={{ padding: "9px 11px" }}>
                            {renewalStatus
                              ? <span style={{ fontSize: 10, fontWeight: 700, background: renewalStatus === "RENEWED" ? "#d1fae5" : renewalStatus === "EXPIRED" ? "#f3f4f6" : "#fef3c7", color: renewalStatus === "RENEWED" ? "#065f46" : renewalStatus === "EXPIRED" ? "#6b7280" : "#92400e", padding: "2px 8px", borderRadius: 999 }}>{renewalStatus}</span>
                              : nearExpiry && days! > 0
                                ? <span style={{ fontSize: 10, fontWeight: 700, background: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: 999 }}>⚠ Segera Renewal</span>
                                : <span style={{ color: "#9ca3af" }}>-</span>}
                          </td>
                          <td style={{ padding: "9px 11px", color: "#6b7280", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ag.notes}>{ag.notes || "-"}</td>
                          <td style={{ padding: "9px 11px" }} onClick={e => e.stopPropagation()}>
                            {renewalStatus && renewalId && renewalStatus !== "EXPIRED"
                              ? <Link href={ROUTES.renewals} style={{ fontSize: 11, color: "#0369a1", fontWeight: 600 }}>Lihat Renewal →</Link>
                              : days !== null && days > 0
                                ? <button
                                    disabled={creatingRenewal === ag.id}
                                    onClick={() => buatRenewal(ag.id)}
                                    style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: nearExpiry ? "#dc2626" : "#285f90", color: "#fff", border: "none", cursor: "pointer", opacity: creatingRenewal === ag.id ? 0.6 : 1 }}>
                                    {creatingRenewal === ag.id ? "..." : "Buat Renewal"}
                                  </button>
                                : null}
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={14} style={{ padding: 0 }}>
                              <DetailPanel ag={ag} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {msg && <MsgModal msg={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}
