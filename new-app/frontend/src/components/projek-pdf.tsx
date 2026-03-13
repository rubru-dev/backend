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

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Selesai:     { bg: "#dcfce7", text: "#166534" },
  Proses:      { bg: "#dbeafe", text: "#1e40af" },
  "Belum Mulai": { bg: "#f3f4f6", text: "#374151" },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { padding: 44, fontSize: 9.5, color: DARK, backgroundColor: "#ffffff" },

  // ── Header ──────────────────────────────────────────────────────────────────
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
  docType: { fontSize: 20, fontWeight: "bold", color: ORANGE, letterSpacing: 1 },
  docSubtype: { fontSize: 9, color: GRAY, marginTop: 2 },

  // ── Info card ────────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: ORANGE_LIGHT, borderRadius: 6, padding: 14,
    borderLeftWidth: 4, borderLeftColor: ORANGE, marginBottom: 16,
  },
  infoRow: { flexDirection: "row", marginBottom: 6 },
  infoCol: { flex: 1, marginRight: 8 },
  infoLabel: { fontSize: 7, color: ORANGE, fontWeight: "bold", marginBottom: 2 },
  infoValue: { fontSize: 9.5, fontWeight: "bold", color: DARK },
  infoSub:   { fontSize: 8, color: GRAY, marginTop: 1 },

  // ── Progress bar ─────────────────────────────────────────────────────────────
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  progressBg: { flex: 1, height: 7, backgroundColor: "#e7e5e4", borderRadius: 4, marginRight: 8 },
  progressFill: { height: 7, backgroundColor: ORANGE, borderRadius: 4 },
  progressLabel: { fontSize: 8.5, fontWeight: "bold", color: ORANGE },

  // ── Section header (for sipil termins) ───────────────────────────────────────
  sectionHeader: {
    backgroundColor: ORANGE, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 4, marginTop: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "white" },
  sectionPeriod: { fontSize: 7.5, color: "#fed7aa" },

  // ── Table ─────────────────────────────────────────────────────────────────────
  tableHead: {
    flexDirection: "row", backgroundColor: "#44403c",
    paddingVertical: 5, paddingHorizontal: 6,
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },
  tableHeadCell: { color: "white", fontSize: 7.5, fontWeight: "bold" },
  tableRow: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
  },
  tableRowAlt: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT,
  },
  colNo:    { width: 18 },
  colNama:  { flex: 1 },
  colStart: { width: 58 },
  colEnd:   { width: 58 },
  colPic:   { width: 70 },
  colStatus:{ width: 62 },
  cell: { fontSize: 8, color: DARK },

  statusBadge: { borderRadius: 3, paddingVertical: 1, paddingHorizontal: 4, alignSelf: "flex-start" },
  statusText: { fontSize: 7, fontWeight: "bold" },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyRow: {
    paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e7e5e4",
  },
  emptyText: { fontSize: 8, color: GRAY, textAlign: "center" },

  // ── Divider ───────────────────────────────────────────────────────────────────
  divider: { height: 1, backgroundColor: ORANGE_MID, marginVertical: 12 },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute", bottom: 22, left: 44, right: 44,
    borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 5,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: GRAY },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PdfTask {
  nama_pekerjaan: string;
  tanggal_mulai:  string | null;
  tanggal_selesai: string | null;
  pic:    string;
  status: string;
  fotos?: string[]; // base64 data URLs
}

export interface PdfTermin {
  nama: string;
  tanggal_mulai:  string | null;
  tanggal_selesai: string | null;
  tasks: PdfTask[];
}

export type ProyekPDFType = "desain" | "interior" | "sipil";

export interface ProyekPDFData {
  type:        ProyekPDFType;
  judul:       string;
  docLabel:    string;     // shown as document title top-right, e.g. "TIMELINE DESAIN"
  klien?:      string;
  lokasi?:     string;
  nilai_rab?:  number;
  periode?:    string;
  extra_info?: { label: string; value: string }[];   // flexible extra rows
  progress:    number;
  dibuat_oleh?: string;
  items?:   PdfTask[];       // desain / interior: flat list
  termins?: PdfTermin[];     // sipil: nested list
  logoUrl?: string;
}

