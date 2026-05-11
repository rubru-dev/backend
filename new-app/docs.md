# RubahRumah — System Documentation

> Dokumen referensi lengkap untuk AI coding agent. Update file ini setiap ada perubahan fitur besar.
> Last updated: 2026-05-11 (Penawaran + Follow Up Attachment)

---

## 0. Changelog Fitur Terbaru (2026-05-11)

### Follow Up, Ads Manual, Golden, dan Penawaran
- **Sales Admin > Follow Up Leads:** Riwayat follow up per client mendukung lampiran gambar JPG/JPEG/PNG dengan preview pada riwayat.
- **BD > Report dan Analytics:** Tambah mode Ads `Actual Meta` dan `Manual`; mode manual memakai data lokal tanpa koneksi token Meta.
- **RubahrumahxGolden > Dashboard Ads:** Tambah mode `Actual Meta` dan `Manual`; `Actual Meta` hanya bisa dilihat Super Admin, user lain otomatis melihat `Manual`. Input metrik manual juga hanya bisa dilakukan Super Admin.
- **RubahrumahxGolden:** Invoice kategori `Payment Golden` yang ditandai `Lunas` memastikan card masuk ke Kanban Sales Golden kolom `Closing` dengan nama client.
- **Kalender Golden:** Assign Kalender Survey Golden dan Kalender After Pengerjaan Golden mengirim notifikasi WhatsApp ke PIC yang ditunjuk.
- **Menu Penawaran:** Tambah menu baru `Penawaran` setelah menu Sales, berisi `Penawaran Desain`, `Penawaran RKR`, `Penawaran Golden`, dan `Penawaran Filter Air`.
- **Penawaran Desain:** Form memilih client, tanggal, dan paket Basic/Standart/Premium/Deluxe; preview mengikuti template `Form Template Penawaran Jasa Desain.docx` dan dapat di-download sebagai PDF via print browser.

---

## 0. Changelog Fitur Terbaru (2026-05-07)

### Sales Admin Product dan Mitra + Golden Sync
- **Menu Telemarketing:** Label grup diganti menjadi `Sales Admin Product dan Mitra`.
- **Sub-menu RKR:** `Follow Up Leads` diganti menjadi `Follow Up Leads RKR`, `Kalender Survey` diganti menjadi `Kalender Survey RKR`, dan `Kanban Telemarketing` diganti menjadi `Kanban Admin Product`.
- **Kalender Survey RKR:** Data tidak lagi digabung dengan Sales Admin; halaman ini hanya mengambil survey dari leads modul `telemarketing`.
- **Sub-menu Golden di Telemarketing:** Tambah `Follow Up Leads Golden`, `Kanban Golden`, `Kalender Survey Golden`, dan `Kalender After Pengerjaan Golden`.
- **Sync Golden:** Sub-menu Golden di Telemarketing memakai modul/data Golden yang sama dengan `RUBAHRUMAHXGOLDEN`, sehingga update dari salah satu menu langsung terlihat di menu lain.

### Filter Air + BD Report Analytics
- **Finance > Invoice & Kwitansi:** Kategori baru `Payment Filter Air`; saat dipilih muncul dropdown jenis `Standart`, `Menengah`, `High`.
- **Finance > AR:** Tab baru `Tagihan Filter Air` mengambil invoice kategori `Payment Filter Air` dan menampilkan jenis Filter Air.
- **Sales Admin Product dan Mitra:** Sub-menu baru `Follow Up Leads Filter Air` dengan jenis `B2C`/`B2B`, `Kalender Survey Filter Air`, dan `Kalender Instalasi Filter Air`.
- **BD:** Sub-menu baru `Report dan Analytics` dengan filter tanggal/bulan/tahun dan tombol PDF/print untuk data Ads & Organik, Sales Admin Rubahrumah, RKR/Mitra/Golden, Closing Rubahrumah/RKR, Closing Golden, dan Closing Filter Air.
- **Schema:** Tambah `Invoice.jenis_filter_air`; database disinkronkan via `prisma db push`.
- **Sales Admin Product dan Mitra:** Urutan submenu dirapikan: Kanban RKR, Kanban Golden, Kanban Filter Air, follow-up/kalender per produk, lalu laporan harian.
- **Finance > Invoice & Kwitansi:** Tambah kategori `Payment RKR`.
- **Finance > AR:** Tambah tab `Tagihan RKR` di sebelah `Tagihan Projek`, mengambil invoice kategori `Payment RKR`.
- **BD > Report dan Analytics:** Tampilan diubah menjadi tab `Semua`, `Ads dan Organik`, data Sales Admin per produk, closing Rubahrumah/RKR, dan closing Golden/Filter Air. Filter kosong menampilkan seluruh data.

### Tutorial SOP Role Access + Image Upload
- **Schema:** Model `Sop` ditambah `roles` JSON serta `image_data`, `image_mime`, dan `image_name` untuk lampiran gambar PNG/JPG/JPEG.
- **Backend:** List/detail SOP memfilter akses berdasarkan role yang diasosiasikan ke SOP; `Super Admin` tetap bisa membuka semua SOP. Create/edit wajib memilih minimal satu role dan menerima gambar data URL.
- **Frontend:** Form SOP memakai multi-select role dari data role existing, mendukung upload gambar dengan preview langsung, detail SOP menampilkan gambar, dan PDF download menyertakan lampiran gambar di halaman sendiri.

### Projek Desain RO
- **Schema:** Model `DesainTimeline` ditambah `ro_id` dengan relasi ke `User`.
- **Backend:** Endpoint `/desain/timeline` create/edit/list/detail/export menyimpan dan mengembalikan data RO.
- **Frontend:** Dialog tambah/edit Projek Desain memiliki field `RO` dari daftar karyawan; nama RO tampil di card, print HTML, PDF timeline, dan summary PDF.

### BD Report Analytics Sync + Tab Gabungan
- **Backend:** `/bd/report-analytics` bagian Ads memakai data realtime Meta API seperti dashboard BD bila token tersedia, dengan fallback lokal. Data organik Instagram/YouTube disync dari akun API sebelum summary dibaca.
- **Frontend:** Tab closing digabung ke tab sales terkait: Rubahrumah + Closing Rubahrumah/RKR, Golden + Closing Golden, Filter Air + Closing Filter Air.
- **PDF/Print:** Tombol PDF selalu mencetak semua summary sesuai filter aktif, bukan hanya tab yang sedang dibuka.

---

## 0. Changelog Fitur Terbaru (2026-05-06)

### Follow Up After Survey, Sales Kanban, AR Golden, Filter Salutation
- **Desain > Follow Up After Survey:** Kolom permanen baru `Outstanding`; auto-ensure kolom permanen tetap dibuat walau database lama sudah punya kolom lain.
- **Desain > Follow Up After Survey:** Tombol `Carry over dari bulan lalu` menyalin card bulan sebelumnya ke bulan target/current, skip duplikat per lead/catatan, dan menggeser deadline ke bulan target bila ada.
- **Sales > Kanban Sales:** Kolom `Outstanding` menjadi permanen dan tidak bisa dihapus; setiap load board otomatis menyalin card Outstanding bulan sebelumnya ke bulan berjalan bila belum ada.
- **Finance > AR:** Tab baru `Tagihan Golden` mengambil invoice kategori `Payment Golden`, menghitung total tagihan, terbayar dari kwitansi invoice lunas, dan outstanding.
- **Finance > Invoice & Kwitansi:** Filter baru `Salutation` (`Mr`/`Mrs`) di daftar invoice/kwitansi; backend `/finance/invoices` menerima query `salutation`.

### Tutorial SOP
- **Schema:** Model baru `Sop` (`sops`) dengan field `nama_sop`, `role`, `tanggal`, `deskripsi`, `created_by`, timestamp.
- **Backend:** Route baru `/api/v1/tutorial/sop`; list/detail butuh permission `tutorial.sop`, sedangkan create/edit/delete hanya `Super Admin`.
- **Frontend:** Sub-menu baru `Tutorial > SOP` untuk list SOP, preview detail saat diklik, dan download PDF per SOP. Super Admin mendapat tombol buat/edit/hapus SOP; role lain hanya preview dan download.
- **RBAC:** Permission ensured baru `tutorial.sop` agar muncul di Admin > Roles.

### RUBAHRUMAHXGOLDEN Follow Up Leads & Kanban Admin
- **Golden > Follow Up Leads:** Tombol `Import Data Klien` disembunyikan khusus modul Golden; opsi jenis `Sanitasi Produk` diganti menjadi `Hygiene Product`.
- **Backend Lead Golden:** Saat lead Golden di-assign projection `W1`/`W2`/`W3`/`W4`, card otomatis dibuat di `RUBAHRUMAHXGOLDEN > Kanban Admin` pada bulan/tahun lead terkait dan dicegah duplikat per lead.
- **Golden > Kanban Admin:** Kolom permanen `Move To Telemarketing` diganti menjadi `Outstanding`; carryover hanya menyalin card dari kolom `Outstanding` bulan sebelumnya ke bulan target dan skip card yang sudah ada.

---

## 0. Changelog Fitur Terbaru (2026-05-05)

### Follow Up Leads — Salutation Mr/Mrs
- **Schema:** Tambah `Lead.salutation` (`Mr`/`Mrs`, nullable) untuk membedakan sapaan klien tanpa menggabungkannya ke field `nama`.
- **Backend `bd.ts`:** Create/edit/bulk import leads menerima `salutation`; response leads menambahkan `display_name` = `"Mr/Mrs Nama"` jika salutation tersedia.
- **Frontend `follow-up-leads.tsx`:** Form tambah/edit lead memiliki dropdown Salutation; tabel, PDF riwayat/laporan, dan export Excel memakai nama tampilan berawalan salutation.
- **Finance invoice/kwitansi:** `finance.ts` mengirim `lead.salutation`, `lead.display_name`, dan `klien` berawalan salutation; halaman Invoice & Kwitansi serta PDF invoice/kwitansi otomatis menampilkan `Mr/Mrs` di depan nama klien.
- **DB update required:** jalankan migrasi/SQL `ALTER TABLE leads ADD COLUMN IF NOT EXISTS salutation VARCHAR(10);` atau `prisma db push` sebelum memakai field ini di database lama.

---

## 0. Changelog Fitur Terbaru (2026-04-20)

### RubahrumahxGolden — Dokumentasi Lengkap + Responsive + GPS Timestamp

#### 1. GPS Lokasi di Timestamp Foto (Kalender Survey & After Pengerjaan)
- **File:** `components/kalender-survey.tsx`, `components/kalender-pengerjaan.tsx`
- Fungsi `addTimestamp(dataUrl, coords?)` sekarang menerima koordinat GPS opsional
- Helper `getLocation()` → Geolocation API, timeout 6 detik, fallback `null` (jika user tolak izin)
- Saat upload foto survey/pengerjaan: GPS diambil terlebih dahulu, lalu di-overlay ke foto via Canvas
- Overlay: waktu (dd/mm/yyyy, HH:MM:SS) + koordinat GPS (lat 5 desimal, lng 5 desimal) — teks kuning di atas background gelap semi-transparan di sudut kanan bawah
- Lokasi otomatis terlihat dalam PDF saat download (karena sudah tertanam di dalam gambar)
- Graceful fallback: jika GPS tidak tersedia, hanya tampil timestamp tanpa koordinat

#### 2. Sub Role Mitra — Tanpa Dashboard
- **File:** `components/layout/sidebar.tsx` — Dashboard link disembunyikan untuk `user.sub_role === "Mitra"` (sebelumnya hanya Tukang)
- **File:** `hooks/useAuth.ts` — Setelah login, Mitra redirect ke `/golden/kanban-sales` (bukan `/dashboard`)
- Sidebar Mitra hanya menampilkan menu sesuai permission yang di-assign admin via `/admin/roles`

#### 3. Permission Kalender After Pengerjaan Golden
- **File:** `backend/src/routes/admin.ts` — Tambah `golden.kalender_after` ke `ENSURED_PERMISSIONS` (auto-muncul di matrix roles tanpa seeder)
- **File:** `components/layout/sidebar-nav.ts` — Item baru "Kalender After Pengerjaan" (icon Hammer) → `/golden/kalender-after`, permission `golden.kalender_after`
- **File:** `app/(dashboard)/golden/kalender-survey/page.tsx` — Sekarang hanya KalenderSurvey
- **File baru:** `app/(dashboard)/golden/kalender-after/page.tsx` — Halaman khusus KalenderAfterPengerjaan
- `components/layout/sidebar.tsx` — Tambah `Hammer` ke ICON_MAP

#### 4. Responsive Fixes — Semua Layar termasuk Mobile
- `kalender-survey.tsx` stats grid: `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`
- `kalender-pengerjaan.tsx` stats grid: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
- `kalender-survey.tsx` header buttons: tambah `flex-wrap justify-end`
- `follow-up-leads.tsx` header: `flex items-center justify-between` → `flex flex-col sm:flex-row`, buttons abbreviated di mobile (PDF/Excel label singkat via `hidden sm:inline`)

---

## 0. Changelog Fitur Terbaru (2026-04-13)

### Form Checklist — Tab Baru di Projek Sipil & Interior
- **Schema baru:** `ChecklistSipil` (table `checklist_sipils`), `ChecklistInterior` (table `checklist_interiors`)
  - Fields: `id`, `proyek_id`, `nama_pekerjaan`, `gambar_path` (nullable, foto pekerjaan), `gambar_selesai_path` (nullable, foto setelah selesai), `is_checked` (boolean), `urutan`, `created_at`, `updated_at`
  - Relasi: → `ProyekBerjalan` (sipil) / `ProyekInterior` (interior), cascade delete
- **Backend Sipil (`sipil.ts`):**
  - `GET /sipil/projeks/:id/checklist` — list items ordered by urutan
  - `POST /sipil/projeks/:id/checklist` — create (multipart: `nama_pekerjaan` + optional `gambar`)
  - `PATCH /sipil/checklist/:cid` — update nama/status/gambar/gambar_selesai (multipart fields)
  - `DELETE /sipil/checklist/:cid` — hapus + cleanup kedua file fisik
- **Backend Interior (`interior.ts`):**
  - `GET /interior/projeks/:id/checklist` — list
  - `POST /interior/projeks/:id/checklist` — create (multipart)
  - `PATCH /interior/projeks/checklist/:cid` — update (multipart fields: `gambar`, `gambar_selesai`)
  - `DELETE /interior/projeks/checklist/:cid` — hapus
