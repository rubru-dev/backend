import apiClient from "./client";

export interface GoldenCampaign {
  id: number;
  campaign_name: string;
  meta_campaign_id?: string | null;
  platform: string;
  status?: string;
  budget_harian?: number | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  daily_budget?: number | null;
  total_budget?: number | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  content_type?: string | null;
  content_description?: string | null;
  // API Credentials — hanya dikirim saat create/update (tidak pernah dikembalikan dari server)
  account_name?: string | null;
  app_id?: string | null;
  ad_account_id?: string | null;
  pixel_id?: string | null;
  app_secret?: string | null;
  access_token?: string | null;
  // Flag dari server — true jika access_token & ad_account_id sudah dikonfigurasi
  has_credentials?: boolean;
  // Info credential yang aman untuk ditampilkan (tidak ada raw secret/token)
  app_id_set?: boolean;
  ad_account_id_display?: string | null;
  pixel_id_display?: string | null;
  is_hidden: boolean;
  last_synced_at?: string | null;
  token_refreshed_at?: string | null;
  content_metrics?: GoldenContentMetric[];
  chat_metrics?: GoldenChatMetric[];
}

export interface GoldenContentMetric {
  id: number;
  campaign_id: number;
  date: string;
  content_type?: string | null;
  content_url?: string | null;
  impressions?: number | null;
  clicks?: number | null;
  reach?: number | null;
  spend?: number | null;
  conversions?: number | null;
  engagement_rate?: number | null;
}

export interface GoldenChatMetric {
  id: number;
  campaign_id: number;
  date: string;
  chats_received?: number | null;
  chats_responded?: number | null;
  avg_response_time?: number | null;
  total_conversions?: number | null;
  response_rate?: number | null;
  conversion_rate?: number | null;
}

export interface GoldenDashboard {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_reach: number;
  total_chats: number;
  total_chats_responded: number;
  campaigns: GoldenCampaign[];
}

export const goldenMetaAdsApi = {
  listCampaigns: async (params?: { include_hidden?: boolean }): Promise<{ items: GoldenCampaign[] }> => {
    const { data } = await apiClient.get("/golden/meta-ads/campaigns", { params });
    return data;
  },
  createCampaign: async (payload: Partial<GoldenCampaign>): Promise<GoldenCampaign> => {
    const { data } = await apiClient.post("/golden/meta-ads/campaigns", payload);
    return data;
  },
  updateCampaign: async (id: number, payload: Partial<GoldenCampaign>): Promise<void> => {
    await apiClient.patch(`/golden/meta-ads/campaigns/${id}`, payload);
  },
  deleteCampaign: async (id: number): Promise<void> => {
    await apiClient.delete(`/golden/meta-ads/campaigns/${id}`);
  },
  toggleHidden: async (id: number): Promise<void> => {
    await apiClient.patch(`/golden/meta-ads/campaigns/${id}/toggle-hidden`);
  },
  syncCampaign: async (id: number, bulan: number, tahun: number): Promise<{ synced: number; message: string }> => {
    const { data } = await apiClient.post(`/golden/meta-ads/campaigns/${id}/sync`, null, { params: { bulan, tahun } });
    return data;
  },
  getCampaignDetail: async (id: number): Promise<GoldenCampaign> => {
    const { data } = await apiClient.get(`/golden/meta-ads/campaigns/${id}`);
    return data;
  },

  // Content metrics
  createContentMetric: async (campaignId: number, payload: Partial<GoldenContentMetric>): Promise<GoldenContentMetric> => {
    const { data } = await apiClient.post(`/golden/meta-ads/campaigns/${campaignId}/content-metrics`, payload);
    return data;
  },
  updateContentMetric: async (id: number, payload: Partial<GoldenContentMetric>): Promise<void> => {
    await apiClient.patch(`/golden/meta-ads/content-metrics/${id}`, payload);
  },
  deleteContentMetric: async (id: number): Promise<void> => {
    await apiClient.delete(`/golden/meta-ads/content-metrics/${id}`);
  },

  // Chat metrics
  createChatMetric: async (campaignId: number, payload: Partial<GoldenChatMetric>): Promise<GoldenChatMetric> => {
    const { data } = await apiClient.post(`/golden/meta-ads/campaigns/${campaignId}/chat-metrics`, payload);
    return data;
  },
  updateChatMetric: async (id: number, payload: Partial<GoldenChatMetric>): Promise<void> => {
    await apiClient.patch(`/golden/meta-ads/chat-metrics/${id}`, payload);
  },
  deleteChatMetric: async (id: number): Promise<void> => {
    await apiClient.delete(`/golden/meta-ads/chat-metrics/${id}`);
  },

  getDashboard: async (params?: { bulan?: number; tahun?: number; campaign_id?: number }): Promise<GoldenDashboard> => {
    const { data } = await apiClient.get("/golden/meta-ads/dashboard", { params });
    return data;
  },
  refreshToken: async (id: number): Promise<{ message: string; expires_in_days: number | null }> => {
    const { data } = await apiClient.post(`/golden/meta-ads/campaigns/${id}/refresh-token`, {});
    return data;
  },
};

// ── Golden Ad Monthly Targets ─────────────────────────────────────────────────
export interface GoldenTargetPayload {
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

export interface GoldenMonthlyTarget {
  id: number;
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

export const goldenTargetApi = {
  list: async (params?: { platform?: string; bulan?: number; tahun?: number }): Promise<GoldenMonthlyTarget[]> => {
    const { data } = await apiClient.get("/golden/ads/targets", { params });
    return data;
  },
  upsert: async (payload: GoldenTargetPayload): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/golden/ads/targets", payload);
    return data;
  },
};
