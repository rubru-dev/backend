<?php
// ============================================
// Halaman Cek Status Sewa Berdasarkan Kode
// ============================================

$pageTitle = 'Cek Status Sewa';
require_once 'includes/db.php';

$hasil = null;
$error = '';

// Proses pencarian kalau form dikirim
if (isset($_POST['kode_sewa'])) {
    $kode = trim($_POST['kode_sewa']);

    if (empty($kode)) {
        $error = 'Masukkan kode sewa terlebih dahulu!';
    } else {
        // Cari penyewaan berdasarkan kode di database
        $hasil = $conn->query("
            SELECT p.*, pl.nama as nama_pelanggan, pl.no_hp, k.nama as nama_kendaraan, kt.nama as nama_kategori
            FROM penyewaan p
            LEFT JOIN pelanggan pl ON p.pelanggan_id = pl.id
            LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
            LEFT JOIN kategori kt ON k.kategori_id = kt.id
            WHERE p.kode_sewa = '$kode'
        ")->fetch_assoc();

        if (!$hasil) {
            $error = 'Kode sewa tidak ditemukan. Pastikan kode yang Anda masukkan benar.';
        }
    }
}
?>
<?php include 'includes/header.php'; ?>

<section style="background: #1a1a2e; color: #fff; padding: 40px 0;">
    <div class="container">
        <h2 class="fw-bold">Cek Status Penyewaan</h2>
        <p style="color: rgba(255,255,255,0.6);">Masukkan kode sewa yang Anda terima saat memesan</p>
    </div>
</section>

<div class="container py-5">
    <!-- Form pencarian kode sewa -->
    <div class="row justify-content-center">
        <div class="col-md-6">
            <div class="card border-0 shadow-sm p-4">
                <h5 class="fw-bold mb-3"><i class="bi bi-search me-2" style="color:#f0a500;"></i>Cari Pesanan</h5>
                <form method="POST">
                    <div class="input-group">
                        <input type="text" name="kode_sewa" class="form-control form-control-lg"
                               placeholder="Contoh: RNT-20260308-001"
                               value="<?= htmlspecialchars($_POST['kode_sewa'] ?? '') ?>">
                        <button type="submit" class="btn btn-orange btn-lg px-4">Cari</button>
                    </div>
                </form>

                <?php if ($error): ?>
                <div class="alert alert-danger mt-3"><?= $error ?></div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Tampilkan hasil kalau ada -->
    <?php if ($hasil): ?>
    <div class="row justify-content-center mt-4">
        <div class="col-md-7">
            <div class="card border-0 shadow-sm">
                <div class="card-header border-0 py-3" style="background:#f0a500;">
                    <h5 class="text-white mb-0 fw-bold">
                        <i class="bi bi-receipt me-2"></i>Detail Pesanan
                    </h5>
                </div>
                <div class="card-body p-4">
                    <!-- Status badge besar -->
                    <div class="text-center mb-4">
                        <?php
                        // Tentukan warna dan teks status
                        $statusInfo = [
                            'menunggu'     => ['warning', 'Menunggu Konfirmasi', 'bi-clock'],
                            'dikonfirmasi' => ['info', 'Dikonfirmasi', 'bi-check-circle'],
                            'berjalan'     => ['primary', 'Sedang Berjalan', 'bi-car-front'],
                            'selesai'      => ['success', 'Selesai', 'bi-check-circle-fill'],
                            'dibatalkan'   => ['danger', 'Dibatalkan', 'bi-x-circle'],
                        ];
                        $info = $statusInfo[$hasil['status']] ?? ['secondary', 'Unknown', 'bi-question'];
                        ?>
                        <i class="bi <?= $info[2] ?> text-<?= $info[0] ?>" style="font-size:3rem;"></i>
                        <div class="mt-2">
                            <span class="badge bg-<?= $info[0] ?> fs-6 px-4 py-2"><?= $info[1] ?></span>
                        </div>
                    </div>

                    <!-- Tabel detail pesanan -->
                    <table class="table table-borderless">
                        <tr>
                            <td class="text-muted" style="width:40%;">Kode Sewa</td>
                            <td><code class="fw-bold"><?= $hasil['kode_sewa'] ?></code></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Nama Penyewa</td>
                            <td class="fw-semibold"><?= htmlspecialchars($hasil['nama_pelanggan']) ?></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Kendaraan</td>
                            <td><?= htmlspecialchars($hasil['nama_kendaraan']) ?> <span class="badge bg-secondary"><?= $hasil['nama_kategori'] ?></span></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Tanggal Mulai</td>
                            <td><?= date('d F Y', strtotime($hasil['tanggal_mulai'])) ?></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Tanggal Selesai</td>
                            <td><?= date('d F Y', strtotime($hasil['tanggal_selesai'])) ?></td>
                        </tr>
                        <tr>
                            <td class="text-muted">Durasi</td>
                            <td><?= $hasil['total_hari'] ?> hari</td>
                        </tr>
                        <tr>
                            <td class="text-muted">Total Harga</td>
                            <td class="fw-bold" style="color:#f0a500; font-size:1.1rem;">
                                Rp <?= number_format($hasil['total_harga'], 0, ',', '.') ?>
                            </td>
                        </tr>
                        <?php if ($hasil['catatan']): ?>
                        <tr>
                            <td class="text-muted">Catatan</td>
                            <td><?= htmlspecialchars($hasil['catatan']) ?></td>
                        </tr>
                        <?php endif; ?>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>
</div>

<?php include 'includes/footer.php'; ?>