- **Frontend API:** `sipilApi.getChecklist/addChecklistItem/updateChecklistItem/deleteChecklistItem`, sama untuk `interiorProjekApi`
- **Frontend UI:** Tab "Form Checklist" (icon CheckSquare) di detail projek sipil `[id]` dan interior `[id]`
  - Tabel: No, Gambar Pekerjaan, Nama Pekerjaan, Foto Selesai, Status (checkbox + label), Aksi (hapus)
  - Form tambah: input nama pekerjaan + pilih foto (opsional) + preview
  - Checkbox toggle: klik → buka dialog "Tandai Pekerjaan Selesai" dengan opsi upload foto selesai (opsional)
  - Uncheck: langsung update tanpa dialog
  - Row yang sudah di-check mendapat highlight hijau
  - **Download PDF:** tombol "Download PDF" di header → generate PDF dengan header company, info proyek, summary (total/selesai/belum), tabel checklist lengkap gambar
- **PDF Component:** `checklist-pdf.tsx` — orange theme, logo, tabel No/Gambar/Nama/Foto Selesai/Status
- **Storage:** Sipil → `storage/sipil-docs/`, Interior → `storage/interior/` (reuse multer existing)

---

## 0. Changelog Fitur Terbaru (2026-04-10)

### Task 1: Galeri & Dokumen Folder — Tambah File ke Folder yang Sudah Ada
- **File:** `new-app/frontend/src/app/(dashboard)/client/[id]/page.tsx`
- **TabGaleri:** Saat masuk ke dalam folder, muncul form "Tambah Foto ke Folder Ini" (tanggal + pilih file + upload). Upload menggunakan `judul` = nama folder yang sedang dibuka, sehingga foto baru masuk ke folder yang sama. Form "Upload ke Folder Baru" hanya tampil di folder list view.
- **TabDokumen:** Saat masuk ke dalam folder, muncul form "Tambah File ke Folder Ini" (kategori + tanggal + pilih file + upload). Upload menggunakan `folder_name` = nama folder yang sedang dibuka. Form "Upload ke Folder Baru" hanya tampil di folder list view.
- **Backend:** Tidak ada perubahan — backend sudah support upload dengan `folder_name`/`judul` yang sama (grouping by nama).

### Task 2: Invoice Assign — Merged ke Tab Pembayaran
- **Perubahan:** Tab "Invoice Portal" yang terpisah dihapus. Fungsionalitas assign/unassign invoice dari Finance dipindah ke dalam **tab Pembayaran** (`TabPembayaran`).
- Tombol "Tambah Invoice" di section "Invoice & Kwitansi (dari Finance)" membuka dialog daftar invoice assignable (status Terbit/Lunas).
- Tiap baris invoice di tabel ada tombol X untuk unassign.
- Komponen `TabInvoiceAssign` dihapus (dead code).
- **Backend:** Tidak ada perubahan — endpoint `GET /projects/:id/assignable-invoices`, `POST assign`, `DELETE unassign` tetap sama.

### Task 5: Nested Folder (Termin → Item Pekerjaan) di Galeri Portal Klien
- **Backend (`picProject.ts`):** Mirror sekarang pakai format `judul = "${terminName} ‖ ${namaPekerjaan}"` — delimiter ` ‖ ` (U+2016) dipakai sebagai separator dua level folder. Contoh: `"Termin 1 - Pondasi ‖ Galian Tanah"`.
- **Frontend (`rubahrumah/app/(client)/galeri/page.tsx`):** Parse `judul` dengan split ` ‖ ` → bangun 2-level hierarchy:
  - Level 1: termin (root folder)
  - Level 2: nama pekerjaan (sub-folder)
  - Level 3: foto
  - Navigasi: klik termin → grid sub-folder item pekerjaan → klik sub-folder → grid foto → klik foto → lightbox
  - Breadcrumb: `Galeri / Termin 1 / Galian Tanah`
  - Folder manual (tanpa delimiter, upload via client management page) tetap flat (langsung ke foto, tanpa sub-folder) — backward compat
- **State baru:** `activeSubFolder` di komponen `GaleriPage`. Reset ke `null` saat back ke level 1 atau search.
- **New-app client management:** TabGaleri tidak diubah — admin tetap lihat flat folder dengan nama `"Termin 1 ‖ Galian Tanah"`. Cukup untuk keperluan admin view.

### Task 4: Auto-Mirror Foto PIC Dokumentasi Projek → Galeri Portal Klien
- **Use case:** PIC upload foto dokumentasi via menu Projek → Upload Dokumentasi Projek (halaman `/pic/dokumentasi`). Sekarang foto otomatis muncul juga di tab Galeri portal klien terkait (tanpa re-upload manual).
- **Backend — `picProject.ts`:**
  - `POST /pic/tasks/sipil/:taskId/fotos` — setelah bikin `proyekBerjalanTaskFoto`, cari `ClientPortalProject` via chain `task.termin.proyek_berjalan.lead.client_portal_project`. Kalau ada, bikin entry `ClientPortalGaleri` untuk setiap foto dengan:
    - `judul` = nama termin (jadi folder di galeri klien per-termin)
    - `deskripsi` = `nama_pekerjaan — keterangan`
    - `file_path` = path sama persis dengan foto PIC (`/storage/pic-docs/...`) — tidak copy file, cuma reuse
    - `tanggal_foto` = now
  - `POST /pic/tasks/interior/:taskId/fotos` — sama, via chain `task.termin.proyek_interior.lead.client_portal_project`
  - `DELETE /pic/fotos/sipil/:fotoId` + `/interior/:fotoId` — juga `deleteMany` `ClientPortalGaleri` dengan `file_path` yang match (mirror dihapus bareng)
- **Backend — `clientPortal.ts` GET /galeri + /dokumen:** `file_url` sekarang return `file_path` as-is kalau sudah prefix `/storage/`, jadi foto dari `pic-docs/` folder bisa di-serve. Fallback lama (rekonstruksi `/storage/client-portal/galeri/` + basename) dipertahankan untuk upload manual via client management page.
- **Tidak ada perubahan schema:** pakai kolom existing `file_path` sebagai "link" — tidak perlu kolom source-tracking baru.
- **Syarat:** Lead project harus punya `ClientPortalProject` (via `client_portal_project.lead_id`). Kalau belum di-setup di menu Client Management, foto tetap ter-upload tapi tidak di-mirror (silent skip).

### Task 3: Fix Field Mismatch di Tabel Invoice Pembayaran + Invoice Download di Client Portal
- **Bug fix (new-app):** Tabel "Invoice & Kwitansi (dari Finance)" di `TabPembayaran` menampilkan `Rp 0` dan nomor invoice kosong karena frontend pakai `inv.nomor_invoice` / `inv.total` / `inv.head_finance_signed_at`, sedangkan backend return `invoice_number` / `grand_total` / `head_finance_at`. Frontend disesuaikan ke nama field backend.
- **Backend (new-app):** Endpoint baru `GET /client-portal/invoices/:id` — return detail invoice lengkap (items, lead info, bank_account, kwitansi) untuk preview/download oleh client portal. Hanya return invoice yang di-assign ke portal project milik token user (`client_portal_project_id == req.clientPortal.projectId`) dan status `Terbit`/`Lunas`.
- **Backend (new-app):** Endpoint `GET /client-portal/invoices` — field `kwitansi` direname: `tanggal` → `tanggal_bayar`, tambah `metode_bayar` dan `nomor_kwitansi` agar sesuai dengan interface frontend portal.
- **Client Portal (rubahrumah):** `pembayaran/page.tsx` — tambah tombol "Download" per baris invoice (desktop + mobile). Klik tombol buka modal preview invoice dalam format print-friendly (logo + company info + items table + totals + bank account + kwitansi). Tombol "Cetak / Download PDF" di modal trigger `window.print()`, user bisa save sebagai PDF via dialog print browser.
- **CSS (rubahrumah):** `globals.css` — tambah `@media print` rule: hide semua element kecuali `#invoice-print-area`, kelas `.print:hidden` pada action bar modal agar tidak ikut ke-print. A4 page size 15mm margin.
- **API Client (rubahrumah):** `portalApi.invoiceDetail(id)` — wrapper untuk GET `/invoices/:id`.
- **Dependencies:** Tidak ada tambahan library — murni HTML + Tailwind + `window.print()`. Tidak perlu `@react-pdf/renderer` di rubahrumah (agar tetap lightweight).

---

## 0. Changelog Fitur Terbaru (2026-04-09)

### Task 3: Reminder WhatsApp Kalender Visit (Fontee, harian 08:00)
- **File baru:** `new-app/backend/src/lib/kalenderVisitReminder.ts`
  - Cron `0 8 * * *` (node-cron, TZ server = WIB) — query semua `KalenderVisit.tanggal = today`, kirim WA via `sendFonnte` ke setiap PIC (`KalenderVisitPic.user.whatsapp_number`)
  - Idempotent: pakai `AppSetting` key `kalender_visit_reminder_last_run` (value `{ date: "YYYY-MM-DD" }`) untuk skip kalau sudah jalan hari ini (proteksi dari restart server)
  - Pesan: "🔔 Reminder Kunjungan Hari Ini" + nama_projek, tanggal (lokal ID), jam (kalau ada), keterangan
  - Export `sendKalenderVisitReminders(force?)` untuk testing manual via REPL/script
- **Wire-up:** `new-app/backend/src/index.ts` — import `startKalenderVisitReminder` + call setelah `startMetaAutoRefresh()` di `app.listen` callback
- **Catatan:** PIC tanpa `whatsapp_number` di-skip; error per-user di-log tapi tidak menghentikan loop (fire-and-forget pattern)

### Task 1: Permission Kalender Visit dapat dikelola via Admin Roles
- **File:** `new-app/backend/src/routes/admin.ts` — `GET /admin/permissions` sekarang auto-upsert permission `pic.kalender_visit` (via array `ENSURED_PERMISSIONS`) sehingga muncul di matrix tanpa perlu re-run seeder
- Sidebar item "Kalender Visit" (`/pic/kalender-visit`) sudah pakai `permission: "pic.kalender_visit"` — sekarang Super Admin bisa assign permission ini ke role manapun via `/admin/roles`
- Untuk menambah permission "ensured" baru: append entry ke array `ENSURED_PERMISSIONS` di `admin.ts`

### Task 2: Edit Invoice sebelum Tanda Tangan
- **Backend `finance.ts` PATCH `/invoices/:id`:**
  - Tambah guard: tolak jika `head_finance_id` ATAU `admin_finance_id` sudah terisi → "Invoice yang sudah ditandatangani tidak bisa diubah"
  - Sekarang menerima full payload: `nomor_invoice, lead_id, tanggal, overdue_date, catatan, ppn_percentage, bank_account_id, items[]`
  - Bila `items` dikirim → hapus semua `InvoiceItem` lama dan re-create, recalc `subtotal`/`ppn_amount`/`grand_total`
- **Frontend `finance/invoice-kwitansi/page.tsx`:**
  - Tambah state `editId`, mutation `updateMut`, API `api.update`
  - Tombol Edit (icon Pencil) muncul di kolom aksi hanya saat `inv.status === "Draft" && !inv.head_finance && !inv.admin_finance`
  - Klik Edit → reuse dialog "Buat Invoice" dengan title "Edit Invoice", form pre-filled dari row, tombol berubah jadi "Simpan Perubahan"
  - Dialog reset state (`editId`, `form`, `leadSearch`) saat ditutup atau batal

---

## 0. Changelog Fitur Terbaru (2026-04-03)

### Task 1: Rename Kanban Paket Desain → Progress Desain
- **File:** `new-app/frontend/src/components/layout/sidebar-nav.ts` — label "Kanban Paket Desain" → "Progress Desain"
- **File:** `new-app/frontend/src/app/(dashboard)/desain/kanban-paket-desain/page.tsx` — page title renamed
- **File:** `new-app/backend/src/routes/desain.ts` — `PATCH /desain/kanban-paket/cards/:id/move` — hapus auto-update DesainTimelineItem statuses (putus koneksi ke Projek Desain)

### Task 2: Sub menu Projek Desain pindah ke menu Desain
- **File:** `new-app/frontend/src/components/layout/sidebar-nav.ts`
- Hapus "Projek Desain" dari grup Projek, tambah ke grup Desain (permission: `projek_desain.view`)

### Task 3: Hapus menu Absen dari sidebar
- **File:** `new-app/frontend/src/components/layout/sidebar-nav.ts` — hapus grup "Absen" (`alwaysShow: true`, `/karyawan/absen`)

### Task 4: PIC Kalender Visit + Upload Dokumentasi pindah ke menu Projek
- **File:** `new-app/frontend/src/components/layout/sidebar-nav.ts`
- Hapus dari PIC Project group, tambah ke Projek group dengan nama "Upload Dokumentasi Projek"
- Projek group sudah include roles: ["Sales", "PIC Project"] sebagai fallback

### Task 5: Role Tukang — hanya tampil menu Tukang, tanpa Dashboard
- **File:** `new-app/frontend/src/components/layout/sidebar.tsx` — Dashboard link dibungkus `!hasAnyRole("Tukang")`
- **File:** `new-app/frontend/src/hooks/useAuth.ts` — setelah login cek role Tukang → redirect ke `/absen` bukan `/dashboard`

### Task 6: Client Portal — hapus tab Pembayaran
- **File:** `new-app/frontend/src/app/(dashboard)/client/[id]/page.tsx` — hapus TabTrigger + TabContent "pembayaran"

### Task 7: Rubahrumah — hapus tab Kehadiran Tukang
- **File:** `rubahrumah/app/(client)/aktivitas/page.tsx` — hapus tab "kehadiran" dari list, hapus kehadiran state + fetch + content

### Task 8: Website Public — fix portofolio kategori filter
- **File:** `website-rubahrumah/apps/web-rubahrumah/src/app/portofolio/filter.tsx`
- Nilai filter disesuaikan dengan yang tersimpan di DB: `BANGUN_RUMAH`→`BANGUN`, `DESIGN`→`DESAIN`

### Task 9: Website Public — fix artikel formatting (typography)
- **File:** `website-rubahrumah/apps/web-rubahrumah/package.json` — tambah `@tailwindcss/typography` ke devDependencies
- **File:** `website-rubahrumah/apps/web-rubahrumah/tailwind.config.ts` — tambah `require("@tailwindcss/typography")` ke plugins
- **Action required:** jalankan `npm install` di folder `website-rubahrumah/apps/web-rubahrumah/`

---

## 0. Changelog Fitur Terbaru (2026-03-30)

### Task 1: Fix Auth Redirect Loop
- **File:** `new-app/frontend/src/lib/api/client.ts`
- Saat access token expired + refresh gagal → hapus cookie `is_authed` sebelum redirect ke `/login`
- `document.cookie = "is_authed=; path=/; max-age=0"` sebelum `window.location.href = "/login"`
- **File:** `new-app/frontend/src/app/(auth)/login/page.tsx` + `hooks/useAuth.ts`
- Hapus `router.refresh()` setelah `router.push("/dashboard")` — mencegah login loop

