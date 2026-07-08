"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Loading, useGet } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import { showAlert, showConfirm } from "@/lib/app-modal";

const NAVY = "#2c3e5c";
const money = (v: any) => `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
const dateLabel = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ borderRadius: 6, border: "1px solid #e5e7eb", padding: "8px 12px" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{value || "-"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
      <h3 style={{ fontWeight: 800, fontSize: 13, color: NAVY, marginBottom: 12 }}>{title}</h3>
      {children}
    </section>
  );
}

function PreviewTable({ cols, rows }: { cols: [string, string][]; rows: any[] }) {
  if (!rows?.length) return <p style={{ fontSize: 12, color: "#9ca3af" }}>-</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ padding: "6px 10px", textAlign: "left" }}>No</th>
            {cols.map(([, label]) => <th key={label} style={{ padding: "6px 10px", textAlign: "left" }}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 10px" }}>{i + 1}</td>
              {cols.map(([key]) => <td key={key} style={{ padding: "6px 10px" }}>{row[key] || "-"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT:      { bg: "#f3f4f6", color: "#374151" },
  FINAL:      { bg: "#dbeafe", color: "#1e40af" },
  SENT:       { bg: "#fef3c7", color: "#92400e" },
  COMPLETED:  { bg: "#d1fae5", color: "#065f46" },
  CANCELLED:  { bg: "#fee2e2", color: "#991b1b" },
};

export default function OrderSheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: os, loading } = useGet<any>(`/erp/order-sheets/${id}`);
  const [deleting, setDeleting] = useState(false);

  if (loading) return <div className="p-9"><Loading /></div>;
  if (!os) return <div className="p-9" style={{ color: "#9ca3af" }}>Order Sheet tidak ditemukan.</div>;

  const snap = os.customerSnapshot || {};
  const statusStyle = STATUS_COLORS[os.status] ?? STATUS_COLORS.DRAFT;

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: "Hapus Order Sheet?",
      message: `Order Sheet ${os.number} akan dihapus permanen.`,
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/erp/order-sheets/${id}`);
      router.push(ROUTES.orderSheets);
    } catch { showAlert({ title: "Gagal menghapus", message: "Gagal menghapus.", tone: "danger" }); setDeleting(false); }
  };

  return (
    <div className="p-6 md:p-8" style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <Link href={ROUTES.orderSheets} style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>← Kembali ke Order Sheet</Link>
          <h1 style={{ fontWeight: 900, fontSize: 22, color: NAVY, marginTop: 6 }}>{os.number}</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{dateLabel(os.orderDate)} · {os.jobTitle || "-"}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>
            {os.status}
          </span>
          <Link
            href={`${ROUTES.orderSheets}?edit=${id}`}
            className="btn"
            style={{ fontSize: 12, minHeight: 32, padding: "4px 14px" }}
            title="Kembali ke list dan buka form edit"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ fontSize: 12, minHeight: 32, padding: "4px 14px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer" }}
          >
            {deleting ? "..." : "Hapus"}
          </button>
        </div>
      </div>

      {/* Meta */}
      <Section title="Informasi Order Sheet">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <Row label="No. OS/PO" value={os.number} />
          <Row label="Tanggal" value={dateLabel(os.orderDate)} />
          <Row label="Dibuat oleh" value={os.createdByName} />
          <Row label="PIC Internal" value={os.picInternal} />
          <Row label="Vendor" value={os.vendor?.name} />
          <Row label="Ref. Agreement" value={os.agreementRef} />
          <Row label="Ref. Quotation" value={os.quotationRef} />
          <Row label="Status" value={os.status} />
        </div>
      </Section>

      {/* Customer */}
      <Section title="1. Data Customer">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <Row label="Nama Customer" value={snap.name || os.customer?.name} />
          <Row label="PIC Customer" value={snap.picName} />
          <Row label="Alamat Lokasi Service" value={snap.address} />
          <Row label="No. Telepon" value={snap.phone} />
          <Row label="Email" value={snap.email} />
          <Row label="Jenis Customer" value={snap.customerType || os.customer?.customerType} />
        </div>
        {os.customerId && (
          <div style={{ marginTop: 10 }}>
            <Link href={ROUTES.customer(os.customerId)} style={{ fontSize: 12, color: "#285f90", fontWeight: 700 }}>
              Lihat profil lengkap di Database Client →
            </Link>
          </div>
        )}
      </Section>

      {/* Pekerjaan */}
      <Section title="2. Detail Pekerjaan">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <Row label="Jenis Pekerjaan" value={os.jobTitle} />
          <Row label="Jenis Service" value={os.serviceType} />
          <Row label="Metode" value={os.workMethod} />
          <Row label="Prioritas" value={os.priority} />
          <Row label="Tanggal Pengerjaan" value={dateLabel(os.workDate)} />
          <Row label="Jam Pengerjaan" value={os.workTime} />
          <Row label="Estimasi Durasi" value={os.estimatedDuration} />
          <Row label="Jumlah Teknisi" value={os.technicianCount} />
        </div>
        {os.jobDescription && <div style={{ marginTop: 10, padding: "10px 12px", background: "#f9fafb", borderRadius: 6, fontSize: 13 }}>{os.jobDescription}</div>}
        {os.specialInstruction && <div style={{ marginTop: 8, padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, fontSize: 13 }}><b>Instruksi Khusus:</b> {os.specialInstruction}</div>}
      </Section>

      {/* Tables */}
      <Section title="3. Detail Lokasi Treatment">
        <PreviewTable rows={os.treatmentLocations || []} cols={[["area", "Area"], ["treatmentType", "Jenis Treatment"], ["notes", "Keterangan"]]} />
      </Section>
      <Section title="4. Material / Chemical / Peralatan">
        <PreviewTable rows={os.materials || []} cols={[["name", "Nama Material / Alat"], ["qty", "Qty"], ["unit", "Satuan"], ["notes", "Keterangan"]]} />
      </Section>
      <Section title="5. Tenaga Kerja Vendor">
        <PreviewTable rows={os.vendorTechnicians || []} cols={[["name", "Nama Teknisi"], ["position", "Posisi"], ["phone", "No. HP"]]} />
      </Section>

      {/* Biaya */}
      <Section title="6. Nilai Pekerjaan">
        <PreviewTable rows={os.costItems || []} cols={[["description", "Deskripsi"], ["qty", "Qty"], ["unitPrice", "Harga Satuan"], ["total", "Total"]]} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 12, fontSize: 13, fontWeight: 700 }}>
          <span>Subtotal: {money(os.subtotal)}</span>
          <span>PPN {os.ppnPercent || 0}%: {money(os.ppnAmount)}</span>
          <span style={{ color: NAVY, fontSize: 15 }}>Grand Total: {money(os.grandTotal)}</span>
        </div>
      </Section>

      {/* S&K */}
      <Section title="7. Syarat dan Ketentuan">
        <ol style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
          {(os.terms || []).map((t: string, i: number) => <li key={i}>{t}</li>)}
        </ol>
      </Section>

      {/* Dokumen pendukung */}
      <Section title="8. Dokumen Pendukung">
        <PreviewTable rows={os.supportingDocuments || []} cols={[["name", "Dokumen"], ["status", "Status / Keterangan"]]} />
      </Section>

      {/* Approval */}
      <Section title="9. Approval">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center" }}>
          {[
            ["Dibuat oleh", os.preparedByName, os.preparedAt],
            ["Disetujui oleh", os.approvedByName, os.approvedAt],
            ["Diterima oleh Vendor", os.receivedByName, os.receivedAt],
          ].map(([label, name, at]) => (
            <div key={label as string} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 12px" }}>
              <p style={{ fontWeight: 700, fontSize: 13 }}>{label}</p>
              <div style={{ padding: "28px 0", color: "#9ca3af" }}>(tanda tangan)</div>
              <p style={{ fontSize: 12 }}>Nama: <b>{name || "-"}</b></p>
              <p style={{ fontSize: 12 }}>Tanggal: {dateLabel(at as string)}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
