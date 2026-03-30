<?php
// ============================================
// Halaman Data Pelanggan (CRUD)
// ============================================

$pageTitle = 'Data Pelanggan';
require_once 'includes/auth.php';
require_once '../config/database.php';

$pesan = '';

// Hapus pelanggan
if (isset($_GET['aksi']) && $_GET['aksi'] == 'hapus') {
    $id = (int)$_GET['id'];
    $conn->query("DELETE FROM pelanggan WHERE id=$id");
    $pesan = 'Pelanggan berhasil dihapus!';
}

// Simpan data pelanggan
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama    = trim($_POST['nama']);
    $email   = trim($_POST['email']);
    $no_hp   = trim($_POST['no_hp']);
    $no_ktp  = trim($_POST['no_ktp']);
    $alamat  = trim($_POST['alamat']);
    $id      = (int)$_POST['id'];

    if ($id > 0) {
        $conn->query("UPDATE pelanggan SET nama='$nama', email='$email', no_hp='$no_hp', no_ktp='$no_ktp', alamat='$alamat' WHERE id=$id");
        $pesan = 'Data pelanggan berhasil diupdate!';
    } else {
        $conn->query("INSERT INTO pelanggan (nama, email, no_hp, no_ktp, alamat) VALUES ('$nama','$email','$no_hp','$no_ktp','$alamat')");
        $pesan = 'Pelanggan berhasil ditambahkan!';
    }
}

// Ambil semua pelanggan + hitung berapa kali menyewa
$list = $conn->query("
    SELECT pl.*, COUNT(p.id) as total_sewa
    FROM pelanggan pl
    LEFT JOIN penyewaan p ON pl.id = p.pelanggan_id
    GROUP BY pl.id
    ORDER BY pl.created_at DESC
");

// Data edit
$editData = null;
if (isset($_GET['aksi']) && $_GET['aksi'] == 'edit') {
    $id = (int)$_GET['id'];
    $editData = $conn->query("SELECT * FROM pelanggan WHERE id=$id")->fetch_assoc();
}
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <div class="topbar"><h5 class="mb-0 fw-bold">Data Pelanggan</h5></div>
    <div class="content-area">

        <?php if ($pesan): ?>
        <div class="alert alert-success alert-auto"><?= $pesan ?></div>
        <?php endif; ?>

        <div class="row g-4">
            <!-- Form Tambah/Edit Pelanggan -->
            <div class="col-md-4">
                <div class="card page-card p-4">
                    <h6 class="fw-bold mb-3"><?= $editData ? 'Edit Pelanggan' : 'Tambah Pelanggan' ?></h6>
                    <form method="POST">
                        <input type="hidden" name="id" value="<?= $editData['id'] ?? 0 ?>">
                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Nama Lengkap</label>
                            <input type="text" name="nama" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['nama'] ?? '') ?>" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Email</label>
                            <input type="email" name="email" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['email'] ?? '') ?>">
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-semibold">No. HP</label>
                            <input type="text" name="no_hp" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['no_hp'] ?? '') ?>" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-semibold">No. KTP</label>
                            <input type="text" name="no_ktp" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['no_ktp'] ?? '') ?>" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold">Alamat</label>
                            <textarea name="alamat" class="form-control form-control-sm" rows="2"><?= htmlspecialchars($editData['alamat'] ?? '') ?></textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-sm text-white" style="background:#f0a500;"><?= $editData ? 'Update' : 'Simpan' ?></button>
                            <?php if ($editData): ?>
                            <a href="pelanggan.php" class="btn btn-sm btn-secondary">Batal</a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Tabel Daftar Pelanggan -->
            <div class="col-md-8">
                <div class="card page-card">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="mb-0 fw-bold">Daftar Pelanggan</h6>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>No. HP</th>
                                    <th>No. KTP</th>
                                    <th>Total Sewa</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($row = $list->fetch_assoc()): ?>
                                <tr>
                                    <td>
                                        <div class="fw-semibold"><?= htmlspecialchars($row['nama']) ?></div>
                                        <small class="text-muted"><?= $row['email'] ?></small>
                                    </td>
                                    <td><?= $row['no_hp'] ?></td>
                                    <td><small><?= $row['no_ktp'] ?></small></td>
                                    <td><span class="badge bg-secondary"><?= $row['total_sewa'] ?>x</span></td>
                                    <td>
                                        <a href="pelanggan.php?aksi=edit&id=<?= $row['id'] ?>" class="btn btn-sm btn-warning">Edit</a>
                                        <a href="pelanggan.php?aksi=hapus&id=<?= $row['id'] ?>"
                                           class="btn btn-sm btn-danger"
                                           onclick="return confirm('Hapus pelanggan ini?')">Hapus</a>
                                    </td>
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
