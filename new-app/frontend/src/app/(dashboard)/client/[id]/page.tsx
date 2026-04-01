"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientApi } from "@/lib/api/clientManage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowLeft, Plus, Trash2, Pencil, Save, X, Upload, Image as ImageIcon,
  FileText, Calendar, Phone, User, TrendingUp, Users, Eye, Video, Receipt,
  Folder, FolderOpen, ChevronLeft,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
function fileUrl(p: string | null) { return p ? `${API_BASE}${p}` : null; }
function fmtRp(v: any) { return "Rp " + (Number(v) || 0).toLocaleString("id-ID"); }
function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_PEKERJAAN = ["Dalam Proses", "Selesai", "Tertunda"];
const STATUS_PROYEK = ["Berjalan", "Selesai", "Ditunda"];
const STATUS_BAYAR = ["Belum Dibayar", "Sudah Dibayar"];

// ─────────────────────────────────────────────────────────────────────────────
// TAB: INFO PROYEK
// ─────────────────────────────────────────────────────────────────────────────
function TabInfo({ pid, project }: { pid: number; project: any }) {
  const qc = useQueryClient();
  const [editProyek, setEditProyek] = useState(false);
  const [editAccount, setEditAccount] = useState(false);
  const [formP, setFormP] = useState<any>({});
  const [formA, setFormA] = useState({ password: "", is_active: true });

  const { data: admProjects = [] } = useQuery({
    queryKey: ["adm-projects-dropdown"],
    queryFn: () => clientApi.admProjectsDropdown(),
  });

  function startEditProyek() {
    setFormP({
      nama_proyek: project.nama_proyek,
      klien: project.klien,
      alamat: project.alamat,
      tanggal_mulai: project.tanggal_mulai?.slice(0, 10) ?? "",
      tanggal_selesai: project.tanggal_selesai?.slice(0, 10) ?? "",
      status_proyek: project.status_proyek,
      catatan: project.catatan ?? "",
      adm_finance_project_id: project.adm_finance_project_id ? String(project.adm_finance_project_id) : "",
    });
    setEditProyek(true);
  }

  const { mutate: saveProyek, isPending: savingP } = useMutation({
    mutationFn: (data: any) => clientApi.updateProject(pid, data),
    onSuccess: () => { toast.success("Info proyek diperbarui"); qc.invalidateQueries({ queryKey: ["client-project", pid] }); setEditProyek(false); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  const { mutate: saveAccount, isPending: savingA } = useMutation({
    mutationFn: (data: any) => clientApi.updateAccount(pid, data),
    onSuccess: () => { toast.success("Akun diperbarui"); qc.invalidateQueries({ queryKey: ["client-project", pid] }); setEditAccount(false); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan akun"),
  });

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Info Proyek */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Info Proyek</h3>
            {!editProyek
              ? <Button size="sm" variant="outline" onClick={startEditProyek}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
              : <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditProyek(false)}><X className="w-3 h-3" /></Button>
                  <Button size="sm" disabled={savingP} onClick={() => saveProyek(formP)}><Save className="w-3 h-3 mr-1" />Simpan</Button>
                </div>
            }
          </div>
          {!editProyek ? (
            <dl className="space-y-3 text-sm">
              {[
                { label: "Nama Proyek", value: project.nama_proyek },
                { label: "Klien", value: project.klien },
                { label: "Alamat", value: project.alamat },
                { label: "Status", value: project.status_proyek },
                { label: "Progress", value: `${project.progress_persen}%` },
                { label: "Mulai", value: fmtDate(project.tanggal_mulai) },
                { label: "Selesai", value: fmtDate(project.tanggal_selesai) },
                { label: "Catatan", value: project.catatan || "-" },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-5 gap-2">
                  <dt className="col-span-2 text-gray-500">{label}</dt>
                  <dd className="col-span-3 font-medium">{value ?? "-"}</dd>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-2">
                <dt className="col-span-2 text-gray-500">Link Adm Projek</dt>
                <dd className={`col-span-3 font-medium ${!project.adm_finance_project_id ? "text-orange-500 text-xs" : "text-sm"}`}>
                  {project.adm_finance_project_id
                    ? (admProjects as any[]).find((p: any) => String(p.id) === String(project.adm_finance_project_id))?.label ?? `#${project.adm_finance_project_id}`
                    : "Belum dihubungkan"}
                </dd>
              </div>
              {!project.adm_finance_project_id && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-600">
                  ⚠ Hubungkan ke Administrasi Projek agar kehadiran tukang muncul di portal klien.
                </div>
              )}
            </dl>
          ) : (
            <div className="space-y-3">
              <div><Label>Nama Proyek</Label><Input value={formP.nama_proyek} onChange={(e) => setFormP((f: any) => ({ ...f, nama_proyek: e.target.value }))} /></div>
              <div><Label>Klien</Label><Input value={formP.klien} onChange={(e) => setFormP((f: any) => ({ ...f, klien: e.target.value }))} /></div>
              <div><Label>Alamat</Label><Input value={formP.alamat} onChange={(e) => setFormP((f: any) => ({ ...f, alamat: e.target.value }))} /></div>
              <div>
                <Label>Status Proyek</Label>
                <Select value={formP.status_proyek} onValueChange={(v) => setFormP((f: any) => ({ ...f, status_proyek: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_PROYEK.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Tgl Mulai</Label><Input type="date" value={formP.tanggal_mulai} onChange={(e) => setFormP((f: any) => ({ ...f, tanggal_mulai: e.target.value }))} /></div>
                <div><Label>Tgl Selesai</Label><Input type="date" value={formP.tanggal_selesai} onChange={(e) => setFormP((f: any) => ({ ...f, tanggal_selesai: e.target.value }))} /></div>
              </div>
              <div><Label>Catatan (tampil di portal klien)</Label><Textarea value={formP.catatan} onChange={(e) => setFormP((f: any) => ({ ...f, catatan: e.target.value }))} /></div>
              <div>
                <Label>Link ke Administrasi Projek (kehadiran tukang)</Label>
                <Select
                  value={formP.adm_finance_project_id || "none"}
                  onValueChange={(v) => setFormP((f: any) => ({ ...f, adm_finance_project_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih Adm Projek..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak dihubungkan —</SelectItem>
                    {(admProjects as any[]).map((p: any) => (
                      <SelectItem key={String(p.id)} value={String(p.id)}>{p.label}{p.klien ? ` (${p.klien})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Data kehadiran tukang di portal diambil dari projek ini.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Akun Portal */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Akun Portal Klien</h3>
            {!editAccount
              ? <Button size="sm" variant="outline" onClick={() => { setFormA({ password: "", is_active: project.account?.is_active ?? true }); setEditAccount(true); }}>
                  <Pencil className="w-3 h-3 mr-1" />Edit
                </Button>
              : <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditAccount(false)}><X className="w-3 h-3" /></Button>
                  <Button size="sm" disabled={savingA} onClick={() => saveAccount(formA)}><Save className="w-3 h-3 mr-1" />Simpan</Button>
                </div>
            }
          </div>
          {!editAccount ? (
            <dl className="space-y-3 text-sm">
              <div className="grid grid-cols-5 gap-2"><dt className="col-span-2 text-gray-500">Username</dt><dd className="col-span-3 font-mono font-medium">{project.account?.username ?? "-"}</dd></div>
              <div className="grid grid-cols-5 gap-2"><dt className="col-span-2 text-gray-500">Status Akun</dt>
                <dd className="col-span-3">
                  <Badge className={project.account?.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {project.account?.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </dd>
              </div>
              <div className="grid grid-cols-5 gap-2"><dt className="col-span-2 text-gray-500">Last Login</dt><dd className="col-span-3">{fmtDate(project.account?.last_login_at)}</dd></div>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                <p className="font-medium text-gray-700 mb-1">URL Portal Klien</p>
                <p className="font-mono break-all">{process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL ?? "http://localhost:3001"}</p>
              </div>
            </dl>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Reset Password (kosongkan jika tidak diubah)</Label>
                <Input type="password" value={formA.password} onChange={(e) => setFormA((f) => ({ ...f, password: e.target.value }))} placeholder="Password baru..." />
              </div>
              <div>
                <Label>Status Akun</Label>
                <Select value={formA.is_active ? "aktif" : "nonaktif"} onValueChange={(v) => setFormA((f) => ({ ...f, is_active: v === "aktif" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PEMBAYARAN (Invoice dari Finance)
// ─────────────────────────────────────────────────────────────────────────────
function TabPembayaran({ pid }: { pid: number }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ termin_ke: "", nama_termin: "", tagihan: "", retensi: "", status: "Belum Dibayar", jatuh_tempo: "", tanggal_bayar: "", catatan: "" });
  const [confirmDel, setConfirmDel] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["client-payments", pid], queryFn: () => clientApi.listPayments(pid) });
  const { data: invoices = [], isLoading: loadingInv } = useQuery({ queryKey: ["client-invoices", pid], queryFn: () => clientApi.listInvoices(pid) });

  function openCreate() { setEditing(null); setForm({ termin_ke: (items.length + 1).toString(), nama_termin: `Termin ${items.length + 1}`, tagihan: "", retensi: "0", status: "Belum Dibayar", jatuh_tempo: "", tanggal_bayar: "", catatan: "" }); setShowForm(true); }
  function openEdit(item: any) { setEditing(item); setForm({ termin_ke: item.termin_ke, nama_termin: item.nama_termin, tagihan: item.tagihan, retensi: item.retensi, status: item.status, jatuh_tempo: item.jatuh_tempo?.slice(0, 10) ?? "", tanggal_bayar: item.tanggal_bayar?.slice(0, 10) ?? "", catatan: item.catatan ?? "" }); setShowForm(true); }

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data: any) => editing ? clientApi.updatePayment(pid, editing.id, data) : clientApi.createPayment(pid, data),
    onSuccess: () => { toast.success(editing ? "Termin diperbarui" : "Termin ditambahkan"); qc.invalidateQueries({ queryKey: ["client-payments", pid] }); setShowForm(false); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: (id: number) => clientApi.deletePayment(pid, id),
    onSuccess: () => { toast.success("Termin dihapus"); qc.invalidateQueries({ queryKey: ["client-payments", pid] }); setConfirmDel(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus"),
  });

  const totalTagihan = items.reduce((s: number, i: any) => s + Number(i.tagihan), 0);
  const totalLunas = items.filter((i: any) => i.status === "Sudah Dibayar").reduce((s: number, i: any) => s + Number(i.tagihan), 0);

  const invStatusBg = (s: string) => s === "Lunas" ? "bg-green-100 text-green-700" : s === "Terbit" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700";

  return (
    <div className="space-y-6">
      {/* Invoice dari Finance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          Invoice Resmi (dari Finance)
        </h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tgl Terbit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInv ? <TableRow><TableCell colSpan={4}><Skeleton className="h-16" /></TableCell></TableRow>
                  : invoices.length === 0
                    ? <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-6 text-sm">Belum ada invoice yang ditandatangani</TableCell></TableRow>
                    : invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.nomor_invoice}</TableCell>
                        <TableCell className="font-medium">{fmtRp(inv.total)}</TableCell>
                        <TableCell><Badge className={invStatusBg(inv.status)}>{inv.status}</Badge></TableCell>
                        <TableCell>{fmtDate(inv.head_finance_signed_at)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Termin manual (internal) */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Termin Pembayaran (Internal)</h3>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>Total: <strong className="text-gray-800">{fmtRp(totalTagihan)}</strong></span>
            <span>Terbayar: <strong className="text-green-600">{fmtRp(totalLunas)}</strong></span>
            <span>Sisa: <strong className="text-red-600">{fmtRp(totalTagihan - totalLunas)}</strong></span>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Tambah Termin</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Termin</TableHead>
                  <TableHead>Tagihan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Tgl Bayar</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={7}><Skeleton className="h-16" /></TableCell></TableRow>
                  : items.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-6">Belum ada data termin</TableCell></TableRow>
                  : items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-medium">{item.termin_ke}</TableCell>
                      <TableCell>{item.nama_termin}</TableCell>
                      <TableCell className="font-medium">{fmtRp(item.tagihan)}</TableCell>
                      <TableCell>
                        <Badge className={item.status === "Sudah Dibayar" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{fmtDate(item.jatuh_tempo)}</TableCell>
                      <TableCell>{fmtDate(item.tanggal_bayar)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setConfirmDel(item)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Termin" : "Tambah Termin"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>No. Termin</Label><Input type="number" value={form.termin_ke} onChange={(e) => setForm((f: any) => ({ ...f, termin_ke: e.target.value }))} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_BAYAR.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Nama Termin</Label><Input value={form.nama_termin} onChange={(e) => setForm((f: any) => ({ ...f, nama_termin: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tagihan (Rp)</Label><Input type="number" value={form.tagihan} onChange={(e) => setForm((f: any) => ({ ...f, tagihan: e.target.value }))} /></div>
              <div><Label>Retensi (Rp)</Label><Input type="number" value={form.retensi} onChange={(e) => setForm((f: any) => ({ ...f, retensi: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jatuh Tempo</Label><Input type="date" value={form.jatuh_tempo} onChange={(e) => setForm((f: any) => ({ ...f, jatuh_tempo: e.target.value }))} /></div>
              <div><Label>Tgl Bayar</Label><Input type="date" value={form.tanggal_bayar} onChange={(e) => setForm((f: any) => ({ ...f, tanggal_bayar: e.target.value }))} /></div>
            </div>
            <div><Label>Catatan</Label><Textarea value={form.catatan} onChange={(e) => setForm((f: any) => ({ ...f, catatan: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={isPending} onClick={() => save(form)}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => del(confirmDel?.id)}
        title="Hapus Termin"
        description={`Hapus termin "${confirmDel?.nama_termin}"? Tindakan ini tidak dapat dibatalkan.`}
        loading={deleting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: GALERI — folder view
// ─────────────────────────────────────────────────────────────────────────────
function TabGaleri({ pid }: { pid: number }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [previews, setPreviews] = useState<string[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<any>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [confirmDelFolder, setConfirmDelFolder] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["client-galeri", pid], queryFn: () => clientApi.listGaleri(pid) });

  const { mutate: upload, isPending } = useMutation({
    mutationFn: (fd: FormData) => clientApi.uploadGaleri(pid, fd),
    onSuccess: (res: any) => {
      toast.success(res.message ?? "Foto berhasil diupload");
      qc.invalidateQueries({ queryKey: ["client-galeri", pid] });
      setJudul(""); setPreviews([]);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal upload"),
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: (id: number) => clientApi.deleteGaleri(pid, id),
    onSuccess: () => { toast.success("Foto dihapus"); qc.invalidateQueries({ queryKey: ["client-galeri", pid] }); setConfirmDel(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus"),
  });

  const { mutate: delFolder, isPending: deletingFolder } = useMutation({
    mutationFn: async (folderName: string) => {
      const folderItems = (items as any[]).filter((g) => (g.judul ?? "Tanpa Judul") === folderName);
      await Promise.all(folderItems.map((g: any) => clientApi.deleteGaleri(pid, g.id)));
    },
    onSuccess: () => {
      toast.success("Folder dihapus");
      qc.invalidateQueries({ queryKey: ["client-galeri", pid] });
      setConfirmDelFolder(null);
      if (openFolder === confirmDelFolder) setOpenFolder(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus folder"),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function handleUpload() {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) { toast.error("Pilih file terlebih dahulu"); return; }
    if (!judul.trim()) { toast.error("Judul folder wajib diisi"); return; }
    const fd = new FormData();
    files.forEach((f) => fd.append("foto", f));
    fd.append("judul", judul.trim());
    fd.append("tanggal_foto", tanggal);
    upload(fd);
  }

  // Group by judul
  const folders: Record<string, any[]> = {};
  for (const item of (items as any[])) {
    const key = item.judul ?? "Tanpa Judul";
    if (!folders[key]) folders[key] = [];
    folders[key].push(item);
  }
  const folderNames = Object.keys(folders);

  // If inside a folder
  const folderItems = openFolder ? (folders[openFolder] ?? []) : [];

  return (
    <div className="space-y-5">
      {/* Upload Form */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="font-medium text-gray-700 mb-3">Upload Foto ke Folder Baru</h3>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <Label>Judul Folder *</Label>
              <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Minggu 1 — Pondasi..." />
            </div>
            <div>
              <Label>Tanggal Foto</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> Pilih File
              </Button>
              <Button disabled={isPending} onClick={handleUpload}>{isPending ? "..." : "Upload"}</Button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
          {previews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {previews.map((p, i) => (
                <img key={i} src={p} alt={`preview ${i + 1}`} className="h-20 w-auto rounded-lg border object-cover" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? <Skeleton className="h-40" /> : (
        <>
          {/* Inside folder view */}
          {openFolder ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setOpenFolder(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Kembali
                </Button>
                <FolderOpen className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-gray-800">{openFolder}</span>
                <span className="text-xs text-gray-400">({folderItems.length} foto)</span>
                <Button
                  size="sm" variant="ghost" className="ml-auto text-red-500"
                  onClick={() => setConfirmDelFolder(openFolder)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />Hapus Folder
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folderItems.map((item: any) => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border bg-gray-50 aspect-video cursor-pointer" onClick={() => setLightbox(item)}>
                    {item.file_url
                      ? <img src={fileUrl(item.file_url) ?? ""} alt={item.judul ?? ""} className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center h-full"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                    }
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <Button size="icon" variant="destructive" className="h-7 w-7 self-end" onClick={(e) => { e.stopPropagation(); setConfirmDel(item); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <p className="text-white/70 text-xs">{fmtDate(item.tanggal_foto)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Folder grid */
            folderNames.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Belum ada foto. Upload foto ke folder baru di atas.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folderNames.map((name) => {
                  const folderPhotos = folders[name];
                  const cover = folderPhotos.find((g) => g.file_url);
                  return (
                    <div
                      key={name}
                      className="group relative rounded-xl overflow-hidden border bg-gray-50 cursor-pointer hover:shadow-md transition"
                      onClick={() => setOpenFolder(name)}
                    >
                      {/* Cover image */}
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        {cover
                          ? <img src={fileUrl(cover.file_url) ?? ""} alt={name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                          : <div className="flex items-center justify-center h-full"><ImageIcon className="w-10 h-10 text-gray-300" /></div>
                        }
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                        <div className="absolute top-2 right-2">
                          <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{folderPhotos.length} foto</span>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-4 h-4 text-orange-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                        </div>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition"
                          onClick={(e) => { e.stopPropagation(); setConfirmDelFolder(name); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(v) => { if (!v) setLightbox(null); }}>
        <DialogContent className="max-w-3xl p-2 bg-black/90">
          {lightbox?.file_url && (
            <img src={fileUrl(lightbox.file_url) ?? ""} alt={lightbox.judul ?? ""} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          )}
          <p className="text-white/70 text-xs text-center mt-1">{fmtDate(lightbox?.tanggal_foto)}</p>
        </DialogContent>
      </Dialog>

      {/* Confirm hapus foto */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => del(confirmDel?.id)}
        title="Hapus Foto"
        description="Hapus foto ini? Tindakan ini tidak dapat dibatalkan."
        loading={deleting}
      />

      {/* Confirm hapus folder */}
      <ConfirmDialog
        open={!!confirmDelFolder}
        onClose={() => setConfirmDelFolder(null)}
        onConfirm={() => delFolder(confirmDelFolder!)}
        title="Hapus Folder"
        description={`Hapus folder "${confirmDelFolder}" beserta semua foto di dalamnya? Tindakan ini tidak dapat dibatalkan.`}
        loading={deletingFolder}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: DOKUMEN — folder view
// ─────────────────────────────────────────────────────────────────────────────
function TabDokumen({ pid }: { pid: number }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folderName, setFolderName] = useState("");
  const [kategori, setKategori] = useState("Umum");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [confirmDelFolder, setConfirmDelFolder] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["client-dokumen", pid], queryFn: () => clientApi.listDokumen(pid) });

  const { mutate: upload, isPending } = useMutation({
    mutationFn: (fd: FormData) => clientApi.uploadDokumen(pid, fd),
    onSuccess: (res: any) => {
      toast.success(res.message ?? "Dokumen berhasil diupload");
      qc.invalidateQueries({ queryKey: ["client-dokumen", pid] });
      setSelectedNames([]);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal upload"),
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: (id: number) => clientApi.deleteDokumen(pid, id),
    onSuccess: () => { toast.success("Dokumen dihapus"); qc.invalidateQueries({ queryKey: ["client-dokumen", pid] }); setConfirmDel(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus"),
  });

  const { mutate: delFolder, isPending: deletingFolder } = useMutation({
    mutationFn: async (fName: string) => {
      const folderItems = (items as any[]).filter((d) => (d.folder_name ?? "Tanpa Folder") === fName);
      await Promise.all(folderItems.map((d: any) => clientApi.deleteDokumen(pid, d.id)));
    },
    onSuccess: () => {
      toast.success("Folder dihapus");
      qc.invalidateQueries({ queryKey: ["client-dokumen", pid] });
      setConfirmDelFolder(null);
      if (openFolder === confirmDelFolder) setOpenFolder(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus folder"),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedNames(Array.from(e.target.files ?? []).map((f) => f.name));
  }

  function handleUpload() {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) { toast.error("Pilih file terlebih dahulu"); return; }
    if (!folderName.trim()) { toast.error("Judul folder wajib diisi"); return; }
    const fd = new FormData();
    files.forEach((f) => fd.append("file", f));
    fd.append("folder_name", folderName.trim());
    fd.append("kategori", kategori);
    fd.append("tanggal_upload", tanggal);
    upload(fd);
  }

  const KATEGORI = ["Umum", "Kontrak", "RAB", "Gambar Kerja", "Izin", "Lainnya"];

  // Group by folder_name
  const folders: Record<string, any[]> = {};
  for (const item of (items as any[])) {
    const key = item.folder_name ?? "Tanpa Folder";
    if (!folders[key]) folders[key] = [];
    folders[key].push(item);
  }
  const folderNames = Object.keys(folders);
  const folderItems = openFolder ? (folders[openFolder] ?? []) : [];

  return (
    <div className="space-y-5">
      {/* Upload Form */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="font-medium text-gray-700 mb-3">Upload Dokumen ke Folder Baru</h3>
          <div className="grid grid-cols-4 gap-3 items-end">
            <div>
              <Label>Judul Folder *</Label>
              <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Dokumen Kontrak..." />
            </div>
            <div><Label>Kategori</Label>
              <Select value={kategori} onValueChange={setKategori}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KATEGORI.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tanggal Upload</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
            <div className="flex gap-2 items-end">
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Pilih File</Button>
              <Button disabled={isPending} onClick={handleUpload}>{isPending ? "..." : "Upload"}</Button>
            </div>
          </div>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
          {selectedNames.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedNames.map((n, i) => <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{n}</span>)}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? <Skeleton className="h-40" /> : (
        <>
          {/* Inside folder view */}
          {openFolder ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setOpenFolder(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Kembali
                </Button>
                <FolderOpen className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-gray-800">{openFolder}</span>
                <span className="text-xs text-gray-400">({folderItems.length} dokumen)</span>
                <Button
                  size="sm" variant="ghost" className="ml-auto text-red-500"
                  onClick={() => setConfirmDelFolder(openFolder)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />Hapus Folder
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Nama File</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Tgl Upload</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {folderItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />{item.nama_file}</TableCell>
                          <TableCell><Badge variant="outline">{item.kategori}</Badge></TableCell>
                          <TableCell>{fmtDate(item.tanggal_upload)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {item.file_url && <a href={fileUrl(item.file_url) ?? "#"} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="ghost" className="h-7 w-7"><Eye className="w-3 h-3" /></Button></a>}
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setConfirmDel(item)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Folder grid */
            folderNames.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Belum ada dokumen. Upload ke folder baru di atas.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folderNames.map((name) => {
                  const fItems = folders[name];
                  return (
                    <div
                      key={name}
                      className="group relative rounded-xl border bg-white p-4 cursor-pointer hover:shadow-md transition flex flex-col gap-3"
                      onClick={() => setOpenFolder(name)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-3 bg-orange-50 rounded-xl">
                          <Folder className="w-8 h-8 text-orange-400" />
                        </div>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition"
                          onClick={(e) => { e.stopPropagation(); setConfirmDelFolder(name); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 text-sm truncate">{name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fItems.length} dokumen</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}

      {/* Confirm hapus dokumen */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => del(confirmDel?.id)}
        title="Hapus Dokumen"
        description={`Hapus dokumen "${confirmDel?.nama_file}"? Tindakan ini tidak dapat dibatalkan.`}
        loading={deleting}
      />

      {/* Confirm hapus folder */}
      <ConfirmDialog
        open={!!confirmDelFolder}
        onClose={() => setConfirmDelFolder(null)}
        onConfirm={() => delFolder(confirmDelFolder!)}
        title="Hapus Folder"
        description={`Hapus folder "${confirmDelFolder}" beserta semua dokumen di dalamnya? Tindakan ini tidak dapat dibatalkan.`}
        loading={deletingFolder}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: AKTIVITAS (dengan tanggal mulai, selesai, foto progress)
// ─────────────────────────────────────────────────────────────────────────────
function TabAktivitas({ pid }: { pid: number }) {
  const qc = useQueryClient();
  const fotoRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ judul: "", tanggal_mulai: "", tanggal_selesai: "", deskripsi: "", status: "Dalam Proses" });
  const [hasFoto, setHasFoto] = useState(false);
  const [confirmDel, setConfirmDel] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["client-aktivitas", pid], queryFn: () => clientApi.listAktivitas(pid) });

  function openCreate() {
    setEditing(null);
    setForm({ judul: "", tanggal_mulai: new Date().toISOString().slice(0, 10), tanggal_selesai: "", deskripsi: "", status: "Dalam Proses" });
    setHasFoto(false);
    if (fotoRef.current) fotoRef.current.value = "";
    setShowForm(true);
  }
  function openEdit(item: any) {
    setEditing(item);
    setForm({
      judul: item.judul,
      tanggal_mulai: item.tanggal_mulai?.slice(0, 10) ?? item.tanggal?.slice(0, 10) ?? "",
      tanggal_selesai: item.tanggal_selesai?.slice(0, 10) ?? "",
      deskripsi: item.deskripsi ?? "",
      status: item.status,
    });
    setHasFoto(false);
    if (fotoRef.current) fotoRef.current.value = "";
    setShowForm(true);
  }

  const { mutate: save, isPending } = useMutation({
    mutationFn: (fd: FormData) => editing
      ? clientApi.updateAktivitas(pid, editing.id, fd as any)
      : clientApi.createAktivitas(pid, fd as any),
    onSuccess: () => {
      toast.success("Aktivitas disimpan");
      qc.invalidateQueries({ queryKey: ["client-aktivitas", pid] });
      qc.invalidateQueries({ queryKey: ["client-project", pid] });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: (id: number) => clientApi.deleteAktivitas(pid, id),
    onSuccess: () => {
      toast.success("Aktivitas dihapus");
      qc.invalidateQueries({ queryKey: ["client-aktivitas", pid] });
      qc.invalidateQueries({ queryKey: ["client-project", pid] });
      setConfirmDel(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  function handleSave() {
    if (!form.judul) { toast.error("Nama aktivitas wajib diisi"); return; }
    const fd = new FormData();
    fd.append("judul", form.judul);
    if (form.tanggal_mulai) fd.append("tanggal_mulai", form.tanggal_mulai);
    if (form.tanggal_selesai) fd.append("tanggal_selesai", form.tanggal_selesai);
    fd.append("deskripsi", form.deskripsi ?? "");
    fd.append("status", form.status);
    const fotoFile = fotoRef.current?.files?.[0];
    if (fotoFile) fd.append("foto_progress", fotoFile);
    save(fd);
  }

  const statusColor = (s: string) => s === "Selesai" ? "bg-green-100 text-green-700" : s === "Tertunda" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";

  const totalAktivitas = items.length;
  const selesai = items.filter((i: any) => i.status === "Selesai").length;
  const progressPersen = totalAktivitas > 0 ? Math.round((selesai / totalAktivitas) * 100) : 0;

  return (
    <div className="space-y-4">
      {totalAktivitas > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-6">
          <div className="text-sm"><span className="text-gray-500">Total Aktivitas: </span><strong>{totalAktivitas}</strong></div>
          <div className="text-sm"><span className="text-gray-500">Selesai: </span><strong className="text-green-600">{selesai}</strong></div>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${progressPersen}%` }} />
            </div>
            <span className="text-sm font-semibold text-green-600">{progressPersen}%</span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Tambah Aktivitas</Button>
      </div>

      {isLoading ? <Skeleton className="h-40" /> : (
        <div className="space-y-3">
          {items.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada riwayat aktivitas</p>}
          {items.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(item.status)}`}>{item.status}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.tanggal_mulai ? fmtDate(item.tanggal_mulai) : fmtDate(item.tanggal)}
                        {item.tanggal_selesai && <> → {fmtDate(item.tanggal_selesai)}</>}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800 truncate">{item.judul}</p>
                    {item.deskripsi && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.deskripsi}</p>}
                    {item.foto_url && (
                      <a href={fileUrl(item.foto_url) ?? "#"} target="_blank" rel="noopener noreferrer">
                        <img src={fileUrl(item.foto_url) ?? ""} alt="foto progress" className="mt-2 h-16 w-auto rounded-lg border object-cover" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setConfirmDel(item)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Aktivitas" : "Tambah Aktivitas"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Aktivitas *</Label><Input value={form.judul} onChange={(e) => setForm((f: any) => ({ ...f, judul: e.target.value }))} placeholder="Pemasangan keramik lantai 2..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal Mulai</Label><Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm((f: any) => ({ ...f, tanggal_mulai: e.target.value }))} /></div>
              <div><Label>Tanggal Selesai</Label><Input type="date" value={form.tanggal_selesai} onChange={(e) => setForm((f: any) => ({ ...f, tanggal_selesai: e.target.value }))} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_PEKERJAAN.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Catatan</Label><Textarea value={form.deskripsi} onChange={(e) => setForm((f: any) => ({ ...f, deskripsi: e.target.value }))} rows={2} placeholder="Catatan atau keterangan..." /></div>
            <div>
              <Label>Upload Foto Progress (opsional)</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => fotoRef.current?.click()}>
                  <Upload className="w-3 h-3 mr-1" />{hasFoto ? "Ganti Foto" : "Pilih Foto"}
                </Button>
                {hasFoto && <span className="text-xs text-green-600 self-center">Foto dipilih</span>}
              </div>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setHasFoto(!!e.target.files?.length)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={isPending || !form.judul} onClick={handleSave}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => del(confirmDel?.id)}
        title="Hapus Aktivitas"
        description={`Hapus aktivitas "${confirmDel?.judul}"? Tindakan ini tidak dapat dibatalkan.`}
        loading={deleting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: KONTAK
// ─────────────────────────────────────────────────────────────────────────────
function TabKontak({ pid }: { pid: number }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ role: "PIC Proyek", nama: "", telepon: "", whatsapp: "", email: "", urutan: 0 });
  const [confirmDel, setConfirmDel] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["client-kontak", pid], queryFn: () => clientApi.listKontak(pid) });

  function openCreate() { setEditing(null); setForm({ role: "PIC Proyek", nama: "", telepon: "", whatsapp: "", email: "", urutan: items.length }); setShowForm(true); }
  function openEdit(item: any) { setEditing(item); setForm({ role: item.role, nama: item.nama, telepon: item.telepon ?? "", whatsapp: item.whatsapp ?? "", email: item.email ?? "", urutan: item.urutan }); setShowForm(true); }

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data: any) => editing ? clientApi.updateKontak(pid, editing.id, data) : clientApi.createKontak(pid, data),
    onSuccess: () => { toast.success("Kontak disimpan"); qc.invalidateQueries({ queryKey: ["client-kontak", pid] }); setShowForm(false); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: (id: number) => clientApi.deleteKontak(pid, id),
    onSuccess: () => { toast.success("Kontak dihapus"); qc.invalidateQueries({ queryKey: ["client-kontak", pid] }); setConfirmDel(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Tambah Kontak</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <Skeleton className="h-32" /> : items.length === 0 ? <p className="col-span-3 text-center text-gray-400 py-8">Belum ada kontak</p>
          : items.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="pt-4 pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-xs">{item.role}</Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setConfirmDel(item)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <p className="font-semibold text-gray-800">{item.nama}</p>
                {item.telepon && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{item.telepon}</p>}
                {item.whatsapp && <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3 text-green-500" />{item.whatsapp}</p>}
                {item.email && <p className="text-sm text-gray-500 text-xs mt-1">{item.email}</p>}
              </CardContent>
            </Card>
          ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Kontak" : "Tambah Kontak"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f: any) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["PIC Proyek", "Sales", "Admin", "Finance", "Lainnya"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nama</Label><Input value={form.nama} onChange={(e) => setForm((f: any) => ({ ...f, nama: e.target.value }))} placeholder="Nama lengkap..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telepon</Label><Input value={form.telepon} onChange={(e) => setForm((f: any) => ({ ...f, telepon: e.target.value }))} placeholder="021-xxxx" /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm((f: any) => ({ ...f, whatsapp: e.target.value }))} placeholder="08xx" /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={isPending || !form.nama} onClick={() => save(form)}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => del(confirmDel?.id)}
        title="Hapus Kontak"
        description={`Hapus kontak "${confirmDel?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        loading={deleting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: KEHADIRAN TUKANG
// ─────────────────────────────────────────────────────────────────────────────
function TabKehadiran({ pid }: { pid: number }) {
  const [tglMulai, setTglMulai] = useState("");
  const [tglSelesai, setTglSelesai] = useState("");

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["client-kehadiran", pid, tglMulai, tglSelesai],
    queryFn: () => clientApi.listKehadiran(pid, tglMulai && tglSelesai ? { tanggal_mulai: tglMulai, tanggal_selesai: tglSelesai } : undefined),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div><Label>Dari Tanggal</Label><Input type="date" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} /></div>
        <div><Label>Sampai Tanggal</Label><Input type="date" value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} /></div>
        <Button variant="outline" onClick={() => refetch()}>Filter</Button>
      </div>

      {isLoading ? <Skeleton className="h-40" />
        : !items.length ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Belum ada data kehadiran (pastikan project sudah dihubungkan ke Adm Projek)
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((absen: any) => (
              <Card key={absen.id}>
                <CardContent className="py-3 px-4">
                  <p className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {fmtDate(absen.tanggal)}
                    {absen.keterangan && <span className="text-sm text-gray-400">— {absen.keterangan}</span>}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {absen.items?.map((item: any) => (
                      <div key={item.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${item.hadir ? "bg-green-50" : "bg-gray-50"}`}>
                        <div className={`w-2 h-2 rounded-full ${item.hadir ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className="font-medium truncate">{item.tukang_name ?? "Tukang"}</span>
                        <span className={`ml-auto text-xs ${item.hadir ? "text-green-600" : "text-gray-400"}`}>{item.hadir ? "Hadir" : "Tidak"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ASSIGN INVOICE KE PORTAL KLIEN
// ─────────────────────────────────────────────────────────────────────────────
function TabInvoiceAssign({ pid }: { pid: number }) {
  const qc = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["client-assignable-invoices", pid],
    queryFn: () => clientApi.listAssignableInvoices(pid),
  });

  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: ({ invId }: { invId: number }) => clientApi.assignInvoice(pid, invId),
    onSuccess: () => { toast.success("Invoice berhasil di-assign"); qc.invalidateQueries({ queryKey: ["client-assignable-invoices", pid] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal assign"),
  });

  const { mutate: unassign, isPending: unassigning } = useMutation({
    mutationFn: ({ invId }: { invId: number }) => clientApi.unassignInvoice(pid, invId),
    onSuccess: () => { toast.success("Invoice berhasil di-unassign"); qc.invalidateQueries({ queryKey: ["client-assignable-invoices", pid] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal unassign"),
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-3 rounded-xl">
        <p className="font-medium mb-1">Cara kerja Invoice Portal Klien</p>
        <p className="text-xs text-blue-600">
          Invoice yang sudah ditandatangani (Head Finance + Admin Finance) dapat di-assign ke portal klien.
          Setelah di-assign, tagihan akan otomatis muncul di menu Pembayaran portal klien.
          Saat invoice Lunas (kwitansi dibuat), status pembayaran di portal otomatis berubah menjadi &quot;Sudah Dibayar&quot;.
        </p>
      </div>

      {isLoading ? <Skeleton className="h-40" /> : invoices.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          Belum ada invoice Terbit/Lunas untuk proyek ini.<br />
          <span className="text-xs">Invoice harus sudah ditandatangani oleh Head Finance dan Admin Finance.</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status Portal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoice_number ?? `INV-${inv.id}`}</TableCell>
                <TableCell>{fmtRp(inv.grand_total)}</TableCell>
                <TableCell>
                  <Badge variant={inv.status === "Lunas" ? "default" : "outline"}>{inv.status}</Badge>
                </TableCell>
                <TableCell>{fmtDate(inv.tanggal)}</TableCell>
                <TableCell>
                  {inv.is_assigned
                    ? <Badge className="bg-green-100 text-green-700 border-0">Ditampilkan di Portal</Badge>
                    : <Badge variant="secondary">Belum di-assign</Badge>
                  }
                </TableCell>
                <TableCell className="text-right">
                  {inv.is_assigned ? (
                    <Button
                      size="sm" variant="outline"
                      disabled={unassigning}
                      onClick={() => unassign({ invId: inv.id })}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-3 h-3 mr-1" />Cabut
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={assigning}
                      onClick={() => assign({ invId: inv.id })}
                    >
                      <Plus className="w-3 h-3 mr-1" />Assign ke Portal
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CCTV ONLINE SETUP
// ─────────────────────────────────────────────────────────────────────────────
const STREAM_TYPES = [
  { value: "youtube", label: "YouTube Live" },
  { value: "rtsp", label: "RTSP (Tapo C310, IP Cam)" },
  { value: "iframe", label: "Iframe Embed (URL kustom)" },
];

function TabCctv({ pid }: { pid: number }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nama: "", stream_url: "", stream_type: "youtube", is_active: true, urutan: 0 });
  const [confirmDel, setConfirmDel] = useState<any>(null);

  const { data: streams = [], isLoading } = useQuery({
    queryKey: ["client-cctv", pid],
    queryFn: () => clientApi.listCctv(pid),
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data: any) => editId ? clientApi.updateCctv(pid, editId, data) : clientApi.createCctv(pid, data),
    onSuccess: () => {
      toast.success(editId ? "Stream diupdate" : "Stream ditambahkan");
      qc.invalidateQueries({ queryKey: ["client-cctv", pid] });
      setShowForm(false); setEditId(null);
      setForm({ nama: "", stream_url: "", stream_type: "youtube", is_active: true, urutan: 0 });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  const { mutate: del, isPending: deleting } = useMutation({
    mutationFn: (sid: number) => clientApi.deleteCctv(pid, sid),
    onSuccess: () => { toast.success("Stream dihapus"); qc.invalidateQueries({ queryKey: ["client-cctv", pid] }); setConfirmDel(null); },
  });

  function startEdit(s: any) {
    setEditId(s.id);
    setForm({ nama: s.nama, stream_url: s.stream_url, stream_type: s.stream_type, is_active: s.is_active, urutan: s.urutan });
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600 font-medium">Kamera CCTV Online</p>
          <p className="text-xs text-gray-400">Klien dapat melihat live stream di menu Monitoring.</p>
        </div>
        <Button size="sm" onClick={() => { setEditId(null); setForm({ nama: "", stream_url: "", stream_type: "youtube", is_active: true, urutan: 0 }); setShowForm(true); }}>
          <Plus className="w-3 h-3 mr-1" />Tambah Kamera
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 space-y-1">
        <p className="font-semibold">Panduan per tipe kamera:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong>YouTube Live:</strong> Masukkan URL video YouTube Live (contoh: https://youtu.be/xxxxx)</li>
          <li><strong>RTSP (Tapo C310):</strong> Masukkan URL RTSP kamera. Kamera akan di-stream via MediaMTX sehingga klien bisa menonton langsung di browser tanpa install app. Jalankan <code className="bg-amber-100 px-1 rounded">npm run dev:cctv</code> di folder backend agar MediaMTX aktif.</li>
          <li><strong>Iframe:</strong> Masukkan URL halaman web yang bisa di-embed.</li>
        </ul>
        <p className="text-amber-600 mt-1">Testing tanpa kamera fisik: gunakan RTSP publik <code className="bg-amber-100 px-1 rounded">rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov</code></p>
      </div>

      {/* Live Preview */}
      {!isLoading && streams.filter((s: any) => s.is_active).length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Live Preview</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {streams.filter((s: any) => s.is_active).map((s: any) => {
              const embedUrl = (() => {
                if (s.stream_type === "youtube") {
                  const ytMatch = s.stream_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
                  return ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1` : null;
                }
                if (s.stream_type === "iframe") return s.stream_url;
                return null; // rtsp handled separately
              })();
              return (
                <div key={s.id} className="border rounded-xl overflow-hidden bg-black">
                  <div className="bg-gray-900 px-3 py-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-gray-200 font-medium">{s.nama}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto border-gray-600 text-gray-300">{STREAM_TYPES.find(t => t.value === s.stream_type)?.label ?? s.stream_type}</Badge>
                  </div>
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full aspect-video"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center text-gray-400 text-xs gap-2 px-4 text-center">
                      <p className="text-gray-300 font-medium">Stream RTSP</p>
                      <p>Untuk menonton RTSP di browser, jalankan MediaMTX di backend.</p>
                      <code className="bg-gray-800 px-2 py-1 rounded text-[10px] text-green-400 break-all">{s.stream_url}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">Konfigurasi Kamera</p>
      </div>

      {isLoading ? <Skeleton className="h-40" /> : streams.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Belum ada kamera. Klik &quot;Tambah Kamera&quot; untuk memulai.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Kamera</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urutan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nama}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{STREAM_TYPES.find(t => t.value === s.stream_type)?.label ?? s.stream_type}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="text-xs text-gray-500 truncate block">{s.stream_url}</span>
                </TableCell>
                <TableCell>
                  <Badge className={s.is_active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-500 border-0"}>
                    {s.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell>{s.urutan}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setConfirmDel(s)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Kamera" : "Tambah Kamera CCTV"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Kamera</Label><Input placeholder="contoh: Kamera Depan" value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} /></div>
            <div>
              <Label>Tipe Stream</Label>
              <Select value={form.stream_type} onValueChange={(v) => setForm((f) => ({ ...f, stream_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STREAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL Stream</Label>
              <Textarea
                placeholder={
                  form.stream_type === "youtube" ? "https://youtu.be/xxxxx" :
                  form.stream_type === "rtsp" ? "rtsp://admin:password@192.168.1.100:554/stream1" :
                  "https://..."
                }
                value={form.stream_url}
                onChange={(e) => setForm((f) => ({ ...f, stream_url: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Urutan</Label><Input type="number" value={form.urutan} onChange={(e) => setForm((f) => ({ ...f, urutan: Number(e.target.value) }))} /></div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
                <Label htmlFor="is_active">Aktif</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={isPending || !form.nama || !form.stream_url} onClick={() => save(form)}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => del(confirmDel?.id)}
        title="Hapus Kamera"
        description={`Hapus kamera "${confirmDel?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        loading={deleting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pid = Number(id);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [confirmDelProject, setConfirmDelProject] = useState(false);
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["client-project", pid],
    queryFn: () => clientApi.getProject(pid),
  });

  const { mutate: delProject, isPending: deletingProject } = useMutation({
    mutationFn: () => clientApi.deleteProject(pid),
    onSuccess: () => { toast.success("Data klien berhasil dihapus"); router.push("/client"); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus"),
  });

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64" />
    </div>
  );

  if (!project) return (
    <div className="p-6 text-center text-gray-400">
      <p>Project tidak ditemukan.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push("/client")}>Kembali</Button>
    </div>
  );

  const statusBg = project.status_proyek === "Selesai" ? "bg-green-100 text-green-700" : project.status_proyek === "Ditunda" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/client")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{project.nama_proyek}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg}`}>{project.status_proyek}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{project.klien} {project.alamat ? `• ${project.alamat}` : ""}</p>
          </div>
        </div>
        {/* Progress bar + delete */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-gray-500">Progress</span>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${project.progress_persen}%` }} />
          </div>
          <span className="text-sm font-semibold text-teal-600">{project.progress_persen}%</span>
          {isSuperAdmin && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmDelProject(true)}>
              <Trash2 className="w-3 h-3 mr-1" />Hapus Klien
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="info"><User className="w-3 h-3 mr-1" />Info</TabsTrigger>
          <TabsTrigger value="pembayaran"><TrendingUp className="w-3 h-3 mr-1" />Pembayaran</TabsTrigger>
          <TabsTrigger value="galeri"><ImageIcon className="w-3 h-3 mr-1" />Galeri</TabsTrigger>
          <TabsTrigger value="dokumen"><FileText className="w-3 h-3 mr-1" />Dokumen</TabsTrigger>
          <TabsTrigger value="aktivitas"><Calendar className="w-3 h-3 mr-1" />Aktivitas</TabsTrigger>
          <TabsTrigger value="kontak"><Phone className="w-3 h-3 mr-1" />Kontak</TabsTrigger>
          <TabsTrigger value="kehadiran"><Users className="w-3 h-3 mr-1" />Kehadiran</TabsTrigger>
          <TabsTrigger value="invoice"><Receipt className="w-3 h-3 mr-1" />Invoice Portal</TabsTrigger>
          <TabsTrigger value="cctv"><Video className="w-3 h-3 mr-1" />CCTV Online</TabsTrigger>
        </TabsList>

        <div className="mt-5">
          <TabsContent value="info"><TabInfo pid={pid} project={project} /></TabsContent>
          <TabsContent value="pembayaran"><TabPembayaran pid={pid} /></TabsContent>
          <TabsContent value="galeri"><TabGaleri pid={pid} /></TabsContent>
          <TabsContent value="dokumen"><TabDokumen pid={pid} /></TabsContent>
          <TabsContent value="aktivitas"><TabAktivitas pid={pid} /></TabsContent>
          <TabsContent value="kontak"><TabKontak pid={pid} /></TabsContent>
          <TabsContent value="kehadiran"><TabKehadiran pid={pid} /></TabsContent>
          <TabsContent value="invoice"><TabInvoiceAssign pid={pid} /></TabsContent>
          <TabsContent value="cctv"><TabCctv pid={pid} /></TabsContent>
        </div>
      </Tabs>

      <ConfirmDialog
        open={confirmDelProject}
        onClose={() => setConfirmDelProject(false)}
        onConfirm={() => delProject()}
        title="Hapus Data Klien"
        description={`Hapus seluruh data klien "${project.klien}" termasuk akun portal, galeri, dokumen, dan semua data terkait? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Permanen"
        loading={deletingProject}
      />
    </div>
  );
}
