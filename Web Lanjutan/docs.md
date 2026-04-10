# PRD - RentalKu: Sistem Manajemen Rental Kendaraan
**Product Requirements Document (PRD)**
**Versi:** 1.0
**Tanggal:** 22 Maret 2026
**Status:** Draft

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Latar Belakang & Tujuan](#2-latar-belakang--tujuan)
3. [Stakeholder & Target Pengguna](#3-stakeholder--target-pengguna)
4. [Ruang Lingkup Produk](#4-ruang-lingkup-produk)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Skema Database & Relasi Antar Tabel](#6-skema-database--relasi-antar-tabel)
7. [Fitur & Persyaratan Fungsional](#7-fitur--persyaratan-fungsional)
8. [Persyaratan Non-Fungsional](#8-persyaratan-non-fungsional)
9. [Desain UI/UX](#9-desain-uiux)
10. [Alur Pengguna (User Flow)](#10-alur-pengguna-user-flow)
11. [API & Routing](#11-api--routing)
12. [Keamanan](#12-keamanan)
13. [Batasan & Ketergantungan](#13-batasan--ketergantungan)
14. [Kriteria Penerimaan](#14-kriteria-penerimaan)

---

## 1. Ringkasan Eksekutif

**RentalKu** adalah platform manajemen rental kendaraan berbasis web yang menyediakan dua antarmuka utama:

- **Website Publik (Frontend):** Portal untuk pelanggan melihat katalog kendaraan, melakukan pemesanan online, dan melacak status penyewaan.
- **Dashboard Admin (Backend):** Panel manajemen untuk pemilik usaha/staf dalam mengelola armada kendaraan, konfirmasi penyewaan, data pelanggan, dan laporan pendapatan.

Sistem dibangun menggunakan PHP native dengan MySQL sebagai database, dan Bootstrap 5 sebagai framework CSS. Arsitektur mengikuti pola MVC sederhana (tanpa framework).

---

## 2. Latar Belakang & Tujuan

### 2.1 Latar Belakang
Usaha rental kendaraan (mobil dan motor) sering masih dikelola secara manual atau melalui komunikasi WhatsApp/telepon. Hal ini menyebabkan:
- Tidak adanya dokumentasi pemesanan yang terstruktur
- Sulit memantau ketersediaan unit secara real-time
- Laporan pendapatan tidak akurat
- Pelanggan tidak dapat mengecek status penyewaan secara mandiri

### 2.2 Tujuan Produk
| # | Tujuan | Indikator Keberhasilan |
|---|--------|----------------------|
| 1 | Digitalisasi proses pemesanan kendaraan | Pelanggan dapat memesan tanpa kontak langsung |
| 2 | Manajemen armada terpusat | Admin dapat memantau semua unit dari satu dashboard |
| 3 | Transparansi status penyewaan | Pelanggan dapat cek status menggunakan kode sewa |
| 4 | Laporan otomatis | Admin dapat menghasilkan laporan bulanan dengan satu klik |
| 5 | Efisiensi operasional | Waktu proses konfirmasi < 24 jam |

---

## 3. Stakeholder & Target Pengguna

### 3.1 Stakeholder
| Role | Deskripsi |
|------|-----------|
| **Pemilik Usaha** | Pengambil keputusan, melihat laporan pendapatan dan performa bisnis |
| **Admin** | Akses penuh: kelola kendaraan, pelanggan, konfirmasi, laporan, dan pengguna sistem |
| **Staff** | Akses terbatas: kelola kendaraan, konfirmasi penyewaan, lihat laporan |
| **Pelanggan** | Pengguna akhir website publik yang menyewa kendaraan |

### 3.2 Persona Pengguna

#### Persona 1: Budi - Admin Rental
- Usia: 35 tahun
- Pekerjaan: Pemilik sekaligus admin usaha rental
- Kebutuhan: Memantau armada, konfirmasi cepat, laporan bulanan untuk pelaporan pajak
- Pain Point: Sering lupa unit sedang disewa siapa, kesulitan rekap pendapatan manual

#### Persona 2: Rina - Pelanggan
- Usia: 28 tahun
- Pekerjaan: Karyawan swasta
- Kebutuhan: Menyewa mobil untuk liburan akhir pekan, ingin tahu status pesanannya
- Pain Point: Harus telepon/WA untuk tanya harga dan ketersediaan unit

---

## 4. Ruang Lingkup Produk

### 4.1 Dalam Lingkup (In Scope)
- Website katalog kendaraan dengan filter kategori
- Form pemesanan online dengan kalkulasi harga otomatis
- Sistem pengecekan status penyewaan (tanpa login)
- Dashboard admin dengan autentikasi berbasis session
- CRUD: Kendaraan, Kategori, Pelanggan, Pengguna Admin
- Manajemen status penyewaan (konfirmasi, berjalan, selesai, batal)
- Laporan pendapatan bulanan dan kendaraan terpopuler
- Manajemen pengguna dengan role Admin/Staff

### 4.2 Di Luar Lingkup (Out of Scope)
- Payment gateway / pembayaran online
- Notifikasi otomatis via email atau SMS
- Aplikasi mobile native (iOS/Android)
- Integrasi peta/lokasi pengambilan kendaraan
- Fitur rating & ulasan pelanggan
- Multi-cabang / multi-lokasi

---

## 5. Arsitektur Sistem

### 5.1 Stack Teknologi
| Layer | Teknologi |
|-------|-----------|
| **Backend Language** | PHP (procedural, tanpa framework) |
| **Database** | MySQL (via MySQLi) |
| **Frontend Framework** | Bootstrap 5.3.2 (CDN) |
| **Icon Library** | Bootstrap Icons 1.11.3 (CDN) |
| **JavaScript** | Vanilla JS + Bootstrap Bundle |
| **Web Server** | Apache (Laragon) |

### 5.2 Struktur Direktori
```
Web Lanjutan/
├── config/
│   ├── database.php        # Konfigurasi koneksi database
│   └── setup.sql           # Schema database & data awal
│
├── backend/                # Dashboard Admin
│   ├── includes/
│   │   ├── auth.php        # Middleware autentikasi session
│   │   ├── db.php          # Koneksi database (memanggil config)
│   │   ├── header.php      # HTML head + Bootstrap CDN
│   │   ├── footer.php      # Closing tags + alert auto-hide JS
│   │   ├── sidebar.php     # Navigasi kiri + badge notifikasi
│   │   └── topbar.php      # Navigasi atas + user dropdown
│   │
│   ├── login.php           # Halaman login admin
│   ├── logout.php          # Handler logout (destroy session)
│   ├── index.php           # Dashboard utama
│   ├── kendaraan.php       # CRUD kendaraan
│   ├── kategori.php        # CRUD kategori
│   ├── penyewaan.php       # Daftar semua penyewaan
│   ├── konfirmasi.php      # Konfirmasi penyewaan pending
│   ├── pelanggan.php       # CRUD pelanggan
│   ├── laporan.php         # Laporan pendapatan
│   ├── users.php           # CRUD pengguna admin
│   └── uploads/            # Storage gambar kendaraan
│
└── frontend/               # Website Publik
    ├── includes/
    │   ├── db.php          # Koneksi database
    │   ├── header.php      # HTML head + navbar publik
    │   └── footer.php      # Footer + link ke admin
    │
    ├── index.php           # Homepage
    ├── kendaraan.php       # Katalog kendaraan
    ├── detail.php          # Detail kendaraan + form sewa
    ├── cek-status.php      # Cek status penyewaan
    ├── tentang.php         # Halaman tentang kami
    ├── kontak.php          # Halaman kontak
    └── assets/
        ├── css/            # (kosong - menggunakan CDN)
        └── js/             # (kosong - menggunakan CDN)
```

### 5.3 Diagram Alur Sistem
```
[Pelanggan]
    │
    ▼
[Frontend Website]
    │── /index.php          → Homepage & showcase
    │── /kendaraan.php      → Browse & filter katalog
    │── /detail.php?id=X    → Detail + Form Pemesanan
    │                              │
    │                              ▼
    │                       [MySQL: rental_db]
    │                       penyewaan + pelanggan
    │                              │
    │── /cek-status.php     ◄──────┘ (read penyewaan)
    │── /tentang.php
    └── /kontak.php

[Admin/Staff]
    │
    ▼
[Backend Dashboard] → auth.php (cek session)
    │── /login.php          → Autentikasi
    │── /index.php          → Dashboard statistik
    │── /kendaraan.php      → CRUD armada
    │── /kategori.php       → CRUD kategori
    │── /konfirmasi.php     → Konfirmasi pending
    │── /penyewaan.php      → Kelola semua sewa
    │── /pelanggan.php      → CRUD pelanggan
    │── /laporan.php        → Laporan pendapatan
    └── /users.php          → CRUD pengguna (admin only)
```

---

## 6. Skema Database & Relasi Antar Tabel

### 6.1 Entity Relationship Diagram (ERD)

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   users     │         │    kendaraan      │         │    kategori     │
│─────────────│         │──────────────────│         │─────────────────│
│ id (PK)     │         │ id (PK)           │◄────────│ id (PK)         │
│ nama        │         │ kategori_id (FK) ─┘         │ nama            │
│ email       │         │ nama              │         │ deskripsi       │
│ password    │         │ plat              │         │ created_at      │
│ role        │         │ harga_per_hari    │         └─────────────────┘
│ created_at  │         │ stok              │
└─────────────┘         │ deskripsi         │
                        │ gambar            │
                        │ status            │
                        │ created_at        │
                        └────────┬──────────┘
                                 │ 1
                                 │
                                 │ N
                        ┌────────▼──────────┐         ┌─────────────────┐
                        │   penyewaan        │         │    pelanggan    │
                        │──────────────────  │         │─────────────────│
                        │ id (PK)            │         │ id (PK)         │
                        │ kode_sewa (UNIQUE) │◄────────│ nama            │
                        │ pelanggan_id (FK) ─┘         │ email           │
                        │ kendaraan_id (FK)  │         │ no_hp           │
                        │ tanggal_mulai      │         │ no_ktp          │
                        │ tanggal_selesai    │         │ alamat          │
                        │ total_hari         │         │ created_at      │
                        │ total_harga        │         └─────────────────┘
                        │ status             │
                        │ catatan            │
                        │ created_at         │
                        └────────────────────┘
```

### 6.2 Detail Tabel

#### Tabel: `users`
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|-----------|-----------|
| `id` | INT | PK, AUTO_INCREMENT | Identitas unik pengguna admin |
| `nama` | VARCHAR(100) | NOT NULL | Nama lengkap admin/staff |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | Email login |
| `password` | VARCHAR(255) | NOT NULL | Password terenkripsi (bcrypt) |
| `role` | ENUM('admin','staff') | DEFAULT 'staff' | Level akses pengguna |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu akun dibuat |

**Akun Default:**
- Email: `admin@rental.com`
- Password: `password`
- Role: `admin`

---

#### Tabel: `kategori`
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|-----------|-----------|
| `id` | INT | PK, AUTO_INCREMENT | Identitas unik kategori |
| `nama` | VARCHAR(50) | NOT NULL | Nama kategori (Mobil / Motor) |
| `deskripsi` | TEXT | - | Penjelasan kategori |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu dibuat |

**Data Awal:**
- ID 1: Mobil (4 penumpang lebih)
- ID 2: Motor

---

#### Tabel: `kendaraan`
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|-----------|-----------|
| `id` | INT | PK, AUTO_INCREMENT | Identitas unik kendaraan |
| `kategori_id` | INT | FK → kategori.id | Kategori kendaraan |
| `nama` | VARCHAR(100) | NOT NULL | Nama/model kendaraan |
| `plat` | VARCHAR(20) | NOT NULL | Nomor plat kendaraan |
| `harga_per_hari` | DECIMAL(10,2) | NOT NULL | Harga sewa per hari (Rp) |
| `stok` | INT | DEFAULT 1 | Jumlah unit tersedia |
| `deskripsi` | TEXT | - | Deskripsi kendaraan |
| `gambar` | VARCHAR(255) | - | Path file gambar |
| `status` | ENUM('tersedia','disewa','maintenance') | DEFAULT 'tersedia' | Status ketersediaan |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu ditambahkan |

**Data Awal Armada:**
| Nama | Kategori | Harga/Hari | Stok |
|------|----------|-----------|------|
| Toyota Avanza | Mobil | Rp 350.000 | 2 |
| Honda Jazz | Mobil | Rp 300.000 | 1 |
| Toyota Innova | Mobil | Rp 500.000 | 1 |
| Suzuki Ertiga | Mobil | Rp 320.000 | 2 |
| Honda Beat | Motor | Rp 75.000 | 5 |
| Yamaha NMAX | Motor | Rp 120.000 | 3 |
| Honda Vario | Motor | Rp 85.000 | 4 |
| Kawasaki KLX | Motor | Rp 150.000 | 2 |

---

#### Tabel: `pelanggan`
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|-----------|-----------|
| `id` | INT | PK, AUTO_INCREMENT | Identitas unik pelanggan |
| `nama` | VARCHAR(100) | NOT NULL | Nama lengkap pelanggan |
| `email` | VARCHAR(100) | - | Alamat email |
| `no_hp` | VARCHAR(20) | NOT NULL | Nomor telepon/WA |
| `no_ktp` | VARCHAR(30) | - | Nomor KTP (identitas) |
| `alamat` | TEXT | - | Alamat lengkap |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu registrasi |

---

#### Tabel: `penyewaan`
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|-----------|-----------|
| `id` | INT | PK, AUTO_INCREMENT | Identitas unik transaksi |
| `kode_sewa` | VARCHAR(20) | UNIQUE, NOT NULL | Kode unik (format: RNT-YYYYMMDD-XXX) |
| `pelanggan_id` | INT | FK → pelanggan.id | Pelanggan penyewa |
| `kendaraan_id` | INT | FK → kendaraan.id | Kendaraan yang disewa |
| `tanggal_mulai` | DATE | NOT NULL | Tanggal mulai sewa |
| `tanggal_selesai` | DATE | NOT NULL | Tanggal selesai sewa |
| `total_hari` | INT | NOT NULL | Durasi dalam hari |
| `total_harga` | DECIMAL(12,2) | NOT NULL | Total biaya sewa (Rp) |
| `status` | ENUM('menunggu','dikonfirmasi','berjalan','selesai','dibatalkan') | DEFAULT 'menunggu' | Status penyewaan |
| `catatan` | TEXT | - | Catatan/permintaan khusus |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu pemesanan |

**Status Flow:**
```
menunggu → dikonfirmasi → berjalan → selesai
    └──────────────────────────────→ dibatalkan
```

### 6.3 Relasi Antar Tabel
| Relasi | Tipe | Keterangan |
|--------|------|-----------|
| `kendaraan.kategori_id` → `kategori.id` | Many-to-One | Banyak kendaraan bisa dalam satu kategori |
| `penyewaan.pelanggan_id` → `pelanggan.id` | Many-to-One | Satu pelanggan bisa memiliki banyak penyewaan |
| `penyewaan.kendaraan_id` → `kendaraan.id` | Many-to-One | Satu kendaraan bisa disewa berkali-kali |

---

## 7. Fitur & Persyaratan Fungsional

### 7.1 Frontend - Website Publik

#### FR-01: Homepage
- **Deskripsi:** Halaman utama yang menampilkan informasi umum usaha dan showcase kendaraan
- **Komponen:**
  - Hero section dengan judul, tagline, dan tombol CTA ("Sewa Sekarang" & "Lihat Kendaraan")
  - Statistik bisnis: jumlah unit, kategori, pelanggan puas
  - 3 keunggulan layanan (Terpercaya, Harga Terjangkau, Layanan 24 Jam)
  - Grid 6 kendaraan terbaru dari database
  - Alur penyewaan 4 langkah (Pilih → Isi Data → Konfirmasi → Sewa)
- **Sumber Data:** Query `kendaraan` ORDER BY created_at DESC LIMIT 6

#### FR-02: Katalog Kendaraan
- **Deskripsi:** Halaman daftar semua kendaraan dengan filter kategori
- **Fitur Filter:** Tombol filter "Semua", "Mobil", "Motor" berdasarkan `kategori_id`
- **Tampilan per Kendaraan:**
  - Gambar kendaraan
  - Badge kategori (warna berbeda untuk Mobil/Motor)
  - Nama, deskripsi, nomor plat
  - Harga per hari
  - Stok tersedia
  - Tombol "Sewa Sekarang" → redirect ke detail.php?id=X
- **Kondisi:** Hanya tampilkan kendaraan dengan `status = 'tersedia'`
- **URL:** `/frontend/kendaraan.php?kategori=1` (opsional filter)

#### FR-03: Detail Kendaraan & Form Pemesanan
- **Deskripsi:** Halaman detail kendaraan lengkap dengan formulir pemesanan online
- **Informasi Kendaraan:** Gambar, nama, kategori, plat, harga/hari, stok, deskripsi, status
- **Form Pemesanan (kiri):**
  - Data Pelanggan: Nama Lengkap, Email, No. HP, No. KTP, Alamat
  - Data Sewa: Tanggal Mulai (min: hari ini), Tanggal Selesai
  - Catatan/Permintaan Khusus (textarea)
  - Kalkulasi otomatis: Durasi (hari) × Harga/hari = Total
- **Kalkulasi Harga Real-time (JavaScript):**
  - Event listener pada perubahan tanggal
  - Hitung selisih hari antara tanggal mulai dan selesai
  - Update tampilan "Total Hari" dan "Total Harga" secara instan
- **Proses Submit:**
  1. Validasi semua field wajib terisi
  2. Cek stok kendaraan masih tersedia
  3. Insert data pelanggan jika belum ada (berdasarkan no_hp atau email)
  4. Insert penyewaan dengan `kode_sewa` format `RNT-{YYYYMMDD}-{nnn}`
  5. Tampilkan pesan sukses beserta kode sewa untuk disimpan pelanggan
- **URL:** `/frontend/detail.php?id={kendaraan_id}`

#### FR-04: Cek Status Penyewaan
- **Deskripsi:** Pelanggan bisa mengecek status pesanan tanpa perlu login
- **Input:** Field kode sewa (contoh: RNT-20260308-001)
- **Output:** Kartu informasi berisi:
  - Nama pelanggan & nomor HP
  - Nama kendaraan yang disewa
  - Tanggal mulai & selesai
  - Durasi (hari)
  - Total harga
  - Badge status berwarna (lihat tabel di bawah)
- **Status Badge:**

| Status | Warna Badge | Keterangan |
|--------|------------|-----------|
| `menunggu` | Kuning (warning) | Menunggu konfirmasi admin |
| `dikonfirmasi` | Biru (info) | Sudah dikonfirmasi admin |
| `berjalan` | Biru tua (primary) | Sedang dalam periode sewa |
| `selesai` | Hijau (success) | Penyewaan telah selesai |
| `dibatalkan` | Merah (danger) | Penyewaan dibatalkan |

- **URL:** `/frontend/cek-status.php`

#### FR-05: Halaman Tentang Kami
- **Deskripsi:** Informasi perusahaan, visi, misi, dan tim
- **Konten:** Kisah perusahaan, visi/misi, statistik bisnis, profil anggota tim

#### FR-06: Halaman Kontak
- **Deskripsi:** Informasi kontak bisnis dan formulir pesan
- **Informasi:** Alamat, WhatsApp, Email, Jam operasional
- **Form:** Nama, Email, Subjek, Pesan → proses simpan dan tampilkan konfirmasi

---

### 7.2 Backend - Dashboard Admin

#### FR-07: Autentikasi Admin
- **Login:** Form email + password, verifikasi dengan `password_verify()` (bcrypt)
- **Session:** Simpan `user_id`, `user_nama`, `user_role` di session PHP
- **Proteksi:** Setiap halaman backend menyertakan `auth.php` yang redirect ke login jika session kosong
- **Logout:** Destroy session + redirect ke login
- **Role Access:**
  - `admin`: akses semua fitur termasuk manajemen pengguna
  - `staff`: akses semua kecuali `/users.php`

#### FR-08: Dashboard Utama
- **Statistik Cards (4 kartu):**
  1. Kendaraan Tersedia (COUNT dari `kendaraan` WHERE status='tersedia')
  2. Konfirmasi Pending (COUNT dari `penyewaan` WHERE status='menunggu')
  3. Sedang Disewa (COUNT dari `penyewaan` WHERE status='berjalan')
  4. Total Pendapatan (SUM `total_harga` dari semua penyewaan selesai)
- **Tabel Penyewaan Terbaru:** 5 penyewaan terbaru dengan badge status
- **Quick Links:** Tombol navigasi cepat ke halaman manajemen

#### FR-09: Manajemen Kendaraan
- **List:** Tabel semua kendaraan (gambar thumbnail, nama, kategori, plat, harga, stok, status, aksi)
- **Tambah:** Form input kendaraan baru (nama, kategori, plat, harga/hari, stok, status, deskripsi, upload gambar)
- **Edit:** Inline edit pada halaman yang sama, form pre-filled dengan data existing + preview gambar saat ini
- **Hapus:** Konfirmasi modal sebelum delete
- **Upload Gambar:**
  - File upload ke `/backend/uploads/`, simpan nama file di kolom `gambar`
  - Form menggunakan `enctype="multipart/form-data"`
  - Validasi tipe file: JPG, PNG, WebP, GIF
  - Validasi ukuran: maksimal 2MB
  - Nama file unik: `kendaraan_{timestamp}_{random}.{ext}`
  - Saat edit: upload gambar baru otomatis menghapus gambar lama dari server
  - Saat edit: gambar bersifat opsional (tidak wajib upload ulang)
  - Tabel menampilkan thumbnail 50x50px per kendaraan, fallback icon jika belum ada gambar

#### FR-10: Manajemen Kategori
- **List:** Tabel kategori dengan jumlah kendaraan per kategori
- **Tambah/Edit/Hapus:** CRUD standar dengan form di halaman yang sama

#### FR-11: Konfirmasi Penyewaan
- **Deskripsi:** Halaman khusus untuk menangani penyewaan yang `status = 'menunggu'`
- **Tampilan:** Card per penyewaan berisi:
  - Kode sewa + tanggal order
  - Data pelanggan (nama, HP, KTP, alamat)
  - Data kendaraan (nama, plat, harga)
  - Periode sewa + total harga
  - Catatan khusus (jika ada)
- **Aksi:** Tombol "Konfirmasi" → ubah status ke `dikonfirmasi`
- **Aksi:** Tombol "Batalkan" → ubah status ke `dibatalkan`
- **Badge:** Sidebar menampilkan jumlah pending sebagai badge merah notifikasi

#### FR-12: Manajemen Penyewaan
- **List:** Tabel semua penyewaan dengan kolom: kode, pelanggan, kendaraan, tanggal, durasi, harga, status
- **Filter Status:** Dropdown filter berdasarkan status penyewaan
- **Ubah Status:** Dropdown per baris untuk mengubah status (admin bisa update ke status manapun)
- **Hapus:** Hapus data penyewaan

#### FR-13: Manajemen Pelanggan
- **List:** Tabel pelanggan (nama, email, HP, KTP, alamat, jumlah penyewaan)
- **Tambah/Edit/Hapus:** CRUD standar
- **Jumlah Sewa:** COUNT dari tabel `penyewaan` per pelanggan (join query)

#### FR-14: Laporan Pendapatan
- **Filter:** Pilih bulan dan tahun, klik "Tampilkan"
- **Ringkasan Bulan:**
  - Total pendapatan bulan terpilih
  - Jumlah transaksi selesai
  - Total pendapatan all-time
- **Tabel Kendaraan Terpopuler:** Ranking berdasarkan frekuensi disewa (COUNT)
- **Tabel Detail Transaksi:** Semua penyewaan pada bulan terpilih yang berstatus 'selesai'

#### FR-15: Manajemen Pengguna Admin
- **Akses:** Hanya role `admin` yang bisa mengakses
- **List:** Tabel pengguna (nama, email, role, tanggal buat)
- **Tambah:** Form nama, email, password, role
- **Edit:** Update data pengguna (password bisa dikosongkan = tidak diubah)
- **Hapus:** Tidak bisa menghapus akun sendiri (cek `id != session user_id`)
- **Password:** Di-hash ulang saat disimpan/diubah

---

## 8. Persyaratan Non-Fungsional

### 8.1 Performa
| Metrik | Target |
|--------|--------|
| Waktu load halaman | < 3 detik pada koneksi normal |
| Response database query | < 1 detik per query |
| Upload gambar kendaraan | Maksimal 2MB per file |

### 8.2 Ketersediaan
- Sistem berjalan di web server lokal (Laragon/Apache)
- Database MySQL terpusat di `localhost`
- Tidak ada SLA khusus untuk versi lokal

### 8.3 Kompatibilitas Browser
| Browser | Dukungan |
|---------|---------|
| Chrome 90+ | Penuh |
| Firefox 85+ | Penuh |
| Edge 90+ | Penuh |
| Safari 14+ | Penuh |
| IE 11 | Tidak didukung |

### 8.4 Responsivitas
- Menggunakan Bootstrap 5 Grid System
- Mobile-first design
- Breakpoint: xs (<576px), sm (576px), md (768px), lg (992px), xl (1200px)
- Dashboard admin optimal pada layar ≥ 992px (sidebar 240px)

### 8.5 Skalabilitas
- Sistem dapat menampung hingga ribuan data pelanggan dan transaksi
- Query menggunakan index pada kolom FK dan kolom filter

---

## 9. Desain UI/UX

### 9.1 Design System

#### Palet Warna
| Nama | Hex Code | Penggunaan |
|------|----------|-----------|
| Primary Orange | `#f0a500` | Tombol utama, aksen brand, highlight |
| Dark Navy | `#1a1a2e` | Header, sidebar, teks judul |
| White | `#ffffff` | Background kartu, teks pada dark |
| Light Gray | `#f0f2f5` | Background halaman, section alternating |
| Text Dark | `#333333` | Teks utama konten |
| Success | `#198754` | Status selesai, tombol konfirmasi |
| Danger | `#dc3545` | Status batal, tombol hapus |
| Warning | `#ffc107` | Status menunggu |
| Info | `#0d6efd` | Status dikonfirmasi/berjalan |

#### Tipografi
| Elemen | Style |
|--------|-------|
| Heading 1 (Hero) | Font system, besar, bold |
| Heading 2 (Section) | Font system, medium-large, semi-bold |
| Body text | Font system, normal 16px |
| Small text (badge, caption) | 12-14px |

#### Komponen UI Utama
| Komponen | Deskripsi |
|----------|-----------|
| `.btn-orange` | Tombol primer: background #f0a500, text putih, rounded |
| `.card-kendaraan` | Kartu kendaraan dengan hover shadow effect |
| `.stat-card` | Kartu statistik dashboard dengan icon besar |
| `.page-card` | Container konten dengan shadow dan rounded corners |
| Status Badge | `badge bg-{color}` sesuai status penyewaan |

### 9.2 Layout Halaman

#### Frontend Layout
```
┌─────────────────────────────────────────┐
│             NAVBAR (Fixed Top)           │
│  Logo  |  Menu: Beranda Kendaraan Tentang│
│         Kontak |  [Cek Status]           │
├─────────────────────────────────────────┤
│                                         │
│           MAIN CONTENT                  │
│         (berbeda tiap halaman)          │
│                                         │
├─────────────────────────────────────────┤
│              FOOTER                     │
│  Logo | Menu | Kontak | Copyright       │
│        [Login Admin]                    │
└─────────────────────────────────────────┘
```

#### Backend/Admin Layout
```
┌──────────┬──────────────────────────────┐
│          │        TOPBAR                │
│          │  [Judul Halaman] [User Menu] │
│ SIDEBAR  ├──────────────────────────────┤
│ (240px)  │                              │
│ - Menu 1 │      MAIN CONTENT            │
│ - Menu 2 │    (Stats/Tables/Forms)      │
│ - Menu 3 │                              │
│ ...      │                              │
└──────────┴──────────────────────────────┘
```

### 9.3 Halaman-per-Halaman UI

#### Homepage (frontend/index.php)
```
[NAVBAR]
─────────────────────────────────────────
[HERO SECTION - dark navy bg]
  Judul Besar: "RentalKu"
  Tagline: "Rental Mobil & Motor Terpercaya"
  [Sewa Sekarang] [Lihat Kendaraan]
─────────────────────────────────────────
[STATISTIK - 3 kolom]
  📦 20+ Unit  |  🚗 2 Kategori  |  ⭐ 500+ Puas
─────────────────────────────────────────
[KEUNGGULAN - 3 kartu]
  🛡 Terpercaya | 💰 Terjangkau | 🕐 24 Jam
─────────────────────────────────────────
[KENDARAAN POPULER - grid 3 kolom]
  [Card] [Card] [Card]
  [Card] [Card] [Card]
─────────────────────────────────────────
[CARA SEWA - 4 langkah horizontal]
  1.Pilih → 2.Isi Data → 3.Konfirmasi → 4.Sewa
─────────────────────────────────────────
[FOOTER]
```

#### Katalog Kendaraan (frontend/kendaraan.php)
```
[NAVBAR]
─────────────────────────────────────────
[FILTER TOMBOL]
  [Semua] [Mobil] [Motor]
─────────────────────────────────────────
[GRID KENDARAAN - 3 kolom]
  ┌──────────────┐  ┌──────────────┐
  │ [Gambar]     │  │ [Gambar]     │
  │ 🏷 Mobil     │  │ 🏷 Motor     │
  │ Toyota Avanza│  │ Honda Beat   │
  │ B 1234 AX    │  │ B 5678 BC    │
  │ Rp 350.000/hr│  │ Rp 75.000/hr │
  │ Stok: 2 unit │  │ Stok: 5 unit │
  │ [Sewa Skrg]  │  │ [Sewa Skrg]  │
  └──────────────┘  └──────────────┘
─────────────────────────────────────────
[FOOTER]
```

#### Detail & Booking (frontend/detail.php)
```
[NAVBAR]
─────────────────────────────────────────
[2 KOLOM]
  KIRI (info kendaraan):        KANAN (form booking):
  [Gambar Besar]                [Form Data Diri]
  Nama Kendaraan                - Nama Lengkap *
  🏷 Kategori                   - Email *
  📋 Plat: B 1234 AX            - No. HP *
  💰 Rp 350.000/hari            - No. KTP *
  📦 Stok: 2 unit               - Alamat *
  📝 Deskripsi...               [Form Tanggal Sewa]
                                - Tanggal Mulai *
                                - Tanggal Selesai *
                                ─────────────────
                                Durasi: 3 hari
                                Total: Rp 1.050.000
                                ─────────────────
                                - Catatan (opsional)
                                [Pesan Sekarang]
─────────────────────────────────────────
[FOOTER]
```

#### Dashboard Admin (backend/index.php)
```
[SIDEBAR] [TOPBAR: Dashboard | Tanggal | User]
─────────────────────────────────────────
[4 STAT CARDS - horizontal]
  🚗 Tersedia | ⏳ Pending | 🔄 Berjalan | 💰 Pendapatan

[TABEL PENYEWAAN TERBARU]
  Kode | Pelanggan | Kendaraan | Tgl | Status
  ...
─────────────────────────────────────────
```

---

## 10. Alur Pengguna (User Flow)

### 10.1 Alur Pelanggan: Menyewa Kendaraan
```
[Buka Homepage]
      │
      ▼
[Browse Katalog] → Filter kategori → Pilih kendaraan
      │
      ▼
[Halaman Detail] → Lihat info kendaraan
      │
      ▼
[Isi Form Booking]
  - Data diri (nama, email, HP, KTP, alamat)
  - Pilih tanggal sewa
  - Lihat kalkulasi harga otomatis
      │
      ▼
[Submit Form]
      │
      ├─ Error (stok habis / field kosong) → Tampilkan pesan error
      │
      └─ Sukses → Tampilkan kode sewa (RNT-YYYYMMDD-XXX)
                        │
                        ▼
              [Simpan kode sewa]
                        │
                        ▼
              [Cek Status kapan saja]
              Masukkan kode → Lihat status terkini
```

### 10.2 Alur Admin: Konfirmasi Penyewaan
```
[Login Admin]
      │
      ▼
[Dashboard] → Lihat badge "X pending"
      │
      ▼
[Halaman Konfirmasi]
      │
      ├─ Lihat detail pesanan (pelanggan, kendaraan, tanggal, harga)
      │
      ├─ [Konfirmasi] → Status: menunggu → dikonfirmasi
      │
      └─ [Batalkan] → Status: menunggu → dibatalkan
```

### 10.3 Alur Admin: Kelola Armada Kendaraan
```
[Login Admin]
      │
      ▼
[Menu Kendaraan]
      │
      ├─ [Tambah] → Isi form → Submit → Kendaraan tersimpan
      │
      ├─ [Edit] → Form pre-filled → Update → Tersimpan
      │
      └─ [Hapus] → Modal konfirmasi → Delete
```

### 10.4 Alur Admin: Generate Laporan
```
[Login Admin]
      │
      ▼
[Menu Laporan]
      │
      ▼
[Pilih Bulan & Tahun]
      │
      ▼
[Tampilkan Laporan]
  - Ringkasan: Total pendapatan, jumlah transaksi
  - Tabel kendaraan terpopuler
  - Detail transaksi bulan terpilih
```

---

## 11. API & Routing

### 11.1 Frontend Routes
| URL | Method | Deskripsi |
|-----|--------|-----------|
| `/frontend/index.php` | GET | Homepage |
| `/frontend/kendaraan.php` | GET | Katalog (opsional: `?kategori=1`) |
| `/frontend/detail.php?id={id}` | GET | Detail kendaraan |
| `/frontend/detail.php?id={id}` | POST | Submit form pemesanan |
| `/frontend/cek-status.php` | GET | Form cek status |
| `/frontend/cek-status.php` | POST | Proses cek status |
| `/frontend/tentang.php` | GET | Halaman tentang |
| `/frontend/kontak.php` | GET/POST | Halaman kontak |

### 11.2 Backend Routes (Admin)
| URL | Method | Parameter | Deskripsi |
|-----|--------|-----------|-----------|
| `/backend/login.php` | GET/POST | - | Form login |
| `/backend/logout.php` | GET | - | Proses logout |
| `/backend/index.php` | GET | - | Dashboard |
| `/backend/kendaraan.php` | GET | - | List kendaraan |
| `/backend/kendaraan.php` | POST | `aksi=tambah` | Tambah kendaraan |
| `/backend/kendaraan.php` | GET | `aksi=edit&id=X` | Form edit |
| `/backend/kendaraan.php` | POST | `aksi=update&id=X` | Simpan edit |
| `/backend/kendaraan.php` | GET | `aksi=hapus&id=X` | Hapus kendaraan |
| `/backend/kategori.php` | GET/POST | - | CRUD kategori |
| `/backend/penyewaan.php` | GET | `filter={status}` | List penyewaan |
| `/backend/penyewaan.php` | POST | `aksi=update_status` | Ubah status |
| `/backend/konfirmasi.php` | GET | - | List pending |
| `/backend/konfirmasi.php` | GET | `aksi=konfirmasi&id=X` | Konfirmasi sewa |
| `/backend/konfirmasi.php` | GET | `aksi=batalkan&id=X` | Batalkan sewa |
| `/backend/pelanggan.php` | GET/POST | - | CRUD pelanggan |
| `/backend/laporan.php` | GET | `bulan=X&tahun=X` | Laporan bulanan |
| `/backend/users.php` | GET/POST | - | CRUD pengguna |

### 11.3 Format Kode Sewa
```
Format: RNT-{YYYYMMDD}-{NNN}
Contoh: RNT-20260322-001
        RNT-20260322-002
```
- `YYYYMMDD`: Tanggal pemesanan
- `NNN`: Urutan nomor (3 digit, diambil dari COUNT + 1)

---

## 12. Keamanan

### 12.1 Implementasi yang Ada
| Fitur | Detail |
|-------|--------|
| Enkripsi password | Bcrypt via `password_hash()` dan `password_verify()` |
| Session management | PHP native session, destroy saat logout |
| HTML escaping | `htmlspecialchars()` pada output data |
| Proteksi halaman | `auth.php` di-include setiap halaman backend |
| Role check | Cek `$_SESSION['user_role'] == 'admin'` untuk halaman sensitif |

### 12.2 Kerentanan yang Perlu Diperbaiki (Prioritas untuk Produksi)
| # | Kerentanan | Lokasi | Solusi |
|---|-----------|--------|--------|
| 1 | **SQL Injection** | Hampir semua query langsung memakai variabel tanpa sanitasi | Gunakan Prepared Statements MySQLi |
| 2 | **CSRF** | Semua form POST tidak ada token CSRF | Tambahkan CSRF token di setiap form |
| 3 | **File Upload** | Tidak ada validasi tipe/ukuran file gambar | Validasi ekstensi + ukuran file |
| 4 | **Password di Frontend** | Hint password tampil di halaman login | Hapus hint saat production |
| 5 | **Input Validation** | Tidak ada server-side validation lengkap | Tambahkan validasi semua input |
| 6 | **HTTPS** | Tidak dikonfigurasi | Aktifkan SSL untuk production |

> **Catatan:** Untuk tujuan pembelajaran/akademik, sistem ini fungsional dan aman dari serangan dasar. Namun memerlukan hardening sebelum deployment ke production.

---

## 13. Batasan & Ketergantungan

### 13.1 Batasan Teknis
- PHP versi 7.4+ (menggunakan syntax modern seperti null coalescing)
- MySQL 5.7+ atau MariaDB 10.3+
- Server web Apache (sudah di-bundle oleh Laragon)
- Tidak ada composer/dependency manager (vanilla PHP)
- Bootstrap dan icons diambil via CDN (memerlukan internet)

### 13.2 Ketergantungan Eksternal
| Dependensi | Versi | Sumber |
|------------|-------|--------|
| Bootstrap | 5.3.2 | CDN (cdn.jsdelivr.net) |
| Bootstrap Icons | 1.11.3 | CDN (cdn.jsdelivr.net) |

### 13.3 Batasan Fungsional Saat Ini
- Tidak ada sistem pembayaran terintegrasi (konfirmasi manual)
- Tidak ada notifikasi otomatis ke pelanggan
- Tidak ada sistem antrian/blackout date kendaraan
- Tidak ada pengecekan konflik jadwal sewa kendaraan yang sama
- Tidak ada fitur pencarian teks bebas pada katalog

---

## 14. Kriteria Penerimaan

### 14.1 Frontend
| ID | Kriteria | Status |
|----|---------|--------|
| AC-01 | Pelanggan dapat melihat daftar kendaraan tersedia | ✅ |
| AC-02 | Pelanggan dapat filter kendaraan berdasarkan kategori | ✅ |
| AC-03 | Pelanggan dapat melihat detail dan harga kendaraan | ✅ |
| AC-04 | Kalkulasi harga otomatis berjalan saat pilih tanggal | ✅ |
| AC-05 | Form pemesanan berhasil tersimpan ke database | ✅ |
| AC-06 | Kode sewa unik di-generate dan ditampilkan setelah booking | ✅ |
| AC-07 | Pelanggan dapat cek status sewa dengan kode sewa | ✅ |

### 14.2 Backend
| ID | Kriteria | Status |
|----|---------|--------|
| AC-08 | Admin dapat login dengan email + password | ✅ |
| AC-09 | Halaman backend tidak bisa diakses tanpa login | ✅ |
| AC-10 | Dashboard menampilkan statistik real-time | ✅ |
| AC-11 | Admin dapat tambah/edit/hapus kendaraan | ✅ |
| AC-12 | Admin dapat konfirmasi atau batalkan penyewaan pending | ✅ |
| AC-13 | Admin dapat mengubah status penyewaan | ✅ |
| AC-14 | Laporan menampilkan data pendapatan per bulan | ✅ |
| AC-15 | Hanya admin yang bisa mengakses manajemen pengguna | ✅ |
| AC-16 | Staff tidak dapat mengakses halaman users.php | ✅ |

---

## Appendix

### A. Aliran Status Penyewaan (State Machine)
```
                    DIBUAT OLEH PELANGGAN
                            │
                            ▼
                       [MENUNGGU]
                       (pending)
                      /        \
                     /          \
              [KONFIRMASI]   [DIBATALKAN]
              (confirmed)    (cancelled)
                  │
                  ▼
            [BERJALAN]
             (active)
                  │
                  ▼
            [SELESAI]
           (completed)
```

### B. Contoh Kode Sewa
```
RNT-20260322-001  → Booking pertama tanggal 22 Maret 2026
RNT-20260322-002  → Booking kedua tanggal 22 Maret 2026
RNT-20260323-001  → Booking pertama tanggal 23 Maret 2026
```

### C. Akun Default Sistem
| Email | Password | Role |
|-------|----------|------|
| admin@rental.com | password | Admin |

> Ganti password akun default sebelum deployment!

---

*Dokumen ini dibuat berdasarkan analisis kode sumber proyek Web Lanjutan - RentalKu.*
*Terakhir diperbarui: 10 April 2026*
