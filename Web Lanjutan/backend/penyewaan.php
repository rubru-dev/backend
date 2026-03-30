<?php
// ============================================
// Halaman Manajemen Semua Penyewaan
// ============================================

$pageTitle = 'Data Penyewaan';
require_once 'includes/auth.php';
require_once '../config/database.php';

$pesan = '';

// Update status penyewaan
if (isset($_GET['aksi']) && $_GET['aksi'] == 'ubah_status') {
    $id     = (int)$_GET['id'];
    $status = $_GET['status'];
    // Daftar status yang valid
    $statusValid = ['menunggu', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan'];
    if (in_array($status, $statusValid)) {
        $conn->query("UPDATE penyewaan SET status='$status' WHERE id=$id");
        $pesan = 'Status berhasil diubah!';
    }
}

// Hapus penyewaan
if (isset($_GET['aksi']) && $_GET['aksi'] == 'hapus') {
    $id = (int)$_GET['id'];
    $conn->query("DELETE FROM penyewaan WHERE id=$id");
    $pesan = 'Data penyewaan dihapus!';
}

// Filter berdasarkan status (dari dropdown)
$filterStatus = $_GET['filter'] ?? '';
$where = $filterStatus ? "WHERE p.status='$filterStatus'" : '';

// Ambil semua data penyewaan dengan JOIN ke tabel lain
$list = $conn->query("
    SELECT p.*, pl.nama as nama_pelanggan, pl.no_hp, k.nama as nama_kendaraan
    FROM penyewaan p
    LEFT JOIN pelanggan pl ON p.pelanggan_id = pl.id
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    $where
    ORDER BY p.created_at DESC
");
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <div class="topbar d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fw-bold">Data Penyewaan</h5>
        <!-- Filter status -->
        <form method="GET" class="d-flex gap-2 align-items-center">
            <select name="filter" class="form-select form-select-sm" style="width:160px;" onchange="this.form.submit()">
                <option value="">Semua Status</option>
                <?php foreach(['menunggu','dikonfirmasi','berjalan','selesai','dibatalkan'] as $s): ?>
                <option value="<?= $s ?>" <?= $filterStatus==$s?'selected':'' ?>><?= ucfirst($s) ?></option>
                <?php endforeach; ?>
            </select>
        </form>
    </div>
    <div class="content-area">

        <?php if ($pesan): ?>
        <div class="alert alert-success alert-auto"><?= $pesan ?></div>
        <?php endif; ?>

        <div class="card page-card">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Kode Sewa</th>
                            <th>Pelanggan</th>
                            <th>Kendaraan</th>
                            <th>Tanggal Sewa</th>
                            <th>Hari</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($row = $list->fetch_assoc()): ?>
                        <tr>
                            <td><code class="small"><?= $row['kode_sewa'] ?></code></td>
                            <td>
                                <div class="fw-semibold"><?= htmlspecialchars($row['nama_pelanggan']) ?></div>
                                <small class="text-muted"><?= $row['no_hp'] ?></small>
                            </td>
                            <td><?= htmlspecialchars($row['nama_kendaraan']) ?></td>
                            <td>
                                <small><?= date('d/m/Y', strtotime($row['tanggal_mulai'])) ?></small><br>
                                <small class="text-muted">s/d <?= date('d/m/Y', strtotime($row['tanggal_selesai'])) ?></small>
                            </td>
                            <td class="text-center"><?= $row['total_hari'] ?> hari</td>
                            <td>Rp <?= number_format($row['total_harga'], 0, ',', '.') ?></td>
                            <td>
                                <?php
                                $warna = ['menunggu'=>'warning text-dark','dikonfirmasi'=>'info','berjalan'=>'primary','selesai'=>'success','dibatalkan'=>'danger'];
                                ?>
                                <span class="badge bg-<?= $warna[$row['status']] ?>"><?= ucfirst($row['status']) ?></span>
                            </td>
                            <td>
                                <!-- Dropdown ubah status -->
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Ubah</button>
                                    <ul class="dropdown-menu">
                                        <?php foreach(['dikonfirmasi','berjalan','selesai','dibatalkan'] as $s): ?>
                                        <li><a class="dropdown-item small" href="penyewaan.php?aksi=ubah_status&id=<?= $row['id'] ?>&status=<?= $s ?>"><?= ucfirst($s) ?></a></li>
                                        <?php endforeach; ?>
                                    </ul>
                                </div>
                            </td>
                        </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>
<?php include 'includes/footer.php'; ?>
