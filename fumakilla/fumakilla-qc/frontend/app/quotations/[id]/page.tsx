"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Loading, useGet } from "@/components/erp/shared";

/* ─── Types ───────────────────────────────────────────────── */
type SurveyRow = {
  no: number;
  areaInspeksi: string;
  temuanHama: string;
  dokumentasi: string;
  hasilTemuan: string;
};
type PriceData = {
  serviceType: string;
  monitoringRodentGlue: string;
  monitoringLiveTrap: string;
  monitoringHoyHoy: string;
  monitoringBlackHole: string;
  treatmentMethod: string;
  coverArea: string;
  price: string;
  visitSchedule: string;
  pestCover: string;
  paymentMethod: string;
  complaintHandling: string;
  contractDuration: string;
  notes: string;
};
const defaultPrice: PriceData = {
  serviceType: "Pest & Rodent Control",
  monitoringRodentGlue: "6 unit",
  monitoringLiveTrap: "2 unit",
  monitoringHoyHoy: "2 unit",
  monitoringBlackHole: "2 unit",
  treatmentMethod: "Rodent Monitoring\nHand Sprayer\nGel Baiting",
  coverArea: "",
  price: "",
  visitSchedule: "Visit 2x/Month",
  pestCover: "Rodent, Cockroach, Ant, Mosquito",
  paymentMethod: "Monthly payment (TOP 30 days)",
  complaintHandling: "2x24 hours",
  contractDuration: "1 year contract",
  notes: "",
};

/* ─── Page names ──────────────────────────────────────────── */
const PAGE_NAMES = [
  "Cover", "a Glimpse of Fumakilla", "Our Products",
  "Fumakilla (VAPE) Pest Control", "Pest Information (1)", "Pest Information (2)",
  "Pest Control Method 1", "Pest Control Method 2", "Integrated Pest Mgmt",
  "Hasil Survey", "Price Quotation", "Alur Proses Layanan", "Thank You",
];

/* ─── Helpers ─────────────────────────────────────────────── */
const fmtDate = (v: string) =>
  new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/* ─── Design tokens ───────────────────────────────────────── */
const NAVY = "#2c3e5c";
const LINE = "#1a3560";
const LOGO = "/refrence/QuotationLogo.jpg";

/* ─── Shared slide components ─────────────────────────────── */
function SlideHeader({ title }: { title: string }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 28px 10px" }}>
        <h1 style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: "26px", fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.2 }}>
          {title}
        </h1>
        <img src={LOGO} alt="Fumakilla" style={{ height: "58px", objectFit: "contain", flexShrink: 0, marginLeft: 16 }} />
      </div>
      <div style={{ margin: "0 28px 10px", borderBottom: `2.5px solid ${LINE}` }} />
    </div>
  );
}

