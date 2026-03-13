import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ── Ganti info perusahaan di sini ────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: DARK, backgroundColor: "#ffffff" },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 0, paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE,
  },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  companyInfo: { justifyContent: "center" },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7.5, color: GRAY, marginTop: 2 },

  // Invoice title block (right side)
  titleBlock: { alignItems: "flex-end" },
  invoiceTitle: {
    fontSize: 26, fontWeight: "bold", color: ORANGE,
    letterSpacing: 2,
  },
  invoiceNumber: { fontSize: 10, color: GRAY, marginTop: 3 },

  // Orange accent bar
  accentBar: { height: 4, backgroundColor: ORANGE, marginBottom: 20, borderRadius: 2 },

  // Meta info
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, marginTop: 16 },
  metaBlock: { flex: 1 },
  metaLabelBox: {
    backgroundColor: ORANGE, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 2, marginBottom: 4, alignSelf: "flex-start",
  },
  metaLabelText: { fontSize: 7, color: "white", fontWeight: "bold", letterSpacing: 0.5 },
  metaValue: { fontSize: 11, fontWeight: "bold", color: GRAY },
  metaSubValue: { fontSize: 8.5, color: GRAY, marginTop: 2 },

  // Table
  table: { marginTop: 4 },
  tableHead: {
    flexDirection: "row", backgroundColor: GRAY,
    paddingVertical: 7, paddingHorizontal: 8, borderRadius: 3,
  },
  tableHeadCell: { color: "white", fontSize: 8.5, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT,
  },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "right" },
  col3: { flex: 1.5, textAlign: "right" },
  col4: { flex: 1.5, textAlign: "right" },
  cellText: { fontSize: 9, color: DARK },

  // Totals
  totalWrapper: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totalBlock: { width: 220 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: GRAY },
  totalValue: { fontSize: 9, color: DARK },
  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 4 },
  grandTotalLine: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: ORANGE, padding: "5 8", borderRadius: 3, marginTop: 4,
  },
  grandTotalLabel: { fontSize: 11, fontWeight: "bold", color: "white" },
  grandTotalValue: { fontSize: 11, fontWeight: "bold", color: "white" },

  // Bank Account
  bankBox: {
    marginTop: 12, padding: 10, backgroundColor: ORANGE_LIGHT,
    borderRadius: 4, borderWidth: 1, borderColor: ORANGE_MID,
  },
  bankTitle: { fontSize: 7.5, color: ORANGE, fontWeight: "bold", marginBottom: 6, letterSpacing: 0.5 },
  bankRow: { flexDirection: "row", marginBottom: 3 },
  bankLabel: { fontSize: 8, color: GRAY, width: 85 },
  bankValue: { fontSize: 8, color: DARK, fontWeight: "bold" },

  // Catatan
  catatan: {
    marginTop: 12, padding: 8, backgroundColor: ORANGE_LIGHT,
    borderLeftWidth: 3, borderLeftColor: ORANGE, borderRadius: 2,
  },
  catatanLabel: { fontSize: 7.5, color: ORANGE, fontWeight: "bold", marginBottom: 2 },
  catatanText: { fontSize: 9, color: DARK },

  // Signatures
  signRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 36 },
  signBlock: { alignItems: "center", width: 180 },
  signTitleBox: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 2, marginBottom: 8,
    borderWidth: 1, borderColor: ORANGE_MID,
  },
  signTitleText: { fontSize: 8, color: GRAY, fontWeight: "bold" },
  signImage: { width: 140, height: 60, objectFit: "contain", marginBottom: 6 },
  signImageEmpty: { width: 140, height: 60, borderBottomWidth: 1, borderBottomColor: "#d4d4d4", marginBottom: 6 },
  signName: { fontSize: 9, fontWeight: "bold", color: DARK },
  signDate: { fontSize: 7.5, color: GRAY, marginTop: 2 },

  // Footer
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 6,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: GRAY },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRp(val: number) {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}
function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface InvoiceItem {
  keterangan: string;
  jumlah: number;
  harga_satuan: number;
}
export interface SignatureInfo {
  name: string;
  at: string | Date | null;
  signature: string | null;
}
export interface InvoicePDFProps {
  nomor_invoice: string;
  tanggal: string | Date | null;
  overdue_date?: string | Date | null;
  klien: string;
  alamat_klien?: string | null;
  telepon_klien?: string | null;
  lead_jenis?: string;
  items: InvoiceItem[];
  subtotal: number;
  ppn_percentage: number;
  ppn_amount: number;
  grand_total: number;
  catatan?: string;
  bank_account?: { bank_name: string; account_number: string; account_name: string } | null;
  head_finance?: SignatureInfo | null;
  admin_finance?: SignatureInfo | null;
  logoUrl?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function InvoicePDF({
  nomor_invoice, tanggal, overdue_date, klien, alamat_klien, telepon_klien, lead_jenis, items,
  subtotal, ppn_percentage, ppn_amount, grand_total, catatan, bank_account,
  head_finance, admin_finance, logoUrl,
}: InvoicePDFProps) {
  return (
    <Document title={`Invoice ${nomor_invoice}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
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
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{nomor_invoice}</Text>
          </View>
        </View>

        {/* ── Meta ── */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <View style={styles.metaLabelBox}><Text style={styles.metaLabelText}>TAGIHAN KEPADA</Text></View>
            <Text style={styles.metaValue}>{klien || "—"}</Text>
            {lead_jenis && <Text style={styles.metaSubValue}>{lead_jenis}</Text>}
            {alamat_klien && <Text style={styles.metaSubValue}>{alamat_klien}</Text>}
            {telepon_klien && <Text style={styles.metaSubValue}>📞 {telepon_klien}</Text>}
          </View>
          <View style={[styles.metaBlock, { alignItems: "flex-end" }]}>
            <View style={[styles.metaLabelBox, { alignSelf: "flex-end" }]}>
              <Text style={styles.metaLabelText}>TANGGAL INVOICE</Text>
            </View>
            <Text style={styles.metaValue}>{formatDate(tanggal)}</Text>
            {overdue_date && (
              <View style={{ alignItems: "flex-end", marginTop: 8 }}>
                <View style={[styles.metaLabelBox, { alignSelf: "flex-end" }]}>
                  <Text style={styles.metaLabelText}>JATUH TEMPO</Text>
                </View>
                <Text style={styles.metaValue}>{formatDate(overdue_date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Table ── */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.col1]}>Keterangan</Text>
            <Text style={[styles.tableHeadCell, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeadCell, styles.col3]}>Harga Satuan</Text>
            <Text style={[styles.tableHeadCell, styles.col4]}>Subtotal</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellText, styles.col1]}>{item.keterangan}</Text>
              <Text style={[styles.cellText, styles.col2]}>{item.jumlah}</Text>
              <Text style={[styles.cellText, styles.col3]}>{formatRp(item.harga_satuan)}</Text>
              <Text style={[styles.cellText, styles.col4]}>{formatRp(item.jumlah * item.harga_satuan)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalWrapper}>
          <View style={styles.totalBlock}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatRp(subtotal)}</Text>
            </View>
            {ppn_percentage > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>PPN ({ppn_percentage}%)</Text>
                <Text style={styles.totalValue}>{formatRp(ppn_amount)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.grandTotalLine}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatRp(grand_total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Bank Account ── */}
        {bank_account && (
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>TRANSFER KE</Text>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Bank</Text>
              <Text style={styles.bankValue}>{bank_account.bank_name}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>No. Rekening</Text>
              <Text style={styles.bankValue}>{bank_account.account_number}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Atas Nama</Text>
              <Text style={styles.bankValue}>{bank_account.account_name}</Text>
            </View>
          </View>
        )}

        {/* ── Catatan ── */}
        {catatan ? (
          <View style={styles.catatan}>
            <Text style={styles.catatanLabel}>CATATAN</Text>
            <Text style={styles.catatanText}>{catatan}</Text>
          </View>
        ) : null}

        {/* ── Signatures ── */}
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

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
          <Text style={styles.footerText}>Dokumen ini sah tanpa tanda tangan basah</Text>
        </View>

      </Page>
    </Document>
  );
}
