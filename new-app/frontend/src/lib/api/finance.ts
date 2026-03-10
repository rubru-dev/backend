import { apiClient } from "./client";

export const financeApi = {
  // Invoice
  listInvoices: (params?: any) => apiClient.get("/finance/invoice", { params }).then((r) => r.data),
  getInvoice: (id: number) => apiClient.get(`/finance/invoice/${id}`).then((r) => r.data),
  createInvoice: (data: any) => apiClient.post("/finance/invoice", data).then((r) => r.data),
  deleteInvoice: (id: number) => apiClient.delete(`/finance/invoice/${id}`).then((r) => r.data),
  approveInvoice: (id: number) => apiClient.post(`/finance/invoice/${id}/approve`).then((r) => r.data),
  rejectInvoice: (id: number, rejection_note: string) => apiClient.post(`/finance/invoice/${id}/reject`, { rejection_note }).then((r) => r.data),
  addInvoiceItem: (id: number, data: any) => apiClient.post(`/finance/invoice/${id}/items`, data).then((r) => r.data),
  deleteInvoiceItem: (invoiceId: number, itemId: number) => apiClient.delete(`/finance/invoice/${invoiceId}/items/${itemId}`).then((r) => r.data),
  createKwitansi: (invoiceId: number, data: any) => apiClient.post(`/finance/invoice/${invoiceId}/kwitansi`, data).then((r) => r.data),

  // Adm Finance
  listAdmFinance: (params?: any) => apiClient.get("/finance/adm-finance", { params }).then((r) => r.data),
  getAdmFinance: (id: number) => apiClient.get(`/finance/adm-finance/${id}`).then((r) => r.data),
  createAdmFinance: (data: any) => apiClient.post("/finance/adm-finance", data).then((r) => r.data),
  updateAdmFinance: (id: number, data: any) => apiClient.patch(`/finance/adm-finance/${id}`, data).then((r) => r.data),
  deleteAdmFinance: (id: number) => apiClient.delete(`/finance/adm-finance/${id}`).then((r) => r.data),

  listAdmTermins: (pid: number) => apiClient.get(`/finance/adm-finance/${pid}/termins`).then((r) => r.data),
  createAdmTermin: (pid: number, data: any) => apiClient.post(`/finance/adm-finance/${pid}/termins`, data).then((r) => r.data),
  getAdmTermin: (id: number) => apiClient.get(`/finance/adm-finance/termins/${id}`).then((r) => r.data),
  updateAdmTermin: (id: number, data: any) => apiClient.patch(`/finance/adm-finance/termins/${id}`, data).then((r) => r.data),
  deleteAdmTermin: (id: number) => apiClient.delete(`/finance/adm-finance/termins/${id}`).then((r) => r.data),

  listPeriodes: (tid: number) => apiClient.get(`/finance/adm-finance/termins/${tid}/periodes`).then((r) => r.data),
  createPeriode: (tid: number, data: any) => apiClient.post(`/finance/adm-finance/termins/${tid}/periodes`, data).then((r) => r.data),
  getPeriode: (id: number) => apiClient.get(`/finance/adm-finance/periodes/${id}`).then((r) => r.data),
  updatePeriode: (id: number, data: any) => apiClient.patch(`/finance/adm-finance/periodes/${id}`, data).then((r) => r.data),
  deletePeriode: (id: number) => apiClient.delete(`/finance/adm-finance/periodes/${id}`).then((r) => r.data),
  approvePeriode: (id: number, data?: any) => apiClient.post(`/finance/adm-finance/periodes/${id}/approve`, data ?? {}).then((r) => r.data),
  addPeriodeItem: (id: number, data: any) => apiClient.post(`/finance/adm-finance/periodes/${id}/items`, data).then((r) => r.data),
  deletePeriodeItem: (itemId: number) => apiClient.delete(`/finance/adm-finance/periodes/items/${itemId}`).then((r) => r.data),

  // Administrasi
  listAdministrasi: (params?: any) => apiClient.get("/finance/administrasi", { params }).then((r) => r.data),
  createAdministrasi: (data: any) => apiClient.post("/finance/administrasi", data).then((r) => r.data),
  getAdministrasi: (id: number) => apiClient.get(`/finance/administrasi/${id}`).then((r) => r.data),
  deleteAdministrasi: (id: number) => apiClient.delete(`/finance/administrasi/${id}`).then((r) => r.data),

  // Surat Jalan
  listSuratJalan: (params?: any) => apiClient.get("/finance/surat-jalan", { params }).then((r) => r.data),
  createSuratJalan: (data: any) => apiClient.post("/finance/surat-jalan", data).then((r) => r.data),
  getSuratJalan: (id: number) => apiClient.get(`/finance/surat-jalan/${id}`).then((r) => r.data),
  deleteSuratJalan: (id: number) => apiClient.delete(`/finance/surat-jalan/${id}`).then((r) => r.data),

  // Tukang
  listAbsen: (params?: any) => apiClient.get("/finance/tukang/absen", { params }).then((r) => r.data),
  createAbsen: (data: any) => apiClient.post("/finance/tukang/absen", data).then((r) => r.data),
  deleteAbsen: (id: number) => apiClient.delete(`/finance/tukang/absen/${id}`).then((r) => r.data),
  listGaji: (params?: any) => apiClient.get("/finance/tukang/gaji", { params }).then((r) => r.data),
  createGaji: (data: any) => apiClient.post("/finance/tukang/gaji", data).then((r) => r.data),
  getGaji: (id: number) => apiClient.get(`/finance/tukang/gaji/${id}`).then((r) => r.data),
  deleteGaji: (id: number) => apiClient.delete(`/finance/tukang/gaji/${id}`).then((r) => r.data),
};
