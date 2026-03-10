import { createApi } from "../helpers/api";

/**
 * Performance test — semua threshold dalam ms.
 * Setiap endpoint ditest 3x, nilai rata-rata dibandingkan threshold.
 * Response format: {items:[], total, ...}
 */

async function measureAvg(fn: () => Promise<any>, runs = 3): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    await fn();
    times.push(Date.now() - start);
  }
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  console.log(`    Runs: ${times.join("ms, ")}ms → avg ${avg}ms`);
  return avg;
}

describe("Performance — Response Time Thresholds", () => {
  const bdApi = createApi("bd");
  const adminApi = createApi("superAdmin");
  const BASE_URL = process.env.BASE_URL ?? "http://localhost:8000/api/v1";

  test("POST /auth/login → avg < 300ms", async () => {
    const axios = require("axios");
    const avg = await measureAvg(() =>
      axios.post(`${BASE_URL}/auth/login`, {
        email: "admin@test.com",
        password: "password123",
      }, { validateStatus: () => true })
    );
    expect(avg).toBeLessThan(300);
  });

  test("GET /bd/leads page 1 → avg < 500ms", async () => {
    const avg = await measureAvg(() => bdApi.get("/bd/leads?page=1&limit=20"));
    expect(avg).toBeLessThan(500);
  });

  test("GET /bd/leads + filter status=Hot → avg < 1000ms", async () => {
    const avg = await measureAvg(() =>
      bdApi.get("/bd/leads?status=Hot&limit=50")
    );
    expect(avg).toBeLessThan(1000);
  });

  test("GET /bd/leads search → avg < 1500ms", async () => {
    const avg = await measureAvg(() =>
      bdApi.get("/bd/leads?search=SEED_LEAD_00001")
    );
    expect(avg).toBeLessThan(1500);
  });

  test("GET /finance/invoices → avg < 500ms", async () => {
    const avg = await measureAvg(() => adminApi.get("/finance/invoices"));
    expect(avg).toBeLessThan(500);
  });

  test("GET /bd/kanban/columns → avg < 600ms", async () => {
    const avg = await measureAvg(() => bdApi.get("/bd/kanban/columns"));
    expect(avg).toBeLessThan(600);
  });

  test("GET /laporan-harian → avg < 800ms", async () => {
    const avg = await measureAvg(() =>
      adminApi.get("/laporan-harian?limit=50")
    );
    expect(avg).toBeLessThan(800);
  });

  test("GET /sales-admin/kanban?bulan=3&tahun=2026 → avg < 600ms", async () => {
    const avg = await measureAvg(() =>
      adminApi.get("/sales-admin/kanban?bulan=3&tahun=2026")
    );
    expect(avg).toBeLessThan(600);
  });

  // Stock opname logs load test (5k seed data)
  test("GET /sipil/stock-opname/logs (5k seed) → avg < 800ms", async () => {
    const projeksRes = await adminApi.get("/sipil/projeks?search=SEED_SIPIL_PROYEK_LOAD_TEST");
    if (
      projeksRes.status !== 200 ||
      !projeksRes.data.items ||
      projeksRes.data.items.length === 0
    ) {
      console.log("  ⚠️  Seed proyek tidak ditemukan — skip (jalankan seedLargeData.ts dulu)");
      return;
    }

    const seedProyekId = String(projeksRes.data.items[0].id);
    const avg = await measureAvg(() =>
      adminApi.get(`/sipil/projeks/${seedProyekId}/stock-opname/logs?limit=100`)
    );
    expect(avg).toBeLessThan(800);
  });

  afterAll(() => {
    console.log("\n📊 Performance test selesai. Lihat log di atas untuk detail.");
  });
});
