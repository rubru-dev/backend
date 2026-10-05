import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { KontrakCompany, KontrakDokumen, KontrakDokumenPasal, KontrakTemplatePasal } from "@/lib/api/addendum";

type AddendumPasal = KontrakTemplatePasal | KontrakDokumenPasal;

export interface AddendumPDFProps {
  dok: KontrakDokumen;
  company: KontrakCompany;
  pasals: AddendumPasal[];
  logoUrl?: string;
  sigWatermarkBase64?: string;
}

const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 42, paddingHorizontal: 52, fontFamily: "Times-Roman", fontSize: 10.5, lineHeight: 1.45, color: "#000" },
  logo: { width: 110, height: 38, objectFit: "contain", objectPosition: "left center", marginBottom: 8 },
  header: { borderBottomWidth: 2, borderBottomColor: "#000", paddingBottom: 10, marginBottom: 10, alignItems: "center" },
  title: { fontSize: 14, fontFamily: "Times-Bold", textTransform: "uppercase", letterSpacing: 0.7 },
  number: { fontSize: 10, marginTop: 4 },
  work: { fontSize: 10, fontFamily: "Times-Bold", marginTop: 2 },
  attachmentBox: { marginBottom: 10, fontSize: 9.5 },
  bold: { fontFamily: "Times-Bold" },
  rule: { borderTopWidth: 1, borderTopColor: "#000", marginVertical: 8 },
  paragraph: { fontSize: 10.5, textAlign: "justify", marginBottom: 10 },
  infoTable: { marginBottom: 4 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabel: { width: 92 },
  infoValue: { flex: 1 },
  pasal: { marginVertical: 8 },
  pasalTitle: { fontFamily: "Times-Bold", textAlign: "center", textTransform: "uppercase", marginBottom: 5 },
  pasalText: { fontSize: 10.5, textAlign: "justify", lineHeight: 1.55 },
  closing: { marginTop: 12 },
  date: { textAlign: "right", marginTop: 10, marginBottom: 16 },
  signatures: { flexDirection: "row", alignItems: "flex-start" },
  signatureColumn: { width: "50%", alignItems: "center" },
  signatureRole: { fontFamily: "Times-Bold", fontSize: 9.5, marginBottom: 6 },
  signatureCell: { width: "100%", alignItems: "center", marginBottom: 18 },
  signatureSpace: { height: 78, width: 150, alignItems: "center", justifyContent: "center", position: "relative" },
  watermark: { position: "absolute", width: 86, height: 86, objectFit: "contain", opacity: 0.45 },
  signature: { position: "relative", height: 58, width: 145, objectFit: "contain" },
  signatureLine: { width: 145, borderTopWidth: 1, borderTopColor: "#000", paddingTop: 3, alignItems: "center" },
  signatureName: { fontSize: 9 },
  signatureDate: { fontSize: 8, color: "#555", marginTop: 2 },
});

const textLines = (value: string | null | undefined) => (value || "-").split(/\r?\n/);
const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>: {value || "-"}</Text></View>;
}

function Signature({ role, name, signature, date, watermark }: { role: string; name: string | null; signature: string | null; date: string | null; watermark?: string }) {
  return (
    <View style={styles.signatureCell} wrap={false}>
      <Text style={styles.signatureRole}>{role}</Text>
      <View style={styles.signatureSpace}>
        {watermark ? <Image src={watermark} style={styles.watermark} /> : null}
        {signature ? <Image src={signature} style={styles.signature} /> : null}
      </View>
      <View style={styles.signatureLine}>
        <Text style={styles.signatureName}>({name || ".............................."})</Text>
        {date ? <Text style={styles.signatureDate}>{formatDate(date)}</Text> : null}
      </View>
    </View>
  );
}

