import { apiClient } from "./client";

export type ProjectStockType = "sipil" | "interior";

export const projectStockApi = {
  list: (type: ProjectStockType, projectId: string | number) => apiClient.get(`/project-stock/${type}/${projectId}`).then((r) => r.data),
  addItem: (type: ProjectStockType, projectId: string | number, data: any) => apiClient.post(`/project-stock/${type}/${projectId}/items`, data).then((r) => r.data),
  movement: (itemId: string, data: any) => apiClient.post(`/project-stock/items/${itemId}/movements`, data).then((r) => r.data),
  listPB: (type: ProjectStockType, projectId: string | number) => apiClient.get(`/project-stock/${type}/${projectId}/pb`).then((r) => r.data),
  listPBAll: () => apiClient.get("/project-stock/pb").then((r) => r.data),
  createPB: (type: ProjectStockType, projectId: string | number, data: any) => apiClient.post(`/project-stock/${type}/${projectId}/pb`, data).then((r) => r.data),
  updatePBStatus: (id: string, status: string) => apiClient.patch(`/project-stock/pb/${id}/status`, { status }).then((r) => r.data),
  createPRFromPB: (id: string) => apiClient.post(`/project-stock/pb/${id}/create-pr`).then((r) => r.data),
  receivePB: (id: string, tanggal?: string) => apiClient.post(`/project-stock/pb/${id}/receive`, { tanggal }).then((r) => r.data),
  warehouses: () => apiClient.get("/project-stock/warehouses").then((r) => r.data),
};