// ── Task Table ────────────────────────────────────────────────────────────────
function TaskTable({ tasks }: { tasks: PdfTask[] }) {
  return (
    <View>
      <View style={s.tableHead}>
        <Text style={[s.tableHeadCell, s.colNo]}>#</Text>
        <Text style={[s.tableHeadCell, s.colNama]}>Nama Pekerjaan</Text>
        <Text style={[s.tableHeadCell, s.colStart]}>Tgl Mulai</Text>
        <Text style={[s.tableHeadCell, s.colEnd]}>Tgl Selesai</Text>
        <Text style={[s.tableHeadCell, s.colPic]}>PIC</Text>
        <Text style={[s.tableHeadCell, s.colStatus]}>Status</Text>
      </View>

      {tasks.length === 0 ? (
        <View style={s.emptyRow}>
          <Text style={s.emptyText}>Belum ada pekerjaan</Text>
        </View>
      ) : (
        tasks.map((t, i) => {
          const sc = STATUS_COLOR[t.status] ?? STATUS_COLOR["Belum Mulai"];
          const rowBg = i % 2 === 0 ? "white" : ORANGE_LIGHT;
          return (
            <View key={i} wrap={false}>
              <View style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.cell, s.colNo]}>{i + 1}</Text>
                <Text style={[s.cell, s.colNama]}>{t.nama_pekerjaan || "—"}</Text>
                <Text style={[s.cell, s.colStart]}>{fmtDate(t.tanggal_mulai)}</Text>
                <Text style={[s.cell, s.colEnd]}>{fmtDate(t.tanggal_selesai)}</Text>
                <Text style={[s.cell, s.colPic]}>{t.pic || "—"}</Text>
                <View style={s.colStatus}>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.text }]}>{t.status}</Text>
                  </View>
                </View>
              </View>
              {t.fotos && t.fotos.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 6, paddingTop: 3, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: rowBg }}>
                  {t.fotos.map((foto, fi) => (
                    <Image key={fi} style={{ width: 58, height: 58, margin: 2, borderRadius: 2 }} src={foto} />
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

// ── Main PDF Component ────────────────────────────────────────────────────────
export function ProyekPDF({ data }: { data: ProyekPDFData }) {
  const fillPct = Math.min(Math.max(data.progress, 0), 100);

  return (
    <Document title={data.judul} author={COMPANY.name}>
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
            <Text style={s.docType}>{data.docLabel}</Text>
            <Text style={s.docSubtype}>{data.judul}</Text>
          </View>
        </View>

        {/* ── Info Card ── */}
        <View style={s.infoCard}>
          {/* Row 1: Klien + Periode */}
          <View style={s.infoRow}>
            {data.klien && (
              <View style={s.infoCol}>
                <Text style={s.infoLabel}>KLIEN</Text>
                <Text style={s.infoValue}>{data.klien}</Text>
              </View>
            )}
            {data.periode && (
              <View style={s.infoCol}>
                <Text style={s.infoLabel}>PERIODE</Text>
                <Text style={s.infoValue}>{data.periode}</Text>
              </View>
            )}
          </View>

          {/* Row 2: Lokasi + Nilai RAB (sipil only) */}
          {(data.lokasi || data.nilai_rab) && (
            <View style={s.infoRow}>
              {data.lokasi && (
                <View style={s.infoCol}>
                  <Text style={s.infoLabel}>LOKASI</Text>
                  <Text style={s.infoValue}>{data.lokasi}</Text>
                </View>
              )}
              {data.nilai_rab != null && data.nilai_rab > 0 && (
                <View style={s.infoCol}>
                  <Text style={s.infoLabel}>NILAI RAB</Text>
                  <Text style={s.infoValue}>Rp {data.nilai_rab.toLocaleString("id-ID")}</Text>
                </View>
              )}
            </View>
          )}

          {/* Extra info rows */}
          {data.extra_info && data.extra_info.length > 0 && (
            <View style={s.infoRow}>
              {data.extra_info.map((ei, i) => (
                <View key={i} style={s.infoCol}>
                  <Text style={s.infoLabel}>{ei.label.toUpperCase()}</Text>
                  <Text style={s.infoValue}>{ei.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Progress */}
          <View style={s.progressRow}>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${fillPct}%` }]} />
            </View>
            <Text style={s.progressLabel}>{data.progress}% Selesai</Text>
          </View>

          {data.dibuat_oleh && (
            <Text style={[s.infoSub, { marginTop: 6 }]}>Dibuat oleh: {data.dibuat_oleh}</Text>
          )}
        </View>

        {/* ── Flat item table (desain / interior) ── */}
        {data.items && (
          <TaskTable tasks={data.items} />
        )}

        {/* ── Termin sections (sipil) ── */}
        {data.termins && data.termins.map((termin, ti) => (
          <View key={ti}>
            <View style={s.sectionHeader} wrap={false}>
              <Text style={s.sectionTitle}>{termin.nama}</Text>
              {(termin.tanggal_mulai || termin.tanggal_selesai) && (
                <Text style={s.sectionPeriod}>
                  {fmtDate(termin.tanggal_mulai)} – {fmtDate(termin.tanggal_selesai)}
                </Text>
              )}
            </View>
            <TaskTable tasks={termin.tasks} />
          </View>
        ))}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{COMPANY.name}  |  {COMPANY.phone}  |  {COMPANY.email}</Text>
          <Text style={s.footerText}>Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</Text>
        </View>

      </Page>
    </Document>
  );
}
