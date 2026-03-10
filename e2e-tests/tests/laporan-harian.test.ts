import { createApi, timedRequest } from "../helpers/api";

/**
 * Response format: paginateResponse → {items:[], total, page, per_page, meta}
 * Route reference (mounted at /api/v1/laporan-harian):
 *  POST   /           → create laporan → {id}
 *  GET    /           → {items:[], total, ...}  (filter: modul, tanggal_mulai, tanggal_selesai)
 *  DELETE /:id        → delete laporan
 *  GET    /:id/docs   → list docs (array)
 *  POST   /:id/docs   → tambah doc (url atau file)
 */

const MODULS = [
  { key: "bd", tokenKey: "bd" },
  { key: "content", tokenKey: "content" },
  { key: "sales_admin", tokenKey: "superAdmin" },
  { key: "telemarketing", tokenKey: "superAdmin" },
  { key: "desain", tokenKey: "desain" },
  { key: "sales", tokenKey: "sales" },
  { key: "finance", tokenKey: "finance" },
];

describe("Laporan Harian — /laporan-harian/*", () => {
  const adminApi = createApi("superAdmin");

  // Test untuk setiap modul
  for (const modul of MODULS) {
    describe(`Modul: ${modul.key}`, () => {
      const api = createApi(modul.tokenKey);
      let laporanId: string;

      test(`POST /laporan-harian (modul=${modul.key}) → 201`, async () => {
        const res = await api.post("/laporan-harian", {
          modul: modul.key,
          tanggal_mulai: "2026-03-01",
          tanggal_selesai: "2026-03-01",
          kegiatan: `E2E_TEST_LAPORAN_${modul.key}_${Date.now()}`,
          kendala: null,
        });
        expect(res.status).toBe(201);
        expect(res.data.id).toBeDefined();
        laporanId = String(res.data.id);
      });

      test(`GET /laporan-harian?modul=${modul.key} → 200 + items[] + semua modul match`, async () => {
        const res = await api.get(`/laporan-harian?modul=${modul.key}&limit=20`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.items)).toBe(true);
        if (res.data.items.length > 0) {
          (res.data.items as any[]).forEach((l) => expect(l.modul).toBe(modul.key));
        }
      });

      test(`GET /laporan-harian filter tanggal range (modul=${modul.key}) → items[]`, async () => {
        const res = await api.get(
          `/laporan-harian?modul=${modul.key}&tanggal_mulai=2026-03-01&tanggal_selesai=2026-03-31`
        );
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.items)).toBe(true);
      });

      test(`POST /laporan-harian/:id/docs (URL) → 200/201 (modul=${modul.key})`, async () => {
        if (!laporanId) return;
        const res = await api.post(`/laporan-harian/${laporanId}/docs`, {
          title: "E2E Test Doc",
          url: "https://docs.google.com/e2e-test",
        });
        expect([200, 201]).toContain(res.status);
        expect(() => JSON.stringify(res.data)).not.toThrow();
      });

      test(`GET /laporan-harian/:id/docs → array (modul=${modul.key})`, async () => {
        if (!laporanId) return;
        const res = await api.get(`/laporan-harian/${laporanId}/docs`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
      });

      test(`DELETE /laporan-harian/:id → 200 (modul=${modul.key})`, async () => {
        if (!laporanId) return;
        const res = await api.delete(`/laporan-harian/${laporanId}`);
        expect(res.status).toBe(200);
      });
    });
  }

  // Load test: GET dengan seed data
  test("Load test: GET /laporan-harian → < 800ms", async () => {
    const res = await timedRequest(
      () => adminApi.get("/laporan-harian?limit=50"),
      800,
      "GET /laporan-harian (load)"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(() => JSON.stringify(res.data)).not.toThrow();
    console.log(`  📊 Total laporan: ${res.data.total}`);
  });

  // BigInt/serialization check
  test("JSON.stringify laporan data tidak throw (BigInt check)", async () => {
    const res = await adminApi.get("/laporan-harian?limit=10");
    expect(res.status).toBe(200);
    expect(() => JSON.stringify(res.data)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(res.data));
    if (parsed.items?.length > 0) {
      expect(parsed.items[0].id).toBeDefined();
    }
  });
});
