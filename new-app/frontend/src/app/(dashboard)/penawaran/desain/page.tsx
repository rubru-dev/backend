"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye, PenLine, Save, Search, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import { downloadOfferPdf } from "@/lib/download-offer-pdf";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SignatureDialog } from "@/components/signature-dialog";
import { penawaranApi } from "@/lib/api/penawaran";

const PACKAGES = {
  "Paket Desain Basic": {
    timeline: "4 - 7 Hari",
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
const DISCOUNT_STORAGE_KEY = "rubahrumah.penawaran.desain.diskon";

type SavedOffer = {
  id: string;
  createdAt: string;
  clientId: string;
  salutation: "Mr" | "Mrs";
  roId: string;
  tanggal: string;
  luasTanah: string;
  nominal: string;
  paketName: keyof typeof PACKAGES;
  clientName: string;
  roName: string;
  total: number;
};

type SavedDiscountRequest = {
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
  hargaNormal: number;
  tipeDiskon: "nominal" | "persen";
  nilaiDiskon: string;
  nominalDiskon: number;
  hargaSetelahDiskon: number;
  alasan: string;
  status: string;
  roSignature?: string | null;
};

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
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
  if (!value) return "[Isi nominal]";
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
  const [nominal, setNominal] = useState("");
  const [tipeDiskon, setTipeDiskon] = useState<"nominal" | "persen">("nominal");
  const [nilaiDiskon, setNilaiDiskon] = useState("");
  const [alasanDiskon, setAlasanDiskon] = useState("");
  const [statusDiskon, setStatusDiskon] = useState("Draft");
  const [roSignature, setRoSignature] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [paketName, setPaketName] = useState<keyof typeof PACKAGES>("Paket Desain Basic");
  const [showPreview, setShowPreview] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const { data: savedOffers = [], refetch: refetchOffers } = useQuery<SavedOffer[]>({
    queryKey: ["penawaran-desain-offers"],
    queryFn: () => penawaranApi.list<SavedOffer>("desain", "offer"),
  });
  const { data: savedDiscounts = [], refetch: refetchDiscounts } = useQuery<SavedDiscountRequest[]>({
    queryKey: ["penawaran-desain-discounts"],
    queryFn: () => penawaranApi.list<SavedDiscountRequest>("desain", "discount"),
  });

  const { data } = useQuery({
    queryKey: ["penawaran-desain-clients"],
    queryFn: () => apiClient.get("/bd/database-client/leads", { params: { limit: 10000 } }).then((r) => r.data),
  });
  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["penawaran-desain-employees"],
    queryFn: () => apiClient.get("/desain/employees").then((r) => r.data),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    async function migrateLocalData() {
      const migrateKey = async <T extends { id?: string }>(key: string, kind: "offer" | "discount") => {
        const raw = window.localStorage.getItem(key);
        if (!raw) return;
        let items: T[] = [];
        try {
          items = JSON.parse(raw);
        } catch {
          window.localStorage.removeItem(key);
          return;
        }
        if (!Array.isArray(items) || items.length === 0) {
          window.localStorage.removeItem(key);
          return;
        }
        await Promise.all(items.map((item) => penawaranApi.save("desain", kind, item)));
        window.localStorage.removeItem(key);
      };
      await migrateKey<SavedOffer>(STORAGE_KEY, "offer");
      await migrateKey<SavedDiscountRequest>(DISCOUNT_STORAGE_KEY, "discount");
      void refetchOffers();
      void refetchDiscounts();
    }
    void migrateLocalData();
  }, [refetchOffers, refetchDiscounts]);

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
  const total = Number(nominal) || 0;
  const nominalDiskon = tipeDiskon === "persen"
    ? Math.round(total * ((Number(nilaiDiskon) || 0) / 100))
    : Number(nilaiDiskon) || 0;
  const hargaSetelahDiskon = Math.max(total - nominalDiskon, 0);
  const persenDiskon = total > 0 ? (nominalDiskon / total) * 100 : 0;
  const namaAsli = client ? rawClientName(client) : "[Nama Client]";
  const name = client ? `${salutation} ${namaAsli}` : "Mr/Mrs [Nama Client]";

  const termin1Rows = useMemo(() => pkg.termin1.items.map((d) => <li key={d}>{d}</li>), [pkg]);
  const termin2Rows = useMemo(() => pkg.termin2.items.map((d) => <li key={d}>{d}</li>), [pkg]);

  function askConfirm(action: ConfirmAction) {
    setConfirmAction(action);
  }

  async function confirmCurrentAction() {
    if (!confirmAction) return;
    await confirmAction.onConfirm();
    setConfirmAction(null);
  }

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

  async function saveOffer() {
    const offer: SavedOffer = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      clientId: String(client?.id ?? clientId),
      salutation,
      roId,
      tanggal,
      luasTanah,
      nominal,
      paketName,
      clientName: namaAsli,
      roName: selectedRo?.nama || "[Nama RO]",
      total,
    };
    await penawaranApi.save("desain", "offer", offer);
    await refetchOffers();
    setActiveTab("list");
  }

  function loadOffer(offer: SavedOffer, shouldPrint = false) {
    setClientId(offer.clientId);
    setSalutation(offer.salutation);
    setRoId(offer.roId);
    setTanggal(offer.tanggal);
    setLuasTanah(offer.luasTanah ?? "");
    setNominal(offer.nominal ?? String(offer.total ?? ""));
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

  async function deleteOffer(id: string) {
    await penawaranApi.remove(id);
    await refetchOffers();
  }

  async function saveDiscountRequest() {
    const request: SavedDiscountRequest = {
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
      hargaNormal: total,
      tipeDiskon,
      nilaiDiskon,
      nominalDiskon,
      hargaSetelahDiskon,
      alasan: alasanDiskon,
      status: statusDiskon,
      roSignature,
    };
    await penawaranApi.save("desain", "discount", request);
    await refetchDiscounts();
  }

  function loadDiscountRequest(request: SavedDiscountRequest, shouldPrint = false) {
    setClientId(request.clientId);
    setSalutation(request.salutation);
    setRoId(request.roId);
    setTanggal(request.tanggal);
    setLuasTanah(request.luasTanah ?? "");
    setNominal(String(request.hargaNormal || ""));
    setPaketName(request.paketName);
    setTipeDiskon(request.tipeDiskon);
    setNilaiDiskon(request.nilaiDiskon);
    setAlasanDiskon(request.alasan);
    setStatusDiskon(request.status);
    setRoSignature(request.roSignature ?? null);
    setShowPreview(true);
    setActiveTab("diskon");
    if (shouldPrint) {
      setTimeout(() => void downloadDiscountPdf(), 100);
    }
  }

  async function downloadDiscountPdf() {
    setShowPreview(true);
    setDownloadingPdf(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await downloadOfferPdf(".discount-page", `Pengajuan Diskon Desain - ${name} - ${formatDateFile(tanggal)}`);
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
          .offer-page { box-shadow: none !important; border: 0 !important; margin: 0 !important; width: 100% !important; min-height: auto !important; overflow: visible !important; page-break-inside: auto !important; padding: 0.5cm 1.5cm !important; }
          .offer-header { margin-bottom: 0 !important; padding-bottom: 8px !important; }
          .offer-page table, .offer-page tr, .offer-page p, .offer-page ul { break-inside: avoid; page-break-inside: avoid; }
        }
        .offer-page { font-family: Arial, Helvetica, sans-serif !important; }
      `}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Desain</h1>
          <p className="text-sm text-muted-foreground">Pilih client, tanggal, dan paket desain untuk membuat lampiran PDF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => askConfirm({ title: "Konfirmasi Preview", description: "Tampilkan atau sembunyikan preview penawaran?", confirmLabel: "Lanjutkan", onConfirm: () => setShowPreview((v) => !v) })}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
          <Button variant="outline" onClick={() => askConfirm({ title: "Konfirmasi Simpan", description: "Simpan penawaran desain ini ke daftar penawaran?", confirmLabel: "Simpan", onConfirm: saveOffer })}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
          <Button onClick={() => askConfirm({ title: "Konfirmasi Download", description: "Download PDF penawaran desain dengan data saat ini?", confirmLabel: "Download PDF", onConfirm: downloadPdf })} disabled={downloadingPdf}><Download className="h-4 w-4 mr-2" /> {downloadingPdf ? "Membuat PDF..." : "Download PDF"}</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="list">List Penawaran</TabsTrigger>
          <TabsTrigger value="diskon">Pengajuan Diskon</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="mt-4">
      <div className="grid md:grid-cols-7 gap-3 rounded-lg border bg-white p-4">
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
              placeholder="Cari dari Data Klien"
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
        <div>
          <Label>Nominal</Label>
          <Input
            type="number"
            min={0}
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            placeholder="Isi nominal"
          />
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
                  <Button size="sm" variant="outline" onClick={() => askConfirm({ title: "Konfirmasi Buka", description: "Muat data penawaran ini ke form?", confirmLabel: "Buka", onConfirm: () => loadOffer(offer) })}>Buka</Button>
                  <Button size="sm" onClick={() => askConfirm({ title: "Konfirmasi PDF", description: "Muat dan download PDF penawaran ini?", confirmLabel: "Download PDF", onConfirm: () => loadOffer(offer, true) })} disabled={downloadingPdf}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  {isSuperAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => askConfirm({ title: "Konfirmasi Hapus", description: "Hapus penawaran desain ini dari daftar?", confirmLabel: "Hapus", variant: "destructive", onConfirm: () => deleteOffer(offer.id) })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  )}
                </div>
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada penawaran tersimpan.</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="diskon" className="mt-4 space-y-4">
          <div className="grid gap-4 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Harga Normal</Label>
                <Input
                  type="number"
                  min={0}
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  placeholder="Harga sebelum diskon"
                />
              </div>
              <div>
                <Label>Tipe Diskon</Label>
                <Select value={tipeDiskon} onValueChange={(value) => setTipeDiskon(value as "nominal" | "persen")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nominal">Nominal</SelectItem>
                    <SelectItem value="persen">Persen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tipeDiskon === "persen" ? "Diskon (%)" : "Diskon (Rp)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={nilaiDiskon}
                  onChange={(e) => setNilaiDiskon(e.target.value)}
                  placeholder={tipeDiskon === "persen" ? "Contoh: 10" : "Contoh: 500000"}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusDiskon} onValueChange={setStatusDiskon}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Diajukan">Diajukan</SelectItem>
                    <SelectItem value="Disetujui">Disetujui</SelectItem>
                    <SelectItem value="Ditolak">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Alasan Pengajuan</Label>
                <Input
                  value={alasanDiskon}
                  onChange={(e) => setAlasanDiskon(e.target.value)}
                  placeholder="Contoh: penyesuaian budget client / promo closing"
                />
              </div>
              <div className="md:col-span-3">
                <Label>Tanda Tangan RO</Label>
                <div className="mt-1 flex flex-wrap items-center gap-3 rounded-md border bg-slate-50 p-3">
                  {roSignature ? (
                    <img src={roSignature} alt="Tanda tangan RO" className="h-16 max-w-40 object-contain" />
                  ) : (
                    <span className="text-sm text-muted-foreground">Belum ada tanda tangan RO.</span>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => askConfirm({ title: "Konfirmasi Tanda Tangan", description: "Buka modal untuk upload atau gambar tanda tangan RO?", confirmLabel: "Buka", onConfirm: () => setSignatureOpen(true) })}>
                    <PenLine className="h-4 w-4 mr-2" /> Upload / Digital
                  </Button>
                  {roSignature && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => askConfirm({ title: "Konfirmasi Hapus TTD", description: "Hapus tanda tangan RO dari pengajuan diskon ini?", confirmLabel: "Hapus", variant: "destructive", onConfirm: () => setRoSignature(null) })}>
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" /> Hapus
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-semibold">Ringkasan Diskon</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between"><span>Harga normal</span><span>{total ? IDR(total) : "-"}</span></div>
                <div className="flex justify-between text-red-600"><span>Diskon</span><span>-{nominalDiskon ? IDR(nominalDiskon) : "-"}</span></div>
                <div className="flex justify-between"><span>Persentase</span><span>{persenDiskon ? `${persenDiskon.toFixed(1)}%` : "-"}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold"><span>Harga akhir</span><span>{hargaSetelahDiskon ? IDR(hargaSetelahDiskon) : "-"}</span></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => askConfirm({ title: "Konfirmasi Simpan", description: "Simpan pengajuan diskon desain ini?", confirmLabel: "Simpan", onConfirm: saveDiscountRequest })}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
                <Button className="flex-1" variant="outline" onClick={() => askConfirm({ title: "Konfirmasi PDF", description: "Download PDF pengajuan diskon ini?", confirmLabel: "Download PDF", onConfirm: downloadDiscountPdf })} disabled={downloadingPdf}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <span>Client</span><span>Paket</span><span>Diskon</span><span>Status</span><span className="text-right">Aksi</span>
            </div>
            {savedDiscounts.length ? savedDiscounts.map((request) => (
              <div key={request.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium">{request.salutation} {request.clientName}</span>
                <span>{request.paketName}</span>
                <span>{IDR(request.nominalDiskon)}</span>
                <span>{request.status}</span>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => askConfirm({ title: "Konfirmasi Buka", description: "Muat data pengajuan diskon ini ke form?", confirmLabel: "Buka", onConfirm: () => loadDiscountRequest(request) })}>Buka</Button>
                  <Button size="sm" onClick={() => askConfirm({ title: "Konfirmasi PDF", description: "Muat dan download PDF pengajuan diskon ini?", confirmLabel: "Download PDF", onConfirm: () => loadDiscountRequest(request, true) })} disabled={downloadingPdf}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  {isSuperAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => askConfirm({ title: "Konfirmasi Hapus", description: "Hapus pengajuan diskon ini dari daftar?", confirmLabel: "Hapus", variant: "destructive", onConfirm: async () => { await penawaranApi.remove(request.id); await refetchDiscounts(); } })}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada pengajuan diskon tersimpan.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showPreview && activeTab === "diskon" && (
        <div className="discount-page offer-page mx-auto max-w-[794px] min-h-[1123px] border bg-white px-[1.5cm] py-[0.5cm] shadow-sm text-[12px] leading-5 text-black">
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

          <h2 className="mb-5 mt-6 text-center text-[14px] font-bold leading-none">FORM PENGAJUAN DISKON JASA DESAIN</h2>

          <div className="mb-5 grid grid-cols-[150px_1fr] gap-y-1">
            <span>Tanggal Pengajuan</span><span>: {formatDateID(tanggal)}</span>
            <span>Nama Client</span><span>: {name}</span>
            <span>Paket Desain</span><span>: {paketName}</span>
            <span>Luas Tanah</span><span>: {luasTanah || "[Isi luas]"} meter</span>
            <span>Relationship Officer</span><span>: {selectedRo?.nama || "[Nama RO]"}</span>
            <span>Status</span><span>: {statusDiskon}</span>
          </div>

          <p className="text-justify">
            Berdasarkan penawaran jasa desain untuk kebutuhan pembangunan Rumah Hunian milik {name}, berikut pengajuan diskon yang diajukan untuk pertimbangan dan persetujuan internal.
          </p>

          <table className="my-4 w-full border-collapse text-[12px]">
            <tbody>
              <tr>
                <td className="w-1/2 border border-black p-2 font-bold">Harga Normal</td>
                <td className="border border-black p-2 text-right">{total ? IDR(total) : "[Isi nominal]"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Diskon Diajukan</td>
                <td className="border border-black p-2 text-right">
                  {nominalDiskon ? IDR(nominalDiskon) : "[Isi diskon]"}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Harga Setelah Diskon</td>
                <td className="border border-black p-2 text-right font-bold">{hargaSetelahDiskon ? IDR(hargaSetelahDiskon) : "[Isi nominal]"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={2}>Terbilang : {terbilang(hargaSetelahDiskon)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4">
            <p className="font-bold">Alasan Pengajuan :</p>
            <p className="mt-1 min-h-12 text-justify">{alasanDiskon || "[Isi alasan pengajuan diskon]"}</p>
          </div>

          <p className="mt-6 text-justify">
            Demikian form pengajuan diskon ini dibuat untuk menjadi dasar pertimbangan persetujuan. Apabila disetujui, harga setelah diskon dapat digunakan sebagai nominal pada penawaran jasa desain kepada client.
          </p>

          <p className="mt-8 text-right">Bekasi, {formatDateID(tanggal)}</p>
          <div className="mt-6 grid grid-cols-2 gap-8 text-center">
            <div>
              <p>Diajukan Oleh,</p>
              <div className="relative mx-auto flex h-24 w-44 items-center justify-center">
                <img src="/images/logo.png" alt="Rubah Rumah" className="max-h-16 max-w-36 object-contain opacity-90" />
                {roSignature && (
                  <img
                    src={roSignature}
                    alt="Tanda tangan RO"
                    className="absolute left-1/2 top-1/2 max-h-20 max-w-44 -translate-x-1/2 -translate-y-1/2 object-contain"
                  />
                )}
              </div>
              <p className="font-bold">{selectedRo?.nama || "[Nama RO]"}</p>
              <p>Relation Officer</p>
            </div>
            <div>
              <p>Disetujui Oleh,</p>
              <div className="flex h-24 items-center justify-center">
                <img src="/images/logo.png" alt="Rubah Rumah" className="max-h-16 max-w-32 object-contain" />
              </div>
              <p>Management</p>
            </div>
          </div>
        </div>
      )}

      {showPreview && activeTab !== "diskon" && (
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
                <td className="border border-black p-2 text-right">{total ? IDR(total) : "[Isi manual]"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={3}>Total Harga</td>
                <td className="border border-black p-2 text-right font-bold">{total ? IDR(total) : "[Isi manual]"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={4}>Terbilang : {terbilang(total)}</td>
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

          <p className="text-justify">
            Demikian form penawaran ini kami sampaikan. Besar harapan kami dapat membantu {name} dalam mewujudkan desain hunian yang nyaman, fungsional, dan sesuai kebutuhan.
          </p>
          <p>Atas perhatian dan kepercayaannya, kami ucapkan terima kasih.</p>
          <p className="text-right">Bekasi, {formatDateID(tanggal)}</p>

          <div className="-mx-[1.5cm] mt-6 ml-auto w-[300px] text-left">
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
      )}

      <SignatureDialog
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        title="Tanda Tangan RO"
        onSave={(base64) => {
          setRoSignature(base64);
          setSignatureOpen(false);
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant ?? "default"}
        onConfirm={() => void confirmCurrentAction()}
      />
    </div>
  );
}

