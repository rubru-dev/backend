<?php
// Halaman Tentang Kami
$pageTitle = 'Tentang Kami';
?>
<?php include 'includes/header.php'; ?>

<section style="background: #1a1a2e; color: #fff; padding: 40px 0;">
    <div class="container">
        <h2 class="fw-bold">Tentang Kami</h2>
        <p style="color: rgba(255,255,255,0.6);">Kenali lebih jauh tentang layanan rental kami</p>
    </div>
</section>

<div class="container py-5">
    <div class="row align-items-center g-5 mb-5">
        <div class="col-md-6">
            <h3 class="fw-bold mb-3">Siapa Kami?</h3>
            <p class="text-muted">
                <strong>RentalKu</strong> adalah jasa rental kendaraan yang berdiri sejak 2020. Kami menyediakan
                layanan sewa mobil dan motor dengan kendaraan terawat, harga transparan, dan proses yang mudah.
            </p>
            <p class="text-muted">
                Kami berkomitmen memberikan pengalaman menyewa terbaik - mulai dari pemilihan kendaraan,
                proses pemesanan yang simpel, hingga pengiriman ke lokasi Anda.
            </p>
            <div class="row g-3 mt-3">
                <div class="col-6">
                    <div class="p-3 rounded text-center" style="background:#fff7e6; border-left:4px solid #f0a500;">
                        <div class="fw-bold" style="font-size:1.8rem; color:#f0a500;">50+</div>
                        <div class="small text-muted">Unit Kendaraan</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-3 rounded text-center" style="background:#fff7e6; border-left:4px solid #f0a500;">
                        <div class="fw-bold" style="font-size:1.8rem; color:#f0a500;">500+</div>
                        <div class="small text-muted">Pelanggan Puas</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6 text-center">
            <i class="bi bi-car-front-fill" style="font-size:12rem; color:#f0a500; opacity:0.7;"></i>
        </div>
    </div>

    <!-- Visi Misi -->
    <div class="row g-4 mb-5">
        <div class="col-md-6">
            <div class="card border-0 shadow-sm p-4 h-100">
                <h5 class="fw-bold mb-3"><i class="bi bi-eye me-2" style="color:#f0a500;"></i>Visi</h5>
                <p class="text-muted mb-0">Menjadi penyedia jasa rental kendaraan terpercaya dan terjangkau yang memenuhi kebutuhan mobilitas masyarakat.</p>
            </div>
        </div>
        <div class="col-md-6">
            <div class="card border-0 shadow-sm p-4 h-100">
                <h5 class="fw-bold mb-3"><i class="bi bi-bullseye me-2" style="color:#f0a500;"></i>Misi</h5>
                <ul class="text-muted mb-0">
                    <li>Menyediakan kendaraan berkualitas dan terawat</li>
                    <li>Memberikan harga yang transparan dan kompetitif</li>
                    <li>Memudahkan proses pemesanan secara online</li>
                    <li>Memberikan pelayanan ramah dan profesional</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Tim kami -->
    <h3 class="fw-bold text-center mb-4">Tim Kami</h3>
    <div class="row g-4 justify-content-center">
        <?php
        // Data tim dummy - bisa dibuat dinamis dari database kalau perlu
        $tim = [
            ['nama'=>'Budi Santoso', 'jabatan'=>'Founder & CEO', 'icon'=>'person-circle'],
            ['nama'=>'Rina Dewi',    'jabatan'=>'Manajer Operasional', 'icon'=>'person-circle'],
            ['nama'=>'Ahmad Rizki',  'jabatan'=>'Kepala Mekanik', 'icon'=>'person-circle'],
        ];
        foreach ($tim as $t):
        ?>
        <div class="col-md-3 text-center">
            <i class="bi bi-<?= $t['icon'] ?>" style="font-size:5rem; color:#ccc;"></i>
            <h6 class="fw-bold mt-2"><?= $t['nama'] ?></h6>
            <p class="text-muted small"><?= $t['jabatan'] ?></p>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<?php include 'includes/footer.php'; ?>
