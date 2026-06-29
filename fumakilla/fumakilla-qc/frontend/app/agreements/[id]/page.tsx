"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { Loading } from "@/components/erp/shared";

const FloorPlanCanvas = dynamic(() => import("@/components/b2b-report/FloorPlanCanvas"), { ssr: false });

// ─── constants ───────────────────────────────────────────────────────────────
const NAVY   = "#2c3e5c";
const LOGO   = "/refrence/MonthlyReportLogo.jpg";
const FOOTER = "/refrence/Footer.png";
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const PEST_TYPES = ["Rodent Control","Shrew Control","Flies Control","Cat Control","Crawling Pest Control","Snake Control"];
const PAGE_NAMES = ["Cover", ...PEST_TYPES, "Rekomendasi", "Penutup"];

type ChartEntry = { bulan: string; nilai: number };
type PestPageData = {
  layoutData: any;
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
  id: string; tanggalTemuan: string; potensiHama: string; area: string;
  rekomendasi: string; dokumentasi: string; tanggalClosing: string; dokumentasiClosing: string;
};
type Customer = { id: string; name: string; company: string | null; code: string; address: string | null; agreementNumber: string | null; agreementType: string | null };
type Report = { id: string; customerId: string; bulan: number; tahun: number; pagesData: any; rekData: any; customer: Customer };

const defaultPestPage = (): PestPageData => ({
  layoutData: null, chartData: [{bulan:"",nilai:0},{bulan:"",nilai:0},{bulan:"",nilai:0}],
  photosTangkapan: [], photosPreventive: [], photosCorrective: [], photosRek: [],
  analisa: "", preventiveAction: "", correctiveAction: "", rekomendasi: "",
});
const defaultRekItem = (): RekItem => ({
  id: crypto.randomUUID(), tanggalTemuan:"", potensiHama:"", area:"",
  rekomendasi:"", dokumentasi:"", tanggalClosing:"", dokumentasiClosing:"",
});

// ─── slide footer ─────────────────────────────────────────────────────────────
function SlideFooter() {
  return (
    <div style={{ position:"relative", height:90, background:NAVY, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
      <div style={{ textAlign:"center", color:"#fff", zIndex:2, position:"relative" }}>
        <p style={{ fontWeight:800, fontSize:13, letterSpacing:1 }}>PT. FUMAKILLA INDONESIA</p>
        <p style={{ fontWeight:600, fontSize:11, opacity:.85 }}>Pest Control Department</p>
        <p style={{ fontSize:10, opacity:.7, fontStyle:"italic" }}>CIBIS 8 Building suite 02 - 6th floor, CIBIS Business Park</p>
        <p style={{ fontSize:10, opacity:.7, fontStyle:"italic" }}>Cilandak, Pasar Minggu, South Jakarta City, Jakarta</p>
      </div>
      <img src={FOOTER} alt="" style={{ position:"absolute", right:0, top:0, height:"100%", width:"auto", objectFit:"cover", opacity:.6 }} />
    </div>
  );
}

// ─── cover slide ──────────────────────────────────────────────────────────────
function CoverSlide({ report }: { report: Report }) {
  const clientName = report.customer.company || report.customer.name;
  const address = report.customer.address || "";
  return (
    <div style={{ width:"100%", aspectRatio:"16/9", background:"#fff", display:"flex", flexDirection:"column", boxShadow:"0 4px 24px rgba(0,0,0,.13)", borderRadius:8, overflow:"hidden", fontFamily:"sans-serif" }}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"40px 60px", position:"relative" }}>
        <img src={LOGO} alt="Fumakilla" style={{ position:"absolute", top:28, right:36, height:60, objectFit:"contain" }} />
        <p style={{ fontSize:38, fontWeight:900, letterSpacing:2, color:"#111", textAlign:"center", marginBottom:20 }}>PEST CONTROL REPORT</p>
        <p style={{ fontSize:16, fontStyle:"italic", color:"#555", marginBottom:16 }}>for</p>
        <p style={{ fontSize:26, fontWeight:800, color:"#111", textAlign:"center" }}>{clientName}</p>
        {address && <p style={{ fontSize:13, color:"#666", textAlign:"center", marginTop:6 }}>{address}</p>}
        <p style={{ fontSize:13, color:"#888", marginTop:10 }}>
          {MONTHS[(report.bulan - 1)]} {report.tahun}
          {report.customer.agreementNumber ? ` · No. ${report.customer.agreementNumber}` : ""}
        </p>
      </div>
      <SlideFooter />
    </div>
  );
}

