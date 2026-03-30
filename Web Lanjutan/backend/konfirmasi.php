<?php
// ============================================
// Halaman Konfirmasi Sewa
// Menampilkan daftar sewa yang masih "menunggu"
// ============================================

$pageTitle = 'Konfirmasi Sewa';
require_once 'includes/auth.php';
require_once '../config/database.php';

$pesan = '';

// Proses konfirmasi atau tolak sewa
if (isset($_GET['aksi']) && isset($_GET['id'])) {
    $id = (int)$_GET['id'];

    if ($_GET['aksi'] == 'konfirmasi') {
        // Ubah status jadi dikonfirmasi
        $conn->query("UPDATE penyewaan SET status='dikonfirmasi' WHERE id=$id");
        $pesan = 'Penyewaan berhasil dikonfirmasi!';
    } elseif ($_GET['aksi'] == 'tolak') {
        // Ubah status jadi dibatalkan
        $conn->query("UPDATE penyewaan SET status='dibatalkan' WHERE id=$id");
        $pesan = 'Penyewaan ditolak/dibatalkan.';
    }
}

// Ambil semua penyewaan yang statusnya "menunggu"
$list = $conn->query("
    SELECT p.*, pl.nama as nama_pelanggan, pl.no_hp, pl.no_ktp, k.nama as nama_kendaraan, k.harga_per_hari
    FROM penyewaan p
    LEFT JOIN pelanggan pl ON p.pelanggan_id = pl.id
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    WHERE p.status = 'menunggu'
    ORDER BY p.created_at ASC
");
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <div class="topbar"><h5 class="mb-0 fw-bold">Konfirmasi Sewa</h5></div>
    <div class="content-area">

        <?php if ($pesan): ?>
        <div class="alert alert-success alert-auto"><?= $pesan ?></div>
        <?php endif; ?>

        <?php if ($list->num_rows == 0): ?>
        <!-- Tidak ada yang perlu dikonfirmasi -->
        <div class="text-center py-5">
            <i class="bi bi-check-circle text-success" style="font-size:4rem;"></i>
            <h5 class="mt-3 text-muted">Tidak ada penyewaan yang perlu dikonfirmasi</h5>
        </div>
        <?php else: ?>

        <!-- Kartu-kartu penyewaan yang menunggu -->
        <div class="row g-3">
            <?php while ($row = $list->fetch_assoc()): ?>
            <div class="col-md-6">
                <div class="card page-card p-4">
                    <!-- Header kartu -->
                    <div class="d-flex justify-content-between mb-3">
                        <div>
                            <code class="text-orange"><?= $row['kode_sewa'] ?></code>
                            <span class="badge bg-warning text-dark ms-2">Menunggu</span>
                        </div>
                        <small class="text-muted"><?= date('d/m/Y H:i', strtotime($row['created_at'])) ?></small>
                    </div>

                    <!-- Detail pelanggan dan kendaraan -->
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <div class="small text-muted">Pelanggan</div>
                            <div class="fw-semibold"><?= htmlspecialchars($row['nama_pelanggan']) ?></div>
                            <div class="small text-muted"><?= $row['no_hp'] ?></div>
                            <div class="small text-muted">KTP: <?= $row['no_ktp'] ?></div>
                        </div>
                        <div class="col-6">
                            <div class="small text-muted">Kendaraan</div>
                            <div class="fw-semibold"><?= htmlspecialchars($row['nama_kendaraan']) ?></div>
                            <div class="small text-muted"><?= date('d/m/Y', strtotime($row['tanggal_mulai'])) ?> - <?= date('d/m/Y', strtotime($row['tanggal_selesai'])) ?></div>
                            <div class="small fw-semibold text-success"><?= $row['total_hari'] ?> hari · Rp <?= number_format($row['total_harga'], 0, ',', '.') ?></div>
                        </div>
                    </div>

                    <?php if ($row['catatan']): ?>
                    <div class="alert alert-light small p-2 mb-3">
                        <i class="bi bi-chat-dots me-1"></i><?= htmlspecialchars($row['catatan']) ?>
                    </div>
                    <?php endif; ?>

                    <!-- Tombol konfirmasi dan tolak -->
                    <div class="d-flex gap-2">
                        <a href="konfirmasi.php?aksi=konfirmasi&id=<?= $row['id'] ?>"
                           class="btn btn-success btn-sm flex-fill"
                           onclick="return confirm('Konfirmasi sewa ini?')">
                            <i class="bi bi-check-lg me-1"></i>Konfirmasi
                        </a>
                        <a href="konfirmasi.php?aksi=tolak&id=<?= $row['id'] ?>"
                           class="btn btn-danger btn-sm flex-fill"
                           onclick="return confirm('Tolak/batalkan sewa ini?')">
                            <i class="bi bi-x-lg me-1"></i>Tolak
                        </a>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
        <?php endif; ?>

    </div>
</div>
<?php include 'includes/footer.php'; ?>
