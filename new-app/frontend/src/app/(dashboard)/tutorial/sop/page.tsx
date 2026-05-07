"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Document, Image as PdfImage, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
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
import { ClipboardList, Download, FileText, ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";

interface Sop {
  id: number;
  nama_sop: string;
  role: string | null;
  roles: string[];
  tanggal: string;
  deskripsi: string;
  image_data: string | null;
  image_mime: string | null;
  image_name: string | null;
  created_at: string;
  updated_at: string;
}

interface RoleOption {
  id: number;
  name: string;
}

interface SopForm {
  nama_sop: string;
  roles: string[];
  tanggal: string;
  deskripsi: string;
  image_data: string | null;
  image_mime: string | null;
  image_name: string | null;
}

const EMPTY_FORM: SopForm = {
  nama_sop: "",
  roles: [],
  tanggal: new Date().toISOString().split("T")[0],
  deskripsi: "",
  image_data: null,
  image_mime: null,
  image_name: null,
};

const S = StyleSheet.create({
  page: { padding: 34, fontFamily: "Helvetica", fontSize: 10, color: "#111827" },
  imagePage: { padding: 24, fontFamily: "Helvetica", fontSize: 9, color: "#111827" },
  header: { borderBottom: "1 solid #e5e7eb", paddingBottom: 12, marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  meta: { fontSize: 9, color: "#6b7280", marginBottom: 3 },
  label: { fontSize: 9, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 },
  box: { border: "1 solid #e5e7eb", borderRadius: 4, padding: 12 },
  body: { fontSize: 10, lineHeight: 1.55 },
  fullImage: { width: 547 },
  footer: { position: "absolute", bottom: 24, right: 34, fontSize: 8, color: "#9ca3af" },
});

function fmtDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function roleLabels(sop: Pick<Sop, "roles" | "role">) {
  if (sop.roles?.length) return sop.roles;
  if (sop.role) return sop.role.split(",").map((role) => role.trim()).filter(Boolean);
  return [];
}

function roleText(sop: Pick<Sop, "roles" | "role">) {
  const roles = roleLabels(sop);
  return roles.length ? roles.join(", ") : "Semua Role";
}

function SopPDF({ sop }: { sop: Sop }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>{sop.nama_sop}</Text>
          <Text style={S.meta}>Role: {roleText(sop)}</Text>
          <Text style={S.meta}>Tanggal SOP: {fmtDate(sop.tanggal)}</Text>
        </View>
        <Text style={S.label}>Deskripsi SOP</Text>
        <View style={S.box}>
          <Text style={S.body}>{sop.deskripsi || "-"}</Text>
        </View>
        <Text style={S.footer}>Dicetak: {fmtDate(new Date().toISOString())}</Text>
      </Page>
      {sop.image_data && (
        <Page size="A4" style={S.imagePage}>
          <Text style={S.label}>Lampiran Gambar SOP</Text>
          <PdfImage src={sop.image_data} style={S.fullImage} />
        </Page>
      )}
    </Document>
  );
}

const api = {
  list: () => apiClient.get<Sop[]>("/tutorial/sop").then((r) => r.data),
  roles: () => apiClient.get<RoleOption[]>("/admin/roles").then((r) => r.data),
  create: (data: SopForm) => apiClient.post<Sop>("/tutorial/sop", data).then((r) => r.data),
  update: (id: number, data: SopForm) => apiClient.patch<Sop>(`/tutorial/sop/${id}`, data).then((r) => r.data),
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
  const [form, setForm] = useState<SopForm>(EMPTY_FORM);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tutorial-sop"],
    queryFn: api.list,
  });

  const { data: roleOptions = [] } = useQuery({
    queryKey: ["admin-roles-for-sop"],
    queryFn: api.roles,
    enabled: canManage,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((sop) =>
      sop.nama_sop.toLowerCase().includes(q) ||
      roleText(sop).toLowerCase().includes(q) ||
      sop.deskripsi.toLowerCase().includes(q) ||
      (sop.image_name ?? "").toLowerCase().includes(q)
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
    mutationFn: ({ id, data }: { id: number; data: SopForm }) => api.update(id, data),
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
      roles: roleLabels(sop),
      tanggal: sop.tanggal,
      deskripsi: sop.deskripsi,
      image_data: sop.image_data,
      image_mime: sop.image_mime,
      image_name: sop.image_name,
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

  function toggleRole(roleName: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(roleName)
        ? f.roles.filter((role) => role !== roleName)
        : [...f.roles, roleName],
    }));
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Upload gambar hanya menerima PNG, JPG, atau JPEG");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        image_data: String(reader.result),
        image_mime: file.type,
        image_name: file.name,
      }));
    };
    reader.onerror = () => toast.error("Gagal membaca gambar SOP");
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setForm((f) => ({ ...f, image_data: null, image_mime: null, image_name: null }));
  }

  function submitForm() {
    if (!form.nama_sop.trim() || !form.tanggal || form.roles.length === 0 || (!form.deskripsi.trim() && !form.image_data)) {
      toast.error("Nama SOP, role, tanggal, dan deskripsi atau gambar wajib diisi");
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
                    <Badge variant="outline" className="shrink-0 max-w-[150px] whitespace-normal text-right">{roleText(sop)}</Badge>
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
                    {roleLabels(selected).length ? roleLabels(selected).map((role) => <Badge key={role} variant="secondary">{role}</Badge>) : <Badge variant="secondary">Semua Role</Badge>}
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
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-800">{selected.deskripsi || "-"}</div>
              </div>
              {selected.image_data && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs text-muted-foreground uppercase">Gambar SOP</Label>
                    {selected.image_name && <span className="text-xs text-muted-foreground truncate">{selected.image_name}</span>}
                  </div>
                  <img src={selected.image_data} alt={selected.image_name || selected.nama_sop} className="w-full h-auto rounded-md border bg-white" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <Label>Tanggal / Bulan / Tahun *</Label>
                <Input type="date" value={form.tanggal} onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role yang Bisa Membuka SOP</Label>
              <div className="border rounded-lg p-3 max-h-44 overflow-y-auto grid sm:grid-cols-2 gap-2">
                {roleOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground sm:col-span-2">Role belum tersedia atau belum berhasil dimuat.</p>
                ) : roleOptions.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={form.roles.includes(role.name)}
                      onChange={() => toggleRole(role.name)}
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Minimal pilih satu role. Hanya role terpilih yang bisa membuka SOP ini, kecuali Super Admin.</p>
            </div>

            <div className="space-y-1">
              <Label>Isi Deskripsi SOP</Label>
              <Textarea rows={8} value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))} placeholder="Tuliskan langkah kerja, aturan, checklist, dan catatan SOP..." />
            </div>

            <div className="space-y-2">
              <Label>Upload Gambar SOP PNG/JPG/JPEG</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <ImagePlus className="h-4 w-4 mr-2" /> Pilih Gambar
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageUpload} />
                  </label>
                </Button>
                {form.image_name && <span className="text-sm text-muted-foreground">{form.image_name}</span>}
                {form.image_data && (
                  <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={removeImage}>
                    <X className="h-4 w-4 mr-1" /> Hapus Gambar
                  </Button>
                )}
              </div>
              {form.image_data && (
                <div className="border rounded-lg p-3 bg-slate-50">
                  <img src={form.image_data} alt={form.image_name || "Preview SOP"} className="w-full h-auto rounded border bg-white" />
                </div>
              )}
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
