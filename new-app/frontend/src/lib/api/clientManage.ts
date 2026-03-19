import { apiClient } from "./client";

export const clientApi = {
  // ── Projects ──────────────────────────────────────────────────────────────
  listProjects: () => apiClient.get("/client/projects").then((r) => r.data),
  getProject: (id: number) => apiClient.get(`/client/projects/${id}`).then((r) => r.data),
  createProject: (data: any) => apiClient.post("/client/projects", data).then((r) => r.data),
  updateProject: (id: number, data: any) => apiClient.patch(`/client/projects/${id}`, data).then((r) => r.data),
  deleteProject: (id: number) => apiClient.delete(`/client/projects/${id}`).then((r) => r.data),
  updateAccount: (id: number, data: any) => apiClient.patch(`/client/projects/${id}/account`, data).then((r) => r.data),
  leadsDropdown: () => apiClient.get("/client/leads-dropdown").then((r) => r.data),
  admProjectsDropdown: () => apiClient.get("/client/adm-projects-dropdown").then((r) => r.data),

  // ── Payments ──────────────────────────────────────────────────────────────
  listPayments: (pid: number) => apiClient.get(`/client/projects/${pid}/payments`).then((r) => r.data),
  createPayment: (pid: number, data: any) => apiClient.post(`/client/projects/${pid}/payments`, data).then((r) => r.data),
  updatePayment: (pid: number, pmid: number, data: any) => apiClient.patch(`/client/projects/${pid}/payments/${pmid}`, data).then((r) => r.data),
  deletePayment: (pid: number, pmid: number) => apiClient.delete(`/client/projects/${pid}/payments/${pmid}`).then((r) => r.data),

  // ── Galeri ────────────────────────────────────────────────────────────────
  listGaleri: (pid: number) => apiClient.get(`/client/projects/${pid}/galeri`).then((r) => r.data),
  uploadGaleri: (pid: number, formData: FormData) =>
    apiClient.post(`/client/projects/${pid}/galeri`, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  deleteGaleri: (pid: number, gid: number) => apiClient.delete(`/client/projects/${pid}/galeri/${gid}`).then((r) => r.data),

  // ── Dokumen ───────────────────────────────────────────────────────────────
  listDokumen: (pid: number) => apiClient.get(`/client/projects/${pid}/dokumen`).then((r) => r.data),
  uploadDokumen: (pid: number, formData: FormData) =>
    apiClient.post(`/client/projects/${pid}/dokumen`, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  deleteDokumen: (pid: number, did: number) => apiClient.delete(`/client/projects/${pid}/dokumen/${did}`).then((r) => r.data),

  // ── Aktivitas ─────────────────────────────────────────────────────────────
  listAktivitas: (pid: number) => apiClient.get(`/client/projects/${pid}/aktivitas`).then((r) => r.data),
  createAktivitas: (pid: number, data: FormData | any) =>
    apiClient.post(`/client/projects/${pid}/aktivitas`, data, { headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {} }).then((r) => r.data),
  updateAktivitas: (pid: number, aid: number, data: FormData | any) =>
    apiClient.patch(`/client/projects/${pid}/aktivitas/${aid}`, data, { headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {} }).then((r) => r.data),
  deleteAktivitas: (pid: number, aid: number) => apiClient.delete(`/client/projects/${pid}/aktivitas/${aid}`).then((r) => r.data),

  // ── Gantt ─────────────────────────────────────────────────────────────────
  listGantt: (pid: number) => apiClient.get(`/client/projects/${pid}/gantt`).then((r) => r.data),
  createGantt: (pid: number, data: any) => apiClient.post(`/client/projects/${pid}/gantt`, data).then((r) => r.data),
  updateGantt: (pid: number, gid: number, data: any) => apiClient.patch(`/client/projects/${pid}/gantt/${gid}`, data).then((r) => r.data),
  deleteGantt: (pid: number, gid: number) => apiClient.delete(`/client/projects/${pid}/gantt/${gid}`).then((r) => r.data),

  // ── Kontak ────────────────────────────────────────────────────────────────
  listKontak: (pid: number) => apiClient.get(`/client/projects/${pid}/kontak`).then((r) => r.data),
  createKontak: (pid: number, data: any) => apiClient.post(`/client/projects/${pid}/kontak`, data).then((r) => r.data),
  updateKontak: (pid: number, kid: number, data: any) => apiClient.patch(`/client/projects/${pid}/kontak/${kid}`, data).then((r) => r.data),
  deleteKontak: (pid: number, kid: number) => apiClient.delete(`/client/projects/${pid}/kontak/${kid}`).then((r) => r.data),

  // ── Kehadiran ─────────────────────────────────────────────────────────────
  listKehadiran: (pid: number, params?: any) => apiClient.get(`/client/projects/${pid}/kehadiran`, { params }).then((r) => r.data),

  // ── Invoices (from Finance) ────────────────────────────────────────────────
  listInvoices: (pid: number) => apiClient.get(`/client/projects/${pid}/invoices`).then((r) => r.data),

  // ── Assignable Invoices (untuk di-assign ke portal klien) ─────────────────
  listAssignableInvoices: (pid: number) => apiClient.get(`/client/projects/${pid}/assignable-invoices`).then((r) => r.data),
  assignInvoice: (pid: number, invId: number) => apiClient.post(`/client/projects/${pid}/invoices/${invId}/assign`).then((r) => r.data),
  unassignInvoice: (pid: number, invId: number) => apiClient.delete(`/client/projects/${pid}/invoices/${invId}/assign`).then((r) => r.data),

  // ── CCTV Streams ──────────────────────────────────────────────────────────
  listCctv: (pid: number) => apiClient.get(`/client/projects/${pid}/cctv`).then((r) => r.data),
  createCctv: (pid: number, data: any) => apiClient.post(`/client/projects/${pid}/cctv`, data).then((r) => r.data),
  updateCctv: (pid: number, sid: number, data: any) => apiClient.patch(`/client/projects/${pid}/cctv/${sid}`, data).then((r) => r.data),
  deleteCctv: (pid: number, sid: number) => apiClient.delete(`/client/projects/${pid}/cctv/${sid}`).then((r) => r.data),
};
