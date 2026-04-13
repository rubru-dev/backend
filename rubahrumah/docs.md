# RubahRumah — Client Portal (rubahrumah/) Documentation

> Dokumen referensi lengkap untuk AI coding agent. Update file ini setiap ada perubahan fitur.
> Last updated: 2026-04-10

---

## 1. Tech Stack & Config

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| React | React + React DOM | 19.2.3 |
| Styling | Tailwind CSS v4 + `@tailwindcss/postcss` | ^4 |
| Bundler | Turbopack (default Next.js 16) | — |
| Streaming | hls.js (HLS video player) | ^1.6.15 |
| Language | TypeScript | ^5 |

**Path:** `rubahrumah/`
**Port:** 3001 (`npm run dev` defaults to `-p 3001`)
**Base URL:** `http://localhost:3001`

### Environment Variables

**`.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### PostCSS Workaround

`postcss.config.mjs` passes `base` ke `@tailwindcss/postcss` karena `.git` ada di parent folder — Turbopack spawn PostCSS subprocess dengan wrong `cwd`. Workaround:
```js
const base = process.env.npm_config_local_prefix || process.env.INIT_CWD || process.cwd();
```

### Run Commands
```bash
cd rubahrumah && npm run dev        # Dev server port 3001
cd rubahrumah && npm run build      # Production build
cd rubahrumah && npm start          # Production server
```

---

## 2. Folder Structure

```
rubahrumah/
  app/
    layout.tsx              — Root layout (Inter font, metadata, globals.css)
    page.tsx                — Root page → redirect ke /login
    globals.css             — Theme variables + Tailwind import + scrollbar styles
    login/
      page.tsx              — Login page (username + password)
    (client)/               — Route group, wrapped by ClientLayout (auth guard)
      layout.tsx            — Uses <ClientLayout> (sidebar + header + auth check)
      dashboard/page.tsx    — Dashboard utama (project info, payments, galeri preview)
      pembayaran/
        page.tsx            — Daftar invoice (tabel desktop + cards mobile)
        [id]/page.tsx       — Detail pembayaran per termin
      galeri/page.tsx       — Galeri foto (folder view → photo grid → lightbox)
      dokumen/page.tsx      — Dokumen proyek (folder view → file list, filter kategori)
      aktivitas/page.tsx    — Riwayat pekerjaan + Gantt chart (2 tabs)
      progres/page.tsx      — Redirect → /aktivitas
      monitoring/page.tsx   — Live CCTV streaming (YouTube/RTSP/iframe/HLS)
      tiket/page.tsx        — Kirim pesan/keluhan via WhatsApp ke PIC
      kontak/page.tsx       — Daftar kontak bantuan (WhatsApp + Telepon)
  components/
    client/
      ClientLayout.tsx      — Auth guard + sidebar + header wrapper
      ClientHeader.tsx      — Top bar: hamburger (mobile), username, logout, notification bell
      ClientSidebar.tsx     — Sidebar navigasi (Menu Utama + Lainnya + Keluar)
    ui/
      Logo.tsx              — SVG logo component (house + refresh icon), size: sm/md/lg
      Badge.tsx             — Text badge component (6 color variants)
      CameraPlayer.tsx      — HLS video player with retry logic (MediaMTX/RTSP support)
  lib/
    apiClient.ts            — Token management + fetch wrapper + API calls
  public/
    images/
      logo.png              — Logo utama (sidebar, login)
      logo-browser.ico      — Favicon
      LoginArt.png          — Background art untuk login page
