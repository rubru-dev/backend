import apiClient from "./client";
import type { Lead, PaginatedResponse } from "@/types";

export interface LeadFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  jenis?: string;
  bulan?: number;
  tahun?: number;
}

export interface LeadPayload {
  nama: string;
  nomor_telepon?: string;
  alamat?: string;
  sumber_leads?: string;
  keterangan?: string;
  jenis?: "Sipil" | "Interior" | "Desain";
  week?: number;
  status?: "Low" | "Medium" | "Hot";
  tipe?: string;
  bulan?: number;
  tahun?: number;
  rencana_survey?: "Ya" | "Tidak";
  tanggal_survey?: string;
  pic_survey?: number;
}

export const leadsApi = {
  list: async (filters: LeadFilters = {}): Promise<PaginatedResponse<Lead>> => {
    const { data } = await apiClient.get<PaginatedResponse<Lead>>("/bd/leads", { params: filters });
    return data;
  },

  get: async (id: number): Promise<Lead> => {
    const { data } = await apiClient.get<Lead>(`/bd/leads/${id}`);
    return data;
  },

  create: async (payload: LeadPayload): Promise<Lead> => {
    const { data } = await apiClient.post<Lead>("/bd/leads", payload);
    return data;
  },

  update: async (id: number, payload: Partial<LeadPayload>): Promise<Lead> => {
    const { data } = await apiClient.patch<Lead>(`/bd/leads/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/leads/${id}`);
  },

  approveSurvey: async (id: number): Promise<Lead> => {
    const { data } = await apiClient.post<Lead>(`/bd/leads/${id}/approve-survey`);
    return data;
  },

  rejectSurvey: async (id: number): Promise<Lead> => {
    const { data } = await apiClient.post<Lead>(`/bd/leads/${id}/reject-survey`);
    return data;
  },
};
