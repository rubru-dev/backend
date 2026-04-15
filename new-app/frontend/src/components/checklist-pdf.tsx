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
const GREEN_LIGHT = "#dcfce7";
const RED = "#dc2626";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, color: DARK, backgroundColor: "#ffffff" },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 14,
  },
  logoBlock: { flexDirection: "row", alignItems: "center" },
  logo: { width: 48, height: 48, objectFit: "contain", marginRight: 9 },
  companyName: { fontSize: 14, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7, color: GRAY, marginTop: 1 },
  companyAddress: { fontSize: 6.5, color: GRAY, marginTop: 2, maxWidth: 260 },
  companyContact: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  titleBlock: { alignItems: "flex-end" },
  docType: { fontSize: 17, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSubtype: { fontSize: 8.5, color: GRAY, marginTop: 2 },

  // Info card
  infoCard: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 6, padding: 12,
    borderLeftWidth: 4, borderLeftColor: ORANGE, marginBottom: 14,
  },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { fontSize: 7, color: ORANGE, fontWeight: "bold", width: 70 },
  infoValue: { fontSize: 8.5, fontWeight: "bold", color: DARK, flex: 1 },
  summaryRow: { flexDirection: "row", marginTop: 8 },
  summaryBox: { flex: 1, backgroundColor: "#f5f5f4", borderRadius: 4, padding: 7, marginRight: 5, alignItems: "center" },
  summaryLabel: { fontSize: 6.5, color: GRAY },
  summaryValue: { fontSize: 13, fontWeight: "bold", color: DARK, marginTop: 2 },

  // Item card
  itemCard: {
    borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, marginBottom: 10,
    overflow: "hidden",
  },
  itemCardDone: {
    borderWidth: 1, borderColor: "#86efac", borderRadius: 6, marginBottom: 10,
    overflow: "hidden",
  },
  itemHeader: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: "#f5f5f4",
  },
  itemHeaderDone: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: GREEN_LIGHT,
  },
  itemNo: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "#d6d3d1",
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  itemNoDone: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN,
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  itemNoText: { fontSize: 8, fontWeight: "bold", color: DARK },
  itemNoDoneText: { fontSize: 8, fontWeight: "bold", color: "white" },
  itemNama: { flex: 1, fontSize: 9.5, fontWeight: "bold", color: DARK },
  itemArea: { fontSize: 7.5, color: "#ea580c", fontWeight: "bold", marginLeft: 4 },
  statusBadgeDone: {
    backgroundColor: GREEN, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
  },
  statusBadgePending: {
    backgroundColor: "#e7e5e4", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
  },
  statusText: { fontSize: 7, fontWeight: "bold", color: "white" },
  statusTextPending: { fontSize: 7, fontWeight: "bold", color: GRAY },

  // Images section
  imagesSection: { flexDirection: "row", padding: 10, gap: 10 },
  imageGroup: { flex: 1 },
  imageSectionLabel: { fontSize: 7, fontWeight: "bold", color: GRAY, marginBottom: 5 },
  imageSectionLabelDone: { fontSize: 7, fontWeight: "bold", color: GREEN, marginBottom: 5 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cellImg: { width: 120, height: 90, objectFit: "cover", borderRadius: 4 },
  cellImgPlaceholder: {
    width: 120, height: 90, backgroundColor: "#e7e5e4", borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  placeholderText: { fontSize: 7, color: "#a8a29e" },

  // Footer
  footer: {
    position: "absolute", bottom: 20, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 4,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: GRAY },
});

export interface ChecklistPdfItem {
  no: number;
  nama_pekerjaan: string;
  area_pekerjaan?: string;
  gambar_b64s: (string | null)[];
  gambar_selesai_b64s: (string | null)[];
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
            <View>
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
            <View style={[s.summaryBox, { backgroundColor: GREEN_LIGHT }]}>
              <Text style={[s.summaryLabel, { color: GREEN }]}>Selesai</Text>
              <Text style={[s.summaryValue, { color: GREEN }]}>{selesai}</Text>
            </View>
            <View style={[s.summaryBox, { marginRight: 0, backgroundColor: "#fef2f2" }]}>
              <Text style={[s.summaryLabel, { color: RED }]}>Belum</Text>
              <Text style={[s.summaryValue, { color: RED }]}>{belum}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        {data.items.length === 0 ? (
          <View style={{ paddingVertical: 20 }}>
            <Text style={{ fontSize: 9, color: GRAY, textAlign: "center" }}>Belum ada item checklist</Text>
          </View>
        ) : (
          data.items.map((item, i) => {
            const validGambars = item.gambar_b64s.filter(Boolean) as string[];
            const validSelesai = item.gambar_selesai_b64s.filter(Boolean) as string[];
            return (
              <View key={i} style={item.is_checked ? s.itemCardDone : s.itemCard} wrap={false}>
                {/* Item header */}
                <View style={item.is_checked ? s.itemHeaderDone : s.itemHeader}>
                  <View style={item.is_checked ? s.itemNoDone : s.itemNo}>
                    <Text style={item.is_checked ? s.itemNoDoneText : s.itemNoText}>{item.no}</Text>
                  </View>
                  <Text style={s.itemNama}>{item.nama_pekerjaan}</Text>
                  {item.area_pekerjaan && (
                    <Text style={s.itemArea}>📍 {item.area_pekerjaan}</Text>
                  )}
                  <View style={{ marginLeft: 8 }}>
                    <View style={item.is_checked ? s.statusBadgeDone : s.statusBadgePending}>
                      <Text style={item.is_checked ? s.statusText : s.statusTextPending}>
                        {item.is_checked ? "✓ Selesai" : "○ Belum"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Images */}
                <View style={s.imagesSection}>
                  {/* Foto Pekerjaan */}
                  <View style={s.imageGroup}>
                    <Text style={s.imageSectionLabel}>Foto Pekerjaan</Text>
                    {validGambars.length > 0 ? (
                      <View style={s.imageGrid}>
                        {validGambars.map((b64, j) => (
                          <Image key={j} src={b64} style={s.cellImg} />
                        ))}
                      </View>
                    ) : (
                      <View style={s.cellImgPlaceholder}>
                        <Text style={s.placeholderText}>Belum ada foto</Text>
                      </View>
                    )}
                  </View>

                  {/* Foto Selesai */}
                  <View style={s.imageGroup}>
                    <Text style={s.imageSectionLabelDone}>Foto Selesai</Text>
                    {validSelesai.length > 0 ? (
                      <View style={s.imageGrid}>
                        {validSelesai.map((b64, j) => (
                          <Image key={j} src={b64} style={s.cellImg} />
                        ))}
                      </View>
                    ) : (
                      <View style={s.cellImgPlaceholder}>
                        <Text style={s.placeholderText}>Belum ada foto</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
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
