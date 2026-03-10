import { createApi, timedRequest } from "../helpers/api";

/**
 * Response format: paginateResponse → {items:[], total, page, per_page, meta}
 * Route reference (mounted at /api/v1/sipil):
 *  POST   /projeks                             → {id}
 *  GET    /projeks                             → {items:[...], total, ...}
 *  GET    /projeks/:id                         → single proyek object
 *  DELETE /projeks/:id                         → {message}
 *  POST   /projeks/:id/termins                 → {id}
 *  POST   /termins/:id/tasks                   → {id}
 *  PATCH  /tasks/:id                           → {message}
 *  POST   /termins/:id/rapp/material-kategori  → {id}
 *  POST   /rapp/material-kategori/:id/items    → {id, ...}
 *  GET    /termins/:id/rapp                    → rapp object
 *  POST   /projeks/:id/stock-opname/logs       → {id}
 *  DELETE /stock-opname/logs/:id               → {message}
 *  POST   /projeks/:id/links                   → {id, ...}
 *  GET    /projeks/:id/links                   → array
 */

describe("Projek Sipil — /sipil/*", () => {
  const api = createApi("superAdmin");

  let proyekId: string;
  let terminId: string;
  let taskId: string;
  let rappKatId: string;
  let rappItemId: string;
  let logId: string;

  // 1. POST /projeks → 201
  test("POST /sipil/projeks → 201", async () => {
    const res = await api.post("/sipil/projeks", {
      nama_proyek: "E2E_TEST_SIPIL_PROYEK",
      lokasi: "Jakarta Selatan",
      nilai_rab: 500000000,
      tanggal_mulai: "2026-01-01",
      tanggal_selesai: "2026-12-31",
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    proyekId = String(res.data.id);
  });

  // 2. POST /projeks/:id/termins → 201
  test("POST /sipil/projeks/:id/termins → 201", async () => {
    if (!proyekId) return;
    const res = await api.post(`/sipil/projeks/${proyekId}/termins`, {
      urutan: 1,
      nama: "Termin 1",
      rab: 100000000,
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    terminId = String(res.data.id);
  });

  // 3. POST /termins/:id/tasks → 201
  test("POST /sipil/termins/:id/tasks → 201", async () => {
    if (!terminId) return;
    const res = await api.post(`/sipil/termins/${terminId}/tasks`, {
      nama_pekerjaan: "E2E Task Test",
      tanggal_mulai: "2026-01-01",
      tanggal_selesai: "2026-03-31",
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    taskId = String(res.data.id);
  });

  // 4. PATCH /tasks/:id status → 200
  test("PATCH /sipil/tasks/:id status → 200", async () => {
    if (!taskId) return;
    const res = await api.patch(`/sipil/tasks/${taskId}`, { status: "Selesai" });
    expect(res.status).toBe(200);
  });

  // 5. POST material-kategori → 201
  test("POST /sipil/termins/:id/rapp/material-kategori → 201", async () => {
    if (!terminId) return;
    const res = await api.post(`/sipil/termins/${terminId}/rapp/material-kategori`, {
      nama: "E2E_TEST_KAT",
      urutan: 1,
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    rappKatId = String(res.data.id);
  });

  // 6. POST material item → 201 + Decimal OK + JSON tidak throw
  test("POST /sipil/rapp/material-kategori/:id/items → 201 + Decimal OK", async () => {
    if (!rappKatId) return;
    const res = await api.post(`/sipil/rapp/material-kategori/${rappKatId}/items`, {
      material: "E2E_TEST_MATERIAL",
      vol: 10,
      sat: "m2",
      harga_satuan: 150000,
      jumlah: 1500000,
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    rappItemId = String(res.data.id);
    expect(isNaN(Number(res.data.jumlah ?? 0))).toBe(false);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  // 7. GET rapp → 200 + < 500ms
  test("GET /sipil/termins/:id/rapp → 200 + < 500ms", async () => {
    if (!terminId) return;
    const res = await timedRequest(
      () => api.get(`/sipil/termins/${terminId}/rapp`),
      500,
      "GET /sipil/termins/:id/rapp"
    );
    expect(res.status).toBe(200);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  // 8. POST stock-opname logs → 201
  test("POST /sipil/projeks/:id/stock-opname/logs → 201", async () => {
    if (!proyekId || !rappItemId) return;
    const res = await api.post(`/sipil/projeks/${proyekId}/stock-opname/logs`, {
      item_ref_type: "material",
      item_ref_id: rappItemId,
      item_nama: "E2E_TEST_MATERIAL",
      item_satuan: "m2",
      qty_pakai: 2,
      tanggal: "2026-03-01",
      catatan: "E2E test log",
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    logId = String(res.data.id);
  });

  // 9. DELETE logs → 200
  test("DELETE /sipil/stock-opname/logs/:id → 200", async () => {
    if (!logId) return;
    const res = await api.delete(`/sipil/stock-opname/logs/${logId}`);
    expect(res.status).toBe(200);
    logId = "";
  });

  // 10. POST links → 201
  test("POST /sipil/projeks/:id/links (URL) → 200/201", async () => {
    if (!proyekId) return;
    const res = await api.post(`/sipil/projeks/${proyekId}/links`, {
      title: "E2E Test Link",
      url: "https://example.com/test-doc",
    });
    expect([200, 201]).toContain(res.status);
    expect(res.data.id).toBeDefined();
  });

  // 11. GET links → 200 + array
  test("GET /sipil/projeks/:id/links → 200 + array", async () => {
    if (!proyekId) return;
    const res = await api.get(`/sipil/projeks/${proyekId}/links`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  // 12. Load test: GET stock opname logs dari proyek seed (5k logs)
  test("GET stock-opname/logs dari proyek seed (5k) → < 800ms", async () => {
    const projeksRes = await api.get("/sipil/projeks?search=SEED_SIPIL_PROYEK_LOAD_TEST");
    if (projeksRes.status === 200 && projeksRes.data.items?.length > 0) {
      const seedProyekId = String(projeksRes.data.items[0].id);
      const res = await timedRequest(
        () => api.get(`/sipil/projeks/${seedProyekId}/stock-opname/logs?limit=100`),
        800,
        "GET /sipil/stock-opname/logs (5k seed)"
      );
      expect(res.status).toBe(200);
      expect(() => JSON.stringify(res.data)).not.toThrow();
    } else {
      console.log("  ⚠️  Seed proyek tidak ditemukan, skip load test");
    }
  });

  // 13. BigInt/Decimal check semua response
  test("BigInt/Decimal — JSON.stringify tidak throw + nilai_rab tidak NaN", async () => {
    if (!proyekId) return;
    const res = await api.get(`/sipil/projeks/${proyekId}`);
    expect(res.status).toBe(200);
    expect(() => JSON.stringify(res.data)).not.toThrow();
    if (res.data.nilai_rab !== undefined) {
      expect(isNaN(Number(res.data.nilai_rab))).toBe(false);
    }
  });

  // 14. DELETE proyek → 200
  test("DELETE /sipil/projeks/:id → 200", async () => {
    if (!proyekId) return;
    const res = await api.delete(`/sipil/projeks/${proyekId}`);
    expect(res.status).toBe(200);
  });
});
