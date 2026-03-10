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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: ORANGE },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 48, height: 48, objectFit: "contain" },
  companyName: { fontSize: 15, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 18, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSub: { fontSize: 8.5, color: GRAY, marginTop: 2 },
  accentBar: { height: 3, backgroundColor: ORANGE, borderRadius: 2, marginTop: 8, marginBottom: 14 },

  infoRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  infoBox: { flex: 1, backgroundColor: ORANGE_LIGHT, padding: 7, borderRadius: 3 },
  infoLabel: { fontSize: 6.5, color: ORANGE, fontWeight: "bold", marginBottom: 1 },
  infoValue: { fontSize: 8.5, color: DARK, fontWeight: "bold" },

  filterTag: { fontSize: 7, color: ORANGE, backgroundColor: ORANGE_MID, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 4 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },

  // Toko section
  tokoCard: { marginBottom: 12, borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 4 },
  tokoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: ORANGE_MID, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3 },
  tokoName: { fontSize: 9.5, fontWeight: "bold", color: DARK },
  tokoDate: { fontSize: 8, color: GRAY },
  tokoTotal: { fontSize: 9.5, fontWeight: "bold", color: ORANGE },

  // Items table inside toko
  tableHead: { flexDirection: "row", backgroundColor: ORANGE, paddingVertical: 5, paddingHorizontal: 8 },
  tableHeadCell: { color: "white", fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4", backgroundColor: ORANGE_LIGHT },
  cellText: { fontSize: 8, color: DARK },
  colNo: { width: 20 },
  colItem: { flex: 1 },
  colQty: { width: 38, textAlign: "right" },
  colSat: { width: 38 },
  colHarga: { width: 80, textAlign: "right" },
  colJml: { width: 85, textAlign: "right" },

  grandTotal: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  grandTotalBox: { width: 220, backgroundColor: ORANGE, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 3, flexDirection: "row", justifyContent: "space-between" },
  grandTotalLabel: { fontSize: 9, color: "white", fontWeight: "bold" },
  grandTotalValue: { fontSize: 9, color: "white", fontWeight: "bold" },
});

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export interface MaterialListPDFProps {
  project: { nama_proyek?: string | null; klien?: string | null };
  tokos: {
    id: number;
    nama_toko: string;
    tanggal?: string | Date | null;
    total: number;
    items: { nama_item: string; qty: number; satuan?: string | null; harga_satuan: number; jumlah: number }[];
  }[];
  grand_total: number;
  filter?: { toko?: string | null; bulan?: string | null; tahun?: string | null; tanggal_start?: string | null; tanggal_end?: string | null } | null;
}

export default function MaterialListPDF({ project, tokos, grand_total, filter }: MaterialListPDFProps) {
  const logoUrl = typeof window !== "undefined" ? window.location.origin + "/images/logo.png" : "";

  // Build filter description
  const filterTags: string[] = [];
  if (filter?.toko) filterTags.push(`Toko: ${filter.toko}`);
  if (filter?.bulan && filter?.tahun) filterTags.push(`${MONTHS[parseInt(filter.bulan) - 1]} ${filter.tahun}`);
  else if (filter?.tahun) filterTags.push(`Tahun ${filter.tahun}`);
  if (filter?.tanggal_start) filterTags.push(`Dari ${formatDate(filter.tanggal_start)}`);
  if (filter?.tanggal_end) filterTags.push(`Sampai ${formatDate(filter.tanggal_end)}`);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
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
            <Text style={styles.docTitle}>DAFTAR MATERIAL</Text>
            <Text style={styles.docSub}>{project.nama_proyek || "-"}</Text>
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
          <View style={[styles.infoBox, { flex: 1 }]}>
            <Text style={styles.infoLabel}>TOTAL TOKO</Text>
            <Text style={styles.infoValue}>{tokos.length} toko</Text>
          </View>
        </View>

        {/* Filter Tags */}
        {filterTags.length > 0 && (
          <View style={styles.filterRow}>
            <Text style={{ fontSize: 7.5, color: GRAY, marginRight: 6, marginTop: 2 }}>Filter:</Text>
            {filterTags.map((tag, i) => <Text key={i} style={styles.filterTag}>{tag}</Text>)}
          </View>
        )}

        {/* Toko Cards */}
        {tokos.map((toko) => (
          <View key={toko.id} style={styles.tokoCard} wrap={false}>
            {/* Toko Header */}
            <View style={styles.tokoHeader}>
              <View>
                <Text style={styles.tokoName}>{toko.nama_toko}</Text>
                <Text style={styles.tokoDate}>{formatDate(toko.tanggal)}</Text>
              </View>
              <Text style={styles.tokoTotal}>{formatRp(toko.total)}</Text>
            </View>
            {/* Items */}
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.colNo]}>No</Text>
              <Text style={[styles.tableHeadCell, styles.colItem]}>Nama Item</Text>
              <Text style={[styles.tableHeadCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeadCell, styles.colSat]}>Sat</Text>
              <Text style={[styles.tableHeadCell, styles.colHarga]}>Harga Satuan</Text>
              <Text style={[styles.tableHeadCell, styles.colJml]}>Jumlah</Text>
            </View>
            {toko.items.map((it, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.cellText, styles.colNo]}>{i + 1}</Text>
                <Text style={[styles.cellText, styles.colItem]}>{it.nama_item}</Text>
                <Text style={[styles.cellText, styles.colQty]}>{it.qty}</Text>
                <Text style={[styles.cellText, styles.colSat]}>{it.satuan || "-"}</Text>
                <Text style={[styles.cellText, styles.colHarga]}>{formatRp(it.harga_satuan)}</Text>
                <Text style={[styles.cellText, styles.colJml]}>{formatRp(it.jumlah)}</Text>
              </View>
            ))}
            {toko.items.length === 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.cellText, { flex: 1, textAlign: "center", color: GRAY }]}>Tidak ada item</Text>
              </View>
            )}
          </View>
        ))}

        {/* Grand Total */}
        <View style={styles.grandTotal}>
          <View style={styles.grandTotalBox}>
            <Text style={styles.grandTotalLabel}>Total Keseluruhan</Text>
            <Text style={styles.grandTotalValue}>{formatRp(grand_total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
