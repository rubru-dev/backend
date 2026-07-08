"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { fileUrl } from "@/lib/utils";
import type { CanvasData } from "@/components/b2b-report/FloorPlanCanvas";
import { useAuth } from "@/hooks/useAuth";

const FloorPlanCanvas = dynamic(() => import("@/components/b2b-report/FloorPlanCanvas"), { ssr: false });

const A4_PAGE_WIDTH = 1123;
const A4_PAGE_HEIGHT = 794;
const A4_PAGE_STYLE = {
  width: A4_PAGE_WIDTH,
  height: A4_PAGE_HEIGHT,
  aspectRatio: "297/210",
  overflow: "hidden",
  flexShrink: 0,
};

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
  approvedByName?: string;
  approvedAt?: string;
}

function stripHtml(value: string) {
  if (typeof document === "undefined") return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const div = document.createElement("div");
  div.innerHTML = value;
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function splitList(value: string) {
  return value.split(/\r?\n/).map(item => item.replace(/^[-•\d.)\s]+/, "").trim()).filter(Boolean);
}

// ─── CoverPage ────────────────────────────────────────────────────────────────
function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  const clean = items.filter(Boolean);
  for (let i = 0; i < clean.length; i += size) chunks.push(clean.slice(i, i + size));
  return chunks.length ? chunks : [[]];
}

function CoverPage({ bgPath, children }: { bgPath?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow border border-[#d1d5db] print-page flex flex-col"
         style={{ ...A4_PAGE_STYLE, position: "relative" }}>
      {bgPath && (
        <img src={fileUrl(bgPath)} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.22, pointerEvents: "none", zIndex: 0 }} />
      )}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "18px 30px 0", flexShrink: 0 }}>
          <img src="/refrence/Header-transparent.png" alt="Fumakilla" style={{ height: 64, objectFit: "contain", backgroundColor: "transparent" }} />
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
         style={{ ...A4_PAGE_STYLE, position: "relative" }}>
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
         style={A4_PAGE_STYLE}>
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

function OrderedListEditor({ items, onChange, placeholder = "Tambah rekomendasi..." }: {
  items: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [values, setValues] = useState<string[]>(() => items.length ? items : [""]);
  useEffect(() => {
    setValues(items.length ? items : [""]);
  }, [items.join("\u0001")]);
  const commit = (next: string[]) => {
    setValues(next.length ? next : [""]);
    onChange(next);
  };
  const update = (i: number, value: string) => {
    const next = [...values];
    next[i] = value;
    commit(next);
  };
  return (
    <div className="flex flex-col gap-1">
      {values.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="min-w-[18px] text-right text-[10px] font-semibold text-[#1a4d8c]">{i + 1}.</span>
          <input value={item} onChange={e => update(i, e.target.value)} placeholder={placeholder}
            className="flex-1 rounded border border-[#e5e7eb] px-1.5 py-1 text-[10px] focus:border-[#1a4d8c] focus:outline-none" />
          <button type="button" onClick={() => commit(values.filter((_, j) => j !== i))}
            className="no-print text-[10px] text-red-400 hover:text-red-600">x</button>
        </div>
      ))}
      <button type="button" onClick={() => commit([...values, ""])}
        className="no-print text-left text-[10px] text-[#1a4d8c] hover:underline">+ Tambah rekomendasi</button>
    </div>
  );
}

function RichFindingEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const values = items.length ? items : [""];
  const boldRef = useRef<HTMLButtonElement>(null);
  const italicRef = useRef<HTMLButtonElement>(null);
  const strikeRef = useRef<HTMLButtonElement>(null);
  const baseToolClass = "h-6 w-6 rounded border text-[10px] transition-colors border-[#d1d5db] bg-white text-[#374151] hover:border-[#1a4d8c]";
  const activeToolClass = "h-6 w-6 rounded border text-[10px] transition-colors border-[#1a4d8c] bg-[#1a4d8c] text-white";
  const setButtonClass = (ref: { current: HTMLButtonElement | null }, selected: boolean, extra = "") => {
    if (ref.current) ref.current.className = `${selected ? activeToolClass : baseToolClass} ${extra}`;
  };
  const syncActive = () => {
    setButtonClass(boldRef, document.queryCommandState("bold"), "font-bold");
    setButtonClass(italicRef, document.queryCommandState("italic"), "italic");
    setButtonClass(strikeRef, document.queryCommandState("strikeThrough"), "line-through");
  };
  const run = (cmd: "bold" | "italic" | "strikeThrough") => {
    document.execCommand(cmd);
    requestAnimationFrame(syncActive);
  };
  const update = (i: number, value: string) => {
    const next = [...values];
    next[i] = value;
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="no-print mb-1 flex gap-1">
        <button ref={boldRef} type="button" onMouseDown={e => { e.preventDefault(); run("bold"); }}
          className={`${baseToolClass} font-bold`}>B</button>
        <button ref={italicRef} type="button" onMouseDown={e => { e.preventDefault(); run("italic"); }}
          className={`${baseToolClass} italic`}>I</button>
        <button ref={strikeRef} type="button" onMouseDown={e => { e.preventDefault(); run("strikeThrough"); }}
          className={`${baseToolClass} line-through`}>S</button>
      </div>
      {values.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-1 min-w-[16px] text-xs font-bold text-[#111]">{i + 1}.</span>
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={e => update(i, e.currentTarget.innerHTML)}
            onKeyUp={e => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) syncActive();
            }}
            onMouseUp={syncActive}
            onFocus={syncActive}
            dangerouslySetInnerHTML={{ __html: item }}
            data-placeholder="Temuan survei..."
            className="min-h-[26px] flex-1 rounded border border-[#d1d5db] px-2 py-1 text-xs leading-relaxed focus:border-[#1a4d8c] focus:outline-none empty:before:text-[#9ca3af] empty:before:content-[attr(data-placeholder)]"
          />
          <button onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="no-print mt-1 text-[10px] text-red-400 hover:text-red-600">x</button>
        </div>
      ))}
      <button onClick={() => onChange([...values, ""])}
        className="no-print mt-0.5 text-left text-[10px] text-[#1a4d8c] hover:underline">+ Tambah temuan</button>
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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const autoExportRef = useRef(false);
  const [activePage, setActivePage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [surveyInfo, setSurveyInfo] = useState<any>(null);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const canApprove = ["ADMIN", "MANAGER"].includes((user as any)?.role);

  const defaultData: ReportData = {
    clientName: "", clientAddress: "",
    surveyorNames: "", surveyDate: "", generalNotes: [],
    areaCondition: "", environmentalRisks: [],
    pestConcern: "", inspectionFocus: "",
    pestSections: [], resumeRows: [], status: "draft",
  };
  const [data, setData] = useState<ReportData>(defaultData);
  const approved = Boolean(data.approvedAt && data.approvedByName);
  const checkedInOut = Boolean(surveyInfo?.evidenceImagePath && surveyInfo?.checkoutImagePath);

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
          approvedByName: d.approvedByName || undefined,
          approvedAt: d.approvedAt || undefined,
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

  const set = (patch: Partial<ReportData>) => setData(prev => ({
    ...prev,
    status: "draft",
    approvedByName: undefined,
    approvedAt: undefined,
    ...patch,
  }));

  const save = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const nextData = { ...data, status: "draft", approvedByName: undefined, approvedAt: undefined };
      await api.post(`/b2b-report/${surveyId}`, nextData);
      setData(nextData);
      setEditMode(false);
      setSaveMsg("Tersimpan ✓");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch { setSaveMsg("Gagal simpan"); }
    finally { setSaving(false); }
  };

  const approve = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await api.post(`/b2b-report/${surveyId}`, data);
      const res = await api.post(`/b2b-report/${surveyId}/approve`);
      setData(prev => ({ ...prev, approvedByName: res.data.data.approvedByName, approvedAt: res.data.data.approvedAt, status: "approved" }));
      setEditMode(false);
      setSaveMsg("Approved");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (e: any) {
      setSaveMsg(e?.response?.data?.error || "Approval gagal");
      setTimeout(() => setSaveMsg(""), 3500);
    } finally {
      setSaving(false);
    }
  };

  const requireApproval = () => {
    if (approved) return true;
    setSaveMsg("Report harus di-approve admin dulu sebelum export");
    setTimeout(() => setSaveMsg(""), 3000);
    return false;
  };

  const saveCurrentData = async (payload: ReportData, message = "Tersimpan otomatis") => {
    setSaving(true); setSaveMsg("");
    try {
      await api.post(`/b2b-report/${surveyId}`, payload);
      setSaveMsg(message);
      setTimeout(() => setSaveMsg(""), 2500);
    } catch {
      setSaveMsg("Autosave gagal");
    } finally {
      setSaving(false);
    }
  };

  const goToPage = async (page: number) => {
    if (page === activePage || saving) return;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    setPendingPage(page);
  };

  const closePageDialog = () => setPendingPage(null);

  const moveWithoutSaving = () => {
    if (pendingPage == null) return;
    setActivePage(pendingPage);
    setPendingPage(null);
  };

  const saveAndMove = async () => {
    if (pendingPage == null) return;
    const nextPage = pendingPage;
    await saveCurrentData(data, "Tersimpan");
    setActivePage(nextPage);
    setPendingPage(null);
  };

  const addPestSection = (pestType: string) => {
    const existing = data.pestSections.find(s => s.pestType === pestType);
    const newSection: PestSection = {
      id: Math.random().toString(36).slice(2), pestType, title: pestType,
      findings: existing?.findings?.length ? existing.findings : [""], pestFact: [], canvasData: null, useSharedCanvas: true, photos: [],
    };
    const nextData = { ...data, pestSections: [...data.pestSections, newSection] };
    setData(nextData);
    saveCurrentData(nextData, "Seksi ditambah & tersimpan");
    setActivePage(pestSectionStartPage + data.pestSections.length);
  };

  const updateSection = (id: string, patch: Partial<PestSection>) =>
    set({ pestSections: data.pestSections.map(s => s.id === id ? { ...s, ...patch } : s) });

  const updatePestFindings = (pestType: string, findings: string[]) =>
    set({ pestSections: data.pestSections.map(s => s.pestType === pestType ? { ...s, findings } : s) });

  const removeSection = async (id: string) => {
    const idx = data.pestSections.findIndex(s => s.id === id);
    const nextData = { ...data, pestSections: data.pestSections.filter(s => s.id !== id) };
    setData(nextData);
    if (activePage === pestSectionStartPage + idx) setActivePage(Math.max(riskMappingPage, pestSectionStartPage + idx - 1));
    setSaving(true); setSaveMsg("");
    try {
      await api.post(`/b2b-report/${surveyId}`, nextData);
      setSaveMsg("Seksi dihapus & tersimpan");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch {
      setSaveMsg("Hapus belum tersimpan");
    } finally {
      setSaving(false);
    }
  };

  const generateResume = () => {
    const grouped = new Map<string, PestSection[]>();
    data.pestSections.forEach(sec => grouped.set(sec.pestType, [...(grouped.get(sec.pestType) || []), sec]));
    const rows: ResumeRow[] = Array.from(grouped.entries()).map(([pestType, sections]) => {
      const findings = sections.flatMap(sec => sec.findings || []).map(stripHtml).filter(Boolean);
      const summary = findings.length
        ? findings.map(f => f.endsWith(".") ? f : f + ".").join(" ")
        : `Ditemukan aktivitas ${pestType} selama survei.`;
      const existing = data.resumeRows.find(r => r.pestType === pestType);
      return { pestType, summary, recommendation: existing?.recommendation || "" };
    });
    set({ resumeRows: rows });
  };

  const uploadSectionPhoto = async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await api.post(`/b2b-report/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data.data.path as string;
  };

  const printCurrentPage = async () => {
    if (typeof window === "undefined") return;
    if (!requireApproval()) return;
    setExportingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      await new Promise(resolve => setTimeout(resolve, 600));
      const pageEl = document.querySelector<HTMLElement>(".print-page");
      if (!pageEl) return;
      window.scrollTo(0, 0);
      pageEl.scrollIntoView({ block: "start", behavior: "instant" });
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))));
      const slideW = A4_PAGE_WIDTH;
      const slideH = A4_PAGE_HEIGHT;

      const wrappers = pageEl.querySelectorAll<HTMLElement>(".fpc-canvas-wrapper");
      wrappers.forEach(w => { w.style.border = "none"; w.style.borderRadius = "0"; });
      const pageRect = pageEl.getBoundingClientRect();
      const overlays: HTMLElement[] = [];
      pageEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input:not([type='checkbox']):not([type='radio']):not([type='file']):not([type='color']):not([type='range']):not([type='number']), textarea"
      ).forEach(inp => {
        if (!inp.value) return;
        const r = inp.getBoundingClientRect();
        const cs = window.getComputedStyle(inp);
        const isTextArea = inp.tagName === "TEXTAREA";
        const div = document.createElement("div");
        div.textContent = inp.value;
        div.style.cssText = [
          `position:absolute`, `left:${r.left - pageRect.left}px`, `top:${r.top - pageRect.top}px`,
          `width:${r.width}px`, `height:${r.height}px`,
          `font-size:${cs.fontSize}`, `font-family:${cs.fontFamily}`, `font-weight:${cs.fontWeight}`,
          `line-height:${cs.lineHeight}`, `text-align:${cs.textAlign}`, `color:#111`, `display:${isTextArea ? "block" : "flex"}`, `align-items:${isTextArea ? "initial" : "center"}`, `justify-content:${cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "flex-end" : "flex-start"}`, `padding:0 6px`,
          `overflow:visible`, `white-space:pre-wrap`,
          `overflow-wrap:anywhere`, `word-break:break-word`, `z-index:900`, `pointer-events:none`, `box-sizing:border-box`,
        ].join(";");
        pageEl.appendChild(div);
        overlays.push(div);
        inp.style.setProperty("color", "transparent", "important");
        inp.style.setProperty("-webkit-text-fill-color", "transparent", "important");
      });
      const allInputs = pageEl.querySelectorAll<HTMLElement>("input, textarea, [contenteditable='true']");
      allInputs.forEach(inp => { inp.style.border = "none"; inp.style.outline = "none"; });

      const canvas = await html2canvas(pageEl, {
        scale: 2, useCORS: true, allowTaint: true, logging: false,
        width: slideW, height: slideH, windowWidth: slideW, windowHeight: slideH, backgroundColor: "#ffffff",
        ignoreElements: el => el.classList.contains("fpc-toolbar") || el.classList.contains("no-print"),
      });

      overlays.forEach(d => d.remove());
      allInputs.forEach(inp => { inp.style.removeProperty("color"); inp.style.removeProperty("-webkit-text-fill-color"); inp.style.border = ""; inp.style.outline = ""; });
      wrappers.forEach(w => { w.style.border = ""; w.style.borderRadius = ""; });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head><style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        img { width: 100vw; height: 100vh; object-fit: contain; display: block; }
        @media print { @page { margin: 0; size: A4 landscape; } img { width: 100%; height: 100%; object-fit: fill; } }
      </style></head><body><img src="${imgData}" /></body></html>`);
      win.document.close();
      win.onload = () => { win.focus(); win.print(); };
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  // Setiap halaman di-capture pada rasio A4 landscape (297:210) lalu fill penuh ke PDF.
  const exportPdf = async () => {
    if (typeof window === "undefined") return;
    if (!requireApproval()) return;
    setExportingPdf(true);
    const prevPage = activePage;
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();  // 297
      const pdfH = pdf.internal.pageSize.getHeight(); // 210
      const totalPages = thankYouPage;

      for (let p = 1; p <= totalPages; p++) {
        setActivePage(p);
        // Tunggu React render + image load
        await new Promise(resolve => setTimeout(resolve, 900));

        const pageEl = document.querySelector<HTMLElement>(".print-page");
        if (!pageEl) continue;

        window.scrollTo(0, 0);
        pageEl.scrollIntoView({ block: "start", behavior: "instant" });

        // Tunggu browser render + gambar load
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))));

        // aspectRatio: "297/210" sudah di-set di CSS — offsetHeight otomatis proporsional A4
        const slideW = A4_PAGE_WIDTH;
        const slideH = A4_PAGE_HEIGHT;

        // ── Pre-capture: hide canvas border + overlay input/textarea values ──
        const wrappers = pageEl.querySelectorAll<HTMLElement>(".fpc-canvas-wrapper");
        wrappers.forEach(w => { w.style.border = "none"; w.style.borderRadius = "0"; });

        // html2canvas tidak capture React-controlled input values → buat overlay div
        const pageRect = pageEl.getBoundingClientRect();
        const overlays: HTMLElement[] = [];
        pageEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "input:not([type='checkbox']):not([type='radio']):not([type='file']):not([type='color']):not([type='range']):not([type='number']), textarea"
        ).forEach(inp => {
          if (!inp.value) return;
          const r = inp.getBoundingClientRect();
          const cs = window.getComputedStyle(inp);
          const isTextArea = inp.tagName === "TEXTAREA";
          const div = document.createElement("div");
          div.textContent = inp.value;
          div.style.cssText = [
            `position:absolute`,
            `left:${r.left - pageRect.left}px`,
            `top:${r.top - pageRect.top}px`,
            `width:${r.width}px`,
            `height:${r.height}px`,
            `font-size:${cs.fontSize}`,
            `font-family:${cs.fontFamily}`,
            `font-weight:${cs.fontWeight}`,
            `line-height:${cs.lineHeight}`,
            `text-align:${cs.textAlign}`,
            `color:#111`,
            `display:${isTextArea ? "block" : "flex"}`,
            `align-items:${isTextArea ? "initial" : "center"}`,
            `justify-content:${cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "flex-end" : "flex-start"}`,
            `padding:0 6px`,
            `overflow:visible`,
            `white-space:pre-wrap`,
            `overflow-wrap:anywhere`,
            `word-break:break-word`,
            `z-index:900`,
            `pointer-events:none`,
            `box-sizing:border-box`,
          ].join(";");
          pageEl.appendChild(div);
          overlays.push(div);
          inp.style.setProperty("color", "transparent", "important"); // sembunyikan teks asli agar tidak double
          inp.style.setProperty("-webkit-text-fill-color", "transparent", "important");
        });

        // Hilangkan juga border dashed input agar tidak muncul di PDF
        const allInputs = pageEl.querySelectorAll<HTMLElement>("input, textarea, [contenteditable='true']");
        allInputs.forEach(inp => { inp.style.border = "none"; inp.style.outline = "none"; });

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: slideW,
          height: slideH,
          windowWidth: slideW,
          windowHeight: slideH,
          backgroundColor: "#ffffff",
          ignoreElements: el =>
            el.classList.contains("fpc-toolbar") ||
            el.classList.contains("no-print"),
        });

        // ── Post-capture: restore semua ──
        overlays.forEach(d => d.remove());
        allInputs.forEach(inp => { inp.style.removeProperty("color"); inp.style.removeProperty("-webkit-text-fill-color"); inp.style.border = ""; inp.style.outline = ""; });
        wrappers.forEach(w => { w.style.border = ""; w.style.borderRadius = ""; });

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

  const exportPpt = async () => {
    if (typeof window === "undefined") return;
    if (!requireApproval()) return;
    setExportingPdf(true);
    const prevPage = activePage;
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const { renderPageToSlide, PAGE_W_IN, PAGE_H_IN } = await import("@/lib/domToPptx");
      const pptx = new pptxgen();
      // Layout A4 landscape (rasio sama dgn halaman) supaya tidak melar.
      pptx.defineLayout({ name: "A4L", width: PAGE_W_IN, height: PAGE_H_IN });
      pptx.layout = "A4L";
      const totalPages = thankYouPage;

      for (let p = 1; p <= totalPages; p++) {
        setActivePage(p);
        await new Promise(resolve => setTimeout(resolve, 900));
        const pageEl = document.querySelector<HTMLElement>(".print-page");
        if (!pageEl) continue;
        window.scrollTo(0, 0);
        pageEl.scrollIntoView({ block: "start", behavior: "instant" });
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))));

        // Sembunyikan border pembungkus canvas agar denah bersih.
        const wrappers = pageEl.querySelectorAll<HTMLElement>(".fpc-canvas-wrapper");
        wrappers.forEach(w => { w.style.border = "none"; w.style.borderRadius = "0"; });

        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };
        // Bangun slide dari elemen DOM native (teks/tabel/shape editable + gambar denah/foto).
        await renderPageToSlide(pptx, slide, pageEl);

        wrappers.forEach(w => { w.style.border = ""; w.style.borderRadius = ""; });
      }

      await pptx.writeFile({ fileName: `report-b2b-${surveyId}.pptx` });
    } finally {
      setActivePage(prevPage);
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    const action = searchParams.get("export");
    if (!surveyInfo || autoExportRef.current || !["pdf", "ppt"].includes(action || "")) return;
    autoExportRef.current = true;
    if (action === "pdf") void exportPdf();
    if (action === "ppt") void exportPpt();
  }, [surveyInfo, searchParams, approved]);

  const generalNoteChunks = chunkItems(data.generalNotes, 8);
  const environmentalRiskChunks = chunkItems(data.environmentalRisks, 8);
  const generalExtraPages = Math.max(0, generalNoteChunks.length - 1);
  const envExtraPages = Math.max(0, environmentalRiskChunks.length - 1);
  const envFactPage = 3 + generalExtraPages;
  const pestConcernPage = envFactPage + 1 + envExtraPages;
  const riskMappingPage = pestConcernPage + 1;
  const pestSectionStartPage = riskMappingPage + 1;
  const resumePage = pestSectionStartPage + data.pestSections.length;
  const thankYouPage = resumePage + 1;

  const pages = [
    { num: 1, label: "Cover" },
    { num: 2, label: "Info Survey" },
    ...generalNoteChunks.slice(1).map((_, i) => ({ num: 3 + i, label: `Info Survey (${i + 2})` })),
    { num: envFactPage, label: "Environment Fact (1)" },
    ...environmentalRiskChunks.slice(1).map((_, i) => ({ num: envFactPage + 1 + i, label: `Environment Fact (${i + 2})` })),
    { num: pestConcernPage, label: "Environment Fact (2)" },
    { num: riskMappingPage, label: "Risk Mapping" },
    ...data.pestSections.map((s, i) => ({ num: pestSectionStartPage + i, label: s.title || s.pestType, id: s.id })),
    { num: resumePage, label: "Resume" },
    { num: thankYouPage, label: "Thank You" },
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
        <div className="flex items-center gap-2">          {saveMsg && <span className="text-xs text-green-600">{saveMsg}</span>}
          {!editMode ? (
            <button onClick={() => setEditMode(true)}
              className="rounded-lg border border-[#1a4d8c] px-4 py-2 text-xs font-semibold text-[#1a4d8c] hover:bg-[#f0f5ff]">
              Edit
            </button>
          ) : (
            <>
              <button onClick={() => setEditMode(false)} disabled={saving}
                className="rounded-lg border border-[#d1d5db] px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50">
                Batal
              </button>
              <button onClick={save} disabled={saving}
                className="rounded-lg bg-[#1a4d8c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#163d70] disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </>
          )}
          {!editMode && canApprove && !approved && (
            <button
              onClick={() => { if (!checkedInOut) { setSaveMsg("Check in & check out survey harus selesai dulu"); setTimeout(() => setSaveMsg(""), 3500); return; } void approve(); }}
              disabled={saving}
              className="rounded-lg border border-green-700 px-4 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50">
              Approve by System
            </button>
          )}
          {approved && <span className="text-xs font-bold text-green-700">✓ Approved</span>}
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar nav */}
        <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-[#d9ddeb] bg-[#f9fafb] py-4 md:flex">
          <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-2">Halaman</p>
          {pages.map(p => (
            <div key={p.num} className="flex items-center gap-2 px-2">
              <button onClick={() => goToPage(p.num)}
                className={`min-w-0 flex-1 rounded px-2 py-2 text-left text-xs transition-colors ${activePage === p.num ? "bg-[#e8f0fe] font-semibold text-[#1a4d8c]" : "text-[#374151] hover:bg-[#f3f4f6]"}`}>
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
        <main className={`no-print-wrapper flex-1 overflow-auto p-6 bg-[#f5f7fc] ${editMode ? "b2b-edit-mode" : "b2b-read-mode"}`}>
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6">
            <div className="no-print flex items-center justify-between rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-xs text-[#6b7280]"
                 style={{ width: A4_PAGE_WIDTH }}>
              <span>Preview A4 landscape PDF</span>
              <span>{A4_PAGE_WIDTH} x {A4_PAGE_HEIGHT}px · 297 x 210 mm</span>
            </div>

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
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 52px", textAlign: "center" }}>
                  {/* Spacer atas */}
                  <div style={{ flex: 1.25 }} />

                  {/* Judul */}
                  <div style={{ textAlign: "center" }}>
                    <h1 style={{ fontSize: 66, lineHeight: 1.05, fontWeight: 900, letterSpacing: 0, color: "#05080d", marginBottom: 28 }}>PEST CONTROL REPORT</h1>
                  </div>

                  {/* Spacer tengah */}
                  <div style={{ flex: 1.3 }} />

                  {/* Info klien */}
                  <div style={{ textAlign: "center", width: "100%", maxWidth: 820 }}>
                    <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#111", fontSize: 22, marginBottom: 56 }}>for</p>
                    {exportingPdf ? (
                      <>
                        <div style={{ width: "100%", textAlign: "center", fontSize: 42, lineHeight: 1.15, fontWeight: 800, color: "#111" }}>
                          {data.clientName}
                        </div>
                        <div style={{ width: "100%", textAlign: "center", fontSize: 22, lineHeight: 1.18, color: "#30343a", marginTop: 10, whiteSpace: "pre-wrap" }}>
                          {data.clientAddress}
                        </div>
                      </>
                    ) : (
                      <>
                        <input value={data.clientName} onChange={e => set({ clientName: e.target.value })}
                          placeholder="Nama Perusahaan / Klien"
                          className="cover-input"
                          style={{ width: "100%", textAlign: "center", fontSize: 42, lineHeight: 1.15, fontWeight: 800, color: "#111",
                            border: "1px dashed #d1d5db", borderRadius: 6, padding: "4px 10px", background: "transparent" }} />
                        <textarea value={data.clientAddress} onChange={e => set({ clientAddress: e.target.value })}
                          rows={2} placeholder="Alamat lengkap klien"
                          className="cover-input"
                          style={{ width: "100%", textAlign: "center", fontSize: 22, lineHeight: 1.18, color: "#30343a", marginTop: 10,
                            border: "1px dashed #d1d5db", borderRadius: 6, padding: "4px 10px", resize: "none", background: "transparent" }} />
                      </>
                    )}
                  </div>

                  {/* Spacer bawah */}
                  <div style={{ flex: 1.1 }} />
                </div>
              </CoverPage>
            )}

            {/* ── Page 2: Info Survey ─────────────────────────────────────── */}
            {activePage === 2 && (
              <CoverPage bgPath={data.coverImagePath}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 40px", textAlign: "center" }}>
                  <div style={{ flex: 0.95 }} />

                  {/* Judul */}
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <h1 style={{ fontSize: 66, lineHeight: 1.05, fontWeight: 900, letterSpacing: 0, color: "#05080d", marginBottom: 44 }}>PEST CONTROL REPORT</h1>
                  </div>

                  {/* Info fields */}
                  <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    {/* Surveyor */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "100%" }}>
                      <span style={{ width: 150, fontSize: 18, color: "#111", textAlign: "right", flexShrink: 0 }}>Surveyor</span>
                      <span style={{ fontSize: 18, color: "#111", flexShrink: 0 }}>:</span>
                      {exportingPdf ? (
                        <span style={{ width: 520, fontSize: 18, lineHeight: "22px", color: "#111", textAlign: "left" }}>{data.surveyorNames}</span>
                      ) : (
                        <input value={data.surveyorNames} onChange={e => set({ surveyorNames: e.target.value })}
                          placeholder="Nama surveyor..."
                          style={{ width: 520, fontSize: 18, lineHeight: 1.2, color: "#111", fontWeight: 400, border: "1px dashed #c7d2dd", borderRadius: 4, padding: "0 4px", background: "transparent", minWidth: 0 }} />
                      )}
                    </div>
                    {/* Tanggal */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "100%" }}>
                      <span style={{ width: 150, fontSize: 18, color: "#111", textAlign: "right", flexShrink: 0 }}>Tanggal Survey</span>
                      <span style={{ fontSize: 18, color: "#111", flexShrink: 0 }}>:</span>
                      {exportingPdf ? (
                        <span style={{ width: 520, fontSize: 18, lineHeight: "22px", color: "#111", textAlign: "left" }}>{data.surveyDate}</span>
                      ) : (
                        <input value={data.surveyDate} onChange={e => set({ surveyDate: e.target.value })}
                          placeholder="29 Mei 2026"
                          style={{ width: 520, fontSize: 18, lineHeight: 1.2, color: "#111", fontWeight: 400, border: "1px dashed #c7d2dd", borderRadius: 4, padding: "0 4px", background: "transparent", minWidth: 0 }} />
                      )}
                    </div>
                    {/* General Notes */}
                    <div className="info-notes" style={{ marginTop: 24, width: "100%", maxWidth: 680 }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 10, textAlign: "center" }}>General Notes :</p>
                      {exportingPdf || !editMode ? (
                        <ol style={{ margin: 0, padding: 0, listStylePosition: "inside", fontSize: 18, lineHeight: "27px", color: "#111", textAlign: "center" }}>
                          {generalNoteChunks[0].map((note, i) => <li key={i}>{note}</li>)}
                        </ol>
                      ) : (
                        <BulletEditor items={data.generalNotes} onChange={v => set({ generalNotes: v })} placeholder="Catatan temuan..." />
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 2 }} />
                </div>
              </CoverPage>
            )}

            {/* ── Page 3: Environment Fact (1) ─────────────────────────────── */}
            {generalNoteChunks.slice(1).map((chunk, i) => activePage === 3 + i && (
              <CoverPage key={`general-notes-${i}`} bgPath={data.coverImagePath}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 40px", textAlign: "center" }}>
                  <div style={{ flex: 0.95 }} />
                  <h1 style={{ fontSize: 54, lineHeight: 1.05, fontWeight: 900, letterSpacing: 0, color: "#05080d", marginBottom: 34 }}>PEST CONTROL REPORT</h1>
                  <div className="info-notes" style={{ width: "100%", maxWidth: 740 }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 10, textAlign: "center" }}>General Notes :</p>
                    <ol style={{ margin: 0, padding: 0, listStylePosition: "inside", fontSize: 18, lineHeight: "27px", color: "#111", textAlign: "center" }}>
                      {chunk.map((note, noteIndex) => <li key={noteIndex}>{note}</li>)}
                    </ol>
                  </div>
                  <div style={{ flex: 2 }} />
                </div>
              </CoverPage>
            ))}

            {activePage === envFactPage && (
              <SlidePage title="Environment Fact">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col overflow-hidden">
                    <FloorPlanCanvas
                      initialData={data.canvasDataEnv ?? undefined}
                      onChange={d => set({ canvasDataEnv: d })}
                      width={520} height={375} hideGrid={exportingPdf} />
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
                      {editMode && !exportingPdf ? (
                        <BulletEditor items={data.environmentalRisks}
                          onChange={v => set({ environmentalRisks: v })} placeholder="Faktor risiko lingkungan..." />
                      ) : (
                        <ul className="space-y-1 text-xs leading-relaxed text-[#111]">
                          {environmentalRiskChunks[0].map((risk, riskIndex) => <li key={riskIndex} className="flex gap-1.5"><span className="font-bold text-[#1a4d8c]">-</span><span>{risk}</span></li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </SlidePage>
            )}

            {/* ── Page 4: Environment Fact (2) ─────────────────────────────── */}
            {environmentalRiskChunks.slice(1).map((chunk, i) => activePage === envFactPage + 1 + i && (
              <SlidePage key={`env-risk-${i}`} title="Environment Fact">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col overflow-hidden">
                    <FloorPlanCanvas
                      initialData={data.canvasDataEnv ?? undefined}
                      onChange={d => set({ canvasDataEnv: d })}
                      width={520} height={375} hideGrid={exportingPdf} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#111] mb-1">Key Environmental Risk:</p>
                      <ul className="space-y-1 text-xs leading-relaxed text-[#111]">
                        {chunk.map((risk, riskIndex) => <li key={riskIndex} className="flex gap-1.5"><span className="font-bold text-[#1a4d8c]">-</span><span>{risk}</span></li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </SlidePage>
            ))}

            {activePage === pestConcernPage && (
              <SlidePage title="Environment Fact">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col overflow-hidden">
                    <FloorPlanCanvas
                      initialData={data.canvasDataPest ?? undefined}
                      onChange={d => set({ canvasDataPest: d })}
                      width={520} height={375} hideGrid={exportingPdf} />
                  </div>
                  <div style={{ paddingLeft: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                    <p className="text-xs font-bold text-[#111]">Pest Concern:</p>
                    <textarea value={data.pestConcern} onChange={e => set({ pestConcern: e.target.value })}
                      rows={5} placeholder="Jenis hama yang menjadi concern..."
                      style={{ resize: "none", height: 92 }}
                      className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none" />
                    <p className="text-xs font-bold text-[#111]">Inspection Focus:</p>
                    <textarea value={data.inspectionFocus} onChange={e => set({ inspectionFocus: e.target.value })}
                      rows={5} placeholder="Area/fokus inspeksi..."
                      style={{ resize: "none", height: 92 }}
                      className="w-full rounded border border-[#d1d5db] px-2 py-1 text-xs focus:border-[#1a4d8c] focus:outline-none" />
                    <div className="grid grid-cols-6 gap-x-2 gap-y-3 pt-1">
                      {PEST_ICONS.map(p => (
                        <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              border: "1.5px solid #1a4d8c",
                              backgroundColor: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 19,
                              lineHeight: 1,
                              boxSizing: "border-box",
                            }}
                          >
                            {p.emoji}
                          </span>
                          <span style={{ fontSize: 7, textAlign: "center", color: "#374151", lineHeight: 1.2 }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SlidePage>
            )}

            {/* ── Page 5: Pest Risk Mapping ─────────────────────────────────── */}
            {activePage === riskMappingPage && (
              <SlidePage title="Pest Risk Mapping">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 overflow-hidden">
                    <FloorPlanCanvas
                      initialData={data.floorPlanCanvasData ?? undefined}
                      onChange={d => set({ floorPlanCanvasData: d })}
                      width={700} height={375} hideGrid={exportingPdf} />
                  </div>
                  <div className="col-span-1 flex flex-col gap-2 pl-1">
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
              if (activePage !== pestSectionStartPage + idx) return null;
              return (
                <SlidePage key={sec.id} title={sec.title || sec.pestType}>
                  <div className="no-print flex items-center gap-2 mb-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-1.5">
                    <label className="text-[9px] text-[#9ca3af]">Judul:</label>
                    <input value={sec.title} onChange={e => updateSection(sec.id, { title: e.target.value })}
                      placeholder="Judul seksi..."
                      className="flex-1 rounded border border-[#d1d5db] px-2 py-0.5 text-xs focus:border-[#1a4d8c] focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col overflow-hidden">
                      <FloorPlanCanvas
                        initialData={(sec.useSharedCanvas ? data.floorPlanCanvasData : sec.canvasData) ?? undefined}
                        onChange={d => updateSection(sec.id, { canvasData: d })}
                        width={520} height={370}
                        hideGrid={exportingPdf}
                        toolbarExtra={
                          <label className="flex items-center gap-1 cursor-pointer select-none text-[9px] text-[#6b7280] whitespace-nowrap">
                            <input type="checkbox" checked={sec.useSharedCanvas}
                              onChange={e => updateSection(sec.id, { useSharedCanvas: e.target.checked })}
                              className="accent-[#1a4d8c]" />
                            Pakai denah Risk Mapping
                          </label>
                        } />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 0, paddingLeft: 4 }}>
                      <div>
                        <p className="text-xs font-bold text-[#111] mb-1">Hasil Survey :</p>
                        <RichFindingEditor items={sec.findings} onChange={findings => updatePestFindings(sec.pestType, findings)} />
                        <div className="hidden">
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
            {activePage === resumePage && (
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
                            <td className="px-3 py-2 align-top font-semibold text-[#1a4d8c] text-[10px]">{i + 1}</td>
                            <td className="px-3 py-2 align-top font-semibold text-[10px]">{row.pestType}</td>
                            <td className="px-3 py-2 align-top">
                              {exportingPdf ? (
                                <div style={{ fontSize: 10, lineHeight: 1.45, color: "#111", whiteSpace: "pre-wrap" }}>{row.summary}</div>
                              ) : (
                                <textarea value={row.summary} onChange={e => {
                                  const rows = [...data.resumeRows]; rows[i] = { ...rows[i], summary: e.target.value };
                                  set({ resumeRows: rows });
                                }} rows={3} className="block w-full rounded border border-[#e5e7eb] px-1.5 py-0 text-[10px] leading-relaxed focus:border-[#1a4d8c] focus:outline-none resize-none bg-transparent" />
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {exportingPdf ? (
                                <ol style={{ margin: 0, paddingLeft: 14, fontSize: 10, lineHeight: 1.45, color: "#111" }}>
                                  {splitList(row.recommendation).map((item, idx) => <li key={idx}>{item}</li>)}
                                </ol>
                              ) : (
                                <OrderedListEditor items={splitList(row.recommendation)} onChange={items => {
                                  const rows = [...data.resumeRows]; rows[i] = { ...rows[i], recommendation: items.join("\n") };
                                  set({ resumeRows: rows });
                                }} />
                              )}
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
            {activePage === thankYouPage && <ThankYouPage />}

            {/* Navigation */}
            <div className="no-print flex justify-between" style={{ width: A4_PAGE_WIDTH }}>
              <button disabled={activePage === 1} onClick={() => goToPage(activePage - 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">← Sebelumnya</button>
              <button disabled={activePage === pages[pages.length - 1].num} onClick={() => goToPage(activePage + 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30 hover:bg-[#f3f4f6]">Selanjutnya →</button>
            </div>
          </div>
        </main>
      </div>

      {pendingPage !== null && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#d9ddeb] bg-white p-5 shadow-xl">
            <h2 className="text-base font-bold text-[#111]">Simpan perubahan?</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
              Kamu akan pindah ke halaman lain. Simpan perubahan halaman ini dulu agar tidak hilang saat refresh.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={closePageDialog}
                className="rounded-lg border border-[#d1d5db] px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#f3f4f6]">
                Batal
              </button>
              <button onClick={moveWithoutSaving}
                className="rounded-lg border border-[#d1d5db] px-4 py-2 text-xs font-semibold text-[#6b7280] hover:bg-[#f3f4f6]">
                Pindah Tanpa Simpan
              </button>
              <button onClick={saveAndMove} disabled={saving}
                className="rounded-lg bg-[#1a4d8c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#163d70] disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan & Pindah"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .info-notes .print-bullet-row { justify-content: center; }
        .info-notes .print-bullet-row span { color: #111 !important; font-size: 18px !important; line-height: 26px !important; margin-top: 0 !important; }
        .info-notes input { max-width: 560px; border-color: transparent !important; background: transparent !important; color: #111 !important; font-size: 18px !important; line-height: 26px !important; padding: 0 4px !important; }
        .b2b-read-mode input,
        .b2b-read-mode textarea,
        .b2b-read-mode [contenteditable="true"] {
          pointer-events: none !important;
          border-color: transparent !important;
          background: transparent !important;
          color: #111 !important;
        }
        .b2b-read-mode .fpc-toolbar,
        .b2b-read-mode .no-print button,
        .b2b-read-mode button[title="Hapus seksi ini"] {
          display: none !important;
        }
        [contenteditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: #9ca3af; }
        button[title="Hapus seksi ini"] {
          margin-right: 0 !important;
          flex-shrink: 0;
          border: 1px solid #fecaca !important;
          background: #fef2f2 !important;
          color: #dc2626 !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          font-size: 0 !important;
          font-weight: 700 !important;
        }
        button[title="Hapus seksi ini"]::after {
          content: "Hapus";
          font-size: 10px;
        }
        button[title="Hapus seksi ini"]:hover {
          border-color: #fca5a5 !important;
          background: #fee2e2 !important;
        }
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


