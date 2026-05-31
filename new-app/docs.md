# Report Rubru - Design Brief untuk Google Stitch

> Tujuan dokumen: menjadi brief lengkap untuk membuat redesain UI `new-app` di Google Stitch.
> Target: aplikasi internal operasional PT Rubah Rumah Inovasi Pemuda, bukan landing page.
> Last updated: 2026-05-29

---

## 1. Ringkasan Produk

`new-app` adalah aplikasi internal bernama **Report Rubru**. Aplikasi ini dipakai oleh banyak divisi untuk mengelola lead, penawaran, proyek, finance, absen, konten website, SOP, dan client portal management.

Desain harus terasa seperti **operational dashboard**: padat, cepat dibaca, profesional, dan nyaman dipakai setiap hari. Hindari gaya landing page, hero besar, ilustrasi dekoratif berlebihan, dan card yang terlalu besar. Prioritaskan tabel, filter, status, action, kalender, kanban, dan form panjang.

### Karakter Produk

| Aspek | Arahan |
| --- | --- |
| Tipe aplikasi | Internal business operations dashboard |
| Pengguna | Karyawan, sales, finance, PIC, admin, tukang, mitra |
| Perangkat | Desktop utama, mobile tetap harus usable untuk absen/tugas lapangan |
| Bahasa UI | Indonesia |
| Brand | RubahRumah / Report Rubru |
| Mood | Modern, rapi, cepat, tegas, tidak terlalu playful |

---

## 2. Tujuan Redesain

1. Membuat tampilan lebih modern tanpa mengubah struktur workflow utama.
2. Membuat halaman data berat lebih mudah discan: tabel, badge status, filter, action bar.
3. Mengurangi kesan berantakan pada sidebar yang memiliki banyak modul.
4. Membuat form panjang terasa lebih terstruktur dengan section, sticky actions, dan validasi jelas.
5. Membuat mobile view tetap efektif untuk absen, kalender, dokumentasi, dan approval.
6. Menjaga konsistensi komponen di seluruh modul.

---

## 3. Prompt Utama untuk Google Stitch

Gunakan prompt ini sebagai prompt pertama:

```text
Design a modern internal operations dashboard for "Report Rubru", an Indonesian construction, renovation, interior, pest-control, and project finance management platform.

This is not a marketing website. It is a dense, professional, role-based business application used daily by sales, finance, project managers, admin, content team, and field workers.

Create a clean desktop-first dashboard UI with a dark collapsible sidebar, sticky top header, responsive main content area, compact cards, advanced tables, filters, tabs, kanban boards, calendar views, forms, document/PDF preview sections, approval flows, and mobile-friendly field-worker screens.

Brand colors: RubahRumah orange (#F97316), deep navy/slate (#0F172A), teal (#0D9488), blue (#2563EB), green (#16A34A), amber (#F59E0B), red (#DC2626). Use mostly neutral white/slate backgrounds with orange as primary accent, not an all-orange interface.

Use Indonesian labels. Prioritize scanability, clear status badges, compact spacing, predictable actions, and strong hierarchy for data-heavy operational pages.
```

---

## 4. Design Principles

### 4.1 Operational, Bukan Marketing

- Tidak perlu hero section.
- Tidak perlu copywriting panjang.
- Tidak perlu ilustrasi besar.
- First screen setelah login harus langsung berisi pekerjaan yang bisa dilakukan.
- Layout harus mendukung user yang membuka aplikasi berkali-kali dalam sehari.

### 4.2 Dense Tapi Teratur

- Gunakan spacing compact.
- Cards boleh dipakai untuk stats, quick actions, repeated items, dan modal.
- Jangan membuat page section besar dalam bentuk card bertumpuk.
- Tabel dan filter harus menjadi komponen utama untuk modul admin.

### 4.3 Role-Based

UI harus terasa seperti aplikasi dengan akses berbasis role. Sidebar dan dashboard menampilkan modul sesuai permission user.

Role umum:

| Role | Fokus utama |
| --- | --- |
| Super Admin | Semua modul, users, roles, settings |
| BD | Dashboard BD, Kanban BD, Meta Ads, Report Analytics |
| Content Creator | Social media, timeline konten, laporan harian |
| Sales Admin | Follow up leads, kanban admin, kalender survey |
| Sales Admin Product dan Mitra | RKR, Golden, Filter Air |
| Desain | Follow up after survey, projek desain, laporan harian |
| Sales | Kanban sales, addendum, laporan harian |
| PIC Project | Kalender visit, upload dokumentasi, laporan harian |
| Finance | Invoice, kwitansi, AR, administrasi proyek, kasbon/gaji/tukang |
| Tukang | Absen harian sederhana |
| Client Manager | Kelola akun dan data client portal |

---

## 5. Brand dan Visual Direction

### 5.1 Warna

Gunakan palette netral dengan aksen orange.

| Token | Warna | Usage |
| --- | --- | --- |
| Primary Orange | `#F97316` | Primary button, active nav, CTA utama |
| Orange Hover | `#EA580C` | Hover primary |
| Navy | `#0F172A` | Sidebar, headings penting |
| Slate Text | `#334155` | Body text |
| Muted Text | `#64748B` | Secondary text |
| Background | `#F8FAFC` | App background |
| Surface | `#FFFFFF` | Cards, table, modal |
| Border | `#E2E8F0` | Border halus |
| Teal | `#0D9488` | Client/project states |
| Blue | `#2563EB` | Info, link, analytics |
| Green | `#16A34A` | Success/lunas/disetujui |
| Amber | `#F59E0B` | Pending/menunggu |
| Red | `#DC2626` | Error/ditolak/overdue |
| Purple | `#7C3AED` | Desain/content accent |

### 5.2 Typography

| Level | Arahan |
| --- | --- |
| Font utama | Inter atau similar sans-serif |
| Page title | 24-28px, 700 |
| Section title | 16-18px, 600 |
| Table body | 13-14px |
| Form label | 12-13px, 500 |
| Badge | 11-12px, 600 |

Jangan gunakan font terlalu besar pada dashboard internal. Hero-scale type hanya untuk login atau empty state khusus.

### 5.3 Shape dan Shadow

| Elemen | Arahan |
| --- | --- |
| Radius card | 8px |
| Radius input/button | 6-8px |
| Shadow | Minimal, mostly border-based |
| Border | `1px solid #E2E8F0` |
| Density | Compact enterprise UI |

---

## 6. App Shell

### 6.1 Desktop Layout

Desktop adalah target utama.

