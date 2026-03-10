# Prompt: Buat E2E Test Suite — RubahRumah

## Konteks
Kamu adalah coding agent yang bekerja pada project **RubahRumah** — sistem manajemen dan tracking karyawan berbasis Next.js 14 + Node.js + Express + Prisma + PostgreSQL. Saya ingin kamu membuat **E2E test suite lengkap** yang menguji seluruh sistem, terutama ketika data sudah mencapai 10.000+ rows agar tidak terjadi error atau performa breakdown.

---

## Langkah 1 — Baca Dulu Sebelum Mulai

Baca file-file berikut untuk memahami sistem:
- `new-app/backend/src/index.ts` — entry point, lihat BigInt fix dan setup
- `new-app/backend/prisma/schema.prisma` — semua model dan relasi
- `new-app/backend/src/routes/` — semua route handler
- `new-app/backend/src/middleware/` — auth middleware dan permission check

---

## Langkah 2 — Setup Folder E2E

Buat folder `e2e-tests/` di root project dengan struktur berikut:

```
e2e-tests/
├── package.json
├── jest.config.ts
├── tsconfig.json
├── .env.example
├── setup/
│   ├── globalSetup.ts      ← login semua user, store tokens ke global
│   └── globalTeardown.ts
├── helpers/
│   ├── api.ts              ← createApi(tokenKey), timedRequest()
│   └── seedLargeData.ts    ← seed 10k+ rows ke DB langsung via Prisma
├── tests/
│   ├── auth.test.ts
│   ├── leads.test.ts
│   ├── kanban.test.ts
│   ├── projek-sipil.test.ts
│   ├── finance.test.ts
│   ├── laporan-harian.test.ts
│   ├── permissions.test.ts
│   └── performance.test.ts
└── k6/
    ├── load-leads.js
    ├── load-kanban.js
    └── load-sipil.js
```

**Dependencies yang dibutuhkan (`e2e-tests/package.json`):**
```json
{
  "devDependencies": {
    "jest": "^29",
    "ts-jest": "^29",
    "@types/jest": "^29",
    "typescript": "^5"
  },
  "dependencies": {
    "@prisma/client": "*",
    "axios": "^1.6",
    "dotenv": "^16",
    "form-data": "^4"
  }
}
```

---

## Langkah 3 — `helpers/seedLargeData.ts`

Script ini dijalankan sekali sebelum test suite untuk populate data besar. Gunakan Prisma Client langsung (bukan via API) agar cepat.

**Yang harus di-seed:**

| Data | Jumlah | Cara Identifikasi |
|------|--------|-------------------|
| `Lead` | 10.000 | `nama` prefix: `"SEED_LEAD_"` |
| `LaporanHarian` | 1.000 | `kegiatan` prefix: `"SEED_LAPORAN_"` |
| `RappMaterialItem` | 500 | `material` prefix: `"SEED_MAT_"` |
| `SipilUsageLog` | 5.000 | `catatan` prefix: `"SEED_TEST_"` |
| `TukangAbsenFoto` | 500 | `catatan`: `"SEED_TEST_absen"` |

**Seed leads:** loop 10.000 rows, `createMany` per batch 500. Random `status` (Low/Medium/Hot), `jenis` (Sipil/Desain/Interior), `bulan` 1-12, `tahun` 2024/2025/2026, `modul` (bd/sales_admin/telemarketing).

**Seed stock opname logs:**
1. Buat 1 `ProyekBerjalan` dengan nama `"SEED_SIPIL_PROYEK_LOAD_TEST"`
2. Buat 1 `ProyekBerjalanTermin`
3. Buat 50 `RappMaterialKategori` + 500 `RappMaterialItem`
4. Seed 5.000 `SipilUsageLog` (batch 500) dengan `item_ref_type: "material"`

**Tukang absen:** Buat 5 `TukangRegistry` dari `AdmFinanceProject` pertama yang ada, lalu seed 500 `TukangAbsenFoto` dengan `foto: null` dan `status: "Disetujui"` (simulasi delegasi checklist).

**Sertakan `--clean` flag:** Jalankan `npx ts-node helpers/seedLargeData.ts --clean` untuk hapus semua data seed.

---

## Langkah 4 — `setup/globalSetup.ts`

Login semua user test sebelum test berjalan. Store tokens ke `(global as any).__TOKENS__`:

```typescript
const USERS = [
  { key: "superAdmin", email: "admin@test.com" },
  { key: "bd",         email: "bd@test.com" },
  { key: "finance",    email: "finance@test.com" },
  { key: "sales",      email: "sales@test.com" },
  { key: "content",    email: "content@test.com" },
  { key: "desain",     email: "desain@test.com" },
  { key: "pic",        email: "pic@test.com" },
];
// semua password: "password123"
```

Jika salah satu login gagal, throw error dengan pesan jelas: "Server belum jalan atau seed belum dijalankan."

---

## Langkah 5 — `helpers/api.ts`