function SlideFooter({ pageNum }: { pageNum: number }) {
  return (
    <div style={{ flexShrink: 0, borderTop: `1.5px solid ${LINE}`, margin: "8px 28px 0", padding: "5px 0 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <p style={{ fontStyle: "italic", fontSize: "11px", color: "#222", margin: 0 }}>
        Pest Control Management Proposal PT. Fumakilla Indonesia
      </p>
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#222", margin: 0 }}>{pageNum}</p>
    </div>
  );
}

function SlidePage({ title, children, pageNum }: { title: string; children: React.ReactNode; pageNum: number }) {
  return (
    <div style={{ width: "960px", background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", fontSize: "13px" }}>
      <SlideHeader title={title} />
      <div style={{ flex: 1, padding: "0 28px 8px" }}>{children}</div>
      <SlideFooter pageNum={pageNum} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 1  —  Cover
═══════════════════════════════════════════════════════════ */
function Page1({ q }: { q: any }) {
  const inq = q?.inquiry;
  const segB2B = q?.segmentType === "B2B";
  const clientName = segB2B
    ? inq?.companyName || q?.customer?.company || q?.customer?.name || "—"
    : inq?.customerName || q?.customer?.name || "—";
  const clientAddr = inq?.address || q?.customer?.treatmentAddress || q?.customer?.address || "—";
  const qDate = q?.quotationDate ? fmtDate(q.quotationDate) : "—";

  return (
    <div style={{ width: "960px", minHeight: "540px", background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}>
      {/* Top white section */}
      <div style={{ flex: 1, padding: "24px 32px 20px", display: "flex", flexDirection: "column" }}>
        {/* Date + number top-left, logo top-right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <p style={{ fontWeight: 900, fontSize: "14px", color: "#111", margin: 0, lineHeight: 1.8 }}>{qDate}</p>
            <p style={{ fontWeight: 900, fontSize: "14px", color: "#111", margin: 0 }}>{q?.number || "—"}</p>
          </div>
          <img src={LOGO} alt="Fumakilla" style={{ height: "68px", objectFit: "contain" }} />
        </div>

        {/* Center: big title */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "12px" }}>
          <h1 style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: "44px", fontWeight: 900, color: "#111", margin: 0, lineHeight: 1.1 }}>
            PEST CONTROL MANAGEMENT<br />PROPOSAL
          </h1>
          <p style={{ fontStyle: "italic", fontSize: "20px", color: "#444", margin: "6px 0" }}>for</p>
          <p style={{ fontSize: "26px", fontWeight: 900, color: "#111", margin: 0 }}>
            {segB2B && !clientName.toLowerCase().startsWith("pt") ? `PT. ${clientName}` : clientName}
          </p>
          <p style={{ fontSize: "11.5px", color: "#555", textTransform: "uppercase", letterSpacing: "0.04em", maxWidth: "580px", lineHeight: 1.7, margin: 0 }}>
            {clientAddr}
          </p>
        </div>
      </div>

      {/* Bottom: dark navy bar with diagonal photo strips */}
      <div style={{ position: "relative", background: NAVY, overflow: "hidden", display: "flex", minHeight: "118px" }}>
        {/* Company info */}
        <div style={{ padding: "18px 32px", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <p style={{ fontWeight: 900, fontSize: "15px", color: "#fff", margin: 0 }}>PT. FUMAKILLA INDONESIA</p>
          <p style={{ fontSize: "12px", color: "#adc5de", fontWeight: 700, margin: "4px 0 0" }}>Pest Control Department</p>
          <p style={{ fontSize: "10.5px", color: "#8faac4", marginTop: "6px", lineHeight: 1.7, fontStyle: "italic", margin: "6px 0 0" }}>
            CIBIS 8 Building suite 02 - 6th floor, CIBIS Business Park<br />
            Cilandak, Pasar Minggu, South Jakarta City, Jakarta
          </p>
        </div>
        {/* Diagonal photo strips */}
        <div style={{ width: "320px", display: "flex", gap: "6px", transform: "skewX(-10deg)", overflow: "hidden", marginRight: "-24px", flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, overflow: "hidden" }}>
              <img src="/refrence/Footer.png" alt=""
                style={{ height: "118px", width: "220%", objectFit: "cover", transform: "skewX(10deg) scale(1.3)", transformOrigin: "center" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 2  —  A Glimpse of Fumakilla  (static image content)
═══════════════════════════════════════════════════════════ */
function Page2() {
  return (
    <SlidePage title="a Glimpse of Fumakilla" pageNum={2}>
      <img src="/refrence/GlimpseFumakilla.png" alt="A Glimpse of Fumakilla"
        style={{ width: "100%", objectFit: "contain", display: "block" }} />
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 3  —  Our Products  (static image)
═══════════════════════════════════════════════════════════ */
function Page3() {
  return (
    <SlidePage title="Our Products" pageNum={3}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "380px" }}>
        <img src="/refrence/Product.png" alt="Fumakilla Products"
          style={{ maxWidth: "100%", maxHeight: "380px", objectFit: "contain" }} />
      </div>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 4  —  Fumakilla Indonesia (VAPE) Pest Control
═══════════════════════════════════════════════════════════ */
function Page4() {
  const rows = [
    ["ISO 9001", "Izin Usaha"],
    ["ISO 22000", "Izin Operasional"],
    ["Food Safety System Certification (FSSC)", "Izin Dinkes"],
    ["BPOM", "ASPPHAMI"],
    ["AIB", "ISO 9001 : 2015"],
    ["BRC", ""],
  ];
  return (
    <SlidePage title="Fumakilla Indonesia (VAPE) Pest Control" pageNum={4}>
      <div style={{ marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ background: NAVY, color: "#fff", padding: "12px 16px", fontWeight: 700, textAlign: "left", width: "50%", border: "1px solid #c5cdd8" }}>
                External Audit Assistance of<br />Quality Management System :
              </th>
              <th style={{ background: NAVY, color: "#fff", padding: "12px 16px", fontWeight: 700, textAlign: "left", border: "1px solid #c5cdd8" }}>
                Certification :
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([left, right], i) => (
              <tr key={i} style={{ borderBottom: "1px solid #d8dde3" }}>
                <td style={{ padding: "11px 16px", fontWeight: 700, border: "1px solid #d8dde3", color: "#111" }}>{left}</td>
                <td style={{ padding: "11px 16px", fontWeight: 700, border: "1px solid #d8dde3", color: "#111" }}>{right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 5  —  Pest Information: ANT & RODENT
═══════════════════════════════════════════════════════════ */
function PestInfoCell({ num, name, behavior, speciesTitle, species, issuesTitle, issues }: {
  num: string; name: string; behavior: string;
  speciesTitle: string; species: string[];
  issuesTitle: string; issues: string[];
}) {
  return (
    <td style={{ padding: "12px 16px", verticalAlign: "top", border: "1px solid #c5cdd8", width: "50%" }}>
      <p style={{ fontSize: "13px", color: "#111", lineHeight: 1.7, marginBottom: "12px", textAlign: "justify" }}>{behavior}</p>
      <p style={{ fontWeight: 700, textDecoration: "underline", fontSize: "13px", marginBottom: "4px" }}>{speciesTitle}</p>
      <p style={{ fontSize: "13px", marginBottom: "4px" }}>There are {species.length < 4 ? "three" : "four"} main species that are commonly found,</p>
      <ol style={{ paddingLeft: "20px", margin: "0 0 12px", fontSize: "13px", lineHeight: 1.8 }}>
        {species.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <p style={{ fontWeight: 700, textDecoration: "underline", fontSize: "13px", marginBottom: "4px" }}>{issuesTitle}</p>
      <ol style={{ paddingLeft: "20px", margin: 0, fontSize: "13px", lineHeight: 1.8 }}>
        {issues.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </td>
  );
}

function Page5() {
  return (
    <SlidePage title="Pest Information" pageNum={5}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: 0 }}>
        <thead>
          <tr>
            <th style={{ background: NAVY, color: "#fff", padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: "13px", border: "1px solid #c5cdd8", width: "50%" }}>
              1. ANT
            </th>
            <th style={{ background: NAVY, color: "#fff", padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: "13px", border: "1px solid #c5cdd8" }}>
              2. RODENT (RAT)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <PestInfoCell
              num="1" name="ANT"
              behavior="Ants always leave traces in the form of pheromones which are a tool for other ants to follow in the footsteps of their partners. Ants are very interested in aromatic and sweet foods. Prefers moist areas and nests are usually found in gaps near food sources both liquid and solid."
              speciesTitle="Ants type"
              species={["Black Ant (Lasius niger)", "Fire Ant (Solenopsis sp)", "Ant Pharaoh's (Monomorium sp)", "Field Ant (Formica sp)"]}
              issuesTitle="Issues Caused:"
              issues={["Some ant species can bite and sting.", "Its existence interferes with human life.", "Make the scenery or room decoration be unpleasant to look at."]}
            />
            <PestInfoCell
              num="2" name="RODENT (RAT)"
              behavior="One of the harmful habits of mice is to sharpen their front teeth so they don't grow into their jaws. This can be done on electrical or computer cables, doors made of wood, water pipes, electric pipes etc., wherever it can gnaw, it will gnaw. Even he can make holes that can damage the foundation of the house. Under ideal conditions, a pair of mice can breed to 2,000 per year. A very influential factor in the breeding of mice is food."
              speciesTitle="Rats type"
              species={["Roof Rat (Rattus rattus)", "House Rat (Mus musculus)", "Got Rat (Rattus novergicus)"]}
              issuesTitle="Issues Caused :"
              issues={["Is a vector of dangerous diseases, such as: PES, Salmo-nellosis (poisoning food with feces), leptospirosis (infected by mouse disease, bathing with polluted water)", "Fever caused by rat bites"]}
            />
          </tr>
        </tbody>
      </table>
      {/* Photo strip */}
      <div style={{ background: "#fff", padding: "8px 0 0", display: "flex", justifyContent: "center" }}>
        <img src="/refrence/PestInfo1.png" alt="Ant and Rodent" style={{ maxHeight: "130px", maxWidth: "100%", objectFit: "contain" }} />
      </div>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 6  —  Pest Information: FLIES & MOSQUITO
═══════════════════════════════════════════════════════════ */
function Page6() {
  return (
    <SlidePage title="Pest Information" pageNum={6}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            <th style={{ background: NAVY, color: "#fff", padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: "13px", border: "1px solid #c5cdd8", width: "50%" }}>
              3. FLIES
            </th>
            <th style={{ background: NAVY, color: "#fff", padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: "13px", border: "1px solid #c5cdd8" }}>
              4. MOSQUITO
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <PestInfoCell
              num="3" name="FLIES"
              behavior="Flies are active only during the day, whereas at night, they will rest in places such as: plants, fences, ceilings, electrical wires and building corners. The location of the rest is not far from where they are looking for food, usually 1-3 meters above ground level. In accordance with the shape of his mouth, flies only eat in the form of liquid or wet food by sucking. Water is vital for the life of a fly, because without water it only survives for no more than 48 hours."
              speciesTitle="Flies type"
              species={["House fly (Musca domestica)", "Fruit flies (Drosophila sp)", "Waste flies (Psychoda sp)"]}
              issuesTitle="Issues Caused:"
              issues={["Is a vector of disease carriers such as: typhoid, fever, and cholera.", "Contaminating food and drink slts existence interferes with the enjoyment of human."]}
            />
            <PestInfoCell
              num="4" name="MOSQUITO"
              behavior="The behavior of mosquitoes is different for each species; as an example, dengue mosquitoes are active during the day, whereas home mosquitoes are active at night. The breeding place of dengue mosquitoes is in clean water, while the mosquitoes house in water that contains a lot of organic material, such as sewers, puddles etc. Mosquitoes like damp, dark and lacking wind; the rest area is not far from the place of activity."
              speciesTitle="Mosquitoes type"
              species={["Dengue fever mosquitoes (Aedes aegypti)", "Malaria mosquitoes (Anopheles sp)", "(Culex sp)"]}
              issuesTitle="Issues Caused:"
              issues={["Is a vector of dangerous diseases, such as malaria, dengue fever or elephantiasis.", "Its existence interferes with human life, especially if noise is issued and mosquito bites."]}
            />
          </tr>
        </tbody>
      </table>
      <div style={{ padding: "8px 0 0", display: "flex", justifyContent: "center" }}>
        <img src="/refrence/PestInfo2.png" alt="Flies and Mosquito" style={{ maxHeight: "130px", maxWidth: "100%", objectFit: "contain" }} />
      </div>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 7  —  Pest Control Method & Monitoring (PestMethod1)
═══════════════════════════════════════════════════════════ */
function Page7() {
  return (
    <SlidePage title="Pest Control Method & Monitoring" pageNum={7}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "360px" }}>
        <img src="/refrence/PestMethod1.png" alt="Pest Control Method and Monitoring"
          style={{ maxWidth: "100%", maxHeight: "390px", objectFit: "contain" }} />
      </div>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 8  —  Pest Control Method & Monitoring (PestMethod2)
═══════════════════════════════════════════════════════════ */
function Page8() {
  return (
    <SlidePage title="Pest Control Method & Monitoring" pageNum={8}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "360px" }}>
        <img src="/refrence/PestMethod2.png" alt="Pest Control Method and Monitoring"
          style={{ maxWidth: "100%", maxHeight: "390px", objectFit: "contain" }} />
      </div>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 9  —  Integrated Pest Management
═══════════════════════════════════════════════════════════ */
const IPM_ROWS = [
  { metode: "Spot Treatment (perlakuan secara fisik, mekanik, atau kimiawi)", area: "Area Dalam Bangunan", cakupan: "Kecoa, Nyamuk, Semut, Lalat" },
  { metode: "", area: "Area Luar Bangunan", cakupan: "Kecoa, Nyamuk, Semut, Lalat" },
  { metode: "Baiting", area: "Area Dalam Bangunan", cakupan: "Semut dan Kecoa" },
  { metode: "", area: "Area Luar Bangunan", cakupan: "Tikus, Semut dan Kecoa" },
  { metode: "Trapping", area: "Area Dalam Bangunan", cakupan: "Tikus, Lalat" },
  { metode: "", area: "Area Luar Bangunan", cakupan: "Lalat" },
  { metode: "Larvaciding", area: "Area Luar Bangunan", cakupan: "Nyamuk & Lalat" },
  { metode: "Pemantauan ekosistem secara terpadu", area: "Area dalam dan luar banguan", cakupan: "Kecoa, Nyamuk, Semut, Tikus, Lalat" },
  { metode: "Support Team :\n- Membantu dan merekomendasikan penutupan akses masuk hama", area: "Seluruh area fasilitas", cakupan: "Kecoa, Nyamuk, Semut, Tikus, Lalat" },
];
function Page9() {
  return (
    <SlidePage title="Integrated Pest Management" pageNum={9}>
      <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>Metode IPM</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            {["Metode", "Target Area", "Cakupan Hama"].map(h => (
              <th key={h} style={{ background: "#f5c800", color: "#111", padding: "9px 14px", textAlign: "center", fontWeight: 700, border: "1px solid #ccc" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {IPM_ROWS.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ccc" }}>
              <td style={{ padding: "8px 14px", border: "1px solid #ccc", whiteSpace: "pre-line", verticalAlign: "top", fontSize: "13px" }}>{r.metode}</td>
              <td style={{ padding: "8px 14px", border: "1px solid #ccc", verticalAlign: "top", fontSize: "13px" }}>{r.area}</td>
              <td style={{ padding: "8px 14px", border: "1px solid #ccc", verticalAlign: "top", fontSize: "13px" }}>{r.cakupan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 10  —  Hasil Survey
═══════════════════════════════════════════════════════════ */
const HEADER_BG = "#4a6fa5";

function Page10({ rows, editMode, onChange }: { rows: SurveyRow[]; editMode: boolean; onChange: (r: SurveyRow[]) => void }) {
  const addRow = () => onChange([...rows, { no: rows.length + 1, areaInspeksi: "", temuanHama: "", dokumentasi: "", hasilTemuan: "" }]);
  const del = (i: number) => onChange(rows.filter((_, j) => j !== i).map((r, j) => ({ ...r, no: j + 1 })));
  const upd = (i: number, k: keyof SurveyRow, v: string) => onChange(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const COLS: { key: keyof SurveyRow; label: string; w?: string }[] = [
    { key: "no", label: "NO", w: "48px" },
    { key: "areaInspeksi", label: "AREA INSPEKSI" },
    { key: "temuanHama", label: "TEMUAN HAMA &\nPOTENSI HAMA" },
    { key: "dokumentasi", label: "DOKUMENTASI" },
    { key: "hasilTemuan", label: "HASIL TEMUAN DAN\nREKOMENDASI" },
  ];

  return (
    <SlidePage title="Hasil Survey" pageNum={10}>
      {editMode && (
        <button onClick={addRow} style={{ background: NAVY, color: "#fff", border: "none", padding: "6px 14px", borderRadius: "5px", fontWeight: 700, fontSize: "12px", cursor: "pointer", marginBottom: "10px" }}>
          + Tambah Baris
        </button>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr>
            {COLS.map(c => (
              <th key={c.key} style={{ background: HEADER_BG, color: "#fff", padding: "10px 12px", textAlign: "center", fontWeight: 700, border: "1px solid #c5cdd8", whiteSpace: "pre-line", width: c.w }}>
                {c.label}
              </th>
            ))}
            {editMode && <th style={{ background: HEADER_BG, border: "1px solid #c5cdd8", width: "36px" }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#dce8f5" : "#fff" }}>
              <td style={{ padding: "14px 8px", textAlign: "center", fontWeight: 700, fontSize: "18px", color: "#111", border: "1px solid #c5cdd8", verticalAlign: "middle" }}>{r.no}</td>
              {editMode ? (
                <>
                  {(["areaInspeksi", "temuanHama", "dokumentasi", "hasilTemuan"] as const).map(k => (
                    <td key={k} style={{ padding: "4px 6px", border: "1px solid #c5cdd8", verticalAlign: "top" }}>
                      <textarea rows={4} value={r[k]} onChange={e => upd(i, k, e.target.value)}
                        style={{ width: "100%", fontSize: "11px", padding: "5px", border: "1px solid #d1d5db", borderRadius: "4px", resize: "vertical", fontFamily: "inherit" }} />
                    </td>
                  ))}
                  <td style={{ padding: "6px", border: "1px solid #c5cdd8", textAlign: "center", verticalAlign: "top" }}>
                    <button onClick={() => del(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}>×</button>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", fontSize: "12px" }}>{r.areaInspeksi}</td>
                  <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", fontSize: "12px" }}>{r.temuanHama}</td>
                  <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", fontSize: "12px" }}>
                    {r.dokumentasi && (r.dokumentasi.startsWith("http") || r.dokumentasi.startsWith("/"))
                      ? <img src={r.dokumentasi} alt="" style={{ maxWidth: "100%", maxHeight: "100px", objectFit: "cover" }} />
                      : <span>{r.dokumentasi}</span>}
                  </td>
                  <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", fontSize: "12px", lineHeight: 1.7 }}>{r.hasilTemuan}</td>
                </>
              )}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={editMode ? 6 : 5} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF" }}>
                {editMode ? "Klik \"+ Tambah Baris\" untuk menambahkan data." : "Belum ada data hasil survey."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 11  —  Price Quotation
═══════════════════════════════════════════════════════════ */
const inp = (value: string, onChange: (v: string) => void, placeholder?: string, multi?: boolean) =>
  multi
    ? <textarea rows={3} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", fontSize: "11px", padding: "5px 7px", border: "1px solid #d1d5db", borderRadius: "4px", resize: "vertical", fontFamily: "inherit" }} />
    : <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", fontSize: "11px", padding: "5px 7px", border: "1px solid #d1d5db", borderRadius: "4px", fontFamily: "inherit" }} />;

function Page11({ pd, editMode, onChange, clientName }: { pd: PriceData; editMode: boolean; onChange: (v: PriceData) => void; clientName: string }) {
  const set = (k: keyof PriceData) => (v: string) => onChange({ ...pd, [k]: v });

  if (editMode) {
    return (
      <SlidePage title="Price Quotation — Edit" pageNum={11}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
          {([
            { label: "Jenis Service", key: "serviceType" as const },
            { label: "Cover Area", key: "coverArea" as const },
            { label: "Harga (Rp/Month)", key: "price" as const, placeholder: "1.500.000" },
            { label: "Jadwal Kunjungan", key: "visitSchedule" as const },
            { label: "Pest Cover", key: "pestCover" as const },
            { label: "Metode Pembayaran", key: "paymentMethod" as const },
            { label: "Penanganan Komplain", key: "complaintHandling" as const },
            { label: "Durasi Kontrak", key: "contractDuration" as const },
          ] as const).map(f => (
            <label key={f.key} style={{ display: "block" }}>
              <span style={{ fontWeight: 700, display: "block", marginBottom: "3px", fontSize: "11px" }}>{f.label}</span>
              {inp(pd[f.key], set(f.key), (f as any).placeholder)}
            </label>
          ))}
          <div style={{ gridColumn: "span 2" }}>
            <p style={{ fontWeight: 700, fontSize: "11px", marginBottom: "6px" }}>Unit Monitoring</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
              {([
                { label: "Rodent Glue", key: "monitoringRodentGlue" as const },
                { label: "Live Trap", key: "monitoringLiveTrap" as const },
                { label: "Hoy Hoy Trap", key: "monitoringHoyHoy" as const },
                { label: "Black Hole Trap", key: "monitoringBlackHole" as const },
              ] as const).map(f => (
                <label key={f.key}><span style={{ fontWeight: 700, fontSize: "11px", display: "block", marginBottom: "3px" }}>{f.label}</span>{inp(pd[f.key], set(f.key), "e.g. 6 unit")}</label>
              ))}
            </div>
          </div>
          <label style={{ gridColumn: "span 2" }}>
            <span style={{ fontWeight: 700, fontSize: "11px", display: "block", marginBottom: "3px" }}>Metode Treatment</span>
            {inp(pd.treatmentMethod, set("treatmentMethod"), "", true)}
          </label>
          <label style={{ gridColumn: "span 2" }}>
            <span style={{ fontWeight: 700, fontSize: "11px", display: "block", marginBottom: "3px" }}>Catatan Tambahan</span>
            {inp(pd.notes, set("notes"), "Catatan...", true)}
          </label>
        </div>
      </SlidePage>
    );
  }

  const scheduleItems = [
    `Service : ${pd.visitSchedule}`,
    `Pest Cover : ${pd.pestCover}`,
    pd.paymentMethod,
    `Handling Complaint : ${pd.complaintHandling}`,
    pd.contractDuration,
  ];

  return (
    <SlidePage title="Price Quotation" pageNum={11}>
      <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>
        Price Quotation : {clientName}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: HEADER_BG, color: "#fff" }}>
            {["No", "Service Type", "Treatment & Unit Monitoring", "Service Price", "Regular Visit Schedule"].map(h => (
              <th key={h} style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700, border: "1px solid #c5cdd8" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: "#dce8f5" }}>
            <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: 700, fontSize: "14px", border: "1px solid #c5cdd8", verticalAlign: "top" }}>1</td>
            <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", fontWeight: 600 }}>{pd.serviceType}</td>
            <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", lineHeight: 1.8, fontSize: "12px" }}>
              <p style={{ fontWeight: 700, margin: "0 0 4px" }}>Unit Monitoring</p>
              {pd.monitoringRodentGlue && <p style={{ margin: "0 0 2px" }}>- Rodent Glue {pd.monitoringRodentGlue}</p>}
              {pd.monitoringLiveTrap && <p style={{ margin: "0 0 2px" }}>- Live Trap {pd.monitoringLiveTrap}</p>}
              {pd.monitoringHoyHoy && <p style={{ margin: "0 0 2px" }}>- Hoy Hoy Trap {pd.monitoringHoyHoy}</p>}
              {pd.monitoringBlackHole && <p style={{ margin: "0 0 10px" }}>- Black Hole Trap {pd.monitoringBlackHole}</p>}
              {pd.treatmentMethod && (
                <>
                  <p style={{ fontWeight: 700, margin: "0 0 4px" }}>Treatment Method :</p>
                  {pd.treatmentMethod.split("\n").map((m, i) => <p key={i} style={{ margin: "0 0 2px" }}>• {m}</p>)}
                </>
              )}
              {pd.coverArea && (
                <div style={{ marginTop: "8px" }}>
                  <p style={{ fontWeight: 700, margin: "0 0 2px" }}>Cover Area :</p>
                  <p style={{ margin: 0 }}>• {pd.coverArea}</p>
                </div>
              )}
            </td>
            <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", textAlign: "center" }}>
              <p style={{ fontWeight: 900, fontSize: "15px", color: "#111", margin: "0 0 4px" }}>
                <span style={{ background: "#ffff00", padding: "2px 6px" }}>Rp. {pd.price || "—"}/<em>Month</em></span>
              </p>
              <p style={{ fontSize: "11px", color: "#555", margin: 0 }}>*exclude VAT 11%</p>
            </td>
            <td style={{ padding: "12px", border: "1px solid #c5cdd8", verticalAlign: "top", lineHeight: 1.9, fontSize: "12px" }}>
              {scheduleItems.map((s, i) => <p key={i} style={{ margin: "0 0 2px" }}>• {s}</p>)}
            </td>
          </tr>
        </tbody>
      </table>
      {pd.notes && (
        <p style={{ fontSize: "11px", color: "#555", marginTop: "10px" }}><strong>NOTE:</strong> {pd.notes}</p>
      )}
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 12  —  Alur Proses Layanan
═══════════════════════════════════════════════════════════ */
function Page12() {
  return (
    <SlidePage title="Alur Proses Layanan" pageNum={12}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "360px" }}>
        <img src="/refrence/AlurProses.png" alt="Alur Proses Layanan"
          style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain" }} />
      </div>
    </SlidePage>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 13  —  Thank You / Penutup
═══════════════════════════════════════════════════════════ */
function Page13() {
  return (
    <div style={{ width: "960px", background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", minHeight: "540px" }}>
      {/* Logo top-right */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 28px 12px" }}>
        <img src={LOGO} alt="Fumakilla" style={{ height: "58px", objectFit: "contain" }} />
      </div>

      {/* Main content: diagonal strips left + navy box right */}
      <div style={{ flex: 1, display: "flex", padding: "8px 0 0" }}>
        {/* Left: diagonal parallelogram photo strips */}
        <div style={{ flex: "0 0 55%", display: "flex", gap: "10px", transform: "skewX(-10deg)", overflow: "hidden", marginLeft: "-24px" }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, overflow: "hidden" }}>
              <img src="/refrence/Footer.png" alt=""
                style={{ height: "340px", width: "300%", objectFit: "cover", transform: "skewX(10deg) scale(1.4)", transformOrigin: "center", objectPosition: "center" }} />
            </div>
          ))}
        </div>

        {/* Right: dark navy box */}
        <div style={{ flex: "0 0 45%", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 36px" }}>
          <p style={{ fontSize: "42px", fontWeight: 400, color: "#fff", margin: "0 0 12px", fontFamily: "serif" }}>Thank you</p>
          <p style={{ fontSize: "20px", color: "#adc5de", margin: 0 }}>どうもありがとうございました</p>
        </div>
      </div>

      {/* Bottom italic text */}
      <div style={{ padding: "16px 28px 20px", textAlign: "center" }}>
        <p style={{ fontStyle: "italic", fontSize: "13px", color: "#444", margin: 0 }}>
          We're looking forward to have collaboration with you
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: q, loading } = useGet<any>(`/erp/quotations/${id}`);

  const [currentPage, setCurrentPage] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [hasilSurvey, setHasilSurvey] = useState<SurveyRow[]>([]);
  const [priceData, setPriceData] = useState<PriceData>(defaultPrice);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (q) {
      setHasilSurvey(Array.isArray(q.hasilSurvey) ? q.hasilSurvey : []);
      setPriceData(q.priceData && typeof q.priceData === "object" ? { ...defaultPrice, ...q.priceData } : defaultPrice);
    }
  }, [q]);

  const canEdit = currentPage === 10 || currentPage === 11;

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/erp/quotations/${id}`, { hasilSurvey, priceData });
      setEditMode(false);
      setSavedMsg("Tersimpan!");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch { alert("Gagal menyimpan. Coba lagi."); }
    finally { setSaving(false); }
  };

  const clientName = (() => {
    if (!q) return "—";
    const inq = q.inquiry;
    if (q.segmentType === "B2B") return inq?.companyName || q.customer?.company || q.customer?.name || "—";
    return inq?.customerName || q.customer?.name || "—";
  })();

  const renderPage = () => {
    switch (currentPage) {
      case 1:  return <Page1 q={q} />;
      case 2:  return <Page2 />;
      case 3:  return <Page3 />;
      case 4:  return <Page4 />;
      case 5:  return <Page5 />;
      case 6:  return <Page6 />;
      case 7:  return <Page7 />;
      case 8:  return <Page8 />;
      case 9:  return <Page9 />;
      case 10: return <Page10 rows={hasilSurvey} editMode={editMode} onChange={setHasilSurvey} />;
      case 11: return <Page11 pd={priceData} editMode={editMode} onChange={setPriceData} clientName={clientName} />;
      case 12: return <Page12 />;
      case 13: return <Page13 />;
      default: return null;
    }
  };

  if (loading) return <div className="p-9"><Loading /></div>;
  if (!q) return <div className="p-9">Quotation tidak ditemukan.</div>;

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]" style={{ display: "flex", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: "196px", borderRight: "1px solid #d9ddeb", background: "#f2f3fd", display: "flex", flexDirection: "column", overflow: "hidden" }} className="print:hidden">
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #d9ddeb" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#6a7180", letterSpacing: ".1em", margin: 0 }}>HALAMAN</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
          {PAGE_NAMES.map((name, i) => (
            <button key={i} onClick={() => { setCurrentPage(i + 1); setEditMode(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: "6px", border: "none",
                background: currentPage === i + 1 ? NAVY : "transparent",
                color: currentPage === i + 1 ? "#fff" : "#515866",
                fontSize: "11px", fontWeight: currentPage === i + 1 ? 700 : 500,
                cursor: "pointer", marginBottom: "2px" }}>
              <span style={{ fontWeight: 800, marginRight: "5px", opacity: .6 }}>{i + 1}.</span>{name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ borderBottom: "1px solid #d9ddeb", padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px", background: "#fff", flexShrink: 0 }} className="print:hidden">
          <Link href="/quotations" style={{ color: NAVY, fontWeight: 700, fontSize: "13px", textDecoration: "none" }}>← Kembali</Link>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: "14px", color: NAVY, margin: 0 }}>{q.number}</p>
            <p style={{ fontSize: "11px", color: "#6a7180", margin: 0 }}>{clientName} · {q.segmentType}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>← Prev</button>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", minWidth: "80px", textAlign: "center" }}>Hal {currentPage} / 13</span>
            <button onClick={() => setCurrentPage(p => Math.min(13, p + 1))} disabled={currentPage === 13} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Next →</button>
            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)} className="btn" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px", borderColor: NAVY, color: NAVY }}>✏️ Edit</button>
            )}
            {editMode && (
              <>
                <button onClick={() => setEditMode(false)} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Batal</button>
                <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px" }}>
                  {saving ? "Menyimpan..." : "💾 Simpan"}
                </button>
              </>
            )}
            {savedMsg && <span style={{ color: "#16713b", fontWeight: 700, fontSize: "12px" }}>✓ {savedMsg}</span>}
            <button onClick={() => window.print()} className="btn" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px" }}>🖨️ Cetak</button>
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
