"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { fileUrl } from "@/lib/utils";
import type { CanvasData, FloorPlanCanvasHandle } from "@/components/b2b-report/FloorPlanCanvas";

const FloorPlanCanvas = dynamic(() => import("@/components/b2b-report/FloorPlanCanvas"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────
interface PestSection {
  id: string;
  pestType: string;
  title: string;
  findings: string[];
  pestFact: string[];
  canvasData: CanvasData | null;
  useSharedCanvas: boolean;
  photos: { path: string; caption: string; markerNumber: number }[];
}
interface ResumeRow { pestType: string; summary: string; recommendation: string }
interface ReportData {
  clientName: string; clientAddress: string;
  surveyorNames: string; surveyDate: string; generalNotes: string[];
  coverImagePath?: string;
  canvasDataEnv?: CanvasData | null; areaCondition: string; environmentalRisks: string[];
  pestConcernImagePath?: string; canvasDataPest?: CanvasData | null; pestConcern: string; inspectionFocus: string;
  floorPlanCanvasData?: CanvasData | null;
  pestSections: PestSection[]; resumeRows: ResumeRow[];
  status: string;
}

// ─── Slide Layout: tiap halaman pakai ini (kecuali Cover & ThankYou) ──────────
function SlidePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow border border-[#d1d5db] print-page flex flex-col">
      {/* Header row: judul kiri + logo kanan */}
      <div className="flex items-start justify-between px-8 pt-5 pb-2" style={{ flexShrink: 0 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, fontStyle: "italic", color: "#111" }}>
          {title}
        </h1>
        <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: 56, objectFit: "contain", flexShrink: 0 }} />
      </div>
      {/* Garis biru */}
      <div style={{ margin: "0 32px 12px", borderBottom: "2px solid #1a4d8c", flexShrink: 0 }} />
      {/* Konten */}
      <div className="px-8 pb-4" style={{ flex: 1 }}>{children}</div>
      {/* Footer */}
      <img src="/refrence/Footer.png" alt="Footer" style={{ width: "100%", display: "block", flexShrink: 0, marginTop: 8 }} />
    </div>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
function CoverPage({ bgPath, children }: { bgPath?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow border border-[#d1d5db] print-page flex flex-col overflow-hidden" style={{ position: "relative" }}>
      {bgPath && (
        <img src={fileUrl(bgPath)} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, pointerEvents: "none", zIndex: 0 }} />
      )}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Logo kanan atas */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "24px 32px 0" }}>
          <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: 60, objectFit: "contain" }} />
        </div>
        <div style={{ margin: "8px 32px 0", borderBottom: "1px solid #1a4d8c" }} />
        <div style={{ flex: 1, padding: "0 32px" }}>{children}</div>
      </div>
      <img src="/refrence/Footer.png" alt="Footer" style={{ width: "100%", display: "block", position: "relative", zIndex: 1 }} />
    </div>
  );
}

// ─── Thank You Page ───────────────────────────────────────────────────────────
function ThankYouPage() {
  return (
    <div className="bg-white rounded-xl shadow border border-[#d1d5db] print-page flex flex-col overflow-hidden" style={{ minHeight: 520 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "24px 32px 8px" }}>
        <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: 60, objectFit: "contain" }} />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 32px 32px", gap: 32 }}>
        {/* Diagonal strips */}
        <div style={{ flex: 1, display: "flex", gap: 10, transform: "skewX(-12deg)", overflow: "hidden", height: 300 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, overflow: "hidden", borderRadius: 4 }}>
              <img src="/refrence/Footer.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "skewX(12deg) scale(1.4)" }} />
            </div>
          ))}
        </div>
        {/* Navy box */}
        <div style={{ flex: 1, backgroundColor: "#2c3e5c", color: "white", padding: "48px 40px", borderRadius: 4, textAlign: "center" }}>
          <p style={{ fontSize: 42, fontWeight: 600, marginBottom: 12 }}>Thank you</p>
          <p style={{ fontSize: 20 }}>どうもありがとうございました</p>
        </div>
      </div>
    </div>
  );
}

