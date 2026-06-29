"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { fileUrl } from "@/lib/utils";
import { Loading } from "@/components/erp/shared";

/* â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface PestSection {
  pestType: string;
  findings: string[];
  pestFact: string[];
  photoDescriptions: { path: string; caption: string }[];
}
interface ResumeRow { pest: string; resume: string; rekomendasi: string }
interface ReportData {
  clientName: string;
  clientAddress: string;
  surveyorNames: string;
  surveyDate: string;
  generalNotes: string[];
  areaCondition: string;
  environmentalRisks: string[];
  pestConcern: string;
  inspectionFocus: string;
  pestSections: PestSection[];
  resumeRows: ResumeRow[];
}

/* â”€â”€â”€ Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const BLUE = "#1a4d8c";
const LIGHT_BLUE = "#e8f0fb";

/* â”€â”€â”€ Shared Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SlideHeader() {
  return (
    <img src="/refrence/Footer.png" alt="PT. Fumakilla Indonesia" style={{ width: "100%", display: "block" }} />
  );
}

function SlideFooter() {
  return (
    <div style={{ background: BLUE, color: "#fff", padding: "6px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", marginTop: "auto" }}>
      <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: "22px", objectFit: "contain" }} />
      <span style={{ fontWeight: 600 }}>Pest Control Report | PT. Fumakilla Indonesia</span>
    </div>
  );
}

function Slide({ children, minHeight = "500px" }: { children: React.ReactNode; minHeight?: string }) {
  return (
    <div style={{ width: "960px", background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,.18)", fontFamily: "Inter, Arial, sans-serif", fontSize: "13px", display: "flex", flexDirection: "column", minHeight }}>
      <SlideHeader />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      <SlideFooter />
    </div>
  );
}

function SlideTitle({ title }: { title: string }) {
  return (
    <div style={{ background: BLUE, padding: "12px 24px" }}>
      <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px", letterSpacing: ".03em" }}>{title}</span>
    </div>
  );
}

/* â”€â”€â”€ Editable helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BulletEditor({ items, onChange, placeholder = "Tambah poin..." }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const upd = (i: number, v: string) => { const a = [...items]; a[i] = v; onChange(a); };
  const del = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
          <span style={{ color: BLUE, fontWeight: 800, marginTop: "8px" }}>â€¢</span>
          <input value={item} onChange={e => upd(i, e.target.value)} placeholder={placeholder}
            style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", fontFamily: "inherit" }} />
          <button onClick={() => del(i)} style={{ marginTop: "5px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>âœ•</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} style={{ fontSize: "11px", color: BLUE, background: "none", border: "none", cursor: "pointer", textAlign: "left", marginTop: "2px" }}>+ Tambah poin</button>
    </div>
  );
}

/* â”€â”€â”€ Page components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* Slide 1 - Cover */
function SlideCover({ data, editMode, setData }: { data: ReportData; editMode: boolean; setData: (d: ReportData) => void }) {
  return (
    <div style={{ width: "960px", background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,.18)", fontFamily: "Inter, Arial, sans-serif", display: "flex", flexDirection: "column" }}>
      <img src="/refrence/Footer.png" alt="PT. Fumakilla Indonesia" style={{ width: "100%", display: "block" }} />
      <div style={{ flex: 1, display: "flex", minHeight: "420px" }}>
        {/* Left blue strip */}
        <div style={{ width: "280px", background: BLUE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: "16px" }}>
          <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ width: "150px", objectFit: "contain" }} />
          <div style={{ textAlign: "center", color: "#fff" }}>
            <p style={{ fontWeight: 800, fontSize: "14px", letterSpacing: ".04em" }}>PT. FUMAKILLA INDONESIA</p>
            <p style={{ fontSize: "11px", marginTop: "6px", color: "#cde" }}>Pest Control Department</p>
            <p style={{ fontSize: "10px", marginTop: "8px", lineHeight: 1.7, color: "#cde" }}>
              CIBIS 8 Building, Suite 02 â€“ 6th Floor<br />
              CIBIS Business Park, Cilandak<br />
              Pasar Minggu, South Jakarta
            </p>
          </div>
        </div>

        {/* Right: content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 36px", gap: "16px" }}>
          <div style={{ display: "inline-block", background: BLUE, color: "#fff", padding: "5px 14px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, letterSpacing: ".1em", marginBottom: "4px" }}>
            PEST CONTROL REPORT
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: BLUE, lineHeight: 1.2 }}>
            LAPORAN HASIL SURVEY
          </h1>
          <div style={{ width: "60px", height: "4px", background: BLUE, borderRadius: "2px" }} />

          {editMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#374151" }}>
                Nama Klien
                <input value={data.clientName} onChange={e => setData({ ...data, clientName: e.target.value })}
                  style={{ display: "block", width: "100%", marginTop: "4px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "5px 8px", fontSize: "13px", fontFamily: "inherit" }} />
              </label>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#374151" }}>
                Alamat Lengkap
                <textarea value={data.clientAddress} onChange={e => setData({ ...data, clientAddress: e.target.value })}
                  rows={2} style={{ display: "block", width: "100%", marginTop: "4px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", fontFamily: "inherit", resize: "vertical" }} />
              </label>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", letterSpacing: ".06em", marginBottom: "4px" }}>DIPERUNTUKKAN KEPADA:</p>
              <p style={{ fontSize: "20px", fontWeight: 800, color: BLUE }}>{data.clientName || "â€” Nama Klien â€”"}</p>
              <p style={{ fontSize: "12px", color: "#4B5563", marginTop: "6px", lineHeight: 1.7 }}>{data.clientAddress || "â€”"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Slide 2 - Survey Info */
function SlideSurveyInfo({ data, editMode, setData }: { data: ReportData; editMode: boolean; setData: (d: ReportData) => void }) {
  return (
    <Slide>
      <SlideTitle title="Survey Information" />
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", letterSpacing: ".08em", marginBottom: "4px" }}>SURVEYOR</p>
            {editMode
              ? <input value={data.surveyorNames} onChange={e => setData({ ...data, surveyorNames: e.target.value })}
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", fontFamily: "inherit" }} />
              : <p style={{ fontWeight: 600, fontSize: "13px" }}>{data.surveyorNames || "â€”"}</p>
            }
          </div>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", letterSpacing: ".08em", marginBottom: "4px" }}>TANGGAL SURVEY</p>
            {editMode
              ? <input type="date" value={data.surveyDate} onChange={e => setData({ ...data, surveyDate: e.target.value })}
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", fontFamily: "inherit" }} />
              : <p style={{ fontWeight: 600, fontSize: "13px" }}>{data.surveyDate ? new Date(data.surveyDate).toLocaleDateString("id-ID", { dateStyle: "long" }) : "â€”"}</p>
            }
          </div>
        </div>

        <div>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", letterSpacing: ".08em", marginBottom: "8px" }}>GENERAL NOTES</p>
          {editMode
            ? <BulletEditor items={data.generalNotes} onChange={v => setData({ ...data, generalNotes: v })} placeholder="Catatan survei..." />
            : <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {data.generalNotes.map((note, i) => (
                  <li key={i} style={{ display: "flex", gap: "8px", fontSize: "12px", lineHeight: 1.7 }}>
                    <span style={{ color: BLUE, fontWeight: 800, flexShrink: 0 }}>â€¢</span>
                    <span>{note}</span>
                  </li>
                ))}
                {!data.generalNotes.length && <li style={{ fontSize: "12px", color: "#9CA3AF" }}>Belum ada catatan.</li>}
              </ul>
          }
        </div>
      </div>
    </Slide>
  );
}

/* Slide 3 - Environment Fact 1 */
function SlideEnvFact1({ data, editMode, setData }: { data: ReportData; editMode: boolean; setData: (d: ReportData) => void }) {
  return (
    <Slide>
      <SlideTitle title="Environment Fact" />
      <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, color: BLUE, marginBottom: "8px" }}>Kondisi Area :</p>
          {editMode
            ? <textarea value={data.areaCondition} onChange={e => setData({ ...data, areaCondition: e.target.value })} rows={3}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "8px", fontSize: "12px", fontFamily: "inherit", resize: "vertical" }} />
            : <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.8 }}>{data.areaCondition || "â€”"}</p>
          }
        </div>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, color: BLUE, marginBottom: "8px" }}>Key Environmental Risk:</p>
          {editMode
            ? <BulletEditor items={data.environmentalRisks} onChange={v => setData({ ...data, environmentalRisks: v })} placeholder="Faktor risiko lingkungan..." />
            : <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {data.environmentalRisks.map((risk, i) => (
                  <li key={i} style={{ display: "flex", gap: "8px", fontSize: "12px", lineHeight: 1.7 }}>
                    <span style={{ color: BLUE, fontWeight: 800, flexShrink: 0 }}>â€¢</span>
                    <span>{risk}</span>
                  </li>
                ))}
                {!data.environmentalRisks.length && <li style={{ fontSize: "12px", color: "#9CA3AF" }}>Belum ada data.</li>}
              </ul>
          }
        </div>
        {(data.pestConcern || editMode) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: BLUE, marginBottom: "6px" }}>Pest Concern:</p>
              {editMode
                ? <textarea value={data.pestConcern} onChange={e => setData({ ...data, pestConcern: e.target.value })} rows={2}
                    style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "inherit", resize: "vertical" }} />
                : <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.7 }}>{data.pestConcern}</p>
              }
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: BLUE, marginBottom: "6px" }}>Inspection Focus:</p>
              {editMode
                ? <textarea value={data.inspectionFocus} onChange={e => setData({ ...data, inspectionFocus: e.target.value })} rows={2}
                    style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "inherit", resize: "vertical" }} />
                : <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.7 }}>{data.inspectionFocus}</p>
              }
            </div>
          </div>
        )}
      </div>
    </Slide>
  );
}