```

---

## 3. Authentication

### Flow
1. User masuk via `/login` → `portalApi.login(username, password)`
2. Backend returns `{ access_token }` → disimpan di `localStorage` sebagai `cp_token` + `cp_username`
3. Setiap page dalam `(client)/` route group di-wrap `ClientLayout` → cek `isLoggedIn()` → redirect ke `/login` jika tidak ada token
4. Semua API calls di `apiFetch()` auto-attach `Authorization: Bearer <token>`
5. Jika 401/403 → `clearAuth()` + redirect ke `/login`

### Token Storage
| Key | Value |
|-----|-------|
| `cp_token` | JWT access token (tipe: `client_portal_access`) |
| `cp_username` | Username untuk display di header |

### Functions (`lib/apiClient.ts`)
| Function | Keterangan |
|----------|------------|
| `getToken()` | Ambil `cp_token` dari localStorage |
| `setAuth(token, username)` | Simpan token + username |
| `clearAuth()` | Hapus token + username |
| `getUsername()` | Ambil `cp_username` |
| `isLoggedIn()` | `!!getToken()` |

---

## 4. API Client (`lib/apiClient.ts`)

### Base URL
```
API_BASE = NEXT_PUBLIC_API_URL + "/api/v1/client-portal"
STORAGE_BASE = NEXT_PUBLIC_API_URL   (untuk akses file/gambar static)
```

### `portalApi` Methods

| Method | HTTP | Endpoint | Keterangan |
|--------|------|----------|------------|
| `login(username, password)` | POST | `/login` | Login klien |
| `me()` | GET | `/me` | Dashboard info proyek + summary count |
| `payments()` | GET | `/payments` | Daftar termin pembayaran (legacy) |
| `invoices()` | GET | `/invoices` | Daftar invoice + kwitansi |
| `galeri(search?)` | GET | `/galeri` | Foto proyek |
| `dokumen(search?, kategori?)` | GET | `/dokumen` | Dokumen proyek |
| `aktivitas(search?, status?)` | GET | `/aktivitas` | Riwayat pekerjaan |
| `kehadiran(tanggal_mulai?, tanggal_selesai?)` | GET | `/kehadiran` | Kehadiran tukang |
| `gantt()` | GET | `/gantt` | Item Gantt chart |
| `kontak()` | GET | `/kontak` | Kontak bantuan |
| `monitoring()` | GET | `/monitoring` | Daftar CCTV stream |
| `tiket(data)` | POST | `/tiket` | Kirim pesan WA ke PIC |

### Tiket Payload
```ts
{ whatsapp_target: string; nama_pic: string; pesan: string }
```

---

## 5. Pages Detail

### 5.1 Login (`/login`)

- Split layout: form kiri, decorative panel kanan (desktop)
- Mobile: LoginArt.png sebagai background dengan opacity
- Auto-redirect ke `/dashboard` jika sudah login
- Logo: `/images/logo.png`

### 5.2 Dashboard (`/dashboard`)

- Fetch: `portalApi.me()` + `portalApi.payments()` + `portalApi.galeri()` (parallel)
- **Header:** nama_proyek, alamat
- **Stats Cards (4):** Tanggal Mulai, Tanggal Selesai, Perkembangan (%), Status Proyek
- **Catatan card:** tampil jika `catatan` dari tim ada
- **Ringkasan Pembayaran:** tabel 2 kolom per row, link ke `/pembayaran`
- **Ringkasan Proyek:** total foto/dokumen/aktivitas + progress bar
- **Dokumentasi Pekerjaan:** preview 4 foto galeri terbaru, link ke `/galeri`

### 5.3 Invoice / Pembayaran (`/pembayaran`)

- Fetch: `portalApi.me()` + `portalApi.invoices()` (parallel)
- **Summary (3 cards):** Total Invoice, Sudah Dibayar, Belum Dibayar
- **Daftar Invoice:**
  - Desktop: tabel (No. Invoice, Tanggal, Jatuh Tempo, Total, Status, Tgl Bayar)
  - Mobile: cards per invoice
- Status: Lunas (green badge) / Belum Dibayar (orange badge)
- Tampilkan metode_bayar dan catatan jika ada

### 5.4 Detail Pembayaran (`/pembayaran/[id]`)

- Fetch semua payments, cari by id atau termin_ke
- Detail view: Nama Termin, Status, Tagihan, Retensi, Jatuh Tempo, Tanggal Bayar, Catatan
- Info box jika belum bayar: arahkan ke Kontak Bantuan

### 5.5 Galeri Proyek (`/galeri`)

- **2-level navigation:** Folder grid → Photo grid → Lightbox
- Grouping: items dikelompokkan by `judul` menjadi folders
- Folder view: cover image + foto count badge
- Photo view: grid 2-4 kolom, click → lightbox modal
- **Lightbox:** navigasi prev/next (arrow keys), close (Escape)
- Search: filter folder by nama
- Warna folder: 6 gradient presets (amber/orange)

### 5.6 Dokumen Proyek (`/dokumen`)

- **2-level navigation:** Folder grid → File list
- Grouping: items dikelompokkan by `folder_name`
- **Kategori filter:** Semua, RAB, Kontrak, Invoice, Foto, Lainnya
- Folder view: folder icon + count badge + warna unik
- File view: icon berdasarkan file_type (PDF=red, Image=orange, Word=blue, Excel=green, other=purple)
- File detail: nama, kategori badge, time ago, tanggal, deskripsi, download link
- Search + filter kombinasi

### 5.7 Aktivitas & Progress (`/aktivitas`)

- **2 Tabs:**
  - **Riwayat Pekerjaan:** tabel (desktop) / cards (mobile) — No, Nama, Tgl Mulai/Selesai, Status, Catatan
  - **Gantt Chart:** horizontal bar chart per aktivitas
- Search filter di tab Riwayat
- **Gantt Chart features:**
  - Header: bulan → tanggal per hari
  - Bar warna by status: Selesai (green), Dalam Proses (yellow), Tertunda (red)
  - Today line (orange)
  - Weekend shading (gray)
  - Click bar → detail modal (durasi, tanggal, deskripsi)
  - Horizontal scroll untuk range besar
  - DAY_W = 32px per hari

### 5.8 Progres (`/progres`)

- Redirect ke `/aktivitas`

### 5.9 Monitoring / Pantau Online (`/monitoring`)

- **Hidden dari sidebar** (commented out di ClientSidebar.tsx)
- Fetch: `portalApi.me()` + `portalApi.monitoring()` (parallel)
- **Stream types support:**
  - `youtube` → iframe embed (auto-detect video ID dari berbagai URL format)
  - `rtsp` + `hls_url` → CameraPlayer component (hls.js)
  - `iframe` → langsung iframe
  - `rtsp` tanpa hls_url → fallback tampilan copy URL
- Grid responsive: 1 kamera = full width, 2+ = grid 1-3 kolom
- LIVE badge merah per stream
- Info box: "Tampilan tergantung koneksi internet di lokasi proyek"

### 5.10 Tiket (`/tiket`)

- Fetch kontak dari `portalApi.kontak()`
- Form: pilih PIC (radio-style cards) + textarea pesan
- Submit → `portalApi.tiket()` → kirim WA ke PIC via Fonnte (backend)
- Success message setelah kirim

### 5.11 Kontak Bantuan (`/kontak`)

- Fetch dari `portalApi.kontak()`
- Grid cards: role, nama, telepon, email
- Buttons: WhatsApp (`wa.me/{number}`) + Telepon (`tel:{number}`)

---

## 6. Components

### 6.1 ClientLayout (`components/client/ClientLayout.tsx`)

- Auth guard: cek `isLoggedIn()` di useEffect, redirect ke `/login` jika false
- Render: sidebar overlay (mobile) + ClientSidebar + ClientHeader + main content
- Sidebar width: `lg:ml-56` (224px)

### 6.2 ClientHeader (`components/client/ClientHeader.tsx`)

- Fixed top bar: h-16, bg-white
- Mobile: hamburger button + Logo component
- Right side: notification bell (placeholder), username badge, logout button
- Logout: `clearAuth()` + redirect `/login`

### 6.3 ClientSidebar (`components/client/ClientSidebar.tsx`)

- Fixed left sidebar: w-64 (mobile) / w-56 (desktop)
- Slide-in animation mobile, always visible desktop (`lg:translate-x-0`)
- Logo: `Image` dari `/images/logo.png`

**Menu Utama:**
| Label | Path | Status |
|-------|------|--------|
| Dashboard | `/dashboard` | Active |
| Invoice | `/pembayaran` | Active |
| Galeri Proyek | `/galeri` | Active |
| Dokumen Proyek | `/dokumen` | Active |
| Aktivitas & Progress | `/aktivitas` | Active |
| ~~Pantau Online~~ | ~~`/monitoring`~~ | Hidden (commented) |

**Menu Lainnya:**
| Label | Path |
|-------|------|
| Tiket | `/tiket` |
| Kontak Bantuan | `/kontak` |

- Active state: orange background + white text
- "Keluar Akun" button di bottom

### 6.4 CameraPlayer (`components/ui/CameraPlayer.tsx`)

- HLS video player via hls.js
- **Retry logic:** max 8 retries, 3 detik delay (untuk MediaMTX startup delay)
- **4 states:** idle (play button), loading (spinner + retry count), playing (video + controls), error (retry button)
- Controls saat playing: LIVE indicator, Stop button, Fullscreen button
- Safari fallback: native HLS support via `video.src`

### 6.5 Logo (`components/ui/Logo.tsx`)

- SVG house shape (orange) + refresh arrows inside (navy + orange)
- Text: "Rubah" (orange) + "Rumah" (navy)
- 3 sizes: sm, md, lg (scale factor 0.7/1.0/1.3)

### 6.6 Badge (`components/ui/Badge.tsx`)

- Simple text badge with 6 color variants: green, yellow, red, blue, gray, orange
- No background — just text color + font-medium

---

## 7. Styling & Theme

### CSS Variables (`globals.css`)
| Variable | Value | Usage |
|----------|-------|-------|
| `--background` | `#F8FAFC` | Page background (slate-50) |
| `--foreground` | `#1E293B` | Text color (slate-800) |
| `--primary` | `#F97316` | Orange accent (buttons, active states) |
| `--primary-dark` | `#EA6C00` | Dark orange (hover) |
| `--navy` | `#0F4C75` | Navy headings, branding |
| `--navy-dark` | `#0A3558` | Dark navy |

