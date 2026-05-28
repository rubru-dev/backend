"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: number;
  invoice_number: string | null;
  nama_client: string;
  tanggal: string | null;
  status: string | null;
  total_tagihan: number;
  total_terbayar: number;
  outstanding: number;
  deadline: string | null;
  catatan: string | null;
};

type FormState = {
  nama_client: string;
  invoice_number: string;
  tanggal: string;
  status: string;
  total_tagihan: string;
  total_terbayar: string;
  deadline: string;
  catatan: string;
};

const EMPTY_FORM: FormState = {
  nama_client: "",
  invoice_number: "",
  tanggal: "",
  status: "Belum Dibayar",
  total_tagihan: "",
  total_terbayar: "",
  deadline: "",
  catatan: "",
};

const IDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

function inMonth(dateStr: string | null | undefined, filterBulan: string) {
  if (!filterBulan) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const [y, m] = filterBulan.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

function toPayload(form: FormState) {
  return {
    nama_client: form.nama_client.trim(),
    invoice_number: form.invoice_number.trim() || null,
    tanggal: form.tanggal || null,
    status: form.status || "Belum Dibayar",
    total_tagihan: Number(form.total_tagihan || 0),
    total_terbayar: Number(form.total_terbayar || 0),
    deadline: form.deadline || null,
    catatan: form.catatan.trim() || null,
  };
}

function fromRow(row: Row): FormState {
  return {
    nama_client: row.nama_client,
    invoice_number: row.invoice_number ?? "",
    tanggal: row.tanggal ?? "",
    status: row.status ?? "Belum Dibayar",
    total_tagihan: String(row.total_tagihan ?? 0),
    total_terbayar: String(row.total_terbayar ?? 0),
    deadline: row.deadline ?? "",
    catatan: row.catatan ?? "",
  };
}

export default function GoldenArPage() {
  const qc = useQueryClient();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [search, setSearch] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["golden-ar-tagihan"],
    queryFn: () => apiClient.get("/golden/ar-tagihan").then((r) => r.data),
  });

  const saveMut = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) =>
      editRow
        ? apiClient.patch(`/golden/ar-tagihan/${editRow.id}`, payload).then((r) => r.data)
        : apiClient.post("/golden/ar-tagihan", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success(editRow ? "AR Golden diupdate" : "AR Golden ditambahkan");
      qc.invalidateQueries({ queryKey: ["golden-ar-tagihan"] });
      setDialogOpen(false);
      setEditRow(null);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan AR Golden"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/golden/ar-tagihan/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("AR Golden dihapus");
      qc.invalidateQueries({ queryKey: ["golden-ar-tagihan"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menghapus AR Golden"),
  });

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.toLowerCase();
    return (!q || r.nama_client.toLowerCase().includes(q) || (r.invoice_number ?? "").toLowerCase().includes(q)) && inMonth(r.tanggal, filterBulan);
  }), [rows, search, filterBulan]);

  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    tagihan: acc.tagihan + r.total_tagihan,
    terbayar: acc.terbayar + r.total_terbayar,
    outstanding: acc.outstanding + r.outstanding,
  }), { tagihan: 0, terbayar: 0, outstanding: 0 }), [filtered]);

  function openCreate() {
    setEditRow(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(row: Row) {
    setEditRow(row);
    setForm(fromRow(row));
    setDialogOpen(true);
  }

  function printPdf() {
    window.print();
  }

  function handleSubmit() {
    const payload = toPayload(form);
    if (!payload.nama_client) {
      toast.error("Nama client wajib diisi");
      return;
    }
    saveMut.mutate(payload);
  }

  return (
    <div className="space-y-5 p-6">
      <style jsx global>{`
        @media print {
          aside, header, .print-hidden { display: none !important; }
          body { background: #fff !important; }
          .print-page { padding: 0 !important; }
        }
      `}</style>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print-page">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-amber-500" /> AR Golden</h1>
          <p className="text-sm text-muted-foreground">Data AR Golden diisi manual. Input, edit, dan hapus hanya untuk Super Admin.</p>
        </div>
        <div className="flex gap-2 print-hidden">
          {isSuperAdmin && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Manual
            </Button>
          )}
          <Button variant="outline" onClick={printPdf} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Total Tagihan</p><p className="text-xl font-bold">{IDR(totals.tagihan)}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Total Terbayar</p><p className="text-xl font-bold text-green-600">{IDR(totals.terbayar)}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className={cn("text-xl font-bold", totals.outstanding > 0 ? "text-red-600" : "text-green-600")}>{IDR(totals.outstanding)}</p></div>
      </div>

      <div className="flex flex-wrap gap-2 items-center print-hidden">
        <Input placeholder="Cari client atau nomor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="border rounded-md px-3 py-2 text-sm h-10" />
        {filterBulan && <button onClick={() => setFilterBulan("")} className="text-xs text-muted-foreground underline">Reset bulan</button>}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">No. Referensi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Deadline</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Tagihan</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Terbayar</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Outstanding</th>
                {isSuperAdmin && <th className="px-4 py-3 text-right font-medium text-gray-500 print-hidden">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={isSuperAdmin ? 10 : 9} className="px-4 py-8 text-center text-gray-400">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 10 : 9} className="px-4 py-8 text-center text-gray-400">Belum ada data AR Golden manual</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono">{r.invoice_number ?? "-"}</td>
                  <td className="px-4 py-3 font-medium">{r.nama_client}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(r.tanggal)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(r.deadline)}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3 text-right">{IDR(r.total_tagihan)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{IDR(r.total_terbayar)}</td>
                  <td className="px-4 py-3 text-right"><span className={cn("font-semibold", r.outstanding <= 0 ? "text-green-600" : "text-red-600")}>{IDR(r.outstanding)}</span></td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right print-hidden">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => deleteMut.mutate(r.id)} disabled={deleteMut.isPending} title="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRow ? "Edit AR Golden" : "Tambah AR Golden Manual"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Client *</Label>
              <Input value={form.nama_client} onChange={(e) => setForm({ ...form, nama_client: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>No. Referensi</Label>
                <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="Opsional" />
              </div>
              <div>
                <Label>Status</Label>
                <Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Tagihan</Label>
                <Input type="number" min={0} value={form.total_tagihan} onChange={(e) => setForm({ ...form, total_tagihan: e.target.value })} />
              </div>
              <div>
                <Label>Total Terbayar</Label>
                <Input type="number" min={0} value={form.total_terbayar} onChange={(e) => setForm({ ...form, total_terbayar: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <textarea
                className="w-full min-h-20 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSubmit} disabled={saveMut.isPending || !form.nama_client.trim()}>
                {saveMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
