<?php
// ============================================
// Halaman CRUD Kategori Kendaraan
// ============================================

$pageTitle = 'Kategori';
require_once 'includes/auth.php';
require_once '../config/database.php';

$pesan = '';

// Hapus kategori
if (isset($_GET['aksi']) && $_GET['aksi'] == 'hapus') {
    $id = (int)$_GET['id'];
    $conn->query("DELETE FROM kategori WHERE id=$id");
    $pesan = 'Kategori berhasil dihapus!';
}

// Simpan (tambah atau edit)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama      = trim($_POST['nama']);
    $deskripsi = trim($_POST['deskripsi']);
    $id        = (int)$_POST['id'];

    if ($id > 0) {
        $conn->query("UPDATE kategori SET nama='$nama', deskripsi='$deskripsi' WHERE id=$id");
        $pesan = 'Kategori berhasil diupdate!';
    } else {
        $conn->query("INSERT INTO kategori (nama, deskripsi) VALUES ('$nama', '$deskripsi')");
        $pesan = 'Kategori berhasil ditambahkan!';
    }
}

// Ambil semua kategori dari database
$list = $conn->query("SELECT k.*, COUNT(kn.id) as jml_kendaraan FROM kategori k LEFT JOIN kendaraan kn ON k.id = kn.kategori_id GROUP BY k.id ORDER BY k.nama");

// Data yang mau diedit
$editData = null;
if (isset($_GET['aksi']) && $_GET['aksi'] == 'edit') {
    $id = (int)$_GET['id'];
    $editData = $conn->query("SELECT * FROM kategori WHERE id=$id")->fetch_assoc();
}
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <div class="topbar"><h5 class="mb-0 fw-bold">Kategori Kendaraan</h5></div>
    <div class="content-area">

        <?php if ($pesan): ?>
        <div class="alert alert-success alert-auto"><?= $pesan ?></div>
        <?php endif; ?>

        <div class="row g-4">
            <!-- Form Tambah/Edit -->
            <div class="col-md-4">
                <div class="card page-card p-4">
                    <h6 class="fw-bold mb-3"><?= $editData ? 'Edit Kategori' : 'Tambah Kategori' ?></h6>
                    <form method="POST">
                        <input type="hidden" name="id" value="<?= $editData['id'] ?? 0 ?>">
                        <div class="mb-3">
                            <label class="form-label small fw-semibold">Nama Kategori</label>
                            <input type="text" name="nama" class="form-control"
                                   value="<?= htmlspecialchars($editData['nama'] ?? '') ?>" placeholder="contoh: Mobil" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold">Deskripsi</label>
                            <textarea name="deskripsi" class="form-control" rows="3"><?= htmlspecialchars($editData['deskripsi'] ?? '') ?></textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn text-white" style="background:#f0a500;"><?= $editData ? 'Update' : 'Simpan' ?></button>
                            <?php if ($editData): ?>
                            <a href="kategori.php" class="btn btn-secondary">Batal</a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Tabel Daftar Kategori -->
            <div class="col-md-8">
                <div class="card page-card">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="mb-0 fw-bold">Daftar Kategori</h6>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Deskripsi</th>
                                    <th>Jumlah Kendaraan</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($row = $list->fetch_assoc()): ?>
                                <tr>
                                    <td class="fw-semibold"><?= htmlspecialchars($row['nama']) ?></td>
                                    <td class="text-muted small"><?= htmlspecialchars($row['deskripsi']) ?></td>
                                    <td><span class="badge bg-secondary"><?= $row['jml_kendaraan'] ?> unit</span></td>
                                    <td>
                                        <a href="kategori.php?aksi=edit&id=<?= $row['id'] ?>" class="btn btn-sm btn-warning">Edit</a>
                                        <a href="kategori.php?aksi=hapus&id=<?= $row['id'] ?>"
                                           class="btn btn-sm btn-danger"
                                           onclick="return confirm('Hapus kategori ini?')">Hapus</a>
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
