<!-- Footer -->
<footer class="pt-4 pb-3 mt-5">
    <div class="container">
        <div class="row g-4">
            <div class="col-md-4">
                <h5 style="color:#f0a500;"><i class="bi bi-car-front-fill me-2"></i>RentalKu</h5>
                <p class="small mt-2">Layanan rental mobil dan motor terpercaya. Kendaraan terawat, harga terjangkau, proses mudah.</p>
                <div class="d-flex gap-3 mt-2">
                    <a href="#"><i class="bi bi-whatsapp fs-5"></i></a>
                    <a href="#"><i class="bi bi-instagram fs-5"></i></a>
                    <a href="#"><i class="bi bi-facebook fs-5"></i></a>
                </div>
            </div>
            <div class="col-md-3">
                <h6 class="text-white fw-semibold mb-3">Menu</h6>
                <ul class="list-unstyled small">
                    <li class="mb-1"><a href="index.php">Beranda</a></li>
                    <li class="mb-1"><a href="kendaraan.php?kategori=1">Sewa Mobil</a></li>
                    <li class="mb-1"><a href="kendaraan.php?kategori=2">Sewa Motor</a></li>
                    <li class="mb-1"><a href="cek-status.php">Cek Status Sewa</a></li>
                    <li class="mb-1"><a href="tentang.php">Tentang Kami</a></li>
                    <li class="mb-1"><a href="kontak.php">Kontak</a></li>
                </ul>
            </div>
            <div class="col-md-5">
                <h6 class="text-white fw-semibold mb-3">Info Kontak</h6>
                <ul class="list-unstyled small">
                    <li class="mb-2"><i class="bi bi-geo-alt me-2" style="color:#f0a500;"></i>Jl. Raya Rental No.10, Jakarta</li>
                    <li class="mb-2"><i class="bi bi-telephone me-2" style="color:#f0a500;"></i>0812-3456-7890</li>
                    <li class="mb-2"><i class="bi bi-envelope me-2" style="color:#f0a500;"></i>info@rentalku.com</li>
                    <li class="mb-2"><i class="bi bi-clock me-2" style="color:#f0a500;"></i>Buka Setiap Hari 08:00 - 20:00</li>
                </ul>
            </div>
        </div>
        <hr style="border-color:#333; margin-top:1.5rem;">
        <div class="text-center small" style="color:#888;">
            &copy; <?= date('Y') ?> RentalKu. All Rights Reserved.
            <a href="../backend/login.php" class="ms-3 text-muted small">Admin</a>
        </div>
    </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