// ─── Bullet Editor ────────────────────────────────────────────────────────────
function BulletEditor({ items, onChange, placeholder = "Tambah poin..." }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const add = () => onChange([...items, ""]);
  const upd = (i: number, v: string) => { const a = [...items]; a[i] = v; onChange(a); };
  const del = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 text-[#1a4d8c] font-bold text-sm">•</span>
          <input value={item} onChange={e => upd(i, e.target.value)} placeholder={placeholder}
            className="flex-1 rounded border border-[#d1d5db] px-2 py-1.5 text-sm focus:border-[#1a4d8c] focus:outline-none" />
          <button onClick={() => del(i)} className="mt-1.5 text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      ))}
      <button onClick={add} className="mt-1 text-xs text-[#1a4d8c] hover:underline text-left">+ Tambah poin</button>
    </div>
  );
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function ImageUpload({ surveyId, value, onChange, label, endpoint = "b2b-report" }: {
  surveyId: string; value?: string; onChange: (path: string) => void; label: string; endpoint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await api.post(`/${endpoint}/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.data.path);
    } finally { setUploading(false); }
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="cursor-pointer rounded-lg border-2 border-dashed border-[#d1d5db] p-3 text-center hover:border-[#1a4d8c] transition-colors">
        {uploading ? <span className="text-xs text-[#6b7280]">Mengupload...</span> :
          value ? <img src={fileUrl(value)} alt={label} className="max-h-36 mx-auto object-contain rounded" /> :
            <div className="py-3"><p className="text-xs text-[#6b7280]">📷 {label}</p><p className="text-[10px] text-[#9ca3af]">Klik untuk upload</p></div>
        }
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {value && <button onClick={() => onChange("")} className="text-[10px] text-red-400 hover:underline">Hapus gambar</button>}
    </div>
  );
}

// ─── Pest Icons Grid (untuk halaman Environment Fact 2) ───────────────────────
const PEST_ICONS: { name: string; emoji: string }[] = [
  { name: "Tikus", emoji: "🐀" }, { name: "Kecoa", emoji: "🪳" }, { name: "Semut", emoji: "🐜" },
  { name: "Rayap", emoji: "🐛" }, { name: "Lalat", emoji: "🦟" }, { name: "Kucing", emoji: "🐱" },
  { name: "Musang", emoji: "🦝" }, { name: "Kelelawar", emoji: "🦇" }, { name: "Burung", emoji: "🐦" },
  { name: "Cicak", emoji: "🦎" }, { name: "Tawon/Lebah", emoji: "🐝" }, { name: "Kutu (SPI)", emoji: "🪲" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function B2BReportBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const router = useRouter();
  const [activePage, setActivePage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [surveyInfo, setSurveyInfo] = useState<any>(null);

  const defaultData: ReportData = {
    clientName: "", clientAddress: "",
    surveyorNames: "", surveyDate: "", generalNotes: [],
    areaCondition: "", environmentalRisks: [],
    pestConcern: "", inspectionFocus: "",
    pestSections: [], resumeRows: [],
    status: "draft",
  };
  const [data, setData] = useState<ReportData>(defaultData);

  const floorPlanRef = useRef<FloorPlanCanvasHandle>(null);
  const envCanvasRef = useRef<FloorPlanCanvasHandle>(null);
  const pestCanvasRef = useRef<FloorPlanCanvasHandle>(null);
  const sectionCanvasRefs = useRef<Record<string, FloorPlanCanvasHandle>>({});

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/b2b-report/${surveyId}`).then(res => {
      setSurveyInfo(res.data.survey);
      if (res.data.data) {
        const d = res.data.data;
        setData({
          clientName: d.clientName || "", clientAddress: d.clientAddress || "",
          surveyorNames: d.surveyorNames || "", surveyDate: d.surveyDate || "",
          generalNotes: Array.isArray(d.generalNotes) ? d.generalNotes : [],
          coverImagePath: d.coverImagePath,
          canvasDataEnv: d.canvasDataEnv,
          areaCondition: d.areaCondition || "",
          environmentalRisks: Array.isArray(d.environmentalRisks) ? d.environmentalRisks : [],
          pestConcernImagePath: d.pestConcernImagePath, canvasDataPest: d.canvasDataPest,
          pestConcern: d.pestConcern || "", inspectionFocus: d.inspectionFocus || "",
          floorPlanCanvasData: d.floorPlanCanvasData,
          pestSections: Array.isArray(d.pestSections) ? d.pestSections : [],
          resumeRows: Array.isArray(d.resumeRows) ? d.resumeRows : [],
          status: d.status || "draft",
        });
      } else if (res.data.survey) {
        const sv = res.data.survey;
        const names = sv.picAssignments?.length
          ? sv.picAssignments.map((a: any) => a.pic.name).join(", ")
          : sv.pic?.name || "";
        const client = sv.customer?.company || sv.customer?.name || "";
        const addr = sv.customer?.treatmentAddress || sv.customer?.address || "";
        const dateStr = sv.scheduledAt
          ? new Date(sv.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
          : "";
        setData(prev => ({ ...prev, clientName: client, clientAddress: addr, surveyorNames: names, surveyDate: dateStr }));
      }
    }).catch(() => {});
  }, [surveyId]);

  const set = (patch: Partial<ReportData>) => setData(prev => ({ ...prev, ...patch }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await api.post(`/b2b-report/${surveyId}`, data);
      setSaveMsg("Tersimpan ✓");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch { setSaveMsg("Gagal simpan"); }
    finally { setSaving(false); }
  };

  // ── Add pest section ──────────────────────────────────────────────────────
  const addPestSection = (pestType: string) => {
    const newSection: PestSection = {
      id: Math.random().toString(36).slice(2),
      pestType, title: pestType,
      findings: [""], pestFact: [],
      canvasData: null, useSharedCanvas: true,
      photos: [],
    };
    set({ pestSections: [...data.pestSections, newSection] });
    setActivePage(6 + data.pestSections.length);
  };

  const updateSection = (id: string, patch: Partial<PestSection>) => {
    set({ pestSections: data.pestSections.map(s => s.id === id ? { ...s, ...patch } : s) });
  };
  const removeSection = (id: string) => {
    set({ pestSections: data.pestSections.filter(s => s.id !== id) });
  };

  // ── Auto-generate resume ──────────────────────────────────────────────────
  const generateResume = () => {
    const rows: ResumeRow[] = data.pestSections.map(sec => {
      const findings = sec.findings.filter(Boolean);
      const summary = findings.length
        ? findings.map(f => f.endsWith(".") ? f : f + ".").join(" ")
        : `Ditemukan aktivitas ${sec.pestType} selama survei.`;
      const existing = data.resumeRows.find(r => r.pestType === sec.pestType);
      return { pestType: sec.pestType, summary, recommendation: existing?.recommendation || "" };
    });
    set({ resumeRows: rows });
  };

  // ── Upload helper for section photos ──────────────────────────────────────
  const uploadSectionPhoto = async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await api.post(`/b2b-report/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data.data.path as string;
  };

  // ── Print current page ─────────────────────────────────────────────────────
  const printCurrentPage = () => window.print();

  // ── Export PDF (all pages, one by one) ────────────────────────────────────
  const exportPdf = async () => {
    if (typeof window === "undefined") return;
    setExportingPdf(true);
    const prevPage = activePage;
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const totalPages = 7 + data.pestSections.length;

      for (let p = 1; p <= totalPages; p++) {
        setActivePage(p);
        // Wait for React render + canvas render
        await new Promise(resolve => setTimeout(resolve, 350));
        const pageEl = document.querySelector<HTMLElement>(".print-page");
        if (!pageEl) continue;
        const c = await html2canvas(pageEl, {
          scale: 2, useCORS: true, logging: false,
          windowWidth: 920, backgroundColor: "#ffffff",
        });
        const imgData = c.toDataURL("image/jpeg", 0.93);
        if (p > 1) pdf.addPage();
        // Fit to A4 maintaining aspect ratio
        const ratio = Math.min(pdfW / (c.width / 2), pdfH / (c.height / 2));
        const imgW = (c.width / 2) * ratio;
        const imgH = (c.height / 2) * ratio;
        pdf.addImage(imgData, "JPEG", (pdfW - imgW) / 2, (pdfH - imgH) / 2, imgW, imgH);
      }
      pdf.save(`report-b2b-${surveyId}.pdf`);
    } finally {
      setActivePage(prevPage);
      setExportingPdf(false);
    }
  };

  // ── Pages nav ─────────────────────────────────────────────────────────────
  const pages = [
    { num: 1, label: "Cover" },
    { num: 2, label: "Info Survey" },
    { num: 3, label: "Environment Fact (1)" },
    { num: 4, label: "Environment Fact (2)" },
    { num: 5, label: "Risk Mapping" },
    ...data.pestSections.map((s, i) => ({ num: 6 + i, label: s.title || s.pestType })),
    { num: 6 + data.pestSections.length, label: "Resume" },
    { num: 7 + data.pestSections.length, label: "Thank You" },
  ];

  const PEST_TYPES = ["Rodent/Tikus", "Termite/Rayap", "Kecoa", "Lalat", "Semut", "Kucing", "Musang", "Kelelawar", "Burung", "Cicak", "Tawon/Lebah", "Kutu SPI"];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="sticky top-16 z-30 flex items-center justify-between border-b border-[#d9ddeb] bg-white px-6 py-3 md:top-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/surveys")} className="text-xs text-[#6b7280] hover:text-[#1a4d8c]">← Kembali</button>
          <span className="text-sm font-bold text-[#1a4d8c]">Report B2B Survey</span>
          {surveyInfo && <span className="text-xs text-[#6b7280]">— {surveyInfo.customer?.company || surveyInfo.customer?.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className="text-xs text-green-600">{saveMsg}</span>}
          <button onClick={save} disabled={saving}
            className="rounded-lg bg-[#1a4d8c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#163d70] disabled:opacity-50">
            {saving ? "Menyimpan..." : "💾 Simpan"}
          </button>
          <button onClick={printCurrentPage}
            className="rounded-lg border border-[#6b7280] px-4 py-2 text-xs font-semibold text-[#6b7280] hover:bg-[#f3f4f6]">
            🖨 Print Halaman Ini
          </button>
          <button onClick={exportPdf} disabled={exportingPdf}
            className="rounded-lg border border-[#1a4d8c] px-4 py-2 text-xs font-semibold text-[#1a4d8c] hover:bg-[#f0f5ff] disabled:opacity-50">
            {exportingPdf ? "⏳ Mengekspor..." : "📄 Export PDF Semua"}
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar nav */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-[#d9ddeb] bg-[#f9fafb] py-4 md:flex">
          <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-2">Halaman</p>
          {pages.map(p => (
            <button key={p.num} onClick={() => setActivePage(p.num)}
              className={`px-4 py-2 text-left text-xs transition-colors ${activePage === p.num ? "bg-[#e8f0fe] font-semibold text-[#1a4d8c]" : "text-[#374151] hover:bg-[#f3f4f6]"}`}>
              <span className="mr-2 inline-block w-5 text-center opacity-50">{p.num}</span>{p.label}
            </button>
          ))}
          <div className="mt-4 border-t border-[#e5e7eb] pt-4 px-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-2">Tambah Seksi Hama</p>
            {PEST_TYPES.map(pt => (
              <button key={pt} onClick={() => addPestSection(pt)}
                className="mb-1 w-full rounded border border-[#d1d5db] bg-white px-2 py-1 text-left text-[10px] text-[#374151] hover:border-[#1a4d8c] hover:text-[#1a4d8c]">
                + {pt}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-[#f5f7fc]">
          <div className="mx-auto max-w-4xl flex flex-col gap-6">

            {/* ── Page 1: Cover ────────────────────────────────────────────── */}
            {activePage === 1 && (
              <CoverPage bgPath={data.coverImagePath}>
                {/* Form input (tidak terlihat di PDF export) */}
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                  {/* Upload background bangunan */}
                  <div className="w-full max-w-xs">
                    <p className="text-[10px] font-bold uppercase text-[#9ca3af] text-center mb-1">Foto Background Bangunan (opsional)</p>
                    <ImageUpload surveyId={surveyId} value={data.coverImagePath} onChange={v => set({ coverImagePath: v })} label="Upload foto bangunan klien" />
                  </div>

                  {/* Tampilan seperti referensi */}
                  <div className="text-center mt-4 flex flex-col items-center gap-3 w-full max-w-lg">
                    <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: 1, color: "#111" }}>PEST CONTROL REPORT</h1>
                    <div style={{ width: 80, height: 4, backgroundColor: "#1a4d8c", borderRadius: 2 }} />
                    <p style={{ fontStyle: "italic", color: "#555", fontSize: 16 }}>for</p>

                    <input value={data.clientName} onChange={e => set({ clientName: e.target.value })}
                      placeholder="Nama Perusahaan / Klien"
                      style={{ width: "100%", textAlign: "center", fontSize: 22, fontWeight: 700, color: "#111",
                        border: "1px dashed #d1d5db", borderRadius: 6, padding: "6px 12px", background: "transparent" }} />

                    <textarea value={data.clientAddress} onChange={e => set({ clientAddress: e.target.value })}
                      rows={2} placeholder="Alamat lengkap klien"
                      style={{ width: "100%", textAlign: "center", fontSize: 14, color: "#555",
                        border: "1px dashed #d1d5db", borderRadius: 6, padding: "6px 12px", resize: "none", background: "transparent" }} />
                  </div>
                </div>
              </CoverPage>
            )}

            {/* ── Page 2: Info Survey (Halaman 0) ─────────────────────────── */}
            {activePage === 2 && (
              <CoverPage bgPath={data.coverImagePath}>
                <div className="flex flex-col items-center text-center py-4 gap-4">
                  <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: 1, color: "#111" }}>PEST CONTROL REPORT</h1>
                  <div style={{ width: 80, height: 3, backgroundColor: "#1a4d8c", borderRadius: 2 }} />

                  <div className="w-full max-w-lg flex flex-col gap-3 text-left mt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#111] whitespace-nowrap" style={{ textDecoration: "underline" }}>Surveyor</span>
                      <span className="text-sm text-[#374151]">:</span>
                      <input value={data.surveyorNames} onChange={e => set({ surveyorNames: e.target.value })}
                        placeholder="Nama surveyor..."
                        className="flex-1 rounded border border-[#d1d5db] px-2 py-1.5 text-sm focus:border-[#1a4d8c] focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#111] whitespace-nowrap" style={{ textDecoration: "underline" }}>Tanggal Survey</span>
                      <span className="text-sm text-[#374151]">:</span>
                      <input value={data.surveyDate} onChange={e => set({ surveyDate: e.target.value })}
                        placeholder="29 Mei 2026"
                        className="flex-1 rounded border border-[#d1d5db] px-2 py-1.5 text-sm focus:border-[#1a4d8c] focus:outline-none" />
                    </div>

                    <div className="mt-2">
                      <p className="text-sm font-bold text-[#111] mb-2">General Notes :</p>
                      <BulletEditor items={data.generalNotes} onChange={v => set({ generalNotes: v })} placeholder="Catatan temuan..." />
                    </div>
                  </div>

                  {/* Preview */}
                  {data.generalNotes.filter(Boolean).length > 0 && (
                    <div className="mt-2 w-full max-w-lg text-left text-sm">
                      <ol className="list-decimal ml-5 space-y-1 text-[#374151]">
                        {data.generalNotes.filter(Boolean).map((n, i) => <li key={i}>{n}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              </CoverPage>
            )}

            {/* ── Page 3: Environment Fact (1) ─────────────────────────────── */}
            {activePage === 3 && (
              <SlidePage title="Environment Fact">
                <div className="grid grid-cols-2 gap-5">
                  {/* Kiri: canvas denah/peta (upload gambar di dalam canvas) */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold text-[#9ca3af] uppercase">
                      Denah / Foto Area — upload gambar di toolbar canvas untuk menempatkan foto peta atau tampak bangunan
                    </p>
                    <FloorPlanCanvas
                      ref={envCanvasRef}
                      initialData={data.canvasDataEnv ?? undefined}
                      onChange={d => set({ canvasDataEnv: d })}
                      width={420} height={320}
                    />
                  </div>
                  {/* Kanan: teks */}
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#111] mb-1">Kondisi Area :</p>
                      <textarea value={data.areaCondition} onChange={e => set({ areaCondition: e.target.value })}
                        rows={7} placeholder="Deskripsikan kondisi area site..."
                        className="w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#111] mb-1">Key Environmental Risk:</p>
                      <BulletEditor items={data.environmentalRisks} onChange={v => set({ environmentalRisks: v })} placeholder="Faktor risiko lingkungan..." />
                    </div>
                  </div>
                </div>
              </SlidePage>
            )}

            {/* ── Page 4: Environment Fact (2) ─────────────────────────────── */}
            {activePage === 4 && (
              <SlidePage title="Environment Fact">
                <div className="grid grid-cols-2 gap-6">
                  {/* Kiri: foto + canvas dengan pest icons */}
                  <div className="flex flex-col gap-3">
                    <ImageUpload surveyId={surveyId} value={data.pestConcernImagePath} onChange={v => set({ pestConcernImagePath: v })} label="Foto Area / Peta dengan Lokasi Hama" />
                    <FloorPlanCanvas
                      ref={pestCanvasRef}
                      initialData={data.canvasDataPest ?? undefined}
                      onChange={d => set({ canvasDataPest: d })}
                      width={340} height={260}
                    />
                  </div>
                  {/* Kanan: pest concern + inspection focus + pest icons */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#111] mb-1">Pest Concern:</p>
                      <textarea value={data.pestConcern} onChange={e => set({ pestConcern: e.target.value })}
                        rows={3} placeholder="Jenis hama yang menjadi concern..."
                        className="w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#111] mb-1">Inspection Focus:</p>
                      <textarea value={data.inspectionFocus} onChange={e => set({ inspectionFocus: e.target.value })}
                        rows={3} placeholder="Area dan titik fokus inspeksi..."
                        className="w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                    {/* Pest icons grid */}
                    <div className="grid grid-cols-6 gap-1 mt-1">
                      {PEST_ICONS.map(p => (
                        <div key={p.name} className="flex flex-col items-center gap-0.5">
                          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #1a4d8c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                            {p.emoji}
                          </div>
                          <span style={{ fontSize: 8, textAlign: "center", color: "#374151", lineHeight: 1.2 }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SlidePage>
            )}

            {/* ── Page 5: Pest Risk Mapping ─────────────────────────────────── */}
            {activePage === 5 && (
              <SlidePage title="Pest Risk Mapping">
                <div className="grid grid-cols-3 gap-4">
                  {/* Kiri: canvas denah (2/3 lebar) — risk markers aktif di halaman ini */}
                  <div className="col-span-2">
                    <FloorPlanCanvas
                      ref={floorPlanRef}
                      initialData={data.floorPlanCanvasData ?? undefined}
                      onChange={d => set({ floorPlanCanvasData: d })}
                      width={500} height={320}
                      showRiskMarkers={true}
                    />
                  </div>
                  {/* Kanan: legend table */}
                  <div className="col-span-1">
                    <div className="overflow-hidden rounded-lg border border-[#d1d5db]">
                      <table className="w-full text-xs">
                        <thead className="bg-[#1a4d8c] text-white">
                          <tr>
                            {["Marker", "Level", "Description", "Action"].map(h => (
                              <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { color: "#ef4444", level: "High Risk", desc: "Active pest evidence / critical condition", action: "Immediate action" },
                            { color: "#eab308", level: "Medium Risk", desc: "Potential pest risk / supporting condition found", action: "Corrective action" },
                            { color: "#22c55e", level: "Low Risk", desc: "Controlled condition / routine monitoring required", action: "Monitoring" },
                          ].map(r => (
                            <tr key={r.level} className="border-t border-[#e5e7eb]">
                              <td className="px-2 py-2"><span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: r.color }} /></td>
                              <td className="px-2 py-2 font-semibold text-[10px]" style={{ color: r.color }}>{r.level}</td>
                              <td className="px-2 py-2 text-[#374151] text-[10px]">{r.desc}</td>
                              <td className="px-2 py-2 text-[#374151] text-[10px]">{r.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-[#9ca3af] mt-3">Upload gambar denah sebagai background, lalu tempatkan marker risiko (🔴🟡🟢) dan ikon hama di atas denah.</p>
                  </div>
                </div>
              </SlidePage>
            )}

            {/* ── Pages 6+: Pest Sections ──────────────────────────────────── */}
            {data.pestSections.map((sec, idx) => {
              const pageNum = 6 + idx;
              if (activePage !== pageNum) return null;
              return (
                <SlidePage key={sec.id} title={sec.title || sec.pestType}>
                  {/* Edit title + hapus */}
                  <div className="flex items-center gap-2 mb-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-2">
                    <label className="text-[10px] text-[#9ca3af]">Judul seksi:</label>
                    <input value={sec.title} onChange={e => updateSection(sec.id, { title: e.target.value })}
                      placeholder="Judul seksi..."
                      className="flex-1 rounded border border-[#d1d5db] px-2 py-1 text-sm focus:border-[#1a4d8c] focus:outline-none" />
                    <button onClick={() => { removeSection(sec.id); setActivePage(5); }}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50">Hapus</button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Kiri: canvas denah dengan panah */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <input type="checkbox" id={`shared-${sec.id}`} checked={sec.useSharedCanvas}
                          onChange={e => updateSection(sec.id, { useSharedCanvas: e.target.checked })} />
                        <label htmlFor={`shared-${sec.id}`} className="text-[10px] text-[#6b7280]">Gunakan denah dari halaman Risk Mapping</label>
                      </div>
                      {sec.useSharedCanvas ? (
                        <FloorPlanCanvas
                          initialData={data.floorPlanCanvasData ?? undefined}
                          onChange={d => updateSection(sec.id, { canvasData: d })}
                          width={360} height={280}
                        />
                      ) : (
                        <FloorPlanCanvas
                          ref={el => { if (el) sectionCanvasRefs.current[sec.id] = el; }}
                          initialData={sec.canvasData ?? undefined}
                          onChange={d => updateSection(sec.id, { canvasData: d })}
                          width={360} height={280}
                        />
                      )}
                    </div>

                    {/* Kanan: Hasil Survey (numbered list, bold item aktif) + foto */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#111] mb-2">Hasil Survey :</p>
                        <div className="flex flex-col gap-1.5">
                          {sec.findings.map((item, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="mt-2 text-[#111] font-bold text-sm min-w-[20px]">{i + 1}.</span>
                              <input value={item} onChange={e => {
                                const f = [...sec.findings]; f[i] = e.target.value;
                                updateSection(sec.id, { findings: f });
                              }} placeholder="Temuan survei..."
                                className="flex-1 rounded border border-[#d1d5db] px-2 py-1.5 text-sm focus:border-[#1a4d8c] focus:outline-none" />
                              <button onClick={() => updateSection(sec.id, { findings: sec.findings.filter((_, j) => j !== i) })}
                                className="mt-1.5 text-red-400 hover:text-red-600 text-xs">✕</button>
                            </div>
                          ))}
                          <button onClick={() => updateSection(sec.id, { findings: [...sec.findings, ""] })}
                            className="mt-1 text-xs text-[#1a4d8c] hover:underline text-left">+ Tambah temuan</button>
                        </div>
                      </div>

                      {/* Foto */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase text-[#9ca3af]">Foto Dokumentasi</p>
                          <label className="cursor-pointer rounded border border-[#1a4d8c] px-2 py-1 text-[10px] font-medium text-[#1a4d8c] hover:bg-[#f0f5ff]">
                            + Upload Foto
                            <input type="file" accept="image/*" multiple className="hidden"
                              onChange={async e => {
                                const files = Array.from(e.target.files || []);
                                const nextNum = (sec.photos.length > 0 ? Math.max(...sec.photos.map(p => p.markerNumber)) : 0) + 1;
                                const uploaded = await Promise.all(files.map(async (f, fi) => {
                                  const path = await uploadSectionPhoto(f);
                                  return { path, caption: "", markerNumber: nextNum + fi };
                                }));
                                updateSection(sec.id, { photos: [...sec.photos, ...uploaded] });
                              }} />
                          </label>
                        </div>
                        {sec.photos.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {sec.photos.map((photo, pi) => (
                              <div key={pi} className="rounded-lg border border-[#e5e7eb] overflow-hidden">
                                <div className="relative">
                                  <img src={fileUrl(photo.path)} alt="" className="w-full h-24 object-cover" />
                                  <span className="absolute top-1 left-1 bg-[#1a4d8c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{photo.markerNumber}</span>
                                  <button onClick={() => updateSection(sec.id, { photos: sec.photos.filter((_, j) => j !== pi) })}
                                    className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">✕</button>
                                </div>
                                <input value={photo.caption} onChange={e => {
                                  const ph = [...sec.photos]; ph[pi] = { ...ph[pi], caption: e.target.value };
                                  updateSection(sec.id, { photos: ph });
                                }} placeholder="Keterangan foto..." className="w-full border-t border-[#e5e7eb] px-2 py-1 text-[10px] focus:outline-none" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border-2 border-dashed border-[#e5e7eb] py-4 text-center text-[10px] text-[#9ca3af]">
                            Belum ada foto dokumentasi
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SlidePage>
              );
            })}

            {/* ── Resume ─────────────────────────────────────────────────────── */}
            {activePage === 6 + data.pestSections.length && (
              <SlidePage title="Resume">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#6b7280]">Tabel ringkasan temuan dan rekomendasi</p>
                  <button onClick={generateResume}
                    className="rounded-lg border border-[#1a4d8c] px-4 py-1.5 text-xs font-semibold text-[#1a4d8c] hover:bg-[#f0f5ff]">
                    ✨ Auto-generate dari temuan
                  </button>
                </div>

                {data.resumeRows.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-[#e5e7eb] py-8 text-center text-sm text-[#9ca3af]">
                    Klik "Auto-generate" untuk mengisi otomatis dari seksi hama, atau tambah baris manual.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#d1d5db]">
                    <table className="w-full text-sm">
                      <thead style={{ backgroundColor: "#1a4d8c", color: "white" }}>
                        <tr>
                          {["No", "Hama", "Resume", "Rekomendasi"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.resumeRows.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #e5e7eb", backgroundColor: i % 2 === 0 ? "#f0f4f8" : "white" }}>
                            <td className="px-4 py-3 font-semibold text-[#1a4d8c]">{i + 1}</td>
                            <td className="px-4 py-3 font-semibold">{row.pestType}</td>
                            <td className="px-4 py-3">
                              <textarea value={row.summary} onChange={e => {
                                const rows = [...data.resumeRows]; rows[i] = { ...rows[i], summary: e.target.value };
                                set({ resumeRows: rows });
                              }} rows={4} className="w-full rounded border border-[#e5e7eb] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none resize-none bg-transparent" />
                            </td>
                            <td className="px-4 py-3">
                              <textarea value={row.recommendation} onChange={e => {
                                const rows = [...data.resumeRows]; rows[i] = { ...rows[i], recommendation: e.target.value };
                                set({ resumeRows: rows });
                              }} rows={4} placeholder="Isi rekomendasi..." className="w-full rounded border border-[#e5e7eb] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none resize-none" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <button onClick={() => set({ resumeRows: [...data.resumeRows, { pestType: "", summary: "", recommendation: "" }] })}
                    className="text-xs text-[#1a4d8c] hover:underline">+ Tambah baris manual</button>
                </div>
              </SlidePage>
            )}

            {/* ── Thank You ─────────────────────────────────────────────────── */}
            {activePage === 7 + data.pestSections.length && <ThankYouPage />}

            {/* Navigation */}
            <div className="flex justify-between">
              <button disabled={activePage === 1} onClick={() => setActivePage(p => p - 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">← Sebelumnya</button>
              <button disabled={activePage === pages[pages.length - 1].num} onClick={() => setActivePage(p => p + 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">Selanjutnya →</button>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @media print {
          /* Sembunyikan semua UI kecuali slide */
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .fpc-toolbar { display: none !important; }
          .print-page {
            position: fixed !important;
            top: 0; left: 0;
            width: 297mm !important;
            max-width: 297mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
