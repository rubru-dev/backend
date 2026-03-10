/**
 * seedLargeData.ts — Seed 10k+ rows untuk E2E load testing
 *
 * Usage:
 *   npx ts-node helpers/seedLargeData.ts          ← seed data
 *   npx ts-node helpers/seedLargeData.ts --clean  ← hapus semua seed data
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();
const isClean = process.argv.includes("--clean");

const STATUSES = ["Low", "Medium", "Hot"];
const JENIS = ["Sipil", "Desain", "Interior"];
const TAHUNS = [2024, 2025, 2026];
const MODULS = ["bd", "sales_admin", "telemarketing"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function cleanSeedData() {
  console.log("🧹 Membersihkan seed data...");

  // Hapus TukangAbsenFoto dengan catatan SEED
  await prisma.tukangAbsenFoto.deleteMany({ where: { catatan: "SEED_TEST_absen" } });
  console.log("  ✓ TukangAbsenFoto seed dihapus");

  // Hapus TukangRegistry yang merupakan seed (nama prefix SEED_)
  await prisma.tukangRegistry.deleteMany({ where: { nama: { startsWith: "SEED_TUKANG_" } } });
  console.log("  ✓ TukangRegistry seed dihapus");

  // Hapus SipilUsageLog seed
  await prisma.sipilUsageLog.deleteMany({ where: { catatan: "SEED_TEST_" } });
  // Also delete by partial match
  await prisma.sipilUsageLog.deleteMany({
    where: { catatan: { startsWith: "SEED_TEST_" } },
  });
  console.log("  ✓ SipilUsageLog seed dihapus");

  // Hapus ProyekBerjalan seed (cascade akan hapus termins, rapp, usage logs)
  const seedProyek = await prisma.proyekBerjalan.findFirst({
    where: { nama_proyek: "SEED_SIPIL_PROYEK_LOAD_TEST" },
  });
  if (seedProyek) {
    await prisma.proyekBerjalan.delete({ where: { id: seedProyek.id } });
    console.log("  ✓ ProyekBerjalan seed dihapus");
  }

  // Hapus RappMaterialItem seed
  await prisma.rappMaterialItem.deleteMany({
    where: { material: { startsWith: "SEED_MAT_" } },
  });
  console.log("  ✓ RappMaterialItem seed dihapus");

  // Hapus LaporanHarian seed
  await prisma.laporanHarian.deleteMany({
    where: { kegiatan: { startsWith: "SEED_LAPORAN_" } },
  });
  console.log("  ✓ LaporanHarian seed dihapus");

  // Hapus Lead seed
  await prisma.lead.deleteMany({
    where: { nama: { startsWith: "SEED_LEAD_" } },
  });
  console.log("  ✓ Lead seed dihapus (10k rows)");

  console.log("✅ Semua seed data berhasil dihapus");
}

async function seedLeads() {
  console.log("🌱 Seeding 10.000 Lead rows...");
  const BATCH = 500;
  const TOTAL = 10000;

  for (let i = 0; i < TOTAL; i += BATCH) {
    const data = Array.from({ length: BATCH }, (_, j) => {
      const idx = String(i + j + 1).padStart(5, "0");
      return {
        nama: `SEED_LEAD_${idx}`,
        status: randomFrom(STATUSES),
        jenis: randomFrom(JENIS),
        bulan: Math.floor(Math.random() * 12) + 1,
        tahun: randomFrom(TAHUNS),
        modul: randomFrom(MODULS),
        nomor_telepon: `08${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`,
      };
    });
    await prisma.lead.createMany({ data });
    process.stdout.write(`  ${i + BATCH}/${TOTAL}\r`);
  }
  console.log("\n  ✓ 10.000 Lead di-seed");
}

async function seedLaporanHarian() {
  console.log("🌱 Seeding 1.000 LaporanHarian rows...");

  // Ambil user pertama sebagai referensi
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("Tidak ada user di DB! Jalankan seed prisma dulu.");

  const BATCH = 200;
  const TOTAL = 1000;
  const LAPORAN_MODULS = ["bd", "content", "sales_admin", "telemarketing", "desain", "sales", "finance"];

  for (let i = 0; i < TOTAL; i += BATCH) {
    const data = Array.from({ length: BATCH }, (_, j) => {
      const idx = String(i + j + 1).padStart(4, "0");
      const modul = LAPORAN_MODULS[(i + j) % LAPORAN_MODULS.length];
      const now = new Date();
      return {
        kegiatan: `SEED_LAPORAN_${idx}: Kegiatan harian ${modul}`,
        modul,
        user_id: user.id,
        tanggal_mulai: now,
        tanggal_selesai: now,
      };
    });
    await prisma.laporanHarian.createMany({ data });
    process.stdout.write(`  ${i + BATCH}/${TOTAL}\r`);
  }
  console.log("\n  ✓ 1.000 LaporanHarian di-seed");
}

async function seedSipilLoadTest() {
  console.log("🌱 Seeding ProyekBerjalan + 500 RappMaterialItem + 5.000 SipilUsageLog...");

  // 1. Buat ProyekBerjalan seed
  const proyek = await prisma.proyekBerjalan.create({
    data: {
      nama_proyek: "SEED_SIPIL_PROYEK_LOAD_TEST",
      lokasi: "Jakarta",
      nilai_rab: 500000000,
    },
  });
  console.log(`  ✓ ProyekBerjalan id=${proyek.id}`);

  // 2. Buat satu termin
  const termin = await prisma.proyekBerjalanTermin.create({
    data: {
      proyek_berjalan_id: proyek.id,
      urutan: 1,
      nama: "Termin 1 SEED",
      rab: 100000000,
    },
  });
  console.log(`  ✓ ProyekBerjalanTermin id=${termin.id}`);

  // 3. Buat 50 RappMaterialKategori
  const kategoris: bigint[] = [];
  for (let i = 0; i < 50; i++) {
    const kat = await prisma.rappMaterialKategori.create({
      data: {
        termin_id: termin.id,
        nama: `SEED_KAT_${String(i + 1).padStart(2, "0")}`,
        urutan: i,
      },
    });
    kategoris.push(kat.id);
  }
  console.log(`  ✓ 50 RappMaterialKategori dibuat`);

  // 4. Buat 500 RappMaterialItem (10 per kategori)
  const rappItems: { id: bigint }[] = [];
  const BATCH_RAPP = 100;
  for (let b = 0; b < 5; b++) {
    const data = Array.from({ length: BATCH_RAPP }, (_, j) => {
      const globalIdx = b * BATCH_RAPP + j;
      return {
        kategori_id: kategoris[Math.floor(globalIdx / 10)],
        material: `SEED_MAT_${String(globalIdx + 1).padStart(3, "0")}`,
        vol: 10,
        sat: "m2",
        harga_satuan: 50000,
        jumlah: 500000,
        urutan: j,
      };
    });
    await prisma.rappMaterialItem.createMany({ data });
  }
  // Ambil id item untuk usage log
  const allItems = await prisma.rappMaterialItem.findMany({
    where: { material: { startsWith: "SEED_MAT_" } },
    select: { id: true },
    take: 500,
  });
  rappItems.push(...allItems);
  console.log(`  ✓ 500 RappMaterialItem di-seed`);

  // 5. Seed 5.000 SipilUsageLog
  const BATCH_LOG = 500;
  const TOTAL_LOG = 5000;
  const now = new Date();

  for (let i = 0; i < TOTAL_LOG; i += BATCH_LOG) {
    const data = Array.from({ length: BATCH_LOG }, (_, j) => {
      const item = rappItems[(i + j) % rappItems.length];
      return {
        proyek_id: proyek.id,
        item_ref_type: "material",
        item_ref_id: item.id,
        item_nama: `SEED_MAT_${String((i + j + 1)).padStart(3, "0")}`,
        item_satuan: "m2",
        qty_pakai: 2.5,
        tanggal: now,
        catatan: `SEED_TEST_log_${i + j + 1}`,
      };
    });
    await prisma.sipilUsageLog.createMany({ data });
    process.stdout.write(`  ${i + BATCH_LOG}/${TOTAL_LOG}\r`);
  }
  console.log("\n  ✓ 5.000 SipilUsageLog di-seed");

  // Simpan proyek_id ke global untuk dipakai test
  (global as any).__SEED_PROYEK_ID__ = String(proyek.id);
}

async function seedTukangAbsen() {
  console.log("🌱 Seeding TukangRegistry + 500 TukangAbsenFoto...");

  // Ambil AdmFinanceProject pertama yang ada
  const admProject = await prisma.admFinanceProject.findFirst({ orderBy: { id: "asc" } });
  if (!admProject) {
    console.log("  ⚠️  Tidak ada AdmFinanceProject, skip tukang seed");
    return;
  }

  // Buat 5 TukangRegistry
  const tukangIds: bigint[] = [];
  for (let i = 0; i < 5; i++) {
    const t = await prisma.tukangRegistry.create({
      data: {
        adm_finance_project_id: admProject.id,
        nama: `SEED_TUKANG_${i + 1}`,
        jabatan: "Tukang Batu",
        upah_harian: 150000,
      },
    });
    tukangIds.push(t.id);
  }
  console.log(`  ✓ 5 TukangRegistry dibuat`);

  // Seed 500 TukangAbsenFoto
  const BATCH_ABSEN = 100;
  const TOTAL_ABSEN = 500;
  const now = new Date();

  for (let i = 0; i < TOTAL_ABSEN; i += BATCH_ABSEN) {
    const data = Array.from({ length: BATCH_ABSEN }, (_, j) => ({
      tukang_id: tukangIds[(i + j) % tukangIds.length],
      tanggal: now,
      foto: null,
      status: "Disetujui",
      catatan: "SEED_TEST_absen",
    }));
    await prisma.tukangAbsenFoto.createMany({ data });
    process.stdout.write(`  ${i + BATCH_ABSEN}/${TOTAL_ABSEN}\r`);
  }
  console.log("\n  ✓ 500 TukangAbsenFoto di-seed");
}

async function main() {
  try {
    if (isClean) {
      await cleanSeedData();
    } else {
      console.log("🚀 Memulai large data seed...\n");
      await seedLeads();
      await seedLaporanHarian();
      await seedSipilLoadTest();
      await seedTukangAbsen();
      console.log("\n✅ Semua seed data berhasil dibuat!");
      console.log("   Jalankan 'npm test' untuk menjalankan E2E test suite");
    }
  } catch (err) {
    console.error("❌ Seed gagal:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
