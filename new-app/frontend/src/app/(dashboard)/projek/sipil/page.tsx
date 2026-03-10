"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sipilApi } from "@/lib/api/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, Pencil, Trash2, ChevronRight, Layers, CalendarRange } from "lucide-react";

type Projek = {
  id: string;
  nama_proyek: string | null;
  lead: { id: string; nama: string } | null;
  lokasi: string | null;
  nilai_rab: number;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  jumlah_termin: number;
  jumlah_task: number;
  tasks_selesai: number;
  progress: number;
};

const EMPTY_FORM = { nama_proyek: "", lead_id: "", lokasi: "", nilai_rab: "", tanggal_mulai: "", tanggal_selesai: "" };

export default function ProyekSipilListPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [dialog, setDialog] = useState(false);
  const [editProjek, setEditProjek] = useState<Projek | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: projeks = [], isLoading } = useQuery<Projek[]>({
    queryKey: ["sipil-projeks"],
    queryFn: () => sipilApi.listProjeks(),
    retry: false,
  });

  const { data: leads = [] } = useQuery<{ id: string; nama: string }[]>({
    queryKey: ["finance-leads-dropdown"],
    queryFn: () => sipilApi.listLeads(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const createMut = useMutation({
    mutationFn: (d: any) => sipilApi.createProjek(d),
    onSuccess: () => {
      toast.success("Proyek Sipil dibuat");
      qc.invalidateQueries({ queryKey: ["sipil-projeks"] });
      setDialog(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => sipilApi.updateProjek(id, data),
    onSuccess: () => {
      toast.success("Proyek diupdate");
      qc.invalidateQueries({ queryKey: ["sipil-projeks"] });
      setDialog(false);
      setEditProjek(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => sipilApi.deleteProjek(id),
    onSuccess: () => {
      toast.success("Proyek dihapus");
      qc.invalidateQueries({ queryKey: ["sipil-projeks"] });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  function openCreate() {
    setEditProjek(null);
    setForm(EMPTY_FORM);
    setDialog(true);
  }

  function openEdit(p: Projek) {
    setEditProjek(p);
    setForm({
      nama_proyek: p.nama_proyek ?? "",
      lead_id: p.lead?.id ?? "",
      lokasi: p.lokasi ?? "",
      nilai_rab: p.nilai_rab?.toString() ?? "",
      tanggal_mulai: p.tanggal_mulai ?? "",
      tanggal_selesai: p.tanggal_selesai ?? "",
    });
    setDialog(true);
  }

  function handleSubmit() {
    const payload = {
      ...form,
      lead_id: form.lead_id || null,
      nilai_rab: form.nilai_rab ? Number(form.nilai_rab) : 0,
      tanggal_mulai: form.tanggal_mulai || null,
      tanggal_selesai: form.tanggal_selesai || null,
    };
    if (editProjek) updateMut.mutate({ id: editProjek.id, data: payload });
    else createMut.mutate(payload);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-500" /> Projek Sipil
          </h1>
          <p className="text-muted-foreground text-sm">Kelola proyek sipil — klik baris untuk membuka detail</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> Tambah Proyek</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Nama Proyek</TableHead>
            <TableHead>Klien</TableHead>
            <TableHead>Lokasi</TableHead>
            <TableHead className="text-right">Nilai RAB</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead>Termin</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}
          {!isLoading && projeks.map((p) => (
            <TableRow
              key={p.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => router.push(`/projek/sipil/${p.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  <Building2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                  {p.nama_proyek ?? "—"}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.lead?.nama ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{p.lokasi ?? "—"}</TableCell>
              <TableCell className="text-right text-sm">
                {p.nilai_rab > 0 ? "Rp " + p.nilai_rab.toLocaleString("id-ID") : "—"}
              </TableCell>
              <TableCell>
                {(p.tanggal_mulai || p.tanggal_selesai) ? (
                  <Badge variant="outline" className="text-xs flex items-center gap-1 whitespace-nowrap">
                    <CalendarRange className="h-3 w-3" />
                    {p.tanggal_mulai ? new Date(p.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "?"}{" – "}
                    {p.tanggal_selesai ? new Date(p.tanggal_selesai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "?"}
                  </Badge>
                ) : <span className="text-muted-foreground text-sm">—</span>}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Layers className="h-3 w-3" />{p.jumlah_termin} termin
                </Badge>
              </TableCell>
              <TableCell className="min-w-[120px]">
                <div className="flex items-center gap-2">
                  <Progress value={p.progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{p.progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{p.tasks_selesai}/{p.jumlah_task} selesai</p>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && projeks.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                <Building2 className="mx-auto h-10 w-10 opacity-20 mb-3" />
                <p className="font-medium">Belum ada Projek Sipil</p>
                <p className="text-sm mt-1">Klik &quot;Tambah Proyek&quot; untuk membuat yang pertama</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={(v) => { setDialog(v); if (!v) { setEditProjek(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editProjek ? "Edit Proyek Sipil" : "Tambah Proyek Sipil"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label>Nama Proyek *</Label>
              <Input placeholder="e.g. Pembangunan Gedung Kantor Pak Budi" value={form.nama_proyek} onChange={(e) => setForm({ ...form, nama_proyek: e.target.value })} />
            </div>
            <div>
              <Label>Klien / Lead</Label>
              <Select value={form.lead_id || "__none__"} onValueChange={(v) => setForm({ ...form, lead_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Pilih klien (opsional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tanpa klien —</SelectItem>
                  {(leads as any[]).map((l: any) => <SelectItem key={l.id} value={String(l.id)}>{l.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Lokasi</Label><Input placeholder="Alamat atau lokasi proyek" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></div>
            <div><Label>Nilai RAB (Rp)</Label><Input type="number" value={form.nilai_rab} onChange={(e) => setForm({ ...form, nilai_rab: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tgl Mulai Proyek</Label>
                <Input type="date" value={form.tanggal_mulai} max={form.tanggal_selesai || undefined} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} />
              </div>
              <div>
                <Label>Tgl Selesai Proyek</Label>
                <Input type="date" value={form.tanggal_selesai} min={form.tanggal_mulai || undefined} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
              <Button onClick={handleSubmit} disabled={!form.nama_proyek || isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Proyek?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Semua termin dan pekerjaan dalam proyek ini juga akan dihapus.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => confirmDelete && deleteMut.mutate(confirmDelete)}>Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
