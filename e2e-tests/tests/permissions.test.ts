import { createApi, createApiNoAuth } from "../helpers/api";

describe("Permissions / RBAC", () => {
  /**
   * Test RBAC berdasarkan middleware yang BENAR-BENAR dipasang di routes.
   *
   * Routes yang punya requireRole/requirePermission:
   *  - GET/DELETE /admin/*  → requireRole("Super Admin")
   *  - POST /invoice/:id/approve → requirePermission("finance","edit")
   *  - POST /invoices/:id/sign-head → requirePermission("finance","sign_head")
   *  - POST /invoices/:id/sign-admin → requirePermission("finance","sign_admin")
   *
   * Routes yang TIDAK punya permission check (terbuka untuk semua auth user):
   *  - GET /bd/leads, GET /finance/invoices, POST /finance/invoices
   *  ⚠️  Rekomendasi: tambahkan requirePermission pada route-route ini
   */

  // ─── Routes yang benar-benar diproteksi ───────────────────────────────────

  test("sales user → GET /admin/users → 403", async () => {
    const api = createApi("sales");
    const res = await api.get("/admin/users");
    expect(res.status).toBe(403);
  });

  test("bd user → DELETE /admin/roles/1 → 403", async () => {
    const api = createApi("bd");
    const res = await api.delete("/admin/roles/1");
    expect(res.status).toBe(403);
  });

  test("desain user → DELETE /admin/roles/1 → 403", async () => {
    const api = createApi("desain");
    const res = await api.delete("/admin/roles/1");
    expect(res.status).toBe(403);
  });

  test("(no token) → GET /bd/leads → 401", async () => {
    const api = createApiNoAuth();
    const res = await api.get("/bd/leads");
    expect(res.status).toBe(401);
  });

  test("(no token) → GET /finance/invoices → 401", async () => {
    const api = createApiNoAuth();
    const res = await api.get("/finance/invoices");
    expect(res.status).toBe(401);
  });

  test("superAdmin → GET /admin/users → 200", async () => {
    const api = createApi("superAdmin");
    const res = await api.get("/admin/users");
    expect(res.status).toBe(200);
  });

  test("superAdmin bypass semua — GET /finance/invoices → 200", async () => {
    const api = createApi("superAdmin");
    const res = await api.get("/finance/invoices");
    expect(res.status).toBe(200);
  });

  test("superAdmin bypass semua — GET /bd/leads → 200", async () => {
    const api = createApi("superAdmin");
    const res = await api.get("/bd/leads");
    expect(res.status).toBe(200);
  });

  // ─── Finance sign endpoints (requirePermission) ────────────────────────────

  test("superAdmin → sign-head → tidak 403 (superAdmin bypass permission)", async () => {
    // Buat invoice dulu
    const api = createApi("superAdmin");
    const leadsRes = await api.get("/finance/leads-dropdown");
    if (leadsRes.status !== 200 || !leadsRes.data.items?.length) return;
    const leadId = String(leadsRes.data.items[0].id);

    const inv = await api.post("/finance/invoices", {
      lead_id: leadId,
      tanggal: new Date().toISOString().split("T")[0],
      catatan: "Permission test",
      ppn_percentage: 0,
      items: [],
    });
    if (inv.status !== 201) return;
    const invId = String(inv.data.id);

    const signRes = await api.post(`/finance/invoices/${invId}/sign-head`, {
      signature_data: "data:image/png;base64,TEST",
    });
    // SuperAdmin harusnya bisa, bukan 403
    expect(signRes.status).not.toBe(403);

    // Cleanup
    await api.delete(`/finance/invoices/${invId}`);
  });

  test("content user → content-creator endpoint → bukan 403/401", async () => {
    const api = createApi("content");
    const res = await api.get("/content-creator/campaigns");
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  // ─── Routes yang kini diproteksi requirePermission ───────────────────────────

  test("desain user → GET /bd/leads → 403 (bd.view required)", async () => {
    const api = createApi("desain");
    const res = await api.get("/bd/leads");
    expect(res.status).toBe(403);
  });

  test("content user → GET /finance/invoices → 403 (finance.view required)", async () => {
    const api = createApi("content");
    const res = await api.get("/finance/invoices");
    expect(res.status).toBe(403);
  });
});