```typescript
export function createApi(tokenKey: string): AxiosInstance
// Buat axios instance dengan token dari global.__TOKENS__[tokenKey]
// validateStatus: () => true  ← jangan throw untuk 4xx/5xx

export async function timedRequest<T>(fn, maxMs, label): Promise<T>
// Jalankan fn(), ukur waktu, throw jika > maxMs
// Log: "⚡ {label}: {elapsed}ms"
```

---

## Langkah 6 — Tulis Semua Test

### `tests/auth.test.ts`
- Login valid → 200, dapat `access_token` + `refresh_token` + `user.permissions[]`
- Login password salah → 401
- Login email tidak ada → 401
- GET /auth/me tanpa token → 401
- GET /auth/me token invalid → 401
- GET /auth/me token valid → 200, dapat `id` + `email`
- POST /auth/refresh → 200, dapat `access_token` baru
- PATCH /auth/me update nama → 200
- **BigInt test:** `JSON.stringify(res.data)` tidak throw — pastikan `id` ter-serialize sebagai string/number bukan BigInt native

### `tests/leads.test.ts` (gunakan BD token)
- POST /bd/leads → 201, punya `id`
- GET /bd/leads/:id → 200, data match
- PATCH /bd/leads/:id status → 200
- **GET /bd/leads?page=1&limit=20** → 200, `total >= 10000`, response time < 500ms
- **GET /bd/leads?page=500** → 200, tidak crash (data kosong ok)
- Pagination konsisten: tidak ada ID duplikat antara page 1 dan page 2
- Filter `status=Hot` → semua result.status === "Hot", < 1000ms
- Filter `bulan=3&tahun=2026` → semua result match bulan+tahun, < 1000ms
- Filter `modul=bd` → semua result.modul === "bd", < 1000ms
- Search `search=SEED_LEAD_00001` → result mengandung keyword, < 1500ms
- Semua filter combined → tidak crash, < 1500ms
- **RBAC:** desain user akses /bd/leads → 403
- `JSON.stringify(res.data)` tidak throw (BigInt check)
- limit=100 → `data.length <= 100`, < 2000ms
- DELETE /bd/leads/:id → 200, GET setelahnya → 404

### `tests/kanban.test.ts`

**BD Kanban:**
- GET /bd/kanban/columns → 200, array, < 600ms
- POST /bd/kanban/columns → 201
- POST /bd/kanban/cards → 201
- GET /bd/kanban/cards → 200, < 600ms
- PATCH /bd/kanban/cards/:id → 200
- GET /bd/kanban/metrics → 200
- DELETE /bd/kanban/cards/:id → 200

**Sales Admin Kanban:**
- GET /sales-admin/kanban?bulan=3&tahun=2026 → 200, punya permanent columns (W1-W4, Closing Survey, Move To Telemarketing), < 600ms
- POST /sales-admin/kanban/columns/:id/cards → 201
- POST /sales-admin/kanban/cards/:id/move (Move To TM) → auto-copy ke TM
- POST /sales-admin/kanban/carryover → tidak crash

**Telemarketing Kanban:**
- GET /telemarketing/kanban?bulan=3&tahun=2026 → 200, punya column "From Sales Admin", < 600ms
- POST /telemarketing/kanban/cards/:id/move (Move To Cold Database) → lead.status === "Low"

### `tests/projek-sipil.test.ts`

CRUD flow lengkap:
1. POST /sipil/projeks → 201
2. POST /sipil/projeks/:id/termins → 201
3. POST /sipil/termins/:id/tasks → 201
4. PATCH /sipil/tasks/:id status → 200
5. POST /sipil/termins/:id/rapp/material-kategori → 201
6. POST /sipil/rapp/material-kategori/:id/items → 201, **Decimal tidak NaN**, JSON.stringify tidak throw
7. GET /sipil/termins/:id/rapp → 200, < 500ms
8. POST /sipil/projeks/:id/stock-opname/logs → 201
9. DELETE /sipil/stock-opname/logs/:id → 200
10. POST /sipil/projeks/:id/links (URL) → 201
11. GET /sipil/projeks/:id/links → 200, array
12. **Load test:** GET stock opname logs dari proyek seed (5k logs) → < 800ms
13. **BigInt/Decimal check:** JSON.stringify semua response tidak throw
14. DELETE /sipil/projeks/:id → 200

### `tests/finance.test.ts`

**Invoice flow:**
1. GET /finance/leads-dropdown → 200, array, < 500ms
2. POST /finance/invoices → 201, `status === "draft"`
3. GET /finance/invoices → 200, < 500ms
4. POST /finance/invoices/:id/sign-head → 200/201
5. POST /finance/invoices/:id/sign-admin → 200/201
6. Status setelah kedua TTD → "Terbit"
7. POST /finance/invoices/:id/mark-paid → kwitansi ter-create otomatis
8. GET /finance/invoices/:id/kwitansi → punya `nomor_kwitansi`
9. DELETE invoice draft → 200; DELETE invoice non-draft → 400/403

**Tukang:**
1. GET /finance/adm-projek → list ada, < 500ms
2. GET /finance/adm-projek/:id/tukang/registry → array
3. POST /finance/adm-projek/:id/tukang/absen-checklist → `foto === null`, `status === "Disetujui"`
4. GET absen-foto list → < 500ms
5. GET kasbon list → 200

