"use client";

import React, { useState, useEffect } from "react";
import { getLogoBase64 } from "@/lib/get-logo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SignatureDialog } from "@/components/signature-dialog";
import {
  Plus, FileText, Receipt, CheckCircle2, ChevronDown, ChevronRight,
  Download, PenLine, AlertCircle, Upload, Trash2,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// ── API ───────────────────────────────────────────────────────────────────────
const api = {
  leads: (search?: string) =>
    apiClient.get("/finance/leads-dropdown", { params: search ? { search } : {} }).then(r => r.data),
  list: (params?: any) => apiClient.get("/finance/invoices", { params }).then(r => r.data),
  create: (data: any) => apiClient.post("/finance/invoices", data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/finance/invoices/${id}`).then(r => r.data),
  signHead: (id: number, signature_data: string) =>
    apiClient.post(`/finance/invoices/${id}/sign-head`, { signature_data }).then(r => r.data),
  signAdmin: (id: number, signature_data: string) =>
    apiClient.post(`/finance/invoices/${id}/sign-admin`, { signature_data }).then(r => r.data),
  markPaid: (id: number, data: any) =>
    apiClient.post(`/finance/invoices/${id}/mark-paid`, data).then(r => r.data),
  getKwitansi: (id: number) =>
    apiClient.get(`/finance/invoices/${id}/kwitansi`).then(r => r.data),
};

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { variant: any; label: string }> = {
  Draft:  { variant: "secondary", label: "Draft" },
  Terbit: { variant: "default",   label: "Terbit" },
  Lunas:  { variant: "outline",   label: "Lunas" },
  Batal:  { variant: "destructive", label: "Batal" },
};

const METODE_OPTIONS = ["Transfer Bank", "Tunai", "QRIS", "Cek / Giro"];

function generateNomor(jenis: string | null, tgl: string) {
  const d = new Date(tgl || Date.now());
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const suffix = `${dd}/${mm}/${yyyy}`;
  if (jenis === "Sipil")    return `RR-SP-${suffix}`;
  if (jenis === "Desain")   return `RR-DS-${suffix}`;
  if (jenis === "Interior") return `RR-INT-${suffix}`;
  return "";
}

function formatRp(val: number | string) {
  return "Rp " + (Number(val) || 0).toLocaleString("id-ID");
}

const today = new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  lead_id: "",
  nomor_invoice: "",
  tanggal: today,
  ppn_percentage: 0,
  catatan: "",
  items: [{ keterangan: "", jumlah: 1, harga_satuan: 0 }],
};

// ── Invoice Items Form ────────────────────────────────────────────────────────
function InvoiceItemsForm({ items, setItems }: { items: any[]; setItems: (v: any[]) => void }) {
  const subtotal = items.reduce((s, i) => s + (i.jumlah || 0) * (i.harga_satuan || 0), 0);
  const upd = (idx: number, key: string, val: any) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_130px_32px] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>Keterangan</span><span>Qty</span><span>Harga Satuan</span><span />
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_80px_130px_32px] gap-2">
          <Input placeholder="Uraian pekerjaan / barang" value={item.keterangan}
            onChange={e => upd(idx, "keterangan", e.target.value)} />
          <Input type="number" min={1} value={item.jumlah}
            onChange={e => upd(idx, "jumlah", Number(e.target.value))} />
          <Input type="number" min={0} value={item.harga_satuan}
            onChange={e => upd(idx, "harga_satuan", Number(e.target.value))} />
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive"
            disabled={items.length === 1}
            onClick={() => setItems(items.filter((_, i) => i !== idx))}>×</Button>
        </div>
      ))}
      <Button variant="outline" size="sm"
        onClick={() => setItems([...items, { keterangan: "", jumlah: 1, harga_satuan: 0 }])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Item
      </Button>
      <div className="flex justify-end pt-2 border-t">
        <span className="font-semibold">Subtotal: {formatRp(subtotal)}</span>
      </div>
    </div>
  );
}

// ── Signature Badge ───────────────────────────────────────────────────────────
function SignBadge({ signed, name, at }: { signed: boolean; name?: string; at?: string }) {
  if (signed) return (
    <div className="flex items-center gap-1 text-xs text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span className="font-medium">{name}</span>
      <span className="text-muted-foreground">· {at ? new Date(at).toLocaleDateString("id-ID") : ""}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 text-xs text-amber-600">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>Belum ditandatangani</span>
    </div>
  );
}

// ── Kwitansi Detail ───────────────────────────────────────────────────────────
function KwitansiSection({ inv, onRequestDownload }: { inv: any; onRequestDownload: (kwitansi: any, inv: any) => void }) {
  const { data: kwitansi, isLoading } = useQuery({
    queryKey: ["kwitansi", inv.id],
    queryFn: () => api.getKwitansi(inv.id),
    enabled: inv.status === "Lunas",
    retry: false,
  });

  if (inv.status !== "Lunas") return (
    <p className="text-sm text-muted-foreground italic">Kwitansi diterbitkan otomatis setelah invoice ditandai Lunas.</p>
  );
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!kwitansi) return <p className="text-sm text-muted-foreground">Kwitansi belum tersedia.</p>;

  const metodeLabel = kwitansi.detail_bayar
    ? `${kwitansi.metode_bayar} — ${kwitansi.detail_bayar}`
    : kwitansi.metode_bayar;

  return (
    <div className="border rounded-md p-4 bg-orange-50 space-y-3">
      <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
        <Receipt className="h-4 w-4" />
        <span>Kwitansi #{kwitansi.nomor_kwitansi}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Tanggal Lunas</span>
        <span>{kwitansi.tanggal_lunas ? new Date(kwitansi.tanggal_lunas).toLocaleDateString("id-ID") : "—"}</span>
        <span className="text-muted-foreground">Jumlah</span>
        <span className="font-medium">{formatRp(kwitansi.jumlah)}</span>
        <span className="text-muted-foreground">Metode Bayar</span>
        <span>{metodeLabel || "—"}</span>
      </div>
      <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100"
        onClick={() => onRequestDownload(kwitansi, inv)}>
        <Download className="h-3.5 w-3.5 mr-1" /> Cetak Kwitansi PDF
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoiceKwitansiPage() {
  const qc = useQueryClient();

  // Form state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  // Table state
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  // Signature dialog state
  const [signTarget, setSignTarget] = useState<{ id: number; type: "head" | "admin" } | null>(null);

  // Mark paid dialog state
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);
  const [metode, setMetode] = useState("Transfer Bank");
  const [detailBayar, setDetailBayar] = useState("");

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Bukti bayar dialog state
  const [buktiBayarTarget, setBuktiBayarTarget] = useState<{ kwitansi: any; inv: any } | null>(null);
  const [buktiBayarBase64, setBuktiBayarBase64] = useState<string | null>(null);

  // Leads for dropdown
  const { data: leadsData } = useQuery({
    queryKey: ["leads-dropdown", leadSearch],
    queryFn: () => api.leads(leadSearch),
    enabled: open,
  });
  const leads: any[] = leadsData?.items ?? [];

  // Invoice list
  const { data, isLoading } = useQuery({
    queryKey: ["invoices", filterStatus],
    queryFn: () => api.list(filterStatus ? { status: filterStatus } : {}),
    retry: false,
  });
  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];

  // Auto-generate nomor invoice when lead or tanggal changes
  useEffect(() => {
    if (!form.lead_id) return;
    const lead = leads.find((l: any) => String(l.id) === String(form.lead_id));
    if (!lead) return;
    const generated = generateNomor(lead.jenis, form.tanggal);
    if (generated && !form._nomorManual) {
      setForm((f: any) => ({ ...f, nomor_invoice: generated }));
    }
  }, [form.lead_id, form.tanggal, leads]);

  // Mutations
  const createMut = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      toast.success("Invoice berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal membuat invoice"),
  });

  const signMut = useMutation({
    mutationFn: ({ id, type, sig }: { id: number; type: "head" | "admin"; sig: string }) =>
      type === "head" ? api.signHead(id, sig) : api.signAdmin(id, sig),
    onSuccess: (data) => {
      toast.success(data.message || "Tanda tangan disimpan");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setSignTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan tanda tangan"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(id),
    onSuccess: () => {
      toast.success("Invoice dan kwitansi berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setConfirmDeleteId(null);
      setExpandedId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menghapus invoice"),
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id, metode_bayar, detail_bayar }: any) =>
      api.markPaid(id, { metode_bayar, detail_bayar }),
    onSuccess: () => {
      toast.success("Invoice ditandai Lunas — kwitansi diterbitkan");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["kwitansi", markPaidId] });
      setMarkPaidId(null);
      setDetailBayar("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal update status"),
  });

  function handleSelectLead(lead: any) {
    setForm((f: any) => ({ ...f, lead_id: String(lead.id), _nomorManual: false }));
    setLeadSearch(lead.nama);
    setShowLeadDropdown(false);
  }

  async function handleDownloadPDF(inv: any) {
    try {
      const logoUrl = await getLogoBase64();
      const { InvoicePDF } = await import("@/components/invoice-pdf");
      const blob = await pdf(
        <InvoicePDF
          nomor_invoice={inv.nomor_invoice}
          tanggal={inv.tanggal}
          klien={inv.klien}
          alamat_klien={inv.lead?.alamat}
          telepon_klien={inv.lead?.nomor_telepon}
          lead_jenis={inv.lead?.jenis}
          items={inv.items || []}
          subtotal={inv.subtotal || inv.total}
          ppn_percentage={inv.ppn_percentage || 0}
          ppn_amount={inv.ppn_amount || 0}
          grand_total={inv.total}
          catatan={inv.catatan}
          logoUrl={logoUrl}
          head_finance={inv.head_finance ? {
            name: inv.head_finance.name,
            at: inv.head_finance_at,
            signature: inv.head_finance_signature,
          } : null}
          admin_finance={inv.admin_finance ? {
            name: inv.admin_finance.name,
            at: inv.admin_finance_at,
            signature: inv.admin_finance_signature,
          } : null}
        />
      ).toBlob();
      saveAs(blob, `invoice-${inv.nomor_invoice?.replace(/\//g, "-")}.pdf`);
    } catch {
      toast.error("Gagal generate PDF Invoice");
    }
  }

  async function handleDownloadKwitansi(kwitansi: any, inv: any, buktiBayar?: string | null) {
    try {
      const logoUrl = await getLogoBase64();
      const { KwitansiPDF } = await import("@/components/kwitansi-pdf");
      const blob = await pdf(
        <KwitansiPDF
          nomor_kwitansi={kwitansi.nomor_kwitansi}
          nomor_invoice={inv.nomor_invoice}
          tanggal_lunas={kwitansi.tanggal_lunas}
          klien={inv.klien}
          alamat_klien={kwitansi.alamat_klien || inv.lead?.alamat}
          telepon_klien={kwitansi.telepon_klien || inv.lead?.nomor_telepon}
          lead_jenis={inv.lead?.jenis}
          jumlah={kwitansi.jumlah}
          metode_bayar={kwitansi.metode_bayar}
          detail_bayar={kwitansi.detail_bayar}
          logoUrl={logoUrl}
          items={kwitansi.items && kwitansi.items.length > 0 ? kwitansi.items : (inv.items || [])}
          buktiBayar={buktiBayar}
        />
      ).toBlob();
      saveAs(blob, `kwitansi-${kwitansi.nomor_kwitansi?.replace(/\//g, "-")}.pdf`);
    } catch {
      toast.error("Gagal generate PDF Kwitansi");
    }
  }

  function handleBuktiBayarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBuktiBayarBase64(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function confirmDownloadKwitansi() {
    if (!buktiBayarTarget || !buktiBayarBase64) return;
    await handleDownloadKwitansi(buktiBayarTarget.kwitansi, buktiBayarTarget.inv, buktiBayarBase64);
    setBuktiBayarTarget(null);
    setBuktiBayarBase64(null);
  }

  const needsDetailBayar = metode === "Transfer Bank" || metode === "QRIS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-red-500" /> Invoice & Kwitansi
          </h1>
          <p className="text-muted-foreground text-sm">Buat invoice, tanda tangani, cetak PDF, dan terbitkan kwitansi</p>
        </div>
        <div className="flex gap-2 items-center">
          <select className="border rounded-md px-3 py-2 text-sm" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="Draft">Draft</option>
            <option value="Terbit">Terbit</option>
            <option value="Lunas">Lunas</option>
            <option value="Batal">Batal</option>
          </select>
          <Button onClick={() => { setForm(EMPTY_FORM); setLeadSearch(""); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Buat Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>No. Invoice</TableHead>
                <TableHead>Klien</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanda Tangan</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : items.map((inv: any) => (
                    <React.Fragment key={inv.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                      >
                        <TableCell>
                          {expandedId === inv.id
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{inv.nomor_invoice}</TableCell>
                        <TableCell>{inv.klien || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.lead?.jenis || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {inv.tanggal ? new Date(inv.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatRp(inv.total)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[inv.status]?.variant ?? "secondary"}>
                            {STATUS_BADGE[inv.status]?.label ?? inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          {(inv.status === "Draft" || inv.status === "Terbit") && (
                            <div className="flex flex-col gap-1">
                              {!inv.head_finance ? (
                                <Button size="sm" variant="outline" className="h-6 text-xs"
                                  onClick={() => setSignTarget({ id: inv.id, type: "head" })}>
                                  <PenLine className="h-3 w-3 mr-1" /> Head Finance
                                </Button>
                              ) : (
                                <button className="text-xs text-green-600 flex items-center gap-1 hover:underline"
                                  onClick={() => setSignTarget({ id: inv.id, type: "head" })}>
                                  <CheckCircle2 className="h-3 w-3" /> Head Finance
                                </button>
                              )}
                              {!inv.admin_finance ? (
                                <Button size="sm" variant="outline" className="h-6 text-xs"
                                  onClick={() => setSignTarget({ id: inv.id, type: "admin" })}>
                                  <PenLine className="h-3 w-3 mr-1" /> Admin Finance
                                </Button>
                              ) : (
                                <button className="text-xs text-green-600 flex items-center gap-1 hover:underline"
                                  onClick={() => setSignTarget({ id: inv.id, type: "admin" })}>
                                  <CheckCircle2 className="h-3 w-3" /> Admin Finance
                                </button>
                              )}
                            </div>
                          )}
                          {inv.status === "Lunas" && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Receipt className="h-3.5 w-3.5" /> Lunas
                            </span>
                          )}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            {inv.status === "Terbit" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => handleDownloadPDF(inv)}>
                                  <Download className="h-3 w-3 mr-1" /> PDF Invoice
                                </Button>
                                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                  onClick={() => { setMarkPaidId(inv.id); setMetode("Transfer Bank"); setDetailBayar(""); }}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Tandai Lunas
                                </Button>
                              </>
                            )}
                            {inv.status === "Lunas" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => handleDownloadPDF(inv)}>
                                <Download className="h-3 w-3 mr-1" /> PDF Invoice
                              </Button>
                            )}
                            {inv.status !== "Lunas" && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setConfirmDeleteId(inv.id)}>
                                <Trash2 className="h-3 w-3 mr-1" /> Hapus
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {expandedId === inv.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/20 px-8 py-4">
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* Invoice Detail */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-1">
                                  <FileText className="h-4 w-4" /> Detail Invoice
                                </h4>
                                {inv.catatan && (
                                  <p className="text-sm text-muted-foreground italic">{inv.catatan}</p>
                                )}
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Keterangan</TableHead>
                                      <TableHead className="text-right">Qty</TableHead>
                                      <TableHead className="text-right">Harga</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(inv.items || []).map((item: any, i: number) => (
                                      <TableRow key={i}>
                                        <TableCell className="text-sm">{item.keterangan}</TableCell>
                                        <TableCell className="text-right text-sm">{item.jumlah}</TableCell>
                                        <TableCell className="text-right text-sm">{formatRp(item.harga_satuan)}</TableCell>
                                        <TableCell className="text-right text-sm font-medium">{formatRp(item.jumlah * item.harga_satuan)}</TableCell>
                                      </TableRow>
                                    ))}
                                    {inv.ppn_percentage > 0 && (
                                      <TableRow>
                                        <TableCell colSpan={3} className="text-right text-sm text-muted-foreground">PPN {inv.ppn_percentage}%</TableCell>
                                        <TableCell className="text-right text-sm">{formatRp(inv.ppn_amount || 0)}</TableCell>
                                      </TableRow>
                                    )}
                                    <TableRow>
                                      <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                                      <TableCell className="text-right font-bold">{formatRp(inv.total)}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                                {/* Signature status */}
                                <div className="space-y-1 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground font-medium mb-1">Status Tanda Tangan</p>
                                  <SignBadge
                                    signed={!!inv.head_finance}
                                    name={inv.head_finance?.name}
                                    at={inv.head_finance_at}
                                  />
                                  <div className="text-xs text-muted-foreground">Head Finance</div>
                                  <SignBadge
                                    signed={!!inv.admin_finance}
                                    name={inv.admin_finance?.name}
                                    at={inv.admin_finance_at}
                                  />
                                  <div className="text-xs text-muted-foreground">Admin Finance</div>
                                </div>
                              </div>
                              {/* Kwitansi */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm flex items-center gap-1">
                                  <Receipt className="h-4 w-4" /> Kwitansi
                                </h4>
                                <KwitansiSection inv={inv} onRequestDownload={(kwitansi, inv) => {
                                  setBuktiBayarBase64(null);
                                  setBuktiBayarTarget({ kwitansi, inv });
                                }} />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
              }
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <FileText className="mx-auto h-10 w-10 opacity-20 mb-3" />
                    <p>Belum ada invoice</p>
                    <p className="text-xs mt-1">Klik "Buat Invoice" untuk memulai</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Buat Invoice Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Lead Picker */}
            <div className="relative">
              <Label>Klien (dari data Leads) *</Label>
              <Input
                placeholder="Cari nama klien..."
                value={leadSearch}
                onChange={e => { setLeadSearch(e.target.value); setShowLeadDropdown(true); }}
                onFocus={() => setShowLeadDropdown(true)}
                autoComplete="off"
              />
              {showLeadDropdown && leads.length > 0 && (
                <div className="absolute z-50 w-full bg-white border rounded-md shadow-md max-h-48 overflow-y-auto mt-1">
                  {leads.map((l: any) => (
                    <button key={l.id} type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between"
                      onClick={() => handleSelectLead(l)}>
                      <span>{l.nama}</span>
                      <span className="text-muted-foreground text-xs">{l.jenis || "—"}</span>
                    </button>
                  ))}
                </div>
              )}
              {showLeadDropdown && leadSearch && leads.length === 0 && (
                <div className="absolute z-50 w-full bg-white border rounded-md shadow-md mt-1 px-3 py-2 text-sm text-muted-foreground">
                  Tidak ada lead ditemukan
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nomor Invoice</Label>
                <Input
                  placeholder="Auto-generate atau isi manual"
                  value={form.nomor_invoice}
                  onChange={e => setForm({ ...form, nomor_invoice: e.target.value, _nomorManual: true })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: RR-SP/RR-DS/RR-INT berdasarkan jenis lead, atau isi manual
                </p>
              </div>
              <div>
                <Label>Tanggal *</Label>
                <Input type="date" value={form.tanggal}
                  onChange={e => setForm({ ...form, tanggal: e.target.value, _nomorManual: false })} />
              </div>
            </div>

            <div>
              <Label>PPN (%)</Label>
              <Input type="number" min={0} max={100} value={form.ppn_percentage}
                onChange={e => setForm({ ...form, ppn_percentage: Number(e.target.value) })} />
            </div>

            <div>
              <Label>Catatan</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Catatan tambahan (opsional)"
                value={form.catatan}
                onChange={e => setForm({ ...form, catatan: e.target.value })}
              />
            </div>

            <div>
              <Label className="mb-2 block">Item Invoice</Label>
              <InvoiceItemsForm items={form.items} setItems={items => setForm({ ...form, items })} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button
                disabled={!form.lead_id || !form.nomor_invoice || createMut.isPending}
                onClick={() => createMut.mutate({
                  lead_id: form.lead_id,
                  nomor_invoice: form.nomor_invoice,
                  tanggal: form.tanggal,
                  ppn_percentage: form.ppn_percentage,
                  catatan: form.catatan,
                  items: form.items,
                })}
              >
                {createMut.isPending ? "Menyimpan..." : "Buat Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <SignatureDialog
        open={!!signTarget}
        onOpenChange={v => { if (!v) setSignTarget(null); }}
        title={signTarget?.type === "head" ? "Tanda Tangan Head Finance" : "Tanda Tangan Admin Finance"}
        loading={signMut.isPending}
        onSave={sig => {
          if (!signTarget) return;
          signMut.mutate({ id: signTarget.id, type: signTarget.type, sig });
        }}
      />

      {/* Bukti Bayar Dialog */}
      <Dialog open={!!buktiBayarTarget} onOpenChange={v => { if (!v) { setBuktiBayarTarget(null); setBuktiBayarBase64(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-500" /> Upload Bukti Pembayaran
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Upload foto / screenshot bukti transfer atau struk pembayaran. Gambar ini akan dilampirkan di halaman kedua kwitansi PDF.
          </p>
          <div className="space-y-4">
            <label className="block border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-orange-400 transition-colors">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Klik untuk pilih gambar bukti bayar (PNG / JPG)</p>
              <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden"
                onChange={handleBuktiBayarFile} />
            </label>
            {buktiBayarBase64 && (
              <div className="border rounded-md p-3 bg-orange-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={buktiBayarBase64} alt="preview bukti bayar"
                  className="max-h-48 mx-auto object-contain rounded" />
                <p className="text-xs text-center text-muted-foreground mt-2">Preview bukti bayar</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setBuktiBayarTarget(null); setBuktiBayarBase64(null); }}>Batal</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                disabled={!buktiBayarBase64}
                onClick={confirmDownloadKwitansi}>
                <Download className="h-4 w-4 mr-1" /> Download Kwitansi PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={v => { if (!v) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Invoice & Kwitansi?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">
            Invoice beserta kwitansi terkait akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={deleteMut.isPending}
              onClick={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}>
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Paid Dialog */}
      <Dialog open={!!markPaidId} onOpenChange={v => { if (!v) { setMarkPaidId(null); setDetailBayar(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Tandai Lunas
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Kwitansi akan diterbitkan otomatis setelah konfirmasi.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Metode Pembayaran</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={metode} onChange={e => { setMetode(e.target.value); setDetailBayar(""); }}>
                {METODE_OPTIONS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            {needsDetailBayar && (
              <div>
                <Label>
                  {metode === "Transfer Bank" ? "Nama Bank" : "Nama E-Wallet / QRIS"}
                </Label>
                <Input
                  placeholder={metode === "Transfer Bank" ? "cth: BCA, Mandiri, BNI" : "cth: GoPay, OVO, Dana"}
                  value={detailBayar}
                  onChange={e => setDetailBayar(e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setMarkPaidId(null); setDetailBayar(""); }}>Batal</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={markPaidMut.isPending || (needsDetailBayar && !detailBayar)}
                onClick={() => markPaidId && markPaidMut.mutate({
                  id: markPaidId,
                  metode_bayar: metode,
                  detail_bayar: detailBayar || undefined,
                })}
              >
                {markPaidMut.isPending ? "Memproses..." : "Konfirmasi Lunas"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
