import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { A4_HEIGHT, estimateLines, fitOnePage } from "./pdf/fit-one-page";

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

const PAGE_PADDING_TOP = 36;
const PAGE_PADDING_BOTTOM = 76;
const CONTENT_HEIGHT = A4_HEIGHT - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING_TOP,
    paddingHorizontal: 40,
    paddingBottom: PAGE_PADDING_BOTTOM,
    fontSize: 10,
    color: DARK,
    backgroundColor: "#ffffff",
  },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 0, paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE,
  },
  logoBlock: { flexDirection: "row", alignItems: "center", width: 360 },
  logo: { width: 64, height: 64, objectFit: "contain", marginRight: 12 },
  companyInfo: { justifyContent: "center", width: 280 },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2, lineHeight: 1.25 },

  // Invoice title block (right side)
  titleBlock: { alignItems: "flex-end", width: 170 },
  invoiceTitle: {
    fontSize: 24, fontWeight: "bold", color: ORANGE,
  },
  invoiceNumber: { fontSize: 8.5, color: GRAY, marginTop: 3, textAlign: "right", lineHeight: 1.25 },
  docHeader: {
    marginTop: 14,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: ORANGE_MID,
  },
  docTitle: { fontSize: 24, fontWeight: "bold", color: ORANGE },
  docNumber: { fontSize: 9, color: GRAY, marginTop: 4, lineHeight: 1.3 },

  // Orange accent bar
  accentBar: { height: 4, backgroundColor: ORANGE, marginBottom: 20, borderRadius: 2 },

  // Meta info
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, marginTop: 16 },
  metaBlock: { width: 270 },
  metaBlockRight: { width: 180, alignItems: "flex-end" },
  metaLabelBox: {
    backgroundColor: ORANGE, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 2, marginBottom: 4, alignSelf: "flex-start",
  },
  metaLabelText: { fontSize: 7, color: "white", fontWeight: "bold", letterSpacing: 0.5 },
  metaValue: { fontSize: 11, fontWeight: "bold", color: GRAY },
  metaSubValue: { fontSize: 8, color: GRAY, marginTop: 2, lineHeight: 1.25 },

  // Table
  table: { marginTop: 4, width: "100%" },
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
  col1: { width: 230, paddingRight: 8 },
  col2: { width: 40, textAlign: "right" },
  col3: { width: 100, textAlign: "right" },
  col4: { width: 105, textAlign: "right" },
  cellText: { fontSize: 8.5, color: DARK, lineHeight: 1.25 },
  moreRow: { paddingVertical: 5, paddingHorizontal: 8 },
  moreText: { fontSize: 8, color: ORANGE, fontWeight: "bold" },

  // Totals
  totalWrapper: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totalBlock: { width: 235 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: GRAY },
  totalValue: { fontSize: 9, color: DARK },
  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 4 },
  grandTotalLine: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: ORANGE, paddingVertical: 5, paddingHorizontal: 8,
    borderRadius: 3, marginTop: 4,
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
  bankLabel: { fontSize: 8, color: GRAY, width: 90 },
  bankValue: { fontSize: 8, color: DARK, fontWeight: "bold", flex: 1, lineHeight: 1.25 },

  // Catatan
  catatan: {
    marginTop: 12, padding: 8, backgroundColor: ORANGE_LIGHT,
    borderLeftWidth: 3, borderLeftColor: ORANGE, borderRadius: 2,
  },
  catatanLabel: { fontSize: 7.5, color: ORANGE, fontWeight: "bold", marginBottom: 2 },
  catatanText: { fontSize: 8.5, color: DARK, lineHeight: 1.3 },

  // Signatures
  signRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 28 },
  signBlock: { alignItems: "center", width: 180 },
  signTitleBox: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 2, marginBottom: 8,
    borderWidth: 1, borderColor: ORANGE_MID,
  },
  signTitleText: { fontSize: 8, color: GRAY, fontWeight: "bold" },
  signImage: { width: 140, height: 60, objectFit: "contain", marginBottom: 6 },
  signImageEmpty: { width: 140, height: 60, borderBottomWidth: 1, borderBottomColor: "#d4d4d4", marginBottom: 6 },
  // Area TTD: watermark logo + tinta TTD ditumpuk pada posisi yang sama.
  signArea: { width: 140, height: 60, position: "relative", marginBottom: 6 },
  signWatermark: { position: "absolute", top: 0, left: 0, width: 140, height: 60, objectFit: "contain", opacity: 0.55 },
  signInk: { position: "absolute", top: 0, left: 0, width: 140, height: 60, objectFit: "contain" },
  signName: { fontSize: 9, fontWeight: "bold", color: DARK },
  signDate: { fontSize: 7.5, color: GRAY, marginTop: 2 },

  // Footer
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 6,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRp(val: number) {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}
function formatDate(d: string | Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
// Tanggal cetak (hari ini) format dd-mm-yyyy untuk baris "Bekasi, ..".
function pdfPrintDate() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}
function softBreak(value: string) {
  return value.replace(/([/\\\-()])/g, "$1\u200B");
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
  logoUrl?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function InvoicePDF({
  nomor_invoice, tanggal, overdue_date, klien, alamat_klien, telepon_klien, lead_jenis, items,
  subtotal, ppn_percentage, ppn_amount, grand_total, catatan, bank_account,
  head_finance, logoUrl,
}: InvoicePDFProps) {
  // ── Auto-fit satu halaman ──────────────────────────────────────────────────
  // Tinggi tiap blok diestimasi (pt), lalu margin/padding vertikal dikompres
  // secukupnya agar blok tanda tangan selalu ikut di halaman pertama.
  const rowText = items.map(
    (it) => Math.max(1, estimateLines(it.keterangan, 222, 8.5)) * 10.7,
  );
  const metaSubLines =
    (lead_jenis ? 1 : 0) + estimateLines(alamat_klien, 270, 8) + (telepon_klien ? 1 : 0);
  const catatanLines = estimateLines(catatan, 500, 8.5);

  const fixedText =
    64 +                                                       // header: logo + identitas
    41 +                                                       // judul dokumen + nomor
    Math.max(22 + metaSubLines * 10, overdue_date ? 52 : 22) + // blok meta klien/tanggal
    10 +                                                       // header tabel
    (ppn_percentage > 0 ? 35 : 24) +                           // ringkasan total
    (bank_account ? 39 : 0) +
    (catatan ? 9 + catatanLines * 11 : 0) +
    91;                                                        // blok tanda tangan
  const fixedSpace =
    19 + 39 + 48 + 18 + 45 +
    (bank_account ? 47 : 0) + (catatan ? 30 : 0) + 54;

  const fit = fitOnePage({
    contentHeight: CONTENT_HEIGHT, fixedText, fixedSpace, rowText, rowSpace: 13,
  });
  const sp = (v: number) => Math.round(v * fit.spacing * 10) / 10;
  const shownItems = fit.overflow ? items.slice(0, fit.rows) : items;
  const hiddenCount = items.length - shownItems.length;

  return (
    <Document title={`Invoice ${nomor_invoice}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingBottom: sp(16) }]}>
          <View style={styles.logoBlock}>
            {logoUrl && <Image style={styles.logo} src={logoUrl} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{COMPANY.name}</Text>
              <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={styles.companyContact}>{COMPANY.address}</Text>
              <Text style={styles.companyContact}>Tel {COMPANY.phone}  Email {COMPANY.email}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.docHeader, { marginTop: sp(14), marginBottom: sp(10), paddingBottom: sp(10) }]}>
          <Text style={styles.docTitle}>INVOICE</Text>
          <Text style={styles.docNumber}>{softBreak(nomor_invoice)}</Text>
        </View>

        {/* ── Meta ── */}
        <View style={[styles.metaRow, { marginTop: sp(16), marginBottom: sp(18) }]}>
          <View style={styles.metaBlock}>
            <View style={styles.metaLabelBox}><Text style={styles.metaLabelText}>TAGIHAN KEPADA</Text></View>
            <Text style={styles.metaValue}>{klien || "-"}</Text>
            {lead_jenis && <Text style={styles.metaSubValue}>{lead_jenis}</Text>}
            {alamat_klien && <Text style={styles.metaSubValue}>{alamat_klien}</Text>}
            {telepon_klien && <Text style={styles.metaSubValue}>Tel {telepon_klien}</Text>}
          </View>
          <View style={styles.metaBlockRight}>
            <View style={[styles.metaLabelBox, { alignSelf: "flex-end" }]}>
              <Text style={styles.metaLabelText}>TANGGAL INVOICE</Text>
            </View>
            <Text style={styles.metaValue}>{formatDate(tanggal)}</Text>
            {overdue_date && (
              <View style={{ alignItems: "flex-end", marginTop: sp(8) }}>
                <View style={[styles.metaLabelBox, { alignSelf: "flex-end" }]}>
                  <Text style={styles.metaLabelText}>JATUH TEMPO</Text>
                </View>
                <Text style={styles.metaValue}>{formatDate(overdue_date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Table ── */}
        <View style={[styles.table, { marginTop: sp(4) }]}>
          <View style={[styles.tableHead, { paddingVertical: sp(7) }]}>
            <Text style={[styles.tableHeadCell, styles.col1]}>Keterangan</Text>
            <Text style={[styles.tableHeadCell, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeadCell, styles.col3]}>Harga Satuan</Text>
            <Text style={[styles.tableHeadCell, styles.col4]}>Subtotal</Text>
          </View>
          {shownItems.map((item, i) => (
            <View
              key={i}
              wrap={false}
              style={[i % 2 === 0 ? styles.tableRow : styles.tableRowAlt, { paddingVertical: sp(6) }]}
            >
              <Text style={[styles.cellText, styles.col1]}>{item.keterangan}</Text>
              <Text style={[styles.cellText, styles.col2]}>{item.jumlah}</Text>
              <Text style={[styles.cellText, styles.col3]}>{formatRp(item.harga_satuan)}</Text>
              <Text style={[styles.cellText, styles.col4]}>{formatRp(item.jumlah * item.harga_satuan)}</Text>
            </View>
          ))}
          {hiddenCount > 0 && (
            <View style={[styles.moreRow, { paddingVertical: sp(5) }]}>
              <Text style={styles.moreText}>
                + {hiddenCount} item lainnya — lihat Lampiran Rincian Item
              </Text>
            </View>
          )}
        </View>

        {/* ── Totals ── */}
        <View style={[styles.totalWrapper, { marginTop: sp(10) }]}>
          <View style={styles.totalBlock}>
            <View style={[styles.totalLine, { paddingVertical: sp(3) }]}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatRp(subtotal)}</Text>
            </View>
            {ppn_percentage > 0 && (
              <View style={[styles.totalLine, { paddingVertical: sp(3) }]}>
                <Text style={styles.totalLabel}>PPN ({ppn_percentage}%)</Text>
                <Text style={styles.totalValue}>{formatRp(ppn_amount)}</Text>
              </View>
            )}
            <View style={[styles.divider, { marginVertical: sp(4) }]} />
            <View style={[styles.grandTotalLine, { paddingVertical: sp(5), marginTop: sp(4) }]}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatRp(grand_total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Bank Account ── */}
        {bank_account && (
          <View style={[styles.bankBox, { marginTop: sp(12), paddingVertical: sp(10) }]}>
            <Text style={[styles.bankTitle, { marginBottom: sp(6) }]}>TRANSFER KE</Text>
            <View style={[styles.bankRow, { marginBottom: sp(3) }]}>
              <Text style={styles.bankLabel}>Bank</Text>
              <Text style={styles.bankValue}>{bank_account.bank_name}</Text>
            </View>
            <View style={[styles.bankRow, { marginBottom: sp(3) }]}>
              <Text style={styles.bankLabel}>No. Rekening</Text>
              <Text style={styles.bankValue}>{bank_account.account_number}</Text>
            </View>
            <View style={[styles.bankRow, { marginBottom: sp(3) }]}>
              <Text style={styles.bankLabel}>Atas Nama</Text>
              <Text style={styles.bankValue}>{bank_account.account_name}</Text>
            </View>
          </View>
        )}

        {/* ── Catatan ── */}
        {catatan ? (
          <View style={[styles.catatan, { marginTop: sp(12), paddingVertical: sp(8) }]}>
            <Text style={styles.catatanLabel}>CATATAN</Text>
            <Text style={styles.catatanText}>{catatan}</Text>
          </View>
        ) : null}

        {/* ── Signatures ──
            wrap={false} menjaga blok TTD tetap utuh (tidak terbelah dua halaman);
            auto-fit di atas yang menjaganya tetap berada di halaman pertama. */}
        <View wrap={false} style={[styles.signRow, { marginTop: sp(28) }]}>
          <View style={styles.signBlock}>
            <View style={[styles.signTitleBox, { marginBottom: sp(8) }]}>
              <Text style={styles.signTitleText}>Head Finance</Text>
            </View>
            <Text style={{ fontSize: 8.5, color: DARK, marginBottom: sp(6) }}>Bekasi, {pdfPrintDate()}</Text>
            {head_finance?.signature ? (
              <View style={[styles.signArea, { marginBottom: sp(6) }]}>
                {/* Logo sebagai watermark di belakang TTD — dibuat samar agar tidak menyaingi tinta TTD */}
                {logoUrl && <Image style={styles.signWatermark} src={logoUrl} />}
                {/* TTD digambar dua kali (bertumpuk persis) agar goresannya lebih pekat/tebal
                    sehingga tetap terbaca di atas watermark. */}
                <Image style={styles.signInk} src={head_finance.signature} />
                <Image style={styles.signInk} src={head_finance.signature} />
              </View>
            ) : (
              <View style={[styles.signImageEmpty, { marginBottom: sp(6) }]} />
            )}
            <Text style={styles.signName}>{head_finance?.name || "___________________"}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY.name} - {COMPANY.phone}</Text>
          <Text style={styles.footerText}>Dokumen ini sah tanpa tanda tangan basah</Text>
        </View>

      </Page>

      {/* ── Lampiran: item yang tidak muat di halaman pertama ── */}
      {hiddenCount > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.logoBlock}>
              {logoUrl && <Image style={styles.logo} src={logoUrl} />}
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{COMPANY.name}</Text>
                <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
              </View>
            </View>
            <View style={styles.titleBlock}>
              <Text style={[styles.invoiceTitle, { fontSize: 16 }]}>LAMPIRAN</Text>
              <Text style={styles.invoiceNumber}>Rincian Item</Text>
            </View>
          </View>

          <View style={styles.docHeader}>
            <Text style={styles.docNumber}>Invoice {softBreak(nomor_invoice)}</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHead} fixed>
              <Text style={[styles.tableHeadCell, styles.col1]}>Keterangan</Text>
              <Text style={[styles.tableHeadCell, styles.col2]}>Qty</Text>
              <Text style={[styles.tableHeadCell, styles.col3]}>Harga Satuan</Text>
              <Text style={[styles.tableHeadCell, styles.col4]}>Subtotal</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} wrap={false} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.cellText, styles.col1]}>{item.keterangan}</Text>
                <Text style={[styles.cellText, styles.col2]}>{item.jumlah}</Text>
                <Text style={[styles.cellText, styles.col3]}>{formatRp(item.harga_satuan)}</Text>
                <Text style={[styles.cellText, styles.col4]}>{formatRp(item.jumlah * item.harga_satuan)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{COMPANY.name} - {COMPANY.phone}</Text>
            <Text style={styles.footerText}>Lampiran Invoice {nomor_invoice}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
