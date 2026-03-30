<?php
// Ambil nama file halaman yang sedang dibuka untuk highlight menu aktif
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<div class="sidebar" id="sidebar">
    <!-- Nama aplikasi / brand -->
    <div class="brand">
        <i class="bi bi-car-front-fill me-2"></i>Rental Kendaraan
        <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); font-weight:normal;">Admin Dashboard</div>
    </div>

    <!-- Info user yang sedang login -->
    <div class="px-3 py-2" style="border-bottom:1px solid rgba(255,255,255,0.1);">
        <small class="text-white"><?= htmlspecialchars($_SESSION['user_name'] ?? 'Admin') ?></small>
        <br>
        <small style="color:rgba(255,255,255,0.4);"><?= ucfirst($_SESSION['user_role'] ?? 'admin') ?></small>
    </div>

    <!-- 8 Menu Navigasi -->
    <nav class="mt-2 pb-4">
        <div class="section-title">Utama</div>

        <!-- Menu 1: Dashboard -->
        <a href="index.php" class="nav-link <?= $currentPage=='index.php'?'active':'' ?>">
            <i class="bi bi-speedometer2"></i> Dashboard
        </a>

        <div class="section-title">Data Kendaraan</div>

        <!-- Menu 2: Kendaraan -->
        <a href="kendaraan.php" class="nav-link <?= $currentPage=='kendaraan.php'?'active':'' ?>">
            <i class="bi bi-car-front"></i> Data Kendaraan
        </a>

        <!-- Menu 3: Kategori -->
        <a href="kategori.php" class="nav-link <?= $currentPage=='kategori.php'?'active':'' ?>">
            <i class="bi bi-grid"></i> Kategori
        </a>

        <div class="section-title">Transaksi</div>

        <!-- Menu 4: Semua Penyewaan -->
        <a href="penyewaan.php" class="nav-link <?= $currentPage=='penyewaan.php'?'active':'' ?>">
            <i class="bi bi-receipt"></i> Data Penyewaan
        </a>

        <!-- Menu 5: Konfirmasi Sewa (yang masih menunggu) -->
        <a href="konfirmasi.php" class="nav-link <?= $currentPage=='konfirmasi.php'?'active':'' ?>">
            <i class="bi bi-check-circle"></i> Konfirmasi Sewa
            <?php
            // Tampilkan jumlah sewa yang menunggu konfirmasi
            // __DIR__ = lokasi file sidebar.php ini (backend/includes/)
            // Jadi __DIR__ . '/../../config/database.php' = Web Lanjutan/config/database.php
            require_once __DIR__ . '/../../config/database.php';
            $cek = $conn->query("SELECT COUNT(*) as jml FROM penyewaan WHERE status='menunggu'");
            $jml = $cek->fetch_assoc()['jml'];
            if ($jml > 0): ?>
                <span class="badge bg-danger ms-auto"><?= $jml ?></span>
            <?php endif; ?>
        </a>

        <!-- Menu 6: Data Pelanggan -->
        <a href="pelanggan.php" class="nav-link <?= $currentPage=='pelanggan.php'?'active':'' ?>">
            <i class="bi bi-people"></i> Data Pelanggan
        </a>

        <!-- Menu 7: Laporan -->
        <a href="laporan.php" class="nav-link <?= $currentPage=='laporan.php'?'active':'' ?>">
            <i class="bi bi-bar-chart"></i> Laporan
        </a>

        <div class="section-title">Pengaturan</div>

        <!-- Menu 8: Kelola Users admin -->
        <a href="users.php" class="nav-link <?= $currentPage=='users.php'?'active':'' ?>">
            <i class="bi bi-person-gear"></i> Kelola Users
        </a>

        <!-- Link ke frontend website -->
        <a href="../frontend/index.php" class="nav-link" target="_blank">
            <i class="bi bi-box-arrow-up-right"></i> Lihat Website
        </a>

        <!-- Tombol keluar -->
        <a href="logout.php" class="nav-link" style="color:#ff6b6b;">
            <i class="bi bi-box-arrow-left"></i> Keluar
        </a>
    </nav>
</div>
