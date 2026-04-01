"use client";
import { getLogoBase64 } from "@/lib/get-logo";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Calculator, ChevronLeft, ChevronRight, Trash2, Truck, UserCheck, Banknote, Receipt,
  TrendingUp, Package, ClipboardList, Upload, Eye, Pencil, CheckCircle, XCircle,
  ArrowRight, FileDown, PenLine, Wallet, ShieldCheck, Camera, Images, X, Loader2,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import dynamic from "next/dynamic";
import { SignatureDialog } from "@/components/signature-dialog";

const CashflowTerminPDF = dynamic(() => import("@/components/cashflow-termin-pdf"), { ssr: false });
const CashflowOverviewPDF = dynamic(() => import("@/components/cashflow-overview-pdf"), { ssr: false });
const PRPDF = dynamic(() => import("@/components/pr-pdf"), { ssr: false });

const SuratJalanPDF = dynamic(() => import("@/components/surat-jalan-pdf"), { ssr: false });

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatRp(val: number | string) {
  return "Rp " + (Number(val) || 0).toLocaleString("id-ID");
}

const today = new Date().toISOString().split("T")[0];

const KODE_OPTIONS = ["MTR", "OP", "MPH", "MPM", "TOOLS", "DESIGN", "BG"];

// ─── API ─────────────────────────────────────────────────────────────────────

const admApi = {
  listProyek: () =>
    apiClient.get("/finance/adm-projek").then((r) => r.data),
  createProyek: (data: any) =>
    apiClient.post("/finance/adm-projek", data).then((r) => r.data),
  updateProyek: (id: number, data: any) =>
    apiClient.patch(`/finance/adm-projek/${id}`, data).then((r) => r.data),
  deleteProyek: (id: number) =>
    apiClient.delete(`/finance/adm-projek/${id}`).then((r) => r.data),
  proyekBerjalanOptions: () =>
    apiClient.get("/finance/adm-projek/proyek-berjalan-options").then((r) => r.data),
  getRappItems: (id: number) =>
    apiClient.get("/finance/adm-projek/" + id + "/rapp-items").then((r) => r.data),
  klienOptions: () =>
    apiClient.get("/finance/adm-projek/klien-options").then((r) => r.data),

  // Cashflow
  getCashflow: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/cashflow`).then((r) => r.data),
  addCashflow: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/cashflow`, data).then((r) => r.data),
  deleteCashflow: (id: number, cid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/cashflow/${cid}`).then((r) => r.data),

  // List Material (Toko + Items hierarchy)
  getListMaterial: (id: number, params?: Record<string, string>) => {
    const qs = params && Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
    return apiClient.get(`/finance/adm-projek/${id}/list-material${qs}`).then((r) => r.data);
  },
  createToko: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/list-material`, data).then((r) => r.data),
  updateToko: (id: number, mid: number, data: any) =>
    apiClient.put(`/finance/adm-projek/${id}/list-material/${mid}`, data).then((r) => r.data),
  deleteToko: (id: number, mid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/list-material/${mid}`).then((r) => r.data),
  addTokoItem: (id: number, mid: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/list-material/${mid}/items`, data).then((r) => r.data),
  updateTokoItem: (id: number, mid: number, iid: number, data: any) =>
    apiClient.put(`/finance/adm-projek/${id}/list-material/${mid}/items/${iid}`, data).then((r) => r.data),
  deleteTokoItem: (id: number, mid: number, iid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/list-material/${mid}/items/${iid}`).then((r) => r.data),

  // Termins (cashflow per-termin)
  getTermins: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/termins`).then((r) => r.data),
  createTermin: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/termins`, data).then((r) => r.data),
  updateTermin: (id: number, tid: number, data: any) =>
    apiClient.patch(`/finance/adm-projek/${id}/termins/${tid}`, data).then((r) => r.data),
  deleteTermin: (id: number, tid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/termins/${tid}`).then((r) => r.data),
  signDeposit: (id: number, tid: number, data: { hf_signature?: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/termins/${tid}/sign-deposit`, data).then((r) => r.data),
  addExtraDeposit: (id: number, tid: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/termins/${tid}/extra-deposit`, data).then((r) => r.data),
  signExtraDeposit: (id: number, tid: number, did: number, data: { hf_signature?: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/termins/${tid}/extra-deposit/${did}/sign`, data).then((r) => r.data),
  deleteExtraDeposit: (id: number, tid: number, did: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/termins/${tid}/extra-deposit/${did}`).then((r) => r.data),
  getTerminCashflow: (id: number, tid: number) =>
    apiClient.get(`/finance/adm-projek/${id}/termins/${tid}/cashflow`).then((r) => r.data),
  pullPRtoCashflow: (id: number, tid: number, data: { projek_pr_id: number | null; tanggal: string; nota_image?: string | null }) =>
    apiClient.post(`/finance/adm-projek/${id}/termins/${tid}/cashflow`, data).then((r) => r.data),
  deleteTerminCashflow: (id: number, tid: number, cid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/termins/${tid}/cashflow/${cid}`).then((r) => r.data),
  getAvailablePR: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/pr/available`).then((r) => r.data),
  getTerminPdfData: (id: number, tid: number) =>
    apiClient.get(`/finance/adm-projek/${id}/termins/${tid}/pdf-data`).then((r) => r.data),
  getCashflowOverviewPdfData: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/cashflow-overview/pdf-data`).then((r) => r.data),
  getMaterialPdfData: (id: number, params?: Record<string, string>) => {
    const qs = params && Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
    return apiClient.get(`/finance/adm-projek/${id}/list-material/pdf-data${qs}`).then((r) => r.data);
  },
  getPRPdfData: (id: number, pid: number) =>
    apiClient.get(`/finance/adm-projek/${id}/pr/${pid}/pdf-data`).then((r) => r.data),

  // PR
  getPR: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/pr`).then((r) => r.data),
  addPR: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/pr`, data).then((r) => r.data),
  updatePRStatus: (id: number, pid: number, data: any) =>
    apiClient.patch(`/finance/adm-projek/${id}/pr/${pid}/status`, data).then((r) => r.data),
  signPR: (id: number, pid: number, data: { hf_signature?: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/pr/${pid}/sign`, data).then((r) => r.data),
  updatePR: (id: number, pid: number, data: any) =>
    apiClient.put(`/finance/adm-projek/${id}/pr/${pid}`, data).then((r) => r.data),
  deletePR: (id: number, pid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/pr/${pid}`).then((r) => r.data),

  // Dokumen
  getDokumen: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/dokumen`).then((r) => r.data),
  getDokumenFile: (id: number, did: number) =>
    apiClient.get(`/finance/adm-projek/${id}/dokumen/${did}`).then((r) => r.data),
  uploadDokumen: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/dokumen`, data).then((r) => r.data),
  deleteDokumen: (id: number, did: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/dokumen/${did}`).then((r) => r.data),

  // existing sub-resources
  getSuratJalan: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/surat-jalan`).then((r) => r.data),
  getSuratJalanDetail: (id: number, sid: number) =>
    apiClient.get(`/finance/adm-projek/${id}/surat-jalan/${sid}`).then((r) => r.data),
  addSuratJalan: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/surat-jalan`, data).then((r) => r.data),
  deleteSuratJalan: (id: number, sid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/surat-jalan/${sid}`).then((r) => r.data),
  signSuratJalan: (id: number, sid: number, data: { af_signature: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/surat-jalan/${sid}/sign-af`, data).then((r) => r.data),
  getSuratJalanPdfData: (id: number, sid: number) =>
    apiClient.get(`/finance/adm-projek/${id}/surat-jalan/${sid}/pdf-data`).then((r) => r.data),

  // Tukang registry
  getTukangUsers: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/tukang/available-users`).then((r) => r.data),
  getTukangRegistry: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/tukang/registry`).then((r) => r.data),
  addTukang: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/registry`, data).then((r) => r.data),
  updateTukang: (id: number, tid: number, data: any) =>
    apiClient.patch(`/finance/adm-projek/${id}/tukang/registry/${tid}`, data).then((r) => r.data),
  deleteTukang: (id: number, tid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/tukang/registry/${tid}`).then((r) => r.data),

  // Absen foto
  getAbsenFoto: (id: number, params?: Record<string, string>) => {
    const qs = params && Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
    return apiClient.get(`/finance/adm-projek/${id}/tukang/absen-foto${qs}`).then((r) => r.data);
  },
  approveAbsen: (id: number, aid: number) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/absen-foto/${aid}/approve`, {}).then((r) => r.data),
  rejectAbsen: (id: number, aid: number, catatan?: string) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/absen-foto/${aid}/reject`, { catatan }).then((r) => r.data),
  checklistAbsen: (id: number, data: { tukang_id: string; tanggal: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/absen-checklist`, data).then((r) => r.data),

  // Kasbon
  getKasbon: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/tukang/kasbon`).then((r) => r.data),
  addKasbon: (id: number, tid: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/${tid}/kasbon`, data).then((r) => r.data),
  updateKasbon: (id: number, cid: number, data: any) =>
    apiClient.patch(`/finance/adm-projek/${id}/tukang/kasbon/${cid}`, data).then((r) => r.data),
  deleteKasbon: (id: number, cid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/tukang/kasbon/${cid}`).then((r) => r.data),

  // Gajian
  getGajian: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/tukang/gajian`).then((r) => r.data),
  createGajian: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/gajian`, data).then((r) => r.data),
  deleteGajian: (id: number, gid: number) =>
    apiClient.delete(`/finance/adm-projek/${id}/tukang/gajian/${gid}`).then((r) => r.data),
  signGajianAF: (id: number, gid: number, data: { af_signature: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/gajian/${gid}/sign-af`, data).then((r) => r.data),
  signGajianHF: (id: number, gid: number, data: { hf_signature: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/tukang/gajian/${gid}/sign-hf`, data).then((r) => r.data),

  // Kwitansi gajian
  getTukangKwitansi: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/tukang/kwitansi`).then((r) => r.data),

  // Gajian cashflow
  getAvailableGajian: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/gajian/available`).then((r) => r.data),
  pullGajianToCashflow: (id: number, tid: number, data: { gaji_tukang_id: number; tanggal: string }) =>
    apiClient.post(`/finance/adm-projek/${id}/termins/${tid}/cashflow/gajian`, data).then((r) => r.data),

  // Foto Dokumentasi
  getFotoDokumentasi: (id: number) =>
    apiClient.get(`/finance/adm-projek/${id}/foto-dokumentasi`).then((r) => r.data),
  addFotoDokumentasi: (id: number, data: any) =>
    apiClient.post(`/finance/adm-projek/${id}/foto-dokumentasi`, data).then((r) => r.data),
  deleteFotoDokumentasi: (id: number, fid: string) =>
    apiClient.delete(`/finance/adm-projek/${id}/foto-dokumentasi/${fid}`).then((r) => r.data),
};

// ─── DokumentasiTab ───────────────────────────────────────────────────────────

