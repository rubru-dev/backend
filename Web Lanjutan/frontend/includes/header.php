<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Judul halaman dinamis -->
    <title><?= isset($pageTitle) ? $pageTitle . ' - ' : '' ?>Rental Kendaraan</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        body { font-family: sans-serif; color: #333; }

        /* Navbar styling */
        .navbar { background: #1a1a2e !important; }
        .navbar-brand { color: #f0a500 !important; font-weight: bold; }
        .nav-link { color: rgba(255,255,255,0.8) !important; }
        .nav-link:hover, .nav-link.active { color: #f0a500 !important; }

        /* Tombol utama */
        .btn-orange { background: #f0a500; color: #fff; border: none; }
        .btn-orange:hover { background: #cc8c00; color: #fff; }

        /* Kartu kendaraan */
        .card-kendaraan { border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.08); transition: transform 0.2s; }
        .card-kendaraan:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }

        /* Footer */
        footer { background: #1a1a2e; color: #ccc; }
        footer a { color: #f0a500; text-decoration: none; }
    </style>
</head>
<body>

<!-- Navbar - Menu navigasi utama website -->
<nav class="navbar navbar-expand-lg navbar-dark sticky-top">
    <div class="container">
        <a class="navbar-brand" href="index.php">
            <i class="bi bi-car-front-fill me-2"></i>RentalKu
        </a>
        <!-- Tombol hamburger untuk mobile -->
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMenu">
            <ul class="navbar-nav ms-auto gap-1">
                <!-- 6 menu navigasi -->
                <li class="nav-item">
                    <a class="nav-link <?= basename($_SERVER['PHP_SELF'])=='index.php'?'active':'' ?>" href="index.php">Beranda</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= (basename($_SERVER['PHP_SELF'])=='kendaraan.php'&&($_GET['kategori']??'')==1)?'active':'' ?>" href="kendaraan.php?kategori=1">Sewa Mobil</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= (basename($_SERVER['PHP_SELF'])=='kendaraan.php'&&($_GET['kategori']??'')==2)?'active':'' ?>" href="kendaraan.php?kategori=2">Sewa Motor</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= basename($_SERVER['PHP_SELF'])=='cek-status.php'?'active':'' ?>" href="cek-status.php">Cek Status Sewa</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= basename($_SERVER['PHP_SELF'])=='tentang.php'?'active':'' ?>" href="tentang.php">Tentang Kami</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?= basename($_SERVER['PHP_SELF'])=='kontak.php'?'active':'' ?>" href="kontak.php">Kontak</a>
                </li>
            </ul>
        </div>
    </div>
</nav>
