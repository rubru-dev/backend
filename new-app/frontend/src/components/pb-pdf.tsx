import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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
const ITEM_PAGE_SIZE = 10;
const SUMMARY_INLINE_LIMIT = 7;

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingHorizontal: 40, paddingBottom: 64, fontSize: 9, color: DARK, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: ORANGE },
  logoBlock: { flexDirection: "row", alignItems: "center", width: 350 },
  logo: { width: 58, height: 58, objectFit: "contain", marginRight: 11 },
  companyName: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  companyTagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  companyContact: { fontSize: 7, color: GRAY, marginTop: 2, lineHeight: 1.25 },
  titleBlock: { width: 175, alignItems: "flex-end" },
  docTitle: { fontSize: 19, fontWeight: "bold", color: ORANGE, textAlign: "right" },
  docNumber: { fontSize: 9, color: GRAY, marginTop: 4, textAlign: "right" },
  continuation: { fontSize: 7.5, color: GRAY, marginTop: 2, textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, marginBottom: 14 },
  metaLeft: { width: 310 },
  metaRight: { width: 175, alignItems: "flex-end" },
  labelBox: { backgroundColor: ORANGE, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4, alignSelf: "flex-start" },
  labelBoxRight: { backgroundColor: ORANGE, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4, alignSelf: "flex-end" },
  labelText: { color: "#fff", fontSize: 7, fontWeight: "bold", letterSpacing: 0.4 },
  metaValue: { fontSize: 11, fontWeight: "bold", color: DARK, lineHeight: 1.25 },
  metaSub: { fontSize: 7.8, color: GRAY, marginTop: 2, lineHeight: 1.3 },
  statusValue: { fontSize: 9.5, fontWeight: "bold", color: DARK, textAlign: "right" },
  table: { width: "100%" },
  tableHead: { flexDirection: "row", backgroundColor: "#57534e", borderRadius: 3, paddingVertical: 6, paddingHorizontal: 6 },
  tableHeadText: { color: "#fff", fontSize: 7.2, fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", backgroundColor: ORANGE_LIGHT },
  cell: { fontSize: 7.8, color: DARK, lineHeight: 1.25 },
  cellSub: { fontSize: 6.8, color: GRAY, marginTop: 2, lineHeight: 1.25 },
  colNo: { width: 24 },
  colJenis: { width: 46 },
  colItem: { flex: 1, paddingRight: 5 },
  colQty: { width: 42, textAlign: "right" },
  colUnit: { width: 42, textAlign: "center" },
  colOrdered: { width: 43, textAlign: "right" },
  colReceived: { width: 48, textAlign: "right" },
  colRemaining: { width: 43, textAlign: "right" },
  section: { marginTop: 13 },
  sectionTitle: { fontSize: 8, fontWeight: "bold", color: ORANGE, marginBottom: 5 },
  noteBox: { backgroundColor: ORANGE_LIGHT, borderLeftWidth: 3, borderLeftColor: ORANGE, borderRadius: 2, padding: 8 },
  noteText: { fontSize: 8, lineHeight: 1.35, color: DARK },
  detailGrid: { flexDirection: "row", gap: 8 },
  detailBox: { flex: 1, borderWidth: 1, borderColor: ORANGE_MID, borderRadius: 3, padding: 8 },
  detailLabel: { fontSize: 6.8, color: GRAY, marginBottom: 3 },
  detailValue: { fontSize: 8.2, color: DARK, fontWeight: "bold", lineHeight: 1.3 },
  detailSub: { fontSize: 7, color: GRAY, marginTop: 2, lineHeight: 1.3 },
  approvalRow: { flexDirection: "row", gap: 8 },
  approvalBox: { flex: 1, borderWidth: 1, borderColor: "#d6d3d1", borderRadius: 3, padding: 8, minHeight: 66 },
  approvalRole: { fontSize: 7, color: ORANGE, fontWeight: "bold", marginBottom: 5 },
  approvalName: { fontSize: 8.3, color: DARK, fontWeight: "bold", lineHeight: 1.25 },
  approvalDate: { fontSize: 6.8, color: GRAY, marginTop: 3, lineHeight: 1.25 },
  pending: { fontSize: 7.5, color: GRAY, fontStyle: "italic" },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, borderTopWidth: 1, borderTopColor: ORANGE_MID, paddingTop: 5, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6.6, color: GRAY },
});

