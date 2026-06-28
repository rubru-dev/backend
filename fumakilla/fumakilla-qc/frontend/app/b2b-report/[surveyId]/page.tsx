"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Fragment } from "react";
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
  topViewImagePath?: string; frontViewImagePath?: string; mapImagePath?: string;
  canvasDataEnv?: CanvasData | null; areaCondition: string; environmentalRisks: string[];
  pestConcernImagePath?: string; canvasDataPest?: CanvasData | null; pestConcern: string; inspectionFocus: string;
  floorPlanImagePath?: string; floorPlanCanvasData?: CanvasData | null;
  pestSections: PestSection[]; resumeRows: ResumeRow[];
  status: string;
}

// ─── Header ──────────────────────────────────────────────────────────────────
function ReportHeader() {
  return (
    <div className="flex items-start justify-between border-b-2 border-[#1a4d8c] pb-3 mb-5 print-header">
      <div className="flex items-center gap-3">
        <img src="/b2b/fumakilla-logo.jpg" alt="Fumakilla" className="h-14 object-contain" />
        <div className="text-xs leading-relaxed">
          <p className="font-bold text-[#1a4d8c] text-sm">PT. FUMAKILLA INDONESIA</p>
          <p className="text-[#374151]">Pest Control Department</p>
          <p className="text-[#6b7280]">CIBIS 8 Building suite 02 - 6th floor, CIBIS Business Park</p>
          <p className="text-[#6b7280]">Cilandak, Pasar Minggu, South Jakarta City, Jakarta</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <img src="/b2b/pco-logo.jpg" alt="PCO" className="h-10 object-contain" />
        <img src="/b2b/iso-badge.png" alt="ISO" className="h-10 object-contain" />
        <div className="bg-[#1a4d8c] text-white text-center px-4 py-2 text-xs font-bold leading-tight rounded">
          PEST CONTROL<br />REPORT
        </div>
      </div>
    </div>
  );
}

