"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api/website";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Edit2, ExternalLink, Loader2, Plus, Route, Trash2 } from "lucide-react";

function getYoutubeId(url: string) {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/)?.[1] ?? null;
}

const emptyForm = { judul: "", youtube_url: "", is_published: false, sort_order: "0" };

export default function AlurPesananPage() {
  const qc = useQueryClient();
  const { _hasHydrated, isSuperAdmin, hasPermission } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [confirmItem, setConfirmItem] = useState<any>(null);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["website-alur-pesanan"], queryFn: websiteApi.listAlurPesanan });
  const refresh = () => qc.invalidateQueries({ queryKey: ["website-alur-pesanan"] });
  const createMut = useMutation({ mutationFn: () => websiteApi.createAlurPesanan({ ...form, sort_order: parseInt(form.sort_order) || 0 }), onSuccess: () => { toast.success("Video alur pesanan ditambahkan"); refresh(); setOpen(false); }, onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menambahkan video") });
  const updateMut = useMutation({ mutationFn: () => websiteApi.updateAlurPesanan(editing.id, { ...form, sort_order: parseInt(form.sort_order) || 0 }), onSuccess: () => { toast.success("Video alur pesanan diperbarui"); refresh(); setOpen(false); setEditing(null); }, onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal memperbarui video") });
  const deleteMut = useMutation({ mutationFn: (id: any) => websiteApi.deleteAlurPesanan(id), onSuccess: () => { toast.success("Video dihapus"); refresh(); } });

  if (_hasHydrated && !isSuperAdmin() && !hasPermission("website", "view")) return <div className="flex h-64 items-center justify-center text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>;
  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setOpen(true); }
  function openEdit(item: any) { setEditing(item); setForm({ judul: item.judul, youtube_url: item.youtube_url, is_published: item.is_published, sort_order: String(item.sort_order) }); setOpen(true); }
  const saving = createMut.isPending || updateMut.isPending;

  return <div className="space-y-6 p-6">
    <div className="flex items-center justify-between">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Route className="text-orange-500" size={24} /> Alur Pesanan</h1><p className="mt-1 text-sm text-muted-foreground">Kelola video YouTube pada bagian Bagaimana Rubah Rumah Bekerja?</p></div>
      <Button onClick={openCreate} className="bg-orange-500 text-white hover:bg-orange-600"><Plus size={16} className="mr-1" /> Tambah Video</Button>
    </div>
    <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Video</TableHead><TableHead>Judul</TableHead><TableHead>Urutan</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Aksi</TableHead></TableRow></TableHeader><TableBody>
      {isLoading ? <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow> : !(items as any[]).length ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada video alur pesanan.</TableCell></TableRow> : (items as any[]).map((item: any) => { const id = getYoutubeId(item.youtube_url); return <TableRow key={item.id}><TableCell>{id ? <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="" className="h-12 w-20 rounded object-cover" /> : "-"}</TableCell><TableCell className="font-medium">{item.judul}</TableCell><TableCell>{item.sort_order}</TableCell><TableCell><Badge className={item.is_published ? "bg-green-500" : "bg-slate-400"}>{item.is_published ? "Publik" : "Draft"}</Badge></TableCell><TableCell><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => window.open(item.youtube_url, "_blank")}><ExternalLink size={14} /></Button><Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit2 size={14} /></Button><Button size="icon" variant="ghost" className="text-red-500" onClick={() => setConfirmItem(item)}><Trash2 size={14} /></Button></div></TableCell></TableRow> })}
    </TableBody></Table></div>
    <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit Alur Pesanan" : "Tambah Alur Pesanan"}</DialogTitle></DialogHeader><div className="space-y-4 py-2"><div className="space-y-1"><Label>Judul *</Label><Input value={form.judul} onChange={(e) => setForm(f => ({ ...f, judul: e.target.value }))} placeholder="Contoh: Proses Pembangunan Rumah" /></div><div className="space-y-1"><Label>Link YouTube *</Label><Input value={form.youtube_url} onChange={(e) => setForm(f => ({ ...f, youtube_url: e.target.value }))} placeholder="https://youtu.be/xxxxx" />{getYoutubeId(form.youtube_url) && <img src={`https://img.youtube.com/vi/${getYoutubeId(form.youtube_url)}/mqdefault.jpg`} alt="preview" className="mt-2 w-full rounded-lg border" />}</div><div className="space-y-1"><Label>Urutan Tampil</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))} /></div><div className="flex items-center gap-3"><Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} /><Label>Tampilkan di website</Label></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button disabled={!form.judul || !form.youtube_url || saving} onClick={() => editing ? updateMut.mutate() : createMut.mutate()}>{saving && <Loader2 className="mr-2 animate-spin" size={14} />}{editing ? "Simpan" : "Tambah"}</Button></DialogFooter></DialogContent></Dialog>
    <ConfirmDialog open={!!confirmItem} onClose={() => setConfirmItem(null)} onConfirm={() => { deleteMut.mutate(confirmItem?.id); setConfirmItem(null); }} description={`Video "${confirmItem?.judul ?? ""}" akan dihapus permanen.`} loading={deleteMut.isPending} />
  </div>;
}