function DokumentasiTab({ proyekId, proyekBerjalanId, proyekJenis }: { proyekId: number; proyekBerjalanId?: number; proyekJenis?: string }) {
  const qc = useQueryClient();
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ judul: "", deskripsi: "", tanggal_foto: today });
  const [preview, setPreview] = useState<string | null>(null);
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["foto-dokumentasi", proyekId],
    queryFn: () => admApi.getFotoDokumentasi(proyekId),
  });
  const fotos: any[] = Array.isArray(data) ? data : [];

  const picEndpoint = proyekBerjalanId
    ? (proyekJenis === "Interior" ? `/pic/projeks/interior/${proyekBerjalanId}/termins` : `/pic/projeks/sipil/${proyekBerjalanId}/termins`)
    : null;
  const { data: picDokData, isLoading: loadingPicDok } = useQuery({
    queryKey: ["pic-dokumentasi", proyekBerjalanId, proyekJenis],
    queryFn: () => apiClient.get(picEndpoint!).then((r) => r.data),
    enabled: !!picEndpoint,
    retry: false,
  });

  const addMut = useMutation({
    mutationFn: (d: any) => admApi.addFotoDokumentasi(proyekId, d),
    onSuccess: () => {
      toast.success("Foto ditambahkan");
      qc.invalidateQueries({ queryKey: ["foto-dokumentasi", proyekId] });
      setShowForm(false);
      setForm({ judul: "", deskripsi: "", tanggal_foto: today });
      setPreview(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal upload foto"),
  });

  const deleteMut = useMutation({
    mutationFn: (fid: string) => admApi.deleteFotoDokumentasi(proyekId, fid),
    onSuccess: () => {
      toast.success("Foto dihapus");
      qc.invalidateQueries({ queryKey: ["foto-dokumentasi", proyekId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menghapus foto"),
  });

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!preview) { toast.error("Pilih foto terlebih dahulu"); return; }
    addMut.mutate({ ...form, foto_data: preview });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{fotos.length} foto dokumentasi</p>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Foto
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Judul (opsional)</Label>
              <Input value={form.judul} onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Foto</Label>
              <Input type="date" value={form.tanggal_foto} onChange={(e) => setForm((f) => ({ ...f, tanggal_foto: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deskripsi (opsional)</Label>
            <Input value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Foto</Label>
            <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            {preview ? (
              <div className="relative w-48">
                <img src={preview} alt="preview" className="w-48 h-32 object-cover rounded border" />
                <button
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                  onClick={() => { setPreview(null); if (fotoInputRef.current) fotoInputRef.current.value = ""; }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fotoInputRef.current?.click()}>
                <Camera className="h-3.5 w-3.5 mr-1" /> Pilih Foto
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={addMut.isPending} className="h-8 text-xs bg-blue-500 hover:bg-blue-600 text-white">
              {addMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowForm(false); setPreview(null); }}>Batal</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : fotos.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Images className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Belum ada foto dokumentasi
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map((foto: any) => (
            <div key={foto.id} className="relative group border rounded-lg overflow-hidden bg-muted/30">
              <img
                src={foto.foto_data}
                alt={foto.judul ?? "foto"}
                className="w-full h-36 object-cover cursor-pointer"
                onClick={() => setViewFoto(foto.foto_data)}
              />
              <div className="p-2">
                {foto.judul && <p className="text-xs font-medium truncate">{foto.judul}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {foto.tanggal_foto ? new Date(foto.tanggal_foto).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                </p>
                {foto.uploaded_by && <p className="text-[10px] text-muted-foreground truncate">{foto.uploaded_by.nama}</p>}
              </div>
              <button
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteMut.mutate(foto.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewFoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setViewFoto(null)}
        >
          <img src={viewFoto} alt="foto" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

      {/* Dokumentasi dari PIC (terhubung ke projek sipil/interior) */}
      {proyekBerjalanId && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-slate-500" />
            Dokumentasi dari PIC
          </h3>
          {loadingPicDok ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !picDokData?.termins?.some((t: any) => t.tasks?.some((tk: any) => tk.fotos?.length > 0)) ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Images className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Belum ada dokumentasi dari PIC
            </div>
          ) : (
            <div className="space-y-5">
              {picDokData.termins.map((termin: any) => {
                const tasksWithFotos = termin.tasks.filter((tk: any) => tk.fotos?.length > 0);
                if (tasksWithFotos.length === 0) return null;
                return (
                  <div key={termin.id}>
                    <p className="text-xs font-semibold text-slate-500 mb-2">{termin.nama ?? `Termin ${termin.urutan}`}</p>
                    <div className="space-y-3 pl-4">
                      {tasksWithFotos.map((task: any) => (
                        <div key={task.id} className="border rounded-lg p-3">
                          <p className="text-xs font-medium text-slate-700 mb-2">{task.nama_pekerjaan ?? "—"}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {task.fotos.map((foto: any) => {
                              const fotoUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${foto.file_path}`;
                              return (
                                <div key={foto.id} className="space-y-1">
                                  <img
                                    src={fotoUrl}
                                    alt="Dokumentasi"
                                    className="w-full h-28 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setViewFoto(fotoUrl)}
                                  />
                                  {foto.keterangan && <p className="text-[10px] text-slate-600">{foto.keterangan}</p>}
                                  {foto.kendala && (
                                    <p className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">⚠ {foto.kendala}</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground">{foto.uploader ?? "—"} · {new Date(foto.created_at).toLocaleDateString("id-ID")}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CashflowTab ──────────────────────────────────────────────────────────────

function CashflowTab({ proyekId }: { proyekId: number }) {
  const qc = useQueryClient();

  // Termin state
  const [selectedTerminId, setSelectedTerminId] = useState<number | null>(null);
  const [openBuatTermin, setOpenBuatTermin] = useState(false);
  const [openAturDeposit, setOpenAturDeposit] = useState(false);
  const [openTambahDeposit, setOpenTambahDeposit] = useState(false);
  const [openPullPR, setOpenPullPR] = useState(false);
  const [openPullGajian, setOpenPullGajian] = useState(false);
  const [selectedGajianId, setSelectedGajianId] = useState<number | null>(null);
  const [pullGajianTanggal, setPullGajianTanggal] = useState(today);
  const [terminForm, setTerminForm] = useState({ nama_termin: "", tanggal: today, deposit_awal: 0 });
  const [depositForm, setDepositForm] = useState({ deposit_awal: 0 });
  const [extraDepositForm, setExtraDepositForm] = useState({ jumlah: 0, catatan: "" });
  const [selectedPRId, setSelectedPRId] = useState<number | null>(null);
  const [pullPRNotaImage, setPullPRNotaImage] = useState<string | null>(null);
  // Signature dialog state
  const [sigDialog, setSigDialog] = useState<{ open: boolean; mode: "deposit" | "extraDeposit" | "pr"; targetId?: number }>({ open: false, mode: "deposit" });
  const [viewNotaDialog, setViewNotaDialog] = useState<string | null>(null);

  // Queries
  const { data: terminsData, isLoading: terminsLoading } = useQuery({
    queryKey: ["adm-termins", proyekId],
    queryFn: () => admApi.getTermins(proyekId),
    retry: false,
  });

  const termins: any[] = Array.isArray(terminsData) ? terminsData : [];
  const selectedTermin = termins.find((t) => Number(t.id) === selectedTerminId) ?? null;

  const { data: cashflowData, isLoading: cfLoading } = useQuery({
    queryKey: ["adm-termin-cf", proyekId, selectedTerminId],
    queryFn: () => selectedTerminId ? admApi.getTerminCashflow(proyekId, selectedTerminId) : null,
    enabled: !!selectedTerminId,
    retry: false,
  });

  const { data: availablePRs } = useQuery({
    queryKey: ["adm-pr-available", proyekId],
    queryFn: () => admApi.getAvailablePR(proyekId),
    enabled: openPullPR,
    retry: false,
  });

  const { data: availableGajians } = useQuery({
    queryKey: ["adm-gajian-available", proyekId],
    queryFn: () => admApi.getAvailableGajian(proyekId),
    enabled: openPullGajian,
    retry: false,
  });

  // Mutations
  const createTerminMut = useMutation({
    mutationFn: (d: any) => admApi.createTermin(proyekId, d),
    onSuccess: (res) => {
      toast.success("Termin dibuat");
      qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] });
      setOpenBuatTermin(false);
      setTerminForm({ nama_termin: "", tanggal: today, deposit_awal: 0 });
      setSelectedTerminId(Number(res.data?.id));
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateTerminMut = useMutation({
    mutationFn: (d: any) => admApi.updateTermin(proyekId, selectedTerminId!, d),
    onSuccess: () => {
      toast.success("Deposit awal diatur");
      qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] });
      setOpenAturDeposit(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const signDepositMut = useMutation({
    mutationFn: (hf_signature: string) => admApi.signDeposit(proyekId, selectedTerminId!, { hf_signature }),
    onSuccess: () => { toast.success("Deposit awal ditandatangani"); qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] }); setSigDialog({ open: false, mode: "deposit" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const addExtraDepositMut = useMutation({
    mutationFn: (d: any) => admApi.addExtraDeposit(proyekId, selectedTerminId!, d),
    onSuccess: () => {
      toast.success("Deposit tambahan ditambahkan");
      qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] });
      setOpenTambahDeposit(false);
      setExtraDepositForm({ jumlah: 0, catatan: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const signExtraDepositMut = useMutation({
    mutationFn: ({ did, hf_signature }: { did: number; hf_signature: string }) => admApi.signExtraDeposit(proyekId, selectedTerminId!, did, { hf_signature }),
    onSuccess: () => { toast.success("Deposit tambahan ditandatangani"); qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] }); setSigDialog({ open: false, mode: "extraDeposit" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteExtraDepositMut = useMutation({
    mutationFn: (did: number) => admApi.deleteExtraDeposit(proyekId, selectedTerminId!, did),
    onSuccess: () => { toast.success("Deposit tambahan dihapus"); qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] }); },
  });

  const pullPRMut = useMutation({
    mutationFn: () => admApi.pullPRtoCashflow(proyekId, selectedTerminId!, { projek_pr_id: selectedPRId, tanggal: today, nota_image: pullPRNotaImage }),
    onSuccess: () => {
      toast.success("PR ditarik ke cashflow");
      qc.invalidateQueries({ queryKey: ["adm-termin-cf", proyekId, selectedTerminId] });
      qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] });
      setOpenPullPR(false);
      setSelectedPRId(null);
      setPullPRNotaImage(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const pullGajianMut = useMutation({
    mutationFn: (d: { gaji_tukang_id: number; tanggal: string }) =>
      admApi.pullGajianToCashflow(proyekId, selectedTerminId!, d),
    onSuccess: () => {
      toast.success("Gajian ditarik ke cashflow");
      qc.invalidateQueries({ queryKey: ["adm-termin-cf", proyekId, selectedTerminId] });
      setOpenPullGajian(false);
      setSelectedGajianId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteCfMut = useMutation({
    mutationFn: (cid: number) => admApi.deleteTerminCashflow(proyekId, selectedTerminId!, cid),
    onSuccess: () => {
      toast.success("Dihapus");
      qc.invalidateQueries({ queryKey: ["adm-termin-cf", proyekId, selectedTerminId] });
      qc.invalidateQueries({ queryKey: ["adm-termins", proyekId] });
    },
  });

  async function handleDownloadPDF() {
    if (!selectedTerminId) return;
    try {
      const data = await admApi.getTerminPdfData(proyekId, selectedTerminId);
      const { default: CashflowPDF } = await import("@/components/cashflow-termin-pdf");
      const blob = await pdf(<CashflowPDF {...data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cashflow-${selectedTermin?.nama_termin || "termin"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal generate PDF");
    }
  }

  async function handleDownloadOverviewPDF() {
    try {
      const data = await admApi.getCashflowOverviewPdfData(proyekId);
      const { default: OverviewPDF } = await import("@/components/cashflow-overview-pdf");
      const blob = await pdf(<OverviewPDF {...data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cashflow-semua-termin.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal generate PDF");
    }
  }

  function handleSignatureConfirm(dataUrl: string) {
    if (sigDialog.mode === "deposit") {
      signDepositMut.mutate(dataUrl);
    } else if (sigDialog.mode === "extraDeposit" && sigDialog.targetId !== undefined) {
      signExtraDepositMut.mutate({ did: sigDialog.targetId, hf_signature: dataUrl });
    }
  }

  const cfItems: any[] = cashflowData?.items ?? [];
  const cfSummary = cashflowData?.summary ?? { total_deposit: 0, total_debit: 0, sisa: 0 };
  const summary = selectedTermin?.summary ?? cfSummary;

  return (
    <div className="space-y-4">
      {/* Termin selector toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium whitespace-nowrap">Termin:</span>
          {terminsLoading ? (
            <Skeleton className="h-9 w-48" />
          ) : (
            <select
              className="border rounded-md px-3 py-2 text-sm flex-1 max-w-[260px]"
              value={selectedTerminId ?? ""}
              onChange={(e) => setSelectedTerminId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— pilih termin —</option>
              {termins.map((t) => (
                <option key={t.id} value={t.id}>{t.nama_termin}</option>
              ))}
            </select>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpenBuatTermin(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Buat Termin
        </Button>
        {termins.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleDownloadOverviewPDF}>
            <FileDown className="h-3.5 w-3.5 mr-1" /> PDF Semua Termin
          </Button>
        )}
      </div>

      {!selectedTermin && !terminsLoading && (
        <div className="text-center py-14 text-muted-foreground">
          <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Pilih termin atau buat termin baru</p>
          <p className="text-xs mt-1 opacity-70">Alur: Buat Termin → Atur Deposit → TTD HF → Tarik PR</p>
        </div>
      )}

      {selectedTermin && (
        <>
          {/* ── Deposit Card ────────────────────────────────── */}
          <div className="border rounded-lg p-4 space-y-2.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-500" />
                {selectedTermin.nama_termin}
                {selectedTermin.tanggal && (
                  <span className="text-xs text-muted-foreground font-normal">
                    — {new Date(selectedTermin.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setDepositForm({ deposit_awal: selectedTermin.deposit_awal }); setOpenAturDeposit(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Atur Deposit
                </Button>
                {!selectedTermin.hf_signed_at && (
                  <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" onClick={() => setSigDialog({ open: true, mode: "deposit" })} disabled={signDepositMut.isPending}>
                    <PenLine className="h-3.5 w-3.5 mr-1" /> TTD HF
                  </Button>
                )}
              </div>
            </div>

            {/* Deposit Awal */}
            <div className="flex items-center justify-between bg-white border rounded-md px-4 py-2.5">
              <div>
                <p className="text-sm font-medium">Deposit Awal</p>
                {selectedTermin.hf_signed_at ? (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3 w-3" /> {selectedTermin.hf_name} — {new Date(selectedTermin.hf_signed_at).toLocaleDateString("id-ID")}
                  </p>
                ) : (
                  <p className="text-xs text-amber-500 mt-0.5">⏳ Menunggu TTD Head Finance — belum sah</p>
                )}
              </div>
              <span className={`font-bold ${selectedTermin.hf_signed_at ? "text-green-700" : "text-amber-500"}`}>
                {formatRp(selectedTermin.deposit_awal)}
              </span>
            </div>

            {/* Extra deposits */}
            {(selectedTermin.deposits || []).map((dep: any) => (
              <div key={dep.id} className="flex items-center justify-between bg-white border rounded-md px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">Deposit Tambahan{dep.catatan ? ` — ${dep.catatan}` : ""}</p>
                  {dep.hf_signed_at ? (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="h-3 w-3" /> {dep.hf_name} — {new Date(dep.hf_signed_at).toLocaleDateString("id-ID")}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-0.5">⏳ Menunggu TTD Head Finance — belum sah</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${dep.hf_signed_at ? "text-green-700" : "text-amber-500"}`}>
                    {formatRp(dep.jumlah)}
                  </span>
                  {!dep.hf_signed_at && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600" onClick={() => setSigDialog({ open: true, mode: "extraDeposit", targetId: dep.id })}>
                      <PenLine className="h-3.5 w-3.5 mr-1" /> TTD
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteExtraDepositMut.mutate(dep.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            <Button size="sm" variant="outline" className="w-full border-dashed" onClick={() => setOpenTambahDeposit(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Deposit
            </Button>

            {/* Summary — only counts signed deposits */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <div className="text-center bg-green-50 rounded-md p-2">
                <p className="text-xs text-green-600">Deposit Disetujui</p>
                <p className="text-sm font-bold text-green-700">{formatRp(selectedTermin.summary.total_deposit)}</p>
              </div>
              <div className="text-center bg-red-50 rounded-md p-2">
                <p className="text-xs text-red-600">Terpakai (PR)</p>
                <p className="text-sm font-bold text-red-700">{formatRp(selectedTermin.summary.total_debit)}</p>
              </div>
              <div className={`text-center rounded-md p-2 ${selectedTermin.summary.sisa >= 0 ? "bg-blue-50" : "bg-orange-100"}`}>
                <p className={`text-xs ${selectedTermin.summary.sisa >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  {selectedTermin.summary.sisa < 0 ? "⚠ Melebihi Deposit" : "Sisa Deposit"}
                </p>
                <p className={`text-sm font-bold ${selectedTermin.summary.sisa >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                  {formatRp(selectedTermin.summary.sisa)}
                </p>
              </div>
            </div>
          </div>

          {/* ── PR Items ─────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Rincian Pengeluaran PR</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpenPullPR(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Tarik PR
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedGajianId(null); setOpenPullGajian(true); }} disabled={!selectedTerminId}>
                <Banknote className="h-4 w-4 mr-1" /> Pull Gajian
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
                <FileDown className="h-3.5 w-3.5 mr-1" /> PDF Termin Ini
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>No. PR</TableHead>
                  <TableHead>Nama Toko</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right text-red-600">Jumlah</TableHead>
                  <TableHead className="w-16">Nota</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cfLoading ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                )) : cfItems.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">
                      {it.gaji_tukang_id ? (
                        <Badge variant="secondary" className="text-xs gap-1 font-normal">
                          <Banknote className="h-3 w-3" /> Gaji Tukang
                        </Badge>
                      ) : (it.no_pr || "—")}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{it.keterangan || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(it.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">{formatRp(it.debit)}</TableCell>
                    <TableCell>
                      {it.nota_image ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600" onClick={() => setViewNotaDialog(it.nota_image)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Lihat
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCfMut.mutate(it.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!cfLoading && cfItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada PR — klik "Tarik PR" untuk menambahkan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Dialog: Buat Termin */}
      <Dialog open={openBuatTermin} onOpenChange={setOpenBuatTermin}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Buat Termin Baru</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Termin *</Label>
              <Input placeholder="Termin 1, DP, Pelunasan..." value={terminForm.nama_termin} onChange={(e) => setTerminForm({ ...terminForm, nama_termin: e.target.value })} /></div>
            <div><Label>Tanggal</Label>
              <Input type="date" value={terminForm.tanggal} onChange={(e) => setTerminForm({ ...terminForm, tanggal: e.target.value })} /></div>
            <div><Label>Deposit Awal (Rp)</Label>
              <Input type="number" min={0} value={terminForm.deposit_awal} onChange={(e) => setTerminForm({ ...terminForm, deposit_awal: Number(e.target.value) })} /></div>
            <p className="text-xs text-muted-foreground">Deposit perlu TTD Head Finance agar sah dan bisa mengurangi saldo.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenBuatTermin(false)}>Batal</Button>
              <Button disabled={!terminForm.nama_termin || createTerminMut.isPending} onClick={() => createTerminMut.mutate(terminForm)}>
                {createTerminMut.isPending ? "Menyimpan..." : "Buat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Atur Deposit */}
      <Dialog open={openAturDeposit} onOpenChange={setOpenAturDeposit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Atur Deposit Awal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Deposit Awal (Rp)</Label>
              <Input type="number" min={0} value={depositForm.deposit_awal} onChange={(e) => setDepositForm({ deposit_awal: Number(e.target.value) })} /></div>
            <p className="text-xs text-muted-foreground">Setelah mengatur deposit, Head Finance harus menandatangani persetujuan.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenAturDeposit(false)}>Batal</Button>
              <Button disabled={updateTerminMut.isPending} onClick={() => updateTerminMut.mutate({ deposit_awal: depositForm.deposit_awal })}>
                {updateTerminMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tambah Deposit */}
      <Dialog open={openTambahDeposit} onOpenChange={setOpenTambahDeposit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Deposit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Jumlah (Rp) *</Label>
              <Input type="number" min={0} value={extraDepositForm.jumlah} onChange={(e) => setExtraDepositForm({ ...extraDepositForm, jumlah: Number(e.target.value) })} /></div>
            <div><Label>Catatan</Label>
              <Input placeholder="Keterangan tambahan deposit..." value={extraDepositForm.catatan} onChange={(e) => setExtraDepositForm({ ...extraDepositForm, catatan: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Head Finance perlu menandatangani deposit tambahan ini.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenTambahDeposit(false)}>Batal</Button>
              <Button disabled={!extraDepositForm.jumlah || addExtraDepositMut.isPending} onClick={() => addExtraDepositMut.mutate(extraDepositForm)}>
                {addExtraDepositMut.isPending ? "Menyimpan..." : "Tambahkan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pull PR */}
      <Dialog open={openPullPR} onOpenChange={(v) => { setOpenPullPR(v); if (!v) { setSelectedPRId(null); setPullPRNotaImage(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tarik PR ke Cashflow</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Hanya PR berstatus Disetujui dan sudah ditandatangani HF yang tersedia.</p>
            <div><Label>Pilih PR</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={selectedPRId ?? ""}
                onChange={(e) => setSelectedPRId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— pilih PR —</option>
                {(Array.isArray(availablePRs) ? availablePRs : []).map((pr: any) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.nomor_pr} — {pr.nama_toko || "—"} ({formatRp(pr.total)})
                  </option>
                ))}
              </select>
            </div>
            {Array.isArray(availablePRs) && availablePRs.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-2">Tidak ada PR yang tersedia</p>
            )}
            {/* Nota upload */}
            <div>
              <Label>Upload Nota (opsional)</Label>
              {pullPRNotaImage ? (
                <div className="border rounded-md p-2 mt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pullPRNotaImage} alt="nota" className="max-h-32 mx-auto object-contain rounded" />
                  <Button variant="ghost" size="sm" className="mt-1 text-destructive w-full" onClick={() => setPullPRNotaImage(null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Nota
                  </Button>
                </div>
              ) : (
                <label className="mt-1 border-2 border-dashed rounded-md flex items-center justify-center gap-2 p-3 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Klik untuk upload foto nota</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setPullPRNotaImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }} />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpenPullPR(false); setSelectedPRId(null); setPullPRNotaImage(null); }}>Batal</Button>
              <Button disabled={!selectedPRId || pullPRMut.isPending} onClick={() => pullPRMut.mutate()}>
                {pullPRMut.isPending ? "Menarik..." : "Tarik ke Cashflow"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pull Gajian */}
      <Dialog open={openPullGajian} onOpenChange={(v) => { if (!v) setOpenPullGajian(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4" /> Pull Gajian ke Cashflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pilih Gajian</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={selectedGajianId ?? ""}
                onChange={e => setSelectedGajianId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— Pilih gajian —</option>
                {(Array.isArray(availableGajians) ? availableGajians : []).map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.bulan && g.tahun ? `Bulan ${g.bulan}/${g.tahun}` : `Gajian #${g.id}`} — Rp {Number(g.total_gaji).toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
              {Array.isArray(availableGajians) && availableGajians.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Tidak ada gajian yang tersedia. Gajian harus sudah ditandatangani HF &amp; AF.</p>
              )}
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={pullGajianTanggal} onChange={e => setPullGajianTanggal(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpenPullGajian(false)}>Batal</Button>
              <Button
                disabled={!selectedGajianId || pullGajianMut.isPending}
                onClick={() => selectedGajianId && pullGajianMut.mutate({ gaji_tukang_id: selectedGajianId, tanggal: pullGajianTanggal })}
              >
                {pullGajianMut.isPending ? "Memproses..." : "Pull ke Cashflow"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <SignatureDialog
        open={sigDialog.open}
        onOpenChange={(v) => setSigDialog((s) => ({ ...s, open: v }))}
        title={sigDialog.mode === "deposit" ? "TTD HF — Deposit Awal" : "TTD HF — Deposit Tambahan"}
        onSave={handleSignatureConfirm}
        loading={signDepositMut.isPending || signExtraDepositMut.isPending}
      />

      {/* View Nota Dialog */}
      <Dialog open={!!viewNotaDialog} onOpenChange={(v) => { if (!v) setViewNotaDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bukti Nota</DialogTitle></DialogHeader>
          {viewNotaDialog && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewNotaDialog} alt="nota" className="w-full max-h-[70vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ListMaterialTab ──────────────────────────────────────────────────────────

const BULAN_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function ListMaterialTab({ proyekId }: { proyekId: number }) {
  const qc = useQueryClient();

  // Filter state
  const [filterToko, setFilterToko] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterTglStart, setFilterTglStart] = useState("");
  const [filterTglEnd, setFilterTglEnd] = useState("");

  // Dialog state
  const [openCreateToko, setOpenCreateToko] = useState(false);
  const [editToko, setEditToko] = useState<any | null>(null);
  const [openAddItem, setOpenAddItem] = useState<number | null>(null); // tokoId
  const [editItem, setEditItem] = useState<{ tokoId: number; item: any } | null>(null);

  const emptyTokoForm = { nama_toko: "", tanggal: today };
  const emptyItemForm = { nama_item: "", qty: 0, satuan: "", harga_satuan: 0 };
  const [tokoForm, setTokoForm] = useState({ ...emptyTokoForm });
  const [itemForm, setItemForm] = useState({ ...emptyItemForm });

  // Build filter query params
  const filterParams: Record<string, string> = {};
  if (filterToko.trim()) filterParams.toko = filterToko.trim();
  if (filterBulan) filterParams.bulan = filterBulan;
  if (filterTahun.trim()) filterParams.tahun = filterTahun.trim();
  if (filterTglStart) filterParams.tanggal_start = filterTglStart;
  if (filterTglEnd) filterParams.tanggal_end = filterTglEnd;

  const { data, isLoading } = useQuery({
    queryKey: ["adm-list-material", proyekId, filterParams],
    queryFn: () => admApi.getListMaterial(proyekId, Object.keys(filterParams).length ? filterParams : undefined),
    retry: false,
  });

  const tokos: any[] = Array.isArray(data) ? data : (data?.tokos ?? []);
  const grandTotal = tokos.reduce((s: number, t: any) => s + (Number(t.total) || 0), 0);

  // Toko mutations
  const createTokoMut = useMutation({
    mutationFn: (d: any) => admApi.createToko(proyekId, d),
    onSuccess: () => {
      toast.success("Toko ditambahkan");
      qc.invalidateQueries({ queryKey: ["adm-list-material", proyekId] });
      setOpenCreateToko(false);
      setTokoForm({ ...emptyTokoForm });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateTokoMut = useMutation({
    mutationFn: ({ mid, d }: { mid: number; d: any }) => admApi.updateToko(proyekId, mid, d),
    onSuccess: () => {
      toast.success("Toko diperbarui");
      qc.invalidateQueries({ queryKey: ["adm-list-material", proyekId] });
      setEditToko(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteTokoMut = useMutation({
    mutationFn: (mid: number) => admApi.deleteToko(proyekId, mid),
    onSuccess: () => { toast.success("Toko dihapus"); qc.invalidateQueries({ queryKey: ["adm-list-material", proyekId] }); },
  });

  // Item mutations
  const addItemMut = useMutation({
    mutationFn: ({ mid, d }: { mid: number; d: any }) => admApi.addTokoItem(proyekId, mid, d),
    onSuccess: () => {
      toast.success("Item ditambahkan");
      qc.invalidateQueries({ queryKey: ["adm-list-material", proyekId] });
      setOpenAddItem(null);
      setItemForm({ ...emptyItemForm });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateItemMut = useMutation({
    mutationFn: ({ mid, iid, d }: { mid: number; iid: number; d: any }) => admApi.updateTokoItem(proyekId, mid, iid, d),
    onSuccess: () => {
      toast.success("Item diperbarui");
      qc.invalidateQueries({ queryKey: ["adm-list-material", proyekId] });
      setEditItem(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteItemMut = useMutation({
    mutationFn: ({ mid, iid }: { mid: number; iid: number }) => admApi.deleteTokoItem(proyekId, mid, iid),
    onSuccess: () => { toast.success("Item dihapus"); qc.invalidateQueries({ queryKey: ["adm-list-material", proyekId] }); },
  });

  async function handleDownloadPDF() {
    try {
      const pdfData = await admApi.getMaterialPdfData(proyekId, Object.keys(filterParams).length ? filterParams : undefined);
      const { default: MatPDF } = await import("@/components/material-list-pdf");
      const blob = await pdf(<MatPDF {...pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "daftar-material.pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Gagal generate PDF"); }
  }

  function openEditToko(toko: any) {
    setEditToko(toko);
    setTokoForm({ nama_toko: toko.nama_toko, tanggal: toko.tanggal ? toko.tanggal.split("T")[0] : today });
  }

  function openEditItem(tokoId: number, item: any) {
    setEditItem({ tokoId, item });
    setItemForm({ nama_item: item.nama_item, qty: Number(item.qty), satuan: item.satuan || "", harga_satuan: Number(item.harga_satuan) });
  }

  return (
    <div className="space-y-4">
      {/* Filter + Actions bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs">Nama Toko</Label>
          <Input placeholder="Filter toko..." className="h-8" value={filterToko} onChange={(e) => setFilterToko(e.target.value)} />
        </div>
        <div className="w-32">
          <Label className="text-xs">Bulan</Label>
          <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
            <option value="">Semua</option>
            {BULAN_NAMES.map((b, i) => <option key={i + 1} value={String(i + 1)}>{b}</option>)}
          </select>
        </div>
        <div className="w-20">
          <Label className="text-xs">Tahun</Label>
          <Input placeholder="2025" className="h-8" value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} />
        </div>
        <div className="w-36">
          <Label className="text-xs">Tgl Dari</Label>
          <Input type="date" className="h-8" value={filterTglStart} onChange={(e) => setFilterTglStart(e.target.value)} />
        </div>
        <div className="w-36">
          <Label className="text-xs">Tgl S/d</Label>
          <Input type="date" className="h-8" value={filterTglEnd} onChange={(e) => setFilterTglEnd(e.target.value)} />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
            <FileDown className="h-3.5 w-3.5 mr-1" /> Download PDF
          </Button>
          <Button size="sm" onClick={() => { setTokoForm({ ...emptyTokoForm }); setOpenCreateToko(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Toko
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && tokos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Belum ada data material — tambah toko terlebih dahulu</p>
        </div>
      )}

      {/* Toko cards */}
      {!isLoading && tokos.map((toko: any) => (
        <div key={toko.id} className="border rounded-lg overflow-hidden">
          {/* Toko header */}
          <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b">
            <div>
              <p className="font-semibold text-sm">{toko.nama_toko}</p>
              <p className="text-xs text-muted-foreground">
                {toko.tanggal ? new Date(toko.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-orange-700">{formatRp(toko.total || 0)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditToko(toko)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTokoMut.mutate(toko.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setItemForm({ ...emptyItemForm }); setOpenAddItem(toko.id); }}>
                <Plus className="h-3 w-3 mr-1" /> Item
              </Button>
            </div>
          </div>
          {/* Items table */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8">No</TableHead>
                <TableHead>Nama Item</TableHead>
                <TableHead className="text-right w-16">Qty</TableHead>
                <TableHead className="w-16">Satuan</TableHead>
                <TableHead className="text-right w-32">Harga Satuan</TableHead>
                <TableHead className="text-right w-32">Jumlah</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(toko.items || []).map((it: any, idx: number) => (
                <TableRow key={it.id}>
                  <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                  <TableCell className="text-sm">{it.nama_item}</TableCell>
                  <TableCell className="text-right text-sm">{Number(it.qty).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-sm font-mono">{it.satuan || "—"}</TableCell>
                  <TableCell className="text-right text-sm">{formatRp(it.harga_satuan)}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{formatRp(it.jumlah)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(toko.id, it)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemMut.mutate({ mid: toko.id, iid: it.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(toko.items || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground text-sm">
                    Belum ada item — klik "+ Item" untuk menambah
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ))}

      {/* Grand Total */}
      {!isLoading && tokos.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-orange-500 text-white rounded-md px-4 py-2 flex gap-8 items-center">
            <span className="text-sm font-semibold">Total Keseluruhan</span>
            <span className="text-sm font-bold">{formatRp(grandTotal)}</span>
          </div>
        </div>
      )}

      {/* Dialog: Buat / Edit Toko */}
      <Dialog open={openCreateToko || !!editToko} onOpenChange={(v) => { if (!v) { setOpenCreateToko(false); setEditToko(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editToko ? "Edit Toko" : "Tambah Toko"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Toko *</Label>
              <Input placeholder="Toko Bangunan ABC..." value={tokoForm.nama_toko} onChange={(e) => setTokoForm({ ...tokoForm, nama_toko: e.target.value })} /></div>
            <div><Label>Tanggal</Label>
              <Input type="date" value={tokoForm.tanggal} onChange={(e) => setTokoForm({ ...tokoForm, tanggal: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpenCreateToko(false); setEditToko(null); }}>Batal</Button>
              <Button
                disabled={!tokoForm.nama_toko || createTokoMut.isPending || updateTokoMut.isPending}
                onClick={() => {
                  if (editToko) updateTokoMut.mutate({ mid: editToko.id, d: tokoForm });
                  else createTokoMut.mutate(tokoForm);
                }}
              >
                {(createTokoMut.isPending || updateTokoMut.isPending) ? "Menyimpan..." : editToko ? "Perbarui" : "Tambah"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tambah / Edit Item */}
      <Dialog open={!!openAddItem || !!editItem} onOpenChange={(v) => { if (!v) { setOpenAddItem(null); setEditItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Item" : "Tambah Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Item *</Label>
              <Input placeholder="Semen 40kg, Cat Tembok..." value={itemForm.nama_item} onChange={(e) => setItemForm({ ...itemForm, nama_item: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Qty</Label>
                <Input type="number" min={0} step="0.01" value={itemForm.qty} onChange={(e) => setItemForm({ ...itemForm, qty: Number(e.target.value) })} /></div>
              <div><Label>Satuan</Label>
                <Input placeholder="SAK, BTG, M²..." value={itemForm.satuan} onChange={(e) => setItemForm({ ...itemForm, satuan: e.target.value })} /></div>
              <div><Label>Harga Satuan</Label>
                <Input type="number" min={0} value={itemForm.harga_satuan} onChange={(e) => setItemForm({ ...itemForm, harga_satuan: Number(e.target.value) })} /></div>
            </div>
            <div className="text-right text-sm font-semibold text-muted-foreground border-t pt-2">
              Jumlah: <span className="text-foreground">{formatRp(itemForm.qty * itemForm.harga_satuan)}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpenAddItem(null); setEditItem(null); }}>Batal</Button>
              <Button
                disabled={!itemForm.nama_item || addItemMut.isPending || updateItemMut.isPending}
                onClick={() => {
                  if (editItem) updateItemMut.mutate({ mid: editItem.tokoId, iid: editItem.item.id, d: itemForm });
                  else if (openAddItem) addItemMut.mutate({ mid: openAddItem, d: itemForm });
                }}
              >
                {(addItemMut.isPending || updateItemMut.isPending) ? "Menyimpan..." : editItem ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PRTab ────────────────────────────────────────────────────────────────────

const PR_STATUS_COLOR: Record<string, string> = {
  Pending: "secondary",
  Disetujui: "default",
  Ditolak: "destructive",
};

const PR_ITEMS_PER_PAGE = 5;

function PRTab({ proyekId, proyekBerjalanId }: { proyekId: number; proyekBerjalanId?: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewPR, setViewPR] = useState<any | null>(null);
  const [editPRId, setEditPRId] = useState<number | null>(null);
  const [prSigDialog, setPrSigDialog] = useState<{ open: boolean; prId: number | null }>({ open: false, prId: null });
  const [prPage, setPrPage] = useState(0);
  const [editPrPage, setEditPrPage] = useState(0);
  type PRItem = { mode: "manual" | "rapp"; nama_item: string; satuan: string; qty: number; harga_perkiraan: number; rapp_qty?: number; rapp_harga?: number };
  const emptyItem = (): PRItem => ({ mode: "manual", nama_item: "", satuan: "", qty: 1, harga_perkiraan: 0 });
  const emptyForm = { tanggal: today, nama_toko: "", items: [emptyItem()] };
  const [form, setForm] = useState<{ tanggal: string; nama_toko: string; items: PRItem[] }>(emptyForm);
  const [editForm, setEditForm] = useState<{ tanggal: string; nama_toko: string; items: PRItem[] }>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["adm-pr", proyekId],
    queryFn: () => admApi.getPR(proyekId),
    retry: false,
  });

  const addMut = useMutation({
    mutationFn: (d: any) => admApi.addPR(proyekId, d),
    onSuccess: () => {
      toast.success("PR dibuat");
      qc.invalidateQueries({ queryKey: ["adm-pr", proyekId] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const statusMut = useMutation({
    mutationFn: ({ pid, status }: { pid: number; status: string }) =>
      admApi.updatePRStatus(proyekId, pid, { status }),
    onSuccess: () => { toast.success("Status diperbarui"); qc.invalidateQueries({ queryKey: ["adm-pr", proyekId] }); },
  });

  const delMut = useMutation({
    mutationFn: (pid: number) => admApi.deletePR(proyekId, pid),
    onSuccess: () => { toast.success("PR dihapus"); qc.invalidateQueries({ queryKey: ["adm-pr", proyekId] }); },
  });

  const updatePRMut = useMutation({
    mutationFn: ({ pid, data }: { pid: number; data: any }) => admApi.updatePR(proyekId, pid, data),
    onSuccess: () => {
      toast.success("PR diperbarui");
      qc.invalidateQueries({ queryKey: ["adm-pr", proyekId] });
      setEditPRId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const signPRMut = useMutation({
    mutationFn: ({ pid, hf_signature }: { pid: number; hf_signature: string }) => admApi.signPR(proyekId, pid, { hf_signature }),
    onSuccess: () => { toast.success("PR ditandatangani HF"); qc.invalidateQueries({ queryKey: ["adm-pr", proyekId] }); setPrSigDialog({ open: false, prId: null }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  async function handleDownloadPRPdf(pr: any) {
    try {
      const data = await admApi.getPRPdfData(proyekId, pr.id);
      const { default: PRPDFComp } = await import("@/components/pr-pdf");
      const blob = await pdf(<PRPDFComp {...data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${pr.nomor_pr || "pr"}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Gagal generate PDF"); }
  }

  function openEditPR(pr: any) {
    setEditForm({
      tanggal: pr.tanggal ? pr.tanggal.split("T")[0] : today,
      nama_toko: pr.nama_toko || "",
      items: (pr.items || []).map((it: any) => ({
        mode: it.is_from_rapp ? "rapp" as const : "manual" as const,
        nama_item: it.nama_item,
        satuan: it.satuan || "",
        qty: Number(it.qty),
        harga_perkiraan: Number(it.harga_perkiraan),
        rapp_qty: it.rapp_qty != null ? Number(it.rapp_qty) : undefined,
        rapp_harga: it.rapp_harga != null ? Number(it.rapp_harga) : undefined,
      })),
    });
    setEditPRId(pr.id);
    setEditPrPage(0);
  }

  function submitEditPR() {
    if (!editPRId) return;
    updatePRMut.mutate({
      pid: editPRId,
      data: {
        tanggal: editForm.tanggal,
        nama_toko: editForm.nama_toko,
        items: editForm.items.map((it) => ({
          nama_item: it.nama_item,
          satuan: it.satuan,
          qty: it.qty,
          harga_perkiraan: it.harga_perkiraan,
          is_from_rapp: it.mode === "rapp",
          rapp_qty: it.rapp_qty ?? null,
          rapp_harga: it.rapp_harga ?? null,
        })),
      },
    });
  }

  
  const { data: rappItems = [] } = useQuery({
    queryKey: ["adm-rapp-items", proyekId],
    queryFn: () => admApi.getRappItems(proyekId),
    enabled: !!proyekBerjalanId,
    retry: false,
  });
  function pickRappItem(idx: number, it: any) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx
        ? { mode: "rapp" as const, nama_item: it.nama_item, satuan: it.satuan || "", qty: it.qty || 1, harga_perkiraan: it.harga || 0, rapp_qty: it.qty, rapp_harga: it.harga }
        : item
      ),
    }));
  }
  function setItemMode(idx: number, mode: "manual" | "rapp") {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx
        ? mode === "manual"
          ? { mode: "manual", nama_item: "", satuan: "", qty: 1, harga_perkiraan: 0 }
          : { ...item, mode: "rapp", nama_item: "", satuan: "" }
        : item
      ),
    }));
  }
  function itemNeedsHF(it: PRItem) {
    if (it.mode === "rapp") return true;
    if (it.rapp_qty != null && it.qty > it.rapp_qty) return true;
    if (it.rapp_harga != null && it.harga_perkiraan > it.rapp_harga) return true;
    return false;
  }
  const prNeedsHF = form.items.some(itemNeedsHF);

const items: any[] = Array.isArray(data) ? data : data?.items ?? [];

  function addItemRow() {
    const next = [...form.items, emptyItem()];
    setForm({ ...form, items: next });
    setPrPage(Math.floor((next.length - 1) / PR_ITEMS_PER_PAGE));
  }

  function removeItemRow(idx: number) {
    const next = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items: next });
    const maxPage = Math.max(0, Math.ceil(next.length / PR_ITEMS_PER_PAGE) - 1);
    if (prPage > maxPage) setPrPage(maxPage);
  }

  function updateItemRow(idx: number, field: string, val: any) {
    setForm({ ...form, items: form.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Buat PR
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>No. PR</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Nama Toko</TableHead>
            <TableHead className="text-right">Est. Nilai</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>TTD HF</TableHead>
            <TableHead className="w-36" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => (
              <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
            ))}</TableRow>
          )) : items.map((pr: any) => {
            const totalEst = (pr.items || []).reduce((s: number, it: any) => s + (Number(it.qty) || 0) * (Number(it.harga_perkiraan) || 0), 0);
            return (
              <TableRow key={pr.id}>
                <TableCell className="font-mono font-medium text-sm">{pr.nomor_pr}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{new Date(pr.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">{pr.nama_toko || "—"}</TableCell>
                <TableCell className="text-right text-sm">{formatRp(totalEst)}</TableCell>
                <TableCell>
                  <Badge variant={(PR_STATUS_COLOR[pr.status] ?? "secondary") as any}>{pr.status}</Badge>
                </TableCell>
                <TableCell>
                  {pr.hf_signed_at ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> {pr.hf_name}
                    </span>
                  ) : pr.status === "Disetujui" ? (
                    <Button variant="ghost" size="sm" className="h-7 text-orange-600 px-2" onClick={() => setPrSigDialog({ open: true, prId: pr.id })} disabled={signPRMut.isPending}>
                      <PenLine className="h-3.5 w-3.5 mr-1" /> TTD HF
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewPR(pr)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {pr.hf_signed_at && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => handleDownloadPRPdf(pr)}>
                        <FileDown className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!pr.hf_signed_at && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600" onClick={() => openEditPR(pr)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {pr.status === "Pending" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => statusMut.mutate({ pid: pr.id, status: "Disetujui" })}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => statusMut.mutate({ pid: pr.id, status: "Ditolak" })}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delMut.mutate(pr.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {!isLoading && items.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada Purchase Request</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      {/* Create PR Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setPrPage(0); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Purchase Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
              <div><Label>Nama Toko / Supplier</Label>
                <Input placeholder="Toko Bangunan ABC..." value={form.nama_toko} onChange={(e) => setForm({ ...form, nama_toko: e.target.value })} /></div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              Semua PR membutuhkan <b>Tanda Tangan Head Finance</b> sebelum dapat digunakan.
            </div>

            <div>
              {(() => {
                const prTotalPages = Math.max(1, Math.ceil(form.items.length / PR_ITEMS_PER_PAGE));
                const prStartIdx = prPage * PR_ITEMS_PER_PAGE;
                const prPageItems = form.items.slice(prStartIdx, prStartIdx + PR_ITEMS_PER_PAGE);
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Label>Daftar Item</Label>
                        {prTotalPages > 1 && (
                          <span className="text-xs text-muted-foreground">({form.items.length} item)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {prTotalPages > 1 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={prPage === 0} onClick={() => setPrPage(prPage - 1)}>
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span>Hal {prPage + 1}/{prTotalPages}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={prPage >= prTotalPages - 1} onClick={() => setPrPage(prPage + 1)}>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Baris
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {prPageItems.map((it, pageLocalIdx) => {
                        const idx = prStartIdx + pageLocalIdx;
                        const exceedsQty = it.rapp_qty != null && it.qty > it.rapp_qty;
                        const exceedsHarga = it.rapp_harga != null && it.harga_perkiraan > it.rapp_harga;
                        return (
                          <div key={idx} className={`border rounded-md p-3 space-y-2 ${itemNeedsHF(it) ? "border-amber-200 bg-amber-50/30" : ""}`}>
                            {/* Mode toggle */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Sumber:</span>
                              <div className="flex rounded-md border overflow-hidden text-xs">
                                <button
                                  type="button"
                                  className={`px-3 py-1 transition-colors ${it.mode === "manual" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                                  onClick={() => setItemMode(idx, "manual")}
                                >Ketik Manual</button>
                                {proyekBerjalanId && (
                                  <button
                                    type="button"
                                    className={`px-3 py-1 border-l transition-colors ${it.mode === "rapp" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                                    onClick={() => setItemMode(idx, "rapp")}
                                  ><ClipboardList className="h-3 w-3 inline mr-1" />Dari RAPP</button>
                                )}
                              </div>
                              {itemNeedsHF(it) && <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Perlu TTD HF</Badge>}
                              {form.items.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive ml-auto" onClick={() => removeItemRow(idx)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            {/* RAPP picker */}
                            {it.mode === "rapp" && (
                              <div>
                                <Label className="text-xs">Pilih Item dari RAPP</Label>
                                <Select
                                  value={it.nama_item || ""}
                                  onValueChange={(v) => {
                                    const found = (rappItems as any[]).find((r) => r.nama_item === v);
                                    if (found) pickRappItem(idx, found);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="— Pilih item RAPP —" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(rappItems as any[]).length === 0
                                      ? <SelectItem value="__none__" disabled>Belum ada item RAPP</SelectItem>
                                      : (rappItems as any[]).map((r: any, ri: number) => (
                                          <SelectItem key={ri} value={r.nama_item}>
                                            {r.nama_item} — {r.satuan} | Qty: {r.qty} | {formatRp(r.harga)}
                                          </SelectItem>
                                        ))
                                    }
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Item fields */}
                            <div className="grid grid-cols-4 gap-2">
                              <div className="col-span-2">
                                <Label className="text-xs">Nama Item</Label>
                                <Input className="h-8 text-sm" placeholder="Nama item" value={it.nama_item}
                                  readOnly={it.mode === "rapp"}
                                  onChange={(e) => updateItemRow(idx, "nama_item", e.target.value)} />
                              </div>
                              <div>
                                <Label className="text-xs">Satuan</Label>
                                <Input className="h-8 text-sm" placeholder="pcs" value={it.satuan}
                                  readOnly={it.mode === "rapp"}
                                  onChange={(e) => updateItemRow(idx, "satuan", e.target.value)} />
                              </div>
                              <div />
                              <div>
                                <Label className="text-xs">
                                  Qty {it.rapp_qty != null && <span className="text-muted-foreground">(RAPP: {it.rapp_qty})</span>}
                                </Label>
                                <Input className={`h-8 text-sm ${exceedsQty ? "border-amber-400 bg-amber-50" : ""}`}
                                  type="number" min={0} value={it.qty}
                                  onChange={(e) => updateItemRow(idx, "qty", Number(e.target.value))} />
                                {exceedsQty && <p className="text-[10px] text-amber-600 mt-0.5">Melebihi RAPP (perlu TTD HF)</p>}
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">
                                  Harga Perkiraan {it.rapp_harga != null && <span className="text-muted-foreground">(RAPP: {formatRp(it.rapp_harga)})</span>}
                                </Label>
                                <Input className={`h-8 text-sm ${exceedsHarga ? "border-amber-400 bg-amber-50" : ""}`}
                                  type="number" min={0} value={it.harga_perkiraan}
                                  onChange={(e) => updateItemRow(idx, "harga_perkiraan", Number(e.target.value))} />
                                {exceedsHarga && <p className="text-[10px] text-amber-600 mt-0.5">Melebihi RAPP (perlu TTD HF)</p>}
                              </div>
                              <div>
                                <Label className="text-xs">Subtotal</Label>
                                <div className="h-8 flex items-center text-sm font-medium text-muted-foreground">
                                  {formatRp(it.qty * it.harga_perkiraan)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-right text-sm font-semibold mt-2 text-muted-foreground">
                      Total Estimasi: <span className="text-foreground">{formatRp(form.items.reduce((s, it) => s + it.qty * it.harga_perkiraan, 0))}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button disabled={!form.tanggal || addMut.isPending} onClick={() => addMut.mutate({
                tanggal: form.tanggal,
                nama_toko: form.nama_toko,
                items: form.items.map((it) => ({
                  nama_item: it.nama_item,
                  satuan: it.satuan,
                  qty: it.qty,
                  harga_perkiraan: it.harga_perkiraan,
                  is_from_rapp: it.mode === "rapp",
                  rapp_qty: it.rapp_qty ?? null,
                  rapp_harga: it.rapp_harga ?? null,
                })),
              })}>
                {addMut.isPending ? "Menyimpan..." : "Buat PR"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View PR Dialog */}
      <Dialog open={!!viewPR} onOpenChange={(v) => !v && setViewPR(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Detail PR: {viewPR?.nomor_pr}</DialogTitle></DialogHeader>
          {viewPR && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Tanggal:</span> {new Date(viewPR.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={(PR_STATUS_COLOR[viewPR.status] ?? "secondary") as any} className="ml-1">{viewPR.status}</Badge></div>
                {viewPR.nama_toko && <div className="col-span-2"><span className="text-muted-foreground">Nama Toko:</span> <b>{viewPR.nama_toko}</b></div>}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Item</TableHead>
                    <TableHead>Sat.</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(viewPR.items || []).map((it: any) => {
                    const exceedsQty = it.rapp_qty != null && Number(it.qty) > Number(it.rapp_qty);
                    const exceedsHarga = it.rapp_harga != null && Number(it.harga_perkiraan) > Number(it.rapp_harga);
                    return (
                      <TableRow key={it.id} className={it.is_from_rapp || exceedsQty || exceedsHarga ? "bg-amber-50/40" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {it.nama_item}
                            {it.is_from_rapp && <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-300">RAPP</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{it.satuan || "—"}</TableCell>
                        <TableCell className="text-right">
                          <span className={exceedsQty ? "text-amber-600 font-semibold" : ""}>{Number(it.qty).toLocaleString("id-ID")}</span>
                          {exceedsQty && <div className="text-[10px] text-amber-500">RAPP: {Number(it.rapp_qty).toLocaleString("id-ID")}</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={exceedsHarga ? "text-amber-600 font-semibold" : ""}>{formatRp(it.harga_perkiraan)}</span>
                          {exceedsHarga && <div className="text-[10px] text-amber-500">RAPP: {formatRp(it.rapp_harga)}</div>}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatRp(Number(it.qty) * Number(it.harga_perkiraan))}</TableCell>
                        <TableCell>{(it.is_from_rapp || exceedsQty || exceedsHarga) && <ShieldCheck className="h-3.5 w-3.5 text-amber-500" aria-label="Perlu TTD HF" />}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="text-right font-bold">
                Total: {formatRp((viewPR.items || []).reduce((s: number, it: any) => s + Number(it.qty) * Number(it.harga_perkiraan), 0))}
              </div>
              {viewPR.catatan && <p className="text-sm text-muted-foreground">Catatan: {viewPR.catatan}</p>}
              {viewPR.hf_signature && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Tanda Tangan Head Finance:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewPR.hf_signature} alt="TTD HF" className="max-h-24 border rounded bg-white p-1 object-contain" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit PR Dialog */}
      <Dialog open={!!editPRId} onOpenChange={(v) => { if (!v) { setEditPRId(null); setEditPrPage(0); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Purchase Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              Semua PR membutuhkan <b>Tanda Tangan Head Finance</b> sebelum dapat digunakan. Status akan direset ke Pending.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal *</Label>
                <Input type="date" value={editForm.tanggal} onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })} /></div>
              <div><Label>Nama Toko / Supplier</Label>
                <Input placeholder="Toko Bangunan ABC..." value={editForm.nama_toko} onChange={(e) => setEditForm({ ...editForm, nama_toko: e.target.value })} /></div>
            </div>
            <div>
              {(() => {
                const editTotalPages = Math.max(1, Math.ceil(editForm.items.length / PR_ITEMS_PER_PAGE));
                const editStartIdx = editPrPage * PR_ITEMS_PER_PAGE;
                const editPageItems = editForm.items.slice(editStartIdx, editStartIdx + PR_ITEMS_PER_PAGE);
                function addEditRow() {
                  const next = [...editForm.items, emptyItem()];
                  setEditForm({ ...editForm, items: next });
                  setEditPrPage(Math.floor((next.length - 1) / PR_ITEMS_PER_PAGE));
                }
                function removeEditRow(idx: number) {
                  const next = editForm.items.filter((_, i) => i !== idx);
                  setEditForm({ ...editForm, items: next });
                  const maxPage = Math.max(0, Math.ceil(next.length / PR_ITEMS_PER_PAGE) - 1);
                  if (editPrPage > maxPage) setEditPrPage(maxPage);
                }
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Label>Daftar Item</Label>
                        {editTotalPages > 1 && (
                          <span className="text-xs text-muted-foreground">({editForm.items.length} item)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editTotalPages > 1 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={editPrPage === 0} onClick={() => setEditPrPage(editPrPage - 1)}>
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span>Hal {editPrPage + 1}/{editTotalPages}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={editPrPage >= editTotalPages - 1} onClick={() => setEditPrPage(editPrPage + 1)}>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        <Button type="button" variant="outline" size="sm" onClick={addEditRow}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Baris
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {editPageItems.map((it, pageLocalIdx) => {
                        const idx = editStartIdx + pageLocalIdx;
                        const exceedsQty = it.rapp_qty != null && it.qty > it.rapp_qty;
                        const exceedsHarga = it.rapp_harga != null && it.harga_perkiraan > it.rapp_harga;
                        const updateEdit = (field: string, val: any) =>
                          setEditForm({ ...editForm, items: editForm.items.map((x, i) => i === idx ? { ...x, [field]: val } : x) });
                        return (
                          <div key={idx} className={`border rounded-md p-3 space-y-2 ${it.mode === "rapp" || exceedsQty || exceedsHarga ? "border-amber-200 bg-amber-50/30" : ""}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Sumber:</span>
                              <div className="flex rounded-md border overflow-hidden text-xs">
                                <button type="button"
                                  className={`px-3 py-1 transition-colors ${it.mode === "manual" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                                  onClick={() => setEditForm({ ...editForm, items: editForm.items.map((x, i) => i === idx ? { mode: "manual", nama_item: "", satuan: "", qty: 1, harga_perkiraan: 0 } : x) })}>
                                  Ketik Manual
                                </button>
                                {proyekBerjalanId && (
                                  <button type="button"
                                    className={`px-3 py-1 border-l transition-colors ${it.mode === "rapp" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                                    onClick={() => setEditForm({ ...editForm, items: editForm.items.map((x, i) => i === idx ? { ...x, mode: "rapp", nama_item: "", satuan: "" } : x) })}>
                                    <ClipboardList className="h-3 w-3 inline mr-1" />Dari RAPP
                                  </button>
                                )}
                              </div>
                              {editForm.items.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive ml-auto"
                                  onClick={() => removeEditRow(idx)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {it.mode === "rapp" && (
                              <div>
                                <Label className="text-xs">Pilih Item dari RAPP</Label>
                                <Select value={it.nama_item || ""} onValueChange={(v) => {
                                  const found = (rappItems as any[]).find((r) => r.nama_item === v);
                                  if (found) setEditForm({ ...editForm, items: editForm.items.map((x, i) => i === idx
                                    ? { mode: "rapp" as const, nama_item: found.nama_item, satuan: found.satuan || "", qty: found.qty || 1, harga_perkiraan: found.harga || 0, rapp_qty: found.qty, rapp_harga: found.harga }
                                    : x) });
                                }}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="— Pilih item RAPP —" /></SelectTrigger>
                                  <SelectContent>
                                    {(rappItems as any[]).length === 0
                                      ? <SelectItem value="__none__" disabled>Belum ada item RAPP</SelectItem>
                                      : (rappItems as any[]).map((r: any, ri: number) => (
                                          <SelectItem key={ri} value={r.nama_item}>{r.nama_item} — {r.satuan} | Qty: {r.qty} | {formatRp(r.harga)}</SelectItem>
                                        ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="grid grid-cols-4 gap-2">
                              <div className="col-span-2">
                                <Label className="text-xs">Nama Item</Label>
                                <Input className="h-8 text-sm" placeholder="Nama item" value={it.nama_item}
                                  readOnly={it.mode === "rapp"} onChange={(e) => updateEdit("nama_item", e.target.value)} />
                              </div>
                              <div>
                                <Label className="text-xs">Satuan</Label>
                                <Input className="h-8 text-sm" placeholder="pcs" value={it.satuan}
                                  readOnly={it.mode === "rapp"} onChange={(e) => updateEdit("satuan", e.target.value)} />
                              </div>
                              <div />
                              <div>
                                <Label className="text-xs">Qty {it.rapp_qty != null && <span className="text-muted-foreground">(RAPP: {it.rapp_qty})</span>}</Label>
                                <Input className={`h-8 text-sm ${exceedsQty ? "border-amber-400 bg-amber-50" : ""}`}
                                  type="number" min={0} value={it.qty} onChange={(e) => updateEdit("qty", Number(e.target.value))} />
                                {exceedsQty && <p className="text-[10px] text-amber-600 mt-0.5">Melebihi RAPP (perlu TTD HF)</p>}
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Harga Perkiraan {it.rapp_harga != null && <span className="text-muted-foreground">(RAPP: {formatRp(it.rapp_harga)})</span>}</Label>
                                <Input className={`h-8 text-sm ${exceedsHarga ? "border-amber-400 bg-amber-50" : ""}`}
                                  type="number" min={0} value={it.harga_perkiraan} onChange={(e) => updateEdit("harga_perkiraan", Number(e.target.value))} />
                                {exceedsHarga && <p className="text-[10px] text-amber-600 mt-0.5">Melebihi RAPP (perlu TTD HF)</p>}
                              </div>
                              <div>
                                <Label className="text-xs">Subtotal</Label>
                                <div className="h-8 flex items-center text-sm font-medium text-muted-foreground">
                                  {formatRp(it.qty * it.harga_perkiraan)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-right text-sm font-semibold mt-2 text-muted-foreground">
                      Total Estimasi: <span className="text-foreground">{formatRp(editForm.items.reduce((s, it) => s + it.qty * it.harga_perkiraan, 0))}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditPRId(null)}>Batal</Button>
              <Button disabled={!editForm.tanggal || updatePRMut.isPending} onClick={submitEditPR}>
                {updatePRMut.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PR Signature Dialog */}
      <SignatureDialog
        open={prSigDialog.open}
        onOpenChange={(v) => setPrSigDialog((s) => ({ ...s, open: v }))}
        title="TTD Head Finance — Purchase Request"
        onSave={(dataUrl) => {
          if (prSigDialog.prId) signPRMut.mutate({ pid: prSigDialog.prId, hf_signature: dataUrl });
        }}
        loading={signPRMut.isPending}
      />
    </div>
  );
}

// ─── UploadDokumenTab ─────────────────────────────────────────────────────────

function UploadDokumenTab({ proyekId }: { proyekId: number }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ kategori: "Nota", tanggal_upload: today });
  const [preview, setPreview] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["adm-dokumen", proyekId],
    queryFn: () => admApi.getDokumen(proyekId),
    retry: false,
  });

  const uploadMut = useMutation({
    mutationFn: (payload: any) => admApi.uploadDokumen(proyekId, payload),
    onSuccess: () => {
      toast.success("Dokumen diupload");
      qc.invalidateQueries({ queryKey: ["adm-dokumen", proyekId] });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal upload"),
  });

  const delMut = useMutation({
    mutationFn: (did: number) => admApi.deleteDokumen(proyekId, did),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["adm-dokumen", proyekId] }); },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      const fileType = file.type.startsWith("image/") ? "image" : "pdf";
      uploadMut.mutate({ kategori: form.kategori, nama_file: file.name, file_data: base64, file_type: fileType, tanggal_upload: form.tanggal_upload });
    };
    reader.readAsDataURL(file);
  }

  async function handleView(doc: any) {
    const full = await admApi.getDokumenFile(proyekId, doc.id);
    setPreview(full);
  }

  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategori</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                  <option>Nota</option><option>Bukti Transfer</option><option>Kontrak</option><option>RAPP</option><option>Time Schedule</option>
                </select></div>
              <div><Label>Tanggal Upload</Label>
                <Input type="date" value={form.tanggal_upload} onChange={(e) => setForm({ ...form, tanggal_upload: e.target.value })} /></div>
            </div>
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Klik untuk pilih file PDF atau gambar</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Nota, Bukti Transfer, Kontrak, RAPP, Time Schedule (PDF/JPG/PNG, maks. 2MB)</p>
              {uploadMut.isPending && <p className="text-xs text-primary mt-2">Mengupload...</p>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Nama File</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Tanggal Upload</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => (
              <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
            ))}</TableRow>
          )) : items.map((doc: any) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium max-w-[200px] truncate text-sm">{doc.nama_file || "—"}</TableCell>
              <TableCell>
                <Badge variant={doc.kategori === "Nota" ? "outline" : "secondary"}>{doc.kategori}</Badge>
              </TableCell>
              <TableCell className="uppercase text-xs text-muted-foreground">{doc.file_type || "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">{new Date(doc.tanggal_upload).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(doc)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delMut.mutate(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && items.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada dokumen diupload</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{preview?.nama_file}</DialogTitle></DialogHeader>
          {preview && (
            <div className="flex justify-center overflow-auto">
              {preview.file_type === "image" ? (
                <img src={`data:image/jpeg;base64,${preview.file_data}`} alt={preview.nama_file} className="max-w-full max-h-[70vh] object-contain rounded" />
              ) : (
                <iframe src={`data:application/pdf;base64,${preview.file_data}`} className="w-full h-[70vh] rounded" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Existing sub-tab components ──────────────────────────────────────────────

const EMPTY_SJ_ITEM = { nama_barang: "", deskripsi: "", qty: 0, satuan: "" };

function SuratJalanTab({ proyekId, proyekNama }: { proyekId: number; proyekNama?: string }) {
  const qc = useQueryClient();

  // List state
  const [openCreate, setOpenCreate] = useState(false);
  const [viewSid, setViewSid] = useState<number | null>(null);
  const [sjSigDialog, setSjSigDialog] = useState(false);

  // Form state
  const emptyForm = { no_dokumen: "", tanggal: today, penerima: "", no_telp: "", keterangan: "" };
  const [form, setForm] = useState({ ...emptyForm });
  const [formItems, setFormItems] = useState([{ ...EMPTY_SJ_ITEM }]);

  // Auto-generate no_dokumen when dialog opens or tanggal changes
  function buildNoDokumen(tanggal: string) {
    const d = tanggal ? new Date(tanggal) : new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const slug = (proyekNama || "").replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, "").slice(0, 30);
    return `RR-${slug}-${dd}${mm}${yyyy}`;
  }

  function openCreateDialog() {
    const nd = buildNoDokumen(today);
    setForm({ ...emptyForm, no_dokumen: nd });
    setFormItems([{ ...EMPTY_SJ_ITEM }]);
    setOpenCreate(true);
  }

  function updateItemRow(idx: number, field: string, val: any) {
    setFormItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  // Queries
  const { data: sjList, isLoading } = useQuery({
    queryKey: ["adm-sj", proyekId],
    queryFn: () => admApi.getSuratJalan(proyekId),
    retry: false,
  });

  const { data: sjDetail } = useQuery({
    queryKey: ["adm-sj-detail", proyekId, viewSid],
    queryFn: () => admApi.getSuratJalanDetail(proyekId, viewSid!),
    enabled: !!viewSid,
    retry: false,
  });

  // Mutations
  const addMut = useMutation({
    mutationFn: (d: any) => admApi.addSuratJalan(proyekId, d),
    onSuccess: () => {
      toast.success("Surat jalan dibuat");
      qc.invalidateQueries({ queryKey: ["adm-sj", proyekId] });
      setOpenCreate(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const delMut = useMutation({
    mutationFn: (sid: number) => admApi.deleteSuratJalan(proyekId, sid),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["adm-sj", proyekId] }); },
  });

  const signAfMut = useMutation({
    mutationFn: (af_signature: string) => admApi.signSuratJalan(proyekId, viewSid!, { af_signature }),
    onSuccess: () => {
      toast.success("Surat jalan ditandatangani AF");
      qc.invalidateQueries({ queryKey: ["adm-sj", proyekId] });
      qc.invalidateQueries({ queryKey: ["adm-sj-detail", proyekId, viewSid] });
      setSjSigDialog(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  async function handleDownloadPDF() {
    if (!viewSid) return;
    try {
      const data = await admApi.getSuratJalanPdfData(proyekId, viewSid);
      const { default: SJPDFComp } = await import("@/components/surat-jalan-pdf");
      const blob = await pdf(<SJPDFComp {...data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${data.surat_jalan?.no_dokumen || "surat-jalan"}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Gagal generate PDF"); }
  }

  const list: any[] = Array.isArray(sjList) ? sjList : [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5 mr-1" /> Buat Surat Jalan</Button>
      </div>

      {/* List table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>No. Dokumen</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Nama Penerima</TableHead>
            <TableHead>No. Telp</TableHead>
            <TableHead>TTD AF</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
          )) : list.map((sj: any) => (
            <TableRow key={sj.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewSid(Number(sj.id))}>
              <TableCell className="font-mono font-medium text-sm">{sj.no_dokumen || "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {sj.tanggal ? new Date(sj.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </TableCell>
              <TableCell className="text-sm">{sj.penerima || "—"}</TableCell>
              <TableCell className="text-sm">{sj.no_telp || "—"}</TableCell>
              <TableCell>
                {sj.af_signed_at ? (
                  <span className="text-xs text-green-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{sj.af_name}</span>
                ) : (
                  <span className="text-xs text-amber-500">⏳ Belum TTD</span>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delMut.mutate(Number(sj.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && list.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada surat jalan</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Surat Jalan Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>No. Dokumen</Label>
                <Input value={form.no_dokumen} onChange={(e) => setForm({ ...form, no_dokumen: e.target.value })} placeholder="RR-NamaProyek-ddmmyyyy" />
                <p className="text-xs text-muted-foreground mt-0.5">Format: RR-NamaProyek-tanggalbulanTahun</p>
              </div>
              <div>
                <Label>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={(e) => {
                  const t = e.target.value;
                  setForm((f) => ({ ...f, tanggal: t, no_dokumen: buildNoDokumen(t) }));
                }} />
              </div>
              <div>
                <Label>No. Telp Penerima</Label>
                <Input placeholder="08xx-xxxx-xxxx" value={form.no_telp} onChange={(e) => setForm({ ...form, no_telp: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Nama Penerima *</Label>
                <Input placeholder="Nama penerima material..." value={form.penerima} onChange={(e) => setForm({ ...form, penerima: e.target.value })} />
              </div>
            </div>

            {/* Items table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Daftar Barang</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormItems((p) => [...p, { ...EMPTY_SJ_ITEM }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Baris
                </Button>
              </div>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8">No</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-24">Satuan</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formItems.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
                        <TableCell><Input className="h-8 text-sm" placeholder="Nama barang..." value={it.nama_barang} onChange={(e) => updateItemRow(idx, "nama_barang", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-sm" placeholder="Deskripsi..." value={it.deskripsi} onChange={(e) => updateItemRow(idx, "deskripsi", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 text-sm" type="number" min={0} value={it.qty || ""} onChange={(e) => updateItemRow(idx, "qty", Number(e.target.value))} /></TableCell>
                        <TableCell><Input className="h-8 text-sm" placeholder="pcs, m2..." value={it.satuan} onChange={(e) => updateItemRow(idx, "satuan", e.target.value)} /></TableCell>
                        <TableCell>
                          {formItems.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setFormItems((p) => p.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button
                disabled={!form.tanggal || !form.penerima || addMut.isPending}
                onClick={() => addMut.mutate({ ...form, items: formItems })}
              >
                {addMut.isPending ? "Menyimpan..." : "Buat Surat Jalan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail / View dialog */}
      <Dialog open={!!viewSid} onOpenChange={(v) => { if (!v) setViewSid(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-500" />
              Detail Surat Jalan
            </DialogTitle>
          </DialogHeader>
          {sjDetail && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">No. Dokumen:</span> <span className="font-mono font-medium">{sjDetail.no_dokumen || "—"}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> {sjDetail.tanggal ? new Date(sjDetail.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</div>
                <div><span className="text-muted-foreground">Nama Penerima:</span> {sjDetail.penerima || "—"}</div>
                <div><span className="text-muted-foreground">No. Telp:</span> {sjDetail.no_telp || "—"}</div>
              </div>

              {/* Items */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8">No</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right w-16">Qty</TableHead>
                      <TableHead className="w-20">Satuan</TableHead>
                      <TableHead className="text-right w-20">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sjDetail.items || []).map((it: any, idx: number) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{it.nama_barang || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{it.deskripsi || "—"}</TableCell>
                        <TableCell className="text-right">{Number(it.qty).toLocaleString("id-ID")}</TableCell>
                        <TableCell>{it.satuan || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{Number(it.qty).toLocaleString("id-ID")} {it.satuan}</TableCell>
                      </TableRow>
                    ))}
                    {(!sjDetail.items || sjDetail.items.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Tidak ada item</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* AF Status */}
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tanda Tangan Admin Finance</p>
                  {sjDetail.af_signed_at ? (
                    <p className="text-xs text-green-600 mt-0.5">✓ {sjDetail.af_name} — {new Date(sjDetail.af_signed_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-0.5">⏳ Belum ditandatangani</p>
                  )}
                  {sjDetail.af_signature && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sjDetail.af_signature} alt="TTD AF" className="mt-2 max-h-16 border rounded bg-white p-1 object-contain" />
                  )}
                </div>
                <div className="flex gap-2">
                  {!sjDetail.af_signed_at && (
                    <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" onClick={() => setSjSigDialog(true)}>
                      <PenLine className="h-3.5 w-3.5 mr-1" /> TTD AF
                    </Button>
                  )}
                  <Button size="sm" variant="default" disabled={!sjDetail.af_signed_at} onClick={handleDownloadPDF}
                    title={!sjDetail.af_signed_at ? "Harus ditandatangani AF terlebih dahulu" : "Download PDF"}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> Download PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AF Signature dialog */}
      <SignatureDialog
        open={sjSigDialog}
        onOpenChange={setSjSigDialog}
        title="Tanda Tangan Admin Finance — Surat Jalan"
        onSave={(dataUrl) => signAfMut.mutate(dataUrl)}
        loading={signAfMut.isPending}
      />
    </div>
  );
}

// ─── TukangTab (unified: registry + absen foto + kasbon + gajian + kwitansi) ──

function TukangTab({ proyekId, proyekNama, proyekKlien }: { proyekId: number; proyekNama: string; proyekKlien?: string }) {
  const qc = useQueryClient();
  const [innerTab, setInnerTab] = useState("registry");

  // ── PDF download helper ──────────────────────────────────────────────────────
  async function downloadPDF(type: string, data: any[], meta?: any) {
    const { default: Comp } = await import("@/components/tukang-pdf");
    const logoUrl = await getLogoBase64();
    const blob = await pdf(
      <Comp
        type={type as any}
        project={{ nama_proyek: proyekNama, klien: proyekKlien }}
        data={data}
        meta={meta}
        logoUrl={logoUrl}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tukang-${type}-${proyekNama}-${today}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Registry ────────────────────────────────────────────────────────────────
  const [openAddTukang, setOpenAddTukang] = useState(false);
  const [editTukang, setEditTukang] = useState<any | null>(null);
  const [formTukang, setFormTukang] = useState({ nama: "", jabatan: "Tukang", upah_harian: 0, user_id: "" });

  const { data: registryData, isLoading: loadingRegistry } = useQuery({ queryKey: ["tukang-registry", proyekId], queryFn: () => admApi.getTukangRegistry(proyekId) });
  const registry: any[] = Array.isArray(registryData) ? registryData : [];

  const { data: availableUsersData } = useQuery({
    queryKey: ["tukang-available-users", proyekId],
    queryFn: () => admApi.getTukangUsers(proyekId),
    enabled: openAddTukang || !!editTukang,
  });
  const availableUsers: any[] = Array.isArray(availableUsersData) ? availableUsersData : [];

  const addTukangMut = useMutation({
    mutationFn: (d: any) => admApi.addTukang(proyekId, d),
    onSuccess: () => { toast.success("Tukang ditambahkan"); qc.invalidateQueries({ queryKey: ["tukang-registry", proyekId] }); qc.invalidateQueries({ queryKey: ["tukang-available-users", proyekId] }); setOpenAddTukang(false); setFormTukang({ nama: "", jabatan: "Tukang", upah_harian: 0, user_id: "" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const updateTukangMut = useMutation({
    mutationFn: ({ tid, data }: { tid: number; data: any }) => admApi.updateTukang(proyekId, tid, data),
    onSuccess: () => { toast.success("Tukang diupdate"); qc.invalidateQueries({ queryKey: ["tukang-registry", proyekId] }); setEditTukang(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const delTukangMut = useMutation({
    mutationFn: (tid: number) => admApi.deleteTukang(proyekId, tid),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tukang-registry", proyekId] }); },
  });

  // ── Absen Foto ──────────────────────────────────────────────────────────────
  const [absenFilter, setAbsenFilter] = useState("Pending");
  const [viewAbsenFoto, setViewAbsenFoto] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: number } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: absenData, isLoading: loadingAbsen } = useQuery({
    queryKey: ["tukang-absen-foto", proyekId, absenFilter],
    queryFn: () => admApi.getAbsenFoto(proyekId, absenFilter !== "Semua" ? { status: absenFilter } : {}),
    enabled: innerTab === "absen",
  });
  const absenItems: any[] = Array.isArray(absenData) ? absenData : [];

  const approveMut = useMutation({
    mutationFn: (aid: number) => admApi.approveAbsen(proyekId, aid),
    onSuccess: () => { toast.success("Absensi disetujui"); qc.invalidateQueries({ queryKey: ["tukang-absen-foto", proyekId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const rejectMut = useMutation({
    mutationFn: ({ aid, catatan }: { aid: number; catatan?: string }) => admApi.rejectAbsen(proyekId, aid, catatan),
    onSuccess: () => { toast.success("Absensi ditolak"); qc.invalidateQueries({ queryKey: ["tukang-absen-foto", proyekId] }); setRejectDialog(null); setRejectNote(""); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const [checklistDialog, setChecklistDialog] = useState(false);
  const [checklistForm, setChecklistForm] = useState({ tukang_id: "", tanggal: today });
  const checklistMut = useMutation({
    mutationFn: (d: { tukang_id: string; tanggal: string }) => admApi.checklistAbsen(proyekId, d),
    onSuccess: () => { toast.success("Absensi dicatat & disetujui"); qc.invalidateQueries({ queryKey: ["tukang-absen-foto", proyekId] }); setChecklistDialog(false); setChecklistForm({ tukang_id: "", tanggal: today }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  // ── Kasbon ──────────────────────────────────────────────────────────────────
  const [openKasbon, setOpenKasbon] = useState(false);
  const [formKasbon, setFormKasbon] = useState({ tukang_id: "", jumlah: 0, catatan: "", tanggal: today });
  const [editKasbon, setEditKasbon] = useState<{ open: boolean; id: number | null; jumlah: number; catatan: string; tanggal: string }>({ open: false, id: null, jumlah: 0, catatan: "", tanggal: today });

  const { data: kasbonData, isLoading: loadingKasbon } = useQuery({
    queryKey: ["tukang-kasbon", proyekId],
    queryFn: () => admApi.getKasbon(proyekId),
    enabled: innerTab === "kasbon",
  });
  const kasbons: any[] = Array.isArray(kasbonData) ? kasbonData : [];
  const kasbonBelum = kasbons.filter((k) => !k.sudah_dipotong && !k.jumlah_dipotong);
  const kasbonCicilan = kasbons.filter((k) => !k.sudah_dipotong && k.jumlah_dipotong > 0);
  const kasbonSudah = kasbons.filter((k) => k.sudah_dipotong);

  const addKasbonMut = useMutation({
    mutationFn: (d: any) => admApi.addKasbon(proyekId, Number(d.tukang_id), { jumlah: d.jumlah, catatan: d.catatan, tanggal: d.tanggal }),
    onSuccess: () => { toast.success("Kasbon dicatat"); qc.invalidateQueries({ queryKey: ["tukang-kasbon", proyekId] }); setOpenKasbon(false); setFormKasbon({ tukang_id: "", jumlah: 0, catatan: "", tanggal: today }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const updateKasbonMut = useMutation({
    mutationFn: ({ cid, data }: { cid: number; data: any }) => admApi.updateKasbon(proyekId, cid, data),
    onSuccess: () => { toast.success("Kasbon diupdate"); qc.invalidateQueries({ queryKey: ["tukang-kasbon", proyekId] }); setEditKasbon({ open: false, id: null, jumlah: 0, catatan: "", tanggal: today }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const delKasbonMut = useMutation({
    mutationFn: (cid: number) => admApi.deleteKasbon(proyekId, cid),
    onSuccess: () => { toast.success("Kasbon dihapus"); qc.invalidateQueries({ queryKey: ["tukang-kasbon", proyekId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  // ── Gajian ──────────────────────────────────────────────────────────────────
  const [openGajian, setOpenGajian] = useState(false);
  const [gajianPeriode, setGajianPeriode] = useState({ mulai: today, selesai: today });
  const [gajianItems, setGajianItems] = useState<Array<{ tukang_id: string; tukang_name: string; hari_kerja: number; daily_rate: number; kasbon_dipotong: number; kasbon_tersedia: number }>>([]);

  const { data: gajianData, isLoading: loadingGajian } = useQuery({
    queryKey: ["tukang-gajian", proyekId],
    queryFn: () => admApi.getGajian(proyekId),
    enabled: innerTab === "gajian",
  });
  const gajians: any[] = Array.isArray(gajianData) ? gajianData : [];

  const createGajianMut = useMutation({
    mutationFn: (d: any) => admApi.createGajian(proyekId, d),
    onSuccess: () => { toast.success("Gajian diproses & kwitansi dibuat"); qc.invalidateQueries({ queryKey: ["tukang-gajian", proyekId] }); qc.invalidateQueries({ queryKey: ["tukang-kwitansi", proyekId] }); qc.invalidateQueries({ queryKey: ["tukang-kasbon", proyekId] }); setOpenGajian(false); setGajianItems([]); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const delGajianMut = useMutation({
    mutationFn: (gid: number) => admApi.deleteGajian(proyekId, gid),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tukang-gajian", proyekId] }); },
  });

  // ── Gajian Signatures ────────────────────────────────────────────────────────
  const [gajianSigDialog, setGajianSigDialog] = useState<{ open: boolean; gid: number | null; mode: "af" | "hf" }>({ open: false, gid: null, mode: "af" });

  const signGajianAFMut = useMutation({
    mutationFn: ({ gid, af_signature }: { gid: number; af_signature: string }) =>
      admApi.signGajianAF(proyekId, gid, { af_signature }),
    onSuccess: () => { toast.success("TTD Admin Finance disimpan"); qc.invalidateQueries({ queryKey: ["tukang-gajian", proyekId] }); setGajianSigDialog({ open: false, gid: null, mode: "af" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });
  const signGajianHFMut = useMutation({
    mutationFn: ({ gid, hf_signature }: { gid: number; hf_signature: string }) =>
      admApi.signGajianHF(proyekId, gid, { hf_signature }),
    onSuccess: () => { toast.success("TTD Head Finance disimpan"); qc.invalidateQueries({ queryKey: ["tukang-gajian", proyekId] }); setGajianSigDialog({ open: false, gid: null, mode: "af" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  async function openGajianDialog() {
    // Fetch pending kasbons to pre-fill kasbon_dipotong per tukang
    const pendingPerTukang = new Map<string, number>();
    try {
      const kasbonData = await admApi.getKasbon(proyekId);
      for (const k of (kasbonData as any[])) {
        if (!k.sudah_dipotong && k.tukang_id) {
          const tid = String(k.tukang_id);
          const sisa = Number(k.sisa ?? k.jumlah);
          pendingPerTukang.set(tid, (pendingPerTukang.get(tid) ?? 0) + sisa);
        }
      }
    } catch { /* use 0 if fetch fails */ }
    setGajianItems(registry.map((r) => ({
      tukang_id: String(r.id), tukang_name: r.nama,
      hari_kerja: 0, daily_rate: Number(r.upah_harian),
      kasbon_dipotong: pendingPerTukang.get(String(r.id)) ?? 0,
      kasbon_tersedia: pendingPerTukang.get(String(r.id)) ?? 0,
    })));
    setOpenGajian(true);
  }

  // Auto-fill hari_kerja from approved absens for selected period
  async function autoFillHariKerja() {
    if (!gajianPeriode.mulai || !gajianPeriode.selesai) return;
    try {
      const fotos = await admApi.getAbsenFoto(proyekId, { status: "Disetujui" });
      const start = new Date(gajianPeriode.mulai);
      const end = new Date(gajianPeriode.selesai);
      const updated = gajianItems.map((item) => {
        const approved = (fotos as any[]).filter((f: any) => {
          if (String(f.tukang_id) !== item.tukang_id) return false;
          const d = new Date(f.tanggal);
          return d >= start && d <= end;
        });
        return { ...item, hari_kerja: approved.length };
      });
      setGajianItems(updated);
      toast.success("Hari kerja diisi otomatis dari absen tersetujui");
    } catch { toast.error("Gagal mengambil data absen"); }
  }

  // ── Kwitansi ────────────────────────────────────────────────────────────────
  const { data: kwitansiData, isLoading: loadingKwitansi } = useQuery({
    queryKey: ["tukang-kwitansi", proyekId],
    queryFn: () => admApi.getTukangKwitansi(proyekId),
    enabled: innerTab === "kwitansi",
  });
  const kwitansis: any[] = Array.isArray(kwitansiData) ? kwitansiData : [];

  const STATUS_COLOR: Record<string, string> = { Pending: "secondary", Disetujui: "default", Ditolak: "destructive" };
  const fmtDate = (d: string | Date | null | undefined) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-3">
      <Tabs value={innerTab} onValueChange={setInnerTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="registry" className="text-xs"><UserCheck className="h-3 w-3 mr-1" /> Daftar Tukang</TabsTrigger>
          <TabsTrigger value="absen" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Absen Foto</TabsTrigger>
          <TabsTrigger value="kasbon" className="text-xs"><Wallet className="h-3 w-3 mr-1" /> Kasbon</TabsTrigger>
          <TabsTrigger value="gajian" className="text-xs"><Banknote className="h-3 w-3 mr-1" /> Gajian</TabsTrigger>
          <TabsTrigger value="kwitansi" className="text-xs"><Receipt className="h-3 w-3 mr-1" /> Kwitansi</TabsTrigger>
        </TabsList>

        {/* ── Registry ── */}
        <TabsContent value="registry" className="mt-3 space-y-3">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadPDF("registry", registry)}>
              <FileDown className="h-3.5 w-3.5 mr-1" /> Download PDF
            </Button>
            <Button size="sm" onClick={() => { setFormTukang({ nama: "", jabatan: "Tukang", upah_harian: 0, user_id: "" }); setOpenAddTukang(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Tukang
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nama</TableHead><TableHead>Jabatan</TableHead>
              <TableHead className="text-right">Upah/Hari</TableHead><TableHead className="w-20" />
            </TableRow></TableHeader>
            <TableBody>
              {loadingRegistry ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{[0,1,2,3].map((j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
              : registry.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell><Badge variant="outline">{r.jabatan || "Tukang"}</Badge></TableCell>
                  <TableCell className="text-right">{formatRp(r.upah_harian)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTukang(r); setFormTukang({ nama: r.nama, jabatan: r.jabatan || "Tukang", upah_harian: r.upah_harian, user_id: "" }); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delTukangMut.mutate(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loadingRegistry && registry.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada tukang terdaftar</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ── Absen Foto ── */}
        <TabsContent value="absen" className="mt-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-muted-foreground">Filter:</Label>
            {["Semua", "Pending", "Disetujui", "Ditolak"].map((s) => (
              <Button key={s} variant={absenFilter === s ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setAbsenFilter(s)}>{s}</Button>
            ))}
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => { setChecklistForm({ tukang_id: registry[0]?.id?.toString() ?? "", tanggal: today }); setChecklistDialog(true); }} disabled={registry.length === 0}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Checklist Hadir
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadPDF("absen", absenItems, { filter: absenFilter })}>
                <FileDown className="h-3.5 w-3.5 mr-1" /> Download PDF
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tukang</TableHead><TableHead>Tanggal</TableHead>
              <TableHead>Timestamp</TableHead><TableHead>Status</TableHead><TableHead className="w-32" />
            </TableRow></TableHeader>
            <TableBody>
              {loadingAbsen ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{[0,1,2,3,4].map((j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
              : absenItems.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div><p className="font-medium text-sm">{a.tukang_nama}</p>
                    <p className="text-xs text-muted-foreground">{a.tukang_jabatan}</p></div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fmtDate(a.tanggal)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.foto_timestamp ? new Date(a.foto_timestamp).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLOR[a.status] as any ?? "secondary"} className="text-xs">{a.status}</Badge>
                    {a.catatan && <p className="text-xs text-muted-foreground mt-0.5">{a.catatan}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {a.foto && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewAbsenFoto(a.foto)}><Eye className="h-3 w-3 mr-1" /> Foto</Button>}
                      {a.status === "Pending" && (
                        <>
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => approveMut.mutate(a.id)} disabled={approveMut.isPending}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Setuju
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => { setRejectDialog({ id: a.id }); setRejectNote(""); }}>
                            <XCircle className="h-3 w-3 mr-1" /> Tolak
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loadingAbsen && absenItems.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada data absensi</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ── Kasbon ── */}
        <TabsContent value="kasbon" className="mt-3 space-y-3">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadPDF("kasbon", kasbons)}>
              <FileDown className="h-3.5 w-3.5 mr-1" /> Download PDF
            </Button>
            <Button size="sm" onClick={() => setOpenKasbon(true)} disabled={registry.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Catat Kasbon
            </Button>
          </div>
          {loadingKasbon ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : kasbons.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Belum ada kasbon</p>
          ) : (
            <div className="space-y-4">
              {/* Section: Belum Dibayar */}
              {kasbonBelum.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Belum Dibayar ({kasbonBelum.length})</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tukang</TableHead><TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead><TableHead>Catatan</TableHead>
                      <TableHead className="w-16" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {kasbonBelum.map((k: any) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.tukang_nama}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{fmtDate(k.tanggal)}</TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">{formatRp(k.jumlah)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{k.catatan || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditKasbon({ open: true, id: k.id, jumlah: Number(k.jumlah), catatan: k.catatan || "", tanggal: k.tanggal?.slice(0, 10) || today })}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delKasbonMut.mutate(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* Section: Dicicil (sebagian dibayar) */}
              {kasbonCicilan.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Dicicil ({kasbonCicilan.length})</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tukang</TableHead><TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Dibayar</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {kasbonCicilan.map((k: any) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.tukang_nama}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{fmtDate(k.tanggal)}</TableCell>
                          <TableCell className="text-right text-sm">{formatRp(k.jumlah)}</TableCell>
                          <TableCell className="text-right text-sm text-green-600">{formatRp(k.jumlah_dipotong)}</TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">{formatRp(k.sisa)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{k.catatan || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* Section: Lunas */}
              {kasbonSudah.length > 0 && (
                <div className="opacity-60">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lunas ({kasbonSudah.length})</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tukang</TableHead><TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead><TableHead>Catatan</TableHead>
                      <TableHead className="w-8" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {kasbonSudah.map((k: any) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.tukang_nama}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{fmtDate(k.tanggal)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatRp(k.jumlah)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{k.catatan || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-green-600 border-green-300 text-xs">Lunas</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Gajian ── */}
        <TabsContent value="gajian" className="mt-3 space-y-3">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={openGajianDialog} disabled={registry.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Proses Gajian Mingguan
            </Button>
          </div>
          {gajians.map((g: any) => (
            <div key={g.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {g.tanggal_mulai ? fmtDate(g.tanggal_mulai) : `${g.bulan}/${g.tahun}`}
                    {g.tanggal_selesai && <> — {fmtDate(g.tanggal_selesai)}</>}
                  </p>
                  <p className="text-xs text-muted-foreground">{g.total_hari_kerja} hari kerja total</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span className="font-bold text-sm mr-1">{formatRp(g.total_gaji)}</span>
                  {g.kwitansi_dibuat && <Badge variant="outline" className="text-green-600 border-green-300 text-xs"><Receipt className="h-3 w-3 mr-1" /> Kwitansi</Badge>}
                  {/* TTD Admin Finance */}
                  {g.af_signature
                    ? <Badge variant="outline" className="text-green-600 border-green-300 text-xs gap-1"><CheckCircle className="h-3 w-3" /> AF</Badge>
                    : <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGajianSigDialog({ open: true, gid: g.id, mode: "af" })}>
                        <PenLine className="h-3 w-3 mr-1" /> TTD AF
                      </Button>}
                  {/* TTD Head Finance */}
                  {g.hf_signature
                    ? <Badge variant="outline" className="text-green-600 border-green-300 text-xs gap-1"><CheckCircle className="h-3 w-3" /> HF</Badge>
                    : <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGajianSigDialog({ open: true, gid: g.id, mode: "hf" })}>
                        <PenLine className="h-3 w-3 mr-1" /> TTD HF
                      </Button>}
                  {/* PDF Gajian — locked until fully signed */}
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!g.is_fully_signed}
                    title={!g.is_fully_signed ? "Perlu TTD AF dan HF terlebih dahulu" : undefined}
                    onClick={() => downloadPDF("gajian", g.items || [], {
                      tanggal_mulai: g.tanggal_mulai, tanggal_selesai: g.tanggal_selesai,
                      signatures: { af: { signature: g.af_signature, at: g.af_signed_at }, hf: { signature: g.hf_signature, at: g.hf_signed_at } },
                    })}>
                    <FileDown className="h-3 w-3 mr-1" /> PDF Gajian
                  </Button>
                  {/* PDF Kwitansi per periode — locked until fully signed */}
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!g.is_fully_signed}
                    title={!g.is_fully_signed ? "Perlu TTD AF dan HF terlebih dahulu" : undefined}
                    onClick={() => downloadPDF("kwitansi", g.kwitansis || [], {
                      tanggal_mulai: g.tanggal_mulai, tanggal_selesai: g.tanggal_selesai,
                      signatures: { af: { signature: g.af_signature, at: g.af_signed_at }, hf: { signature: g.hf_signature, at: g.hf_signed_at } },
                    })}>
                    <FileDown className="h-3 w-3 mr-1" /> PDF Kwitansi
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => delGajianMut.mutate(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Tukang</TableHead><TableHead className="text-right text-xs">Hari</TableHead>
                  <TableHead className="text-right text-xs">Upah/Hari</TableHead><TableHead className="text-right text-xs">Kasbon</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(g.items || []).map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs">{it.tukang_name}</TableCell>
                      <TableCell className="text-right text-xs">{it.hari_kerja}</TableCell>
                      <TableCell className="text-right text-xs">{formatRp(it.daily_rate)}</TableCell>
                      <TableCell className="text-right text-xs text-orange-600">{it.kasbon_dipotong > 0 ? `-${formatRp(it.kasbon_dipotong)}` : "—"}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{formatRp(it.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
          {!loadingGajian && gajians.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">Belum ada data gajian</p>}
        </TabsContent>

        {/* ── Kwitansi ── */}
        <TabsContent value="kwitansi" className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => downloadPDF("kwitansi", kwitansis)}>
              <FileDown className="h-3.5 w-3.5 mr-1" /> Download PDF
            </Button>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tukang</TableHead><TableHead>Periode</TableHead>
              <TableHead className="text-right">Gaji Kotor</TableHead><TableHead className="text-right">Kasbon</TableHead>
              <TableHead className="text-right">Dibayar</TableHead><TableHead>Tanggal</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loadingKwitansi ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{[0,1,2,3,4,5].map((j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)
              : kwitansis.map((k: any) => {
                  const gajiBruto = Number(k.jumlah_gaji) + Number(k.kasbon_dipotong || 0);
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.tukang_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {k.tanggal_mulai ? `${fmtDate(k.tanggal_mulai)} – ${fmtDate(k.tanggal_selesai)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatRp(gajiBruto)}</TableCell>
                      <TableCell className="text-right text-sm text-orange-600">{k.kasbon_dipotong > 0 ? `-${formatRp(k.kasbon_dipotong)}` : "—"}</TableCell>
                      <TableCell className="text-right font-bold">{formatRp(k.jumlah_gaji)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{fmtDate(k.tanggal_pembayaran)}</TableCell>
                    </TableRow>
                  );
                })}
              {!loadingKwitansi && kwitansis.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada kwitansi</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* ── Add Tukang Dialog ── */}
      <Dialog open={openAddTukang || !!editTukang} onOpenChange={(v) => { if (!v) { setOpenAddTukang(false); setEditTukang(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editTukang ? "Edit Tukang" : "Tambah Tukang"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editTukang && (
              <div>
                <Label>Pilih User Tukang *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={formTukang.user_id}
                  onChange={(e) => {
                    const uid = e.target.value;
                    const user = availableUsers.find((u: any) => String(u.id) === uid);
                    setFormTukang({ ...formTukang, user_id: uid, nama: user ? user.name : formTukang.nama });
                  }}
                >
                  <option value="">— Pilih user —</option>
                  {availableUsers.map((u: any) => (
                    <option key={u.id} value={String(u.id)} disabled={u.already_assigned}>
                      {u.name}{u.already_assigned ? " (Sudah terdaftar)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Nama *</Label>
              <Input placeholder="Nama lengkap" value={formTukang.nama} onChange={(e) => setFormTukang({ ...formTukang, nama: e.target.value })} />
            </div>
            <div><Label>Jabatan</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={formTukang.jabatan} onChange={(e) => setFormTukang({ ...formTukang, jabatan: e.target.value })}>
                <option>Tukang</option><option>Mandor</option><option>Helper</option><option>Kenek</option>
              </select>
            </div>
            <div><Label>Upah Harian (Rp)</Label><Input type="number" min={0} value={formTukang.upah_harian} onChange={(e) => setFormTukang({ ...formTukang, upah_harian: Number(e.target.value) })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpenAddTukang(false); setEditTukang(null); }}>Batal</Button>
              <Button
                disabled={(!formTukang.nama && !formTukang.user_id) || addTukangMut.isPending || updateTukangMut.isPending}
                onClick={() => editTukang
                  ? updateTukangMut.mutate({ tid: editTukang.id, data: { nama: formTukang.nama, jabatan: formTukang.jabatan, upah_harian: formTukang.upah_harian } })
                  : addTukangMut.mutate({ nama: formTukang.nama, jabatan: formTukang.jabatan, upah_harian: formTukang.upah_harian, user_id: formTukang.user_id || undefined })
                }
              >
                {(addTukangMut.isPending || updateTukangMut.isPending) ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Kasbon Dialog ── */}
      <Dialog open={openKasbon} onOpenChange={setOpenKasbon}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Catat Kasbon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tukang *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={formKasbon.tukang_id} onChange={(e) => setFormKasbon({ ...formKasbon, tukang_id: e.target.value })}>
                <option value="">— Pilih tukang —</option>
                {registry.map((r: any) => <option key={r.id} value={r.id}>{r.nama} ({r.jabatan})</option>)}
              </select>
            </div>
            <div><Label>Jumlah (Rp) *</Label><Input type="number" min={0} value={formKasbon.jumlah} onChange={(e) => setFormKasbon({ ...formKasbon, jumlah: Number(e.target.value) })} /></div>
            <div><Label>Tanggal</Label><Input type="date" value={formKasbon.tanggal} onChange={(e) => setFormKasbon({ ...formKasbon, tanggal: e.target.value })} /></div>
            <div><Label>Catatan</Label><Input placeholder="(opsional)" value={formKasbon.catatan} onChange={(e) => setFormKasbon({ ...formKasbon, catatan: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenKasbon(false)}>Batal</Button>
              <Button disabled={!formKasbon.tukang_id || !formKasbon.jumlah || addKasbonMut.isPending} onClick={() => addKasbonMut.mutate(formKasbon)}>
                {addKasbonMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Kasbon Dialog ── */}
      <Dialog open={editKasbon.open} onOpenChange={(v) => setEditKasbon((s) => ({ ...s, open: v }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Kasbon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Jumlah (Rp) *</Label><Input type="number" min={0} value={editKasbon.jumlah} onChange={(e) => setEditKasbon((s) => ({ ...s, jumlah: Number(e.target.value) }))} /></div>
            <div><Label>Tanggal</Label><Input type="date" value={editKasbon.tanggal} onChange={(e) => setEditKasbon((s) => ({ ...s, tanggal: e.target.value }))} /></div>
            <div><Label>Catatan</Label><Input placeholder="(opsional)" value={editKasbon.catatan} onChange={(e) => setEditKasbon((s) => ({ ...s, catatan: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditKasbon((s) => ({ ...s, open: false }))}>Batal</Button>
              <Button disabled={!editKasbon.jumlah || updateKasbonMut.isPending} onClick={() => updateKasbonMut.mutate({ cid: editKasbon.id!, data: { jumlah: editKasbon.jumlah, catatan: editKasbon.catatan, tanggal: editKasbon.tanggal } })}>
                {updateKasbonMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Proses Gajian Dialog ── */}
      <Dialog open={openGajian} onOpenChange={setOpenGajian}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Proses Gajian Mingguan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal Mulai *</Label><Input type="date" value={gajianPeriode.mulai} onChange={(e) => setGajianPeriode({ ...gajianPeriode, mulai: e.target.value })} /></div>
              <div><Label>Tanggal Selesai *</Label><Input type="date" value={gajianPeriode.selesai} onChange={(e) => setGajianPeriode({ ...gajianPeriode, selesai: e.target.value })} /></div>
            </div>
            <Button variant="outline" size="sm" onClick={autoFillHariKerja}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Auto-isi Hari Kerja dari Absen Disetujui
            </Button>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tukang</TableHead><TableHead className="text-right">Hari</TableHead>
                <TableHead className="text-right">Upah/Hari</TableHead><TableHead className="text-right">Kasbon</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {gajianItems.map((item, idx) => {
                  const total = Math.max(0, item.hari_kerja * item.daily_rate - item.kasbon_dipotong);
                  return (
                    <TableRow key={item.tukang_id}>
                      <TableCell className="text-sm font-medium">{item.tukang_name}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} className="w-16 h-7 text-xs text-right" value={item.hari_kerja}
                          onChange={(e) => { const arr = [...gajianItems]; arr[idx] = { ...arr[idx], hari_kerja: Number(e.target.value) }; setGajianItems(arr); }} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} className="w-24 h-7 text-xs text-right" value={item.daily_rate}
                          onChange={(e) => { const arr = [...gajianItems]; arr[idx] = { ...arr[idx], daily_rate: Number(e.target.value) }; setGajianItems(arr); }} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} className="w-24 h-7 text-xs text-right" value={item.kasbon_dipotong}
                          onChange={(e) => { const arr = [...gajianItems]; arr[idx] = { ...arr[idx], kasbon_dipotong: Number(e.target.value) }; setGajianItems(arr); }} />
                        {item.kasbon_tersedia > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">Tersedia: {formatRp(item.kasbon_tersedia)}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatRp(total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm font-semibold">
                Total: {formatRp(gajianItems.reduce((s, i) => s + Math.max(0, i.hari_kerja * i.daily_rate - i.kasbon_dipotong), 0))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpenGajian(false)}>Batal</Button>
                <Button disabled={createGajianMut.isPending || !gajianPeriode.mulai}
                  onClick={() => createGajianMut.mutate({ tanggal_mulai: gajianPeriode.mulai, tanggal_selesai: gajianPeriode.selesai, items: gajianItems })}>
                  {createGajianMut.isPending ? "Memproses..." : "Proses Gajian"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Foto Absen Dialog ── */}
      <Dialog open={!!viewAbsenFoto} onOpenChange={() => setViewAbsenFoto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Foto Absensi</DialogTitle></DialogHeader>
          {viewAbsenFoto && <img src={viewAbsenFoto} alt="foto absen" className="w-full rounded-lg object-contain max-h-96" />}
        </DialogContent>
      </Dialog>

      {/* ── Reject Absen Dialog ── */}
      <Dialog open={!!rejectDialog} onOpenChange={(v) => { if (!v) setRejectDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tolak Absensi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Alasan penolakan (opsional)</Label><Input placeholder="Foto tidak jelas, dll." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Batal</Button>
              <Button variant="destructive" disabled={rejectMut.isPending} onClick={() => rejectMut.mutate({ aid: rejectDialog!.id, catatan: rejectNote })}>
                {rejectMut.isPending ? "Menolak..." : "Tolak"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Checklist Absen Dialog ── */}
      <Dialog open={checklistDialog} onOpenChange={setChecklistDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" />Checklist Hadir Tukang</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Admin/Kepala Tukang dapat mencatat kehadiran langsung tanpa foto. Status otomatis disetujui.</p>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs">Tukang</Label>
              <Select value={checklistForm.tukang_id} onValueChange={(v) => setChecklistForm({ ...checklistForm, tukang_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih tukang" /></SelectTrigger>
                <SelectContent>
                  {registry.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.nama} {r.jabatan ? `(${r.jabatan})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={checklistForm.tanggal} max={today} onChange={(e) => setChecklistForm({ ...checklistForm, tanggal: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setChecklistDialog(false)}>Batal</Button>
              <Button disabled={!checklistForm.tukang_id || !checklistForm.tanggal || checklistMut.isPending} onClick={() => checklistMut.mutate(checklistForm)}>
                {checklistMut.isPending ? "Menyimpan..." : "Checklist Hadir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Gajian Signature Dialog ── */}
      <SignatureDialog
        open={gajianSigDialog.open}
        onOpenChange={(v) => setGajianSigDialog((s) => ({ ...s, open: v }))}
        title={gajianSigDialog.mode === "af" ? "TTD Admin Finance — Rekap Gajian" : "TTD Head Finance — Rekap Gajian"}
        onSave={(dataUrl) => {
          if (!gajianSigDialog.gid) return;
          if (gajianSigDialog.mode === "af")
            signGajianAFMut.mutate({ gid: gajianSigDialog.gid, af_signature: dataUrl });
          else
            signGajianHFMut.mutate({ gid: gajianSigDialog.gid, hf_signature: dataUrl });
        }}
        loading={signGajianAFMut.isPending || signGajianHFMut.isPending}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdministrasiProjekPage() {
  const qc = useQueryClient();
  const [selectedProyek, setSelectedProyek] = useState<any | null>(null);
  const [openProyek, setOpenProyek] = useState(false);
  const [editProyek, setEditProyek] = useState<any | null>(null);
  const [confirmDeleteProyek, setConfirmDeleteProyek] = useState<any | null>(null);
  const [formProyek, setFormProyek] = useState({ nama_proyek: "", klien: "", jenis: "Sipil", tanggal_mulai: today, tanggal_selesai: "", proyek_berjalan_id: "" });

  const { data: proyekList, isLoading: loadingProyek } = useQuery({
    queryKey: ["adm-projek-list"],
    queryFn: () => admApi.listProyek(),
    retry: false,
  });

  const { data: proyekBerjalanData } = useQuery({
    queryKey: ["adm-proyek-berjalan-options"],
    queryFn: () => admApi.proyekBerjalanOptions(),
    retry: false,
  });

  const { data: klienData } = useQuery({
    queryKey: ["adm-projek-klien-options"],
    queryFn: () => admApi.klienOptions(),
    retry: false,
  });

  const createProyekMut = useMutation({
    mutationFn: (d: any) => admApi.createProyek(d),
    onSuccess: () => {
      toast.success("Proyek ditambahkan");
      qc.invalidateQueries({ queryKey: ["adm-projek-list"] });
      setOpenProyek(false);
      setFormProyek({ nama_proyek: "", klien: "", jenis: "Sipil", tanggal_mulai: today, tanggal_selesai: "", proyek_berjalan_id: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const updateProyekMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => admApi.updateProyek(id, data),
    onSuccess: () => {
      toast.success("Proyek diupdate");
      qc.invalidateQueries({ queryKey: ["adm-projek-list"] });
      setEditProyek(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const deleteProyekMut = useMutation({
    mutationFn: (id: number) => admApi.deleteProyek(id),
    onSuccess: () => {
      toast.success("Proyek dihapus");
      qc.invalidateQueries({ queryKey: ["adm-projek-list"] });
      setConfirmDeleteProyek(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const proyekItems: any[] = Array.isArray(proyekList) ? proyekList : proyekList?.items ?? [];
  const klienOptions: any[] = Array.isArray(klienData) ? klienData : [];
  const proyekBerjalanList: any[] = Array.isArray(proyekBerjalanData) ? proyekBerjalanData : [];

  if (selectedProyek) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedProyek(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{selectedProyek.nama_proyek}</h1>
            <p className="text-sm text-muted-foreground">{selectedProyek.klien} · {selectedProyek.jenis}</p>
          </div>
        </div>

        <Tabs defaultValue="cashflow">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="cashflow" className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Cashflow Project
            </TabsTrigger>
            <TabsTrigger value="pr" className="flex items-center gap-1 text-xs">
              <ClipboardList className="h-3.5 w-3.5" /> PR
            </TabsTrigger>
            <TabsTrigger value="dokumen" className="flex items-center gap-1 text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload Dokumen
            </TabsTrigger>
            <TabsTrigger value="surat-jalan" className="flex items-center gap-1 text-xs">
              <Truck className="h-3.5 w-3.5" /> Surat Jalan Material
            </TabsTrigger>
            <TabsTrigger value="tukang" className="flex items-center gap-1 text-xs">
              <UserCheck className="h-3.5 w-3.5" /> Tukang
            </TabsTrigger>
            <TabsTrigger value="dokumentasi" className="flex items-center gap-1 text-xs">
              <Images className="h-3.5 w-3.5" /> Dokumentasi
            </TabsTrigger>
          </TabsList>

          <Card className="mt-4">
            <CardContent className="pt-4">
              <TabsContent value="cashflow"><CashflowTab proyekId={selectedProyek.id} /></TabsContent>

              <TabsContent value="pr"><PRTab proyekId={selectedProyek.id} proyekBerjalanId={selectedProyek.proyek_berjalan_id ? Number(selectedProyek.proyek_berjalan_id) : undefined} /></TabsContent>
              <TabsContent value="dokumen"><UploadDokumenTab proyekId={selectedProyek.id} /></TabsContent>
              <TabsContent value="surat-jalan"><SuratJalanTab proyekId={selectedProyek.id} proyekNama={selectedProyek.nama_proyek || ""} /></TabsContent>
              <TabsContent value="tukang"><TukangTab proyekId={selectedProyek.id} proyekNama={selectedProyek.nama_proyek || ""} proyekKlien={selectedProyek.klien || ""} /></TabsContent>
              <TabsContent value="dokumentasi"><DokumentasiTab proyekId={selectedProyek.id} proyekBerjalanId={selectedProyek.proyek_berjalan_id ? Number(selectedProyek.proyek_berjalan_id) : undefined} proyekJenis={selectedProyek.jenis} /></TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-red-500" />
            Administrasi Projek
          </h1>
          <p className="text-muted-foreground text-sm">Finance — Kelola cashflow, material, PR & administrasi per proyek</p>
        </div>
        <Button onClick={() => setOpenProyek(true)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Proyek
        </Button>
      </div>

      {/* Project list as table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nama Proyek</TableHead>
              <TableHead>Klien</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Tanggal Mulai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingProyek ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
            )) : proyekItems.map((p: any) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedProyek(p)}
              >
                <TableCell className="font-semibold">{p.nama_proyek || p.lokasi || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.klien || p.lead?.nama || "—"}</TableCell>
                <TableCell><Badge variant="outline">{p.jenis || "—"}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {p.tanggal_mulai ? new Date(p.tanggal_mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "aktif" ? "default" : "secondary"} className="capitalize">{p.status}</Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      setEditProyek(p);
                      setFormProyek({ nama_proyek: p.nama_proyek || "", klien: p.klien || "", jenis: p.jenis || "Sipil", tanggal_mulai: p.tanggal_mulai ? p.tanggal_mulai.split("T")[0] : today, tanggal_selesai: p.tanggal_selesai ? p.tanggal_selesai.split("T")[0] : "", proyek_berjalan_id: p.proyek_berjalan_id ? String(p.proyek_berjalan_id) : "" });
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteProyek(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loadingProyek && proyekItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <Calculator className="mx-auto h-10 w-10 opacity-20 mb-3" />
                  <p>Belum ada proyek</p>
                  <p className="text-xs mt-1">Tambahkan proyek untuk mulai kelola administrasi</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={!!editProyek} onOpenChange={(v) => { if (!v) setEditProyek(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Proyek</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Proyek *</Label>
              <Input placeholder="Nama proyek" value={formProyek.nama_proyek} onChange={(e) => setFormProyek({ ...formProyek, nama_proyek: e.target.value })} /></div>
            <div>
              <Label>Klien</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={formProyek.klien}
                onChange={(e) => setFormProyek({ ...formProyek, klien: e.target.value })}
              >
                <option value="">— Pilih klien —</option>
                {klienOptions.map((k: any) => (
                  <option key={k.lead_id} value={k.nama}>{k.nama}</option>
                ))}
              </select>
            </div>
            <div><Label>Jenis Proyek</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={formProyek.jenis} onChange={(e) => setFormProyek({ ...formProyek, jenis: e.target.value })}>
                <option>Sipil</option><option>Desain</option><option>Interior</option>
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal Mulai</Label>
                <Input type="date" value={formProyek.tanggal_mulai} onChange={(e) => setFormProyek({ ...formProyek, tanggal_mulai: e.target.value })} /></div>
              <div><Label>Tanggal Selesai</Label>
                <Input type="date" value={formProyek.tanggal_selesai} onChange={(e) => setFormProyek({ ...formProyek, tanggal_selesai: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditProyek(null)}>Batal</Button>
              <Button
                disabled={!formProyek.nama_proyek || updateProyekMut.isPending}
                onClick={() => updateProyekMut.mutate({ id: editProyek.id, data: { nama_proyek: formProyek.nama_proyek, klien: formProyek.klien || null, jenis: formProyek.jenis, tanggal_mulai: formProyek.tanggal_mulai || null, tanggal_selesai: formProyek.tanggal_selesai || null } })}
              >
                {updateProyekMut.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Project Dialog */}
      <Dialog open={!!confirmDeleteProyek} onOpenChange={(v) => { if (!v) setConfirmDeleteProyek(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Proyek?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Proyek <b>{confirmDeleteProyek?.nama_proyek}</b> dan semua data di dalamnya (cashflow, PR, surat jalan, dll) akan dihapus permanen.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteProyek(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteProyekMut.isPending} onClick={() => confirmDeleteProyek && deleteProyekMut.mutate(confirmDeleteProyek.id)}>
              {deleteProyekMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={openProyek} onOpenChange={setOpenProyek}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Proyek Baru</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Projek (dari menu Projek)</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={formProyek.proyek_berjalan_id}
                onChange={(e) => {
                  const pb = proyekBerjalanList.find((p: any) => String(p.id) === e.target.value);
                  setFormProyek({
                    ...formProyek,
                    proyek_berjalan_id: e.target.value,
                    nama_proyek: pb ? (pb.nama_proyek || "") : formProyek.nama_proyek,
                    klien: pb ? (pb.klien || "") : formProyek.klien,
                    jenis: pb ? (pb.jenis || formProyek.jenis) : formProyek.jenis,
                  });
                }}
              >
                <option value="">— Pilih dari menu Projek (opsional) —</option>
                {proyekBerjalanList.map((p: any) => (
                  <option key={p.id} value={String(p.id)}>{p.nama_proyek} {p.klien ? "— " + p.klien : ""}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Pilih projek dari Sipil/Interior/Desain untuk linking RAPP</p>
            </div>
            <div><Label>Nama Proyek *</Label>
              <Input placeholder="Nama proyek" value={formProyek.nama_proyek} onChange={(e) => setFormProyek({ ...formProyek, nama_proyek: e.target.value })} /></div>
            <div>
              <Label>Klien *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={formProyek.klien}
                onChange={(e) => setFormProyek({ ...formProyek, klien: e.target.value })}
              >
                <option value="">— Pilih klien —</option>
                {klienOptions.map((k: any) => (
                  <option key={k.lead_id} value={k.nama}>{k.nama}</option>
                ))}
              </select>
              {klienOptions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Klien diambil dari invoice yang sudah lunas & memiliki kwitansi</p>
              )}
            </div>
            <div><Label>Jenis Proyek</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={formProyek.jenis} onChange={(e) => setFormProyek({ ...formProyek, jenis: e.target.value })}>
                <option>Sipil</option><option>Desain</option><option>Interior</option>
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tanggal Mulai</Label>
                <Input type="date" value={formProyek.tanggal_mulai} onChange={(e) => setFormProyek({ ...formProyek, tanggal_mulai: e.target.value })} /></div>
              <div><Label>Tanggal Selesai</Label>
                <Input type="date" value={formProyek.tanggal_selesai} onChange={(e) => setFormProyek({ ...formProyek, tanggal_selesai: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenProyek(false)}>Batal</Button>
              <Button disabled={!formProyek.nama_proyek || createProyekMut.isPending} onClick={() => createProyekMut.mutate(formProyek)}>
                {createProyekMut.isPending ? "Menyimpan..." : "Tambah Proyek"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