**Reimburse:**
1. POST /finance/reimburse → 201
2. GET /finance/reimburse → 200, < 500ms
3. POST sign-head → 200/201
4. Decimal `total` tidak NaN

### `tests/laporan-harian.test.ts`

Uji untuk semua 7 modul: `bd`, `content`, `sales_admin`, `telemarketing`, `desain`, `sales`, `finance`

Untuk tiap modul:
- POST /laporan-harian → 201
- GET /laporan-harian?modul=X → 200, semua result.modul === X
- Filter tanggal range → result dalam range
- POST docs URL → 201
- GET docs → array
- DELETE laporan → 200

**Load test:** GET /laporan-harian dengan 1.000 seed data → < 800ms

### `tests/permissions.test.ts`

Test RBAC — user tidak boleh akses module yang tidak ada permission-nya:

| User | Endpoint | Expected |
|------|----------|----------|
| desain | GET /bd/leads | 403 |
| content | GET /finance/invoices | 403 |
| sales | GET /admin/users | 403 |
| bd | DELETE /admin/roles/:id | 403 |
| pic | POST /finance/invoices | 403 |
| (no token) | GET /bd/leads | 401 |
| superAdmin | GET /admin/users | 200 |

### `tests/performance.test.ts`

Semua test harus pass threshold response time:

| Endpoint | Max |
|----------|-----|
| GET /bd/leads page 1 | 500ms |
| GET /bd/leads + filter | 1000ms |
| GET /bd/leads search | 1500ms |
| GET /sipil/projeks/:id/stock-opname/logs (5k) | 800ms |
| GET /finance/invoices | 500ms |
| GET /bd/kanban/cards | 600ms |
| GET /laporan-harian (1k) | 800ms |
| GET /sales-admin/kanban | 600ms |
| POST /auth/login | 300ms |

Jalankan setiap endpoint 3x, ambil rata-rata, bandingkan dengan threshold.

---

## Langkah 7 — k6 Load Test Scripts

### `k6/load-leads.js`
```javascript
// Simulasi 50 VU concurrent, 1 menit
// Skenario: login → GET /bd/leads dengan berbagai filter
// Threshold: p95 < 1500ms, error rate < 1%
```

### `k6/load-kanban.js`
```javascript
// Simulasi 30 VU concurrent
// Skenario: GET /bd/kanban/cards, /sales-admin/kanban, /telemarketing/kanban
// Threshold: p95 < 2000ms
```

### `k6/load-sipil.js`
```javascript
// Simulasi 20 VU concurrent
// Skenario: GET stock-opname/logs dari proyek 5k data
// Threshold: p95 < 2000ms, error rate < 1%
```

---

## Langkah 8 — `.env.example`

```env
BASE_URL=http://localhost:8000/api/v1
DATABASE_URL=postgresql://user:password@localhost:5432/rubahrumah
```

---

## Hal-Hal Kritis yang Harus Diperhatikan

### BigInt
- Semua Prisma ID adalah `BigInt`. Backend sudah ada fix `BigInt.prototype.toJSON` di `index.ts`
- Setiap test yang menerima response dengan `id`, jalankan `JSON.stringify(res.data)` dan expect tidak throw
- Jika ada response yang masih error serialize, tandai sebagai bug dan log endpoint-nya

### Decimal
- Field `harga_satuan`, `total`, `subtotal`, `rab`, dll adalah `Decimal` dari Prisma
- Test: `isNaN(Number(res.data.field))` harus false
- Test: nilai tidak null/undefined untuk field wajib

### Pagination
- Setiap endpoint list harus return `{ data: [], total: number, page: number }` atau format konsisten
- Test: dengan 10k data, `total >= 10000`
- Test: page besar (500) tidak crash — kembalikan array kosong, bukan 500 error

### RBAC
- Setiap test akses route restricted → expect 401 atau 403, bukan 200
- Super Admin bypass semua — test akses semua endpoint

### TukangAbsenFoto `foto: null`
- Checklist absen (delegasi) harus `foto === null`, bukan string kosong
- Test ini penting karena nullable field bisa menyebabkan bug di frontend display

---

## Cara Menjalankan

Setelah semua file dibuat, jalankan:

```bash
# 1. Install dependencies
cd e2e-tests && npm install

# 2. Pastikan backend running
cd new-app/backend && npm run dev

# 3. Seed data besar
cd e2e-tests && npx ts-node helpers/seedLargeData.ts

# 4. Jalankan semua test
npm test

# 5. Load test (optional, butuh k6 installed)
k6 run k6/load-leads.js

# 6. Bersihkan seed data setelah selesai
npx ts-node helpers/seedLargeData.ts --clean
```

---

## Output yang Diharapkan

Setelah semua test pass, berikan summary:
- Berapa test pass / fail
- Endpoint mana yang response time-nya mendekati threshold
- Apakah ada BigInt/Decimal error yang ditemukan
- Rekomendasi optimasi (index DB, query N+1, dll) jika ada bottleneck