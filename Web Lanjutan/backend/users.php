<?php
// ============================================
// Halaman Kelola Users Admin
// Hanya bisa diakses oleh role 'admin'
// ============================================

$pageTitle = 'Kelola Users';
require_once 'includes/auth.php';
require_once '../config/database.php';

// Cek kalau bukan admin, tidak boleh masuk halaman ini
if ($_SESSION['user_role'] !== 'admin') {
    die("<div class='alert alert-danger m-4'>Anda tidak punya akses ke halaman ini!</div>");
}

$pesan = '';

// Hapus user (tidak boleh hapus diri sendiri)
if (isset($_GET['aksi']) && $_GET['aksi'] == 'hapus') {
    $id = (int)$_GET['id'];
    if ($id == $_SESSION['user_id']) {
        $pesan = 'Tidak bisa menghapus akun sendiri!';
    } else {
        $conn->query("DELETE FROM users WHERE id=$id");
        $pesan = 'User berhasil dihapus!';
    }
}

// Tambah atau edit user
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama  = trim($_POST['nama']);
    $email = trim($_POST['email']);
    $role  = $_POST['role'];
    $id    = (int)$_POST['id'];

    if ($id > 0) {
        // Update - password hanya diubah kalau diisi
        if (!empty($_POST['password'])) {
            $pass = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $conn->query("UPDATE users SET nama='$nama', email='$email', role='$role', password='$pass' WHERE id=$id");
        } else {
            $conn->query("UPDATE users SET nama='$nama', email='$email', role='$role' WHERE id=$id");
        }
        $pesan = 'User berhasil diupdate!';
    } else {
        // Tambah baru - password wajib
        if (empty($_POST['password'])) {
            $pesan = 'Password wajib diisi untuk user baru!';
        } else {
            $pass = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $conn->query("INSERT INTO users (nama, email, password, role) VALUES ('$nama','$email','$pass','$role')");
            $pesan = 'User berhasil ditambahkan!';
        }
    }
}

// Ambil semua user dari database
$list = $conn->query("SELECT * FROM users ORDER BY created_at DESC");

// Data edit
$editData = null;
if (isset($_GET['aksi']) && $_GET['aksi'] == 'edit') {
    $id = (int)$_GET['id'];
    $editData = $conn->query("SELECT * FROM users WHERE id=$id")->fetch_assoc();
}
?>
<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
    <div class="topbar"><h5 class="mb-0 fw-bold">Kelola Users Admin</h5></div>
    <div class="content-area">

        <?php if ($pesan): ?>
        <div class="alert alert-<?= strpos($pesan,'berhasil')!==false?'success':'danger' ?> alert-auto"><?= $pesan ?></div>
        <?php endif; ?>

        <div class="row g-4">
            <!-- Form Tambah/Edit User -->
            <div class="col-md-4">
                <div class="card page-card p-4">
                    <h6 class="fw-bold mb-3"><?= $editData ? 'Edit User' : 'Tambah User' ?></h6>
                    <form method="POST">
                        <input type="hidden" name="id" value="<?= $editData['id'] ?? 0 ?>">
                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Nama</label>
                            <input type="text" name="nama" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['nama'] ?? '') ?>" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Email</label>
                            <input type="email" name="email" class="form-control form-control-sm"
                                   value="<?= htmlspecialchars($editData['email'] ?? '') ?>" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-semibold">Password <?= $editData ? '(kosongkan jika tidak diubah)' : '' ?></label>
                            <input type="password" name="password" class="form-control form-control-sm" placeholder="Password">
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold">Role</label>
                            <select name="role" class="form-select form-select-sm">
                                <option value="admin" <?= ($editData['role']??'') == 'admin' ? 'selected' : '' ?>>Admin</option>
                                <option value="staff" <?= ($editData['role']??'') == 'staff' ? 'selected' : '' ?>>Staff</option>
                            </select>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-sm text-white" style="background:#f0a500;"><?= $editData ? 'Update' : 'Simpan' ?></button>
                            <?php if ($editData): ?>
                            <a href="users.php" class="btn btn-sm btn-secondary">Batal</a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Tabel Daftar Users -->
            <div class="col-md-8">
                <div class="card page-card">
                    <div class="card-header bg-white border-0 py-3">
                        <h6 class="mb-0 fw-bold">Daftar Users</h6>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr><th>Nama</th><th>Email</th><th>Role</th><th>Dibuat</th><th>Aksi</th></tr>
                            </thead>
                            <tbody>
                                <?php while ($row = $list->fetch_assoc()): ?>
                                <tr>
                                    <td>
                                        <?= htmlspecialchars($row['nama']) ?>
                                        <!-- Tandai kalau ini akun yang sedang login -->
                                        <?php if ($row['id'] == $_SESSION['user_id']): ?>
                                        <span class="badge bg-info ms-1">Anda</span>
                                        <?php endif; ?>
                                    </td>
                                    <td><?= $row['email'] ?></td>
                                    <td><span class="badge bg-<?= $row['role']=='admin'?'danger':'secondary' ?>"><?= ucfirst($row['role']) ?></span></td>
                                    <td><small><?= date('d/m/Y', strtotime($row['created_at'])) ?></small></td>
                                    <td>
                                        <a href="users.php?aksi=edit&id=<?= $row['id'] ?>" class="btn btn-sm btn-warning">Edit</a>
                                        <?php if ($row['id'] != $_SESSION['user_id']): ?>
                                        <a href="users.php?aksi=hapus&id=<?= $row['id'] ?>"
                                           class="btn btn-sm btn-danger"
                                           onclick="return confirm('Hapus user ini?')">Hapus</a>
                                        <?php endif; ?>
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
