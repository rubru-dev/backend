import { apiClient } from "./client";

export type ProjekOption = { id: number; nama: string };
export type TerminOption = { id: string; urutan: number; nama: string | null; tasks: { id: string; nama_pekerjaan: string | null }[] };
export type LaporanPicItem = {
  id: number;
  user_id: number | null;
  project_type: "sipil" | "interior";
  project_id: number;
  project_nama: string | null;
  termin_id: string | null;
  task_id: string | null;
  termin_nama: string | null;
  pekerjaan_nama: string | null;
  tanggal: string;
  kegiatan: string;
  kendala: string | null;
  status_pekerjaan: "On Progress" | "Selesai";
  status_approval: "Tidak Ada" | "Menunggu Approval" | "Disetujui" | "Ditolak";
  images: string[];
  created_at: string;
  user?: { name: string } | null;
};

export const laporanPicApi = {
  projekOptions: (type: "sipil" | "interior"): Promise<ProjekOption[]> =>
    apiClient.get(`/pic/laporan-pic/projek-options`, { params: { type } }).then((r) => r.data),
  terminOptions: (type: "sipil" | "interior", project_id: string): Promise<TerminOption[]> =>
    apiClient.get(`/pic/laporan-pic/termin-options`, { params: { type, project_id } }).then((r) => r.data),

  create: (formData: FormData): Promise<LaporanPicItem> =>
    apiClient
      .post(`/pic/laporan-pic`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data),
  update: (id: number | string, formData: FormData): Promise<LaporanPicItem> =>
    apiClient
      .patch(`/pic/laporan-pic/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data),

  // Lengkap (tanpa paginasi) — dipakai bila butuh SEMUA laporan, mis. untuk export PDF.
  listByProject: (project_type: "sipil" | "interior", project_id: number | string): Promise<LaporanPicItem[]> =>
    apiClient.get(`/pic/laporan-pic`, { params: { project_type, project_id } }).then((r) => r.data),

  // Paginasi — dipakai tab tampilan ("Muat lebih banyak"). per_page memicu mode paginasi.
  listByProjectPaged: (
    project_type: "sipil" | "interior",
    project_id: number | string,
    page: number,
    per_page: number,
  ): Promise<{ items: LaporanPicItem[]; total: number; page: number; per_page: number }> =>
    apiClient.get(`/pic/laporan-pic`, { params: { project_type, project_id, page, per_page } }).then((r) => r.data),

  listMine: (): Promise<LaporanPicItem[]> =>
    apiClient.get(`/pic/laporan-pic`, { params: { mine: 1 } }).then((r) => r.data),

  remove: (id: number | string): Promise<{ success: boolean }> =>
    apiClient.delete(`/pic/laporan-pic/${id}`).then((r) => r.data),

  approveStatus: (id: number | string, action: "approve" | "reject", reason?: string): Promise<LaporanPicItem> =>
    apiClient.patch(`/pic/laporan-pic/${id}/status-approval`, { action, reason }).then((r) => r.data),
};
