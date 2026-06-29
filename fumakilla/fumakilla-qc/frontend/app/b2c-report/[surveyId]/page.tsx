"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loading } from "@/components/erp/shared";

const BLUE = "#1a4d8c";
const ORANGE = "#e06b28";

/* ─── Types ─────────────────────────────────────── */
type ServiceArea = { lantai: string; fungsiArea: string };
type IsuPest = { jenisPest: string; areaTemuan: string; keterangan: string };
type MonitoringUnit = { unit: string; jumlah: string; fungsi: string };
type TreatmentRow = { treatment: string; targetPest: string; keterangan: string };

interface B2CDoc {
  ringkasan: string;
  customerName: string;
  jenisBangunan: string;
  estimasiLuas: string;
  jumlahLantai: string;
  pestControlExisting: string;
  vendorDigunakan: string;
  serviceDesignArea: ServiceArea[];
  isuPest: IsuPest[];
  temuanSurvey: string[];
  rekMonitoring: MonitoringUnit[];
  rekTreatment: TreatmentRow[];
  jumlahVisit: string;
  jadwalTreatment: string;
  hargaService: string;
  catatanPIC: string[];
  kesimpulan: string;
  disiapkanOleh: string;
}

const DEFAULT_DOC: B2CDoc = {
  ringkasan: "",
  customerName: "",
  jenisBangunan: "",
  estimasiLuas: "",
  jumlahLantai: "",
  pestControlExisting: "",
  vendorDigunakan: "",
  serviceDesignArea: [{ lantai: "Lantai 1", fungsiArea: "" }],
  isuPest: [{ jenisPest: "", areaTemuan: "", keterangan: "" }],
  temuanSurvey: [""],
  rekMonitoring: [{ unit: "", jumlah: "", fungsi: "" }],
  rekTreatment: [{ treatment: "", targetPest: "", keterangan: "" }],
  jumlahVisit: "",
  jadwalTreatment: "",
  hargaService: "",
  catatanPIC: [""],
  kesimpulan: "",
  disiapkanOleh: "",
};

