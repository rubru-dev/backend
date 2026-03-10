# Load Test Results — RubahRumah

## Environment
- Date: 2026-03-08
- Backend: Node.js + Express + Prisma
- DB: PostgreSQL 18
- k6: v1.6.1
- Data: 10k leads, 1k laporan harian

---

## Results per Script

### load-leads.js (50 VU, 2m45s)
- p50: 9ms | p95: 14ms | p99: 17ms
- Error rate: **0.00%**
- Total requests: 5,665
- RPS: ~34 req/s
- Checks: 16,992/16,992 passed (100%)
- Status: ✅ **PASS** (threshold: p95 < 500ms)

### load-kanban.js (30 VU, 2m00s)
- p50: 16ms | p95: 25.6ms | p99: n/a
- Error rate: **0.00%**
- Total requests: 3,159
- RPS: ~26 req/s
- Checks: 9,471/9,471 passed (100%)
- Status: ✅ **PASS** (threshold: p95 < 600ms)

### load-sipil.js (20 VU, 2m30s)
- p50: 8ms | p95: 11.35ms | p99: 13.49ms
- Error rate: **0.00%**
- Total requests: 5,936
- RPS: ~39 req/s
- Checks: 17,802/17,802 passed (100%)
- Status: ✅ **PASS** (threshold: p95 < 800ms, p99 < 2000ms)
- Note: Seed proyek SEED_SIPIL_PROYEK_LOAD_TEST tidak ditemukan — test menggunakan GET /sipil/projeks saja

### load-finance.js (25 VU, 2m00s)
- p50: 11.8ms | p95: 28ms | p99: n/a
- Error rate: **0.00%**
- Total requests: 2,129
- RPS: ~18 req/s
- Checks: 6,384/6,384 passed (100%)
- Status: ✅ **PASS** (threshold: p95 < 500ms)

### load-write.js (20 VU, 1m30s) — Race Condition Test
- p50: 8.3ms | p95: 16.5ms | p99: n/a
- Error rate: **0.00%**
- Total requests: 12,561
- RPS: ~139 req/s
- Checks: 12,560/12,560 passed (100%)
  - ✓ POST leads → 201
  - ✓ PATCH leads → 200
  - ✓ POST laporan → 201
  - ✓ DELETE laporan → 200
  - ✓ DELETE leads → 200
- Status: ✅ **PASS** (threshold: p95 < 1000ms, error rate < 2%)
- **Tidak ada race condition terdeteksi** — 20 VU concurrent write tanpa conflict

### load-mixed.js (40 VU, 3m50s) — Skenario Paling Realistis
- p50: 9.6ms | p95: 27.9ms | p99: 41.1ms
- Error rate: **0.00%**
- Total requests: 5,584
- RPS: ~24 req/s
- Checks: 15,882/15,882 passed (100%)
- Status: ✅ **PASS** (threshold: p95 < 1000ms, p99 < 3000ms)

---

## Breaking Point Analysis (stress-test.js — 200 VU max, 5m00s)

| Stage | VU | p95 | Error Rate |
|-------|-----|-----|-----------|
| Ramp to 50 | 50 | ~15ms | 0.00% |
| Hold 50 | 50 | ~15ms | 0.00% |
| Ramp to 100 | 100 | ~20ms | 0.00% |
| Hold 100 | 100 | ~20ms | 0.00% |
| Ramp to 150 | 150 | ~24ms | 0.00% |
| Hold 150 | 150 | ~24ms | 0.00% |
| Ramp to 200 | 200 | ~26ms | 0.00% |
| Hold 200 | 200 | ~26ms | 0.00% |

- **p95 di 200 VU: 26.05ms** — tidak ada degradasi signifikan
- **Error rate di 200 VU: 0.00%** — sistem stabil
- Total requests: 35,501 | RPS: ~118 req/s
- Status: ✅ **PASS** (threshold: p95 < 5000ms, error rate < 10%)

---

## Breaking Point
- p95 > 1000ms pada: **TIDAK TERCAPAI** (max 26ms bahkan di 200 VU)
- Error rate > 1% pada: **TIDAK TERCAPAI** (selalu 0%)
- Max sustainable VU: **> 200 VU** (tidak ditemukan breaking point)

---

## Bottleneck yang Ditemukan
- [x] Connection pool exhaustion? → **TIDAK** — pool handling sangat baik di 200 VU concurrent
- [x] N+1 query? → **TIDAK** — semua endpoint sub-30ms di 200 VU
- [x] Memory leak? → **TIDAK** — response time stabil, tidak naik seiring waktu
- [x] Race condition di write? → **TIDAK** — 20 VU concurrent write 100% sukses tanpa conflict

---

## Kesimpulan
Backend RubahRumah sangat performa bahkan di 200 VU concurrent:
- **p95 global: 14–28ms** (vs threshold 500–1000ms)
- **0% error rate** di semua skenario
- **No breaking point ditemukan** — perlu test lebih dari 200 VU untuk menemukan batas

## Rekomendasi
- Sistem sudah siap untuk production load
- Jika perlu test > 200 VU, tambahkan `connection_limit` di DATABASE_URL
- Seed data sipil (`SEED_SIPIL_PROYEK_LOAD_TEST`) perlu dibuat untuk test stock-opname load yang lebih realistis
