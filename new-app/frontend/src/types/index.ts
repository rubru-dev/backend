// =============================================================================
// Global TypeScript Types — mirrored from PostgreSQL schema
// =============================================================================

// ── Shared ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages?: number;
}

export interface ApiError {
  detail: string | { msg: string; type: string }[];
}

// ── Auth & User ───────────────────────────────────────────────────────────────

export interface Role {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  name: string;
  module: string;
  label: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  whatsapp_number: string | null;
  email_verified_at: string | null;
  roles: Role[];
  permissions: string[];   // flat array e.g. ["bd.view", "finance.sign_head"]
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export type LeadStatus = "Low" | "Medium" | "Hot";
export type LeadJenis = "Sipil" | "Interior" | "Desain";
export type SurveyApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface Lead {
  id: number;
  user_id: number | null;
  nama: string;
  nomor_telepon: string | null;
  alamat: string | null;
  sumber_leads: string | null;
  keterangan: string | null;
  jenis: LeadJenis | null;
  week: number | null;
  status: LeadStatus;
  tipe: string | null;
  bulan: number | null;
  tahun: number | null;
  rencana_survey: "Ya" | "Tidak";
  tanggal_survey: string | null;
  pic_survey: number | null;
  survey_approval_status: SurveyApprovalStatus | null;
  survey_approved_by: number | null;
  survey_approved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  survey_approver?: User;
}

// ── Kanban ────────────────────────────────────────────────────────────────────

export interface KanbanColumn {
  id: number;
  title: string;
  urutan: number;
  color?: string;
  cards?: KanbanCard[];
}

export interface KanbanCard {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  assigned_user_id: number | null;
  deadline: string | null;
  due_date?: string | null;     // legacy alias
  color?: string | null;
  status?: string | null;
  projeksi_sales?: number | null;
  urutan: number;
  comments_count?: number;
  created_at?: string;
  assigned_user?: User;
  lead?: { id: number; nama: string } | null;
  labels?: KanbanLabel[];
  comments?: KanbanComment[];
}

export interface KanbanLabel {
  id: number;
  card_id: number;
  label_name: string | null;
  color: string | null;
}

export interface KanbanComment {
  id: number;
  card_id: number;
  user_id: number;
  body: string;
  created_at: string;
  user?: User;
}

export interface KanbanMetrics {
  summary: { total: number; this_month: number };
  by_column: Array<{ column_id: number; title: string; color: string; count: number }>;
  timeline: Array<{ day: number; count: number }>;
}

// ── Meta Ads ──────────────────────────────────────────────────────────────────

export interface MetaAdsCampaign {
  id: number;
  nama_campaign: string;
  campaign_name?: string;       // backend alias
  campaign_id: string | null;   // Meta campaign ID
  objective: string | null;
  status: string | null;
  platform?: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  // Aggregated from metrics (computed by backend)
  total_spend: number | null;
  total_clicks: number | null;
  total_impressions?: number | null;
  avg_ctr: number | null;
  total_conversions: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdPlatformAccount {
  id: number;
  platform: string;
  account_name: string;
  app_id: string | null;
  app_secret: string | null;    // masked as "••••••" from server
  access_token: string | null;  // masked as "••••••" from server
  pixel_id: string | null;
  ad_account_id: string | null;
  advertiser_id: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface AdMonthlyTarget {
  id: number;
  platform: string;
  bulan: number;
  tahun: number;
  target_spend: number | null;
  target_impressions: number | null;
  target_clicks: number | null;
  target_conversions: number | null;
  target_ctr: number | null;
  target_roas: number | null;
}

export interface AdContentMetric {
  id: number;
  campaign_id: number;
  tanggal: string;
  reach: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  spend: number | null;
  results: number | null;
  likes: number | null;
  comments_count: number | null;
  shares: number | null;
  saves: number | null;
  video_views: number | null;
  followers_gained: number | null;
  engagement_rate: number | null;
  cost_per_result: number | null;
  created_at: string;
}

export interface WhatsappChatMetric {
  id: number;
  campaign_id: number;
  tanggal: string;
  total_chat: number | null;
  responded: number | null;
  not_responded: number | null;
  converted: number | null;
  follow_up: number | null;
  response_rate: number | null;
  conversion_rate: number | null;
  created_at: string;
  [key: string]: unknown; // for dynamic key access in dashboard
}

// ── Stock Opname ──────────────────────────────────────────────────────────────

export interface StockOpnameProject {
  id: number;
  lead_id: number | null;
  nama_client: string | null;
  lokasi: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  jumlah_termin: number;
  status: string;
  created_at: string;
  lead?: Lead;
  termins?: StockOpnameTermin[];
}

export interface StockOpnameTermin {
  id: number;
  project_id: number;
  termin_ke: number;
  nama: string | null;
  status: string;
  rapp_items?: StockOpnameRappItem[];
}

export interface StockOpnameRappItem {
  id: number;
  termin_id: number;
  barang_id: number | null;
  nama_pekerjaan: string | null;
  qty_rapp: number;
  qty_tersisa: number;
  harga_manual: number;
  total: number;
  budget: number;
  is_freeform: boolean;
  usage_items?: StockOpnameUsageItem[];
}

export interface StockOpnameUsageItem {
  id: number;
  rapp_item_id: number;
  tanggal_pakai: string | null;
  qty_dipakai: number;
  catatan: string | null;
}

// ── Adm Finance ───────────────────────────────────────────────────────────────

export interface AdmFinanceProject {
  id: number;
  lead_id: number | null;
  lokasi: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  jumlah_termin: number;
  status: string;
  lead?: Lead;
  termins?: AdmFinanceTermin[];
}

export interface AdmFinanceTermin {
  id: number;
  project_id: number;
  nama_termin: string;
  budget: number;
  status: string;
  periodes?: AdmFinancePeriode[];
}

export interface AdmFinancePeriode {
  id: number;
  termin_id: number;
  nama_periode: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  budget: number;
  is_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  budget_warning_threshold: number | null;
  budget_warning_sent: boolean;
  status: string;
  items?: AdmFinanceItem[];
}

export interface AdmFinanceItem {
  id: number;
  periode_id: number;
  description: string | null;
  qty: number;
  unit_price: number;
  total: number;
}

// ── Proyek Berjalan ───────────────────────────────────────────────────────────

export type TaskStatus = "Belum Mulai" | "Sedang Berjalan" | "Selesai" | "Ditunda";

export interface ProyekBerjalan {
  id: number;
  lead_id: number | null;
  lokasi: string | null;
  nilai_rab: number;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  lead?: Lead;
  termins?: ProyekBerjalanTermin[];
}

export interface ProyekBerjalanTermin {
  id: number;
  proyek_berjalan_id: number;
  urutan: number;
  nama: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  tasks?: ProyekBerjalanTask[];
}

export interface ProyekBerjalanTask {
  id: number;
  termin_id: number;
  nama_pekerjaan: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  status: TaskStatus;
  assigned_to: number | null;
  assigned_user?: User;
}

// ── Invoice ───────────────────────────────────────────────────────────────────

export interface Invoice {
  id: number;
  lead_id: number | null;
  invoice_number: string | null;
  tanggal: string | null;
  ppn_percentage: number;
  subtotal: number;
  ppn_amount: number;
  grand_total: number;
  status: string;
  lead?: Lead;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// ── Social Media ──────────────────────────────────────────────────────────────

export type SocialMediaPlatform = "instagram" | "tiktok" | "youtube";

export interface SocialMediaAccount {
  id: number;
  platform: SocialMediaPlatform;
  account_name: string | null;
  username: string | null;
  profile_url: string | null;
  youtube_channel_id: string | null;
  instagram_user_id: string | null;
  tiktok_open_id: string | null;
  tiktok_token_expires_at: string | null;
  instagram_token_expires_at: string | null;
  youtube_token_expires_at: string | null;
}

export interface SocialMediaMetric {
  id: number;
  social_media_account_id: number;
  date: string;
  followers: number;
  posts_count: number;
  likes: number;
  comments: number;
  ig_reach: number;
  ig_impressions: number;
  ig_saves: number;
  ig_shares: number;
  ig_story_views: number;
  tiktok_views: number;
  youtube_subscribers: number;
  youtube_views: number;
}

// ── Barang & Warehouse ────────────────────────────────────────────────────────

export interface Barang {
  id: number;
  kategori_id: number | null;
  nama: string;
  supplier: string | null;
  price: number;
  satuan: string | null;
  kategori?: KategoriBarang;
}

export interface KategoriBarang {
  id: number;
  nama: string;
}

export interface Warehouse {
  id: number;
  nama: string;
  lokasi: string | null;
  stok?: StokWarehouse[];
}

export interface StokWarehouse {
  id: number;
  warehouse_id: number;
  barang_id: number | null;
  nama_barang: string | null;
  quantity: number;
  price: number;
  total_harga: number;
  satuan: string | null;
  is_custom: boolean;
  barang?: Barang;
}

// ── WhatsApp Reminders ────────────────────────────────────────────────────────

export interface WhatsappReminder {
  id: number;
  name: string;
  source_type: string;
  is_active: boolean;
  deadline_filter: "upcoming" | "overdue" | "both";
  deadline_days: number;
  message_template: string | null;
  target_type: "task_owner" | "specific_roles" | "specific_users" | "all";
  target_role_ids: number[] | null;
  target_user_ids: number[] | null;
  send_time: string | null;
}

// ── App Settings ──────────────────────────────────────────────────────────────

export interface AppSetting {
  id: number;
  key: string;
  value: unknown;
}
