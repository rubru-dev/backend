"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { useGet, Loading } from "@/components/erp/shared";
import type { FloorPlanCanvasHandle, CanvasData } from "@/components/b2b-report/FloorPlanCanvas";

/* dynamic import to avoid SSR issues with canvas */
const FloorPlanCanvas = dynamic(
  () => import("@/components/b2b-report/FloorPlanCanvas"),
  { ssr: false, loading: () => <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Loading canvas...</div> }
);

/* ─── Constants ──────────────────────────────────────────── */
const NAVY = "#2c3e5c";
const LINE = "#1a3560";
const LOGO = "/refrence/QuotationLogo.jpg";
const PEST_TYPES = ["Rodent Control","Shrew Control","Flies Control","Cat Control","Crawling Pest Control","Snake Control"] as const;
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const SLIDE_W = 980;

const PAGE_NAMES = ["Cover", ...PEST_TYPES, "Rekomendasi", "Penutup"];

/* ─── Types ──────────────────────────────────────────────── */
type ChartEntry = { bulan: string; nilai: number };
type PestPageData = {
  layoutData: CanvasData;
  chartData: ChartEntry[];
  photosTangkapan: string[];
  photosPreventive: string[];
  photosCorrective: string[];
  photosRek: string[];
  analisa: string;
  preventiveAction: string;
  correctiveAction: string;
  rekomendasi: string;
};
type RekItem = {
  id: string;
  tanggalTemuan: string;
  potensiHama: string;
  area: string;
  rekomendasi: string;
  dokumentasi: string;
  tanggalClosing: string;
  dokumentasiClosing: string;
};

function defaultPage(): PestPageData {
  return {
    layoutData: { objects: [] },
    chartData: [{ bulan: "", nilai: 0 }, { bulan: "", nilai: 0 }, { bulan: "", nilai: 0 }],
    photosTangkapan: [], photosPreventive: [], photosCorrective: [], photosRek: [],
    analisa: "", preventiveAction: "", correctiveAction: "", rekomendasi: "",
  };
}
function defaultRek(): RekItem {
  return { id: `r-${Date.now()}`, tanggalTemuan: "", potensiHama: "", area: "", rekomendasi: "", dokumentasi: "", tanggalClosing: "", dokumentasiClosing: "" };
}

