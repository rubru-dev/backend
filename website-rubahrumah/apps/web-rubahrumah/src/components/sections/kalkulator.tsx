"use client";

import { useState, useMemo } from "react";
import { Calculator, MessageCircle, Minus, Plus, Settings, Home, CheckCircle } from "lucide-react";

/* ─── Tipe & Konstanta ─── */
type Paket      = "MINIMALIS" | "LUXURY";
type Dinding    = "BATA_MERAH" | "HEBEL";
type LantaiMat  = "KERAMIK_40" | "KERAMIK_60" | "GRANIT";
type Atap       = "GENTENG_METAL" | "GENTENG_KERAMIK" | "BAJA_RINGAN";
type Plafon     = "GYPSUM" | "PVC";
type Kusen      = "ALUMINIUM" | "KAYU_KAMPER" | "UPVC";
type Dapur      = "STANDARD" | "KITCHEN_SET";
type Carport    = "TIDAK_ADA" | "CARPORT" | "GARASI";
type Taman      = "TIDAK_ADA" | "TAMAN_DEPAN";

// Default fallback constants
const DEFAULT_BASE: Record<string, number> = { MINIMALIS: 3_000_000, LUXURY: 5_000_000 };
const DEFAULT_SURCHARGE: Record<string, number> = {
  HEBEL: 100_000,
  KERAMIK_60: 80_000, GRANIT: 200_000,
  GENTENG_KERAMIK: 50_000, BAJA_RINGAN: 80_000,
  PVC: -50_000,
  KAYU_KAMPER: 120_000, UPVC: 150_000,
  KITCHEN_SET: 500_000,
  CARPORT: 300_000, GARASI: 600_000,
  TAMAN_DEPAN: 200_000,
};

function normalizePrices(data: any, defaults: Record<string, number>): Record<string, number> {
  if (!data) return defaults;
  if (Array.isArray(data)) {
    if (data.length === 0) return defaults;
    return Object.fromEntries(data.map((item: any) => [item.key, Number(item.harga)]));
  }
  const result = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Number(v)]));
  return Object.keys(result).length > 0 ? result : defaults;
}

const SPESIFIKASI: Record<Paket, string[]> = {
  MINIMALIS: [
    "Pondasi batu kali + besi cakar ayam",
    "Sloof & ring balk beton bertulang",
    "Kolom & balok struktur standar SNI",
    "Instalasi listrik & titik lampu",
    "Cat dinding interior & eksterior",
    "Instalasi air bersih & pembuangan",
    "Closet duduk & wastafel keramik",
    "Pintu panel & jendela kaca",
    "Rangka atap & penutup atap",
    "Garansi konstruksi 10 tahun",
  ],
  LUXURY: [
    "Pondasi bore pile & besi ulir",
    "Sloof & ring balk beton prategang",
    "Kolom & balok struktur premium",
    "Instalasi listrik 3 phase + smart home",
    "Cat premium & wallpaper pilihan",
    "Instalasi air panas & dingin",
    "Sanitary premium (TOTO/American Standard)",
    "Pintu kayu solid & jendela tempered",
    "Rangka baja ringan + atap premium",
    "Garansi konstruksi 15 tahun",
  ],
};

