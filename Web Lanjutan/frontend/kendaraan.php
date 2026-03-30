<?php
// ============================================
// Halaman Daftar Kendaraan (Mobil / Motor)
// Bisa difilter berdasarkan kategori
// ============================================

require_once 'includes/db.php';

// Ambil filter kategori dari URL, misal: ?kategori=1 (Mobil), ?kategori=2 (Motor)
$filterKategori = isset($_GET['kategori']) ? (int)$_GET['kategori'] : 0;

// Ambil nama kategori yang dipilih untuk judul halaman
if ($filterKategori > 0) {
    $kat = $conn->query("SELECT nama FROM kategori WHERE id=$filterKategori")->fetch_assoc();
    $pageTitle = 'Sewa ' . ($kat['nama'] ?? 'Kendaraan');
} else {
    $pageTitle = 'Semua Kendaraan';
}

// Buat kondisi WHERE untuk filter
$where = $filterKategori > 0 ? "WHERE k.kategori_id=$filterKategori AND k.status='tersedia'" : "WHERE k.status='tersedia'";

// Ambil data kendaraan sesuai filter
$list = $conn->query("
    SELECT k.*, kt.nama as nama_kategori
    FROM kendaraan k
    LEFT JOIN kategori kt ON k.kategori_id = kt.id
    $where
    ORDER BY k.nama ASC
");

// Ambil daftar kategori untuk tombol filter
$kategoriList = $conn->query("SELECT * FROM kategori ORDER BY nama");
?>
<?php include 'includes/header.php'; ?>

<!-- Judul halaman -->
<section style="background: #1a1a2e; color: #fff; padding: 40px 0;">
    <div class="container">
        <h2 class="fw-bold mb-1"><?= $pageTitle ?></h2>
        <p style="color: rgba(255,255,255,0.6);">Pilih kendaraan yang sesuai kebutuhan Anda</p>
    </div>
</section>

<section class="py-5">
    <div class="container">

        <!-- Tombol filter berdasarkan kategori -->
        <div class="d-flex gap-2 mb-4 flex-wrap">
            <a href="kendaraan.php" class="btn btn-sm <?= $filterKategori==0?'btn-orange':'btn-outline-secondary' ?>">
                Semua
            </a>
            <?php
            // Tampilkan tombol untuk setiap kategori
            $kategoriList->data_seek(0);
            while ($k = $kategoriList->fetch_assoc()):
            ?>
            <a href="kendaraan.php?kategori=<?= $k['id'] ?>"
               class="btn btn-sm <?= $filterKategori==$k['id']?'btn-orange':'btn-outline-secondary' ?>">
                <i class="bi bi-<?= $k['nama']=='Mobil'?'car-front':'bicycle' ?> me-1"></i><?= $k['nama'] ?>
            </a>
            <?php endwhile; ?>
        </div>

        <!-- Grid kendaraan -->
        <div class="row g-4">
            <?php if ($list->num_rows == 0): ?>
            <div class="col-12 text-center py-5">
                <i class="bi bi-car-front text-muted" style="font-size:4rem;"></i>
                <h5 class="mt-3 text-muted">Tidak ada kendaraan tersedia</h5>
            </div>
            <?php endif; ?>

            <?php while ($row = $list->fetch_assoc()): ?>
            <div class="col-md-4 col-sm-6">
                <div class="card card-kendaraan h-100">
                    <!-- Gambar icon kendaraan -->
                    <div class="text-center py-4" style="background:#f8f9fa;">
                        <?php $icon = ($row['nama_kategori']=='Mobil') ? 'bi-car-front-fill' : 'bi-bicycle'; ?>
                        <i class="bi <?= $icon ?>" style="font-size:5rem; color:#f0a500;"></i>
                    </div>
                    <div class="card-body">
                        <span class="badge mb-2" style="background:#f0a500;"><?= $row['nama_kategori'] ?></span>
                        <h5 class="fw-bold"><?= htmlspecialchars($row['nama']) ?></h5>
                        <p class="text-muted small mb-2"><?= htmlspecialchars($row['deskripsi']) ?></p>

                        <!-- Info tambahan -->
                        <div class="d-flex gap-3 text-muted small mb-3">
                            <span><i class="bi bi-hash me-1"></i><?= $row['plat'] ?></span>
                            <span><i class="bi bi-boxes me-1"></i>Stok: <?= $row['stok'] ?></span>
                        </div>

                        <!-- Harga -->
                        <div class="fw-bold" style="color:#f0a500; font-size:1.2rem;">
                            Rp <?= number_format($row['harga_per_hari'], 0, ',', '.') ?>
                            <span class="text-muted fw-normal" style="font-size:0.85rem;">/hari</span>
                        </div>
                    </div>
                    <div class="card-footer bg-white border-0 pb-3">
                        <a href="detail.php?id=<?= $row['id'] ?>" class="btn btn-orange w-100">
                            <i class="bi bi-calendar-check me-2"></i>Sewa Sekarang
                        </a>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
    </div>
</section>

<?php include 'includes/footer.php'; ?>
