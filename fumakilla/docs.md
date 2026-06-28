# Fumakilla ERP

Dokumentasi teknis untuk aplikasi internal Fumakilla ERP. Aplikasi ini mengelola customer, inquiry, quotation, renewal, jadwal survey, tindak lanjut after-survey, laporan harian, dan dokumen customer.

## Isi Repository

```text
fumakilla/
├─ docs.md                                # Dokumentasi ini
├─ fumakilla-qc-fullstack-prompt.md       # Arsip spesifikasi aplikasi QC lama
├─ fumakilla-qc/                          # Aplikasi aktif Fumakilla ERP
│  ├─ backend/                            # Express, Prisma, PostgreSQL
│  └─ frontend/                           # Next.js App Router
└─ stitch_integrated_service_erp_system/  # Referensi visual dari Stitch
   ├─ modern_professional/DESIGN.md
   └─ */screen.png
```

> Nama folder `fumakilla-qc` dipertahankan agar path deployment lama tidak berubah. Isi produknya telah menjadi **Fumakilla ERP**, bukan aplikasi quality control.

## Arsitektur

```text
Browser
  │ http://localhost:3003
  ▼
Next.js 14 Frontend
  │ Axios + Bearer JWT
  ▼
Express API
  │ http://localhost:4003/api
  ▼
PostgreSQL (fumakilla_qc)
  │
  └─ uploads/ untuk dokumen customer
```

| Area | Teknologi |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Axios |
| Backend | Express, TypeScript, JWT, bcrypt, multer |
| Database | PostgreSQL 18, Prisma 5 |
| UI | Forest green/off-white, Inter, layout ERP desktop-first |
| Port frontend | `3003` |
| Port backend | `4003` |

## Menjalankan Aplikasi

Pastikan PostgreSQL lokal sudah hidup dan `backend/.env` memiliki `DATABASE_URL` yang valid.

```powershell
# Terminal 1
cd fumakilla/fumakilla-qc/backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev

# Terminal 2
cd fumakilla/fumakilla-qc/frontend
npm install
npm run dev
```

