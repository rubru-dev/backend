"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Images, Plus, Trash2, Loader2, Edit2, Monitor, Smartphone } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/store/authStore";

const STORAGE = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";

export default function WebsiteBannerPage() {
  const qc = useQueryClient();
  const { _hasHydrated, isSuperAdmin, hasPermission } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const mobileFileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmBanner, setConfirmBanner] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", is_active: true });
  const [file, setFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["website-banners"],
    queryFn: websiteApi.listBanners,
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Pilih gambar desktop terlebih dahulu");
      const fd = new FormData();
      fd.append("image", file);
      if (mobileFile) fd.append("mobile_image", mobileFile);
      fd.append("title", form.title);
      fd.append("subtitle", form.subtitle);
      fd.append("is_active", String(form.is_active));
      return websiteApi.createBanner(fd);
    },
    onSuccess: () => {
      toast.success("Banner berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["website-banners"] });
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? e.message ?? "Gagal"),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (file) fd.append("image", file);
      if (mobileFile) fd.append("mobile_image", mobileFile);
      fd.append("title", form.title);
      fd.append("subtitle", form.subtitle);
      fd.append("is_active", String(form.is_active));
      return websiteApi.updateBanner(editing.id, fd);
    },
    onSuccess: () => {
      toast.success("Banner berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["website-banners"] });
      handleClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: any) => websiteApi.deleteBanner(id),
    onSuccess: () => { toast.success("Banner dihapus"); qc.invalidateQueries({ queryKey: ["website-banners"] }); },
    onError: () => toast.error("Gagal menghapus"),
  });

  function openCreate() {
    setEditing(null);
    setForm({ title: "", subtitle: "", is_active: true });
    setFile(null); setMobileFile(null);
    setPreview(null); setMobilePreview(null);
    setOpen(true);
  }

  function openEdit(b: any) {
    setEditing(b);
    setForm({ title: b.title ?? "", subtitle: b.subtitle ?? "", is_active: b.is_active });
    setFile(null); setMobileFile(null);
    setPreview(b.image_url ? `${STORAGE}${b.image_url}` : null);
    setMobilePreview(b.mobile_image_url ? `${STORAGE}${b.mobile_image_url}` : null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false); setEditing(null);
    setFile(null); setMobileFile(null);
    setPreview(null); setMobilePreview(null);
  }

  if (_hasHydrated && !isSuperAdmin() && !hasPermission("website", "view")) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Images className="text-orange-500" size={24} />
            Banner / Hero Carousel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola gambar banner. Upload gambar desktop dan mobile secara terpisah.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={16} className="mr-1" /> Tambah Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-40 items-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">Belum ada banner.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b: any) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="relative aspect-video bg-slate-100">
                {b.image_url ? (
                  <img src={`${STORAGE}${b.image_url}`} alt={b.title ?? "Banner"} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Tidak ada gambar</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-500" : ""}>
                    {b.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                  {b.mobile_image_url && (
                    <Badge className="bg-blue-500 text-white"><Smartphone size={10} /></Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-3">
                <p className="font-semibold text-sm truncate">{b.title || <span className="text-muted-foreground italic">Tanpa judul</span>}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="flex-1">
                    <Edit2 size={14} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmBanner(b)} disabled={deleteMut.isPending}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Banner" : "Tambah Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Desktop image */}
            <div>
              <Label className="flex items-center gap-1 mb-1"><Monitor size={14} /> Gambar Desktop *</Label>
              <p className="text-xs text-muted-foreground mb-2">Ukuran optimal: <strong>1440 × 500 px</strong> (rasio 2.88:1, JPG/PNG/WEBP, maks 10 MB)</p>
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg aspect-video flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50"
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    <Images size={28} className="mx-auto mb-2 opacity-50" />
                    Klik untuk pilih gambar desktop
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setFile(f); setPreview(URL.createObjectURL(f));
              }} />
            </div>

            {/* Mobile image */}
            <div>
              <Label className="flex items-center gap-1 mb-1"><Smartphone size={14} /> Gambar Mobile (opsional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Ukuran optimal: <strong>640 × 400 px</strong> (rasio 1.6:1, portrait/square OK)</p>
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg h-32 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50"
                onClick={() => mobileFileRef.current?.click()}
              >
                {mobilePreview ? (
                  <img src={mobilePreview} alt="mobile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground text-sm">
                    <Smartphone size={24} className="mx-auto mb-1 opacity-50" />
                    Klik untuk pilih gambar mobile
                  </div>
                )}
              </div>
              <input ref={mobileFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setMobileFile(f); setMobilePreview(URL.createObjectURL(f));
              }} />
              <p className="text-xs text-muted-foreground mt-1">Jika tidak diisi, gambar desktop juga ditampilkan di layar kecil.</p>
            </div>

            <div className="space-y-1">
              <Label>Judul (opsional)</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Tampilkan di website</Label>
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
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmBanner}
        onClose={() => setConfirmBanner(null)}
        onConfirm={() => { deleteMut.mutate(confirmBanner?.id); setConfirmBanner(null); }}
        description={`Banner "${confirmBanner?.title || "ini"}" akan dihapus permanen.`}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