export default function AddendumPDF({ dok, company, pasals, logoUrl, sigWatermarkBase64 }: AddendumPDFProps) {
  const pembuka = dok.template?.pembuka || "Sehubungan dengan adanya perubahan dalam lingkup pekerjaan, maka Para Pihak dengan ini sepakat untuk membuat Addendum Kontrak Kerja, yang merupakan bagian tidak terpisahkan dari kontrak utama tersebut, dengan ketentuan sebagai berikut:";
  const penutup = dok.template?.penutup || "Demikian Addendum Kontrak ini dibuat dan ditandatangani oleh Para Pihak dalam keadaan sehat dan tanpa adanya paksaan dari pihak manapun, untuk dapat dipergunakan sebagaimana mestinya.";
  const openingDate = dok.tanggal
    ? new Date(dok.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "________________________";

  return (
    <Document title={`${dok.template?.judul || "Addendum Kontrak"} ${dok.nomor_kontrak || ""}`}>
      <Page size="A4" style={styles.page}>
        {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
        <View style={styles.header}>
          <Text style={styles.title}>{dok.template?.judul || "Addendum Kontrak Pekerjaan"}</Text>
          <Text style={styles.number}>No: {dok.nomor_kontrak || "-"}</Text>
          {dok.jenis_pekerjaan ? <Text style={styles.work}>PEKERJAAN: {dok.jenis_pekerjaan}</Text> : null}
        </View>

        <View style={styles.attachmentBox} wrap={false}>
          <Text style={styles.bold}>LAMPIRAN:</Text>
          {dok.lampirans.length ? dok.lampirans.map((item) => <Text key={item.id}>• {item.judul}</Text>) : <Text>-</Text>}
        </View>
        <View style={styles.rule} />

        <Text style={styles.paragraph}>Pada hari <Text style={styles.bold}>{dok.tanggal ? openingDate.split(",")[0] : "_____"}</Text>, tanggal <Text style={styles.bold}>{dok.tanggal ? openingDate.split(",").slice(1).join(",").trim() : "__ _______ ____"}</Text>, di Bekasi, yang bertanda tangan di bawah ini:</Text>

        <View style={styles.infoTable}>
          <InfoRow label="Nama" value={company.nama} />
          <InfoRow label="No. NIB" value={company.nib} />
          <InfoRow label="Alamat" value={company.alamat} />
          <InfoRow label="Telepon" value={company.telepon} />
        </View>
        <Text style={styles.paragraph}>Selanjutnya disebut <Text style={styles.bold}>PIHAK PERTAMA</Text>.</Text>

        <View style={styles.infoTable}>
          <InfoRow label="Nama" value={dok.nama_client} />
          <InfoRow label="Alamat" value={dok.alamat_client} />
          <InfoRow label="Telepon" value={dok.telepon_client} />
        </View>
        <Text style={styles.paragraph}>Selanjutnya disebut <Text style={styles.bold}>PIHAK KEDUA</Text>.</Text>
        <View style={styles.rule} />

        <View style={styles.paragraph}>{textLines(pembuka).map((line, i) => <Text key={i}>{line}{i < textLines(pembuka).length - 1 ? "\n" : ""}</Text>)}</View>
        <View style={styles.rule} />

        {pasals.map((pasal, index) => {
          const title = (pasal.judul_pasal || "").replace(/^pasal\s*\d+\s*[:.\-]?\s*/i, "").trim();
          return (
            <View key={`${pasal.id}-${index}`} style={styles.pasal}>
              <Text style={styles.pasalTitle}>PASAL {index + 1}{title ? `\n${title.toUpperCase()}` : ""}</Text>
              <Text style={styles.pasalText}>{pasal.isi_pasal || ""}</Text>
            </View>
          );
        })}

        <View style={styles.closing} wrap={false}>
          <Text style={styles.paragraph}>{textLines(penutup).join("\n")}</Text>
          <Text style={styles.date}>{dok.tanggal ? `Bekasi, ${formatDate(dok.tanggal)}` : "Bekasi, __________ ____"}</Text>
          <View style={styles.signatures}>
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureRole}>PIHAK PERTAMA</Text>
              <Signature role="Relationship Officer" name={dok.ro_name} signature={dok.ro_signature} date={dok.ro_signed_at} watermark={sigWatermarkBase64} />
              <Signature role="Management RUBAHRUMAH" name={dok.management_name} signature={dok.management_signature} date={dok.management_signed_at} watermark={sigWatermarkBase64} />
            </View>
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureRole}>PIHAK KEDUA</Text>
              <Signature role="Customer" name={dok.client_name || dok.nama_client} signature={dok.client_signature} date={dok.client_signed_at} watermark={sigWatermarkBase64} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
