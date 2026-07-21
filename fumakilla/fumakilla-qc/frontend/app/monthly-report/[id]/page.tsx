"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { downloadName } from "@/lib/download-name";
import { useGet, Loading } from "@/components/erp/shared";
import type { FloorPlanCanvasHandle, CanvasData } from "@/components/b2b-report/FloorPlanCanvas";
import { showAlert, showConfirm } from "@/lib/app-modal";
import { fileUrl } from "@/lib/utils";
import PestPhotoAnalyze from "@/components/ai/PestPhotoAnalyze";

const FloorPlanCanvas = dynamic(
  () => import("@/components/b2b-report/FloorPlanCanvas"),
  { ssr: false, loading: () => <div style={{ height: 480, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Loading canvas...</div> }
);

/* ─── Constants ─────────────────────────────────────────── */
const NAVY = "#2c3e5c";
const LINE = "#1a3560";
const HEADER_TRANSP = "/refrence/Header-transparent.png";
const HEADER_WHITE  = "/refrence/Header.jpg";
const FOOTER_IMG    = "/refrence/Footer.png";
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const SLIDE_W = 980;
const CANVAS_H = 500;

/* ─── Legacy pest types for migration ───────────────────── */
const LEGACY_PEST_TYPES = ["Rodent Control","Shrew Control","Flies Control","Cat Control","Crawling Pest Control","Snake Control"];

/* ─── Types ──────────────────────────────────────────────── */
type ChartEntry = { bulan: string; nilai: number };
type HamaSection = {
  id: string;
  name: string;
  layoutData: CanvasData;
  photoPath?: string;
  chartData: ChartEntry[];
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
  dokumentasi: string[];
  tanggalClosing: string;
  dokumentasiClosing: string[];
};

function defaultHama(name = "Rodent Control"): HamaSection {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    layoutData: { objects: [] },
    chartData: [{ bulan: "", nilai: 0 }, { bulan: "", nilai: 0 }, { bulan: "", nilai: 0 }],
    analisa: "",
    preventiveAction: "",
    correctiveAction: "",
    rekomendasi: "",
  };
}

function defaultRek(): RekItem {
  return { id: `r-${Date.now()}`, tanggalTemuan: "", potensiHama: "", area: "", rekomendasi: "", dokumentasi: [], tanggalClosing: "", dokumentasiClosing: [] };
}

/* ─── Shared slide pieces ────────────────────────────────── */
function SlideHeaderLine({ title, transparent = false }: { title?: string; transparent?: boolean }) {
  return (
    <>
      <div style={{ padding: "16px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        {title ? (
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, fontWeight: 700, fontStyle: "italic", color: "#111", margin: 0, flex: 1, textAlign: "center" }}>
            {title}
          </h1>
        ) : <div style={{ flex: 1 }} />}
        <img src={transparent ? HEADER_TRANSP : HEADER_WHITE} alt="Fumakilla"
          style={{ height: 54, objectFit: "contain", flexShrink: 0, mixBlendMode: transparent ? undefined : "multiply" }} />
      </div>
      <div style={{ margin: "6px 24px 10px", borderBottom: `2px solid ${LINE}`, flexShrink: 0 }} />
    </>
  );
}

function ImageFooter() {
  return <img src={FOOTER_IMG} alt="Footer" style={{ width: "100%", display: "block", flexShrink: 0 }} />;
}

