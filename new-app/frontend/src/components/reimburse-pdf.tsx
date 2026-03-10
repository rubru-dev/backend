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
  page: { padding: 48, fontSize: 10, color: DARK, backgroundColor: "#ffffff" },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 20,
  },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  companyInfo: { justifyContent: "center" },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 22, fontWeight: "bold", color: ORANGE, letterSpacing: 2 },
  docSub: { fontSize: 9, color: GRAY, marginTop: 3 },

  // Info block
  infoCard: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 6, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: ORANGE,
  },
  infoRow: { flexDirection: "row", marginBottom: 6 },
  infoLabel: { fontSize: 8, color: ORANGE, fontWeight: "bold", width: 120 },
  infoValue: { fontSize: 9, color: DARK, flex: 1, fontWeight: "bold" },
  infoSub: { fontSize: 8, color: GRAY },

  // Table
  table: { marginBottom: 12 },
  tableHead: {
    flexDirection: "row", backgroundColor: ORANGE,
    paddingVertical: 6, paddingHorizontal: 8, borderRadius: 3,
  },
  tableHeadCell: { color: "white", fontSize: 8.5, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT,
  },
  colDesc: { flex: 3 },
  colAmt: { flex: 1.5, textAlign: "right" },
  cellText: { fontSize: 9, color: DARK },

  // Total box
  totalBox: {
    flexDirection: "row", justifyContent: "flex-end", marginTop: 4,
  },
  totalInner: {
    backgroundColor: ORANGE, borderRadius: 4, padding: "8 14",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", minWidth: 220,
  },
  totalLabel: { fontSize: 11, color: "white", fontWeight: "bold" },
  totalValue: { fontSize: 14, color: "white", fontWeight: "bold" },

  // Signatures
  signRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 32 },
  signBlock: { alignItems: "center", width: 180 },
  signTitleBox: {
    backgroundColor: ORANGE, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 2, marginBottom: 8,
  },
  signTitleText: { fontSize: 8, color: "white", fontWeight: "bold" },
  signImage: { width: 140, height: 60, objectFit: "contain", marginBottom: 6 },
  signImageEmpty: { width: 140, height: 60, borderBottomWidth: 1, borderBottomColor: "#d4d4d4", marginBottom: 6 },
  signName: { fontSize: 9, fontWeight: "bold", color: DARK },
  signDate: { fontSize: 7.5, color: GRAY, marginTop: 2 },

  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 16 },

  footer: {
    position: "absolute", bottom: 24, left: 48, right: 48,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 6,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: GRAY },

  // Bukti lampiran page
  buktiTitle: { fontSize: 11, color: ORANGE, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  buktiImage: { maxWidth: 460, maxHeight: 520, objectFit: "contain", marginBottom: 16, alignSelf: "center" },
  buktiImageBox: {
    borderWidth: 1, borderColor: ORANGE_MID, borderRadius: 6,
    padding: 10, backgroundColor: "#ffffff", alignItems: "center", marginBottom: 16,
  },
  buktiNama: { fontSize: 8, color: GRAY, textAlign: "center", marginTop: 4 },
});

function formatRp(val: number) {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}
function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export interface ReimburseItem {
  deskripsi: string | null;
  jumlah: number;
}
export interface ReimburseBukti {
  data: string;
  nama: string | null;
}
export interface SignatureInfo {
  name: string;
  at: string | Date | null;
  signature: string | null;
}
// ── Bulk PDF ──────────────────────────────────────────────────────────────────
const bulkStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: DARK, backgroundColor: "#ffffff" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 16,
  },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 44, height: 44, objectFit: "contain" },
  companyInfo: { justifyContent: "center" },
  companyName: { fontSize: 14, fontWeight: "bold", color: ORANGE },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 18, fontWeight: "bold", color: ORANGE, letterSpacing: 2 },
  docSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  filterInfo: { fontSize: 8, color: GRAY, marginBottom: 12 },
  tableHead: {
    flexDirection: "row", backgroundColor: ORANGE,
    paddingVertical: 6, paddingHorizontal: 8, borderRadius: 3,
  },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT },
  headCell: { color: "white", fontSize: 8, fontWeight: "bold" },
  cell: { fontSize: 8.5, color: DARK },
  colNo: { width: 24 },
  colDate: { width: 70 },
  colName: { flex: 2 },
  colKat: { flex: 1 },
  colStatus: { width: 60 },
  colTotal: { flex: 1.2, textAlign: "right" },
  totalRow: {
    flexDirection: "row", justifyContent: "flex-end",
    backgroundColor: ORANGE, borderRadius: 3, padding: "6 10", marginTop: 8,
  },
  totalLabel: { fontSize: 10, color: "white", fontWeight: "bold", marginRight: 16 },
  totalValue: { fontSize: 10, color: "white", fontWeight: "bold" },
  footer: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 5,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },
});

