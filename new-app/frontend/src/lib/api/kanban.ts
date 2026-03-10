import apiClient from "./client";
import type { KanbanColumn, KanbanCard, KanbanComment, KanbanMetrics } from "@/types";

// ── Board types ────────────────────────────────────────────────────────────────
export interface BoardResponse {
  columns: KanbanColumn[];
}

export interface ColumnPayload {
  title: string;
  urutan?: number;
  color?: string;
}

export interface CardPayload {
  title: string;
  description?: string;
  column_id: number;
  assigned_user_id?: number | null;
  lead_id?: number | null;
  deadline?: string | null;
  color?: string | null;
  label_ids?: number[];
  urutan?: number;
  projeksi_sales?: number | null;
}

export interface MoveCardPayload {
  column_id: number;
  position: number;
}

export interface CommentPayload {
  body: string;
}

// ── BD Kanban API ──────────────────────────────────────────────────────────────
export const bdKanbanApi = {
  getBoard: async (): Promise<BoardResponse> => {
    const { data } = await apiClient.get<BoardResponse>("/bd/kanban");
    return data;
  },

  // Column CRUD
  createColumn: async (payload: ColumnPayload): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/bd/kanban/columns", payload);
    return data;
  },
  updateColumn: async (id: number, payload: Partial<ColumnPayload>): Promise<void> => {
    await apiClient.patch(`/bd/kanban/columns/${id}`, payload);
  },
  deleteColumn: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/kanban/columns/${id}`);
  },

  // Card CRUD
  createCard: async (payload: CardPayload): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/bd/kanban/cards", payload);
    return data;
  },
  updateCard: async (id: number, payload: Partial<CardPayload>): Promise<void> => {
    await apiClient.patch(`/bd/kanban/cards/${id}`, payload);
  },
  moveCard: async (id: number, payload: MoveCardPayload): Promise<void> => {
    await apiClient.patch(`/bd/kanban/cards/${id}/move`, payload);
  },
  deleteCard: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/kanban/cards/${id}`);
  },

  // Comments
  addComment: async (cardId: number, payload: CommentPayload): Promise<KanbanComment> => {
    const { data } = await apiClient.post<KanbanComment>(`/bd/kanban/cards/${cardId}/comments`, payload);
    return data;
  },
  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/bd/kanban/comments/${commentId}`);
  },

  // Metrics
  getMetrics: async (year: number, month: number): Promise<KanbanMetrics> => {
    const { data } = await apiClient.get<KanbanMetrics>("/bd/kanban/metrics", {
      params: { year, month },
    });
    return data;
  },
};

// ── Sales Kanban — same structure, different prefix ────────────────────────────
export const salesKanbanApi = {
  getBoard: async (): Promise<BoardResponse> => {
    const { data } = await apiClient.get<BoardResponse>("/sales/kanban");
    return data;
  },

  // Column CRUD
  createColumn: async (payload: ColumnPayload): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/sales/kanban/columns", payload);
    return data;
  },
  updateColumn: async (id: number, payload: Partial<ColumnPayload>): Promise<void> => {
    await apiClient.patch(`/sales/kanban/columns/${id}`, payload);
  },
  deleteColumn: async (id: number): Promise<void> => {
    await apiClient.delete(`/sales/kanban/columns/${id}`);
  },

  // Card CRUD
  createCard: async (payload: CardPayload): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/sales/kanban/cards", payload);
    return data;
  },
  updateCard: async (id: number, payload: Partial<CardPayload>): Promise<void> => {
    await apiClient.patch(`/sales/kanban/cards/${id}`, payload);
  },
  moveCard: async (id: number, payload: MoveCardPayload): Promise<void> => {
    await apiClient.patch(`/sales/kanban/cards/${id}/move`, payload);
  },
  deleteCard: async (id: number): Promise<void> => {
    await apiClient.delete(`/sales/kanban/cards/${id}`);
  },

  // Comments
  addComment: async (cardId: number, payload: CommentPayload): Promise<void> => {
    await apiClient.post(`/sales/kanban/cards/${cardId}/comments`, payload);
  },
  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/sales/kanban/comments/${commentId}`);
  },

  // Metrics
  getMetrics: async (year: number, month: number): Promise<KanbanMetrics> => {
    const { data } = await apiClient.get<KanbanMetrics>("/sales/kanban/metrics", {
      params: { year, month },
    });
    return data;
  },

  // Carry-over: copy expired Follow Up Admin cards into the next month
  carryover: async (payload: { month: number; year: number }): Promise<{ copied: number }> => {
    const { data } = await apiClient.post<{ copied: number }>("/sales/kanban/carryover", payload);
    return data;
  },

  // Leads dropdown for card creation
  getLeads: async (): Promise<{ id: number; nama: string }[]> => {
    const { data } = await apiClient.get<{ id: number; nama: string }[]>("/sales/kanban/leads");
    return data;
  },
};

// ── Admin Kanban (Sales Admin) types & API ─────────────────────────────────────

export interface AdminKanbanCard {
  id: number;
  column_id: number;
  title: string;
  description?: string | null;
  deadline?: string | null;
  tanggal_survey?: string | null;
  color?: string | null;
  lead?: { id: number; nama: string } | null;
}

export interface AdminKanbanColumn {
  id: number;
  title: string;
  color?: string | null;
  cards: AdminKanbanCard[];
}

export interface AdminCardPayload {
  title: string;
  description?: string | null;
  deadline?: string | null;
  tanggal_survey?: string | null;
  color?: string | null;
  lead_id?: number | null;
}

