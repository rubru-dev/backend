import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ── Company Info ──────────────────────────────────────────────────────────────
const COMPANY = {
  name: "RubahRumah",
  tagline: "Platform Desain and Build",
  address: "Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116",
  phone: "0813-7640-5550",
  email: "info.rubahrumah@gmail.com",
};

// ── Colors ────────────────────────────────────────────────────────────────────
const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";
const ORANGE_MID = "#fed7aa";
const DARK = "#1c1917";
const GRAY = "#78716c";

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { padding: 36, fontSize: 8.5, color: DARK, backgroundColor: "#ffffff" },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: ORANGE, marginBottom: 14,
  },
  logoBlock: { flexDirection: "row", alignItems: "center" },
  logo: { width: 44, height: 44, objectFit: "contain", marginRight: 8 },
  companyInfo: { justifyContent: "center" },
  companyName: { fontSize: 13, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 7, color: GRAY, marginTop: 1 },
  companyAddress: { fontSize: 6.5, color: GRAY, marginTop: 1.5, maxWidth: 260 },
  companyContact: { fontSize: 6.5, color: GRAY, marginTop: 1 },
  titleBlock: { alignItems: "flex-end", justifyContent: "flex-end" },
  docType: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  docSub: { fontSize: 8, color: GRAY, marginTop: 2 },

  // Info card
  infoCard: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 5, padding: 10,
    borderLeftWidth: 3, borderLeftColor: ORANGE, marginBottom: 12,
  },
  infoRow: { flexDirection: "row" },
  infoCol: { flex: 1, marginRight: 8 },
  infoLabel: { fontSize: 6.5, color: ORANGE, fontWeight: "bold", marginBottom: 1 },
  infoValue: { fontSize: 8.5, fontWeight: "bold", color: DARK },

  // Termin section header
  terminHeader: {
    backgroundColor: DARK, borderRadius: 3,
    paddingVertical: 5, paddingHorizontal: 8,
    marginTop: 12, marginBottom: 4,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  terminTitle: { fontSize: 9, fontWeight: "bold", color: "white" },

  // Sub-section header (material / sipil / vendor)
  subHeader: {
    backgroundColor: ORANGE, paddingVertical: 3, paddingHorizontal: 8,
    marginBottom: 0, marginTop: 5,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  subHeaderBlue: {
    backgroundColor: "#1e40af", paddingVertical: 3, paddingHorizontal: 8,
    marginBottom: 0, marginTop: 5,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  subHeaderText: { fontSize: 7.5, fontWeight: "bold", color: "white" },
  subHeaderTotal: { fontSize: 7.5, fontWeight: "bold", color: "#fed7aa" },

  // Category row
  katRow: {
    backgroundColor: "#fff7ed", paddingVertical: 3, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: ORANGE_MID,
    flexDirection: "row", justifyContent: "space-between",
  },
  katLabel: { fontSize: 7.5, fontWeight: "bold", color: "#9a3412" },
  katTotal: { fontSize: 7.5, fontWeight: "bold", color: "#9a3412" },

  katRowBlue: {
    backgroundColor: "#eff6ff", paddingVertical: 3, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: "#bfdbfe",
    flexDirection: "row", justifyContent: "space-between",
  },
  katLabelBlue: { fontSize: 7.5, fontWeight: "bold", color: "#1e40af" },
  katTotalBlue: { fontSize: 7.5, fontWeight: "bold", color: "#1e40af" },

  // Table
  tableHead: {
    flexDirection: "row", backgroundColor: "#44403c",
    paddingVertical: 3, paddingHorizontal: 4,
  },
  tableHeadCell: { color: "white", fontSize: 7, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 3, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4",
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 3, paddingHorizontal: 4,
    borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT,
  },
  cell: { fontSize: 7.5, color: DARK },

  // Column widths
  colNo: { width: 16 },
  colMat: { flex: 1 },
  colVol: { width: 30 },
  colSat: { width: 28 },
  colHarga: { width: 66 },
  colJumlah: { width: 72, textAlign: "right" },
  colKet: { width: 64 },

  // Summary
  summarySection: {
    marginTop: 6, borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 4, overflow: "hidden",
  },
  summaryHead: {
    backgroundColor: DARK, paddingVertical: 4, paddingHorizontal: 8,
  },
  summaryHeadText: { fontSize: 8, fontWeight: "bold", color: "white" },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 3, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4",
  },
  summaryRowOrange: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4",
    backgroundColor: ORANGE_LIGHT,
  },
  summaryRowYellow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4",
    backgroundColor: "#fef9c3",
  },
  summaryRowBlue: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4",
    backgroundColor: "#eff6ff",
  },
  summaryRowGreen: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: "#f0fdf4",
  },
  summaryLabel: { fontSize: 7.5, color: GRAY },
  summaryValue: { fontSize: 7.5, fontWeight: "bold", color: DARK },

  // Footer
  footer: {
    position: "absolute", bottom: 20, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 4,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: GRAY },

  // Divider
  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 10 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}
