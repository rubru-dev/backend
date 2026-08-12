import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { A4_HEIGHT, estimateLines, fitOnePage } from "./pdf/fit-one-page";

// ── Info perusahaan (sama dengan invoice-pdf) ─────────────────────────────────
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
    paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 20,
  },
  logoBlock: { flexDirection: "row", alignItems: "center", width: 360 },
  logo: { width: 64, height: 64, objectFit: "contain", marginRight: 12 },
  companyInfo: { justifyContent: "center", width: 280 },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2, lineHeight: 1.25 },

  titleBlock: { alignItems: "flex-end", width: 170 },
  kwitansiTitle: { fontSize: 21, fontWeight: "bold", color: ORANGE },
  kwitansiNumber: { fontSize: 8.5, color: GRAY, marginTop: 3, textAlign: "right", lineHeight: 1.25 },
  docHeader: {
    marginTop: 14,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: ORANGE_MID,
  },
  docTitle: { fontSize: 22, fontWeight: "bold", color: ORANGE },
  docNumber: { fontSize: 9, color: GRAY, marginTop: 4, lineHeight: 1.3 },

  // Body card
  card: {
    backgroundColor: "#f1f5f9", borderRadius: 6,
    padding: 20, marginTop: 4,
    borderLeftWidth: 4, borderLeftColor: GRAY,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  cardField: { width: 270 },
  cardFieldRight: { width: 165, alignItems: "flex-end" },
  fieldLabel: { fontSize: 7.5, color: GRAY, fontWeight: "bold", marginBottom: 2 },
  fieldValue: { fontSize: 11, fontWeight: "bold", color: DARK },
  fieldSub: { fontSize: 8, color: GRAY, marginTop: 1, lineHeight: 1.25 },

  // Amount box
  amountBox: {
    backgroundColor: ORANGE, borderRadius: 5, padding: 16, marginTop: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  amountLabel: { fontSize: 10.5, color: "white", fontWeight: "bold", width: 155 },
  amountValue: { fontSize: 16, color: "white", fontWeight: "bold", width: 275, textAlign: "right" },

  // Metode
  metodeBox: {
    flexDirection: "row", alignItems: "center", marginTop: 14,
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#ffffff",
    borderRadius: 4, borderWidth: 1, borderColor: ORANGE_MID,
  },
  metodeLabel: { fontSize: 8, color: GRAY, marginRight: 8, width: 110 },
  metodeValue: { fontSize: 9, fontWeight: "bold", color: DARK, flex: 1, lineHeight: 1.25 },

  // Divider
  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 16 },

  // Items table
  table: { marginTop: 4, marginBottom: 4, width: "100%" },
  tableHead: {
    flexDirection: "row", backgroundColor: GRAY,
    paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3,
  },
  tableHeadCell: { color: "white", fontSize: 8, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT,
  },
  col1: { width: 230, paddingRight: 8 },
  col2: { width: 40, textAlign: "right" },
  col3: { width: 100, textAlign: "right" },
  col4: { width: 105, textAlign: "right" },
  cellText: { fontSize: 8.2, color: DARK, lineHeight: 1.25 },
  moreRow: { paddingVertical: 4, paddingHorizontal: 8 },
  moreText: { fontSize: 8, color: ORANGE, fontWeight: "bold" },

  // Reference
  refRow: { flexDirection: "row", marginTop: 4 },
  refLabel: { fontSize: 8, color: GRAY, width: 110 },
  refValue: { fontSize: 8, color: DARK, flex: 1, lineHeight: 1.25 },

  // Note
  note: {
    marginTop: 16, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: ORANGE_MID, borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  noteText: { fontSize: 8, color: GRAY, textAlign: "center", lineHeight: 1.3 },

  // Signatures
  signRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 28 },
  signBlock: { alignItems: "center", width: 160 },
  signTitleBox: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 2, marginBottom: 8,
    borderWidth: 1, borderColor: ORANGE_MID,
  },
  signTitleText: { fontSize: 8, color: GRAY, fontWeight: "bold" },
  signImage: { width: 120, height: 55, objectFit: "contain", marginBottom: 4 },
  signImageEmpty: { width: 120, height: 55, borderBottomWidth: 1, borderBottomColor: "#d4d4d4", marginBottom: 4 },
  // Area TTD: watermark logo + tinta TTD ditumpuk pada posisi yang sama.
  signArea: { width: 120, height: 55, position: "relative", marginBottom: 4 },
  signWatermark: { position: "absolute", top: 0, left: 0, width: 120, height: 55, objectFit: "contain", opacity: 0.55 },
  signInk: { position: "absolute", top: 0, left: 0, width: 120, height: 55, objectFit: "contain" },
  signName: { fontSize: 8.5, fontWeight: "bold", color: DARK },
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
function pdfPrintDate() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}
function softBreak(value: string) {
  return value.replace(/([/\\\-()])/g, "$1\u200B");
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface KwitansiItem {
  keterangan: string;
  jumlah: number;
  harga_satuan: number;
}

export interface KwitansiSignatureInfo {
  name: string;
  at: string | Date | null;
  signature: string | null;
}

export interface KwitansiPDFProps {
  nomor_kwitansi: string;
  nomor_invoice: string;
  tanggal_lunas: string | Date | null;
  klien: string;
  alamat_klien?: string | null;
  telepon_klien?: string | null;
  lead_jenis?: string;
  jumlah: number;
  metode_bayar: string;
  detail_bayar?: string | null;
  catatan?: string;
  logoUrl?: string;
  items?: KwitansiItem[];
  buktiBayar?: string | null;
  head_finance?: KwitansiSignatureInfo | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function KwitansiPDF({
  nomor_kwitansi, nomor_invoice, tanggal_lunas, klien, alamat_klien, telepon_klien, lead_jenis,
  jumlah, metode_bayar, detail_bayar, catatan, logoUrl, items, buktiBayar,
  head_finance,
}: KwitansiPDFProps) {
  const metodeLabel = detail_bayar ? `${metode_bayar} - ${detail_bayar}` : metode_bayar;
  const itemList = items ?? [];
  const hasItems = itemList.length > 0;

  // ── Auto-fit satu halaman ──────────────────────────────────────────────────
  // Tinggi tiap blok diestimasi (pt), lalu margin/padding vertikal dikompres
  // secukupnya agar blok tanda tangan selalu ikut di halaman pertama.
  const rowText = itemList.map(
    (it) => Math.max(1, estimateLines(it.keterangan, 222, 8.2)) * 10.3,
  );
  const cardSubLines =
    (lead_jenis ? 1 : 0) + estimateLines(alamat_klien, 270, 8) + (telepon_klien ? 1 : 0);
  const metodeLines = Math.max(1, estimateLines(metodeLabel, 300, 9));
  const catatanLines = estimateLines(catatan, 380, 8);

  const fixedText =
    64 +                            // header: logo + identitas perusahaan
    39 +                            // judul dokumen + nomor
    (22 + cardSubLines * 10) +      // kartu: diterima dari / tanggal
    20 +                            // kotak jumlah diterima
    metodeLines * 11 +              // metode pembayaran
    (hasItems ? 21 : 0) +           // judul + header tabel item
    12 +                            // baris nomor invoice + divider
    (catatan ? catatanLines * 10 : 0) +
    21 +                            // catatan kaki dokumen
    85;                             // blok tanda tangan
  const fixedSpace =
    39 + 43 + 54 + 48 + 32 +
    (hasItems ? 48 : 0) +
    32 + 4 + (catatan ? 4 : 0) + 34 + 52;

  const fit = fitOnePage({
    contentHeight: CONTENT_HEIGHT, fixedText, fixedSpace, rowText, rowSpace: 9,
  });
  const sp = (v: number) => Math.round(v * fit.spacing * 10) / 10;
  const shownItems = fit.overflow ? itemList.slice(0, fit.rows) : itemList;
  const hiddenCount = itemList.length - shownItems.length;

  return (
    <Document title={`Kwitansi ${nomor_kwitansi}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingBottom: sp(16), marginBottom: sp(20) }]}>
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

        <View style={[styles.docHeader, { marginTop: sp(14), marginBottom: sp(14), paddingBottom: sp(10) }]}>
          <Text style={styles.docTitle}>KWITANSI</Text>
          <Text style={styles.docNumber}>{softBreak(nomor_kwitansi)}</Text>
        </View>

        {/* ── Body Card ── */}
        <View style={[styles.card, { marginTop: sp(4), paddingVertical: sp(20) }]}>
          {/* Row 1: Klien & Tanggal */}
          <View style={[styles.cardRow, { marginBottom: sp(10) }]}>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>DITERIMA DARI</Text>
              <Text style={styles.fieldValue}>{klien || "-"}</Text>
              {lead_jenis && <Text style={styles.fieldSub}>{lead_jenis}</Text>}
              {alamat_klien && <Text style={styles.fieldSub}>{alamat_klien}</Text>}
              {telepon_klien && <Text style={styles.fieldSub}>Tel {telepon_klien}</Text>}
            </View>
            <View style={styles.cardFieldRight}>
              <Text style={styles.fieldLabel}>TANGGAL PEMBAYARAN</Text>
              <Text style={styles.fieldValue}>{formatDate(tanggal_lunas)}</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={[styles.amountBox, { marginTop: sp(16), paddingVertical: sp(16) }]}>
            <Text style={styles.amountLabel}>JUMLAH DITERIMA</Text>
            <Text style={styles.amountValue}>{formatRp(jumlah)}</Text>
          </View>

          {/* Metode */}
          <View style={[styles.metodeBox, { marginTop: sp(14), paddingVertical: sp(8) }]}>
            <Text style={styles.metodeLabel}>METODE PEMBAYARAN</Text>
            <Text style={styles.metodeValue}>{metodeLabel || "-"}</Text>
          </View>
        </View>

        {/* ── Items Table ── */}
        {hasItems && (
          <>
            <View style={[styles.divider, { marginVertical: sp(12) }]} />
            <Text style={{ fontSize: 8, color: ORANGE, fontWeight: "bold", marginBottom: sp(6) }}>
              RINCIAN ITEM YANG DIBAYAR
            </Text>
            <View style={[styles.table, { marginTop: sp(4), marginBottom: sp(4) }]}>
              <View style={[styles.tableHead, { paddingVertical: sp(5) }]}>
                <Text style={[styles.tableHeadCell, styles.col1]}>Keterangan</Text>
                <Text style={[styles.tableHeadCell, styles.col2]}>Qty</Text>
                <Text style={[styles.tableHeadCell, styles.col3]}>Harga Satuan</Text>
                <Text style={[styles.tableHeadCell, styles.col4]}>Subtotal</Text>
              </View>
              {shownItems.map((item, i) => (
                <View
                  key={i}
                  wrap={false}
                  style={[i % 2 === 0 ? styles.tableRow : styles.tableRowAlt, { paddingVertical: sp(4) }]}
                >
                  <Text style={[styles.cellText, styles.col1]}>{item.keterangan}</Text>
                  <Text style={[styles.cellText, styles.col2]}>{item.jumlah}</Text>
                  <Text style={[styles.cellText, styles.col3]}>{formatRp(item.harga_satuan)}</Text>
                  <Text style={[styles.cellText, styles.col4]}>{formatRp(item.jumlah * item.harga_satuan)}</Text>
                </View>
              ))}
              {hiddenCount > 0 && (
                <View style={[styles.moreRow, { paddingVertical: sp(4) }]}>
                  <Text style={styles.moreText}>
                    + {hiddenCount} item lainnya — lihat Lampiran Rincian Item
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Divider ── */}
        <View style={[styles.divider, { marginVertical: sp(16) }]} />

        {/* ── Reference ── */}
        <View style={[styles.refRow, { marginTop: sp(4) }]}>
          <Text style={styles.refLabel}>Nomor Invoice:</Text>
          <Text style={styles.refValue}>{nomor_invoice}</Text>
        </View>
        {catatan && (
          <View style={[styles.refRow, { marginTop: sp(4) }]}>
            <Text style={styles.refLabel}>Keterangan:</Text>
            <Text style={styles.refValue}>{catatan}</Text>
          </View>
        )}

        {/* ── Note ── */}
        <View style={[styles.note, { marginTop: sp(16), paddingVertical: sp(8) }]}>
          <Text style={styles.noteText}>
            Dokumen ini merupakan bukti pembayaran yang sah dari {COMPANY.name}.{"\n"}
            Harap simpan kwitansi ini sebagai bukti transaksi Anda.
          </Text>
        </View>

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
              <View style={[styles.signArea, { marginBottom: sp(4) }]}>
                {/* Logo sebagai watermark di belakang TTD — samar agar tinta TTD tetap dominan */}
                {logoUrl && <Image style={styles.signWatermark} src={logoUrl} />}
                {/* TTD ditumpuk dua kali agar goresannya lebih pekat di atas watermark */}
                <Image style={styles.signInk} src={head_finance.signature} />
                <Image style={styles.signInk} src={head_finance.signature} />
              </View>
            ) : (
              <View style={[styles.signImageEmpty, { marginBottom: sp(4) }]} />
            )}
            <Text style={styles.signName}>{head_finance?.name || "___________________"}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY.name} - {COMPANY.phone}</Text>
          <Text style={styles.footerText}>Kwitansi #{nomor_kwitansi}</Text>
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
              <Text style={[styles.kwitansiTitle, { fontSize: 16 }]}>LAMPIRAN</Text>
              <Text style={styles.kwitansiNumber}>Rincian Item</Text>
            </View>
          </View>

          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Nomor Kwitansi:</Text>
            <Text style={styles.refValue}>{nomor_kwitansi}</Text>
          </View>
          <View style={[styles.refRow, { marginTop: 2, marginBottom: 12 }]}>
            <Text style={styles.refLabel}>Nomor Invoice:</Text>
            <Text style={styles.refValue}>{nomor_invoice}</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHead} fixed>
              <Text style={[styles.tableHeadCell, styles.col1]}>Keterangan</Text>
              <Text style={[styles.tableHeadCell, styles.col2]}>Qty</Text>
              <Text style={[styles.tableHeadCell, styles.col3]}>Harga Satuan</Text>
              <Text style={[styles.tableHeadCell, styles.col4]}>Subtotal</Text>
            </View>
            {itemList.map((item, i) => (
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
            <Text style={styles.footerText}>Lampiran Kwitansi #{nomor_kwitansi}</Text>
          </View>
        </Page>
      )}

      {/* ── Lampiran Bukti Bayar ── */}
      {buktiBayar && (
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
              <Text style={[styles.kwitansiTitle, { fontSize: 16 }]}>LAMPIRAN</Text>
              <Text style={styles.kwitansiNumber}>Bukti Pembayaran</Text>
            </View>
          </View>

          {/* Ref info */}
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>Nomor Kwitansi:</Text>
            <Text style={styles.refValue}>{nomor_kwitansi}</Text>
          </View>
          <View style={[styles.refRow, { marginTop: 2, marginBottom: 16 }]}>
            <Text style={styles.refLabel}>Nomor Invoice:</Text>
            <Text style={styles.refValue}>{nomor_invoice}</Text>
          </View>

          {/* Bukti bayar image — tinggi TETAP + wrap={false} agar selalu muat 1 halaman.
              maxWidth/maxHeight tidak reliable di react-pdf sehingga gambar bisa tumpah
              ke halaman berikutnya; width/height tetap + objectFit contain menjaganya. */}
          <View wrap={false} style={{
            borderWidth: 1, borderColor: ORANGE_MID, borderRadius: 6,
            padding: 12, backgroundColor: "#ffffff", alignItems: "center",
          }}>
            <Text style={{ fontSize: 8, color: ORANGE, fontWeight: "bold", marginBottom: 10 }}>
              BUKTI PEMBAYARAN
            </Text>
            <Image
              src={buktiBayar}
              style={{ width: 470, height: 500, objectFit: "contain" }}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{COMPANY.name} - {COMPANY.phone}</Text>
            <Text style={styles.footerText}>Lampiran Kwitansi #{nomor_kwitansi}</Text>
          </View>
        </Page>
      )}

    </Document>
  );
}
