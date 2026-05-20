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

const PACKAGES = {
  "Paket Desain Basic": {
    timeline: "3 Hari",
    price: 2500000,
    details: ["Layout 2D - 2 View", "Desain 3D - 1 View", "RAB"],
  },
  "Paket Desain Standart": {
    timeline: "7 - 14 Hari",
    price: 6800000,
    details: ["Layout 2D - 2 View", "Desain 3D - 7 View", "Gambar Kerja 2D - 11 View", "RAB"],
  },
  "Paket Desain Premium": {
    timeline: "14 - 21 Hari",
    price: 8500000,
    details: ["Layout 2D - 2 View", "Desain 3D - 16 View", "Gambar Kerja 2D - 21 View", "RAB"],
  },
  "Paket Desain Deluxe": {
    timeline: "18 - 26 Hari",
    price: 15800000,
    details: ["Layout 2D - 2 View", "Desain 3D - 18 View", "Gambar Kerja 2D - 30 View", "RAB"],
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

export default function PenawaranDesainPage() {
  const [activeTab, setActiveTab] = useState("generate");
  const [clientId, setClientId] = useState("");
  const [salutation, setSalutation] = useState<"Mr" | "Mrs">("Mr");
  const [roId, setRoId] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [paketName, setPaketName] = useState<keyof typeof PACKAGES>("Paket Desain Basic");
  const [showPreview, setShowPreview] = useState(true);
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

  const detailRows = useMemo(() => pkg.details.map((d) => <li key={d}>{d}</li>), [pkg]);

  function downloadPdf() {
    setShowPreview(true);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
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
    setPaketName(offer.paketName);
    setShowPreview(true);
    setActiveTab("generate");
    if (shouldPrint) requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  function deleteOffer(id: string) {
    persistOffers(savedOffers.filter((offer) => offer.id !== id));
  }

  return (
    <div className="p-6 space-y-5">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 18mm; }
          aside, header, .print\\:hidden { display: none !important; }
          body { background: #fff !important; }
          .offer-page { box-shadow: none !important; border: 0 !important; margin: 0 !important; width: 100% !important; }
        }
      `}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Desain</h1>
          <p className="text-sm text-muted-foreground">Pilih client, tanggal, dan paket desain untuk membuat lampiran PDF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview((v) => !v)}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
          <Button variant="outline" onClick={saveOffer}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
          <Button onClick={downloadPdf}><Download className="h-4 w-4 mr-2" /> Download PDF</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="list">List Penawaran</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="mt-4">
      <div className="grid md:grid-cols-5 gap-3 rounded-lg border bg-white p-4">
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
                  <Button size="sm" onClick={() => loadOffer(offer, true)}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteOffer(offer.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada penawaran tersimpan.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showPreview && (
        <div className="offer-page mx-auto max-w-[794px] min-h-[1123px] border bg-white p-10 shadow-sm font-serif text-[10px] leading-5 text-black">
          <div className="mb-8 border-b-2 border-black pb-4 font-sans">
            <div className="flex items-start gap-4">
              <img src="/images/logo.png" alt="Rubah Rumah" className="h-36 w-44 object-contain" />
              <div className="pt-1">
                <p className="text-xl font-bold leading-tight">PT. Rubah Rumah</p>
                <p className="text-xl font-bold leading-tight">Inovasi Pemuda</p>
                <p className="mt-2 text-[12px] leading-5">Jl. Pandu II No. 420, Kel. Sepanjang Jaya, Kec. Rawalumbu, Kota Bekasi, Jawa Barat</p>
                <p className="text-[12px] leading-5">Telp: +62 813-7640-5550</p>
                <p className="text-[12px] leading-5">Website: rubahrumah.com</p>
              </div>
            </div>
          </div>

          <h2 className="text-center font-bold text-[12px] mb-5">FORM PENAWARAN JASA DESAIN</h2>
          <p>Lampiran :</p>
          <p className="ml-8 mb-5">Denah Eksisting dan Perubahan</p>

          <div className="mb-5">
            <p>Kepada Yth.</p>
            <p>{name}</p>
            <p>Di tempat</p>
          </div>

          <p>Dengan Hormat,</p>
          <p className="text-justify">
            Berdasarkan hasil survey lokasi yang telah dilakukan oleh tim PT. Rubah Rumah Inovasi Pemuda dengan maksimal 1x Revisi, bersama ini kami menyampaikan penawaran jasa desain untuk kebutuhan Renovasi Rumah milik {name}.
          </p>
          <p className="text-justify mt-3">
            Penawaran ini dibuat sebagai tahap awal perencanaan agar desain yang dihasilkan sesuai dengan kondisi lapangan, kebutuhan ruang, serta estimasi pekerjaan yang akan dilakukan.
          </p>
          <p className="mt-3">Adapun rincian penawaran jasa desain adalah sebagai berikut:</p>

          <table className="my-4 w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-black p-2 text-left">Keterangan</th>
                <th className="border border-black p-2 text-left">Estimasi Pengerjaan</th>
                <th className="border border-black p-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2">Jasa Desain {paketName}</td>
                <td className="border border-black p-2">{pkg.timeline}</td>
                <td className="border border-black p-2 text-right">{IDR(pkg.price)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={2}>Total</td>
                <td className="border border-black p-2 text-right font-bold">{IDR(pkg.price)}</td>
              </tr>
            </tbody>
          </table>

          <p>Keterangan Paket Desain {paketName} :</p>
          <ul className="ml-8 list-disc">{detailRows}</ul>

          <p className="mt-5 text-justify">
            Demikian form penawaran ini kami sampaikan. Besar harapan kami dapat membantu {name} dalam mewujudkan desain hunian yang nyaman, fungsional, dan sesuai kebutuhan.
          </p>
          <p>Atas perhatian dan kepercayaannya, kami ucapkan terima kasih.</p>
          <p className="mt-4">Bekasi, {formatDateID(tanggal)}</p>

          <div className="mt-6 ml-auto w-[260px] text-left">
            <p className="font-bold">Hormat Kami,</p>
            <p className="font-bold">PT. RUBAH RUMAH INOVASI PEMUDA</p>
            <div className="h-28" />
            <p className="font-bold">{selectedRo?.nama || "[Nama RO]"}</p>
          </div>
          <div className="mt-10 border-t pt-2 text-center text-xs font-sans">
            PT. Rubah Rumah Inovasi Pemuda
          </div>
        </div>
      )}
    </div>
  );
}