// ─── bar chart ────────────────────────────────────────────────────────────────
function BarChart({ data, onChange, editing }: { data: ChartEntry[]; onChange: (d: ChartEntry[]) => void; editing: boolean }) {
  const maxV = Math.max(...data.map(d => d.nilai), 1);
  const BAR_W = 60; const CHART_H = 120; const GAP = 20;
  const totalW = data.length * (BAR_W + GAP) + GAP;
  const colors = ["#1a8cca","#0d5fa8","#23bfa0"];
  return (
    <div style={{ width:"100%" }}>
      <svg width="100%" viewBox={`0 0 ${totalW} ${CHART_H + 30}`} style={{ overflow:"visible" }}>
        {data.map((d,i) => {
          const bh = Math.round((d.nilai / maxV) * CHART_H);
          const x = GAP + i*(BAR_W+GAP);
          const y = CHART_H - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={BAR_W} height={bh} fill={colors[i % colors.length]} rx={4} />
              <text x={x+BAR_W/2} y={y-6} textAnchor="middle" fontSize={11} fill="#333" fontWeight={700}>{d.nilai}</text>
              <text x={x+BAR_W/2} y={CHART_H+14} textAnchor="middle" fontSize={10} fill="#555">{d.bulan||`Bln ${i+1}`}</text>
            </g>
          );
        })}
      </svg>
      {editing && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:8 }}>
          {data.map((d,i) => (
            <div key={i} style={{ display:"flex", gap:4 }}>
              <input value={d.bulan} onChange={e => { const n=[...data]; n[i]={...n[i],bulan:e.target.value}; onChange(n); }}
                placeholder="Bulan" className="input" style={{ fontSize:10, padding:"2px 4px", minHeight:24, width:60 }} />
              <input type="number" value={d.nilai} onChange={e => { const n=[...data]; n[i]={...n[i],nilai:Number(e.target.value)}; onChange(n); }}
                placeholder="0" className="input" style={{ fontSize:10, padding:"2px 4px", minHeight:24, width:50 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── photo box ────────────────────────────────────────────────────────────────
function PhotoBox({ label, photos, onAdd, onRemove, editing }: { label: string; photos: string[]; onAdd: (url: string) => void; onRemove: (i: number) => void; editing: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("photo", file);
      const r = await api.post("/erp/agreement-reports/upload-photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onAdd(r.data.url);
    } catch { alert("Gagal upload foto."); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ border:"1px solid #ccc", borderRadius:4, padding:6, display:"flex", flexDirection:"column", gap:4, background:"#fafafa", height:"100%", boxSizing:"border-box" }}>
      <p style={{ fontSize:10, color:"#555", fontWeight:600, textAlign:"center" }}>{label}</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, flex:1 }}>
        {photos.map((url,i) => (
          <div key={i} style={{ position:"relative", width:56, height:56 }}>
            <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:3 }} />
            {editing && (
              <button onClick={() => onRemove(i)} style={{ position:"absolute", top:-4, right:-4, background:"#ef4444", color:"#fff", border:"none", borderRadius:"50%", width:16, height:16, fontSize:10, cursor:"pointer", lineHeight:"16px" }}>×</button>
            )}
          </div>
        ))}
        {editing && !uploading && (
          <button onClick={() => fileRef.current?.click()} style={{ width:56, height:56, border:"2px dashed #9ca3af", borderRadius:3, background:"#f0f4ff", color:"#6b7280", fontSize:18, cursor:"pointer" }}>+</button>
        )}
        {uploading && <div style={{ width:56, height:56, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#6b7280" }}>...</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

// ─── pest slide ───────────────────────────────────────────────────────────────
function PestSlide({ pestName, pageIdx, data, onChange, editing }: { pestName: string; pageIdx: number; data: PestPageData; onChange: (d: PestPageData) => void; editing: boolean }) {
  const updPhotos = (key: keyof Pick<PestPageData,"photosTangkapan"|"photosPreventive"|"photosCorrective"|"photosRek">) => ({
    add: (url: string) => onChange({ ...data, [key]: [...data[key], url] }),
    remove: (i: number) => onChange({ ...data, [key]: data[key].filter((_,idx) => idx!==i) }),
  });
  const photos = [
    { label:"Foto Tangkapan", key:"photosTangkapan" as const },
    { label:"Foto Preventive Action", key:"photosPreventive" as const },
    { label:"Foto Corrective Action", key:"photosCorrective" as const },
    { label:"Foto Rekomendasi", key:"photosRek" as const },
  ];

  return (
    <div style={{ width:"100%", aspectRatio:"16/9", background:"#fff", display:"flex", flexDirection:"column", boxShadow:"0 4px 24px rgba(0,0,0,.13)", borderRadius:8, overflow:"hidden", fontFamily:"sans-serif" }}>
      {/* header */}
      <div style={{ padding:"14px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:"#111", margin:0 }}>{pestName}</h2>
          <div style={{ height:3, width:200, background:NAVY, marginTop:4 }} />
        </div>
        <img src={LOGO} alt="Fumakilla" style={{ height:48, objectFit:"contain" }} />
      </div>

      {/* body */}
      <div style={{ flex:1, display:"grid", gridTemplateRows:"1fr 1fr", padding:"8px 16px", gap:8, overflow:"hidden" }}>
        {/* row 1: canvas + chart */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, minHeight:0 }}>
          {/* canvas */}
          <div style={{ border:"1px solid #bbb", borderRadius:4, overflow:"hidden", position:"relative", minHeight:0 }}>
            <FloorPlanCanvas key={`canvas-agr-${pageIdx}`} initialData={data.layoutData}
              onChange={d => onChange({ ...data, layoutData:d })}
              width={400} height={200} readOnly={!editing} showRiskMarkers={true} />
            {!editing && !data.layoutData && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:11, pointerEvents:"none" }}>
                Masukkan layout dan beri tanda dimana lokasi tangkapannya
              </div>
            )}
          </div>
          {/* chart */}
          <div style={{ border:"1px solid #bbb", borderRadius:4, padding:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#f9fbff" }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#333", marginBottom:6, textAlign:"center", textDecoration:"underline" }}>
              Grafik Tangkapan<br/><span style={{ fontWeight:400 }}>(Sajikan data 3 bulan terakhir)</span>
            </p>
            <BarChart data={data.chartData} onChange={cd => onChange({ ...data, chartData:cd })} editing={editing} />
          </div>
        </div>

        {/* row 2: 4 photos + analysis */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, minHeight:0 }}>
          {/* 2x2 photo grid */}
          <div style={{ gridColumn:"span 2", display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr", gap:6 }}>
            {photos.map(ph => (
              <PhotoBox key={ph.key} label={ph.label} photos={data[ph.key]} onAdd={updPhotos(ph.key).add} onRemove={updPhotos(ph.key).remove} editing={editing} />
            ))}
          </div>
          {/* analysis */}
          <div style={{ border:"1px solid #bbb", borderRadius:4, padding:8, background:"#fafafa", overflow:"auto" }}>
            {editing ? (
              <div style={{ display:"flex", flexDirection:"column", gap:6, height:"100%" }}>
                {(["analisa","preventiveAction","correctiveAction","rekomendasi"] as const).map(key => {
                  const labels: Record<string,string> = { analisa:"Analisa", preventiveAction:"Preventive Action", correctiveAction:"Corrective Action", rekomendasi:"Rekomendasi" };
                  return (
                    <div key={key}>
                      <p style={{ fontSize:10, fontWeight:700, color:NAVY }}>• {labels[key]} :</p>
                      <textarea value={data[key]} onChange={e => onChange({ ...data, [key]:e.target.value })}
                        rows={2} className="input" style={{ fontSize:10, padding:"2px 4px", minHeight:28, resize:"vertical", width:"100%", boxSizing:"border-box" }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize:11, lineHeight:1.6 }}>
                {[{ k:"analisa", l:"Analisa" },{ k:"preventiveAction", l:"Preventive Action" },{ k:"correctiveAction", l:"Corrective Action" },{ k:"rekomendasi", l:"Rekomendasi" }].map(({ k,l }) => (
                  <p key={k} style={{ marginBottom:4 }}><strong>• {l} :</strong><br />{(data as any)[k] || <span style={{ color:"#aaa" }}>......</span>}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SlideFooter />
    </div>
  );
}

// ─── rekomendasi slide ────────────────────────────────────────────────────────
function RekomendasiSlide({ items, onChange, editing }: { items: RekItem[]; onChange: (r: RekItem[]) => void; editing: boolean }) {
  const addRow = () => onChange([...items, defaultRekItem()]);
  const removeRow = (id: string) => onChange(items.filter(r => r.id !== id));
  const update = (id: string, field: keyof RekItem, val: string) => onChange(items.map(r => r.id === id ? { ...r, [field]: val } : r));
  const TEAL = "#0d7fa5";
  const cols = ["No","Tanggal Temuan","Potensi Hama","Area","Rekomendasi","Dokumentasi","Tanggal Closing","Dokumentasi Closing"];
  const fields: (keyof RekItem)[] = ["tanggalTemuan","potensiHama","area","rekomendasi","dokumentasi","tanggalClosing","dokumentasiClosing"];

  return (
    <div style={{ width:"100%", aspectRatio:"16/9", background:"#fff", display:"flex", flexDirection:"column", boxShadow:"0 4px 24px rgba(0,0,0,.13)", borderRadius:8, overflow:"hidden", fontFamily:"sans-serif" }}>
      <div style={{ padding:"14px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:"#111", textDecoration:"underline", margin:0 }}>Rekomendasi</h2>
          <div style={{ height:3, width:200, background:NAVY, marginTop:4 }} />
        </div>
        <img src={LOGO} alt="Fumakilla" style={{ height:48, objectFit:"contain" }} />
      </div>

      <div style={{ flex:1, overflow:"auto", padding:"8px 16px" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{ background:TEAL, color:"#fff", padding:"6px 8px", textAlign:"center", fontWeight:700, border:"1px solid #0a6b8a", fontSize:11 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={row.id} style={{ background: i%2===0 ? "#e8f4fa" : "#fff" }}>
                <td style={{ padding:"4px 8px", textAlign:"center", border:"1px solid #ddd", position:"relative" }}>
                  {i+1}
                  {editing && <button onClick={() => removeRow(row.id)} style={{ position:"absolute", top:2, right:2, background:"#ef4444", color:"#fff", border:"none", borderRadius:"50%", width:14, height:14, fontSize:9, cursor:"pointer", lineHeight:"14px" }}>×</button>}
                </td>
                {fields.map(f => (
                  <td key={f} style={{ padding:"4px 8px", border:"1px solid #ddd" }}>
                    {editing
                      ? <input value={row[f]} onChange={e => update(row.id, f, e.target.value)} className="input" style={{ fontSize:10, padding:"2px 4px", minHeight:22, width:"100%", boxSizing:"border-box" }} />
                      : <span>{row[f] || <span style={{ color:"#ddd" }}>-</span>}</span>}
                  </td>
                ))}
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={cols.length} style={{ padding:16, textAlign:"center", color:"#aaa", border:"1px solid #ddd" }}>Belum ada data</td></tr>
            )}
          </tbody>
        </table>
        {editing && (
          <button onClick={addRow} style={{ marginTop:8, padding:"4px 14px", background:TEAL, color:"#fff", border:"none", borderRadius:4, fontSize:12, cursor:"pointer" }}>+ Tambah Baris</button>
        )}
      </div>

      <SlideFooter />
    </div>
  );
}

// ─── penutup slide ────────────────────────────────────────────────────────────
function PenutupSlide() {
  return (
    <div style={{ width:"100%", aspectRatio:"16/9", background:"#fff", display:"flex", flexDirection:"column", boxShadow:"0 4px 24px rgba(0,0,0,.13)", borderRadius:8, overflow:"hidden", fontFamily:"sans-serif" }}>
      <div style={{ flex:1, display:"flex", position:"relative", overflow:"hidden" }}>
        {/* diagonal photo strips left */}
        <div style={{ width:"45%", position:"relative", overflow:"hidden" }}>
          <img src={FOOTER} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,.15)" }} />
        </div>
        {/* right panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-start", padding:"40px 48px", background:"#fff" }}>
          <img src={LOGO} alt="Fumakilla" style={{ height:60, objectFit:"contain", marginBottom:24 }} />
          <div style={{ background:NAVY, padding:"28px 36px", borderRadius:6 }}>
            <p style={{ color:"#fff", fontSize:32, fontWeight:800, margin:0 }}>Thank you</p>
            <p style={{ color:"rgba(255,255,255,.8)", fontSize:18, margin:"8px 0 12px", fontFamily:"serif" }}>どうもありがとうございました</p>
            <p style={{ color:"rgba(255,255,255,.65)", fontSize:12, fontStyle:"italic" }}>We&apos;re looking forward to have collaboration with you</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function AgreementReportEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const [editing, setEditing] = useState(false);

  const [pagesData, setPagesData] = useState<PestPageData[]>(PEST_TYPES.map(() => defaultPestPage()));
  const [rekData, setRekData] = useState<RekItem[]>([]);

  useEffect(() => {
    api.get(`/erp/agreement-reports/${id}`).then(r => {
      const rep: Report = r.data;
      setReport(rep);
      if (Array.isArray(rep.pagesData) && rep.pagesData.length === PEST_TYPES.length) {
        setPagesData(rep.pagesData as PestPageData[]);
      }
      if (Array.isArray(rep.rekData)) setRekData(rep.rekData as RekItem[]);
    }).catch(() => alert("Gagal memuat laporan.")).finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    setSaving(true);
    try { await api.patch(`/erp/agreement-reports/${id}`, { pagesData, rekData }); }
    catch { alert("Gagal menyimpan."); }
    finally { setSaving(false); }
  };

  const updatePage = (i: number, data: PestPageData) => { const n=[...pagesData]; n[i]=data; setPagesData(n); };

  if (loading) return <div className="p-8"><Loading /></div>;
  if (!report) return <div className="p-8 text-red-500">Laporan tidak ditemukan.</div>;

  const pestIdx = pageIdx - 1; // 0-5 for pest pages

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"sans-serif" }}>
      {/* topbar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"12px 24px", display:"flex", gap:12, alignItems:"center", position:"sticky", top:0, zIndex:20 }}>
        <a href="/agreements" style={{ color:NAVY, textDecoration:"none", fontWeight:700, fontSize:13 }}>← Kembali</a>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:800, fontSize:14, color:NAVY, margin:0 }}>
            Agreement Report — {report.customer.company || report.customer.name}
          </p>
          <p style={{ fontSize:11, color:"#6b7280", margin:0 }}>{MONTHS[report.bulan-1]} {report.tahun}{report.customer.agreementNumber ? ` · No. ${report.customer.agreementNumber}` : ""}</p>
        </div>
        <button onClick={() => setEditing(e => !e)} style={{ padding:"6px 16px", borderRadius:6, border:`1px solid ${NAVY}`, background: editing?"#eff6ff":"transparent", color:NAVY, fontWeight:700, fontSize:12, cursor:"pointer" }}>
          {editing ? "Mode Edit ✓" : "Edit"}
        </button>
        <button onClick={save} disabled={saving} style={{ padding:"6px 16px", borderRadius:6, background:NAVY, color:"#fff", fontWeight:700, fontSize:12, border:"none", cursor:"pointer", opacity:saving?.7:1 }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <div style={{ display:"flex", gap:0, minHeight:"calc(100vh - 57px)" }}>
        {/* sidebar nav */}
        <div style={{ width:160, background:"#fff", borderRight:"1px solid #e2e8f0", padding:"12px 8px", flexShrink:0, overflowY:"auto" }}>
          {PAGE_NAMES.map((name, i) => (
            <button key={i} onClick={() => setPageIdx(i)}
              style={{ width:"100%", textAlign:"left", padding:"8px 10px", marginBottom:4, borderRadius:6, border:"none", background: pageIdx===i ? NAVY : "transparent", color: pageIdx===i ? "#fff" : "#374151", fontWeight: pageIdx===i ? 700 : 400, fontSize:12, cursor:"pointer", transition:"all .15s" }}>
              {i === 0 ? "📋 " : i >= 7 ? (i===7?"📊 ":"👋 ") : `${i}. `}{name}
            </button>
          ))}
        </div>

        {/* slide area */}
        <div style={{ flex:1, padding:"24px 32px", overflowY:"auto" }}>
          <div style={{ maxWidth:900, margin:"0 auto" }}>
            {pageIdx === 0 && <CoverSlide report={report} />}
            {pageIdx >= 1 && pageIdx <= 6 && (
              <PestSlide key={`pest-${pestIdx}`} pestName={PEST_TYPES[pestIdx]} pageIdx={pestIdx}
                data={pagesData[pestIdx]} onChange={d => updatePage(pestIdx, d)} editing={editing} />
            )}
            {pageIdx === 7 && <RekomendasiSlide items={rekData} onChange={setRekData} editing={editing} />}
            {pageIdx === 8 && <PenutupSlide />}
          </div>
        </div>
      </div>
    </div>
  );
}
