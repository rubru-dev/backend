import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

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
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: DARK, backgroundColor: "#ffffff" },

  // Header
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
  kwitansiTitle: { fontSize: 22, fontWeight: "bold", color: ORANGE, letterSpacing: 2 },
  kwitansiNumber: { fontSize: 10, color: GRAY, marginTop: 3 },

  // Body card
  card: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 6,
    padding: 20, marginTop: 4,
    borderLeftWidth: 4, borderLeftColor: ORANGE,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  cardField: { flex: 1 },
  fieldLabel: { fontSize: 7.5, color: ORANGE, fontWeight: "bold", marginBottom: 2 },
  fieldValue: { fontSize: 11, fontWeight: "bold", color: DARK },
  fieldSub: { fontSize: 8.5, color: GRAY, marginTop: 1 },

  // Amount box
  amountBox: {
    backgroundColor: ORANGE, borderRadius: 5, padding: 16, marginTop: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  amountLabel: { fontSize: 11, color: "white", fontWeight: "bold" },
  amountValue: { fontSize: 18, color: "white", fontWeight: "bold" },

  // Metode
  metodeBox: {
    flexDirection: "row", alignItems: "center", marginTop: 14,
    padding: "8 12", backgroundColor: "#ffffff",
    borderRadius: 4, borderWidth: 1, borderColor: ORANGE_MID,
  },
  metodeLabel: { fontSize: 8, color: GRAY, marginRight: 8 },
  metodeValue: { fontSize: 10, fontWeight: "bold", color: DARK },

  // Divider
  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 16 },

  // Items table
  table: { marginTop: 4, marginBottom: 4 },
  tableHead: {
    flexDirection: "row", backgroundColor: ORANGE,
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
  col1: { flex: 3 },
  col2: { flex: 0.8, textAlign: "right" },
  col3: { flex: 1.5, textAlign: "right" },
  col4: { flex: 1.5, textAlign: "right" },
  cellText: { fontSize: 8.5, color: DARK },

  // Reference
  refRow: { flexDirection: "row", marginTop: 4 },
  refLabel: { fontSize: 8, color: GRAY, width: 110 },
  refValue: { fontSize: 8, color: DARK, flex: 1 },

  // Note
  note: {
    marginTop: 16, padding: "8 12",
    borderWidth: 1, borderColor: ORANGE_MID, borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  noteText: { fontSize: 8, color: GRAY, textAlign: "center" },

  // Footer
  footer: {
    position: "absolute", bottom: 24, left: 48, right: 48,
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
export interface KwitansiItem {
  keterangan: string;
  jumlah: number;
  harga_satuan: number;
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
  buktiBayar?: string | null;  // base64 image for payment proof attachment
}

// ── Component ─────────────────────────────────────────────────────────────────
export function KwitansiPDF({
  nomor_kwitansi, nomor_invoice, tanggal_lunas, klien, alamat_klien, telepon_klien, lead_jenis,
  jumlah, metode_bayar, detail_bayar, catatan, logoUrl, items, buktiBayar,
}: KwitansiPDFProps) {
  const metodeLabel = detail_bayar ? `${metode_bayar} — ${detail_bayar}` : metode_bayar;

  return (
    <Document title={`Kwitansi ${nomor_kwitansi}`} author={COMPANY.name}>
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
            <Text style={styles.kwitansiTitle}>KWITANSI</Text>
            <Text style={styles.kwitansiNumber}>{nomor_kwitansi}</Text>
          </View>
        </View>

        {/* ── Body Card ── */}
        <View style={styles.card}>
          {/* Row 1: Klien & Tanggal */}
          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>DITERIMA DARI</Text>
              <Text style={styles.fieldValue}>{klien || "—"}</Text>
              {lead_jenis && <Text style={styles.fieldSub}>{lead_jenis}</Text>}
              {alamat_klien && <Text style={styles.fieldSub}>{alamat_klien}</Text>}
              {telepon_klien && <Text style={styles.fieldSub}>📞 {telepon_klien}</Text>}
            </View>
            <View style={[styles.cardField, { alignItems: "flex-end" }]}>
              <Text style={styles.fieldLabel}>TANGGAL PEMBAYARAN</Text>
              <Text style={styles.fieldValue}>{formatDate(tanggal_lunas)}</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>JUMLAH DITERIMA</Text>
            <Text style={styles.amountValue}>{formatRp(jumlah)}</Text>
          </View>

          {/* Metode */}
          <View style={styles.metodeBox}>
            <Text style={styles.metodeLabel}>METODE PEMBAYARAN</Text>
            <Text style={styles.metodeValue}>{metodeLabel || "—"}</Text>
          </View>
        </View>

        {/* ── Items Table ── */}
        {items && items.length > 0 && (
          <>
            <View style={[styles.divider, { marginVertical: 12 }]} />
            <Text style={{ fontSize: 8, color: ORANGE, fontWeight: "bold", marginBottom: 6 }}>
              RINCIAN ITEM YANG DIBAYAR
            </Text>
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
          </>
        )}

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Reference ── */}
        <View style={styles.refRow}>
          <Text style={styles.refLabel}>Nomor Invoice:</Text>
          <Text style={styles.refValue}>{nomor_invoice}</Text>
        </View>
        {catatan && (
          <View style={[styles.refRow, { marginTop: 4 }]}>
            <Text style={styles.refLabel}>Keterangan:</Text>
            <Text style={styles.refValue}>{catatan}</Text>
          </View>
        )}

        {/* ── Note ── */}
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Dokumen ini merupakan bukti pembayaran yang sah dari {COMPANY.name}.{"\n"}
            Harap simpan kwitansi ini sebagai bukti transaksi Anda.
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
          <Text style={styles.footerText}>Kwitansi #{nomor_kwitansi}</Text>
        </View>

      </Page>

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

          {/* Bukti bayar image */}
          <View style={{
            borderWidth: 1, borderColor: ORANGE_MID, borderRadius: 6,
            padding: 12, backgroundColor: "#ffffff", alignItems: "center",
          }}>
            <Text style={{ fontSize: 8, color: ORANGE, fontWeight: "bold", marginBottom: 10 }}>
              BUKTI PEMBAYARAN
            </Text>
            <Image
              src={buktiBayar}
              style={{ maxWidth: 460, maxHeight: 580, objectFit: "contain" }}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
            <Text style={styles.footerText}>Lampiran Kwitansi #{nomor_kwitansi}</Text>
          </View>
        </Page>
      )}

    </Document>
  );
}