// ─── Bullet List Editor ───────────────────────────────────────────────────────
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
function ImageUpload({ surveyId, value, onChange, label }: { surveyId: string; value?: string; onChange: (path: string) => void; label: string }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await api.post(`/b2b-report/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
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

// ─── Print Page ───────────────────────────────────────────────────────────────
function PrintPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow border border-[#d1d5db] p-8 print-page ${className}`}>
      <ReportHeader />
      {children}
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function B2BReportBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const router = useRouter();
  const [activePage, setActivePage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
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
          clientName: d.clientName || "",
          clientAddress: d.clientAddress || "",
          surveyorNames: d.surveyorNames || "",
          surveyDate: d.surveyDate || "",
          generalNotes: Array.isArray(d.generalNotes) ? d.generalNotes : [],
          topViewImagePath: d.topViewImagePath,
          frontViewImagePath: d.frontViewImagePath,
          mapImagePath: d.mapImagePath,
          canvasDataEnv: d.canvasDataEnv,
          areaCondition: d.areaCondition || "",
          environmentalRisks: Array.isArray(d.environmentalRisks) ? d.environmentalRisks : [],
          pestConcernImagePath: d.pestConcernImagePath,
          canvasDataPest: d.canvasDataPest,
          pestConcern: d.pestConcern || "",
          inspectionFocus: d.inspectionFocus || "",
          floorPlanImagePath: d.floorPlanImagePath,
          floorPlanCanvasData: d.floorPlanCanvasData,
          pestSections: Array.isArray(d.pestSections) ? d.pestSections : [],
          resumeRows: Array.isArray(d.resumeRows) ? d.resumeRows : [],
          status: d.status || "draft",
        });
      } else if (res.data.survey) {
        // Auto-fill from survey
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

  // ── Set ───────────────────────────────────────────────────────────────────
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
    setActivePage(5 + data.pestSections.length + 1);
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
  const uploadSectionPhoto = async (sectionId: string, file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await api.post(`/b2b-report/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data.data.path as string;
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportPdf = async () => {
    if (typeof window === "undefined") return;
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;

    const pages = document.querySelectorAll<HTMLElement>(".print-page");
    if (!pages.length) { alert("Tidak ada halaman untuk diekspor."); return; }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
    }
    pdf.save(`report-survey-${surveyId}.pdf`);
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
          <button onClick={exportPdf}
            className="rounded-lg border border-[#1a4d8c] px-4 py-2 text-xs font-semibold text-[#1a4d8c] hover:bg-[#f0f5ff]">
            📄 Export PDF
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

            {/* ── Page 1: Cover ─────────────────────────────────────────── */}
            {activePage === 1 && (
              <PrintPage>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
                  <div className="flex gap-4 justify-center opacity-70">
                    <div className="w-20 h-20 rounded-lg overflow-hidden">
                      <img src="/b2b/fumakilla-logo.jpg" className="w-full h-full object-contain" />
                    </div>
                  </div>
                  <h1 className="text-4xl font-extrabold text-[#1a4d8c] tracking-tight">PEST CONTROL REPORT</h1>
                  <div className="w-24 h-1 bg-[#1a4d8c] rounded" />
                  <div className="w-full max-w-md flex flex-col gap-3 text-left">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Nama Perusahaan Client</label>
                      <input value={data.clientName} onChange={e => set({ clientName: e.target.value })}
                        placeholder="PT. ..."
                        className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-[#1a4d8c] focus:border-[#1a4d8c] focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Alamat</label>
                      <textarea value={data.clientAddress} onChange={e => set({ clientAddress: e.target.value })}
                        rows={2} placeholder="Jl. ..."
                        className="mt-1 w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#374151] focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                  </div>
                  <p className="text-xs text-[#9ca3af] mt-2">for</p>
                  <p className="text-xl font-bold text-[#374151]">{data.clientName || <span className="opacity-30">Nama Client</span>}</p>
                  <p className="text-sm text-[#6b7280]">{data.clientAddress}</p>
                </div>
              </PrintPage>
            )}

            {/* ── Page 2: Survey Info ───────────────────────────────────── */}
            {activePage === 2 && (
              <PrintPage>
                <h2 className="text-xl font-bold text-[#1a4d8c] mb-5">Informasi Survey</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Surveyor</label>
                      <input value={data.surveyorNames} onChange={e => set({ surveyorNames: e.target.value })}
                        className="mt-1 w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Tanggal Survey</label>
                      <input value={data.surveyDate} onChange={e => set({ surveyDate: e.target.value })}
                        placeholder="29 Mei 2026"
                        className="mt-1 w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">General Notes</label>
                    <div className="mt-2">
                      <BulletEditor items={data.generalNotes} onChange={v => set({ generalNotes: v })} placeholder="Catatan temuan..." />
                    </div>
                  </div>
                </div>
                {/* Preview read-only */}
                {(data.surveyorNames || data.surveyDate || data.generalNotes.length > 0) && (
                  <div className="mt-6 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm">
                    <p><span className="font-semibold">Surveyor :</span> {data.surveyorNames}</p>
                    <p className="mt-1"><span className="font-semibold">Tanggal Survey :</span> {data.surveyDate}</p>
                    {data.generalNotes.filter(Boolean).length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">General Notes :</p>
                        <ul className="mt-1 ml-4 list-disc space-y-1 text-[#374151]">
                          {data.generalNotes.filter(Boolean).map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </PrintPage>
            )}

            {/* ── Page 3: Environment Fact (1) ──────────────────────────── */}
            {activePage === 3 && (
              <PrintPage>
                <h2 className="text-xl font-bold text-[#1a4d8c] mb-5">Environment Fact</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <ImageUpload surveyId={surveyId} value={data.topViewImagePath} onChange={v => set({ topViewImagePath: v })} label="Foto Tampak Atas" />
                      <ImageUpload surveyId={surveyId} value={data.frontViewImagePath} onChange={v => set({ frontViewImagePath: v })} label="Foto Tampak Depan" />
                    </div>
                    <ImageUpload surveyId={surveyId} value={data.mapImagePath} onChange={v => set({ mapImagePath: v })} label="Screenshot Peta 2D" />
                    <FloorPlanCanvas
                      ref={envCanvasRef}
                      initialData={data.canvasDataEnv ?? undefined}
                      onChange={d => set({ canvasDataEnv: d })}
                      width={340} height={220}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Kondisi Area</label>
                      <textarea value={data.areaCondition} onChange={e => set({ areaCondition: e.target.value })}
                        rows={5} placeholder="Deskripsikan kondisi area site..."
                        className="mt-1 w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Key Environmental Risk</label>
                      <div className="mt-2">
                        <BulletEditor items={data.environmentalRisks} onChange={v => set({ environmentalRisks: v })} placeholder="Faktor risiko lingkungan..." />
                      </div>
                    </div>
                  </div>
                </div>
              </PrintPage>
            )}

            {/* ── Page 4: Environment Fact (2) ──────────────────────────── */}
            {activePage === 4 && (
              <PrintPage>
                <h2 className="text-xl font-bold text-[#1a4d8c] mb-5">Environment Fact — Pest Concern</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4">
                    <ImageUpload surveyId={surveyId} value={data.pestConcernImagePath} onChange={v => set({ pestConcernImagePath: v })} label="Foto Area Concern" />
                    <FloorPlanCanvas
                      ref={pestCanvasRef}
                      initialData={data.canvasDataPest ?? undefined}
                      onChange={d => set({ canvasDataPest: d })}
                      width={340} height={280}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Pest Concern</label>
                      <textarea value={data.pestConcern} onChange={e => set({ pestConcern: e.target.value })}
                        rows={4} placeholder="Jenis hama yang menjadi concern..."
                        className="mt-1 w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Inspection Focus</label>
                      <textarea value={data.inspectionFocus} onChange={e => set({ inspectionFocus: e.target.value })}
                        rows={4} placeholder="Area dan titik fokus inspeksi..."
                        className="mt-1 w-full rounded border border-[#d1d5db] px-3 py-2 text-sm focus:border-[#1a4d8c] focus:outline-none resize-none" />
                    </div>
                  </div>
                </div>
              </PrintPage>
            )}

            {/* ── Page 5: Risk Mapping ──────────────────────────────────── */}
            {activePage === 5 && (
              <PrintPage>
                <h2 className="text-xl font-bold text-[#1a4d8c] mb-5">Pest Risk Mapping</h2>
                <FloorPlanCanvas
                  ref={floorPlanRef}
                  initialData={data.floorPlanCanvasData ?? undefined}
                  onChange={d => set({ floorPlanCanvasData: d })}
                  width={780} height={420}
                />
                <div className="mt-5 overflow-hidden rounded-xl border border-[#d1d5db]">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1a4d8c] text-white">
                      <tr>
                        {["Marker", "Level", "Description", "Action"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>
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
                          <td className="px-4 py-3"><span className="inline-block w-5 h-5 rounded-full" style={{ backgroundColor: r.color }} /></td>
                          <td className="px-4 py-3 font-semibold" style={{ color: r.color }}>{r.level}</td>
                          <td className="px-4 py-3 text-[#374151]">{r.desc}</td>
                          <td className="px-4 py-3 text-[#374151]">{r.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-[#6b7280] bg-[#f9fafb] rounded-lg p-3 border border-[#e5e7eb]">
                  <strong>Tips:</strong> Upload gambar denah sebagai background, lalu tempatkan marker risiko (🔴🟡🟢) dan ikon hama di atas denah. Denah ini akan otomatis digunakan di semua halaman seksi hama.
                </div>
              </PrintPage>
            )}

            {/* ── Pages 6-17: Pest Sections ─────────────────────────────── */}
            {data.pestSections.map((sec, idx) => {
              const pageNum = 6 + idx;
              if (activePage !== pageNum) return null;
              return (
                <PrintPage key={sec.id}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-[#1a4d8c]">{sec.title || sec.pestType}</h2>
                    <div className="flex items-center gap-2">
                      <input value={sec.title} onChange={e => updateSection(sec.id, { title: e.target.value })}
                        placeholder="Judul seksi..."
                        className="rounded border border-[#d1d5db] px-2 py-1 text-sm focus:border-[#1a4d8c] focus:outline-none" />
                      <button onClick={() => { removeSection(sec.id); setActivePage(5); }}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50">Hapus</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Canvas */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <input type="checkbox" id={`shared-${sec.id}`} checked={sec.useSharedCanvas}
                          onChange={e => updateSection(sec.id, { useSharedCanvas: e.target.checked })} />
                        <label htmlFor={`shared-${sec.id}`} className="text-xs text-[#6b7280]">Gunakan denah dari halaman Risk Mapping</label>
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
                    {/* Findings */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Hasil Survey</label>
                        <div className="mt-2">
                          <BulletEditor items={sec.findings} onChange={v => updateSection(sec.id, { findings: v })} placeholder="Temuan survei..." />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Pest Fact (opsional)</label>
                        <div className="mt-2">
                          <BulletEditor items={sec.pestFact} onChange={v => updateSection(sec.id, { pestFact: v })} placeholder="Fakta tambahan tentang hama..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Foto Dokumentasi</label>
                      <label className="cursor-pointer rounded border border-[#1a4d8c] px-3 py-1.5 text-xs font-medium text-[#1a4d8c] hover:bg-[#f0f5ff]">
                        + Upload Foto
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={async e => {
                            const files = Array.from(e.target.files || []);
                            const nextNum = (sec.photos.length > 0 ? Math.max(...sec.photos.map(p => p.markerNumber)) : 0) + 1;
                            const uploaded = await Promise.all(files.map(async (f, fi) => {
                              const path = await uploadSectionPhoto(sec.id, f);
                              return { path, caption: "", markerNumber: nextNum + fi };
                            }));
                            updateSection(sec.id, { photos: [...sec.photos, ...uploaded] });
                          }}
                        />
                      </label>
                    </div>
                    {sec.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {sec.photos.map((photo, pi) => (
                          <div key={pi} className="rounded-lg border border-[#e5e7eb] overflow-hidden">
                            <div className="relative">
                              <img src={fileUrl(photo.path)} alt="" className="w-full h-28 object-cover" />
                              <span className="absolute top-1 left-1 bg-[#1a4d8c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {photo.markerNumber}
                              </span>
                              <button
                                onClick={() => updateSection(sec.id, { photos: sec.photos.filter((_, j) => j !== pi) })}
                                className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">✕</button>
                            </div>
                            <input value={photo.caption} onChange={e => {
                              const ph = [...sec.photos]; ph[pi] = { ...ph[pi], caption: e.target.value };
                              updateSection(sec.id, { photos: ph });
                            }} placeholder="Keterangan foto..." className="w-full border-t border-[#e5e7eb] px-2 py-1.5 text-[11px] focus:outline-none" />
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.photos.length === 0 && (
                      <div className="rounded-lg border-2 border-dashed border-[#e5e7eb] py-6 text-center text-xs text-[#9ca3af]">
                        Belum ada foto. Nomor foto akan otomatis berurutan dan bisa ditempatkan sebagai marker di denah.
                      </div>
                    )}
                  </div>
                </PrintPage>
              );
            })}

            {/* ── Page 18: Resume ───────────────────────────────────────── */}
            {activePage === 6 + data.pestSections.length && (
              <PrintPage>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-[#1a4d8c]">Resume</h2>
                  <button onClick={generateResume}
                    className="rounded-lg border border-[#1a4d8c] px-4 py-2 text-xs font-semibold text-[#1a4d8c] hover:bg-[#f0f5ff]">
                    ✨ Auto-generate dari temuan
                  </button>
                </div>
                {data.resumeRows.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-[#e5e7eb] py-8 text-center text-sm text-[#9ca3af]">
                    Klik "Auto-generate" untuk mengisi otomatis dari seksi hama, atau tambah baris manual.
                  </div>
                )}
                {data.resumeRows.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-[#d1d5db]">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1a4d8c] text-white">
                        <tr>
                          {["No", "Hama", "Resume", "Rekomendasi"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.resumeRows.map((row, i) => (
                          <tr key={i} className="border-t border-[#e5e7eb]">
                            <td className="px-4 py-3 font-semibold text-[#1a4d8c]">{i + 1}</td>
                            <td className="px-4 py-3 font-semibold">{row.pestType}</td>
                            <td className="px-4 py-3">
                              <textarea value={row.summary} onChange={e => {
                                const rows = [...data.resumeRows]; rows[i] = { ...rows[i], summary: e.target.value };
                                set({ resumeRows: rows });
                              }} rows={3} className="w-full rounded border border-[#e5e7eb] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none resize-none bg-transparent" />
                            </td>
                            <td className="px-4 py-3">
                              <textarea value={row.recommendation} onChange={e => {
                                const rows = [...data.resumeRows]; rows[i] = { ...rows[i], recommendation: e.target.value };
                                set({ resumeRows: rows });
                              }} rows={3} placeholder="Isi rekomendasi..." className="w-full rounded border border-[#e5e7eb] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none resize-none" />
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
              </PrintPage>
            )}

            {/* ── Thank You ─────────────────────────────────────────────── */}
            {activePage === 7 + data.pestSections.length && (
              <PrintPage>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-6">
                  <img src="/b2b/fumakilla-logo.jpg" alt="Fumakilla" className="h-20 object-contain" />
                  <div>
                    <h1 className="text-5xl font-extrabold text-[#1a4d8c]">Thank you</h1>
                    <p className="mt-2 text-xl text-[#374151]">どうもありがとうございました</p>
                  </div>
                  <div className="w-32 h-1 bg-[#1a4d8c] rounded" />
                  <p className="text-sm text-[#6b7280]">PT. FUMAKILLA INDONESIA — Pest Control Department</p>
                </div>
              </PrintPage>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <button disabled={activePage === 1} onClick={() => setActivePage(p => p - 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">← Sebelumnya</button>
              <button disabled={activePage === pages[pages.length - 1].num} onClick={() => setActivePage(p => p + 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">Selanjutnya →</button>
            </div>
          </div>
        </main>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-page {
            display: block !important;
            page-break-after: always;
            width: 297mm !important;
            min-height: 210mm !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
