"use client";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const VIOLET = "#7c3aed";
const VIOLET_LIGHT = "#f5f3ff";
const DARK = "#1c1917";
const GRAY = "#78716c";

const COMPANY = {
  name: "RubahRumah",
  tagline: "Platform Desain and Build",
  address: "Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116",
  phone: "0813-7640-5550",
  email: "info.rubahrumah@gmail.com",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: DARK, backgroundColor: "#ffffff" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: VIOLET },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 46, height: 46, objectFit: "contain" },
  companyName: { fontSize: 14, fontWeight: "bold", color: VIOLET },
  companyTagline: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 18, fontWeight: "bold", color: VIOLET, letterSpacing: 1 },
  docSub: { fontSize: 8, color: GRAY, marginTop: 2 },

  accentBar: { height: 3, backgroundColor: VIOLET, marginVertical: 8, borderRadius: 2 },

  filterRow: { flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  filterTag: { backgroundColor: VIOLET_LIGHT, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  filterLabel: { fontSize: 7, color: VIOLET, fontWeight: "bold" },
  filterValue: { fontSize: 8, color: DARK },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: VIOLET_LIGHT, borderRadius: 6, padding: 8 },
  statNum: { fontSize: 18, fontWeight: "bold", color: VIOLET },
  statLabel: { fontSize: 7, color: GRAY, marginTop: 2 },

  tableHead: { flexDirection: "row", backgroundColor: VIOLET, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3 },
  tableHeadCell: { color: "white", fontSize: 7.5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: VIOLET_LIGHT },
  cell: { fontSize: 8, color: DARK },

  colNo: { width: 20 },
  colJenis: { width: 56 },
  colKlien: { flex: 1 },
  colBulan: { width: 70 },
  colProgress: { width: 52, textAlign: "center" },
  colItem: { width: 52, textAlign: "center" },
  colTgl: { width: 66 },

  badgeSelesai: { backgroundColor: "#dcfce7", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  badgeProses: { backgroundColor: "#dbeafe", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  badgeBelum: { backgroundColor: "#f3f4f6", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },

  footer: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#e7e5e4", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY },
});

const BULAN_LABEL = ["", "Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export interface DesainSummaryRow {
  id: string;
  jenis_desain: string | null;
  klien: string | null;
  bulan: number | null;
  tahun: number | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  progress: number;
  jumlah_item: number;
  items_selesai: number;
}

export interface DesainSummaryPDFProps {
  logoUrl?: string;
  rows: DesainSummaryRow[];
  filters: {
    jenis?: string;
    bulan?: string;
    tahun?: string;
    tgl_from?: string;
    tgl_to?: string;
  };
  generatedAt: string;
}

export default function DesainSummaryPDF({ logoUrl, rows, filters, generatedAt }: DesainSummaryPDFProps) {
  const selesai = rows.filter((r) => r.progress === 100).length;
  const proses  = rows.filter((r) => r.progress > 0 && r.progress < 100).length;
  const belum   = rows.filter((r) => r.progress === 0).length;

  const activeFilters: { label: string; value: string }[] = [];
  if (filters.jenis)    activeFilters.push({ label: "Jenis Desain", value: filters.jenis });
  if (filters.bulan)    activeFilters.push({ label: "Bulan", value: BULAN_LABEL[Number(filters.bulan)] ?? filters.bulan });
  if (filters.tahun)    activeFilters.push({ label: "Tahun", value: filters.tahun });
  if (filters.tgl_from) activeFilters.push({ label: "Dari", value: fmt(filters.tgl_from) });
  if (filters.tgl_to)   activeFilters.push({ label: "Sampai", value: fmt(filters.tgl_to) });

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
            <Text style={styles.docTitle}>SUMMARY DESAIN</Text>
            <Text style={styles.docSub}>Rekap Timeline Projek Desain</Text>
            <Text style={[styles.docSub, { marginTop: 4 }]}>Dicetak: {generatedAt}</Text>
          </View>
        </View>

        <View style={styles.accentBar} />

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <View style={styles.filterRow}>
            <Text style={{ fontSize: 7.5, color: GRAY, alignSelf: "center" }}>Filter aktif:</Text>
            {activeFilters.map((f, i) => (
              <View key={i} style={styles.filterTag}>
                <Text style={styles.filterLabel}>{f.label}</Text>
                <Text style={styles.filterValue}>{f.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{rows.length}</Text>
            <Text style={styles.statLabel}>Total Timeline</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#dcfce7" }]}>
            <Text style={[styles.statNum, { color: "#16a34a" }]}>{selesai}</Text>
            <Text style={styles.statLabel}>Selesai (100%)</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#dbeafe" }]}>
            <Text style={[styles.statNum, { color: "#1e40af" }]}>{proses}</Text>
            <Text style={styles.statLabel}>Sedang Berjalan</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#f3f4f6" }]}>
            <Text style={[styles.statNum, { color: "#374151" }]}>{belum}</Text>
            <Text style={styles.statLabel}>Belum Mulai</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadCell, styles.colNo]}>No</Text>
          <Text style={[styles.tableHeadCell, styles.colJenis]}>Jenis</Text>
          <Text style={[styles.tableHeadCell, styles.colKlien]}>Klien</Text>
          <Text style={[styles.tableHeadCell, styles.colBulan]}>Bulan / Tahun</Text>
          <Text style={[styles.tableHeadCell, styles.colProgress]}>Progress</Text>
          <Text style={[styles.tableHeadCell, styles.colItem]}>Item</Text>
          <Text style={[styles.tableHeadCell, styles.colTgl]}>Tgl Mulai</Text>
          <Text style={[styles.tableHeadCell, styles.colTgl]}>Tgl Selesai</Text>
        </View>

        {rows.map((r, i) => {
          const Row = i % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
          const progStyle = r.progress === 100 ? styles.badgeSelesai : r.progress > 0 ? styles.badgeProses : styles.badgeBelum;
          const progColor = r.progress === 100 ? "#166534" : r.progress > 0 ? "#1e40af" : "#374151";
          return (
            <View key={r.id} style={Row}>
              <Text style={[styles.cell, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.cell, styles.colJenis]}>{r.jenis_desain ?? "—"}</Text>
              <Text style={[styles.cell, styles.colKlien]}>{r.klien ?? "—"}</Text>
              <Text style={[styles.cell, styles.colBulan]}>
                {r.bulan ? BULAN_LABEL[r.bulan] : "—"}{r.tahun ? ` ${r.tahun}` : ""}
              </Text>
              <View style={[styles.colProgress, { justifyContent: "center", alignItems: "center" }]}>
                <View style={progStyle}>
                  <Text style={[styles.cell, { color: progColor, fontWeight: "bold" }]}>{r.progress}%</Text>
                </View>
              </View>
              <Text style={[styles.cell, styles.colItem, { fontWeight: "bold" }]}>
                {r.items_selesai}/{r.jumlah_item}
              </Text>
              <Text style={[styles.cell, styles.colTgl]}>{fmt(r.tanggal_mulai)}</Text>
              <Text style={[styles.cell, styles.colTgl]}>{fmt(r.tanggal_selesai)}</Text>
            </View>
          );
        })}

        {rows.length === 0 && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: GRAY, fontSize: 9 }}>Tidak ada data yang sesuai filter</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Report Rubru — PT. Rubah Rumah</Text>
          <Text style={styles.footerText}>Halaman 1</Text>
        </View>
      </Page>
    </Document>
  );
}
