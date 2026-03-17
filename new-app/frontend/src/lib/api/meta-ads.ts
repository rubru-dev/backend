import apiClient from "./client";
import type { MetaAdsCampaign, AdContentMetric, WhatsappChatMetric, AdPlatformAccount, AdMonthlyTarget, PaginatedResponse } from "@/types";

export interface CampaignFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

export interface CampaignPayload {
  nama_campaign: string;
  campaign_id?: string;
  objective?: string;
  status?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface ContentMetricPayload {
  tanggal: string;
  reach?: number;
  impressions?: number;
  clicks?: number;
  spend?: number;
  results?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  video_views?: number;
  followers_gained?: number;
}

export interface ChatMetricPayload {
  tanggal: string;
  total_chat?: number;
  responded?: number;
  not_responded?: number;
  converted?: number;
  follow_up?: number;
}

export const metaAdsApi = {
  // Campaigns
  list: async (filters: CampaignFilters = {}): Promise<PaginatedResponse<MetaAdsCampaign>> => {
    const { data } = await apiClient.get<PaginatedResponse<MetaAdsCampaign>>("/bd/meta-ads/campaigns", { params: filters });
    return data;
  },

  get: async (id: number): Promise<MetaAdsCampaign> => {
    const { data } = await apiClient.get<MetaAdsCampaign>(`/bd/meta-ads/campaigns/${id}`);
    return data;
  },

  create: async (payload: CampaignPayload): Promise<MetaAdsCampaign> => {
    const { data } = await apiClient.post<MetaAdsCampaign>("/bd/meta-ads/campaigns", payload);
    return data;
  },

  update: async (id: number, payload: Partial<CampaignPayload>): Promise<MetaAdsCampaign> => {
    const { data } = await apiClient.patch<MetaAdsCampaign>(`/bd/meta-ads/campaigns/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/meta-ads/campaigns/${id}`);
  },

  toggleHidden: async (id: number): Promise<{ id: number; is_hidden: boolean }> => {
    const { data } = await apiClient.patch(`/bd/meta-ads/campaigns/${id}/toggle-hidden`, {});
    return data;
  },

  listAll: async (): Promise<{ items: MetaAdsCampaign[]; total: number }> => {
    const { data } = await apiClient.get<{ items: MetaAdsCampaign[]; total: number }>("/bd/meta-ads/campaigns", { params: { include_hidden: true } });
    return data;
  },

  syncFromMeta: async (id: number): Promise<{ synced: number }> => {
    const { data } = await apiClient.post<{ synced: number }>(`/bd/meta-ads/campaigns/${id}/sync`);
    return data;
  },

  // Content metrics
  getContentMetrics: async (campaignId: number): Promise<AdContentMetric[]> => {
    const { data } = await apiClient.get<AdContentMetric[]>(`/bd/meta-ads/campaigns/${campaignId}/content-metrics`);
    return data;
  },

  addContentMetric: async (campaignId: number, payload: ContentMetricPayload): Promise<AdContentMetric> => {
    const { data } = await apiClient.post<AdContentMetric>(`/bd/meta-ads/campaigns/${campaignId}/content-metrics`, payload);
    return data;
  },

  updateContentMetric: async (id: number, payload: Partial<ContentMetricPayload>): Promise<AdContentMetric> => {
    const { data } = await apiClient.patch<AdContentMetric>(`/bd/meta-ads/content-metrics/${id}`, payload);
    return data;
  },

  deleteContentMetric: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/meta-ads/content-metrics/${id}`);
  },

  // WhatsApp chat metrics
  getChatMetrics: async (campaignId: number): Promise<WhatsappChatMetric[]> => {
    const { data } = await apiClient.get<WhatsappChatMetric[]>(`/bd/meta-ads/campaigns/${campaignId}/chat-metrics`);
    return data;
  },

  addChatMetric: async (campaignId: number, payload: ChatMetricPayload): Promise<WhatsappChatMetric> => {
    const { data } = await apiClient.post<WhatsappChatMetric>(`/bd/meta-ads/campaigns/${campaignId}/chat-metrics`, payload);
    return data;
  },

  deleteChatMetric: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/meta-ads/chat-metrics/${id}`);
  },

  // Dashboard summary
  getDashboard: async (params?: {
    platform?: string;
    campaign_id?: number;
    bulan?: number;
    tahun?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_spend: number;
    total_clicks: number;
    total_impressions: number;
    total_reach: number;
    total_result: number;
    total_conversions: number;
    avg_ctr: number;
    cpm: number;
    cpc: number;
    cpl: number;
    cpl_meta: number;
    total_leads_db: number;
    hot_leads: number;
    low_leads: number;
    medium_leads: number;
    survey_count: number;
    paid_conversions: number;
    campaigns: (MetaAdsCampaign & { total_reach?: number; total_result?: number; cpm?: number; cpc?: number })[];
  }> => {
    const { data } = await apiClient.get("/bd/meta-ads/dashboard", { params });
    return data;
  },

  // Campaign detail with stats
  getCampaignDetail: async (id: number, params?: { start_date?: string; end_date?: string }): Promise<{
    id: number; campaign_name: string; meta_campaign_id: string; platform: string; status: string;
    total_spend: number; total_impressions: number; total_reach: number; total_clicks: number;
    total_result: number; cpm: number; cpc: number; cpl: number; avg_ctr: number;
    total_leads: number; hot_leads: number; survey_count: number; paid_conversions: number;
    content_metrics: Array<{
      id: number; date: string; impressions: number; reach: number; clicks: number;
      spend: number; ctr: number; frequency: number; cost_per_result: number;
      conversions: number; cpm: number; cpc: number;
    }>;
    chat_metrics: Array<{
      id: number; date: string; chats_received: number; chats_responded: number;
      response_rate: number; total_conversions: number; conversion_rate: number;
    }>;
  }> => {
    const { data } = await apiClient.get(`/bd/meta-ads/campaigns/${id}`, { params });
    return data;
  },
};

