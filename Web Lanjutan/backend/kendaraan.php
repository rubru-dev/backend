<?php
// ============================================
// Halaman CRUD Kendaraan (Tambah, Edit, Hapus)
// ============================================

$pageTitle = 'Data Kendaraan';
require_once 'includes/auth.php';
require_once '../config/database.php';

$pesan = ''; // Variabel untuk menyimpan pesan sukses/error

// ---- HAPUS kendaraan ----
// Kalau ada parameter ?aksi=hapus&id=X di URL
if (isset($_GET['aksi']) && $_GET['aksi'] == 'hapus' && isset($_GET['id'])) {
    $id = (int)$_GET['id']; // Cast ke integer supaya aman
    $conn->query("DELETE FROM kendaraan WHERE id = $id");
    $pesan = 'Kendaraan berhasil dihapus!';
}

// ---- SIMPAN data (tambah atau edit) ----
// Kalau form dikirim dengan method POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil data dari form
    $nama         = trim($_POST['nama']);
    $kategori_id  = (int)$_POST['kategori_id'];
    $plat         = trim($_POST['plat']);
    $harga        = (float)$_POST['harga_per_hari'];
    $stok         = (int)$_POST['stok'];
    $deskripsi    = trim($_POST['deskripsi']);
    $status       = $_POST['status'];
    $id           = (int)$_POST['id']; // 0 = tambah baru, > 0 = edit

    // ---- Handle upload gambar ----
    $namaGambar = null;
    if (isset($_FILES['gambar']) && $_FILES['gambar']['error'] === UPLOAD_ERR_OK) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $maxSize = 2 * 1024 * 1024; // 2MB

        if (!in_array($_FILES['gambar']['type'], $allowedTypes)) {
            $pesan = 'Format gambar tidak valid! Gunakan JPG, PNG, WebP, atau GIF.';
        } elseif ($_FILES['gambar']['size'] > $maxSize) {
            $pesan = 'Ukuran gambar maksimal 2MB!';
        } else {
            $ext = pathinfo($_FILES['gambar']['name'], PATHINFO_EXTENSION);
            $namaGambar = 'kendaraan_' . time() . '_' . rand(100, 999) . '.' . $ext;
            $uploadPath = __DIR__ . '/uploads/' . $namaGambar;

            if (!move_uploaded_file($_FILES['gambar']['tmp_name'], $uploadPath)) {
                $pesan = 'Gagal mengupload gambar!';
                $namaGambar = null;
            }
        }
    }

    // Lanjut simpan kalau tidak ada error upload
    if (!$pesan) {
        if ($id > 0) {
            // UPDATE data yang sudah ada
            $sql = "UPDATE kendaraan SET
                nama='$nama', kategori_id=$kategori_id, plat='$plat',
                harga_per_hari=$harga, stok=$stok, deskripsi='$deskripsi', status='$status'";

            if ($namaGambar) {
                // Hapus gambar lama jika ada
                $old = $conn->query("SELECT gambar FROM kendaraan WHERE id=$id")->fetch_assoc();
                if ($old['gambar'] && file_exists(__DIR__ . '/uploads/' . $old['gambar'])) {
                    unlink(__DIR__ . '/uploads/' . $old['gambar']);
                }
                $sql .= ", gambar='$namaGambar'";
            }

            $sql .= " WHERE id=$id";
            $conn->query($sql);
            $pesan = 'Kendaraan berhasil diupdate!';
        } else {
            // INSERT data baru
            $gambarValue = $namaGambar ? "'$namaGambar'" : 'NULL';
            $conn->query("INSERT INTO kendaraan (nama, kategori_id, plat, harga_per_hari, stok, deskripsi, status, gambar)
                VALUES ('$nama', $kategori_id, '$plat', $harga, $stok, '$deskripsi', '$status', $gambarValue)");
            $pesan = 'Kendaraan berhasil ditambahkan!';
        }
    }
}

