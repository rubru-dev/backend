"use client";

import { useState } from "react";
import { downloadOfferPdf } from "@/lib/download-offer-pdf";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, FileText, Plus, Save, Trash2 } from "lucide-react";

type SavedBast = {
  id: string;
  createdAt: string;
  nomor: string;
  leadId?: string;
  namaClient: string;
  alamatClient: string;
  teleponClient: string;
  tanggalBast: string;
  tanggalSerahTerima: string;
  jenisPekerjaan: string;
  tanggalGaransiRenovasiBerakhir: string;
  tanggalGaransiBocoranBerakhir: string;
  poin?: string[];
};

const STORAGE_KEY = "rubahrumah.projek.form-bast";
const JENIS_PEKERJAAN = ["Pekerjaan Renovasi Rumah", "Pekerjaan Bocoran"] as const;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatDateID(date: string) {
  if (!date) return "........................";
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateLongWithDay(date: string) {
  if (!date) return "........................";
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function defaultNomor(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const month = pad2(d.getMonth() + 1);
  const year = String(d.getFullYear()).slice(-2);
  return `RR/AR-02/${month}/${year}`;
}

export default function FormBastPage() {
  const canAccess = useAuthStore((state) => state.isSuperAdmin() || state.hasPermission("projek", "form_bast"));
  const [activeTab, setActiveTab] = useState("generate");
  const [showPreview, setShowPreview] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [tanggalBast, setTanggalBast] = useState(todayInput());
  const [nomor, setNomor] = useState(defaultNomor(todayInput()));
  const [namaClient, setNamaClient] = useState("");
  const [alamatClient, setAlamatClient] = useState("");
  const [teleponClient, setTeleponClient] = useState("");
  const [tanggalSerahTerima, setTanggalSerahTerima] = useState(todayInput());
  const [jenisPekerjaan, setJenisPekerjaan] = useState<(typeof JENIS_PEKERJAAN)[number]>("Pekerjaan Renovasi Rumah");
  const [tanggalGaransiRenovasiBerakhir, setTanggalGaransiRenovasiBerakhir] = useState(addDays(todayInput(), 30));
  const [tanggalGaransiBocoranBerakhir, setTanggalGaransiBocoranBerakhir] = useState(addMonths(todayInput(), 6));
  const [poin, setPoin] = useState<string[]>([""]);
  const [savedBasts, setSavedBasts] = useState<SavedBast[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  if (!canAccess) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Anda tidak memiliki akses Form BAST.
      </div>
    );
  }

  function syncTanggalBast(value: string) {
    setTanggalBast(value);
    setNomor(defaultNomor(value));
    setTanggalSerahTerima(value);
    setTanggalGaransiRenovasiBerakhir(addDays(value, 30));
    setTanggalGaransiBocoranBerakhir(addMonths(value, 6));
  }

  function persist(next: SavedBast[]) {
    setSavedBasts(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveBast() {
    const draft: SavedBast = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      nomor,
      namaClient: namaClient.trim(),
      alamatClient,
      teleponClient,
      tanggalBast,
      tanggalSerahTerima,
      jenisPekerjaan,
      tanggalGaransiRenovasiBerakhir,
      tanggalGaransiBocoranBerakhir,
      poin: poin.map((item) => item.trim()).filter(Boolean),
    };
    persist([draft, ...savedBasts]);
    setActiveTab("list");
  }

  function loadBast(draft: SavedBast, shouldPrint = false) {
    setNomor(draft.nomor);
    setNamaClient(draft.namaClient ?? "");
    setAlamatClient(draft.alamatClient);
    setTeleponClient(draft.teleponClient);
    setTanggalBast(draft.tanggalBast);
    setTanggalSerahTerima(draft.tanggalSerahTerima);
    setJenisPekerjaan(
      JENIS_PEKERJAAN.includes(draft.jenisPekerjaan as (typeof JENIS_PEKERJAAN)[number])
        ? (draft.jenisPekerjaan as (typeof JENIS_PEKERJAAN)[number])
        : "Pekerjaan Renovasi Rumah"
    );
    setTanggalGaransiRenovasiBerakhir(draft.tanggalGaransiRenovasiBerakhir);
    setTanggalGaransiBocoranBerakhir(draft.tanggalGaransiBocoranBerakhir);
    setPoin(draft.poin?.length ? draft.poin : [""]);
    setShowPreview(true);
    setActiveTab("generate");
    if (shouldPrint) {
      setTimeout(() => void downloadPdf(), 100);
    }
  }

  async function downloadPdf() {
    setShowPreview(true);
    setDownloadingPdf(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await downloadOfferPdf(".offer-page", `BAST - ${namaClient} - ${formatDateID(tanggalBast)}`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          aside, header, .print\\:hidden { display: none !important; }
          body { background: #fff !important; }
          .offer-page {
            box-shadow: none !important;
            border: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 1.1cm 1.6cm !important;
          }
        }
        .offer-page { font-family: Arial, Helvetica, sans-serif !important; }
      `}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileText className="h-6 w-6 text-teal-600" />
            Form BAST
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Berita acara serah terima pekerjaan renovasi rumah dan garansi bocoran.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview((value) => !value)}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" onClick={saveBast}>
            <Save className="mr-2 h-4 w-4" /> Simpan
          </Button>
          <Button onClick={downloadPdf} disabled={downloadingPdf}>
            <Download className="mr-2 h-4 w-4" /> {downloadingPdf ? "Membuat PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="list">List BAST ({savedBasts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>No. BAST</Label>
                <Input value={nomor} onChange={(event) => setNomor(event.target.value)} />
              </div>
              <div>
                <Label>Tanggal BAST</Label>
                <Input type="date" value={tanggalBast} onChange={(event) => syncTanggalBast(event.target.value)} />
              </div>
              <div>
                <Label>Tanggal Serah Terima</Label>
                <Input type="date" value={tanggalSerahTerima} onChange={(event) => setTanggalSerahTerima(event.target.value)} />
              </div>
              <div>
                <Label>Jenis Pekerjaan</Label>
                <Select value={jenisPekerjaan} onValueChange={(value) => setJenisPekerjaan(value as (typeof JENIS_PEKERJAAN)[number])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JENIS_PEKERJAAN.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Nama Client</Label>
                <Input value={namaClient} onChange={(event) => setNamaClient(event.target.value)} placeholder="Tulis nama client" />
              </div>
              <div>
                <Label>No. Telepon Client</Label>
                <Input value={teleponClient} onChange={(event) => setTeleponClient(event.target.value)} placeholder="Nomor telepon" />
              </div>
              <div>
                <Label>Alamat Client</Label>
                <Input value={alamatClient} onChange={(event) => setAlamatClient(event.target.value)} placeholder="Alamat sesuai BAST" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label>Tanggal Berakhir Garansi Renovasi Rumah</Label>
                <Input
                  type="date"
                  value={tanggalGaransiRenovasiBerakhir}
                  onChange={(event) => setTanggalGaransiRenovasiBerakhir(event.target.value)}
                />
              </div>
              <div>
                <Label>Tanggal Berakhir Garansi Bocoran</Label>
                <Input
                  type="date"
                  value={tanggalGaransiBocoranBerakhir}
                  onChange={(event) => setTanggalGaransiBocoranBerakhir(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 border-t pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><Label>Catatan BAST</Label><p className="text-xs text-muted-foreground">Catatan tampil sebagai daftar bernomor pada preview dan PDF.</p></div><Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => setPoin((current) => [...current, ""])}><Plus className="mr-1 h-4 w-4" />Tambah Poin</Button></div>
              <div className="space-y-3">{poin.map((item, index) => <div key={index} className="grid grid-cols-[2rem_minmax(0,1fr)_2.75rem] items-start gap-2"><span className="pt-3 text-center text-sm font-semibold">{index + 1}.</span><textarea aria-label={`Catatan ${index + 1}`} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={item} onChange={(event) => setPoin((current) => current.map((point, pointIndex) => pointIndex === index ? event.target.value : point))} placeholder="Tuliskan catatan serah terima" /><Button type="button" size="icon" variant="ghost" className="h-11 w-11 text-destructive" aria-label={`Hapus catatan ${index + 1}`} disabled={poin.length === 1} onClick={() => setPoin((current) => current.filter((_, pointIndex) => pointIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. BAST</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedBasts.length ? savedBasts.map((draft) => (
                  <TableRow key={draft.id}>
                    <TableCell className="font-medium">{draft.nomor}</TableCell>
                    <TableCell>{draft.namaClient}</TableCell>
                    <TableCell>{formatDateID(draft.tanggalBast)}</TableCell>
                    <TableCell>{draft.jenisPekerjaan}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => loadBast(draft)}>Buka</Button>
                        <Button size="sm" onClick={() => loadBast(draft, true)} disabled={downloadingPdf}>
                          <Download className="mr-1 h-3.5 w-3.5" /> PDF
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => persist(savedBasts.filter((item) => item.id !== draft.id))}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Belum ada BAST tersimpan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {showPreview && (
        <div className="offer-page mx-auto min-h-[1123px] max-w-[794px] border bg-white px-[1.6cm] py-[1.1cm] text-[11px] leading-[1.35] text-black shadow-sm">
          <div className="grid grid-cols-[150px_1fr] items-center gap-5">
            <div className="flex h-[108px] w-[150px] shrink-0 items-center justify-center">
              <img src="/images/logo.png" alt="Rubah Rumah" className="max-h-[96px] max-w-[142px] object-contain" />
            </div>
            <div className="leading-[1.35]">
              <p className="text-[15px] font-bold leading-tight">PT. Rubah Rumah Inovasi Pemuda</p>
              <p className="mt-2">Jl. Pandu II No. 420, Kel. Sepanjang Jaya, Kec. Rawalumbu, Kota</p>
              <p>Bekasi, Jawa Barat</p>
              <div className="mt-1 grid grid-cols-[64px_1fr] gap-y-0.5">
                <span>Telp</span><span>: +62 813-7640-5550</span>
                <span>Website</span><span>: rubahrumah.com</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center font-bold">
            <p className="text-[11px] underline">BERITA ACARA SERAH TERIMA</p>
            <p className="mt-1">No.{nomor || "........................"}</p>
          </div>

          <div className="mt-10 space-y-3">
            <p>Pada hari ini, {formatDateLongWithDay(tanggalBast)}</p>
            <p>Yang bertanda tangan dibawah ini :</p>
          </div>

          <div className="mt-7 grid grid-cols-[92px_1fr] gap-y-2">
            <span>Nama</span><span>: PT.Rubah Rumah Inovasi Pemuda</span>
            <span>No. NIB</span><span>: 2209220142528</span>
            <span>Alamat</span><span>: Jl Pandu II No.420, Sepanjang Jaya, Kec. Rawalumbu, Kota Bekasi. 17114</span>
            <span>No. Telepon</span><span>: 0813-7640-5550</span>
          </div>
          <p className="mt-3">Selanjutnya di sebut sebagai <span className="font-bold">"Pihak Pertama"</span></p>

          <div className="mt-7 grid grid-cols-[92px_1fr] gap-y-2">
            <span>Nama</span><span>: {namaClient.trim() || "........................"}</span>
            <span>Alamat</span><span>: {alamatClient || "........................"}</span>
            <span>No. Telepon</span><span>: {teleponClient || "........................"}</span>
          </div>
          <p className="mt-3">Selanjutnya di sebut sebagai <span className="font-bold">"Pihak Kedua"</span></p>

          <div className="mt-8 space-y-4 text-justify">
            <p>Dengan ini menerangkan bahwa :</p>
            <p className="indent-8">
              <span className="font-bold">Pihak Pertama</span> telah menyerahkan {jenisPekerjaan.toLowerCase()} kepada{" "}
              <span className="font-bold">Pihak Kedua</span>, dan <span className="font-bold">Pihak Kedua</span> menyatakan telah menerima hasil pekerjaan renovasi rumah tersebut serta pekerjaan penambahan diselesaikan oleh{" "}
              <span className="font-bold">Pihak Pertama</span> dan <span className="font-bold">Pihak Kedua</span> pada tanggal {formatDateID(tanggalSerahTerima)}.
              Dengan adanya berita acara serah terima pekerjaan ini maka segala kewajiban <span className="font-bold">Pihak Pertama</span> tentang yang berlaku dipekerjaan renovasi rumah ini dinyatakan telah berakhir dan tidak ada perkerjaan lagi yang harus diselesaikan atau pekerjaan telah selesai.
              Adapun garansi pekerjaan renovasi selama 30 hari kalender yang berakhir pada {formatDateID(tanggalGaransiRenovasiBerakhir)} dan pekerjaan garansi kebocoran Selama 6 Bulan yang berakhir pada tanggal {formatDateID(tanggalGaransiBocoranBerakhir)}.
            </p>
            {poin.some((item) => item.trim()) && <ol className="list-decimal space-y-2 pl-8">{poin.filter((item) => item.trim()).map((item, index) => <li key={index} className="whitespace-pre-wrap">{item}</li>)}</ol>}
            <p className="indent-8">
              Demikian berita acara serah terima ini dibuat dan untuk dipergunakan sebagaimana mestinya. Atas perhatian Bapak dan Ibu, kami ucapkan terima kasih.
            </p>
          </div>

          <p className="mt-9 text-right">Bekasi, {formatDateID(tanggalBast)}</p>

          <div className="mt-7 grid grid-cols-2 text-center">
            <div>
              <p>Pihak Pertama</p>
              <div className="mt-7 flex h-16 items-center justify-center">
                <img src="/images/logo.png" alt="Rubah Rumah" className="max-h-16 max-w-[130px] object-contain" />
              </div>
              <p className="mt-5 font-bold">Rubah Rumah</p>
            </div>
            <div>
              <p>Pihak Kedua</p>
              <div className="h-[104px]" />
              <p>.................................</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
