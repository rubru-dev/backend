<?php
// ============================================
// Halaman Detail Kendaraan + Form Pemesanan
// ============================================

require_once 'includes/db.php';

// Ambil ID kendaraan dari URL
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Ambil data kendaraan berdasarkan ID
$kendaraan = $conn->query("
    SELECT k.*, kt.nama as nama_kategori
    FROM kendaraan k
    LEFT JOIN kategori kt ON k.kategori_id = kt.id
    WHERE k.id = $id
")->fetch_assoc();

// Kalau kendaraan tidak ditemukan, redirect ke daftar
if (!$kendaraan) {
    header("Location: kendaraan.php");
    exit();
}

$pageTitle = 'Sewa ' . $kendaraan['nama'];
$pesanSukses = '';
$pesanError  = '';

// ---- Proses form pemesanan ----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil data dari form
    $nama_pelanggan  = trim($_POST['nama']);
    $email           = trim($_POST['email']);
    $no_hp           = trim($_POST['no_hp']);
    $no_ktp          = trim($_POST['no_ktp']);
    $alamat          = trim($_POST['alamat']);
    $tgl_mulai       = $_POST['tgl_mulai'];
    $tgl_selesai     = $_POST['tgl_selesai'];
    $catatan         = trim($_POST['catatan']);

    // Hitung berapa hari sewa
    $hari = (strtotime($tgl_selesai) - strtotime($tgl_mulai)) / 86400;

    if ($hari < 1) {
        $pesanError = 'Tanggal selesai harus setelah tanggal mulai!';
    } elseif ($kendaraan['status'] != 'tersedia') {
        $pesanError = 'Maaf, kendaraan ini sedang tidak tersedia!';
    } else {
        // Hitung total harga
        $total = $hari * $kendaraan['harga_per_hari'];

        // Cek apakah pelanggan sudah ada berdasarkan no_hp
        $cekPelanggan = $conn->query("SELECT id FROM pelanggan WHERE no_hp='$no_hp' LIMIT 1")->fetch_assoc();

        if ($cekPelanggan) {
            // Pakai ID yang sudah ada
            $pelanggan_id = $cekPelanggan['id'];
        } else {
            // Tambah pelanggan baru
            $conn->query("INSERT INTO pelanggan (nama, email, no_hp, no_ktp, alamat) VALUES ('$nama_pelanggan','$email','$no_hp','$no_ktp','$alamat')");
            $pelanggan_id = $conn->insert_id;
        }

        // Buat kode sewa unik berdasarkan tanggal + nomor acak
        $kode = 'RNT-' . date('Ymd') . '-' . rand(100, 999);

        // Simpan data penyewaan
        $conn->query("INSERT INTO penyewaan (kode_sewa, pelanggan_id, kendaraan_id, tanggal_mulai, tanggal_selesai, total_hari, total_harga, catatan)
            VALUES ('$kode', $pelanggan_id, $id, '$tgl_mulai', '$tgl_selesai', $hari, $total, '$catatan')");

        $pesanSukses = "Pemesanan berhasil! Kode sewa Anda: <strong>$kode</strong>. Simpan kode ini untuk cek status.";
    }
}
?>
<?php include 'includes/header.php'; ?>

<div class="container py-5">
    <div class="row g-4">
        <!-- Info Kendaraan -->
        <div class="col-md-5">
            <div class="card border-0 shadow-sm">
                <!-- Gambar kendaraan -->
                <div class="text-center py-5" style="background:#f8f9fa; border-radius:12px 12px 0 0;">
                    <?php $icon = ($kendaraan['nama_kategori']=='Mobil') ? 'bi-car-front-fill' : 'bi-bicycle'; ?>
                    <i class="bi <?= $icon ?>" style="font-size:8rem; color:#f0a500;"></i>
                </div>
                <div class="card-body p-4">
                    <span class="badge mb-2" style="background:#f0a500;"><?= $kendaraan['nama_kategori'] ?></span>
                    <h3 class="fw-bold"><?= htmlspecialchars($kendaraan['nama']) ?></h3>
                    <p class="text-muted"><?= htmlspecialchars($kendaraan['deskripsi']) ?></p>

                    <!-- Detail kendaraan -->
                    <table class="table table-borderless table-sm">
                        <tr><td class="text-muted">Plat Nomor</td><td><code><?= $kendaraan['plat'] ?></code></td></tr>
                        <tr><td class="text-muted">Status</td><td><span class="badge bg-success"><?= ucfirst($kendaraan['status']) ?></span></td></tr>
                        <tr><td class="text-muted">Harga/Hari</td><td class="fw-bold text-warning">Rp <?= number_format($kendaraan['harga_per_hari'], 0, ',', '.') ?></td></tr>
                    </table>
                </div>
            </div>
        </div>

        <!-- Form Pemesanan -->
        <div class="col-md-7">
            <div class="card border-0 shadow-sm p-4">
                <h4 class="fw-bold mb-4">Form Pemesanan</h4>

                <!-- Tampilkan pesan sukses atau error -->
                <?php if ($pesanSukses): ?>
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i><?= $pesanSukses ?>
                    <div class="mt-2">
                        <a href="cek-status.php" class="btn btn-sm btn-success">Cek Status Sewa</a>
                    </div>
                </div>
                <?php endif; ?>

                <?php if ($pesanError): ?>
                <div class="alert alert-danger"><?= $pesanError ?></div>
                <?php endif; ?>

                <form method="POST">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Nama Lengkap *</label>
                            <input type="text" name="nama" class="form-control" required placeholder="Nama sesuai KTP">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">No. KTP *</label>
                            <input type="text" name="no_ktp" class="form-control" required placeholder="16 digit NIK">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">No. HP *</label>
                            <input type="text" name="no_hp" class="form-control" required placeholder="08xx-xxxx-xxxx">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Email</label>
                            <input type="email" name="email" class="form-control" placeholder="email@example.com">
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-semibold">Alamat</label>
                            <input type="text" name="alamat" class="form-control" placeholder="Alamat lengkap">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Tanggal Mulai *</label>
                            <!-- min: hari ini supaya tidak bisa pilih tanggal lampau -->
                            <input type="date" name="tgl_mulai" class="form-control" required
                                   min="<?= date('Y-m-d') ?>" id="tglMulai" onchange="hitungTotal()">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Tanggal Selesai *</label>
                            <input type="date" name="tgl_selesai" class="form-control" required
                                   min="<?= date('Y-m-d', strtotime('+1 day')) ?>" id="tglSelesai" onchange="hitungTotal()">
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-semibold">Catatan (opsional)</label>
                            <textarea name="catatan" class="form-control" rows="2" placeholder="Misal: minta antar ke hotel..."></textarea>
                        </div>
                    </div>

                    <!-- Kalkulasi harga otomatis -->
                    <div class="alert alert-light border mt-3" id="infoHarga" style="display:none;">
                        <div class="d-flex justify-content-between">
                            <span>Durasi Sewa</span>
                            <span id="infoDurasi">-</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>Harga/Hari</span>
                            <span>Rp <?= number_format($kendaraan['harga_per_hari'], 0, ',', '.') ?></span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between fw-bold">
                            <span>Total Harga</span>
                            <span id="infoTotal" style="color:#f0a500;">-</span>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-orange btn-lg w-100 mt-3">
                        <i class="bi bi-calendar-check me-2"></i>Pesan Sekarang
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
// Fungsi untuk menghitung total harga secara otomatis di browser
// tanpa perlu refresh halaman
function hitungTotal() {
    var tglMulai   = document.getElementById('tglMulai').value;
    var tglSelesai = document.getElementById('tglSelesai').value;

    if (tglMulai && tglSelesai) {
        var mulai   = new Date(tglMulai);
        var selesai = new Date(tglSelesai);
        var hari    = (selesai - mulai) / (1000 * 60 * 60 * 24); // konversi milliseconds ke hari

        if (hari > 0) {
            var hargaPerHari = <?= $kendaraan['harga_per_hari'] ?>;
            var total        = hari * hargaPerHari;

            // Format angka ke format rupiah Indonesia
            var formatter = new Intl.NumberFormat('id-ID');

            document.getElementById('infoDurasi').textContent = hari + ' hari';
            document.getElementById('infoTotal').textContent  = 'Rp ' + formatter.format(total);
            document.getElementById('infoHarga').style.display = 'block';
        }
    }
}
</script>

<?php include 'includes/footer.php'; ?>
