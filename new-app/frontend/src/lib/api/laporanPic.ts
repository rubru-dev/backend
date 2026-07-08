import { apiClient } from "./client";

export type ProjekOption = { id: number; nama: string };
export type LaporanPicItem = {
  id: number;
  user_id: number | null;
  project_type: "sipil" | "interior";
  project_id: number;
  project_nama: string | null;
  tanggal: string;
  kegiatan: string;
  kendala: string | null;
  images: string[];
  created_at: string;
  user?: { name: string } | null;
};

export const laporanPicApi = {
  projekOptions: (type: "sipil" | "interior"): Promise<ProjekOption[]> =>
    apiClient.get(`/pic/laporan-pic/projek-options`, { params: { type } }).then((r) => r.data),

  create: (formData: FormData): Promise<LaporanPicItem> =>
    apiClient
      .post(`/pic/laporan-pic`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data),

  listByProject: (project_type: "sipil" | "interior", project_id: number | string): Promise<LaporanPicItem[]> =>
    apiClient.get(`/pic/laporan-pic`, { params: { project_type, project_id } }).then((r) => r.data),

  listMine: (): Promise<LaporanPicItem[]> =>
    apiClient.get(`/pic/laporan-pic`, { params: { mine: 1 } }).then((r) => r.data),

  remove: (id: number | string): Promise<{ success: boolean }> =>
    apiClient.delete(`/pic/laporan-pic/${id}`).then((r) => r.data),
};
