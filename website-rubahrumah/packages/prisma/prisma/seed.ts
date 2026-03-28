import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.info("🌱 Seeding database...");

  // ─── Super Admin ──────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@rubahrumah.id" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@rubahrumah.id",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.info("✅ Admin user created: admin@rubahrumah.id / admin123");

  // ─── Rubahrumah Site Config ───────────────────────────────────────────────
  await prisma.rbSiteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      whatsapp_number: "6281376405550",
      stats_hari: 360,
      stats_projek: 100,
      stats_mitra: 20,
      alamat_kantor: "Jl. Pandu II No.420, Bekasi",
      alamat_workshop: "Jl. Mutiara Gading Timur, Bekasi",
      instagram: "rubahrumah",
    },
  });

  // ─── Rubahrumah Layanan Config ────────────────────────────────────────────
  const layanans = [
    {
      jenis: "BANGUN_RUMAH" as const,
      headline: "Bangun Rumah Impian Anda",
      subheadline: "Kami membantu mewujudkan rumah impian Anda dari nol",
      kalkulator_data: [
        { label: "Minimalis 1 Lantai", lantai: 1, paket: "MINIMALIS", harga_per_m2: 3500000 },
        { label: "Minimalis 2 Lantai", lantai: 2, paket: "MINIMALIS", harga_per_m2: 3800000 },
        { label: "Luxury 1 Lantai",    lantai: 1, paket: "LUXURY",    harga_per_m2: 5500000 },
        { label: "Luxury 2 Lantai",    lantai: 2, paket: "LUXURY",    harga_per_m2: 6000000 },
      ],
    },
    {
      jenis: "RENOVASI" as const,
      headline: "Renovasi Rumah Berkualitas",
      subheadline: "Transformasi rumah Anda dengan sentuhan profesional",
      kalkulator_data: [
        { label: "Minimalis 1 Lantai", lantai: 1, paket: "MINIMALIS", harga_per_m2: 2500000 },
        { label: "Minimalis 2 Lantai", lantai: 2, paket: "MINIMALIS", harga_per_m2: 2800000 },
        { label: "Luxury 1 Lantai",    lantai: 1, paket: "LUXURY",    harga_per_m2: 4500000 },
        { label: "Luxury 2 Lantai",    lantai: 2, paket: "LUXURY",    harga_per_m2: 5000000 },
      ],
    },
    {
      jenis: "DESIGN" as const,
      headline: "Design & Perencanaan",
      subheadline: "Perencanaan matang untuk hasil maksimal",
      kalkulator_data: null,
    },
    {
      jenis: "INTERIOR" as const,
      headline: "Interior Custom",
      subheadline: "Ruangan nyaman sesuai selera Anda",
      kalkulator_data: null,
    },
  ];

  for (const layanan of layanans) {
    await prisma.rbLayanan.upsert({
      where: { jenis: layanan.jenis },
      update: {},
      create: layanan,
    });
  }

  // ─── Rubahrumah Projek Berjalan (dummy) ───────────────────────────────────
  await prisma.rbProject.upsert({
    where: { slug: "renovasi-rumah-pak-budi-jakarta-selatan" },
    update: {},
    create: {
      slug: "renovasi-rumah-pak-budi-jakarta-selatan",
      nama_klien: "Bapak Budi Santoso",
      jenis_jasa: "RENOVASI",
      lokasi: "Jakarta Selatan",
      budget: 764500000,
      luas: 127,
      tanggal_mulai: new Date("2024-01-12"),
      tanggal_selesai_estimasi: new Date("2024-05-12"),
      progress: 65,
      status: "BERJALAN",
      deskripsi: "Renovasi rumah tinggal 2 lantai dengan desain modern minimalis di kawasan Jakarta Selatan. Meliputi renovasi fasad, interior ruang tamu, kamar tidur utama, dan taman belakang.",
      is_published: true,
    },
  });

  // ─── Rubahrumah Artikel (dummy) ───────────────────────────────────────────
  await prisma.rbArtikel.upsert({
    where: { slug: "10-tips-memilih-material-bangunan-berkualitas" },
    update: {},
    create: {
      slug: "10-tips-memilih-material-bangunan-berkualitas",
      judul: "10 Tips Memilih Material Bangunan yang Berkualitas",
      excerpt: "Panduan lengkap memilih material bangunan yang tepat untuk rumah impian Anda dengan kualitas terbaik dan harga yang sesuai.",
      konten: `<h2>Mengapa Memilih Material Bangunan yang Tepat Itu Penting?</h2>
<p>Memilih material bangunan yang berkualitas adalah langkah krusial dalam proses pembangunan atau renovasi rumah. Material yang tepat tidak hanya mempengaruhi tampilan estetika, tetapi juga ketahanan dan kenyamanan hunian Anda jangka panjang.</p>
<h2>1. Tentukan Budget Terlebih Dahulu</h2>
<p>Sebelum memilih material, tetapkan anggaran yang jelas. Ini akan membantu Anda memprioritaskan material mana yang perlu kualitas premium dan mana yang bisa lebih ekonomis.</p>
<h2>2. Pilih Material Sesuai Iklim</h2>
<p>Indonesia memiliki iklim tropis dengan kelembaban tinggi. Pilih material yang tahan terhadap kondisi ini seperti bata merah, semen berkualitas, dan cat anti-jamur.</p>
<h2>3. Perhatikan Sertifikasi SNI</h2>
<p>Pastikan material yang Anda pilih memiliki sertifikasi Standar Nasional Indonesia (SNI) untuk menjamin kualitas dan keamanannya.</p>`,
      kategori: "Tips & Trik",
      author: "Tim Rubahrumah",
      read_time: 5,
      is_published: true,
      published_at: new Date("2024-03-15"),
    },
  });

  await prisma.rbArtikel.upsert({
    where: { slug: "tren-desain-interior-2024-untuk-rumah-modern" },
    update: {},
    create: {
      slug: "tren-desain-interior-2024-untuk-rumah-modern",
      judul: "Tren Desain Interior 2024 untuk Rumah Modern",
      excerpt: "Temukan inspirasi desain interior terbaru yang sedang tren di tahun 2024 untuk mempercantik hunian Anda.",
      konten: `<h2>Desain Interior 2024: Menggabungkan Estetika dan Fungsi</h2>
<p>Tahun 2024 membawa angin segar dalam dunia desain interior. Tren yang berkembang saat ini menggabungkan keindahan estetika dengan kepraktisan fungsi, menciptakan ruangan yang tidak hanya indah dipandang tetapi juga nyaman ditinggali.</p>
<h2>1. Biophilic Design</h2>
<p>Konsep biophilic design mengintegrasikan elemen alam ke dalam ruangan interior. Tanaman hijau, material kayu natural, dan pencahayaan alami menjadi elemen utama tren ini.</p>
<h2>2. Warna Earth Tone</h2>
<p>Palet warna earth tone seperti terracotta, sage green, dan warm beige mendominasi interior 2024. Warna-warna ini menciptakan suasana hangat dan menenangkan.</p>
<h2>3. Minimalis Fungsional</h2>
<p>Konsep less is more tetap relevan namun dengan sentuhan baru. Furnitur multifungsi dan penyimpanan tersembunyi menjadi solusi cerdas untuk ruangan yang rapi dan efisien.</p>`,
      kategori: "Inspirasi",
      author: "Tim Rubahrumah",
      read_time: 4,
      is_published: true,
      published_at: new Date("2024-03-10"),
    },
  });

  console.info("✅ Dummy projek & artikel berhasil dibuat");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
