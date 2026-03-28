"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardHat, Plus, Trash2, Loader2, Edit2, Images, Star } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const STORAGE = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";
const JENIS = ["BANGUN", "RENOVASI", "DESAIN", "INTERIOR"];
const STATUS_LIST = [
  { value: "Dalam Proses", label: "Dalam Proses (Berjalan)" },
  { value: "SELESAI", label: "Selesai" },
  { value: "Ditunda", label: "Ditunda" },
];
const GROUPS = [
  { key: "cover",   label: "Cover"    },
  { key: "termin1", label: "Termin 1" },
  { key: "termin2", label: "Termin 2" },
  { key: "termin3", label: "Termin 3" },
];

const emptyForm = {
  nama_klien: "", jenis_jasa: "RENOVASI", lokasi: "", budget: "",
  luas: "", tanggal_mulai: "", tanggal_selesai_estimasi: "",
  progress: "0", progress_desc: "", status: "Dalam Proses", deskripsi: "", is_published: false,
};

export default function WebsiteProjekBerjalanPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [confirmItem, setConfirmItem] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [activeGroup, setActiveGroup] = useState("cover");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website-project", page, search],
    queryFn: () => websiteApi.listProject({ page, per_page: 15, search: search || undefined }),
  });

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ["website-project-detail", viewItem?.id],
    queryFn: () => websiteApi.getProject(viewItem.id),
    enabled: !!viewItem,
  });

  const createMut = useMutation({
    mutationFn: () => websiteApi.createProject({ ...form, budget: parseFloat(form.budget) || 0, luas: parseFloat(form.luas) || 0 }),
    onSuccess: () => { toast.success("Projek ditambahkan"); qc.invalidateQueries({ queryKey: ["website-project"] }); setOpen(false); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const updateMut = useMutation({
    mutationFn: () => websiteApi.updateProject(editing.id, { ...form, budget: parseFloat(form.budget) || 0, luas: parseFloat(form.luas) || 0 }),
    onSuccess: () => { toast.success("Projek diperbarui"); qc.invalidateQueries({ queryKey: ["website-project"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: any) => websiteApi.deleteProject(id),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["website-project"] }); },
  });

  const uploadImgMut = useMutation({
    mutationFn: ({ id, files, group }: { id: any; files: FileList; group: string }) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));
      fd.append("group", group);
      return websiteApi.uploadProjectImages(id, fd);
    },
    onSuccess: () => { toast.success("Foto diupload"); refetchDetail(); },
    onError: () => toast.error("Gagal upload"),
  });

  const setCoverMut = useMutation({
    mutationFn: (imgId: any) => websiteApi.setProjectCover(viewItem.id, imgId),
    onSuccess: () => refetchDetail(),
  });

  const delImgMut = useMutation({
    mutationFn: (imgId: any) => websiteApi.deleteProjectImage(viewItem.id, imgId),
    onSuccess: () => refetchDetail(),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    setForm({
      nama_klien: item.nama_klien,
      jenis_jasa: item.jenis_jasa,
      lokasi: item.lokasi ?? "",
      budget: String(item.budget),
      luas: String(item.luas),
      tanggal_mulai: item.tanggal_mulai?.split("T")[0] ?? "",
      tanggal_selesai_estimasi: item.tanggal_selesai_estimasi?.split("T")[0] ?? "",
      progress: String(item.progress),
      progress_desc: item.progress_desc ?? "",
      status: item.status,
      deskripsi: item.deskripsi ?? "",
      is_published: item.is_published,
    });
    setOpen(true);
  }

  // Images filtered by current active group
  const allImages: any[] = detail?.images ?? [];
  const groupImages = allImages.filter((img: any) => img.group === activeGroup);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="text-orange-500" size={24} />
            Projek Berjalan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola proyek aktif yang ditampilkan di website.</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={16} className="mr-1" /> Tambah
        </Button>
      </div>

      <Input
        placeholder="Cari nama klien..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-xs"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Klien</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tampil</TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : !data?.items?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada data.</TableCell></TableRow>
            ) : data.items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nama_klien}</TableCell>
                <TableCell><Badge variant="outline">{item.jenis_jasa}</Badge></TableCell>
                <TableCell className="w-40">
                  <div className="flex items-center gap-2">
                    <Progress value={item.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{item.progress}%</span>
                  </div>
                  {item.progress_desc && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[140px]">{item.progress_desc}</p>}
                </TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>
                  <Badge className={item.is_published ? "bg-green-500" : "bg-slate-400"}>
                    {item.is_published ? "Ya" : "Tidak"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" title="Foto" onClick={() => { setViewItem(item); setActiveGroup("cover"); setImgOpen(true); }}>
                      <Images size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit2 size={14} /></Button>
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

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Projek" : "Tambah Projek"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Nama Klien *</Label>
              <Input value={form.nama_klien} onChange={(e) => setForm(f => ({ ...f, nama_klien: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Jenis Jasa</Label>
                <Select value={form.jenis_jasa} onValueChange={(v) => setForm(f => ({ ...f, jenis_jasa: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Lokasi</Label>
              <Input value={form.lokasi} onChange={(e) => setForm(f => ({ ...f, lokasi: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Luas (m²)</Label>
                <Input type="number" value={form.luas} onChange={(e) => setForm(f => ({ ...f, luas: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Budget (Rp)</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm(f => ({ ...f, budget: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tanggal Mulai *</Label>
                <Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm(f => ({ ...f, tanggal_mulai: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estimasi Selesai</Label>
                <Input type="date" value={form.tanggal_selesai_estimasi} onChange={(e) => setForm(f => ({ ...f, tanggal_selesai_estimasi: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Progress ({form.progress}%)</Label>
              <Input
                type="range" min={0} max={100}
                value={form.progress}
                onChange={(e) => setForm(f => ({ ...f, progress: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Keterangan Progress</Label>
              <Input
                placeholder="Contoh: Pengerjaan struktur bawah"
                value={form.progress_desc}
                onChange={(e) => setForm(f => ({ ...f, progress_desc: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Textarea rows={3} value={form.deskripsi} onChange={(e) => setForm(f => ({ ...f, deskripsi: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} />
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
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="animate-spin mr-2" size={14} />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={() => { deleteMut.mutate(confirmItem?.id); setConfirmItem(null); }}
        description={`Projek "${confirmItem?.nama_klien}" beserta semua fotonya akan dihapus permanen.`}
        loading={deleteMut.isPending}
      />

      {/* Image Dialog */}
      <Dialog open={imgOpen} onOpenChange={(v) => !v && setImgOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto Projek — {viewItem?.nama_klien}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Termin Tabs */}
            <div className="flex gap-1 border-b pb-2">
              {GROUPS.map((g) => {
                const count = allImages.filter((img: any) => img.group === g.key).length;
                return (
                  <button
                    key={g.key}
                    onClick={() => setActiveGroup(g.key)}
                    className={`px-3 py-1.5 text-sm rounded-t font-medium transition-colors ${
                      activeGroup === g.key
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {g.label}
                    {count > 0 && <span className="ml-1 text-xs opacity-80">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Upload button for active group */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadImgMut.isPending}>
                {uploadImgMut.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : <Plus size={14} className="mr-1" />}
                Upload ke {GROUPS.find(g => g.key === activeGroup)?.label}
              </Button>
              <span className="text-xs text-muted-foreground">{groupImages.length} foto</span>
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => e.target.files && uploadImgMut.mutate({ id: viewItem.id, files: e.target.files, group: activeGroup })}
            />

            {/* Image Grid */}
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {groupImages.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
                  Belum ada foto untuk {GROUPS.find(g => g.key === activeGroup)?.label}
                </div>
              ) : groupImages.map((img: any) => (
                <Card key={img.id} className={`overflow-hidden ${img.is_cover ? "ring-2 ring-orange-500" : ""}`}>
                  <div className="relative aspect-video">
                    <img src={`${STORAGE}${img.image_url}`} alt="" className="w-full h-full object-cover" />
                    {img.is_cover && (
                      <div className="absolute top-1 left-1">
                        <Badge className="bg-orange-500 text-xs px-1 py-0"><Star size={10} className="mr-0.5" />Cover</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-1 flex gap-1">
                    <Button size="sm" variant="ghost" className="flex-1 text-xs h-7" onClick={() => setCoverMut.mutate(img.id)} disabled={img.is_cover}>
                      Set Cover
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => delImgMut.mutate(img.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
