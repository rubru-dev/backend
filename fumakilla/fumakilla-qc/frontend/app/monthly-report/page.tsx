"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { PageTitle, useGet, Loading } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import { showAlert, showConfirm } from "@/lib/app-modal";

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const NAVY = "#2c3e5c";

type InquiryOption = { id: string; number: string; companyName: string; customerName: string; status: string };

// ─── Unified Create Modal ─────────────────────────────────────────────────────

function CreateModal({ segment, onClose }: { segment: "B2B" | "B2C"; onClose: () => void }) {
  const [reportType, setReportType] = useState<"complete" | "simple" | null>(null);
  const { data: inqData } = useGet<{ data: InquiryOption[] }>(`/erp/pest-reports-inquiries?segment=${segment}`);
  const inquiries = inqData?.data ?? [];
  const now = new Date();
  const [form, setForm] = useState({ inquiryId: "", bulan: now.getMonth() + 1, tahun: now.getFullYear() });
  const [saving, setSaving] = useState(false);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const submit = async () => {
    if (!form.inquiryId) { showAlert({ title: "Inquiry belum dipilih", message: "Pilih inquiry terlebih dahulu." }); return; }
    setSaving(true);
    try {
      if (reportType === "complete") {
        const r = await api.post("/erp/pest-reports", { ...form, segment });
        window.location.href = `/monthly-report/${r.data.id}`;
      } else {
        const r = await api.post("/erp/simple-reports", { ...form, segment });
        window.location.href = ROUTES.simpleReport(r.data.id);
      }
    } catch { showAlert({ title: "Gagal membuat laporan", message: "Gagal membuat laporan.", tone: "danger" }); setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 480, padding: 28, background: "#fff" }}>
        <h2 style={{ fontWeight: 800, fontSize: 16, color: NAVY, marginBottom: 20 }}>Buat Monthly Report {segment}</h2>

        {/* Step 1: pilih tipe */}
        <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Jenis Report</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          {([
            { key: "complete" as const, label: "Complete Report", desc: "Laporan lengkap dengan floor plan, grafik, dan foto per kategori hama" },
            { key: "simple"   as const, label: "Simple Report",   desc: "Laporan ringkas dengan tabel tangkapan, dokumentasi, dan rekomendasi" },
          ]).map(opt => (
            <button key={opt.key} onClick={() => setReportType(opt.key)}
              style={{
                padding: "14px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                border: `2px solid ${reportType === opt.key ? NAVY : "#e5e7eb"}`,
                background: reportType === opt.key ? "#eff6ff" : "#fff",
                transition: "all .15s",
              }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: reportType === opt.key ? NAVY : "#374151", marginBottom: 4 }}>{opt.label}</p>
              <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Step 2: isi detail — hanya tampil setelah tipe dipilih */}
        {reportType && (
          <>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span className="label">Inquiry / Client</span>
              <select className="input" value={form.inquiryId} onChange={e => setForm(f => ({ ...f, inquiryId: e.target.value }))} style={{ minHeight: 38 }}>
                <option value="">-- Pilih Inquiry {segment} --</option>
                {inquiries.map(inq => (
                  <option key={inq.id} value={inq.id}>[{inq.number}] {inq.companyName || inq.customerName}</option>
                ))}
              </select>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <label>
                <span className="label">Bulan</span>
                <select className="input" value={form.bulan} onChange={e => setForm(f => ({ ...f, bulan: Number(e.target.value) }))} style={{ minHeight: 38 }}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Tahun</span>
                <select className="input" value={form.tahun} onChange={e => setForm(f => ({ ...f, tahun: Number(e.target.value) }))} style={{ minHeight: 38 }}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn" style={{ minHeight: 36 }}>Batal</button>
          <button onClick={submit} disabled={!reportType || saving} className="btn btn-primary" style={{ minHeight: 36, opacity: !reportType ? 0.5 : 1 }}>
            {saving ? "Membuat..." : "Buat Laporan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Combined List ────────────────────────────────────────────────────────────

function CombinedList({ segment, filterInquiryId }: { segment: "B2B" | "B2C"; filterInquiryId?: string | null }) {
  const now = new Date();
  const [search, setSearch] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const activeFilters = [search, filterBulan, filterTahun, filterType].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setFilterBulan(""); setFilterTahun(""); setFilterType(""); };
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i);

  const inquiryParam = filterInquiryId ? `&inquiryId=${filterInquiryId}` : "";

  const { data: completeData, loading: l1, reload: r1 } = useGet<{ data: any[] }>(
    `/erp/pest-reports?segment=${segment}${inquiryParam}&limit=200`
  );
  const { data: simpleData, loading: l2, reload: r2 } = useGet<{ data: any[] }>(
    `/erp/simple-reports?segment=${segment}${inquiryParam}&limit=200`
  );

  const completeRows = (completeData?.data ?? []).map((r: any) => ({ ...r, _type: "complete" as const }));
  const simpleRows   = (simpleData?.data   ?? []).map((r: any) => ({ ...r, _type: "simple"   as const }));
  const allRows = [...completeRows, ...simpleRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const rows = allRows.filter((r: any) => {
    const isPending = r._type === "complete" && (r.pagesData as any)?._pending === true;
    const typeName = isPending ? "pending" : r._type;
    const q = search.toLowerCase();
    const matchSearch = !search || [r.inquiry?.companyName, r.inquiry?.customerName, r.inquiry?.number].join(" ").toLowerCase().includes(q);
    const matchBulan = !filterBulan || String(r.bulan) === filterBulan;
    const matchTahun = !filterTahun || String(r.tahun) === filterTahun;
    const matchType = !filterType || typeName === filterType;
    return matchSearch && matchBulan && matchTahun && matchType;
  });

  const handleDelete = async (row: any) => {
    const name = row.inquiry?.companyName || row.inquiry?.customerName;
    const ok = await showConfirm({
      title: "Hapus laporan?",
      message: `Laporan untuk "${name}" akan dihapus permanen.`,
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(row.id);
    try {
      if (row._type === "complete") await api.delete(`/erp/pest-reports/${row.id}`);
      else await api.delete(`/erp/simple-reports/${row.id}`);
      r1(); r2();
    } catch { showAlert({ title: "Gagal menghapus", message: "Gagal menghapus laporan.", tone: "danger" }); }
    finally { setDeletingId(null); }
  };

  const loading = l1 || l2;

  const clientName = completeData?.data?.[0]?.inquiry?.companyName
    || completeData?.data?.[0]?.inquiry?.customerName
    || simpleData?.data?.[0]?.inquiry?.companyName
    || simpleData?.data?.[0]?.inquiry?.customerName;

  return (
    <div>
      {filterInquiryId && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "8px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: "#1e40af" }}>
            Filter client: <b>{clientName || "..."}</b>
          </span>
          <button
            onClick={() => router.push(ROUTES.monthlyReports)}
            style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            × Hapus filter
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: filterInquiryId ? 16 : 8, alignItems: "center" }}>
        {!filterInquiryId && <button className="btn" onClick={() => setShowFilters(v => !v)}>Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}</button>}
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ minHeight: 36 }}>
          + Buat Report {segment}
        </button>
      </div>
      {showFilters && !filterInquiryId && (
        <section className="card p-4" style={{ marginBottom: 16 }}>
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Cari nama client, no. inquiry..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)}>
              <option value="">Semua Bulan</option>
              {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
            <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)}>
              <option value="">Semua Tahun</option>
              {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Semua Jenis</option>
              <option value="complete">Complete</option>
              <option value="simple">Simple</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <p style={{ fontSize: 12, color: "#6b7280" }}>Menampilkan <b>{rows.length}</b> dari {allRows.length} laporan</p>
            <button className="btn" onClick={clearFilters}>Reset Filter</button>
          </div>
        </section>
      )}

      {loading ? <Loading /> : (
        <div className="card overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: NAVY, color: "#fff" }}>
                {["Client", "Periode", "Jenis Report", "Dibuat", "Aksi"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                  Belum ada laporan {segment}. Klik "+ Buat Report" untuk membuat.
                </td></tr>
              )}
              {rows.map((r, i) => {
                const isPending = r._type === "complete" && (r.pagesData as any)?._pending === true;
                return (
                <tr key={`${r._type}-${r.id}`} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <p style={{ fontWeight: 700 }}>{r.inquiry?.companyName || r.inquiry?.customerName}</p>
                    {r.inquiry?.companyName && <p style={{ fontSize: 12, color: "#6b7280" }}>{r.inquiry.customerName}</p>}
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>{r.inquiry?.number}</p>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{MONTHS[(r.bulan ?? 1) - 1]} {r.tahun}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
                      background: isPending ? "#fff7ed" : r._type === "complete" ? "#eff6ff" : "#fef3c7",
                      color:      isPending ? "#c2410c" : r._type === "complete" ? "#1e40af"  : "#92400e",
                    }}>
                      {isPending ? "Pending" : r._type === "complete" ? "Complete" : "Simple"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: 12 }}>
                    {new Date(r.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={r._type === "complete" ? `/monthly-report/${r.id}` : ROUTES.simpleReport(r.id)}
                        className="btn" style={{ minHeight: 30, padding: "4px 12px", fontSize: 12 }}>
                        {isPending ? "Pilih Jenis →" : "Buka"}
                      </Link>
                      <button onClick={() => handleDelete(r)} disabled={deletingId === r.id}
                        style={{ minHeight: 30, padding: "4px 12px", fontSize: 12, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer" }}>
                        {deletingId === r.id ? "..." : "Hapus"}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <CreateModal segment={segment} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function MonthlyReportInner() {
  const searchParams = useSearchParams();
  const filterInquiryId = searchParams.get("inquiry") || null;
  const querySegment = searchParams.get("segment");
  const [segment, setSegment] = useState<"B2C" | "B2B">(querySegment === "B2B" ? "B2B" : "B2C");

  useEffect(() => {
    if (querySegment === "B2B" || querySegment === "B2C") setSegment(querySegment);
  }, [querySegment]);

  return (
    <div className="p-6 md:p-8">
      <PageTitle title="Monthly Report" subtitle="Pest Control Report bulanan per client" />

      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #e5e7eb" }}>
        {(["B2C", "B2B"] as const).map(s => (
          <button key={s} onClick={() => setSegment(s)}
            style={{ padding: "10px 24px", fontWeight: segment === s ? 800 : 500, fontSize: 13,
              color: segment === s ? NAVY : "#6b7280", background: "transparent", border: "none",
              borderBottom: segment === s ? `3px solid ${NAVY}` : "3px solid transparent",
              marginBottom: -2, cursor: "pointer", transition: "all .15s" }}>
            Monthly Report {s}
          </button>
        ))}
      </div>

      <CombinedList key={`${segment}-${filterInquiryId}`} segment={segment} filterInquiryId={filterInquiryId} />
    </div>
  );
}

export default function MonthlyReportPage() {
  return (
    <Suspense fallback={<div className="p-9"><Loading /></div>}>
      <MonthlyReportInner />
    </Suspense>
  );
}
