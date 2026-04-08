import apiClient from "./client";

// ─── Kontrak Template ─────────────────────────────────────────────────────────
export interface KontrakTemplatePasal {
  id: number;
  urutan: number;
  judul_pasal: string | null;
  isi_pasal: string | null;
}

export interface KontrakTemplate {
  id: number;
  judul: string;
  pihak_satu: string | null;
  pihak_dua: string | null;
  pembuka: string | null;
  penutup: string | null;
  status: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  creator: { name: string } | null;
  pasals: KontrakTemplatePasal[];
}

// ─── Kontrak Dokumen ──────────────────────────────────────────────────────────
export interface KontrakLampiran {
  id: number;
  urutan: number;
  judul: string;
  file_url: string | null;
}

export interface KontrakDokumen {
  id: number;
  template_id: number | null;
  lead_id: number | null;
  nomor_kontrak: string | null;
  jenis_pekerjaan: string | null;
  tanggal: string | null;
  nama_client: string | null;
  telepon_client: string | null;
  alamat_client: string | null;
  status: string;
  ro_name: string | null;
  ro_signature: string | null;
  ro_signed_at: string | null;
  management_name: string | null;
  management_signature: string | null;
  management_signed_at: string | null;
  client_name: string | null;
  client_signature: string | null;
  client_signed_at: string | null;
  created_by: number | null;
  created_at: string;
  template: {
    id: number;
    judul: string;
    pihak_satu: string | null;
    pihak_dua: string | null;
    pembuka: string | null;
    penutup: string | null;
    pasals: KontrakTemplatePasal[];
  } | null;
  lead: { nama: string; nomor_telepon: string | null; alamat: string | null } | null;
  creator: { name: string } | null;
  lampirans: KontrakLampiran[];
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const kontrakTemplateApi = {
  list: (page = 1, per_page = 100) =>
    apiClient.get<{ items: KontrakTemplate[]; total: number }>(`/sales/kontrak-template?page=${page}&per_page=${per_page}`).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<KontrakTemplate>(`/sales/kontrak-template/${id}`).then((r) => r.data),

  create: (payload: { judul: string; pihak_satu?: string; pihak_dua?: string; pembuka?: string; penutup?: string }) =>
    apiClient.post<KontrakTemplate>("/sales/kontrak-template", payload).then((r) => r.data),

  update: (id: number, payload: { judul?: string; pihak_satu?: string; pihak_dua?: string; pembuka?: string; penutup?: string }) =>
    apiClient.patch<KontrakTemplate>(`/sales/kontrak-template/${id}`, payload).then((r) => r.data),

  publish: (id: number) =>
    apiClient.post<KontrakTemplate>(`/sales/kontrak-template/${id}/publish`, {}).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/sales/kontrak-template/${id}`).then((r) => r.data),

  addPasal: (templateId: number, payload: { judul_pasal?: string; isi_pasal?: string }) =>
    apiClient.post<KontrakTemplatePasal>(`/sales/kontrak-template/${templateId}/pasal`, payload).then((r) => r.data),

  updatePasal: (templateId: number, pasalId: number, payload: { judul_pasal?: string; isi_pasal?: string }) =>
    apiClient.patch<KontrakTemplatePasal>(`/sales/kontrak-template/${templateId}/pasal/${pasalId}`, payload).then((r) => r.data),

  deletePasal: (templateId: number, pasalId: number) =>
    apiClient.delete(`/sales/kontrak-template/${templateId}/pasal/${pasalId}`).then((r) => r.data),
};

export const kontrakDokumenApi = {
  list: (page = 1, per_page = 50) =>
    apiClient.get<{ items: KontrakDokumen[]; total: number }>(`/sales/kontrak-dokumen?page=${page}&per_page=${per_page}`).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<KontrakDokumen>(`/sales/kontrak-dokumen/${id}`).then((r) => r.data),

  create: (payload: { template_id: number; lead_id?: number; tanggal?: string; jenis_pekerjaan?: string }) =>
    apiClient.post<KontrakDokumen>("/sales/kontrak-dokumen", payload).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/sales/kontrak-dokumen/${id}`).then((r) => r.data),

  signRo: (id: number, ro_name: string, ro_signature: string) =>
    apiClient.post<KontrakDokumen>(`/sales/kontrak-dokumen/${id}/sign-ro`, { ro_name, ro_signature }).then((r) => r.data),

  signManagement: (id: number, management_name: string, management_signature: string) =>
    apiClient.post<KontrakDokumen>(`/sales/kontrak-dokumen/${id}/sign-management`, { management_name, management_signature }).then((r) => r.data),

  signClient: (id: number, client_name: string, client_signature: string) =>
    apiClient.post<KontrakDokumen>(`/sales/kontrak-dokumen/${id}/sign-client`, { client_name, client_signature }).then((r) => r.data),

  // Lampiran
  getLampirans: (dokId: number) =>
    apiClient.get<KontrakLampiran[]>(`/sales/kontrak-dokumen/${dokId}/lampirans`).then((r) => r.data),

  addLampiran: (dokId: number, judul: string) =>
    apiClient.post<KontrakLampiran>(`/sales/kontrak-dokumen/${dokId}/lampirans`, { judul }).then((r) => r.data),

  updateLampiran: (dokId: number, lampId: number, judul: string) =>
    apiClient.patch<KontrakLampiran>(`/sales/kontrak-dokumen/${dokId}/lampirans/${lampId}`, { judul }).then((r) => r.data),

  deleteLampiran: (dokId: number, lampId: number) =>
    apiClient.delete(`/sales/kontrak-dokumen/${dokId}/lampirans/${lampId}`).then((r) => r.data),

  uploadLampiranFile: (dokId: number, lampId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<KontrakLampiran>(`/sales/kontrak-dokumen/${dokId}/lampirans/${lampId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  deleteLampiranFile: (dokId: number, lampId: number) =>
    apiClient.delete(`/sales/kontrak-dokumen/${dokId}/lampirans/${lampId}/file`).then((r) => r.data),
};
