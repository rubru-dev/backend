"use client";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const COMPANY = {
  name: "RubahRumah",
  tagline: "Platform Desain and Build",
  address: "Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116",
  phone: "0813-7640-5550",
  email: "info.rubahrumah@gmail.com",
};

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_MID = "#fed7aa";
const DARK = "#1c1917";
const GRAY = "#78716c";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, color: DARK, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: ORANGE },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 48, height: 48, objectFit: "contain" },
  companyName: { fontSize: 15, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 17, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSub: { fontSize: 8.5, color: GRAY, marginTop: 2 },
  accentBar: { height: 3, backgroundColor: ORANGE, borderRadius: 2, marginTop: 8, marginBottom: 12 },

  infoRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  infoBox: { flex: 1, backgroundColor: ORANGE_LIGHT, padding: 7, borderRadius: 3 },
  infoLabel: { fontSize: 6.5, color: ORANGE, fontWeight: "bold", marginBottom: 1 },
  infoValue: { fontSize: 8.5, color: DARK, fontWeight: "bold" },

  // Per-termin section
  terminCard: { marginBottom: 14, borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 4 },
  terminHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: ORANGE_MID, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3 },
  terminName: { fontSize: 10, fontWeight: "bold", color: DARK },
  terminDate: { fontSize: 8, color: GRAY },
  terminBadge: { fontSize: 7.5, color: ORANGE, fontWeight: "bold" },

  depositRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  depositLabel: { fontSize: 8, color: DARK },
  depositValue: { fontSize: 8, color: DARK, fontWeight: "bold" },
  depositBadge: { fontSize: 6.5, color: "#16a34a" },

  tableHead: { flexDirection: "row", backgroundColor: ORANGE, paddingVertical: 4, paddingHorizontal: 8 },
  tableHeadCell: { color: "white", fontSize: 7.5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4", backgroundColor: ORANGE_LIGHT },
  cellText: { fontSize: 7.5, color: DARK },
  colNo: { width: 18 },
  colPR: { width: 65 },
  colKet: { flex: 1 },
  colTgl: { width: 62 },
  colAmt: { width: 80, textAlign: "right" },
  colSaldo: { width: 80, textAlign: "right" },

  terminSummary: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 4, paddingHorizontal: 8, gap: 16 },
  summItem: { flexDirection: "row", gap: 4, alignItems: "center" },
  summLabel: { fontSize: 7.5, color: GRAY },
  summValue: { fontSize: 7.5, color: DARK, fontWeight: "bold" },

  emptyRow: { paddingVertical: 6, paddingHorizontal: 8 },

  grandTotal: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  grandTotalBox: { backgroundColor: ORANGE, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 12, flexDirection: "row", gap: 20, alignItems: "center" },
  grandTotalLabel: { fontSize: 9, color: "white", fontWeight: "bold" },
  grandTotalValue: { fontSize: 9, color: "white", fontWeight: "bold" },
});

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export interface CashflowOverviewPDFProps {
  project: { nama_proyek?: string | null; klien?: string | null; lokasi?: string | null };
  termins: {
    id: number;
    nama_termin: string;
    tanggal?: string | Date | null;
    deposit_awal: number;
    hf_signed_at?: string | null;
    hf_name?: string | null;
    deposits: { jumlah: number; catatan?: string | null; hf_signed_at?: string | null; hf_name?: string | null }[];
    items: { id: number; tanggal: string | Date; no_pr?: string | null; keterangan?: string | null; debit: number }[];
    summary: { total_deposit: number; total_debit: number; sisa: number };
  }[];
  grand_summary: { total_deposit: number; total_debit: number; sisa: number };
}