function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RappPDFMaterialItem {
  material: string;
  vol: number;
  sat: string | null;
  harga_satuan: number;
  jumlah: number;
}
export interface RappPDFMaterialKategori {
  kode: string | null;
  nama: string;
  items: RappPDFMaterialItem[];
}
export interface RappPDFSipilItem {
  nama: string;
  vol: number | null;
  sat: string | null;
  harga_satuan: number | null;
  keterangan: string | null;
  jumlah: number;
}
export interface RappPDFVendorItem {
  nama: string;
  vol: number;
  sat: string | null;
  harga_satuan: number;
  jumlah: number;
}
export interface RappPDFVendorKategori {
  nama: string;
  items: RappPDFVendorItem[];
}
export interface RappPDFTermin {
  nama: string;
  material_kategoris: RappPDFMaterialKategori[];
  sipil_items: RappPDFSipilItem[];
  vendor_kategoris: RappPDFVendorKategori[];
  rab: number;
  total_material: number;
  total_sipil_rapp: number;
  total_vendor: number;
  total_rapp: number;
  selisih: number;
  margin: number;
}
export interface RappPDFData {
  nama_proyek: string;
  lokasi: string | null;
  termins: RappPDFTermin[];
  logoUrl?: string;
}

// ── Material Table ─────────────────────────────────────────────────────────────
function MaterialKategoriSection({ kat }: { kat: RappPDFMaterialKategori }) {
  const katTotal = kat.items.reduce((sum, i) => sum + i.jumlah, 0);
  return (
    <View>
      <View style={s.katRow}>
        <Text style={s.katLabel}>{kat.kode ? `${kat.kode}. ` : ""}{kat.nama}</Text>
        <Text style={s.katTotal}>{fmtRp(katTotal)}</Text>
      </View>
      <View style={s.tableHead}>
        <Text style={[s.tableHeadCell, s.colNo]}>No</Text>
        <Text style={[s.tableHeadCell, s.colMat]}>Material</Text>
        <Text style={[s.tableHeadCell, s.colVol]}>Vol</Text>
        <Text style={[s.tableHeadCell, s.colSat]}>Sat</Text>
        <Text style={[s.tableHeadCell, s.colHarga]}>Harga Satuan</Text>
        <Text style={[s.tableHeadCell, s.colJumlah]}>Jumlah</Text>
      </View>
      {kat.items.map((item, i) => (
        <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
          <Text style={[s.cell, s.colNo]}>{i + 1}</Text>
          <Text style={[s.cell, s.colMat]}>{item.material || "—"}</Text>
          <Text style={[s.cell, s.colVol]}>{fmtNum(item.vol)}</Text>
          <Text style={[s.cell, s.colSat]}>{item.sat ?? "—"}</Text>
          <Text style={[s.cell, s.colHarga]}>{fmtRp(item.harga_satuan)}</Text>
          <Text style={[s.cell, s.colJumlah]}>{fmtRp(item.jumlah)}</Text>
        </View>
      ))}
      {kat.items.length === 0 && (
        <View style={s.tableRow}>
          <Text style={[s.cell, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada item</Text>
        </View>
      )}
    </View>
  );
}

// ── Sipil Table ────────────────────────────────────────────────────────────────
function SipilTable({ items }: { items: RappPDFSipilItem[] }) {
  return (
    <View>
      <View style={s.tableHead}>
        <Text style={[s.tableHeadCell, s.colNo]}>No</Text>
        <Text style={[s.tableHeadCell, s.colMat]}>Nama</Text>
        <Text style={[s.tableHeadCell, s.colVol]}>Vol</Text>
        <Text style={[s.tableHeadCell, s.colSat]}>Sat</Text>
        <Text style={[s.tableHeadCell, s.colHarga]}>Harga Satuan</Text>
        <Text style={[s.tableHeadCell, s.colKet]}>Keterangan</Text>
        <Text style={[s.tableHeadCell, s.colJumlah]}>Jumlah</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
          <Text style={[s.cell, s.colNo]}>{i + 1}</Text>
          <Text style={[s.cell, s.colMat]}>{item.nama}</Text>
          <Text style={[s.cell, s.colVol]}>{item.vol !== null ? fmtNum(item.vol) : "—"}</Text>
          <Text style={[s.cell, s.colSat]}>{item.sat ?? "—"}</Text>
          <Text style={[s.cell, s.colHarga]}>{item.harga_satuan !== null ? fmtRp(item.harga_satuan) : "—"}</Text>
          <Text style={[s.cell, s.colKet]}>{item.keterangan ?? "—"}</Text>
          <Text style={[s.cell, s.colJumlah]}>{fmtRp(item.jumlah)}</Text>
        </View>
      ))}
      {items.length === 0 && (
        <View style={s.tableRow}>
          <Text style={[s.cell, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada item</Text>
        </View>
      )}
    </View>
  );
}

// ── Vendor Kategori Section ────────────────────────────────────────────────────
function VendorKategoriSection({ kat }: { kat: RappPDFVendorKategori }) {
  const katTotal = kat.items.reduce((sum, i) => sum + i.jumlah, 0);
  return (
    <View>
      <View style={s.katRowBlue}>
        <Text style={s.katLabelBlue}>{kat.nama}</Text>
        <Text style={s.katTotalBlue}>{fmtRp(katTotal)}</Text>
      </View>
      <View style={s.tableHead}>
        <Text style={[s.tableHeadCell, s.colNo]}>No</Text>
        <Text style={[s.tableHeadCell, s.colMat]}>Nama</Text>
        <Text style={[s.tableHeadCell, s.colVol]}>Vol</Text>
        <Text style={[s.tableHeadCell, s.colSat]}>Sat</Text>
        <Text style={[s.tableHeadCell, s.colHarga]}>Harga Satuan</Text>
        <Text style={[s.tableHeadCell, s.colJumlah]}>Jumlah</Text>
      </View>
      {kat.items.map((item, i) => (
        <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
          <Text style={[s.cell, s.colNo]}>{i + 1}</Text>
          <Text style={[s.cell, s.colMat]}>{item.nama}</Text>
          <Text style={[s.cell, s.colVol]}>{fmtNum(item.vol)}</Text>
          <Text style={[s.cell, s.colSat]}>{item.sat ?? "—"}</Text>
          <Text style={[s.cell, s.colHarga]}>{fmtRp(item.harga_satuan)}</Text>
          <Text style={[s.cell, s.colJumlah]}>{fmtRp(item.jumlah)}</Text>
        </View>
      ))}
      {kat.items.length === 0 && (
        <View style={s.tableRow}>
          <Text style={[s.cell, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada item</Text>
        </View>
      )}
    </View>
  );
}

// ── Summary Section ────────────────────────────────────────────────────────────
function SummarySection({ termin }: { termin: RappPDFTermin }) {
  return (
    <View style={s.summarySection}>
      <View style={s.summaryHead}>
        <Text style={s.summaryHeadText}>RINGKASAN RAPP — {termin.nama}</Text>
      </View>

      {/* Total material */}
      <View style={s.summaryRow}>
        <Text style={s.summaryLabel}>Total Biaya Material Bangunan</Text>
        <Text style={s.summaryValue}>{fmtRp(termin.total_material)}</Text>
      </View>

      {/* Sipil line items */}
      {termin.sipil_items.map((item, i) => (
        <View key={i} style={s.summaryRow}>
          <Text style={[s.summaryLabel, { paddingLeft: 12 }]}>
            {item.nama}{item.keterangan ? ` (${item.keterangan})` : ""}
          </Text>
          <Text style={s.summaryValue}>{fmtRp(item.jumlah)}</Text>
        </View>
      ))}

      {/* Total RAPP Sipil */}
      <View style={s.summaryRowOrange}>
        <Text style={[s.summaryLabel, { fontWeight: "bold", color: "#9a3412" }]}>Total RAPP Sipil</Text>
        <Text style={[s.summaryValue, { color: "#9a3412" }]}>{fmtRp(termin.total_sipil_rapp)}</Text>
      </View>

      {/* Vendor total (if any) */}
      {termin.total_vendor > 0 && (
        <View style={s.summaryRow}>
          <Text style={s.summaryLabel}>Total RAPP Vendor</Text>
          <Text style={s.summaryValue}>{fmtRp(termin.total_vendor)}</Text>
        </View>
      )}

      {/* Total RAPP Termin */}
      <View style={s.summaryRowYellow}>
        <Text style={[s.summaryLabel, { fontWeight: "bold", color: "#854d0e" }]}>Total RAPP {termin.nama}</Text>
        <Text style={[s.summaryValue, { color: "#854d0e" }]}>{fmtRp(termin.total_rapp)}</Text>
      </View>

      {/* RAB */}
      <View style={s.summaryRowBlue}>
        <Text style={[s.summaryLabel, { color: "#1e40af" }]}>RAB</Text>
        <Text style={[s.summaryValue, { color: "#1e40af" }]}>{fmtRp(termin.rab)}</Text>
      </View>

      {/* Selisih */}
      <View style={s.summaryRow}>
        <Text style={s.summaryLabel}>Selisih (RAB − RAPP)</Text>
        <Text style={[s.summaryValue, { color: termin.selisih >= 0 ? "#15803d" : "#dc2626" }]}>
          {fmtRp(termin.selisih)}
        </Text>
      </View>

      {/* Margin */}
      <View style={s.summaryRowGreen}>
        <Text style={[s.summaryLabel, { fontWeight: "bold", color: "#15803d" }]}>Margin</Text>
        <Text style={[s.summaryValue, { color: termin.margin >= 0 ? "#15803d" : "#dc2626", fontSize: 9 }]}>
          {termin.margin.toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

// ── Main RAPP PDF Component ───────────────────────────────────────────────────
export function RappPDF({ data }: { data: RappPDFData }) {
  return (
    <Document title={`RAPP Sipil — ${data.nama_proyek}`} author={COMPANY.name}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header} fixed>
          <View style={s.logoBlock}>
            {data.logoUrl && <Image style={s.logo} src={data.logoUrl} />}
            <View style={s.companyInfo}>
              <Text style={s.companyName}>{COMPANY.name}</Text>
              <Text style={s.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={s.companyAddress}>{COMPANY.address}</Text>
              <Text style={s.companyContact}>Telp: {COMPANY.phone}  |  {COMPANY.email}</Text>
            </View>
          </View>
          <View style={s.titleBlock}>
            <Text style={s.docType}>RAPP SIPIL</Text>
            <Text style={s.docSub}>Rencana Anggaran Pelaksanaan Proyek</Text>
          </View>
        </View>

        {/* ── Info Card ── */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>NAMA PROJECT</Text>
              <Text style={s.infoValue}>{data.nama_proyek || "—"}</Text>
            </View>
            {data.lokasi && (
              <View style={s.infoCol}>
                <Text style={s.infoLabel}>LOKASI</Text>
                <Text style={s.infoValue}>{data.lokasi}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Each Termin ── */}
        {data.termins.map((termin, ti) => (
          <View key={ti}>
            {/* Termin section header */}
            <View style={s.terminHeader} wrap={false}>
              <Text style={s.terminTitle}>{termin.nama}</Text>
            </View>

            {/* Material section */}
            {termin.material_kategoris.length > 0 && (
              <View>
                <View style={s.subHeader}>
                  <Text style={s.subHeaderText}>BIAYA MATERIAL BANGUNAN</Text>
                  <Text style={s.subHeaderTotal}>
                    {fmtRp(termin.material_kategoris.reduce(
                      (sum, k) => sum + k.items.reduce((s2, i) => s2 + i.jumlah, 0), 0
                    ))}
                  </Text>
                </View>
                {termin.material_kategoris.map((kat, ki) => (
                  <MaterialKategoriSection key={ki} kat={kat} />
                ))}
              </View>
            )}

            {/* RAPP Sipil section */}
            {termin.sipil_items.length > 0 && (
              <View>
                <View style={s.subHeader}>
                  <Text style={s.subHeaderText}>BIAYA TAMBAHAN (RAPP SIPIL)</Text>
                  <Text style={s.subHeaderTotal}>
                    {fmtRp(termin.sipil_items.reduce((sum, i) => sum + i.jumlah, 0))}
                  </Text>
                </View>
                <SipilTable items={termin.sipil_items} />
              </View>
            )}

            {/* Vendor section */}
            {termin.vendor_kategoris.length > 0 && (
              <View>
                <View style={s.subHeaderBlue}>
                  <Text style={s.subHeaderText}>RAPP VENDOR</Text>
                  <Text style={s.subHeaderTotal}>
                    {fmtRp(termin.vendor_kategoris.reduce(
                      (sum, k) => sum + k.items.reduce((s2, i) => s2 + i.jumlah, 0), 0
                    ))}
                  </Text>
                </View>
                {termin.vendor_kategoris.map((kat, ki) => (
                  <VendorKategoriSection key={ki} kat={kat} />
                ))}
              </View>
            )}

            {/* Summary */}
            <SummarySection termin={termin} />

            {/* Divider between termins */}
            {ti < data.termins.length - 1 && <View style={s.divider} />}
          </View>
        ))}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{COMPANY.name}  |  {COMPANY.phone}  |  {COMPANY.email}</Text>
          <Text style={s.footerText}>
            Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
