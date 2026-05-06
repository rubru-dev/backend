"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Download, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";

interface Sop {
  id: number;
  nama_sop: string;
  role: string | null;
  tanggal: string;
  deskripsi: string;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = { nama_sop: "", role: "", tanggal: new Date().toISOString().split("T")[0], deskripsi: "" };

const S = StyleSheet.create({
  page: { padding: 34, fontFamily: "Helvetica", fontSize: 10, color: "#111827" },
  header: { borderBottom: "1 solid #e5e7eb", paddingBottom: 12, marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  meta: { fontSize: 9, color: "#6b7280", marginBottom: 3 },
  label: { fontSize: 9, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 },
  box: { border: "1 solid #e5e7eb", borderRadius: 4, padding: 12 },
  body: { fontSize: 10, lineHeight: 1.55 },
  footer: { position: "absolute", bottom: 24, right: 34, fontSize: 8, color: "#9ca3af" },
});

function fmtDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function SopPDF({ sop }: { sop: Sop }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>{sop.nama_sop}</Text>
          <Text style={S.meta}>Role: {sop.role || "Semua Role"}</Text>
          <Text style={S.meta}>Tanggal SOP: {fmtDate(sop.tanggal)}</Text>
        </View>
        <Text style={S.label}>Deskripsi SOP</Text>
        <View style={S.box}>
          <Text style={S.body}>{sop.deskripsi}</Text>
        </View>
        <Text style={S.footer}>Dicetak: {fmtDate(new Date().toISOString())}</Text>
      </Page>
    </Document>
  );
}

const api = {
  list: () => apiClient.get<Sop[]>("/tutorial/sop").then((r) => r.data),
  create: (data: typeof EMPTY_FORM) => apiClient.post<Sop>("/tutorial/sop", data).then((r) => r.data),
  update: (id: number, data: typeof EMPTY_FORM) => apiClient.patch<Sop>(`/tutorial/sop/${id}`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/tutorial/sop/${id}`).then((r) => r.data),
};

export default function SopPage() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuthStore();
  const canManage = isSuperAdmin();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tutorial-sop"],
    queryFn: api.list,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((sop) =>
      sop.nama_sop.toLowerCase().includes(q) ||
      (sop.role ?? "").toLowerCase().includes(q) ||
      sop.deskripsi.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const selected = rows.find((sop) => sop.id === selectedId) ?? filtered[0] ?? null;

  const createMut = useMutation({
    mutationFn: api.create,
    onSuccess: (sop) => {
      toast.success("SOP berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["tutorial-sop"] });
      setSelectedId(sop.id);
      closeDialog();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan SOP"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof EMPTY_FORM }) => api.update(id, data),
    onSuccess: (sop) => {
      toast.success("SOP berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["tutorial-sop"] });
      setSelectedId(sop.id);
      closeDialog();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal memperbarui SOP"),
  });

  const deleteMut = useMutation({
    mutationFn: api.delete,
    onSuccess: () => {
      toast.success("SOP dihapus");
      qc.invalidateQueries({ queryKey: ["tutorial-sop"] });
      setSelectedId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menghapus SOP"),
  });

  function closeDialog() {
    setOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(sop: Sop) {
    setEditId(sop.id);
    setForm({
      nama_sop: sop.nama_sop,
      role: sop.role ?? "",
      tanggal: sop.tanggal,
      deskripsi: sop.deskripsi,
    });
    setOpen(true);
  }

  async function downloadPdf(sop: Sop) {
    try {
      const blob = await pdf(<SopPDF sop={sop} />).toBlob();
      const safeName = sop.nama_sop.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "sop";
      saveAs(blob, `SOP-${safeName}.pdf`);
    } catch {
      toast.error("Gagal membuat PDF SOP");
    }
  }

  function submitForm() {
    if (!form.nama_sop.trim() || !form.tanggal || !form.deskripsi.trim()) {
      toast.error("Nama SOP, tanggal, dan deskripsi wajib diisi");
      return;
    }
    if (editId) updateMut.mutate({ id: editId, data: form });
    else createMut.mutate(form);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-sky-600" /> SOP
          </h1>
          <p className="text-sm text-muted-foreground">Daftar SOP perusahaan berdasarkan role dan tanggal berlaku</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Buat SOP
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari SOP, role, deskripsi..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Belum ada SOP</div>
            ) : (
              filtered.map((sop) => (
                <button
                  key={sop.id}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-sky-50 transition-colors ${selected?.id === sop.id ? "bg-sky-50" : ""}`}
                  onClick={() => setSelectedId(sop.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{sop.nama_sop}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fmtDate(sop.tanggal)}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{sop.role || "Semua Role"}</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg min-h-[520px]">
          {!selected ? (
            <div className="h-full min-h-[520px] flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-10 w-10 opacity-30 mb-3" />
              <p className="text-sm">Pilih SOP untuk preview</p>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-gray-900">{selected.nama_sop}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{selected.role || "Semua Role"}</Badge>
                    <span>{fmtDate(selected.tanggal)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadPdf(selected)}>
                    <Download className="h-4 w-4 mr-1.5" /> PDF
                  </Button>
                  {canManage && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>
                        <Pencil className="h-4 w-4 mr-1.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Hapus SOP "${selected.nama_sop}"?`)) deleteMut.mutate(selected.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <Label className="text-xs text-muted-foreground uppercase">Deskripsi SOP</Label>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-800">{selected.deskripsi}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit SOP" : "Buat SOP"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nama SOP *</Label>
                <Input value={form.nama_sop} onChange={(e) => setForm((f) => ({ ...f, nama_sop: e.target.value }))} placeholder="Contoh: SOP Follow Up Lead" />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Contoh: Sales Admin" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tanggal / Bulan / Tahun *</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Isi Deskripsi SOP *</Label>
              <Textarea rows={10} value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))} placeholder="Tuliskan langkah kerja, aturan, checklist, dan catatan SOP..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={submitForm} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Menyimpan..." : "Simpan SOP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