### Task 2: Default Pekerjaan Projek Desain (6 item)
- **File:** `new-app/backend/src/routes/desain.ts`
- `DEFAULT_PEKERJAAN` diupdate menjadi 6 item: Layout Eksisting, Fasad 3D, 3D Interior, RAB, Presentasi RAB, **Shop Drawing**
- Order: Layout → Fasad → 3D Interior → RAB → Presentasi RAB → Shop Drawing

### Task 3: Hapus Progress Bar dari Kanban Paket Desain
- **File:** `new-app/frontend/src/app/(dashboard)/desain/kanban-paket-desain/page.tsx`
- Progress bar (div h-1.5) dihapus dari tiap card — card lebih ringkas

### Task 4: Kanban Tab di Projek Desain
- **File:** `new-app/frontend/src/app/(dashboard)/projek/desain/page.tsx`
- Tambah tab "Kanban" sejajar dengan Docs/Link
- 3 kolom: Belum Mulai (abu), Proses (biru), Selesai (hijau)
- Drag card → update `status` item via `updateItem` mutation (field `DesainTimelineItem.status`)
- Klik card → buka dialog edit (reuse dialog yang sama: progress, deadline, tanggal mulai/selesai, PIC)
- **Backend:** `PATCH /desain/kanban-paket/cards/:id/move` juga auto-update status item (≤stage → Proses, >stage → Belum Mulai)

---

## 0. Changelog Fitur Terbaru (2026-03-29)

### Task 1: Field RO di Follow Up Survey (Desain Kanban)
- **Schema:** Tambah `ro_id BigInt?` di `DesainKanbanCard` → relasi ke `User` ("DesainKanbanCardRO")
- **Backend `desain.ts`:** GET kanban include `ro`, POST/PATCH card accept `ro_id`
- **Frontend `desain/follow-up-survey/page.tsx`:** Card dialog tambah dropdown RO (dari `/desain/employees`), card tampilkan RO badge ungu

### Task 2: Kanban Paket Desain (sub menu Desain)
- **Schema:** Tambah `paket_stage Int? @default(0)` di `DesainTimeline`
- **Backend `desain.ts`:**
  - `GET /desain/kanban-paket` — 6 kolom tetap (Pembuatan Layout Eksisting & Perubahan, Fasad 3D, 3D Interior, RAB, Presentasi RAB, Shop Drawing), cards = DesainTimeline dikelompokkan by `paket_stage`
  - `PATCH /desain/kanban-paket/cards/:id/move` — update `paket_stage` di DesainTimeline
- **Frontend:** `/desain/kanban-paket-desain/page.tsx` — kanban drag-and-drop, progress bar per card
- **Sidebar Desain:** tambah item "Kanban Paket Desain" → `/desain/kanban-paket-desain` (permission: `desain.view`)
- **desainApi:** `getKanbanPaket`, `moveKanbanPaket`
- **Link ke Projek Desain:** saat paket_stage diupdate di kanban → DesainTimeline.paket_stage terupdate (field yang sama dibaca dari projek desain juga)

### Task 3: Field RO di Projek Sipil
- **Schema:** Tambah `ro_id BigInt?` di `ProyekBerjalan` → relasi ke User ("ProyekBerjalanRO"), existing pic relation renamed "ProyekBerjalanPIC"
- **Backend `sipil.ts`:** GET/POST/PATCH projeks include/accept `ro_id`, return `ro: { id, nama }`
- **Frontend `projek/sipil/page.tsx`:** Tabel tambah kolom RO, form dialog tambah dropdown RO

### Task 4: Kalkulator website — hapus tombol Hitung Biaya
- **File:** `website-rubahrumah/apps/web-rubahrumah/src/components/sections/kalkulator.tsx`
- Tombol "Hitung Biaya" dihapus — hanya tersisa "Konsultasi Sekarang"

### Task 5: Kalkulator website — kamar tidur & mandi per-lantai
- **File:** `website-rubahrumah/apps/web-rubahrumah/src/components/sections/kalkulator.tsx`
- State kamar tidur/mandi berubah dari single number ke array per lantai
- Ketika lantai = 2 atau 3, tampil input terpisah per lantai (Lantai 1, Lantai 2, dst)
- Surcharge kamar tidur: `SURCHARGE["KAMAR_TIDUR"] ?? 50_000`, kamar mandi: `SURCHARGE["KAMAR_MANDI"] ?? 80_000`
- WA message di-update untuk include detail per lantai

---

## 0. Changelog Fitur Terbaru (2026-03-28)

### Task 1: Foto Dokumentasi Projek
- **Prisma model baru:** `ProjekFotoDokumentasi` — foto dokumentasi per projek (adm_finance_projects)
  - Fields: `id`, `project_id`, `judul`, `deskripsi`, `foto_data` (base64 text), `tanggal_foto`, `uploaded_by`, `created_at`
  - Relasi: → `AdmFinanceProject`, → `User` (named: `"ProjekFotoDokumentasiUploader"`)
- **Backend routes** (finance.ts):
  - `GET /finance/adm-projek/:id/foto-dokumentasi` — list foto, ordered by tanggal_foto desc
  - `POST /finance/adm-projek/:id/foto-dokumentasi` — upload foto (foto_data: base64, judul?, deskripsi?, tanggal_foto?)
  - `DELETE /finance/adm-projek/:id/foto-dokumentasi/:fid` — hapus foto
- **Frontend:**
  - `DokumentasiTab` component di `finance/administrasi-projek/page.tsx` — tab ke-6 di projek detail
  - Grid 4 kolom, lightbox on click, delete on hover
  - `/absen` (Tukang): section "Foto Dokumentasi" — upload foto projek dari halaman absen
  - `/pic/dokumentasi` (PIC): halaman baru untuk upload dokumentasi, pilih proyek dulu
  - Sidebar PIC: ditambah item "Upload Dokumentasi" → `/pic/dokumentasi`
- **admApi:** `getFotoDokumentasi`, `addFotoDokumentasi`, `deleteFotoDokumentasi`

### Task 2: Kalender Survey Gabungan (Database Client)
- **Backend `bd.ts`:**
  - `GET /bd/:modul/survey-kalender` — ditambah query params: `show_all=true` (semua modul), `user_id` (filter by inputter)
  - `GET /bd/survey-kalender/users` — list users yang pernah input lead dengan rencana_survey=Ya
- **Frontend `KalenderSurvey` component** (`components/kalender-survey.tsx`):
  - Props baru: `showAll?: boolean`
  - Ketika `showAll=true`: pass `show_all=true` ke API, fetch dropdown inputter dari `/bd/survey-kalender/users`
  - Filter dropdown "Semua Inputter" muncul di header ketika `showAll=true`
  - Modul badge (SA/TM) tampil di calendar cell entries dan detail panel
  - PDF label: "Semua Modul" ketika showAll=true
- **Page:** `/database-client/kalender-survey` — menggunakan `<KalenderSurvey modul="sales-admin" showAll />`

### Task 3: Database Client
- **Backend `bd.ts`:**
  - `GET /bd/database-client/leads` — tanpa permission check (cukup authenticate), filter: search, status, jenis, modul, page, limit=20
  - Response: `{ items, total, total_pages }` dengan follow_ups last-5 per lead
- **Frontend:**
  - `/database-client/page.tsx` — unified view all leads (Sales Admin + Telemarketing)
  - Filters: search nama/telepon, status, jenis, modul, pagination
  - Expandable rows dengan riwayat follow-up + inline add follow-up form