### Design System
- Font: Inter (Google Fonts, loaded via `next/font`)
- Border radius: `rounded-xl` (12px) / `rounded-2xl` (16px) consistently
- Cards: `bg-white rounded-2xl border border-slate-100 shadow-sm`
- Buttons: `bg-orange-500 text-white rounded-xl font-semibold`
- Scrollbar: thin 6px, slate-100 track, slate-300 thumb
- Responsive: mobile-first, `sm:`, `md:`, `lg:` breakpoints
- Loading spinner: orange border-4 rounded-full animate-spin

---

## 8. Data Flow & Interfaces

### Project/Me Response
```ts
{
  nama_proyek: string;
  alamat: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  progress_persen: number;
  status_proyek: string;   // "Dalam Proses" | "Selesai" | "Ditunda"
  catatan: string | null;
  summary: {
    total_termin: number;
    termin_lunas: number;
    total_foto: number;
    total_dokumen: number;
    total_aktivitas: number;
  };
}
```

### Invoice
```ts
{
  id: number;
  invoice_number: string;
  tanggal: string | null;
  overdue_date: string | null;
  grand_total: number;
  subtotal: number;
  ppn_amount: number;
  status: string;          // "Lunas" | "Terbit" | "draft"
  catatan: string | null;
  kwitansi: {
    tanggal_bayar: string | null;
    metode_bayar: string | null;
  } | null;
}
```

