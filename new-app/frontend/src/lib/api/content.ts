import { apiClient } from "./client";

export const contentApi = {
  listTimeline: (params?: { bulan?: number; tahun?: number; status?: string }) =>
    apiClient.get("/content-creator/timeline", { params }).then((r) => r.data),
  calendarTimeline: (params: { bulan: number; tahun: number }) =>
    apiClient.get("/content-creator/calendar", { params }).then((r) => r.data),
  uploadCalendar: (params: { bulan: number; tahun: number }) =>
    apiClient.get("/content-creator/upload-calendar", { params }).then((r) => r.data),
  uploadPending: () =>
    apiClient.get("/content-creator/upload-pending").then((r) => r.data),
  createTimeline: (data: any) => apiClient.post("/content-creator/timeline", data).then((r) => r.data),
  updateTimeline: (id: number, data: any) => apiClient.patch(`/content-creator/timeline/${id}`, data).then((r) => r.data),
  deleteTimeline: (id: number) => apiClient.delete(`/content-creator/timeline/${id}`).then((r) => r.data),
  approveTimeline: (id: number, stage: string) =>
    apiClient.post(`/content-creator/timeline/${id}/approve`, { stage }).then((r) => r.data),
  revisiTimeline: (id: number, stage: string, catatan?: string) =>
    apiClient.post(`/content-creator/timeline/${id}/revisi`, { stage, catatan }).then((r) => r.data),
  signHdBd: (id: number, data: { hd_bd_signature: string }) =>
    apiClient.post(`/content-creator/timeline/${id}/sign-hd`, data).then((r) => r.data),
  uploadImage: (id: number, data: { task_image: string }) =>
    apiClient.patch(`/content-creator/timeline/${id}/image`, data).then((r) => r.data),
  resubmit: (id: number) =>
    apiClient.post(`/content-creator/timeline/${id}/resubmit`).then((r) => r.data),

  // Social Media Accounts
  listAccounts: () => apiClient.get("/content-creator/social-accounts").then((r) => r.data),
  createAccount: (data: any) => apiClient.post("/content-creator/social-accounts", data).then((r) => r.data),
  updateAccount: (id: string, data: any) => apiClient.patch(`/content-creator/social-accounts/${id}`, data).then((r) => r.data),
  deleteAccount: (id: string) => apiClient.delete(`/content-creator/social-accounts/${id}`).then((r) => r.data),
  syncAccount: (id: string) => apiClient.post(`/content-creator/social-accounts/${id}/sync`).then((r) => r.data),

  // Social Media Post Metrics
  listPostMetrics: (params?: any) => apiClient.get("/content-creator/social-post-metrics", { params }).then((r) => r.data),
  postMetricsSummary: (params?: any) => apiClient.get("/content-creator/social-post-metrics/summary", { params }).then((r) => r.data),
  createPostMetric: (data: any) => apiClient.post("/content-creator/social-post-metrics", data).then((r) => r.data),
  updatePostMetric: (id: string, data: any) => apiClient.patch(`/content-creator/social-post-metrics/${id}`, data).then((r) => r.data),
  deletePostMetric: (id: string) => apiClient.delete(`/content-creator/social-post-metrics/${id}`).then((r) => r.data),

  // Social Media Targets
  listTargets: (params?: { bulan?: number; tahun?: number; platform?: string }) =>
    apiClient.get("/content-creator/social-targets", { params }).then((r) => r.data),
  upsertTarget: (data: any) => apiClient.post("/content-creator/social-targets", data).then((r) => r.data),
  deleteTarget: (id: string) => apiClient.delete(`/content-creator/social-targets/${id}`).then((r) => r.data),
  targetComparison: (params: { bulan: number; tahun: number; platform?: string }) =>
    apiClient.get("/content-creator/social-targets/comparison", { params }).then((r) => r.data),
};

