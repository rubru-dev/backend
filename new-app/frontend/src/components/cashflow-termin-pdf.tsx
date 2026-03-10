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
const DARK = "#1c1917";
const GRAY = "#78716c";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: DARK, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 0, paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 20, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSub: { fontSize: 9, color: GRAY, marginTop: 3 },
  accentBar: { height: 4, backgroundColor: ORANGE, marginBottom: 16, borderRadius: 2, marginTop: 8 },

  infoRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  infoBox: { flex: 1, backgroundColor: ORANGE_LIGHT, padding: 8, borderRadius: 4 },
  infoLabel: { fontSize: 7, color: ORANGE, fontWeight: "bold", marginBottom: 2 },
  infoValue: { fontSize: 9, color: DARK, fontWeight: "bold" },

  sectionTitle: { fontSize: 10, fontWeight: "bold", color: ORANGE, marginBottom: 6, marginTop: 12 },
  depositCard: { flexDirection: "row", justifyContent: "space-between", backgroundColor: ORANGE_LIGHT, padding: 8, borderRadius: 4, marginBottom: 4 },
  depositLabel: { fontSize: 9, color: DARK },
  depositValue: { fontSize: 9, color: DARK, fontWeight: "bold" },
  depositBadge: { fontSize: 7, color: "#16a34a", marginTop: 2 },

  table: { marginTop: 4 },
  tableHead: { flexDirection: "row", backgroundColor: ORANGE, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 3 },
  tableHeadCell: { color: "white", fontSize: 8.5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT },
  cellText: { fontSize: 8.5, color: DARK },
  colNo: { width: 28 },
  colPR: { width: 70 },
  colKet: { flex: 1 },
  colTgl: { width: 70 },
  colAmt: { width: 90, textAlign: "right" },
  colSaldo: { width: 90, textAlign: "right" },

  summaryRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  summaryBox: { width: 260 },
  summLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  summLineTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, backgroundColor: ORANGE, paddingHorizontal: 6, borderRadius: 3, marginTop: 2 },
  summLabel: { fontSize: 9, color: DARK },
  summValue: { fontSize: 9, color: DARK, fontWeight: "bold" },
  summLabelW: { fontSize: 9, color: "white", fontWeight: "bold" },
  summValueW: { fontSize: 9, color: "white", fontWeight: "bold" },

  footer: { marginTop: 32, flexDirection: "row", justifyContent: "flex-end" },
  signBox: { width: 180, alignItems: "center" },
  signTitle: { fontSize: 9, color: DARK, marginBottom: 40 },
  signLine: { width: 160, borderTopWidth: 1, borderTopColor: DARK, paddingTop: 4, alignItems: "center" },
  signName: { fontSize: 9, fontWeight: "bold", color: DARK },
  signDate: { fontSize: 7.5, color: GRAY, marginTop: 2 },
});

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

export interface CashflowTerminPDFProps {
  logoUrl?: string;
  project: { nama_proyek?: string | null; klien?: string | null; jenis?: string | null; lokasi?: string | null };
  termin: {
    nama_termin: string;
    deposit_awal: number;
    hf_signed_at?: string | null;
    hf_name?: string | null;
    hf_signature?: string | null;
    deposits: { jumlah: number; catatan?: string | null; hf_signed_at?: string | null; hf_name?: string | null; hf_signature?: string | null }[];
  };
  items: { id: number; tanggal: string | Date; no_pr?: string | null; keterangan?: string | null; debit: number; nota_image?: string | null }[];
  summary: { total_deposit: number; total_debit: number; sisa: number };
}

export default function CashflowTerminPDF({ project, termin, items, summary, logoUrl }: CashflowTerminPDFProps) {
  let saldo = summary.total_deposit;

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
            <Text style={styles.docTitle}>CASHFLOW</Text>
            <Text style={styles.docSub}>{termin.nama_termin}</Text>
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
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>LOKASI</Text>
            <Text style={styles.infoValue}>{project.lokasi || "-"}</Text>
          </View>
        </View>

        {/* Deposit Section */}
        <Text style={styles.sectionTitle}>DEPOSIT</Text>
        <View style={styles.depositCard}>
          <View>
            <Text style={styles.depositLabel}>Deposit Awal</Text>
            {termin.hf_name && <Text style={styles.depositBadge}>✓ {termin.hf_name} — {formatDate(termin.hf_signed_at)}</Text>}
          </View>
          <Text style={styles.depositValue}>{formatRp(termin.deposit_awal)}</Text>
        </View>
        {termin.deposits.map((d, i) => (
          <View key={i} style={styles.depositCard}>
            <View>
              <Text style={styles.depositLabel}>Deposit Tambahan {i + 1}{d.catatan ? ` — ${d.catatan}` : ""}</Text>
              {d.hf_name && <Text style={styles.depositBadge}>✓ {d.hf_name} — {formatDate(d.hf_signed_at)}</Text>}
            </View>
            <Text style={styles.depositValue}>{formatRp(d.jumlah)}</Text>
          </View>
        ))}

        {/* Items Table */}
        <Text style={styles.sectionTitle}>RINCIAN PENGELUARAN</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.colNo]}>No</Text>
            <Text style={[styles.tableHeadCell, styles.colPR]}>No. PR</Text>
            <Text style={[styles.tableHeadCell, styles.colKet]}>Keperluan</Text>
            <Text style={[styles.tableHeadCell, styles.colTgl]}>Tanggal</Text>
            <Text style={[styles.tableHeadCell, styles.colAmt]}>Jumlah</Text>
            <Text style={[styles.tableHeadCell, styles.colSaldo]}>Sisa Saldo</Text>
          </View>
          {items.map((item, i) => {
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
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <View style={styles.summLine}>
              <Text style={styles.summLabel}>Total Deposit</Text>
              <Text style={styles.summValue}>{formatRp(summary.total_deposit)}</Text>
            </View>
            <View style={styles.summLine}>
              <Text style={styles.summLabel}>Total Pengeluaran</Text>
              <Text style={styles.summValue}>{formatRp(summary.total_debit)}</Text>
            </View>
            <View style={styles.summLineTotal}>
              <Text style={styles.summLabelW}>Sisa Saldo</Text>
              <Text style={styles.summValueW}>{formatRp(summary.sisa)}</Text>
            </View>
          </View>
        </View>

        {/* Signature */}
        {termin.hf_name && (
          <View style={styles.footer}>
            <View style={styles.signBox}>
              <Text style={styles.signTitle}>Head Finance</Text>
              {termin.hf_signature && (
                <Image src={termin.hf_signature} style={{ width: 100, height: 50, objectFit: "contain", marginBottom: 4 }} />
              )}
              <View style={styles.signLine}>
                <Text style={styles.signName}>{termin.hf_name}</Text>
                <Text style={styles.signDate}>{formatDate(termin.hf_signed_at)}</Text>
              </View>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
