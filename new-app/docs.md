# RubahRumah — System Documentation

> Dokumen referensi lengkap untuk AI coding agent. Update file ini setiap ada perubahan fitur besar.
> Last updated: 2026-03-08

---

## 1. Tech Stack & Paths

| Layer | Tech | Path |
|-------|------|------|
| Backend | Node.js + Express + TypeScript + Prisma + PostgreSQL | `new-app/backend/` |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | `new-app/frontend/` |
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
| POST | `/leads/:id/approve-survey` | Approve survey |
| POST | `/leads/:id/reject-survey` | Reject survey |
| GET | `/meta-ads` | List Meta Ads campaigns |
| POST | `/meta-ads` | Create campaign |
| GET/PATCH/DELETE | `/meta-ads/:id` | Detail / update / hapus |
| GET/POST | `/meta-ads/:id/content-metrics` | Ad content metrics |
| GET/POST | `/meta-ads/:id/chat-metrics` | WhatsApp chat metrics |
| GET | `/dashboard` | BD dashboard summary |
| GET | `/kanban/columns` | Kanban columns |
| GET | `/kanban/cards` | Kanban cards |
| POST | `/kanban/columns` | Create column |
| POST | `/kanban/cards` | Create card |
| PATCH/DELETE | `/kanban/cards/:id` | Update / hapus card |
| GET | `/kanban/metrics` | Kanban metrics |

### 2.4 Content Creator — `/api/v1/content-creator`
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/timeline` | List (filter: bulan/tahun/status) |
| GET | `/calendar` | Calendar by tanggal_publish |
| GET | `/upload-calendar` | Calendar by tanggal_upload |
| POST | `/timeline` | Create |
| PATCH | `/timeline/:id` | Update |
| DELETE | `/timeline/:id` | Hapus |
| POST | `/timeline/:id/approve` | Approve (permission: content.approve) |
| POST | `/timeline/:id/reject` | Reject |
| GET/POST | `/social-media/accounts` | List / create akun |
| PATCH | `/social-media/accounts/:id` | Update |
| GET/POST | `/social-media/metrics/:id` | Metrics per akun |
| GET/POST | `/social-media/post-metrics` | Per-post metrics |
| GET/POST | `/social-media/targets` | Monthly targets |
| GET | `/dashboard` | Content dashboard |

### 2.5 Desain — `/api/v1/desain`
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/timelines` | List / create timeline |
| GET/PATCH/DELETE | `/timelines/:id` | Detail / update / hapus |
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
| POST/PATCH/DELETE | `/timelines/:id/items` | CRUD items |

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
| POST | `/projeks/:id/stock-opname/logs` | Catat penggunaan (item_ref_type, item_ref_id, item_nama, item_satuan, qty_pakai, tanggal, catatan) |
| DELETE | `/stock-opname/logs/:id` | Hapus log |
| **Docs/Link** | | |
| GET | `/projeks/:id/links` | List dokumen/link proyek |
| POST | `/projeks/:id/links` | Add link (JSON) atau upload file (multipart, maks 20MB, dir: `sipil-docs/`) |
| DELETE | `/links/:id` | Hapus (+ hapus file jika upload) |

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
| GET | `/termins/:id/rapp` | RAPP data |
| _(RAPP routes sama pola dengan sipil)_ | | |

### 2.11 Finance — `/api/v1/finance`

#### Invoice (`/invoices`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/invoices` | List |
| POST | `/invoices` | Create (dari lead_id) |
| PATCH/DELETE | `/invoices/:id` | Update / hapus (draft only) |
| POST | `/invoices/:id/sign-head` | TTD Head Finance |
| POST | `/invoices/:id/sign-admin` | TTD Admin Finance |
| POST | `/invoices/:id/mark-paid` | Tandai Lunas → auto-create Kwitansi |
| GET | `/invoices/:id/kwitansi` | Get kwitansi |
| GET | `/leads-dropdown` | Leads untuk dropdown |

**Workflow:** `draft → (sign-head + sign-admin) → Terbit → (mark-paid) → Lunas`

