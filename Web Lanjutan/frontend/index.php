<?php
// ============================================
// Halaman Beranda (Home)
// ============================================

$pageTitle = 'Beranda';
require_once 'includes/db.php'; // Koneksi database

// Ambil semua kendaraan yang tersedia untuk ditampilkan (6 saja di beranda)
$kendaraanFeatured = $conn->query("
    SELECT k.*, kt.nama as nama_kategori
    FROM kendaraan k
    LEFT JOIN kategori kt ON k.kategori_id = kt.id
    WHERE k.status = 'tersedia'
    ORDER BY k.id DESC LIMIT 6
");

// Hitung statistik untuk ditampilkan di bagian hero
$totalMobil  = $conn->query("SELECT COUNT(*) as c FROM kendaraan k JOIN kategori kt ON k.kategori_id=kt.id WHERE kt.nama='Mobil' AND k.status='tersedia'")->fetch_assoc()['c'];
$totalMotor  = $conn->query("SELECT COUNT(*) as c FROM kendaraan k JOIN kategori kt ON k.kategori_id=kt.id WHERE kt.nama='Motor' AND k.status='tersedia'")->fetch_assoc()['c'];
$totalSewa   = $conn->query("SELECT COUNT(*) as c FROM penyewaan WHERE status='selesai'")->fetch_assoc()['c'];
?>
<?php include 'includes/header.php'; ?>

<!-- Hero Section - Bagian pembuka halaman -->
<section style="background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); color: #fff; padding: 80px 0;">
    <div class="container">
        <div class="row align-items-center">
            <div class="col-md-7">
                <h1 class="fw-bold mb-3" style="font-size: 2.5rem; color: #f0a500;">
                    Rental Mobil & Motor<br>Terpercaya
                </h1>
                <p class="mb-4" style="color: rgba(255,255,255,0.8); font-size: 1.1rem;">
                    Kendaraan terawat, harga transparan, proses mudah dan cepat.<br>
                    Siap antar jemput di lokasi Anda.
                </p>
                <!-- Tombol CTA -->
                <div class="d-flex gap-3 flex-wrap">
                    <a href="kendaraan.php?kategori=1" class="btn btn-orange btn-lg px-4">
                        <i class="bi bi-car-front me-2"></i>Sewa Mobil
                    </a>
                    <a href="kendaraan.php?kategori=2" class="btn btn-outline-light btn-lg px-4">
                        <i class="bi bi-bicycle me-2"></i>Sewa Motor
                    </a>
                </div>
            </div>
            <div class="col-md-5 text-center mt-4 mt-md-0">
                <i class="bi bi-car-front-fill" style="font-size: 10rem; color: #f0a500; opacity: 0.8;"></i>
            </div>
        </div>
    </div>
</section>

<!-- Statistik ringkas -->
<section class="py-4" style="background: #f0a500;">
    <div class="container">
        <div class="row text-center text-white">
            <div class="col-4">
                <div class="fw-bold" style="font-size:2rem;"><?= $totalMobil ?>+</div>
                <div class="small">Unit Mobil</div>
            </div>
            <div class="col-4">
                <div class="fw-bold" style="font-size:2rem;"><?= $totalMotor ?>+</div>
                <div class="small">Unit Motor</div>
            </div>
            <div class="col-4">
                <div class="fw-bold" style="font-size:2rem;"><?= $totalSewa ?>+</div>
                <div class="small">Pelanggan Puas</div>
            </div>
        </div>
    </div>
</section>

<!-- Keunggulan kami -->
<section class="py-5">
    <div class="container">
        <h2 class="text-center fw-bold mb-4">Kenapa Pilih Kami?</h2>
        <div class="row g-4 text-center">
            <div class="col-md-3">
                <div class="p-4">
                    <i class="bi bi-shield-check" style="font-size:2.5rem; color:#f0a500;"></i>
                    <h5 class="mt-3 fw-bold">Terpercaya</h5>
                    <p class="text-muted small">Kendaraan terawat dan diasuransikan untuk keamanan Anda</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="p-4">
                    <i class="bi bi-tag" style="font-size:2.5rem; color:#f0a500;"></i>
                    <h5 class="mt-3 fw-bold">Harga Terjangkau</h5>
                    <p class="text-muted small">Harga transparan tanpa biaya tersembunyi</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="p-4">
                    <i class="bi bi-clock" style="font-size:2.5rem; color:#f0a500;"></i>
                    <h5 class="mt-3 fw-bold">Layanan 24 Jam</h5>
                    <p class="text-muted small">Siap melayani kapan saja Anda membutuhkan</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="p-4">
                    <i class="bi bi-geo-alt" style="font-size:2.5rem; color:#f0a500;"></i>
                    <h5 class="mt-3 fw-bold">Antar Jemput</h5>
                    <p class="text-muted small">Tersedia layanan antar jemput ke lokasi Anda</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Daftar Kendaraan Tersedia -->
<section class="py-5" style="background: #f8f9fa;">
    <div class="container">
        <div class="text-center mb-4">
            <h2 class="fw-bold">Kendaraan Tersedia</h2>
            <p class="text-muted">Pilih kendaraan sesuai kebutuhan Anda</p>
        </div>

        <div class="row g-4">
            <?php while ($row = $kendaraanFeatured->fetch_assoc()): ?>
            <div class="col-md-4">
                <!-- Kartu kendaraan -->
                <div class="card card-kendaraan h-100">
                    <!-- Gambar placeholder kendaraan -->
                    <div class="text-center py-4" style="background: #f0f2f5;">
                        <?php
                        // Tampilkan icon berbeda untuk mobil dan motor
                        $icon = ($row['nama_kategori'] == 'Mobil') ? 'bi-car-front-fill' : 'bi-bicycle';
                        ?>
                        <i class="bi <?= $icon ?>" style="font-size:5rem; color:#f0a500;"></i>
                    </div>
                    <div class="card-body">
                        <span class="badge mb-2" style="background:#f0a500;"><?= $row['nama_kategori'] ?></span>
                        <h5 class="card-title fw-bold"><?= htmlspecialchars($row['nama']) ?></h5>
                        <p class="text-muted small"><?= htmlspecialchars($row['deskripsi']) ?></p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold" style="color:#f0a500; font-size:1.1rem;">
                                    Rp <?= number_format($row['harga_per_hari'], 0, ',', '.') ?>
                                </span>
                                <span class="text-muted small">/hari</span>
                            </div>
                            <small class="text-muted"><i class="bi bi-hash me-1"></i><?= $row['plat'] ?></small>
                        </div>
                    </div>
                    <div class="card-footer bg-white border-0 pb-3">
                        <a href="detail.php?id=<?= $row['id'] ?>" class="btn btn-orange w-100">
                            Sewa Sekarang
                        </a>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>

        <!-- Tombol lihat semua -->
        <div class="text-center mt-4">
            <a href="kendaraan.php" class="btn btn-outline-secondary btn-lg px-5">Lihat Semua Kendaraan</a>
        </div>
    </div>
</section>

<!-- Cara Sewa -->
<section class="py-5">
    <div class="container">
        <h2 class="text-center fw-bold mb-4">Cara Menyewa</h2>
        <div class="row g-4 text-center">
            <div class="col-md-3">
                <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 text-white fw-bold" style="width:60px;height:60px;background:#f0a500;font-size:1.5rem;">1</div>
                <h6 class="fw-bold">Pilih Kendaraan</h6>
                <p class="text-muted small">Pilih mobil atau motor yang sesuai kebutuhan</p>
            </div>
            <div class="col-md-3">
                <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 text-white fw-bold" style="width:60px;height:60px;background:#f0a500;font-size:1.5rem;">2</div>
                <h6 class="fw-bold">Isi Formulir</h6>
                <p class="text-muted small">Lengkapi data diri dan tanggal sewa</p>
            </div>
            <div class="col-md-3">
                <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 text-white fw-bold" style="width:60px;height:60px;background:#f0a500;font-size:1.5rem;">3</div>
                <h6 class="fw-bold">Tunggu Konfirmasi</h6>
                <p class="text-muted small">Kami akan konfirmasi pesanan Anda segera</p>
            </div>
            <div class="col-md-3">
                <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 text-white fw-bold" style="width:60px;height:60px;background:#f0a500;font-size:1.5rem;">4</div>
                <h6 class="fw-bold">Ambil Kendaraan</h6>
                <p class="text-muted small">Kendaraan siap diambil atau diantarkan</p>
            </div>
        </div>
    </div>
</section>

<?php include 'includes/footer.php'; ?>