export interface ReimburseBulkItem {
  id: string | number;
  tanggal: string | Date | null;
  nama_karyawan: string;
  role_karyawan?: string | null;
  kategori?: string | null;
  total: number;
  status: string;
}

export interface ReimburseBulkPDFProps {
  items: ReimburseBulkItem[];
  filterLabel?: string;
  logoUrl?: string;
}

export function ReimburseBulkPDF({ items, filterLabel, logoUrl }: ReimburseBulkPDFProps) {
  const grandTotal = items.reduce((s, i) => s + i.total, 0);
  return (
    <Document title="Rekap Reimburse" author={COMPANY.name}>
      <Page size="A4" style={bulkStyles.page}>
        {/* Header */}
        <View style={bulkStyles.header}>
          <View style={bulkStyles.logoBlock}>
            {logoUrl && <Image style={bulkStyles.logo} src={logoUrl} />}
            <View style={bulkStyles.companyInfo}>
              <Text style={bulkStyles.companyName}>{COMPANY.name}</Text>
              <Text style={bulkStyles.companyContact}>{COMPANY.tagline}</Text>
              <Text style={bulkStyles.companyContact}>{COMPANY.address}</Text>
              <Text style={bulkStyles.companyContact}>📞 {COMPANY.phone}  ✉ {COMPANY.email}</Text>
            </View>
          </View>
          <View style={bulkStyles.titleBlock}>
            <Text style={bulkStyles.docTitle}>REKAP REIMBURSE</Text>
            {filterLabel && <Text style={bulkStyles.docSub}>{filterLabel}</Text>}
          </View>
        </View>

        {/* Filter info */}
        <Text style={bulkStyles.filterInfo}>
          Total {items.length} pengajuan  ·  Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        {/* Table */}
        <View style={bulkStyles.tableHead}>
          <Text style={[bulkStyles.headCell, bulkStyles.colNo]}>#</Text>
          <Text style={[bulkStyles.headCell, bulkStyles.colDate]}>Tanggal</Text>
          <Text style={[bulkStyles.headCell, bulkStyles.colName]}>Karyawan</Text>
          <Text style={[bulkStyles.headCell, bulkStyles.colKat]}>Kategori</Text>
          <Text style={[bulkStyles.headCell, bulkStyles.colStatus]}>Status</Text>
          <Text style={[bulkStyles.headCell, bulkStyles.colTotal]}>Total</Text>
        </View>
        {items.map((r, i) => (
          <View key={i} style={i % 2 === 0 ? bulkStyles.tableRow : bulkStyles.tableRowAlt}>
            <Text style={[bulkStyles.cell, bulkStyles.colNo]}>{i + 1}</Text>
            <Text style={[bulkStyles.cell, bulkStyles.colDate]}>
              {r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
            </Text>
            <Text style={[bulkStyles.cell, bulkStyles.colName]}>
              {r.nama_karyawan}{r.role_karyawan ? ` (${r.role_karyawan})` : ""}
            </Text>
            <Text style={[bulkStyles.cell, bulkStyles.colKat]}>{r.kategori || "—"}</Text>
            <Text style={[bulkStyles.cell, bulkStyles.colStatus]}>{r.status}</Text>
            <Text style={[bulkStyles.cell, bulkStyles.colTotal]}>{"Rp " + Math.round(r.total).toLocaleString("id-ID")}</Text>
          </View>
        ))}

        {/* Grand total */}
        <View style={bulkStyles.totalRow}>
          <Text style={bulkStyles.totalLabel}>GRAND TOTAL</Text>
          <Text style={bulkStyles.totalValue}>{"Rp " + Math.round(grandTotal).toLocaleString("id-ID")}</Text>
        </View>

        {/* Footer */}
        <View style={bulkStyles.footer} fixed>
          <Text style={bulkStyles.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
          <Text style={bulkStyles.footerText}>Rekap Reimburse · {items.length} data</Text>
        </View>
      </Page>
    </Document>
  );
}

export interface ReimbursePDFProps {
  id: string | number;
  tanggal: string | Date | null;
  nama_karyawan: string;
  role_karyawan?: string | null;
  kategori?: string | null;
  keterangan?: string | null;
  items: ReimburseItem[];
  total: number;
  head_finance?: SignatureInfo | null;
  admin_finance?: SignatureInfo | null;
  logoUrl?: string;
  buktis?: ReimburseBukti[];
}

export function ReimbursePDF({
  id, tanggal, nama_karyawan, role_karyawan, kategori, keterangan,
  items, total, head_finance, admin_finance, logoUrl, buktis,
}: ReimbursePDFProps) {
  return (
    <Document title={`Reimburse #${id}`} author={COMPANY.name}>

      {/* ── Halaman utama ── */}
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBlock}>
            {logoUrl && <Image style={styles.logo} src={logoUrl} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{COMPANY.name}</Text>
              <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={styles.companyContact}>{COMPANY.address}</Text>
              <Text style={styles.companyContact}>📞 {COMPANY.phone}  ✉ {COMPANY.email}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.docTitle}>REIMBURSE</Text>
            <Text style={styles.docSub}>#{String(id).padStart(4, "0")}</Text>
          </View>
        </View>

        {/* Info karyawan */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>KARYAWAN</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoValue}>{nama_karyawan || "—"}</Text>
              {role_karyawan && <Text style={styles.infoSub}>{role_karyawan}</Text>}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.infoLabel}>TANGGAL</Text>
              <Text style={styles.infoValue}>{formatDate(tanggal)}</Text>
            </View>
          </View>
          {kategori && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>KATEGORI</Text>
              <Text style={styles.infoValue}>{kategori}</Text>
            </View>
          )}
          {keterangan && (
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <Text style={styles.infoLabel}>KETERANGAN</Text>
              <Text style={[styles.infoValue, { fontWeight: "normal", fontSize: 9 }]}>{keterangan}</Text>
            </View>
          )}
        </View>

        {/* Table items */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.colDesc]}>Keterangan / Bon</Text>
            <Text style={[styles.tableHeadCell, styles.colAmt]}>Jumlah</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellText, styles.colDesc]}>{item.deskripsi || `Item ${i + 1}`}</Text>
              <Text style={[styles.cellText, styles.colAmt]}>{formatRp(item.jumlah)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalBox}>
          <View style={styles.totalInner}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatRp(total)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Signatures */}
        <View style={styles.signRow}>
          <View style={styles.signBlock}>
            <View style={styles.signTitleBox}><Text style={styles.signTitleText}>Head Finance</Text></View>
            {head_finance?.signature
              ? <Image style={styles.signImage} src={head_finance.signature} />
              : <View style={styles.signImageEmpty} />}
            <Text style={styles.signName}>{head_finance?.name || "___________________"}</Text>
            {head_finance?.at && <Text style={styles.signDate}>{formatDate(head_finance.at)}</Text>}
          </View>
          <View style={styles.signBlock}>
            <View style={styles.signTitleBox}><Text style={styles.signTitleText}>Admin Finance</Text></View>
            {admin_finance?.signature
              ? <Image style={styles.signImage} src={admin_finance.signature} />
              : <View style={styles.signImageEmpty} />}
            <Text style={styles.signName}>{admin_finance?.name || "___________________"}</Text>
            {admin_finance?.at && <Text style={styles.signDate}>{formatDate(admin_finance.at)}</Text>}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
          <Text style={styles.footerText}>Reimburse #{String(id).padStart(4, "0")}</Text>
        </View>

      </Page>

      {/* ── Halaman lampiran bukti bon ── */}
      {buktis && buktis.length > 0 && (
        <Page size="A4" style={styles.page}>

          {/* Header lampiran */}
          <View style={styles.header}>
            <View style={styles.logoBlock}>
              {logoUrl && <Image style={styles.logo} src={logoUrl} />}
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{COMPANY.name}</Text>
                <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
              </View>
            </View>
            <View style={styles.titleBlock}>
              <Text style={[styles.docTitle, { fontSize: 16 }]}>LAMPIRAN</Text>
              <Text style={styles.docSub}>Bukti Bon / Struk</Text>
            </View>
          </View>

          <Text style={styles.buktiTitle}>BUKTI BON — Reimburse #{String(id).padStart(4, "0")} · {nama_karyawan}</Text>

          {buktis.map((b, i) => (
            <View key={i} style={styles.buktiImageBox}>
              <Image src={b.data} style={styles.buktiImage} />
              {b.nama && <Text style={styles.buktiNama}>{b.nama}</Text>}
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
            <Text style={styles.footerText}>Lampiran Reimburse #{String(id).padStart(4, "0")}</Text>
          </View>

        </Page>
      )}

    </Document>
  );
}