#### Administrasi Projek (`/adm-projek` alias `/adm-finance`)
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/adm-projek` | List / create |
| GET/PATCH/DELETE | `/adm-projek/:id` | Detail / update / hapus |
| GET/POST | `/adm-projek/:pid/termins` | List / add termin |
| GET/PATCH/DELETE | `/adm-finance/termins/:id` | Detail / update / hapus |
| GET/POST | `/adm-finance/termins/:tid/periodes` | List / add periode |
| GET/PATCH/DELETE | `/adm-finance/periodes/:id` | Detail / update / hapus |
| POST | `/adm-finance/periodes/:id/approve` | Approve |
| POST/DELETE | `/adm-finance/periodes/:id/items` | Add item |

#### Tukang (baru) — per proyek
| Method | Path | Keterangan |
|--------|------|------------|
| GET/POST | `/adm-projek/:id/tukang/registry` | List / add tukang registry |
| PATCH/DELETE | `/adm-projek/:id/tukang/registry/:tid` | Update / hapus |
| GET/POST | `/adm-projek/:id/tukang/absen-foto` | List / submit foto absen |
| POST | `/adm-projek/:id/tukang/absen-foto/:aid/approve` | Approve absen |
| POST | `/adm-projek/:id/tukang/absen-foto/:aid/reject` | Reject absen |
| **POST** | `/adm-projek/:id/tukang/absen-checklist` | **Delegasi absen oleh admin** (tanpa foto, status langsung Disetujui). Body: `{ tukang_id, tanggal }` |
| GET | `/adm-projek/:id/tukang/kasbon` | List kasbon |
| POST | `/adm-projek/:id/tukang/:tid/kasbon` | Tambah kasbon |
| GET/POST | `/adm-projek/:id/tukang/gajian` | List / create gajian |
| DELETE | `/adm-projek/:id/tukang/gajian/:gid` | Hapus gajian |
| GET | `/adm-projek/:id/tukang/kwitansi` | List kwitansi gaji |
| GET | `/tukang-absen/projects` | Proyek untuk halaman absen tukang |
| GET | `/tukang-absen/:pid/my-tukang` | Data tukang yang terhubung ke user login |
| GET | `/tukang-absen/:pid/my-absen` | Riwayat absen tukang (self) |
| POST | `/tukang-absen/:pid/submit` | Submit foto absen harian |

#### Reimburse
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/reimburse` | List |
| GET/POST | `/reimburse` | List / create |
| GET/PATCH/DELETE | `/reimburse/:id` | Detail / update / hapus |
| POST | `/reimburse/:id/sign-head` | TTD Head |
| POST | `/reimburse/:id/sign-admin` | TTD Admin |
| POST | `/reimburse/:id/tolak` | Tolak |

#### Misc
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/adm-projek` | Alias → `/adm-finance` |
| GET | `/leads-dropdown` | Leads untuk dropdown |
| GET | `/adm-projek` | Alias list proyek administrasi |

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
| GET | `/:id/docs` | List docs/link per laporan (`linkable_type: "laporan_harian"`) |
| POST | `/:id/docs` | Add doc (JSON url atau multipart file, dir: `laporan-docs/`) |
| DELETE | `/docs/:docId` | Hapus doc (+ hapus file jika upload) |

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
| `FollowUpClient` | `follow_up_clients` | lead_id, user_id, tanggal, catatan, next_follow_up |

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
| `SocialMediaAccount` | `social_media_accounts` | id, platform, account_name, username |
| `SocialMediaMetric` | `social_media_metrics` | id, social_media_account_id, date — unique(account_id+date) |

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

> `SipilUsageLog` adalah pencatatan penggunaan harian. RAPP tidak berkurang — hanya referensi.

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

### Docs / Link (polymorphic)
| Model | Table | Key Fields |
|-------|-------|-----------|
| `ProjectLink` | `project_links` | id(BigInt), linkable_type(String), linkable_id(BigInt), title, url, catatan, created_by |

**linkable_type values:**
- `"sipil_projek"` — Projek Sipil (`sipil.ts`)
- `"desain_timeline"` — Desain Timeline (`desain.ts`)
- `"laporan_harian"` — Laporan Harian (`laporanHarian.ts`)

Upload file disimpan di subdirektori per modul: `sipil-docs/`, `laporan-docs/`, dll.

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
| `Reimburse` | `reimburses` | id, tanggal, user_id, kategori, keterangan, total, status, head_finance_*, admin_finance_* |
| `ReimburseItem` | `reimburse_items` | id, reimburse_id, deskripsi, jumlah |
| `AdmFinanceProject` | `adm_finance_projects` | id, lead_id, nama_proyek, klien, jenis, lokasi, tanggal_mulai, tanggal_selesai, status |
| `AdmFinanceTermin` | `adm_finance_termins` | id, project_id, nama_termin, tanggal, budget, deposit_awal, hf_signed_at, status |
| `AdmFinancePeriode` | `adm_finance_periodes` | id, termin_id, nama_periode, tanggal_mulai, tanggal_selesai, budget, is_approved |
| `AdmFinanceItem` | `adm_finance_items` | id, periode_id, description, qty, unit_price, total, status |
| `AdministrasiKantor` | `administrasi_kantors` | id, lead_id, tanggal, keterangan, created_by |
| `SuratJalan` | `surat_jalans` | id, adm_finance_project_id, nomor_surat, tanggal, penerima |

### Tukang System
| Model | Table | Key Fields |
|-------|-------|-----------|
| `TukangRegistry` | `tukang_registries` | id, adm_finance_project_id, nama, jabatan, upah_harian, user_id(linked User), is_active |
| `TukangAbsenFoto` | `tukang_absen_fotos` | id, tukang_id, tanggal, **foto String? (nullable — null jika delegasi admin)**, foto_timestamp, status(Pending/Disetujui/Ditolak), approved_by, catatan, created_by |
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
    bd/
      dashboard/
      kanban/             — PDF export (logo, alamat, notelfon di header)
      meta-ads/[id]/
    content/
      dashboard-sosmed/
      social-media/
      timelines/
      laporan-harian/
    sales-admin/
      kanban/             — PDF export (logo, alamat, notelfon)
      laporan-harian/
    telemarketing/
      kanban/             — PDF export (logo, alamat, notelfon)
      laporan-harian/
    desain/
      laporan-harian/
      (desain page: timeline list + Docs/Link view per timeline)
    sales/
      kanban/
      laporan-harian/
    projek/
      sipil/              — List proyek
      sipil/[id]/         — Detail: tabs Daftar Termin | Gantt | Docs/Link | RAPP | Stock Opname
      desain/             — DesainTimeline dengan view List/Gantt/Docs
      interior/
    finance/
      invoice-kwitansi/
      administrasi-projek/ — Tabs: Termin | Periodes | Tukang (5 inner tabs)
      administrasi-kantor/
      laporan-harian/
    pic/laporan-harian/
    absen/                — Halaman tukang self-submit foto absen
    admin/
      users/
      roles/
      settings/
```

