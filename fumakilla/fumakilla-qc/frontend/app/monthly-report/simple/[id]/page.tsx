"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useGet, Loading } from "@/components/erp/shared";
import { ROUTES } from "@/lib/routes";
import { showAlert, showConfirm } from "@/lib/app-modal";
import { fileUrl } from "@/lib/utils";

const EditModeCtx = createContext(false);

const NAVY = "#2c3e5c";
const BLUE = "#1f4e79";
const LINE = "#24476f";
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const LOGO = "/refrence/QuotationLogo.jpg";
const COVER_TEMPLATE = "/refrence/simple-report-cover.png";
const CHART_COLORS = ["#2c3e5c","#4478ab","#6fa3cb","#a8c8e0"];
const A4_W = 794;
const A4_H = 1123;
const PAGE_NAMES = ["Cover", "Surat Pengantar", "Data Umum", "Tangkapan", "Dokumentasi", "Rekomendasi"];

function defaultReportData(bulan: number, tahun: number) {
  const prev2 = MONTHS_ID[((bulan - 3 + 12) % 12)];
  const prev1 = MONTHS_ID[((bulan - 2 + 12) % 12)];
  const curr  = MONTHS_ID[(bulan - 1)];
  return {
    coverNotes: "",
    picNama: "",
    picJabatan: "",
    pembuatNama: "",
    pembuatJabatan: "",
    alamat: "",
    jenisLayanan: "Pest Control",
    jumlahTreatment: "",
    teknisi: "",
    hamaSasaran: "",
    metodologi: [{ periode: `${curr} ${tahun}`, metode: "", alatMaterial: "", pestisida: "" }],
    generalNotes: "",
    bulanLabels: [prev2, prev1, curr] as [string, string, string],
    captureTables: [defaultCaptureTable("Laporan Tangkapan Hama", [
      { jenis: "Roof Rat", values: [0, 0, 0] as [number,number,number] },
      { jenis: "Norway Rat", values: [0, 0, 0] as [number,number,number] },
    ])],
    tangkapanTikus: [
      { jenis: "Roof Rat", values: [0, 0, 0] as [number,number,number] },
      { jenis: "Norway Rat", values: [0, 0, 0] as [number,number,number] },
    ],
    tangkapanKecoa: [
      { jenis: "Periplaneta Americana", values: [0, 0, 0] as [number,number,number] },
      { jenis: "Blatella Germanica", values: [0, 0, 0] as [number,number,number] },
    ],
    tangkapanLalat: [
      { jenis: "House Fly", values: [0, 0, 0] as [number,number,number] },
      { jenis: "Flesh Fly", values: [0, 0, 0] as [number,number,number] },
      { jenis: "Bluebottle Fly", values: [0, 0, 0] as [number,number,number] },
    ],
    tangkapanSemut: [
      { jenis: "Crazy Ant", values: [0, 0, 0] as [number,number,number] },
      { jenis: "Pharaoh Ant", values: [0, 0, 0] as [number,number,number] },
    ],
    dokumentasi: Array.from({ length: 6 }, () => ({ kegiatan: "", fotos: [] as string[] })),
    rekomendasi: [{ id: `r-${Date.now()}`, tanggalTemuan: "", potensiHama: "", area: "", rekomendasi: "", dokumentasi: "", tanggalClosing: "", dokumentasiClosing: "" }],
  };
}

type PestRow = { jenis: string; values: [number, number, number] };
type CaptureTableData = { id: string; title: string; rows: PestRow[] };
type ReportData = ReturnType<typeof defaultReportData>;
type DocContext = { report: any; data: ReportData; update: (patch: Partial<ReportData>) => void };

function defaultCaptureTable(title = "Laporan Tangkapan Hama", rows?: PestRow[]): CaptureTableData {
  return {
    id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    rows: rows || [
      { jenis: "Jenis Hama 1", values: [0, 0, 0] },
      { jenis: "Jenis Hama 2", values: [0, 0, 0] },
    ],
  };
}


function EditableText({ value, onChange, placeholder, multiline = false, center = false, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; center?: boolean; style?: React.CSSProperties;
}) {
  const editMode = useContext(EditModeCtx);
  const base: React.CSSProperties = {
    width: "100%",
    border: "1px solid transparent",
    borderRadius: 3,
    background: "transparent",
    padding: "1px 3px",
    font: "inherit",
    color: "inherit",
    textAlign: center ? "center" : "inherit",
    outline: "none",
    resize: "none",
    overflow: "hidden",
    ...style,
  };
  if (!editMode) {
    return (
      <span style={{ ...base, display: multiline ? "block" : "inline-block", whiteSpace: multiline ? "pre-wrap" : undefined, minHeight: multiline ? 20 : undefined }}>
        {value || (placeholder ? <span style={{ color: "#d1d5db" }}>{placeholder}</span> : null)}
      </span>
    );
  }
  return multiline
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="doc-input" style={{ ...base, minHeight: 48, lineHeight: 1.55 }} />
    : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="doc-input" style={base} />;
}

