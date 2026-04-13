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
const GREEN = "#16a34a";

const s = StyleSheet.create({
  page: { padding: 44, fontSize: 9.5, color: DARK, backgroundColor: "#ffffff" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 18,
  },
  logoBlock: { flexDirection: "row", alignItems: "center" },
  logo: { width: 50, height: 50, objectFit: "contain", marginRight: 10 },
  companyInfo: { justifyContent: "center" },
  companyName: { fontSize: 15, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  companyAddress: { fontSize: 7, color: GRAY, marginTop: 2, maxWidth: 280 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 1 },
  titleBlock: { alignItems: "flex-end", justifyContent: "flex-end" },
  docType: { fontSize: 18, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSubtype: { fontSize: 9, color: GRAY, marginTop: 2 },

  infoCard: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 6, padding: 14,
    borderLeftWidth: 4, borderLeftColor: ORANGE, marginBottom: 16,
  },
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { fontSize: 7, color: ORANGE, fontWeight: "bold", width: 80 },
  infoValue: { fontSize: 9, fontWeight: "bold", color: DARK, flex: 1 },

  summaryRow: { flexDirection: "row", marginTop: 6 },
  summaryBox: { flex: 1, backgroundColor: "#f5f5f4", borderRadius: 4, padding: 8, marginRight: 6, alignItems: "center" },
  summaryLabel: { fontSize: 7, color: GRAY },
  summaryValue: { fontSize: 14, fontWeight: "bold", color: DARK, marginTop: 2 },

  tableHead: {
    flexDirection: "row", backgroundColor: "#44403c",
    paddingVertical: 6, paddingHorizontal: 6,
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },
  tableHeadCell: { color: "white", fontSize: 7.5, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4", minHeight: 70,
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT, minHeight: 70,
  },
  colNo: { width: 22, justifyContent: "center" },
  colImg: { width: 90, justifyContent: "center" },
  colNama: { flex: 1, justifyContent: "center", paddingHorizontal: 4 },
  colImgSelesai: { width: 90, justifyContent: "center" },
  colStatus: { width: 55, justifyContent: "center", alignItems: "center" },
  cell: { fontSize: 8, color: DARK },
  cellImg: { width: 80, height: 55, objectFit: "cover", borderRadius: 3 },
  cellImgPlaceholder: { width: 80, height: 55, backgroundColor: "#e7e5e4", borderRadius: 3 },

  checkIcon: { fontSize: 14, color: GREEN, fontWeight: "bold" },
  uncheckIcon: { fontSize: 14, color: GRAY },

  footer: {
    position: "absolute", bottom: 22, left: 44, right: 44,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 5,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },
});

export interface ChecklistPdfItem {
  no: number;
  nama_pekerjaan: string;
  gambar_b64: string | null;
  gambar_selesai_b64: string | null;
  is_checked: boolean;
}

export interface ChecklistPdfData {
  namaProyek: string;
  tipeProyek: string;
  klien?: string;
  lokasi?: string;
  items: ChecklistPdfItem[];
  logoUrl?: string;
}

export function ChecklistPDF({ data }: { data: ChecklistPdfData }) {
  const total = data.items.length;
  const selesai = data.items.filter((i) => i.is_checked).length;
  const belum = total - selesai;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBlock}>
            {data.logoUrl && <Image src={data.logoUrl} style={s.logo} />}
            <View style={s.companyInfo}>
              <Text style={s.companyName}>{COMPANY.name}</Text>
              <Text style={s.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={s.companyAddress}>{COMPANY.address}</Text>
              <Text style={s.companyContact}>Telp: {COMPANY.phone} | {COMPANY.email}</Text>
            </View>
          </View>
          <View style={s.titleBlock}>
            <Text style={s.docType}>FORM CHECKLIST</Text>
            <Text style={s.docSubtype}>{data.tipeProyek}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Proyek</Text>
            <Text style={s.infoValue}>{data.namaProyek}</Text>
          </View>
          {data.klien && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Klien</Text>
              <Text style={s.infoValue}>{data.klien}</Text>
            </View>
          )}
          {data.lokasi && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Lokasi</Text>
              <Text style={s.infoValue}>{data.lokasi}</Text>
            </View>
          )}
          <View style={s.summaryRow}>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>Total Item</Text>
              <Text style={s.summaryValue}>{total}</Text>
            </View>
            <View style={[s.summaryBox, { backgroundColor: "#dcfce7" }]}>
              <Text style={[s.summaryLabel, { color: GREEN }]}>Selesai</Text>
              <Text style={[s.summaryValue, { color: GREEN }]}>{selesai}</Text>
            </View>
            <View style={[s.summaryBox, { marginRight: 0, backgroundColor: "#fef2f2" }]}>
              <Text style={[s.summaryLabel, { color: "#dc2626" }]}>Belum</Text>
              <Text style={[s.summaryValue, { color: "#dc2626" }]}>{belum}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={s.tableHead}>
          <Text style={[s.tableHeadCell, s.colNo]}>No</Text>
          <Text style={[s.tableHeadCell, s.colImg]}>Gambar</Text>
          <Text style={[s.tableHeadCell, s.colNama]}>Nama Pekerjaan</Text>
          <Text style={[s.tableHeadCell, s.colImgSelesai]}>Foto Selesai</Text>
          <Text style={[s.tableHeadCell, s.colStatus]}>Status</Text>
        </View>
        {data.items.length === 0 ? (
          <View style={{ paddingVertical: 20 }}>
            <Text style={{ fontSize: 9, color: GRAY, textAlign: "center" }}>Belum ada item checklist</Text>
          </View>
        ) : (
          data.items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
              <View style={s.colNo}><Text style={s.cell}>{item.no}</Text></View>
              <View style={s.colImg}>
                {item.gambar_b64 ? <Image src={item.gambar_b64} style={s.cellImg} /> : <View style={s.cellImgPlaceholder} />}
              </View>
              <View style={s.colNama}><Text style={[s.cell, { fontWeight: "bold" }]}>{item.nama_pekerjaan}</Text></View>
              <View style={s.colImgSelesai}>
                {item.gambar_selesai_b64 ? <Image src={item.gambar_selesai_b64} style={s.cellImg} /> : <View style={s.cellImgPlaceholder} />}
              </View>
              <View style={s.colStatus}>
                <Text style={item.is_checked ? s.checkIcon : s.uncheckIcon}>{item.is_checked ? "\u2713" : "\u2717"}</Text>
                <Text style={{ fontSize: 6.5, color: item.is_checked ? GREEN : GRAY, marginTop: 2 }}>{item.is_checked ? "Selesai" : "Belum"}</Text>
              </View>
            </View>
          ))
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{COMPANY.name} — Form Checklist</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Hal ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