/* ─── Helper UI ─── */
function ToggleBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
        active
          ? "bg-[#FF9122] text-white border-[#FF9122]"
          : "bg-white text-slate-500 border-slate-200 hover:border-[#FF9122] hover:text-[#FF9122]"
      }`}
    >
      {children}
    </button>
  );
}

function Counter({ value, onChange, min = 0, max = 10 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-[#FF9122] hover:text-[#FF9122] transition-all"
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center font-bold text-[#0A5168]">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-full bg-[#FF9122] border-2 border-[#FF9122] flex items-center justify-center text-white hover:bg-orange-500 transition-all"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ─── Komponen Utama ─── */
export function Kalkulator({ basePrices, surcharges: surchargesData, spesifikasi: spesifikasiData }: { basePrices?: any; surcharges?: any; spesifikasi?: Record<string, string[]> } = {}) {
  // useMemo so objects don't change reference on re-render (avoids dep array issues below)
  const BASE     = useMemo(() => normalizePrices(basePrices,     DEFAULT_BASE),     [basePrices]);
  const SURCHARGE = useMemo(() => normalizePrices(surchargesData, DEFAULT_SURCHARGE), [surchargesData]);

  const [paket,       setPaket]       = useState<Paket>("MINIMALIS");
  const [lantai,      setLantai]      = useState(1);
  const [luas,        setLuas]        = useState(120);
  // Per-lantai: array length = jumlah lantai
  const [kamarTidurPerLantai, setKamarTidurPerLantai] = useState<number[]>([3]);
  const [kamarMandiPerLantai, setKamarMandiPerLantai] = useState<number[]>([2]);

  // Adjust array lengths when lantai changes
  function handleLantaiChange(n: number) {
    setLantai(n);
    setKamarTidurPerLantai((prev) => {
      const arr = [...prev];
      while (arr.length < n) arr.push(arr[arr.length - 1] ?? 0);
      return arr.slice(0, n);
    });
    setKamarMandiPerLantai((prev) => {
      const arr = [...prev];
      while (arr.length < n) arr.push(arr[arr.length - 1] ?? 0);
      return arr.slice(0, n);
    });
  }

  const totalKamarTidur = kamarTidurPerLantai.reduce((a, b) => a + b, 0);
  const totalKamarMandi = kamarMandiPerLantai.reduce((a, b) => a + b, 0);
  const [dapur,       setDapur]       = useState<Dapur>("STANDARD");
  const [carport,     setCarport]     = useState<Carport>("CARPORT");
  const [taman,       setTaman]       = useState<Taman>("TAMAN_DEPAN");
  const [dinding,     setDinding]     = useState<Dinding>("BATA_MERAH");
  const [lantaiMat,   setLantaiMat]   = useState<LantaiMat>("KERAMIK_40");
  const [atap,        setAtap]        = useState<Atap>("GENTENG_METAL");
  const [plafon,      setPlafon]      = useState<Plafon>("GYPSUM");
  const [kusen,       setKusen]       = useState<Kusen>("ALUMINIUM");

  const { total, perM2 } = useMemo(() => {
    const base = BASE[paket] ?? 0;
    const kamarTidurSurcharge = SURCHARGE["KAMAR_TIDUR"] ?? 50_000;
    const kamarMandiSurcharge = SURCHARGE["KAMAR_MANDI"] ?? 80_000;
    const surcharge =
      (SURCHARGE[dinding]   ?? 0) +
      (SURCHARGE[lantaiMat] ?? 0) +
      (SURCHARGE[atap]      ?? 0) +
      (SURCHARGE[plafon]    ?? 0) +
      (SURCHARGE[kusen]     ?? 0) +
      (SURCHARGE[dapur]     ?? 0) +
      (SURCHARGE[carport]   ?? 0) +
      (SURCHARGE[taman]     ?? 0) +
      totalKamarTidur * kamarTidurSurcharge +
      totalKamarMandi * kamarMandiSurcharge;

    const hargaPerM2 = base + surcharge;
    const totalHarga = hargaPerM2 * luas * lantai;
    return { total: totalHarga, perM2: hargaPerM2 };
  }, [BASE, SURCHARGE, paket, lantai, luas, totalKamarTidur, totalKamarMandi, dapur, carport, taman, dinding, lantaiMat, atap, plafon, kusen]);

  const fmt = (n: number) =>
    "Rp. " + n.toLocaleString("id-ID");

  const kamarDetail = lantai > 1
    ? kamarTidurPerLantai.map((kt, i) => `\n  Lantai ${i + 1}: ${kt} KT, ${kamarMandiPerLantai[i]} KM`).join("")
    : `${totalKamarTidur} Kamar Tidur, ${totalKamarMandi} Kamar Mandi`;
  const waMsg = encodeURIComponent(
    `Halo Rubah Rumah, saya ingin konsultasi estimasi biaya:\n\nPaket: ${paket}\nLantai: ${lantai}\nLuas: ${luas} m²\nKamar: ${kamarDetail}\nEstimasi: ${fmt(total)}`
  );

  const specs = spesifikasiData?.[paket] ?? SPESIFIKASI[paket] ?? [];

  return (
    <section className="py-14 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">

        {/* Judul */}
        <h2 className="text-2xl md:text-3xl font-bold text-[#0A5168] text-center mb-8 flex items-center justify-center gap-2">
          <Calculator size={28} className="text-[#0A5168]" />
          Kalkulator Estimasi Rubah Rumah
        </h2>

        {/* Tab Paket */}
        <div className="flex rounded-xl overflow-hidden border-2 border-slate-200 mb-8 bg-white">
          {(["MINIMALIS", "LUXURY"] as Paket[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPaket(p)}
              className={`flex-1 py-3 text-sm font-bold transition-all ${
                paket === p
                  ? "bg-[#FF9122] text-white"
                  : "text-slate-400 hover:text-[#FF9122] bg-white"
              }`}
            >
              Spesifikasi Renovasi {p === "MINIMALIS" ? "Minimalis" : "Luxury"}
            </button>
          ))}
        </div>

        {/* 2-kolom form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* KIRI — Informasi Bangunan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="font-bold text-[#0A5168] flex items-center gap-2">
              <Home size={16} className="text-[#FF9122]" />
              Informasi Bangunan
            </h3>

            {/* Jumlah Lantai */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Jumlah Lantai</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLantaiChange(l)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                      lantai === l
                        ? "bg-[#FF9122] text-white border-[#FF9122]"
                        : "border-slate-200 text-slate-500 hover:border-[#FF9122]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Luas Bangunan */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Luas Bangunan (m²)</label>
              <input
                type="number"
                value={luas === 0 ? "" : luas}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setLuas(parseInt(e.target.value) || 0)}
                onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) setLuas(1); }}
                placeholder="Masukkan luas bangunan..."
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#FF9122] transition-colors"
              />
            </div>

            {/* Kamar Tidur per lantai */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Jumlah Kamar Tidur</label>
              <div className="space-y-2">
                {kamarTidurPerLantai.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {lantai > 1 && (
                      <span className="text-xs text-slate-400 w-14 shrink-0">Lantai {idx + 1}</span>
                    )}
                    <Counter
                      value={val}
                      onChange={(v) => setKamarTidurPerLantai((prev) => { const a = [...prev]; a[idx] = v; return a; })}
                      min={0}
                      max={10}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Kamar Mandi per lantai */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Jumlah Kamar Mandi</label>
              <div className="space-y-2">
                {kamarMandiPerLantai.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {lantai > 1 && (
                      <span className="text-xs text-slate-400 w-14 shrink-0">Lantai {idx + 1}</span>
                    )}
                    <Counter
                      value={val}
                      onChange={(v) => setKamarMandiPerLantai((prev) => { const a = [...prev]; a[idx] = v; return a; })}
                      min={0}
                      max={6}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dapur */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Dapur</label>
              <div className="flex gap-2">
                <ToggleBtn active={dapur === "STANDARD"}     onClick={() => setDapur("STANDARD")}>Standard</ToggleBtn>
                <ToggleBtn active={dapur === "KITCHEN_SET"}  onClick={() => setDapur("KITCHEN_SET")}>Kitchen Set</ToggleBtn>
              </div>
            </div>

            {/* Carport / Garasi */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Carport / Garasi</label>
              <div className="flex gap-2">
                <ToggleBtn active={carport === "TIDAK_ADA"} onClick={() => setCarport("TIDAK_ADA")}>Tidak Ada</ToggleBtn>
                <ToggleBtn active={carport === "CARPORT"}   onClick={() => setCarport("CARPORT")}>Carport</ToggleBtn>
                <ToggleBtn active={carport === "GARASI"}    onClick={() => setCarport("GARASI")}>Garasi</ToggleBtn>
              </div>
            </div>

            {/* Taman */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Taman</label>
              <div className="flex gap-2">
                <ToggleBtn active={taman === "TIDAK_ADA"}    onClick={() => setTaman("TIDAK_ADA")}>Tidak Ada</ToggleBtn>
                <ToggleBtn active={taman === "TAMAN_DEPAN"}  onClick={() => setTaman("TAMAN_DEPAN")}>Taman Depan</ToggleBtn>
              </div>
            </div>
          </div>

          {/* KANAN — Spesifikasi & Material */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="font-bold text-[#0A5168] flex items-center gap-2">
              <Settings size={16} className="text-[#FF9122]" />
              Spesifikasi & Material
            </h3>

            {/* Dinding */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Dinding</label>
              <div className="flex gap-2">
                <ToggleBtn active={dinding === "BATA_MERAH"} onClick={() => setDinding("BATA_MERAH")}>Bata Merah</ToggleBtn>
                <ToggleBtn active={dinding === "HEBEL"}      onClick={() => setDinding("HEBEL")}>Hebel</ToggleBtn>
              </div>
            </div>

            {/* Lantai */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Lantai</label>
              <div className="flex gap-2">
                <ToggleBtn active={lantaiMat === "KERAMIK_40"} onClick={() => setLantaiMat("KERAMIK_40")}>Keramik 40x40</ToggleBtn>
                <ToggleBtn active={lantaiMat === "KERAMIK_60"} onClick={() => setLantaiMat("KERAMIK_60")}>Keramik 60x60</ToggleBtn>
                <ToggleBtn active={lantaiMat === "GRANIT"}     onClick={() => setLantaiMat("GRANIT")}>Granit</ToggleBtn>
              </div>
            </div>

            {/* Atap */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Atap</label>
              <div className="flex gap-2">
                <ToggleBtn active={atap === "GENTENG_METAL"}    onClick={() => setAtap("GENTENG_METAL")}>Genteng Metal</ToggleBtn>
                <ToggleBtn active={atap === "GENTENG_KERAMIK"}  onClick={() => setAtap("GENTENG_KERAMIK")}>Genteng Keramik</ToggleBtn>
                <ToggleBtn active={atap === "BAJA_RINGAN"}      onClick={() => setAtap("BAJA_RINGAN")}>Baja Ringan</ToggleBtn>
              </div>
            </div>

            {/* Plafon */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Plafon</label>
              <div className="flex gap-2">
                <ToggleBtn active={plafon === "GYPSUM"} onClick={() => setPlafon("GYPSUM")}>Gypsum</ToggleBtn>
                <ToggleBtn active={plafon === "PVC"}    onClick={() => setPlafon("PVC")}>PVC</ToggleBtn>
              </div>
            </div>

            {/* Kusen */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Kusen Pintu & Jendela</label>
              <div className="flex gap-2">
                <ToggleBtn active={kusen === "ALUMINIUM"}   onClick={() => setKusen("ALUMINIUM")}>Aluminium</ToggleBtn>
                <ToggleBtn active={kusen === "KAYU_KAMPER"} onClick={() => setKusen("KAYU_KAMPER")}>Kayu Kamper</ToggleBtn>
                <ToggleBtn active={kusen === "UPVC"}        onClick={() => setKusen("UPVC")}>UPVC</ToggleBtn>
              </div>
            </div>
          </div>
        </div>

        {/* Hasil Estimasi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
            <div>
              <p className="text-xs text-slate-400 mb-1">Estimasi Biaya Renovasi</p>
              <p className="text-4xl font-bold text-[#FF9122]">{fmt(total)}</p>
              <p className="text-xs text-slate-400 mt-1">*Harga dapat berubah sesuai kondisi lapangan</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mb-1">
                <span className="w-3 h-3 rounded-full border border-slate-300 inline-block" />
                Berdasarkan luas {luas} m² × {lantai} lantai
              </p>
              <p className="text-sm font-bold text-[#FF9122]">
                {fmt(perM2)} / m²
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`https://wa.me/6281376405550?text=${waMsg}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 btn-outline-orange justify-center gap-2 py-3"
            >
              <MessageCircle size={16} />
              Konsultasi Sekarang
            </a>
          </div>
        </div>

        {/* Spesifikasi Termasuk */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h4 className="font-bold text-[#0A5168] mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-[#FF9122]" />
            Spesifikasi Termasuk:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {specs.map((s) => (
              <div key={s} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={14} className="text-[#FF9122] flex-shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