function TextFooter() {
  const rowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "125px 10px 1fr", gap: 3, lineHeight: 1.35 };
  return (
    <footer style={{ borderTop: "1px solid #9ca3af", padding: "7px 9px 8px", fontSize: 11, color: "#111", flexShrink: 0 }}>
      <p style={{ fontWeight: 900, fontSize: 16, margin: "0 0 2px" }}>PT. FUMAKILLA INDONESIA</p>
      <div style={rowStyle}><span>Head Office</span><span>:</span><span>CIBIS Eight, 6th Floor, CIBIS Business Park, JL. TB Simatupang No.2, Jakarta Selatan, Jakarta 12560</span></div>
      <div style={rowStyle}><span>Tangerang Factory</span><span>:</span><span>Jl. Siliwangi, Pasir Jaya - Jatiuwung, Tangerang, Banten 15135</span></div>
      <div style={rowStyle}><span>Karawang Factory</span><span>:</span><span>Jl. Maligi Raya Lot Q-3, KIIC Karawang, Kab. Bekasi, Jawa Barat 41361</span></div>
      <div style={rowStyle}><span>Banjarbaru Factory</span><span>:</span><span>Jl. Ahmad Yani Km. 22.91, Liang Anggang, Banjarbaru, Kalimantan Selatan</span></div>
    </footer>
  );
}

function Page({ title, children, cover = false }: { title?: string; children: React.ReactNode; cover?: boolean }) {
  return (
    <section className="simple-a4-page" style={{
      width: A4_W,
      minHeight: A4_H,
      background: "#fff",
      color: "#111827",
      fontFamily: "Arial, sans-serif",
      fontSize: 12,
      lineHeight: 1.45,
      boxShadow: "0 4px 24px rgba(0,0,0,.18)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "relative",
      /* Page break indicator setiap A4_H — garis dashed horizontal */
      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${A4_H - 3}px, #c1c6d5 ${A4_H - 3}px, #c1c6d5 ${A4_H}px)`,
      backgroundSize: `100% ${A4_H}px`,
    }}>
      {!cover && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 42px 6px", flexShrink: 0 }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 21, fontStyle: "italic", color: "#111", margin: 0 }}>{title}</h1>
            <img src={LOGO} alt="Fumakilla" style={{ height: 48, objectFit: "contain" }} />
          </div>
          <div style={{ margin: "0 42px 16px", borderBottom: `2px solid ${LINE}`, flexShrink: 0 }} />
        </>
      )}
      <div style={{ flex: "1 0 auto", padding: cover ? 0 : "0 42px 24px" }}>{children}</div>
      {!cover && <TextFooter />}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: BLUE, fontSize: 14, fontWeight: 800, margin: "0 0 10px", borderBottom: `2px solid ${BLUE}`, paddingBottom: 4 }}>{children}</h2>;
}

function InfoTable({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={{ width: 150, padding: "5px 6px", fontWeight: 700, verticalAlign: "top" }}>{label}</td>
            <td style={{ width: 14, padding: "5px 0", verticalAlign: "top" }}>:</td>
            <td style={{ padding: "5px 6px", verticalAlign: "top" }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SmallTable({ children }: { children: React.ReactNode }) {
  return <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 12 }}>{children}</table>;
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ background: BLUE, color: "#fff", border: "1px solid #8795a7", padding: "5px 7px", textAlign: "center", ...style }}>{children}</th>;
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ border: "1px solid #c9d1dc", padding: "4px 6px", verticalAlign: "top", ...style }}>{children}</td>;
}

function BarChart({ title, rows, labels }: { title: string; rows: PestRow[]; labels: string[] }) {
  const W = 300, H = 104, padL = 30, padT = 12, padB = 28, padR = 8;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...rows.flatMap(r => r.values.map(Number)), 1);
  const groupW = chartW / labels.length;
  const barW = Math.max(6, Math.floor((groupW - 8) / rows.length) - 2);
  return (
    <div className="bar-chart-block" style={{ margin: "3px 0 12px", breakInside: "avoid", pageBreakInside: "avoid" }}>
      <p style={{ textAlign: "center", fontWeight: 700, fontSize: 10, margin: "0 0 2px" }}>{title}</p>
      <svg width={W} height={H + Math.ceil(rows.length / 2) * 13} viewBox={`0 0 ${W} ${H + Math.ceil(rows.length / 2) * 13}`} style={{ display: "block", margin: "0 auto" }}>
        {[0, .5, 1].map(t => {
          const y = padT + chartH * (1 - t);
          return <g key={t}><line x1={padL} x2={W - padR} y1={y} y2={y} stroke={t ? "#e5e7eb" : "#94a3b8"} /><text x={padL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#6b7280">{Math.round(maxVal * t)}</text></g>;
        })}
        {labels.map((label, mi) => {
          const gx = padL + mi * groupW + 5;
          return (
            <g key={mi}>
              {rows.map((row, ri) => {
                const val = Number(row.values[mi]) || 0;
                const bh = chartH * val / maxVal;
                const bx = gx + ri * (barW + 2);
                const by = padT + chartH - bh;
                return <g key={ri}><rect x={bx} y={by} width={barW} height={bh} fill={CHART_COLORS[ri % CHART_COLORS.length]} rx={1} />{val > 0 && <text x={bx + barW / 2} y={by - 2} textAnchor="middle" fontSize={7}>{val}</text>}</g>;
              })}
              <text x={padL + mi * groupW + groupW / 2} y={H - padB + 13} textAnchor="middle" fontSize={8} fill="#374151">{label}</text>
            </g>
          );
        })}
        {rows.map((row, ri) => {
          const lx = padL + (ri % 2) * 120;
          const ly = H - 8 + Math.floor(ri / 2) * 12;
          return <g key={ri}><rect x={lx} y={ly} width={8} height={8} fill={CHART_COLORS[ri % CHART_COLORS.length]} /><text x={lx + 11} y={ly + 7} fontSize={8}>{row.jenis}</text></g>;
        })}
      </svg>
    </div>
  );
}

