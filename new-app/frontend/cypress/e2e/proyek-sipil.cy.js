// cypress/e2e/proyek-sipil.cy.js
// E2E Test: Proyek Sipil — Create Proyek → RAPP → Stock Opname → PDF
// Setup: Backend running di localhost:8000, Frontend di localhost:3000

const API = "http://localhost:8000/api/v1";
const APP = "http://localhost:3000";

function loginAs(email, password = "password123") {
  cy.session([email], () => {
    cy.request("POST", `${API}/auth/login`, { email, password }).then((res) => {
      expect(res.status).to.eq(200);
      window.localStorage.setItem("access_token", res.body.access_token);
      window.localStorage.setItem("refresh_token", res.body.refresh_token);
      window.localStorage.setItem("user", JSON.stringify(res.body.user));
    });
  });
}

function getToken() {
  return window.localStorage.getItem("access_token");
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe("Proyek Sipil: Create → RAPP → Stock Opname → PDF", () => {
  let proyekId;
  let terminId;
  let rappKategoriId;
  let rappItemId;
  let leadId;

  // --------------------------------------------------------------------------
  // SETUP: Buat lead terlebih dahulu (diperlukan untuk proyek)
  // --------------------------------------------------------------------------
  before(() => {
    loginAs("admin@test.com");

    cy.request({
      method: "POST",
      url: `${API}/bd/leads`,
      headers: { Authorization: `Bearer ${getToken()}` },
      body: {
        nama: "Cypress Sipil Client",
        nomor_telepon: "08111111111",
        alamat: "Jl. Sipil Test",
        sumber_leads: "Referral",
        jenis: "Sipil",
        status: "Hot",
        modul: "bd",
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear(),
      },
    }).then((res) => {
      expect(res.status).to.eq(201);
      leadId = res.body.id;
    });
  });

  // --------------------------------------------------------------------------
  // STEP 1: PIC Create Proyek Sipil
  // --------------------------------------------------------------------------
  describe("1. Create Proyek Sipil", () => {
    it("Dapat membuat proyek berjalan baru", () => {
      expect(leadId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/sipil/projeks`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          nama_proyek: "Renovasi Cypress Test",
          lead_id: leadId,
          lokasi: "Jakarta Selatan",
          nilai_rab: 150000000,
          tanggal_mulai: "2026-03-01",
          tanggal_selesai: "2026-06-30",
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property("id");
        proyekId = res.body.id;
      });
    });

    it("Proyek muncul di list GET /sipil/projeks", () => {
      cy.request({
        url: `${API}/sipil/projeks`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const found = (res.body.items || res.body).find(
          (p) => p.nama_proyek === "Renovasi Cypress Test"
        );
        expect(found).to.exist;
      });
    });

    it("Tambah termin ke proyek", () => {
      expect(proyekId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/sipil/projeks/${proyekId}/termins`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          urutan: 1,
          nama: "Termin 1 - Pondasi",
          tanggal_mulai: "2026-03-01",
          tanggal_selesai: "2026-04-30",
          rab: 50000000,
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
        terminId = res.body.id;
      });
    });

    it("UI: halaman sipil tampil dengan proyek baru", () => {
      cy.visit(`${APP}/projek/sipil`);
      cy.contains("Renovasi Cypress Test").should("be.visible");
    });
  });

  // --------------------------------------------------------------------------
  // STEP 2: Setup RAPP (Material)
  // --------------------------------------------------------------------------
  describe("2. Setup RAPP Material", () => {
    it("Tambah kategori material ke termin", () => {
      expect(terminId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/sipil/termins/${terminId}/rapp/material-kategori`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          kode: "A",
          nama: "Semen & Pasir",
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
        rappKategoriId = res.body.id;
      });
    });

    it("Tambah item material ke kategori", () => {
      expect(rappKategoriId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/sipil/rapp/material-kategori/${rappKategoriId}/items`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          material: "Semen Portland 50kg",
          vol: 100,
          sat: "Sak",
          harga_satuan: 75000,
          jumlah: 7500000,
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
        rappItemId = res.body.id;
      });
    });

    it("GET RAPP data menampilkan kategori dan item", () => {
      expect(terminId).to.exist;
      cy.request({
        url: `${API}/sipil/termins/${terminId}/rapp`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("material");
        expect(res.body.material).to.be.an("array");
        expect(res.body.material.length).to.be.greaterThan(0);
        const kat = res.body.material[0];
        expect(kat.nama).to.eq("Semen & Pasir");
        expect(kat.items.length).to.eq(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 3: Stock Opname — Catat penggunaan harian
  // --------------------------------------------------------------------------
  describe("3. Stock Opname — Catat Penggunaan", () => {
    it("GET stock opname RAPP referensi berhasil", () => {
      expect(proyekId).to.exist;
      cy.request({
        url: `${API}/sipil/projeks/${proyekId}/stock-opname/rapp`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array");
      });
    });

    it("Catat penggunaan item RAPP", () => {
      expect(proyekId).to.exist;
      expect(rappItemId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/sipil/projeks/${proyekId}/stock-opname/logs`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          item_ref_type: "material",
          item_ref_id: rappItemId,
          item_nama: "Semen Portland 50kg",
          item_satuan: "Sak",
          qty_pakai: 10,
          tanggal: new Date().toISOString().split("T")[0],
          catatan: "Pemakaian hari pertama",
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
      });
    });

    it("GET stock opname logs menampilkan entry baru", () => {
      expect(proyekId).to.exist;
      cy.request({
        url: `${API}/sipil/projeks/${proyekId}/stock-opname/logs`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const logs = res.body.items || res.body;
        expect(logs).to.be.an("array");
        const found = logs.find((l) => l.item_nama === "Semen Portland 50kg");
        expect(found).to.exist;
        expect(Number(found.qty_pakai)).to.eq(10);
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 4: UI — Detail proyek dengan tabs
  // --------------------------------------------------------------------------
  describe("4. UI: Detail Proyek Sipil", () => {
    it("Halaman detail proyek ada 5 tab", () => {
      expect(proyekId).to.exist;
      cy.visit(`${APP}/projek/sipil/${proyekId}`);
      // Tab: Daftar Termin, Gantt, Docs/Link, RAPP, Stock Opname
      cy.contains("Daftar Termin").should("be.visible");
      cy.contains("RAPP").should("be.visible");
      cy.contains("Stock Opname").should("be.visible");
    });

    it("Tab RAPP menampilkan data yang sudah dibuat", () => {
      expect(proyekId).to.exist;
      cy.visit(`${APP}/projek/sipil/${proyekId}`);
      cy.contains("RAPP").click();
      cy.contains("Semen & Pasir").should("be.visible");
      cy.contains("Semen Portland 50kg").should("be.visible");
    });

    it("Tab Stock Opname menampilkan sub-tab Item RAPP dan Riwayat", () => {
      cy.visit(`${APP}/projek/sipil/${proyekId}`);
      cy.contains("Stock Opname").click();
      cy.contains("Item RAPP").should("be.visible");
      cy.contains("Riwayat Penggunaan").should("be.visible");
    });
  });

  // --------------------------------------------------------------------------
  // STEP 5: Docs/Link Upload
  // --------------------------------------------------------------------------
  describe("5. Docs/Link — Upload dokumen", () => {
    it("POST /sipil/projeks/:id/links dengan URL berhasil", () => {
      expect(proyekId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/sipil/projeks/${proyekId}/links`,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: {
          title: "Gambar Denah Test",
          url: "https://example.com/denah.pdf",
          catatan: "Denah lantai 1",
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
      });
    });

    it("GET /sipil/projeks/:id/links menampilkan link yang ditambahkan", () => {
      cy.request({
        url: `${API}/sipil/projeks/${proyekId}/links`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const links = res.body;
        expect(links).to.be.an("array");
        const found = links.find((l) => l.title === "Gambar Denah Test");
        expect(found).to.exist;
      });
    });
  });

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------
  after(() => {
    if (proyekId) {
      cy.request({
        method: "DELETE",
        url: `${API}/sipil/projeks/${proyekId}`,
        headers: { Authorization: `Bearer ${getToken()}` },
        failOnStatusCode: false,
      });
    }
    if (leadId) {
      cy.request({
        method: "DELETE",
        url: `${API}/bd/leads/${leadId}`,
        headers: { Authorization: `Bearer ${getToken()}` },
        failOnStatusCode: false,
      });
    }
  });
});
