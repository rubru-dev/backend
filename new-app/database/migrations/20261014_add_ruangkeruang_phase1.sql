CREATE TABLE IF NOT EXISTS ruangkeruang_settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB,
  updated_by BIGINT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ruangkeruang_services (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(150) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  excerpt TEXT,
  description TEXT,
  image_url TEXT,
  features JSONB,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ruangkeruang_portfolios (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  location TEXT,
  excerpt TEXT,
  description TEXT,
  cover_url TEXT,
  images JSONB,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ruangkeruang_articles (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  excerpt VARCHAR(1000),
  content TEXT NOT NULL,
  cover_url TEXT,
  category VARCHAR(100) NOT NULL,
  author VARCHAR(255) NOT NULL DEFAULT 'Tim Ruangkeruang',
  read_time INTEGER NOT NULL DEFAULT 5,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ruangkeruang_leads (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(50) NOT NULL,
  service_type VARCHAR(100),
  location TEXT,
  budget VARCHAR(100),
  detail JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'baru',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

ALTER TABLE ruangkeruang_services
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_ruangkeruang_services_sort
  ON ruangkeruang_services (sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_ruangkeruang_portfolios_sort
  ON ruangkeruang_portfolios (sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_ruangkeruang_articles_publish
  ON ruangkeruang_articles (is_published, published_at);

CREATE INDEX IF NOT EXISTS idx_ruangkeruang_leads_status
  ON ruangkeruang_leads (status, created_at);
