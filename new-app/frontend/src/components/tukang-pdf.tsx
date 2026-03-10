import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ── Company info (sama seperti invoice-pdf.tsx) ───────────────────────────────
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
  page: { padding: 40, fontSize: 10, color: DARK, backgroundColor: "#ffffff" },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 0, paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE,
  },
  logoBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 52, height: 52, objectFit: "contain" },
  companyInfo: { justifyContent: "center" },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 20, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSub: { fontSize: 8.5, color: GRAY, marginTop: 3 },

  // Info box
  infoBox: {
    marginTop: 16, marginBottom: 12,
    backgroundColor: ORANGE_LIGHT, borderLeftWidth: 3, borderLeftColor: ORANGE,
    padding: "8 10", borderRadius: 2,
    flexDirection: "row", justifyContent: "space-between",
  },
  infoLabel: { fontSize: 7.5, color: GRAY, marginBottom: 2 },
  infoValue: { fontSize: 10, fontWeight: "bold", color: DARK },
  infoCetak: { fontSize: 7.5, color: GRAY },

  // Table
  table: { marginTop: 4 },
  tableHead: {
    flexDirection: "row", backgroundColor: ORANGE,
    paddingVertical: 7, paddingHorizontal: 8, borderRadius: 3,
  },
  tableHeadCell: { color: "white", fontSize: 8.5, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT,
  },
  tableRowTotal: {
    flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: ORANGE, borderRadius: 3, marginTop: 2,
  },
  cellText: { fontSize: 9, color: DARK },
  cellBold: { fontSize: 9, fontWeight: "bold", color: DARK },
  cellWhite: { fontSize: 9, fontWeight: "bold", color: "white" },

  // Column widths (shared)
  cNo: { width: 24 },
  cMd: { flex: 2 },
  cSm: { flex: 1.2 },
  cXs: { flex: 1 },
  cRight: { flex: 1, textAlign: "right" },

  // Signatures
  signRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 24 },
  signBlock: { alignItems: "center", width: 160 },
  signTitleBox: { backgroundColor: ORANGE, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, marginBottom: 6 },
  signTitleText: { fontSize: 8, color: "white", fontWeight: "bold" },
  signImage: { width: 120, height: 50, objectFit: "contain", marginBottom: 4 },
  signImageEmpty: { width: 120, height: 50, borderBottomWidth: 1, borderBottomColor: "#d4d4d4", marginBottom: 4 },
  signName: { fontSize: 9, fontWeight: "bold", color: DARK },
  signDate: { fontSize: 7.5, color: GRAY, marginTop: 1 },

  // Footer
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 6,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: GRAY },
});

// ── Types ─────────────────────────────────────────────────────────────────────
export type TukangPDFType = "registry" | "absen" | "kasbon" | "gajian" | "kwitansi";

interface SignatureInfo {
  name?: string;
  at?: string | Date | null;
  signature?: string | null;
}

