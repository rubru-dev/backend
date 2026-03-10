import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ── Company Info ──────────────────────────────────────────────────────────────
const COMPANY = {
  name: "RubahRumah",
  tagline: "Platform Desain and Build",
  address: "Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116",
  phone: "0813-7640-5550",
  email: "info.rubahrumah@gmail.com",
};

const ORANGE       = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_MID   = "#fed7aa";
const DARK         = "#1c1917";
const GRAY         = "#78716c";
const GREEN        = "#166534";
const GREEN_BG     = "#dcfce7";
const RED          = "#991b1b";
const RED_BG       = "#fee2e2";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, color: DARK, backgroundColor: "#ffffff" },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 16,
  },
  logoBlock: { flexDirection: "row", alignItems: "center" },
  logo: { height: 46, width: "auto", objectFit: "contain", marginRight: 10 },
  companyName:    { fontSize: 14, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7, color: GRAY, marginTop: 1 },
  companyAddress: { fontSize: 6.5, color: GRAY, marginTop: 2, maxWidth: 260 },
  companyContact: { fontSize: 6.5, color: GRAY, marginTop: 1 },

  titleBlock:  { alignItems: "flex-end" },
  docType:     { fontSize: 18, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSubtype:  { fontSize: 8, color: GRAY, marginTop: 2 },
  printDate:   { fontSize: 7, color: GRAY, marginTop: 3 },

  infoCard: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 5, padding: 12,
    borderLeftWidth: 4, borderLeftColor: ORANGE, marginBottom: 14,
    flexDirection: "row", flexWrap: "wrap",
  },
  infoCol:   { flex: 1, marginRight: 8, minWidth: 100 },
  infoLabel: { fontSize: 7, color: ORANGE, fontWeight: "bold", marginBottom: 2 },
  infoValue: { fontSize: 9, fontWeight: "bold", color: DARK },

  sectionTitle: {
    fontSize: 9, fontWeight: "bold", color: "white",
    backgroundColor: ORANGE, borderRadius: 3,
    paddingVertical: 4, paddingHorizontal: 8,
    marginBottom: 3, marginTop: 10,
  },
  subSection: {
    fontSize: 8, fontWeight: "bold", color: DARK,
    backgroundColor: "#e7e5e4", borderRadius: 2,
    paddingVertical: 3, paddingHorizontal: 6,
    marginBottom: 2, marginTop: 5,
  },

  tableHead: {
    flexDirection: "row", backgroundColor: "#44403c",
    paddingVertical: 4, paddingHorizontal: 5,
  },
  tableHeadCell: { color: "white", fontSize: 7.5, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 5,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 5,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
    backgroundColor: ORANGE_LIGHT,
  },
  cell: { fontSize: 8, color: DARK },
  cellGray: { fontSize: 8, color: GRAY },

  badge: { borderRadius: 3, paddingVertical: 1, paddingHorizontal: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 6.5, fontWeight: "bold" },

  // Summary totals row
  totalRow: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5,
    backgroundColor: "#fef3c7", borderTopWidth: 1, borderTopColor: ORANGE_MID,
  },
  totalText: { fontSize: 8, fontWeight: "bold", color: DARK },

  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 10 },
  footer: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 4,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: GRAY },
});

// ── Columns widths ─────────────────────────────────────────────────────────────
const colNo   = { width: 18 };
const colNama = { flex: 1 };
const colKat  = { width: 80 };
const colVol  = { width: 52, textAlign: "right" as const };
const colSat  = { width: 36 };
const colPakai= { width: 52, textAlign: "right" as const };
const colSisa = { width: 52, textAlign: "right" as const };

const colTgl  = { width: 62 };
const colQty  = { width: 52, textAlign: "right" as const };
const colCat  = { width: 90 };
const colBy   = { width: 70 };

