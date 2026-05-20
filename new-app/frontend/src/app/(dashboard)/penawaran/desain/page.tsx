"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye, Save, Search, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import { downloadOfferPdf } from "@/lib/download-offer-pdf";

const PACKAGES = {
  "Paket Desain Basic": {
    timeline: "4 - 7 Hari",
    price: 2500000,
    termin1: {
      days: "4 Hari Kerja",
      items: ["Desain 3D Eksterior/Fasad - 2 View", "Gambar Kerja 2D - Layout Eksisting", "Gambar Kerja 2D - Layout Perubahan"],
    },
    termin2: {
      days: "3 Hari Kerja",
      items: ["Gambar Interior 3D", "RAB (Rencana Anggaran Biaya)"],
    },
  },
  "Paket Desain Standart": {
    timeline: "7 - 14 Hari",
    price: 6800000,
    termin1: {
      days: "7 Hari Kerja",
      items: [
        "Desain 3D Eksterior/Fasad - 2 View",
        "Gambar Kerja 2D - Detail Fasad",
        "Gambar Kerja 2D - Layout Struktur Pondasi",
        "Gambar Kerja 2D - Layout Struktur Kolom",
        "Gambar Kerja 2D - Layout Struktur Balokan",
        "Gambar Kerja 2D - Layout Electrical (Lampu, Stop Kontak, Saklar)",
        "Gambar Kerja 2D - Layout Plumbing (Air Bersih, Air Tinja dan Air Kotor)",
        "Gambar Kerja 2D - Potongan Bujur (A-A)",
        "Gambar Kerja 2D - Potongan Melintang (B-B)",
      ],
    },
    termin2: {
      days: "7 Hari Kerja",
      items: ["Gambar Interior 3D - 7 View", "RAB (Rencana Anggaran Biaya)"],
    },
  },
  "Paket Desain Premium": {
    timeline: "14 - 21 Hari",
    price: 8500000,
    termin1: {
      days: "10 Hari Kerja",
      items: [
        "Desain 3D Eksterior/Fasad - 3 View",
        "Gambar Kerja 2D - Detail Fasad",
        "Gambar Kerja 2D - Layout Struktur Pondasi",
        "Gambar Kerja 2D - Layout Struktur Kolom",
        "Gambar Kerja 2D - Layout Struktur Balokan",
        "Gambar Kerja 2D - Layout Electrical (Lampu, Stop Kontak, Saklar)",
        "Gambar Kerja 2D - Layout Plumbing (Air Bersih, Air Tinja dan Air Kotor)",
        "Gambar Kerja 2D - Layout Pintu dan Jendela",
        "Gambar Kerja 2D - Layout Finishing Plafond",
        "Gambar Kerja 2D - Layout Finishing Lantai",
        "Gambar Kerja 2D - Layout Finishing Dinding",
        "Gambar Kerja 2D - Detail Struktur",
        "Gambar Kerja 2D - Detail Pintu dan Jendela",
        "Gambar Kerja 2D - Detail Finishing Plafond",
        "Gambar Kerja 2D - Detail Finishing Lantai",
        "Gambar Kerja 2D - Detail Arsitektur",
        "Gambar Kerja 2D - Potongan Bujur (A-A)",
        "Gambar Kerja 2D - Potongan Melintang (B-B)",
      ],
    },
    termin2: {
      days: "11 Hari Kerja",
      items: ["Gambar Interior 3D - 13 View", "RAB (Rencana Anggaran Biaya)"],
    },
  },
  "Paket Desain Deluxe": {
    timeline: "21 - 28 Hari",
    price: 15800000,
    termin1: {
      days: "14 Hari Kerja",
      items: [
        "Desain 3D Eksterior/Fasad - 4 View",
        "Gambar Kerja 2D - Detail Fasad",
        "Gambar Kerja 2D - Layout Struktur Pondasi",
        "Gambar Kerja 2D - Layout Struktur Kolom",
        "Gambar Kerja 2D - Layout Struktur Balokan",
        "Gambar Kerja 2D - Layout Sloof",
        "Gambar Kerja 2D - Layout Electrical (Lampu, Stop Kontak, Saklar)",
        "Gambar Kerja 2D - Layout Plumbing (Air Bersih, Air Tinja dan Air Kotor)",
        "Gambar Kerja 2D - Layout Pintu dan Jendela",
        "Gambar Kerja 2D - Layout Finishing Plafond",
        "Gambar Kerja 2D - Layout Finishing Lantai",
        "Gambar Kerja 2D - Layout Finishing Dinding",
        "Gambar Kerja 2D - Detail Struktur",
        "Gambar Kerja 2D - Detail Pintu dan Jendela",
        "Gambar Kerja 2D - Detail Finishing Plafond",
        "Gambar Kerja 2D - Detail Finishing Lantai",
        "Gambar Kerja 2D - Detail Arsitektur",
        "Gambar Kerja 2D - Potongan Bujur (A-A)",
        "Gambar Kerja 2D - Potongan Melintang (B-B)",
      ],
    },
    termin2: {
      days: "14 Hari Kerja",
      items: ["Gambar Interior 3D - 16 View", "RAB (Rencana Anggaran Biaya)"],
    },
  },
} as const;

