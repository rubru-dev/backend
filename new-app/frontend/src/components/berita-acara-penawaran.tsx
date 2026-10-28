"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, FileCheck2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadOfferPdf } from "@/lib/download-offer-pdf";
import { penawaranApi, type PenawaranType } from "@/lib/api/penawaran";

const BA_TYPES = ["Pertemuan", "Survei", "Negosiasi", "Kesepakatan", "Perubahan Pekerjaan", "Pemeriksaan Pekerjaan", "Serah Terima", "Lainnya"] as const;
type BAStatus = "Draft" | "Final" | "Ditandatangani";
type DetailMode = "offer" | "offer_edit" | "manual";
type BAItem = { id: string; uraian: string; volume: number; satuan: string; hargaSatuan: number };
type BeritaAcara = {
  id: string;
  sourceOfferId: string;
  sourceType: PenawaranType;
  sourceLabel: string;
  createdAt: string;
  jenis: string;
  judul: string;
  nomor: string;
  tanggal: string;
  lokasi: string;
  status: BAStatus;
  pihakPertamaNama: string;
  pihakPertamaJabatan: string;
  pihakPertamaPerusahaan: string;
  pihakPertamaAlamat: string;
  pihakKeduaNama: string;
  pihakKeduaJabatan: string;
  pihakKeduaPerusahaan: string;
  pihakKeduaAlamat: string;
  poin: string[];
  sertakanRincian: boolean;
  detailMode: DetailMode;
  tampilkanVolume: boolean;
  tampilkanHarga: boolean;
  tampilkanRingkasan: boolean;
  rincian: BAItem[];
  diskon: number;
  pajak: number;
  catatan: string;
  tindakLanjut: string;
  penanggungJawab: string;
  batasWaktu: string;
  sertakanSaksi: boolean;
  saksiNama: string;
  saksiJabatan: string;
};

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function makeId(prefix = "ba") {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(String(value ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
}

function money(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

function dateLong(value: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function sourceItems(offer?: any): BAItem[] {
  if (!offer?.id) {
    return [{ id: makeId("item"), uraian: "", volume: 1, satuan: "unit", hargaSatuan: 0 }];
  }
  if (Array.isArray(offer?.rows) && offer.rows.length) {
    return offer.rows.map((row: any) => ({
      id: makeId("item"),
      uraian: String(row.uraian ?? row.keterangan ?? ""),
      volume: parseNumber(row.qty) || 1,
      satuan: String(row.satuan ?? "unit"),
      hargaSatuan: parseNumber(row.hargaSatuan ?? row.harga),
    }));
  }
  const volume = parseNumber(offer?.luasTanah) || 1;
  const total = parseNumber(offer?.total ?? offer?.nominal);
  return [{
    id: makeId("item"),
    uraian: String(offer?.paketName ?? offer?.jenisPenawaran ?? "Pekerjaan"),
    volume,
    satuan: offer?.luasTanah ? "m²" : "paket",
    hargaSatuan: total && volume ? total / volume : total,
  }];
}

function companyFor(type: PenawaranType) {
  if (type === "rkr") return "Ruangkeruang by PT. Rubah Rumah Inovasi Pemuda";
  return "PT. Rubah Rumah Inovasi Pemuda";
}

function logoFor(type: PenawaranType) {
  if (type === "rkr") return "/images/offer-logos/rkr-logo.jpeg";
  if (type === "rubru") return "/images/offer-logos/rubru-logo.webp";
  return "/images/logo.png";
}

function sourceLabel(offer?: any) {
  return String(offer?.jenisPenawaran ?? offer?.paketName ?? "Tanpa referensi penawaran");
}

function emptyRecord(type: PenawaranType, offer?: any): BeritaAcara {
  const date = todayJakarta();
  const suffix = `${date.replace(/-/g, "")}-${String(Date.now()).slice(-5)}`;
  const hasOffer = Boolean(offer?.id);
  return {
    id: makeId(), sourceOfferId: hasOffer ? String(offer.id) : "", sourceType: type, sourceLabel: sourceLabel(offer), createdAt: new Date().toISOString(),
    jenis: "Pertemuan", judul: "Berita Acara Pertemuan", nomor: `BA-${type.toUpperCase()}-${suffix}`, tanggal: date, lokasi: "", status: "Draft",
    pihakPertamaNama: String(offer?.roName ?? ""), pihakPertamaJabatan: "Relationship Officer", pihakPertamaPerusahaan: companyFor(type), pihakPertamaAlamat: "",
    pihakKeduaNama: String(offer?.clientName ?? offer?.nama ?? offer?.klien ?? ""), pihakKeduaJabatan: "", pihakKeduaPerusahaan: "", pihakKeduaAlamat: "",
    poin: [""], sertakanRincian: false, detailMode: hasOffer ? "offer" : "manual", tampilkanVolume: true, tampilkanHarga: true, tampilkanRingkasan: true,
    rincian: sourceItems(offer), diskon: 0, pajak: 0, catatan: "", tindakLanjut: "", penanggungJawab: "", batasWaktu: "",
    sertakanSaksi: false, saksiNama: "", saksiJabatan: "",
  };
}

function statusClass(status: BAStatus) {
  if (status === "Ditandatangani") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Final") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function BeritaAcaraPenawaran({ type, offer, showAll = false }: { type: PenawaranType; offer?: any; showAll?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "preview">("form");
  const [record, setRecord] = useState<BeritaAcara>(() => emptyRecord(type, offer));
  const previewId = `ba-preview-${type}-${String(offer?.id ?? "all").replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const queryKey = ["penawaran-berita-acara", type];
  const query = useQuery({ queryKey, queryFn: () => penawaranApi.list<BeritaAcara>(type, "berita_acara"), staleTime: 0 });
  const related = showAll
    ? (query.data ?? [])
    : (query.data ?? []).filter((item) => item.sourceOfferId === String(offer?.id ?? ""));

  const totals = useMemo(() => {
    const subtotal = record.rincian.reduce((sum, item) => sum + item.volume * item.hargaSatuan, 0);
    const afterDiscount = Math.max(0, subtotal - record.diskon);
    const taxAmount = afterDiscount * Math.max(0, record.pajak) / 100;
    return { subtotal, taxAmount, total: afterDiscount + taxAmount };
  }, [record.diskon, record.pajak, record.rincian]);

  const save = useMutation({
    mutationFn: () => penawaranApi.save(type, "berita_acara", { ...record, poin: record.poin.map((item) => item.trim()).filter(Boolean), rincian: record.sertakanRincian ? record.rincian.filter((item) => item.uraian.trim()) : [] }),
    onSuccess: (saved) => { setRecord(saved as BeritaAcara); qc.invalidateQueries({ queryKey }); toast.success("Berita Acara tersimpan"); },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal menyimpan Berita Acara"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => penawaranApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setRecord(emptyRecord(type, offer)); toast.success("Draft Berita Acara dihapus"); },
    onError: (error: any) => toast.error(error?.response?.data?.detail || "Gagal menghapus Berita Acara"),
  });

  const update = <K extends keyof BeritaAcara>(key: K, value: BeritaAcara[K]) => setRecord((current) => ({ ...current, [key]: value }));
  const reset = () => { setRecord(emptyRecord(type, offer)); setView("form"); };
  const duplicate = (item: BeritaAcara) => {
    const copy = { ...item, id: makeId(), nomor: `${item.nomor}-COPY`, status: "Draft" as const, createdAt: new Date().toISOString() };
    setRecord(copy); setView("form");
  };
  const changeDetailMode = (mode: DetailMode) => {
    update("detailMode", mode);
    update("rincian", mode === "manual" ? [{ id: makeId("item"), uraian: "", volume: 1, satuan: "unit", hargaSatuan: 0 }] : sourceItems(offer));
  };
  const downloadPdf = async (item: BeritaAcara = record) => {
    setRecord(item);
    setView("preview");
    window.setTimeout(async () => {
      try { await downloadOfferPdf(`#${previewId}`, `${item.judul} - ${item.pihakKeduaNama || "Tanpa Nama"}`); }
      catch (error: any) { toast.error(error?.message || "Gagal membuat PDF Berita Acara"); }
    }, 100);
  };
  const openManager = () => { reset(); setOpen(true); };

  return <>
    <Button type="button" size="sm" variant="outline" onClick={openManager} className="min-h-11 whitespace-nowrap">
      <FileCheck2 aria-hidden="true" className="mr-1 h-3.5 w-3.5" />{showAll ? "Kelola Berita Acara" : "Berita Acara"}{related.length ? ` (${related.length})` : ""}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{showAll ? "Kelola Berita Acara" : "Berita Acara dari Penawaran"}</DialogTitle>
          <DialogDescription>{offer?.id ? `${record.pihakKeduaNama || "Klien"}, ${sourceLabel(offer)}.` : "Buat Berita Acara mandiri atau kelola dokumen yang terhubung ke penawaran."} Rincian pekerjaan dan nilai bersifat opsional.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 pb-5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 border-b py-3">
            <Button type="button" className="min-h-11" variant={view === "form" ? "default" : "outline"} onClick={() => setView("form")}>Form</Button>
            <Button type="button" className="min-h-11" variant={view === "preview" ? "default" : "outline"} onClick={() => setView("preview")}>Preview</Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button type="button" className="min-h-11" variant="outline" onClick={reset}><Plus aria-hidden="true" className="mr-1 h-4 w-4" />BA Baru</Button>
              <Button type="button" className="min-h-11" variant="outline" disabled={save.isPending} onClick={() => save.mutate()}><Save aria-hidden="true" className="mr-1 h-4 w-4" />{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
              <Button type="button" className="min-h-11" onClick={() => void downloadPdf()}><Download aria-hidden="true" className="mr-1 h-4 w-4" />PDF</Button>
            </div>
          </div>

          {query.isLoading && <div role="status" className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">Memuat daftar Berita Acara...</div>}
          {query.isError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Daftar Berita Acara gagal dimuat. <button type="button" className="min-h-11 font-semibold underline" onClick={() => query.refetch()}>Coba lagi</button></div>}
          {!query.isLoading && !query.isError && related.length === 0 && <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">Belum ada Berita Acara untuk penawaran ini.</div>}
          {related.length > 0 && <section className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 text-sm font-semibold">Dokumen dari penawaran ini</div>
            <div className="space-y-2">{related.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2 text-sm">
              <div className="min-w-0 flex-1"><div className="truncate font-medium">{item.nomor}: {item.judul}</div><div className="text-xs text-muted-foreground">{dateLong(item.tanggal)}</div></div>
              <Badge variant="outline" className={statusClass(item.status)}>{item.status}</Badge>
              <Button type="button" size="sm" className="min-h-11" variant="outline" onClick={() => { setRecord(item); setView("form"); }}><Pencil aria-hidden="true" className="mr-1 h-3.5 w-3.5" />Buka</Button>
              <Button type="button" size="sm" className="min-h-11" variant="outline" onClick={() => void downloadPdf(item)}><Download aria-hidden="true" className="mr-1 h-3.5 w-3.5" />PDF</Button>
              <Button type="button" size="sm" className="min-h-11" variant="outline" onClick={() => duplicate(item)}><Copy aria-hidden="true" className="mr-1 h-3.5 w-3.5" />Duplikat</Button>
              {item.status === "Draft" && <Button type="button" size="icon" variant="ghost" aria-label={`Hapus ${item.nomor}`} className="h-11 w-11 text-destructive" disabled={remove.isPending} onClick={() => { if (window.confirm(`Hapus draft ${item.nomor}?`)) remove.mutate(item.id); }}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>}
            </div>)}</div>
          </section>}

          {view === "form" ? <div className="space-y-5">
            <FormSection title="Informasi Dokumen">
              <Field label="Jenis Berita Acara"><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={record.jenis} onChange={(event) => { const jenis = event.target.value; setRecord((current) => ({ ...current, jenis, judul: current.judul === `Berita Acara ${current.jenis}` ? `Berita Acara ${jenis}` : current.judul })); }}>{BA_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Status"><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={record.status} onChange={(event) => update("status", event.target.value as BAStatus)}><option>Draft</option><option>Final</option><option>Ditandatangani</option></select></Field>
              <Field label="Judul"><Input value={record.judul} onChange={(event) => update("judul", event.target.value)} /></Field>
              <Field label="Nomor"><Input value={record.nomor} onChange={(event) => update("nomor", event.target.value)} /></Field>
              <Field label="Tanggal"><Input type="date" value={record.tanggal} onChange={(event) => update("tanggal", event.target.value)} /></Field>
              <Field label="Lokasi"><Input value={record.lokasi} onChange={(event) => update("lokasi", event.target.value)} placeholder="Lokasi kegiatan atau projek" /></Field>
            </FormSection>

            <div className="grid gap-4 lg:grid-cols-2">
              <PartySection title="Pihak Pertama" name={record.pihakPertamaNama} role={record.pihakPertamaJabatan} company={record.pihakPertamaPerusahaan} address={record.pihakPertamaAlamat} onName={(value) => update("pihakPertamaNama", value)} onRole={(value) => update("pihakPertamaJabatan", value)} onCompany={(value) => update("pihakPertamaPerusahaan", value)} onAddress={(value) => update("pihakPertamaAlamat", value)} />
              <PartySection title="Pihak Kedua" name={record.pihakKeduaNama} role={record.pihakKeduaJabatan} company={record.pihakKeduaPerusahaan} address={record.pihakKeduaAlamat} onName={(value) => update("pihakKeduaNama", value)} onRole={(value) => update("pihakKeduaJabatan", value)} onCompany={(value) => update("pihakKeduaPerusahaan", value)} onAddress={(value) => update("pihakKeduaAlamat", value)} />
            </div>

            <section className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-semibold">Isi Berita Acara</h3><Button type="button" size="sm" className="min-h-11" variant="outline" onClick={() => update("poin", [...record.poin, ""])}><Plus aria-hidden="true" className="mr-1 h-4 w-4" />Tambah Poin</Button></div>
              <div className="space-y-3">{record.poin.map((point, index) => <div key={index} className="grid grid-cols-[2rem_minmax(0,1fr)_2.75rem] gap-2">
                <div className="pt-3 text-center text-sm font-semibold">{index + 1}.</div>
                <Textarea aria-label={`Poin ${index + 1}`} value={point} onChange={(event) => update("poin", record.poin.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Tuliskan fakta, hasil pembahasan, atau keputusan" />
                <Button type="button" size="icon" variant="ghost" aria-label={`Hapus poin ${index + 1}`} className="h-11 w-11 text-destructive" disabled={record.poin.length === 1} onClick={() => update("poin", record.poin.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
              </div>)}</div>
            </section>

            <section className="space-y-4 rounded-lg border p-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-orange-500" checked={record.sertakanRincian} onChange={(event) => update("sertakanRincian", event.target.checked)} /><span><span className="block text-sm font-semibold">Sertakan rincian pekerjaan</span><span className="block text-xs text-muted-foreground">Tabel dapat diambil dari penawaran atau diisi manual.</span></span></label>
              {record.sertakanRincian && <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Sumber rincian"><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={record.detailMode} onChange={(event) => changeDetailMode(event.target.value as DetailMode)}>{offer?.id ? <><option value="offer">Ambil dari Penawaran</option><option value="offer_edit">Ambil lalu Edit</option><option value="manual">Isi Manual</option></> : <><option value="manual">Isi Manual</option>{record.detailMode !== "manual" && <option value={record.detailMode}>Rincian tersimpan dari Penawaran</option>}</>}</select></Field>
                  <CheckOption label="Volume dan satuan" checked={record.tampilkanVolume} onChange={(value) => update("tampilkanVolume", value)} />
                  <CheckOption label="Harga" checked={record.tampilkanHarga} onChange={(value) => setRecord((current) => ({ ...current, tampilkanHarga: value, tampilkanRingkasan: value ? current.tampilkanRingkasan : false }))} />
                  <CheckOption label="Ringkasan nilai" checked={record.tampilkanRingkasan} disabled={!record.tampilkanHarga} onChange={(value) => update("tampilkanRingkasan", value)} />
                </div>
                <div className="space-y-2">{record.rincian.map((item, index) => <div key={item.id} className="grid gap-2 rounded-md border bg-muted/10 p-3 lg:grid-cols-[2fr_0.7fr_0.8fr_1fr_2.75rem]">
                  <Field label={`Uraian ${index + 1}`}><Input readOnly={record.detailMode === "offer"} value={item.uraian} onChange={(event) => update("rincian", record.rincian.map((row) => row.id === item.id ? { ...row, uraian: event.target.value } : row))} /></Field>
                  <Field label="Volume"><Input type="number" min={0} step="any" readOnly={record.detailMode === "offer"} value={item.volume} onChange={(event) => update("rincian", record.rincian.map((row) => row.id === item.id ? { ...row, volume: Number(event.target.value) } : row))} /></Field>
                  <Field label="Satuan"><Input readOnly={record.detailMode === "offer"} value={item.satuan} onChange={(event) => update("rincian", record.rincian.map((row) => row.id === item.id ? { ...row, satuan: event.target.value } : row))} /></Field>
                  <Field label="Harga Satuan"><Input type="number" min={0} readOnly={record.detailMode === "offer"} value={item.hargaSatuan} onChange={(event) => update("rincian", record.rincian.map((row) => row.id === item.id ? { ...row, hargaSatuan: Number(event.target.value) } : row))} /></Field>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Hapus rincian ${index + 1}`} className="mt-6 h-11 w-11 text-destructive" disabled={record.detailMode === "offer" || record.rincian.length === 1} onClick={() => update("rincian", record.rincian.filter((row) => row.id !== item.id))}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
                </div>)}</div>
                {record.detailMode !== "offer" && <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => update("rincian", [...record.rincian, { id: makeId("item"), uraian: "", volume: 1, satuan: "unit", hargaSatuan: 0 }])}><Plus aria-hidden="true" className="mr-1 h-4 w-4" />Tambah Baris</Button>}
                {record.tampilkanHarga && record.tampilkanRingkasan && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Diskon Nominal"><Input type="number" min={0} value={record.diskon} onChange={(event) => update("diskon", Number(event.target.value))} /></Field><Field label="Pajak (%)"><Input type="number" min={0} value={record.pajak} onChange={(event) => update("pajak", Number(event.target.value))} /></Field><div className="sm:col-span-2 rounded-md bg-muted p-3 text-sm"><div>Subtotal: <b>{money(totals.subtotal)}</b></div><div>Total: <b>{money(totals.total)}</b></div></div></div>}
              </>}
            </section>

            <FormSection title="Catatan dan Tindak Lanjut">
              <Field label="Catatan"><Textarea value={record.catatan} onChange={(event) => update("catatan", event.target.value)} /></Field>
              <Field label="Tindak Lanjut"><Textarea value={record.tindakLanjut} onChange={(event) => update("tindakLanjut", event.target.value)} /></Field>
              <Field label="Penanggung Jawab"><Input value={record.penanggungJawab} onChange={(event) => update("penanggungJawab", event.target.value)} /></Field>
              <Field label="Batas Waktu"><Input type="date" value={record.batasWaktu} onChange={(event) => update("batasWaktu", event.target.value)} /></Field>
            </FormSection>

            <section className="space-y-3 rounded-lg border p-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-orange-500" checked={record.sertakanSaksi} onChange={(event) => update("sertakanSaksi", event.target.checked)} /><span className="text-sm font-semibold">Sertakan kolom saksi</span></label>
              {record.sertakanSaksi && <div className="grid gap-3 sm:grid-cols-2"><Field label="Nama Saksi"><Input value={record.saksiNama} onChange={(event) => update("saksiNama", event.target.value)} /></Field><Field label="Jabatan Saksi"><Input value={record.saksiJabatan} onChange={(event) => update("saksiJabatan", event.target.value)} /></Field></div>}
            </section>
          </div> : <Preview id={previewId} type={type} record={record} totals={totals} />}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium"><span>{label}</span>{children}</label>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border p-4"><h3 className="mb-3 font-semibold">{title}</h3><div className="grid gap-3 md:grid-cols-2">{children}</div></section>;
}

function PartySection({ title, name, role, company, address, onName, onRole, onCompany, onAddress }: { title: string; name: string; role: string; company: string; address: string; onName: (value: string) => void; onRole: (value: string) => void; onCompany: (value: string) => void; onAddress: (value: string) => void }) {
  return <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">{title}</h3><Field label="Nama"><Input value={name} onChange={(event) => onName(event.target.value)} /></Field><Field label="Jabatan"><Input value={role} onChange={(event) => onRole(event.target.value)} /></Field><Field label="Perusahaan"><Input value={company} onChange={(event) => onCompany(event.target.value)} /></Field><Field label="Alamat"><Textarea value={address} onChange={(event) => onAddress(event.target.value)} /></Field></section>;
}

function CheckOption({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}><input type="checkbox" className="h-5 w-5 accent-orange-500" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function Preview({ id, type, record, totals }: { id: string; type: PenawaranType; record: BeritaAcara; totals: { subtotal: number; taxAmount: number; total: number } }) {
  const partyColumns = record.sertakanSaksi ? "grid-cols-3" : "grid-cols-2";
  return <div className="overflow-x-auto rounded-lg bg-slate-100 p-2 sm:p-4">
    <article id={id} className="offer-page mx-auto min-h-[297mm] w-[210mm] bg-white px-[15mm] py-[10mm] text-[12px] leading-relaxed text-black shadow-sm">
      <header className="mb-5 flex items-center justify-between border-b-2 border-black pb-3">
        <img src={logoFor(type)} alt={companyFor(type)} className="max-h-20 max-w-40 object-contain" />
        <div className="max-w-[60%] text-right"><div className="text-sm font-bold uppercase">{record.pihakPertamaPerusahaan || companyFor(type)}</div><div className="text-[10px]">Dokumen Berita Acara</div></div>
      </header>
      <h1 className="text-center text-base font-bold uppercase">{record.judul}</h1>
      <p className="mb-5 text-center">Nomor: {record.nomor}</p>
      <p className="text-justify">Pada hari ini, {dateLong(record.tanggal)}, bertempat di {record.lokasi || "[lokasi]"}, telah dilaksanakan kegiatan {record.jenis.toLowerCase()} yang melibatkan pihak-pihak berikut:</p>
      <PartyPreview label="PIHAK PERTAMA" name={record.pihakPertamaNama} role={record.pihakPertamaJabatan} company={record.pihakPertamaPerusahaan} address={record.pihakPertamaAlamat} />
      <PartyPreview label="PIHAK KEDUA" name={record.pihakKeduaNama} role={record.pihakKeduaJabatan} company={record.pihakKeduaPerusahaan} address={record.pihakKeduaAlamat} />
      <p className="mt-4 text-justify">Berdasarkan kegiatan tersebut, para pihak menerangkan dan mencatat hal-hal sebagai berikut:</p>
      <ol className="my-3 list-decimal space-y-2 pl-5">{record.poin.filter(Boolean).map((point, index) => <li key={index} className="whitespace-pre-wrap text-justify">{point}</li>)}</ol>

      {record.sertakanRincian && <section className="my-5"><h2 className="mb-2 font-bold">Rincian Pekerjaan</h2><table className="w-full border-collapse text-[10px]"><thead><tr className="bg-slate-100"><th className="border border-black p-1">No.</th><th className="border border-black p-1 text-left">Uraian Pekerjaan</th>{record.tampilkanVolume && <><th className="border border-black p-1">Volume</th><th className="border border-black p-1">Satuan</th></>}{record.tampilkanHarga && <><th className="border border-black p-1 text-right">Harga Satuan</th><th className="border border-black p-1 text-right">Jumlah</th></>}</tr></thead><tbody>{record.rincian.filter((item) => item.uraian).map((item, index) => <tr key={item.id}><td className="border border-black p-1 text-center">{index + 1}</td><td className="border border-black p-1">{item.uraian}</td>{record.tampilkanVolume && <><td className="border border-black p-1 text-center">{item.volume}</td><td className="border border-black p-1 text-center">{item.satuan}</td></>}{record.tampilkanHarga && <><td className="border border-black p-1 text-right">{money(item.hargaSatuan)}</td><td className="border border-black p-1 text-right">{money(item.volume * item.hargaSatuan)}</td></>}</tr>)}</tbody>{record.tampilkanHarga && record.tampilkanRingkasan && <tfoot><tr><td className="border border-black p-1 text-right font-bold" colSpan={record.tampilkanVolume ? 5 : 3}>Subtotal</td><td className="border border-black p-1 text-right">{money(totals.subtotal)}</td></tr>{record.diskon > 0 && <tr><td className="border border-black p-1 text-right" colSpan={record.tampilkanVolume ? 5 : 3}>Diskon</td><td className="border border-black p-1 text-right">-{money(record.diskon)}</td></tr>}{record.pajak > 0 && <tr><td className="border border-black p-1 text-right" colSpan={record.tampilkanVolume ? 5 : 3}>Pajak {record.pajak}%</td><td className="border border-black p-1 text-right">{money(totals.taxAmount)}</td></tr>}<tr><td className="border border-black p-1 text-right font-bold" colSpan={record.tampilkanVolume ? 5 : 3}>Total</td><td className="border border-black p-1 text-right font-bold">{money(totals.total)}</td></tr></tfoot>}</table></section>}

      {(record.catatan || record.tindakLanjut || record.penanggungJawab || record.batasWaktu) && <section className="my-5"><h2 className="mb-2 font-bold">Catatan dan Tindak Lanjut</h2>{record.catatan && <p className="whitespace-pre-wrap"><b>Catatan:</b> {record.catatan}</p>}{record.tindakLanjut && <p className="whitespace-pre-wrap"><b>Tindak lanjut:</b> {record.tindakLanjut}</p>}{record.penanggungJawab && <p><b>Penanggung jawab:</b> {record.penanggungJawab}</p>}{record.batasWaktu && <p><b>Batas waktu:</b> {dateLong(record.batasWaktu)}</p>}</section>}
      <p className="mt-5 text-justify">Demikian Berita Acara ini dibuat berdasarkan keadaan, kegiatan, dan pembahasan yang sebenarnya. Dokumen ini dibuat untuk dipergunakan sebagaimana mestinya dan ditandatangani oleh para pihak yang berkepentingan.</p>
      <p className="mt-5 text-right">{record.lokasi || "[kota]"}, {dateLong(record.tanggal).replace(/^\w+,\s*/, "")}</p>
      <div className={`mt-6 grid ${partyColumns} gap-6 text-center`}><SignaturePreview label="PIHAK PERTAMA" name={record.pihakPertamaNama} role={record.pihakPertamaJabatan} /><SignaturePreview label="PIHAK KEDUA" name={record.pihakKeduaNama} role={record.pihakKeduaJabatan} />{record.sertakanSaksi && <SignaturePreview label="SAKSI" name={record.saksiNama} role={record.saksiJabatan} />}</div>
      {record.sourceOfferId && <footer className="mt-8 border-t pt-2 text-[9px] text-slate-500">Referensi: {record.sourceLabel}, ID {record.sourceOfferId}</footer>}
    </article>
  </div>;
}

function PartyPreview({ label, name, role, company, address }: { label: string; name: string; role: string; company: string; address: string }) {
  return <div className="mt-4 grid grid-cols-[110px_1fr] gap-y-0.5"><b>{label}</b><span /><span>Nama</span><span>: {name || "-"}</span><span>Jabatan</span><span>: {role || "-"}</span><span>Perusahaan</span><span>: {company || "-"}</span><span>Alamat</span><span>: {address || "-"}</span></div>;
}

function SignaturePreview({ label, name, role }: { label: string; name: string; role: string }) {
  return <div><p className="font-bold">{label}</p><div className="h-20" /><p className="border-t border-black pt-1 font-bold">{name || "(________________)"}</p><p>{role}</p></div>;
}