export type PBPDFItem = {
  id: string;
  nama_item: string;
  jenis?: string | null;
  satuan?: string | null;
  qty: number;
  ordered_qty?: number | null;
  qty_received?: number | null;
  qty_remaining?: number | null;
  catatan?: string | null;
};

export type PBPDFData = {
  id: string;
  nomor_pb?: string | null;
  project_id: string;
  project_type: string;
  project_name?: string | null;
  project_location?: string | null;
  project_client?: string | null;
  project_start_date?: string | null;
  project_end_date?: string | null;
  pic_names?: string[];
  creator?: string | null;
  created_at: string;
  updated_at?: string | null;
  submitted_at?: string | null;
  status: string;
  catatan?: string | null;
  reviewer?: string | null;
  reviewed_at?: string | null;
  catatan_review?: string | null;
  finance_approver?: string | null;
  finance_approved_at?: string | null;
  sa_approver?: string | null;
  sa_approved_at?: string | null;
  nomor_pr?: string | null;
  pr_status?: string | null;
  pr_hf_signed_at?: string | null;
  items: PBPDFItem[];
};

function validDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(date) : "-";
}

function formatDateTime(value?: string | null) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date) : "-";
}

function formatQty(value?: number | null) {
  return value === null || value === undefined
    ? "-"
    : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(value);
}