Akses aplikasi pada [http://localhost:3003/login](http://localhost:3003/login).

Login seed awal:

```text
Email    : admin@fumakilla.co.id
Password : fumakilla2026
```

## Konfigurasi Environment

### Backend — `fumakilla-qc/backend/.env`

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/fumakilla_qc?schema=public"
JWT_SECRET="ganti-dengan-random-secret-panjang"
PORT=4003
FRONTEND_URL="http://localhost:3003"
UPLOAD_DIR="./uploads"
```

Jangan commit nilai rahasia ke repository. `DATABASE_URL` aktif menggunakan role database khusus aplikasi.

### Frontend — `fumakilla-qc/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4003/api
```

## Database

Schema Prisma berada di [schema.prisma](fumakilla-qc/backend/prisma/schema.prisma). Entitas utama:

| Entitas | Fungsi |
| --- | --- |
| `User` | Akun pengguna ERP dan role `ADMIN`, `SALES`, `SURVEYOR`, `MANAGER` |
| `Customer` | Profil customer dan informasi operasional lengkap |
| `CustomerFile` | Dokumen yang terhubung langsung ke customer |
| `Inquiry` | Permintaan layanan awal |
| `Quotation` | Penawaran kepada customer |
| `Renewal` | Monitoring masa berlaku agreement |
| `Survey` | Jadwal survey customer |
| `AfterSurvey` | Tindak lanjut laporan survey |
| `DailyReport` | Ringkasan operasi harian |
| `ActivityLog` | Aktivitas terbaru pada dashboard |

Perintah database:

```powershell
cd fumakilla/fumakilla-qc/backend
npx prisma generate
npx prisma db push
npm run db:seed
npx prisma studio
```

`prisma db push --force-reset` menghapus seluruh data. Gunakan hanya untuk development ketika reset memang diinginkan.

## Autentikasi dan Role

1. Pengguna mengirim email dan password ke `POST /api/auth/login`.
2. Backend memverifikasi password dengan bcrypt dan menerbitkan JWT 12 jam.
3. Frontend menyimpan token pada `localStorage` dengan key `fqc_token`.
4. Axios mengirim token sebagai `Authorization: Bearer <token>`.
5. Middleware backend memverifikasi token dan user aktif pada database.

Role yang tersedia:

| Role | Akses utama |
| --- | --- |
| `ADMIN` | Seluruh fungsi ERP, termasuk laporan harian |
| `MANAGER` | Operasi dan laporan harian |
| `SALES` | Inquiry, quotation, customer, renewal |
| `SURVEYOR` | Jadwal survey dan after-survey |

## Modul Frontend

| Path | Modul | Fungsi |
| --- | --- | --- |
| `/login` | Login | Autentikasi pengguna |
| `/dashboard` | Dashboard | KPI operasi, inquiry, renewal, aktivitas terbaru |
| `/customers` | Data Customer | Pencarian, filter, wizard customer, detail customer |
| `/customers/[id]` | Detail Customer | Tab Data Customer dan Upload File |
| `/inquiries` | Inquiry | Daftar dan pembuatan inquiry |
| `/quotations` | Quotation | Daftar penawaran |
| `/renewals` | Renewal | Monitoring agreement yang akan berakhir |
| `/surveys` | Kalender Survey | Jadwal visit/customer survey |
| `/after-surveys` | Kalender After Survey | Monitoring laporan dan follow-up survey |
| `/reports` | Laporan Harian | Ringkasan aktivitas dan produktivitas |

## Customer Management

### Daftar Customer

Tabel awal sengaja ringkas:

1. Nama Customer
2. Nama Perusahaan
3. Alamat Customer (Treatment)
4. Status Customer
5. Customer Segment

Seluruh baris dapat diklik untuk membuka detail. Filter tersedia untuk pencarian, status, segment, segment type, vendor, treatment, dan jenis agreement.

### Wizard Customer

Pembuatan customer memakai wizard agar satu layar berisi maksimal lima input. Tahapnya:

1. Data dasar: customer, perusahaan, alamat treatment, DPP Vendor, DPP FI.
2. Status dan segmentasi: durasi agreement, status, segment, segment type, vendor.
3. Treatment dan PIC Service.
4. PIC Schedule dan data pajak.
5. NPWP dan Quality.
6. PIC Agreement dan PIC Invoice.
7. Alamat invoice dan batas penerimaan invoice.

Pilihan terkontrol:

| Field | Pilihan |
| --- | --- |
| Status Customer | `Renewal`, `Kontrak`, `Non-Kontrak` |
| Segment Type | `B2B`, `B2C` |
| Nama Vendor | `Pestigo`, `Istapest`, `Pascal`, `PCO`, `SPC`, `Riztra` |
| Treatment | `PC`, `RC`, `PCRC`, `Termite`, `Other` |
| Jenis Agreement | `Simple`, `Full` |

Customer Segment mencakup Food & Beverage, Pharmaceutical, Cosmetics, Manufacturing, Warehouse/Logistics, Hotel, Mall, Restaurant/Café, Office, Hospital, School, Retail, berbagai tipe Residential, Oil & Gas, Power Generation, dan Contractor/Construction.

### Detail Customer

Tab **Data Customer** menampilkan setiap field beserta tombol `Edit`. Nilai disimpan satu per satu ke API tanpa keluar dari halaman.

Tab **Upload File** menyimpan file terhadap customer yang sedang dibuka. Format yang diizinkan:

- PDF
- JPG/JPEG, PNG, WEBP
- DOC/DOCX
- XLS/XLSX

Batas file adalah 15 MB. Kategori file: agreement/kontrak, laporan treatment, NPWP, invoice, atau lainnya.

## API

Base URL lokal: `http://localhost:4003/api`.

Semua endpoint ERP memerlukan JWT kecuali login dan health check.

### Public / Auth

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/health` | Status backend |
| `POST` | `/api/auth/login` | Login `{ email, password }` |
| `GET` | `/api/auth/me` | User aktif |

### ERP

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/erp/dashboard` | KPI dan aktivitas dashboard |
| `GET` | `/api/erp/customers` | List customer; query `search`, `status`, `segment`, `segmentType`, `vendorName`, `treatment`, `agreementType`, `page`, `limit` |
| `POST` | `/api/erp/customers` | Membuat customer |
| `GET` | `/api/erp/customers/:id` | Detail customer, riwayat, dan file |
| `PATCH` | `/api/erp/customers/:id` | Mengubah satu atau lebih field customer |
| `POST` | `/api/erp/customers/:id/files` | Upload multipart field `file`, `name?`, `category?`, `description?` |
| `DELETE` | `/api/erp/customers/:customerId/files/:fileId` | Hapus record file |
| `GET/POST/PATCH` | `/api/erp/inquiries` | List, buat, dan update inquiry |
| `GET/POST/PATCH` | `/api/erp/quotations` | List, buat, dan update quotation |
| `GET/POST/PATCH` | `/api/erp/renewals` | List, buat, dan update renewal |
| `GET/POST/PATCH` | `/api/erp/surveys` | List, buat, dan update survey |
| `GET/PATCH` | `/api/erp/after-surveys` | List dan update after survey |
| `GET/POST` | `/api/erp/reports/daily` | List laporan dan membuat laporan harian |

## Upload Storage

File tersimpan pada:

```text
fumakilla-qc/backend/uploads/customers/
```

Backend menyajikan file melalui URL `/uploads/...`. Nama file dinormalisasi dan tipe MIME divalidasi oleh multer.

## Build dan Verifikasi

```powershell
# Backend
cd fumakilla/fumakilla-qc/backend
npm run build

# Frontend
cd ../frontend
npm run type-check
npm run build
```

Pemeriksaan lokal:

```powershell
Invoke-RestMethod http://localhost:4003/api/health
Invoke-WebRequest http://localhost:3003/login -UseBasicParsing
```

## Troubleshooting

### Login gagal atau Prisma mengembalikan error koneksi

1. Pastikan service PostgreSQL berjalan.
2. Periksa `DATABASE_URL` di `backend/.env` tanpa membagikan password.
3. Jalankan `npx prisma db push` dan `npm run db:seed`.
4. Restart backend setelah perubahan `.env` atau Prisma schema.

### `Cannot find module './<chunk>.js'` atau `vendor-chunks/next.js`

Cache `.next` tidak konsisten, biasanya setelah build dijalankan bersamaan dengan Next dev server.

```powershell
cd fumakilla/fumakilla-qc/frontend
Remove-Item .next -Recurse -Force
npm run dev
```

Jangan menjalankan `next build` dan `next dev` pada folder yang sama secara bersamaan. Setelah restart, lakukan hard refresh browser (`Ctrl+F5`).

### Detail customer tidak muncul

1. Pastikan backend pada port `4003` hidup.
2. Pastikan token login masih valid.
3. Buka ulang halaman Customer setelah frontend dev server direstart.
4. Periksa `GET /api/erp/customers/:id` dengan token yang valid.

## Referensi Desain

Sistem visual mengacu pada aset dalam `stitch_integrated_service_erp_system/` dan token pada `modern_professional/DESIGN.md`:

- Primary forest green: `#1F470F`
- Background off-white: `#F9FAF1`
- Font: Inter
- Grid dasar: 8px
- Radius input/button: 8px
- Radius card: 16px

