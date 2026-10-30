import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const COMPANY = {
  name: "RubahRumah",
  tagline: "Platform Desain and Build",
  address: "Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116",
  phone: "0813-7640-5550",
  email: "info.rubahrumah@gmail.com",
};

const ORANGE = "#f97316";
const INK = "#1c1917";
const MUTED = "#78716c";

const s = StyleSheet.create({
  page: { padding: 34, fontSize: 8.5, color: INK, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 12 },
  brand: { flexDirection: "row", alignItems: "center", maxWidth: 390 },
  logo: { width: 46, height: 46, objectFit: "contain", marginRight: 8 },
  companyName: { fontSize: 14, fontWeight: "bold", color: ORANGE },
  tagline: { fontSize: 7, color: MUTED, marginTop: 1 },
  address: { fontSize: 6.3, color: MUTED, marginTop: 2 },
  contact: { fontSize: 6.3, color: MUTED, marginTop: 1 },
  title: { alignItems: "flex-end" },
  titleText: { fontSize: 15, fontWeight: "bold", color: ORANGE, letterSpacing: 0.6 },
  titleSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  info: { backgroundColor: "#fff7ed", borderLeftWidth: 4, borderLeftColor: ORANGE, padding: 9, marginBottom: 12 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 72, color: ORANGE, fontSize: 7, fontWeight: "bold" },
  infoValue: { flex: 1, fontSize: 8.5, fontWeight: "bold" },
  table: { borderWidth: 1, borderColor: "#a8a29e" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d6d3d1", minHeight: 42 },
  head: { backgroundColor: "#fff7ed", minHeight: 28 },
  cell: { padding: 5, borderRightWidth: 1, borderRightColor: "#d6d3d1", justifyContent: "center" },
  no: { width: 30, textAlign: "center" },
  item: { flex: 1 },
  doc: { width: 168 },
  paraf: { width: 58, textAlign: "center" },
  headerText: { fontSize: 7.5, fontWeight: "bold", textAlign: "center" },
  itemText: { fontSize: 8.5, fontWeight: "bold" },
  typeText: { fontSize: 6.5, color: ORANGE, marginTop: 3 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  photo: { width: 34, height: 30, objectFit: "cover", borderWidth: 1, borderColor: "#d6d3d1" },
  empty: { color: MUTED, fontSize: 7 },
  parafMark: { alignSelf: "center", color: INK, fontSize: 13, textAlign: "center" },
  parafEmpty: { alignSelf: "center", color: "#fff", fontSize: 10, textAlign: "center" },
  signatures: { marginTop: 24, borderWidth: 1, borderColor: "#d6d3d1", paddingVertical: 10, paddingHorizontal: 14 },
  signatureGrid: { flexDirection: "row", justifyContent: "space-between" },
  signature: { width: "40%", textAlign: "center" },
  signatureInternal: { width: "23%", textAlign: "center" },
  // Label di atas kolom; kolom RO sengaja kosong tapi tetap setinggi label agar garis sejajar.
  signatureLabel: { height: 12, fontSize: 8, fontWeight: "bold", textAlign: "center" },
  // Area tanda tangan; logo RO hanya berada di dalam area ini (di atas garis), tidak menimpa nama.
  signatureArea: { position: "relative", height: 58, borderBottomWidth: 1, borderBottomColor: "#57534e", marginBottom: 5, alignItems: "center", justifyContent: "center" },
  signatureLogo: { width: 110, height: 52, opacity: 0.18, objectFit: "contain" },
  signatureName: { fontSize: 8, fontWeight: "bold" },
  signatureRole: { fontSize: 7, color: MUTED, marginTop: 2 },
  noteBox: { marginTop: 18, borderWidth: 1, borderColor: "#a8a29e", minHeight: 72, padding: 7 },
  noteTitle: { fontSize: 8, fontWeight: "bold", marginBottom: 5 },
  noteText: { fontSize: 8, lineHeight: 1.35 },
  footer: { position: "absolute", bottom: 18, left: 34, right: 34, borderTopWidth: 1, borderTopColor: "#fed7aa", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6.5, color: MUTED },
});

export type ChecklistTerminPdfItem = {
  no: number;
  nama_pekerjaan: string;
  item_jenis?: string;
  dokumentasi_b64s: string[];
  pic_paraf: boolean;
  client_paraf: boolean;
  head_teknik_paraf: boolean;
};

export type ChecklistTerminPdfData = {
  namaProyek: string;
  tipeProyek: string;
  termin: string;
  klien?: string | null;
  lokasi?: string | null;
  signatories: { ro?: string | null; pic_project?: string | null; client?: string | null };
  items: ChecklistTerminPdfItem[];
  logoUrl?: string | null;
  catatan?: string | null;
  audience: "client" | "internal";
};

export function ChecklistTerminPDF({ data }: { data: ChecklistTerminPdfData }) {
  const internal = data.audience === "internal";
  const tableRows = data.items.flatMap((item) => {
    if (item.dokumentasi_b64s.length <= 12) return [{ ...item, continuation: 0, continuationCount: 1 }];
    const chunks: string[][] = [];
    for (let index = 0; index < item.dokumentasi_b64s.length; index += 12) {
      chunks.push(item.dokumentasi_b64s.slice(index, index + 12));
    }
    return chunks.map((images, index) => ({
      ...item,
      dokumentasi_b64s: images,
      continuation: index,
      continuationCount: chunks.length,
    }));
  });

  return <Document>
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <View style={s.brand}>
          {data.logoUrl && <Image src={data.logoUrl} style={s.logo} />}
          <View><Text style={s.companyName}>{COMPANY.name}</Text><Text style={s.tagline}>{COMPANY.tagline}</Text><Text style={s.address}>{COMPANY.address}</Text><Text style={s.contact}>Telp: {COMPANY.phone} | {COMPANY.email}</Text></View>
        </View>
        <View style={s.title}><Text style={s.titleText}>FORM CHECKLIST</Text><Text style={s.titleSub}>{data.tipeProyek}</Text></View>
      </View>

      <View style={s.info}>
        <View style={s.infoRow}><Text style={s.infoLabel}>Proyek</Text><Text style={s.infoValue}>{data.namaProyek}</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Termin</Text><Text style={s.infoValue}>{data.termin}</Text></View>
        {data.klien && <View style={s.infoRow}><Text style={s.infoLabel}>Client</Text><Text style={s.infoValue}>{data.klien}</Text></View>}
        {data.lokasi && <View style={s.infoRow}><Text style={s.infoLabel}>Lokasi</Text><Text style={s.infoValue}>{data.lokasi}</Text></View>}
      </View>

      <View style={s.table}>
        <View style={[s.row, s.head]} fixed>
          <View style={[s.cell, s.no]}><Text style={s.headerText}>No</Text></View>
          <View style={[s.cell, s.item]}><Text style={s.headerText}>Item Pekerjaan</Text></View>
          <View style={[s.cell, s.doc]}><Text style={s.headerText}>Dokumentasi</Text></View>
          <View style={[s.cell, s.paraf]}><Text style={s.headerText}>Paraf PIC</Text></View>
          <View style={[s.cell, s.paraf, { borderRightWidth: 0 }]}><Text style={s.headerText}>{internal ? "Paraf Head Teknik" : "Paraf Client"}</Text></View>
        </View>
        {tableRows.length === 0 ? <View style={s.row}><View style={[s.cell, { flex: 1, borderRightWidth: 0 }]}><Text style={s.empty}>Belum ada item pekerjaan pada termin ini.</Text></View></View> : tableRows.map((item) => <View style={s.row} key={`${item.no}-${item.continuation}`} wrap={false}>
          <View style={[s.cell, s.no]}><Text>{item.no}</Text></View>
          <View style={[s.cell, s.item]}><Text style={s.itemText}>{item.nama_pekerjaan}</Text><Text style={s.typeText}>{item.item_jenis === "TAMBAHAN" ? "PEKERJAAN TAMBAHAN" : "RAB AWAL"}{item.continuationCount > 1 ? ` · FOTO ${item.continuation + 1}/${item.continuationCount}` : ""}</Text></View>
          <View style={[s.cell, s.doc]}>{item.dokumentasi_b64s.length ? <View style={s.photos}>{item.dokumentasi_b64s.map((src, index) => <Image key={index} src={src} style={s.photo} />)}</View> : <Text style={s.empty}>Belum ada dokumentasi</Text>}</View>
          <View style={[s.cell, s.paraf, { backgroundColor: "#fff" }]}><Text style={item.pic_paraf ? s.parafMark : s.parafEmpty}>{item.pic_paraf ? "✓" : " "}</Text></View>
          <View style={[s.cell, s.paraf, { borderRightWidth: 0, backgroundColor: "#fff" }]}><Text style={(internal ? item.head_teknik_paraf : item.client_paraf) ? s.parafMark : s.parafEmpty}>{(internal ? item.head_teknik_paraf : item.client_paraf) ? "✓" : " "}</Text></View>
        </View>)}
      </View>

      <View style={s.noteBox}><Text style={s.noteTitle}>Catatan / Pekerjaan yang Masih Kurang</Text><Text style={s.noteText}>{data.catatan || " "}</Text></View>

      <View style={s.signatures} wrap={false}>
        {internal ? <View style={s.signatureGrid}>
          {["PIC", "Tukang", "Mandor", "Head Teknik"].map((role) => <View key={role} style={s.signatureInternal}>
            <Text style={s.signatureLabel}>Tanda tangan {role}</Text>
            <View style={s.signatureArea} />
            <Text style={s.signatureRole}>{role}</Text>
          </View>)}
        </View> : <View style={s.signatureGrid}>
          <View style={s.signature}>
            <Text style={s.signatureLabel}> </Text>
            <View style={s.signatureArea}>{data.logoUrl && <Image src={data.logoUrl} style={s.signatureLogo} />}</View>
            <Text style={s.signatureName}>{data.signatories.ro || "Belum diinput"}</Text>
            <Text style={s.signatureRole}>RO</Text>
          </View>
          <View style={s.signature}>
            <Text style={s.signatureLabel}>Menyetujui,</Text>
            <View style={s.signatureArea} />
            <Text style={s.signatureName}>{data.signatories.client || data.klien || "Belum diinput"}</Text>
            <Text style={s.signatureRole}>Client</Text>
          </View>
        </View>}
      </View>

      <View style={s.footer} fixed><Text style={s.footerText}>{COMPANY.name} — Form Checklist</Text><Text style={s.footerText} render={({ pageNumber, totalPages }) => `Hal ${pageNumber}/${totalPages}`} /></View>
    </Page>
  </Document>;
}