/* ─── Helper components ─────────────────────────── */
function SectionTitle({ no, title }: { no: number; title: string }) {
  return (
    <div style={{ background: BLUE, color: "#fff", padding: "8px 16px", borderRadius: "6px 6px 0 0", fontWeight: 800, fontSize: 13 }}>
      {no}. {title}
    </div>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${BLUE}`, borderTop: "none", borderRadius: "0 0 6px 6px", padding: "0", marginBottom: 20, background: "#fff" }}>
      {children}
    </div>
  );
}

function InfoTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f0f5ff" : "#fff" }}>
            <td style={{ padding: "8px 14px", fontWeight: 600, color: "#374151", width: "40%", fontSize: 12 }}>{k}</td>
            <td style={{ padding: "8px 14px" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr style={{ background: BLUE, color: "#fff" }}>
          {headers.map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f0f5ff" : "#fff" }}>
            {row.map((cell, j) => <td key={j} style={{ padding: "7px 12px", verticalAlign: "top" }}>{cell}</td>)}
          </tr>
        ))}
        {!rows.length && (
          <tr><td colSpan={headers.length} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>Belum ada data.</td></tr>
        )}
      </tbody>
    </table>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: "10px 16px", margin: 0 }}>
      {items.filter(Boolean).map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ color: BLUE, fontWeight: 800, flexShrink: 0 }}>•</span>
          <span>{item}</span>
        </li>
      ))}
      {!items.filter(Boolean).length && <li style={{ fontSize: 13, color: "#9ca3af" }}>Belum ada data.</li>}
    </ul>
  );
}

const inp = (extra?: object) => ({
  border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 8px",
  fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const, ...extra,
});

/* ─── Edit Helpers ───────────────────────────────── */
function BulletEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ padding: "10px 14px" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <span style={{ color: BLUE, fontWeight: 800, marginTop: 7 }}>•</span>
          <input value={item} onChange={e => { const a = [...items]; a[i] = e.target.value; onChange(a); }} style={inp({ flex: 1 })} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: 14, marginTop: 2 }}>✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} style={{ fontSize: 11, color: BLUE, background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>+ Tambah poin</button>
    </div>
  );
}

function TableEditor<T extends object>({
  rows, headers, fields, onChange, addRow,
}: {
  rows: T[];
  headers: string[];
  fields: (keyof T)[];
  onChange: (rows: T[]) => void;
  addRow: () => T;
}) {
  const update = (i: number, k: keyof T, v: string) =>
    onChange(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  return (
    <div style={{ padding: "10px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#e8edf6" }}>
            {headers.map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: BLUE }}>{h}</th>)}
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
              {fields.map(f => (
                <td key={String(f)} style={{ padding: 4 }}>
                  <input value={String(row[f] ?? "")} onChange={e => update(i, f, e.target.value)} style={inp()} />
                </td>
              ))}
              <td style={{ padding: 4, textAlign: "center" }}>
                <button onClick={() => onChange(rows.filter((_, j) => j !== i))} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => onChange([...rows, addRow()])} style={{ marginTop: 8, fontSize: 11, color: BLUE, background: "none", border: `1px dashed ${BLUE}`, borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>+ Tambah baris</button>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────── */
export default function B2CReportPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [surveyInfo, setSurveyInfo] = useState<any>(null);
  const [doc, setDoc] = useState<B2CDoc>(DEFAULT_DOC);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/b2c-report/${surveyId}`);
        const { survey, data: saved } = res.data;
        setSurveyInfo(survey);

        const base: B2CDoc = {
          ...DEFAULT_DOC,
          customerName: survey.customer?.name || "",
          jenisBangunan: survey.inquiry?.buildingType || "",
          estimasiLuas: survey.b2cFloorDescriptions
            ? (Array.isArray(survey.b2cFloorDescriptions) ? `${survey.b2cFloorDescriptions.length} lantai` : "")
            : (survey.inquiry?.areaSizeM2 ? `${survey.inquiry.areaSizeM2} m²` : ""),
          jumlahLantai: Array.isArray(survey.b2cFloorDescriptions)
            ? `${survey.b2cFloorDescriptions.length} lantai` : "",
          pestControlExisting: survey.b2cExistingPestControl || "",
          vendorDigunakan: survey.b2cVendorName || "",
          serviceDesignArea: Array.isArray(survey.b2cFloorDescriptions) && survey.b2cFloorDescriptions.length
            ? survey.b2cFloorDescriptions.map((f: any) => ({
                lantai: f.lantai || f.floor || "",
                fungsiArea: f.fungsi || f.description || "",
              }))
            : DEFAULT_DOC.serviceDesignArea,
          isuPest: Array.isArray(survey.b2cIssues) && survey.b2cIssues.length
            ? survey.b2cIssues.map((iss: any) => ({
                jenisPest: typeof iss === "string" ? iss : (iss.name || iss.pest || ""),
                areaTemuan: iss.area || "",
                keterangan: iss.keterangan || iss.note || "",
              }))
            : DEFAULT_DOC.isuPest,
          temuanSurvey: Array.isArray(survey.b2cPointNotes) && survey.b2cPointNotes.length
            ? survey.b2cPointNotes.filter(Boolean)
            : DEFAULT_DOC.temuanSurvey,
          rekMonitoring: survey.b2cUnitName
            ? [{ unit: survey.b2cUnitName, jumlah: survey.b2cQuantity?.toString() || "", fungsi: "" }]
            : DEFAULT_DOC.rekMonitoring,
          rekTreatment: Array.isArray(survey.b2cTreatments) && survey.b2cTreatments.length
            ? survey.b2cTreatments.map((t: string) => ({ treatment: t, targetPest: "", keterangan: "" }))
            : DEFAULT_DOC.rekTreatment,
          jumlahVisit: survey.b2cVisitQty ? `${survey.b2cVisitQty}x visit` : (survey.b2cVisitPerMonth ? `${survey.b2cVisitPerMonth}x / bulan` : ""),
          jadwalTreatment: "",
          hargaService: survey.b2cTotalCost ? `Rp ${Number(survey.b2cTotalCost).toLocaleString("id-ID")} / bulan` : "",
          catatanPIC: Array.isArray(survey.b2cPointNotes) ? survey.b2cPointNotes.filter(Boolean) : DEFAULT_DOC.catatanPIC,
          kesimpulan: "",
          disiapkanOleh: survey.picAssignments?.length
            ? survey.picAssignments.map((a: any) => a.pic?.name).filter(Boolean).join(", ")
            : (survey.pic?.name || ""),
        };

        setDoc(saved ? { ...base, ...saved } : base);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/b2c-report/${surveyId}`, doc);
      setEditMode(false);
      setSaveMsg("Tersimpan!");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch { alert("Gagal menyimpan."); }
    finally { setSaving(false); }
  };

  const set = <K extends keyof B2CDoc>(k: K) => (v: B2CDoc[K]) =>
    setDoc(d => ({ ...d, [k]: v }));

  if (loading) return <div className="p-9"><Loading /></div>;

  const survey = surveyInfo;

  return (
    <div style={{ minHeight: "100vh", background: "#e5e7eb", fontFamily: "Inter, Arial, sans-serif" }}>
      {/* Toolbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #d1d5db", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }} className="print:hidden">
        <button onClick={() => router.back()} style={{ color: BLUE, fontWeight: 700, fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>← Kembali</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: BLUE }}>Report After Survey B2C</p>
          <p style={{ fontSize: 11, color: "#6b7280" }}>{survey?.customer?.name || "—"} · {survey?.number || ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="btn" style={{ minHeight: 34, fontSize: 12 }}>✏️ Edit</button>
          ) : (
            <>
              <button onClick={() => setEditMode(false)} className="btn" style={{ minHeight: 34, fontSize: 12 }}>Batal</button>
              <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: 34, fontSize: 12, background: BLUE, borderColor: BLUE }}>
                {saving ? "Menyimpan..." : "💾 Simpan"}
              </button>
            </>
          )}
          {saveMsg && <span style={{ color: "#16713b", fontWeight: 700, fontSize: 12 }}>✓ {saveMsg}</span>}
          <button onClick={() => window.print()} className="btn" style={{ minHeight: 34, fontSize: 12 }}>🖨️ Cetak</button>
        </div>
      </div>

      {/* Document */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px" }} className="print:p-0 print:max-w-none">
        <div style={{ background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,.12)", borderRadius: 10, overflow: "hidden", padding: "32px 36px" }} className="print:shadow-none print:rounded-none">

          {/* Header */}
          <div style={{ borderBottom: `4px solid ${BLUE}`, paddingBottom: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
              <div style={{ background: BLUE, color: "#fff", padding: "10px 18px", borderRadius: 8, flexShrink: 0, textAlign: "center" }}>
                <p style={{ fontWeight: 900, fontSize: 11, letterSpacing: ".08em" }}>AFTER SURVEY</p>
                <p style={{ fontWeight: 900, fontSize: 16 }}>REPORT</p>
                <p style={{ fontWeight: 700, fontSize: 11 }}>B2C</p>
              </div>
              <div style={{ flex: 1 }}>
                {editMode ? (
                  <>
                    <input value={doc.customerName} onChange={e => set("customerName")(e.target.value)}
                      style={{ ...inp(), fontSize: 22, fontWeight: 800, color: BLUE, border: "1px solid #d1d5db", marginBottom: 6 }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input value={doc.jenisBangunan} onChange={e => set("jenisBangunan")(e.target.value)} placeholder="Jenis Bangunan" style={inp()} />
                    </div>
                  </>
                ) : (
                  <>
                    <h1 style={{ fontWeight: 900, fontSize: 22, color: BLUE, marginBottom: 6 }}>{doc.customerName || "—"}</h1>
                    <p style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{doc.jenisBangunan || "—"} | Pest Control Survey</p>
                  </>
                )}
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Survey: {survey?.number || "—"} · {survey?.scheduledAt ? new Date(survey.scheduledAt).toLocaleDateString("id-ID", { dateStyle: "long" }) : "—"} · Lokasi: {survey?.location || "—"}
                </p>
              </div>
            </div>

            {/* Ringkasan */}
            <div style={{ marginTop: 16, background: "#f0f5ff", borderRadius: 6, padding: "12px 16px", borderLeft: `4px solid ${ORANGE}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: ".06em", marginBottom: 6 }}>RINGKASAN</p>
              {editMode
                ? <textarea value={doc.ringkasan} onChange={e => set("ringkasan")(e.target.value)} rows={3}
                    style={{ ...inp(), resize: "vertical" }} placeholder="Deskripsi singkat hasil survey..." />
                : <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{doc.ringkasan || "—"}</p>
              }
            </div>
          </div>

          {/* Section 1 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={1} title="Informasi Customer" />
            <SectionBody>
              {editMode ? (
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      ["Nama Customer", "customerName"],
                      ["Jenis Bangunan", "jenisBangunan"],
                      ["Estimasi Luas Area", "estimasiLuas"],
                      ["Jumlah Lantai", "jumlahLantai"],
                      ["Pest Control Existing", "pestControlExisting"],
                      ["Vendor Digunakan", "vendorDigunakan"],
                    ].map(([label, key]) => (
                      <label key={key}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 3 }}>{label}</p>
                        <input value={(doc as any)[key]} onChange={e => set(key as keyof B2CDoc)(e.target.value as any)} style={inp()} />
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <InfoTable rows={[
                  ["Nama Customer", doc.customerName],
                  ["Jenis Bangunan", doc.jenisBangunan],
                  ["Estimasi Luas Area", doc.estimasiLuas],
                  ["Jumlah Lantai", doc.jumlahLantai],
                  ["Pest Control Existing", doc.pestControlExisting],
                  ["Vendor Digunakan", doc.vendorDigunakan],
                ]} />
              )}
            </SectionBody>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={2} title="Service Design Area" />
            <SectionBody>
              {editMode ? (
                <TableEditor<ServiceArea>
                  rows={doc.serviceDesignArea}
                  headers={["Lantai", "Fungsi Area"]}
                  fields={["lantai", "fungsiArea"]}
                  onChange={set("serviceDesignArea")}
                  addRow={() => ({ lantai: "", fungsiArea: "" })}
                />
              ) : (
                <DataTable
                  headers={["Lantai", "Fungsi Area"]}
                  rows={doc.serviceDesignArea.map(r => [r.lantai, r.fungsiArea])}
                />
              )}
            </SectionBody>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={3} title="Isu Pest yang Ditemukan" />
            <SectionBody>
              {editMode ? (
                <TableEditor<IsuPest>
                  rows={doc.isuPest}
                  headers={["Jenis Pest", "Area Temuan", "Keterangan"]}
                  fields={["jenisPest", "areaTemuan", "keterangan"]}
                  onChange={set("isuPest")}
                  addRow={() => ({ jenisPest: "", areaTemuan: "", keterangan: "" })}
                />
              ) : (
                <DataTable
                  headers={["Jenis Pest", "Area Temuan", "Keterangan"]}
                  rows={doc.isuPest.map(r => [r.jenisPest, r.areaTemuan, r.keterangan])}
                />
              )}
            </SectionBody>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={4} title="Temuan Survey" />
            <SectionBody>
              {editMode
                ? <BulletEditor items={doc.temuanSurvey} onChange={set("temuanSurvey")} />
                : <BulletList items={doc.temuanSurvey} />
              }
            </SectionBody>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={5} title="Rekomendasi Unit Monitoring" />
            <SectionBody>
              {editMode ? (
                <TableEditor<MonitoringUnit>
                  rows={doc.rekMonitoring}
                  headers={["Unit", "Jumlah", "Fungsi"]}
                  fields={["unit", "jumlah", "fungsi"]}
                  onChange={set("rekMonitoring")}
                  addRow={() => ({ unit: "", jumlah: "", fungsi: "" })}
                />
              ) : (
                <DataTable
                  headers={["Unit", "Jumlah", "Fungsi"]}
                  rows={doc.rekMonitoring.map(r => [r.unit, r.jumlah, r.fungsi])}
                />
              )}
            </SectionBody>
          </div>

          {/* Section 6 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={6} title="Rekomendasi Treatment" />
            <SectionBody>
              {editMode ? (
                <TableEditor<TreatmentRow>
                  rows={doc.rekTreatment}
                  headers={["Treatment", "Target Pest", "Keterangan"]}
                  fields={["treatment", "targetPest", "keterangan"]}
                  onChange={set("rekTreatment")}
                  addRow={() => ({ treatment: "", targetPest: "", keterangan: "" })}
                />
              ) : (
                <DataTable
                  headers={["Treatment", "Target Pest", "Keterangan"]}
                  rows={doc.rekTreatment.map(r => [r.treatment, r.targetPest, r.keterangan])}
                />
              )}
            </SectionBody>
          </div>

          {/* Section 7 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={7} title="Frekuensi Visit dan Harga Service" />
            <SectionBody>
              {editMode ? (
                <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    ["Jumlah Visit", "jumlahVisit", "Contoh: 2x visit / bulan"],
                    ["Jadwal Treatment", "jadwalTreatment", "Contoh: Sabtu pagi"],
                    ["Harga Service", "hargaService", "Contoh: Rp 1.900.000 / bulan"],
                  ].map(([label, key, ph]) => (
                    <label key={key}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 3 }}>{label}</p>
                      <input value={(doc as any)[key]} onChange={e => set(key as keyof B2CDoc)(e.target.value as any)} placeholder={ph} style={inp()} />
                    </label>
                  ))}
                </div>
              ) : (
                <InfoTable rows={[
                  ["Jumlah Visit", doc.jumlahVisit],
                  ["Jadwal Treatment", doc.jadwalTreatment],
                  ["Harga Service", doc.hargaService],
                ]} />
              )}
            </SectionBody>
          </div>

          {/* Section 8 */}
          <div style={{ marginBottom: 20 }}>
            <SectionTitle no={8} title="Catatan Penting untuk PIC" />
            <SectionBody>
              {editMode
                ? <BulletEditor items={doc.catatanPIC} onChange={set("catatanPIC")} />
                : <BulletList items={doc.catatanPIC} />
              }
            </SectionBody>
          </div>

          {/* Section 9 */}
          <div style={{ marginBottom: 28 }}>
            <SectionTitle no={9} title="Kesimpulan Survey" />
            <SectionBody>
              <div style={{ padding: "12px 16px" }}>
                {editMode
                  ? <textarea value={doc.kesimpulan} onChange={e => set("kesimpulan")(e.target.value)} rows={5}
                      style={{ ...inp(), resize: "vertical" }} placeholder="Kesimpulan hasil survey..." />
                  : <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>{doc.kesimpulan || "—"}</p>
                }
              </div>
            </SectionBody>
          </div>

          {/* Signature */}
          <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 260, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#374151", marginBottom: 8 }}>Disiapkan oleh,</p>
              {editMode
                ? <input value={doc.disiapkanOleh} onChange={e => set("disiapkanOleh")(e.target.value)} style={{ ...inp(), textAlign: "center" }} placeholder="Nama surveyor" />
                : <div>
                    <div style={{ borderBottom: "1px solid #374151", marginBottom: 6, height: 48 }} />
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{doc.disiapkanOleh || "________________________"}</p>
                    <p style={{ fontSize: 11, color: "#6b7280" }}>Surveyor / PIC</p>
                  </div>
              }
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .print\\:hidden { display: none !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
