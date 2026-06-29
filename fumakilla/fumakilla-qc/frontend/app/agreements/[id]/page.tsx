"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loading } from "@/components/erp/shared";

const NAVY = "#2c3e5c";
const GREEN = "#1a5276";

const STATUS_LIST = ["DRAFT", "SENT", "SIGNED", "ACTIVE", "EXPIRED", "CANCELLED"];
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", SIGNED: "Signed", ACTIVE: "Active", EXPIRED: "Expired", CANCELLED: "Cancelled",
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "#f3f4f6", color: "#374151" },
  SENT:      { bg: "#fef3c7", color: "#92400e" },
  SIGNED:    { bg: "#dbeafe", color: "#1e40af" },
  ACTIVE:    { bg: "#d1fae5", color: "#065f46" },
  EXPIRED:   { bg: "#fee2e2", color: "#991b1b" },
  CANCELLED: { bg: "#f3f4f6", color: "#6b7280" },
};
const JENIS_LAYANAN = ["Anti Rayap", "Pest Control", "Monitoring", "Service Berkala", "PCRC", "Other"];

type ServiceRow = { no: number; jenisService: string; frekuensi: string; keterangan: string };
type TerminRow = { termin: number; keterangan: string; nominal: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: NAVY, color: "#fff", padding: "8px 16px", borderRadius: "8px 8px 0 0", fontWeight: 800, fontSize: 13, letterSpacing: ".03em" }}>
        {title}
      </div>
      <div style={{ border: `1px solid ${NAVY}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: "#fff" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, children, half }: { label: string; value?: string; children?: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ marginBottom: 12, ...(half ? {} : {}) }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>{label}</p>
      {children ?? <p style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || "-"}</p>}
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ display: "block", width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ display: "block", width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>{label}</p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ display: "block", width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
      />
    </div>
  );
}

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-";

const fmtRp = (v: any) =>
  v != null && v !== "" ? "Rp " + Number(v).toLocaleString("id-ID") : "-";

const toISO = (d: string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export default function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Form state
  const [form, setForm] = useState<any>({});
  const [serviceSchedule, setServiceSchedule] = useState<ServiceRow[]>([]);
  const [terminPembayaran, setTerminPembayaran] = useState<TerminRow[]>([]);

  useEffect(() => {
    api.get(`/agreements/${id}`).then(r => {
      const ag = r.data;
      setData(ag);
      resetForm(ag);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  function resetForm(ag: any) {
    setForm({
      tanggal: toISO(ag.tanggal),
      status: ag.status || "DRAFT",
      jenisLayanan: ag.jenisLayanan || "Pest Control",
      lokasiPekerjaan: ag.lokasiPekerjaan || "",
      areaPekerjaan: ag.areaPekerjaan || "",
      tanggalMulai: toISO(ag.tanggalMulai),
      tanggalBerakhir: toISO(ag.tanggalBerakhir),
      durasiKontrak: ag.durasiKontrak?.toString() || "",
      nilaiKontrak: ag.nilaiKontrak?.toString() || "",
      ppn: ag.ppn?.toString() || "",
      grandTotal: ag.grandTotal?.toString() || "",
      metodePembayaran: ag.metodePembayaran || "",
      rekening: ag.rekening || "",
      garansi: ag.garansi || "",
      picFumakillaNama: ag.picFumakillaNama || "",
      picFumakillaJabatan: ag.picFumakillaJabatan || "",
      picFumakillaKontak: ag.picFumakillaKontak || "",
      picKlienNama: ag.picKlienNama || "",
      picKlienJabatan: ag.picKlienJabatan || "",
      picKlienKontak: ag.picKlienKontak || "",
      ttdFumakillaNama: ag.ttdFumakillaNama || "",
      ttdFumakillaJabatan: ag.ttdFumakillaJabatan || "",
      ttdFumakillaTanggal: toISO(ag.ttdFumakillaTanggal),
      ttdKlienNama: ag.ttdKlienNama || "",
      ttdKlienJabatan: ag.ttdKlienJabatan || "",
      ttdKlienTanggal: toISO(ag.ttdKlienTanggal),
      notes: ag.notes || "",
    });
    setServiceSchedule(
      Array.isArray(ag.serviceSchedule) && ag.serviceSchedule.length
        ? ag.serviceSchedule
        : [{ no: 1, jenisService: "Initial Treatment", frekuensi: "1 kali", keterangan: "Awal kontrak" },
           { no: 2, jenisService: "Monthly Service", frekuensi: "1 kali/bulan", keterangan: "Service rutin" },
           { no: 3, jenisService: "QC Visit", frekuensi: "Sesuai kebutuhan", keterangan: "Pemeriksaan kualitas" }]
    );
    setTerminPembayaran(
      Array.isArray(ag.terminPembayaran) && ag.terminPembayaran.length
        ? ag.terminPembayaran
        : [{ termin: 1, keterangan: "Setelah agreement ditandatangani", nominal: "" }]
    );
  }

  const set = (k: string) => (v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.patch(`/agreements/${id}`, {
        ...form,
        serviceSchedule,
        terminPembayaran,
        nilaiKontrak: form.nilaiKontrak || null,
        ppn: form.ppn || null,
        grandTotal: form.grandTotal || null,
        durasiKontrak: form.durasiKontrak ? Number(form.durasiKontrak) : null,
      });
      setData({ ...data, ...r.data });
      resetForm({ ...data, ...r.data });
      setEditMode(false);
      setSaveMsg("Tersimpan!");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch { alert("Gagal menyimpan."); }
    finally { setSaving(false); }
  };

  const cancel = () => { resetForm(data); setEditMode(false); };

  // Auto-calc grand total when nilaiKontrak or ppn changes
  useEffect(() => {
    if (!editMode) return;
    const nilai = Number(form.nilaiKontrak) || 0;
    const ppnVal = Number(form.ppn) || 0;
    if (nilai > 0) {
      setForm((f: any) => ({ ...f, grandTotal: String(nilai + ppnVal) }));
    }
  }, [form.nilaiKontrak, form.ppn, editMode]);

  if (loading) return <div className="p-9"><Loading /></div>;
  if (!data) return <div className="p-9"><p style={{ color: "#dc2626" }}>Agreement tidak ditemukan.</p></div>;

  const sc = STATUS_COLORS[data.status] ?? STATUS_COLORS.DRAFT;

  const addServiceRow = () =>
    setServiceSchedule(s => [...s, { no: s.length + 1, jenisService: "", frekuensi: "", keterangan: "" }]);
  const updateServiceRow = (i: number, k: keyof ServiceRow, v: string) =>
    setServiceSchedule(s => s.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const removeServiceRow = (i: number) =>
    setServiceSchedule(s => s.filter((_, j) => j !== i).map((r, j) => ({ ...r, no: j + 1 })));

  const addTerminRow = () =>
    setTerminPembayaran(t => [...t, { termin: t.length + 1, keterangan: "", nominal: "" }]);
  const updateTerminRow = (i: number, k: keyof TerminRow, v: string) =>
    setTerminPembayaran(t => t.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const removeTerminRow = (i: number) =>
    setTerminPembayaran(t => t.filter((_, j) => j !== i).map((r, j) => ({ ...r, termin: j + 1 })));

  const inpSty = { border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 6px", fontSize: 12, fontFamily: "inherit", width: "100%" };

  return (
    <div className="p-6 md:p-8 print:p-0">
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }} className="print:hidden">
        <button onClick={() => router.push("/agreements")} style={{ background: "none", border: "none", color: NAVY, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Kembali</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontWeight: 900, fontSize: 18, color: NAVY }}>{data.number}</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {data.customer?.company || data.customer?.name} · {fmtDate(data.tanggal)}
          </p>
        </div>
        <span style={{ background: sc.bg, color: sc.color, padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
          {STATUS_LABELS[data.status] ?? data.status}
        </span>
        {!editMode ? (
          <button onClick={() => setEditMode(true)} className="btn" style={{ minHeight: 36 }}>Edit</button>
        ) : (
          <>
            <button onClick={cancel} className="btn" style={{ minHeight: 36 }}>Batal</button>
            <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: 36 }}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </>
        )}
        {saveMsg && <span style={{ color: "#16713b", fontWeight: 700 }}>{saveMsg}</span>}
        <button onClick={() => window.print()} className="btn" style={{ minHeight: 36 }}>Cetak</button>
      </div>

      {/* Document */}
      <div style={{ maxWidth: 860, margin: "0 auto", fontFamily: "Inter, Arial, sans-serif" }}>

        {/* Document Header */}
        <div style={{ textAlign: "center", marginBottom: 24, padding: "20px 0", borderBottom: `3px solid ${NAVY}` }}>
          <p style={{ fontWeight: 900, fontSize: 20, color: NAVY, letterSpacing: ".04em" }}>AGREEMENT / PERJANJIAN KERJA SAMA</p>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#374151", marginTop: 4 }}>JASA TREATMENT ANTI RAYAP / PEST CONTROL</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 16, fontSize: 12 }}>
            <span><b>Nomor:</b> {data.number}</span>
            <span><b>Tanggal:</b> {editMode
              ? <input type="date" value={form.tanggal} onChange={e => set("tanggal")(e.target.value)} style={{ ...inpSty, width: 140 }} />
              : fmtDate(data.tanggal)
            }</span>
            <span><b>Status:</b> {editMode
              ? <select value={form.status} onChange={e => set("status")(e.target.value)} style={{ ...inpSty, width: 110 }}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              : STATUS_LABELS[data.status]
            }</span>
          </div>
        </div>

        {/* Para Pihak */}
        <Section title="PARA PIHAK">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Pihak Pertama */}
            <div>
              <p style={{ fontWeight: 800, fontSize: 13, color: NAVY, marginBottom: 10 }}>PIHAK PERTAMA (PT. Fumakilla Indonesia)</p>
              {editMode ? (
                <>
                  <InputField label="Nama PIC" value={form.picFumakillaNama} onChange={set("picFumakillaNama")} placeholder="Nama PIC Fumakilla" />
                  <InputField label="Jabatan" value={form.picFumakillaJabatan} onChange={set("picFumakillaJabatan")} placeholder="Jabatan" />
                  <InputField label="Telepon / Email" value={form.picFumakillaKontak} onChange={set("picFumakillaKontak")} placeholder="Kontak" />
                </>
              ) : (
                <table style={{ fontSize: 12, width: "100%", borderCollapse: "collapse" }}>
                  {[["Perusahaan", "PT Fumakilla Indonesia"], ["PIC", data.picFumakillaNama], ["Jabatan", data.picFumakillaJabatan], ["Kontak", data.picFumakillaKontak]].map(([k, v]) => (
                    <tr key={k}><td style={{ padding: "3px 0", color: "#6b7280", width: 100 }}>{k}</td><td style={{ padding: "3px 0", fontWeight: 500 }}>{v || "-"}</td></tr>
                  ))}
                </table>
              )}
            </div>
            {/* Pihak Kedua */}
            <div>
              <p style={{ fontWeight: 800, fontSize: 13, color: NAVY, marginBottom: 10 }}>PIHAK KEDUA (Klien)</p>
              {editMode ? (
                <>
                  <InputField label="Nama / Perusahaan Klien" value={form.picKlienNama} onChange={set("picKlienNama")} placeholder={data.customer?.company || data.customer?.name} />
                  <InputField label="Jabatan PIC Klien" value={form.picKlienJabatan} onChange={set("picKlienJabatan")} placeholder="Jabatan" />
                  <InputField label="Telepon / Email Klien" value={form.picKlienKontak} onChange={set("picKlienKontak")} placeholder="Kontak" />
                </>
              ) : (
                <table style={{ fontSize: 12, width: "100%", borderCollapse: "collapse" }}>
                  {[["Perusahaan", data.customer?.company || data.customer?.name], ["PIC", data.picKlienNama], ["Jabatan", data.picKlienJabatan], ["Kontak", data.picKlienKontak]].map(([k, v]) => (
                    <tr key={k}><td style={{ padding: "3px 0", color: "#6b7280", width: 100 }}>{k}</td><td style={{ padding: "3px 0", fontWeight: 500 }}>{v || "-"}</td></tr>
                  ))}
                </table>
              )}
            </div>
          </div>
        </Section>

        {/* Pasal 1 - Ruang Lingkup */}
        <Section title="PASAL 1 — RUANG LINGKUP PEKERJAAN">
          {editMode ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <SelectField label="Jenis Layanan" value={form.jenisLayanan} onChange={set("jenisLayanan")}
                options={JENIS_LAYANAN.map(j => ({ value: j, label: j }))} />
              <div />
              <div style={{ gridColumn: "1 / -1" }}>
                <TextareaField label="Lokasi Pekerjaan" value={form.lokasiPekerjaan} onChange={set("lokasiPekerjaan")} rows={2} placeholder="Alamat lokasi service" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <TextareaField label="Area Pekerjaan" value={form.areaPekerjaan} onChange={set("areaPekerjaan")} rows={2} placeholder="Area kantor, gudang, taman, dll." />
              </div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              {[["Jenis Layanan", data.jenisLayanan], ["Lokasi Pekerjaan", data.lokasiPekerjaan], ["Area Pekerjaan", data.areaPekerjaan], ["Dasar Pekerjaan", "Hasil survey, quotation, dan kesepakatan tertulis kedua belah pihak"]].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "7px 0", color: "#6b7280", width: 180, fontWeight: 600, fontSize: 12 }}>{k}</td>
                  <td style={{ padding: "7px 0" }}>{v || "-"}</td>
                </tr>
              ))}
            </table>
          )}
          {data.quotation && <p style={{ marginTop: 10, fontSize: 11, color: "#6b7280" }}>Ref. Quotation: {data.quotation.number} — {data.quotation.title}</p>}
        </Section>

        {/* Pasal 2 - Jangka Waktu */}
        <Section title="PASAL 2 — JANGKA WAKTU PERJANJIAN">
          {editMode ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <InputField label="Tanggal Mulai" value={form.tanggalMulai} onChange={v => {
                set("tanggalMulai")(v);
                if (v && form.tanggalBerakhir) {
                  const d = Math.round((new Date(form.tanggalBerakhir).getTime() - new Date(v).getTime()) / (1000 * 60 * 60 * 24 * 30));
                  setForm((f: any) => ({ ...f, tanggalMulai: v, durasiKontrak: d > 0 ? String(d) : "" }));
                }
              }} type="date" />
              <InputField label="Tanggal Berakhir" value={form.tanggalBerakhir} onChange={v => {
                if (form.tanggalMulai && v) {
                  const d = Math.round((new Date(v).getTime() - new Date(form.tanggalMulai).getTime()) / (1000 * 60 * 60 * 24 * 30));
                  setForm((f: any) => ({ ...f, tanggalBerakhir: v, durasiKontrak: d > 0 ? String(d) : "" }));
                } else set("tanggalBerakhir")(v);
              }} type="date" />
              <InputField label="Durasi (bulan)" value={form.durasiKontrak} onChange={set("durasiKontrak")} type="number" placeholder="12" />
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              {[
                ["Tanggal Mulai", fmtDate(data.tanggalMulai)],
                ["Tanggal Berakhir", fmtDate(data.tanggalBerakhir)],
                ["Durasi Kontrak", data.durasiKontrak ? `${data.durasiKontrak} bulan` : "-"],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "7px 0", color: "#6b7280", width: 180, fontWeight: 600, fontSize: 12 }}>{k}</td>
                  <td style={{ padding: "7px 0", fontWeight: 600 }}>{v}</td>
                </tr>
              ))}
            </table>
          )}
        </Section>

        {/* Pasal 3 - Jadwal Service */}
        <Section title="PASAL 3 — JADWAL PELAKSANAAN SERVICE">
          {editMode && (
            <button onClick={addServiceRow} style={{ background: NAVY, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
              + Tambah Baris
            </button>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: NAVY, color: "#fff" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 40 }}>No</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Jenis Service</th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: 140 }}>Frekuensi</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Keterangan</th>
                {editMode && <th style={{ width: 32 }} />}
              </tr>
            </thead>
            <tbody>
              {serviceSchedule.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: NAVY }}>{row.no}</td>
                  <td style={{ padding: editMode ? 4 : "8px 10px" }}>
                    {editMode ? <input value={row.jenisService} onChange={e => updateServiceRow(i, "jenisService", e.target.value)} style={inpSty} /> : row.jenisService}
                  </td>
                  <td style={{ padding: editMode ? 4 : "8px 10px" }}>
                    {editMode ? <input value={row.frekuensi} onChange={e => updateServiceRow(i, "frekuensi", e.target.value)} style={inpSty} /> : row.frekuensi}
                  </td>
                  <td style={{ padding: editMode ? 4 : "8px 10px" }}>
                    {editMode ? <input value={row.keterangan} onChange={e => updateServiceRow(i, "keterangan", e.target.value)} style={inpSty} /> : row.keterangan}
                  </td>
                  {editMode && (
                    <td style={{ padding: 4, textAlign: "center" }}>
                      <button onClick={() => removeServiceRow(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>×</button>
                    </td>
                  )}
                </tr>
              ))}
              {!serviceSchedule.length && (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>Belum ada jadwal service.</td></tr>
              )}
            </tbody>
          </table>
        </Section>

        {/* Pasal 4 - Nilai Kontrak */}
        <Section title="PASAL 4 — NILAI KONTRAK DAN PEMBAYARAN">
          {editMode ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <InputField label="Total Nilai Kontrak (Rp)" value={form.nilaiKontrak} onChange={set("nilaiKontrak")} type="number" placeholder="0" />
                <InputField label="PPN (Rp)" value={form.ppn} onChange={set("ppn")} type="number" placeholder="0" />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>Grand Total (Rp)</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: NAVY, padding: "7px 0" }}>{fmtRp(form.grandTotal)}</p>
                </div>
              </div>
              <InputField label="Metode Pembayaran" value={form.metodePembayaran} onChange={set("metodePembayaran")} placeholder="Transfer bank / tunai" />
              <InputField label="Rekening Pembayaran" value={form.rekening} onChange={set("rekening")} placeholder="Bank — No. Rekening — Atas Nama" />
            </>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
              {[
                ["Total Nilai Kontrak", fmtRp(data.nilaiKontrak)],
                ["PPN", fmtRp(data.ppn)],
                ["Grand Total", fmtRp(data.grandTotal)],
                ["Metode Pembayaran", data.metodePembayaran],
                ["Rekening Pembayaran", data.rekening],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "7px 0", color: "#6b7280", width: 200, fontWeight: 600, fontSize: 12 }}>{k}</td>
                  <td style={{ padding: "7px 0", fontWeight: k === "Grand Total" ? 800 : 500, color: k === "Grand Total" ? NAVY : "inherit" }}>{v || "-"}</td>
                </tr>
              ))}
            </table>
          )}

          {/* Termin Pembayaran */}
          <p style={{ fontWeight: 700, fontSize: 12, color: NAVY, marginBottom: 8 }}>Termin Pembayaran:</p>
          {editMode && (
            <button onClick={addTerminRow} style={{ background: NAVY, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
              + Tambah Termin
            </button>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "7px 10px", textAlign: "left", width: 70, fontWeight: 700, color: NAVY }}>Termin</th>
                <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, color: NAVY }}>Keterangan</th>
                <th style={{ padding: "7px 10px", textAlign: "left", width: 160, fontWeight: 700, color: NAVY }}>Nominal (Rp)</th>
                {editMode && <th style={{ width: 32 }} />}
              </tr>
            </thead>
            <tbody>
              {terminPembayaran.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: editMode ? 4 : "7px 10px", fontWeight: 700 }}>{row.termin}</td>
                  <td style={{ padding: editMode ? 4 : "7px 10px" }}>
                    {editMode ? <input value={row.keterangan} onChange={e => updateTerminRow(i, "keterangan", e.target.value)} style={inpSty} /> : row.keterangan}
                  </td>
                  <td style={{ padding: editMode ? 4 : "7px 10px" }}>
                    {editMode
                      ? <input type="number" value={row.nominal} onChange={e => updateTerminRow(i, "nominal", e.target.value)} style={inpSty} />
                      : (row.nominal ? fmtRp(row.nominal) : "-")}
                  </td>
                  {editMode && (
                    <td style={{ padding: 4, textAlign: "center" }}>
                      <button onClick={() => removeTerminRow(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>×</button>
                    </td>
                  )}
                </tr>
              ))}
              {!terminPembayaran.length && (
                <tr><td colSpan={4} style={{ padding: 12, textAlign: "center", color: "#9ca3af" }}>Belum ada termin pembayaran.</td></tr>
              )}
            </tbody>
          </table>
        </Section>

        {/* Pasal 8 - Garansi */}
        <Section title="PASAL 8 — GARANSI / MASA PEMELIHARAAN">
          {editMode
            ? <InputField label="Masa Garansi" value={form.garansi} onChange={set("garansi")} placeholder="Contoh: 3 bulan / selama masa kontrak" />
            : <p style={{ fontSize: 13 }}>Garansi pekerjaan berlaku selama: <b>{data.garansi || "—"}</b></p>
          }
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
            Garansi berlaku selama kondisi lokasi sesuai ketentuan teknis dan tidak terdapat perubahan struktur, renovasi, kebocoran, atau kondisi lain yang memengaruhi hasil treatment.
          </p>
        </Section>

        {/* Tanda Tangan */}
        <Section title="TANDA TANGAN PARA PIHAK">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 12, color: NAVY, marginBottom: 12 }}>PIHAK PERTAMA — PT Fumakilla Indonesia</p>
              {editMode ? (
                <>
                  <InputField label="Nama" value={form.ttdFumakillaNama} onChange={set("ttdFumakillaNama")} />
                  <InputField label="Jabatan" value={form.ttdFumakillaJabatan} onChange={set("ttdFumakillaJabatan")} />
                  <InputField label="Tanggal TTD" value={form.ttdFumakillaTanggal} onChange={set("ttdFumakillaTanggal")} type="date" />
                </>
              ) : (
                <table style={{ fontSize: 12, width: "100%", borderCollapse: "collapse" }}>
                  {[["Nama", data.ttdFumakillaNama], ["Jabatan", data.ttdFumakillaJabatan], ["Tanggal", fmtDate(data.ttdFumakillaTanggal)]].map(([k, v]) => (
                    <tr key={k}><td style={{ padding: "4px 0", color: "#6b7280", width: 80 }}>{k}</td><td style={{ padding: "4px 0" }}>{v || "________________________"}</td></tr>
                  ))}
                </table>
              )}
              <div style={{ borderBottom: "2px solid #374151", marginTop: 40, paddingBottom: 4, width: "80%" }} className="print:mt-16" />
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Tanda tangan & stempel</p>
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 12, color: NAVY, marginBottom: 12 }}>PIHAK KEDUA — {data.customer?.company || data.customer?.name}</p>
              {editMode ? (
                <>
                  <InputField label="Nama" value={form.ttdKlienNama} onChange={set("ttdKlienNama")} />
                  <InputField label="Jabatan" value={form.ttdKlienJabatan} onChange={set("ttdKlienJabatan")} />
                  <InputField label="Tanggal TTD" value={form.ttdKlienTanggal} onChange={set("ttdKlienTanggal")} type="date" />
                </>
              ) : (
                <table style={{ fontSize: 12, width: "100%", borderCollapse: "collapse" }}>
                  {[["Nama", data.ttdKlienNama], ["Jabatan", data.ttdKlienJabatan], ["Tanggal", fmtDate(data.ttdKlienTanggal)]].map(([k, v]) => (
                    <tr key={k}><td style={{ padding: "4px 0", color: "#6b7280", width: 80 }}>{k}</td><td style={{ padding: "4px 0" }}>{v || "________________________"}</td></tr>
                  ))}
                </table>
              )}
              <div style={{ borderBottom: "2px solid #374151", marginTop: 40, paddingBottom: 4, width: "80%" }} className="print:mt-16" />
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Tanda tangan & stempel</p>
            </div>
          </div>
        </Section>

        {/* Catatan */}
        <Section title="CATATAN">
          {editMode
            ? <TextareaField label="Catatan tambahan" value={form.notes} onChange={set("notes")} rows={3} placeholder="Catatan internal atau tambahan perjanjian..." />
            : <p style={{ fontSize: 13, color: data.notes ? "#374151" : "#9ca3af" }}>{data.notes || "Tidak ada catatan."}</p>
          }
        </Section>

      </div>

      <style>{`
        @media print {
          body { margin: 0; font-size: 11pt; }
          .print\\:hidden { display: none !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
