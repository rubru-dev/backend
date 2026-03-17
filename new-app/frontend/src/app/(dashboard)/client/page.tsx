"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientApi } from "@/lib/api/clientManage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, ExternalLink, Clock } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
function statusColor(status: string) {
  if (status === "Selesai") return "bg-green-100 text-green-700";
  if (status === "Ditunda") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Form buat akun klien ──────────────────────────────────────────────────────
function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    lead_id: "",
    nama_proyek: "",
    klien: "",
    alamat: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    status_proyek: "Berjalan",
    username: "",
    password: "",
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["client-leads-dropdown"],
    queryFn: clientApi.leadsDropdown,
    enabled: open,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => clientApi.createProject(data),
    onSuccess: () => {
      toast.success("Akun klien berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["client-projects"] });
      onClose();
      setForm({ lead_id: "", nama_proyek: "", klien: "", alamat: "", tanggal_mulai: "", tanggal_selesai: "", status_proyek: "Berjalan", username: "", password: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal membuat akun"),
  });

  function handleLeadChange(leadId: string) {
    const lead = leads.find((l: any) => String(l.id) === leadId);
    setForm((f) => ({ ...f, lead_id: leadId, klien: lead?.nama ?? f.klien, alamat: lead?.alamat ?? f.alamat }));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Akun Klien Portal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Lead (status: Client) *</Label>
            <Select value={form.lead_id} onValueChange={handleLeadChange}>
              <SelectTrigger><SelectValue placeholder="Pilih lead..." /></SelectTrigger>
              <SelectContent>
                {leads.map((l: any) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.nama} {l.jenis ? `(${l.jenis})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nama Proyek *</Label>
            <Input value={form.nama_proyek} onChange={(e) => setForm((f) => ({ ...f, nama_proyek: e.target.value }))} placeholder="Renovasi Rumah Pak Budi..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Klien</Label>
              <Input value={form.klien} onChange={(e) => setForm((f) => ({ ...f, klien: e.target.value }))} />
            </div>
            <div>
              <Label>Status Proyek</Label>
              <Select value={form.status_proyek} onValueChange={(v) => setForm((f) => ({ ...f, status_proyek: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Berjalan", "Selesai", "Ditunda"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Alamat</Label>
            <Input value={form.alamat} onChange={(e) => setForm((f) => ({ ...f, alamat: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm((f) => ({ ...f, tanggal_mulai: e.target.value }))} />
            </div>
            <div>
              <Label>Tanggal Selesai</Label>
              <Input type="date" value={form.tanggal_selesai} onChange={(e) => setForm((f) => ({ ...f, tanggal_selesai: e.target.value }))} />
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-sm font-medium text-gray-600 mb-2">Login Akun Portal Klien</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Username *</Label>
                <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="pak.budi" />
              </div>
              <div>
                <Label>Password *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="min. 6 karakter" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={isPending || !form.lead_id || !form.nama_proyek || !form.username || !form.password}
            onClick={() => mutate(form)}>
            {isPending ? "Menyimpan..." : "Buat Akun"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["client-projects"],
    queryFn: clientApi.listProjects,
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Client Portal</h1>
            <p className="text-sm text-gray-500">Kelola akun & data klien untuk portal rubahrumah</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Buat Akun Klien
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Klien", value: projects.length, color: "text-teal-600" },
          { label: "Proyek Berjalan", value: projects.filter((p: any) => p.status_proyek === "Berjalan").length, color: "text-blue-600" },
          { label: "Proyek Selesai", value: projects.filter((p: any) => p.status_proyek === "Selesai").length, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klien</TableHead>
                <TableHead>Nama Proyek</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : projects.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                      Belum ada data klien. Klik "Buat Akun Klien" untuk memulai.
                    </TableCell>
                  </TableRow>
                )
                : projects.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/client/${p.id}`)}>
                      <TableCell className="font-medium">{p.klien ?? p.lead?.nama ?? "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.nama_proyek}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status_proyek)}`}>
                          {p.status_proyek}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${p.progress_persen}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{p.progress_persen}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.account?.username ?? "-"}</TableCell>
                      <TableCell>
                        {p.account?.last_login_at ? (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" /> {fmtDate(p.account.last_login_at)}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-400">Belum login</Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/client/${p.id}`)}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