### Payment (legacy)
```ts
{
  id: number;
  termin_ke: number;
  nama_termin: string | null;
  tagihan: number;
  retensi: number;
  status: string;          // "Sudah Dibayar" | "Belum Dibayar"
  jatuh_tempo: string | null;
  tanggal_bayar: string | null;
  catatan: string | null;
}
```

### GaleriItem
```ts
{
  id: number;
  judul: string;           // digunakan sebagai nama folder
  deskripsi: string | null;
  tanggal_foto: string | null;
  file_url: string | null; // path relatif, prefix dengan STORAGE_BASE
}
```

### DokumenItem
```ts
{
  id: number;
  nama_file: string;
  folder_name: string | null;  // digunakan untuk grouping folder
  deskripsi: string | null;
  kategori: string | null;     // RAB | Kontrak | Invoice | Foto | Lainnya
  file_type: string | null;    // MIME atau extension
  tanggal_upload: string | null;
  file_url: string | null;
}
```

### AktivitasItem
```ts
{
  id: number;
  judul: string;
  deskripsi: string | null;
  tanggal: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  status: string;          // "Selesai" | "Dalam Proses" | "Tertunda"
}
```

### CctvStream
```ts
{
  id: number;
  nama: string;
  stream_url: string;
  stream_type: string;     // "youtube" | "rtsp" | "iframe"
  hls_url: string | null;  // dari MediaMTX, hanya untuk rtsp
}
```

