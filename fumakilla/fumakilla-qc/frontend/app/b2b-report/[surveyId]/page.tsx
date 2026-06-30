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
  id: string; pestType: string; title: string;
  findings: string[]; pestFact: string[];
  canvasData: CanvasData | null; useSharedCanvas: boolean;
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

// ─── CoverPage ────────────────────────────────────────────────────────────────
function CoverPage({ bgPath, children }: { bgPath?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow border border-[#d1d5db] print-page flex flex-col"
         style={{ position: "relative", aspectRatio: "297/210", overflow: "hidden" }}>
      {bgPath && (
        <img src={fileUrl(bgPath)} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.22, pointerEvents: "none", zIndex: 0 }} />
      )}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 32px 0", flexShrink: 0 }}>
          <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: 46, objectFit: "contain", mixBlendMode: "multiply" }} />
        </div>
        <div style={{ margin: "4px 32px 0", borderBottom: "1px solid #1a4d8c", flexShrink: 0 }} />
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>{children}</div>
      </div>
      <img src="/refrence/Footer.png" alt="Footer"
        style={{ width: "100%", display: "block", flexShrink: 0, position: "relative", zIndex: 1 }} />
    </div>
  );
}

// ─── SlidePage ────────────────────────────────────────────────────────────────
function SlidePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow border border-[#d1d5db] print-page flex flex-col"
         style={{ aspectRatio: "297/210", overflow: "hidden" }}>
      <div className="flex items-start justify-between px-6 pt-2 pb-1" style={{ flexShrink: 0 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, fontStyle: "italic", color: "#111" }}>
          {title}
        </h1>
        <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: 40, objectFit: "contain", flexShrink: 0, mixBlendMode: "multiply" }} />
      </div>
      <div style={{ margin: "0 24px 6px", borderBottom: "2px solid #1a4d8c", flexShrink: 0 }} />
      <div className="px-5 pb-1" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
      <img src="/refrence/Footer.png" alt="Footer" style={{ width: "100%", display: "block", flexShrink: 0 }} />
    </div>
  );
}

// ─── ThankYouPage ─────────────────────────────────────────────────────────────
function ThankYouPage() {
  return (
    <div className="bg-white rounded-xl shadow border border-[#d1d5db] print-page flex flex-col"
         style={{ aspectRatio: "297/210", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 32px 4px", flexShrink: 0 }}>
        <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: 44, objectFit: "contain", mixBlendMode: "multiply" }} />
      </div>
      <div style={{ margin: "0 24px 6px", borderBottom: "2px solid #1a4d8c", flexShrink: 0 }} />

      {/* Center content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 40px" }}>
        <p style={{ fontSize: 52, fontWeight: 700, color: "#1a4d8c", marginBottom: 12, textAlign: "center", letterSpacing: 2 }}>
          Thank you
        </p>
        <p style={{ fontSize: 22, color: "#374151", textAlign: "center", marginBottom: 24 }}>
          どうもありがとうございました
        </p>
        <div style={{ width: 80, height: 3, backgroundColor: "#1a4d8c", borderRadius: 2 }} />
      </div>

      {/* Footer */}
      <img src="/refrence/Footer.png" alt="Footer" style={{ width: "100%", display: "block", flexShrink: 0 }} />
    </div>
  );
}

// ─── BulletEditor ─────────────────────────────────────────────────────────────
function BulletEditor({ items, onChange, placeholder = "Tambah poin..." }: {
  items: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const add = () => onChange([...items, ""]);
  const upd = (i: number, v: string) => { const a = [...items]; a[i] = v; onChange(a); };
  const del = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5 print-bullet-row">
          <span className="mt-1.5 text-[#1a4d8c] font-bold text-xs flex-shrink-0">•</span>
          <input value={item} onChange={e => upd(i, e.target.value)} placeholder={placeholder}
            className="flex-1 rounded border border-[#d1d5db] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none" />
          <button onClick={() => del(i)} className="no-print mt-1 text-red-400 hover:text-red-600 text-[10px] flex-shrink-0">✕</button>
        </div>
      ))}
      <button onClick={add} className="no-print mt-0.5 text-[10px] text-[#1a4d8c] hover:underline text-left">+ Tambah poin</button>
    </div>
  );
}

