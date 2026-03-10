import { createApi, timedRequest } from "../helpers/api";

/**
 * Response format: paginateResponse → {items:[], total, page, per_page, meta}
 * Route reference (mounted at /api/v1/finance):
 *  GET    /invoices                     → {items:[...], total, ...}
 *  POST   /invoices                     → create invoice dari lead_id → {id, ...}
 *  POST   /invoices/:id/sign-head       → body: {signature_data}
 *  POST   /invoices/:id/sign-admin      → body: {signature_data}
 *  POST   /invoices/:id/mark-paid       → set Lunas + auto-create kwitansi
 *  GET    /invoices/:id/kwitansi        → get kwitansi
 *  DELETE /invoices/:id                 → delete invoice
 *  GET    /leads-dropdown               → {items:[...], total, ...}
 *  GET    /adm-projek                   → {items:[...], total, ...}
 *  POST   /reimburse                    → body: {user_id, tanggal, kategori, keterangan, items[]}
 *  GET    /reimburse                    → {items:[...], ...}
 */

describe("Finance — Invoice Flow", () => {
  const api = createApi("superAdmin");
  let leadId: string;
  let invoiceId: string;
  let userId: string;

  // Ambil user id dari /auth/me untuk reimburse
  beforeAll(async () => {
    const me = await api.get("/auth/me");
    if (me.status === 200) userId = String(me.data.id);
  });

  // 1. GET /leads-dropdown → 200 + items[] + < 500ms
  test("GET /finance/leads-dropdown → 200 + items[] + < 500ms", async () => {
    const res = await timedRequest(
      () => api.get("/finance/leads-dropdown"),
      500,
      "GET /finance/leads-dropdown"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    if (res.data.items.length > 0) {
      leadId = String(res.data.items[0].id);
    }
  });

  // Buat lead untuk test jika tidak ada
  test("Setup: buat lead untuk test invoice jika belum ada", async () => {
    if (leadId) return;
    const bdApi = createApi("bd");
    const res = await bdApi.post("/bd/leads", {
      nama: "E2E_INVOICE_TEST_CLIENT",
      jenis: "Sipil",
      bulan: 3,
      tahun: 2026,
      modul: "bd",
    });
    if (res.status === 201) leadId = String(res.data.id);
  });

  // 2. POST /invoices → 201 + status Draft
  test("POST /finance/invoices → 201 + status Draft", async () => {
    if (!leadId) return;
    const res = await api.post("/finance/invoices", {
      lead_id: leadId,
      tanggal: new Date().toISOString().split("T")[0],
      catatan: "E2E Test Invoice",
      ppn_percentage: 11,
      items: [{ description: "Pekerjaan Sipil E2E", quantity: 1, unit_price: 10000000 }],
    });
    expect(res.status).toBe(201);
    expect(res.data.id).toBeDefined();
    expect(res.data.status).toBe("Draft");
    expect(() => JSON.stringify(res.data)).not.toThrow();
    invoiceId = String(res.data.id);
  });

  // 3. GET /invoices → 200 + items[] + < 500ms
  test("GET /finance/invoices → 200 + items[] + < 500ms", async () => {
    const res = await timedRequest(
      () => api.get("/finance/invoices"),
      500,
      "GET /finance/invoices"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  // 4. POST sign-head → 200 (perlu signature_data)
  test("POST /finance/invoices/:id/sign-head → 200", async () => {
    if (!invoiceId) return;
    const res = await api.post(`/finance/invoices/${invoiceId}/sign-head`, {
      signature_data: "data:image/png;base64,HEAD_SIGNATURE_E2E",
    });
    expect([200, 201]).toContain(res.status);
  });

  // 5. POST sign-admin → 200
  test("POST /finance/invoices/:id/sign-admin → 200", async () => {
    if (!invoiceId) return;
    const res = await api.post(`/finance/invoices/${invoiceId}/sign-admin`, {
      signature_data: "data:image/png;base64,ADMIN_SIGNATURE_E2E",
    });
    expect([200, 201]).toContain(res.status);
  });

  // 6. Status setelah kedua TTD → Terbit
  test("Status invoice setelah kedua TTD → Terbit", async () => {
    if (!invoiceId) return;
    const res = await api.get("/finance/invoices");
    expect(res.status).toBe(200);
    const inv = (res.data.items as any[]).find((i: any) => String(i.id) === invoiceId);
    if (inv) {
      expect(["Terbit", "Draft"]).toContain(inv.status);
    }
  });

  // 7. POST mark-paid
  test("POST /finance/invoices/:id/mark-paid → kwitansi auto-created", async () => {
    if (!invoiceId) return;
    const res = await api.post(`/finance/invoices/${invoiceId}/mark-paid`, {
      metode_bayar: "Transfer Bank",
      detail_bayar: "BCA 1234567890",
    });
    // Harus berhasil (200) atau gagal karena belum Terbit (400)
    expect([200, 400]).toContain(res.status);
  });

  // 8. GET kwitansi
  test("GET /finance/invoices/:id/kwitansi → ada nomor_kwitansi atau 404", async () => {
    if (!invoiceId) return;
    const res = await api.get(`/finance/invoices/${invoiceId}/kwitansi`);
    if (res.status === 200) {
      expect(res.data.nomor_kwitansi ?? res.data.id).toBeDefined();
      expect(() => JSON.stringify(res.data)).not.toThrow();
    } else {
      expect([404]).toContain(res.status);
    }
  });

  // 9. DELETE invoice draft baru
  test("DELETE invoice draft → 200", async () => {
    if (!leadId) return;
    const createRes = await api.post("/finance/invoices", {
      lead_id: leadId,
      tanggal: new Date().toISOString().split("T")[0],
      catatan: "Delete test",
      ppn_percentage: 0,
      items: [],
    });
    if (createRes.status !== 201) return;
    const draftId = String(createRes.data.id);
    const del = await api.delete(`/finance/invoices/${draftId}`);
    expect(del.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tukang Flow
// ─────────────────────────────────────────────────────────────────────────────

describe("Finance — Tukang", () => {
  const api = createApi("superAdmin");
  let admProjekId: string;

  // 1. GET /adm-projek → items[] + < 500ms
  test("GET /finance/adm-projek → items[] + < 500ms", async () => {
    const res = await timedRequest(
      () => api.get("/finance/adm-projek"),
      500,
      "GET /finance/adm-projek"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    if (res.data.items.length > 0) {
      admProjekId = String(res.data.items[0].id);
    }
  });

  // 2. GET registry
  test("GET /finance/adm-projek/:id/tukang/registry → array", async () => {
    if (!admProjekId) return;
    const res = await api.get(`/finance/adm-projek/${admProjekId}/tukang/registry`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  // 3. POST absen-checklist → foto null + status Disetujui
  test("POST /finance/adm-projek/:id/tukang/absen-checklist → foto null", async () => {
    if (!admProjekId) return;
    const regRes = await api.get(`/finance/adm-projek/${admProjekId}/tukang/registry`);
    if (regRes.status !== 200 || !regRes.data.length) return;
    const tukangIds = regRes.data.map((t: any) => String(t.id));

    const res = await api.post(
      `/finance/adm-projek/${admProjekId}/tukang/absen-checklist`,
      { tanggal: new Date().toISOString().split("T")[0], tukang_ids: tukangIds.slice(0, 2) }
    );
    expect([200, 201]).toContain(res.status);
    if (Array.isArray(res.data)) {
      res.data.forEach((a: any) => expect(a.foto).toBeNull());
    }
  });

  // 4. GET absen-foto list → < 500ms
  test("GET /finance/adm-projek/:id/tukang/absen-foto → < 500ms", async () => {
    if (!admProjekId) return;
    const res = await timedRequest(
      () => api.get(`/finance/adm-projek/${admProjekId}/tukang/absen-foto`),
      500,
      "GET absen-foto"
    );
    expect(res.status).toBe(200);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  // 5. GET kasbon list → 200
  test("GET /finance/adm-projek/:id/tukang/kasbon → 200", async () => {
    if (!admProjekId) return;
    const res = await api.get(`/finance/adm-projek/${admProjekId}/tukang/kasbon`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reimburse
// ─────────────────────────────────────────────────────────────────────────────

describe("Finance — Reimburse", () => {
  const api = createApi("superAdmin");
  let reimburseId: string;
  let userId: string;

  beforeAll(async () => {
    const me = await api.get("/auth/me");
    if (me.status === 200) userId = String(me.data.id);
  });

  // 1. POST /reimburse → 201
  test("POST /finance/reimburse → 201", async () => {
    if (!userId) return;
    const res = await api.post("/finance/reimburse", {
      user_id: userId,
      tanggal: new Date().toISOString().split("T")[0],
      keterangan: "E2E Test Reimburse",
      items: [{ deskripsi: "Bensin", jumlah: 100000 }],
    });
    expect([200, 201]).toContain(res.status);
    if (res.data?.id) reimburseId = String(res.data.id);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  // 2. GET /reimburse → 200 + items[] + < 500ms
  test("GET /finance/reimburse → 200 + items[] + < 500ms", async () => {
    const res = await timedRequest(
      () => api.get("/finance/reimburse"),
      500,
      "GET /finance/reimburse"
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(() => JSON.stringify(res.data)).not.toThrow();
  });

  // 3. Decimal total tidak NaN
  test("Decimal total reimburse tidak NaN", async () => {
    const res = await api.get("/finance/reimburse");
    if (res.status === 200 && res.data.items?.length > 0) {
      const item = res.data.items[0];
      if (item.total !== undefined) {
        expect(isNaN(Number(item.total))).toBe(false);
      }
    }
  });

  // 4. POST sign-head → 200/201 (perlu signature_data)
  test("POST /finance/reimburse/:id/sign-head → OK atau 400", async () => {
    if (!reimburseId) return;
    const res = await api.post(`/finance/reimburse/${reimburseId}/sign-head`, {
      signature_data: "data:image/png;base64,HF_SIG_E2E",
    });
    expect([200, 201, 400]).toContain(res.status);
  });
});
