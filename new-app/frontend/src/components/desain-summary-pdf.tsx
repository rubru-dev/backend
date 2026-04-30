"use client";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const ORANGE = "#f97316";
const VIOLET = "#7c3aed";
const VIOLET_LIGHT = "#f5f3ff";
const DARK = "#1c1917";
const GRAY = "#78716c";
const GREEN = "#16a34a";
const GREEN_LIGHT = "#dcfce7";
const BLUE = "#1e40af";
const BLUE_LIGHT = "#dbeafe";

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

  filterRow: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  filterTag: { backgroundColor: VIOLET_LIGHT, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  filterLabel: { fontSize: 7, color: VIOLET, fontWeight: "bold" },
  filterValue: { fontSize: 8, color: DARK },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: VIOLET_LIGHT, borderRadius: 6, padding: 8 },
  statNum: { fontSize: 18, fontWeight: "bold", color: VIOLET },
  statLabel: { fontSize: 7, color: GRAY, marginTop: 2 },

  // Timeline header row
  tlHead: { flexDirection: "row", backgroundColor: VIOLET, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginTop: 8 },
  tlHeadCell: { color: "white", fontSize: 7.5, fontWeight: "bold" },

  tlRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: VIOLET_LIGHT, borderBottomWidth: 1, borderBottomColor: "#ddd6fe" },
  tlCell: { fontSize: 8, color: DARK },

  // Items sub-table
  itemTableHead: { flexDirection: "row", backgroundColor: "#ede9fe", paddingVertical: 3, paddingHorizontal: 6, marginLeft: 12 },
  itemTableHeadCell: { fontSize: 7, color: VIOLET, fontWeight: "bold" },
  itemRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", marginLeft: 12 },
  itemRowAlt: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", marginLeft: 12, backgroundColor: "#fafafa" },
  itemCell: { fontSize: 7.5, color: DARK },

  // Column widths — timeline row
  colNo: { width: 20 },
  colJenis: { width: 60 },
  colKlien: { flex: 1 },
  colBulan: { width: 72 },
  colProgress: { width: 48, textAlign: "center" },
  colItemCount: { width: 40, textAlign: "center" },
  colTgl: { width: 62 },

  // Column widths — item sub-row
  iColNo: { width: 20 },
  iColItem: { flex: 1 },
  iColPic: { width: 70 },
  iColTglMulai: { width: 62 },
  iColTarget: { width: 62 },
  iColStatus: { width: 56 },

  noItem: { paddingVertical: 4, paddingHorizontal: 18, marginLeft: 12 },

  footer: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#e7e5e4", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY },
});

const BULAN_LABEL = ["", "Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const statusColor = (s: string) => {
  if (s === "Selesai")     return { bg: GREEN_LIGHT, text: GREEN };
  if (s === "Proses")      return { bg: BLUE_LIGHT,  text: BLUE };
  return { bg: "#f3f4f6", text: "#374151" };
};

