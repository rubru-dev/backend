"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { fileUrl } from "@/lib/utils";
import { downloadName } from "@/lib/download-name";
import { Loading, useGet } from "@/components/erp/shared";
import { showAlert } from "@/lib/app-modal";
import { SignatureModal } from "@/components/erp/SignatureModal";
import { useAuth } from "@/hooks/useAuth";

/* ─── Types ───────────────────────────────────────────────── */
type SurveyRow = {
  no: number;
  areaInspeksi: string;
  temuanHama: string;
  dokumentasi: string[];
  hasilTemuan: string;
};
type PriceData = {
  proposalType?: string;
  serviceType: string;
  monitoringRodentGlue: string;
  monitoringLiveTrap: string;
  monitoringHoyHoy: string;
  monitoringBlackHole: string;
  monitoringItems?: { label: string; value: string }[];
  treatmentItems?: string[];
  treatmentMethod: string;
  coverArea: string;
  price: string;
  visitSchedule: string;
  pestCover: string;
  paymentMethod: string;
  complaintHandling: string;
  contractDuration: string;
  notes: string;
  premiumServiceType?: string;
  premiumTreatmentMethod?: string;
  premiumPrice?: string;
  premiumRemarks?: string;
  premiumNotes?: string;
};
const defaultMonitoringItems = [
  { label: "Rodent Glue", value: "6 unit" },
  { label: "Live Trap", value: "2 unit" },
  { label: "Hoy Hoy Trap", value: "2 unit" },
  { label: "Black Hole Trap", value: "2 unit" },
];
const defaultPrice: PriceData = {
  serviceType: "Pest & Rodent Control",
  monitoringRodentGlue: "6 unit",
  monitoringLiveTrap: "2 unit",
  monitoringHoyHoy: "2 unit",
  monitoringBlackHole: "2 unit",
  monitoringItems: defaultMonitoringItems,
  treatmentItems: ["Rodent Monitoring", "Hand Sprayer", "Gel Baiting"],
  treatmentMethod: "Rodent Monitoring\nHand Sprayer\nGel Baiting",
  coverArea: "",
  price: "",
  visitSchedule: "Visit 2x/Month",
  pestCover: "Rodent, Cockroach, Ant, Mosquito",
  paymentMethod: "Monthly payment (TOP 30 days)",
  complaintHandling: "2x24 hours",
  contractDuration: "1 year contract",
  notes: "",
  premiumServiceType: "Termite Control\n(Baiting) - Premium",
  premiumTreatmentMethod: "Termite Control (TCK)\n1. Pemasangan baiting\n(umpan racun).",
  premiumPrice: "33.000.000,-\n(Exclude PPN 11%)",
  premiumRemarks: "1 tahun masa garansi\nGaransi Tidak Berlaku jika ada perubahan struktur bangunan / Renovasi\nQuality Check 2 times / tahun\nFull payment after treatment (TOP 30 days)",
  premiumNotes: "a. Service & Treatment conducted by Qualified Pest Control's Technicians\nb. If there any further issues, please directly contacts Fumakilla's team for immediate action",
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
const toDateInput = (v?: string) => v ? new Date(v).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
const normalizeSurveyRows = (rows: any[]): SurveyRow[] =>
  (Array.isArray(rows) ? rows : []).map((r: any) => ({
    ...r,
    dokumentasi: Array.isArray(r.dokumentasi) ? r.dokumentasi : (r.dokumentasi ? [r.dokumentasi] : []),
  }));
const buildEditSnapshot = (number: string, quotationDate: string, hasilSurvey: SurveyRow[], priceData: PriceData) =>
  JSON.stringify({ number, quotationDate, hasilSurvey, priceData });

/* ─── Design tokens ───────────────────────────────────────── */
const NAVY = "#2c3e5c";
const LINE = "#1a3560";
const LOGO = "/refrence/QuotationLogo.jpg";
const SLIDE_W = 960;
const SLIDE_H = 720;

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
    <div style={{ width: `${SLIDE_W}px`, height: `${SLIDE_H}px`, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", fontSize: "13px", pageBreakAfter: "always", overflow: "hidden" }}>
      <SlideHeader title={title} />
      <div style={{ flex: 1, padding: "0 28px 8px", overflow: "auto", minHeight: 0 }}>{children}</div>
      <SlideFooter pageNum={pageNum} />
    </div>
  );
}

function StaticReferencePage({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ width: `${SLIDE_W}px`, height: `${SLIDE_H}px`, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", overflow: "hidden", pageBreakAfter: "always" }}>
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
    </div>
  );
}

function StaticWithFooterPage({ src, alt, pageNum }: { src: string; alt: string; pageNum: number }) {
  return (
    <div style={{ width: `${SLIDE_W}px`, height: `${SLIDE_H}px`, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", overflow: "hidden", pageBreakAfter: "always" }}>
      <img src={src} alt={alt} style={{ flex: 1, width: "100%", objectFit: "contain", display: "block", minHeight: 0 }} />
      <SlideFooter pageNum={pageNum} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 1  —  Cover
═══════════════════════════════════════════════════════════ */
function Page1({ q, editMode, number, quotationDate, onNumberChange, onDateChange }: { q: any; editMode: boolean; number: string; quotationDate: string; onNumberChange: (v: string) => void; onDateChange: (v: string) => void }) {
  const inq = q?.inquiry;
  const segB2B = q?.segmentType === "B2B";
  const clientName = segB2B
    ? inq?.companyName || q?.customer?.company || q?.customer?.name || "—"
    : inq?.customerName || q?.customer?.name || "—";
  const clientAddr = inq?.address || q?.customer?.treatmentAddress || q?.customer?.address || "—";
  const qDate = quotationDate ? fmtDate(quotationDate) : "—";

  return (
    <div style={{ width: `${SLIDE_W}px`, minHeight: `${SLIDE_H}px`, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", pageBreakAfter: "always" }}>
      {/* Top white section */}
      <div style={{ flex: 1, padding: "24px 32px 20px", display: "flex", flexDirection: "column" }}>
        {/* Date + number top-left, logo top-right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            {editMode ? (
              <div style={{ display: "grid", gap: "6px", width: "220px" }}>
                <input type="date" value={quotationDate} onChange={e => onDateChange(e.target.value)} style={{ fontWeight: 800, fontSize: "13px", padding: "5px 7px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                <input value={number} onChange={e => onNumberChange(e.target.value)} style={{ fontWeight: 800, fontSize: "13px", padding: "5px 7px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
              </div>
            ) : (
              <>
                <p style={{ fontWeight: 900, fontSize: "14px", color: "#111", margin: 0, lineHeight: 1.8 }}>{qDate}</p>
                <p style={{ fontWeight: 900, fontSize: "14px", color: "#111", margin: 0 }}>{number || q?.number || "—"}</p>
              </>
            )}
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

      <img src="/refrence/Footer.png" alt="Footer" style={{ width: "100%", display: "block", flexShrink: 0 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE 2  —  A Glimpse of Fumakilla  (static image content)
═══════════════════════════════════════════════════════════ */
function Page2() {
  return <StaticWithFooterPage src="/refrence/quotation/halaman-1.png" alt="A Glimpse of Fumakilla" pageNum={2} />;
}

/* ═══════════════════════════════════════════════════════════
   PAGE 3  —  Our Products  (static image — halaman-2)
═══════════════════════════════════════════════════════════ */
function Page3() {
  return <StaticWithFooterPage src="/refrence/quotation/halaman-2.png" alt="Our Products" pageNum={3} />;
}

// ── Template dua jenis proposal (struktur mengikuti PPTX referensi) ──
// Halaman statis = render slide penuh (PNG) → mirip 100%.
// Halaman dinamis (cover/survey/price) = native/editable.
type PageDef =
  | { type: "image"; src: string; title: string }
  | { type: "cover"; title: string }
  | { type: "survey"; title: string }
  | { type: "price"; title: string }
  | { type: "premiumPrice"; title: string };

const slideImg = (deck: string, n: number) => `/refrence/quotation/${deck}/slide-${n}.png`;

const TEMPLATES: Record<string, { label: string; pages: PageDef[] }> = {
  GENERAL: {
    label: "Pest Umum",
    pages: [
      { type: "cover",  title: "Cover" },
      { type: "image",  title: "a Glimpse of Fumakilla",    src: slideImg("general", 2) },
      { type: "image",  title: "Our Products",              src: slideImg("general", 3) },
      { type: "image",  title: "Certifications",            src: slideImg("general", 4) },
      { type: "image",  title: "Ant & Rodent",              src: slideImg("general", 5) },
      { type: "image",  title: "Flies & Mosquito",          src: slideImg("general", 6) },
      { type: "image",  title: "Pest Control Method 1",     src: slideImg("general", 7) },
      { type: "image",  title: "Pest Control Method 2",     src: slideImg("general", 8) },
      { type: "image",  title: "Integrated Pest Mgmt",      src: slideImg("general", 9) },
      { type: "survey", title: "Hasil Survey" },
      { type: "price",  title: "Price Quotation" },
      { type: "image",  title: "Alur Proses Layanan",       src: slideImg("general", 12) },
      { type: "image",  title: "Thank You",                 src: slideImg("general", 13) },
    ],
  },
  TERMITE: {
    label: "Termite",
    pages: [
      { type: "cover",  title: "Cover" },
      { type: "image",  title: "a Glimpse of Fumakilla",    src: slideImg("termite", 2) },
      { type: "image",  title: "Our Products",              src: slideImg("termite", 3) },
      { type: "image",  title: "Certifications",            src: slideImg("termite", 4) },
      { type: "image",  title: "Termite Introduction",      src: slideImg("termite", 5) },
      { type: "image",  title: "Termite's Role",            src: slideImg("termite", 6) },
      { type: "image",  title: "Parts of Building Affected",src: slideImg("termite", 7) },
      { type: "image",  title: "Spraying Method",           src: slideImg("termite", 8) },
      { type: "image",  title: "Injection Method",          src: slideImg("termite", 9) },
      { type: "survey", title: "Hasil Survey" },
      { type: "price",  title: "Price Quotation" },
      { type: "premiumPrice", title: "Price (Premium)" },
      { type: "image",  title: "Alur Proses Layanan",       src: slideImg("termite", 13) },
      { type: "image",  title: "Thank You",                 src: slideImg("termite", 14) },
    ],
  },
};
const PROPOSAL_TYPES: { value: string; label: string }[] = [
  { value: "TERMITE", label: "Termite" },
  { value: "GENERAL", label: "Pest Umum" },
];
const proposalTypeLabel = (value: string) =>
  PROPOSAL_TYPES.find(t => t.value === value)?.label || "Pest Umum";

/* ═══════════════════════════════════════════════════════════
   PAGE 4  —  Fumakilla Indonesia (VAPE) Pest Control  (tabel sertifikat)
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
  return <StaticWithFooterPage src="/refrence/quotation/halaman-5.png" alt="Pest Control Method and Monitoring 1" pageNum={7} />;
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
  return <StaticWithFooterPage src="/refrence/quotation/halaman-6.png" alt="Pest Control Method and Monitoring 2" pageNum={8} />;
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
  return <StaticWithFooterPage src="/refrence/quotation/halaman-7.png" alt="Integrated Pest Management" pageNum={9} />;
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

function Page10({ rows, editMode, onChange, quotationId, title = "Hasil Survey", pageNum = 10 }: { rows: SurveyRow[]; editMode: boolean; onChange: (r: SurveyRow[]) => void; quotationId: string; title?: string; pageNum?: number }) {
  const [uploadingRows, setUploadingRows] = useState<Set<number>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});

  const addRow = () => onChange([...rows, { no: rows.length + 1, areaInspeksi: "", temuanHama: "", dokumentasi: [], hasilTemuan: "" }]);
  const del = (i: number) => onChange(rows.filter((_, j) => j !== i).map((r, j) => ({ ...r, no: j + 1 })));
  const upd = (i: number, k: keyof SurveyRow, v: string) => onChange(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const addPhoto = (rowIdx: number, paths: string[]) =>
    onChange(rows.map((r, j) => j === rowIdx ? { ...r, dokumentasi: [...(r.dokumentasi || []), ...paths] } : r));
  const removePhoto = (rowIdx: number, photoIdx: number) =>
    onChange(rows.map((r, j) => j === rowIdx ? { ...r, dokumentasi: (r.dokumentasi || []).filter((_, k) => k !== photoIdx) } : r));
  const uploadDoc = async (i: number, files?: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingRows(prev => new Set(prev).add(i));
    setUploadErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
    const paths: string[] = [];
    let errMsg = "";
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await api.post(`/erp/quotations/${quotationId}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        const p = res.data?.data?.path || res.data?.path || "";
        if (p) paths.push(p);
      } catch (err: any) {
        errMsg = err?.response?.data?.error || err?.message || "Gagal upload foto";
      }
    }
    setUploadingRows(prev => { const n = new Set(prev); n.delete(i); return n; });
    if (errMsg) setUploadErrors(prev => ({ ...prev, [i]: errMsg }));
    if (paths.length > 0) addPhoto(i, paths);
  };
  const COLS: { key: keyof SurveyRow; label: string; w?: string }[] = [
    { key: "no", label: "NO", w: "48px" },
    { key: "areaInspeksi", label: "AREA INSPEKSI" },
    { key: "temuanHama", label: "TEMUAN HAMA &\nPOTENSI HAMA" },
    { key: "dokumentasi", label: "DOKUMENTASI" },
    { key: "hasilTemuan", label: "HASIL TEMUAN DAN\nREKOMENDASI" },
  ];

  if (!editMode && rows.length > 4) {
    const chunks = Array.from({ length: Math.ceil(rows.length / 4) }, (_, i) => rows.slice(i * 4, i * 4 + 4));
    return (
      <div style={{ display: "grid", gap: "24px" }}>
        {chunks.map((chunk, i) => (
          <Page10
            key={i}
            rows={chunk}
            editMode={false}
            onChange={onChange}
            quotationId={quotationId}
            title={i === 0 ? "Hasil Survey" : `Hasil Survey ${i + 1}`}
            pageNum={10 + i}
          />
        ))}
      </div>
    );
  }

  return (
    <SlidePage title={title} pageNum={pageNum}>
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
                      {k === "dokumentasi" ? (
                        <div style={{ display: "grid", gap: "6px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {(r.dokumentasi || []).map((path, pi) => (
                              <div key={pi} style={{ position: "relative", width: (r.dokumentasi.length > 1 ? "calc(50% - 2px)" : "100%") }}>
                                <img src={fileUrl(path)} alt="Foto" onError={e => { (e.target as HTMLImageElement).style.border = "2px solid #dc2626"; (e.target as HTMLImageElement).title = "Gambar tidak dapat dimuat"; }} style={{ width: "100%", maxHeight: "80px", objectFit: "contain", background: "#f9f9f9", border: "1px solid #d1d5db", borderRadius: "4px", display: "block" }} />
                                <button type="button" onClick={() => removePhoto(i, pi)} style={{ position: "absolute", top: 2, right: 2, background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 3, padding: "1px 5px", cursor: "pointer", fontSize: "10px", lineHeight: 1 }}>×</button>
                              </div>
                            ))}
                          </div>
                          {uploadingRows.has(i) && (
                            <p style={{ margin: 0, fontSize: "10px", color: "#6b7280", fontStyle: "italic" }}>⏳ Mengupload foto...</p>
                          )}
                          {uploadErrors[i] && (
                            <p style={{ margin: 0, fontSize: "10px", color: "#dc2626" }}>⚠ {uploadErrors[i]}</p>
                          )}
                          <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploadingRows.has(i)} onChange={e => { uploadDoc(i, e.target.files); (e.target as HTMLInputElement).value = ""; }} style={{ width: "100%", fontSize: "10px", opacity: uploadingRows.has(i) ? 0.5 : 1 }} />
                        </div>
                      ) : (
                        <textarea rows={4} value={r[k]} onChange={e => upd(i, k, e.target.value)}
                          style={{ width: "100%", fontSize: "11px", padding: "5px", border: "1px solid #d1d5db", borderRadius: "4px", resize: "vertical", fontFamily: "inherit" }} />
                      )}
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
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {(r.dokumentasi || []).map((path, pi) => (
                        <img key={pi} src={fileUrl(path)} alt="Foto" onError={e => { (e.target as HTMLImageElement).alt = "⚠ Foto"; (e.target as HTMLImageElement).style.border = "1px solid #dc2626"; (e.target as HTMLImageElement).style.minHeight = "40px"; }} style={{ width: ((r.dokumentasi || []).length > 1 ? "calc(50% - 2px)" : "100%"), maxHeight: "110px", objectFit: "contain", background: "#fff", display: "block" }} />
                      ))}
                    </div>
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
  const monitoringItems = (pd.monitoringItems?.length ? pd.monitoringItems : [
    { label: "Rodent Glue", value: pd.monitoringRodentGlue },
    { label: "Live Trap", value: pd.monitoringLiveTrap },
    { label: "Hoy Hoy Trap", value: pd.monitoringHoyHoy },
    { label: "Black Hole Trap", value: pd.monitoringBlackHole },
  ]).filter(item => item.label || item.value);
  const setMonitoringItem = (idx: number, key: "label" | "value", value: string) => {
    const next = [...monitoringItems];
    next[idx] = { ...next[idx], [key]: value };
    onChange({ ...pd, monitoringItems: next });
  };
  const addMonitoringItem = () => onChange({ ...pd, monitoringItems: [...monitoringItems, { label: "", value: "" }] });
  const removeMonitoringItem = (idx: number) => onChange({ ...pd, monitoringItems: monitoringItems.filter((_, i) => i !== idx) });

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
            <div style={{ display: "grid", gap: "6px" }}>
              {monitoringItems.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 34px", gap: "6px", alignItems: "center" }}>
                  {inp(item.label, v => setMonitoringItem(i, "label", v), "Nama unit")}
                  {inp(item.value, v => setMonitoringItem(i, "value", v), "e.g. 6 unit")}
                  <button type="button" onClick={() => removeMonitoringItem(i)} style={{ height: "28px", border: "none", borderRadius: "4px", background: "#fee2e2", color: "#dc2626", cursor: "pointer" }}>x</button>
                </div>
              ))}
              <button type="button" onClick={addMonitoringItem} style={{ width: "150px", background: NAVY, color: "#fff", border: "none", padding: "6px 10px", borderRadius: "5px", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>+ Tambah Unit</button>
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
              {monitoringItems.map((item, i) => <p key={i} style={{ margin: "0 0 2px" }}>- {item.label} {item.value}</p>)}
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
function PageTermitePremium({ pd, editMode, onChange, pageNum }: { pd: PriceData; editMode: boolean; onChange: (v: PriceData) => void; pageNum: number }) {
  const set = (k: keyof PriceData) => (v: string) => onChange({ ...pd, [k]: v });
  const remarks = String(pd.premiumRemarks || "").split("\n").filter(Boolean);
  const priceLines = String(pd.premiumPrice || "").split("\n").filter(Boolean);

  if (editMode) {
    return (
      <SlidePage title="Price Quotation - Termite" pageNum={pageNum}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
          <label style={{ display: "block" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: "3px", fontSize: "11px" }}>Service Type</span>
            {inp(pd.premiumServiceType || "", set("premiumServiceType"), "Termite Control...", true)}
          </label>
          <label style={{ display: "block" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: "3px", fontSize: "11px" }}>Price</span>
            {inp(pd.premiumPrice || "", set("premiumPrice"), "33.000.000,-", true)}
          </label>
          <label style={{ gridColumn: "span 2", display: "block" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: "3px", fontSize: "11px" }}>Treatment Method</span>
            {inp(pd.premiumTreatmentMethod || "", set("premiumTreatmentMethod"), "Termite Control (TCK)...", true)}
          </label>
          <label style={{ gridColumn: "span 2", display: "block" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: "3px", fontSize: "11px" }}>Remarks</span>
            {inp(pd.premiumRemarks || "", set("premiumRemarks"), "Satu remark per baris", true)}
          </label>
          <label style={{ gridColumn: "span 2", display: "block" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: "3px", fontSize: "11px" }}>Note</span>
            {inp(pd.premiumNotes || "", set("premiumNotes"), "", true)}
          </label>
        </div>
      </SlidePage>
    );
  }

  return (
    <SlidePage title="Price Quotation - Termite" pageNum={pageNum}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "18px", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#344154", color: "#fff" }}>
            {[
              ["No", "5%"],
              ["Service Type", "20%"],
              ["Treatment Method", "21%"],
              ["Price", "22%"],
              ["Remarks", "32%"],
            ].map(([h, w]) => (
              <th key={h} style={{ width: w, padding: "10px 8px", textAlign: "center", fontWeight: 800, border: "1px solid #fff" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: "#d8e4f3" }}>
            <td style={{ padding: "28px 8px", textAlign: "center", border: "1px solid #fff", verticalAlign: "top" }}>1</td>
            <td style={{ padding: "28px 12px", textAlign: "center", border: "1px solid #fff", verticalAlign: "top", whiteSpace: "pre-line", fontWeight: 700 }}>{pd.premiumServiceType}</td>
            <td style={{ padding: "28px 12px", border: "1px solid #fff", verticalAlign: "top", whiteSpace: "pre-line", lineHeight: 1.45 }}>{pd.premiumTreatmentMethod}</td>
            <td style={{ padding: "28px 10px", textAlign: "center", border: "1px solid #fff", verticalAlign: "top", fontWeight: 800 }}>
              {priceLines.map((line, i) => (
                <p key={i} style={{ margin: "0 0 4px", color: i === 0 ? "#111" : "#f00" }}>
                  <span style={i === 0 ? { background: "#00ff1a", padding: "2px 4px" } : undefined}>{line}</span>
                </p>
              ))}
            </td>
            <td style={{ padding: "28px 12px", border: "1px solid #fff", verticalAlign: "top", lineHeight: 1.45 }}>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {remarks.map((item, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>
                    {i === 0 ? <span style={{ background: "#00ff1a", padding: "1px 4px" }}>{item}</span> : item}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
      {pd.premiumNotes && (
        <div style={{ marginTop: "24px", border: "1px solid #444", padding: "7px 10px", fontSize: "18px", lineHeight: 1.45, whiteSpace: "pre-line" }}>
          <strong>Note:</strong><br />{pd.premiumNotes}
        </div>
      )}
    </SlidePage>
  );
}

function Page12() {
  return <StaticWithFooterPage src="/refrence/quotation/halaman-10-alur.png" alt="Alur Proses Layanan" pageNum={12} />;
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
    <div style={{ width: `${SLIDE_W}px`, minHeight: `${SLIDE_H}px`, background: "#fff", fontFamily: "Arial, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", pageBreakAfter: "always" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 28px 12px", flexShrink: 0 }}>
        <img src={LOGO} alt="Fumakilla" style={{ height: "58px", objectFit: "contain" }} />
      </div>
      <div style={{ margin: "0 28px 6px", borderBottom: `2px solid ${LINE}`, flexShrink: 0 }} />

      {/* Center content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 40px" }}>
        <p style={{ fontSize: "52px", fontWeight: 700, color: "#1a4d8c", margin: "0 0 12px", textAlign: "center", letterSpacing: 2 }}>
          Thank you
        </p>
        <p style={{ fontSize: "22px", color: "#374151", textAlign: "center", margin: "0 0 16px" }}>
          どうもありがとうございました
        </p>
        <p style={{ fontSize: "14px", fontStyle: "italic", color: "#444", textAlign: "center", margin: "0 0 24px" }}>
          We're looking forward to have collaboration with you
        </p>
        <div style={{ width: 80, height: 3, backgroundColor: "#1a4d8c", borderRadius: 2 }} />
      </div>

      {/* Footer */}
      <img src="/refrence/Footer.png" alt="Footer" style={{ width: "100%", display: "block", flexShrink: 0 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const autoExportRef = useRef(false);
  const { data: q, loading, reload } = useGet<any>(`/erp/quotations/${id}`);
  const { user } = useAuth();
  const canApprove = ["ADMIN", "MANAGER", "Super Admin"].includes((user as any)?.role);
  const approved = Boolean(q?.approvedAt);

  const slideWrapRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [hasilSurvey, setHasilSurvey] = useState<SurveyRow[]>([]);
  const [priceData, setPriceData] = useState<PriceData>(defaultPrice);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(toDateInput());
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const savedSnapshotRef = useRef("");

  useEffect(() => {
    if (q) {
      const nextHasilSurvey = normalizeSurveyRows(q.hasilSurvey);
      const nextPriceData = q.priceData && typeof q.priceData === "object" ? { ...defaultPrice, ...q.priceData } : defaultPrice;
      const nextNumber = q.number || "";
      const nextQuotationDate = toDateInput(q.quotationDate);
      setHasilSurvey(nextHasilSurvey);
      setPriceData(nextPriceData);
      setQuotationNumber(nextNumber);
      setQuotationDate(nextQuotationDate);
      savedSnapshotRef.current = buildEditSnapshot(nextNumber, nextQuotationDate, nextHasilSurvey, nextPriceData);
    }
  }, [q]);

  const resetDraftFromQuotation = () => {
    if (!q) return;
    const nextHasilSurvey = normalizeSurveyRows(q.hasilSurvey);
    const nextPriceData = q.priceData && typeof q.priceData === "object" ? { ...defaultPrice, ...q.priceData } : defaultPrice;
    const nextNumber = q.number || "";
    const nextQuotationDate = toDateInput(q.quotationDate);
    setHasilSurvey(nextHasilSurvey);
    setPriceData(nextPriceData);
    setQuotationNumber(nextNumber);
    setQuotationDate(nextQuotationDate);
    savedSnapshotRef.current = buildEditSnapshot(nextNumber, nextQuotationDate, nextHasilSurvey, nextPriceData);
  };

  const proposalType = ((priceData as any)?.proposalType as string) || "TERMITE";
  const template = TEMPLATES[proposalType] || TEMPLATES.GENERAL;
  const pageDefs = template.pages;
  const totalPages = pageDefs.length;
  const currentDef = pageDefs[currentPage - 1];
  const canEdit = currentDef ? ["cover", "survey", "price", "premiumPrice"].includes(currentDef.type) : false;
  const hasUnsavedChanges = () =>
    savedSnapshotRef.current !== buildEditSnapshot(quotationNumber, quotationDate, hasilSurvey, priceData);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/erp/quotations/${id}`, { number: quotationNumber, quotationDate, hasilSurvey, priceData });
      savedSnapshotRef.current = buildEditSnapshot(quotationNumber, quotationDate, hasilSurvey, priceData);
      setEditMode(false);
      setSavedMsg("Tersimpan!");
      setTimeout(() => setSavedMsg(""), 2500);
      reload?.(); // edit membatalkan approval di backend → muat ulang status
    } catch { showAlert({ title: "Gagal menyimpan", message: "Gagal menyimpan. Coba lagi.", tone: "danger" }); }
    finally { setSaving(false); }
  };

  const approve = async (signature: string) => {
    setApproving(true);
    try {
      await api.post(`/erp/quotations/${id}/approve`, { signature });
      setSigOpen(false);
      reload?.();
    } catch (e: any) {
      showAlert({ title: "Gagal approve", message: e?.response?.data?.error || "Gagal approve quotation.", tone: "danger" });
    } finally { setApproving(false); }
  };

  const exportAllPdf = async () => {
    if (typeof window === "undefined") return;
    setExportingPdf(true);
    const prevPage = currentPage;
    const wasEditing = editMode;
    setEditMode(false);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      for (let p = 1; p <= totalPages; p++) {
        setCurrentPage(p);
        await new Promise(resolve => setTimeout(resolve, 800));

        const pageEl = slideWrapRef.current?.firstElementChild as HTMLElement | null;
        if (!pageEl) continue;

        window.scrollTo(0, 0);
        pageEl.scrollIntoView({ block: "start", behavior: "instant" });
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150))));

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        if (p > 1) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfW, pdfH);
      }

      pdf.save(downloadName({ doc: "Quotation", client: clientName !== "—" ? clientName : null, info: quotationNumber || q.number, ext: "pdf" }));
    } finally {
      setCurrentPage(prevPage);
      if (wasEditing) setEditMode(true);
      setExportingPdf(false);
    }
  };

  // Export PPT NATIVE (bukan full gambar) — tiap halaman jadi elemen editable via domToPptx.
  const exportAllPpt = async () => {
    if (typeof window === "undefined") return;
    setExportingPdf(true);
    const prevPage = currentPage;
    const wasEditing = editMode;
    setEditMode(false);
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const { renderPageToSlide } = await import("@/lib/domToPptx");
      const pptx = new pptxgen();
      pptx.defineLayout({ name: "Q43", width: 10, height: 7.5 }); // 4:3, sesuai slide 960x720
      pptx.layout = "Q43";
      for (let p = 1; p <= totalPages; p++) {
        setCurrentPage(p);
        await new Promise(resolve => setTimeout(resolve, 800));
        const pageEl = slideWrapRef.current?.firstElementChild as HTMLElement | null;
        if (!pageEl) continue;
        window.scrollTo(0, 0);
        pageEl.scrollIntoView({ block: "start", behavior: "instant" });
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150))));
        const slide = pptx.addSlide();
        slide.background = { color: "FFFFFF" };
        await renderPageToSlide(pptx, slide, pageEl, { pageWIn: 10, pageHIn: 7.5 });
      }
      await pptx.writeFile({ fileName: downloadName({ doc: "Quotation", client: clientName !== "—" ? clientName : null, info: quotationNumber || q.number, ext: "pptx" }) });
    } finally {
      setCurrentPage(prevPage);
      if (wasEditing) setEditMode(true);
      setExportingPdf(false);
    }
  };

  // Auto-download saat dibuka dari tombol Download di list (?export=pdf|ppt).
  useEffect(() => {
    const action = searchParams.get("export");
    if (!q || autoExportRef.current || !["pdf", "ppt"].includes(action || "")) return;
    autoExportRef.current = true;
    if (!q.approvedAt) {
      showAlert({ title: "Belum di-approve", message: "Quotation harus di-approve (tanda tangan) dulu sebelum bisa didownload.", tone: "danger" });
      return;
    }
    if (action === "pdf") void exportAllPdf();
    if (action === "ppt") void exportAllPpt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, searchParams]);

  const goToPage = (page: number) => {
    if (page === currentPage) return;
    if (editMode && hasUnsavedChanges()) { setPendingPage(page); return; }
    if (editMode) setEditMode(false);
    setCurrentPage(page);
  };
  const saveAndGo = async () => {
    if (pendingPage == null) return;
    const nextPage = pendingPage;
    if (editMode) await save();
    setCurrentPage(nextPage);
    setPendingPage(null);
  };
  const discardAndGo = () => {
    if (pendingPage == null) return;
    resetDraftFromQuotation();
    setEditMode(false);
    setCurrentPage(pendingPage);
    setPendingPage(null);
  };

  const clientName = (() => {
    if (!q) return "—";
    const inq = q.inquiry;
    if (q.segmentType === "B2B") return inq?.companyName || q.customer?.company || q.customer?.name || "—";
    return inq?.customerName || q.customer?.name || "—";
  })();

  const renderPage = () => {
    const def = pageDefs[currentPage - 1];
    if (!def) return null;
    if (def.type === "image")  return <StaticReferencePage src={def.src} alt={def.title} />;
    if (def.type === "cover")  return <Page1 q={q} editMode={editMode} number={quotationNumber} quotationDate={quotationDate} onNumberChange={setQuotationNumber} onDateChange={setQuotationDate} />;
    if (def.type === "survey") return <Page10 rows={hasilSurvey} editMode={editMode} onChange={setHasilSurvey} quotationId={id} pageNum={currentPage} />;
    if (def.type === "price")  return <Page11 pd={priceData} editMode={editMode} onChange={setPriceData} clientName={clientName} />;
    if (def.type === "premiumPrice") return <PageTermitePremium pd={priceData} editMode={editMode} onChange={setPriceData} pageNum={currentPage} />;
    return null;
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
          {pageDefs.map((def, i) => (
            <button key={i} onClick={() => goToPage(i + 1)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: "6px", border: "none",
                background: currentPage === i + 1 ? NAVY : "transparent",
                color: currentPage === i + 1 ? "#fff" : "#515866",
                fontSize: "11px", fontWeight: currentPage === i + 1 ? 700 : 500,
                cursor: "pointer", marginBottom: "2px" }}>
              <span style={{ fontWeight: 800, marginRight: "5px", opacity: .6 }}>{i + 1}.</span>{def.title}
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
            <p style={{ fontWeight: 800, fontSize: "14px", color: NAVY, margin: 0 }}>{quotationNumber || q.number}</p>
            <p style={{ fontSize: "11px", color: "#6a7180", margin: 0 }}>{clientName} · {q.segmentType}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#6a7180" }} title="Jenis proposal dikunci saat quotation dibuat">
            Jenis
            <span style={{ fontSize: "12px", fontWeight: 700, color: NAVY, border: "1px solid #d9ddeb", borderRadius: "6px", padding: "4px 8px", background: "#f8fafc" }}>
              {proposalTypeLabel(proposalType)}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>← Prev</button>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", minWidth: "80px", textAlign: "center" }}>Hal {currentPage} / {totalPages}</span>
            <button onClick={() => goToPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Next →</button>
            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)} className="btn" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px", borderColor: NAVY, color: NAVY }}>✏️ Edit</button>
            )}
            {editMode && (
              <>
                <button onClick={() => { resetDraftFromQuotation(); setEditMode(false); }} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Batal</button>
                <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px" }}>
                  {saving ? "Menyimpan..." : "💾 Simpan"}
                </button>
              </>
            )}
            {savedMsg && <span style={{ color: "#16713b", fontWeight: 700, fontSize: "12px" }}>✓ {savedMsg}</span>}
            {/* Approval — download PDF/PPT di list terkunci sampai ini di-approve. */}
            {!editMode && (
              approved
                ? <span style={{ color: "#16713b", fontWeight: 700, fontSize: "12px" }} title={q.approvedAt ? new Date(q.approvedAt).toLocaleString("id-ID") : ""}>✓ Approved{q.approvedByName ? ` — ${q.approvedByName}` : ""}</span>
                : canApprove
                  ? <button onClick={() => setSigOpen(true)} className="btn btn-primary" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px" }}>✍️ Approve (TTD)</button>
                  : <span style={{ color: "#b45309", fontWeight: 600, fontSize: "12px" }}>Belum di-approve</span>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflowY: "auto", background: "#e5e7eb", display: "flex", justifyContent: "center", padding: "32px 24px" }} className="print:p-0 print:bg-white print:block">
          <div ref={slideWrapRef}>
            {renderPage()}
          </div>
        </div>
      </div>

      {pendingPage !== null && (
        <div className="print:hidden" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ width: "380px", background: "#fff", borderRadius: "8px", boxShadow: "0 20px 60px rgba(0,0,0,.24)", padding: "20px" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#111827" }}>Simpan perubahan?</h3>
            <p style={{ margin: "0 0 18px", fontSize: "13px", lineHeight: 1.6, color: "#4b5563" }}>
              Ada perubahan di halaman ini. Simpan dulu sebelum pindah halaman agar data tidak hilang.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setPendingPage(null)} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Batal</button>
              <button onClick={discardAndGo} className="btn" style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}>Jangan Simpan</button>
              <button onClick={saveAndGo} disabled={saving} className="btn btn-primary" style={{ minHeight: "34px", padding: "6px 14px", fontSize: "12px" }}>{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      <SignatureModal open={sigOpen} onClose={() => setSigOpen(false)} onSubmit={approve} saving={approving} title="Tanda Tangan Approval Quotation" />

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