export const adminKanbanApi = {
  getBoard: async (bulan: number, tahun: number): Promise<AdminKanbanColumn[]> => {
    const { data } = await apiClient.get<AdminKanbanColumn[]>("/sales-admin/kanban", { params: { bulan, tahun } });
    return data;
  },
  getLeads: async (): Promise<{ id: number; nama: string }[]> => {
    const { data } = await apiClient.get<{ id: number; nama: string }[]>("/sales-admin/kanban/leads");
    return data;
  },
  createColumn: async (payload: { title: string; bulan: number; tahun: number }): Promise<void> => {
    await apiClient.post("/sales-admin/kanban/columns", payload);
  },
  updateColumn: async (id: number, payload: { title?: string; color?: string }): Promise<void> => {
    await apiClient.patch(`/sales-admin/kanban/columns/${id}`, payload);
  },
  deleteColumn: async (id: number): Promise<void> => {
    await apiClient.delete(`/sales-admin/kanban/columns/${id}`);
  },
  createCard: async (columnId: number, payload: { title: string; lead_id?: number | null }): Promise<void> => {
    await apiClient.post(`/sales-admin/kanban/columns/${columnId}/cards`, payload);
  },
  updateCard: async (id: number, payload: Partial<AdminCardPayload>): Promise<void> => {
    await apiClient.patch(`/sales-admin/kanban/cards/${id}`, payload);
  },
  deleteCard: async (id: number): Promise<void> => {
    await apiClient.delete(`/sales-admin/kanban/cards/${id}`);
  },
  moveCard: async (cardId: number, targetColumnId: number, bulan: number, tahun: number): Promise<void> => {
    await apiClient.post(`/sales-admin/kanban/cards/${cardId}/move`, { target_column_id: targetColumnId, bulan, tahun });
  },
  setSurveyDate: async (cardId: number, tanggal_survey: string | null): Promise<void> => {
    await apiClient.patch(`/sales-admin/kanban/cards/${cardId}/survey`, { tanggal_survey });
  },
  carryover: async (payload: { from_bulan: number; from_tahun: number; to_bulan: number; to_tahun: number }): Promise<void> => {
    await apiClient.post("/sales-admin/kanban/carryover", payload);
  },
  getComments: async (cardId: number): Promise<{ id: number; body: string; user: { name: string }; created_at: string }[]> => {
    const { data } = await apiClient.get(`/sales-admin/kanban/cards/${cardId}/comments`);
    return data;
  },
  addComment: async (cardId: number, body: string): Promise<void> => {
    await apiClient.post(`/sales-admin/kanban/cards/${cardId}/comments`, { body });
  },
};

// ── Telemarketing Kanban types & API ──────────────────────────────────────────

export interface TelemarketingKanbanCard {
  id: number;
  column_id: number;
  title: string;
  description?: string | null;
  deadline?: string | null;
  tanggal_survey?: string | null;
  color?: string | null;
  lead?: { id: number; nama: string } | null;
}

export interface TelemarketingKanbanColumn {
  id: number;
  title: string;
  color?: string | null;
  cards: TelemarketingKanbanCard[];
}

export const telemarketingKanbanApi = {
  getBoard: async (bulan: number, tahun: number): Promise<TelemarketingKanbanColumn[]> => {
    const { data } = await apiClient.get<TelemarketingKanbanColumn[]>("/telemarketing/kanban", { params: { bulan, tahun } });
    return data;
  },
  getLeads: async (): Promise<{ id: number; nama: string }[]> => {
    const { data } = await apiClient.get<{ id: number; nama: string }[]>("/telemarketing/kanban/leads");
    return data;
  },
  createColumn: async (payload: { title: string; bulan: number; tahun: number }): Promise<void> => {
    await apiClient.post("/telemarketing/kanban/columns", payload);
  },
  updateColumn: async (id: number, payload: { title?: string; color?: string }): Promise<void> => {
    await apiClient.patch(`/telemarketing/kanban/columns/${id}`, payload);
  },
  deleteColumn: async (id: number): Promise<void> => {
    await apiClient.delete(`/telemarketing/kanban/columns/${id}`);
  },
  createCard: async (columnId: number, payload: { title: string; lead_id?: number | null }): Promise<void> => {
    await apiClient.post(`/telemarketing/kanban/columns/${columnId}/cards`, payload);
  },
  updateCard: async (id: number, payload: Partial<{ title: string; description: string | null; deadline: string | null; tanggal_survey: string | null; color: string | null }>): Promise<void> => {
    await apiClient.patch(`/telemarketing/kanban/cards/${id}`, payload);
  },
  deleteCard: async (id: number): Promise<void> => {
    await apiClient.delete(`/telemarketing/kanban/cards/${id}`);
  },
  moveCard: async (cardId: number, targetColumnId: number, bulan: number, tahun: number): Promise<void> => {
    await apiClient.post(`/telemarketing/kanban/cards/${cardId}/move`, { target_column_id: targetColumnId, bulan, tahun });
  },
  setSurveyDate: async (cardId: number, tanggal_survey: string | null): Promise<void> => {
    await apiClient.patch(`/telemarketing/kanban/cards/${cardId}/survey`, { tanggal_survey });
  },
  carryover: async (payload: { from_bulan: number; from_tahun: number; to_bulan: number; to_tahun: number }): Promise<void> => {
    await apiClient.post("/telemarketing/kanban/carryover", payload);
  },
  getComments: async (cardId: number): Promise<{ id: number; body: string; user: { name: string }; created_at: string }[]> => {
    const { data } = await apiClient.get(`/telemarketing/kanban/cards/${cardId}/comments`);
    return data;
  },
  addComment: async (cardId: number, body: string): Promise<void> => {
    await apiClient.post(`/telemarketing/kanban/cards/${cardId}/comments`, { body });
  },
};