// ─── ImageUpload ──────────────────────────────────────────────────────────────
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
    <div className="flex flex-col gap-1.5">
      <label className="cursor-pointer rounded-lg border-2 border-dashed border-[#d1d5db] p-3 text-center hover:border-[#1a4d8c] transition-colors">
        {uploading ? <span className="text-xs text-[#6b7280]">Mengupload...</span> :
          value
            ? <img src={fileUrl(value)} alt={label} className="max-h-28 mx-auto object-contain rounded" />
            : <div className="py-2"><p className="text-xs text-[#6b7280]">📷 {label}</p><p className="text-[10px] text-[#9ca3af]">Klik untuk upload</p></div>
        }
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {value && <button onClick={() => onChange("")} className="text-[10px] text-red-400 hover:underline">Hapus gambar</button>}
    </div>
  );
}

// ─── Pest Icons Grid ──────────────────────────────────────────────────────────
const PEST_ICONS: { name: string; emoji: string }[] = [
  { name: "Tikus", emoji: "🐀" }, { name: "Kecoa", emoji: "🪳" }, { name: "Semut", emoji: "🐜" },
  { name: "Rayap", emoji: "🪲" }, { name: "Lalat", emoji: "🪰" }, { name: "Kucing", emoji: "🐱" },
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
    pestSections: [], resumeRows: [], status: "draft",
  };
  const [data, setData] = useState<ReportData>(defaultData);

  const floorPlanRef = useRef<FloorPlanCanvasHandle>(null);
  const envCanvasRef = useRef<FloorPlanCanvasHandle>(null);
  const pestCanvasRef = useRef<FloorPlanCanvasHandle>(null);
  const sectionCanvasRefs = useRef<Record<string, FloorPlanCanvasHandle>>({});

  useEffect(() => {
    api.get(`/b2b-report/${surveyId}`).then(res => {
      setSurveyInfo(res.data.survey);
      if (res.data.data) {
        const d = res.data.data;
        setData({
          clientName: d.clientName || "", clientAddress: d.clientAddress || "",
          surveyorNames: d.surveyorNames || "", surveyDate: d.surveyDate || "",
          generalNotes: Array.isArray(d.generalNotes) ? d.generalNotes : [],
          coverImagePath: d.coverImagePath, canvasDataEnv: d.canvasDataEnv,
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

  const save = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await api.post(`/b2b-report/${surveyId}`, data);
      setSaveMsg("Tersimpan ✓");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch { setSaveMsg("Gagal simpan"); }
    finally { setSaving(false); }
  };

  const addPestSection = (pestType: string) => {
    const newSection: PestSection = {
      id: Math.random().toString(36).slice(2), pestType, title: pestType,
      findings: [""], pestFact: [], canvasData: null, useSharedCanvas: true, photos: [],
    };
    set({ pestSections: [...data.pestSections, newSection] });
    setActivePage(6 + data.pestSections.length);
  };

  const updateSection = (id: string, patch: Partial<PestSection>) =>
    set({ pestSections: data.pestSections.map(s => s.id === id ? { ...s, ...patch } : s) });

  const removeSection = (id: string) => {
    const idx = data.pestSections.findIndex(s => s.id === id);
    set({ pestSections: data.pestSections.filter(s => s.id !== id) });
    if (activePage === 6 + idx) setActivePage(Math.max(5, 5 + idx));
  };

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

  const uploadSectionPhoto = async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await api.post(`/b2b-report/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data.data.path as string;
  };

  const printCurrentPage = () => window.print();

  // ── Export PDF ─────────────────────────────────────────────────────────────
  // Setiap halaman di-capture pada rasio A4 landscape (297:210) lalu fill penuh ke PDF.
  const exportPdf = async () => {
    if (typeof window === "undefined") return;
    setExportingPdf(true);
    const prevPage = activePage;
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();  // 297
      const pdfH = pdf.internal.pageSize.getHeight(); // 210
      const totalPages = 7 + data.pestSections.length;

      for (let p = 1; p <= totalPages; p++) {
        setActivePage(p);
        // Tunggu React render + image load
        await new Promise(resolve => setTimeout(resolve, 750));

        const pageEl = document.querySelector<HTMLElement>(".print-page");
        if (!pageEl) continue;

        window.scrollTo(0, 0);
        pageEl.scrollIntoView({ block: "start", behavior: "instant" });

        // Tunggu browser render + gambar load
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))));

        // aspectRatio: "297/210" sudah di-set di CSS — offsetHeight otomatis proporsional A4
        const slideW = pageEl.offsetWidth;
        const slideH = pageEl.offsetHeight;

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: slideW,
          height: slideH,
          backgroundColor: "#ffffff",
          ignoreElements: el =>
            el.classList.contains("fpc-toolbar") ||
            el.classList.contains("no-print"),
        });

        if (p > 1) pdf.addPage();
        // Stretch persis ke A4 — tidak ada whitespace / margin
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfW, pdfH);
      }

      pdf.save(`report-b2b-${surveyId}.pdf`);
    } finally {
      setActivePage(prevPage);
      setExportingPdf(false);
    }
  };

  const pages = [
    { num: 1, label: "Cover" },
    { num: 2, label: "Info Survey" },
    { num: 3, label: "Environment Fact (1)" },
    { num: 4, label: "Environment Fact (2)" },
    { num: 5, label: "Risk Mapping" },
    ...data.pestSections.map((s, i) => ({ num: 6 + i, label: s.title || s.pestType, id: s.id })),
    { num: 6 + data.pestSections.length, label: "Resume" },
    { num: 7 + data.pestSections.length, label: "Thank You" },
  ];

  const PEST_TYPES = ["Rodent/Tikus", "Termite/Rayap", "Kecoa", "Lalat", "Semut", "Kucing", "Musang", "Kelelawar", "Burung", "Cicak", "Tawon/Lebah", "Kutu SPI"];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="sticky top-16 z-30 flex items-center justify-between border-b border-[#d9ddeb] bg-white px-6 py-3 md:top-20 no-print">
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
        <aside className="no-print hidden w-56 shrink-0 flex-col border-r border-[#d9ddeb] bg-[#f9fafb] py-4 md:flex">
          <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-2">Halaman</p>
          {pages.map(p => (
            <div key={p.num} className="flex items-center">
              <button onClick={() => setActivePage(p.num)}
                className={`flex-1 px-4 py-2 text-left text-xs transition-colors ${activePage === p.num ? "bg-[#e8f0fe] font-semibold text-[#1a4d8c]" : "text-[#374151] hover:bg-[#f3f4f6]"}`}>
                <span className="mr-2 inline-block w-5 text-center opacity-50">{p.num}</span>{p.label}
              </button>
              {"id" in p && (
                <button onClick={() => removeSection((p as any).id)} title="Hapus seksi ini"
                  className="mr-2 text-[10px] text-red-400 hover:text-red-600 px-1 py-1 rounded hover:bg-red-50 flex-shrink-0">✕</button>
              )}
            </div>
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
        <main className="no-print-wrapper flex-1 overflow-auto p-6 bg-[#f5f7fc]">
          <div className="mx-auto max-w-4xl flex flex-col gap-6">

            {/* ── Page 1: Cover ──────────────────────────────────────────── */}
            {activePage === 1 && (
              <CoverPage bgPath={data.coverImagePath}>
                {/* Upload background — hanya tampil saat edit */}
                <div className="no-print absolute" style={{ top: 8, left: 8, zIndex: 10 }}>
                  <label className="cursor-pointer flex items-center gap-1 bg-white/80 border border-[#d1d5db] rounded px-2 py-1 text-[9px] text-[#374151] hover:border-[#1a4d8c] whitespace-nowrap">
                    🖼 Ganti BG
                    <input type="file" accept="image/*" className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const fd = new FormData(); fd.append("file", file);
                        const res = await api.post(`/b2b-report/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                        set({ coverImagePath: res.data.data.path });
                      }} />
                  </label>
                  {data.coverImagePath && (
                    <button onClick={() => set({ coverImagePath: undefined })}
                      className="mt-0.5 text-[9px] text-red-400 hover:underline block">Hapus BG</button>
                  )}
                </div>

                {/* Konten cover — tata letak: judul di ~30% atas, info klien di ~65% bawah */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 40px" }}>
                  {/* Spacer atas */}
                  <div style={{ flex: 2 }} />

                  {/* Judul */}
                  <div style={{ textAlign: "center" }}>
                    <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, color: "#111", marginBottom: 6 }}>PEST CONTROL REPORT</h1>
                    <div style={{ width: 80, height: 4, backgroundColor: "#1a4d8c", borderRadius: 2, margin: "0 auto" }} />
                  </div>

                  {/* Spacer tengah */}
                  <div style={{ flex: 3 }} />

                  {/* Info klien */}
                  <div style={{ textAlign: "center", width: "100%", maxWidth: 480 }}>
                    <p style={{ fontStyle: "italic", color: "#555", fontSize: 13, marginBottom: 10 }}>for</p>
                    <input value={data.clientName} onChange={e => set({ clientName: e.target.value })}
                      placeholder="Nama Perusahaan / Klien"
                      className="cover-input"
                      style={{ width: "100%", textAlign: "center", fontSize: 20, fontWeight: 700, color: "#111",
                        border: "1px dashed #d1d5db", borderRadius: 6, padding: "4px 10px", background: "transparent" }} />
                    <textarea value={data.clientAddress} onChange={e => set({ clientAddress: e.target.value })}
                      rows={2} placeholder="Alamat lengkap klien"
                      className="cover-input"
                      style={{ width: "100%", textAlign: "center", fontSize: 12, color: "#555", marginTop: 6,
                        border: "1px dashed #d1d5db", borderRadius: 6, padding: "4px 10px", resize: "none", background: "transparent" }} />
                  </div>

                  {/* Spacer bawah */}
                  <div style={{ flex: 2 }} />
                </div>
              </CoverPage>
            )}

            {/* ── Page 2: Info Survey ─────────────────────────────────────── */}
            {activePage === 2 && (
              <CoverPage bgPath={data.coverImagePath}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 40px" }}>
                  <div style={{ flex: 1 }} />

                  {/* Judul */}
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1, color: "#111", marginBottom: 5 }}>PEST CONTROL REPORT</h1>
                    <div style={{ width: 70, height: 3, backgroundColor: "#1a4d8c", borderRadius: 2, margin: "0 auto" }} />
                  </div>

                  {/* Info fields */}
                  <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Surveyor */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111", minWidth: 100, textDecoration: "underline", flexShrink: 0 }}>Surveyor</span>
                      <span style={{ fontSize: 12, color: "#374151", flexShrink: 0 }}>:</span>
                      <input value={data.surveyorNames} onChange={e => set({ surveyorNames: e.target.value })}
                        placeholder="Nama surveyor..."
                        style={{ flex: 1, fontSize: 12, color: "#111", border: "1px dashed #d1d5db", borderRadius: 4, padding: "2px 8px", background: "transparent", minWidth: 0 }} />
                    </div>
                    {/* Tanggal */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111", minWidth: 100, textDecoration: "underline", flexShrink: 0 }}>Tanggal Survey</span>
                      <span style={{ fontSize: 12, color: "#374151", flexShrink: 0 }}>:</span>
                      <input value={data.surveyDate} onChange={e => set({ surveyDate: e.target.value })}
                        placeholder="29 Mei 2026"
                        style={{ flex: 1, fontSize: 12, color: "#111", border: "1px dashed #d1d5db", borderRadius: 4, padding: "2px 8px", background: "transparent", minWidth: 0 }} />
                    </div>
                    {/* General Notes */}
                    <div style={{ marginTop: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 4 }}>General Notes :</p>
                      <BulletEditor items={data.generalNotes} onChange={v => set({ generalNotes: v })} placeholder="Catatan temuan..." />
                    </div>
                  </div>

                  <div style={{ flex: 2 }} />
                </div>
              </CoverPage>
            )}

            {/* ── Page 3: Environment Fact (1) ─────────────────────────────── */}
            {activePage === 3 && (
              <SlidePage title="Environment Fact">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <FloorPlanCanvas ref={envCanvasRef}
                      initialData={data.canvasDataEnv ?? undefined}
                      onChange={d => set({ canvasDataEnv: d })}
                      width={490} height={390} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#111] mb-1">Kondisi Area :</p>
                      <textarea value={data.areaCondition} onChange={e => set({ areaCondition: e.target.value })}
                        rows={6} placeholder="Deskripsikan kondisi area site..."
                        className="w-full rounded border border-[#d1d5db] px-2 py-1.5 text-xs focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111] mb-1">Key Environmental Risk:</p>
                      <BulletEditor items={data.environmentalRisks}
                        onChange={v => set({ environmentalRisks: v })} placeholder="Faktor risiko lingkungan..." />
                    </div>
                  </div>
                </div>
              </SlidePage>
            )}

            {/* ── Page 4: Environment Fact (2) ─────────────────────────────── */}
            {activePage === 4 && (
              <SlidePage title="Environment Fact">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <FloorPlanCanvas ref={pestCanvasRef}
                      initialData={data.canvasDataPest ?? undefined}
                      onChange={d => set({ canvasDataPest: d })}
                      width={490} height={390} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#111] mb-0.5">Pest Concern:</p>
                      <textarea value={data.pestConcern} onChange={e => set({ pestConcern: e.target.value })}
                        rows={4} placeholder="Jenis hama yang menjadi concern..."
                        className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                    <div className="grid grid-cols-6 gap-1 mt-2">
                      {PEST_ICONS.map(p => (
                        <div key={p.name} className="flex flex-col items-center gap-0.5">
                          <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #1a4d8c",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                            {p.emoji}
                          </div>
                          <span style={{ fontSize: 7, textAlign: "center", color: "#374151", lineHeight: 1.2 }}>{p.name}</span>
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <FloorPlanCanvas ref={floorPlanRef}
                      initialData={data.floorPlanCanvasData ?? undefined}
                      onChange={d => set({ floorPlanCanvasData: d })}
                      width={580} height={385} />
                  </div>
                  <div className="col-span-1 flex flex-col gap-2">
                    {[
                      { color: "#ef4444", level: "High Risk", desc: "Active pest evidence / critical condition", action: "Immediate action" },
                      { color: "#eab308", level: "Medium Risk", desc: "Potential pest risk / supporting condition found", action: "Corrective action" },
                      { color: "#22c55e", level: "Low Risk", desc: "Controlled condition / routine monitoring required", action: "Monitoring" },
                    ].map(r => (
                      <div key={r.level} className="rounded-lg border border-[#e5e7eb] p-2 flex gap-2 items-start">
                        <span className="inline-block w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: r.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[10px] mb-0.5" style={{ color: r.color }}>{r.level}</p>
                          <p className="text-[9px] text-[#374151] leading-relaxed">{r.desc}</p>
                          <p className="text-[9px] font-semibold text-[#111] mt-0.5">→ {r.action}</p>
                        </div>
                      </div>
                    ))}
                    <p className="no-print text-[9px] text-[#9ca3af] mt-1 leading-relaxed">
                      Upload gambar denah sebagai background, tempatkan ikon hama di atas denah.
                    </p>
                  </div>
                </div>
              </SlidePage>
            )}

            {/* ── Pages 6+: Pest Sections ──────────────────────────────────── */}
            {data.pestSections.map((sec, idx) => {
              if (activePage !== 6 + idx) return null;
              return (
                <SlidePage key={sec.id} title={sec.title || sec.pestType}>
                  <div className="no-print flex items-center gap-2 mb-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-1.5">
                    <label className="text-[9px] text-[#9ca3af]">Judul:</label>
                    <input value={sec.title} onChange={e => updateSection(sec.id, { title: e.target.value })}
                      placeholder="Judul seksi..."
                      className="flex-1 rounded border border-[#d1d5db] px-2 py-0.5 text-xs focus:border-[#1a4d8c] focus:outline-none" />
                    <button onClick={() => removeSection(sec.id)}
                      className="rounded border border-red-200 px-2 py-0.5 text-[10px] text-red-500 hover:bg-red-50">Hapus</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="no-print flex items-center gap-1.5 mb-0.5">
                        <input type="checkbox" id={`shared-${sec.id}`} checked={sec.useSharedCanvas}
                          onChange={e => updateSection(sec.id, { useSharedCanvas: e.target.checked })} />
                        <label htmlFor={`shared-${sec.id}`} className="text-[9px] text-[#6b7280]">Gunakan denah dari Risk Mapping</label>
                      </div>
                      <FloorPlanCanvas
                        ref={sec.useSharedCanvas ? undefined : el => { if (el) sectionCanvasRefs.current[sec.id] = el; }}
                        initialData={(sec.useSharedCanvas ? data.floorPlanCanvasData : sec.canvasData) ?? undefined}
                        onChange={d => updateSection(sec.id, { canvasData: d })}
                        width={460} height={380} />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#111] mb-1">Hasil Survey :</p>
                        <div className="flex flex-col gap-1">
                          {sec.findings.map((item, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className="mt-1.5 text-[#111] font-bold text-xs min-w-[16px]">{i + 1}.</span>
                              <input value={item} onChange={e => {
                                const f = [...sec.findings]; f[i] = e.target.value;
                                updateSection(sec.id, { findings: f });
                              }} placeholder="Temuan survei..."
                                className="flex-1 rounded border border-[#d1d5db] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none" />
                              <button onClick={() => updateSection(sec.id, { findings: sec.findings.filter((_, j) => j !== i) })}
                                className="no-print mt-1 text-red-400 hover:text-red-600 text-[10px]">✕</button>
                            </div>
                          ))}
                          <button onClick={() => updateSection(sec.id, { findings: [...sec.findings, ""] })}
                            className="no-print mt-0.5 text-[10px] text-[#1a4d8c] hover:underline text-left">+ Tambah temuan</button>
                        </div>
                      </div>

                      <p className="no-print text-[9px] text-[#9ca3af] mt-1">Upload foto dokumentasi via toolbar canvas (tombol Upload).</p>
                    </div>
                  </div>
                </SlidePage>
              );
            })}

            {/* ── Resume ──────────────────────────────────────────────────────── */}
            {activePage === 6 + data.pestSections.length && (
              <SlidePage title="Resume">
                <div className="no-print flex items-center justify-between mb-3">
                  <p className="text-[10px] text-[#6b7280]">Tabel ringkasan temuan dan rekomendasi</p>
                  <button onClick={generateResume}
                    className="rounded-lg border border-[#1a4d8c] px-3 py-1 text-[10px] font-semibold text-[#1a4d8c] hover:bg-[#f0f5ff]">
                    ✨ Auto-generate
                  </button>
                </div>
                {data.resumeRows.length === 0 ? (
                  <div className="no-print rounded-lg border-2 border-dashed border-[#e5e7eb] py-6 text-center text-xs text-[#9ca3af]">
                    Klik "Auto-generate" untuk mengisi otomatis dari seksi hama.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-[#d1d5db]">
                    <table className="w-full">
                      <thead style={{ backgroundColor: "#1a4d8c", color: "white" }}>
                        <tr>
                          {["No", "Hama", "Resume", "Rekomendasi"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.resumeRows.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #e5e7eb", backgroundColor: i % 2 === 0 ? "#f0f4f8" : "white" }}>
                            <td className="px-3 py-2 font-semibold text-[#1a4d8c] text-[10px]">{i + 1}</td>
                            <td className="px-3 py-2 font-semibold text-[10px]">{row.pestType}</td>
                            <td className="px-3 py-2">
                              <textarea value={row.summary} onChange={e => {
                                const rows = [...data.resumeRows]; rows[i] = { ...rows[i], summary: e.target.value };
                                set({ resumeRows: rows });
                              }} rows={3} className="w-full rounded border border-[#e5e7eb] px-1.5 py-1 text-[10px] focus:border-[#1a4d8c] focus:outline-none resize-none bg-transparent" />
                            </td>
                            <td className="px-3 py-2">
                              <textarea value={row.recommendation} onChange={e => {
                                const rows = [...data.resumeRows]; rows[i] = { ...rows[i], recommendation: e.target.value };
                                set({ resumeRows: rows });
                              }} rows={3} placeholder="Rekomendasi..." className="w-full rounded border border-[#e5e7eb] px-1.5 py-1 text-[10px] focus:border-[#1a4d8c] focus:outline-none resize-none" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="no-print mt-2 flex justify-end">
                  <button onClick={() => set({ resumeRows: [...data.resumeRows, { pestType: "", summary: "", recommendation: "" }] })}
                    className="text-[10px] text-[#1a4d8c] hover:underline">+ Tambah baris manual</button>
                </div>
              </SlidePage>
            )}

            {/* ── Thank You ────────────────────────────────────────────────── */}
            {activePage === 7 + data.pestSections.length && <ThankYouPage />}

            {/* Navigation */}
            <div className="no-print flex justify-between">
              <button disabled={activePage === 1} onClick={() => setActivePage(p => p - 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">← Sebelumnya</button>
              <button disabled={activePage === pages[pages.length - 1].num} onClick={() => setActivePage(p => p + 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">Selanjutnya →</button>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        /* ═══════════════ PRINT / PDF STYLES ═══════════════ */
        @media print {
          @page { size: A4 landscape; margin: 0; }

          /* Sembunyikan semua UI, hanya tampilkan slide */
          body > * { visibility: hidden !important; }
          .print-page { visibility: visible !important; }
          .print-page * { visibility: visible !important; }

          /* Slide = persis A4 landscape — aspect-ratio sudah handle height */
          .print-page {
            position: fixed !important;
            inset: 0 !important;
            width: 297mm !important;
            height: 210mm !important;  /* explicit untuk @media print */
            aspect-ratio: auto !important; /* override aspectRatio, pakai height eksplisit */
            overflow: hidden !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Sembunyikan elemen edit-only */
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          /* Bersihkan tampilan form input — hanya tampilkan teks nilai */
          .print-page input,
          .print-page textarea {
            border: none !important;
            background: transparent !important;
            outline: none !important;
            box-shadow: none !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            padding: 2px 4px !important;
            resize: none !important;
            color: inherit !important;
            min-width: 0 !important;
          }

          /* Sembunyikan dashed border upload area di cover */
          .print-page .cover-input {
            border: none !important;
          }

          /* Toolbar canvas tidak tampil */
          .fpc-toolbar { display: none !important; }

          /* Pastikan gambar dan warna ter-print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
