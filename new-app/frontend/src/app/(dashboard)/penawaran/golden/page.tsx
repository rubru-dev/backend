"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, Save, Search, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import { downloadOfferPdf } from "@/lib/download-offer-pdf";

const HAMA_OPTIONS = [
  "Rayap Tanah (Rhinotermitidae)",
  "Rayap Kayu (Kalotermitidae)",
  "Tikus Got (Rattus Norvegicus)",
  "Tikus rumah / tikus atap (Rattus tanezumi / Rattus rattus)",
  "Mencit rumah (Mus musculus)",
  "Kecoa Jerman (Blattella germanica)",
  "Kecoa Amerika (Periplaneta americana)",
];

const METODE_OPTIONS = [
  "Injection dan Spraying",
  "Baiting",
];
const STORAGE_KEY = "rubahrumah.penawaran.golden";

type SavedOffer = {
  id: string;
  createdAt: string;
  clientId: string;
  salutation: "Mr" | "Mrs";
  roId: string;
  tanggal: string;
  nomorSurat: string;
  lokasiSurat: string;
  cakupanArea: string;
  selectedHama: string[];
  selectedMetode: string[];
  jumlahUnit: string;
  biaya: string;
  jumlahVisit: string;
  kontrakTreatment: string;
  syaratKetentuan: string;
  clientName: string;
  roName: string;
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

function formatMoney(value: string) {
  const n = Number(String(value).replace(/[^\d]/g, ""));
  if (!n) return value || "[Isi manual]";
  return `Rp. ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
}

function lines(value: string, fallbackCount = 4) {
  const rows = value.split("\n").map((v) => v.trim()).filter(Boolean);
  return rows.length ? rows : Array.from({ length: fallbackCount }, () => "");
}

export default function PenawaranGoldenPage() {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const today = new Date().toISOString().slice(0, 10);
  const [activeTab, setActiveTab] = useState("generate");
  const [clientId, setClientId] = useState("");
  const [salutation, setSalutation] = useState<"Mr" | "Mrs">("Mr");
  const [roId, setRoId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [tanggal, setTanggal] = useState(today);
  const [nomorSurat, setNomorSurat] = useState(`RB-GL/001/${today.slice(8, 10)}/${today.slice(5, 7)}/${today.slice(0, 4)}`);
  const [lokasiSurat, setLokasiSurat] = useState("Bekasi");
  const [cakupanArea, setCakupanArea] = useState("");
  const [selectedHama, setSelectedHama] = useState<string[]>(["Rayap Tanah (Rhinotermitidae)"]);
  const [selectedMetode, setSelectedMetode] = useState<string[]>(["Injection dan Spraying"]);
  const [jumlahUnit, setJumlahUnit] = useState("");
  const [biaya, setBiaya] = useState("");
  const [jumlahVisit, setJumlahVisit] = useState("");
  const [kontrakTreatment, setKontrakTreatment] = useState("");
  const [syaratKetentuan, setSyaratKetentuan] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const { data } = useQuery({
    queryKey: ["penawaran-golden-clients"],
    queryFn: () => apiClient.get("/bd/golden/leads", { params: { limit: 10000 } }).then((r) => r.data),
  });
  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["penawaran-golden-employees"],
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
  const name = client ? `${salutation} ${namaAsli}` : "Mr/Mrs. [Nama Client]";
  const selectedRo = employees.find((e) => String(e.id) === roId);

  const areaRows = useMemo(() => lines(cakupanArea, 5), [cakupanArea]);
  const syaratRows = useMemo(() => lines(syaratKetentuan, 5), [syaratKetentuan]);

  function toggleItem(value: string, checked: boolean) {
    setSelectedHama((prev) => checked ? [...prev, value] : prev.filter((item) => item !== value));
  }

  function toggleMetode(value: string, checked: boolean) {
    setSelectedMetode((prev) => checked ? [...prev, value] : prev.filter((item) => item !== value));
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
      nomorSurat,
      lokasiSurat,
      cakupanArea,
      selectedHama,
      selectedMetode,
      jumlahUnit,
      biaya,
      jumlahVisit,
      kontrakTreatment,
      syaratKetentuan,
      clientName: namaAsli,
      roName: selectedRo?.nama || "[Nama RO]",
    };
    persistOffers([offer, ...savedOffers]);
    setActiveTab("list");
  }

  function loadOffer(offer: SavedOffer, shouldPrint = false) {
    setClientId(offer.clientId);
    setSalutation(offer.salutation);
    setRoId(offer.roId);
    setTanggal(offer.tanggal);
    setNomorSurat(offer.nomorSurat);
    setLokasiSurat(offer.lokasiSurat);
    setCakupanArea(offer.cakupanArea);
    setSelectedHama(offer.selectedHama);
    setSelectedMetode(offer.selectedMetode.filter((item) => METODE_OPTIONS.includes(item)));
    setJumlahUnit(offer.jumlahUnit);
    setBiaya(offer.biaya);
    setJumlahVisit(offer.jumlahVisit);
    setKontrakTreatment(offer.kontrakTreatment);
    setSyaratKetentuan(offer.syaratKetentuan);
    setShowPreview(true);
    setActiveTab("generate");
    if (shouldPrint) {
      setDownloadingPdf(true);
      setTimeout(async () => {
        try {
          await downloadOfferPdf(".offer-page", `Penawaran Ruangkeruang - ${offer.salutation} ${offer.clientName} - ${formatDateFile(offer.tanggal)}`);
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
          .offer-page table, .offer-page tr, .offer-page p, .offer-page ol { break-inside: avoid; page-break-inside: avoid; }
          .page-break { break-before: page; page-break-before: always; }
        }
        .offer-page { font-family: Arial, Helvetica, sans-serif !important; }
      `}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Golden</h1>
          <p className="text-sm text-muted-foreground">Template penawaran jasa anti rayap Rubrupest by Golden.</p>
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
        <div className="grid md:grid-cols-6 gap-3">
          <div>
            <Label>Nomor Surat</Label>
            <Input value={nomorSurat} onChange={(e) => setNomorSurat(e.target.value)} />
          </div>
          <div>
            <Label>Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div>
            <Label>Lokasi Surat</Label>
            <Input value={lokasiSurat} onChange={(e) => setLokasiSurat(e.target.value)} />
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
            <Label>Nama Client</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Cari client" className="pl-9" />
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

        <div className="grid md:grid-cols-4 gap-3">
          <div><Label>Jumlah Unit</Label><Input value={jumlahUnit} onChange={(e) => setJumlahUnit(e.target.value)} placeholder="Isi manual" /></div>
          <div><Label>Biaya</Label><Input value={biaya} onChange={(e) => setBiaya(e.target.value)} placeholder="Contoh: 2500000" /></div>
          <div><Label>Jumlah Visit</Label><Input value={jumlahVisit} onChange={(e) => setJumlahVisit(e.target.value)} placeholder="Isi manual" /></div>
          <div><Label>Kontrak Treatment</Label><Input value={kontrakTreatment} onChange={(e) => setKontrakTreatment(e.target.value)} placeholder="Isi manual" /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Cakupan Area</Label>
            <textarea className="mt-1 min-h-28 w-full rounded-md border px-3 py-2 text-sm" value={cakupanArea} onChange={(e) => setCakupanArea(e.target.value)} placeholder="Satu area per baris" />
          </div>
          <div>
            <Label>Syarat dan Ketentuan</Label>
            <textarea className="mt-1 min-h-28 w-full rounded-md border px-3 py-2 text-sm" value={syaratKetentuan} onChange={(e) => setSyaratKetentuan(e.target.value)} placeholder="Satu ketentuan per baris" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cakupan Hama</Label>
            <div className="grid gap-2 rounded-md border p-3">
              {HAMA_OPTIONS.map((item) => (
                <label key={item} className="flex items-start gap-2 text-sm">
                  <Checkbox checked={selectedHama.includes(item)} onCheckedChange={(checked) => toggleItem(item, Boolean(checked))} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Metode Pekerjaan</Label>
            <div className="grid gap-2 rounded-md border p-3">
              {METODE_OPTIONS.map((item) => (
                <label key={item} className="flex items-start gap-2 text-sm">
                  <Checkbox checked={selectedMetode.includes(item)} onCheckedChange={(checked) => toggleMetode(item, Boolean(checked))} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_150px] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <span>Client</span><span>Tanggal</span><span>Nomor Surat</span><span>Biaya</span><span className="text-right">Aksi</span>
            </div>
            {savedOffers.length ? savedOffers.map((offer) => (
              <div key={offer.id} className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_150px] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium">{offer.salutation} {offer.clientName}</span>
                <span>{formatDateID(offer.tanggal)}</span>
                <span>{offer.nomorSurat}</span>
                <span>{formatMoney(offer.biaya)}</span>
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
        <div className="offer-page mx-auto max-w-[794px] border bg-white p-[0.5cm] shadow-sm text-[12px] leading-5 text-black">
          <Letterhead />
          <h2 className="mb-2 text-center text-[14px] font-bold">Penawaran Jasa Anti Rayap</h2>
          <p>Nomor : {nomorSurat || "RB-GL/[Nomor]/[Tanggal]/[Bulan]/[Tahun]"}</p>
          <p>Lampiran:</p>
          <p className="ml-8 mb-5">- Laporan Hasil Survey</p>

          <div className="mb-5">
            <p>Kepada Yth,</p>
            <p>{name}</p>
            <p>Di Tempat.</p>
          </div>

          <p>Dengan Hormat,</p>
          <p className="text-justify">
            Melalui surat ini, kami Rubrupest by Golden (PT. RUBAH RUMAH INOVASI PEMUDA) telah melakukan serangkaian survey (laporan hasil survey terlampir) bermaksud untuk menawarkan pekerjaan pengendalian hama sebagai berikut:
          </p>

          <table className="my-4 w-full border-collapse text-[12px]">
            <tbody>
              <TemplateRow label="Cakupan Area">
                <ol className="ml-5 list-decimal">{areaRows.map((row, i) => <li key={i}>{row || "[Isi manual]"}</li>)}</ol>
              </TemplateRow>
              <TemplateRow label="Cakupan Hama">
                <ol className="ml-5 list-decimal">{(selectedHama.length ? selectedHama : HAMA_OPTIONS).map((row) => <li key={row}>{row}</li>)}</ol>
              </TemplateRow>
              <TemplateRow label="Metode Pekerjaan">
                <ol className="ml-5 list-decimal">{(selectedMetode.length ? selectedMetode : METODE_OPTIONS).map((row) => <li key={row}>{row}</li>)}</ol>
              </TemplateRow>
              <TemplateRow label="Jumlah Unit">{jumlahUnit || "[Isi manual]"}</TemplateRow>
              <TemplateRow label="Biaya">{formatMoney(biaya)}</TemplateRow>
              <TemplateRow label="Jumlah Visit">{jumlahVisit || "[Isi manual]"}</TemplateRow>
              <TemplateRow label="Kontrak Treatment">{kontrakTreatment || "[Isi manual]"}</TemplateRow>
            </tbody>
          </table>

          <p className="font-bold">Syarat dan Ketentuan :</p>
          <ol className="ml-7 list-decimal">{syaratRows.map((row, i) => <li key={i}>{row || "[Isi manual]"}</li>)}</ol>

          <div className="page-break pt-10">
            <Letterhead />
            <p className="mt-8 text-justify">
              Besar harapan kami dapat menjalin kerja sama yang baik dengan perusahaan Bapak/Ibu, dan bila Bapak/Ibu memerlukan informasi lebih detail, dapat segera hubungi:
            </p>
            <p className="mt-5">Admin Rubrupest - 082812172</p>
            <p>Dengan Senang Hati kami akan menjelaskannya kembali.</p>
            <p className="mt-5">Atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>

            <p className="mt-8 text-right">{lokasiSurat || "[Nama Lokasi]"}, {formatDateID(tanggal) || "[Tanggal/Bulan/Tahun]"}</p>
            <div className="mt-8 ml-auto mr-[2.5cm] w-[300px] text-left">
              <p className="font-bold">Hormat Kami,</p>
              <p className="font-bold">Rubrupest by PT.RUBAH RUMAH INOVASI PEMUDA</p>
              <div className="mt-3 flex h-20 w-40 items-center">
                <img src="/images/offer-logos/rubru-pest-logo.jpeg" alt="Rubru Pest" className="max-h-20 max-w-40 object-contain" />
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

function Letterhead() {
  return (
    <div className="offer-header mb-6 border-b-2 border-black pb-4 text-[12px]">
      <div className="flex items-center gap-4">
        <div className="flex h-36 w-44 shrink-0 items-center justify-center">
          <img src="/images/offer-logos/rubru-pest-logo.jpeg" alt="Rubru Pest" className="max-h-36 max-w-44 object-contain" />
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

function TemplateRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <td className="w-44 border border-black p-2 font-bold align-top">{label}</td>
      <td className="border border-black p-2 align-top">{children}</td>
    </tr>
  );
}
