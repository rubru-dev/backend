"use client";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const ORANGE = "#f97316";
const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: "#1c1917" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 3, borderBottomColor: ORANGE, paddingBottom: 12 },
  logo: { width: 46, height: 46, objectFit: "contain" },
  company: { fontSize: 15, fontWeight: "bold", color: ORANGE },
  muted: { fontSize: 8, color: "#78716c", marginTop: 2 },
  title: { fontSize: 16, fontWeight: "bold", color: ORANGE },
  infoRow: { flexDirection: "row", gap: 8, marginVertical: 14 },
  info: { flex: 1, backgroundColor: "#fff7ed", padding: 8, borderRadius: 3 },
  label: { fontSize: 7, color: ORANGE, fontWeight: "bold" },
  value: { fontSize: 9, fontWeight: "bold", marginTop: 2 },
  head: { flexDirection: "row", backgroundColor: ORANGE, padding: 7 },
  row: { flexDirection: "row", padding: 7, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  alt: { backgroundColor: "#fff7ed" },
  cell: { fontSize: 8 },
  no: { width: 28 }, number: { width: 70 }, date: { width: 72 }, store: { flex: 1 }, count: { width: 54, textAlign: "right" }, status: { width: 68 }, total: { width: 90, textAlign: "right" },
});
const rp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const date = (v: string) => new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export default function PRListPDF({ project, prs, filter = {} }: { project: { nama_proyek?: string | null; klien?: string | null }; prs: any[]; filter?: any }) {
  const logo = typeof window !== "undefined" ? `${window.location.origin}/images/logo.png` : "";
  const period = filter.tanggal_start || filter.tanggal_end ? `${filter.tanggal_start || "awal"} s/d ${filter.tanggal_end || "akhir"}` : filter.bulan && filter.tahun ? `Bulan ${filter.bulan}/${filter.tahun}` : filter.tahun ? `Tahun ${filter.tahun}` : "Semua periode";
  return <Document><Page size="A4" style={styles.page}>
    <View style={styles.header}><View style={{ flexDirection: "row", gap: 9 }}>{logo && <Image src={logo} style={styles.logo} />}<View><Text style={styles.company}>RubahRumah</Text><Text style={styles.muted}>Platform Desain and Build</Text><Text style={styles.muted}>0813-7640-5550 · info.rubahrumah@gmail.com</Text></View></View><View><Text style={styles.title}>PURCHASE REQUEST</Text><Text style={styles.muted}>Rekap PR berdasarkan periode</Text></View></View>
    <View style={styles.infoRow}><View style={styles.info}><Text style={styles.label}>NAMA PROYEK</Text><Text style={styles.value}>{project.nama_proyek || "-"}</Text></View><View style={styles.info}><Text style={styles.label}>KLIEN</Text><Text style={styles.value}>{project.klien || "-"}</Text></View><View style={styles.info}><Text style={styles.label}>PERIODE</Text><Text style={styles.value}>{period}</Text></View></View>
    <View style={styles.head}>{["No", "Nomor PR", "Tanggal", "Nama Toko", "Item", "Status", "Total"].map((x, i) => <Text key={x} style={[styles.cell, i === 0 ? styles.no : i === 1 ? styles.number : i === 2 ? styles.date : i === 3 ? styles.store : i === 4 ? styles.count : i === 5 ? styles.status : styles.total, { color: "white", fontWeight: "bold" }]}>{x}</Text>)}</View>
    {prs.map((pr, i) => <View key={`${pr.nomor_pr || "pr"}-${i}`} style={[styles.row, i % 2 ? styles.alt : {}]}><Text style={[styles.cell, styles.no]}>{i + 1}</Text><Text style={[styles.cell, styles.number]}>{pr.nomor_pr || "-"}</Text><Text style={[styles.cell, styles.date]}>{pr.tanggal ? date(pr.tanggal) : "-"}</Text><Text style={[styles.cell, styles.store]}>{pr.nama_toko || "-"}</Text><Text style={[styles.cell, styles.count]}>{Number(pr.item_count || 0)}</Text><Text style={[styles.cell, styles.status]}>{pr.status || "-"}</Text><Text style={[styles.cell, styles.total]}>{rp(pr.total)}</Text></View>)}
    <View style={{ marginTop: 12, alignItems: "flex-end" }}><Text style={{ fontSize: 9, fontWeight: "bold", color: ORANGE }}>Total PR: {prs.length}</Text><Text style={{ fontSize: 10, fontWeight: "bold", marginTop: 3 }}>Total Estimasi: {rp(prs.reduce((sum, pr) => sum + Number(pr.total || 0), 0))}</Text></View>
  </Page></Document>;
}