function fmtNum(n: number | null | undefined, digits = 4) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("id-ID", { maximumFractionDigits: digits });
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SoRappItem {
  id: string;
  nama: string;
  vol: number | null;
  sat: string | null;
  type: string;
  _kategori: string;
}
export interface SoTermin {
  id: string;
  urutan: number;
  nama: string | null;
  items: SoRappItem[];
}
export interface SoLog {
  id: string;
  tanggal: string;
  item_nama: string;
  qty_pakai: number;
  item_satuan: string | null;
  catatan: string | null;
  created_by: { name: string } | null;
}
export interface SipilStockOpnamePDFData {
  proyekNama: string;
  lokasi: string | null;
  termins: SoTermin[];      // each termin has flat items array
  logs: SoLog[];
  usageTotals: Record<string, number>; // key: "type:id"
  logoUrl?: string;
  tanggalCetak: string;
}

// ── PDF Component ─────────────────────────────────────────────────────────────
export function SipilStockOpnamePDF({ data }: { data: SipilStockOpnamePDFData }) {
  const { proyekNama, lokasi, termins, logs, usageTotals, logoUrl, tanggalCetak } = data;

  // Compute global summary totals
  const totalItems = termins.reduce((s, t) => s + t.items.length, 0);
  const totalLogEntries = logs.length;
  const totalQtyPakai = logs.reduce((s, l) => s + l.qty_pakai, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header} fixed>
          <View style={s.logoBlock}>
            {logoUrl && <Image src={logoUrl} style={s.logo} />}
            <View>
              <Text style={s.companyName}>{COMPANY.name}</Text>
              <Text style={s.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={s.companyAddress}>{COMPANY.address}</Text>
              <Text style={s.companyContact}>Telp: {COMPANY.phone}  |  {COMPANY.email}</Text>
            </View>
          </View>
          <View style={s.titleBlock}>
            <Text style={s.docType}>STOCK OPNAME</Text>
            <Text style={s.docSubtype}>Laporan Penggunaan Material</Text>
            <Text style={s.printDate}>Dicetak: {tanggalCetak}</Text>
          </View>
        </View>

        {/* ── Info Card ── */}
        <View style={s.infoCard}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>PROYEK</Text>
            <Text style={s.infoValue}>{proyekNama}</Text>
          </View>
          {lokasi ? (
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>LOKASI</Text>
              <Text style={s.infoValue}>{lokasi}</Text>
            </View>
          ) : null}
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>TOTAL ITEM RAPP</Text>
            <Text style={s.infoValue}>{totalItems} item</Text>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>TOTAL ENTRI LOG</Text>
            <Text style={s.infoValue}>{totalLogEntries} entri</Text>
          </View>
        </View>

        {/* ── RAPP Items Summary ── */}
        <Text style={s.sectionTitle}>Ringkasan Item RAPP &amp; Penggunaan</Text>
        {termins.map((termin) => {
          if (termin.items.length === 0) return null;
          return (
            <View key={termin.id} wrap={false}>
              <Text style={s.subSection}>{termin.nama ?? `Termin ${termin.urutan}`}</Text>
              {/* Table head */}
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, colNo]}>#</Text>
                <Text style={[s.tableHeadCell, colNama]}>Item</Text>
                <Text style={[s.tableHeadCell, colKat]}>Kategori</Text>
                <Text style={[s.tableHeadCell, colVol]}>Vol RAPP</Text>
                <Text style={[s.tableHeadCell, colSat]}>Sat</Text>
                <Text style={[s.tableHeadCell, colPakai]}>Dipakai</Text>
                <Text style={[s.tableHeadCell, colSisa]}>Sisa</Text>
              </View>
              {termin.items.map((item, idx) => {
                const key = `${item.type}:${item.id}`;
                const total = usageTotals[key] ?? 0;
                const sisa = item.vol !== null ? item.vol - total : null;
                const overuse = sisa !== null && sisa < 0;
                const RowStyle = idx % 2 === 1 ? s.tableRowAlt : s.tableRow;
                return (
                  <View key={key} style={RowStyle}>
                    <Text style={[s.cellGray, colNo]}>{idx + 1}</Text>
                    <Text style={[s.cell, colNama]}>{item.nama}</Text>
                    <Text style={[s.cellGray, colKat]}>{item._kategori}</Text>
                    <Text style={[s.cellGray, colVol]}>{item.vol !== null ? fmtNum(item.vol) : "—"}</Text>
                    <Text style={[s.cellGray, colSat]}>{item.sat ?? "—"}</Text>
                    <Text style={[{ ...s.cell, color: total > 0 ? ORANGE : GRAY }, colPakai]}>
                      {total > 0 ? fmtNum(total) : "—"}
                    </Text>
                    <Text style={[{ ...s.cell, color: overuse ? RED : sisa !== null && sisa < item.vol! ? GREEN : DARK }, colSisa]}>
                      {sisa !== null ? fmtNum(sisa) : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {termins.every((t) => t.items.length === 0) && (
          <View style={{ padding: 10 }}>
            <Text style={{ fontSize: 8, color: GRAY, textAlign: "center" }}>Belum ada item RAPP</Text>
          </View>
        )}

        <View style={s.divider} />

        {/* ── Usage History ── */}
        <Text style={s.sectionTitle}>Riwayat Penggunaan Harian</Text>
        {logs.length === 0 ? (
          <View style={{ padding: 10 }}>
            <Text style={{ fontSize: 8, color: GRAY, textAlign: "center" }}>Belum ada riwayat penggunaan</Text>
          </View>
        ) : (
          <View>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, colNo]}>#</Text>
              <Text style={[s.tableHeadCell, colTgl]}>Tanggal</Text>
              <Text style={[s.tableHeadCell, colNama]}>Item</Text>
              <Text style={[s.tableHeadCell, colQty]}>Qty</Text>
              <Text style={[s.tableHeadCell, colSat]}>Sat</Text>
              <Text style={[s.tableHeadCell, colCat]}>Catatan</Text>
              <Text style={[s.tableHeadCell, colBy]}>Dicatat Oleh</Text>
            </View>
            {logs.map((log, idx) => {
              const RowStyle = idx % 2 === 1 ? s.tableRowAlt : s.tableRow;
              return (
                <View key={log.id} style={RowStyle} wrap={false}>
                  <Text style={[s.cellGray, colNo]}>{idx + 1}</Text>
                  <Text style={[s.cell, colTgl]}>{fmtDate(log.tanggal)}</Text>
                  <Text style={[s.cell, colNama]}>{log.item_nama}</Text>
                  <Text style={[{ ...s.cell, color: ORANGE, fontWeight: "bold" }, colQty]}>{fmtNum(log.qty_pakai)}</Text>
                  <Text style={[s.cellGray, colSat]}>{log.item_satuan ?? "—"}</Text>
                  <Text style={[s.cellGray, colCat]}>{log.catatan ?? "—"}</Text>
                  <Text style={[s.cellGray, colBy]}>{log.created_by?.name ?? "—"}</Text>
                </View>
              );
            })}
            {/* Total row */}
            <View style={s.totalRow}>
              <Text style={[s.totalText, colNo]} />
              <Text style={[s.totalText, colTgl]} />
              <Text style={[{ ...s.totalText, color: GRAY }, colNama]}>Total Penggunaan</Text>
              <Text style={[{ ...s.totalText, color: ORANGE }, colQty]}>{fmtNum(totalQtyPakai)}</Text>
              <Text style={[s.totalText, colSat]} />
              <Text style={[s.totalText, colCat]} />
              <Text style={[s.totalText, colBy]} />
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Hal ${pageNumber} / ${totalPages}`} />
          <Text style={s.footerText}>{proyekNama}</Text>
        </View>
      </Page>
    </Document>
  );
}
