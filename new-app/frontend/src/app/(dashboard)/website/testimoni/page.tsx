"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MessageSquareQuote, Plus, Trash2, Loader2, Edit2, Play } from "lucide-react";

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
  return match ? match[1] : null;
}

const emptyForm = {
  youtube_url: "",
  nama_klien: "",
  jenis_jasa: "",
  is_published: false,
  sort_order: "0",
};

export default function WebsiteTestimoniPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [confirmItem, setConfirmItem] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["website-testimoni"],
    queryFn: websiteApi.listTestimoni,
  });

  const createMut = useMutation({
    mutationFn: () => websiteApi.createTestimoni({ ...form, sort_order: parseInt(form.sort_order) || 0 }),
    onSuccess: () => {
      toast.success("Testimoni ditambahkan");
      qc.invalidateQueries({ queryKey: ["website-testimoni"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const updateMut = useMutation({
    mutationFn: () => websiteApi.updateTestimoni(editing.id, { ...form, sort_order: parseInt(form.sort_order) || 0 }),
    onSuccess: () => {
      toast.success("Testimoni diperbarui");
      qc.invalidateQueries({ queryKey: ["website-testimoni"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: any) => websiteApi.deleteTestimoni(id),
    onSuccess: () => {
      toast.success("Testimoni dihapus");
      qc.invalidateQueries({ queryKey: ["website-testimoni"] });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    setForm({
      youtube_url: item.youtube_url,
      nama_klien: item.nama_klien,
      jenis_jasa: item.jenis_jasa,
      is_published: item.is_published,
      sort_order: String(item.sort_order),
    });
    setOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareQuote className="text-orange-500" size={24} />
            Testimoni Klien
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola video testimoni YouTube yang ditampilkan di halaman utama.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={16} className="mr-1" /> Tambah
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thumbnail</TableHead>
              <TableHead>Nama Klien</TableHead>
              <TableHead>Jenis Jasa</TableHead>
              <TableHead>Urutan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : !(items as any[]).length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Belum ada testimoni.
                </TableCell>
              </TableRow>
            ) : (items as any[]).map((item: any) => {
              const ytId = getYoutubeId(item.youtube_url);
              const thumbUrl = ytId
                ? "https://img.youtube.com/vi/" + ytId + "/mqdefault.jpg"
                : null;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {thumbUrl ? (
                      <div className="relative w-20 h-12 rounded overflow-hidden bg-slate-100">
                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play size={16} className="text-white drop-shadow" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-12 bg-slate-100 rounded flex items-center justify-center text-xs text-muted-foreground">
                        No video
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.nama_klien}</TableCell>
                  <TableCell>{item.jenis_jasa}</TableCell>
                  <TableCell>{item.sort_order}</TableCell>
                  <TableCell>
                    <Badge className={item.is_published ? "bg-green-500" : "bg-slate-400"}>
                      {item.is_published ? "Publik" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => setConfirmItem(item)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Testimoni" : "Tambah Testimoni"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Link YouTube *</Label>
              <Input
                value={form.youtube_url}
                onChange={(e) => setForm(f => ({ ...f, youtube_url: e.target.value }))}
                placeholder="https://youtu.be/xxxxx"
              />
              {form.youtube_url && getYoutubeId(form.youtube_url) && (
                <img
                  src={"https://img.youtube.com/vi/" + getYoutubeId(form.youtube_url) + "/mqdefault.jpg"}
                  alt="preview"
                  className="w-full rounded-lg mt-2 border"
                />
              )}
            </div>
            <div className="space-y-1">
              <Label>Nama Klien *</Label>
              <Input
                value={form.nama_klien}
                onChange={(e) => setForm(f => ({ ...f, nama_klien: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Jenis Jasa *</Label>
              <Input
                value={form.jenis_jasa}
                onChange={(e) => setForm(f => ({ ...f, jenis_jasa: e.target.value }))}
                placeholder="Contoh: Renovasi Rumah"
              />
            </div>
            <div className="space-y-1">
              <Label>Urutan Tampil</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))}
              />
              <Label>Tampilkan di website</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="animate-spin mr-2" size={14} />
              )}
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={() => { deleteMut.mutate(confirmItem?.id); setConfirmItem(null); }}
        description={"Testimoni dari " + (confirmItem?.nama_klien ?? "") + " akan dihapus permanen."}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
