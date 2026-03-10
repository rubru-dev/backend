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

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: ORANGE },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 48, height: 48, objectFit: "contain" },
  companyName: { fontSize: 15, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 16, fontWeight: "bold", color: ORANGE, letterSpacing: 0.5 },
  docSub: { fontSize: 8, color: GRAY, marginTop: 2 },

  accentBar: { height: 3, backgroundColor: ORANGE, borderRadius: 2, marginTop: 8, marginBottom: 12 },

  infoSection: { marginBottom: 14 },
  infoGrid: { flexDirection: "row", gap: 6, marginBottom: 6 },
  infoBox: { flex: 1, backgroundColor: ORANGE_LIGHT, padding: 7, borderRadius: 3 },
  infoLabel: { fontSize: 6.5, color: ORANGE, fontWeight: "bold", marginBottom: 1 },
  infoValue: { fontSize: 8.5, color: DARK, fontWeight: "bold" },

  tableHead: { flexDirection: "row", backgroundColor: ORANGE, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 2 },
  tableHeadCell: { color: "white", fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4", backgroundColor: ORANGE_LIGHT },
  cellText: { fontSize: 8, color: DARK },

  colNo: { width: 22 },
  colNama: { flex: 1 },
  colDesk: { flex: 1.2 },
  colQty: { width: 50, textAlign: "right" },
  colSatuan: { width: 50, textAlign: "center" },
  colJumlah: { width: 70, textAlign: "right" },

  signSection: { flexDirection: "row", justifyContent: "space-between", marginTop: 36 },
  signBox: { width: 180, alignItems: "center" },
  signTitle: { fontSize: 9, color: DARK, marginBottom: 2, textAlign: "center" },
  signName: { fontSize: 9, fontWeight: "bold", color: DARK },
  signDate: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  signLine: { width: 160, borderTopWidth: 1, borderTopColor: DARK, paddingTop: 4, alignItems: "center", marginTop: 0 },
  signBlankBox: { width: 160, height: 56, borderWidth: 1, borderColor: "#d6d3d1", borderRadius: 2, marginBottom: 6 },
  pendingSign: { fontSize: 8, color: GRAY, fontStyle: "italic" },

  footer: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#e7e5e4", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY, textAlign: "center" },
});

const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

export interface SuratJalanPDFProps {
  project: { nama_proyek?: string | null; klien?: string | null; lokasi?: string | null };
  surat_jalan: {
    no_dokumen?: string | null;
    tanggal?: string | Date | null;
    penerima?: string | null;
    no_telp?: string | null;
    af_signed_at?: string | null;
    af_name?: string | null;
    af_signature?: string | null;
  };
  items: { id: number; nama_barang: string; deskripsi: string; qty: number; satuan: string }[];
}

export default function SuratJalanPDF({ project, surat_jalan, items }: SuratJalanPDFProps) {
  const logoUrl = typeof window !== "undefined" ? window.location.origin + "/images/logo.png" : "";
  const sj = surat_jalan;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.docTitle}>SURAT JALAN MATERIAL</Text>
            <Text style={styles.docSub}>{project.nama_proyek || "-"}</Text>
          </View>
        </View>

        <View style={styles.accentBar} />

        {/* Info boxes */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>NO. DOKUMEN</Text>
              <Text style={styles.infoValue}>{sj.no_dokumen || "-"}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>TANGGAL</Text>
              <Text style={styles.infoValue}>{formatDate(sj.tanggal)}</Text>
            </View>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>NAMA PENERIMA</Text>
              <Text style={styles.infoValue}>{sj.penerima || "-"}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>NO. TELP</Text>
              <Text style={styles.infoValue}>{sj.no_telp || "-"}</Text>
            </View>
            {project.lokasi && (
              <View style={[styles.infoBox, { flex: 1.5 }]}>
                <Text style={styles.infoLabel}>LOKASI PROYEK</Text>
                <Text style={styles.infoValue}>{project.lokasi}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items table */}
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadCell, styles.colNo]}>No</Text>
          <Text style={[styles.tableHeadCell, styles.colNama]}>Nama Barang</Text>
          <Text style={[styles.tableHeadCell, styles.colDesk]}>Deskripsi</Text>
          <Text style={[styles.tableHeadCell, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeadCell, styles.colSatuan]}>Satuan</Text>
          <Text style={[styles.tableHeadCell, styles.colJumlah]}>Jumlah</Text>
        </View>
        {items.map((it, i) => {
          const Row = i % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
          return (
            <View key={it.id} style={Row}>
              <Text style={[styles.cellText, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.cellText, styles.colNama]}>{it.nama_barang || "-"}</Text>
              <Text style={[styles.cellText, styles.colDesk]}>{it.deskripsi || "-"}</Text>
              <Text style={[styles.cellText, styles.colQty]}>{Number(it.qty).toLocaleString("id-ID")}</Text>
              <Text style={[styles.cellText, styles.colSatuan]}>{it.satuan || "-"}</Text>
              <Text style={[styles.cellText, styles.colJumlah]}>{Number(it.qty).toLocaleString("id-ID")} {it.satuan}</Text>
            </View>
          );
        })}
        {items.length === 0 && (
          <View style={[styles.tableRow, { justifyContent: "center" }]}>
            <Text style={{ fontSize: 8, color: GRAY }}>Tidak ada item</Text>
          </View>
        )}

        {/* Signature section */}
        <View style={styles.signSection}>
          {/* Left: Tanda tangan penerima (blank) */}
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Tanda Tangan Penerima</Text>
            <View style={styles.signBlankBox} />
            <View style={styles.signLine}>
              <Text style={styles.signName}>{sj.penerima || "_______________"}</Text>
              <Text style={styles.signDate}>{formatDate(sj.tanggal)}</Text>
            </View>
          </View>

          {/* Right: Admin Finance */}
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Admin Finance</Text>
            {sj.af_signature ? (
              <>
                <Image src={sj.af_signature} style={{ width: 120, height: 56, objectFit: "contain", marginBottom: 2 }} />
                <View style={styles.signLine}>
                  <Text style={styles.signName}>{sj.af_name || "-"}</Text>
                  <Text style={styles.signDate}>{formatDate(sj.af_signed_at)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.signBlankBox, { borderStyle: "dashed", borderColor: "#f97316" }]} />
                <View style={styles.signLine}>
                  <Text style={styles.pendingSign}>(Belum ditandatangani)</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Dokumen ini diterbitkan oleh {COMPANY.name} · {COMPANY.address}</Text>
        </View>
      </Page>
    </Document>
  );
}
