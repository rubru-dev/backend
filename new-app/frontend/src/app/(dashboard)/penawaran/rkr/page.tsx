"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, PenLine, Plus, Save, Search, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import { downloadOfferPdf } from "@/lib/download-offer-pdf";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SignatureDialog } from "@/components/signature-dialog";
import { penawaranApi } from "@/lib/api/penawaran";

type OfferRow = { uraian: string; keterangan?: string; qty: string; hargaSatuan: string; satuan?: string; harga?: string };
const STORAGE_KEY = "rubahrumah.penawaran.rkr";
type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
};

type SavedOffer = {
  id: string;
  createdAt: string;
  clientId: string;
  salutation: "Mr" | "Mrs";
  roId: string;
  tanggal: string;
  jenisPenawaran: string;
  catatan?: string;
  rows: OfferRow[];
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
  jenisPenawaran: string;
  clientName: string;
  roName: string;
  hargaNormal: number;
  tipeDiskon: "nominal" | "persen";
  nilaiDiskon: number;
  nominalDiskon: number;
  hargaSetelahDiskon: number;
  alasan: string;
  status: string;
  roSignature?: string | null;
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

function parseVolume(value: string) {
  return Number(String(value).replace(",", ".")) || 0;
}

function decimalVolumeInput(value: string) {
  const normalized = value.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [whole, ...decimalParts] = normalized.split(",");
  return `${whole}${decimalParts.length ? `,${decimalParts.join("")}` : ""}`;
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
  const [catatan, setCatatan] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [tipeDiskon, setTipeDiskon] = useState<"nominal" | "persen">("nominal");
  const [nilaiDiskon, setNilaiDiskon] = useState("");
  const [statusDiskon, setStatusDiskon] = useState("Draft");
  const [alasanDiskon, setAlasanDiskon] = useState("");
  const [roSignature, setRoSignature] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [rows, setRows] = useState<OfferRow[]>([
    { uraian: "", keterangan: "", qty: "", satuan: "m2", hargaSatuan: "" },
    { uraian: "", keterangan: "", qty: "", satuan: "m2", hargaSatuan: "" },
    { uraian: "", keterangan: "", qty: "", satuan: "m2", hargaSatuan: "" },
  ]);
  const { data: savedOffers = [], refetch: refetchOffers } = useQuery<SavedOffer[]>({
    queryKey: ["penawaran-rkr-offers"],
    queryFn: () => penawaranApi.list<SavedOffer>("rkr", "offer"),
  });
  const { data: savedDiscounts = [], refetch: refetchDiscounts } = useQuery<SavedDiscountRequest[]>({
    queryKey: ["penawaran-rkr-discounts"],
    queryFn: () => penawaranApi.list<SavedDiscountRequest>("rkr", "discount"),
  });

  const { data } = useQuery({
    queryKey: ["penawaran-rkr-clients"],
    queryFn: () => apiClient.get("/bd/telemarketing/leads-dropdown").then((r) => r.data),
  });
  const { data: employees = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["penawaran-rkr-employees"],
    queryFn: () => apiClient.get("/desain/employees").then((r) => r.data),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    async function migrateLocalData() {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      let items: SavedOffer[] = [];
      try {
        items = JSON.parse(raw);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (Array.isArray(items) && items.length) {
        await Promise.all(items.map((item) => penawaranApi.save("rkr", "offer", item)));
        await refetchOffers();
      }
      window.localStorage.removeItem(STORAGE_KEY);
    }
    void migrateLocalData();
  }, [refetchOffers]);

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

  const total = useMemo(() => rows.reduce((sum, row) => sum + (parseVolume(row.qty) * parseMoney(row.hargaSatuan || row.harga || "")), 0), [rows]);
  const nominalDiskon = useMemo(() => {
    const raw = Number(nilaiDiskon) || 0;
    return tipeDiskon === "persen" ? Math.round(total * Math.min(raw, 100) / 100) : Math.min(raw, total || raw);
  }, [nilaiDiskon, tipeDiskon, total]);
  const hargaSetelahDiskon = Math.max(total - nominalDiskon, 0);
  const persenDiskon = total > 0 ? (nominalDiskon / total) * 100 : 0;

  function updateRow(index: number, patch: Partial<OfferRow>) {
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function askConfirm(action: ConfirmAction) {
    setConfirmAction(action);
  }

  async function confirmCurrentAction() {
    if (!confirmAction) return;
    await confirmAction.onConfirm();
    setConfirmAction(null);
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

  async function saveOffer() {
    const offer: SavedOffer = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      clientId: String(client?.id ?? clientId),
      salutation,
      roId,
      tanggal,
      jenisPenawaran,
      catatan,
      rows: rows.map((row) => ({ ...row, satuan: row.satuan || "m2", keterangan: row.keterangan || "", hargaSatuan: row.hargaSatuan || row.harga || "" })),
      clientName: namaAsli,
      roName: selectedRo?.nama || "[Nama RO]",
      total,
    };
    await penawaranApi.save("rkr", "offer", offer);
    await refetchOffers();
    setActiveTab("list");
  }

  async function saveDiscountRequest() {
    const request: SavedDiscountRequest = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      clientId: String(client?.id ?? clientId),
      salutation,
      roId,
      tanggal,
      jenisPenawaran,
      clientName: namaAsli,
      roName: selectedRo?.nama || "[Nama RO]",
      hargaNormal: total,
      tipeDiskon,
      nilaiDiskon: Number(nilaiDiskon) || 0,
      nominalDiskon,
      hargaSetelahDiskon,
      alasan: alasanDiskon,
      status: statusDiskon,
      roSignature,
    };
    await penawaranApi.save("rkr", "discount", request);
    await refetchDiscounts();
    setActiveTab("diskon");
  }

  function loadDiscountRequest(request: SavedDiscountRequest, shouldPrint = false) {
    setClientId(request.clientId);
    setSalutation(request.salutation);
    setRoId(request.roId);
    setTanggal(request.tanggal);
    setJenisPenawaran(request.jenisPenawaran);
    setTipeDiskon(request.tipeDiskon);
    setNilaiDiskon(String(request.nilaiDiskon));
    setStatusDiskon(request.status);
    setAlasanDiskon(request.alasan);
    setRoSignature(request.roSignature ?? null);
    setShowPreview(true);
    setActiveTab("diskon");
    if (shouldPrint) setTimeout(() => void downloadDiscountPdf(), 100);
  }

  async function downloadDiscountPdf() {
    setShowPreview(true);
    setDownloadingPdf(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await downloadOfferPdf(".discount-page", `Pengajuan Diskon RKR - ${name} - ${formatDateFile(tanggal)}`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  function loadOffer(offer: SavedOffer, shouldPrint = false) {
    setClientId(offer.clientId);
    setSalutation(offer.salutation);
    setRoId(offer.roId);
    setTanggal(offer.tanggal);
    setJenisPenawaran(offer.jenisPenawaran);
    setCatatan(offer.catatan ?? "");
    setRows(offer.rows.map((row) => ({ ...row, satuan: row.satuan === "m" ? "m1" : row.satuan || "m2", keterangan: row.keterangan ?? "", hargaSatuan: row.hargaSatuan || row.harga || "" })));
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

  async function deleteOffer(id: string) {
    await penawaranApi.remove(id);
    await refetchOffers();
  }

  return (
    <div className="p-6 space-y-5">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          aside, header, .print\\:hidden { display: none !important; }
          body { background: #fff !important; }
          .offer-page { box-shadow: none !important; border: 0 !important; margin: 0 !important; width: 100% !important; min-height: auto !important; overflow: visible !important; page-break-inside: auto !important; padding: 0.5cm 1.5cm !important; }
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
          <Button variant="outline" onClick={() => askConfirm({ title: "Konfirmasi Preview", description: "Tampilkan atau sembunyikan preview penawaran?", confirmLabel: "Lanjutkan", onConfirm: () => setShowPreview((v) => !v) })}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
          <Button variant="outline" onClick={() => askConfirm({ title: "Konfirmasi Simpan", description: "Simpan penawaran RKR ini ke daftar penawaran?", confirmLabel: "Simpan", onConfirm: saveOffer })}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
          <Button onClick={() => askConfirm({ title: "Konfirmasi Download", description: "Download PDF penawaran RKR dengan data saat ini?", confirmLabel: "Download PDF", onConfirm: downloadPdf })} disabled={downloadingPdf}><Download className="h-4 w-4 mr-2" /> {downloadingPdf ? "Membuat PDF..." : "Download PDF"}</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="list">List Penawaran</TabsTrigger>
          <TabsTrigger value="diskon">Pengajuan Diskon</TabsTrigger>
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
            <Button type="button" variant="outline" size="sm" onClick={() => askConfirm({ title: "Konfirmasi Tambah Baris", description: "Tambah baris rincian penawaran RKR?", confirmLabel: "Tambah", onConfirm: () => setRows((prev) => [...prev, { uraian: "", keterangan: "", qty: "", satuan: "m2", hargaSatuan: "" }]) })}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Baris
            </Button>
          </div>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="grid md:grid-cols-[1fr_1fr_100px_100px_150px_40px] gap-2">
                <Input value={row.uraian} onChange={(e) => updateRow(i, { uraian: e.target.value })} placeholder="Uraian pekerjaan" />
                <Input value={row.keterangan ?? ""} onChange={(e) => updateRow(i, { keterangan: e.target.value })} placeholder="Keterangan (opsional)" />
                <Input inputMode="decimal" value={row.qty} onChange={(e) => updateRow(i, { qty: decimalVolumeInput(e.target.value) })} placeholder="Volume" />
                <Select value={row.satuan === "m" ? "m1" : row.satuan || "m2"} onValueChange={(value) => updateRow(i, { satuan: value })}>
                  <SelectTrigger><SelectValue placeholder="Satuan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m2">m2</SelectItem>
                    <SelectItem value="m3">m3</SelectItem>
                    <SelectItem value="m1">m1</SelectItem>
                    <SelectItem value="unit">unit</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={0} value={row.hargaSatuan || row.harga || ""} onChange={(e) => updateRow(i, { hargaSatuan: nonNegativeNumber(e.target.value) })} placeholder="Harga satuan" />
                <Button type="button" variant="ghost" size="icon" disabled={rows.length <= 1} onClick={() => askConfirm({ title: "Konfirmasi Hapus Baris", description: "Hapus baris rincian penawaran ini?", confirmLabel: "Hapus", variant: "destructive", onConfirm: () => setRows((prev) => prev.filter((_, idx) => idx !== i)) })}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label>Catatan</Label>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan tambahan untuk penawaran (opsional)"
          />
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
                  <Button size="sm" variant="outline" onClick={() => askConfirm({ title: "Konfirmasi Buka", description: "Muat data penawaran ini ke form?", confirmLabel: "Buka", onConfirm: () => loadOffer(offer) })}>Buka</Button>
                  <Button size="sm" onClick={() => askConfirm({ title: "Konfirmasi PDF", description: "Muat dan download PDF penawaran ini?", confirmLabel: "Download PDF", onConfirm: () => loadOffer(offer, true) })} disabled={downloadingPdf}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  {isSuperAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => askConfirm({ title: "Konfirmasi Hapus", description: "Hapus penawaran RKR ini dari daftar?", confirmLabel: "Hapus", variant: "destructive", onConfirm: () => deleteOffer(offer.id) })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
                <Input type="number" min={0} value={total || ""} readOnly />
              </div>
              <div>
                <Label>Tipe Diskon</Label>
                <Select value={tipeDiskon} onValueChange={(value) => setTipeDiskon(value as "nominal" | "persen")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="nominal">Nominal</SelectItem><SelectItem value="persen">Persen</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tipeDiskon === "persen" ? "Diskon (%)" : "Diskon (Rp)"}</Label>
                <Input type="number" min={0} value={nilaiDiskon} onChange={(e) => setNilaiDiskon(nonNegativeNumber(e.target.value))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusDiskon} onValueChange={setStatusDiskon}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Diajukan">Diajukan</SelectItem><SelectItem value="Disetujui">Disetujui</SelectItem><SelectItem value="Ditolak">Ditolak</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Alasan Pengajuan</Label>
                <Input value={alasanDiskon} onChange={(e) => setAlasanDiskon(e.target.value)} placeholder="Contoh: penyesuaian budget client / promo closing" />
              </div>
              <div className="md:col-span-3">
                <Label>Tanda Tangan RO</Label>
                <div className="mt-1 flex flex-wrap items-center gap-3 rounded-md border bg-slate-50 p-3">
                  {roSignature ? <img src={roSignature} alt="Tanda tangan RO" className="h-16 max-w-40 object-contain" /> : <span className="text-sm text-muted-foreground">Belum ada tanda tangan RO.</span>}
                  <Button type="button" variant="outline" size="sm" onClick={() => setSignatureOpen(true)}><PenLine className="h-4 w-4 mr-2" /> Upload / Digital</Button>
                  {roSignature && <Button type="button" variant="ghost" size="sm" onClick={() => setRoSignature(null)}><Trash2 className="h-4 w-4 mr-2 text-red-500" /> Hapus</Button>}
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-semibold">Ringkasan Diskon</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between"><span>Harga normal</span><span>{total ? fmtMoney(total) : "-"}</span></div>
                <div className="flex justify-between text-red-600"><span>Diskon</span><span>-{nominalDiskon ? fmtMoney(nominalDiskon) : "-"}</span></div>
                <div className="flex justify-between"><span>Persentase</span><span>{persenDiskon ? `${persenDiskon.toFixed(1)}%` : "-"}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold"><span>Harga akhir</span><span>{hargaSetelahDiskon ? fmtMoney(hargaSetelahDiskon) : "-"}</span></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => askConfirm({ title: "Konfirmasi Simpan", description: "Simpan pengajuan diskon RKR ini?", confirmLabel: "Simpan", onConfirm: saveDiscountRequest })}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
                <Button className="flex-1" variant="outline" onClick={() => askConfirm({ title: "Konfirmasi PDF", description: "Download PDF pengajuan diskon ini?", confirmLabel: "Download PDF", onConfirm: downloadDiscountPdf })} disabled={downloadingPdf}><Download className="h-4 w-4 mr-2" /> PDF</Button>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-white">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <span>Client</span><span>Jenis</span><span>Diskon</span><span>Status</span><span className="text-right">Aksi</span>
            </div>
            {savedDiscounts.length ? savedDiscounts.map((request) => (
              <div key={request.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_150px] items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium">{request.salutation}. {request.clientName}</span><span>{request.jenisPenawaran}</span><span>{fmtMoney(request.nominalDiskon)}</span><span>{request.status}</span>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => loadDiscountRequest(request)}>Buka</Button>
                  <Button size="sm" onClick={() => loadDiscountRequest(request, true)} disabled={downloadingPdf}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  {isSuperAdmin && <Button size="icon" variant="ghost" onClick={() => askConfirm({ title: "Konfirmasi Hapus", description: "Hapus pengajuan diskon ini?", confirmLabel: "Hapus", variant: "destructive", onConfirm: async () => { await penawaranApi.remove(request.id); await refetchDiscounts(); } })}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
              </div>
            )) : <div className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada pengajuan diskon tersimpan.</div>}
          </div>
        </TabsContent>
      </Tabs>

      {showPreview && activeTab !== "diskon" && (
        <div className="offer-page mx-auto max-w-[794px] min-h-[1123px] border bg-white px-[1.5cm] py-[0.5cm] shadow-sm text-[12px] leading-5 text-black">
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
                <th className="w-20 border border-black p-2 text-center">Volume</th>
                <th className="w-20 border border-black p-2 text-center">Satuan</th>
                <th className="w-36 border border-black p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const qty = parseVolume(row.qty);
                const harga = parseMoney(row.hargaSatuan || row.harga || "");
                return (
                  <tr key={i}>
                    <td className="border border-black p-2 text-center">{i + 1}</td>
                    <td className="border border-black p-2">
                      <div>{row.uraian || "[Isi manual]"}</div>
                      {row.keterangan && <div className="mt-1 text-[11px] italic leading-4">{row.keterangan}</div>}
                    </td>
                    <td className="border border-black p-2 text-center">{row.qty || "[Isi]"}</td>
                    <td className="border border-black p-2 text-center">{row.satuan === "m" ? "m1" : row.satuan || "m2"}</td>
                    <td className="border border-black p-2 text-right">{harga && qty ? fmtMoney(qty * harga) : "[Isi manual]"}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="border border-black p-2 font-bold text-right" colSpan={4}>Total Harga Penawaran</td>
                <td className="border border-black p-2 text-right font-bold">{total ? fmtMoney(total) : "[Isi manual]"}</td>
              </tr>
            </tbody>
          </table>

          {catatan.trim() && (
            <div className="mb-5">
              <p className="font-bold">Catatan:</p>
              <p className="whitespace-pre-line text-justify">{catatan}</p>
            </div>
          )}

          <p className="text-justify">
            Demikian penawaran ini kami sampaikan. Besar harapan kami untuk dapat bekerja sama dengan {name}. Apabila terdapat pertanyaan lebih lanjut, {name} dapat menghubungi kami kapan saja.
          </p>

          <p className="mt-8 text-right">Bekasi, {formatDateID(tanggal)}</p>
          <div className="-mx-[1.5cm] mt-8 ml-auto w-[300px] text-left">
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
      {showPreview && activeTab === "diskon" && (
        <div className="discount-page offer-page mx-auto max-w-[794px] min-h-[1123px] border bg-white px-[1.5cm] py-[0.5cm] shadow-sm text-[12px] leading-5 text-black">
          <Letterhead />
          <h2 className="mb-5 mt-6 text-center text-[14px] font-bold leading-none">FORM PENGAJUAN DISKON RKR</h2>
          <div className="mb-5 grid grid-cols-[150px_1fr] gap-y-1">
            <span>Tanggal Pengajuan</span><span>: {formatDateID(tanggal)}</span>
            <span>Nama Client</span><span>: {name}</span>
            <span>Jenis Penawaran</span><span>: {jenisPenawaran}</span>
            <span>Relationship Officer</span><span>: {selectedRo?.nama || "[Nama RO]"}</span>
            <span>Status</span><span>: {statusDiskon}</span>
          </div>
          <p className="text-justify">Berdasarkan penawaran Ruangkeruang untuk {name}, berikut pengajuan diskon yang diajukan untuk pertimbangan dan persetujuan internal.</p>
          <table className="my-4 w-full border-collapse text-[12px]">
            <tbody>
              <tr><td className="w-1/2 border border-black p-2 font-bold">Harga Normal</td><td className="border border-black p-2 text-right">{total ? fmtMoney(total) : "[Isi nominal]"}</td></tr>
              <tr><td className="border border-black p-2 font-bold">Diskon Diajukan</td><td className="border border-black p-2 text-right">{nominalDiskon ? fmtMoney(nominalDiskon) : "[Isi diskon]"}</td></tr>
              <tr><td className="border border-black p-2 font-bold">Harga Setelah Diskon</td><td className="border border-black p-2 text-right font-bold">{hargaSetelahDiskon ? fmtMoney(hargaSetelahDiskon) : "[Isi nominal]"}</td></tr>
            </tbody>
          </table>
          <div className="mt-4"><p className="font-bold">Alasan Pengajuan :</p><p className="mt-1 min-h-12 text-justify">{alasanDiskon || "[Isi alasan pengajuan diskon]"}</p></div>
          <p className="mt-6 text-justify">Demikian form pengajuan diskon ini dibuat untuk menjadi dasar pertimbangan persetujuan.</p>
          <p className="mt-8 text-right">Bekasi, {formatDateID(tanggal)}</p>
          <div className="mt-6 grid grid-cols-2 gap-8 text-center">
            <div><p>Diajukan Oleh,</p><div className="mx-auto flex h-24 w-44 items-center justify-center">{roSignature && <img src={roSignature} alt="Tanda tangan RO" className="max-h-20 max-w-40 object-contain" />}</div><p className="font-bold">{selectedRo?.nama || "[Nama RO]"}</p><p>Relationship Officer</p></div>
            <div><p>Disetujui Oleh,</p><div className="h-24" /><p className="font-bold">Management</p></div>
          </div>
        </div>
      )}
      <SignatureDialog
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        title="Tanda Tangan RO"
        onSave={(signature) => {
          setRoSignature(signature);
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