export default function CashflowOverviewPDF({ project, termins, grand_summary }: CashflowOverviewPDFProps) {
  const logoUrl = typeof window !== "undefined" ? window.location.origin + "/images/logo.png" : "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBlock}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <View>
              <Text style={styles.companyName}>{COMPANY.name}</Text>
              <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={styles.companyContact}>{COMPANY.address}</Text>
              <Text style={styles.companyContact}>T: {COMPANY.phone} | E: {COMPANY.email}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.docTitle}>CASHFLOW PROYEK</Text>
            <Text style={styles.docSub}>Ringkasan Semua Termin</Text>
          </View>
        </View>

        <View style={styles.accentBar} />

        {/* Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>NAMA PROYEK</Text>
            <Text style={styles.infoValue}>{project.nama_proyek || "-"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>KLIEN</Text>
            <Text style={styles.infoValue}>{project.klien || "-"}</Text>
          </View>
          <View style={[styles.infoBox, { flex: 0.8 }]}>
            <Text style={styles.infoLabel}>TOTAL TERMIN</Text>
            <Text style={styles.infoValue}>{termins.length} termin</Text>
          </View>
        </View>

        {/* Termin Cards */}
        {termins.map((termin) => {
          let saldo = termin.summary.total_deposit;
          return (
            <View key={termin.id} style={styles.terminCard} wrap={false}>
              {/* Termin header */}
              <View style={styles.terminHeader}>
                <View>
                  <Text style={styles.terminName}>{termin.nama_termin}</Text>
                  {termin.tanggal && <Text style={styles.terminDate}>{formatDate(termin.tanggal)}</Text>}
                </View>
                <Text style={styles.terminBadge}>Sisa: {formatRp(termin.summary.sisa)}</Text>
              </View>

              {/* Deposit Awal */}
              <View style={styles.depositRow}>
                <View>
                  <Text style={styles.depositLabel}>Deposit Awal</Text>
                  {termin.hf_name
                    ? <Text style={styles.depositBadge}>✓ {termin.hf_name} — {formatDate(termin.hf_signed_at)}</Text>
                    : <Text style={[styles.depositBadge, { color: "#d97706" }]}>⏳ Menunggu TTD HF</Text>}
                </View>
                <Text style={styles.depositValue}>{formatRp(termin.deposit_awal)}</Text>
              </View>

              {/* Extra deposits */}
              {termin.deposits.map((d, i) => (
                <View key={i} style={styles.depositRow}>
                  <View>
                    <Text style={styles.depositLabel}>Deposit Tambahan {i + 1}{d.catatan ? ` — ${d.catatan}` : ""}</Text>
                    {d.hf_name
                      ? <Text style={styles.depositBadge}>✓ {d.hf_name} — {formatDate(d.hf_signed_at)}</Text>
                      : <Text style={[styles.depositBadge, { color: "#d97706" }]}>⏳ Menunggu TTD HF</Text>}
                  </View>
                  <Text style={styles.depositValue}>{formatRp(d.jumlah)}</Text>
                </View>
              ))}

              {/* Items table */}
              {termin.items.length > 0 && (
                <>
                  <View style={styles.tableHead}>
                    <Text style={[styles.tableHeadCell, styles.colNo]}>No</Text>
                    <Text style={[styles.tableHeadCell, styles.colPR]}>No. PR</Text>
                    <Text style={[styles.tableHeadCell, styles.colKet]}>Keperluan</Text>
                    <Text style={[styles.tableHeadCell, styles.colTgl]}>Tanggal</Text>
                    <Text style={[styles.tableHeadCell, styles.colAmt]}>Jumlah</Text>
                    <Text style={[styles.tableHeadCell, styles.colSaldo]}>Sisa Saldo</Text>
                  </View>
                  {termin.items.map((item, i) => {
                    saldo -= item.debit;
                    const Row = i % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
                    return (
                      <View key={item.id} style={Row}>
                        <Text style={[styles.cellText, styles.colNo]}>{i + 1}</Text>
                        <Text style={[styles.cellText, styles.colPR]}>{item.no_pr || "-"}</Text>
                        <Text style={[styles.cellText, styles.colKet]}>{item.keterangan || "-"}</Text>
                        <Text style={[styles.cellText, styles.colTgl]}>{formatDate(item.tanggal)}</Text>
                        <Text style={[styles.cellText, styles.colAmt]}>{formatRp(item.debit)}</Text>
                        <Text style={[styles.cellText, styles.colSaldo]}>{formatRp(saldo)}</Text>
                      </View>
                    );
                  })}
                </>
              )}
              {termin.items.length === 0 && (
                <View style={styles.emptyRow}>
                  <Text style={{ fontSize: 7.5, color: GRAY, textAlign: "center" }}>Belum ada pengeluaran</Text>
                </View>
              )}

              {/* Termin summary */}
              <View style={styles.terminSummary}>
                <View style={styles.summItem}>
                  <Text style={styles.summLabel}>Deposit Tersedia:</Text>
                  <Text style={[styles.summValue, { color: "#16a34a" }]}>{formatRp(termin.summary.total_deposit)}</Text>
                </View>
                <View style={styles.summItem}>
                  <Text style={styles.summLabel}>Pengeluaran:</Text>
                  <Text style={[styles.summValue, { color: "#dc2626" }]}>{formatRp(termin.summary.total_debit)}</Text>
                </View>
                <View style={styles.summItem}>
                  <Text style={styles.summLabel}>Sisa:</Text>
                  <Text style={[styles.summValue, { color: termin.summary.sisa >= 0 ? "#1d4ed8" : "#ea580c" }]}>{formatRp(termin.summary.sisa)}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Grand Total */}
        <View style={styles.grandTotal}>
          <View style={styles.grandTotalBox}>
            <View>
              <Text style={styles.grandTotalLabel}>Total Deposit (Disetujui)</Text>
              <Text style={styles.grandTotalValue}>{formatRp(grand_summary.total_deposit)}</Text>
            </View>
            <View>
              <Text style={styles.grandTotalLabel}>Total Pengeluaran</Text>
              <Text style={styles.grandTotalValue}>{formatRp(grand_summary.total_debit)}</Text>
            </View>
            <View>
              <Text style={styles.grandTotalLabel}>Sisa Keseluruhan</Text>
              <Text style={styles.grandTotalValue}>{formatRp(grand_summary.sisa)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