export interface DesainSummaryItem {
  nama_pekerjaan: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  pic: string;
  status: string;
}

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
  items?: DesainSummaryItem[];
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
          <View style={[styles.statBox, { backgroundColor: GREEN_LIGHT }]}>
            <Text style={[styles.statNum, { color: GREEN }]}>{selesai}</Text>
            <Text style={styles.statLabel}>Selesai (100%)</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: BLUE_LIGHT }]}>
            <Text style={[styles.statNum, { color: BLUE }]}>{proses}</Text>
            <Text style={styles.statLabel}>Sedang Berjalan</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#f3f4f6" }]}>
            <Text style={[styles.statNum, { color: "#374151" }]}>{belum}</Text>
            <Text style={styles.statLabel}>Belum Mulai</Text>
          </View>
        </View>

        {/* Timeline table header */}
        <View style={styles.tlHead}>
          <Text style={[styles.tlHeadCell, styles.colNo]}>No</Text>
          <Text style={[styles.tlHeadCell, styles.colJenis]}>Jenis</Text>
          <Text style={[styles.tlHeadCell, styles.colKlien]}>Klien</Text>
          <Text style={[styles.tlHeadCell, styles.colBulan]}>Bulan / Tahun</Text>
          <Text style={[styles.tlHeadCell, styles.colProgress]}>Progress</Text>
          <Text style={[styles.tlHeadCell, styles.colItemCount]}>Item</Text>
          <Text style={[styles.tlHeadCell, styles.colTgl]}>Tgl Mulai</Text>
          <Text style={[styles.tlHeadCell, styles.colTgl]}>Tgl Selesai</Text>
        </View>

        {rows.length === 0 && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: GRAY, fontSize: 9 }}>Tidak ada data yang sesuai filter</Text>
          </View>
        )}

        {rows.map((r, i) => {
          const progColor = r.progress === 100 ? GREEN : r.progress > 0 ? BLUE : "#374151";
          const items = r.items ?? [];
          return (
            <View key={r.id} wrap={false}>
              {/* Timeline summary row */}
              <View style={styles.tlRow}>
                <Text style={[styles.tlCell, styles.colNo]}>{i + 1}</Text>
                <Text style={[styles.tlCell, styles.colJenis]}>{r.jenis_desain ?? "—"}</Text>
                <Text style={[styles.tlCell, styles.colKlien]}>{r.klien ?? "—"}</Text>
                <Text style={[styles.tlCell, styles.colBulan]}>
                  {r.bulan ? BULAN_LABEL[r.bulan] : "—"}{r.tahun ? ` ${r.tahun}` : ""}
                </Text>
                <Text style={[styles.tlCell, styles.colProgress, { color: progColor, fontWeight: "bold", textAlign: "center" }]}>
                  {r.progress}%
                </Text>
                <Text style={[styles.tlCell, styles.colItemCount, { fontWeight: "bold", textAlign: "center" }]}>
                  {r.items_selesai}/{r.jumlah_item}
                </Text>
                <Text style={[styles.tlCell, styles.colTgl]}>{fmt(r.tanggal_mulai)}</Text>
                <Text style={[styles.tlCell, styles.colTgl]}>{fmt(r.tanggal_selesai)}</Text>
              </View>

              {/* Items sub-table */}
              {items.length > 0 ? (
                <>
                  <View style={styles.itemTableHead}>
                    <Text style={[styles.itemTableHeadCell, styles.iColNo]}>#</Text>
                    <Text style={[styles.itemTableHeadCell, styles.iColItem]}>Item Pekerjaan</Text>
                    <Text style={[styles.itemTableHeadCell, styles.iColPic]}>PIC</Text>
                    <Text style={[styles.itemTableHeadCell, styles.iColTglMulai]}>Tgl Mulai</Text>
                    <Text style={[styles.itemTableHeadCell, styles.iColTarget]}>Target Selesai</Text>
                    <Text style={[styles.itemTableHeadCell, styles.iColStatus]}>Status</Text>
                  </View>
                  {items.map((it, j) => {
                    const sc = statusColor(it.status);
                    const ItemRow = j % 2 === 0 ? styles.itemRow : styles.itemRowAlt;
                    return (
                      <View key={j} style={ItemRow}>
                        <Text style={[styles.itemCell, styles.iColNo]}>{j + 1}</Text>
                        <Text style={[styles.itemCell, styles.iColItem]}>{it.nama_pekerjaan}</Text>
                        <Text style={[styles.itemCell, styles.iColPic]}>{it.pic}</Text>
                        <Text style={[styles.itemCell, styles.iColTglMulai]}>{fmt(it.tanggal_mulai)}</Text>
                        <Text style={[styles.itemCell, styles.iColTarget]}>{fmt(it.tanggal_selesai)}</Text>
                        <View style={[styles.iColStatus, { justifyContent: "center" }]}>
                          <View style={{ backgroundColor: sc.bg, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, alignSelf: "flex-start" }}>
                            <Text style={[styles.itemCell, { color: sc.text, fontWeight: "bold" }]}>{it.status}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : (
                <View style={styles.noItem}>
                  <Text style={{ fontSize: 7, color: GRAY, fontStyle: "italic" }}>Belum ada item pekerjaan</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Report Rubru — PT. Rubah Rumah</Text>
          <Text style={styles.footerText}>Dicetak: {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
