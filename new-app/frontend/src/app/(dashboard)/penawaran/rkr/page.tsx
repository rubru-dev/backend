"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, Plus, Save, Search, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import { downloadOfferPdf } from "@/lib/download-offer-pdf";

type OfferRow = { uraian: string; qty: string; hargaSatuan: string; satuan?: string; harga?: string };
const STORAGE_KEY = "rubahrumah.penawaran.rkr";

type SavedOffer = {
  id: string;
  createdAt: string;
  clientId: string;
  salutation: "Mr" | "Mrs";
  roId: string;
  tanggal: string;
  jenisPenawaran: string;
  rows: OfferRow[];
  clientName: string;
  roName: string;
  total: number;
};

function rawClientName(c: any) {
  return String(c?.nama ?? "").replace(/^(Mr|Mrs)\.?\s+/i, "").trim();
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

function parseMoney(value: string) {
  return Number(String(value).replace(/[^\d]/g, "")) || 0;
}

function fmtMoney(value: number) {
  return `Rp. ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

export default function PenawaranRkrPage() {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const [activeTab, setActiveTab] = useState("generate");
  const [clientId, setClientId] = useState("");
  const [salutation, setSalutation] = useState<"Mr" | "Mrs">("Mr");
  const [roId, setRoId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [jenisPenawaran, setJenisPenawaran] = useState("Interior");
  const [showPreview, setShowPreview] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [rows, setRows] = useState<OfferRow[]>([
    { uraian: "", qty: "", hargaSatuan: "" },
    { uraian: "", qty: "", hargaSatuan: "" },
    { uraian: "", qty: "", hargaSatuan: "" },
  ]);
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const { data } = useQuery({
    queryKey: ["penawaran-rkr-clients"],
    queryFn: () => apiClient.get("/bd/telemarketing/leads", { params: { limit: 10000 } }).then((r) => r.data),
  });
  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["penawaran-rkr-employees"],
    queryFn: () => apiClient.get("/desain/employees").then((r) => r.data),
  });

  const clients = [...(Array.isArray(data) ? data : data?.items ?? [])].sort((a: any, b: any) =>
    (rawClientName(a) || String(a?.nama ?? "")).localeCompare(rawClientName(b) || String(b?.nama ?? ""), "id", { sensitivity: "base" })
  );
  const client = clients.find((c: any) => String(c.id) === clientId) ?? clients[0];
  const searchNeedle = normalizeSearch(clientSearch);
  const filteredClients = searchNeedle
    ? clients.filter((c: any) => normalizeSearch([rawClientName(c), c?.nama, c?.display_name, c?.nomor_telepon, c?.alamat].filter(Boolean).join(" ")).includes(searchNeedle))
    : clients;
  const namaAsli = client ? rawClientName(client) : "[Nama Client]";
  const name = client ? `${salutation}. ${namaAsli}` : "Mr/Mrs. [Nama Client]";
  const selectedRo = employees.find((e) => String(e.id) === roId);

  const total = useMemo(() => rows.reduce((sum, row) => sum + ((Number(row.qty) || 0) * parseMoney(row.hargaSatuan || row.harga || "")), 0), [rows]);

  function updateRow(index: number, patch: Partial<OfferRow>) {
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function nonNegativeNumber(value: string) {
    const number = Number(value);
    if (Number.isNaN(number)) return "";
    return String(Math.max(0, number));
  }

  async function downloadPdf() {
    setShowPreview(true);
    setDownloadingPdf(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await downloadOfferPdf(".offer-page", `Penawaran Ruangkeruang - ${name} - ${formatDateFile(tanggal)}`);
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
      jenisPenawaran,
      rows: rows.map((row) => ({ ...row, hargaSatuan: row.hargaSatuan || row.harga || "" })),
      clientName: namaAsli,
      roName: selectedRo?.nama || "[Nama RO]",
      total,
    };
    persistOffers([offer, ...savedOffers]);
    setActiveTab("list");
  }

  function loadOffer(offer: SavedOffer, shouldPrint = false) {
    setClientId(offer.clientId);
    setSalutation(offer.salutation);
    setRoId(offer.roId);
    setTanggal(offer.tanggal);
    setJenisPenawaran(offer.jenisPenawaran);
    setRows(offer.rows.map((row) => ({ ...row, hargaSatuan: row.hargaSatuan || row.harga || "" })));
    setShowPreview(true);
    setActiveTab("generate");
    if (shouldPrint) {
      setDownloadingPdf(true);
      setTimeout(async () => {
        try {
          await downloadOfferPdf(".offer-page", `Penawaran Ruangkeruang - ${offer.salutation}. ${offer.clientName} - ${formatDateFile(offer.tanggal)}`);
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
          .offer-page { box-shadow: none !important; border: 0 !important; margin: 0 !important; width: 100% !important; min-height: auto !important; overflow: visible !important; page-break-inside: auto !important; padding: 0.5cm !important; }
          .offer-header { margin-bottom: 12px !important; padding-bottom: 8px !important; }
          .offer-page table, .offer-page tr, .offer-page p { break-inside: avoid; page-break-inside: avoid; }
        }
        .offer-page { font-family: Arial, Helvetica, sans-serif !important; }
      `}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Penawaran RKR</h1>
          <p className="text-sm text-muted-foreground">Template penawaran Interior/Eksterior Ruangkeruang.</p>
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
      <div className="grid gap-4 rounded-lg border bg-white p-4">
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <Label>Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div>
            <Label>Jenis Penawaran</Label>
            <Select value={jenisPenawaran} onValueChange={setJenisPenawaran}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Interior">Interior</SelectItem>
                <SelectItem value="Eksterior">Eksterior</SelectItem>
                <SelectItem value="Interior/Eksterior">Interior/Eksterior</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Salutation</Label>
            <Select value={salutation} onValueChange={(v) => setSalutation(v as "Mr" | "Mrs")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Mr">Mr</SelectItem><SelectItem value="Mrs">Mrs</SelectItem></SelectContent>
            </Select>
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
            <Label>Nama Client RKR</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Cari dari Follow Up Leads RKR" className="pl-9" />
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
                {filteredClients.length ? filteredClients.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{rawClientName(c) || c.nama}</SelectItem>
                )) : <div className="px-3 py-2 text-sm text-muted-foreground">Client tidak ditemukan</div>}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Rincian Penawaran</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, { uraian: "", qty: "", hargaSatuan: "" }])}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Baris
            </Button>
          </div>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="grid md:grid-cols-[1fr_90px_150px_40px] gap-2">
                <Input value={row.uraian} onChange={(e) => updateRow(i, { uraian: e.target.value })} placeholder="Uraian pekerjaan" />
                <Input type="number" min={0} value={row.qty} onChange={(e) => updateRow(i, { qty: nonNegativeNumber(e.target.value) })} placeholder="Qty" />
                <Input type="number" min={0} value={row.hargaSatuan || row.harga || ""} onChange={(e) => updateRow(i, { hargaSatuan: nonNegativeNumber(e.target.value) })} placeholder="Harga satuan" />
                <Button type="button" variant="ghost" size="icon" disabled={rows.length <= 1} onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <span>Client</span><span>Tanggal</span><span>Jenis</span><span>Total</span><span className="text-right">Aksi</span>
            </div>
            {savedOffers.length ? savedOffers.map((offer) => (
              <div key={offer.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium">{offer.salutation}. {offer.clientName}</span>
                <span>{formatDateID(offer.tanggal)}</span>
                <span>{offer.jenisPenawaran}</span>
                <span>{offer.total ? fmtMoney(offer.total) : "-"}</span>
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
        <div className="offer-page mx-auto max-w-[794px] min-h-[1123px] border bg-white p-[0.5cm] shadow-sm text-[12px] leading-5 text-black">
          <Letterhead />
          <h2 className="mb-8 text-center text-[14px] font-bold">Penawaran {jenisPenawaran} Ruangkeruang</h2>

          <div className="mb-5">
            <p>Kepada Yth.</p>
            <p>{name}</p>
            <p>Di Tempat.</p>
          </div>

          <p>Dengan Hormat,</p>
          <p className="text-justify">
            Bersama surat ini kami Ruangkeruang by PT. RUBAH RUMAH INOVASI PEMUDA mengajukan penawaran jasa {jenisPenawaran.toLowerCase()} kepada {name} dengan rincian sebagai berikut :
          </p>

          <table className="my-5 w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="w-10 border border-black p-2 text-center">No</th>
                <th className="border border-black p-2 text-left">Uraian Pekerjaan</th>
                <th className="w-20 border border-black p-2 text-center">Qty</th>
                <th className="w-36 border border-black p-2 text-right">Harga Satuan</th>
                <th className="w-36 border border-black p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const qty = Number(row.qty) || 0;
                const harga = parseMoney(row.hargaSatuan || row.harga || "");
                return (
                  <tr key={i}>
                    <td className="border border-black p-2 text-center">{i + 1}</td>
                    <td className="border border-black p-2">{row.uraian || "[Isi manual]"}</td>
                    <td className="border border-black p-2 text-center">{row.qty || "[Isi]"}</td>
                    <td className="border border-black p-2 text-right">{harga ? fmtMoney(harga) : "[Isi]"}</td>
                    <td className="border border-black p-2 text-right">{harga && qty ? fmtMoney(qty * harga) : "[Isi manual]"}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="border border-black p-2 font-bold text-right" colSpan={4}>Total</td>
                <td className="border border-black p-2 text-right font-bold">{total ? fmtMoney(total) : "[Isi manual]"}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-justify">
            Demikian penawaran ini kami sampaikan. Besar harapan kami untuk dapat bekerja sama dengan {name}. Apabila terdapat pertanyaan lebih lanjut, {name} dapat menghubungi kami kapan saja.
          </p>

          <p className="mt-8 text-right">Bekasi, {formatDateID(tanggal)}</p>
          <div className="mt-8 ml-auto mr-[2.5cm] w-[300px] text-left">
            <p className="font-bold">Hormat Kami</p>
            <p className="font-bold">Ruangkeruang by PT.RUBAH RUMAH INOVASI PEMUDA</p>
            <div className="mt-3 flex h-20 w-40 items-center">
              <img src="/images/offer-logos/rkr-logo.jpeg" alt="Ruangkeruang" className="max-h-20 max-w-40 object-contain" />
            </div>
            <div className="h-8" />
            <p className="font-bold">{selectedRo?.nama || "[Nama RO]"}</p>
            <p>Relation Officer</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Letterhead() {
  return (
    <div className="offer-header mb-6 border-b-2 border-black pb-4 text-[12px]">
      <div className="flex items-center gap-4">
        <div className="flex h-36 w-44 shrink-0 items-center justify-center">
          <img src="/images/offer-logos/rkr-logo.jpeg" alt="Ruangkeruang" className="max-h-36 max-w-44 object-contain" />
        </div>
        <div>
          <p className="text-[12px] font-bold leading-tight">PT. RUBAH RUMAH INOVASI PEMUDA</p>
          <p className="mt-2 text-[12px] leading-5">Jl. Pandu II No. 420, Kel. Sepanjang Jaya, Kec. Rawalumbu, Kota Bekasi, Jawa Barat</p>
          <p className="text-[12px] leading-5">Telp : +62 813 - 7640 - 5550</p>
          <p className="text-[12px] leading-5">Website : rubahrumah.com</p>
        </div>
      </div>
    </div>
  );
}
