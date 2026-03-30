"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileText, Plus, Trash2, Loader2, Edit2, ImageIcon, Tags, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const STORAGE = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";

const emptyForm = {
  judul: "", excerpt: "", konten: "", kategori: "",
  author: "Tim RubahRumah", read_time: "5", is_published: false,
};

export default function WebsiteArtikelPage() {
  const qc = useQueryClient();
  const { _hasHydrated, isSuperAdmin, hasPermission } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [katOpen, setKatOpen] = useState(false);
  const [newKat, setNewKat] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [confirmArtikel, setConfirmArtikel] = useState<any>(null);
  const [confirmKat, setConfirmKat] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website-artikel", page, search],
    queryFn: () => websiteApi.listArtikel({ page, per_page: 15, search: search || undefined }),
  });

  const { data: kategoris = [] } = useQuery({
    queryKey: ["artikel-kategori"],
    queryFn: websiteApi.listArtikelKategori,
  });

  const createKatMut = useMutation({
    mutationFn: () => websiteApi.createArtikelKategori(newKat.trim()),
    onSuccess: () => { toast.success("Kategori ditambahkan"); qc.invalidateQueries({ queryKey: ["artikel-kategori"] }); setNewKat(""); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const deleteKatMut = useMutation({
    mutationFn: (id: any) => websiteApi.deleteArtikelKategori(id),
    onSuccess: () => { toast.success("Kategori dihapus"); qc.invalidateQueries({ queryKey: ["artikel-kategori"] }); },
  });

  const createMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (coverFile) fd.append("cover", coverFile);
      return websiteApi.createArtikel(fd);
    },
    onSuccess: () => { toast.success("Artikel ditambahkan"); qc.invalidateQueries({ queryKey: ["website-artikel"] }); handleClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (coverFile) fd.append("cover", coverFile);
      return websiteApi.updateArtikel(editing.id, fd);
    },
    onSuccess: () => { toast.success("Artikel diperbarui"); qc.invalidateQueries({ queryKey: ["website-artikel"] }); handleClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: any) => websiteApi.deleteArtikel(id),
    onSuccess: () => { toast.success("Artikel dihapus"); qc.invalidateQueries({ queryKey: ["website-artikel"] }); },
  });

  async function uploadInlineImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("image", file);
    const url = await websiteApi.uploadImage(fd);
    return `${STORAGE}${url}`;
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setCoverFile(null); setCoverPreview(null);
    setOpen(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    setForm({
      judul: item.judul, excerpt: item.excerpt ?? "",
      konten: "", kategori: item.kategori,
      author: item.author, read_time: String(item.read_time),
      is_published: item.is_published,
    });
    setCoverFile(null);
    setCoverPreview(item.cover_url ? `${STORAGE}${item.cover_url}` : null);
    websiteApi.getArtikel(item.id).then((d) => setForm((f) => ({ ...f, konten: d.konten })));
    setOpen(true);
  }

  function handleClose() {
    setOpen(false); setEditing(null);
    setCoverFile(null); setCoverPreview(null);
  }

  if (_hasHydrated && !isSuperAdmin() && !hasPermission("website", "view")) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-orange-500" size={24} />
            Artikel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola artikel/blog website.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setKatOpen(true)}>
            <Tags size={16} className="mr-1" /> Kelola Kategori
          </Button>
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus size={16} className="mr-1" /> Tulis Artikel
          </Button>
        </div>
      </div>

      <Input
        placeholder="Cari judul artikel..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-xs"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cover</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : !data?.items?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada artikel.</TableCell></TableRow>
            ) : data.items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.cover_url ? (
                    <img src={`${STORAGE}${item.cover_url}`} alt="" className="w-14 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-14 h-10 bg-slate-100 rounded flex items-center justify-center">
                      <ImageIcon size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium max-w-xs">
                  <p className="truncate">{item.judul}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.excerpt}</p>
                </TableCell>
                <TableCell><Badge variant="outline">{item.kategori}</Badge></TableCell>
                <TableCell className="text-sm">{item.author}</TableCell>
                <TableCell>
                  <Badge className={item.is_published ? "bg-green-500" : "bg-slate-400"}>
                    {item.is_published ? "Publik" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit2 size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmArtikel(item)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.total_pages > 1 && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm self-center">{page} / {data.total_pages}</span>
          <Button variant="outline" size="sm" disabled={page === data.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Kelola Kategori Dialog */}
      <Dialog open={katOpen} onOpenChange={setKatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tags size={18} /> Kelola Kategori Artikel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nama kategori baru..."
                value={newKat}
                onChange={(e) => setNewKat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newKat.trim() && createKatMut.mutate()}
              />
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => newKat.trim() && createKatMut.mutate()}
                disabled={createKatMut.isPending}
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {(kategoris as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada kategori.</p>
              ) : (kategoris as any[]).map((k: any) => (
                <div key={k.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border">
                  <span className="text-sm font-medium">{k.nama}</span>
                  <button
                    onClick={() => setConfirmKat(k)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Artikel Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Artikel" : "Tulis Artikel Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-1">

            {/* Cover */}
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg cursor-pointer overflow-hidden bg-slate-50"
              onClick={() => fileRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="cover" className="w-full h-auto block" />
              ) : (
                <div className="h-32 flex items-center justify-center">
                  <div className="text-center text-muted-foreground text-sm">
                    <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
                    Klik untuk pilih foto cover
                  </div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              setCoverFile(f); setCoverPreview(URL.createObjectURL(f));
            }} />

            <div className="space-y-1">
              <Label>Judul *</Label>
              <Input value={form.judul} onChange={(e) => setForm(f => ({ ...f, judul: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kategori *</Label>
                <Select
                  value={form.kategori}
                  onValueChange={(v) => setForm(f => ({ ...f, kategori: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(kategoris as any[]).map((k: any) => (
                      <SelectItem key={k.id} value={k.nama}>{k.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Author</Label>
                <Input value={form.author} onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Estimasi Baca (menit)</Label>
                <Input type="number" min={1} value={form.read_time} onChange={(e) => setForm(f => ({ ...f, read_time: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Ringkasan (Excerpt)</Label>
              <Textarea rows={2} placeholder="Ringkasan singkat artikel..." value={form.excerpt} onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Konten *</Label>
              <RichTextEditor
                value={form.konten}
                onChange={(html) => setForm(f => ({ ...f, konten: html }))}
                uploadImageFn={uploadInlineImage}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} />
              <Label>Publish (tampilkan di website)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Batal</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="animate-spin mr-2" size={14} />}
              {editing ? "Simpan Perubahan" : "Publikasikan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmArtikel}
        onClose={() => setConfirmArtikel(null)}
        onConfirm={() => { deleteMut.mutate(confirmArtikel?.id); setConfirmArtikel(null); }}
        description={`Artikel "${confirmArtikel?.judul}" akan dihapus permanen.`}
        loading={deleteMut.isPending}
      />

      <ConfirmDialog
        open={!!confirmKat}
        onClose={() => setConfirmKat(null)}
        onConfirm={() => { deleteKatMut.mutate(confirmKat?.id); setConfirmKat(null); }}
        description={`Kategori "${confirmKat?.nama}" akan dihapus permanen.`}
        loading={deleteKatMut.isPending}
      />
    </div>
  );
}