/* Slide 4 - Pest Risk Mapping */
function SlidePestRiskMapping() {
  const rows = [
    { marker: "ðŸ”´", level: "High Risk", desc: "Active pest evidence / critical condition", action: "Immediate action" },
    { marker: "ðŸŸ¡", level: "Medium Risk", desc: "Potential pest risk / supporting condition found", action: "Corrective action" },
    { marker: "ðŸŸ¢", level: "Low Risk", desc: "Controlled condition / routine monitoring required", action: "Monitoring" },
  ];
  return (
    <Slide>
      <SlideTitle title="Pest Risk Mapping" />
      <div style={{ padding: "24px", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: BLUE, color: "#fff" }}>
              {["Marker", "Level", "Description", "Action"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.level} style={{ background: i % 2 === 0 ? LIGHT_BLUE : "#fff", borderBottom: "1px solid #d1d5db" }}>
                <td style={{ padding: "14px", fontSize: "20px" }}>{row.marker}</td>
                <td style={{ padding: "14px", fontWeight: 700, color: BLUE }}>{row.level}</td>
                <td style={{ padding: "14px", color: "#374151" }}>{row.desc}</td>
                <td style={{ padding: "14px", fontWeight: 600, color: "#374151" }}>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Slide>
  );
}

/* Slide 5+ - Pest Section */
function SlidePestSection({
  section, editMode, surveyId, onChange,
}: {
  section: PestSection; editMode: boolean; surveyId: string; onChange: (s: PestSection) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const uploadPhoto = async (file: File) => {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await api.post(`/b2b-report/${surveyId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange({ ...section, photoDescriptions: [...section.photoDescriptions, { path: res.data.data.path, caption: "" }] });
    } finally { setUploading(false); }
  };

  return (
    <Slide>
      <div style={{ display: "flex", gap: "0", flex: 1 }}>
        {/* Left: title + photos */}
        <div style={{ width: "320px", background: BLUE, display: "flex", flexDirection: "column", padding: "20px 16px", gap: "12px" }}>
          <p style={{ color: "#fff", fontWeight: 900, fontSize: "20px" }}>{section.pestType}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {section.photoDescriptions.map((photo, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "8px", overflow: "hidden" }}>
                <img src={fileUrl(photo.path)} alt={photo.caption || `Foto ${i + 1}`} style={{ width: "100%", height: "100px", objectFit: "cover", display: "block" }} />
                {photo.caption && <p style={{ padding: "4px 8px", fontSize: "10px", color: "#374151" }}>{photo.caption}</p>}
                {editMode && (
                  <button
                    onClick={() => onChange({ ...section, photoDescriptions: section.photoDescriptions.filter((_, j) => j !== i) })}
                    style={{ fontSize: "10px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "2px 8px" }}>Hapus</button>
                )}
              </div>
            ))}
            {editMode && (
              <label style={{ cursor: "pointer", border: "2px dashed rgba(255,255,255,.5)", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                {uploading ? <span style={{ fontSize: "11px", color: "#cde" }}>Mengupload...</span> : (
                  <div>
                    <p style={{ fontSize: "20px" }}>ðŸ“·</p>
                    <p style={{ fontSize: "11px", color: "#cde" }}>Upload foto</p>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
              </label>
            )}
          </div>
        </div>

        {/* Right: findings */}
        <div style={{ flex: 1, padding: "20px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: BLUE, marginBottom: "8px" }}>Hasil Survey :</p>
            {editMode
              ? <BulletEditor items={section.findings} onChange={v => onChange({ ...section, findings: v })} placeholder="Temuan survei..." />
              : <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {section.findings.map((f, i) => (
                    <li key={i} style={{ display: "flex", gap: "8px", fontSize: "12px", lineHeight: 1.7 }}>
                      <span style={{ color: BLUE, fontWeight: 800, flexShrink: 0 }}>â€¢</span>
                      <span>{f}</span>
                    </li>
                  ))}
                  {!section.findings.length && <li style={{ fontSize: "12px", color: "#9CA3AF" }}>Belum ada temuan.</li>}
                </ul>
            }
          </div>
          {(section.pestFact.length > 0 || editMode) && (
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: BLUE, marginBottom: "8px" }}>{section.pestType} Fact :</p>
              {editMode
                ? <BulletEditor items={section.pestFact} onChange={v => onChange({ ...section, pestFact: v })} placeholder="Fakta tambahan..." />
                : <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {section.pestFact.map((f, i) => (
                      <li key={i} style={{ display: "flex", gap: "8px", fontSize: "12px", lineHeight: 1.7 }}>
                        <span style={{ color: BLUE, fontWeight: 800, flexShrink: 0 }}>â€¢</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
              }
            </div>
          )}
        </div>
      </div>
    </Slide>
  );
}

/* Slide - Resume */
function SlideResume({ data, editMode, setData }: { data: ReportData; editMode: boolean; setData: (d: ReportData) => void }) {
  const addRow = () => setData({ ...data, resumeRows: [...data.resumeRows, { pest: "", resume: "", rekomendasi: "" }] });
  const delRow = (i: number) => setData({ ...data, resumeRows: data.resumeRows.filter((_, j) => j !== i) });
  const updRow = (i: number, k: keyof ResumeRow, v: string) => setData({ ...data, resumeRows: data.resumeRows.map((r, j) => j === i ? { ...r, [k]: v } : r) });

  return (
    <Slide>
      <SlideTitle title="Resume" />
      <div style={{ padding: "16px 20px", flex: 1, overflowX: "auto" }}>
        {editMode && (
          <button onClick={addRow} style={{ background: BLUE, color: "#fff", border: "none", padding: "5px 14px", borderRadius: "6px", fontWeight: 700, fontSize: "11px", cursor: "pointer", marginBottom: "10px" }}>
            + Tambah Baris
          </button>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr style={{ background: BLUE, color: "#fff" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, width: "80px" }}>No</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, width: "130px" }}>Hama</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700 }}>Resume</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700 }}>Rekomendasi</th>
              {editMode && <th style={{ padding: "8px", width: "40px" }}></th>}
            </tr>
          </thead>
          <tbody>
            {data.resumeRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? LIGHT_BLUE : "#fff", borderBottom: "1px solid #d1d5db", verticalAlign: "top" }}>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: BLUE }}>{i + 1}</td>
                <td style={{ padding: editMode ? "6px" : "10px 12px", fontWeight: 600 }}>
                  {editMode
                    ? <input value={row.pest} onChange={e => updRow(i, "pest", e.target.value)} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 6px", fontSize: "11px", fontFamily: "inherit" }} />
                    : row.pest
                  }
                </td>
                <td style={{ padding: editMode ? "6px" : "10px 12px", lineHeight: 1.7 }}>
                  {editMode
                    ? <textarea value={row.resume} onChange={e => updRow(i, "resume", e.target.value)} rows={3} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 6px", fontSize: "11px", fontFamily: "inherit", resize: "vertical" }} />
                    : row.resume
                  }
                </td>
                <td style={{ padding: editMode ? "6px" : "10px 12px", lineHeight: 1.7 }}>
                  {editMode
                    ? <textarea value={row.rekomendasi} onChange={e => updRow(i, "rekomendasi", e.target.value)} rows={3} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 6px", fontSize: "11px", fontFamily: "inherit", resize: "vertical" }} />
                    : row.rekomendasi
                  }
                </td>
                {editMode && (
                  <td style={{ padding: "6px", textAlign: "center" }}>
                    <button onClick={() => delRow(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "4px", padding: "3px 7px", cursor: "pointer", fontSize: "12px" }}>Ã—</button>
                  </td>
                )}
              </tr>
            ))}
            {!data.resumeRows.length && (
              <tr><td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "#9CA3AF" }}>
                {editMode ? "Klik '+ Tambah Baris' untuk menambahkan data resume." : "Belum ada data resume."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Slide>
  );
}

/* Slide - Thank You */
function SlideThankYou() {
  return (
    <div style={{ width: "960px", fontFamily: "Inter, Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}>
      <img src="/refrence/Footer.png" alt="PT. Fumakilla Indonesia" style={{ width: "100%", display: "block" }} />
      <div style={{ background: BLUE, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", minHeight: "360px" }}>
        <img src="/refrence/Header.jpg" alt="Fumakilla" style={{ height: "90px", objectFit: "contain", marginBottom: "20px" }} />
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#cde", letterSpacing: ".2em", marginBottom: "8px" }}>ã©ã†ã‚‚ã‚ã‚ŠãŒã¨ã†ã”ã–ã„ã¾ã—ãŸ</p>
        <h1 style={{ fontSize: "40px", fontWeight: 900, color: "#fff", marginBottom: "10px" }}>Thank You</h1>
        <p style={{ fontSize: "13px", color: "#cde", textAlign: "center", lineHeight: 1.8 }}>
          We appreciate your trust in Fumakilla Indonesia.<br />
          Together we create a safer, pest-free environment.
        </p>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PAGE_LABELS = ["Cover", "Survey Info", "Environment Fact", "Pest Risk Mapping"];
const STATIC_PAGES = 4;
const THANK_YOU_OFFSET = 1;

export default function B2CReportBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [surveyInfo, setSurveyInfo] = useState<any>(null);

  const defaultData: ReportData = {
    clientName: "", clientAddress: "",
    surveyorNames: "", surveyDate: "",
    generalNotes: [], areaCondition: "",
    environmentalRisks: [], pestConcern: "",
    inspectionFocus: "",
    pestSections: [], resumeRows: [],
  };
  const [data, setData] = useState<ReportData>(defaultData);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/erp/surveys/${surveyId}`);
        const survey = res.data;
        setSurveyInfo(survey);
        const issues: any[] = Array.isArray(survey.b2cIssues) ? survey.b2cIssues : [];
        const findings: any[] = Array.isArray(survey.b2cPestFindings) ? survey.b2cPestFindings : [];
        const pestSections: PestSection[] = issues
          .filter((iss: any) => (typeof iss === "string" ? iss : iss?.name))
          .map((iss: any) => {
            const name = typeof iss === "string" ? iss : iss.name;
            const photosForPest = findings.filter((f: any) => f.filePath && (!f.description || f.description.toLowerCase().includes(name.toLowerCase())));
            return { pestType: name, findings: [], pestFact: [], photoDescriptions: photosForPest.map((f: any) => ({ path: f.filePath, caption: f.description || "" })) };
          });
        if (pestSections.length === 0 && findings.some((f: any) => f.filePath)) {
          pestSections.push({ pestType: "Temuan Hama", findings: [], pestFact: [], photoDescriptions: findings.filter((f: any) => f.filePath).map((f: any) => ({ path: f.filePath, caption: f.description || "" })) });
        }
        const resumeRows: ResumeRow[] = issues
          .filter((iss: any) => (typeof iss === "string" ? iss : iss?.name))
          .map((iss: any) => ({ pest: typeof iss === "string" ? iss : iss.name, resume: "", rekomendasi: "" }));

        setData(d => ({
          ...d,
          clientName: survey.customer?.name || "",
          clientAddress: survey.location || "",
          surveyorNames: survey.picAssignments?.length
            ? survey.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ")
            : (survey.pic?.name || ""),
          surveyDate: survey.scheduledAt ? survey.scheduledAt.slice(0, 10) : "",
          generalNotes: Array.isArray(survey.b2cPointNotes) ? survey.b2cPointNotes.filter(Boolean) : [],
          pestConcern: Array.isArray(survey.b2cIssues) ? survey.b2cIssues.map((i: any) => typeof i === "string" ? i : i.name).join(", ") : "",
          pestSections,
          resumeRows,
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  const totalPages = STATIC_PAGES + data.pestSections.length + 2; // +resume +thankyou

  const updSection = (i: number, s: PestSection) =>
    setData(d => ({ ...d, pestSections: d.pestSections.map((sec, j) => j === i ? s : sec) }));

  const addPestSection = () =>
    setData(d => ({ ...d, pestSections: [...d.pestSections, { pestType: "Hama Baru", findings: [], pestFact: [], photoDescriptions: [] }] }));

  const delPestSection = (i: number) =>
    setData(d => ({ ...d, pestSections: d.pestSections.filter((_, j) => j !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/b2c-report/${surveyId}`, data);
      setEditMode(false);
      setSaveMsg("Tersimpan!");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (e: any) {
      alert(e.response?.data?.error || "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const pageLabels = [
    ...PAGE_LABELS,
    ...data.pestSections.map(s => s.pestType),
    "Resume",
    "Thank You",
  ];

  const renderPage = () => {
    if (activePage === 1) return <SlideCover data={data} editMode={editMode} setData={setData} />;
    if (activePage === 2) return <SlideSurveyInfo data={data} editMode={editMode} setData={setData} />;
    if (activePage === 3) return <SlideEnvFact1 data={data} editMode={editMode} setData={setData} />;
    if (activePage === 4) return <SlidePestRiskMapping />;
    const pestIdx = activePage - STATIC_PAGES - 1;
    if (pestIdx >= 0 && pestIdx < data.pestSections.length) {
      return <SlidePestSection section={data.pestSections[pestIdx]} editMode={editMode} surveyId={surveyId} onChange={s => updSection(pestIdx, s)} />;
    }
    if (activePage === STATIC_PAGES + data.pestSections.length + 1) return <SlideResume data={data} editMode={editMode} setData={setData} />;
    if (activePage === totalPages) return <SlideThankYou />;
    return null;
  };

  if (loading) return <div className="p-9"><Loading /></div>;

  const isThankYou = activePage === totalPages;
  const isStaticPage = activePage === 4 || isThankYou;
  const canEdit = !isStaticPage;

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]" style={{ display: "flex", overflow: "hidden", fontFamily: "Inter, Arial, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: "200px", borderRight: "1px solid #d9ddeb", background: "#f2f3fd", display: "flex", flexDirection: "column", overflow: "hidden" }} className="print:hidden">
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #d9ddeb" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#6a7180", letterSpacing: ".1em" }}>HALAMAN</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {pageLabels.map((label, i) => (
            <button key={i} onClick={() => { setActivePage(i + 1); setEditMode(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: "7px", border: "none",
                background: activePage === i + 1 ? BLUE : "transparent",
                color: activePage === i + 1 ? "#fff" : "#515866",
                fontSize: "11px", fontWeight: activePage === i + 1 ? 700 : 500,
                cursor: "pointer", marginBottom: "2px",
              }}>
              <span style={{ fontWeight: 800, marginRight: "5px", opacity: .7 }}>{i + 1}.</span>
              {label}
            </button>
          ))}
          {editMode && activePage > STATIC_PAGES && activePage <= STATIC_PAGES + data.pestSections.length && (
            <button onClick={() => { delPestSection(activePage - STATIC_PAGES - 1); setActivePage(Math.max(1, activePage - 1)); }}
              style={{ marginTop: "6px", width: "100%", background: "#fee2e2", color: "#dc2626", border: "none", padding: "5px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>
              Hapus Seksi Ini
            </button>
          )}
          {editMode && (
            <button onClick={() => { addPestSection(); setActivePage(STATIC_PAGES + data.pestSections.length); }}
              style={{ marginTop: "6px", width: "100%", background: LIGHT_BLUE, color: BLUE, border: `1px solid ${BLUE}`, padding: "5px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>
              + Tambah Seksi
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ borderBottom: "1px solid #d9ddeb", padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px", background: "#fff", flexShrink: 0 }} className="print:hidden">
          <button onClick={() => router.back()} style={{ color: BLUE, fontWeight: 700, fontSize: "13px", background: "none", border: "none", cursor: "pointer" }}>â† Kembali</button>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: "14px", color: BLUE }}>Report After Survey B2C</p>
            <p style={{ fontSize: "11px", color: "#6a7180" }}>{surveyInfo?.customer?.name || "â€”"} Â· {surveyInfo?.number || ""}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => setActivePage(p => Math.max(1, p - 1))} disabled={activePage === 1} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>â† Prev</button>
            <span style={{ fontSize: "12px", fontWeight: 600, minWidth: "90px", textAlign: "center" }}>Hal {activePage} / {totalPages}</span>
            <button onClick={() => setActivePage(p => Math.min(totalPages, p + 1))} disabled={activePage === totalPages} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Next â†’</button>
            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)} className="btn" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px", borderColor: BLUE, color: BLUE }}>âœï¸ Edit</button>
            )}
            {editMode && (
              <>
                <button onClick={() => setEditMode(false)} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Batal</button>
                <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px", background: BLUE, borderColor: BLUE }}>
                  {saving ? "Menyimpan..." : "ðŸ’¾ Simpan"}
                </button>
              </>
            )}
            {saveMsg && <span style={{ color: "#16713b", fontWeight: 700, fontSize: "12px" }}>âœ“ {saveMsg}</span>}
            <button onClick={() => window.print()} className="btn" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px" }}>ðŸ–¨ï¸ Cetak</button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", display: "flex", justifyContent: "center", padding: "32px 24px" }} className="print:p-0 print:bg-white print:block">
          {renderPage()}
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
