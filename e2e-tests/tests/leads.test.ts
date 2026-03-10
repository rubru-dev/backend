import { createApi, timedRequest } from "../helpers/api";

/**
 * Response format: paginateResponse → {items:[], total, page, per_page, meta}
 * Route reference (mounted at /api/v1/bd):
 *  GET  /bd/leads              → list semua leads (no modul filter)
 *  POST /bd/leads              → create lead → {id}
 *  GET  /bd/leads/:id          → single lead
 *  PATCH /bd/leads/:id         → update lead
 *  DELETE /bd/leads/:id        → delete lead
 *  GET  /bd/:modul/leads       → list leads by modul (filtered by modul)
 */

describe("Leads — /bd/*", () => {
  const api = createApi("bd");
  let createdId: string;

  // ─── CRUD dasar ───────────────────────────────────────────────────────────

  test("POST /bd/leads → 201 + ada id", async () => {
    const res = await api.post("/bd/leads", {
      nama: "E2E_TEST_LEAD_CRUD",
      nomor_telepon: "081234567890",
      status: "Hot",
      jenis: "Sipil",
      bulan: 3,
      tahun: 2026,
      modul: "bd",
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    createdId = String(res.data.id);
  });

  test("GET /bd/leads/:id → 200 + data match", async () => {
    if (!createdId) return;
    const res = await api.get(`/bd/leads/${createdId}`);
    expect(res.status).toBe(200);
    expect(String(res.data.id)).toBe(createdId);
    expect(res.data.nama).toBe("E2E_TEST_LEAD_CRUD");
  });

  test("PATCH /bd/leads/:id status → 200", async () => {
    if (!createdId) return;
    const res = await api.patch(`/bd/leads/${createdId}`, { status: "Medium" });
    expect(res.status).toBe(200);
  });

  // ─── Pagination ───────────────────────────────────────────────────────────

  test("GET /bd/leads?page=1&limit=20 → 200 + items[] + total + < 500ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/leads?page=1&limit=20"),
      500,
      "GET /bd/leads page=1"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.total).toBeGreaterThanOrEqual(0);
    expect(res.data.items.length).toBeLessThanOrEqual(20);
  });

  test("GET /bd/leads?page=500 → 200, tidak crash (items kosong ok)", async () => {
    const res = await api.get("/bd/leads?page=500&limit=20");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test("Pagination: tidak ada ID duplikat antara page 1 dan page 2", async () => {
    const [page1, page2] = await Promise.all([
      api.get("/bd/leads?page=1&limit=20"),
      api.get("/bd/leads?page=2&limit=20"),
    ]);
    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    const ids1 = new Set((page1.data.items as any[]).map((d) => String(d.id)));
    const ids2 = (page2.data.items as any[]).map((d) => String(d.id));
    const hasDuplicate = ids2.some((id) => ids1.has(id));
    expect(hasDuplicate).toBe(false);
  });

  // ─── Filter ───────────────────────────────────────────────────────────────

  test("Filter status=Hot → semua result.status === 'Hot' + < 1000ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/leads?status=Hot&limit=50"),
      1000,
      "GET /bd/leads status=Hot"
    );
    expect(res.status).toBe(200);
    if ((res.data.items as any[]).length > 0) {
      (res.data.items as any[]).forEach((d) => expect(d.status).toBe("Hot"));
    }
  });

  test("Filter bulan=3&tahun=2026 → tidak crash + < 1000ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/leads?bulan=3&tahun=2026&limit=50"),
      1000,
      "GET /bd/leads bulan=3&tahun=2026"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test("Search SEED_LEAD_00001 → tidak crash + < 1500ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/leads?search=SEED_LEAD_00001"),
      1500,
      "GET /bd/leads search=SEED_LEAD_00001"
    );
    expect(res.status).toBe(200);
    if ((res.data.items as any[]).length > 0) {
      expect(
        (res.data.items as any[]).some((d) => d.nama.includes("SEED_LEAD_00001"))
      ).toBe(true);
    }
  });

  test("Semua filter combined → tidak crash + < 1500ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/leads?status=Hot&bulan=3&tahun=2026&limit=20"),
      1500,
      "GET /bd/leads all filters"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  // ─── Modul-based leads ────────────────────────────────────────────────────
  // Valid moduls: sales-admin, telemarketing (bukan "bd" — itu pakai GET /bd/leads)

  test("GET /bd/sales-admin/leads → 200 + semua modul=sales-admin + < 1000ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/sales-admin/leads?limit=50"),
      1000,
      "GET /bd/sales-admin/leads"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    if ((res.data.items as any[]).length > 0) {
      (res.data.items as any[]).forEach((d) => expect(d.modul).toBe("sales-admin"));
    }
  });

  // ─── BigInt / Serialization ───────────────────────────────────────────────

  test("JSON.stringify(res.data) tidak throw (BigInt check)", async () => {
    const res = await api.get("/bd/leads?limit=5");
    expect(() => JSON.stringify(res.data)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(res.data));
    if (parsed.items?.length > 0) {
      expect(parsed.items[0].id).toBeDefined();
    }
  });

  // ─── limit ────────────────────────────────────────────────────────────────

  test("limit=100 → items.length <= 100 + < 2000ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/leads?limit=100"),
      2000,
      "GET /bd/leads limit=100"
    );
    expect(res.status).toBe(200);
    expect((res.data.items as any[]).length).toBeLessThanOrEqual(100);
  });

  // ─── DELETE ──────────────────────────────────────────────────────────────

  test("DELETE /bd/leads/:id → 200, GET setelahnya → 404", async () => {
    if (!createdId) return;
    const del = await api.delete(`/bd/leads/${createdId}`);
    expect(del.status).toBe(200);

    const get = await api.get(`/bd/leads/${createdId}`);
    expect(get.status).toBe(404);
  });
});