// ---- Ambil data kendaraan dari database ----
// JOIN dengan tabel kategori supaya bisa tampilkan nama kategori
$kendaraanList = $conn->query("
    SELECT k.*, kt.nama as nama_kategori
    FROM kendaraan k
    LEFT JOIN kategori kt ON k.kategori_id = kt.id
    ORDER BY k.created_at DESC
");

// ---- Ambil daftar kategori untuk dropdown form ----
$kategoriList = $conn->query("SELECT * FROM kategori ORDER BY nama");

// ---- Ambil data kendaraan yang mau diedit (kalau ada ?aksi=edit) ----
$editData = null;
if (isset($_GET['aksi']) && $_GET['aksi'] == 'edit' && isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    $editData = $conn->query("SELECT * FROM kendaraan WHERE id=$id")->fetch_assoc();
}
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <div class="topbar">
        <h5 class="mb-0 fw-bold">Data Kendaraan</h5>
    </div>
    <div class="content-area">

        <!-- Tampilkan pesan sukses -->
        <?php if ($pesan): ?>
        <div class="alert alert-success alert-auto"><?= $pesan ?></div>
        <?php endif; ?>

        <div class="row g-4">
            <!-- Form Tambah / Edit -->
            <div class="col-md-4">
                <div class="card page-card p-4">
                    <h6 class="fw-bold mb-3"><?= $editData ? 'Edit Kendaraan' : 'Tambah Kendaraan' ?></h6>
                    <form method="POST" enctype="multipart/form-data">
                        <!-- ID hidden: 0 = tambah baru, > 0 = edit -->
                        <input type="hidden" name="id" value="<?= $editData['id'] ?? 0 ?>">

                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Nama Kendaraan</label>
                            <input type="text" name="nama" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['nama'] ?? '') ?>" required>
                        </div>

                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Kategori</label>
                            <select name="kategori_id" class="form-select form-select-sm" required>
                                <?php
                                // Tampilkan semua kategori sebagai pilihan
                                while ($kat = $kategoriList->fetch_assoc()):
                                    $selected = ($editData['kategori_id'] ?? 0) == $kat['id'] ? 'selected' : '';
                                ?>
                                <option value="<?= $kat['id'] ?>" <?= $selected ?>><?= $kat['nama'] ?></option>
                                <?php endwhile; ?>
                            </select>
                        </div>

                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Nomor Plat</label>
                            <input type="text" name="plat" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['plat'] ?? '') ?>" required>
                        </div>

                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Harga / Hari (Rp)</label>
                            <input type="number" name="harga_per_hari" class="form-control form-control-sm"
                                   value="<?= $editData['harga_per_hari'] ?? '' ?>" required>
                        </div>

                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Stok Unit</label>
                            <input type="number" name="stok" class="form-control form-control-sm"
                                   value="<?= $editData['stok'] ?? 1 ?>" min="0" required>
                        </div>

                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Status</label>
                            <select name="status" class="form-select form-select-sm">
                                <?php
                                $statusList = ['tersedia', 'disewa', 'maintenance'];
                                foreach ($statusList as $s):
                                    $selected = ($editData['status'] ?? 'tersedia') == $s ? 'selected' : '';
                                ?>
                                <option value="<?= $s ?>" <?= $selected ?>><?= ucfirst($s) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-semibold">Deskripsi</label>
                            <textarea name="deskripsi" class="form-control form-control-sm" rows="3"><?= htmlspecialchars($editData['deskripsi'] ?? '') ?></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-semibold">Gambar Kendaraan</label>
                            <?php if ($editData && $editData['gambar']): ?>
                            <div class="mb-2">
                                <img src="uploads/<?= htmlspecialchars($editData['gambar']) ?>" alt="Gambar saat ini"
                                     class="img-thumbnail" style="max-height:120px;">
                                <small class="d-block text-muted mt-1">Gambar saat ini. Upload baru untuk mengganti.</small>
                            </div>
                            <?php endif; ?>
                            <input type="file" name="gambar" class="form-control form-control-sm" accept="image/*">
                            <small class="text-muted">Maks 2MB. Format: JPG, PNG, WebP, GIF</small>
                        </div>

                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-sm text-white" style="background:#f0a500;">
                                <?= $editData ? 'Update' : 'Simpan' ?>
                            </button>
                            <?php if ($editData): ?>
                            <a href="kendaraan.php" class="btn btn-sm btn-secondary">Batal</a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Tabel Daftar Kendaraan -->
            <div class="col-md-8">
                <div class="card page-card">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="mb-0 fw-bold">Daftar Kendaraan</h6>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Gambar</th>
                                    <th>Nama</th>
                                    <th>Kategori</th>
                                    <th>Plat</th>
                                    <th>Harga/Hari</th>
                                    <th>Stok</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($row = $kendaraanList->fetch_assoc()): ?>
                                <tr>
                                    <td>
                                        <?php if ($row['gambar'] && file_exists(__DIR__ . '/uploads/' . $row['gambar'])): ?>
                                        <img src="uploads/<?= htmlspecialchars($row['gambar']) ?>" alt="" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">
                                        <?php else: ?>
                                        <span class="text-muted"><i class="bi bi-image"></i></span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="fw-semibold"><?= htmlspecialchars($row['nama']) ?></td>
                                    <td><?= $row['nama_kategori'] ?></td>
                                    <td><code><?= $row['plat'] ?></code></td>
                                    <td>Rp <?= number_format($row['harga_per_hari'], 0, ',', '.') ?></td>
                                    <td><?= $row['stok'] ?></td>
                                    <td>
                                        <?php
                                        $warna = ['tersedia'=>'success','disewa'=>'primary','maintenance'=>'warning text-dark'];
                                        ?>
                                        <span class="badge bg-<?= $warna[$row['status']] ?>"><?= ucfirst($row['status']) ?></span>
                                    </td>
                                    <td>
                                        <!-- Tombol edit: kirim ke URL dengan parameter edit -->
                                        <a href="kendaraan.php?aksi=edit&id=<?= $row['id'] ?>" class="btn btn-sm btn-warning btn-sm">Edit</a>
                                        <!-- Tombol hapus dengan konfirmasi -->
                                        <a href="kendaraan.php?aksi=hapus&id=<?= $row['id'] ?>"
                                           class="btn btn-sm btn-danger"
                                           onclick="return confirm('Hapus kendaraan ini?')">Hapus</a>
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