export interface TukangPDFProps {
  type: TukangPDFType;
  project: { nama_proyek: string; klien?: string };
  data: any[];
  meta?: {
    filter?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    signatures?: { af?: SignatureInfo; hf?: SignatureInfo };
  };
  logoUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRp(val: number | string | null | undefined) {
  return "Rp " + Math.round(Number(val) || 0).toLocaleString("id-ID");
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const DOC_TITLES: Record<TukangPDFType, string> = {
  registry: "DAFTAR TUKANG",
  absen: "REKAP ABSEN FOTO",
  kasbon: "REKAP KASBON",
  gajian: "REKAP GAJIAN",
  kwitansi: "KWITANSI GAJI TUKANG",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function TukangPDF({ type, project, data, meta, logoUrl }: TukangPDFProps) {
  const title = DOC_TITLES[type];
  const tanggalCetak = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Document title={`${title} - ${project.nama_proyek}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoBlock}>
            {logoUrl && <Image style={styles.logo} src={logoUrl} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{COMPANY.name}</Text>
              <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
              <Text style={styles.companyContact}>{COMPANY.address}</Text>
              <Text style={styles.companyContact}>📞 {COMPANY.phone}  ✉ {COMPANY.email}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.docSub}>Dicetak: {tanggalCetak}</Text>
          </View>
        </View>

        {/* ── Project info box ── */}
        <View style={styles.infoBox}>
          <View>
            <Text style={styles.infoLabel}>PROYEK</Text>
            <Text style={styles.infoValue}>{project.nama_proyek}</Text>
            {project.klien && <Text style={styles.infoCetak}>{project.klien}</Text>}
          </View>
          {meta?.filter && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.infoLabel}>FILTER STATUS</Text>
              <Text style={styles.infoValue}>{meta.filter}</Text>
            </View>
          )}
          {(meta?.tanggal_mulai || meta?.tanggal_selesai) && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.infoLabel}>PERIODE</Text>
              <Text style={styles.infoValue}>{fmtDate(meta.tanggal_mulai)} – {fmtDate(meta.tanggal_selesai)}</Text>
            </View>
          )}
        </View>

        {/* ── Table ── */}
        <View style={styles.table}>
          {type === "registry" && <RegistryTable data={data} />}
          {type === "absen" && <AbsenTable data={data} />}
          {type === "kasbon" && <KasbonTable data={data} />}
          {type === "gajian" && <GajianTable data={data} />}
          {type === "kwitansi" && <KwitansiTable data={data} />}
        </View>

        {/* ── Signatures (for gajian/kwitansi when provided) ── */}
        {meta?.signatures && (
          <View style={styles.signRow}>
            {(["af", "hf"] as const).map((key) => {
              const sig = meta.signatures![key];
              const label = key === "af" ? "Admin Finance" : "Head Finance";
              return (
                <View key={key} style={styles.signBlock}>
                  <View style={styles.signTitleBox}>
                    <Text style={styles.signTitleText}>{label}</Text>
                  </View>
                  {sig?.signature
                    ? <Image style={styles.signImage} src={sig.signature} />
                    : <View style={styles.signImageEmpty} />}
                  <Text style={styles.signName}>{sig?.name || "___________________"}</Text>
                  {sig?.at && <Text style={styles.signDate}>{fmtDate(sig.at)}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{COMPANY.name} — {COMPANY.phone}</Text>
          <Text style={styles.footerText}>{title} | {project.nama_proyek}</Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Sub-tables ─────────────────────────────────────────────────────────────────

function RegistryTable({ data }: { data: any[] }) {
  return (
    <>
      <View style={styles.tableHead}>
        <Text style={[styles.tableHeadCell, styles.cNo]}>No</Text>
        <Text style={[styles.tableHeadCell, styles.cMd]}>Nama</Text>
        <Text style={[styles.tableHeadCell, styles.cSm]}>Jabatan</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Upah/Hari</Text>
      </View>
      {data.map((r, i) => (
        <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.cellText, styles.cNo]}>{i + 1}</Text>
          <Text style={[styles.cellText, styles.cMd]}>{r.nama}</Text>
          <Text style={[styles.cellText, styles.cSm]}>{r.jabatan || "Tukang"}</Text>
          <Text style={[styles.cellText, { flex: 1.5, textAlign: "right" }]}>{formatRp(r.upah_harian)}</Text>
        </View>
      ))}
      {data.length === 0 && (
        <View style={styles.tableRow}>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada data</Text>
        </View>
      )}
    </>
  );
}

function AbsenTable({ data }: { data: any[] }) {
  return (
    <>
      <View style={styles.tableHead}>
        <Text style={[styles.tableHeadCell, styles.cNo]}>No</Text>
        <Text style={[styles.tableHeadCell, styles.cMd]}>Nama Tukang</Text>
        <Text style={[styles.tableHeadCell, styles.cSm]}>Jabatan</Text>
        <Text style={[styles.tableHeadCell, styles.cSm]}>Tanggal</Text>
        <Text style={[styles.tableHeadCell, styles.cSm]}>Timestamp</Text>
        <Text style={[styles.tableHeadCell, styles.cXs]}>Status</Text>
      </View>
      {data.map((a, i) => (
        <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.cellText, styles.cNo]}>{i + 1}</Text>
          <Text style={[styles.cellText, styles.cMd]}>{a.tukang_nama}</Text>
          <Text style={[styles.cellText, styles.cSm]}>{a.tukang_jabatan || "Tukang"}</Text>
          <Text style={[styles.cellText, styles.cSm]}>{fmtDate(a.tanggal)}</Text>
          <Text style={[styles.cellText, styles.cSm]}>
            {a.foto_timestamp
              ? new Date(a.foto_timestamp).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })
              : "—"}
          </Text>
          <Text style={[styles.cellText, styles.cXs]}>{a.status}</Text>
        </View>
      ))}
      {data.length === 0 && (
        <View style={styles.tableRow}>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada data</Text>
        </View>
      )}
    </>
  );
}

function KasbonTable({ data }: { data: any[] }) {
  const total = data.reduce((s, k) => s + (Number(k.jumlah) || 0), 0);
  return (
    <>
      <View style={styles.tableHead}>
        <Text style={[styles.tableHeadCell, styles.cNo]}>No</Text>
        <Text style={[styles.tableHeadCell, styles.cMd]}>Nama Tukang</Text>
        <Text style={[styles.tableHeadCell, styles.cSm]}>Tanggal</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Jumlah</Text>
        <Text style={[styles.tableHeadCell, styles.cMd]}>Catatan</Text>
        <Text style={[styles.tableHeadCell, styles.cSm]}>Status Potongan</Text>
      </View>
      {data.map((k, i) => (
        <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.cellText, styles.cNo]}>{i + 1}</Text>
          <Text style={[styles.cellText, styles.cMd]}>{k.tukang_nama}</Text>
          <Text style={[styles.cellText, styles.cSm]}>{fmtDate(k.tanggal)}</Text>
          <Text style={[styles.cellText, { flex: 1.5, textAlign: "right" }]}>{formatRp(k.jumlah)}</Text>
          <Text style={[styles.cellText, styles.cMd]}>{k.catatan || "—"}</Text>
          <Text style={[styles.cellText, styles.cSm]}>{k.sudah_dipotong ? "Sudah dipotong" : "Belum dipotong"}</Text>
        </View>
      ))}
      {data.length === 0 && (
        <View style={styles.tableRow}>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada data</Text>
        </View>
      )}
      {data.length > 0 && (
        <View style={styles.tableRowTotal}>
          <Text style={[styles.cellWhite, styles.cNo]} />
          <Text style={[styles.cellWhite, styles.cMd]}>TOTAL</Text>
          <Text style={[styles.cellWhite, styles.cSm]} />
          <Text style={[styles.cellWhite, { flex: 1.5, textAlign: "right" }]}>{formatRp(total)}</Text>
          <Text style={[styles.cellWhite, styles.cMd]} />
          <Text style={[styles.cellWhite, styles.cSm]} />
        </View>
      )}
    </>
  );
}

function GajianTable({ data }: { data: any[] }) {
  // data is flat items array for a single gajian period
  const grandTotal = data.reduce((s, it) => s + Math.max(0, (it.hari_kerja * it.daily_rate) - (it.kasbon_dipotong || 0)), 0);
  return (
    <>
      <View style={styles.tableHead}>
        <Text style={[styles.tableHeadCell, styles.cNo]}>No</Text>
        <Text style={[styles.tableHeadCell, styles.cMd]}>Nama Tukang</Text>
        <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: "right" }]}>Hari</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Upah/Hari</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Kasbon</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Total</Text>
      </View>
      {data.map((it, i) => {
        const total = Math.max(0, (it.hari_kerja * it.daily_rate) - (it.kasbon_dipotong || 0));
        return (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.cellText, styles.cNo]}>{i + 1}</Text>
            <Text style={[styles.cellText, styles.cMd]}>{it.tukang_name}</Text>
            <Text style={[styles.cellText, { flex: 0.8, textAlign: "right" }]}>{it.hari_kerja}</Text>
            <Text style={[styles.cellText, { flex: 1.5, textAlign: "right" }]}>{formatRp(it.daily_rate)}</Text>
            <Text style={[styles.cellText, { flex: 1.5, textAlign: "right" }]}>{it.kasbon_dipotong > 0 ? `-${formatRp(it.kasbon_dipotong)}` : "—"}</Text>
            <Text style={[styles.cellBold, { flex: 1.5, textAlign: "right" }]}>{formatRp(total)}</Text>
          </View>
        );
      })}
      {data.length === 0 && (
        <View style={styles.tableRow}>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada data</Text>
        </View>
      )}
      {data.length > 0 && (
        <View style={styles.tableRowTotal}>
          <Text style={[styles.cellWhite, styles.cNo]} />
          <Text style={[styles.cellWhite, styles.cMd]}>GRAND TOTAL</Text>
          <Text style={[styles.cellWhite, { flex: 0.8 }]} />
          <Text style={[styles.cellWhite, { flex: 1.5 }]} />
          <Text style={[styles.cellWhite, { flex: 1.5 }]} />
          <Text style={[styles.cellWhite, { flex: 1.5, textAlign: "right" }]}>{formatRp(grandTotal)}</Text>
        </View>
      )}
    </>
  );
}

function KwitansiTable({ data }: { data: any[] }) {
  const totalDibayar = data.reduce((s, k) => s + (Number(k.jumlah_gaji) || 0), 0);
  return (
    <>
      <View style={styles.tableHead}>
        <Text style={[styles.tableHeadCell, styles.cNo]}>No</Text>
        <Text style={[styles.tableHeadCell, styles.cMd]}>Nama</Text>
        <Text style={[styles.tableHeadCell, styles.cMd]}>Periode</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Gaji Kotor</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.2, textAlign: "right" }]}>Kasbon</Text>
        <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Dibayar</Text>
        <Text style={[styles.tableHeadCell, styles.cSm]}>Tanggal</Text>
      </View>
      {data.map((k, i) => {
        const gajiBruto = Number(k.jumlah_gaji) + Number(k.kasbon_dipotong || 0);
        return (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.cellText, styles.cNo]}>{i + 1}</Text>
            <Text style={[styles.cellText, styles.cMd]}>{k.tukang_name}</Text>
            <Text style={[styles.cellText, styles.cMd]}>
              {k.tanggal_mulai ? `${fmtDate(k.tanggal_mulai)} – ${fmtDate(k.tanggal_selesai)}` : "—"}
            </Text>
            <Text style={[styles.cellText, { flex: 1.5, textAlign: "right" }]}>{formatRp(gajiBruto)}</Text>
            <Text style={[styles.cellText, { flex: 1.2, textAlign: "right" }]}>{k.kasbon_dipotong > 0 ? `-${formatRp(k.kasbon_dipotong)}` : "—"}</Text>
            <Text style={[styles.cellBold, { flex: 1.5, textAlign: "right" }]}>{formatRp(k.jumlah_gaji)}</Text>
            <Text style={[styles.cellText, styles.cSm]}>{fmtDate(k.tanggal_pembayaran)}</Text>
          </View>
        );
      })}
      {data.length === 0 && (
        <View style={styles.tableRow}>
          <Text style={[styles.cellText, { flex: 1, textAlign: "center", color: GRAY }]}>Belum ada data</Text>
        </View>
      )}
      {data.length > 0 && (
        <View style={styles.tableRowTotal}>
          <Text style={[styles.cellWhite, styles.cNo]} />
          <Text style={[styles.cellWhite, styles.cMd]}>TOTAL DIBAYAR</Text>
          <Text style={[styles.cellWhite, styles.cMd]} />
          <Text style={[styles.cellWhite, { flex: 1.5 }]} />
          <Text style={[styles.cellWhite, { flex: 1.2 }]} />
          <Text style={[styles.cellWhite, { flex: 1.5, textAlign: "right" }]}>{formatRp(totalDibayar)}</Text>
          <Text style={[styles.cellWhite, styles.cSm]} />
        </View>
      )}
    </>
  );
}