- **Sidebar:** Grup "Database Client" (warna #0ea5e9, permission: `sales_admin.view`)
  - Items: "Data Klien" → `/database-client`, "Kalender Survey (Gabungan)" → `/database-client/kalender-survey`

### Task 4: Desain Follow Up After Survey (Kanban)
- **Prisma models baru:** `DesainKanbanColumn`, `DesainKanbanCard`
  - Card punya named relations: `"DesainKanbanCardLead"` (→ Lead), `"DesainKanbanCardAssignee"` (→ User)
- **Backend routes** (desain.ts):
  - `GET /desain/kanban` — fetch columns+cards, seeds 5 default columns on first call
  - `GET /desain/kanban/leads` — leads dengan rencana_survey=Ya untuk dropdown
  - `POST /desain/kanban/columns` — buat column
  - `PATCH /desain/kanban/columns/:id` — edit column (title, color)
  - `DELETE /desain/kanban/columns/:id` — hapus column (blocked if is_permanent=true)
  - `POST /desain/kanban/columns/:id/cards` — buat card
  - `PATCH /desain/kanban/cards/:id` — update card (supports column_id untuk drag-and-drop)
  - `DELETE /desain/kanban/cards/:id` — hapus card
- **Frontend:** `/desain/follow-up-survey/page.tsx` — kanban board HTML5 drag-and-drop native
- **Sidebar Desain:** ditambah item "Follow Up After Survey" → `/desain/follow-up-survey`
- **desainApi** (`lib/api/content.ts`): `getKanban`, `getKanbanLeads`, `createColumn`, `updateColumn`, `deleteColumn`, `createCard`, `updateCard`, `deleteCard`

### Task 15 (sebelumnya): Kalkulator CRUD
- **Kalkulator config** diubah dari flat `{ KEY: number }` ke array `[{ key, label, harga, satuan }]`
- **Backend:** `PUT /website/kalkulator` terima `base_prices` dan `surcharges` sebagai array atau object
- **Dashboard `/website/kalkulator`:** tabel CRUD per item (tambah/edit/hapus baris)
- **website-rubahrumah:** `normalizePrices()` handles both format lama dan baru secara transparan

---

## 0. Changelog Fitur Terbaru (2026-03-24)

### Website Content Management (integrasi dashboard ↔ website-rubahrumah)
- **Prisma models baru:** `RbSiteConfig`, `RbBanner`, `RbKalkulatorConfig`, `RbPortfolio`, `RbPortfolioImage`, `RbProject`, `RbProjectImage`, `RbArtikel`, `RbWebsiteLead`
- **Backend public routes** (tanpa auth, untuk website): `GET /v1/public/rb/*`
  - `/config`, `/banner`, `/portfolio`, `/portfolio/:slug`, `/project`, `/project/:slug`
  - `/artikel`, `/artikel/kategori`, `/artikel/:slug`, `/kalkulator`, `/leads` (POST)
- **Backend admin routes** (auth required): `GET|PUT /api/v1/website/config|kalkulator`
  - `GET|POST|PATCH|DELETE /api/v1/website/banner`
  - `GET|POST|PATCH|DELETE /api/v1/website/portfolio` + `/portfolio/:id/images/*`
  - `GET|POST|PATCH|DELETE /api/v1/website/project` + `/project/:id/images/*`
  - `GET|POST|PATCH|DELETE /api/v1/website/artikel`
  - `GET /api/v1/website/leads`
- **Frontend pages** di `/website/*` (hanya Super Admin — `admin.view` permission):
  - `/website/config` — Kontak, WhatsApp, alamat, statistik homepage
  - `/website/banner` — Upload/kelola hero carousel
  - `/website/portofolio` — CRUD portofolio + upload foto
  - `/website/projek-berjalan` — CRUD projek aktif + upload foto + progress slider
  - `/website/artikel` — Tulis/edit artikel (HTML/plain text, cover photo)
  - `/website/kalkulator` — Edit harga dasar paket & surcharge material
- **Sidebar:** Grup "Website" (warna orange, setelah PIC Project, sebelum Admin)
- **API client:** `new-app/frontend/src/lib/api/website.ts`
- **Image storage:** `backend/storage/website/{banner|portfolio|project|artikel}/`
- **Koneksi website-rubahrumah:** set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
  (tidak perlu `/api` prefix karena public routes di-mount di `/v1/public/rb/*`)
  **Atau:** ubah ke `NEXT_PUBLIC_API_URL=http://localhost:8000` dan gunakan `/api/v1` prefix di `api.ts`

---

## 0. Changelog Fitur Terbaru (2026-03-17)

### Kanban Sales — Column Drag-and-Drop
- Kolom di Kanban Sales sekarang bisa digeser (drag-and-drop horizontal).
- Drag handle: ikon GripVertical di setiap header kolom.
- Backend: `POST /api/v1/sales/kanban/columns/reorder` — body `{ column_ids: number[] }` (urutan baru).
- Frontend: `salesKanbanApi.reorderColumns(ids)` di `lib/api/kanban.ts`.
- PDF tetap include semua kolom (termasuk user-added columns) dari `colStats`.

### Leads — Field Projection (W1-W4)
- Model `Lead` ditambah field `projection String? @db.VarChar(10)`.
- Form Follow-Up Leads (telemarketing/sales-admin) menampilkan dropdown Projection: W1, W2, W3, W4.
- Saat lead dibuat dengan projection diisi, otomatis membuat card di kolom Kanban yang sesuai (W1/W2/W3/W4) untuk bulan/tahun saat ini.
- Backend: handler `POST /:modul/leads` di `bd.ts` — auto-create AdminKanbanCard atau TelemarketingKanbanCard.

### Sales Admin Kanban — Move To Telemarketing (data lengkap)
- Saat card dipindah ke kolom "Move To Telemarketing", backend sekarang fetch lead's `nomor_telepon` + `alamat`.
- Card yang dibuat di TM Kanban "From Sales Admin" sudah include No. HP dan Alamat di field description.
- File: `salesAdminKanban.ts` → handler `POST /kanban/cards/:id/move`.

### Dashboard — Panel Kirim & Riwayat Pesan WhatsApp
- Dashboard menampilkan 2 panel baru: "Kirim Pesan WhatsApp" dan "Riwayat Notifikasi".
- Kirim pesan langsung via Fonnte API; disimpan ke tabel `notification_logs`.
- Backend: `POST /api/v1/notifications/send`, `GET /api/v1/notifications/history`.
- Model baru: `NotificationLog` — id, sender_user_id, sender_name, target_number, message, status, created_at.

### Reminder Rules — Custom Waktu (jam:menit) + Item Pekerjaan
- `FonteeReminderRule` ditambah field `send_time String @default("08:00")` — waktu pengiriman (HH:MM).
- UI Reminder Rules di `/admin/settings` tab "Reminder Rules" menampilkan input jam kirim di samping "hari sebelum".
- Backend: `PUT /admin/settings/reminder-rules/:id` sekarang terima `send_time`.
- Reminder baru ditambahkan ke seeder: `item_pekerjaan_sipil`, `item_pekerjaan_desain`, `item_pekerjaan_interior`.

---

## 0.X RubahrumahxGolden — Dokumentasi Lengkap

### Struktur Menu & Permissions

| Label Sidebar | URL | Permission | Ikon |
|---------------|-----|------------|------|
| Dashboard Ads | `/golden/dashboard-ads` | `golden.dashboard_ads` | BarChart2 |
| Meta Ads | `/golden/meta-ads` | `golden.meta_ads` | TrendingUp |
| Follow Up Leads | `/golden/follow-up` | `golden.follow_up` | PhoneCall |
| Kanban Admin | `/golden/kanban-admin` | `golden.kanban_admin` | Kanban |
| Kalender Survey | `/golden/kalender-survey` | `golden.kalender` | CalendarDays |
| Kalender After Pengerjaan | `/golden/kalender-after` | `golden.kalender_after` | Hammer |
| Kanban Sales | `/golden/kanban-sales` | `golden.kanban_sales` | LayoutDashboard |

- **Group permission:** `golden.view` → tampilkan grup "RubahrumahxGolden" di sidebar
- **Sub role Mitra:** setelah login redirect ke `/golden/kanban-sales`; menu Dashboard disembunyikan
- Sidebar group di `components/layout/sidebar-nav.ts`, warna `#f59e0b`

### Permissions ENSURED di Admin

Semua permission golden di-ensure di `backend/src/routes/admin.ts` → `ENSURED_PERMISSIONS`:
```
golden.view, golden.create, golden.edit, golden.delete,
golden.meta_ads, golden.dashboard_ads, golden.follow_up,
golden.kanban_admin, golden.kalender, golden.kalender_after, golden.kanban_sales
```
Auto-upsert setiap kali `GET /admin/permissions` dipanggil → muncul di matrix roles tanpa perlu seeder.

---

### Menu 1: Dashboard Ads (`/golden/dashboard-ads`)

**File:** `app/(dashboard)/golden/dashboard-ads/page.tsx`

**Fungsi:** Dashboard ringkasan performa semua kampanye iklan (Meta/TikTok) dalam satu tampilan.

**Fitur UI:**
- Filter: Platform (All/Meta/TikTok), Bulan, Tahun, Kampanye tertentu
- 11 stat cards: Spend, Impressions, Reach, Clicks, CTR, Chats Received, Chats Responded, Conversions, Response Rate, Conversion Rate, Frequency — responsive `grid-cols-2 sm:grid-cols-4 xl:grid-cols-6`
- Line chart: Tren Harian (Recharts ResponsiveContainer)
- Bar chart: Perbandingan Per Kampanye
- Campaign detail cards: info per kampanye aktif

**Backend API:**
```
GET /api/v1/golden/meta-ads/dashboard
  params: platform?, campaign_id?, bulan?, tahun?, start_date?, end_date?
  response: { summary, campaigns[], daily_series[] }
```

---

### Menu 2: Meta Ads (`/golden/meta-ads`)

**File:** `app/(dashboard)/golden/meta-ads/page.tsx`

**Fungsi:** Setup kampanye iklan, manajemen koneksi Meta Insights API, target bulanan, dan input metrik manual.

**Tiga Tab:**

#### Tab 1 — Setup Platform
- List semua kampanye dengan status kredensial (app_id, ad_account_id, pixel_id, access_token)
- Tombol Sync: tarik data dari Meta Insights API
- Tombol Refresh Token: perbarui access token
- Create kampanye baru (form dialog): nama, platform, meta_campaign_id, credentials, budget, tanggal

**Backend API — Kampanye:**
```
GET    /golden/meta-ads/campaigns         – list semua kampanye
POST   /golden/meta-ads/campaigns         – buat kampanye baru
PATCH  /golden/meta-ads/campaigns/:id     – edit kampanye
DELETE /golden/meta-ads/campaigns/:id     – hapus
PATCH  /golden/meta-ads/campaigns/:id/toggle-hidden   – sembunyikan/tampilkan
GET    /golden/meta-ads/campaigns-select  – dropdown minimal (id + campaign_name)
POST   /golden/meta-ads/campaigns/:id/sync            – sync dari Meta Insights API
POST   /golden/meta-ads/campaigns/:id/refresh-token   – refresh access token
```

#### Tab 2 — Target Bulanan
- Input target per platform per bulan/tahun: Spend, Impressions, Clicks, Conversions, CTR, ROAS
- Grid `sm:grid-cols-2`

**Backend API — Target:**
```
GET    /golden/ads/targets     params: platform?, bulan?, tahun?
POST   /golden/ads/targets     upsert target bulanan
DELETE /golden/ads/targets/:id
```

#### Tab 3 — Kelola Kampanye
- Toggle visibility per kampanye (hidden/visible di dashboard)
- Input metrik konten manual (AdContentMetric) dan chat WA (WhatsappChatMetric)

**Backend API — Metrik:**
```
GET    /golden/meta-ads/campaigns/:id/content-metrics
POST   /golden/meta-ads/campaigns/:id/content-metrics
PATCH  /golden/meta-ads/content-metrics/:id
DELETE /golden/meta-ads/content-metrics/:id

GET    /golden/meta-ads/campaigns/:id/chat-metrics
POST   /golden/meta-ads/campaigns/:id/chat-metrics
PATCH  /golden/meta-ads/chat-metrics/:id
DELETE /golden/meta-ads/chat-metrics/:id
```

**Model Prisma — `GoldenMetaAdsCampaign`:**
- `id, campaign_name, meta_campaign_id, platform (Meta/TikTok), status`
- `daily_budget, total_budget, start_date, end_date`
- `app_id, ad_account_id, pixel_id, app_secret (hashed), access_token (hashed)`
- `is_hidden, last_synced_at, token_refreshed_at`

**Model Prisma — `GoldenAdContentMetric`:**
- `meta_ads_campaign_id, date, spend, impressions, reach, clicks, ctr, frequency`
- `conversions, cost_per_result, likes, comments, shares, video_views`

**Model Prisma — `GoldenWhatsappChatMetric`:**
- `meta_ads_campaign_id, date, chats_received, chats_responded, response_rate`
- `avg_response_time, total_conversions, conversion_rate`

**Model Prisma — `GoldenAdMonthlyTarget`:**
- `platform, bulan, tahun`
- `target_spend, target_impressions, target_clicks, target_conversions, target_ctr, target_roas`

---

### Menu 3: Follow Up Leads (`/golden/follow-up`)

**File:** `app/(dashboard)/golden/follow-up/page.tsx`
**Komponen:** `components/follow-up-leads.tsx` (shared dengan sales-admin, telemarketing)

**Fungsi:** Daftar leads Golden dengan riwayat follow up, filter, tambah lead, import Excel, export PDF/Excel.

**Fitur:**
- Tabel expandable leads + riwayat follow-up inline
- Filter: search, status, jenis, survey, sumber (kampanye)
- Tambah/edit lead via dialog
- Inline add follow-up
- Export: PDF Ringkasan, Excel Ringkasan, PDF+Catatan, Excel+Catatan
- Import bulk via Excel

**Backend API:**
```
GET  /golden/leads        params: search, status, jenis, rencana_survey, sumber_kampanye_id, page, limit
POST /golden/leads        buat lead baru
GET  /golden/leads/:id    detail lead
PATCH /golden/leads/:id   update lead
DELETE /golden/leads/:id  hapus lead
POST /golden/leads/:id/follow-ups  tambah follow up
PATCH /golden/follow-ups/:id       update follow up
DELETE /golden/follow-ups/:id      hapus follow up
```

**Catatan:**
- Lead `modul = "golden"` di model `Lead`
- Kalau lead punya `rencana_survey = "Ya"` → muncul di Kalender Survey
- Kalau lead `survey_approval_status = "approved"` → muncul di Kalender After Pengerjaan

---

### Menu 4: Kanban Admin (`/golden/kanban-admin`)

**File:** `app/(dashboard)/golden/kanban-admin/page.tsx`, `kanban-board.tsx`

**Fungsi:** Kanban board untuk tracking leads Golden oleh tim Admin. 6 kolom permanen per bulan.

**6 Kolom Permanen:** W1, W2, W3, W4, Closing Survey, Move To Telemarketing

**Fitur:**
- Drag & drop kartu antar kolom (react-beautiful-dnd)
- Filter bulan/tahun — data per bulan
- Carryover: pindah kartu dari bulan sebelumnya ke bulan ini
- Custom warna per kolom dan per kartu (color picker)
- Pagination per kolom (10 kartu per halaman)
- Dialog detail kartu: edit judul, deskripsi, deadline, tanggal survey, proyeksi sales, assign user, label, komentar
- PDF download rekap semua kolom

**Backend API:**
```
GET  /golden-kanban-admin/kanban              params: bulan, tahun
GET  /golden-kanban-admin/kanban/leads        dropdown leads golden
POST /golden-kanban-admin/kanban/columns      buat kolom
PATCH /golden-kanban-admin/kanban/columns/:id edit kolom (title, color)
DELETE /golden-kanban-admin/kanban/columns/:id hapus (blocked jika is_permanent)
POST /golden-kanban-admin/kanban/columns/:id/cards   buat kartu
PATCH /golden-kanban-admin/kanban/cards/:id          update kartu
DELETE /golden-kanban-admin/kanban/cards/:id         hapus kartu
POST /golden-kanban-admin/kanban/cards/:id/move      pindah kolom
PATCH /golden-kanban-admin/kanban/cards/:id/survey   update tanggal survey lead
POST /golden-kanban-admin/kanban/carryover           carryover kartu bulan lalu
GET  /golden-kanban-admin/kanban/cards/:id/comments  list komentar
POST /golden-kanban-admin/kanban/cards/:id/comments  tambah komentar
```

**Model Prisma:** `GoldenKanbanAdminColumn`, `GoldenKanbanAdminCard`
- Card fields: `title, description, color, urutan, deadline, tanggal_survey, projeksi_sales`
- Relations: → Lead (optional), → GoldenKanbanAdminColumn, → User (assignee), labels, comments

**Mobile:** Horizontal scroll via DualScrollContainer (kolom w-72 fixed, scrollable)

---

### Menu 5: Kalender Survey (`/golden/kalender-survey`)

**File:** `app/(dashboard)/golden/kalender-survey/page.tsx`
**Komponen:** `components/kalender-survey.tsx` (shared dengan sales-admin, telemarketing)

**Fungsi:** Kalender visual jadwal survey leads Golden. Approve/reject survey dengan upload foto bukti.

**Fitur:**
- Kalender bulanan (tampilan grid 7 hari)
- List view alternatif
- Klik tanggal → panel detail leads di hari itu
- Approve survey: upload foto (timestamp + GPS otomatis), input luasan tanah & catatan
- Reject survey: input alasan
- Edit/reschedule jadwal (tanggal, jam, PIC)
- Filter inputter (dropdown — saat showAll=true)
- Download PDF: filter periode + PIC, include foto di PDF
- 4 stat cards: Total Survey, Disetujui, Menunggu, Ditolak

**Timestamp Foto:**
- Saat upload foto → browser minta izin GPS (Geolocation API)
- Canvas overlay: tanggal (dd/mm/yyyy), jam (HH:MM:SS), koordinat GPS (lat, lng 5 desimal)
- Teks kuning, background gelap semi-transparan, sudut kanan bawah
- Foto dengan timestamp tersimpan ke `foto_survey` (base64 JSON array di Lead)

**Backend API:**
```
GET  /bd/golden/survey-kalender         params: bulan, tahun, show_all?, user_id?
GET  /bd/survey-pic-users               params: sub_role=Mitra → filter Mitra saja
POST /bd/golden/leads/:id/approve-survey    body: { foto_survey[], luasan_tanah?, catatan_survey? }
POST /bd/golden/leads/:id/reject-survey     body: { alasan? }
PATCH /bd/golden/leads/:id/survey           body: { tanggal_survey, jam_survey, pic_survey }
```

**Lead Fields Terkait:**
- `tanggal_survey, jam_survey, pic_survey` — jadwal survey
- `survey_approval_status` — null/"pending"/"approved"/"rejected"
- `foto_survey` — JSON array base64 (include timestamp + GPS)
- `luasan_tanah, catatan_survey` — diisi saat approve

**Responsive:** `grid-cols-2 sm:grid-cols-4` untuk stat cards

---

### Menu 6: Kalender After Pengerjaan (`/golden/kalender-after`)

**File:** `app/(dashboard)/golden/kalender-after/page.tsx`
**Komponen:** `components/kalender-pengerjaan.tsx`

**Fungsi:** Tracking pengerjaan setelah survey disetujui. Set jadwal pengerjaan dan konfirmasi selesai dengan foto bukti.

**Alur:**
1. Lead survey disetujui (`survey_approval_status = "approved"`) → muncul di sini
2. Admin set `tanggal_pengerjaan` → status "Terjadwal"
3. Upload foto bukti pengerjaan (timestamp + GPS) → status "Selesai"

**Fitur:**
- 3 panel: Belum Dijadwalkan, Terjadwal, Selesai
- Kalender visual (biru = selesai, amber = terjadwal)
- List view alternatif
- Dialog "Set Jadwal": input tanggal pengerjaan
- Dialog "Konfirmasi Selesai": upload foto bukti (timestamp + GPS otomatis)
- Lightbox preview foto
- Download PDF: filter periode + PIC

**Timestamp Foto:**
- Identik dengan Kalender Survey: GPS + waktu di-overlay ke foto via Canvas
- Tersimpan ke `foto_pengerjaan` (base64 JSON array di Lead)

**Backend API:**
```
GET  /bd/golden/pengerjaan-kalender                          – list leads approved survey
PATCH /bd/golden/leads/:id/pengerjaan-schedule  body: { tanggal_pengerjaan }
POST /bd/golden/leads/:id/approve-pengerjaan    body: { foto_pengerjaan[] }
```

**Lead Fields Terkait:**
- `tanggal_pengerjaan` — jadwal pengerjaan
- `pengerjaan_approval_status` — null/"approved"
- `foto_pengerjaan` — JSON array base64 (include timestamp + GPS)

**Responsive:** `grid-cols-1 sm:grid-cols-3` untuk stat cards

---

### Menu 7: Kanban Sales (`/golden/kanban-sales`)

**File:** `app/(dashboard)/golden/kanban-sales/page.tsx`, `kanban-page.tsx`, `kanban-board.tsx`

**Fungsi:** Kanban board pipeline sales untuk tim Sales/Mitra. Kolom bisa ditambah & diurutkan ulang.

**Default Kolom:** W1, W2, W3, W4, Closing, Lost

**Fitur:**
- Drag & drop kartu antar kolom (react-beautiful-dnd)
- Drag & drop kolom untuk reorder
- Filter bulan/tahun — carryover dari bulan sebelumnya
- Custom warna kolom & kartu (color picker)
- Dialog detail kartu: judul, deskripsi, deadline, tipe pekerjaan, proyeksi sales, assign user, label, komentar
- Stat cards: Total Proyeksi Closing (akumulasi), Closing bulan ini, Total Lost
- "Closing per Bulan" breakdown + "Jumlah per Kolom" summary
- Deduplication proyeksi sales (lead yang sama di beberapa bulan dihitung sekali)
- PDF download rekap semua kolom

**Backend API:**
```
GET  /golden-kanban-sales/kanban              – board + columns + cards
GET  /golden-kanban-sales/kanban/leads        – dropdown leads
POST /golden-kanban-sales/kanban/columns      – buat kolom baru
PATCH /golden-kanban-sales/kanban/columns/:id – edit kolom
DELETE /golden-kanban-sales/kanban/columns/:id
POST /golden-kanban-sales/kanban/columns/reorder   body: { column_ids[] }
POST /golden-kanban-sales/kanban/carryover    params: month, year
POST /golden-kanban-sales/kanban/cards        – buat kartu
PATCH /golden-kanban-sales/kanban/cards/:id   – update kartu
DELETE /golden-kanban-sales/kanban/cards/:id
GET  /golden-kanban-sales/kanban/cards/:id/comments
POST /golden-kanban-sales/kanban/cards/:id/comments
```

**Model Prisma:** `GoldenKanbanSalesColumn`, `GoldenKanbanSalesCard`
- Card fields: `title, description, color, urutan, deadline, tipe_pekerjaan, projeksi_sales`
- Relations: → Lead (optional), → GoldenKanbanSalesColumn, → User (assignee), labels, comments

**Mobile:** Horizontal scroll via DualScrollContainer. Stat cards `grid-cols-1 sm:grid-cols-3`.
**Default landing page untuk Mitra** (redirect setelah login).

---

### Ringkasan Responsive Mobile (Golden)

| Komponen | Issue Lama | Fix |
|----------|-----------|-----|
| `kalender-survey.tsx` stats | `grid-cols-4` (overflow di HP) | `grid-cols-2 sm:grid-cols-4` |
| `kalender-pengerjaan.tsx` stats | `grid-cols-3` (kecil di HP) | `grid-cols-1 sm:grid-cols-3` |
| `kalender-survey.tsx` header buttons | Overflow kanan | `flex-wrap justify-end` |
| `follow-up-leads.tsx` header | 6 tombol penuh di satu baris | `flex-col sm:flex-row` + label singkat mobile |
| Kanban boards (admin & sales) | Kolom w-72 | DualScrollContainer (horizontal scroll) — OK |
| `dashboard-ads/page.tsx` | — | Sudah responsive (`sm:grid-cols-4`) |
| `meta-ads/page.tsx` | — | Sudah responsive (`sm:grid-cols-2`) |
| `kanban-sales/kanban-page.tsx` | — | Sudah responsive (`grid-cols-1 sm:grid-cols-3`) |

---

## 1. Tech Stack & Paths

| Layer | Tech | Path |
|-------|------|------|
| Backend | Node.js + Express + TypeScript + Prisma + PostgreSQL | `new-app/backend/` |
| Frontend (internal) | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | `new-app/frontend/` |
| Frontend (client portal) | Next.js 16 (App Router) + Tailwind v4 + Turbopack | `rubahrumah/` |
| DB ORM | Prisma (schema di `backend/prisma/schema.prisma`) | |
| State | Zustand (`authStore.ts`) | |
| HTTP Client | Axios via `lib/api/client.ts` | |

**Backend entry point:** `src/index.ts`
**Run:** `ts-node-dev --respawn --transpile-only src/index.ts`
**Base URL:** `http://localhost:{PORT}/api/v1`

**BigInt Fix (global):** `(BigInt.prototype as any).toJSON = () => this.toString()` di `index.ts`
**File upload:** Multer, disimpan ke `config.storagePath` (default `./storage`). Static: `GET /storage/{path}`

---

## 2. Backend API Routes

Semua route memerlukan `Authorization: Bearer <token>` kecuali `/auth/*`.

### 2.1 Auth — `/api/v1/auth`
| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/login` | Login, returns `{ access_token, refresh_token, user: { permissions[] } }` |
| POST | `/logout` | Logout |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Profil user |
| PATCH | `/me` | Update nama/whatsapp |
| PATCH | `/me/password` | Ganti password |

### 2.2 Admin — `/api/v1/admin` (Super Admin only)
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/users` | List / create user |
| PATCH/DELETE | `/users/:id` | Update / hapus user |
| POST | `/users/:id/reset-password` | Reset password |
| GET/POST | `/roles` | List / create role |
| PATCH/DELETE | `/roles/:id` | Rename / hapus role |
| GET/PUT | `/roles/:id/permissions` | Get / set permissions |
| GET | `/permissions` | Semua permissions grouped |

### 2.3 BD — `/api/v1/bd`
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/leads` | List leads (paginated, filter: status/bulan/tahun/search/modul) |
| POST | `/leads` | Create lead |
| GET | `/leads/:id` | Detail lead |
| PATCH | `/leads/:id` | Update lead |
| DELETE | `/leads/:id` | Hapus lead |
| GET | `/:modul/leads` | List leads by modul |
| GET | `/:modul/leads/:id` | Single lead detail by modul |
| PATCH | `/:modul/leads/:id/survey` | Update tanggal survey |
| POST | `/:modul/leads/bulk` | Bulk operations |
| POST | `/leads/:id/approve-survey` | Approve survey |
| POST | `/leads/:id/reject-survey` | Reject survey |
| GET | `/meta-ads` | List Meta Ads campaigns |
| POST | `/meta-ads` | Create campaign |
| GET/PATCH/DELETE | `/meta-ads/:id` | Detail / update / hapus |
| POST | `/meta-ads/campaigns/:id/sync` | Sync campaign data |
| GET/POST | `/meta-ads/:id/content-metrics` | Ad content metrics |
| GET/POST | `/meta-ads/:id/chat-metrics` | WhatsApp chat metrics |
| GET | `/ads/accounts` | List ad accounts |
| POST | `/ads/accounts` | Create ad account |
| PATCH/DELETE | `/ads/accounts/:id` | Update / hapus |
| GET/POST | `/ads/targets` | List / create targets |
| DELETE | `/ads/targets/:id` | Hapus target |
| GET | `/dashboard` | BD dashboard summary |
| GET | `/meta-ads/dashboard` | Meta Ads dashboard |
| GET | `/survey-pic-users` | Dropdown PIC users |
| GET | `/kanban/columns` | Kanban columns |
| GET | `/kanban/cards` | Kanban cards |
| POST | `/kanban/columns` | Create column |
| POST | `/kanban/cards` | Create card |
| PATCH/DELETE | `/kanban/cards/:id` | Update / hapus card |
| GET | `/kanban/metrics` | Kanban metrics |
| GET/POST | `/kanban/labels` | List / create labels |
| GET | `/:modul/leads/follow-up-report` | Follow-up report |

### 2.4 Content Creator — `/api/v1/content-creator`
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/timeline` | List (filter: bulan/tahun/status) |
| GET | `/calendar` | Calendar by tanggal_publish |
| GET | `/upload-calendar` | Calendar by tanggal_upload |
| GET | `/upload-pending` | List pending uploads |
| POST | `/timeline` | Create |
| PATCH | `/timeline/:id` | Update |
| PATCH | `/timeline/:id/image` | Upload/update image |
| DELETE | `/timeline/:id` | Hapus |
| POST | `/timeline/:id/approve` | Approve (permission: content.approve) |
| POST | `/timeline/:id/reject` | Reject |
| POST | `/timeline/:id/revisi` | Request revisi |
| POST | `/timeline/:id/resubmit` | Resubmit setelah revisi |
| POST | `/timeline/:id/sign-hd` | TTD HD |
| GET/POST | `/social-accounts` | List / create akun sosial media |
| PATCH | `/social-accounts/:id` | Update akun |
| DELETE | `/social-accounts/:id` | Hapus akun |
| POST | `/social-accounts/:id/sync` | Sync metrics dari API platform (IG/TikTok/YT) |
| GET | `/social-post-metrics` | List per-post metrics (filter: platform, date, judul) |
| GET | `/social-post-metrics/summary` | Totals + time_series + by_platform (termasuk ig_profile_visits, ig_website_clicks) |
| POST | `/social-post-metrics` | Create manual post metric |
| PATCH | `/social-post-metrics/:id` | Update metrics |
| DELETE | `/social-post-metrics/:id` | Hapus metrics |
| GET/POST | `/social-targets` | Monthly targets per platform |
| GET | `/social-targets/comparison` | Target vs aktual bulanan |
| GET | `/dashboard` | Content dashboard |

### 2.5 Desain — `/api/v1/desain`
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/timelines` | List / create timeline |
| GET/PATCH/DELETE | `/timelines/:id` | Detail / update / hapus |
| GET | `/timeline/:id/gantt` | Gantt view |
| POST | `/timelines/:id/items` | Add item |
| PATCH | `/timelines/:tid/items/:id` | Update item |
| DELETE | `/timelines/:tid/items/:id` | Hapus item |
| GET | `/timeline/:id/links` | List Docs/Link untuk timeline |
| POST | `/timeline/:id/links` | Add link/catatan (JSON url atau multipart file) |
| DELETE | `/timeline/links/:id` | Hapus link (juga hapus file jika upload) |

### 2.6 Interior — `/api/v1/interior`
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/timelines` | List / create |
| GET/PATCH/DELETE | `/timelines/:id` | Detail / update / hapus |
| GET | `/timeline/:id/gantt` | Gantt view |
| POST/PATCH/DELETE | `/timelines/:id/items` | CRUD items |
| POST | `/timeline/items/:id/upload` | Upload file pada item |

### 2.7 Sales — `/api/v1/sales`
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/proyek-berjalan` | List / create |
| GET/PATCH/DELETE | `/proyek-berjalan/:id` | Detail / update / hapus |
| GET | `/kanban/columns` | Kanban columns |
| GET | `/kanban/cards` | Kanban cards |
| POST | `/kanban/columns` | Create column |
| POST | `/kanban/cards` | Create card |
| PATCH/DELETE | `/kanban/cards/:id` | Update / hapus |
| GET | `/kanban/metrics` | Metrics |
| GET/POST | `/follow-up` | List / tambah follow up |
| PATCH/DELETE | `/follow-up/:id` | Update / hapus |
| GET | `/survey-calendar` | Kalender survey |

### 2.8 Projek Sipil — `/api/v1/sipil`
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/employees` | List users untuk dropdown |
| GET/POST | `/projeks` | List / create proyek |
| GET/PATCH/DELETE | `/projeks/:id` | Detail / update / hapus |
| POST | `/projeks/:id/termins` | Add termin |
| PATCH | `/termins/:id` | Update termin |
| DELETE | `/termins/:id` | Hapus termin |
| POST | `/termins/:id/tasks` | Add task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Hapus task |
| **RAPP** | | |
| GET | `/termins/:id/rapp` | RAPP data (material + sipil + vendor) |
| POST | `/termins/:id/rapp/material-kategori` | Add kategori material |
| PATCH/DELETE | `/rapp/material-kategori/:id` | Update / hapus kategori |
| POST | `/rapp/material-kategori/:id/items` | Add item material |
| PATCH/DELETE | `/rapp/material-items/:id` | Update / hapus item |
| POST | `/termins/:id/rapp/sipil-items` | Add item sipil |
| PATCH/DELETE | `/rapp/sipil-items/:id` | Update / hapus |
| POST | `/termins/:id/rapp/vendor-kategori` | Add kategori vendor |
| PATCH/DELETE | `/rapp/vendor-kategori/:id` | Update / hapus |
| POST | `/rapp/vendor-kategori/:id/items` | Add item vendor |
| PATCH/DELETE | `/rapp/vendor-items/:id` | Update / hapus |
| **Stock Opname** | | |
| GET | `/projeks/:id/stock-opname/rapp` | Semua RAPP items lintas termin (referensi) |
| GET | `/projeks/:id/stock-opname/logs` | Riwayat penggunaan harian |
| POST | `/projeks/:id/stock-opname/logs` | Catat penggunaan |
| DELETE | `/stock-opname/logs/:id` | Hapus log |
| **Docs/Link** | | |
| GET | `/projeks/:id/links` | List dokumen/link proyek |
| POST | `/projeks/:id/links` | Add link (JSON) atau upload file (multipart, maks 20MB, dir: `sipil-docs/`) |
| DELETE | `/links/:id` | Hapus (+ hapus file jika upload) |
| **Form Checklist** | | |
| GET | `/projeks/:id/checklist` | List checklist items |
| POST | `/projeks/:id/checklist` | Create (multipart: `nama_pekerjaan` + optional `gambar`) |
| PATCH | `/checklist/:cid` | Update nama/is_checked/gambar |
| DELETE | `/checklist/:cid` | Hapus + cleanup file |

### 2.9 Projek Lain — `/api/v1/projek`
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/by-type` | Count by type (projek, stock-opname, proyek-berjalan) |
| GET | `/stock-opname` | List StockOpnameProject |
| POST | `/stock-opname` | Create |
| GET/PATCH/DELETE | `/stock-opname/:id` | Detail / update / hapus |
| POST | `/stock-opname/:id/termins` | Add termin |
| GET | `/stock-opname/:id/termins/:tid` | Detail termin + rapp items |
| POST | `/stock-opname/:id/termins/:tid/rapp-items` | Add rapp item |
| PATCH/DELETE | `/stock-opname/rapp-items/:id` | Update / hapus |
| POST | `/stock-opname/rapp-items/:id/usage` | Add usage item |
| GET/POST | `/kategori-barang` | CRUD kategori |
| GET/POST | `/barang` | CRUD barang |
| PATCH/DELETE | `/barang/:id` | Update / hapus |
| GET/POST | `/warehouse` | CRUD warehouse |
| PATCH/DELETE | `/warehouse/:id` | Update / hapus |
| GET/POST | `/warehouse/:id/stok` | List / add stok |
| PATCH/DELETE | `/warehouse/stok/:id` | Update / hapus stok |

### 2.10 Projek Interior — `/api/v1/interior/projeks`
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/projeks` | List / create |
| GET/PATCH/DELETE | `/projeks/:id` | Detail / update / hapus |
| POST | `/projeks/:id/termins` | Add termin |
| PATCH/DELETE | `/projeks/termins/:id` | Update / hapus |
| POST | `/projeks/termins/:id/tasks` | Add task |
| PATCH/DELETE | `/projeks/tasks/:id` | Update / hapus |
| **Form Checklist** | | |
| GET | `/projeks/:id/checklist` | List checklist items |
| POST | `/projeks/:id/checklist` | Create (multipart: `nama_pekerjaan` + optional `gambar`) |
| PATCH | `/projeks/checklist/:cid` | Update nama/is_checked/gambar |
| DELETE | `/projeks/checklist/:cid` | Hapus + cleanup file |
| GET | `/termins/:id/rapp` | RAPP data |
| POST | `/termins/:id/rapp/material-kategori` | Add kategori material |
| PATCH/DELETE | `/rapp/material-kategori/:id` | Update / hapus |
| POST | `/rapp/material-kategori/:id/items` | Add item material |
| PATCH/DELETE | `/rapp/material-items/:id` | Update / hapus |
| POST | `/termins/:id/rapp/sipil-items` | Add sipil item |
| PATCH/DELETE | `/rapp/sipil-items/:id` | Update / hapus |
| POST | `/termins/:id/rapp/vendor-kategori` | Add vendor kategori |
| PATCH/DELETE | `/rapp/vendor-kategori/:id` | Update / hapus |
| POST | `/rapp/vendor-kategori/:id/items` | Add vendor item |
| PATCH/DELETE | `/rapp/vendor-items/:id` | Update / hapus |

### 2.11 Finance — `/api/v1/finance`

#### Invoice (`/invoices`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/invoices` | List |
| POST | `/invoices` | Create (dari lead_id) |
| PATCH | `/invoices/:id` | Update |
| DELETE | `/invoices/:id` | Hapus — **Super Admin bisa hapus status Lunas+kwitansi; role lain hanya non-Lunas** |
| DELETE | `/invoices/:invId/items/:itemId` | Hapus item invoice |
| POST | `/invoices/:id/sign-head` | TTD Head Finance |
| POST | `/invoices/:id/sign-admin` | TTD Admin Finance |
| POST | `/invoices/:id/mark-paid` | Tandai Lunas → auto-create Kwitansi |
| GET | `/invoices/:id/kwitansi` | Get kwitansi |
| GET | `/leads-dropdown` | Leads untuk dropdown |

**Workflow:** `draft → (sign-head + sign-admin) → Terbit → (mark-paid) → Lunas`
**Delete rules:** Non-Lunas: semua role dengan `finance.delete`. Lunas: **hanya Super Admin** (cascade hapus kwitansi + items).
**Edit rules:** Hanya bisa diedit saat `status = draft` DAN belum ada `head_finance_id`/`admin_finance_id`. PATCH menerima full payload (items array → replace semua item, recalc subtotal/ppn/grand_total).

#### Bank Accounts (`/bank-accounts`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/bank-accounts` | List akun bank |
| POST | `/bank-accounts` | Create |
| PATCH | `/bank-accounts/:id` | Update |
| DELETE | `/bank-accounts/:id` | Hapus |

#### Administrasi Projek (`/adm-projek`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/adm-projek` | List / create (alias: `/adm-finance`) |
| GET/PATCH/DELETE | `/adm-projek/:id` | Detail / update / hapus |

#### Termin per Proyek (`/adm-projek/:id/termins`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek/:id/termins` | List termins + deposit summary |
| POST | `/adm-projek/:id/termins` | Create termin |
| PATCH | `/adm-projek/:id/termins/:tid` | Update termin |
| DELETE | `/adm-projek/:id/termins/:tid` | Hapus termin |
| POST | `/adm-projek/:id/termins/:tid/sign-deposit` | HF sign deposit awal |
| POST | `/adm-projek/:id/termins/:tid/extra-deposit` | Add extra deposit |
| POST | `/adm-projek/:id/termins/:tid/extra-deposit/:did/sign` | HF sign extra deposit |
| DELETE | `/adm-projek/:id/termins/:tid/extra-deposit/:did` | Hapus extra deposit |
| GET | `/adm-projek/:id/termins/:tid/pdf-data` | PDF export termin |

#### Periodes (legacy — nested in adm-finance)
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/adm-finance/termins/:tid/periodes` | List / add periode |
| GET/PATCH/DELETE | `/adm-finance/periodes/:id` | Detail / update / hapus |
| POST | `/adm-finance/periodes/:id/approve` | Approve |
| POST/DELETE | `/adm-finance/periodes/:id/items` | Add item |

#### Purchase Request — PR (`/adm-projek/:id/pr`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek/:id/pr` | List PRs |
| POST | `/adm-projek/:id/pr` | Create PR dengan items |
| PUT | `/adm-projek/:id/pr/:pid` | Edit PR (diblokir jika sudah HF signed) |
| PATCH | `/adm-projek/:id/pr/:pid/status` | Update status PR |
| DELETE | `/adm-projek/:id/pr/:pid` | Hapus PR |
| GET | `/adm-projek/:id/pr/available` | List PR Disetujui+HF signed (untuk cashflow) |
| POST | `/adm-projek/:id/pr/:pid/sign` | HF sign PR (`hf_signed_at`) |
| GET | `/adm-projek/:id/pr/:pid/pdf-data` | PDF export data |
| GET | `/adm-projek/:id/rapp-items` | RAPP items untuk picker di PR |

**PR Status:** `Pending → Disetujui / Ditolak`
**Nomor PR:** auto-generate `PR-001`, `PR-002`, dst.
**Items:** setiap item ada `is_from_rapp`, `rapp_qty`, `rapp_harga` — jika melebihi RAPP perlu TTD HF.
**UI Pagination:** max 5 item per halaman di form create/edit PR.

#### Cashflow per Termin (`/adm-projek/:id/termins/:tid/cashflow`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek/:id/cashflow` | List cashflow proyek (legacy) |
| POST | `/adm-projek/:id/cashflow` | Create cashflow (legacy) |
| DELETE | `/adm-projek/:id/cashflow/:cid` | Hapus cashflow (legacy) |
| GET | `/adm-projek/:id/termins/:tid/cashflow` | Cashflow per termin |
| POST | `/adm-projek/:id/termins/:tid/cashflow` | Tambah item cashflow |
| DELETE | `/adm-projek/:id/termins/:tid/cashflow/:cid` | Hapus item cashflow |
| POST | `/adm-projek/:id/termins/:tid/cashflow/gajian` | Buat gajian cashflow |
| GET | `/adm-projek/:id/cashflow-overview/pdf-data` | PDF overview cashflow |

#### List Material / Toko (`/adm-projek/:id/list-material`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek/:id/list-material` | List |
| POST | `/adm-projek/:id/list-material` | Create |
| PUT | `/adm-projek/:id/list-material/:mid` | Update |
| DELETE | `/adm-projek/:id/list-material/:mid` | Hapus |
| POST | `/adm-projek/:id/list-material/:mid/items` | Add item ke list |
| PUT | `/adm-projek/:id/list-material/:mid/items/:iid` | Update item |
| DELETE | `/adm-projek/:id/list-material/:mid/items/:iid` | Hapus item |
| GET | `/adm-projek/:id/list-material/pdf-data` | PDF export |

#### Surat Jalan (`/adm-projek/:id/surat-jalan`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek/:id/surat-jalan` | List per proyek |
| POST | `/adm-projek/:id/surat-jalan` | Create |
| GET | `/adm-projek/:id/surat-jalan/:sid` | Detail |
| DELETE | `/adm-projek/:id/surat-jalan/:sid` | Hapus |
| POST | `/adm-projek/:id/surat-jalan/:sid/sign-af` | Admin Finance sign |
| GET | `/adm-projek/:id/surat-jalan/:sid/pdf-data` | PDF data |

#### Dokumen Proyek (`/adm-projek/:id/dokumen`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek/:id/dokumen` | List dokumen (Nota/Bukti dll) |
| GET | `/adm-projek/:id/dokumen/:did` | Detail |
| POST | `/adm-projek/:id/dokumen` | Upload dokumen (base64, kategori, nama_file, file_type) |
| DELETE | `/adm-projek/:id/dokumen/:did` | Hapus |

#### Gajian Available
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek/:id/gajian/available` | List termins tersedia untuk gajian |

#### Tukang (per proyek)
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/adm-projek/:id/tukang/registry` | List / add tukang registry |
| PATCH/DELETE | `/adm-projek/:id/tukang/registry/:tid` | Update / hapus |
| GET | `/adm-projek/:id/tukang/available-users` | Dropdown users untuk registry |
| GET/POST | `/adm-projek/:id/tukang/absen-foto` | List / submit foto absen |
| POST | `/adm-projek/:id/tukang/absen-foto/:aid/approve` | Approve absen |
| POST | `/adm-projek/:id/tukang/absen-foto/:aid/reject` | Reject absen |
| POST | `/adm-projek/:id/tukang/absen-checklist` | Delegasi absen oleh admin (tanpa foto, langsung Disetujui). Body: `{ tukang_id, tanggal }` |
| GET | `/adm-projek/:id/tukang/kasbon` | List kasbon |
| POST | `/adm-projek/:id/tukang/:tid/kasbon` | Tambah kasbon |
| PATCH | `/adm-projek/:id/tukang/kasbon/:cid` | Update kasbon |
| DELETE | `/adm-projek/:id/tukang/kasbon/:cid` | Hapus kasbon |
| GET/POST | `/adm-projek/:id/tukang/gajian` | List / create gajian |
| DELETE | `/adm-projek/:id/tukang/gajian/:gid` | Hapus gajian |
| POST | `/adm-projek/:id/tukang/gajian/:gid/sign-af` | Admin Finance sign gajian |
| POST | `/adm-projek/:id/tukang/gajian/:gid/sign-hf` | Head Finance sign gajian |
| GET | `/adm-projek/:id/tukang/kwitansi` | List kwitansi gaji |
| GET | `/tukang-absen/projects` | Proyek untuk halaman absen tukang |
| GET | `/tukang-absen/:pid/my-tukang` | Data tukang yang terhubung ke user login |
| GET | `/tukang-absen/:pid/my-absen` | Riwayat absen tukang (self) |
| POST | `/tukang-absen/:pid/submit` | Submit foto absen harian |

#### Reimburse
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/reimburse` | List / create |
| GET/PATCH/DELETE | `/reimburse/:id` | Detail / update / hapus |
| POST | `/reimburse/:id/sign-head` | TTD Head |
| POST | `/reimburse/:id/sign-admin` | TTD Admin |
| POST | `/reimburse/:id/tolak` | Tolak |

### 2.12 PIC Project — `/api/v1/pic-project`
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/proyek-berjalan` | List proyek (Super Admin: semua, lain: milik sendiri) |
| PATCH | `/proyek-berjalan/:id/progress` | Update progress |

### 2.13 Laporan Harian — `/api/v1/laporan-harian`
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/users` | User list dropdown |
| GET | `/` | List (filter: modul, tanggal_mulai, tanggal_selesai, user_id) |
| POST | `/` | Create (modul, tanggal_mulai, tanggal_selesai, kegiatan, kendala, user_id) |
| DELETE | `/:id` | Hapus |
| GET | `/:id/docs` | List docs/link per laporan |
| POST | `/:id/docs` | Add doc (JSON url atau multipart file, dir: `laporan-docs/`) |
| DELETE | `/docs/:docId` | Hapus doc (+ hapus file jika upload) |

**modul values:** `bd`, `content`, `sales_admin`, `telemarketing`, `desain`, `sales`, `finance`, `pic`

### 2.14 Sales Admin Kanban — `/api/v1/sales-admin`
Permanent columns: W1, W2, W3, W4, Closing Survey, Move To Telemarketing.
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/kanban?bulan=&tahun=` | Board |
| GET | `/kanban/leads` | Leads dropdown |
| POST | `/kanban/carryover` | Carryover dari bulan sebelumnya |
| POST/PATCH/DELETE | `/kanban/columns` | CRUD column |
| POST | `/kanban/columns/:id/cards` | Create card |
| PATCH/DELETE | `/kanban/cards/:id` | Update / hapus |
| POST | `/kanban/cards/:id/move` | Drag-copy (Move To TM → auto-copy ke TM) |
| PATCH | `/kanban/cards/:id/survey` | Set tanggal_survey |
| GET/POST | `/kanban/cards/:id/comments` | Comments |

### 2.15 Telemarketing Kanban — `/api/v1/telemarketing`
Permanent columns: From Sales Admin, W1, W2, W3, W4, Closing Survey, Move To Cold Database.
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/kanban?bulan=&tahun=` | Board |
| GET | `/kanban/leads` | Leads dropdown |
| POST | `/kanban/carryover` | Carryover |
| POST/PATCH/DELETE | `/kanban/columns` | CRUD column |
| POST | `/kanban/columns/:id/cards` | Create card |
| PATCH/DELETE | `/kanban/cards/:id` | Update / hapus |
| POST | `/kanban/cards/:id/move` | Drag-copy (Cold DB → Lead.status = "Low") |
| PATCH | `/kanban/cards/:id/survey` | Set tanggal_survey |
| GET/POST | `/kanban/cards/:id/comments` | Comments |

### 2.16 Client Management (Internal) — `/api/v1/client`
Digunakan oleh staff internal untuk mengelola data portal klien.
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/leads-dropdown` | Leads status="Client" yang belum punya portal project |
| GET | `/projects` | List semua client portal projects |
| POST | `/projects` | Buat project + akun klien sekaligus (body: lead_id, nama_proyek, username, password, ...) |
| GET | `/projects/:id` | Detail project + info akun |
| PATCH | `/projects/:id` | Update info project |
| PATCH | `/projects/:id/account` | Update akun (password, is_active) |
| GET/POST | `/projects/:id/payments` | List / tambah termin pembayaran |
| PATCH/DELETE | `/projects/:id/payments/:pid` | Update / hapus termin |
| GET/POST | `/projects/:id/galeri` | List / upload foto (multipart, field: `foto`) |
| DELETE | `/projects/:id/galeri/:gid` | Hapus foto |
| GET/POST | `/projects/:id/dokumen` | List / upload dokumen (multipart, field: `file`) |
| DELETE | `/projects/:id/dokumen/:did` | Hapus dokumen |
| GET/POST | `/projects/:id/aktivitas` | List / tambah riwayat pekerjaan |
| PATCH/DELETE | `/projects/:id/aktivitas/:aid` | Update / hapus |
| GET/POST | `/projects/:id/gantt` | List / tambah item Gantt chart |
| PATCH/DELETE | `/projects/:id/gantt/:gid` | Update / hapus |
| GET/POST | `/projects/:id/kontak` | List / tambah kontak bantuan |
| PATCH/DELETE | `/projects/:id/kontak/:kid` | Update / hapus |
| GET | `/projects/:id/kehadiran` | Kehadiran tukang (dari AbsenTukang via adm_finance_project_id) |

### 2.17 Client Portal (Rubahrumah Frontend) — `/api/v1/client-portal`
Digunakan oleh aplikasi `rubahrumah/` (portal klien). Login menghasilkan token bertipe `client_portal_access`.
| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| POST | `/login` | Publik | Login klien (username+password) → returns `access_token` |
| GET | `/me` | Token | Dashboard: info proyek + summary count |
| GET | `/payments` | Token | Daftar termin pembayaran |
| GET | `/galeri` | Token | Foto proyek (query: `search`) |
| GET | `/dokumen` | Token | Dokumen proyek (query: `search`, `kategori`) |
| GET | `/aktivitas` | Token | Riwayat pekerjaan (query: `search`, `status`, `tanggal_mulai`, `tanggal_selesai`) |
| GET | `/kehadiran` | Token | Kehadiran tukang (query: `tanggal_mulai`, `tanggal_selesai`) |
| GET | `/gantt` | Token | Item Gantt chart progress |
| GET | `/kontak` | Token | Kontak bantuan (PIC/Sales/Admin) |

**Client Portal Auth:** Token JWT terpisah, payload: `{ sub: accountId, type: "client_portal_access" }`.
**File storage:** Galeri → `storage/client-portal/galeri/`, Dokumen → `storage/client-portal/dokumen/`.
**Static access:** `GET /storage/client-portal/galeri/{filename}`, `GET /storage/client-portal/dokumen/{filename}`.

---

## 3. Database Schema (Prisma Models)

### Core Auth
| Model | Table | Key Fields |
|-------|-------|-----------|
| `User` | `users` | id(BigInt), name, email, password, whatsapp_number |
| `Role` | `roles` | id(BigInt), name(unique) |
| `UserRole` | `user_roles` | user_id, role_id |
| `Permission` | `permissions` | id, name(unique), module, label |
| `RolePermission` | `role_permissions` | role_id, permission_id |
| `Session` | `sessions` | id(String), user_id, payload |

### Leads & CRM
| Model | Table | Key Fields |
|-------|-------|-----------|
| `Lead` | `leads` | id, user_id, nama, nomor_telepon, alamat, sumber_leads, jenis(Sipil/Desain/Interior), status(Low/Medium/Hot), tipe, week, bulan, tahun, rencana_survey, tanggal_survey, modul |
| `FollowUpClient` | `follow_up_clients` | lead_id, user_id, tanggal, catatan, next_follow_up, attachment_data, attachment_mime, attachment_name |

### Kanban (BD)
| Model | Table | Key Fields |
|-------|-------|-----------|
| `KanbanColumn` | `kanban_columns` | id, title, urutan, color |
| `KanbanCard` | `kanban_cards` | id, column_id, title, description, assigned_user_id, deadline, urutan |
| `KanbanComment` | `kanban_comments` | id, card_id, user_id, comment |

### Kanban (Sales Admin & Telemarketing)
| Model | Table | Key Fields |
|-------|-------|-----------|
| `SalesAdminKanbanColumn` | `sales_admin_kanban_columns` | id, title, urutan, color, is_permanent, bulan, tahun |
| `SalesAdminKanbanCard` | `sales_admin_kanban_cards` | id, column_id, lead_id, catatan, tanggal_survey |
| `TelemarketingKanbanColumn` | `telemarketing_kanban_columns` | id, title, urutan, color, is_permanent, bulan, tahun |
| `TelemarketingKanbanCard` | `telemarketing_kanban_cards` | id, column_id, lead_id, catatan, tanggal_survey |

### Meta Ads & Content
| Model | Table | Key Fields |
|-------|-------|-----------|
| `MetaAdsCampaign` | `meta_ads_campaigns` | id, meta_campaign_id, campaign_name, platform, status, daily_budget, total_budget |
| `AdContentMetric` | `ad_content_metrics` | id, meta_ads_campaign_id, date, impressions, reach, clicks, ctr, spend, conversions — unique(campaign_id+date) |
| `WhatsappChatMetric` | `whatsapp_chat_metrics` | id, meta_ads_campaign_id, date, chats_received, chats_responded, response_rate, conversion_rate |
| `ContentTimeline` | `content_timelines` | id, user_id, judul, platform, tanggal_publish, tanggal_upload, status, bulan, tahun, hd_bd_signature |
| `SocialMediaAccount` | `social_media_accounts` | id, platform, account_name, username, instagram_user_id, instagram_access_token, ig_profile_visits, ig_website_clicks, last_synced_at |
| `SocialMediaPostMetric` | `social_media_post_metrics` | id, account_id, post_id_platform, platform, judul_konten, tanggal, media_type, views, likes, comments, shares, saves, reposts, reach, watch_time_minutes, engagement_rate |
| `SocialMediaTarget` | `social_media_targets` | id, platform, bulan, tahun, target_views, target_likes, target_comments, target_shares, target_saves, target_reach, target_engagement_rate |

### Desain & Interior Timelines
| Model | Table | Key Fields |
|-------|-------|-----------|
| `DesainTimeline` | `desain_timelines` | id, lead_id, jenis_desain, bulan, tahun, created_by |
| `DesainTimelineItem` | `desain_timeline_items` | id, desain_timeline_id, item_pekerjaan, pic(user), status, target_selesai |
| `InteriorTimeline` | `interior_timelines` | id, nama_proyek, lead_id, tanggal_mulai, tanggal_selesai |
| `InteriorTimelineItem` | `interior_timeline_items` | id, interior_timeline_id, item_pekerjaan, pic, status, target_selesai |

### Proyek Sipil (ProyekBerjalan)
| Model | Table | Key Fields |
|-------|-------|-----------|
| `ProyekBerjalan` | `proyek_berjalans` | id, nama_proyek, lead_id, lokasi, nilai_rab, tanggal_mulai, tanggal_selesai, created_by(pic) |
| `ProyekBerjalanTermin` | `proyek_berjalan_termins` | id, proyek_berjalan_id, urutan, nama, tanggal_mulai, tanggal_selesai, rab |
| `ProyekBerjalanTask` | `proyek_berjalan_tasks` | id, termin_id, nama_pekerjaan, tanggal_mulai, tanggal_selesai, status(Belum Mulai/Proses/Selesai), assigned_to |
| `RappMaterialKategori` | `rapp_material_kategoris` | id, termin_id, kode, nama, urutan |
| `RappMaterialItem` | `rapp_material_items` | id, kategori_id, material, vol, sat, harga_satuan, jumlah, urutan |
| `RappSipilItem` | `rapp_sipil_items` | id, termin_id, nama, vol?, sat, harga_satuan?, keterangan, jumlah, urutan |
| `RappVendorKategori` | `rapp_vendor_kategoris` | id, termin_id, nama, urutan |
| `RappVendorItem` | `rapp_vendor_items` | id, kategori_id, nama, vol, sat, harga_satuan, jumlah, urutan |
| **`SipilUsageLog`** | `sipil_usage_logs` | id, proyek_id, item_ref_type(material/sipil/vendor), item_ref_id, item_nama, item_satuan, qty_pakai, tanggal, catatan, created_by |

> `SipilUsageLog`: RAPP vol tidak berkurang — log hanya akumulasi. Total dipakai dihitung di frontend.

### Proyek Interior
| Model | Table | Key Fields |
|-------|-------|-----------|
| `ProyekInterior` | `proyek_interiors` | id, lead_id, lokasi, budget, tanggal_mulai, tanggal_selesai, created_by |
| `ProyekInteriorTermin` | `proyek_interior_termins` | id, proyek_interior_id, urutan, nama |
| `ProyekInteriorTask` | `proyek_interior_tasks` | id, termin_id, nama_pekerjaan, assigned_to, tanggal_mulai, tanggal_selesai, status |

### Stock Opname (legacy — menu Projek)
| Model | Table | Key Fields |
|-------|-------|-----------|
| `StockOpnameProject` | `stock_opname_projects` | id, lead_id, nama_client, lokasi, jumlah_termin, status |
| `StockOpnameTermin` | `stock_opname_termins` | id, project_id, termin_ke, nama, status |
| `StockOpnameRappItem` | `stock_opname_rapp_items` | id, termin_id, barang_id, nama_pekerjaan, qty_rapp, qty_tersisa, harga_manual, total |
| `StockOpnameUsageItem` | `stock_opname_usage_items` | id, rapp_item_id, tanggal_pakai, qty_dipakai, catatan |

### Form Checklist
| Model | Table | Key Fields |
|-------|-------|-----------|
| `ChecklistSipil` | `checklist_sipils` | id, proyek_id(→ProyekBerjalan), nama_pekerjaan, gambar_path?, gambar_selesai_path?, is_checked, urutan |
| `ChecklistInterior` | `checklist_interiors` | id, proyek_id(→ProyekInterior), nama_pekerjaan, gambar_path?, gambar_selesai_path?, is_checked, urutan |

### Docs / Link (polymorphic)
| Model | Table | Key Fields |
|-------|-------|-----------|
| `ProjectLink` | `project_links` | id(BigInt), linkable_type(String), linkable_id(BigInt), title, url, catatan, created_by |

**linkable_type values:** `"sipil_projek"`, `"desain_timeline"`, `"laporan_harian"`

### Warehouse & Barang
| Model | Table | Key Fields |
|-------|-------|-----------|
| `KategoriBarang` | `kategori_barangs` | id, nama (NO @unique) |
| `Barang` | `barangs` | id, kategori_id, nama, supplier, price, satuan |
| `Warehouse` | `warehouses` | id, nama, lokasi (NO @unique) |
| `StokWarehouse` | `stok_warehouses` | id, warehouse_id, barang_id, nama_barang, quantity, price, satuan |
| `BarangTermin` | `barang_termins` | id, termin_id, barang_id, quantity, price, total_harga, satuan |

### Finance
| Model | Table | Key Fields |
|-------|-------|-----------|
| `Invoice` | `invoices` | id, lead_id, invoice_number, tanggal, status(draft/Terbit/Lunas/Rejected), head_finance_*, admin_finance_* |
| `InvoiceItem` | `invoice_items` | id, invoice_id, description, quantity, unit_price, subtotal |
| `Kwitansi` | `kwitansis` | id, invoice_id(unique), nomor_kwitansi, tanggal, jumlah_diterima, penerima, metode_bayar, detail_bayar |
| `BankAccount` | `bank_accounts` | id, bank_name, account_number, account_name, is_active |
| `Reimburse` | `reimburses` | id, tanggal, user_id, kategori, keterangan, total, status, head_finance_*, admin_finance_* |
| `ReimburseItem` | `reimburse_items` | id, reimburse_id, deskripsi, jumlah |
| `AdmFinanceProject` | `adm_finance_projects` | id, lead_id, nama_proyek, klien, jenis, lokasi, tanggal_mulai, tanggal_selesai, status |
| `AdmFinanceTermin` | `adm_finance_termins` | id, project_id, nama_termin, tanggal, budget, deposit_awal, hf_signed_at, status |
| `AdmFinanceDeposit` | `adm_finance_deposits` | id, termin_id, jumlah, catatan, hf_signed_at, hf_signed_by, hf_name, hf_signature |
| `AdmFinancePeriode` | `adm_finance_periodes` | id, termin_id, nama_periode, tanggal_mulai, tanggal_selesai, budget, is_approved |
| `AdmFinanceItem` | `adm_finance_items` | id, periode_id, description, qty, unit_price, total, status |
| `AdmFinanceCashflow` | `adm_finance_cashflows` | id, termin_id, description, debit, kredit |
| `ProjekPR` | `projek_prs` | id, adm_finance_project_id, nomor_pr, tanggal, nama_toko, catatan, status, hf_signed_at, hf_signed_by, hf_name, hf_signature |
| `ProjekPRItem` | `projek_pr_items` | id, projek_pr_id, nama_item, satuan, qty, harga_perkiraan, is_from_rapp, rapp_qty, rapp_harga |
| `ProjekDokumen` | `projek_dokumens` | id, adm_finance_project_id, kategori, nama_file, file_type, file_data(blob), tanggal_upload |
| `AdministrasiKantor` | `administrasi_kantors` | id, lead_id, tanggal, keterangan, created_by |
| `SuratJalan` | `surat_jalans` | id, adm_finance_project_id, no_dokumen, tanggal, penerima, no_telp, keterangan, af_signed_at, af_name, af_signature |
| `SuratJalanItem` | `surat_jalan_items` | id, surat_jalan_id, nama_barang, description, qty, satuan |

### Tukang System
| Model | Table | Key Fields |
|-------|-------|-----------|
| `TukangRegistry` | `tukang_registries` | id, adm_finance_project_id, nama, jabatan, upah_harian, user_id(linked User), is_active |
| `TukangAbsenFoto` | `tukang_absen_fotos` | id, tukang_id, tanggal, foto String?(nullable — null jika delegasi admin), foto_timestamp, status(Pending/Disetujui/Ditolak), approved_by, catatan, created_by |
| `TukangCashbound` | `tukang_cashbounds` | id, tukang_id, jumlah, catatan, tanggal, sudah_dipotong |
| `GajiTukang` | `gaji_tukangs` | id, adm_finance_project_id, bulan, tahun, tanggal_mulai, tanggal_selesai, total_gaji |
| `GajiTukangItem` | `gaji_tukang_items` | id, gaji_tukang_id, tukang_id, hari_kerja, daily_rate, kasbon_dipotong, subtotal |
| `KwitansiGajiTukang` | `kwitansi_gaji_tukangs` | id, gaji_tukang_id, tukang_id, jumlah_gaji, kasbon_dipotong, tanggal_pembayaran |
| `AbsenTukang` | `absen_tukangs` | id, adm_finance_project_id, tanggal, created_by |

### Laporan & Reports
| Model | Table | Key Fields |
|-------|-------|-----------|
| `LaporanHarian` | `laporan_harians` | id, user_id, modul, kegiatan, kendala, tanggal_mulai, tanggal_selesai |
| `BdReport`, `ContentCreatorReport`, dll | `*_reports` | user_id, bulan, tahun, data(Json) |

### Client Portal
| Model | Table | Key Fields |
|-------|-------|-----------|
| `ClientPortalAccount` | `client_portal_accounts` | id, lead_id(unique), username(unique), password, is_active, last_login_at |
| `ClientPortalProject` | `client_portal_projects` | id, lead_id(unique), adm_finance_project_id(unique?), nama_proyek, klien, alamat, tanggal_mulai, tanggal_selesai, status_proyek, progress_persen, catatan, created_by |
| `ClientPortalPayment` | `client_portal_payments` | id, project_id, termin_ke, nama_termin, tagihan, retensi, status(Belum Dibayar/Sudah Dibayar), jatuh_tempo, tanggal_bayar |
| `ClientPortalGaleri` | `client_portal_galeris` | id, project_id, judul, deskripsi, file_path, file_data(Text), tanggal_foto, created_by |
| `ClientPortalDokumen` | `client_portal_dokumens` | id, project_id, nama_file, deskripsi, kategori, file_path, file_data(Text), file_type, tanggal_upload |
| `ClientPortalAktivitas` | `client_portal_aktivitas` | id, project_id, tanggal, judul, deskripsi, status(Dalam Proses/Selesai/Tertunda) |
| `ClientPortalGanttItem` | `client_portal_gantt_items` | id, project_id, nama_pekerjaan, tanggal_mulai, tanggal_selesai, status, urutan |
| `ClientPortalKontak` | `client_portal_kontaks` | id, project_id, role, nama, telepon, whatsapp, email, urutan |

> **Kehadiran tukang** di portal klien → reuse data `AbsenTukang` via `adm_finance_project_id` dari `ClientPortalProject`.

---

## 4. Authentication & JWT

- **Access token:** 15 menit, payload: `{ sub: userId.toString(), type: "access" }`
- **Refresh token:** 30 hari
- **Token userId:** `Number(user.id)` saat sign, `BigInt(payload.sub)` saat decode
- **Middleware `authenticate`:** decode → findUnique user → load `userPermissions: Set<string>` → set `req.user`, `req.userPermissions`

---

## 5. RBAC (Role-Permission System)

- Permission format: `{module}.{action}` (e.g., `bd.view`, `finance.sign_head`)
- Super Admin bypass semua permission check
- `requireRole("Super Admin")` — role-based
- `requirePermission("finance", "edit")` — permission-based
- Cek Super Admin di route handler: `req.user!.roles.some((r: any) => r.role.name === "Super Admin")`

### Modules & Permissions
| Module | Actions |
|--------|---------|
| bd | view, create, edit, delete, approve |
| content | view, create, edit, delete, approve |
| sales_admin | view, create, edit, delete |
| telemarketing | view, create, edit, delete |
| desain | view, create, edit, delete |
| sales | view, create, edit, delete |
| projek_sipil | view, create, edit, delete |
| projek_desain | view, create, edit, delete |
| projek_interior | view, create, edit, delete |
| finance | view, create, edit, delete, sign_head, sign_admin |
| pic | view, create, edit, delete |
| admin | view, create, edit, delete |
| tukang | absen_submit |
| tutorial | view, tutorial_aplikasi, api_eksternal, deployment |
| client | view, manage |

### Frontend Permission Helpers
- `authStore.hasPermission(module, action)`
- `authStore.hasAnyRole(...roles)`
- `authStore.isSuperAdmin()`
- `authStore.canView/Create/Edit/Delete(module)`

---

## 6. Frontend Structure

### Pages (App Router)
```
app/
  (auth)/login/
  (dashboard)/
    dashboard/
    profile/
    profile/password/          — Ganti password
    bd/
      dashboard/
      kanban/                  — PDF export (logo, alamat, notelfon di header)
      meta-ads/[id]/
    content/
      dashboard-sosmed/
      social-media/
      timelines/
      laporan-harian/
    sales-admin/
      kanban/                  — PDF export
      follow-up/
      kalender-survey/
      laporan-harian/
    telemarketing/
      kanban/                  — PDF export
      follow-up/
      kalender-survey/
      laporan-harian/
    desain/
      laporan-harian/
      (desain page: timeline list + Docs/Link view per timeline)
    sales/
      kanban/
      laporan-harian/
    projek/
      sipil/                   — List proyek
      sipil/[id]/              — Detail: tabs Daftar Termin | Gantt | Docs/Link | RAPP | Stock Opname | Form Checklist
      desain/                  — DesainTimeline dengan view List/Gantt/Docs
      interior/
      interior/[id]/           — Detail: tabs Daftar Termin | Gantt | RAPP | Dokumentasi | Form Checklist
    finance/
      invoice-kwitansi/        — Invoice + Kwitansi + Bank Accounts tab
      administrasi-projek/     — Tabs: Termin | PR | List Material | Surat Jalan | Dokumen | Cashflow | Tukang (5 inner tabs)
      administrasi-kantor/
      laporan-harian/
    pic/laporan-harian/
    absen/                     — Halaman tukang self-submit foto absen harian
    tutorial/
      tutorial-aplikasi/       — Tutorial penggunaan aplikasi
      api-eksternal/           — Dokumentasi API eksternal
      deployment/              — Panduan deployment
    client/                    — List client portal projects (stats: total/berjalan/selesai + tabel)
    client/[id]/               — Detail: 8 tabs (Info | Pembayaran | Galeri | Dokumen | Aktivitas | Gantt | Kontak | Kehadiran)
    admin/
      users/
      roles/                   — CRUD roles + permission matrix
      settings/
```

### Tab Menu Client Portal `[id]`
1. **Info** — Edit info proyek (nama, alamat, status, progress, tanggal) + reset password akun + toggle aktif/nonaktif, tampilkan URL portal
2. **Pembayaran** — CRUD termin pembayaran (tagihan, retensi, jatuh tempo, status Belum/Sudah Dibayar). Summary: total tagihan, terbayar, sisa
3. **Galeri** — Upload foto (multipart, field: `foto`), grid dengan overlay delete
4. **Dokumen** — Upload file dengan kategori (Kontrak/RAB/Desain/Laporan/Lainnya), preview+download
5. **Aktivitas** — CRUD riwayat pekerjaan dengan status (Selesai/Dalam Proses/Tertunda)
6. **Gantt** — CRUD item Gantt chart dengan tanggal + status + urutan
7. **Kontak** — CRUD kontak bantuan (role, nama, telepon, whatsapp, email) dalam card grid
8. **Kehadiran** — Read-only, data AbsenTukang via `adm_finance_project_id`, filterable by date range

### Tab Menu Projek Sipil `[id]`
1. **Daftar Termin** — CRUD termin + task
2. **Gantt Chart** — visualisasi timeline
3. **Docs/Link** — upload file PDF/image atau URL link (simpan ke `sipil-docs/`)
4. **RAPP** — anggaran material/sipil/vendor per termin (edit inline, PDF/Excel download). **UI Pagination: max 10 item per halaman** di AddItemDialog
5. **Stock Opname** — penggunaan harian item RAPP:
   - Sub-tab **Item RAPP**: tabel referensi vol RAPP + total dipakai + tombol Catat per item
   - Sub-tab **Riwayat Penggunaan**: tabel semua log harian
   - **Download PDF**: laporan lengkap (header logo+alamat+notelfon, tabel RAPP, tabel log)

### Tab Menu Administrasi Projek
1. **Termin** — CRUD termin, deposit awal + extra deposit (TTD HF), PDF termin
2. **PR (Purchase Request)** — Buat PR dengan items (manual/dari RAPP), approve/tolak, TTD HF, PDF. **UI Pagination: max 5 item per halaman** di form create/edit
3. **List Material** — Daftar material/toko dengan items
4. **Surat Jalan** — Surat jalan dengan items, TTD Admin Finance, PDF
5. **Dokumen** — Upload nota/bukti (base64), preview
6. **Cashflow** — Cashflow per termin, overview PDF
7. **Tukang** (5 inner tabs):
   - Registry tukang (CRUD + link User account)
   - Absen Foto (approve/reject + Checklist Hadir = delegasi tanpa foto)
   - Kasbon
   - Gajian (TTD AF + HF)
   - Kwitansi Gaji

### Tab Menu Laporan Harian (shared `laporan-harian.tsx`)
Dipakai oleh 8 modul: bd, content, sales_admin, telemarketing, desain, sales, finance, pic.
- Tab **Detail**: form tambah, list laporan
- Tab **Docs/Link** per laporan: URL link atau upload file (`laporan-docs/`)

### Key Frontend API Files
| File | Keterangan |
|------|------------|
| `src/lib/api/content.ts` | `sipilApi`, `interiorProjekApi`, `desainApi` dengan semua RAPP + stock opname + docs/link methods |
| `src/lib/api/finance.ts` | Finance API: invoice, admFinance, tukang, reimburse, PR, surat jalan, cashflow |
| `src/lib/api/clientManage.ts` | `clientApi`: semua client portal management (projects, payments, galeri, dokumen, aktivitas, gantt, kontak, kehadiran) |
| `src/lib/api/auth.ts` | Auth calls |
| `src/lib/api/admin.ts` | Admin calls |

### Key Frontend Component Files
| File | Keterangan |
|------|------------|
| `src/components/projek-pdf.tsx` | PDF proyek sipil/desain/interior (orange theme, logo) |
| `src/components/rapp-pdf.tsx` | PDF RAPP |
| `src/components/rapp-sipil.tsx` | RAPP Sipil view+edit component — AddItemDialog pagination max 10/page |
| `src/components/sipil-stock-opname-pdf.tsx` | PDF Stock Opname (header logo+alamat+notelfon) |
| `src/components/invoice-pdf.tsx` | Invoice PDF |
| `src/components/kwitansi-pdf.tsx` | Kwitansi PDF |
| `src/components/reimburse-pdf.tsx` | Reimburse PDF |
| `src/components/pr-pdf.tsx` | PR (Purchase Request) PDF |
| `src/components/surat-jalan-pdf.tsx` | Surat Jalan PDF |
| `src/components/cashflow-termin-pdf.tsx` | Cashflow per termin PDF |
| `src/components/cashflow-overview-pdf.tsx` | Cashflow overview PDF |
| `src/components/checklist-pdf.tsx` | Form Checklist PDF (sipil & interior) |
| `src/components/laporan-harian.tsx` | Shared laporan harian component (8 modul, tabs Detail+Docs) |
| `src/components/layout/sidebar.tsx` | Sidebar dengan permission filtering |
| `src/components/layout/sidebar-nav.ts` | NavGroups: permission + roles |
| `src/store/authStore.ts` | Zustand store: user, tokens, permission helpers |

### PDF Header Standard (semua PDF)
```
Logo (height:60px, width:auto proporsional) | RubahRumah
                                              Platform Desain and Build
                                              Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi
                                              Telp: 0813-7640-5550 | info.rubahrumah@gmail.com
```
Konstanta `COMPANY` ada di masing-masing PDF file. Update di sana jika info perusahaan berubah.

---

## 7. Common Patterns & Pitfalls

### BigInt
- Semua Prisma ID adalah `BigInt`
- `req.user!.id` adalah `bigint`
- `BigInt(req.params.id)` → untuk field BigInt
- JANGAN spread `{ ...req.body }` ke Prisma update → error 08P01 karena id field BigInt

### Decimal Fields
- Serialize ke JSON: `parseFloat(String(value))`
- Create: gunakan `0` bukan `null` (Decimal tidak accept null)

### Super Admin Check (Backend)
```ts
const isSuperAdmin = req.user!.roles.some((r: any) => r.role.name === "Super Admin");
```
Digunakan untuk override restriction tertentu (contoh: hapus Invoice Lunas).

### TukangAbsenFoto
- `foto` field adalah `String?` (nullable) — null jika absen didelegasi oleh admin via checklist
- Delegasi: `POST /adm-projek/:id/tukang/absen-checklist` → creates record `{ foto: null, status: "Disetujui" }`

### ProjectLink (polymorphic docs)
- `linkable_type + linkable_id` menentukan owner
- File upload: url dimulai dengan `/storage/{subdir}/` → serve via static handler
- Delete: cek url prefix sebelum hapus file fisik

### SipilUsageLog
- RAPP vol tidak berkurang — log hanya akumulasi
- `item_ref_type`: `"material"` | `"sipil"` | `"vendor"`
- Total dipakai dihitung di frontend dari sum logs per `"type:id"` key

### Invoice Status Mapping (FE ↔ DB)
| Frontend | Database |
|----------|----------|
| Draft | draft |
| Terbit | Terbit |
| Lunas | Lunas |
| Batal | Rejected |

### Invoice Delete Rules
- Status non-Lunas: semua role dengan `finance.delete` bisa hapus
- Status **Lunas**: **hanya Super Admin** yang bisa hapus (cascade hapus kwitansi + invoice items)
- Frontend: tombol Hapus muncul jika `canDelete && (status !== "Lunas" || isSuperAdmin())`

### Invoice Number Format
- Sipil: `RR-SP-DD/MM/YYYY`, Desain: `RR-DS-...`, Interior: `RR-INT-...`
- Kwitansi: `KWT-YYYYMM-{4digit}`
- PR: `PR-001`, `PR-002`, dst. (auto-increment per proyek)

### UI Pagination (Frontend Only)
- **RAPP AddItemDialog**: max 10 item per halaman, auto-pindah ke halaman baru saat Tambah Baris
- **PR Create/Edit form**: max 5 item per halaman, auto-pindah ke halaman terakhir saat Tambah Baris

### KategoriBarang & Warehouse
- Tidak ada `@unique` pada `nama` — gunakan `create`, bukan `upsert`

---

## 8. Seeder

- File: `prisma/seed.ts` — Script: `npm run seed`
- Password semua: `password123`
- Accounts: `admin@test.com` (Super Admin), `bd@test.com`, `sales@test.com`, `finance@test.com`, `content@test.com`, `desain@test.com`, `pic@test.com`

---

## 9. Config & Environment

**Backend (`new-app/backend/.env`):**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
STORAGE_PATH=./storage
```

**Frontend internal (`new-app/frontend/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Client Portal (`rubahrumah/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Static files: `GET /storage/{path}` → serve dari `config.storagePath`

### Port Mapping
| App | Port | URL |
|-----|------|-----|
| Backend (Express) | 8000 | http://localhost:8000 |
| Frontend internal (new-app) | 3000 | http://localhost:3000 |
| Client Portal (rubahrumah) | 3001 | http://localhost:3001 |

### Run Commands
```bash
# Backend
cd new-app/backend && npm run dev

# Frontend internal
cd new-app/frontend && npm run dev

# Client Portal
cd rubahrumah && npm run dev -- -p 3001
```

### Catatan Rubahrumah (Client Portal App)
- Next.js 16 + Tailwind v4 + Turbopack
- `postcss.config.mjs` harus pass `base: __dirname` ke `@tailwindcss/postcss` (workaround: `.git` ada di parent folder sehingga `process.cwd()` resolve ke parent)
- Auth token disimpan di `localStorage` sebagai `cp_token` + `cp_username`
- `lib/apiClient.ts` — semua API calls ke `/api/v1/client-portal`, auto-redirect ke `/login` jika 401/403

---

## 10. How to Update This Docs

Setiap kali ada perubahan fitur:
- **Route baru** → update section 2.x sesuai prefix
- **Model baru/berubah** → update section 3
- **Page/tab baru** → update section 6
- **Permission baru** → update section 5
- **Behavior/aturan bisnis** → update section 7

Format: singkat, tabel-based, no fluff.
