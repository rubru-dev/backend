import { apiClient } from "./client";

export const websiteApi = {
  // ── Config ────────────────────────────────────────────────────────────────
  getConfig: () => apiClient.get("/website/config").then((r) => r.data.data),
  saveConfig: (data: any) => apiClient.put("/website/config", data).then((r) => r.data.data),

  // ── Kalkulator ────────────────────────────────────────────────────────────
  getKalkulator: () => apiClient.get("/website/kalkulator").then((r) => r.data.data),
  saveKalkulator: (data: any) => apiClient.put("/website/kalkulator", data).then((r) => r.data.data),
  addPaket: (data: { key: string; label: string; harga: number; satuan?: string }) =>
    apiClient.post("/website/kalkulator/paket", data).then((r) => r.data.data),
  updatePaket: (key: string, data: { label?: string; harga?: number; satuan?: string }) =>
    apiClient.put(`/website/kalkulator/paket/${key}`, data).then((r) => r.data.data),
  deletePaket: (key: string) => apiClient.delete(`/website/kalkulator/paket/${key}`).then((r) => r.data),
  addSurcharge: (data: { key: string; label: string; harga: number; satuan?: string; kategori?: string }) =>
    apiClient.post("/website/kalkulator/surcharge", data).then((r) => r.data.data),
  updateSurcharge: (key: string, data: { label?: string; harga?: number; satuan?: string; kategori?: string }) =>
    apiClient.put(`/website/kalkulator/surcharge/${key}`, data).then((r) => r.data.data),
  deleteSurcharge: (key: string) => apiClient.delete(`/website/kalkulator/surcharge/${key}`).then((r) => r.data),

  // ── Banner ────────────────────────────────────────────────────────────────
  listBanners: () => apiClient.get("/website/banner").then((r) => r.data.data),
  createBanner: (form: FormData) =>
    apiClient.post("/website/banner", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.data),
  updateBanner: (id: number | bigint, form: FormData) =>
    apiClient.patch(`/website/banner/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.data),
  deleteBanner: (id: number | bigint) => apiClient.delete(`/website/banner/${id}`).then((r) => r.data),

  // ── Portfolio ─────────────────────────────────────────────────────────────
  listPortfolio: (params?: any) => apiClient.get("/website/portfolio", { params }).then((r) => r.data),
  getPortfolio: (id: number | bigint) => apiClient.get(`/website/portfolio/${id}`).then((r) => r.data.data),
  createPortfolio: (data: any) => apiClient.post("/website/portfolio", data).then((r) => r.data.data),
  updatePortfolio: (id: number | bigint, data: any) => apiClient.patch(`/website/portfolio/${id}`, data).then((r) => r.data.data),
  deletePortfolio: (id: number | bigint) => apiClient.delete(`/website/portfolio/${id}`).then((r) => r.data),
  uploadPortfolioImages: (id: number | bigint, form: FormData) =>
    apiClient.post(`/website/portfolio/${id}/images`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  setPortfolioCover: (id: number | bigint, imgId: number | bigint) =>
    apiClient.patch(`/website/portfolio/${id}/images/${imgId}/cover`, {}).then((r) => r.data),
  deletePortfolioImage: (id: number | bigint, imgId: number | bigint) =>
    apiClient.delete(`/website/portfolio/${id}/images/${imgId}`).then((r) => r.data),

  // ── Project Berjalan ──────────────────────────────────────────────────────
  listProject: (params?: any) => apiClient.get("/website/project", { params }).then((r) => r.data),
  getProject: (id: number | bigint) => apiClient.get(`/website/project/${id}`).then((r) => r.data.data),
  createProject: (data: any) => apiClient.post("/website/project", data).then((r) => r.data.data),
  updateProject: (id: number | bigint, data: any) => apiClient.patch(`/website/project/${id}`, data).then((r) => r.data.data),
  deleteProject: (id: number | bigint) => apiClient.delete(`/website/project/${id}`).then((r) => r.data),
  uploadProjectImages: (id: number | bigint, form: FormData) =>
    apiClient.post(`/website/project/${id}/images`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  setProjectCover: (id: number | bigint, imgId: number | bigint) =>
    apiClient.patch(`/website/project/${id}/images/${imgId}/cover`, {}).then((r) => r.data),
  deleteProjectImage: (id: number | bigint, imgId: number | bigint) =>
    apiClient.delete(`/website/project/${id}/images/${imgId}`).then((r) => r.data),

  // ── Artikel ───────────────────────────────────────────────────────────────
  listArtikel: (params?: any) => apiClient.get("/website/artikel", { params }).then((r) => r.data),
  getArtikel: (id: number | bigint) => apiClient.get(`/website/artikel/${id}`).then((r) => r.data.data),
  createArtikel: (form: FormData) =>
    apiClient.post("/website/artikel", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.data),
  updateArtikel: (id: number | bigint, form: FormData) =>
    apiClient.patch(`/website/artikel/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.data),
  deleteArtikel: (id: number | bigint) => apiClient.delete(`/website/artikel/${id}`).then((r) => r.data),

  // ── Artikel Kategori ──────────────────────────────────────────────────────
  listArtikelKategori: () => apiClient.get("/website/artikel-kategori").then((r) => r.data.data),
  createArtikelKategori: (nama: string) => apiClient.post("/website/artikel-kategori", { nama }).then((r) => r.data.data),
  deleteArtikelKategori: (id: number | bigint) => apiClient.delete(`/website/artikel-kategori/${id}`).then((r) => r.data),

  // ── Testimoni ─────────────────────────────────────────────────────────────
  listTestimoni: () => apiClient.get("/website/testimoni").then((r) => r.data.data),
  createTestimoni: (data: any) => apiClient.post("/website/testimoni", data).then((r) => r.data.data),
  updateTestimoni: (id: number | bigint, data: any) => apiClient.patch(`/website/testimoni/${id}`, data).then((r) => r.data.data),
  deleteTestimoni: (id: number | bigint) => apiClient.delete(`/website/testimoni/${id}`).then((r) => r.data),

  // ── Inline Image Upload ───────────────────────────────────────────────────
  uploadImage: (form: FormData) =>
    apiClient.post("/website/upload-image", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.url as string),

  // ── Leads (read-only) ─────────────────────────────────────────────────────
  listLeads: (params?: any) => apiClient.get("/website/leads", { params }).then((r) => r.data),
};