// ── Ad Platform Accounts ───────────────────────────────────────────────────────
export interface AdAccountPayload {
  platform: string;
  account_name: string;
  app_id?: string;
  app_secret?: string;
  access_token?: string;
  pixel_id?: string;
  ad_account_id?: string;
  advertiser_id?: string;
}

export const adsAccountApi = {
  list: async (): Promise<AdPlatformAccount[]> => {
    const { data } = await apiClient.get<AdPlatformAccount[]>("/bd/ads/accounts");
    return data;
  },
  create: async (payload: AdAccountPayload): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/bd/ads/accounts", payload);
    return data;
  },
  update: async (id: number, payload: Partial<AdAccountPayload> & { is_active?: boolean }): Promise<void> => {
    await apiClient.patch(`/bd/ads/accounts/${id}`, payload);
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/ads/accounts/${id}`);
  },
  sync: async (id: number, bulan?: number, tahun?: number): Promise<{ synced: number; message: string }> => {
    const params: Record<string, number> = {};
    if (bulan) params.bulan = bulan;
    if (tahun) params.tahun = tahun;
    const { data } = await apiClient.post<{ synced: number; message: string }>(`/bd/ads/accounts/${id}/sync`, {}, { params });
    return data;
  },
  refreshToken: async (id: number): Promise<{ message: string; expires_in_days: number | null }> => {
    const { data } = await apiClient.post(`/bd/ads/accounts/${id}/refresh-token`, {});
    return data;
  },
};

// ── Ad Monthly Targets ────────────────────────────────────────────────────────
export interface AdTargetPayload {
  platform: string;
  bulan: number;
  tahun: number;
  target_spend?: number | null;
  target_impressions?: number | null;
  target_clicks?: number | null;
  target_conversions?: number | null;
  target_ctr?: number | null;
  target_roas?: number | null;
}

export const adsTargetApi = {
  list: async (params?: { platform?: string; bulan?: number; tahun?: number }): Promise<AdMonthlyTarget[]> => {
    const { data } = await apiClient.get<AdMonthlyTarget[]>("/bd/ads/targets", { params });
    return data;
  },
  upsert: async (payload: AdTargetPayload): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/bd/ads/targets", payload);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/bd/ads/targets/${id}`);
  },
};
