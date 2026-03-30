<?php
// ============================================
// Halaman Laporan Pendapatan
// ============================================

$pageTitle = 'Laporan';
require_once 'includes/auth.php';
require_once '../config/database.php';

// Filter berdasarkan bulan dan tahun
$bulan = $_GET['bulan'] ?? date('m');
$tahun = $_GET['tahun'] ?? date('Y');

// Total pendapatan bulan ini (dari penyewaan selesai)
$totalBulan = $conn->query("
    SELECT SUM(total_harga) as total FROM penyewaan
    WHERE status='selesai' AND MONTH(created_at)=$bulan AND YEAR(created_at)=$tahun
")->fetch_assoc()['total'] ?? 0;

// Total semua pendapatan
$totalAll = $conn->query("SELECT SUM(total_harga) as total FROM penyewaan WHERE status='selesai'")->fetch_assoc()['total'] ?? 0;

// Jumlah transaksi bulan ini
$jmlTransaksi = $conn->query("
    SELECT COUNT(*) as c FROM penyewaan
    WHERE status='selesai' AND MONTH(created_at)=$bulan AND YEAR(created_at)=$tahun
")->fetch_assoc()['c'];

// Kendaraan yang paling sering disewa
$terlaris = $conn->query("
    SELECT k.nama, COUNT(p.id) as jml, SUM(p.total_harga) as pendapatan
    FROM penyewaan p
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    WHERE p.status='selesai'
    GROUP BY p.kendaraan_id
    ORDER BY jml DESC LIMIT 5
");

// Detail transaksi bulan ini
$detail = $conn->query("
    SELECT p.*, pl.nama as nama_pelanggan, k.nama as nama_kendaraan
    FROM penyewaan p
    LEFT JOIN pelanggan pl ON p.pelanggan_id = pl.id
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    WHERE p.status='selesai' AND MONTH(p.created_at)=$bulan AND YEAR(p.created_at)=$tahun
    ORDER BY p.created_at DESC
");
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <div class="topbar d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fw-bold">Laporan Pendapatan</h5>
        <!-- Filter bulan dan tahun -->
        <form method="GET" class="d-flex gap-2 align-items-center">
            <select name="bulan" class="form-select form-select-sm" style="width:120px;">
                <?php
                $namaBulan = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
                for ($i=1; $i<=12; $i++):
                ?>
                <option value="<?= $i ?>" <?= $bulan==$i?'selected':'' ?>><?= $namaBulan[$i] ?></option>
                <?php endfor; ?>
            </select>
            <input type="number" name="tahun" class="form-control form-control-sm" style="width:80px;" value="<?= $tahun ?>">
            <button type="submit" class="btn btn-sm text-white" style="background:#f0a500;">Tampilkan</button>
        </form>
    </div>
    <div class="content-area">

        <!-- Ringkasan statistik -->
        <div class="row g-3 mb-4">
            <div class="col-md-4">
                <div class="card page-card p-4 text-center">
                    <div class="text-muted small">Pendapatan Bulan Ini</div>
                    <div class="fw-bold" style="font-size:1.5rem; color:#f0a500;">Rp <?= number_format($totalBulan, 0, ',', '.') ?></div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card page-card p-4 text-center">
                    <div class="text-muted small">Jumlah Transaksi</div>
                    <div class="fw-bold" style="font-size:1.5rem;"><?= $jmlTransaksi ?> transaksi</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card page-card p-4 text-center">
                    <div class="text-muted small">Total Pendapatan Semua</div>
                    <div class="fw-bold text-success" style="font-size:1.5rem;">Rp <?= number_format($totalAll, 0, ',', '.') ?></div>
                </div>
            </div>
        </div>

        <div class="row g-4">
            <!-- Kendaraan Terlaris -->
            <div class="col-md-5">
                <div class="card page-card">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="mb-0 fw-bold">Kendaraan Terlaris</h6>
                    </div>
                    <div class="table-responsive">
                        <table class="table mb-0">
                            <thead><tr><th>Kendaraan</th><th>Disewa</th><th>Pendapatan</th></tr></thead>
                            <tbody>
                                <?php while ($row = $terlaris->fetch_assoc()): ?>
                                <tr>
                                    <td><?= htmlspecialchars($row['nama']) ?></td>
                                    <td><?= $row['jml'] ?>x</td>
                                    <td class="small">Rp <?= number_format($row['pendapatan'], 0, ',', '.') ?></td>
                                </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Detail Transaksi Bulan Ini -->
            <div class="col-md-7">
                <div class="card page-card">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="mb-0 fw-bold">Transaksi Selesai Bulan Ini</h6>
                    </div>
                    <div class="table-responsive">
                        <table class="table mb-0">
                            <thead><tr><th>Kode</th><th>Pelanggan</th><th>Kendaraan</th><th>Total</th></tr></thead>
                            <tbody>
                                <?php while ($row = $detail->fetch_assoc()): ?>
                                <tr>
                                    <td><code class="small"><?= $row['kode_sewa'] ?></code></td>
                                    <td class="small"><?= htmlspecialchars($row['nama_pelanggan']) ?></td>
                                    <td class="small"><?= htmlspecialchars($row['nama_kendaraan']) ?></td>
                                    <td class="small">Rp <?= number_format($row['total_harga'], 0, ',', '.') ?></td>
                                </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
<?php include 'includes/footer.php'; ?>
