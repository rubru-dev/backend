import { createApi, timedRequest } from "../helpers/api";

/**
 * Route reference:
 *  BD Kanban      → /api/v1/bd/kanban/*
 *  Sales Admin    → /api/v1/sales-admin/kanban
 *  Telemarketing  → /api/v1/telemarketing/kanban
 */

// ─────────────────────────────────────────────────────────────────────────────
// BD Kanban
// ─────────────────────────────────────────────────────────────────────────────

describe("BD Kanban — /bd/kanban/*", () => {
  const api = createApi("bd");
  let columnId: string;
  let cardId: string;

  test("GET /bd/kanban/columns → 200 + array + < 600ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/kanban/columns"),
      600,
      "GET /bd/kanban/columns"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  test("POST /bd/kanban/columns → 201 + id", async () => {
    const res = await api.post("/bd/kanban/columns", {
      title: "E2E_TEST_COLUMN",
      urutan: 99,
      color: "#ff0000",
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    columnId = String(res.data.id);
  });

  test("POST /bd/kanban/cards → 201 + id", async () => {
    if (!columnId) return;
    const res = await api.post("/bd/kanban/cards", {
      column_id: columnId,
      title: "E2E_TEST_CARD",
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    cardId = String(res.data.id);
  });

  test("GET /bd/kanban/cards (via /kanban/columns) → 200 + < 600ms", async () => {
    const res = await timedRequest(
      () => api.get("/bd/kanban/columns"),
      600,
      "GET /bd/kanban cards via columns"
    );
    expect(res.status).toBe(200);
  });

  test("PATCH /bd/kanban/cards/:id → 200", async () => {
    if (!cardId) return;
    const res = await api.patch(`/bd/kanban/cards/${cardId}`, {
      title: "E2E_TEST_CARD_UPDATED",
    });
    expect(res.status).toBe(200);
  });

  test("GET /bd/kanban/metrics → 200", async () => {
    const res = await api.get("/bd/kanban/metrics");
    expect(res.status).toBe(200);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  test("DELETE /bd/kanban/cards/:id → 200", async () => {
    if (!cardId) return;
    const res = await api.delete(`/bd/kanban/cards/${cardId}`);
    expect(res.status).toBe(200);
  });

  test("DELETE /bd/kanban/columns/:id → 200", async () => {
    if (!columnId) return;
    const res = await api.delete(`/bd/kanban/columns/${columnId}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sales Admin Kanban
// ─────────────────────────────────────────────────────────────────────────────

describe("Sales Admin Kanban — /sales-admin/kanban", () => {
  const api = createApi("superAdmin");
  let cardId: string;

  test("GET /sales-admin/kanban?bulan=3&tahun=2026 → 200 + permanent columns + < 600ms", async () => {
    const res = await timedRequest(
      () => api.get("/sales-admin/kanban?bulan=3&tahun=2026"),
      600,
      "GET /sales-admin/kanban"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    // Harus ada permanent columns
    const titles = (res.data as any[]).map((c) => c.title);
    expect(titles).toContain("W1");
    expect(titles).toContain("W4");
    expect(titles).toContain("Closing Survey");
    expect(titles).toContain("Move To Telemarketing");
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  test("POST /sales-admin/kanban/columns/:id/cards → 201", async () => {
    // Ambil column pertama (W1)
    const colsRes = await api.get("/sales-admin/kanban?bulan=3&tahun=2026");
    expect(colsRes.status).toBe(200);
    const w1 = (colsRes.data as any[]).find((c) => c.title === "W1");
    if (!w1) return; // skip jika tidak ada

    const res = await api.post(`/sales-admin/kanban/columns/${w1.id}/cards`, {
      title: "E2E_TEST_SA_CARD",
      nama_klien: "Test Klien",
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    cardId = String(res.data.id);
  });

  test("POST /sales-admin/kanban/carryover → tidak crash", async () => {
    const res = await api.post("/sales-admin/kanban/carryover", {
      bulan_asal: 2,
      tahun_asal: 2026,
      bulan_tujuan: 3,
      tahun_tujuan: 2026,
    });
    // Boleh 200 atau 4xx jika sudah di-carryover sebelumnya
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Telemarketing Kanban
// ─────────────────────────────────────────────────────────────────────────────

describe("Telemarketing Kanban — /telemarketing/kanban", () => {
  const api = createApi("superAdmin");

  test("GET /telemarketing/kanban?bulan=3&tahun=2026 → 200 + 'From Sales Admin' column + < 600ms", async () => {
    const res = await timedRequest(
      () => api.get("/telemarketing/kanban?bulan=3&tahun=2026"),
      600,
      "GET /telemarketing/kanban"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);

    const titles = (res.data as any[]).map((c) => c.title);
    expect(titles).toContain("From Sales Admin");
    expect(titles).toContain("Move To Cold Database");
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });
});
