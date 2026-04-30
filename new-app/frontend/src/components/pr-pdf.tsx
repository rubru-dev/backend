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
const DARK = "#1c1917";
const GRAY = "#78716c";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: DARK, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 22, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSub: { fontSize: 9, color: GRAY, marginTop: 3 },
  accentBar: { height: 4, backgroundColor: ORANGE, borderRadius: 2, marginTop: 8, marginBottom: 16 },

  infoRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  infoBox: { flex: 1, backgroundColor: ORANGE_LIGHT, padding: 8, borderRadius: 4 },
  infoLabel: { fontSize: 7, color: ORANGE, fontWeight: "bold", marginBottom: 2 },
  infoValue: { fontSize: 9, color: DARK, fontWeight: "bold" },

  kepRow: { backgroundColor: ORANGE_LIGHT, padding: 8, borderRadius: 4, marginBottom: 16 },

  table: { marginTop: 4 },
  tableHead: { flexDirection: "row", backgroundColor: ORANGE, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 3 },
  tableHeadCell: { color: "white", fontSize: 8.5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT },
  cellText: { fontSize: 8.5, color: DARK },
  colNo: { width: 28 },
  colItem: { flex: 1 },
  colSat: { width: 44 },
  colQty: { width: 40, textAlign: "right" },
  colHarga: { width: 72, textAlign: "right" },
  colDiskon: { width: 68, textAlign: "right" },
  colSub: { width: 82, textAlign: "right" },

  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totalBox: { width: 250, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 3 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totalLineMain: { flexDirection: "row", justifyContent: "space-between", backgroundColor: ORANGE, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 3 },
  totalLabel: { fontSize: 8.5, color: GRAY },
  totalValue: { fontSize: 8.5, color: DARK },
  totalLabelMain: { fontSize: 9, color: "white", fontWeight: "bold" },
  totalValueMain: { fontSize: 9, color: "white", fontWeight: "bold" },

  footer: { marginTop: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  noteBox: { flex: 1, marginRight: 16 },
  noteLabel: { fontSize: 8, color: GRAY, marginBottom: 4 },
  noteText: { fontSize: 8.5, color: DARK },
  signBox: { width: 180, alignItems: "center" },
  signTitle: { fontSize: 9, color: DARK, marginBottom: 40, textAlign: "center" },
  signLine: { width: 160, borderTopWidth: 1, borderTopColor: DARK, paddingTop: 4, alignItems: "center" },
  signName: { fontSize: 9, fontWeight: "bold", color: DARK },
  signDate: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  pendingSign: { fontSize: 8, color: GRAY, fontStyle: "italic" },
});

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

export interface PRPDFProps {
  project: { nama_proyek?: string | null; klien?: string | null };
  pr: { nomor_pr?: string | null; tanggal: string | Date; keperluan?: string | null; status: string; catatan?: string | null; hf_signed_at?: string | null; hf_name?: string | null; hf_signature?: string | null; diskon_harga_keseluruhan?: number };
  items: { nama_item: string; satuan?: string | null; qty: number; harga_perkiraan: number; diskon_harga_satuan?: number; harga_net?: number; subtotal: number }[];
  total: number;
}

export default function PRPDF({ project, pr, items, total }: PRPDFProps) {
  const logoUrl = typeof window !== "undefined" ? window.location.origin + "/images/logo.png" : "";

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
            <Text style={styles.docTitle}>PURCHASE REQUEST</Text>
            <Text style={styles.docSub}>{pr.nomor_pr || "-"}</Text>
          </View>
        </View>

        <View style={styles.accentBar} />

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>NAMA PROYEK</Text>
            <Text style={styles.infoValue}>{project.nama_proyek || "-"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>KLIEN</Text>
            <Text style={styles.infoValue}>{project.klien || "-"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>TANGGAL</Text>
            <Text style={styles.infoValue}>{formatDate(pr.tanggal)}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>STATUS</Text>
            <Text style={styles.infoValue}>{pr.status}</Text>
          </View>
        </View>

        {pr.keperluan && (
          <View style={styles.kepRow}>
            <Text style={styles.infoLabel}>KEPERLUAN / TUJUAN</Text>
            <Text style={styles.infoValue}>{pr.keperluan}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.colNo]}>No</Text>
            <Text style={[styles.tableHeadCell, styles.colItem]}>Nama Item</Text>
            <Text style={[styles.tableHeadCell, styles.colSat]}>Satuan</Text>
            <Text style={[styles.tableHeadCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeadCell, styles.colHarga]}>Harga</Text>
            <Text style={[styles.tableHeadCell, styles.colDiskon]}>Diskon/Sat.</Text>
            <Text style={[styles.tableHeadCell, styles.colSub]}>Subtotal</Text>
          </View>
          {items.map((it, i) => {
            const Row = i % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
            const diskon = it.diskon_harga_satuan ?? 0;
            return (
              <View key={i} style={Row}>
                <Text style={[styles.cellText, styles.colNo]}>{i + 1}</Text>
                <Text style={[styles.cellText, styles.colItem]}>{it.nama_item}</Text>
                <Text style={[styles.cellText, styles.colSat]}>{it.satuan || "-"}</Text>
                <Text style={[styles.cellText, styles.colQty]}>{it.qty}</Text>
                <Text style={[styles.cellText, styles.colHarga]}>{formatRp(it.harga_perkiraan)}</Text>
                <Text style={[styles.cellText, styles.colDiskon]}>{diskon > 0 ? formatRp(diskon) : "-"}</Text>
                <Text style={[styles.cellText, styles.colSub]}>{formatRp(it.subtotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Total */}
        {(() => {
          const subtotalBefore = items.reduce((s, it) => s + it.subtotal, 0);
          const diskonKeseluruhan = pr.diskon_harga_keseluruhan ?? 0;
          const hasDiskonItem = items.some(it => (it.diskon_harga_satuan ?? 0) > 0);
          const hasDiskonKeseluruhan = diskonKeseluruhan > 0;
          return (
            <View style={styles.totalRow}>
              <View style={styles.totalBox}>
                {(hasDiskonItem || hasDiskonKeseluruhan) && (
                  <>
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>{formatRp(subtotalBefore)}</Text>
                    </View>
                    {hasDiskonKeseluruhan && (
                      <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>Diskon Keseluruhan</Text>
                        <Text style={[styles.totalValue, { color: "#dc2626" }]}>- {formatRp(diskonKeseluruhan)}</Text>
                      </View>
                    )}
                  </>
                )}
                <View style={styles.totalLineMain}>
                  <Text style={styles.totalLabelMain}>Total Estimasi</Text>
                  <Text style={styles.totalValueMain}>{formatRp(total)}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.noteBox}>
            {pr.catatan && (
              <>
                <Text style={styles.noteLabel}>Catatan:</Text>
                <Text style={styles.noteText}>{pr.catatan}</Text>
              </>
            )}
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Head Finance</Text>
            {pr.hf_signed_at ? (
              <>
                {pr.hf_signature && (
                  <Image src={pr.hf_signature} style={{ width: 100, height: 50, objectFit: "contain", marginBottom: 4 }} />
                )}
                <View style={styles.signLine}>
                  <Text style={styles.signName}>{pr.hf_name || "-"}</Text>
                  <Text style={styles.signDate}>{formatDate(pr.hf_signed_at)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.signLine}>
                <Text style={styles.pendingSign}>(Belum ditandatangani)</Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
