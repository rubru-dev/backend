"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  kontrakTemplateApi, kontrakDokumenApi,
  type KontrakTemplate, type KontrakDokumen, type KontrakLampiran, type KontrakDokumenPasal,
} from "@/lib/api/addendum";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SignatureDialog } from "@/components/signature-dialog";
import {
  Plus, Trash2, PenLine, FileText, CheckCircle2, Eye, Pencil,
  Printer, BookOpen, ChevronDown, ChevronUp, Upload, X, ExternalLink, Lock, Building2,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d?: string | Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateShort(d?: string | Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// URL relatif agar melewati proxy Next (/api/v1/* → backend). JANGAN pakai NEXT_PUBLIC_API_URL
// di sini: nilainya di-bake saat build (mis. http://localhost:8000) dan di browser production
// jadi tautan file yang broken/mixed-content. file_url dari backend berbentuk "/storage/...".
const BACKEND_URL = "/api/v1";

const STATUS_BADGE: Record<string, { variant: "secondary" | "default" | "outline" | "destructive"; label: string }> = {
  draft:         { variant: "secondary", label: "Draft" },
  aktif:         { variant: "default",   label: "Aktif" },
  signed_ro:     { variant: "default",   label: "Ditandatangani" },
  signed_client: { variant: "default",   label: "Ditandatangani Klien" },
  signed:        { variant: "outline",   label: "Selesai" },
};
function statusBadge(status: string) {
  const s = STATUS_BADGE[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// ── Print PDF ─────────────────────────────────────────────────────────────────
async function printKontrak(dokOrId: KontrakDokumen | number, knownLampirans?: KontrakLampiran[]) {
  // Pre-open print window + tiap lampiran file SEBELUM await (agar tidak diblokir popup blocker)
  const w = window.open("", "_blank");
  if (!w) { alert("Aktifkan popup di browser untuk mencetak."); return; }
  w.document.write("<html><body style='font-family:sans-serif;padding:24px'><p>Memuat dokumen...</p></body></html>");
  w.document.close();

  // Pre-open jendela lampiran dari data yang sudah ada (sebelum await)
  const lampiranWindows = (knownLampirans ?? [])
    .filter((l) => l.file_url)
    .map((l) => window.open(`${BACKEND_URL}${l.file_url}`, "_blank"));

  // Fetch fresh data
  const dok = typeof dokOrId === "number"
    ? await kontrakDokumenApi.get(dokOrId)
    : await kontrakDokumenApi.get((dokOrId as KontrakDokumen).id);
  // Pasal template (live) + pasal ekstra khusus dokumen ini → nomor lanjut.
  // Dedup by isi+judul supaya tidak tampil dobel (mis. pasal ekstra tak sengaja
  // sama dengan pasal template, atau ter-submit dua kali).
  const rawPasals = [...(dok.template?.pasals ?? []), ...(dok.extra_pasals ?? [])];
  const seenPasal = new Set<string>();
  const allPasals = rawPasals.filter((p) => {
    const key = `${(p.judul_pasal ?? "").trim().toLowerCase()}||${(p.isi_pasal ?? "").trim().toLowerCase()}`;
    if (key === "||") return true; // pasal kosong biarkan (jarang)
    if (seenPasal.has(key)) return false;
    seenPasal.add(key);
    return true;
  });
  const lampirans = dok.lampirans ?? [];
  const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/images/logo.png` : "";
  // Data Pihak Pertama dari pengaturan (fallback ke default perusahaan).
  const company = await kontrakDokumenApi.getCompany().catch(() => ({
    nama: "PT. Rubah Rumah Inovasi Pemuda (rubahrumah.com)",
    nib: "2209220142528",
    alamat: "Jl. Pandu II No.420, Kota Bekasi 17114",
    telepon: "0813-7640-5550",
  }));

  const tanggalFull = dok.tanggal
    ? new Date(dok.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  const [weekday, ...rest] = tanggalFull.split(", ");
  const dateOnly = rest.join(", ");

  const pembuka = dok.template?.pembuka ??
    "Sehubungan dengan adanya perubahan dalam lingkup pekerjaan, maka Para Pihak dengan ini sepakat untuk membuat Addendum Kontrak Kerja, yang merupakan bagian tidak terpisahkan dari kontrak utama tersebut, dengan ketentuan sebagai berikut:";

  const penutup = dok.template?.penutup ??
    "Demikian Addendum Kontrak ini dibuat dan ditandatangani oleh Para Pihak dalam keadaan sehat dan tanpa adanya paksaan dari pihak manapun, untuk dapat dipergunakan sebagaimana mestinya.";

  const pasalHtml = allPasals.map((p, i) => `
    <div style="margin:16px 0">
      <p style="font-weight:bold;text-align:center;text-transform:uppercase;white-space:pre-line;margin-bottom:6px">PASAL ${i + 1}${p.judul_pasal ? "\n" + p.judul_pasal.toUpperCase() : ""}</p>
      <div style="font-size:11pt;text-align:justify;line-height:1.7;white-space:pre-wrap">${p.isi_pasal ?? ""}</div>
    </div>
    <div style="border-top:1px dashed #bbb;margin:4px 0"></div>
  `).join("");

  // Lampiran list untuk header
  const lampiranListHtml = lampirans.length > 0
    ? lampirans.map((l, i) => `<p style="margin:2px 0">${i + 1}. ${l.judul}</p>`).join("")
    : "<p style='margin:2px 0'>-</p>";

  // Load LOGO as base64 untuk watermark di blok TTD (samakan dengan PDF invoice/kwitansi)
  const sigWatermarkBase64 = await (async () => {
    try {
      const res = await fetch(`${window.location.origin}/images/logo.png`);
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return ""; }
  })();

  // Signature cell: logo samar sebagai watermark di belakang tinta TTD.
  const sigCell = (role: string, name: string | null, sig: string | null, date: string | null) => `
    <div style="text-align:center;padding:0 8px;position:relative">
      <div style="position:relative;height:100px;display:flex;align-items:center;justify-content:center">
        ${sigWatermarkBase64 ? `<img src="${sigWatermarkBase64}" style="position:absolute;width:110px;height:110px;object-fit:contain;pointer-events:none;opacity:0.5"/>` : ""}
        ${sig ? `<img src="${sig}" style="position:relative;height:65px;object-fit:contain;display:block;margin:0 auto;z-index:1"/>` : `<div style="height:65px"></div>`}
      </div>
      <div style="border-top:1px solid #000;padding-top:4px">
        <p style="font-size:10.5pt;margin:0">(${name ?? ".............................."})</p>
        <p style="font-size:9.5pt;color:#444;margin:2px 0">${role}</p>
        ${date ? `<p style="font-size:9pt;color:#777;margin:1px 0">${fmtDateShort(date)}</p>` : ""}
      </div>
    </div>
  `;

  // Daftar lampiran di akhir kontrak
  const lampiranListSectionHtml = lampirans.length > 0 ? `
    <div style="margin-top:32px">
      <p style="font-weight:bold;font-size:12pt;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:12px">DAFTAR LAMPIRAN</p>
      ${lampirans.map((l, i) => `
        <p style="margin:6px 0;font-size:11pt">${i + 1}. ${l.judul}${l.file_url ? "" : " <em style='color:#999;font-size:10pt'>(belum ada file)</em>"}</p>
      `).join("")}
    </div>
  ` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${dok.template?.judul ?? "Kontrak"} — ${dok.nomor_kontrak ?? ""}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; padding: 36px 56px; line-height: 1.65; }
  @media print { @page { margin: 2cm 2.5cm; } iframe { page-break-before: always; } }
</style>
</head><body>

<!-- LOGO pojok kiri atas, di luar header -->
<div style="text-align:left;margin-bottom:8px">
  <img src="${logoUrl}" style="height:40px;object-fit:contain" onerror="this.style.display='none'"/>
</div>

<!-- HEADER -->
<div style="text-align:center;border-bottom:3px double #000;padding-bottom:12px;margin-bottom:14px">
  <p style="font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px">${dok.template?.judul ?? "Addendum Kontrak Pekerjaan"}</p>
  <p style="font-size:10.5pt;margin-top:4px">No: <strong>${dok.nomor_kontrak ?? "—"}</strong></p>
  ${dok.jenis_pekerjaan ? `<p style="font-size:10.5pt;font-weight:bold;margin-top:2px">PEKERJAAN : ${dok.jenis_pekerjaan}</p>` : ""}
</div>

<!-- LAMPIRAN -->
<div style="margin-bottom:14px;font-size:11pt">
  <p style="font-weight:bold">LAMPIRAN:</p>
  ${lampiranListHtml}
</div>

<hr style="border:none;border-top:1px solid #000;margin:10px 0"/>

<!-- PEMBUKA -->
<p style="font-size:11pt;margin-bottom:14px">
  Pada hari <strong>${weekday || "___"}</strong>, tanggal <strong>${dateOnly || "__ _______ ____"}</strong>,
  di Bekasi, yang bertanda tangan di bawah ini:
</p>

<!-- PIHAK PERTAMA -->
<table style="width:100%;font-size:11pt;margin-bottom:4px">
  <tr><td style="width:140px">Nama</td><td>: <strong>${company.nama}</strong></td></tr>
  <tr><td>No. NIB</td><td>: ${company.nib}</td></tr>
  <tr><td>Alamat</td><td>: ${company.alamat}</td></tr>
  <tr><td>Telepon</td><td>: ${company.telepon}</td></tr>
</table>
<p style="font-size:11pt;margin-bottom:12px">Selanjutnya disebut <strong>PIHAK PERTAMA</strong>.</p>

<!-- PIHAK KEDUA -->
<table style="width:100%;font-size:11pt;margin-bottom:4px">
  <tr><td style="width:140px">Nama</td><td>: ${dok.nama_client ?? "___________________"}</td></tr>
  <tr><td>Alamat</td><td>: ${dok.alamat_client ?? "___________________"}</td></tr>
  <tr><td>Telepon</td><td>: ${dok.telepon_client ?? "___________________"}</td></tr>
</table>
<p style="font-size:11pt;margin-bottom:14px">Selanjutnya disebut <strong>PIHAK KEDUA</strong>.</p>

<hr style="border:none;border-top:1px solid #000;margin:10px 0"/>

<!-- KALIMAT PEMBUKA -->
<p style="font-size:11pt;text-align:justify;margin-bottom:14px;white-space:pre-wrap">${pembuka}</p>

<hr style="border:none;border-top:1px solid #000;margin:10px 0"/>

<!-- PASAL-PASAL -->
${pasalHtml}

<!-- BLOK PENUTUP + TANGGAL + TTD (jaga tetap satu halaman) -->
<div style="page-break-inside:avoid;break-inside:avoid;margin-top:18px">
  <!-- PENUTUP -->
  <p style="font-size:11pt;text-align:justify;margin-bottom:18px;white-space:pre-wrap">${penutup}</p>

  <!-- TANGGAL -->
  <p style="text-align:right;font-size:11pt;margin:0 0 16px">
    ${dok.tanggal ? `Bekasi, ${fmtDate(dok.tanggal)}` : "Bekasi, __________ ____"}
  </p>

  <!-- TANDA TANGAN — satu baris: Management | RO | Client -->
  <table style="width:100%;border-collapse:collapse">
    <tr style="vertical-align:top;text-align:center">
      <td style="width:33.33%">
        <p style="font-weight:bold;font-size:10pt;margin-bottom:10px">PIHAK PERTAMA</p>
        ${sigCell("Management RUBAHRUMAH", dok.management_name, dok.management_signature, dok.management_signed_at)}
      </td>
      <td style="width:33.33%">
        <p style="font-weight:bold;font-size:10pt;margin-bottom:10px">&nbsp;</p>
        ${sigCell("Relationship Officer", dok.ro_name, dok.ro_signature, dok.ro_signed_at)}
      </td>
      <td style="width:33.33%">
        <p style="font-weight:bold;font-size:10pt;margin-bottom:10px">PIHAK KEDUA</p>
        ${sigCell("Customer", dok.client_name ?? dok.nama_client, dok.client_signature, dok.client_signed_at)}
      </td>
    </tr>
  </table>
</div>

<!-- DAFTAR LAMPIRAN (list di akhir kontrak) -->
${lampiranListSectionHtml}

</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.print(); }, 600);

  // Suppress unused variable warning
  void lampiranWindows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: TEMPLATE KONTRAK
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PEMBUKA =
  "Sehubungan dengan adanya perubahan dalam lingkup pekerjaan, maka Para Pihak dengan ini sepakat untuk membuat Addendum Kontrak Kerja, yang merupakan bagian tidak terpisahkan dari kontrak utama tersebut, dengan ketentuan sebagai berikut:";

const DEFAULT_PENUTUP =
  "Demikian Addendum Kontrak ini dibuat dan ditandatangani oleh Para Pihak dalam keadaan sehat dan tanpa adanya paksaan dari pihak manapun, untuk dapat dipergunakan sebagaimana mestinya.";

function TemplateFormDialog({ open, onOpenChange, initial, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: KontrakTemplate | null; onSaved: () => void;
}) {
  const [judul, setJudul] = useState(initial?.judul ?? "");
  const [pihakSatu, setPihakSatu] = useState(
    initial?.pihak_satu ?? "PT. Rubah Rumah Inovasi Pemuda (rubahrumah.com)\nNo. NIB : 2209220142528\nAlamat : Jl. Pandu II No.420, Kota Bekasi 17114\nTelepon : 0813-7640-5550"
  );
  const [pihakDua, setPihakDua] = useState(initial?.pihak_dua ?? "");
  const [pembuka, setPembuka] = useState(initial?.pembuka ?? DEFAULT_PEMBUKA);
  const [penutup, setPenutup] = useState(initial?.penutup ?? DEFAULT_PENUTUP);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () => initial
      ? kontrakTemplateApi.update(initial.id, { judul, pihak_satu: pihakSatu, pihak_dua: pihakDua, pembuka, penutup })
      : kontrakTemplateApi.create({ judul, pihak_satu: pihakSatu, pihak_dua: pihakDua, pembuka, penutup }),
    onSuccess: () => {
      toast.success(initial ? "Template diperbarui" : "Template dibuat");
      qc.invalidateQueries({ queryKey: ["kontrak-templates"] });
      onSaved(); onOpenChange(false);
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit Template" : "Buat Template Kontrak Baru"}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Judul / Nama Kontrak <span className="text-destructive">*</span></Label>
            <Input placeholder="Contoh: Addendum Kontrak Pekerjaan, Kontrak Interior..." value={judul} onChange={(e) => setJudul(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pihak Pertama</Label>
            <Textarea rows={4} value={pihakSatu} onChange={(e) => setPihakSatu(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Kalimat Pembuka</Label>
            <p className="text-xs text-muted-foreground">Paragraf yang muncul sebelum pasal-pasal dimulai.</p>
            <Textarea rows={5} value={pembuka} onChange={(e) => setPembuka(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Kalimat Penutup</Label>
            <p className="text-xs text-muted-foreground">Paragraf yang muncul setelah pasal terakhir, sebelum tanggal & tanda tangan. Penutup, tanggal, dan tanda tangan akan tetap berada di satu halaman.</p>
            <Textarea rows={4} value={penutup} onChange={(e) => setPenutup(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Keterangan Tambahan Pihak Kedua <span className="text-xs text-muted-foreground">(opsional)</span></Label>
            <Textarea rows={2} placeholder="Keterangan tambahan selain nama/telepon/alamat dari lead..." value={pihakDua} onChange={(e) => setPihakDua(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !judul.trim()}>
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasalEditor({ template }: { template: KontrakTemplate }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newJudul, setNewJudul] = useState("");
  const [newIsi, setNewIsi] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editJudul, setEditJudul] = useState("");
  const [editIsi, setEditIsi] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const qc = useQueryClient();

  const addMut = useMutation({
    mutationFn: () => kontrakTemplateApi.addPasal(template.id, { judul_pasal: newJudul || undefined, isi_pasal: newIsi || undefined }),
    onSuccess: () => { toast.success("Pasal ditambahkan"); qc.invalidateQueries({ queryKey: ["kontrak-templates"] }); setNewJudul(""); setNewIsi(""); setAddOpen(false); },
    onError: () => toast.error("Gagal"),
  });
  const updateMut = useMutation({
    mutationFn: (id: number) => kontrakTemplateApi.updatePasal(template.id, id, { judul_pasal: editJudul, isi_pasal: editIsi }),
    onSuccess: () => { toast.success("Pasal diperbarui"); qc.invalidateQueries({ queryKey: ["kontrak-templates"] }); setEditingId(null); },
    onError: () => toast.error("Gagal"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => kontrakTemplateApi.deletePasal(template.id, id),
    onSuccess: () => { toast.success("Pasal dihapus"); qc.invalidateQueries({ queryKey: ["kontrak-templates"] }); setDeleteTarget(null); },
    onError: () => toast.error("Gagal"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pasal-pasal ({template.pasals.length})</p>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Pasal
        </Button>
      </div>

      {template.pasals.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-4 text-center">Belum ada pasal.</p>
      )}

      {template.pasals.map((p, idx) => (
        <div key={p.id} className="border rounded-lg overflow-hidden">
          {editingId === p.id ? (
            <div className="p-4 space-y-3 bg-slate-50">
              <div className="space-y-1.5">
                <Label>Judul Pasal {idx + 1} <span className="text-xs text-muted-foreground">(tampil HURUF BESAR di PDF)</span></Label>
                <Input value={editJudul} onChange={(e) => setEditJudul(e.target.value)} placeholder="Contoh: RUANG LINGKUP PEKERJAAN" />
              </div>
              <div className="space-y-1.5">
                <Label>Isi Pasal</Label>
                <Textarea rows={8} value={editIsi} onChange={(e) => setEditIsi(e.target.value)} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">Gunakan 1. 2. a. b. untuk penomoran, Enter untuk baris baru.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateMut.mutate(p.id)} disabled={updateMut.isPending}>Simpan</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Batal</Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Pasal {idx + 1}{p.judul_pasal ? ` — ${p.judul_pasal}` : ""}</p>
                {p.isi_pasal && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{p.isi_pasal}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(p.id); setEditJudul(p.judul_pasal ?? ""); setEditIsi(p.isi_pasal ?? ""); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tambah Pasal — {template.judul}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Judul Pasal <span className="text-xs text-muted-foreground">(opsional, tampil huruf besar)</span></Label>
              <Input placeholder="Contoh: RUANG LINGKUP PEKERJAAN, NILAI ADDENDUM..." value={newJudul} onChange={(e) => setNewJudul(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Isi Pasal</Label>
              <Textarea rows={10} placeholder="Ketik isi pasal di sini..." value={newIsi} onChange={(e) => setNewIsi(e.target.value)} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Tip: 1., 2., a., b. untuk penomoran. Enter untuk baris baru.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending}>{addMut.isPending ? "Menyimpan..." : "Tambah Pasal"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Pasal?</AlertDialogTitle></AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">Pasal ini akan dihapus permanen dari template.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateDetailPanel({ template, onEdit, onDelete }: {
  template: KontrakTemplate; onEdit: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const publishMut = useMutation({
    mutationFn: () => kontrakTemplateApi.publish(template.id),
    onSuccess: () => { toast.success(template.status === "aktif" ? "Dikembalikan ke draft" : "Template dipublish"); qc.invalidateQueries({ queryKey: ["kontrak-templates"] }); },
    onError: () => toast.error("Gagal"),
  });

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 bg-white">
        <BookOpen className="h-5 w-5 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{template.judul}</p>
          <p className="text-xs text-muted-foreground">{template.pasals.length} pasal · {fmtDateShort(template.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge(template.status)}
          <Button size="sm" variant="outline" onClick={() => publishMut.mutate()} disabled={publishMut.isPending}>
            {template.status === "aktif" ? "Jadikan Draft" : "Publish"}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t p-4 bg-slate-50 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Pihak Pertama</p>
            <pre className="whitespace-pre-wrap text-sm font-sans bg-white border rounded p-2">{template.pihak_satu || "-"}</pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Kalimat Pembuka</p>
            <pre className="whitespace-pre-wrap text-sm font-sans bg-white border rounded p-2 text-slate-600">{template.pembuka || DEFAULT_PEMBUKA}</pre>
          </div>
          {template.pihak_dua && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Keterangan Tambahan Pihak Kedua</p>
              <pre className="whitespace-pre-wrap text-sm font-sans bg-white border rounded p-2">{template.pihak_dua}</pre>
            </div>
          )}
          <PasalEditor template={template} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: DAFTAR KONTRAK
// ═══════════════════════════════════════════════════════════════════════════════

function CreateKontrakDialog({ open, onOpenChange, templates, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  templates: KontrakTemplate[]; onSaved: () => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadId, setLeadId] = useState<string>("");
  const [leadOptions, setLeadOptions] = useState<{ id: number; nama: string; jenis: string; nomor_telepon: string | null; alamat: string | null }[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showLeadHelper, setShowLeadHelper] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [jenisPekerjaan, setJenisPekerjaan] = useState("");
  const [nomorKontrak, setNomorKontrak] = useState("");
  // Pihak Kedua — diisi MANUAL (tidak wajib dari lead)
  const [namaClient, setNamaClient] = useState("");
  const [teleponClient, setTeleponClient] = useState("");
  const [alamatClient, setAlamatClient] = useState("");
  const qc = useQueryClient();

  async function searchLeads(q: string) {
    setLeadSearch(q);
    if (!q) { setLeadOptions([]); return; }
    setLoadingLeads(true);
    try {
      const res = await apiClient.get("/finance/leads-dropdown", { params: { search: q } });
      setLeadOptions(res.data?.items ?? []);
    } finally { setLoadingLeads(false); }
  }

  const selectedTemplate = templates.find((t) => String(t.id) === templateId);

  const create = useMutation({
    mutationFn: () => kontrakDokumenApi.create({
      template_id: Number(templateId),
      lead_id: leadId ? Number(leadId) : undefined,
      tanggal,
      jenis_pekerjaan: jenisPekerjaan || undefined,
      nama_client: namaClient || undefined,
      telepon_client: teleponClient || undefined,
      alamat_client: alamatClient || undefined,
      nomor_kontrak: nomorKontrak || undefined,
    }),
    onSuccess: () => {
      toast.success("Kontrak berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] });
      onSaved(); onOpenChange(false);
    },
    onError: () => toast.error("Gagal membuat kontrak"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Buat Kontrak dari Template</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Template Kontrak <span className="text-destructive">*</span></Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">-- Pilih template --</option>
              {templates.filter((t) => t.status === "aktif").map((t) => (
                <option key={t.id} value={String(t.id)}>{t.judul}</option>
              ))}
            </select>
            {selectedTemplate && <p className="text-xs text-muted-foreground">{selectedTemplate.pasals.length} pasal</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nomor Kontrak</Label>
              <Input placeholder="Kosongkan = auto (KTR/…)" value={nomorKontrak} onChange={(e) => setNomorKontrak(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Kontrak</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Jenis / Keterangan Pekerjaan</Label>
            <Input placeholder="Contoh: Tambahan Pekerjaan Renovasi Rumah..." value={jenisPekerjaan} onChange={(e) => setJenisPekerjaan(e.target.value)} />
          </div>

          {/* PIHAK KEDUA — manual */}
          <div className="border rounded-lg p-3 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Pihak Kedua (Klien)</Label>
              <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setShowLeadHelper((v) => !v)}>
                {showLeadHelper ? "Tutup" : "Isi dari data Lead"}
              </button>
            </div>
            {showLeadHelper && (
              <div className="relative">
                <Input placeholder="Cari nama klien dari telemarketing / sales admin..." value={leadSearch} onChange={(e) => searchLeads(e.target.value)} />
                {leadOptions.length > 0 && (
                  <div className="absolute z-50 bg-white border rounded-md shadow-md w-full mt-1 max-h-48 overflow-y-auto">
                    {leadOptions.map((l) => (
                      <button key={l.id} type="button" className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                        onClick={() => {
                          setLeadId(String(l.id));
                          setLeadSearch(l.nama);
                          setNamaClient(l.nama);
                          setTeleponClient(l.nomor_telepon ?? "");
                          setAlamatClient(l.alamat ?? "");
                          setLeadOptions([]);
                        }}>
                        <span className="font-medium">{l.nama}</span>
                        <span className="text-slate-400 text-xs ml-2">{l.jenis}</span>
                        {l.nomor_telepon && <span className="text-slate-400 text-xs ml-2">{l.nomor_telepon}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {loadingLeads && <p className="text-xs text-slate-400 mt-1">Mencari...</p>}
                <p className="text-xs text-muted-foreground mt-1">Memilih lead akan mengisi field di bawah — tetap bisa diubah manual.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Nama <span className="text-destructive">*</span></Label>
              <Input placeholder="Nama lengkap klien" value={namaClient} onChange={(e) => { setNamaClient(e.target.value); setLeadId(""); }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Telepon</Label>
                <Input placeholder="08xxxxxxxxxx" value={teleponClient} onChange={(e) => setTeleponClient(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alamat</Label>
                <Input placeholder="Alamat klien" value={alamatClient} onChange={(e) => setAlamatClient(e.target.value)} />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Lampiran & pasal tambahan bisa ditambahkan setelah kontrak dibuat.</p>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !templateId || !namaClient.trim()}>
            {create.isPending ? "Membuat..." : "Buat Kontrak"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Multi-lampiran manager ─────────────────────────────────────────────────────
function LampiranManager({ dokId, lampirans }: { dokId: number; lampirans: KontrakLampiran[] }) {
  const [newJudul, setNewJudul] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] }); qc.invalidateQueries({ queryKey: ["kontrak-dokumen-detail", dokId] }); };

  const addMut = useMutation({
    mutationFn: () => kontrakDokumenApi.addLampiran(dokId, newJudul),
    onSuccess: () => { toast.success("Lampiran ditambahkan"); inv(); setNewJudul(""); setAddOpen(false); },
    onError: () => toast.error("Gagal"),
  });
  const deleteMut = useMutation({
    mutationFn: (lampId: number) => kontrakDokumenApi.deleteLampiran(dokId, lampId),
    onSuccess: () => { toast.success("Lampiran dihapus"); inv(); },
    onError: () => toast.error("Gagal"),
  });
  const uploadMut = useMutation({
    mutationFn: ({ lampId, file }: { lampId: number; file: File }) => kontrakDokumenApi.uploadLampiranFile(dokId, lampId, file),
    onSuccess: () => { toast.success("File diupload"); inv(); },
    onError: () => toast.error("Gagal upload"),
  });
  const deleteFileMut = useMutation({
    mutationFn: (lampId: number) => kontrakDokumenApi.deleteLampiranFile(dokId, lampId),
    onSuccess: () => { toast.success("File dihapus"); inv(); },
    onError: () => toast.error("Gagal"),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase">Lampiran ({lampirans.length})</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Tambah Lampiran
        </Button>
      </div>

      {lampirans.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Belum ada lampiran.</p>
      )}

      {lampirans.map((l, idx) => (
        <div key={l.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white text-sm">
          <span className="text-muted-foreground text-xs shrink-0">{idx + 1}.</span>
          <span className="flex-1 font-medium truncate">{l.judul}</span>
          <div className="flex items-center gap-1 shrink-0">
            {l.file_url ? (
              <>
                <a href={`${BACKEND_URL}${l.file_url}`} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Lihat PDF">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" title="Hapus file (keep entry)"
                  onClick={() => deleteFileMut.mutate(l.id)} disabled={deleteFileMut.isPending}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <input ref={(el) => { fileInputRefs.current[l.id] = el; }} type="file" accept=".pdf,application/pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMut.mutate({ lampId: l.id, file: f }); e.target.value = ""; }} />
                <Button size="icon" variant="ghost" className="h-6 w-6" title="Upload PDF"
                  onClick={() => fileInputRefs.current[l.id]?.click()} disabled={uploadMut.isPending}>
                  <Upload className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" title="Hapus lampiran"
              onClick={() => deleteMut.mutate(l.id)} disabled={deleteMut.isPending}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Lampiran</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Judul Lampiran <span className="text-destructive">*</span></Label>
              <Input placeholder="Contoh: Rencana Anggaran Biaya, Gambar Teknis..." value={newJudul} onChange={(e) => setNewJudul(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newJudul.trim()) addMut.mutate(); }} />
              <p className="text-xs text-muted-foreground">File PDF bisa diupload setelah lampiran dibuat.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !newJudul.trim()}>
              {addMut.isPending ? "Menambahkan..." : "Tambah"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Kontrak detail dialog ──────────────────────────────────────────────────────
// ── Edit data dokumen (nomor/klien/tanggal/jenis) ──────────────────────────────
function EditKontrakDialog({ open, onOpenChange, dok }: {
  open: boolean; onOpenChange: (v: boolean) => void; dok: KontrakDokumen;
}) {
  const qc = useQueryClient();
  const [nomor, setNomor] = useState(dok.nomor_kontrak ?? "");
  const [jenis, setJenis] = useState(dok.jenis_pekerjaan ?? "");
  const [tanggal, setTanggal] = useState(dok.tanggal ? new Date(dok.tanggal).toISOString().slice(0, 10) : "");
  const [nama, setNama] = useState(dok.nama_client ?? "");
  const [telepon, setTelepon] = useState(dok.telepon_client ?? "");
  const [alamat, setAlamat] = useState(dok.alamat_client ?? "");

  const save = useMutation({
    mutationFn: () => kontrakDokumenApi.update(dok.id, {
      nomor_kontrak: nomor, jenis_pekerjaan: jenis, tanggal: tanggal || undefined,
      nama_client: nama, telepon_client: telepon, alamat_client: alamat,
    }),
    onSuccess: () => {
      toast.success("Kontrak diperbarui");
      qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] });
      qc.invalidateQueries({ queryKey: ["kontrak-dokumen-detail", dok.id] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal memperbarui"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Data Kontrak</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Nomor Kontrak</Label>
              <Input value={nomor} onChange={(e) => setNomor(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Jenis Pekerjaan</Label>
            <Input value={jenis} onChange={(e) => setJenis(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Nama Pihak Kedua</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Telepon</Label>
              <Input value={telepon} onChange={(e) => setTelepon(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Alamat</Label>
              <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Editor pasal EKSTRA khusus dokumen (di luar pasal template) ────────────────
function ExtraPasalEditor({ dok, locked = false }: { dok: KontrakDokumen; locked?: boolean }) {
  const qc = useQueryClient();
  const templateCount = dok.template?.pasals.length ?? 0;
  const extras = dok.extra_pasals ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [editing, setEditing] = useState<KontrakDokumenPasal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KontrakDokumenPasal | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] });
    qc.invalidateQueries({ queryKey: ["kontrak-dokumen-detail", dok.id] });
  };
  const addMut = useMutation({
    mutationFn: () => kontrakDokumenApi.addPasal(dok.id, { judul_pasal: judul || undefined, isi_pasal: isi || undefined }),
    onSuccess: () => { toast.success("Pasal ditambahkan"); invalidate(); setJudul(""); setIsi(""); setAddOpen(false); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const editMut = useMutation({
    mutationFn: () => kontrakDokumenApi.updatePasal(dok.id, editing!.id, { judul_pasal: editing!.judul_pasal ?? "", isi_pasal: editing!.isi_pasal ?? "" }),
    onSuccess: () => { toast.success("Pasal diperbarui"); invalidate(); setEditing(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const delMut = useMutation({
    mutationFn: (id: number) => kontrakDokumenApi.deletePasal(dok.id, id),
    onSuccess: () => { toast.success("Pasal dihapus"); invalidate(); setDeleteTarget(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase">Pasal Tambahan Khusus Kontrak Ini ({extras.length})</p>
        {!locked && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Pasal
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">Pasal ini melanjutkan penomoran setelah {templateCount} pasal dari template, dan hanya berlaku untuk kontrak ini.</p>
      {extras.length === 0 && <p className="text-xs text-muted-foreground italic py-2">Belum ada pasal tambahan.</p>}
      <div className="space-y-1.5">
        {extras.map((p, i) => (
          <div key={p.id} className="border rounded p-2 text-xs flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">Pasal {templateCount + i + 1}{p.judul_pasal ? ` — ${p.judul_pasal}` : ""}</p>
              <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3 mt-0.5">{p.isi_pasal ?? ""}</p>
            </div>
            {!locked && (
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(p)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tambah */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tambah Pasal Khusus</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">Judul Pasal (opsional, tampil HURUF BESAR)</Label>
              <Input value={judul} onChange={(e) => setJudul(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Isi Pasal</Label>
              <Textarea rows={8} value={isi} onChange={(e) => setIsi(e.target.value)} className="font-mono text-sm" placeholder="Ketik isi pasal..." /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending}>{addMut.isPending ? "Menyimpan..." : "Tambah"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Pasal</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 mt-2">
              <div className="space-y-1.5"><Label className="text-xs">Judul Pasal</Label>
                <Input value={editing.judul_pasal ?? ""} onChange={(e) => setEditing({ ...editing, judul_pasal: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Isi Pasal</Label>
                <Textarea rows={8} value={editing.isi_pasal ?? ""} onChange={(e) => setEditing({ ...editing, isi_pasal: e.target.value })} className="font-mono text-sm" /></div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={() => editMut.mutate()} disabled={editMut.isPending}>{editMut.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Pasal?</AlertDialogTitle></AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">Pasal tambahan ini akan dihapus permanen dari kontrak ini.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && delMut.mutate(deleteTarget.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KontrakDetailDialog({ open, onOpenChange, dok: initialDok }: {
  open: boolean; onOpenChange: (v: boolean) => void; dok: KontrakDokumen;
}) {
  const [sigTarget, setSigTarget] = useState<"ro" | "management" | "client" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const qc = useQueryClient();

  const { data: dok = initialDok } = useQuery({
    queryKey: ["kontrak-dokumen-detail", initialDok.id],
    queryFn: () => kontrakDokumenApi.get(initialDok.id),
    initialData: initialDok,
  });

  // Kontrak final (RO + Klien sudah TTD) → terkunci, tidak bisa diedit.
  const isLocked = !!dok.ro_signature && !!dok.client_signature;

  const signRo = useMutation({
    mutationFn: (sig: string) => kontrakDokumenApi.signRo(dok.id, dok.ro_name ?? "Relationship Officer", sig),
    onSuccess: () => { toast.success("Disimpan"); qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] }); qc.invalidateQueries({ queryKey: ["kontrak-dokumen-detail", dok.id] }); setSigTarget(null); },
    onError: () => toast.error("Gagal"),
  });
  const signManagement = useMutation({
    mutationFn: (sig: string) => kontrakDokumenApi.signManagement(dok.id, dok.management_name ?? "Management RUBAHRUMAH", sig),
    onSuccess: () => { toast.success("Disimpan"); qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] }); qc.invalidateQueries({ queryKey: ["kontrak-dokumen-detail", dok.id] }); setSigTarget(null); },
    onError: () => toast.error("Gagal"),
  });
  const signClient = useMutation({
    mutationFn: (sig: string) => kontrakDokumenApi.signClient(dok.id, dok.client_name ?? dok.nama_client ?? "", sig),
    onSuccess: () => { toast.success("Disimpan"); qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] }); qc.invalidateQueries({ queryKey: ["kontrak-dokumen-detail", dok.id] }); setSigTarget(null); },
    onError: () => toast.error("Gagal"),
  });

  const SigCard = ({ title, role, sig, name, date, onSign }: {
    title?: string; role: string; sig: string | null; name: string | null; date: string | null; onSign: () => void;
  }) => (
    <div className="border rounded-xl p-3 text-center space-y-1.5">
      {title && <p className="text-xs font-bold text-muted-foreground">{title}</p>}
      {sig ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sig} alt="ttd" className="h-10 object-contain mx-auto" />
          <p className="text-xs font-medium">{name}</p>
          <p className="text-xs text-green-600 flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {fmtDateShort(date)}
          </p>
        </>
      ) : (
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={onSign}>
          <PenLine className="h-3 w-3 mr-1" /> TTD {role}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  );

  const pasals = dok.template?.pasals ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {dok.template?.judul ?? "Kontrak"} — {dok.nomor_kontrak ?? "-"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Status */}
            <div className="flex items-center gap-3 flex-wrap">
              {statusBadge(dok.status)}
              <span className="text-sm text-muted-foreground">{fmtDateShort(dok.tanggal)}</span>
              {dok.jenis_pekerjaan && <span className="text-sm font-medium">{dok.jenis_pekerjaan}</span>}
              {isLocked ? (
                <Badge variant="outline" className="ml-auto text-amber-700 border-amber-300 bg-amber-50">
                  <Lock className="h-3 w-3 mr-1" /> Terkunci (TTD lengkap)
                </Badge>
              ) : (
                <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Data
                </Button>
              )}
            </div>

            {/* Pihak */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded-lg p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Pihak Pertama</p>
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700">{dok.template?.pihak_satu || "PT. Rubah Rumah Inovasi Pemuda"}</pre>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Pihak Kedua</p>
                <p className="text-xs"><span className="text-muted-foreground">Nama:</span> {dok.nama_client ?? "-"}</p>
                <p className="text-xs"><span className="text-muted-foreground">Telepon:</span> {dok.telepon_client ?? "-"}</p>
                <p className="text-xs"><span className="text-muted-foreground">Alamat:</span> {dok.alamat_client ?? "-"}</p>
              </div>
            </div>

            {/* Lampiran */}
            <LampiranManager dokId={dok.id} lampirans={dok.lampirans ?? []} />

            {/* Pasal dari template (read-only) */}
            {pasals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Pasal dari Template ({pasals.length})</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {pasals.map((p, i) => (
                    <div key={p.id} className="border rounded p-2 text-xs">
                      <p className="font-semibold">Pasal {i + 1}{p.judul_pasal ? ` — ${p.judul_pasal}` : ""}</p>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{p.isi_pasal ?? ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pasal tambahan khusus dokumen ini */}
            <ExtraPasalEditor dok={dok} locked={isLocked} />

            {/* Tanda tangan
                Layout: Kiri = RO (atas) + Management (bawah)   |   Kanan = Client
            */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Tanda Tangan</p>
              {/* Satu baris: Management | RO | Client */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-center text-muted-foreground">PIHAK PERTAMA</p>
                  <SigCard role="Management RUBAHRUMAH" sig={dok.management_signature} name={dok.management_name} date={dok.management_signed_at} onSign={() => setSigTarget("management")} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-center text-muted-foreground">&nbsp;</p>
                  <SigCard role="Relationship Officer" sig={dok.ro_signature} name={dok.ro_name} date={dok.ro_signed_at} onSign={() => setSigTarget("ro")} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-center text-muted-foreground">PIHAK KEDUA</p>
                  <SigCard role="Customer" sig={dok.client_signature} name={dok.client_name ?? dok.nama_client} date={dok.client_signed_at} onSign={() => setSigTarget("client")} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <Button variant="outline" size="sm" onClick={() => { printKontrak(dok.id, dok.lampirans ?? []); }}>
              <Printer className="h-4 w-4 mr-1" /> Cetak PDF
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SignatureDialog open={sigTarget === "ro"} onOpenChange={(v) => !v && setSigTarget(null)}
        title="Tanda Tangan — Relationship Officer" loading={signRo.isPending} onSave={(sig) => signRo.mutate(sig)} />
      <SignatureDialog open={sigTarget === "management"} onOpenChange={(v) => !v && setSigTarget(null)}
        title="Tanda Tangan — Management RUBAHRUMAH" loading={signManagement.isPending} onSave={(sig) => signManagement.mutate(sig)} />
      <SignatureDialog open={sigTarget === "client"} onOpenChange={(v) => !v && setSigTarget(null)}
        title="Tanda Tangan — Klien (Pihak Kedua)" loading={signClient.isPending} onSave={(sig) => signClient.mutate(sig)} />

      <EditKontrakDialog open={editOpen} onOpenChange={setEditOpen} dok={dok} />
    </>
  );
}

// ── Pengaturan Pihak Pertama (data perusahaan di kontrak) ──────────────────────
function CompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState({ nama: "", nib: "", alamat: "", telepon: "" });
  const { data } = useQuery({ queryKey: ["kontrak-company"], queryFn: () => kontrakDokumenApi.getCompany(), enabled: open });
  useEffect(() => {
    if (data) setForm({ nama: data.nama, nib: data.nib, alamat: data.alamat, telepon: data.telepon });
  }, [data]);
  const save = useMutation({
    mutationFn: () => kontrakDokumenApi.saveCompany(form),
    onSuccess: () => { toast.success("Data Pihak Pertama disimpan"); onOpenChange(false); },
    onError: () => toast.error("Gagal menyimpan"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Pengaturan Pihak Pertama</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">Data perusahaan ini dipakai di semua kontrak yang dicetak.</p>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5"><Label className="text-xs">Nama Perusahaan</Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">No. NIB</Label>
            <Input value={form.nib} onChange={(e) => setForm({ ...form, nib: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Alamat</Label>
            <Input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Telepon</Label>
            <Input value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AddendumKontrakPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  if (!isSuperAdmin()) {
    return <div className="p-10 text-center text-muted-foreground">Halaman Addendum Kontrak hanya dapat diakses oleh Super Admin.</div>;
  }
  return <AddendumKontrakInner />;
}

function AddendumKontrakInner() {
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<KontrakTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<KontrakTemplate | null>(null);
  const [createKontrakOpen, setCreateKontrakOpen] = useState(false);
  const [detailDok, setDetailDok] = useState<KontrakDokumen | null>(null);
  const [deleteDok, setDeleteDok] = useState<KontrakDokumen | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const qc = useQueryClient();

  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ["kontrak-templates"], queryFn: () => kontrakTemplateApi.list(),
  });
  const { data: dokumenData, isLoading: loadingDokumen } = useQuery({
    queryKey: ["kontrak-dokumen"], queryFn: () => kontrakDokumenApi.list(),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: (id: number) => kontrakTemplateApi.delete(id),
    onSuccess: () => { toast.success("Template dihapus"); qc.invalidateQueries({ queryKey: ["kontrak-templates"] }); setDeleteTemplate(null); },
    onError: () => toast.error("Gagal"),
  });
  const deleteDokMut = useMutation({
    mutationFn: (id: number) => kontrakDokumenApi.delete(id),
    onSuccess: () => { toast.success("Kontrak dihapus"); qc.invalidateQueries({ queryKey: ["kontrak-dokumen"] }); setDeleteDok(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menghapus kontrak"),
  });

  const templates = templatesData?.items ?? [];
  const dokumens = dokumenData?.items ?? [];
  const activeTemplates = templates.filter((t) => t.status === "aktif");

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kontrak</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Buat template kontrak dengan pasal-pasal, lalu generate kontrak untuk klien</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCompanyOpen(true)}>
          <Building2 className="h-4 w-4 mr-1.5" /> Pihak Pertama
        </Button>
      </div>

      {/* Tab: Daftar Kontrak (kiri) | Template Kontrak (kanan) */}
      <Tabs defaultValue="dokumen">
        <TabsList>
          <TabsTrigger value="dokumen">Daftar Kontrak ({dokumens.length})</TabsTrigger>
          <TabsTrigger value="template">Template Kontrak ({templates.length})</TabsTrigger>
        </TabsList>

        {/* ── Daftar Kontrak ── */}
        <TabsContent value="dokumen" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            {activeTemplates.length === 0 && (
              <p className="text-xs text-amber-600">Publish minimal satu template terlebih dahulu.</p>
            )}
            <div className="ml-auto">
              <Button onClick={() => setCreateKontrakOpen(true)} disabled={activeTemplates.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Buat Kontrak
              </Button>
            </div>
          </div>
          <div className="rounded-xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Kontrak</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Lampiran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDokumen ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Memuat...</TableCell></TableRow>
                ) : dokumens.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Belum ada kontrak</TableCell></TableRow>
                ) : dokumens.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">{d.nomor_kontrak ?? "-"}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-sm">{d.template?.judul ?? "-"}</TableCell>
                    <TableCell>{d.nama_client ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.telepon_client ?? "-"}</TableCell>
                    <TableCell className="text-sm">{fmtDateShort(d.tanggal)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.lampirans?.length ?? 0} file</TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setDetailDok(d)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteDok(d)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Template Kontrak ── */}
        <TabsContent value="template" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Buat template → isi pihak, pembuka & pasal-pasal → Publish → siap digunakan</p>
            <Button onClick={() => { setEditTemplate(null); setTemplateFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Template Baru
            </Button>
          </div>
          {loadingTemplates ? (
            <p className="text-sm text-muted-foreground text-center py-12">Memuat...</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border rounded-xl bg-white">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada template kontrak</p>
              <Button className="mt-4" onClick={() => setTemplateFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> Buat Template</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <TemplateDetailPanel key={t.id} template={t}
                  onEdit={() => { setEditTemplate(t); setTemplateFormOpen(true); }}
                  onDelete={() => setDeleteTemplate(t)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {templateFormOpen && (
        <TemplateFormDialog open={templateFormOpen} onOpenChange={setTemplateFormOpen}
          initial={editTemplate} onSaved={() => setEditTemplate(null)} />
      )}
      {createKontrakOpen && (
        <CreateKontrakDialog open={createKontrakOpen} onOpenChange={setCreateKontrakOpen}
          templates={templates} onSaved={() => {}} />
      )}
      {detailDok && (
        <KontrakDetailDialog open={!!detailDok} onOpenChange={(v) => !v && setDetailDok(null)} dok={detailDok} />
      )}

      <AlertDialog open={!!deleteTemplate} onOpenChange={(v) => !v && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Template?</AlertDialogTitle></AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">Template <b>{deleteTemplate?.judul}</b> dan semua pasalnya dihapus permanen.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTemplate && deleteTemplateMut.mutate(deleteTemplate.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDok} onOpenChange={(v) => !v && setDeleteDok(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Kontrak?</AlertDialogTitle></AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">Kontrak <b>{deleteDok?.nomor_kontrak}</b> dihapus permanen.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDok && deleteDokMut.mutate(deleteDok.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CompanyDialog open={companyOpen} onOpenChange={setCompanyOpen} />
    </div>
  );
}
