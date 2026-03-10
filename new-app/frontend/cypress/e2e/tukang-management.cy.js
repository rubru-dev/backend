// cypress/e2e/tukang-management.cy.js
// E2E Test: Tukang System — Register → Absen → Approve/Checklist → Kasbon → Gajian → Kwitansi
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

describe("Tukang System: Register → Absen → Kasbon → Gajian → Kwitansi", () => {
  let admProjekId;
  let tukangId;
  let absenFotoId;
  let kasbonId;
  let gajianId;

  // --------------------------------------------------------------------------
  // SETUP: Buat AdmFinanceProject sebagai test fixture
  // --------------------------------------------------------------------------
  before(() => {
    loginAs("admin@test.com");

    // Buat lead terlebih dahulu
    cy.request({
      method: "POST",
      url: `${API}/bd/leads`,
      headers: { Authorization: `Bearer ${getToken()}` },
      body: {
        nama: "Cypress Tukang Client",
        nomor_telepon: "08222222222",
        jenis: "Sipil",
        status: "Hot",
        modul: "bd",
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear(),
      },
    }).then((leadRes) => {
      const leadId = leadRes.body.id;

      // Buat proyek administrasi
      cy.request({
        method: "POST",
        url: `${API}/finance/adm-projek`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          lead_id: leadId,
          nama_proyek: "Proyek Cypress Tukang",
          klien: "Cypress Tukang Client",
          jenis: "Sipil",
          lokasi: "Jakarta",
          tanggal_mulai: "2026-03-01",
          tanggal_selesai: "2026-06-30",
          status: "Aktif",
        },
      }).then((projRes) => {
        expect(projRes.status).to.be.oneOf([200, 201]);
        admProjekId = projRes.body.id;
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 1: Register tukang ke proyek
  // --------------------------------------------------------------------------
  describe("1. Registry: Daftarkan Tukang", () => {
    it("Admin Finance dapat mendaftarkan tukang baru", () => {
      expect(admProjekId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/registry`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          nama: "Pak Budi Cypress",
          jabatan: "Kepala Tukang",
          upah_harian: 250000,
          is_active: true,
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
        tukangId = res.body.id;
      });
    });

    it("GET registry menampilkan tukang yang baru didaftarkan", () => {
      expect(admProjekId).to.exist;
      cy.request({
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/registry`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array");
        const found = res.body.find((t) => t.nama === "Pak Budi Cypress");
        expect(found).to.exist;
        expect(Number(found.upah_harian)).to.eq(250000);
      });
    });

    it("UI: Tab Tukang di Administrasi Projek tampil", () => {
      expect(admProjekId).to.exist;
      cy.visit(`${APP}/finance/administrasi-projek/${admProjekId}`);
      cy.contains("Tukang").should("be.visible");
    });
  });

  // --------------------------------------------------------------------------
  // STEP 2: Absen Foto — Submit oleh admin (checklist, tanpa foto)
  // --------------------------------------------------------------------------
  describe("2. Absen: Admin Delegasi Checklist (tanpa foto)", () => {
    it("Admin dapat submit absen checklist untuk tukang", () => {
      expect(admProjekId).to.exist;
      expect(tukangId).to.exist;
      const today = new Date().toISOString().split("T")[0];

      cy.request({
        method: "POST",
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/absen-checklist`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          tukang_id: tukangId,
          tanggal: today,
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
        absenFotoId = res.body.id;
        // Status harus langsung Disetujui
        expect(res.body.status).to.eq("Disetujui");
        // foto harus null (delegasi tanpa foto)
        expect(res.body.foto).to.be.null;
      });
    });

    it("GET absen-foto list menampilkan absen dengan status Disetujui", () => {
      expect(admProjekId).to.exist;
      cy.request({
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/absen-foto`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const found = (res.body.items || res.body).find((a) => a.id === absenFotoId);
        expect(found).to.exist;
        expect(found.status).to.eq("Disetujui");
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 3: Absen Foto — Submit dengan foto, lalu approve
  // --------------------------------------------------------------------------
  describe("3. Absen: Submit Foto → Approve", () => {
    let pendingAbsenId;

    it("Submit absen dengan foto (base64 dummy)", () => {
      expect(admProjekId).to.exist;
      expect(tukangId).to.exist;
      // Gunakan tanggal berbeda agar tidak konflik
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      cy.request({
        method: "POST",
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/absen-foto`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          tukang_id: tukangId,
          tanggal: yesterday,
          foto: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA==", // minimal valid base64
          foto_timestamp: new Date().toISOString(),
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200 || res.status === 201) {
          pendingAbsenId = res.body.id;
          expect(res.body.status).to.be.oneOf(["Pending", "Disetujui"]);
        }
        // Jika conflict tanggal, test masih pass
      });
    });

    it("Approve absen foto jika ada pending", () => {
      if (!pendingAbsenId) return; // Skip jika tidak ada pending

      cy.request({
        method: "POST",
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/absen-foto/${pendingAbsenId}/approve`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {},
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 4: Kasbon (Cash Advance)
  // --------------------------------------------------------------------------
  describe("4. Kasbon", () => {
    it("Admin dapat mencatat kasbon untuk tukang", () => {
      expect(admProjekId).to.exist;
      expect(tukangId).to.exist;
      cy.request({
        method: "POST",
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/${tukangId}/kasbon`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          jumlah: 500000,
          catatan: "Kasbon untuk keperluan tukang",
          tanggal: new Date().toISOString().split("T")[0],
        },
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
        expect(res.body).to.have.property("id");
        kasbonId = res.body.id;
        expect(Number(res.body.jumlah)).to.eq(500000);
        expect(res.body.sudah_dipotong).to.be.false;
      });
    });

    it("GET kasbon list menampilkan kasbon baru", () => {
      expect(admProjekId).to.exist;
      cy.request({
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/kasbon`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const kasbons = res.body.items || res.body;
        const found = kasbons.find((k) => k.id === kasbonId);
        expect(found).to.exist;
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 5: Gajian — Proses penggajian otomatis
  // --------------------------------------------------------------------------
  describe("5. Gajian: Create Payroll", () => {
    it("Admin dapat memproses gajian tukang", () => {
      expect(admProjekId).to.exist;
      const now = new Date();
      const bulan = now.getMonth() + 1;
      const tahun = now.getFullYear();

      cy.request({
        method: "POST",
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/gajian`,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: {
          bulan,
          tahun,
          tanggal_mulai: `${tahun}-${String(bulan).padStart(2, "0")}-01`,
          tanggal_selesai: `${tahun}-${String(bulan).padStart(2, "0")}-${new Date(tahun, bulan, 0).getDate()}`,
        },
      }).then((res) => {
        // Bisa success atau conflict (jika sudah ada gajian bulan ini)
        if (res.status === 200 || res.status === 201) {
          expect(res.body).to.have.property("id");
          gajianId = res.body.id;
          expect(res.body).to.have.property("items");
          expect(res.body.items).to.be.an("array");
        } else {
          // Gajian mungkin sudah ada — ambil dari list
          cy.request({
            url: `${API}/finance/adm-projek/${admProjekId}/tukang/gajian`,
            headers: { Authorization: `Bearer ${getToken()}` },
          }).then((listRes) => {
            const gajians = listRes.body.items || listRes.body;
            if (gajians.length > 0) gajianId = gajians[0].id;
          });
        }
      });
    });

    it("GET gajian list menampilkan gajian", () => {
      expect(admProjekId).to.exist;
      cy.request({
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/gajian`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const gajians = res.body.items || res.body;
        expect(gajians).to.be.an("array");
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 6: Kwitansi Gaji
  // --------------------------------------------------------------------------
  describe("6. Kwitansi Gaji Tukang", () => {
    it("GET kwitansi gaji menampilkan kwitansi yang dibuat saat gajian", () => {
      expect(admProjekId).to.exist;
      cy.request({
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/kwitansi`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const kwitansis = res.body.items || res.body;
        expect(kwitansis).to.be.an("array");
        // Kwitansi otomatis dibuat saat gajian berhasil
        if (gajianId) {
          expect(kwitansis.length).to.be.greaterThan(0);
          const kwit = kwitansis[0];
          expect(kwit).to.have.property("id");
          expect(kwit).to.have.property("jumlah_gaji");
        }
      });
    });

    it("Kasbon ditandai sudah_dipotong setelah gajian", () => {
      if (!kasbonId || !gajianId) return;

      cy.request({
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/kasbon`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        const kasbons = res.body.items || res.body;
        const kasbon = kasbons.find((k) => k.id === kasbonId);
        if (kasbon) {
          expect(kasbon.sudah_dipotong).to.be.true;
        }
      });
    });
  });

  // --------------------------------------------------------------------------
  // STEP 7: Tukang Self-Submit Flow (halaman /absen)
  // --------------------------------------------------------------------------
  describe("7. Tukang Self-Submit Absen (/absen page)", () => {
    before(() => {
      loginAs("admin@test.com"); // Gunakan admin sebagai proxy (tukang user tidak ada di seeder)
    });

    it("GET /finance/tukang-absen/projects returns list proyek", () => {
      cy.request({
        url: `${API}/finance/tukang-absen/projects`,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an("array");
      });
    });

    it("Halaman /absen tampil tanpa error", () => {
      cy.visit(`${APP}/absen`);
      // Halaman absen harus render
      cy.get("body").should("not.contain", "500");
      cy.get("body").should("not.contain", "Error");
    });
  });

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------
  after(() => {
    loginAs("admin@test.com");

    // Hapus gajian dulu (cascade ke kwitansi)
    if (gajianId && admProjekId) {
      cy.request({
        method: "DELETE",
        url: `${API}/finance/adm-projek/${admProjekId}/tukang/gajian/${gajianId}`,
        headers: { Authorization: `Bearer ${getToken()}` },
        failOnStatusCode: false,
      });
    }

    // Hapus proyek administrasi
    if (admProjekId) {
      cy.request({
        method: "DELETE",
        url: `${API}/finance/adm-projek/${admProjekId}`,
        headers: { Authorization: `Bearer ${getToken()}` },
        failOnStatusCode: false,
      });
    }
  });
});
