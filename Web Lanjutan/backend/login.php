<?php
// Mulai session supaya bisa simpan data login
session_start();

// Kalau sudah login, langsung ke dashboard
if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}

// Hubungkan ke database
require_once '../config/database.php';

$error = ''; // Variabel untuk menyimpan pesan error

// Proses form login kalau tombol ditekan (method POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email']);
    $password = $_POST['password'];

    if (empty($email) || empty($password)) {
        $error = 'Email dan password wajib diisi!';
    } else {
        // Cari user berdasarkan email di database
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        // Cek password dengan password_verify (password sudah di-hash)
        if ($user && password_verify($password, $user['password'])) {
            // Login berhasil - simpan data user ke session
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['user_name'] = $user['nama'];
            $_SESSION['user_role'] = $user['role'];
            header("Location: index.php");
            exit();
        } else {
            $error = 'Email atau password salah!';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Login - Admin Rental</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        body {
            background: #1a1a2e;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-box {
            background: #fff;
            border-radius: 16px;
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
    </style>
</head>
<body>
<div class="login-box">
    <!-- Logo / Judul -->
    <div class="text-center mb-4">
        <i class="bi bi-car-front-fill" style="font-size:3rem; color:#f0a500;"></i>
        <h4 class="fw-bold mt-2 mb-0">Admin Rental Kendaraan</h4>
        <p class="text-muted small">Silakan login untuk melanjutkan</p>
    </div>

    <!-- Tampilkan pesan error kalau ada -->
    <?php if ($error): ?>
    <div class="alert alert-danger small"><?= $error ?></div>
    <?php endif; ?>

    <!-- Informasi akun demo -->
    <div class="alert alert-warning small">
        <strong>Akun Demo:</strong><br>
        Email: admin@rental.com | Password: password
    </div>

    <!-- Form login -->
    <form method="POST">
        <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <input type="email" name="email" class="form-control" placeholder="email@example.com"
                   value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
        </div>
        <div class="mb-3">
            <label class="form-label fw-semibold">Password</label>
            <input type="password" name="password" class="form-control" placeholder="Password" required>
        </div>
        <button type="submit" class="btn w-100 text-white" style="background:#f0a500;">
            <i class="bi bi-box-arrow-in-right me-2"></i>Masuk
        </button>
    </form>

    <div class="text-center mt-3">
        <a href="../frontend/index.php" class="text-muted small">← Kembali ke Website</a>
    </div>
</div>
</body>
</html>
