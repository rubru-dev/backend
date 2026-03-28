# Dokumentasi Website Rubah Rumah

## Gambaran Umum

Website Rubah Rumah adalah frontend Next.js 14 untuk jasa bangun & renovasi rumah profesional berbasis di Bekasi, Jabodetabek.

---

## Struktur Folder

```
website-rubahrumah/
├── apps/
│   └── web-rubahrumah/        # Frontend Next.js (port 3003)
├── packages/
│   ├── prisma/                # Prisma schema & seed (shared dengan backend)
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Helper functions (formatRupiah, formatDate, dll)
│   ├── ui/                    # Shared UI components
│   └── config/                # Shared config (eslint, tailwind, tsconfig)
├── turbo.json                 # Turborepo config
├── pnpm-workspace.yaml        # pnpm workspace config
└── docs.md                    # Dokumentasi ini
```

---

## Tech Stack

| Teknologi | Versi | Kegunaan |
|---|---|---|
| Next.js | 14.2 | Framework frontend (App Router) |
| React | 18 | UI library |
| TailwindCSS | 3.4 | Styling |
| TypeScript | 5.7 | Type safety |
| pnpm | 10 | Package manager |
| Turborepo | 2.3 | Monorepo build system |

---

## Halaman

| Route | Keterangan |
|---|---|
| `/` | Beranda — Hero carousel, layanan, alur kerja, projek, portofolio, kalkulator, testimoni, artikel |
| `/gallery` | Daftar projek berjalan (paginated) |
| `/gallery/[slug]` | Detail projek — progress step, dokumentasi, deskripsi, spesifikasi |
| `/portofolio` | Daftar portofolio selesai (paginated, filter jenis jasa) |
| `/portofolio/[slug]` | Detail portofolio — foto sebelum/sesudah/proses, spesifikasi |
| `/articles` | Daftar artikel (paginated) |
| `/articles/[slug]` | Detail artikel — konten HTML, artikel terkait |
| `/pilihanjasa/[jenis]` | Form pemilihan jasa & pengiriman lead |
| `/kontak` | Halaman kontak — info & form WhatsApp |

---

## Menjalankan Program

### Prasyarat
- Node.js >= 20
- pnpm >= 9
- Backend API berjalan di `http://localhost:4000`

### Install dependencies
```bash
pnpm install
```

### Jalankan dev server
```bash
pnpm dev
```
Frontend berjalan di **http://localhost:3003**

### Build production
```bash
pnpm build
```

---

## Environment Variables

Buat file `.env.local` di `apps/web-rubahrumah/`:

```env
# URL Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/v1

# URL Storage untuk gambar
NEXT_PUBLIC_STORAGE_URL=http://localhost:4000

# Nomor WhatsApp
NEXT_PUBLIC_WA_NUMBER=6281376405550
```

---

## Koneksi ke Backend API

Website mengambil data dari backend API melalui `src/lib/api.ts`.

| Endpoint | Keterangan |
|---|---|
| `GET /v1/public/rb/config` | Site config (nomor WA, alamat, dll) |
| `GET /v1/public/rb/project` | Daftar projek berjalan |
| `GET /v1/public/rb/project/:slug` | Detail projek |
| `GET /v1/public/rb/portfolio` | Daftar portofolio |
| `GET /v1/public/rb/portfolio/:slug` | Detail portofolio |
| `GET /v1/public/rb/artikel` | Daftar artikel |
| `GET /v1/public/rb/artikel/:slug` | Detail artikel |
| `GET /v1/public/rb/layanan/:jenis` | Info layanan per jenis |
| `POST /v1/public/rb/leads` | Submit form pemesanan |

> Backend API dikelola terpisah di folder `Backend Rubahrumah`.

---

## Packages Shared

### `@rubahrumah/types`
TypeScript interfaces untuk semua data dari API:
- `RbSiteConfig`, `RbProjectListItem`, `RbPortfolioListItem`, `RbArtikelListItem`, dll.

### `@rubahrumah/utils`
Helper functions:
- `formatRupiah(n)` — format angka ke Rupiah (Rp 1.000.000)
- `formatDate(d)` — format tanggal ke Bahasa Indonesia (15 Maret 2024)
- `generateSlug(s)` — buat slug dari string

### `@rubahrumah/prisma`
Prisma client & schema database. Digunakan bersama backend untuk type-safe DB access.

---

## Design System

Warna utama:

| Token | Hex | Kegunaan |
|---|---|---|
| `brand-teal` | `#0B7B7B` | Warna aksen teal |
| `brand-navy` | `#0A5168` | Warna utama teks/heading |
| `brand-orange` | `#FF9122` | CTA, highlight, badge |

CSS utility classes (di `globals.css`):
- `.btn-primary` — tombol orange solid
- `.btn-outline` — tombol outline putih (di atas bg gelap)
- `.btn-outline-orange` — tombol outline orange (di atas bg putih)
- `.section-title` — heading section bold teal
- `.card` — kartu dengan shadow & rounded

---

## Catatan Deployment

- Set `NEXT_PUBLIC_API_URL` ke URL backend production
- Pastikan domain backend masuk whitelist CORS di backend
- Gambar dari API menggunakan `next/image` — tambahkan hostname API ke `next.config.js` → `images.remotePatterns`
