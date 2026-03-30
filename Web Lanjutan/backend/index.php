<?php
// ============================================
// Dashboard - halaman utama admin
// ============================================

$pageTitle = 'Dashboard';
require_once 'includes/auth.php';        // Cek login
require_once '../config/database.php';   // Koneksi database

// ---- Ambil angka statistik dari database ----

// Hitung total kendaraan yang tersedia
$totalKendaraan = $conn->query("SELECT COUNT(*) as c FROM kendaraan WHERE status='tersedia'")->fetch_assoc()['c'];

// Hitung penyewaan yang masih menunggu konfirmasi
$menunggu = $conn->query("SELECT COUNT(*) as c FROM penyewaan WHERE status='menunggu'")->fetch_assoc()['c'];

// Hitung penyewaan yang sedang berjalan
$berjalan = $conn->query("SELECT COUNT(*) as c FROM penyewaan WHERE status='berjalan'")->fetch_assoc()['c'];

// Hitung total pendapatan dari penyewaan yang selesai
$pendapatan = $conn->query("SELECT SUM(total_harga) as total FROM penyewaan WHERE status='selesai'")->fetch_assoc()['total'];

// Ambil 5 penyewaan terbaru untuk ditampilkan di tabel
$penyewaanTerbaru = $conn->query("
    SELECT p.*, pl.nama as nama_pelanggan, k.nama as nama_kendaraan
    FROM penyewaan p
    LEFT JOIN pelanggan pl ON p.pelanggan_id = pl.id
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    ORDER BY p.created_at DESC LIMIT 5
");
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <!-- Topbar -->
    <div class="topbar d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fw-bold">Dashboard</h5>
        <small class="text-muted">Selamat datang, <?= htmlspecialchars($_SESSION['user_name']) ?></small>
    </div>

    <div class="content-area">

        <!-- Kartu Statistik -->
        <div class="row g-3 mb-4">
            <!-- Kartu 1: Total Kendaraan Tersedia -->
            <div class="col-md-3">
                <div class="card stat-card p-3 shadow-sm" style="background:#f0a500;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-white small">Kendaraan Tersedia</div>
                            <div class="text-white fw-bold" style="font-size:2rem;"><?= $totalKendaraan ?></div>
                        </div>
                        <i class="bi bi-car-front text-white" style="font-size:2.5rem; opacity:0.5;"></i>
                    </div>
                    <a href="kendaraan.php" class="text-white small d-block mt-1 text-decoration-none">Kelola →</a>
                </div>
            </div>

            <!-- Kartu 2: Menunggu Konfirmasi -->
            <div class="col-md-3">
                <div class="card stat-card p-3 shadow-sm" style="background:#dc3545;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-white small">Menunggu Konfirmasi</div>
                            <div class="text-white fw-bold" style="font-size:2rem;"><?= $menunggu ?></div>
                        </div>
                        <i class="bi bi-clock text-white" style="font-size:2.5rem; opacity:0.5;"></i>
                    </div>
                    <a href="konfirmasi.php" class="text-white small d-block mt-1 text-decoration-none">Konfirmasi →</a>
                </div>
            </div>

            <!-- Kartu 3: Sedang Disewa -->
            <div class="col-md-3">
                <div class="card stat-card p-3 shadow-sm" style="background:#0d6efd;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-white small">Sedang Disewa</div>
                            <div class="text-white fw-bold" style="font-size:2rem;"><?= $berjalan ?></div>
                        </div>
                        <i class="bi bi-speedometer2 text-white" style="font-size:2.5rem; opacity:0.5;"></i>
                    </div>
                    <a href="penyewaan.php" class="text-white small d-block mt-1 text-decoration-none">Lihat →</a>
                </div>
            </div>

            <!-- Kartu 4: Total Pendapatan -->
            <div class="col-md-3">
                <div class="card stat-card p-3 shadow-sm" style="background:#198754;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-white small">Total Pendapatan</div>
                            <div class="text-white fw-bold" style="font-size:1.3rem;">Rp <?= number_format($pendapatan ?? 0, 0, ',', '.') ?></div>
                        </div>
                        <i class="bi bi-cash-stack text-white" style="font-size:2.5rem; opacity:0.5;"></i>
                    </div>
                    <a href="laporan.php" class="text-white small d-block mt-1 text-decoration-none">Laporan →</a>
                </div>
            </div>
        </div>

        <!-- Tabel Penyewaan Terbaru -->
        <div class="card page-card">
            <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <h6 class="mb-0 fw-bold">Penyewaan Terbaru</h6>
                <a href="penyewaan.php" class="btn btn-sm text-white" style="background:#f0a500;">Lihat Semua</a>
            </div>
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Kode Sewa</th>
                            <th>Pelanggan</th>
                            <th>Kendaraan</th>
                            <th>Tanggal</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($row = $penyewaanTerbaru->fetch_assoc()): ?>
                        <tr>
                            <td><code><?= $row['kode_sewa'] ?></code></td>
                            <td><?= htmlspecialchars($row['nama_pelanggan']) ?></td>
                            <td><?= htmlspecialchars($row['nama_kendaraan']) ?></td>
                            <td><?= date('d/m/Y', strtotime($row['tanggal_mulai'])) ?></td>
                            <td>Rp <?= number_format($row['total_harga'], 0, ',', '.') ?></td>
                            <td>
                                <?php
                                // Tentukan warna badge berdasarkan status
                                $warnaBadge = [
                                    'menunggu'    => 'warning text-dark',
                                    'dikonfirmasi'=> 'info',
                                    'berjalan'    => 'primary',
                                    'selesai'     => 'success',
                                    'dibatalkan'  => 'danger',
                                ];
                                $badge = $warnaBadge[$row['status']] ?? 'secondary';
                                ?>
                                <span class="badge bg-<?= $badge ?>"><?= ucfirst($row['status']) ?></span>
                            </td>
                        </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div><!-- /content-area -->
</div><!-- /main-content -->

<?php include 'includes/footer.php'; ?>