### Tab Menu Projek Sipil `[id]`
1. **Daftar Termin** — CRUD termin + task
2. **Gantt Chart** — visualisasi timeline
3. **Docs/Link** — upload file PDF/image atau URL link (simpan ke `sipil-docs/`)
4. **RAPP** — anggaran material/sipil/vendor per termin (edit, PDF download)
5. **Stock Opname** — penggunaan harian item RAPP:
   - Sub-tab **Item RAPP**: tabel referensi vol RAPP + total dipakai + tombol Catat per item
   - Sub-tab **Riwayat Penggunaan**: tabel semua log harian
   - **Download PDF**: laporan lengkap (header logo+alamat+notelfon, tabel RAPP, tabel log)

### Tab Menu Laporan Harian (shared `laporan-harian.tsx`)
Dipakai oleh 7 modul (bd, content, sales_admin, telemarketing, desain, sales, finance, pic).
- Tab **Detail**: form tambah, list laporan
- Tab **Docs/Link** per laporan: URL link atau upload file (`laporan-docs/`)

### Administrasi Projek — Tab Tukang (5 inner tabs)
1. Registry tukang (CRUD + link ke User account)
2. Absen Foto (approve/reject + **Checklist Hadir** = delegasi tanpa foto)
3. Kasbon
4. Gajian
5. Kwitansi Gaji

### Key Frontend API Files
| File | Keterangan |
|------|------------|
| `src/lib/api/content.ts` | `sipilApi`, `interiorProjekApi`, `desainApi` dengan semua RAPP + stock opname + docs/link methods |
| `src/lib/api/finance.ts` | Finance API: invoice, admFinance, tukang, reimburse |
| `src/lib/api/auth.ts` | Auth calls |
| `src/lib/api/admin.ts` | Admin calls |

### Key Frontend Component Files
| File | Keterangan |
|------|------------|
| `src/components/projek-pdf.tsx` | PDF proyek sipil/desain/interior (orange theme, logo) |
| `src/components/rapp-pdf.tsx` | PDF RAPP |
| `src/components/sipil-stock-opname-pdf.tsx` | **PDF Stock Opname** (header logo+alamat+notelfon, ringkasan item, riwayat log) |
| `src/components/invoice-pdf.tsx` | Invoice PDF |
| `src/components/kwitansi-pdf.tsx` | Kwitansi PDF |
| `src/components/reimburse-pdf.tsx` | Reimburse PDF |
| `src/components/laporan-harian.tsx` | Shared laporan harian component (7 modul, tabs Detail+Docs) |
| `src/components/rapp-sipil.tsx` | RAPP Sipil view+edit component |
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

### Invoice Number Format
- Sipil: `RR-SP-DD/MM/YYYY`, Desain: `RR-DS-...`, Interior: `RR-INT-...`
- Kwitansi: `KWT-YYYYMM-{4digit}`

### Laporan Harian Modules
`bd`, `content`, `sales_admin`, `telemarketing`, `desain`, `sales`, `finance`, `pic`

---

## 8. Seeder

- File: `prisma/seed.ts` — Script: `npm run seed`
- Password semua: `password123`
- Accounts: `admin@test.com` (Super Admin), `bd@test.com`, `sales@test.com`, `finance@test.com`, `content@test.com`, `desain@test.com`, `pic@test.com`

---

## 9. Config & Environment

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=8000
CORS_ORIGINS=http://localhost:3000
STORAGE_PATH=./storage
```

Static files: `GET /storage/{path}` → serve dari `config.storagePath`

---

## 10. How to Update This Docs

Setiap kali ada perubahan fitur:
- **Route baru** → update section 2.x sesuai prefix
- **Model baru/berubah** → update section 3
- **Page/tab baru** → update section 6
- **Permission baru** → update section 5

Format: singkat, tabel-based, no fluff.