function PestCaptureTable({ title, rows, labels, onChange }: { title: string; rows: PestRow[]; labels: string[]; onChange: (rows: PestRow[]) => void }) {
  const editMode = useContext(EditModeCtx);
  const totals = [0, 1, 2].map(ci => rows.reduce((s, r) => s + (Number(r.values[ci]) || 0), 0));
  const updateRow = (ri: number, patch: Partial<PestRow>) => onChange(rows.map((r, i) => i === ri ? { ...r, ...patch } : r));
  const addRow = () => onChange([...rows, { jenis: "", values: [0, 0, 0] }]);
  const deleteRow = (ri: number) => onChange(rows.filter((_, i) => i !== ri));
  return (
    <div>
      {title && <p style={{ fontWeight: 700, margin: "0 0 5px", fontSize: 11 }}>{title}</p>}
      <SmallTable>
        <thead><tr><Th style={{ width: 34 }}>No</Th><Th style={{ textAlign: "left" }}>Jenis</Th>{labels.map((l, i) => <Th key={i}>{l}</Th>)}<th className="no-print" style={{ background: BLUE, border: "1px solid #8795a7", width: 28 }} /></tr></thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <Td style={{ textAlign: "center" }}>{ri + 1}</Td>
              <Td><EditableText value={row.jenis} onChange={v => updateRow(ri, { jenis: v })} /></Td>
              {([0, 1, 2] as const).map(ci => (
                <Td key={ci} style={{ width: 78, textAlign: "center" }}>
                  {editMode
                    ? <input type="number" min={0} value={row.values[ci]} onChange={e => {
                        const values = [...row.values] as [number, number, number];
                        values[ci] = Number(e.target.value) || 0;
                        updateRow(ri, { values });
                      }} className="doc-input" style={{ width: "100%", border: "1px solid transparent", background: "transparent", textAlign: "center", font: "inherit", outline: "none" }} />
                    : <span>{row.values[ci]}</span>
                  }
                </Td>
              ))}
              <td className="no-print" style={{ border: "1px solid #c9d1dc", padding: "4px 6px", textAlign: "center" }}><button type="button" onClick={() => deleteRow(ri)} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>x</button></td>
            </tr>
          ))}
          <tr style={{ background: "#eef2f7", fontWeight: 800 }}>
            <td colSpan={2} style={{ border: "1px solid #c9d1dc", padding: "4px 6px", textAlign: "right" }}>Total</td>
            {totals.map((t, i) => <Td key={i} style={{ textAlign: "center" }}>{t}</Td>)}
            <td className="no-print" style={{ border: "1px solid #c9d1dc" }} />
          </tr>
        </tbody>
      </SmallTable>
      <button className="no-print" type="button" onClick={addRow} style={{ border: "none", background: "transparent", color: BLUE, fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: -6 }}>+ Tambah baris</button>
    </div>
  );
}

