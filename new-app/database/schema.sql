-- =============================================================================
-- POSTGRESQL SCHEMA - StockOpname Migration
-- Source: Laravel 11 / MySQL → PostgreSQL
-- Generated: 2026-02-20
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search on names

-- =============================================================================
-- 1. AUTH & ROLES (replacing Laravel Breeze + Spatie Permission)
-- =============================================================================

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(20),
    email_verified_at TIMESTAMPTZ,
    remember_token VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Sessions (PostgreSQL native session store, optional if using JWT)
CREATE TABLE sessions (
    id            VARCHAR(255) PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
    ip_address    VARCHAR(45),
    user_agent    TEXT,
    payload       TEXT NOT NULL,
    last_activity INTEGER NOT NULL
);

-- App-wide key/value settings
CREATE TABLE app_settings (
    id    BIGSERIAL PRIMARY KEY,
    key   VARCHAR(255) NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. MASTER DATA — BARANG & WAREHOUSE
-- =============================================================================

CREATE TABLE kategori_barangs (
    id         BIGSERIAL PRIMARY KEY,
    nama       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE barangs (
    id          BIGSERIAL PRIMARY KEY,
    kategori_id BIGINT REFERENCES kategori_barangs(id) ON DELETE SET NULL,
    nama        VARCHAR(255) NOT NULL,
    supplier    VARCHAR(255),
    price       NUMERIC(15,2) NOT NULL DEFAULT 0,
    satuan      VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouses (
    id         BIGSERIAL PRIMARY KEY,
    nama       VARCHAR(255) NOT NULL,
    lokasi     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stok_warehouses (
    id           BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    barang_id    BIGINT REFERENCES barangs(id) ON DELETE SET NULL,
    nama_barang  VARCHAR(255),           -- used when is_custom = TRUE
    quantity     NUMERIC(15,3) NOT NULL DEFAULT 0,
    price        NUMERIC(15,2) NOT NULL DEFAULT 0,
    supplier     VARCHAR(255),
    total_harga  NUMERIC(15,2) NOT NULL DEFAULT 0,
    satuan       VARCHAR(50),
    is_custom    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- either linked to barang or is custom, not both
    CONSTRAINT chk_stok_barang CHECK (
        (is_custom = TRUE AND barang_id IS NULL) OR
        (is_custom = FALSE AND barang_id IS NOT NULL)
    )
);

CREATE TABLE transfers (
    id                 BIGSERIAL PRIMARY KEY,
    warehouse_from_id  BIGINT NOT NULL REFERENCES warehouses(id),
    warehouse_to_id    BIGINT NOT NULL REFERENCES warehouses(id),
    tanggal            DATE,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_by         BIGINT REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transfer_items (
    id          BIGSERIAL PRIMARY KEY,
    transfer_id BIGINT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    barang_id   BIGINT REFERENCES barangs(id),
    qty         NUMERIC(15,3) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. PROJEK UTAMA (internal project tracking)
-- =============================================================================

CREATE TABLE projeks (
    id             BIGSERIAL PRIMARY KEY,
    nama           VARCHAR(255) NOT NULL,
    tanggal_mulai  DATE,
    tanggal_selesai DATE,
    pic_user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE termins (
    id              BIGSERIAL PRIMARY KEY,
    projek_id       BIGINT NOT NULL REFERENCES projeks(id) ON DELETE CASCADE,
    nama            VARCHAR(255) NOT NULL,
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    status          VARCHAR(50),
    lampiran        JSONB,              -- array of file paths
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE termin_histories (
    id         BIGSERIAL PRIMARY KEY,
    termin_id  BIGINT NOT NULL REFERENCES termins(id) ON DELETE CASCADE,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lampiran_termins (
    id            BIGSERIAL PRIMARY KEY,
    termin_id     BIGINT NOT NULL REFERENCES termins(id) ON DELETE CASCADE,
    file_path     VARCHAR(500),
    original_name VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE barang_termins (
    id                BIGSERIAL PRIMARY KEY,
    termin_id         BIGINT NOT NULL REFERENCES termins(id) ON DELETE CASCADE,
    warehouse_id      BIGINT REFERENCES warehouses(id),
    stok_warehouse_id BIGINT REFERENCES stok_warehouses(id),
    barang_id         BIGINT REFERENCES barangs(id),
    quantity          NUMERIC(15,3) NOT NULL DEFAULT 0,
    jumlah_sisa       NUMERIC(15,3) NOT NULL DEFAULT 0,
    price             NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_harga       NUMERIC(15,2) NOT NULL DEFAULT 0,
    supplier          VARCHAR(255),
    satuan            VARCHAR(50),
    status            VARCHAR(50),
    tanggal_pemakaian DATE,
    keterangan        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bon_harians (
    id         BIGSERIAL PRIMARY KEY,
    projek_id  BIGINT NOT NULL REFERENCES projeks(id) ON DELETE CASCADE,
    tanggal    DATE,
    penerima   VARCHAR(255),
    keterangan TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bon_harian_files (
    id             BIGSERIAL PRIMARY KEY,
    bon_harian_id  BIGINT NOT NULL REFERENCES bon_harians(id) ON DELETE CASCADE,
    file_path      VARCHAR(500),
    original_name  VARCHAR(255),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. LEADS & SALES PIPELINE
-- =============================================================================

CREATE TABLE leads (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                BIGINT REFERENCES users(id) ON DELETE SET NULL,
    nama                   VARCHAR(255) NOT NULL,
    nomor_telepon          VARCHAR(50),
    alamat                 TEXT,
    sumber_leads           VARCHAR(100),
    keterangan             TEXT,
    jenis                  VARCHAR(50),           -- Sipil, Interior, Desain
    week                   INTEGER,               -- 1-4
    status                 VARCHAR(50) DEFAULT 'Low', -- Low, Medium, Hot
    tipe                   VARCHAR(50),
    bulan                  INTEGER,
    tahun                  INTEGER,
    rencana_survey         VARCHAR(10) DEFAULT 'Tidak', -- Ya, Tidak
    tanggal_survey         DATE,
    pic_survey             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    survey_approval_status VARCHAR(50),           -- Pending, Approved, Rejected
    survey_approved_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    survey_approved_at     TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE follow_up_clients (
    id               BIGSERIAL PRIMARY KEY,
    lead_id          BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    tanggal_follow_up DATE,
    catatan          TEXT,
    next_follow_up   DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. INVOICE & KEUANGAN
-- =============================================================================

CREATE TABLE invoices (
    id              BIGSERIAL PRIMARY KEY,
    lead_id         BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    invoice_number  VARCHAR(100),
    tanggal         DATE,
    catatan         TEXT,
    ppn_percentage  NUMERIC(5,2) NOT NULL DEFAULT 0,
    subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
    ppn_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
    grand_total     NUMERIC(15,2) NOT NULL DEFAULT 0,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    approved_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    signature_path  VARCHAR(500),
    rejection_note  TEXT,
    created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id          BIGSERIAL PRIMARY KEY,
    invoice_id  BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT,
    quantity    NUMERIC(15,3) NOT NULL DEFAULT 1,
    unit_price  NUMERIC(15,2) NOT NULL DEFAULT 0,
    subtotal    NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kwitansis (
    id              BIGSERIAL PRIMARY KEY,
    invoice_id      BIGINT UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
    nomor_kwitansi  VARCHAR(100),
    tanggal         DATE,
    jumlah_diterima NUMERIC(15,2) NOT NULL DEFAULT 0,
    penerima        VARCHAR(255),
    keterangan      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. STOCK OPNAME MODULE
-- =============================================================================

CREATE TABLE stock_opname_projects (
    id              BIGSERIAL PRIMARY KEY,
    lead_id         BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    nama_client     VARCHAR(255),          -- nullable, falls back to lead.nama
    lokasi          TEXT,
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    jumlah_termin   INTEGER NOT NULL DEFAULT 0,
    created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'aktif',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_opname_termins (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES stock_opname_projects(id) ON DELETE CASCADE,
    termin_ke   INTEGER NOT NULL,
    nama        VARCHAR(255),
    status      VARCHAR(50) NOT NULL DEFAULT 'aktif',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_opname_rapp_items (
    id              BIGSERIAL PRIMARY KEY,
    termin_id       BIGINT NOT NULL REFERENCES stock_opname_termins(id) ON DELETE CASCADE,
    barang_id       BIGINT REFERENCES barangs(id) ON DELETE SET NULL,
    nama_pekerjaan  VARCHAR(255),          -- used when is_freeform = TRUE
    qty_rapp        NUMERIC(15,3) NOT NULL DEFAULT 0,
    qty_tersisa     NUMERIC(15,3) NOT NULL DEFAULT 0,
    harga_manual    NUMERIC(15,2) NOT NULL DEFAULT 0,
    total           NUMERIC(15,2) NOT NULL DEFAULT 0,
    budget          NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_freeform     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_opname_usage_items (
    id           BIGSERIAL PRIMARY KEY,
    rapp_item_id BIGINT NOT NULL REFERENCES stock_opname_rapp_items(id) ON DELETE CASCADE,
    tanggal_pakai DATE,
    qty_dipakai  NUMERIC(15,3) NOT NULL DEFAULT 0,
    catatan      TEXT,
    created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. KANBAN BOARD — BD
-- =============================================================================

CREATE TABLE kanban_columns (
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    urutan     INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kanban_cards (
    id               BIGSERIAL PRIMARY KEY,
    column_id        BIGINT NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    deadline         DATE,
    urutan           INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kanban_labels (
    id          BIGSERIAL PRIMARY KEY,
    card_id     BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    label_name  VARCHAR(100),
    color       VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kanban_comments (
    id         BIGSERIAL PRIMARY KEY,
    card_id    BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    comment    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. KANBAN BOARD — SALES
-- =============================================================================

CREATE TABLE sales_kanban_columns (
    id         BIGSERIAL PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    urutan     INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_kanban_cards (
    id               BIGSERIAL PRIMARY KEY,
    column_id        BIGINT NOT NULL REFERENCES sales_kanban_columns(id) ON DELETE CASCADE,
    lead_id          BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    tipe_pekerjaan   VARCHAR(100),
    title            TEXT NOT NULL,
    description      TEXT,
    assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    deadline         DATE,
    urutan           INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_kanban_labels (
    id         BIGSERIAL PRIMARY KEY,
    card_id    BIGINT NOT NULL REFERENCES sales_kanban_cards(id) ON DELETE CASCADE,
    label_name VARCHAR(100),
    color      VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_kanban_comments (
    id         BIGSERIAL PRIMARY KEY,
    card_id    BIGINT NOT NULL REFERENCES sales_kanban_cards(id) ON DELETE CASCADE,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    comment    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 9. META ADS MODULE (BD)
-- =============================================================================

CREATE TABLE meta_ads_campaigns (
    id                  BIGSERIAL PRIMARY KEY,
    meta_campaign_id    VARCHAR(100),
    meta_adset_id       VARCHAR(100),
    meta_ad_id          VARCHAR(100) UNIQUE,
    campaign_name       VARCHAR(255),
    ad_name             VARCHAR(255),
    platform            VARCHAR(50) NOT NULL DEFAULT 'Meta',
    status              VARCHAR(50) NOT NULL DEFAULT 'aktif',
    start_date          DATE,
    end_date            DATE,
    daily_budget        NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_budget        NUMERIC(15,2) NOT NULL DEFAULT 0,
    content_type        VARCHAR(100),
    content_description TEXT,
    thumbnail           VARCHAR(500),
    data_source         VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual or api
    last_synced_at      TIMESTAMPTZ,
    created_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ad_content_metrics (
    id                   BIGSERIAL PRIMARY KEY,
    meta_ads_campaign_id BIGINT NOT NULL REFERENCES meta_ads_campaigns(id) ON DELETE CASCADE,
    date                 DATE NOT NULL,
    impressions          BIGINT NOT NULL DEFAULT 0,
    reach                BIGINT NOT NULL DEFAULT 0,
    clicks               INTEGER NOT NULL DEFAULT 0,
    ctr                  NUMERIC(10,4) NOT NULL DEFAULT 0,   -- auto-calculated
    spend                NUMERIC(15,2) NOT NULL DEFAULT 0,
    likes                INTEGER NOT NULL DEFAULT 0,
    comments             INTEGER NOT NULL DEFAULT 0,
    shares               INTEGER NOT NULL DEFAULT 0,
    video_views          INTEGER NOT NULL DEFAULT 0,
    engagement_rate      NUMERIC(10,4) NOT NULL DEFAULT 0,   -- auto-calculated
    cost_per_result      NUMERIC(15,2) NOT NULL DEFAULT 0,   -- auto-calculated
    roas                 NUMERIC(10,4) NOT NULL DEFAULT 0,
    frequency            NUMERIC(10,4) NOT NULL DEFAULT 0,
    conversions          INTEGER NOT NULL DEFAULT 0,
    data_source          VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meta_ads_campaign_id, date)
);

CREATE TABLE whatsapp_chat_metrics (
    id                   BIGSERIAL PRIMARY KEY,
    meta_ads_campaign_id BIGINT NOT NULL REFERENCES meta_ads_campaigns(id) ON DELETE CASCADE,
    date                 DATE NOT NULL,
    chats_received       INTEGER NOT NULL DEFAULT 0,
    chats_responded      INTEGER NOT NULL DEFAULT 0,
    response_rate        NUMERIC(10,4) NOT NULL DEFAULT 0,   -- auto-calculated
    avg_response_time    NUMERIC(10,2) NOT NULL DEFAULT 0,   -- minutes
    total_conversions    INTEGER NOT NULL DEFAULT 0,
    conversion_rate      NUMERIC(10,4) NOT NULL DEFAULT 0,   -- auto-calculated
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meta_ads_campaign_id, date)
);

-- =============================================================================
-- 10. SOCIAL MEDIA ACCOUNTS (Content Creator)
-- =============================================================================

CREATE TABLE social_media_accounts (
    id                       BIGSERIAL PRIMARY KEY,
    platform                 VARCHAR(50) NOT NULL,  -- instagram, tiktok, youtube
    account_name             VARCHAR(255),
    username                 VARCHAR(255),
    profile_url              VARCHAR(500),
    -- TikTok
    tiktok_access_token      TEXT,
    tiktok_refresh_token     TEXT,
    tiktok_open_id           VARCHAR(255),
    tiktok_token_expires_at  TIMESTAMPTZ,
    -- Instagram (via Facebook Graph API)
    instagram_access_token   TEXT,
    instagram_user_id        VARCHAR(100),
    instagram_page_id        VARCHAR(100),
    instagram_token_expires_at TIMESTAMPTZ,
    -- YouTube
    youtube_channel_id       VARCHAR(100),
    youtube_access_token     TEXT,
    youtube_refresh_token    TEXT,
    youtube_token_expires_at TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE social_media_metrics (
    id                      BIGSERIAL PRIMARY KEY,
    social_media_account_id BIGINT NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
    date                    DATE NOT NULL,
    followers               BIGINT NOT NULL DEFAULT 0,
    posts_count             INTEGER NOT NULL DEFAULT 0,
    likes                   INTEGER NOT NULL DEFAULT 0,
    comments                INTEGER NOT NULL DEFAULT 0,
    -- Instagram-specific
    ig_reach                INTEGER NOT NULL DEFAULT 0,
    ig_impressions          INTEGER NOT NULL DEFAULT 0,
    ig_saves                INTEGER NOT NULL DEFAULT 0,
    ig_shares               INTEGER NOT NULL DEFAULT 0,
    ig_story_views          INTEGER NOT NULL DEFAULT 0,
    -- TikTok-specific
    tiktok_views            BIGINT NOT NULL DEFAULT 0,
    tiktok_likes            INTEGER NOT NULL DEFAULT 0,
    tiktok_followers        BIGINT NOT NULL DEFAULT 0,
    -- YouTube-specific
    youtube_subscribers     BIGINT NOT NULL DEFAULT 0,
    youtube_views           BIGINT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (social_media_account_id, date)
);

CREATE TABLE social_media_targets (
    id                      BIGSERIAL PRIMARY KEY,
    social_media_account_id BIGINT NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
    metric_name             VARCHAR(100),
    target_value            BIGINT NOT NULL DEFAULT 0,
    current_value           BIGINT NOT NULL DEFAULT 0,
    bulan                   INTEGER,
    tahun                   INTEGER,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 11. DESAIN TIMELINE (Desain dept)
-- =============================================================================

CREATE TABLE desain_timelines (
    id           BIGSERIAL PRIMARY KEY,
    lead_id      BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    jenis_desain VARCHAR(100),
    bulan        INTEGER,
    tahun        INTEGER,
    created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE desain_timeline_items (
    id                BIGSERIAL PRIMARY KEY,
    desain_timeline_id BIGINT NOT NULL REFERENCES desain_timelines(id) ON DELETE CASCADE,
    item_pekerjaan    TEXT,
    pic               BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- person in charge
    status            VARCHAR(50),   -- Planning, Proses, Selesai
    target_selesai    DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 12. CONTENT TIMELINE (Content Creator dept)
-- =============================================================================

CREATE TABLE content_timelines (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255),
    content_type    VARCHAR(100),
    deadline        DATE,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    produksi_status VARCHAR(50),
    bulan           INTEGER,
    tahun           INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 13. PROYEK BERJALAN (Running Projects — Sales module)
-- =============================================================================

CREATE TABLE proyek_berjalans (
    id              BIGSERIAL PRIMARY KEY,
    lead_id         BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    lokasi          TEXT,
    nilai_rab       NUMERIC(15,2) NOT NULL DEFAULT 0,
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proyek_berjalan_termins (
    id                 BIGSERIAL PRIMARY KEY,
    proyek_berjalan_id BIGINT NOT NULL REFERENCES proyek_berjalans(id) ON DELETE CASCADE,
    urutan             INTEGER NOT NULL DEFAULT 0,
    nama               VARCHAR(255),
    tanggal_mulai      DATE,
    tanggal_selesai    DATE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proyek_berjalan_tasks (
    id              BIGSERIAL PRIMARY KEY,
    termin_id       BIGINT NOT NULL REFERENCES proyek_berjalan_termins(id) ON DELETE CASCADE,
    nama_pekerjaan  VARCHAR(255),
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    status          VARCHAR(50) NOT NULL DEFAULT 'Belum Mulai',
    -- Belum Mulai, Sedang Berjalan, Selesai, Ditunda
    assigned_to     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 14. PROYEK INTERIOR (PIC Project module)
-- =============================================================================

CREATE TABLE proyek_interiors (
    id              BIGSERIAL PRIMARY KEY,
    lead_id         BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    lokasi          TEXT,
    budget          NUMERIC(15,2) NOT NULL DEFAULT 0,
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proyek_interior_termins (
    id                  BIGSERIAL PRIMARY KEY,
    proyek_interior_id  BIGINT NOT NULL REFERENCES proyek_interiors(id) ON DELETE CASCADE,
    urutan              INTEGER NOT NULL DEFAULT 0,
    nama                VARCHAR(255),
    tanggal_mulai       DATE,
    tanggal_selesai     DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proyek_interior_tasks (
    id              BIGSERIAL PRIMARY KEY,
    termin_id       BIGINT NOT NULL REFERENCES proyek_interior_termins(id) ON DELETE CASCADE,
    nama_pekerjaan  VARCHAR(255),
    assigned_to     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    status          VARCHAR(50) NOT NULL DEFAULT 'Belum Mulai',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Polymorphic document storage (ProyekBerjalan + ProyekInterior)
CREATE TABLE project_documents (
    id                BIGSERIAL PRIMARY KEY,
    documentable_type VARCHAR(100) NOT NULL, -- 'proyek_berjalan' | 'proyek_interior'
    documentable_id   BIGINT NOT NULL,
    file_path         VARCHAR(500),
    original_name     VARCHAR(255),
    uploaded_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 15. ADMINISTRASI FINANCE (Finance module)
-- =============================================================================

CREATE TABLE adm_finance_projects (
    id              BIGSERIAL PRIMARY KEY,
    lead_id         BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    lokasi          TEXT,
    tanggal_mulai   DATE,
    tanggal_selesai DATE,
    jumlah_termin   INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(50) NOT NULL DEFAULT 'aktif',
    created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE adm_finance_termins (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES adm_finance_projects(id) ON DELETE CASCADE,
    nama_termin VARCHAR(255) NOT NULL,
    budget      NUMERIC(15,2) NOT NULL DEFAULT 0,
    status      VARCHAR(50) NOT NULL DEFAULT 'aktif',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE adm_finance_periodes (
    id                      BIGSERIAL PRIMARY KEY,
    termin_id               BIGINT NOT NULL REFERENCES adm_finance_termins(id) ON DELETE CASCADE,
    nama_periode            VARCHAR(255),
    tanggal_mulai           DATE,
    tanggal_selesai         DATE,
    budget                  NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_approved             BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approved_at             TIMESTAMPTZ,
    budget_warning_threshold NUMERIC(15,2),
    budget_warning_sent     BOOLEAN NOT NULL DEFAULT FALSE,
    status                  VARCHAR(50) NOT NULL DEFAULT 'aktif',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE adm_finance_items (
    id          BIGSERIAL PRIMARY KEY,
    periode_id  BIGINT NOT NULL REFERENCES adm_finance_periodes(id) ON DELETE CASCADE,
    description TEXT,
    qty         NUMERIC(15,3) NOT NULL DEFAULT 1,
    unit_price  NUMERIC(15,2) NOT NULL DEFAULT 0,
    total       NUMERIC(15,2) NOT NULL DEFAULT 0,
    status      VARCHAR(50) NOT NULL DEFAULT 'aktif',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 16. ADMINISTRASI KANTOR & TUKANG (Finance module)
-- =============================================================================

CREATE TABLE administrasi_kantors (
    id          BIGSERIAL PRIMARY KEY,
    lead_id     BIGINT REFERENCES leads(id) ON DELETE SET NULL,
    tanggal     DATE,
    keterangan  TEXT,
    created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE administrasi_kantor_items (
    id                    BIGSERIAL PRIMARY KEY,
    administrasi_kantor_id BIGINT NOT NULL REFERENCES administrasi_kantors(id) ON DELETE CASCADE,
    description           TEXT,
    qty                   NUMERIC(15,3) NOT NULL DEFAULT 1,
    amount                NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE surat_jalans (
    id                     BIGSERIAL PRIMARY KEY,
    adm_finance_project_id BIGINT REFERENCES adm_finance_projects(id) ON DELETE SET NULL,
    nomor_surat            VARCHAR(100),
    tanggal                DATE,
    penerima               VARCHAR(255),
    keterangan             TEXT,
    created_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE surat_jalan_items (
    id             BIGSERIAL PRIMARY KEY,
    surat_jalan_id BIGINT NOT NULL REFERENCES surat_jalans(id) ON DELETE CASCADE,
    barang_id      BIGINT REFERENCES barangs(id) ON DELETE SET NULL,
    description    VARCHAR(255),
    qty            NUMERIC(15,3) NOT NULL DEFAULT 0,
    satuan         VARCHAR(50),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE absen_tukangs (
    id                     BIGSERIAL PRIMARY KEY,
    adm_finance_project_id BIGINT REFERENCES adm_finance_projects(id) ON DELETE SET NULL,
    tanggal                DATE,
    keterangan             TEXT,
    created_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE absen_tukang_items (
    id              BIGSERIAL PRIMARY KEY,
    absen_tukang_id BIGINT NOT NULL REFERENCES absen_tukangs(id) ON DELETE CASCADE,
    tukang_name     VARCHAR(255),
    hadir           BOOLEAN NOT NULL DEFAULT TRUE,
    keterangan      VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gaji_tukangs (
    id                     BIGSERIAL PRIMARY KEY,
    adm_finance_project_id BIGINT REFERENCES adm_finance_projects(id) ON DELETE SET NULL,
    bulan                  INTEGER,
    tahun                  INTEGER,
    total_hari_kerja       INTEGER NOT NULL DEFAULT 0,
    total_gaji             NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gaji_tukang_items (
    id            BIGSERIAL PRIMARY KEY,
    gaji_tukang_id BIGINT NOT NULL REFERENCES gaji_tukangs(id) ON DELETE CASCADE,
    tukang_name   VARCHAR(255),
    hari_kerja    INTEGER NOT NULL DEFAULT 0,
    daily_rate    NUMERIC(15,2) NOT NULL DEFAULT 0,
    subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kwitansi_gaji_tukangs (
    id                 BIGSERIAL PRIMARY KEY,
    gaji_tukang_id     BIGINT REFERENCES gaji_tukangs(id) ON DELETE SET NULL,
    tukang_name        VARCHAR(255),
    jumlah_gaji        NUMERIC(15,2) NOT NULL DEFAULT 0,
    tanggal_pembayaran DATE,
    penerima           VARCHAR(255),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 17. DAILY REPORTS (per department — 8 tables, identical structure)
-- =============================================================================

CREATE TABLE bd_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content_creator_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE telemarketing_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE design_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pic_project_reports (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    bulan      INTEGER,
    tahun      INTEGER,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 18. WHATSAPP REMINDERS
-- =============================================================================

CREATE TABLE whatsapp_reminders (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    source_type      VARCHAR(100) NOT NULL,
    -- cc_timeline_planning | bd_kanban | sales_kanban | sales_proyek_berjalan
    -- desain_timeline | projek_termin
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    deadline_filter  VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- upcoming | overdue | both
    deadline_days    INTEGER NOT NULL DEFAULT 3,
    message_template TEXT,
    target_type      VARCHAR(50) NOT NULL DEFAULT 'task_owner',
    -- task_owner | specific_roles | specific_users | all
    target_role_ids  JSONB,
    target_user_ids  JSONB,
    filter_statuses  JSONB,
    send_time        TIME,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_reminder_logs (
    id               BIGSERIAL PRIMARY KEY,
    remindable_type  VARCHAR(100) NOT NULL,
    remindable_id    BIGINT NOT NULL,
    user_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reminder_type    VARCHAR(100),
    deadline_date    DATE,
    message_sent     TEXT,
    status           VARCHAR(50) NOT NULL DEFAULT 'sent', -- sent | failed
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 19. NOTIFICATIONS & ACTIVITY LOG
-- =============================================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(255) NOT NULL,
    notifiable_type VARCHAR(255) NOT NULL,
    notifiable_id   BIGINT NOT NULL,
    data            JSONB NOT NULL,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_log (
    id           BIGSERIAL PRIMARY KEY,
    log_name     VARCHAR(255),
    description  TEXT NOT NULL,
    subject_type VARCHAR(255),
    subject_id   BIGINT,
    causer_type  VARCHAR(255),
    causer_id    BIGINT,
    properties   JSONB,
    event        VARCHAR(255),
    batch_uuid   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES — Performance optimizations
-- =============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_whatsapp ON users(whatsapp_number) WHERE whatsapp_number IS NOT NULL;

-- Leads (high-frequency filters)
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_bulan_tahun ON leads(bulan, tahun);
CREATE INDEX idx_leads_survey ON leads(rencana_survey, tanggal_survey) WHERE rencana_survey = 'Ya';
CREATE INDEX idx_leads_tipe ON leads(tipe);

-- Termins
CREATE INDEX idx_termins_projek ON termins(projek_id);
CREATE INDEX idx_termins_deadline ON termins(tanggal_selesai);
CREATE INDEX idx_barang_termins_termin ON barang_termins(termin_id);
CREATE INDEX idx_barang_termins_tanggal ON barang_termins(tanggal_pemakaian);

-- Kanban
CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX idx_kanban_cards_user ON kanban_cards(assigned_user_id);
CREATE INDEX idx_kanban_cards_deadline ON kanban_cards(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_sales_kanban_cards_column ON sales_kanban_cards(column_id);
CREATE INDEX idx_sales_kanban_cards_deadline ON sales_kanban_cards(deadline) WHERE deadline IS NOT NULL;

-- Meta Ads
CREATE INDEX idx_ad_content_metrics_campaign ON ad_content_metrics(meta_ads_campaign_id);
CREATE INDEX idx_ad_content_metrics_date ON ad_content_metrics(date);
CREATE INDEX idx_whatsapp_chat_metrics_campaign ON whatsapp_chat_metrics(meta_ads_campaign_id);

-- Social Media
CREATE INDEX idx_social_media_metrics_account ON social_media_metrics(social_media_account_id);
CREATE INDEX idx_social_media_metrics_date ON social_media_metrics(date);

-- Proyek Berjalan
CREATE INDEX idx_pb_tasks_termin ON proyek_berjalan_tasks(termin_id);
CREATE INDEX idx_pb_tasks_status ON proyek_berjalan_tasks(status);
CREATE INDEX idx_pb_tasks_deadline ON proyek_berjalan_tasks(tanggal_selesai);

-- Stock Opname
CREATE INDEX idx_so_termins_project ON stock_opname_termins(project_id);
CREATE INDEX idx_so_rapp_items_termin ON stock_opname_rapp_items(termin_id);
CREATE INDEX idx_so_usage_items_rapp ON stock_opname_usage_items(rapp_item_id);

-- Adm Finance
CREATE INDEX idx_adm_finance_periodes_termin ON adm_finance_periodes(termin_id);
CREATE INDEX idx_adm_finance_items_periode ON adm_finance_items(periode_id);

-- Activity log
CREATE INDEX idx_activity_log_subject ON activity_log(subject_type, subject_id);
CREATE INDEX idx_activity_log_causer ON activity_log(causer_type, causer_id);
CREATE INDEX idx_activity_log_event ON activity_log(event);

-- WA Reminder logs
CREATE INDEX idx_wa_logs_remindable ON whatsapp_reminder_logs(remindable_type, remindable_id);
CREATE INDEX idx_wa_logs_user ON whatsapp_reminder_logs(user_id);
CREATE INDEX idx_wa_logs_created ON whatsapp_reminder_logs(created_at);

-- Notifications
CREATE INDEX idx_notifications_notifiable ON notifications(notifiable_type, notifiable_id);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;

-- Project documents (polymorphic)
CREATE INDEX idx_project_documents_documentable ON project_documents(documentable_type, documentable_id);

-- =============================================================================
-- SEED DATA — Roles
-- =============================================================================

INSERT INTO roles (name) VALUES
    ('Super Admin'),
    ('BD'),
    ('Content Creator'),
    ('Leads'),
    ('Telemarketing'),
    ('Desain'),
    ('Sales'),
    ('Finance'),
    ('PIC Project');

-- Default kanban columns — BD
INSERT INTO kanban_columns (title, urutan) VALUES
    ('Backlog', 1),
    ('In Progress', 2),
    ('Review', 3),
    ('Done', 4);

-- Default kanban columns — Sales
INSERT INTO sales_kanban_columns (title, urutan) VALUES
    ('Prospect', 1),
    ('Presentasi', 2),
    ('Negosiasi', 3),
    ('Closed Won', 4),
    ('Closed Lost', 5);

-- =============================================================================
-- AD PLATFORM ACCOUNTS & MONTHLY TARGETS
-- Added: 2026-02-27
-- =============================================================================

CREATE TABLE IF NOT EXISTS ad_platform_accounts (
  id            BIGSERIAL PRIMARY KEY,
  platform      VARCHAR(50)  NOT NULL,
  account_name  VARCHAR(255) NOT NULL,
  app_id        VARCHAR(255),
  app_secret    VARCHAR(500),
  access_token  TEXT,
  pixel_id      VARCHAR(255),
  ad_account_id VARCHAR(255),
  advertiser_id VARCHAR(255),
  is_active     BOOLEAN  DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_monthly_targets (
  id                 BIGSERIAL PRIMARY KEY,
  platform           VARCHAR(50) NOT NULL,
  bulan              INTEGER     NOT NULL,
  tahun              INTEGER     NOT NULL,
  target_spend       DECIMAL(15,2),
  target_impressions BIGINT,
  target_clicks      INTEGER,
  target_conversions INTEGER,
  target_ctr         DECIMAL(10,4),
  target_roas        DECIMAL(10,4),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, bulan, tahun)
);
