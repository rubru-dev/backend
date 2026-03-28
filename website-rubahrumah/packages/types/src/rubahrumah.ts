import type { JenisJasa, Media, ProjectStatus } from "./common";

// ─── Portfolio ───────────────────────────────────────────────────────────────

export interface RbPortfolioImage {
  id: number;
  portfolio_id: number;
  media_id: number;
  sort_order: number;
  is_cover: boolean;
  caption: string | null;
  media: Media;
}

export interface RbPortfolio {
  id: number;
  slug: string;
  nama_klien: string;
  jenis_jasa: JenisJasa;
  deskripsi: string | null;
  budget: number;
  luas: number;
  tanggal_selesai: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  images: RbPortfolioImage[];
}

export type RbPortfolioListItem = Omit<RbPortfolio, "images"> & {
  cover: RbPortfolioImage | null;
};

export interface RbPortfolioFormData {
  nama_klien: string;
  jenis_jasa: JenisJasa;
  deskripsi?: string;
  budget: number;
  luas: number;
  tanggal_selesai: string;
  is_published?: boolean;
}

// ─── Project Berjalan ────────────────────────────────────────────────────────

export interface RbProjectImage {
  id: number;
  project_id: number;
  media_id: number;
  sort_order: number;
  is_cover: boolean;
  media: Media;
}

export interface RbProject {
  id: number;
  slug: string;
  nama_klien: string;
  jenis_jasa: JenisJasa;
  lokasi: string | null;
  budget: number;
  luas: number;
  tanggal_mulai: string;
  tanggal_selesai_estimasi: string | null;
  progress: number;
  status: ProjectStatus;
  deskripsi: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  images: RbProjectImage[];
}

export type RbProjectListItem = Omit<RbProject, "images"> & {
  cover: RbProjectImage | null;
};

export interface RbProjectFormData {
  nama_klien: string;
  jenis_jasa: JenisJasa;
  lokasi?: string;
  budget: number;
  luas: number;
  tanggal_mulai: string;
  tanggal_selesai_estimasi?: string;
  progress: number;
  status: ProjectStatus;
  deskripsi?: string;
  is_published?: boolean;
}

// ─── Artikel ─────────────────────────────────────────────────────────────────

export interface RbArtikel {
  id: number;
  slug: string;
  judul: string;
  excerpt: string | null;
  konten: string;
  cover_id: number | null;
  kategori: string;
  author: string;
  read_time: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  cover: Media | null;
}

export type RbArtikelListItem = Omit<RbArtikel, "konten">;

export interface RbArtikelFormData {
  judul: string;
  excerpt?: string;
  konten: string;
  cover_id?: number;
  kategori: string;
  author?: string;
  read_time?: number;
  is_published?: boolean;
}

// ─── Layanan Config ───────────────────────────────────────────────────────────

export interface KalkulatorItem {
  label: string;
  lantai: number;
  paket: "MINIMALIS" | "LUXURY";
  harga_per_m2: number;
}

export interface RbLayanan {
  id: number;
  jenis: JenisJasa;
  headline: string;
  subheadline: string | null;
  deskripsi: string | null;
  kalkulator_data: KalkulatorItem[] | null;
  hero_images: number[] | null;
  created_at: string;
  updated_at: string;
}

// ─── Lead ─────────────────────────────────────────────────────────────────────

export interface RbLeadDetail {
  lantai?: number;
  model_bangunan?: string;
  paket?: string;
  jenis_ruangan?: string;
  gaya_interior?: string;
  luas?: number;
  budget?: number;
}

export interface RbLead {
  id: number;
  jenis_jasa: JenisJasa;
  nama: string;
  whatsapp: string;
  alamat: string | null;
  instagram: string | null;
  detail: RbLeadDetail | null;
  created_at: string;
}

export interface RbLeadFormData {
  jenis_jasa: JenisJasa;
  nama: string;
  whatsapp: string;
  alamat?: string;
  instagram?: string;
  detail?: RbLeadDetail;
}

// ─── Site Config ──────────────────────────────────────────────────────────────

export interface RbSiteConfig {
  id: number;
  whatsapp_number: string;
  stats_hari: number;
  stats_projek: number;
  stats_mitra: number;
  alamat_kantor: string | null;
  alamat_workshop: string | null;
  instagram: string | null;
  updated_at: string;
}
