import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const COMPANY = {
  name: "RubahRumah",
  tagline: "Platform Desain and Build",
  address: "Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116",
};

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const DARK = "#1c1917";
const GRAY = "#78716c";
const AMBER_BG = "#fffbeb";
const AMBER_TX = "#92400e";

export type PdfReport = {
  tanggal: string;
  project_type: "sipil" | "interior";
  project_nama: string;
  pic_name: string;
  kegiatan: string;
  kendala?: string | null;
  images: string[]; // base64 data URLs
};

export type PdfMeta = { periode: string; projek: string; total: number; dicetak: string };

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9.5, color: DARK, backgroundColor: "#ffffff" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 12,
  },
  logoBlock: { flexDirection: "row", alignItems: "center" },
  logo: { width: 42, height: 42, objectFit: "contain", marginRight: 8 },
  companyName: { fontSize: 13, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7, color: GRAY, marginTop: 1 },
  companyAddress: { fontSize: 6.5, color: GRAY, marginTop: 2, maxWidth: 230 },
  titleBlock: { alignItems: "flex-end" },
  docType: { fontSize: 15, fontWeight: "bold", color: ORANGE, letterSpacing: 0.5 },
  docSub: { fontSize: 8, color: GRAY, marginTop: 2 },

  filterCard: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 6, padding: 10,
    borderLeftWidth: 4, borderLeftColor: ORANGE, marginBottom: 14, flexDirection: "row", flexWrap: "wrap",
  },
  fItem: { width: "50%", flexDirection: "row", marginBottom: 2 },
  fLabel: { fontSize: 7, color: ORANGE, fontWeight: "bold", width: 55 },
  fValue: { fontSize: 8.5, color: DARK, fontWeight: "bold", flex: 1 },

  card: { borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, marginBottom: 10, overflow: "hidden" },
  cardHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fafaf9", paddingVertical: 5, paddingHorizontal: 9, borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  badge: { fontSize: 7.5, fontWeight: "bold", color: "#fff", backgroundColor: ORANGE, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  headDate: { fontSize: 8.5, fontWeight: "bold", color: DARK },
  headPic: { fontSize: 7.5, color: GRAY },
  cardBody: { padding: 9 },
  secLabel: { fontSize: 6.5, color: GRAY, fontWeight: "bold", textTransform: "uppercase", marginBottom: 2 },
  kegiatan: { fontSize: 9, color: DARK, lineHeight: 1.4 },
  kendala: { fontSize: 8, color: AMBER_TX, backgroundColor: AMBER_BG, borderRadius: 3, padding: 5, marginTop: 6 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 },
  photo: { width: 96, height: 72, objectFit: "cover", borderRadius: 3, marginRight: 5, marginBottom: 5, borderWidth: 1, borderColor: "#e7e5e4" },

  empty: { textAlign: "center", color: GRAY, fontSize: 10, marginTop: 40 },
  footer: {
    position: "absolute", bottom: 18, left: 32, right: 32,
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 6,
  },
  footerTx: { fontSize: 7, color: GRAY },
});

export function LaporanPicPdf({ reports, logo, meta }: { reports: PdfReport[]; logo: string; meta: PdfMeta }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          <View style={s.logoBlock}>
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <View>
              <Text style={s.companyName}>{COMPANY.name}</Text>
              <Text style={s.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={s.companyAddress}>{COMPANY.address}</Text>
            </View>
          </View>
          <View style={s.titleBlock}>
            <Text style={s.docType}>LAPORAN HARIAN</Text>
            <Text style={s.docSub}>PIC Project</Text>
          </View>
        </View>

        {/* Filter info */}
        <View style={s.filterCard}>
          <View style={s.fItem}><Text style={s.fLabel}>Periode</Text><Text style={s.fValue}>{meta.periode}</Text></View>
          <View style={s.fItem}><Text style={s.fLabel}>Projek</Text><Text style={s.fValue}>{meta.projek}</Text></View>
          <View style={s.fItem}><Text style={s.fLabel}>Total</Text><Text style={s.fValue}>{meta.total} laporan</Text></View>
          <View style={s.fItem}><Text style={s.fLabel}>Dicetak</Text><Text style={s.fValue}>{meta.dicetak}</Text></View>
        </View>

        {reports.length === 0 ? (
          <Text style={s.empty}>Tidak ada laporan pada filter yang dipilih.</Text>
        ) : (
          reports.map((r, i) => (
            <View key={i} style={s.card} wrap={false}>
              <View style={s.cardHead}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={s.badge}>{r.project_type === "interior" ? "INTERIOR" : "SIPIL"}</Text>
                  <Text style={{ ...s.headDate, marginLeft: 6 }}>{r.project_nama}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.headDate}>{r.tanggal}</Text>
                  <Text style={s.headPic}>PIC: {r.pic_name}</Text>
                </View>
              </View>
              <View style={s.cardBody}>
                <Text style={s.secLabel}>Kegiatan</Text>
                <Text style={s.kegiatan}>{r.kegiatan}</Text>
                {r.kendala ? <Text style={s.kendala}>Kendala: {r.kendala}</Text> : null}
                {r.images.length > 0 && (
                  <View style={s.photoGrid}>
                    {r.images.map((src, j) => <Image key={j} src={src} style={s.photo} />)}
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerTx}>{COMPANY.name} — Laporan Harian PIC Project</Text>
          <Text style={s.footerTx} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
