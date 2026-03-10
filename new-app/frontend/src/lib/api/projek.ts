import { apiClient } from "./client";

export const projekApi = {
  // Kategori
  listKategori: () => apiClient.get("/projek/kategori-barang").then((r) => r.data),
  createKategori: (nama: string) => apiClient.post("/projek/kategori-barang", { nama }).then((r) => r.data),
  deleteKategori: (id: number) => apiClient.delete(`/projek/kategori-barang/${id}`).then((r) => r.data),

  // Barang
  listBarang: (params?: any) => apiClient.get("/projek/barang", { params }).then((r) => r.data),
  createBarang: (data: any) => apiClient.post("/projek/barang", data).then((r) => r.data),
  updateBarang: (id: number, data: any) => apiClient.patch(`/projek/barang/${id}`, data).then((r) => r.data),
  deleteBarang: (id: number) => apiClient.delete(`/projek/barang/${id}`).then((r) => r.data),

  // Warehouse
  listWarehouse: () => apiClient.get("/projek/warehouse").then((r) => r.data),
  getWarehouse: (id: number) => apiClient.get(`/projek/warehouse/${id}`).then((r) => r.data),
  createWarehouse: (nama: string) => apiClient.post("/projek/warehouse", { nama }).then((r) => r.data),
  updateWarehouse: (id: number, nama: string) => apiClient.patch(`/projek/warehouse/${id}`, { nama }).then((r) => r.data),
  deleteWarehouse: (id: number) => apiClient.delete(`/projek/warehouse/${id}`).then((r) => r.data),
  getStok: (id: number) => apiClient.get(`/projek/warehouse/${id}/stok`).then((r) => r.data),
  addStok: (id: number, data: any) => apiClient.post(`/projek/warehouse/${id}/stok`, data).then((r) => r.data),
  updateStok: (wid: number, sid: number, data: any) => apiClient.patch(`/projek/warehouse/${wid}/stok/${sid}`, data).then((r) => r.data),
  deleteStok: (wid: number, sid: number) => apiClient.delete(`/projek/warehouse/${wid}/stok/${sid}`).then((r) => r.data),

  // Projek
  listProjeks: (params?: any) => apiClient.get("/projek/projeks", { params }).then((r) => r.data),
  getProjek: (id: number) => apiClient.get(`/projek/projeks/${id}`).then((r) => r.data),
  createProjek: (data: any) => apiClient.post("/projek/projeks", data).then((r) => r.data),
  updateProjek: (id: number, data: any) => apiClient.patch(`/projek/projeks/${id}`, data).then((r) => r.data),
  deleteProjek: (id: number) => apiClient.delete(`/projek/projeks/${id}`).then((r) => r.data),

  // Termin
  listTermins: (projekId: number) => apiClient.get(`/projek/projeks/${projekId}/termins`).then((r) => r.data),
  createTermin: (projekId: number, data: any) => apiClient.post(`/projek/projeks/${projekId}/termins`, data).then((r) => r.data),
  getTermin: (id: number) => apiClient.get(`/projek/termins/${id}`).then((r) => r.data),
  updateTermin: (id: number, data: any) => apiClient.patch(`/projek/termins/${id}`, data).then((r) => r.data),
  deleteTermin: (id: number) => apiClient.delete(`/projek/termins/${id}`).then((r) => r.data),
  addBarangTermin: (terminId: number, data: any) => apiClient.post(`/projek/termins/${terminId}/barang`, data).then((r) => r.data),
  deleteBarangTermin: (id: number) => apiClient.delete(`/projek/termin-barang/${id}`).then((r) => r.data),

  // Stock Opname
  listStockOpname: () => apiClient.get("/projek/stock-opname").then((r) => r.data),
  getStockOpname: (id: number) => apiClient.get(`/projek/stock-opname/${id}`).then((r) => r.data),
  createStockOpname: (data: any) => apiClient.post("/projek/stock-opname", data).then((r) => r.data),
  updateStockOpname: (id: number, data: any) => apiClient.patch(`/projek/stock-opname/${id}`, data).then((r) => r.data),
  deleteStockOpname: (id: number) => apiClient.delete(`/projek/stock-opname/${id}`).then((r) => r.data),
  addSOTermin: (pid: number, data: any) => apiClient.post(`/projek/stock-opname/${pid}/termins`, data).then((r) => r.data),
  getSOTermin: (tid: number) => apiClient.get(`/projek/stock-opname/termins/${tid}`).then((r) => r.data),
  addRappItem: (tid: number, data: any) => apiClient.post(`/projek/stock-opname/termins/${tid}/rapp-items`, data).then((r) => r.data),
  addUsage: (rid: number, data: any) => apiClient.post(`/projek/stock-opname/rapp-items/${rid}/usage`, data).then((r) => r.data),
  deleteUsage: (uid: number) => apiClient.delete(`/projek/stock-opname/usage/${uid}`).then((r) => r.data),
};
