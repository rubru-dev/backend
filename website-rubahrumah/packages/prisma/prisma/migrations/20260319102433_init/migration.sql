-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "JenisJasa" AS ENUM ('BANGUN_RUMAH', 'RENOVASI', 'DESIGN', 'INTERIOR');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('BERJALAN', 'SELESAI', 'DITUNDA');

-- CreateEnum
CREATE TYPE "RkJenisLayanan" AS ENUM ('DESIGN_INTERIOR', 'FURNITURE', 'KEDUANYA');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "alt_text" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_portfolios" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "nama_klien" VARCHAR(255) NOT NULL,
    "jenis_jasa" "JenisJasa" NOT NULL,
    "deskripsi" TEXT,
    "budget" DECIMAL(15,2) NOT NULL,
    "luas" DECIMAL(10,2) NOT NULL,
    "tanggal_selesai" DATE NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rb_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_portfolio_images" (
    "id" SERIAL NOT NULL,
    "portfolio_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "caption" VARCHAR(500),

    CONSTRAINT "rb_portfolio_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_projects" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "nama_klien" VARCHAR(255) NOT NULL,
    "jenis_jasa" "JenisJasa" NOT NULL,
    "lokasi" VARCHAR(500),
    "budget" DECIMAL(15,2) NOT NULL,
    "luas" DECIMAL(10,2) NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai_estimasi" DATE,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "ProjectStatus" NOT NULL DEFAULT 'BERJALAN',
    "deskripsi" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rb_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_project_images" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rb_project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_artikels" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "judul" VARCHAR(500) NOT NULL,
    "excerpt" VARCHAR(1000),
    "konten" TEXT NOT NULL,
    "cover_id" INTEGER,
    "kategori" VARCHAR(100) NOT NULL,
    "author" VARCHAR(255) NOT NULL DEFAULT 'Tim Rubahrumah',
    "read_time" INTEGER NOT NULL DEFAULT 5,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rb_artikels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_layanans" (
    "id" SERIAL NOT NULL,
    "jenis" "JenisJasa" NOT NULL,
    "headline" VARCHAR(500) NOT NULL,
    "subheadline" VARCHAR(1000),
    "deskripsi" TEXT,
    "kalkulator_data" JSONB,
    "hero_images" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rb_layanans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_leads" (
    "id" SERIAL NOT NULL,
    "jenis_jasa" "JenisJasa" NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "whatsapp" VARCHAR(30) NOT NULL,
    "alamat" TEXT,
    "instagram" VARCHAR(100),
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rb_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rb_site_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "whatsapp_number" VARCHAR(30) NOT NULL,
    "stats_hari" INTEGER NOT NULL DEFAULT 360,
    "stats_projek" INTEGER NOT NULL DEFAULT 100,
    "stats_mitra" INTEGER NOT NULL DEFAULT 20,
    "alamat_kantor" TEXT,
    "alamat_workshop" TEXT,
    "instagram" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rb_site_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_kategori_furnitures" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rk_kategori_furnitures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_furnitures" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "kategori_id" INTEGER NOT NULL,
    "deskripsi" TEXT,
    "material" VARCHAR(255),
    "dimensi" VARCHAR(255),
    "warna_tersedia" VARCHAR(500),
    "harga_mulai" DECIMAL(15,2),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rk_furnitures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_furniture_images" (
    "id" SERIAL NOT NULL,
    "furniture_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rk_furniture_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_portfolios" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "judul" VARCHAR(255),
    "jenis_ruangan" VARCHAR(100),
    "gaya_desain" VARCHAR(100),
    "tahun" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rk_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_portfolio_images" (
    "id" SERIAL NOT NULL,
    "portfolio_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "caption" VARCHAR(500),

    CONSTRAINT "rk_portfolio_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_projects" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "judul" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "jenis_layanan" "RkJenisLayanan" NOT NULL,
    "lokasi" VARCHAR(500),
    "luas" DECIMAL(10,2),
    "tahun" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rk_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_project_images" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rk_project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_layanans" (
    "id" SERIAL NOT NULL,
    "jenis" "RkJenisLayanan" NOT NULL,
    "headline" VARCHAR(500) NOT NULL,
    "deskripsi" TEXT,
    "detail_items" JSONB,
    "image_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rk_layanans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rk_site_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "whatsapp_number" VARCHAR(30) NOT NULL,
    "hero_headline" VARCHAR(500),
    "hero_subtext" VARCHAR(1000),
    "filosofi_text" TEXT,
    "instagram" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rk_site_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rb_portfolios_slug_key" ON "rb_portfolios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rb_projects_slug_key" ON "rb_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rb_artikels_slug_key" ON "rb_artikels"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rb_layanans_jenis_key" ON "rb_layanans"("jenis");

-- CreateIndex
CREATE UNIQUE INDEX "rk_kategori_furnitures_slug_key" ON "rk_kategori_furnitures"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rk_furnitures_slug_key" ON "rk_furnitures"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rk_portfolios_slug_key" ON "rk_portfolios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rk_projects_slug_key" ON "rk_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rk_layanans_jenis_key" ON "rk_layanans"("jenis");

-- AddForeignKey
ALTER TABLE "rb_portfolio_images" ADD CONSTRAINT "rb_portfolio_images_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "rb_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rb_portfolio_images" ADD CONSTRAINT "rb_portfolio_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rb_project_images" ADD CONSTRAINT "rb_project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "rb_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rb_project_images" ADD CONSTRAINT "rb_project_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rb_artikels" ADD CONSTRAINT "rb_artikels_cover_id_fkey" FOREIGN KEY ("cover_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_furnitures" ADD CONSTRAINT "rk_furnitures_kategori_id_fkey" FOREIGN KEY ("kategori_id") REFERENCES "rk_kategori_furnitures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_furniture_images" ADD CONSTRAINT "rk_furniture_images_furniture_id_fkey" FOREIGN KEY ("furniture_id") REFERENCES "rk_furnitures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_furniture_images" ADD CONSTRAINT "rk_furniture_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_portfolio_images" ADD CONSTRAINT "rk_portfolio_images_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "rk_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_portfolio_images" ADD CONSTRAINT "rk_portfolio_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_project_images" ADD CONSTRAINT "rk_project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "rk_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_project_images" ADD CONSTRAINT "rk_project_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rk_layanans" ADD CONSTRAINT "rk_layanans_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
