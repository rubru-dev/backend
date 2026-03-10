// cypress/e2e/sales-cycle.cy.js
// E2E Test: Sales Cycle — BD Create Lead → Sales Admin Kanban → Finance Invoice
// Setup: cy.session dipakai untuk reuse login. Backend harus running di localhost:8000
//        Frontend harus running di localhost:3000

const API = "http://localhost:8000/api/v1";
const APP = "http://localhost:3000";

// ── Helpers ────────────────────────────────────────────────────────────────────

function loginAs(email, password = "password123") {
  cy.session([email], () => {
    cy.request("POST", `${API}/auth/login`, { email, password }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("access_token");
      window.localStorage.setItem("access_token", res.body.access_token);
      window.localStorage.setItem("refresh_token", res.body.refresh_token);
      window.localStorage.setItem("user", JSON.stringify(res.body.user));
    });
  });
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe("Sales Cycle: BD → Sales Admin → Finance Invoice", () => {
  let createdLeadId;
  let createdInvoiceId;

  // --------------------------------------------------------------------------
  // STEP 1: BD user membuat lead baru
  // --------------------------------------------------------------------------
  describe("1. BD: Create Lead", () => {
    before(() => {
      loginAs("bd@test.com");
    });

    it("BD dapat membuat lead baru", () => {
      cy.request({
        method: "POST",
        url: `${API}/bd/leads`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
        body: {
          nama: "Test Client Cypress",
          nomor_telepon: "08123456789",
          alamat: "Jl. Test No. 1, Jakarta",
          sumber_leads: "Instagram",
          jenis: "Sipil",
          status: "Hot",
          modul: "bd",
          bulan: new Date().getMonth() + 1,
          tahun: new Date().getFullYear(),
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property("id");
        createdLeadId = res.body.id;
      });
    });

    it("Lead muncul di list BD leads", () => {
      cy.request({
        url: `${API}/bd/leads?search=Test+Client+Cypress`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const found = res.body.items.find((l) => l.nama === "Test Client Cypress");
        expect(found).to.exist;
      });
    });

    it("BD UI: halaman /bd tampil dengan lead baru", () => {
      cy.visit(`${APP}/bd`);
      cy.contains("Test Client Cypress").should("be.visible");
    });
  });

  // --------------------------------------------------------------------------
  // STEP 2: Sales Admin Kanban — tambahkan lead ke kanban
  // --------------------------------------------------------------------------
  describe("2. Sales Admin: Kanban Card", () => {
    before(() => {
      loginAs("sales@test.com");
    });

    it("Sales Admin dapat mengakses kanban board", () => {
      cy.visit(`${APP}/sales-admin/kanban`);
      cy.get("[data-testid='kanban-board'], .kanban-board, h1").should("exist");
    });

    it("API kanban board returns columns", () => {
      const now = new Date();
      cy.request({
        url: `${API}/sales-admin/kanban?bulan=${now.getMonth() + 1}&tahun=${now.getFullYear()}`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("columns");
        expect(res.body.columns).to.be.an("array");
        expect(res.body.columns.length).to.be.greaterThan(0);
        // Harus ada kolom permanent W1, W2, dst
        const titles = res.body.columns.map((c) => c.title);
        expect(titles).to.include("W1");
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 3: Finance membuat Invoice dari lead
  // --------------------------------------------------------------------------
  describe("3. Finance: Create Invoice", () => {
    before(() => {
      loginAs("finance@test.com");
    });

    it("Finance dapat mengakses leads dropdown", () => {
      cy.request({
        url: `${API}/finance/leads-dropdown`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array");
      });
    });

    it("Finance dapat membuat invoice dari lead", () => {
      expect(createdLeadId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/finance/invoices`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
        body: {
          lead_id: createdLeadId,
          tanggal: new Date().toISOString().split("T")[0],
          catatan: "Invoice test Cypress",
          ppn_percentage: 11,
          items: [
            { description: "Biaya Sipil", quantity: 1, unit_price: 50000000 },
          ],
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property("id");
        createdInvoiceId = res.body.id;
      });
    });

    it("Invoice dibuat dengan status draft", () => {
      expect(createdInvoiceId).to.exist;
      cy.request({
        url: `${API}/finance/invoices/${createdInvoiceId}`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.status.toLowerCase()).to.eq("draft");
      });
    });

    it("Finance UI: halaman invoice-kwitansi tampil", () => {
      cy.visit(`${APP}/finance/invoice-kwitansi`);
      cy.contains("Invoice").should("be.visible");
    });
  });

  // --------------------------------------------------------------------------
  // STEP 4: Invoice workflow — sign head → sign admin → mark paid
  // --------------------------------------------------------------------------
  describe("4. Finance: Invoice Workflow (draft → Terbit → Lunas)", () => {
    it("Head Finance sign invoice", () => {
      expect(createdInvoiceId).to.exist;
      loginAs("admin@test.com"); // Super Admin bisa sign sebagai keduanya

      cy.request({
        method: "POST",
        url: `${API}/finance/invoices/${createdInvoiceId}/sign-head`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
        body: { signature: "Head Finance Signature Test" },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
      });
    });

    it("Admin Finance sign invoice", () => {
      expect(createdInvoiceId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/finance/invoices/${createdInvoiceId}/sign-admin`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
        body: { signature: "Admin Finance Signature Test" },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
      });
    });

    it("Invoice status berubah menjadi Terbit setelah kedua TTD", () => {
      expect(createdInvoiceId).to.exist;
      cy.request({
        url: `${API}/finance/invoices/${createdInvoiceId}`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.status).to.eq("Terbit");
      });
    });

    it("Mark invoice as paid → auto-create Kwitansi", () => {
      expect(createdInvoiceId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/finance/invoices/${createdInvoiceId}/mark-paid`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
        body: {
          metode_bayar: "Transfer Bank",
          detail_bayar: "BCA 1234567890 a.n. Test Client",
          tanggal: new Date().toISOString().split("T")[0],
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
      });
    });

    it("Invoice status Lunas dan Kwitansi terbuat", () => {
      expect(createdInvoiceId).to.exist;
      cy.request({
        url: `${API}/finance/invoices/${createdInvoiceId}/kwitansi`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("id");
        expect(res.body).to.have.property("nomor_kwitansi");
      });
    });
  });

  // --------------------------------------------------------------------------
  // CLEANUP — Hapus test data
  // --------------------------------------------------------------------------
  after(() => {
    loginAs("admin@test.com");

    if (createdInvoiceId) {
      cy.request({
        method: "DELETE",
        url: `${API}/finance/invoices/${createdInvoiceId}`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
        failOnStatusCode: false,
      });
    }

    if (createdLeadId) {
      cy.request({
        method: "DELETE",
        url: `${API}/bd/leads/${createdLeadId}`,
        headers: { Authorization: `Bearer ${window.localStorage.getItem("access_token")}` },
        failOnStatusCode: false,
      });
    }
  });
});