export const desainApi = {
  listTimeline: (params?: any) => apiClient.get("/desain/timeline", { params }).then((r) => r.data),
  getTimeline: (id: string) => apiClient.get(`/desain/timeline/${id}`).then((r) => r.data),
  createTimeline: (data: any) => apiClient.post("/desain/timeline", data).then((r) => r.data),
  updateTimeline: (id: string, data: any) => apiClient.patch(`/desain/timeline/${id}`, data).then((r) => r.data),
  deleteTimeline: (id: string) => apiClient.delete(`/desain/timeline/${id}`).then((r) => r.data),
  addItem: (id: string, data: any) => apiClient.post(`/desain/timeline/${id}/items`, data).then((r) => r.data),
  updateItem: (itemId: string, data: any) => apiClient.patch(`/desain/timeline/items/${itemId}`, data).then((r) => r.data),
  deleteItem: (itemId: string) => apiClient.delete(`/desain/timeline/items/${itemId}`).then((r) => r.data),
  getGantt: (id: string) => apiClient.get(`/desain/timeline/${id}/gantt`).then((r) => r.data),
  exportData: (id: string) => apiClient.get(`/desain/timeline/${id}/export`).then((r) => r.data),
  listEmployees: () => apiClient.get("/desain/employees").then((r) => r.data),
  listLeads: () => apiClient.get("/finance/leads-dropdown").then((r) => r.data?.items ?? []),
  uploadFileBukti: (itemId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post(`/desain/timeline/items/${itemId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  // Docs/Link
  getLinks: (timelineId: string) => apiClient.get(`/desain/timeline/${timelineId}/links`).then((r) => r.data),
  addLink: (timelineId: string, data: any) => apiClient.post(`/desain/timeline/${timelineId}/links`, data).then((r) => r.data),
  deleteLink: (linkId: string) => apiClient.delete(`/desain/timeline/links/${linkId}`).then((r) => r.data),
};

export const interiorApi = {
  listTimeline: () => apiClient.get("/interior/timeline").then((r) => r.data),
  getTimeline: (id: string) => apiClient.get(`/interior/timeline/${id}`).then((r) => r.data),
  createTimeline: (data: any) => apiClient.post("/interior/timeline", data).then((r) => r.data),
  updateTimeline: (id: string, data: any) => apiClient.patch(`/interior/timeline/${id}`, data).then((r) => r.data),
  deleteTimeline: (id: string) => apiClient.delete(`/interior/timeline/${id}`).then((r) => r.data),
  addItem: (id: string, data: any) => apiClient.post(`/interior/timeline/${id}/items`, data).then((r) => r.data),
  updateItem: (itemId: string, data: any) => apiClient.patch(`/interior/timeline/items/${itemId}`, data).then((r) => r.data),
  deleteItem: (itemId: string) => apiClient.delete(`/interior/timeline/items/${itemId}`).then((r) => r.data),
  exportData: (id: string) => apiClient.get(`/interior/timeline/${id}/export`).then((r) => r.data),
  listEmployees: () => apiClient.get("/interior/employees").then((r) => r.data),
  listLeads: () => apiClient.get("/finance/leads-dropdown").then((r) => r.data?.items ?? []),
  uploadFileBukti: (itemId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post(`/interior/timeline/items/${itemId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};

// Shared RAPP API interface (implemented by sipilApi and interiorProjekApi)
export type RappApi = {
  getRapp: (terminId: string) => Promise<any>;
  updateTermin: (terminId: string, data: any) => Promise<any>;
  addMaterialKategori: (terminId: string, data: any) => Promise<any>;
  updateMaterialKategori: (id: string, data: any) => Promise<any>;
  deleteMaterialKategori: (id: string) => Promise<any>;
  addMaterialItem: (kategoriId: string, data: any) => Promise<any>;
  updateMaterialItem: (id: string, data: any) => Promise<any>;
  deleteMaterialItem: (id: string) => Promise<any>;
  addSipilItem: (terminId: string, data: any) => Promise<any>;
  updateSipilItem: (id: string, data: any) => Promise<any>;
  deleteSipilItem: (id: string) => Promise<any>;
  addVendorKategori: (terminId: string, data: any) => Promise<any>;
  updateVendorKategori: (id: string, data: any) => Promise<any>;
  deleteVendorKategori: (id: string) => Promise<any>;
  addVendorItem: (kategoriId: string, data: any) => Promise<any>;
  updateVendorItem: (id: string, data: any) => Promise<any>;
  deleteVendorItem: (id: string) => Promise<any>;
};

export const sipilApi = {
  listProjeks: () => apiClient.get("/sipil/projeks").then((r) => r.data.items ?? r.data),
  getProjek: (id: string) => apiClient.get(`/sipil/projeks/${id}`).then((r) => r.data),
  createProjek: (data: any) => apiClient.post("/sipil/projeks", data).then((r) => r.data),
  updateProjek: (id: string, data: any) => apiClient.patch(`/sipil/projeks/${id}`, data).then((r) => r.data),
  deleteProjek: (id: string) => apiClient.delete(`/sipil/projeks/${id}`).then((r) => r.data),
  addTermin: (projekId: string, data: any) => apiClient.post(`/sipil/projeks/${projekId}/termins`, data).then((r) => r.data),
  updateTermin: (terminId: string, data: any) => apiClient.patch(`/sipil/termins/${terminId}`, data).then((r) => r.data),
  deleteTermin: (terminId: string) => apiClient.delete(`/sipil/termins/${terminId}`).then((r) => r.data),
  addTask: (terminId: string, data: any) => apiClient.post(`/sipil/termins/${terminId}/tasks`, data).then((r) => r.data),
  updateTask: (taskId: string, data: any) => apiClient.patch(`/sipil/tasks/${taskId}`, data).then((r) => r.data),
  deleteTask: (taskId: string) => apiClient.delete(`/sipil/tasks/${taskId}`).then((r) => r.data),
  listEmployees: () => apiClient.get("/sipil/employees").then((r) => r.data),
  listLeads: () => apiClient.get("/finance/leads-dropdown").then((r) => r.data?.items ?? []),
  // RAPP
  getRapp: (terminId: string) => apiClient.get(`/sipil/termins/${terminId}/rapp`).then((r) => r.data),
  addMaterialKategori: (terminId: string, data: any) => apiClient.post(`/sipil/termins/${terminId}/rapp/material-kategori`, data).then((r) => r.data),
  updateMaterialKategori: (id: string, data: any) => apiClient.patch(`/sipil/rapp/material-kategori/${id}`, data).then((r) => r.data),
  deleteMaterialKategori: (id: string) => apiClient.delete(`/sipil/rapp/material-kategori/${id}`).then((r) => r.data),
  addMaterialItem: (kategoriId: string, data: any) => apiClient.post(`/sipil/rapp/material-kategori/${kategoriId}/items`, data).then((r) => r.data),
  updateMaterialItem: (id: string, data: any) => apiClient.patch(`/sipil/rapp/material-items/${id}`, data).then((r) => r.data),
  deleteMaterialItem: (id: string) => apiClient.delete(`/sipil/rapp/material-items/${id}`).then((r) => r.data),
  addSipilItem: (terminId: string, data: any) => apiClient.post(`/sipil/termins/${terminId}/rapp/sipil-items`, data).then((r) => r.data),
  updateSipilItem: (id: string, data: any) => apiClient.patch(`/sipil/rapp/sipil-items/${id}`, data).then((r) => r.data),
  deleteSipilItem: (id: string) => apiClient.delete(`/sipil/rapp/sipil-items/${id}`).then((r) => r.data),
  addVendorKategori: (terminId: string, data: any) => apiClient.post(`/sipil/termins/${terminId}/rapp/vendor-kategori`, data).then((r) => r.data),
  updateVendorKategori: (id: string, data: any) => apiClient.patch(`/sipil/rapp/vendor-kategori/${id}`, data).then((r) => r.data),
  deleteVendorKategori: (id: string) => apiClient.delete(`/sipil/rapp/vendor-kategori/${id}`).then((r) => r.data),
  addVendorItem: (kategoriId: string, data: any) => apiClient.post(`/sipil/rapp/vendor-kategori/${kategoriId}/items`, data).then((r) => r.data),
  updateVendorItem: (id: string, data: any) => apiClient.patch(`/sipil/rapp/vendor-items/${id}`, data).then((r) => r.data),
  deleteVendorItem: (id: string) => apiClient.delete(`/sipil/rapp/vendor-items/${id}`).then((r) => r.data),
  // Stock Opname
  getRappSummary: (projekId: string) => apiClient.get(`/sipil/projeks/${projekId}/stock-opname/rapp`).then((r) => r.data),
  getUsageLogs: (projekId: string) => apiClient.get(`/sipil/projeks/${projekId}/stock-opname/logs`).then((r) => r.data.items ?? r.data),
  addUsageLog: (projekId: string, data: any) => apiClient.post(`/sipil/projeks/${projekId}/stock-opname/logs`, data).then((r) => r.data),
  deleteUsageLog: (logId: string) => apiClient.delete(`/sipil/stock-opname/logs/${logId}`).then((r) => r.data),
  // Docs/Link
  getLinks: (projekId: string) => apiClient.get(`/sipil/projeks/${projekId}/links`).then((r) => r.data),
  addLink: (projekId: string, data: { title: string; url?: string; catatan?: string; file?: File }) => {
    if (data.file) {
      const form = new FormData();
      form.append("title", data.title);
      if (data.catatan) form.append("catatan", data.catatan);
      form.append("file", data.file);
      return apiClient.post(`/sipil/projeks/${projekId}/links`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
    }
    return apiClient.post(`/sipil/projeks/${projekId}/links`, data).then((r) => r.data);
  },
  deleteLink: (linkId: string) => apiClient.delete(`/sipil/links/${linkId}`).then((r) => r.data),
  // Task Fotos
  getTaskFotos: (taskId: string) => apiClient.get(`/sipil/tasks/${taskId}/fotos`).then((r) => r.data),
  uploadTaskFotos: (taskId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("fotos", f));
    return apiClient.post(`/sipil/tasks/${taskId}/fotos`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  deleteTaskFoto: (fotoId: string) => apiClient.delete(`/sipil/tasks/fotos/${fotoId}`).then((r) => r.data),
};

export const interiorProjekApi = {
  listProjeks: () => apiClient.get("/interior/projeks").then((r) => r.data),
  getProjek: (id: string) => apiClient.get(`/interior/projeks/${id}`).then((r) => r.data),
  createProjek: (data: any) => apiClient.post("/interior/projeks", data).then((r) => r.data),
  updateProjek: (id: string, data: any) => apiClient.patch(`/interior/projeks/${id}`, data).then((r) => r.data),
  deleteProjek: (id: string) => apiClient.delete(`/interior/projeks/${id}`).then((r) => r.data),
  addTermin: (projekId: string, data: any) => apiClient.post(`/interior/projeks/${projekId}/termins`, data).then((r) => r.data),
  updateTermin: (terminId: string, data: any) => apiClient.patch(`/interior/projeks/termins/${terminId}`, data).then((r) => r.data),
  deleteTermin: (terminId: string) => apiClient.delete(`/interior/projeks/termins/${terminId}`).then((r) => r.data),
  addTask: (terminId: string, data: any) => apiClient.post(`/interior/projeks/termins/${terminId}/tasks`, data).then((r) => r.data),
  updateTask: (taskId: string, data: any) => apiClient.patch(`/interior/projeks/tasks/${taskId}`, data).then((r) => r.data),
  deleteTask: (taskId: string) => apiClient.delete(`/interior/projeks/tasks/${taskId}`).then((r) => r.data),
  listEmployees: () => apiClient.get("/interior/employees").then((r) => r.data),
  listLeads: () => apiClient.get("/finance/leads-dropdown").then((r) => r.data?.items ?? []),
  // RAPP (same shape as sipilApi)
  getRapp: (terminId: string) => apiClient.get(`/interior/projeks/termins/${terminId}/rapp`).then((r) => r.data),
  addMaterialKategori: (terminId: string, data: any) => apiClient.post(`/interior/projeks/termins/${terminId}/rapp/material-kategori`, data).then((r) => r.data),
  updateMaterialKategori: (id: string, data: any) => apiClient.patch(`/interior/projeks/rapp/material-kategori/${id}`, data).then((r) => r.data),
  deleteMaterialKategori: (id: string) => apiClient.delete(`/interior/projeks/rapp/material-kategori/${id}`).then((r) => r.data),
  addMaterialItem: (kategoriId: string, data: any) => apiClient.post(`/interior/projeks/rapp/material-kategori/${kategoriId}/items`, data).then((r) => r.data),
  updateMaterialItem: (id: string, data: any) => apiClient.patch(`/interior/projeks/rapp/material-items/${id}`, data).then((r) => r.data),
  deleteMaterialItem: (id: string) => apiClient.delete(`/interior/projeks/rapp/material-items/${id}`).then((r) => r.data),
  addSipilItem: (terminId: string, data: any) => apiClient.post(`/interior/projeks/termins/${terminId}/rapp/sipil-items`, data).then((r) => r.data),
  updateSipilItem: (id: string, data: any) => apiClient.patch(`/interior/projeks/rapp/sipil-items/${id}`, data).then((r) => r.data),
  deleteSipilItem: (id: string) => apiClient.delete(`/interior/projeks/rapp/sipil-items/${id}`).then((r) => r.data),
  addVendorKategori: (terminId: string, data: any) => apiClient.post(`/interior/projeks/termins/${terminId}/rapp/vendor-kategori`, data).then((r) => r.data),
  updateVendorKategori: (id: string, data: any) => apiClient.patch(`/interior/projeks/rapp/vendor-kategori/${id}`, data).then((r) => r.data),
  deleteVendorKategori: (id: string) => apiClient.delete(`/interior/projeks/rapp/vendor-kategori/${id}`).then((r) => r.data),
  addVendorItem: (kategoriId: string, data: any) => apiClient.post(`/interior/projeks/rapp/vendor-kategori/${kategoriId}/items`, data).then((r) => r.data),
  updateVendorItem: (id: string, data: any) => apiClient.patch(`/interior/projeks/rapp/vendor-items/${id}`, data).then((r) => r.data),
  deleteVendorItem: (id: string) => apiClient.delete(`/interior/projeks/rapp/vendor-items/${id}`).then((r) => r.data),
  // Task Fotos
  getTaskFotos: (taskId: string) => apiClient.get(`/interior/projeks/tasks/${taskId}/fotos`).then((r) => r.data),
  uploadTaskFotos: (taskId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("fotos", f));
    return apiClient.post(`/interior/projeks/tasks/${taskId}/fotos`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  deleteTaskFoto: (fotoId: string) => apiClient.delete(`/interior/projeks/tasks/fotos/${fotoId}`).then((r) => r.data),
};

export const salesApi = {
  listProyek: (params?: any) => apiClient.get("/sales/proyek-berjalan", { params }).then((r) => r.data),
  getProyek: (id: number) => apiClient.get(`/sales/proyek-berjalan/${id}`).then((r) => r.data),
  createProyek: (data: any) => apiClient.post("/sales/proyek-berjalan", data).then((r) => r.data),
  updateProyek: (id: number, data: any) => apiClient.patch(`/sales/proyek-berjalan/${id}`, data).then((r) => r.data),
  deleteProyek: (id: number) => apiClient.delete(`/sales/proyek-berjalan/${id}`).then((r) => r.data),
};