/* ─── Bar chart ──────────────────────────────────────────── */
function BarChart({ data }: { data: ChartEntry[] }) {
  const maxVal = Math.max(...data.map(d => d.nilai), 1);
  const totalW = 310, barW = 64, gap = 22, chartH = 160, padL = 32, padB = 30;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 8px 6px" }}>
      <p style={{ fontWeight: 700, fontSize: 12, margin: "0 0 2px", textAlign: "center" }}>Grafik Tangkapan</p>
      <p style={{ fontSize: 10, fontStyle: "italic", margin: "0 0 8px", textAlign: "center", color: "#6b7280" }}>(3 bulan terakhir)</p>
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
              <text x={x + barW / 2} y={barH > 0 ? y - 4 : chartH - 6} textAnchor="middle" fontSize={11} fill="#333">{d.nilai || ""}</text>
              <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize={10} fill="#555">{d.bulan}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Chart table editor ──────────────────────────────────── */
function ChartEditor({ data, onChange }: { data: ChartEntry[]; onChange: (v: ChartEntry[]) => void }) {
  return (
    <div style={{ padding: "12px" }}>
      <p style={{ fontWeight: 700, fontSize: 12, margin: "0 0 8px" }}>Grafik Tangkapan — Input Data</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#4a6fa5", color: "#fff" }}>
            <th style={{ padding: "7px 10px", border: "1px solid #c5cdd8", textAlign: "center" }}>Bulan</th>
            <th style={{ padding: "7px 10px", border: "1px solid #c5cdd8", textAlign: "center", width: 90 }}>Nilai</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#dce8f5" : "#fff" }}>
              <td style={{ padding: "4px 6px", border: "1px solid #c5cdd8" }}>
                <input value={d.bulan} onChange={e => { const n = [...data]; n[i] = { ...n[i], bulan: e.target.value }; onChange(n); }}
                  placeholder={`e.g. ${MONTHS_ID[i]} 2026`}
                  style={{ width: "100%", fontSize: 11, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 3 }} />
              </td>
              <td style={{ padding: "4px 6px", border: "1px solid #c5cdd8" }}>
                <input type="number" min={0} value={d.nilai}
                  onChange={e => { const n = [...data]; n[i] = { ...n[i], nilai: Number(e.target.value) }; onChange(n); }}
                  style={{ width: "100%", fontSize: 11, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 3, textAlign: "right" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Analysis ────────────────────────────────────────────── */
function AnalysisView({ h }: { h: HamaSection }) {
  const bullets = (text: string) =>
    text.trim()
      ? text.split("\n").filter(Boolean).map((l, i) => <li key={i} style={{ marginBottom: 2 }}>{l}</li>)
      : <li style={{ color: "#9ca3af" }}>—</li>;
  return (
    <div style={{ fontSize: 12, lineHeight: 1.75, padding: "10px 14px" }}>
      {(["analisa","preventiveAction","correctiveAction","rekomendasi"] as const).map(key => {
        const labels: Record<string, string> = { analisa: "Analisa", preventiveAction: "Preventive Action", correctiveAction: "Corrective Action", rekomendasi: "Rekomendasi" };
        return (
          <div key={key} style={{ marginBottom: 8 }}>
            <p style={{ fontWeight: 900, margin: "0 0 2px" }}>• {labels[key]} :</p>
            <ul style={{ paddingLeft: 18, margin: "0 0 4px" }}>{bullets(h[key])}</ul>
          </div>
        );
      })}
    </div>
  );
}

function AnalysisEditor({ h, onChange }: { h: HamaSection; onChange: (v: HamaSection) => void }) {
  const labels: Record<string, string> = { analisa: "Analisa", preventiveAction: "Preventive Action", correctiveAction: "Corrective Action", rekomendasi: "Rekomendasi" };
  return (
    <div style={{ padding: "10px 14px" }}>
      {(["analisa","preventiveAction","correctiveAction","rekomendasi"] as const).map(key => (
        <label key={key} style={{ display: "block", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 3 }}>• {labels[key]} :</span>
          <textarea rows={3} value={h[key]}
            onChange={e => onChange({ ...h, [key]: e.target.value })}
            placeholder="Tiap baris = satu poin..."
            style={{ width: "100%", fontSize: 11, padding: "5px 7px", border: "1px solid #d1d5db", borderRadius: 4, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
        </label>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Cover (b2b style)
═══════════════════════════════════════════════════════════ */
function CoverSlide({ report }: { report: any }) {
  const clientName = report?.inquiry?.companyName || report?.inquiry?.customerName || "—";
  const clientAddr = report?.inquiry?.address || "";
  return (
    <div className="complete-slide" style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "18px 30px 0", flexShrink: 0 }}>
        <img src={HEADER_TRANSP} alt="Fumakilla" style={{ height: 64, objectFit: "contain" }} />
      </div>
      <div style={{ margin: "4px 32px 0", borderBottom: `1px solid ${LINE}`, flexShrink: 0 }} />

      {/* Center — same layout as b2b cover */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 52px", textAlign: "center" }}>
        <div style={{ flex: 1.25 }} />

        {/* Title */}
        <h1 style={{ fontSize: 62, lineHeight: 1.05, fontWeight: 900, letterSpacing: 0, color: "#05080d", marginBottom: 28, fontFamily: "Arial Black, Arial, sans-serif" }}>
          PEST CONTROL REPORT
        </h1>

        <div style={{ flex: 1.3 }} />

        {/* Client info */}
        <div style={{ textAlign: "center", width: "100%", maxWidth: 820 }}>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#111", fontSize: 22, marginBottom: 24, margin: "0 0 24px" }}>for</p>
          <p style={{ width: "100%", textAlign: "center", fontSize: 42, lineHeight: 1.15, fontWeight: 800, color: "#111", margin: "0 0 10px" }}>
            {clientName}
          </p>
          {clientAddr && (
            <p style={{ width: "100%", textAlign: "center", fontSize: 20, lineHeight: 1.4, color: "#30343a", marginTop: 10, whiteSpace: "pre-wrap", margin: "10px 0 0" }}>
              {clientAddr}
            </p>
          )}
        </div>

        <div style={{ flex: 1.1 }} />
      </div>

      <ImageFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Hama section
═══════════════════════════════════════════════════════════ */
function HamaSlide({ section, editMode, onChange }: {
  section: HamaSection; editMode: boolean; onChange: (v: HamaSection) => void;
}) {
  const canvasWidth = Math.round(SLIDE_W * 0.5) - 32;

  return (
    <div className="complete-slide" style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}>
      <SlideHeaderLine title={section.name} />

      <div style={{ display: "flex", gap: 10, padding: "0 16px 10px", alignItems: "stretch" }}>
        {/* Left: Upload foto + Analisa AI (mengganti canvas) */}
        <div style={{ flex: "0 0 50%", border: "1px solid #aaa", height: editMode ? "auto" : CANVAS_H, padding: editMode ? 8 : 0, overflow: "hidden" }}>
          <PestPhotoAnalyze
            editable={editMode}
            photoPath={section.photoPath || ""}
            onPhotoChange={p => onChange({ ...section, photoPath: p })}
            defaultInstruction={section.name ? `Fokus: ${section.name}. ` : ""}
            onResult={d => onChange({
              ...section,
              analisa: [section.analisa?.trim(), d.findingsDraft].filter(Boolean).join("\n"),
              rekomendasi: section.rekomendasi?.trim() ? section.rekomendasi : d.recommendationDraft,
            })}
          />
        </div>

        {/* Right: Chart (top) + Analysis (bottom), same width */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          {/* Grafik Tangkapan: tabel di edit, bar chart di view */}
          <div style={{ border: "1px solid #aaa" }}>
            {editMode
              ? <ChartEditor data={section.chartData} onChange={v => onChange({ ...section, chartData: v })} />
              : <BarChart data={section.chartData} />
            }
          </div>

          {/* Analisa (sejajar lebar grafik) */}
          <div style={{ border: "1px solid #aaa", flex: 1, overflow: "auto" }}>
            {editMode
              ? <AnalysisEditor h={section} onChange={onChange} />
              : <AnalysisView h={section} />
            }
          </div>
        </div>
      </div>

      <ImageFooter />
    </div>
  );
}

/* ─── Image cell for Rekomendasi table ───────────────────── */

function RekImageCell({ photos, editMode, onChange }: {
  photos: string[]; editMode: boolean; onChange: (v: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData(); fd.append("photo", file);
        const r = await api.post("/erp/pest-reports/upload-photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
        added.push(r.data.url);
      }
      onChange([...photos, ...added]);
    } catch { showAlert({ title: "Upload gagal", message: "Gagal upload foto.", tone: "danger" }); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "2px 0" }}>
      {photos.map((p, i) => (
        <div key={i} style={{ position: "relative", flexShrink: 0 }}>
          <img src={fileUrl(p)} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 3, border: "1px solid #d1d5db", display: "block" }} />
          {editMode && (
            <button onClick={() => onChange(photos.filter((_, j) => j !== i))}
              style={{ position: "absolute", top: -5, right: -5, width: 17, height: 17, borderRadius: "50%", background: "#dc2626", color: "#fff", border: "none", fontSize: 10, cursor: "pointer", lineHeight: "17px", textAlign: "center", padding: 0 }}>
              ×
            </button>
          )}
        </div>
      ))}
      {editMode && (
        <>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ width: 52, height: 52, border: "1.5px dashed #9ca3af", borderRadius: 3, background: "#f9fafb", cursor: uploading ? "not-allowed" : "pointer", fontSize: 22, color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {uploading ? <span style={{ fontSize: 10 }}>...</span> : "+"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Rekomendasi
═══════════════════════════════════════════════════════════ */
const REK_TEXT_COLS = [
  { key: "tanggalTemuan",  label: "Tanggal Temuan" },
  { key: "potensiHama",    label: "Potensi Hama" },
  { key: "area",           label: "Area" },
  { key: "rekomendasi",    label: "Rekomendasi" },
] as const;

const REK_IMG_COLS = [
  { key: "dokumentasi",        label: "Dokumentasi" },
] as const;

const REK_TEXT_COLS2 = [
  { key: "tanggalClosing", label: "Tanggal Closing" },
] as const;

const REK_IMG_COLS2 = [
  { key: "dokumentasiClosing", label: "Dokumentasi Closing" },
] as const;

type RekTextKey = "tanggalTemuan" | "potensiHama" | "area" | "rekomendasi" | "tanggalClosing";
type RekImgKey  = "dokumentasi" | "dokumentasiClosing";

const ALL_REK_COLS: { key: string; label: string; img?: boolean }[] = [
  { key: "tanggalTemuan",      label: "Tanggal Temuan" },
  { key: "potensiHama",        label: "Potensi Hama" },
  { key: "area",               label: "Area" },
  { key: "rekomendasi",        label: "Rekomendasi" },
  { key: "dokumentasi",        label: "Dokumentasi",         img: true },
  { key: "tanggalClosing",     label: "Tanggal Closing" },
  { key: "dokumentasiClosing", label: "Dokumentasi Closing", img: true },
];

function RekomendasiSlide({ items, editMode, onChange }: {
  items: RekItem[]; editMode: boolean; onChange: (v: RekItem[]) => void;
}) {
  const updText = (i: number, k: RekTextKey, v: string) =>
    onChange(items.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const updImg = (i: number, k: RekImgKey, v: string[]) =>
    onChange(items.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const add = () => onChange([...items, defaultRek()]);
  const del = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <div className="complete-slide" style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}>
      <SlideHeaderLine title="Rekomendasi" />

      {editMode && (
        <div style={{ padding: "0 16px 8px" }}>
          <button onClick={add} style={{ background: NAVY, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 5, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            + Tambah Baris
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: "0 16px 10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#4a6fa5", color: "#fff" }}>
              <th style={{ padding: "9px 8px", textAlign: "center", border: "1px solid #c5cdd8", width: 34 }}>No</th>
              {ALL_REK_COLS.map(c => (
                <th key={c.key} style={{ padding: "9px 8px", textAlign: "center", border: "1px solid #c5cdd8", fontWeight: 700, minWidth: c.img ? 80 : undefined }}>{c.label}</th>
              ))}
              {editMode && <th style={{ border: "1px solid #c5cdd8", width: 32 }} />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={editMode ? ALL_REK_COLS.length + 2 : ALL_REK_COLS.length + 1}
                  style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
                  {editMode ? 'Klik "+ Tambah Baris" untuk menambah data.' : "Belum ada data rekomendasi."}
                </td>
              </tr>
            )}
            {items.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? "#dce8f5" : "#fff" }}>
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, border: "1px solid #c5cdd8" }}>{i + 1}</td>
                {ALL_REK_COLS.map(c => (
                  <td key={c.key} style={{ padding: "4px 5px", border: "1px solid #c5cdd8", verticalAlign: "top" }}>
                    {c.img ? (
                      <RekImageCell
                        photos={Array.isArray(r[c.key as RekImgKey]) ? r[c.key as RekImgKey] : (r[c.key as RekImgKey] as unknown as string) ? [r[c.key as RekImgKey] as unknown as string] : []}
                        editMode={editMode}
                        onChange={v => updImg(i, c.key as RekImgKey, v)}
                      />
                    ) : editMode ? (
                      <input value={r[c.key as RekTextKey] as string}
                        onChange={e => updText(i, c.key as RekTextKey, e.target.value)}
                        style={{ width: "100%", fontSize: 11, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 3 }} />
                    ) : (
                      <span style={{ fontSize: 11 }}>{r[c.key as RekTextKey]}</span>
                    )}
                  </td>
                ))}
                {editMode && (
                  <td style={{ padding: "4px 5px", border: "1px solid #c5cdd8", textAlign: "center" }}>
                    <button onClick={() => del(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer" }}>×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ImageFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SLIDE: Penutup (b2b ThankYouPage style)
═══════════════════════════════════════════════════════════ */
function PenutupSlide() {
  return (
    <div className="complete-slide" style={{ width: SLIDE_W, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", minHeight: 500 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "18px 30px 0", flexShrink: 0 }}>
        <img src={HEADER_WHITE} alt="Fumakilla" style={{ height: 52, objectFit: "contain", mixBlendMode: "multiply" }} />
      </div>
      <div style={{ margin: "6px 30px 10px", borderBottom: `2px solid ${LINE}`, flexShrink: 0 }} />

      {/* Center content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 48px" }}>
        <p style={{ fontSize: 58, fontWeight: 700, color: NAVY, marginBottom: 10, textAlign: "center", letterSpacing: 2, fontFamily: "Georgia, serif" }}>
          Thank you
        </p>
        <p style={{ fontSize: 22, color: "#374151", textAlign: "center", marginBottom: 22 }}>
          どうもありがとうございました
        </p>
        <div style={{ width: 80, height: 3, backgroundColor: LINE, borderRadius: 2 }} />
        <p style={{ marginTop: 22, fontStyle: "italic", fontSize: 13, color: "#6b7280", textAlign: "center" }}>
          We're looking forward to have collaboration with you
        </p>
      </div>

      <ImageFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PENDING: pick report type
═══════════════════════════════════════════════════════════ */
function PendingTypeSelector({ report, reportId }: { report: any; reportId: string }) {
  const [saving, setSaving] = useState(false);
  const clientName = report.inquiry?.companyName || report.inquiry?.customerName || "—";
  const periodeTxt = `${MONTHS_ID[(report.bulan ?? 1) - 1]} ${report.tahun ?? ""}`;

  const pickComplete = async () => {
    setSaving(true);
    try {
      await api.patch(`/erp/pest-reports/${reportId}`, { pagesData: null });
      window.location.reload();
    } catch { showAlert({ title: "Gagal", message: "Gagal memilih jenis laporan.", tone: "danger" }); setSaving(false); }
  };

  const pickSimple = async () => {
    setSaving(true);
    try {
      const r = await api.post("/erp/simple-reports", {
        inquiryId: report.inquiryId, bulan: report.bulan, tahun: report.tahun, segment: report.segment,
      });
      await api.delete(`/erp/pest-reports/${reportId}`);
      window.location.href = `/monthly-report/simple/${r.data.id}`;
    } catch { showAlert({ title: "Gagal", message: "Gagal membuat Simple Report.", tone: "danger" }); setSaving(false); }
  };

  return (
    <div className="p-9" style={{ maxWidth: 560 }}>
      <Link href="/monthly-report" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>← Kembali ke Monthly Report</Link>
      <div style={{ marginTop: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Laporan Belum Dipilih</p>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 4px" }}>{clientName}</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 24px" }}>{periodeTxt} · {report.segment}</p>
        <p style={{ fontSize: 13, color: "#374151", marginBottom: 20 }}>
          Laporan ini dibuat otomatis saat agreement diaktifkan. Pilih jenis laporan untuk melanjutkan:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={pickComplete} disabled={saving}
            style={{ padding: "20px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left", border: `2px solid ${NAVY}`, background: "#eff6ff" }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: NAVY, marginBottom: 6 }}>Complete Report</p>
            <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>Laporan lengkap dengan floor plan, grafik, dan analisa per jenis hama (format presentasi)</p>
          </button>
          <button onClick={pickSimple} disabled={saving}
            style={{ padding: "20px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left", border: "2px solid #d97706", background: "#fffbeb" }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: "#92400e", marginBottom: 6 }}>Simple Report</p>
            <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>Laporan ringkas dengan tabel tangkapan, dokumentasi foto, dan rekomendasi</p>
          </button>
        </div>
        {saving && <p style={{ marginTop: 16, fontSize: 12, color: "#6b7280", textAlign: "center" }}>Memproses...</p>}
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
  const [hamaSections, setHamaSections] = useState<HamaSection[]>([]);
  const [rekData, setRekData] = useState<RekItem[]>([]);
  const [addingHama, setAddingHama] = useState(false);
  const [newHamaName, setNewHamaName] = useState("");
  const [exportingPptx, setExportingPptx] = useState(false);
  const allSlidesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!report) return;
    const pd = report.pagesData;
    if (Array.isArray(pd) && pd.length > 0) {
      if (pd[0]?.id) {
        // New format: HamaSection[]
        setHamaSections(pd.map((h: any) => ({ ...defaultHama(h.name || "Hama"), ...h })));
      } else {
        // Legacy format: PestPageData[] — migrate
        const migrated: HamaSection[] = pd.map((p: any, i: number) => ({
          ...defaultHama(LEGACY_PEST_TYPES[i] || `Hama ${i + 1}`),
          layoutData: p.layoutData || { objects: [] },
          chartData: p.chartData || [{ bulan: "", nilai: 0 }, { bulan: "", nilai: 0 }, { bulan: "", nilai: 0 }],
          analisa: p.analisa || "",
          preventiveAction: p.preventiveAction || "",
          correctiveAction: p.correctiveAction || "",
          rekomendasi: p.rekomendasi || "",
        }));
        setHamaSections(migrated);
      }
    } else {
      setHamaSections([]);
    }
    const rawRek = Array.isArray(report.rekData) ? report.rekData : [];
    setRekData(rawRek.map((r: any) => ({
      ...defaultRek(),
      ...r,
      dokumentasi:        Array.isArray(r.dokumentasi)        ? r.dokumentasi        : (r.dokumentasi        ? [r.dokumentasi]        : []),
      dokumentasiClosing: Array.isArray(r.dokumentasiClosing) ? r.dokumentasiClosing : (r.dokumentasiClosing ? [r.dokumentasiClosing] : []),
    })));
  }, [report]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/erp/pest-reports/${id}`, { pagesData: hamaSections, rekData });
      setEditMode(false);
      setSavedMsg("Tersimpan!");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch { showAlert({ title: "Gagal menyimpan", message: "Gagal menyimpan.", tone: "danger" }); }
    finally { setSaving(false); }
  };

  const addHama = () => {
    const name = newHamaName.trim() || "Rodent Control";
    const newSec = defaultHama(name);
    setHamaSections(prev => {
      const updated = [...prev, newSec];
      // navigate to new hama page: index = 1 + position_in_array (0=cover, 1..N=hama, N+1=rek, N+2=penutup)
      setTimeout(() => setCurrentPage(updated.length), 0);
      return updated;
    });
    setNewHamaName("");
    setAddingHama(false);
  };

  const confirmPageSwitch = async (next: number) => {
    if (editMode) {
      const ok = await showConfirm({
        title: "Simpan perubahan?",
        message: "Ada perubahan yang belum disimpan. Simpan sebelum pindah halaman?",
        confirmLabel: "Simpan & Pindah",
        cancelLabel: "Buang & Pindah",
      });
      if (ok) await save();
      else setEditMode(false);
    }
    setCurrentPage(next);
  };

  const handleSavePptx = async () => {
    setExportingPptx(true);
    try {
      const container = allSlidesRef.current;
      if (!container) return;
      container.style.display = "block";
      await new Promise(r => setTimeout(r, 500));
      const slides = Array.from(container.children) as HTMLElement[];
      const html2canvas = (await import("html2canvas")).default;
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      for (const slide of slides) {
        const canvas = await html2canvas(slide, { scale: 1.5, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const s = pptx.addSlide();
        s.addImage({ data: imgData, x: 0, y: 0, w: "100%", h: "100%" });
      }
      container.style.display = "none";
      await (pptx as any).writeFile({ fileName: downloadName({ doc: "Complete Monthly Report", client: clientName !== "—" ? clientName : null, info: periodeTxt, ext: "pptx" }) });
    } catch {
      showAlert({ title: "Export gagal", message: "Gagal export PowerPoint.", tone: "danger" });
    } finally {
      setExportingPptx(false);
      if (allSlidesRef.current) allSlidesRef.current.style.display = "none";
    }
  };

  const removeHama = async (idx: number) => {
    const ok = await showConfirm({ title: "Hapus Halaman Hama", message: `Hapus "${hamaSections[idx].name}"?`, confirmLabel: "Hapus", tone: "danger" });
    if (!ok) return;
    setHamaSections(prev => prev.filter((_, i) => i !== idx));
    setCurrentPage(0);
    setEditMode(false);
  };

  // page indices: 0=Cover, 1..N=hama, N+1=Rekomendasi, N+2=Penutup
  const totalPages = 1 + hamaSections.length + 2;
  const rekPageIdx = 1 + hamaSections.length;
  const penutupPageIdx = 2 + hamaSections.length;

  const isHamaPage = currentPage >= 1 && currentPage <= hamaSections.length;
  const isRekPage = currentPage === rekPageIdx;
  const canEdit = isHamaPage || isRekPage;

  const pageNames = ["Cover", ...hamaSections.map(h => h.name), "Rekomendasi", "Penutup"];

  const renderSlide = () => {
    if (currentPage === 0) return <CoverSlide report={report} />;
    if (isHamaPage) {
      const idx = currentPage - 1;
      const section = hamaSections[idx];
      return (
        <HamaSlide
          key={section.id}
          section={section}
          editMode={editMode}
          onChange={v => setHamaSections(prev => prev.map((h, i) => i === idx ? v : h))}
        />
      );
    }
    if (isRekPage) return <RekomendasiSlide items={rekData} editMode={editMode} onChange={setRekData} />;
    return <PenutupSlide />;
  };

  if (loading) return <div className="p-9"><Loading /></div>;
  if (!report) return <div className="p-9 text-sm text-gray-500">Laporan tidak ditemukan.</div>;

  const isPending = report.pagesData !== null && typeof report.pagesData === "object" && !Array.isArray(report.pagesData) && (report.pagesData as any)._pending === true;
  if (isPending) return <PendingTypeSelector report={report} reportId={id} />;

  const clientName = report.inquiry?.companyName || report.inquiry?.customerName || "—";
  const periodeTxt = `${MONTHS_ID[(report.bulan ?? 1) - 1]} ${report.tahun ?? ""}`;

  return (
    <div className="h-[calc(100vh-5rem)]" style={{ display: "flex", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 200, borderRight: "1px solid #d9ddeb", background: "#f2f3fd", display: "flex", flexDirection: "column", overflow: "hidden" }} className="print:hidden">
        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #d9ddeb" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6a7180", letterSpacing: ".1em", margin: 0 }}>HALAMAN</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "5px 5px 4px" }}>
          {pageNames.map((name, i) => {
            const isHama = i >= 1 && i <= hamaSections.length;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                <button onClick={() => confirmPageSwitch(i)}
                  style={{ flex: 1, textAlign: "left", padding: "7px 10px", borderRadius: 6, border: "none",
                    background: currentPage === i ? NAVY : "transparent",
                    color: currentPage === i ? "#fff" : "#515866",
                    fontSize: 11, fontWeight: currentPage === i ? 700 : 500, cursor: "pointer" }}>
                  <span style={{ fontWeight: 800, marginRight: 5, opacity: .55 }}>{i + 1}.</span>{name}
                </button>
                {isHama && (
                  <button onClick={() => removeHama(i - 1)}
                    title="Hapus halaman ini"
                    style={{ marginLeft: 2, padding: "4px 6px", border: "none", borderRadius: 4, background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0 }}>
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Add hama */}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #d9ddeb" }}>
            {addingHama ? (
              <div style={{ padding: "4px 6px" }}>
                <input
                  autoFocus
                  value={newHamaName}
                  onChange={e => setNewHamaName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addHama(); if (e.key === "Escape") { setAddingHama(false); setNewHamaName(""); } }}
                  placeholder="Nama hama..."
                  style={{ width: "100%", fontSize: 11, padding: "5px 7px", border: "1px solid #d1d5db", borderRadius: 4, marginBottom: 5 }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={addHama}
                    style={{ flex: 1, fontSize: 11, padding: "4px 0", background: NAVY, color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}>
                    Tambah
                  </button>
                  <button onClick={() => { setAddingHama(false); setNewHamaName(""); }}
                    style={{ fontSize: 11, padding: "4px 8px", background: "#e5e7eb", border: "none", borderRadius: 4, cursor: "pointer" }}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingHama(true)}
                style={{ width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 6, border: `1.5px dashed #c1c6d5`,
                  background: "transparent", color: "#6a7180", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                + Tambah Seksi Hama
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ borderBottom: "1px solid #d9ddeb", padding: "9px 16px", display: "flex", alignItems: "center", gap: 10, background: "#fff", flexShrink: 0 }} className="print:hidden">
          <Link href="/monthly-report" style={{ color: NAVY, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>← Kembali</Link>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 13, color: NAVY, margin: 0 }}>{clientName}</p>
            <p style={{ fontSize: 11, color: "#6a7180", margin: 0 }}>Complete Report — {periodeTxt} · {report.segment}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => confirmPageSwitch(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
              className="btn" style={{ minHeight: 32, padding: "4px 10px", fontSize: 11 }}>← Prev</button>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", minWidth: 74, textAlign: "center" }}>
              Hal {currentPage + 1}/{totalPages}
            </span>
            <button onClick={() => confirmPageSwitch(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}
              className="btn" style={{ minHeight: 32, padding: "4px 10px", fontSize: 11 }}>Next →</button>

            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)} className="btn"
                style={{ minHeight: 32, padding: "4px 12px", fontSize: 11, borderColor: NAVY, color: NAVY }}>
                ✏ Edit
              </button>
            )}
            {editMode && (
              <>
                <button onClick={() => { setEditMode(false); }} className="btn" style={{ minHeight: 32, padding: "4px 10px", fontSize: 11 }}>Batal</button>
                <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: 32, padding: "4px 12px", fontSize: 11 }}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </>
            )}
            {savedMsg && <span style={{ color: "#16713b", fontWeight: 700, fontSize: 11 }}>✓ {savedMsg}</span>}
            <button onClick={() => window.print()} className="btn" style={{ minHeight: 32, padding: "4px 12px", fontSize: 11 }}>Save as PDF</button>
            <button onClick={handleSavePptx} disabled={exportingPptx} className="btn" style={{ minHeight: 32, padding: "4px 12px", fontSize: 11 }}>
              {exportingPptx ? "Exporting..." : "Save as PowerPoint"}
            </button>
          </div>
        </div>

        {/* Slide area */}
        <div style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", display: "flex", justifyContent: "center", padding: "28px 20px" }}
          className="print:p-0 print:bg-white print:block">
          {renderSlide()}
        </div>
      </div>

      {/* Hidden container for PPTX export — renders all slides simultaneously */}
      <div ref={allSlidesRef} style={{ display: "none", position: "fixed", top: 0, left: 0, zIndex: -1, pointerEvents: "none" }}>
        <CoverSlide report={report} />
        {hamaSections.map((section, idx) => (
          <HamaSlide key={section.id} section={section} editMode={false}
            onChange={v => setHamaSections(prev => prev.map((h, i) => i === idx ? v : h))} />
        ))}
        <RekomendasiSlide items={rekData} editMode={false} onChange={() => {}} />
        <PenutupSlide />
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
