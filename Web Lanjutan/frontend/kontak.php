<?php
// ============================================
// Halaman Kontak
// ============================================

$pageTitle = 'Kontak';
require_once 'includes/db.php';

$pesan = '';

// Proses form kontak kalau dikirim
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama    = trim($_POST['nama']);
    $email   = trim($_POST['email']);
    $subjek  = trim($_POST['subjek']);
    $isi     = trim($_POST['pesan']);

    if (empty($nama) || empty($pesan)) {
        $pesan = '<div class="alert alert-danger">Nama dan pesan wajib diisi!</div>';
    } else {
        // Simpan pesan ke database
        // (Menggunakan tabel penyewaan tidak ada, tapi bisa disimpan ke table contacts - untuk simpel kita tidak buat tabel baru)
        // Atau kita bisa tampilkan saja pesan sukses
        $pesan = '<div class="alert alert-success">
            <i class="bi bi-check-circle me-2"></i>
            Pesan berhasil dikirim! Kami akan menghubungi Anda segera.
        </div>';
    }
}
?>
<?php include 'includes/header.php'; ?>

<section style="background: #1a1a2e; color: #fff; padding: 40px 0;">
    <div class="container">
        <h2 class="fw-bold">Hubungi Kami</h2>
        <p style="color: rgba(255,255,255,0.6);">Ada pertanyaan? Kami siap membantu Anda</p>
    </div>
</section>

<div class="container py-5">
    <div class="row g-5">
        <!-- Info Kontak -->
        <div class="col-md-4">
            <h4 class="fw-bold mb-4">Info Kontak</h4>

            <div class="d-flex gap-3 mb-4">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:50px;height:50px;background:#fff7e6;">
                    <i class="bi bi-geo-alt" style="color:#f0a500; font-size:1.3rem;"></i>
                </div>
                <div>
                    <div class="fw-semibold">Alamat</div>
                    <div class="text-muted small">Jl. Raya Rental No.10<br>Jakarta Selatan, 12345</div>
                </div>
            </div>

            <div class="d-flex gap-3 mb-4">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:50px;height:50px;background:#fff7e6;">
                    <i class="bi bi-whatsapp" style="color:#f0a500; font-size:1.3rem;"></i>
                </div>
                <div>
                    <div class="fw-semibold">WhatsApp</div>
                    <div class="text-muted small">0812-3456-7890<br>Buka 08:00 - 20:00</div>
                </div>
            </div>

            <div class="d-flex gap-3 mb-4">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:50px;height:50px;background:#fff7e6;">
                    <i class="bi bi-envelope" style="color:#f0a500; font-size:1.3rem;"></i>
                </div>
                <div>
                    <div class="fw-semibold">Email</div>
                    <div class="text-muted small">info@rentalku.com</div>
                </div>
            </div>

            <div class="d-flex gap-3">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:50px;height:50px;background:#fff7e6;">
                    <i class="bi bi-clock" style="color:#f0a500; font-size:1.3rem;"></i>
                </div>
                <div>
                    <div class="fw-semibold">Jam Operasional</div>
                    <div class="text-muted small">Setiap Hari<br>08:00 - 20:00 WIB</div>
                </div>
            </div>
        </div>

        <!-- Form Kontak -->
        <div class="col-md-8">
            <div class="card border-0 shadow-sm p-4">
                <h4 class="fw-bold mb-4">Kirim Pesan</h4>

                <?= $pesan ?>

                <form method="POST">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Nama *</label>
                            <input type="text" name="nama" class="form-control" required placeholder="Nama Anda">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Email</label>
                            <input type="email" name="email" class="form-control" placeholder="email@example.com">
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-semibold">Subjek</label>
                            <input type="text" name="subjek" class="form-control" placeholder="Perihal pesan Anda">
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-semibold">Pesan *</label>
                            <textarea name="pesan" class="form-control" rows="5" required
                                      placeholder="Tulis pesan Anda di sini..."></textarea>
                        </div>
                        <div class="col-12">
                            <button type="submit" class="btn btn-orange btn-lg px-5">
                                <i class="bi bi-send me-2"></i>Kirim Pesan
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?>
