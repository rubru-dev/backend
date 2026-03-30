<?php
$current = basename($_SERVER['PHP_SELF']);
?>
<nav class="navbar navbar-expand-lg navbar-dark sticky-top" style="background-color: #1a1a2e; box-shadow: 0 2px 20px rgba(0,0,0,0.3);">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.php">
            <i class="bi bi-egg-fried fs-4" style="color: #c8a96e;"></i>
            <span style="font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #c8a96e; font-weight: 700;">Resto Nusantara</span>
        </a>
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarMain">
            <ul class="navbar-nav ms-auto gap-1">
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='index.php'?'active':'' ?>" href="index.php">
                        <i class="bi bi-house me-1"></i>Beranda
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='menu.php'?'active':'' ?>" href="menu.php">
                        <i class="bi bi-journal-bookmark me-1"></i>Menu
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='promotions.php'?'active':'' ?>" href="promotions.php">
                        <i class="bi bi-tag me-1"></i>Promo
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='gallery.php'?'active':'' ?>" href="gallery.php">
                        <i class="bi bi-images me-1"></i>Galeri
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='reviews.php'?'active':'' ?>" href="reviews.php">
                        <i class="bi bi-star me-1"></i>Ulasan
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='reservation.php'?'active':'' ?>" href="reservation.php">
                        <i class="bi bi-calendar-check me-1"></i>Reservasi
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='about.php'?'active':'' ?>" href="about.php">
                        <i class="bi bi-info-circle me-1"></i>Tentang
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link px-3 <?= $current=='contact.php'?'active':'' ?>" href="contact.php">
                        <i class="bi bi-envelope me-1"></i>Kontak
                    </a>
                </li>
            </ul>
        </div>
    </div>
</nav>
<style>
    .navbar .nav-link { color: #ccc !important; font-size: 0.9rem; border-radius: 6px; }
    .navbar .nav-link:hover, .navbar .nav-link.active {
        color: #c8a96e !important;
        background-color: rgba(200, 169, 110, 0.1);
    }
</style>