const IDR = (n: number) => `Rp. ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
const STORAGE_KEY = "rubahrumah.penawaran.desain";

type SavedOffer = {
  id: string;
  createdAt: string;
  clientId: string;
  salutation: "Mr" | "Mrs";
  roId: string;
  tanggal: string;
  luasTanah: string;
  paketName: keyof typeof PACKAGES;
  clientName: string;
  roName: string;
  total: number;
};

function rawClientName(c: any) {
  const raw = String(c?.nama ?? "").trim();
  return raw.replace(/^(Mr|Mrs)\.?\s+/i, "").trim();
}

function clientSalutation(c: any) {
  const salutation = String(c?.salutation ?? "").trim();
  if (/^mrs$/i.test(salutation)) return "Mrs";
  if (/^mr$/i.test(salutation)) return "Mr";
  return null;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function formatDateID(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateFile(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return [day, month, year].filter(Boolean).join("-");
}

function terbilang(value: number) {
  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const read = (n: number): string => {
    if (n < 12) return satuan[n];
    if (n < 20) return `${read(n - 10)} Belas`;
    if (n < 100) return `${read(Math.floor(n / 10))} Puluh ${read(n % 10)}`.trim();
    if (n < 200) return `Seratus ${read(n - 100)}`.trim();
    if (n < 1000) return `${read(Math.floor(n / 100))} Ratus ${read(n % 100)}`.trim();
    if (n < 2000) return `Seribu ${read(n - 1000)}`.trim();
    if (n < 1000000) return `${read(Math.floor(n / 1000))} Ribu ${read(n % 1000)}`.trim();
    if (n < 1000000000) return `${read(Math.floor(n / 1000000))} Juta ${read(n % 1000000)}`.trim();
    return `${read(Math.floor(n / 1000000000))} Miliar ${read(n % 1000000000)}`.trim();
  };
  return `${read(value).replace(/\s+/g, " ")} Rupiah`;
}

export default function PenawaranDesainPage() {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const [activeTab, setActiveTab] = useState("generate");
  const [clientId, setClientId] = useState("");
  const [salutation, setSalutation] = useState<"Mr" | "Mrs">("Mr");
  const [roId, setRoId] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [luasTanah, setLuasTanah] = useState("");
  const [paketName, setPaketName] = useState<keyof typeof PACKAGES>("Paket Desain Basic");
  const [showPreview, setShowPreview] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const { data } = useQuery({
    queryKey: ["penawaran-desain-clients"],
    queryFn: () => apiClient.get("/bd/sales-admin/leads", { params: { limit: 10000 } }).then((r) => r.data),
  });
  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["penawaran-desain-employees"],
    queryFn: () => apiClient.get("/desain/employees").then((r) => r.data),
  });

  const clients = [...(Array.isArray(data) ? data : data?.items ?? [])].sort((a: any, b: any) =>
    (rawClientName(a) || String(a?.nama ?? "")).localeCompare(rawClientName(b) || String(b?.nama ?? ""), "id", {
      sensitivity: "base",
    })
  );
  const client = clients.find((c: any) => String(c.id) === clientId) ?? clients[0];
  const searchNeedle = normalizeSearch(clientSearch);
  const filteredClients = searchNeedle
    ? clients.filter((c: any) => {
        const searchable = [
          rawClientName(c),
          c?.nama,
          c?.display_name,
          c?.nomor_telepon,
          c?.alamat,
        ].filter(Boolean).join(" ");
        return normalizeSearch(searchable).includes(searchNeedle);
      })
    : clients;
  const selectedRo = employees.find((e) => String(e.id) === roId);
  const pkg = PACKAGES[paketName];
  const namaAsli = client ? rawClientName(client) : "[Nama Client]";
  const name = client ? `${salutation} ${namaAsli}` : "Mr/Mrs [Nama Client]";

  const termin1Rows = useMemo(() => pkg.termin1.items.map((d) => <li key={d}>{d}</li>), [pkg]);
  const termin2Rows = useMemo(() => pkg.termin2.items.map((d) => <li key={d}>{d}</li>), [pkg]);

  async function downloadPdf() {
    setShowPreview(true);
    setDownloadingPdf(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await downloadOfferPdf(".offer-page", `Penawaran ${paketName} - ${name} - ${formatDateFile(tanggal)}`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  function persistOffers(next: SavedOffer[]) {
    setSavedOffers(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveOffer() {
    const offer: SavedOffer = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      clientId: String(client?.id ?? clientId),
      salutation,
      roId,
      tanggal,
      luasTanah,
      paketName,
      clientName: namaAsli,
      roName: selectedRo?.nama || "[Nama RO]",
      total: pkg.price,
    };
    persistOffers([offer, ...savedOffers]);
    setActiveTab("list");
  }

  function loadOffer(offer: SavedOffer, shouldPrint = false) {
    setClientId(offer.clientId);
    setSalutation(offer.salutation);
    setRoId(offer.roId);
    setTanggal(offer.tanggal);
    setLuasTanah(offer.luasTanah ?? "");
    setPaketName(offer.paketName);
    setShowPreview(true);
    setActiveTab("generate");
    if (shouldPrint) {
      setDownloadingPdf(true);
      setTimeout(async () => {
        try {
          await downloadOfferPdf(".offer-page", `Penawaran ${offer.paketName} - ${offer.salutation} ${offer.clientName} - ${formatDateFile(offer.tanggal)}`);
        } finally {
          setDownloadingPdf(false);
        }
      }, 100);
    }
  }

  function deleteOffer(id: string) {
    persistOffers(savedOffers.filter((offer) => offer.id !== id));
  }

  return (
    <div className="p-6 space-y-5">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          aside, header, .print\\:hidden { display: none !important; }
          body { background: #fff !important; }
          .offer-page { box-shadow: none !important; border: 0 !important; margin: 0 !important; width: 100% !important; min-height: auto !important; overflow: visible !important; page-break-inside: auto !important; padding: 0.5cm 1.5cm !important; }
          .offer-header { margin-bottom: 0 !important; padding-bottom: 8px !important; }
          .offer-page table, .offer-page tr, .offer-page p, .offer-page ul { break-inside: avoid; page-break-inside: avoid; }
          .page-break { break-before: page; page-break-before: always; }
        }
        .offer-page { font-family: Arial, Helvetica, sans-serif !important; }
      `}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Desain</h1>
          <p className="text-sm text-muted-foreground">Pilih client, tanggal, dan paket desain untuk membuat lampiran PDF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview((v) => !v)}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
          <Button variant="outline" onClick={saveOffer}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
          <Button onClick={downloadPdf} disabled={downloadingPdf}><Download className="h-4 w-4 mr-2" /> {downloadingPdf ? "Membuat PDF..." : "Download PDF"}</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="list">List Penawaran</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="mt-4">
      <div className="grid md:grid-cols-6 gap-3 rounded-lg border bg-white p-4">
        <div>
          <Label>Salutation</Label>
          <Select value={salutation} onValueChange={(v) => setSalutation(v as "Mr" | "Mrs")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Mr">Mr</SelectItem>
              <SelectItem value="Mrs">Mrs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nama Client</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Cari nama client"
              className="pl-9"
              aria-label="Cari nama client"
            />
          </div>
          <Select
            value={clientId || String(client?.id ?? "")}
            onValueChange={(value) => {
              setClientId(value);
              const picked = clients.find((c: any) => String(c.id) === value);
              const pickedSalutation = clientSalutation(picked);
              if (pickedSalutation) setSalutation(pickedSalutation);
            }}
          >
            <SelectTrigger className="mt-2"><SelectValue placeholder="Pilih client" /></SelectTrigger>
            <SelectContent>
              {filteredClients.length ? (
                filteredClients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{rawClientName(c) || c.nama}</SelectItem>)
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">Client tidak ditemukan</div>
              )}
            </SelectContent>
          </Select>
          <Input value={namaAsli} readOnly className="mt-2 bg-slate-50" aria-label="Nama asli client" />
        </div>
        <div>
          <Label>Tanggal/Bulan/Tahun</Label>
          <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <Label>Luas Tanah (Meter)</Label>
          <Input
            type="number"
            min={0}
            value={luasTanah}
            onChange={(e) => setLuasTanah(e.target.value)}
            placeholder="Contoh: 120"
          />
        </div>
        <div>
          <Label>Nama RO</Label>
          <Select value={roId || "__none__"} onValueChange={(v) => setRoId(v === "__none__" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Pilih RO" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Pilih RO</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nama Paket Desain</Label>
          <Select value={paketName} onValueChange={(v) => setPaketName(v as keyof typeof PACKAGES)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(PACKAGES).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <span>Client</span><span>Tanggal</span><span>Paket</span><span>Total</span><span className="text-right">Aksi</span>
            </div>
            {savedOffers.length ? savedOffers.map((offer) => (
              <div key={offer.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium">{offer.salutation} {offer.clientName}</span>
                <span>{formatDateID(offer.tanggal)}</span>
                <span>{offer.paketName}</span>
                <span>{IDR(offer.total)}</span>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => loadOffer(offer)}>Buka</Button>
                  <Button size="sm" onClick={() => loadOffer(offer, true)} disabled={downloadingPdf}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  {isSuperAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => deleteOffer(offer.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  )}
                </div>
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada penawaran tersimpan.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showPreview && (
        <div className="offer-page mx-auto max-w-[794px] min-h-[1123px] border bg-white px-[1.5cm] py-[0.5cm] shadow-sm text-[12px] leading-5 text-black">
          <div className="offer-header mb-0 border-b-2 border-black pb-4 text-[12px]">
            <div className="flex items-center gap-4">
              <div className="flex h-36 w-44 shrink-0 items-center justify-center">
                <img src="/images/logo.png" alt="Rubah Rumah" className="max-h-36 max-w-44 object-contain" />
              </div>
              <div>
                <p className="text-[12px] font-bold leading-tight">PT. RUBAH RUMAH INOVASI PEMUDA</p>
                <p className="mt-2 text-[12px] leading-5">Jl. Pandu II No. 420, Kel. Sepanjang Jaya, Kec. Rawalumbu, Kota Bekasi, Jawa Barat</p>
                <p className="text-[12px] leading-5">Telp: +62 813-7640-5550</p>
                <p className="text-[12px] leading-5">Website: rubahrumah.com</p>
              </div>
            </div>
          </div>

          <h2 className="mb-5 mt-6 text-center text-[14px] font-bold leading-none">PENAWARAN JASA DESAIN</h2>
          <p>Lampiran :</p>
          <p className="ml-8 mb-5">-</p>

          <div className="mb-5">
            <p>Kepada Yth.</p>
            <p>{name}</p>
            <p>Di tempat</p>
          </div>

          <p>Dengan Hormat,</p>
          <p className="text-justify">
            Berdasarkan hasil konsultasi yang telah dilakukan oleh tim PT. Rubah Rumah Inovasi Pemuda pada {formatDateID(tanggal)}, bersama ini kami menyampaikan penawaran jasa desain untuk kebutuhan pembangunan Rumah Hunian dengan luas {luasTanah || "[Isi luas]"} meter milik {name}.
          </p>
          <p className="text-justify mt-3">
            Penawaran ini dibuat sebagai tahap awal perencanaan agar desain yang dihasilkan sesuai dengan kondisi lapangan, kebutuhan ruang, serta estimasi pekerjaan yang akan dilakukan.
          </p>
          <p className="mt-3">Adapun rincian penawaran jasa desain adalah sebagai berikut:</p>

          <table className="my-4 w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="border border-black p-2 text-left">Keterangan</th>
                <th className="border border-black p-2 text-left">Estimasi Pengerjaan</th>
                <th className="border border-black p-2 text-center">Luas Tanah (Meter)</th>
                <th className="border border-black p-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2">Jasa Desain {paketName}</td>
                <td className="border border-black p-2">{pkg.timeline}</td>
                <td className="border border-black p-2 text-center">{luasTanah || "[Isi]"}</td>
                <td className="border border-black p-2 text-right">{IDR(pkg.price)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={3}>Total Harga</td>
                <td className="border border-black p-2 text-right font-bold">{IDR(pkg.price)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={4}>Terbilang : {terbilang(pkg.price)}</td>
              </tr>
            </tbody>
          </table>

          <p>Keterangan Paket Desain {paketName} :</p>
          <p className="mt-2 font-bold">Lingkup Pekerjaan :</p>
          <p className="mt-2 font-bold">Termin 1 (50%) - {pkg.termin1.days} :</p>
          <ul className="ml-8 list-disc">{termin1Rows}</ul>
          <p className="mt-2 font-bold">Termin 2 (Pelunasan 50%) - {pkg.termin2.days} :</p>
          <ul className="ml-8 list-disc">{termin2Rows}</ul>

          <p className="mt-3 font-bold">Syarat dan Ketentuan :</p>
          <ol className="ml-7 list-decimal">
            <li>Pada Termin 1 dan Termin 2 revisi bersifat major maksimal 3x.</li>
            <li>Waktu desain bisa bertambah tergantung dari berapa lama umpan balik dari klien untuk revisi di tiap fase termin.</li>
            <li>Timeline desain berlaku sejak client melakukan pembayaran DP 50%.</li>
          </ol>

          <div className="page-break pt-10">
            <p className="text-justify">
              Demikian form penawaran ini kami sampaikan. Besar harapan kami dapat membantu {name} dalam mewujudkan desain hunian yang nyaman, fungsional, dan sesuai kebutuhan.
            </p>
            <p>Atas perhatian dan kepercayaannya, kami ucapkan terima kasih.</p>
            <p className="text-right">Bekasi, {formatDateID(tanggal)}</p>

            <div className="mt-6 ml-auto w-[300px] text-left">
              <p className="font-bold">Hormat Kami,</p>
              <p className="font-bold">PT. RUBAH RUMAH INOVASI PEMUDA</p>
              <div className="mt-3 flex h-20 w-40 items-center">
                <img src="/images/logo.png" alt="Rubah Rumah" className="max-h-20 max-w-40 object-contain" />
              </div>
              <div className="h-8" />
              <p className="font-bold">{selectedRo?.nama || "[Nama RO]"}</p>
              <p>Relation Officer</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