function PhotoCell({ url, onUpload, compact = false }: { url: string; onUpload: (url: string) => void; compact?: boolean }) {
  const editMode = useContext(EditModeCtx);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await api.post("/erp/simple-reports/upload-photo", fd);
      onUpload(res.data.url);
    } catch {
      showAlert({ title: "Upload gagal", message: "Gagal upload foto.", tone: "danger" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  return (
    <div className="photo-cell" onClick={() => editMode && inputRef.current?.click()} style={{
      minHeight: compact ? 54 : 92,
      border: url ? "none" : "1px dashed #aeb7c4",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#7b8491",
      cursor: editMode ? "pointer" : "default",
      position: "relative",
      background: url ? "transparent" : "#f8fafc",
      textAlign: "center",
      fontSize: 10,
    }}>
      {url
        ? <img src={fileUrl(url)} alt="" style={{ width: "100%", height: compact ? 54 : 92, objectFit: "cover", display: "block" }} />
        : editMode ? (uploading ? "Upload..." : "Klik upload") : null}
      {url && editMode && <button type="button" className="no-print" onClick={e => { e.stopPropagation(); onUpload(""); }} style={{ position: "absolute", top: 2, right: 2, border: "none", background: "#dc2626", color: "#fff", borderRadius: 3, fontSize: 10, width: 18, height: 18, cursor: "pointer" }}>x</button>}
      {editMode && <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />}
    </div>
  );
}

function MultiPhotoCell({ fotos, onAdd, onRemove }: { fotos: string[]; onAdd: (url: string) => void; onRemove: (i: number) => void }) {
  const editMode = useContext(EditModeCtx);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("photo", file);
        const res = await api.post("/erp/simple-reports/upload-photo", fd);
        onAdd(res.data.url);
      }
    } catch {
      showAlert({ title: "Upload gagal", message: "Gagal upload foto.", tone: "danger" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, minHeight: 60, alignItems: "flex-start" }}>
      {fotos.map((url, i) => (
        <div key={i} style={{ position: "relative", width: 74, height: 74, flexShrink: 0 }}>
          <img src={fileUrl(url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, display: "block" }} />
          {editMode && <button type="button" className="no-print" onClick={() => onRemove(i)} style={{ position: "absolute", top: 2, right: 2, border: "none", background: "#dc2626", color: "#fff", borderRadius: 3, fontSize: 10, width: 16, height: 16, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>}
        </div>
      ))}
      {editMode && (
        <button type="button" className="no-print" onClick={() => inputRef.current?.click()} disabled={uploading} style={{ width: 74, height: 74, border: "1.5px dashed #aeb7c4", borderRadius: 4, background: "#f8fafc", color: "#7b8491", fontSize: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
          {uploading ? "..." : <><span style={{ fontSize: 22, lineHeight: 1 }}>+</span><span>Foto</span></>}
        </button>
      )}
      {editMode && <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFile} style={{ display: "none" }} />}
    </div>
  );
}

function CoverPage({ report, data: rd, update }: DocContext) {
  const clientName = report.inquiry?.companyName || report.inquiry?.customerName || "-";
  const period = `${MONTHS_ID[(report.bulan ?? 1) - 1]} ${report.tahun}`;
  return (
    <Page cover>
      <div style={{ height: A4_H, position: "relative" }}>
        <img src={COVER_TEMPLATE} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }} />
        <div style={{ position: "absolute", left: 286, top: 546, width: 405, height: 53, display: "flex", alignItems: "center" }}>
          <EditableText value={clientName} onChange={() => undefined} center style={{ fontSize: 16, fontWeight: 800, color: BLUE }} />
        </div>
        <div style={{ position: "absolute", left: 286, top: 622, width: 405, height: 53, display: "flex", alignItems: "center" }}>
          <EditableText value={period} onChange={() => undefined} center style={{ fontSize: 16, fontWeight: 800, color: BLUE }} />
        </div>
        <div style={{ position: "absolute", left: 92, top: 714, width: 604, height: 178 }}>
          <EditableText value={rd.coverNotes} onChange={v => update({ coverNotes: v })} multiline placeholder="Catatan cover / ringkasan singkat..." style={{ height: "100%", minHeight: 178, fontSize: 14, color: BLUE, padding: "12px 16px" }} />
        </div>
      </div>
    </Page>
  );
}

function LetterPage({ report, data: rd, update }: DocContext) {
  const clientName = report.inquiry?.companyName || report.inquiry?.customerName || "-";
  const period = `${MONTHS_ID[(report.bulan ?? 1) - 1]} ${report.tahun}`;
  return (
    <Page title="Monthly Report Integrated Pest Management">
      <div style={{ fontSize: 13, lineHeight: 1.72 }}>
        <h2 style={{ fontSize: 15, color: NAVY, margin: "0 0 2px" }}>Monthly Report Integrated Pest Management - {clientName}</h2>
        <p style={{ margin: "0 0 18px" }}>Periode {period}</p>
        <p style={{ margin: 0 }}>Kepada Yth.</p>
        <p style={{ margin: 0 }}>Bapak/Ibu <EditableText value={rd.picNama} onChange={v => update({ picNama: v })} placeholder="[PIC]" style={{ display: "inline-block", width: 220 }} /></p>
        <EditableText value={rd.picJabatan} onChange={v => update({ picJabatan: v })} placeholder="PT XXX / Jabatan PIC" />
        <p style={{ margin: 0 }}>{clientName}</p>
        <p style={{ margin: "0 0 18px" }}>di tempat</p>
        <p>Dengan hormat,</p>
        <p>Pertama-tama, kami mengucapkan terima kasih atas kesempatan dan kepercayaan yang telah Bapak/Ibu berikan kepada PT Fumakilla Indonesia dalam pelaksanaan program Integrated Pest Management (IPM) di area {clientName}.</p>
        <p>Bersama ini kami sampaikan hasil pelaksanaan treatment dan temuan lapangan yang telah kami lakukan di area {clientName}. Laporan ini kami sajikan dalam bentuk Monthly Report Periode {period}.</p>
        <p>Monthly Report ini memuat informasi mengenai tren aktivitas hama, pola infestasi, hasil monitoring, serta rekomendasi tindakan pencegahan dan pengendalian yang perlu dilakukan guna mendukung efektivitas program IPM secara berkelanjutan.</p>
        <p>Demikian laporan ini kami susun berdasarkan hasil observasi dan temuan di lapangan. Atas perhatian, kerja sama, dan kesempatan yang telah diberikan, kami ucapkan terima kasih.</p>
        <p style={{ marginTop: 28, marginBottom: 0 }}>Hormat kami,</p>
        <p style={{ fontWeight: 700, marginTop: 0 }}>PT Fumakilla Indonesia,</p>
        <div style={{ width: 240, textAlign: "center", marginTop: 70 }}>
          <div style={{ borderTop: "1.5px solid #374151", paddingTop: 6 }}>
            <EditableText value={rd.pembuatNama} onChange={v => update({ pembuatNama: v })} placeholder="[Nama Pembuat Report]" center style={{ fontWeight: 800 }} />
            <EditableText value={rd.pembuatJabatan} onChange={v => update({ pembuatJabatan: v })} placeholder="[Jabatan]" center style={{ color: "#6b7280", fontSize: 11 }} />
          </div>
        </div>
      </div>
    </Page>
  );
}

function GeneralPage({ report, data: rd, update }: DocContext) {
  const inq = report.inquiry;
  const clientName = inq?.companyName || inq?.customerName || "-";
  const addr = inq?.address || "";
  const metodologi = rd.metodologi.length ? rd.metodologi : [{ periode: "", metode: "", alatMaterial: "", pestisida: "" }];
  return (
    <Page title="Data Umum">
      <SectionTitle>Data Umum</SectionTitle>
      <InfoTable rows={[
        ["Nama Pelanggan", clientName],
        ["Alamat", <EditableText key="alamat" value={rd.alamat || addr} onChange={v => update({ alamat: v })} multiline />],
        ["Jenis Treatment", <EditableText key="jenis" value={rd.jenisLayanan} onChange={v => update({ jenisLayanan: v })} />],
        ["Jumlah Treatment", <EditableText key="jumlah" value={rd.jumlahTreatment} onChange={v => update({ jumlahTreatment: v })} placeholder="4x Treatment / Bulan" />],
        ["Teknisi", <EditableText key="tek" value={rd.teknisi} onChange={v => update({ teknisi: v })} placeholder="Sdr. ..." />],
        ["Hama Sasaran", <EditableText key="hama" value={rd.hamaSasaran} onChange={v => update({ hamaSasaran: v })} placeholder="Crawling Insect..." />],
      ]} />

      <SectionTitle>Metodologi Treatment dan Pestisida yang Digunakan</SectionTitle>
      <SmallTable>
        <thead><tr>{["Periode", "Metode Treatment", "Alat & Raw Material", "Pestisida", ""].map(h => <Th key={h} style={h ? undefined : { width: 28 }}><span className={h ? "" : "no-print"}>{h}</span></Th>)}</tr></thead>
        <tbody>
          {metodologi.map((row, i) => (
            <tr key={i}>
              {(["periode", "metode", "alatMaterial", "pestisida"] as const).map(field => (
                <Td key={field}><EditableText value={row[field]} onChange={v => update({ metodologi: metodologi.map((r, ri) => ri === i ? { ...r, [field]: v } : r) })} multiline /></Td>
              ))}
              <Td style={{ textAlign: "center" }}><button className="no-print" type="button" onClick={() => update({ metodologi: metodologi.filter((_, ri) => ri !== i) })} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>x</button></Td>
            </tr>
          ))}
        </tbody>
      </SmallTable>
      <button className="no-print" type="button" onClick={() => update({ metodologi: [...metodologi, { periode: "", metode: "", alatMaterial: "", pestisida: "" }] })} style={{ border: "none", background: "transparent", color: BLUE, fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>+ Tambah baris metodologi</button>

      <SectionTitle>General Notes</SectionTitle>
      <EditableText value={rd.generalNotes} onChange={v => update({ generalNotes: v })} multiline placeholder="Tuliskan general notes, hasil tangkapan, action, dan catatan pekerjaan..." style={{ minHeight: 250, fontSize: 12.5 }} />
    </Page>
  );
}

function CapturePage({ data: rd, update }: DocContext) {
  const tables = rd.captureTables?.length ? rd.captureTables : [defaultCaptureTable("Laporan Tangkapan Hama", rd.tangkapanTikus)];
  const updateTable = (idx: number, patch: Partial<CaptureTableData>) => {
    update({ captureTables: tables.map((table, i) => i === idx ? { ...table, ...patch } : table) });
  };
  const addTable = () => update({ captureTables: [...tables, defaultCaptureTable(`Laporan Tangkapan Hama ${tables.length + 1}`)] });
  const deleteTable = (idx: number) => update({ captureTables: tables.filter((_, i) => i !== idx) });
  return (
    <Page title="Data Tangkapan Hama">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {([0, 1, 2] as const).map(i => (
          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#4b5563" }}>
            Bulan {i + 1}
            <EditableText value={rd.bulanLabels[i]} onChange={v => {
              const labels = [...rd.bulanLabels] as [string, string, string];
              labels[i] = v;
              update({ bulanLabels: labels });
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {tables.map((table, idx) => (
          <section key={table.id} className="capture-table-block" style={{ breakInside: "avoid", pageBreakInside: "avoid", borderBottom: idx === tables.length - 1 ? "none" : "1px solid #e5e7eb", paddingBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: "#111827", whiteSpace: "nowrap" }}>Tabel {idx + 1}.</span>
              <EditableText value={table.title} onChange={v => updateTable(idx, { title: v })} placeholder="Judul tabel" style={{ fontWeight: 800, fontSize: 12 }} />
              {tables.length > 1 && <button className="no-print" type="button" onClick={() => deleteTable(idx)} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Hapus tabel</button>}
            </div>
            <PestCaptureTable title="" rows={table.rows} labels={rd.bulanLabels} onChange={rows => updateTable(idx, { rows })} />
            <BarChart title={`Grafik ${idx + 1}. ${table.title || "Hasil Tangkapan"}`} rows={table.rows} labels={rd.bulanLabels} />
          </section>
        ))}
        <button className="no-print" type="button" onClick={addTable} style={{ alignSelf: "flex-start", border: `1px solid ${BLUE}`, background: "#eff6ff", color: BLUE, borderRadius: 5, padding: "6px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>+ Tambah table</button>
      </div>
    </Page>
  );
}

function DocumentationPage({ data: rd, update }: DocContext) {
  const rawDoks = Array.isArray(rd.dokumentasi) ? rd.dokumentasi : [];
  const docs = rawDoks.length ? rawDoks.map((d: any) => ({ kegiatan: d.kegiatan ?? "", fotos: Array.isArray(d.fotos) ? d.fotos : [] })) : Array.from({ length: 4 }, () => ({ kegiatan: "", fotos: [] as string[] }));
  const updDoc = (i: number, patch: Partial<typeof docs[number]>) =>
    update({ dokumentasi: docs.map((d, di) => di === i ? { ...d, ...patch } : d) });
  return (
    <Page title="Dokumentasi Kegiatan">
      <SectionTitle>Dokumentasi Kegiatan</SectionTitle>
      <SmallTable>
        <thead>
          <tr>
            <Th style={{ width: 30 }}>No</Th>
            <Th style={{ width: 200 }}>Kegiatan</Th>
            <Th>Foto Dokumentasi</Th>
            <th className="no-print" style={{ background: BLUE, border: "1px solid #8795a7", width: 24 }} />
          </tr>
        </thead>
        <tbody>
          {docs.map((dok, i) => (
            <tr key={i}>
              <Td style={{ textAlign: "center", verticalAlign: "top", paddingTop: 10 }}>{i + 1}</Td>
              <Td style={{ verticalAlign: "top" }}>
                <EditableText value={dok.kegiatan} onChange={v => updDoc(i, { kegiatan: v })} multiline placeholder="Keterangan kegiatan" />
              </Td>
              <Td style={{ verticalAlign: "top", padding: "6px 8px" }}>
                <MultiPhotoCell
                  fotos={dok.fotos}
                  onAdd={url => updDoc(i, { fotos: [...dok.fotos, url] })}
                  onRemove={fi => updDoc(i, { fotos: dok.fotos.filter((_: string, idx: number) => idx !== fi) })}
                />
              </Td>
              <td className="no-print" style={{ border: "1px solid #c9d1dc", textAlign: "center", verticalAlign: "top", paddingTop: 8 }}>
                <button type="button" onClick={() => update({ dokumentasi: docs.filter((_, di) => di !== i) })} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </SmallTable>
      <button className="no-print" type="button"
        onClick={() => update({ dokumentasi: [...docs, { kegiatan: "", fotos: [] }] })}
        style={{ border: "none", background: "transparent", color: BLUE, fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
        + Tambah item dokumentasi
      </button>
    </Page>
  );
}

function FragmentLike({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function RecommendationPage({ data: rd, update }: DocContext) {
  const rows = rd.rekomendasi.length ? rd.rekomendasi : [{ id: `r-${Date.now()}`, tanggalTemuan: "", potensiHama: "", area: "", rekomendasi: "", dokumentasi: "", tanggalClosing: "", dokumentasiClosing: "" }];
  const upd = (i: number, patch: Partial<(typeof rows)[number]>) => update({ rekomendasi: rows.map((r, ri) => ri === i ? { ...r, ...patch } : r) });
  return (
    <Page title="Rekomendasi">
      <SectionTitle>Rekomendasi :</SectionTitle>
      <SmallTable>
        <thead>
          <tr>
            {["No", "Tanggal Temuan", "Potensi Hama", "Area", "Rekomendasi", "Dokumentasi", "Tanggal Closing", "Dokumentasi Closing", ""].map(h => <Th key={h} style={h === "No" ? { width: 28 } : h === "" ? { width: 24 } : undefined}><span className={h ? "" : "no-print"}>{h}</span></Th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((rek, i) => (
            <tr key={rek.id}>
              <Td style={{ textAlign: "center" }}>{i + 1}</Td>
              <Td><EditableText value={rek.tanggalTemuan} onChange={v => upd(i, { tanggalTemuan: v })} placeholder="01 April 2026" multiline /></Td>
              <Td><EditableText value={rek.potensiHama} onChange={v => upd(i, { potensiHama: v })} placeholder="Tikus" multiline /></Td>
              <Td><EditableText value={rek.area} onChange={v => upd(i, { area: v })} placeholder="Area" multiline /></Td>
              <Td><EditableText value={rek.rekomendasi} onChange={v => upd(i, { rekomendasi: v })} placeholder="Rekomendasi" multiline /></Td>
              <Td><PhotoCell compact url={rek.dokumentasi} onUpload={url => upd(i, { dokumentasi: url })} /></Td>
              <Td><EditableText value={rek.tanggalClosing} onChange={v => upd(i, { tanggalClosing: v })} placeholder="01 Juli 2026" multiline /></Td>
              <Td><PhotoCell compact url={rek.dokumentasiClosing} onUpload={url => upd(i, { dokumentasiClosing: url })} /></Td>
              <Td style={{ textAlign: "center" }}><button className="no-print" type="button" onClick={() => update({ rekomendasi: rows.filter((_, ri) => ri !== i) })} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>x</button></Td>
            </tr>
          ))}
        </tbody>
      </SmallTable>
      <button className="no-print" type="button" onClick={() => update({ rekomendasi: [...rows, { id: `r-${Date.now()}`, tanggalTemuan: "", potensiHama: "", area: "", rekomendasi: "", dokumentasi: "", tanggalClosing: "", dokumentasiClosing: "" }] })} style={{ border: "none", background: "transparent", color: BLUE, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Tambah rekomendasi</button>
    </Page>
  );
}

function ReportPage({ index, ctx }: { index: number; ctx: DocContext }) {
  if (index === 0) return <CoverPage {...ctx} />;
  if (index === 1) return <LetterPage {...ctx} />;
  if (index === 2) return <GeneralPage {...ctx} />;
  if (index === 3) return <CapturePage {...ctx} />;
  if (index === 4) return <DocumentationPage {...ctx} />;
  return <RecommendationPage {...ctx} />;
}

export default function SimpleReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: report, loading } = useGet<any>(`/erp/simple-reports/${id}`);
  const [currentPage, setCurrentPage] = useState(0);
  const [rd, setRd] = useState<ReportData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const savedRdRef = useRef<ReportData | null>(null);
  const printPagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!report) return;
    const existing = report.reportData as Partial<ReportData> | null;
    const base = defaultReportData(report.bulan, report.tahun);
    const merged = existing && Object.keys(existing).length > 0 ? { ...base, ...existing } : base;
    if (!Array.isArray((merged as any).captureTables) || (merged as any).captureTables.length === 0) {
      merged.captureTables = [defaultCaptureTable("Laporan Tangkapan Hama", merged.tangkapanTikus || base.tangkapanTikus)];
    }
    // Migrate old dokumentasi format: { kegiatan, foto: string } → { kegiatan, fotos: string[] }
    if (!Array.isArray(merged.dokumentasi)) merged.dokumentasi = base.dokumentasi;
    merged.dokumentasi = (merged.dokumentasi as any[]).map((d: any) => ({
      kegiatan: d.kegiatan ?? "",
      fotos: Array.isArray(d.fotos) ? d.fotos : (d.foto ? [d.foto] : []),
    }));
    setRd(merged);
    savedRdRef.current = merged;
  }, [report]);

  const save = useCallback(async (data: ReportData) => {
    setSaving(true);
    try {
      await api.patch(`/erp/simple-reports/${id}`, { reportData: data });
      setSavedAt(new Date().toLocaleTimeString("id-ID"));
      savedRdRef.current = data;
    } catch {
      showAlert({ title: "Gagal menyimpan", message: "Gagal menyimpan laporan.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }, [id]);

  const update = useCallback((patch: Partial<ReportData>) => {
    setRd(prev => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  }, []);

  const handleEdit = () => setEditMode(true);

  const handleSave = async () => {
    if (!rd) return;
    await save(rd);
    setEditMode(false);
  };

  const handleCancel = () => {
    if (savedRdRef.current) setRd(savedRdRef.current);
    setEditMode(false);
  };

  const confirmPageSwitch = async (next: number) => {
    if (editMode) {
      const ok = await showConfirm({
        title: "Simpan perubahan?",
        message: "Ada perubahan yang belum disimpan. Simpan sebelum pindah halaman?",
        confirmLabel: "Simpan & Pindah",
        cancelLabel: "Buang & Pindah",
      });
      if (ok && rd) await save(rd);
      else if (!ok && savedRdRef.current) setRd(savedRdRef.current);
      setEditMode(false);
    }
    setCurrentPage(next);
  };

  const handleSavePdf = () => window.print();

  const handleSavePptx = async () => {
    if (!rd) return;
    setExportingPptx(true);
    try {
      const container = printPagesRef.current;
      if (!container) return;
      container.style.display = "block";
      await new Promise(r => setTimeout(r, 400));

      const pages = Array.from(container.querySelectorAll(".simple-a4-page")) as HTMLElement[];
      const html2canvas = (await import("html2canvas")).default;
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "A4_P", width: 7.5, height: 10.58 });
      pptx.layout = "A4_P";

      for (const page of pages) {
        const canvas = await html2canvas(page, { scale: 1.5, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const slide = pptx.addSlide();
        slide.addImage({ data: imgData, x: 0, y: 0, w: "100%", h: "100%" });
      }

      container.style.display = "";
      const fname = `${inq?.companyName || inq?.customerName || "Report"} - Simple Monthly Report ${period}`;
      await (pptx as any).writeFile({ fileName: `${fname}.pptx` });
    } catch (e) {
      showAlert({ title: "Export gagal", message: "Gagal export PowerPoint.", tone: "danger" });
    } finally {
      setExportingPptx(false);
      if (printPagesRef.current) printPagesRef.current.style.display = "";
    }
  };

  if (loading || !rd) return <div className="p-9"><Loading /></div>;
  if (!report) return <div className="p-9" style={{ color: "#9ca3af" }}>Laporan tidak ditemukan.</div>;

  const inq = report.inquiry;
  const clientName = inq?.companyName || inq?.customerName || "-";
  const period = `${MONTHS_ID[(report.bulan ?? 1) - 1]} ${report.tahun}`;
  const ctx = { report, data: rd, update };

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: "Hapus laporan?",
      message: "Laporan ini akan dihapus permanen dan tidak dapat dikembalikan.",
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (!ok) return;
    await api.delete(`/erp/simple-reports/${id}`);
    router.push(ROUTES.monthlyReports);
  };

  return (
    <EditModeCtx.Provider value={editMode}>
    <div className={`simple-report-builder${!editMode ? " view-mode" : ""}`} style={{ height: "calc(100vh - 5rem)", display: "flex", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
      <aside className="no-print" style={{ width: 198, borderRight: "1px solid #d9ddeb", background: "#f2f3fd", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #d9ddeb" }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", letterSpacing: ".09em", margin: 0 }}>HALAMAN A4</p>
        </div>
        <div style={{ padding: 6, overflowY: "auto" }}>
          {PAGE_NAMES.map((name, i) => (
            <button key={name} onClick={() => confirmPageSwitch(i)} style={{
              display: "block",
              width: "100%",
              border: "none",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: 3,
              textAlign: "left",
              cursor: "pointer",
              background: currentPage === i ? NAVY : "transparent",
              color: currentPage === i ? "#fff" : "#4b5563",
              fontSize: 11,
              fontWeight: currentPage === i ? 800 : 600,
            }}>
              <span style={{ opacity: .65, marginRight: 6 }}>{i + 1}.</span>{name}
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="no-print" style={{ borderBottom: "1px solid #d9ddeb", background: "#fff", padding: "9px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Link href={ROUTES.monthlyReports} style={{ color: NAVY, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Kembali</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 900, color: NAVY, fontSize: 13, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clientName}</p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Simple Monthly Report · {period}</p>
          </div>
          {savedAt && !editMode && <span style={{ fontSize: 11, color: "#15803d", fontWeight: 700 }}>Tersimpan {savedAt}</span>}
          {saving && <span style={{ fontSize: 11, color: "#6b7280" }}>Menyimpan...</span>}
          <button onClick={() => confirmPageSwitch(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="btn" style={{ minHeight: 32, fontSize: 11, padding: "4px 10px" }}>Prev</button>
          <span style={{ minWidth: 58, textAlign: "center", fontSize: 11, fontWeight: 700 }}>{currentPage + 1}/{PAGE_NAMES.length}</span>
          <button onClick={() => confirmPageSwitch(Math.min(PAGE_NAMES.length - 1, currentPage + 1))} disabled={currentPage === PAGE_NAMES.length - 1} className="btn" style={{ minHeight: 32, fontSize: 11, padding: "4px 10px" }}>Next</button>

          {!editMode ? (
            <button onClick={handleEdit} className="btn" style={{ minHeight: 32, fontSize: 11, padding: "4px 12px", borderColor: NAVY, color: NAVY }}>✏ Edit</button>
          ) : (
            <>
              <button onClick={handleCancel} className="btn" style={{ minHeight: 32, fontSize: 11, padding: "4px 10px" }}>Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minHeight: 32, fontSize: 11, padding: "4px 12px" }}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </>
          )}

          <button onClick={handleSavePdf} className="btn" style={{ minHeight: 32, fontSize: 11, padding: "4px 12px" }}>Save as PDF</button>
          <button onClick={handleSavePptx} disabled={exportingPptx} className="btn" style={{ minHeight: 32, fontSize: 11, padding: "4px 12px" }}>
            {exportingPptx ? "Exporting..." : "Save as PowerPoint"}
          </button>
          <button onClick={handleDelete} style={{ minHeight: 32, padding: "4px 12px", fontSize: 11, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer" }}>Hapus</button>
        </div>

        <div className="no-print" style={{ flex: 1, overflow: "auto", background: "#e5e7eb", padding: "28px 24px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <ReportPage index={currentPage} ctx={ctx} />
        </div>

        <div ref={printPagesRef} className="print-pages">
          {PAGE_NAMES.map((_, i) => <ReportPage key={i} index={i} ctx={ctx} />)}
        </div>
      </main>
    </div>

      <style>{`
        .view-mode .simple-a4-page .no-print { display: none !important; }
        .doc-input:hover, .doc-input:focus {
          border-color: #93c5fd !important;
          background: #eff6ff !important;
        }
        .doc-input::placeholder {
          color: #9ca3af;
        }
        .simple-a4-page * {
          box-sizing: border-box;
        }
        .print-pages {
          display: none;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          /* Sembunyikan semua elemen app shell (search bar, sidebar, header) */
          header, aside {
            display: none !important;
          }
          /* Reset wrapper main agar tidak ada padding/margin sisa */
          body > div > main,
          main {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .simple-report-builder {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-pages {
            display: block !important;
          }
          .simple-a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            box-shadow: none !important;
            background-image: none !important;
            page-break-after: always;
            break-after: page;
            page-break-inside: auto;
            overflow: visible !important;
          }
          .simple-a4-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          /* Jaga table rows & chart tidak terpotong di tengah */
          tr, .bar-chart-block, .capture-table-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .doc-input {
            border-color: transparent !important;
            background: transparent !important;
            color: inherit !important;
          }
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </EditModeCtx.Provider>
  );
}
