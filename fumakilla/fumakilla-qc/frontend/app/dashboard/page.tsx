"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loading, PageTitle, useGet } from "@/components/erp/shared";
import { useAuth } from "@/hooks/useAuth";
import { downloadName } from "@/lib/download-name";

const NAVY = "#2c3e5c";
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmtRp = (v: any) => v != null ? "Rp " + Number(v).toLocaleString("id-ID") : "-";
const fmtRpShort = (v: number) => {
  if (!v) return "Rp 0";
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000).toLocaleString("id-ID")} jt`;
  return `Rp ${v.toLocaleString("id-ID")}`;
};
const groupByToMap = (arr: any[], key: string): Record<string, number> =>
  Object.fromEntries(arr.map((r: any) => [r[key], r._count[key]]));

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subLabel, color, bg }: {
  label: string; value: number | string; sub?: number | string; subLabel?: string; color: string; bg: string;
}) {
  return (
    <div className="fk-lift" style={{ position: "relative", background: "#fff", border: "1px solid #e8ebf3", borderRadius: 14, padding: "18px 20px 18px 22px", minWidth: 0, boxShadow: "0 1px 2px rgba(16,24,40,.05)", overflow: "hidden" }}>
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10.5, fontWeight: 800, color: "#8a90a2", textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: color, opacity: .9 }} />
      </div>
      <p style={{ fontSize: 30, fontWeight: 900, color: "#101828", lineHeight: 1.1, marginTop: 10, letterSpacing: "-.02em" }}>{value}</p>
      {sub != null && (
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          <b style={{ color }}>{sub}</b> {subLabel}
        </p>
      )}
    </div>
  );
}

// ─── Trend (line) + Period tiles ───────────────────────────────────────────────

function TrendChart({ data }: { data: any[] }) {
  const chart = (data || []).map((d) => ({ name: MONTHS[d.bulan - 1], Inquiry: d.inquiry, Quotation: d.quotation, Agreement: d.agreement }));
  return (
    <div className="card p-5">
      <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 12 }}>Tren Bulanan — Inquiry, Quotation & Agreement</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chart} margin={{ top: 4, right: 14, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="Inquiry" stroke="#6d28d9" strokeWidth={2.5} dot={{ r: 2.5 }} />
          <Line type="monotone" dataKey="Quotation" stroke="#0369a1" strokeWidth={2.5} dot={{ r: 2.5 }} />
          <Line type="monotone" dataKey="Agreement" stroke="#b45309" strokeWidth={2.5} dot={{ r: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PeriodTiles({ period, label }: { period: any; label: string }) {
  const items = [
    ["Inquiry", period?.inquiry ?? 0, "#6d28d9"], ["Quotation", period?.quotation ?? 0, "#0369a1"],
    ["Order Sheet", period?.orderSheet ?? 0, "#065f46"], ["Agreement", period?.agreement ?? 0, "#b45309"],
    ["Survey", period?.survey ?? 0, "#0f766e"], ["Nilai Kontrak", fmtRpShort(period?.nilai ?? 0), "#92400e"],
  ] as const;
  return (
    <div className="card p-5">
      <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 2 }}>Ringkasan Periode</p>
      <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 14 }}>{label}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {items.map(([l, v, c]) => (
          <div key={l as string} style={{ borderLeft: `3px solid ${c}`, paddingLeft: 12 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#8a90a2", textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: "#101828", lineHeight: 1.2 }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini Pie ────────────────────────────────────────────────────────────────

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#6b7280","#14b8a6"];

function MiniPie({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return (
    <div className="card p-5" style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 12, color: "#9ca3af" }}>{title} — Belum ada data</p>
    </div>
  );
  return (
    <div className="card p-5">
      <p style={{ fontSize: 12, fontWeight: 800, color: NAVY, marginBottom: 12 }}>{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: any) => [`${v} (${Math.round(v / total * 100)}%)`, ""]} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Mini Bar ────────────────────────────────────────────────────────────────

function MiniBar({ title, data, color = "#3b82f6", tickFmt }: {
  title: string; data: { name: string; value: number }[]; color?: string; tickFmt?: (v: number) => string;
}) {
  if (!data.length || !data.some(d => d.value)) return (
    <div className="card p-5" style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 12, color: "#9ca3af" }}>{title} — Belum ada data</p>
    </div>
  );
  return (
    <div className="card p-5">
      <p style={{ fontSize: 12, fontWeight: 800, color: NAVY, marginBottom: 12 }}>{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 8, left: tickFmt ? 10 : -10, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} tickFormatter={tickFmt} />
          <Tooltip formatter={(v: any) => [tickFmt ? tickFmt(v) : v, ""]} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Recent Tables ───────────────────────────────────────────────────────────

const TABS = [
  { key: "customers",      label: "Database Client" },
  { key: "inquiries",      label: "Inquiry" },
  { key: "quotations",     label: "Quotation" },
  { key: "orderSheets",    label: "Order Sheet" },
  { key: "agreements",     label: "Agreement" },
  { key: "monthlyReports", label: "Monthly Report" },
  { key: "surveys",        label: "Survey" },
  { key: "workPlans",      label: "Work Plan" },
] as const;

type TabKey = typeof TABS[number]["key"];

function RecentCustomers({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["Kode","Nama / Perusahaan","Segment","Status","Tgl Daftar"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
          <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#6b7280" }}>{r.code}</td>
          <td style={{ padding: "8px 12px" }}><b>{r.company || r.name}</b>{r.company && <p style={{ fontSize: 11, color: "#9ca3af" }}>{r.name}</p>}</td>
          <td style={{ padding: "8px 12px" }}>{r.segmentType || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.status || "-"}</td>
          <td style={{ padding: "8px 12px", color: "#6b7280" }}>{fmtDate(r.createdAt)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function RecentInquiries({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["No. Inquiry","Customer","Segment","Progress","Result","Tanggal"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: NAVY }}>{r.number}</td>
          <td style={{ padding: "8px 12px" }}><b>{r.companyName || r.customerName}</b></td>
          <td style={{ padding: "8px 12px" }}>{r.segmentType || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.progress || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.result || "-"}</td>
          <td style={{ padding: "8px 12px", color: "#6b7280" }}>{fmtDate(r.inquiryDate)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function RecentQuotations({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["No. Quotation","Customer","Judul","Amount","Status","Tgl Buat"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: NAVY }}>{r.number}</td>
          <td style={{ padding: "8px 12px" }}>{r.customer?.company || r.customer?.name || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.title || "-"}</td>
          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmtRp(r.amount)}</td>
          <td style={{ padding: "8px 12px" }}>{r.status}</td>
          <td style={{ padding: "8px 12px", color: "#6b7280" }}>{fmtDate(r.createdAt)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function RecentOrderSheets({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["No. OS","Customer","Vendor","Status","Grand Total","Tgl Order"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: NAVY }}>{r.number}</td>
          <td style={{ padding: "8px 12px" }}>{r.customer?.name || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.vendor?.name || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.status}</td>
          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmtRp(r.grandTotal)}</td>
          <td style={{ padding: "8px 12px", color: "#6b7280" }}>{fmtDate(r.orderDate)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function RecentAgreements({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["No. Agreement","Customer","Jenis Layanan","Nilai Kontrak","Status","Periode"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: NAVY }}>{r.number}</td>
          <td style={{ padding: "8px 12px" }}>{r.customer?.company || r.customer?.name || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.jenisLayanan}</td>
          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmtRp(r.nilaiKontrak)}</td>
          <td style={{ padding: "8px 12px" }}>{r.status}</td>
          <td style={{ padding: "8px 12px", color: "#6b7280", fontSize: 11 }}>{fmtDate(r.tanggalMulai)} – {fmtDate(r.tanggalBerakhir)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function RecentMonthlyReports({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["Client","Periode","Jenis","Segment","Tgl Buat"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => {
        const typeName = r.isPending ? "Pending" : r._type === "complete" ? "Complete" : "Simple";
        const typeColor = r.isPending ? "#c2410c" : r._type === "complete" ? "#1e40af" : "#92400e";
        const typeBg   = r.isPending ? "#fff7ed"  : r._type === "complete" ? "#eff6ff"  : "#fef3c7";
        return (
          <tr key={`${r._type}-${r.id}`} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
            <td style={{ padding: "8px 12px" }}><b>{r.inquiry?.companyName || r.inquiry?.customerName || "-"}</b></td>
            <td style={{ padding: "8px 12px", fontWeight: 600 }}>{MONTHS[(r.bulan ?? 1) - 1]} {r.tahun}</td>
            <td style={{ padding: "8px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: typeBg, color: typeColor }}>{typeName}</span>
            </td>
            <td style={{ padding: "8px 12px" }}>{r.segment || "-"}</td>
            <td style={{ padding: "8px 12px", color: "#6b7280" }}>{fmtDate(r.createdAt)}</td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

function RecentSurveys({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["No. Survey","Customer","Status","Jadwal"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: NAVY }}>{r.number}</td>
          <td style={{ padding: "8px 12px" }}>{r.customer?.company || r.customer?.name || "-"}</td>
          <td style={{ padding: "8px 12px" }}>{r.status}</td>
          <td style={{ padding: "8px 12px", color: "#6b7280" }}>{fmtDate(r.scheduledAt)}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

const WP_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  PLANNED:     { bg: "#e0f2fe", color: "#0369a1" },
  IN_PROGRESS: { bg: "#fef3c7", color: "#b45309" },
  COMPLETED:   { bg: "#d1fae5", color: "#065f46" },
  CANCELLED:   { bg: "#f3f4f6", color: "#6b7280" },
};

function RecentWorkPlans({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead><tr style={{ background: "#f3f4f6" }}>
        {["Tanggal","Karyawan","Judul / Lokasi","Status","Check-In","Check-Out"].map(h => (
          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>{rows.map((r, i) => {
        const sc = WP_STATUS_COLOR[r.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
        const checkIn  = r.checkpoints?.find((c: any) => c.type === "CHECK_IN");
        const checkOut = r.checkpoints?.find((c: any) => c.type === "CHECK_OUT");
        return (
          <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 ? "#fff" : "#f9fafb" }}>
            <td style={{ padding: "8px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(r.workDate)}</td>
            <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.owner?.name || "-"}</td>
            <td style={{ padding: "8px 12px" }}>
              <b>{r.title}</b>
              {r.location && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{r.location}</p>}
            </td>
            <td style={{ padding: "8px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: sc.bg, color: sc.color }}>{r.status}</span>
            </td>
            <td style={{ padding: "8px 12px" }}>
              {checkIn
                ? <span style={{ color: "#065f46", fontWeight: 600 }}>✓ {new Date(checkIn.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                : <span style={{ color: "#ef4444" }}>✗ Belum</span>}
            </td>
            <td style={{ padding: "8px 12px" }}>
              {checkOut
                ? <span style={{ color: "#065f46", fontWeight: 600 }}>✓ {new Date(checkOut.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                : <span style={{ color: "#9ca3af" }}>— Belum</span>}
            </td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

function Empty() {
  return <p style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Belum ada data.</p>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { data, loading } = useGet<any>("/erp/admin-dashboard");
  const router = useRouter();

  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "">("");
  const { data: pdata } = useGet<any>(`/erp/admin-dashboard/period?year=${year}${month ? `&month=${month}` : ""}`);
  const periodLabel = month ? `${MONTHS[Number(month) - 1]} ${year}` : `Tahun ${year}`;
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const exportPdf = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = canvas.height * pageW / canvas.width;
      let y = 0;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, y, pageW, imgH);
      let remaining = imgH - pageH;
      while (remaining > 0) { y -= pageH; pdf.addPage(); pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, y, pageW, imgH); remaining -= pageH; }
      pdf.save(downloadName({ doc: "Dashboard C-Level", info: periodLabel, ext: "pdf" }));
    } finally { setExporting(false); }
  };
  const [tab, setTab] = useState<TabKey>("customers");

  const canViewDashboard = user?.permissions?.includes("dashboard.view");

  useEffect(() => {
    if (!authLoading && user && !canViewDashboard) {
      router.replace("/inquiries");
    }
  }, [authLoading, user, canViewDashboard, router]);

  if (authLoading) return <div className="p-9"><Loading /></div>;
  if (!user || !canViewDashboard) return null;

  const s = data?.summary;
  const r = data?.recent;

  // Chart data
  const customerPieData  = s?.customers?.byStatus    ? Object.entries(groupByToMap(s.customers.byStatus, "status")).map(([name, value]) => ({ name, value })) : [];
  const segmentPieData   = s?.customers?.bySegment   ? Object.entries(groupByToMap(s.customers.bySegment, "segmentType")).map(([name, value]) => ({ name, value })) : [];
  const agreementBarData = s?.agreements?.byStatus   ? Object.entries(groupByToMap(s.agreements.byStatus, "status")).map(([name, value]) => ({ name, value })) : [];
  const mrPieData = s?.monthlyReports ? [
    { name: "Complete", value: s.monthlyReports.complete ?? 0 },
    { name: "Simple",   value: s.monthlyReports.simple   ?? 0 },
    { name: "Pending",  value: s.monthlyReports.pending  ?? 0 },
  ] : [];
  const nilaiByJenisData = Array.isArray(s?.agreements?.nilaiByJenis)
    ? (s.agreements.nilaiByJenis as any[]).map((r: any) => ({
        name: r.jenisLayanan,
        value: Number(r._sum?.nilaiKontrak || 0),
      })).filter((d: any) => d.value > 0)
    : [];

  return (
    <div className="p-6 md:p-8">
      <PageTitle
        title="Dashboard C-Level"
        subtitle={`Ringkasan kinerja Fumakilla · ${periodLabel}`}
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 110 }}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <select value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")} style={{ width: 150 }}><option value="">Semua bulan</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <button className="btn btn-primary" disabled={exporting} onClick={exportPdf}>{exporting ? "Menyiapkan…" : "⬇ Export PDF"}</button>
          </div>
        }
      />

      <div ref={contentRef}>
      {loading ? <div className="mt-8"><Loading /></div> : !s ? (
        <div className="card mt-8 p-10 text-center text-sm text-ts">Gagal memuat data dashboard.</div>
      ) : (
        <>
          {/* ── Ringkasan Periode + Tren ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 12, margin: "22px 0 12px" }}>
            <PeriodTiles period={pdata?.period} label={periodLabel} />
            <TrendChart data={pdata?.trend} />
          </div>

          {/* ── Stat Cards Row 1 ── */}
          <div className="fk-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "24px 0 10px" }}>
            <StatCard label="Database Client"  value={s.customers.total}      sub={s.customers.byStatus.find((x: any) => x.status === "Kontrak")?._count?.status ?? 0} subLabel="kontrak aktif" color="#1e40af" bg="#eff6ff" />
            <StatCard label="Inquiry"           value={s.inquiries.total}      sub={s.inquiries.thisMonth}     subLabel="bulan ini"  color="#6d28d9" bg="#f5f3ff" />
            <StatCard label="Quotation"         value={s.quotations.total}     sub={s.quotations.byStatus.find((x: any) => x.status === "APPROVED")?._count?.status ?? 0} subLabel="disetujui" color="#0369a1" bg="#e0f2fe" />
            <StatCard label="Order Sheet"       value={s.orderSheets.total}    sub={s.orderSheets.completed}   subLabel="completed"  color="#065f46" bg="#d1fae5" />
          </div>
          {/* ── Stat Cards Row 2 ── */}
          <div className="fk-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            <StatCard label="Agreement"         value={s.agreements.total}     sub={s.agreements.active}       subLabel="aktif"      color="#b45309" bg="#fef3c7" />
            <StatCard label="Nilai Kontrak Aktif" value={fmtRpShort(s.agreements?.nilaiKontrakAktif ?? 0)} sub={fmtRpShort(s.agreements?.nilaiKontrakTotal ?? 0)} subLabel="total semua" color="#92400e" bg="#fff7ed" />
            <StatCard label="Monthly Report"    value={s.monthlyReports.total} sub={s.monthlyReports.pending}  subLabel="pending"    color="#be185d" bg="#fdf2f8" />
            <StatCard label="Survey"            value={s.surveys.total}        sub={s.surveys.done}            subLabel="selesai"    color="#0f766e" bg="#ccfbf1" />
          </div>

          {/* ── Charts Row 1 ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <MiniPie title="Customer by Status"       data={customerPieData} />
            <MiniPie title="Customer by Segment"      data={segmentPieData} />
            <MiniBar title="Agreement by Status"      data={agreementBarData} color="#b45309" />
            <MiniPie title="Monthly Report by Jenis"  data={mrPieData} />
          </div>
          {/* ── Charts Row 2 — Nilai Kontrak ── */}
          <div style={{ marginBottom: 24 }}>
            <MiniBar
              title="Nilai Kontrak per Jenis Layanan (Rp)"
              data={nilaiByJenisData}
              color="#0369a1"
              tickFmt={(v) => fmtRpShort(v)}
            />
          </div>

          {/* ── Recent 20 ── */}
          <div className="card overflow-hidden">
            <div style={{ borderBottom: "1px solid #e5e7eb", padding: "0 16px", display: "flex", gap: 2, overflowX: "auto" }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    padding: "12px 16px", fontSize: 12, fontWeight: tab === t.key ? 800 : 500,
                    color: tab === t.key ? NAVY : "#6b7280", background: "transparent", border: "none",
                    borderBottom: tab === t.key ? `3px solid ${NAVY}` : "3px solid transparent",
                    marginBottom: -1, cursor: "pointer", whiteSpace: "nowrap",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ padding: "4px 0" }}>
              <p style={{ fontSize: 11, color: "#9ca3af", padding: "8px 16px 4px" }}>20 data terbaru</p>
              <div style={{ overflowX: "auto" }}>
                {tab === "customers"      && <RecentCustomers      rows={r?.customers      ?? []} />}
                {tab === "inquiries"      && <RecentInquiries      rows={r?.inquiries      ?? []} />}
                {tab === "quotations"     && <RecentQuotations     rows={r?.quotations     ?? []} />}
                {tab === "orderSheets"    && <RecentOrderSheets    rows={r?.orderSheets    ?? []} />}
                {tab === "agreements"     && <RecentAgreements     rows={r?.agreements     ?? []} />}
                {tab === "monthlyReports" && <RecentMonthlyReports rows={r?.monthlyReports ?? []} />}
                {tab === "surveys"        && <RecentSurveys        rows={r?.surveys        ?? []} />}
                {tab === "workPlans"      && <RecentWorkPlans      rows={r?.workPlans      ?? []} />}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
