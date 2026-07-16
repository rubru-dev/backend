import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ── Info perusahaan (sama dengan invoice-pdf) ─────────────────────────────────
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
const LINE = "#e7e5e4";
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 48,
    fontSize: 10,
    color: DARK,
    backgroundColor: "#ffffff",
  },

  // Header — identik dengan invoice
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingBottom: 16, borderBottomWidth: 3, borderBottomColor: ORANGE,
  },
  logoBlock: { flexDirection: "row", alignItems: "center", width: 360 },
  logo: { width: 64, height: 64, objectFit: "contain", marginRight: 12 },
  companyInfo: { justifyContent: "center", width: 280 },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2, lineHeight: 1.25 },

  // Judul dokumen
  docHeader: {
    marginTop: 14, marginBottom: 10, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: ORANGE_MID,
  },
  docTitle: { fontSize: 22, fontWeight: "bold", color: ORANGE },
  docSubtitle: { fontSize: 10, fontWeight: "bold", color: GRAY, marginTop: 3, letterSpacing: 0.6 },
  docNumber: { fontSize: 8.5, color: GRAY, marginTop: 4 },

  // Judul section
  sectionTitle: {
    fontSize: 11, fontWeight: "bold", color: DARK, marginTop: 14, marginBottom: 6,
    paddingLeft: 7, borderLeftWidth: 3, borderLeftColor: ORANGE,
  },

  // Tabel label/value
  infoTable: { borderWidth: 1, borderColor: ORANGE_MID, borderBottomWidth: 0 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ORANGE_MID },
  infoLabel: {
    width: 130, padding: 6, backgroundColor: ORANGE_LIGHT,
    fontSize: 8.5, color: GRAY, fontWeight: "bold",
    borderRightWidth: 1, borderRightColor: ORANGE_MID,
  },
  infoValue: { flex: 1, padding: 6, fontSize: 9, color: DARK, lineHeight: 1.3 },
  infoNote: { fontSize: 7, color: GRAY, marginTop: 4, fontStyle: "italic" },

  // Tabel kebutuhan
  table: { borderWidth: 1, borderColor: ORANGE_MID },
  tableHead: { flexDirection: "row", backgroundColor: ORANGE },
  tableHeadCell: { color: "#ffffff", fontSize: 8, fontWeight: "bold", padding: 6 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: ORANGE_MID },
  tableRowAlt: { flexDirection: "row", borderTopWidth: 1, borderTopColor: ORANGE_MID, backgroundColor: ORANGE_LIGHT },
  cellNum: { width: 30, padding: 6, fontSize: 8.5, textAlign: "center", color: GRAY },
  cellArea: { width: 140, padding: 6, fontSize: 8.5, color: DARK, lineHeight: 1.3 },
  cellNeed: { flex: 1, padding: 6, fontSize: 8.5, color: DARK, lineHeight: 1.3 },

  // Foto kondisi lokasi
  photoGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  photoCard: { width: 250, borderWidth: 1, borderColor: ORANGE_MID, padding: 5, marginBottom: 10 },
  photoLabel: {
    backgroundColor: ORANGE_LIGHT, color: ORANGE, fontSize: 7, fontWeight: "bold",
    letterSpacing: 0.5, padding: 3, marginBottom: 4,
  },
  photoImage: { width: "100%", height: 150, objectFit: "contain", backgroundColor: "#fafaf9" },
  photoCaption: { fontSize: 7.5, color: GRAY, marginTop: 4, lineHeight: 1.3 },

  // Kotak catatan / kosong
  noteBox: {
    borderWidth: 1, borderColor: ORANGE_MID, borderStyle: "dashed",
    backgroundColor: ORANGE_LIGHT, padding: 8, minHeight: 46,
  },
  noteText: { fontSize: 8.5, color: DARK, lineHeight: 1.4 },
  muted: { fontSize: 8.5, color: "#a8a29e", fontStyle: "italic" },

  footer: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTanggalSurvey(tanggal?: string | null, jam?: string | null) {
  if (!tanggal) return "-";
  const key = String(tanggal).split("T")[0];
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return jam ? `${label} · ${jam}` : label;
}