/* ─── Slide footer ───────────────────────────────────────── */
function SlideFooter() {
  return (
    <div style={{ position: "relative", background: NAVY, overflow: "hidden", display: "flex", minHeight: 100, flexShrink: 0 }}>
      <div style={{ padding: "14px 28px", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
        <p style={{ fontWeight: 900, fontSize: 14, color: "#fff", margin: 0 }}>PT. FUMAKILLA INDONESIA</p>
        <p style={{ fontSize: 11, color: "#adc5de", fontWeight: 700, margin: "3px 0 0" }}>Pest Control Department</p>
        <p style={{ fontSize: 10, color: "#8faac4", marginTop: 4, lineHeight: 1.7, fontStyle: "italic", margin: "4px 0 0" }}>
          CIBIS 8 Building suite 02 - 6th floor, CIBIS Business Park<br />
          Cilandak, Pasar Minggu, South Jakarta City, Jakarta
        </p>
      </div>
      <div style={{ width: 260, display: "flex", gap: 5, transform: "skewX(-10deg)", overflow: "hidden", marginRight: -20, flexShrink: 0 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, overflow: "hidden" }}>
            <img src="/refrence/Footer.png" alt="" style={{ height: 100, width: "220%", objectFit: "cover", transform: "skewX(10deg) scale(1.3)", transformOrigin: "center" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Bar chart (view) ───────────────────────────────────── */
function BarChart({ data }: { data: ChartEntry[] }) {
  const maxVal = Math.max(...data.map(d => d.nilai), 1);
  const totalW = 280, barW = 60, gap = 20, chartH = 160, padL = 30, padB = 28;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "12px 8px" }}>
      <p style={{ fontWeight: 700, textDecoration: "underline", fontSize: 12, margin: "0 0 2px", textAlign: "center" }}>Grafik Tangkapan</p>
      <p style={{ fontSize: 11, fontStyle: "italic", margin: "0 0 10px", textAlign: "center" }}>(Sajikan data 3 bulan terakhir)</p>
      <svg width={totalW} height={chartH + padB} viewBox={`0 0 ${totalW} ${chartH + padB}`}>
        <line x1={padL} y1={0} x2={padL} y2={chartH} stroke="#ccc" strokeWidth={1} />
        <line x1={padL} y1={chartH} x2={totalW - 10} y2={chartH} stroke="#ccc" strokeWidth={1} />
        {data.map((d, i) => {
          const barH = maxVal > 0 ? Math.round((d.nilai / maxVal) * (chartH - 20)) : 0;
          const x = padL + gap + i * (barW + gap);
          const y = chartH - barH;
          return (
            <g key={i}>
              {barH > 0 && <rect x={x} y={y} width={barW} height={barH} fill={NAVY} rx={2} />}
              <text x={x + barW / 2} y={barH > 0 ? y - 4 : chartH - 4} textAnchor="middle" fontSize={11} fill="#333">{d.nilai || ""}</text>
              <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill="#555">{d.bulan}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Chart editor (edit) ────────────────────────────────── */
function ChartEditor({ data, onChange }: { data: ChartEntry[]; onChange: (v: ChartEntry[]) => void }) {
  return (
    <div style={{ padding: 12 }}>
      <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Grafik Tangkapan — Data 3 Bulan</p>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, width: 50, flexShrink: 0, color: "#6b7280" }}>Bulan {i + 1}</span>
          <input value={d.bulan} onChange={e => { const n = [...data]; n[i] = { ...n[i], bulan: e.target.value }; onChange(n); }}
            placeholder="e.g. Jan 2026" style={{ flex: 1, fontSize: 11, padding: "4px 7px", border: "1px solid #d1d5db", borderRadius: 4 }} />
          <input type="number" value={d.nilai} min={0} onChange={e => { const n = [...data]; n[i] = { ...n[i], nilai: Number(e.target.value) }; onChange(n); }}
            placeholder="0" style={{ width: 60, fontSize: 11, padding: "4px 7px", border: "1px solid #d1d5db", borderRadius: 4, textAlign: "right" }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Photo Box ──────────────────────────────────────────── */
function PhotoBox({ photos, label, editMode, onAdd, onRemove }: {
  photos: string[]; label: string; editMode: boolean;
  onAdd: (url: string) => void; onRemove: (idx: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("photo", file);
      const r = await api.post("/erp/pest-reports/upload-photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onAdd(r.data.url);
    } catch { alert("Upload gagal."); }
    finally { setUploading(false); }
  };

  const firstPhoto = photos[0];

  return (
    <div style={{ border: "1px solid #999", aspectRatio: "4/3", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {firstPhoto ? (
        <img src={firstPhoto.startsWith("/uploads") ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4003"}${firstPhoto}` : firstPhoto}
          alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 10, textAlign: "center", padding: 8 }}>
          <span style={{ fontSize: 20, marginBottom: 4 }}>📷</span>
          <span>{label}</span>
        </div>
      )}
      {editMode && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.5)", display: "flex", gap: 4, padding: "4px 6px", justifyContent: "center" }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ fontSize: 10, background: "#fff", border: "none", borderRadius: 4, padding: "2px 7px", cursor: "pointer" }}>
            {uploading ? "..." : "+ Foto"}
          </button>
          {photos.length > 1 && (
            <span style={{ fontSize: 9, color: "#ddd", lineHeight: "20px" }}>+{photos.length - 1}</span>
          )}
          {firstPhoto && (
            <button onClick={() => onRemove(0)}
              style={{ fontSize: 10, background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>×</button>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

/* ─── Analysis section (view) ────────────────────────────── */
function AnalysisView({ pd }: { pd: PestPageData }) {
  const bullets = (text: string) =>
    text.trim() ? text.split("\n").filter(Boolean).map((l, i) => <li key={i} style={{ marginBottom: 3 }}>{l}</li>) : <li style={{ color: "#9ca3af" }}>—</li>;

  return (
    <div style={{ fontSize: 12, lineHeight: 1.8 }}>
      {[
        { label: "Analisa :", text: pd.analisa },
        { label: "Preventive Action :", text: pd.preventiveAction },
        { label: "Corrective Action :", text: pd.correctiveAction },
        { label: "Rekomendasi :", text: pd.rekomendasi },
      ].map(({ label, text }) => (
        <div key={label} style={{ marginBottom: 8 }}>
          <p style={{ fontWeight: 900, margin: "0 0 2px" }}>• {label}</p>
          <ul style={{ paddingLeft: 18, margin: "0 0 4px" }}>{bullets(text)}</ul>
        </div>
      ))}
    </div>
  );
}

/* ─── Analysis editor (edit) ─────────────────────────────── */
function AnalysisEditor({ pd, onChange }: { pd: PestPageData; onChange: (v: PestPageData) => void }) {
  const ta = (label: string, key: keyof PestPageData) => (
    <label style={{ display: "block", marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 3 }}>• {label}</span>
      <textarea rows={3} value={pd[key] as string}
        onChange={e => onChange({ ...pd, [key]: e.target.value })}
        placeholder="Tiap baris = satu poin..."
        style={{ width: "100%", fontSize: 11, padding: "5px 7px", border: "1px solid #d1d5db", borderRadius: 4, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
    </label>
  );
  return (
    <div>
      {ta("Analisa :", "analisa")}
      {ta("Preventive Action :", "preventiveAction")}
      {ta("Corrective Action :", "correctiveAction")}
      {ta("Rekomendasi :", "rekomendasi")}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Cover
═══════════════════════════════════════════════════════════ */
function CoverSlide({ report }: { report: any }) {
  const clientName = report?.inquiry?.companyName || report?.inquiry?.customerName || "—";
  const clientAddr = report?.inquiry?.address || "—";
  const periodeStr = `${MONTHS_ID[(report?.bulan ?? 1) - 1]} ${report?.tahun ?? ""}`;

  return (
    <div style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "28px 36px 20px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <img src={LOGO} alt="Fumakilla" style={{ height: 68, objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
          <h1 style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 48, fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.1 }}>
            PEST CONTROL REPORT
          </h1>
          <p style={{ fontStyle: "italic", fontSize: 20, color: "#444", margin: "6px 0" }}>for</p>
          <p style={{ fontSize: 26, fontWeight: 900, color: "#111", margin: 0 }}>{clientName}</p>
          <p style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: ".04em", maxWidth: 580, lineHeight: 1.7, margin: 0 }}>{clientAddr}</p>
          <p style={{ fontSize: 14, color: "#666", margin: "8px 0 0", fontStyle: "italic" }}>Periode: {periodeStr}</p>
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Pest Control Page (Rodent/Shrew/Flies/Cat/Crawling/Snake)
═══════════════════════════════════════════════════════════ */
function PestSlide({ pestType, pageIdx, pd, editMode, onChange }: {
  pestType: string; pageIdx: number; pd: PestPageData; editMode: boolean; onChange: (v: PestPageData) => void;
}) {
  const canvasRef = useRef<FloorPlanCanvasHandle>(null);

  const addPhoto = (key: keyof Pick<PestPageData,"photosTangkapan"|"photosPreventive"|"photosCorrective"|"photosRek">) =>
    (url: string) => onChange({ ...pd, [key]: [...pd[key], url] });
  const removePhoto = (key: keyof Pick<PestPageData,"photosTangkapan"|"photosPreventive"|"photosCorrective"|"photosRek">) =>
    (idx: number) => onChange({ ...pd, [key]: pd[key].filter((_, i) => i !== idx) });

  return (
    <div style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 32, fontWeight: 700, fontStyle: "italic", color: "#111", margin: 0 }}>{pestType}</h1>
        </div>
        <img src={LOGO} alt="Fumakilla" style={{ height: 54, objectFit: "contain", flexShrink: 0, marginLeft: 12 }} />
      </div>
      <div style={{ margin: "0 20px 8px", borderBottom: `2.5px solid ${LINE}`, flexShrink: 0 }} />

      {/* Top row: Canvas | Chart */}
      <div style={{ display: "flex", gap: 10, padding: "0 16px 8px", flexShrink: 0 }}>
        {/* Canvas */}
        <div style={{ flex: "0 0 50%", border: "1px solid #aaa", minHeight: 260 }}>
          <FloorPlanCanvas
            key={`canvas-page-${pageIdx}`}
            initialData={pd.layoutData}
            onChange={d => onChange({ ...pd, layoutData: d })}
            width={470}
            height={260}
            readOnly={false}
            showRiskMarkers={false}
          />
        </div>
        {/* Chart */}
        <div style={{ flex: 1, border: "1px solid #aaa", minHeight: 260 }}>
          {editMode ? (
            <ChartEditor data={pd.chartData} onChange={v => onChange({ ...pd, chartData: v })} />
          ) : (
            <BarChart data={pd.chartData} />
          )}
        </div>
      </div>

      {/* Bottom row: 2x2 photos | Analysis text */}
      <div style={{ display: "flex", gap: 10, padding: "0 16px 8px", flex: 1 }}>
        {/* 2×2 photo grid */}
        <div style={{ flex: "0 0 43%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <PhotoBox photos={pd.photosTangkapan} label="Foto Tangkapan" editMode={editMode}
            onAdd={addPhoto("photosTangkapan")} onRemove={removePhoto("photosTangkapan")} />
          <PhotoBox photos={pd.photosPreventive} label="Foto Preventive Action" editMode={editMode}
            onAdd={addPhoto("photosPreventive")} onRemove={removePhoto("photosPreventive")} />
          <PhotoBox photos={pd.photosCorrective} label="Foto Corrective Action" editMode={editMode}
            onAdd={addPhoto("photosCorrective")} onRemove={removePhoto("photosCorrective")} />
          <PhotoBox photos={pd.photosRek} label="Foto Rekomendasi" editMode={editMode}
            onAdd={addPhoto("photosRek")} onRemove={removePhoto("photosRek")} />
        </div>
        {/* Analysis */}
        <div style={{ flex: 1, border: "1px solid #aaa", padding: 12, minHeight: 180, overflow: "auto" }}>
          {editMode
            ? <AnalysisEditor pd={pd} onChange={onChange} />
            : <AnalysisView pd={pd} />}
        </div>
      </div>

      <SlideFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Rekomendasi table
═══════════════════════════════════════════════════════════ */
const REK_COLS = [
  { key: "tanggalTemuan", label: "Tanggal Temuan" },
  { key: "potensiHama",   label: "Potensi Hama" },
  { key: "area",          label: "Area" },
  { key: "rekomendasi",   label: "Rekomendasi" },
  { key: "dokumentasi",   label: "Dokumentasi" },
  { key: "tanggalClosing",     label: "Tanggal Closing" },
  { key: "dokumentasiClosing", label: "Dokumentasi Closing" },
] as const;

function RekomendasiSlide({ items, editMode, onChange }: {
  items: RekItem[]; editMode: boolean; onChange: (v: RekItem[]) => void;
}) {
  const upd = (i: number, k: keyof RekItem, v: string) =>
    onChange(items.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const add = () => onChange([...items, defaultRek()]);
  const del = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <div style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, fontStyle: "italic", color: "#111", margin: 0 }}>Rekomendasi</h1>
        </div>
        <img src={LOGO} alt="Fumakilla" style={{ height: 54, objectFit: "contain", flexShrink: 0, marginLeft: 12 }} />
      </div>
      <div style={{ margin: "0 20px 10px", borderBottom: `2.5px solid ${LINE}`, flexShrink: 0 }} />

      {editMode && (
        <div style={{ padding: "0 16px 8px" }}>
          <button onClick={add} style={{ background: NAVY, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 5, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Tambah Baris</button>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: "0 16px 8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#4a6fa5", color: "#fff" }}>
              <th style={{ padding: "9px 10px", textAlign: "center", border: "1px solid #c5cdd8", width: 36 }}>No</th>
              {REK_COLS.map(c => (
                <th key={c.key} style={{ padding: "9px 10px", textAlign: "center", border: "1px solid #c5cdd8", fontWeight: 700 }}>{c.label}</th>
              ))}
              {editMode && <th style={{ border: "1px solid #c5cdd8", width: 32 }} />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={editMode ? 9 : 8} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
                {editMode ? 'Klik "+ Tambah Baris" untuk menambah data.' : "Belum ada data rekomendasi."}
              </td></tr>
            )}
            {items.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? "#dce8f5" : "#fff" }}>
                <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, border: "1px solid #c5cdd8" }}>{i + 1}</td>
                {REK_COLS.map(c => (
                  <td key={c.key} style={{ padding: editMode ? "4px 6px" : "8px 10px", border: "1px solid #c5cdd8", verticalAlign: "top" }}>
                    {editMode ? (
                      <input value={r[c.key]} onChange={e => upd(i, c.key, e.target.value)}
                        style={{ width: "100%", fontSize: 11, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 3 }} />
                    ) : (
                      c.key === "dokumentasi" || c.key === "dokumentasiClosing"
                        ? (r[c.key] && (r[c.key].startsWith("http") || r[c.key].startsWith("/"))
                          ? <img src={r[c.key].startsWith("/uploads") ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4003"}${r[c.key]}` : r[c.key]} alt="" style={{ maxWidth: 80, maxHeight: 60, objectFit: "cover" }} />
                          : <span>{r[c.key]}</span>)
                        : <span>{r[c.key]}</span>
                    )}
                  </td>
                ))}
                {editMode && (
                  <td style={{ padding: "4px 6px", border: "1px solid #c5cdd8", textAlign: "center" }}>
                    <button onClick={() => del(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer" }}>×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Penutup / Thank You
═══════════════════════════════════════════════════════════ */
function PenutupSlide() {
  return (
    <div style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", minHeight: 520 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "18px 28px 10px" }}>
        <img src={LOGO} alt="Fumakilla" style={{ height: 58, objectFit: "contain" }} />
      </div>
      <div style={{ flex: 1, display: "flex", padding: "8px 0 0" }}>
        {/* Left diagonal strips */}
        <div style={{ flex: "0 0 55%", display: "flex", gap: 10, transform: "skewX(-10deg)", overflow: "hidden", marginLeft: -24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, overflow: "hidden" }}>
              <img src="/refrence/Footer.png" alt="" style={{ height: 320, width: "300%", objectFit: "cover", transform: "skewX(10deg) scale(1.4)", transformOrigin: "center" }} />
            </div>
          ))}
        </div>
        {/* Right navy box */}
        <div style={{ flex: "0 0 45%", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 28px" }}>
          <p style={{ fontSize: 40, fontWeight: 400, color: "#fff", margin: "0 0 10px", fontFamily: "serif" }}>Thank you</p>
          <p style={{ fontSize: 18, color: "#adc5de", margin: 0 }}>どうもありがとうございました</p>
        </div>
      </div>
      <div style={{ padding: "14px 28px 18px", textAlign: "center" }}>
        <p style={{ fontStyle: "italic", fontSize: 13, color: "#444", margin: 0 }}>We're looking forward to have collaboration with you</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function MonthlyReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, loading } = useGet<any>(`/erp/pest-reports/${id}`);

  const [currentPage, setCurrentPage] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  /* pagesData: 6 pest pages, rekData: rekomendasi rows */
  const [pagesData, setPagesData] = useState<PestPageData[]>(() => PEST_TYPES.map(() => defaultPage()));
  const [rekData, setRekData] = useState<RekItem[]>([]);

  useEffect(() => {
    if (!report) return;
    const pd = Array.isArray(report.pagesData) ? report.pagesData : PEST_TYPES.map(() => defaultPage());
    const filled = PEST_TYPES.map((_, i) => ({ ...defaultPage(), ...(pd[i] || {}) }));
    setPagesData(filled);
    setRekData(Array.isArray(report.rekData) ? report.rekData : []);
  }, [report]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/erp/pest-reports/${id}`, { pagesData, rekData });
      setEditMode(false);
      setSavedMsg("Tersimpan!");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch { alert("Gagal menyimpan."); }
    finally { setSaving(false); }
  };

  /* page 0 = Cover, 1-6 = pest types, 7 = Rekomendasi, 8 = Penutup */
  const isPestPage = currentPage >= 1 && currentPage <= 6;
  const isRekPage = currentPage === 7;
  const canEdit = isPestPage || isRekPage;

  const renderSlide = () => {
    if (currentPage === 0) return <CoverSlide report={report} />;
    if (isPestPage) {
      const idx = currentPage - 1;
      return (
        <PestSlide
          key={`pest-${idx}`}
          pestType={PEST_TYPES[idx]}
          pageIdx={idx}
          pd={pagesData[idx]}
          editMode={editMode}
          onChange={v => setPagesData(prev => prev.map((p, i) => i === idx ? v : p))}
        />
      );
    }
    if (isRekPage) return <RekomendasiSlide items={rekData} editMode={editMode} onChange={setRekData} />;
    return <PenutupSlide />;
  };

  if (loading) return <div className="p-9"><Loading /></div>;
  if (!report) return <div className="p-9 text-sm text-gray-500">Laporan tidak ditemukan.</div>;

  const clientName = report.inquiry?.companyName || report.inquiry?.customerName || "—";
  const periodeTxt = `${MONTHS_ID[(report.bulan ?? 1) - 1]} ${report.tahun ?? ""}`;

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]" style={{ display: "flex", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 190, borderRight: "1px solid #d9ddeb", background: "#f2f3fd", display: "flex", flexDirection: "column", overflow: "hidden" }} className="print:hidden">
        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #d9ddeb" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6a7180", letterSpacing: ".1em", margin: 0 }}>HALAMAN</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "5px" }}>
          {PAGE_NAMES.map((name, i) => (
            <button key={i} onClick={() => { setCurrentPage(i); setEditMode(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 6, border: "none",
                background: currentPage === i ? NAVY : "transparent",
                color: currentPage === i ? "#fff" : "#515866",
                fontSize: 11, fontWeight: currentPage === i ? 700 : 500,
                cursor: "pointer", marginBottom: 2 }}>
              <span style={{ fontWeight: 800, marginRight: 5, opacity: .6 }}>{i + 1}.</span>{name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ borderBottom: "1px solid #d9ddeb", padding: "9px 16px", display: "flex", alignItems: "center", gap: 10, background: "#fff", flexShrink: 0 }} className="print:hidden">
          <Link href="/monthly-report" style={{ color: NAVY, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>← Kembali</Link>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 13, color: NAVY, margin: 0 }}>{clientName}</p>
            <p style={{ fontSize: 11, color: "#6a7180", margin: 0 }}>Monthly Report — {periodeTxt} · {report.segment}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="btn" style={{ minHeight: 32, padding: "4px 10px", fontSize: 11 }}>← Prev</button>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", minWidth: 70, textAlign: "center" }}>Hal {currentPage + 1}/{PAGE_NAMES.length}</span>
            <button onClick={() => setCurrentPage(p => Math.min(PAGE_NAMES.length - 1, p + 1))} disabled={currentPage === PAGE_NAMES.length - 1} className="btn" style={{ minHeight: 32, padding: "4px 10px", fontSize: 11 }}>Next →</button>
            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)} className="btn" style={{ minHeight: 32, padding: "4px 12px", fontSize: 11, borderColor: NAVY, color: NAVY }}>✏ Edit</button>
            )}
            {editMode && (
              <>
                <button onClick={() => setEditMode(false)} className="btn" style={{ minHeight: 32, padding: "4px 10px", fontSize: 11 }}>Batal</button>
                <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: 32, padding: "4px 12px", fontSize: 11 }}>
                  {saving ? "Menyimpan..." : "💾 Simpan"}
                </button>
              </>
            )}
            {savedMsg && <span style={{ color: "#16713b", fontWeight: 700, fontSize: 11 }}>✓ {savedMsg}</span>}
            <button onClick={() => window.print()} className="btn" style={{ minHeight: 32, padding: "4px 12px", fontSize: 11 }}>🖨 Cetak</button>
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", display: "flex", justifyContent: "center", padding: "28px 20px" }} className="print:p-0 print:bg-white print:block">
          {renderSlide()}
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          aside, .print\\:hidden { display: none !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