### Kontak
```ts
{
  id: number;
  role: string;
  nama: string;
  telepon: string | null;
  whatsapp: string | null;
  email: string | null;    // hanya di kontak page
}
```

---

## 9. Static Assets

| File | Path | Usage |
|------|------|-------|
| `logo.png` | `/images/logo.png` | Sidebar, login page |
| `logo-browser.ico` | `/images/logo-browser.ico` | Favicon + Apple touch icon |
| `LoginArt.png` | `/images/LoginArt.png` | Login page background (mobile: opacity, desktop: hidden) |
| `file.svg` | `/file.svg` | Default Next.js (unused) |
| `globe.svg` | `/globe.svg` | Default Next.js (unused) |
| `next.svg` | `/next.svg` | Default Next.js (unused) |
| `vercel.svg` | `/vercel.svg` | Default Next.js (unused) |
| `window.svg` | `/window.svg` | Default Next.js (unused) |

---

## 10. Patterns & Pitfalls

### Date Formatting
Semua halaman menggunakan helper lokal:
```ts
function fmtDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
```
Format varies: beberapa page pakai `2-digit` month, beberapa pakai `long`.

### Currency Formatting
```ts
function fmtRupiah(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}
```

### File/Image URLs
- Semua `file_url` dari API adalah path relatif (e.g., `/storage/client-portal/galeri/abc.jpg`)
- Harus di-prefix dengan `STORAGE_BASE` (`http://localhost:8000`)
- Contoh: `${STORAGE_BASE}${item.file_url}`

### Parallel Data Fetching
Semua halaman menggunakan `Promise.all([portalApi.me(), portalApi.xxx()])` untuk fetch project info + data sekaligus.

### Status Color Mapping
| Status | Background | Text |
|--------|-----------|------|
| Selesai | `bg-green-100` / `bg-green-50` | `text-green-600` |
| Dalam Proses | `bg-yellow-50` / `bg-blue-100` | `text-yellow-600` / `text-blue-600` |
| Tertunda / Ditunda | `bg-red-100` / `bg-red-50` | `text-red-500` |

### Galeri Folder Grouping
Items dikelompokkan by `judul` field → setiap `judul` unik = 1 folder. Cover = item pertama dengan `file_url`.

### Dokumen Folder Grouping
Items dikelompokkan by `folder_name` field → fallback ke "Dokumen Lainnya" jika null.

---

## 11. How to Update This Docs

Setiap kali ada perubahan fitur di rubahrumah/:
- **Page/menu baru** → update section 2 (folder) + section 5 (pages) + section 6.3 (sidebar)
- **API call baru** → update section 4
- **Interface baru/berubah** → update section 8
- **Component baru** → update section 6
- **Styling/theme berubah** → update section 7

Format: singkat, tabel-based, no fluff.