/** @react-pdf gagal render seluruh dokumen kalau src Image tidak valid — saring dulu */
function isRenderableImage(src: string) {
  return typeof src === "string" && /^(data:image\/|https?:\/\/)/.test(src);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AfterSurveyReportData {
  nomor: string;
  nama?: string | null;
  nomor_telepon?: string | null;
  alamat?: string | null;
  tanggal_survey?: string | null;
  jam_survey?: string | null;
  pic_survey?: string | null;
  alamat_rumah?: string;
  jenis_bangunan?: string;
  jumlah_lantai?: string;
  luas_rumah?: string;
  status_bangunan?: string;
  hidden_sections?: string[];
  kondisi_lokasi?: { dokumentasi: string[]; keterangan: string }[];
  kebutuhan?: { area: string; kebutuhan: string }[];
  catatan_tambahan?: string;
}

export interface AfterSurveyPDFProps {
  reports: AfterSurveyReportData[];
  logoUrl: string;
}

// ── Sub-komponen ──────────────────────────────────────────────────────────────
/**
 * Judul section. `minPresenceAhead` mencegah judul (atau header tabel di bawahnya)
 * tertinggal sendirian di dasar halaman saat konten pecah ke halaman berikutnya.
 */
function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle} minPresenceAhead={70}>{children}</Text>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function Letterhead({ logoUrl }: { logoUrl: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoBlock}>
        {logoUrl ? <Image style={styles.logo} src={logoUrl} /> : null}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{COMPANY.name}</Text>
          <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
          <Text style={styles.companyContact}>{COMPANY.address}</Text>
          <Text style={styles.companyContact}>Tel {COMPANY.phone}  Email {COMPANY.email}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Dokumen ───────────────────────────────────────────────────────────────────
export function AfterSurveyPDF({ reports, logoUrl }: AfterSurveyPDFProps) {
  return (
    <Document title="After Survey Report" author={COMPANY.name}>
      {reports.map((r, idx) => {
        const hidden = r.hidden_sections ?? [];
        const isVisible = (section: string) => !hidden.includes(section);

        // Tiap foto jadi satu kartu "FOTO LOKASI n" mengikuti layout template
        const fotoCards = (r.kondisi_lokasi ?? []).flatMap((row) =>
          (row.dokumentasi ?? [])
            .filter(isRenderableImage)
            .map((src) => ({ src, keterangan: row.keterangan }))
        );
        const kebutuhan = (r.kebutuhan ?? []).filter((row) => row.area || row.kebutuhan);

        return (
          <Page size="A4" style={styles.page} key={idx}>
            <Letterhead logoUrl={logoUrl} />

            <View style={styles.docHeader}>
              <Text style={styles.docTitle}>AFTER SURVEY REPORT</Text>
              <Text style={styles.docSubtitle}>SURVEY CLIENT</Text>
              <Text style={styles.docNumber}>Nomor : {r.nomor}</Text>
            </View>

            {/* 1. Data Klien */}
            <SectionTitle>1. DATA KLIEN</SectionTitle>
            <View style={styles.infoTable}>
              <InfoRow label="Nama Klien" value={r.nama} />
              <InfoRow label="Nomor Telepon" value={r.nomor_telepon} />
              <InfoRow label="Alamat Klien" value={r.alamat} />
            </View>

            {/* 2. Data Rumah / Lokasi Proyek */}
            {isVisible("data_rumah") && (
              <>
                <SectionTitle>2. DATA RUMAH / LOKASI PROYEK</SectionTitle>
                <View style={styles.infoTable}>
                  <InfoRow label="Alamat Rumah" value={r.alamat_rumah || r.alamat} />
                  <InfoRow label="Jenis Bangunan" value={r.jenis_bangunan} />
                  <InfoRow label="Jumlah Lantai" value={r.jumlah_lantai} />
                  <InfoRow label="Luas Rumah" value={r.luas_rumah ? `${r.luas_rumah} m2` : ""} />
                  <InfoRow label="Status Bangunan" value={r.status_bangunan} />
                  <InfoRow label="Tanggal Survei" value={formatTanggalSurvey(r.tanggal_survey, r.jam_survey)} />
                  <InfoRow label="PIC Survey" value={r.pic_survey} />
                </View>
              </>
            )}

            {/* 3. Kondisi Lokasi */}
            {isVisible("kondisi_lokasi") && (
              <>
                <SectionTitle>3. KONDISI LOKASI</SectionTitle>
                {fotoCards.length ? (
                  <View style={styles.photoGrid}>
                    {fotoCards.map((foto, i) => (
                      <View style={styles.photoCard} key={i} wrap={false}>
                        <Text style={styles.photoLabel}>FOTO LOKASI {i + 1}</Text>
                        <Image style={styles.photoImage} src={foto.src} />
                        <Text style={styles.photoCaption}>Keterangan: {foto.keterangan || "-"}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noteBox}>
                    <Text style={styles.muted}>Belum ada dokumentasi kondisi lokasi</Text>
                  </View>
                )}
              </>
            )}

            {/* 4. Kebutuhan Klien */}
            {isVisible("kebutuhan") && (
              <>
                <SectionTitle>4. KEBUTUHAN KLIEN</SectionTitle>
                <View style={styles.table}>
                  <View style={styles.tableHead} wrap={false}>
                    <Text style={[styles.tableHeadCell, { width: 30, textAlign: "center" }]}>No.</Text>
                    <Text style={[styles.tableHeadCell, { width: 140 }]}>Area / Ruangan</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>Kebutuhan / Permintaan Klien</Text>
                  </View>
                  {kebutuhan.length ? (
                    kebutuhan.map((row, i) => (
                      <View style={i % 2 ? styles.tableRowAlt : styles.tableRow} key={i} wrap={false}>
                        <Text style={styles.cellNum}>{i + 1}</Text>
                        <Text style={styles.cellArea}>{row.area || "-"}</Text>
                        <Text style={styles.cellNeed}>{row.kebutuhan || "-"}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.tableRow}>
                      <Text style={[styles.cellNeed, styles.muted]}>Belum ada kebutuhan klien yang dicatat</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Catatan Tambahan */}
            {isVisible("catatan_tambahan") && (
              <>
                <SectionTitle>CATATAN TAMBAHAN</SectionTitle>
                <View style={styles.noteBox}>
                  {r.catatan_tambahan ? (
                    <Text style={styles.noteText}>{r.catatan_tambahan}</Text>
                  ) : (
                    <Text style={styles.muted}>Tidak ada catatan tambahan</Text>
                  )}
                </View>
              </>
            )}

            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>{COMPANY.name} — After Survey Report</Text>
              <Text
                style={styles.footerText}
                render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`}
              />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