function chunks<T>(items: T[], size: number) {
  if (!items.length) return [[]] as T[][];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function BrandHeader({ data, logoUrl, continuation }: { data: PBPDFData; logoUrl?: string; continuation?: string }) {
  return <View style={styles.header}>
    <View style={styles.logoBlock}>
      {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
      <View>
        <Text style={styles.companyName}>{COMPANY.name}</Text>
        <Text style={styles.companyTagline}>{COMPANY.tagline}</Text>
        <Text style={styles.companyContact}>{COMPANY.address}</Text>
        <Text style={styles.companyContact}>Tel {COMPANY.phone} | {COMPANY.email}</Text>
      </View>
    </View>
    <View style={styles.titleBlock}>
      <Text style={styles.docTitle}>PERMINTAAN BARANG</Text>
      <Text style={styles.docNumber}>{data.nomor_pb || `PB-${data.id}`}</Text>
      {continuation ? <Text style={styles.continuation}>{continuation}</Text> : null}
    </View>
  </View>;
}

function ProjectMeta({ data }: { data: PBPDFData }) {
  const projectType = data.project_type === "interior" ? "Interior" : "Sipil";
  const projectPeriod = data.project_start_date && data.project_end_date
    ? `${formatDate(data.project_start_date)} sampai ${formatDate(data.project_end_date)}`
    : data.project_start_date
      ? `Mulai ${formatDate(data.project_start_date)}`
      : data.project_end_date
        ? `Selesai ${formatDate(data.project_end_date)}`
        : null;
  return <View style={styles.metaRow}>
    <View style={styles.metaLeft}>
      <View style={styles.labelBox}><Text style={styles.labelText}>INFORMASI PROYEK</Text></View>
      <Text style={styles.metaValue}>{data.project_name || `Projek #${data.project_id}`}</Text>
      <Text style={styles.metaSub}>{projectType} | ID Proyek #{data.project_id}</Text>
      {data.project_client ? <Text style={styles.metaSub}>Klien: {data.project_client}</Text> : null}
      {data.project_location ? <Text style={styles.metaSub}>Lokasi: {data.project_location}</Text> : null}
      {projectPeriod ? <Text style={styles.metaSub}>Periode proyek: {projectPeriod}</Text> : null}
      <Text style={styles.metaSub}>PIC proyek: {(data.pic_names ?? []).join(", ") || "Belum ditentukan"}</Text>
      <Text style={styles.metaSub}>Pengaju: {data.creator || "Belum tersedia"}</Text>
    </View>
    <View style={styles.metaRight}>
      <View style={styles.labelBoxRight}><Text style={styles.labelText}>STATUS PB</Text></View>
      <Text style={styles.statusValue}>{data.status || "-"}</Text>
      <Text style={[styles.metaSub, { textAlign: "right", marginTop: 6 }]}>Dibuat: {formatDateTime(data.created_at)}</Text>
      <Text style={[styles.metaSub, { textAlign: "right" }]}>Diajukan: {formatDateTime(data.submitted_at)}</Text>
      <Text style={[styles.metaSub, { textAlign: "right" }]}>Diperbarui: {formatDateTime(data.updated_at)}</Text>
    </View>
  </View>;
}

function ItemsTable({ items, startIndex }: { items: PBPDFItem[]; startIndex: number }) {
  return <View style={styles.table}>
    <View style={styles.tableHead}>
      <Text style={[styles.tableHeadText, styles.colNo]}>No</Text>
      <Text style={[styles.tableHeadText, styles.colJenis]}>Jenis</Text>
      <Text style={[styles.tableHeadText, styles.colItem]}>Nama Item dan Catatan</Text>
      <Text style={[styles.tableHeadText, styles.colQty]}>Qty PB</Text>
      <Text style={[styles.tableHeadText, styles.colUnit]}>Satuan</Text>
      <Text style={[styles.tableHeadText, styles.colOrdered]}>Qty PR</Text>
      <Text style={[styles.tableHeadText, styles.colReceived]}>Diterima</Text>
      <Text style={[styles.tableHeadText, styles.colRemaining]}>Sisa</Text>
    </View>
    {items.length ? items.map((item, index) => <View key={item.id || index} wrap={false} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
      <Text style={[styles.cell, styles.colNo]}>{startIndex + index + 1}</Text>
      <Text style={[styles.cell, styles.colJenis]}>{item.jenis || "-"}</Text>
      <View style={styles.colItem}>
        <Text style={styles.cell}>{item.nama_item || "-"}</Text>
        {item.catatan ? <Text style={styles.cellSub}>{item.catatan}</Text> : null}
      </View>
      <Text style={[styles.cell, styles.colQty]}>{formatQty(item.qty)}</Text>
      <Text style={[styles.cell, styles.colUnit]}>{item.satuan || "-"}</Text>
      <Text style={[styles.cell, styles.colOrdered]}>{formatQty(item.ordered_qty)}</Text>
      <Text style={[styles.cell, styles.colReceived]}>{formatQty(item.qty_received)}</Text>
      <Text style={[styles.cell, styles.colRemaining]}>{formatQty(item.qty_remaining)}</Text>
    </View>) : <View style={styles.tableRow}><Text style={styles.pending}>PB ini belum memiliki item.</Text></View>}
  </View>;
}

function ApprovalBox({ role, name, at, pendingText }: { role: string; name?: string | null; at?: string | null; pendingText: string }) {
  return <View style={styles.approvalBox}>
    <Text style={styles.approvalRole}>{role}</Text>
    {name ? <><Text style={styles.approvalName}>{name}</Text><Text style={styles.approvalDate}>{formatDateTime(at)}</Text></> : <Text style={styles.pending}>{pendingText}</Text>}
  </View>;
}

function Summary({ data }: { data: PBPDFData }) {
  return <View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CATATAN PB</Text>
      <View style={styles.noteBox}><Text style={styles.noteText}>{data.catatan || "Tidak ada catatan tambahan."}</Text></View>
    </View>

    {data.reviewer || data.catatan_review ? <View style={styles.section}>
      <Text style={styles.sectionTitle}>HASIL REVIEW</Text>
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>{data.catatan_review || "Tidak ada catatan review."}</Text>
        <Text style={[styles.detailSub, { marginTop: 4 }]}>Reviewer: {data.reviewer || "Belum tersedia"} | {formatDateTime(data.reviewed_at)}</Text>
      </View>
    </View> : null}

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PURCHASE REQUEST TERKAIT</Text>
      <View style={styles.detailGrid}>
        <View style={styles.detailBox}><Text style={styles.detailLabel}>NOMOR PR</Text><Text style={styles.detailValue}>{data.nomor_pr || "Belum dibuat"}</Text></View>
        <View style={styles.detailBox}><Text style={styles.detailLabel}>STATUS PR</Text><Text style={styles.detailValue}>{data.pr_status || "Belum tersedia"}</Text>{data.pr_hf_signed_at ? <Text style={styles.detailSub}>Ditandatangani Head Finance: {formatDateTime(data.pr_hf_signed_at)}</Text> : null}</View>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>JEJAK PERSETUJUAN</Text>
      <View style={styles.approvalRow}>
        <ApprovalBox role="PENGAJU / PIC" name={data.creator} at={data.submitted_at || data.created_at} pendingText="Nama pengaju belum tersedia" />
        <ApprovalBox role="FINANCE" name={data.finance_approver} at={data.finance_approved_at} pendingText="Belum disetujui Finance" />
        <ApprovalBox role="SUPER ADMIN" name={data.sa_approver} at={data.sa_approved_at} pendingText="Belum disetujui Super Admin" />
      </View>
    </View>
  </View>;
}

function Footer({ data }: { data: PBPDFData }) {
  return <View style={styles.footer} fixed>
    <Text style={styles.footerText}>{COMPANY.name} | {data.nomor_pb || `PB-${data.id}`} | Dicetak {formatDateTime(new Date().toISOString())}</Text>
    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
  </View>;
}

export function PBPDF({ data, logoUrl }: { data: PBPDFData; logoUrl?: string }) {
  const itemPages = chunks(data.items ?? [], ITEM_PAGE_SIZE);
  const summaryInline = (data.items ?? []).length <= SUMMARY_INLINE_LIMIT;

  return <Document title={`${data.nomor_pb || `PB-${data.id}`} ${data.project_name || "Proyek"}`} author={COMPANY.name} subject="Permintaan Barang Proyek">
    {itemPages.map((pageItems, pageIndex) => <Page key={`items-${pageIndex}`} size="A4" style={styles.page}>
      <BrandHeader data={data} logoUrl={logoUrl} continuation={itemPages.length > 1 ? `Rincian item ${pageIndex + 1} dari ${itemPages.length}` : undefined} />
      {pageIndex === 0 ? <ProjectMeta data={data} /> : <View style={{ marginTop: 12, marginBottom: 10 }}><Text style={styles.metaValue}>{data.project_name || `Projek #${data.project_id}`}</Text><Text style={styles.metaSub}>Kelanjutan rincian item PB</Text></View>}
      <ItemsTable items={pageItems} startIndex={pageIndex * ITEM_PAGE_SIZE} />
      {summaryInline && pageIndex === itemPages.length - 1 ? <Summary data={data} /> : null}
      <Footer data={data} />
    </Page>)}

    {!summaryInline ? <Page size="A4" style={styles.page}>
      <BrandHeader data={data} logoUrl={logoUrl} continuation="Catatan dan persetujuan" />
      <View style={{ marginTop: 12 }}><Text style={styles.metaValue}>{data.project_name || `Projek #${data.project_id}`}</Text><Text style={styles.metaSub}>{data.items.length} item tercatat dalam PB ini.</Text></View>
      <Summary data={data} />
      <Footer data={data} />
    </Page> : null}
  </Document>;
}