```text
┌──────────────────────────────────────────────────────────────┐
│ Sidebar 260px │ Header sticky 64px                           │
│ dark navy     ├───────────────────────────────────────────────┤
│ grouped nav   │ Page content max-width 1280/1440              │
│ scrollable    │ filters, cards, tables, tabs, modals          │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Sidebar

Sidebar harus tetap gelap agar navigasi modul besar mudah dipisahkan dari konten.

Specs:

| Item | Arahan |
| --- | --- |
| Width | 260px desktop |
| Background | Navy/slate dark |
| Brand area | Logo + "Report Rubru" + "PT. Rubah Rumah" |
| Nav groups | Collapsible groups |
| Active item | Orange-tinted background + orange text/icon |
| Group indicator | Small colored dot per module |
| User info | Fixed bottom area with name, email, role chips |

Group sidebar:

1. Dashboard
2. BD
3. Content Creator
4. Database Client
5. Sales Admin
6. Sales Admin Product dan Mitra
7. Desain
8. Sales
9. Penawaran
10. Projek
11. Finance
12. PIC Project
13. Tukang
14. Client Portal
15. Web Rubah Rumah
16. RubahrumahxGolden
17. Admin
18. Tutorial

### 6.3 Header

Header sticky 64px.

Isi:

| Area | Isi |
| --- | --- |
| Left mobile | Hamburger button |
| Center/left | Optional breadcrumb/page context |
| Right | Notification bell, quick command/search, user menu |

Tambahkan search/command optional untuk desktop:

```text
Cari modul, client, invoice, proyek...
```

### 6.4 Mobile Shell

Mobile:

- Sidebar menjadi drawer/sheet.
- Header tetap sticky.
- Main padding 16px.
- Tabel berubah menjadi card list atau horizontal scroll.
- Action utama sticky di bawah untuk form panjang.

---

## 7. Komponen Global

### 7.1 Page Header

Pattern:

```text
Title
Description singkat
[Primary Action] [Secondary Action]
```

Contoh:

```text
Invoice & Kwitansi
Kelola invoice, status pembayaran, kwitansi, dan rekening bank.
[Tambah Invoice] [Download PDF]
```

### 7.2 Stats Cards

Compact, 4 kartu per row desktop.

Isi:

- Label kecil
- Angka besar
- Trend/subtext
- Icon kanan atas
- Warna icon sesuai modul

### 7.3 Filter Bar

Harus konsisten di halaman list.

Elemen umum:

- Search input
- Date range
- Status select
- Role/user select
- Product/category select
- Reset filter
- Export/PDF button

Desktop: horizontal.
Mobile: collapsible filter panel.

### 7.4 Data Table

Wajib untuk modul data berat.

Specs:

| Area | Arahan |
| --- | --- |
| Header | Sticky if table long |
| Row height | 44-52px |
| Action column | Right aligned, icon buttons/menu |
| Status | Badge color-coded |
| Empty state | Small icon + message + CTA |
| Pagination | Bottom right |
| Bulk action | Checkbox + top bulk bar |

### 7.5 Status Badge

| Status | Warna |
| --- | --- |
| Lunas / Selesai / Disetujui | Green |
| Pending / Dalam Proses / Terbit | Amber or Blue |
| Ditolak / Overdue / Tertunda | Red |
| Draft | Slate |
| Closing | Green |
| Outstanding | Amber |

### 7.6 Forms

Untuk form panjang:

- Gunakan section dengan heading kecil.
- Gunakan grid 2 kolom desktop, 1 kolom mobile.
- Gunakan required marker.
- Error text tepat di bawah input.
- Sticky footer actions: `Batal`, `Simpan Draft`, `Simpan`.
- Untuk upload file: drag area + preview + remove.

### 7.7 Dialog / Modal

Gunakan modal untuk create/edit cepat.
Untuk form sangat panjang, gunakan full-height drawer kanan atau page terpisah.

### 7.8 Tabs

Tabs dipakai pada detail proyek dan administrasi.

Desktop:

- Horizontal tabs.
- If many tabs, allow horizontal scroll.

Mobile:

- Segmented dropdown atau horizontal scroll tabs.

---

## 8. Halaman Utama

### 8.1 Login

Tujuan: login cepat, profesional, brand jelas.

Layout:

| Desktop | Mobile |
| --- | --- |
| Centered login card dengan background neutral/brand subtle | Full screen centered card |

Elemen:

- Logo RubahRumah.
- Title: `Report Rubru`
- Subtitle: `Masuk ke akun Anda untuk melanjutkan`
- Email input.
- Password input dengan show/hide icon.
- Button: `Masuk`
- Help text: `Hubungi administrator jika lupa password`

Prompt Stitch:

```text
Create a clean Indonesian login screen for "Report Rubru". Center a compact login card on a light slate background, with RubahRumah logo at the top, email and password fields, a show-password icon button, orange primary login button, and small administrator help text. Keep it professional and minimal.
```

### 8.2 Dashboard Home

Tujuan: quick access dan ringkasan aktivitas user.

Konten:

- Greeting: `Selamat pagi, {Nama}`
- Role badges.
- Absen harian card.
- Izin/cuti card.
- Pesan internal: kirim pesan + riwayat pesan.
- Stats cards: leads, database client, pipeline.
- Akses cepat sesuai role.

Layout desktop:

```text
Greeting + role chips
2-column: Absen Harian | Pengajuan Izin
2-column: Kirim Pesan | Riwayat Pesan
Stats cards
Quick access grid
```

Prompt Stitch:

```text
Design the Report Rubru dashboard home for logged-in employees. Include a compact greeting, role chips, daily attendance card with check-in/check-out buttons, leave/request card, internal message composer, message history, lead stats cards, and quick-access module cards. Use an enterprise dashboard style with clean white cards, slate background, orange primary accent, and dense spacing.
```

### 8.3 Dashboard Tukang

Untuk role Tukang, dashboard harus sangat sederhana.

Konten:

- Welcome message.
- Primary action: `Absen Harian Tukang`
- Optional status absen hari ini.
- Mobile-first.

---

## 9. Modul dan Screen Design

### 9.1 BD

Pages:

- Dashboard BD
- Kanban BD
- Meta Ads
- Report dan Analytics

Design:

- Gunakan warna aksen indigo/blue.
- Dashboard berisi KPI cards, chart, list aktivitas.
- Kanban berisi column pipeline dengan cards compact.
- Meta Ads berisi filter tanggal, campaign table, chart, metric cards.
- Report Analytics berisi tabs dan export PDF.

Prompt:

```text
Design a BD module dashboard for Report Rubru with KPI cards, pipeline summary, Meta Ads performance chart, lead source breakdown, and recent activity table. Use compact enterprise analytics layout, Indonesian labels, and blue/indigo accents.
```

### 9.2 Content Creator

Pages:

- Dashboard Sosmed
- Sosial Media
- Timeline Konten
- Laporan Harian

Design:

- Aksen pink/purple secukupnya.
- Timeline konten pakai calendar/list hybrid.
- Social media table berisi platform, tanggal, status, asset, caption preview.
- Laporan harian memakai shared layout.

### 9.3 Database Client

Halaman: `Data Klien`.

Design:

- Table utama berisi nama, salutation, telepon, alamat, kategori, sumber, status.
- Filter by kategori/payment/product.
- Detail client dalam drawer kanan.
- CTA: tambah client, import, export.

Prompt:

```text
Design a client database management page for an Indonesian internal CRM. Include a filter bar, searchable client table, status/category badges, action menu, and right-side client detail drawer. Keep it dense, clean, and suitable for daily admin use.
```

### 9.4 Sales Admin

Pages:

- Kanban Admin
- Follow Up Leads
- Kalender Survey
- Laporan Harian

Design:

- Kanban harus compact dengan month filter.
- Card lead berisi nama client, nomor, sumber, status follow up, deadline, PIC.
- Follow Up Leads table dengan riwayat follow up dan attachment preview.
- Kalender Survey: calendar view + list samping.

### 9.5 Sales Admin Product dan Mitra

Produk:

- RKR
- Golden
- Filter Air

Pages:

- Kanban Admin RKR
- Kanban Admin Golden
- Kanban Admin Filter Air
- Follow Up Leads RKR
- Follow Up Leads Golden
- Follow Up Leads Filter Air
- Kalender Survey RKR
- Kalender Survey Golden
- Kalender After AP Golden
- Kalender Survey Filter Air
- Kalender Instalasi Filter Air
- Laporan Harian

Design:

- Beri product switcher/chips agar user tidak bingung antara RKR, Golden, Filter Air.
- Kalender Golden dan Filter Air harus menonjolkan schedule, PIC, status, dan action WhatsApp.

### 9.6 Desain

Pages:

- Follow Up After Survey
- Projek Desain
- Laporan Harian

Projek Desain:

- List/Gantt/Docs views.
- Timeline dengan RO, client, status, tanggal mulai/selesai.
- Detail timeline dengan docs/link.

Design:

- Aksen purple.
- Gunakan Gantt chart compact.
- Cards timeline jangan terlalu besar.

### 9.7 Sales

Pages:

- Kanban Sales
- Addendum Kontrak
- Laporan Harian

Design:

- Kanban sales fokus closing, outstanding, follow up.
- Addendum Kontrak harus form dokumen dengan preview PDF.
- Gunakan action jelas: buat addendum, preview, download.

### 9.8 Penawaran

Pages:

- Penawaran Desain
- Penawaran RKR
- Penawaran Golden
- Penawaran Filter Air

Design:

- Split view desktop: form kiri, document preview kanan.
- Preview harus terlihat seperti halaman A4.
- Toolbar preview: `Preview`, `Print`, `Download PDF`, `Reset`.
- Form dibuat sectioned:
  - Data client
  - Detail pekerjaan
  - Biaya/termin
  - Syarat dan ketentuan
  - Kontak/RO

Prompt:

```text
Design a document offer builder for Report Rubru. Create a two-pane layout: structured form on the left and A4 document preview on the right. Include sections for client data, work details, pricing, payment terms, conditions, and signature/contact. Use orange primary actions and a professional document-management interface.
```

### 9.9 Projek

Pages:

- Projek Sipil list
- Projek Sipil detail
- Projek Interior list
- Projek Interior detail
- Projek Desain
- Gudang/Workshop
- Kalender Visit
- Upload Dokumentasi Projek

#### Projek Sipil Detail Tabs

1. Daftar Termin
2. Gantt Chart
3. Docs/Link
4. RAPP
5. Stock Opname
6. Form Checklist

#### Projek Interior Detail Tabs

1. Daftar Termin
2. Gantt Chart
3. RAPP
4. Dokumentasi
5. Form Checklist

Design:

- Detail proyek harus punya header summary sticky-ish:
  - Nama proyek
  - Client
  - Lokasi
  - Status
  - Progress
  - PIC
  - Action buttons
- Tabs di bawah header.
- RAPP dan Stock Opname butuh table-heavy design.
- Checklist pakai item list dengan checkbox, foto sebelum/sesudah, status.

Prompt:

```text
Design a construction project detail page for Report Rubru. Include a compact project summary header, status/progress indicators, action buttons, and tabbed content for Termin, Gantt Chart, Docs/Link, RAPP budget table, Stock Opname usage log, and Checklist with before/after photos. Make it dense, clear, and suitable for project managers.
```

### 9.10 Finance

Pages:

- Invoice & Kwitansi
- AR Outstanding
- Administrasi Projek
- Administrasi Kantor
- Absen Karyawan
- Laporan Harian

#### Invoice & Kwitansi

Tabs:

- Invoice
- Kwitansi
- Bank Accounts

Design:

- Table invoice dengan status Draft/Terbit/Lunas/Rejected.
- Summary cards: total invoice, lunas, outstanding, overdue.
- Action: create, preview PDF, download, mark paid, delete.
- Kategori: Payment Sipil, Desain, Interior, Golden, RKR, Filter Air.

#### AR Outstanding

Tabs:

- Tagihan Projek
- Tagihan Golden
- Tagihan RKR
- Tagihan Filter Air

Design:

- Aging summary.
- Table by client.
- Outstanding value prominent.
- Filter date/product/status.

#### Administrasi Projek

Tabs:

1. Termin
2. PR
3. List Material
4. Surat Jalan
5. Dokumen
6. Cashflow
7. Tukang

Tukang inner tabs:

- Registry Tukang
- Absen Foto
- Kasbon
- Gajian
- Kwitansi Gaji

Prompt:

```text
Design a finance operations module for a construction company. Include invoice and receipt management, AR outstanding dashboard, project administration tabs, purchase request table, cashflow, document upload, delivery note, and worker payroll/attendance tabs. Use compact tables, status badges, approval/signature indicators, and PDF action buttons.
```

### 9.11 PIC Project

Pages:

- Laporan Harian
- Kalender Visit
- Upload Dokumentasi Projek

Design:

- Mobile-friendly.
- Upload foto harus jelas: preview, notes, project selector.
- Kalender Visit harus menampilkan jadwal, lokasi, client, action WhatsApp/maps.

### 9.12 Tukang

Page:

- Absen Harian

Design:

- Mobile-first.
- Card besar untuk status hari ini.
- Tombol utama: `Absen Masuk`, `Absen Keluar`.
- Camera preview.
- GPS status.
- Jika di luar kantor, tampilkan textarea alasan.
- Riwayat singkat.

Prompt:

```text
Design a mobile-first daily attendance screen for field workers. Include today's attendance status, check-in and check-out buttons, camera capture preview, GPS/location status badge, reason textarea when outside office radius, and simple history list. Use large touch targets and Indonesian labels.
```

### 9.13 Client Portal Management

Pages:

- List client portal projects
- Detail client portal project

Detail tabs:

1. Info
2. Pembayaran
3. Galeri
4. Dokumen
5. Aktivitas
6. Gantt
7. Kontak
8. Kehadiran

Design:

- List page: stats total/berjalan/selesai + table akun client.
- Detail page: manage portal content in tabs.
- Info tab: akun aktif/nonaktif, reset password, portal URL copy button.
- Galeri: upload grid with image preview.
- Dokumen: file list with category.
- Aktivitas/Gantt: timeline status.

### 9.14 Web Rubah Rumah CMS

Pages:

- Kalkulator Harga
- Banner / Hero
- Projek Berjalan
- Portofolio
- Artikel
- Testimoni
- Konfigurasi & Kontak

Design:

- CMS management layout.
- Table/list with preview thumbnail.
- Form editor with image upload.
- Status publish/draft.
- Article editor supports rich text.

### 9.15 RubahrumahxGolden

Pages:

- Dashboard Ads
- Meta Ads
- Follow Up Leads
- Kanban Admin
- Kalender Survey
- Kalender After Pengerjaan
- Kanban Sales
- AR Golden

Design:

- Aksen amber/gold, tapi tetap neutral.
- Golden module harus terasa sebagai product line terpisah.
- Survey detail memakai form laporan inspeksi: informasi survey, area, temuan hama, rekomendasi, material, foto, tanda tangan.
- After pengerjaan memakai report detail + foto dokumentasi.

### 9.16 Admin

Pages:

- Users
- Roles
- Pengaturan

Design:

- Users table dengan role chips dan status aktif.
- Roles page berisi permission matrix.
- Matrix harus mudah discan dengan grouped permissions.
- Settings page berupa section cards.

### 9.17 Tutorial

Pages:

- Tutorial Aplikasi
- Tutorial API Eksternal
- Tutorial Deployment
- SOP

Design:

- Knowledge base style.
- Sidebar/list artikel kiri, detail kanan.
- SOP detail dengan image attachment preview dan PDF download.

---

## 10. Data Visualization

Gunakan chart hanya jika membantu keputusan.

| Use case | Chart |
| --- | --- |
| Ads performance | Line chart + metric cards |
| Lead source | Donut/bar |
| Sales pipeline | Kanban + funnel stats |
| Finance AR | Aging bars + outstanding cards |
| Project timeline | Gantt chart |
| Calendar survey/install | Calendar/list hybrid |

Chart styling:

- Minimal.
- Label jelas.
- Tooltip sederhana.
- Jangan pakai warna terlalu banyak.

---

## 11. Responsive Behavior

### Desktop

- Sidebar fixed.
- Tables full width.
- Filter horizontal.
- Dialog/drawer for create/edit.
- Split view for document builder.

### Tablet

- Sidebar collapsible.
- 2-column cards.
- Tables may horizontal scroll.

### Mobile

- Sidebar drawer.
- Cards replace table rows where appropriate.
- Primary action sticky bottom.
- Search/filter collapsible.
- Camera/upload flows optimized.

---

## 12. States yang Harus Ada

Setiap screen penting harus punya state:

| State | Arahan |
| --- | --- |
| Loading | Skeleton table/card, bukan blank page |
| Empty | Icon kecil, message, CTA |
| Error | Inline alert dengan retry |
| Success | Toast singkat |
| Disabled | Button jelas disabled |
| Dirty form | Confirm sebelum keluar |
| Long processing | Button loading + spinner |
| Unauthorized | Empty/access denied state |

---

## 13. Accessibility

- Contrast minimal WCAG AA.
- Semua icon button punya tooltip/aria label.
- Focus state jelas.
- Table action bisa diakses keyboard.
- Form error dekat field terkait.
- Jangan hanya mengandalkan warna untuk status; gunakan label text.

---

## 14. Component Inventory untuk Stitch

Minta Stitch membuat komponen berikut:

1. AppShell
2. Sidebar
3. Header
4. PageHeader
5. StatsCard
6. FilterBar
7. DataTable
8. StatusBadge
9. ActionMenu
10. FormSection
11. FileUpload
12. ImageGallery
13. KanbanBoard
14. CalendarSchedule
15. GanttChart
16. DocumentPreview
17. ApprovalSignatureBlock
18. EmptyState
19. LoadingSkeleton
20. MobileAttendanceCard

---

## 15. Screen Set yang Disarankan untuk Dibuat di Stitch

Prioritas desain:

| Prioritas | Screen |
| --- | --- |
| 1 | Login |
| 1 | Dashboard Home |
| 1 | App Shell + Sidebar lengkap |
| 1 | Finance - Invoice & Kwitansi |
| 1 | Projek Sipil Detail |
| 1 | Sales Admin Kanban |
| 1 | Penawaran Document Builder |
| 2 | Client Portal Management Detail |
| 2 | Tukang Absen Mobile |
| 2 | RubahrumahxGolden Survey Detail |
| 2 | Admin Roles Permission Matrix |
| 3 | Web Rubah Rumah CMS Artikel |
| 3 | Tutorial SOP Detail |

---

## 16. Prompt Per Screen

### 16.1 App Shell

```text
Create a desktop app shell for Report Rubru. Use a dark navy 260px sidebar with RubahRumah logo, grouped collapsible navigation, colored group dots, orange active state, and user profile pinned at bottom. Add a sticky 64px top header with mobile menu, search/command input, notification icon, and user menu. Main content uses light slate background and max-width dashboard content.
```

### 16.2 Finance Invoice

```text
Design the "Invoice & Kwitansi" finance page in Indonesian. Include a page header with actions, four summary cards, tabs for Invoice/Kwitansi/Bank Accounts, a filter bar with search/date/status/category, and a dense invoice table with status badges, amounts in Rupiah, due dates, payment date, and action menu. Use orange primary button and green/amber/red status badges.
```

### 16.3 Project Detail

```text
Design a "Projek Sipil Detail" page for a construction project management dashboard. Include a compact summary header with project name, client, location, dates, status badge, progress bar, and actions. Below it show tabs: Daftar Termin, Gantt Chart, Docs/Link, RAPP, Stock Opname, Form Checklist. Show the RAPP tab with a dense budget table, item categories, quantities, prices, totals, and PDF/Excel export buttons.
```

### 16.4 Kanban

```text
Design a Sales Admin Kanban page for lead follow-up. Include month/year filter, product/source filter, search, summary metrics, and multiple kanban columns with compact lead cards. Each card should show client name, phone, source, last follow-up, deadline, PIC, status badge, and quick actions.
```

### 16.5 Offer Builder

```text
Design a Penawaran builder page for Report Rubru. Use a split layout: left side is a sectioned form for client, project details, pricing, terms, and contacts; right side is an A4 document preview with toolbar actions Preview, Print, Download PDF. Make the document preview look like a formal Indonesian quotation letter with company logo and signature area.
```

### 16.6 Golden Survey Detail

```text
Design a RubahrumahxGolden survey detail form for pest-control inspection. Include sections for Informasi Survey, Area yang Disurvey, Jenis Hama yang Ditemukan, Detail Temuan Lapangan, Rekomendasi Treatment, Kebutuhan Alat/Material, Foto Area Survey, Foto Temuan Hama, and signature/PDF actions. Use amber accent but keep the app neutral and professional.
```

### 16.7 Admin Roles

```text
Design an Admin Roles permission matrix page. Include role list on the left, selected role detail on the right, grouped permission matrix with checkboxes, module names, action columns, search/filter permissions, and save/cancel actions. Make it clear, compact, and suitable for Super Admin.
```

### 16.8 Mobile Attendance

```text
Design a mobile attendance screen for Report Rubru field workers. Include today's status, check-in/check-out large buttons, camera capture card, GPS status, reason field when outside allowed radius, and recent history. Use simple Indonesian labels and large touch targets.
```

---

## 17. Copywriting UI

Gunakan label Indonesia yang pendek.

Common:

| English Concept | Indonesian Label |
| --- | --- |
| Dashboard | Dashboard |
| Search | Cari |
| Filter | Filter |
| Reset | Reset |
| Add | Tambah |
| Edit | Edit |
| Delete | Hapus |
| Save | Simpan |
| Cancel | Batal |
| Download PDF | Download PDF |
| Print | Cetak |
| Export | Export |
| Detail | Detail |
| Status | Status |
| Due date | Jatuh Tempo |
| Paid | Lunas |
| Unpaid | Belum Dibayar |
| Pending | Menunggu |
| Approved | Disetujui |
| Rejected | Ditolak |

---

## 18. Do and Don't

### Do

- Gunakan layout dashboard yang padat.
- Gunakan tabel untuk data besar.
- Gunakan badges status di semua workflow approval/payment/project.
- Buat filter selalu terlihat atau mudah dibuka.
- Buat action utama mudah ditemukan.
- Gunakan icon lucide-style yang familiar.
- Buat responsive mobile untuk field workflow.

### Don't

- Jangan buat landing page.
- Jangan buat hero marketing.
- Jangan dominasi warna orange di seluruh halaman.
- Jangan pakai cards besar untuk semua data.
- Jangan sembunyikan action penting di tempat tidak jelas.
- Jangan membuat UI terlalu kosong.
- Jangan pakai gradient dekoratif berlebihan.
- Jangan membuat font besar di tabel/dashboard.

---

## 19. Implementasi Teknis Saat Ini

Bagian ini untuk menjaga desain tetap realistis terhadap app yang ada.

| Area | Tech |
| --- | --- |
| Framework | Next.js 14 App Router |
| React | React 18 |
| Styling | Tailwind CSS 3 |
| UI primitives | Radix UI |
| Icons | lucide-react |
| Tables | TanStack Table |
| Data fetching | TanStack Query + Axios |
| Forms | react-hook-form + zod |
| State | Zustand |
| Charts | Recharts |
| Drag and drop | @hello-pangea/dnd |
| PDF | @react-pdf/renderer + print browser |

Existing shell:

- Sidebar width: 260px.
- Header height: 64px.
- Main content max width: `max-w-7xl`.
- Current brand asset: `/images/logo.png`.
- Current app name: `Report Rubru`.

---

## 20. Expected Output dari Stitch

Output yang diharapkan:

1. High-fidelity UI mockup.
2. Desktop app shell.
3. Mobile attendance screen.
4. Design tokens: colors, spacing, typography.
5. Reusable components.
6. Key screens listed in section 15.
7. Indonesian labels.
8. Dashboard/data-heavy style, not marketing.

---

## 21. Acceptance Checklist

Desain dianggap cocok jika:

- Sidebar bisa menampung banyak modul tanpa terasa kacau.
- Dashboard langsung usable tanpa hero.
- Finance invoice page mudah dipakai untuk mencari, filter, dan action invoice.
- Project detail page bisa menampung banyak tab dan tabel besar.
- Offer builder jelas membedakan form dan preview dokumen.
- Mobile absen bisa dipakai dengan satu tangan.
- Status payment/project/approval terlihat jelas.
- Visual brand RubahRumah terasa lewat logo dan aksen orange, bukan seluruh layar orange.
- Semua halaman terasa satu sistem yang konsisten.

