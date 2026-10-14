cd /var/www/backend/new-app/backend && sed -i 's/tanggal: Date; catatan/tanggal: Date | null; catatan/g' src/routes/bd.ts && sed -i 's/user: { name: string } | null/user?: { name: string } | null/g' src/routes/bd.ts && sed -i 's/parseCPR(row?.cost_per_result)/parseCPR(row?.cost_per_result as any)/g' src/routes/bd.ts && sed -i 's/row.inline_link_clicks/(row as any).inline_link_clicks/g' src/routes/bd.ts && sed -i 's/row.inline_link_click_ctr/(row as any).inline_link_click_ctr/g' src/routes/bd.ts && sed -i "s/role: { name: { in: roleNames } }/roles: { some: { role: { name: { in: roleNames } } } }/" src/lib/fontee.ts && sed -i 's/Camera, Upload, X, ImageIcon, CheckSquare, FileDown,/Camera, Upload, X, ImageIcon, CheckSquare,/' ../frontend/src/app/\(dashboard\)/projek/interior/\[id\]/page.tsx && npm install && npm run build && pm2 restart jobdesk-backend --update-env && cd ../frontend && npm install && npm run build && pm2 restart jobdesk-frontend --update-env && cd /var/www/backend/rubahrumah && npm install && npm run build && pm2 restart rubahrumah-client --update-env



sed -i "s/define('DB_USER', 'root');/define('DB_USER', 'rental_user');/" /var/www/web-lanjutan/config/database.php
sed -i "s/define('DB_PASS', '');/define('DB_PASS', 'rental2026');/" /var/www/web-lanjutan/config/database.php


> "/var/www/backend/Web Lanjutan/frontend/detail.php"
nano "/var/www/backend/Web Lanjutan/frontend/detail.php"

<?php
require_once 'includes/db.php';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$kendaraan = $conn->query("
    SELECT k.*, kt.nama as nama_kategori
    FROM kendaraan k
    LEFT JOIN kategori kt ON k.kategori_id = kt.id
    WHERE k.id = $id
")->fetch_assoc();
if (!$kendaraan) { header("Location: kendaraan.php"); exit(); }
$pageTitle = 'Sewa ' . $kendaraan['nama'];
$pesanSukses = '';
$pesanError  = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama_pelanggan = trim($_POST['nama']);
    $email          = trim($_POST['email']);
    $no_hp          = trim($_POST['no_hp']);
    $no_ktp         = trim($_POST['no_ktp']);
    $alamat         = trim($_POST['alamat']);
    $tgl_mulai      = $_POST['tgl_mulai'];
    $tgl_selesai    = $_POST['tgl_selesai'];
    $catatan        = trim($_POST['catatan']);
    $hari = (strtotime($tgl_selesai) - strtotime($tgl_mulai)) / 86400;
    if ($hari < 1) {
        $pesanError = 'Tanggal selesai harus setelah tanggal mulai!';
    } elseif ($kendaraan['status'] != 'tersedia') {
        $pesanError = 'Maaf, kendaraan ini sedang tidak tersedia!';
    } else {
        $total = $hari * $kendaraan['harga_per_hari'];
        $cekPelanggan = $conn->query("SELECT id FROM pelanggan WHERE no_hp='$no_hp' LIMIT 1")->fetch_assoc();
        if ($cekPelanggan) {
            $pelanggan_id = $cekPelanggan['id'];
        } else {
            $conn->query("INSERT INTO pelanggan (nama, email, no_hp, no_ktp, alamat) VALUES ('$nama_pelanggan','$email','$no_hp','$no_ktp','$alamat')");
            $pelanggan_id = $conn->insert_id;
        }
        $kode = 'RNT-' . date('Ymd') . '-' . rand(100, 999);
        $conn->query("INSERT INTO penyewaan (kode_sewa, pelanggan_id, kendaraan_id, tanggal_mulai, tanggal_selesai, total_hari, total_harga, catatan)
            VALUES ('$kode', $pelanggan_id, $id, '$tgl_mulai', '$tgl_selesai', $hari, $total, '$catatan')");
        $pesanSukses = "Pemesanan berhasil! Kode sewa Anda: <strong>$kode</strong>. Simpan kode ini untuk cek status.";
    }
}
?>
<?php include 'includes/header.php'; ?>
<div class="container py-5">
    <div class="row g-4">
        <div class="col-md-5">
            <div class="card border-0 shadow-sm">
                <div class="text-center py-5" style="background:#f8f9fa; border-radius:12px 12px 0 0;">
                    <?php if ($kendaraan['gambar']): ?>
                        <img src="../backend/uploads/<?= htmlspecialchars($kendaraan['gambar']) ?>" style="width:100%;height:300px;object-fit:cover;">
                    <?php else: ?>
                        <?php $icon = ($kendaraan['nama_kategori']=='Mobil') ? 'bi-car-front-fill' : 'bi-bicycle'; ?>
                        <i class="bi <?= $icon ?>" style="font-size:8rem; color:#f0a500;"></i>
                    <?php endif; ?>
                </div>
                <div class="card-body p-4">
                    <span class="badge mb-2" style="background:#f0a500;"><?= $kendaraan['nama_kategori'] ?></span>
                    <h3 class="fw-bold"><?= htmlspecialchars($kendaraan['nama']) ?></h3>
                    <p class="text-muted"><?= htmlspecialchars($kendaraan['deskripsi']) ?></p>
                    <table class="table table-borderless table-sm">
                        <tr><td class="text-muted">Plat Nomor</td><td><code><?= $kendaraan['plat'] ?></code></td></tr>
                        <tr><td class="text-muted">Status</td><td><span class="badge bg-success"><?= ucfirst($kendaraan['status']) ?></span></td></tr>
                        <tr><td class="text-muted">Harga/Hari</td><td class="fw-bold text-warning">Rp <?= number_format($kendaraan['harga_per_hari'], 0, ',', '.') ?></td></tr>
                    </table>
                </div>
            </div>
        </div>
        <div class="col-md-7">
            <div class="card border-0 shadow-sm p-4">
                <h4 class="fw-bold mb-4">Form Pemesanan</h4>
                <?php if ($pesanSukses): ?>
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i><?= $pesanSukses ?>
                    <div class="mt-2"><a href="cek-status.php" class="btn btn-sm btn-success">Cek Status Sewa</a></div>
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
                            <input type="date" name="tgl_mulai" class="form-control" required min="<?= date('Y-m-d') ?>" id="tglMulai" onchange="hitungTotal()">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Tanggal Selesai *</label>
                            <input type="date" name="tgl_selesai" class="form-control" required min="<?= date('Y-m-d', strtotime('+1 day')) ?>" id="tglSelesai" onchange="hitungTotal()">
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-semibold">Catatan (opsional)</label>
                            <textarea name="catatan" class="form-control" rows="2" placeholder="Misal: minta antar ke hotel..."></textarea>
                        </div>
                    </div>
                    <div class="alert alert-light border mt-3" id="infoHarga" style="display:none;">
                        <div class="d-flex justify-content-between"><span>Durasi Sewa</span><span id="infoDurasi">-</span></div>
                        <div class="d-flex justify-content-between"><span>Harga/Hari</span><span>Rp <?= number_format($kendaraan['harga_per_hari'], 0, ',', '.') ?></span></div>
                        <hr>
                        <div class="d-flex justify-content-between fw-bold"><span>Total Harga</span><span id="infoTotal" style="color:#f0a500;">-</span></div>
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
function hitungTotal() {
    var tglMulai   = document.getElementById('tglMulai').value;
    var tglSelesai = document.getElementById('tglSelesai').value;
    if (tglMulai && tglSelesai) {
        var mulai   = new Date(tglMulai);
        var selesai = new Date(tglSelesai);
        var hari    = (selesai - mulai) / (1000 * 60 * 60 * 24);
        if (hari > 0) {
            var hargaPerHari = <?= $kendaraan['harga_per_hari'] ?>;
            var total        = hari * hargaPerHari;
            var formatter    = new Intl.NumberFormat('id-ID');
            document.getElementById('infoDurasi').textContent = hari + ' hari';
            document.getElementById('infoTotal').textContent  = 'Rp ' + formatter.format(total);
            document.getElementById('infoHarga').style.display = 'block';
        }
    }
}
</script>
<?php include 'includes/footer.php'; ?>


> "/var/www/backend/Web Lanjutan/frontend/index.php"
nano "/var/www/backend/Web Lanjutan/frontend/index.php"

<?php
$pageTitle = 'Beranda';
require_once 'includes/db.php';
$kendaraanFeatured = $conn->query("
    SELECT k.*, kt.nama as nama_kategori
    FROM kendaraan k
    LEFT JOIN kategori kt ON k.kategori_id = kt.id
    WHERE k.status = 'tersedia'
    ORDER BY k.id DESC LIMIT 6
");
$totalMobil = $conn->query("SELECT COUNT(*) as c FROM kendaraan k JOIN kategori kt ON k.kategori_id=kt.id WHERE kt.nama='Mobil' AND k.status='tersedia'")->fetch_assoc()['c'];
$totalMotor = $conn->query("SELECT COUNT(*) as c FROM kendaraan k JOIN kategori kt ON k.kategori_id=kt.id WHERE kt.nama='Motor' AND k.status='tersedia'")->fetch_assoc()['c'];
$totalSewa  = $conn->query("SELECT COUNT(*) as c FROM penyewaan WHERE status='selesai'")->fetch_assoc()['c'];
?>
<?php include 'includes/header.php'; ?>
<section style="background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); color: #fff; padding: 80px 0;">
    <div class="container">
        <div class="row align-items-center">
            <div class="col-md-7">
                <h1 class="fw-bold mb-3" style="font-size: 2.5rem; color: #f0a500;">Rental Mobil & Motor<br>Terpercaya</h1>
                <p class="mb-4" style="color: rgba(255,255,255,0.8); font-size: 1.1rem;">Kendaraan terawat, harga transparan, proses mudah dan cepat.<br>Siap antar jemput di lokasi Anda.</p>
                <div class="d-flex gap-3 flex-wrap">
                    <a href="kendaraan.php?kategori=1" class="btn btn-orange btn-lg px-4"><i class="bi bi-car-front me-2"></i>Sewa Mobil</a>
                    <a href="kendaraan.php?kategori=2" class="btn btn-outline-light btn-lg px-4"><i class="bi bi-bicycle me-2"></i>Sewa Motor</a>
                </div>
            </div>
            <div class="col-md-5 text-center mt-4 mt-md-0">
                <i class="bi bi-car-front-fill" style="font-size: 10rem; color: #f0a500; opacity: 0.8;"></i>
            </div>
        </div>
    </div>
</section>
<section class="py-4" style="background: #f0a500;">
    <div class="container">
        <div class="row text-center text-white">
            <div class="col-4"><div class="fw-bold" style="font-size:2rem;"><?= $totalMobil ?>+</div><div class="small">Unit Mobil</div></div>
            <div class="col-4"><div class="fw-bold" style="font-size:2rem;"><?= $totalMotor ?>+</div><div class="small">Unit Motor</div></div>
            <div class="col-4"><div class="fw-bold" style="font-size:2rem;"><?= $totalSewa ?>+</div><div class="small">Pelanggan Puas</div></div>
        </div>
    </div>
</section>
<section class="py-5">
    <div class="container">
        <h2 class="text-center fw-bold mb-4">Kenapa Pilih Kami?</h2>
        <div class="row g-4 text-center">
            <div class="col-md-3"><div class="p-4"><i class="bi bi-shield-check" style="font-size:2.5rem; color:#f0a500;"></i><h5 class="mt-3 fw-bold">Terpercaya</h5><p class="text-muted small">Kendaraan terawat dan diasuransikan</p></div></div>
            <div class="col-md-3"><div class="p-4"><i class="bi bi-tag" style="font-size:2.5rem; color:#f0a500;"></i><h5 class="mt-3 fw-bold">Harga Terjangkau</h5><p class="text-muted small">Harga transparan tanpa biaya tersembunyi</p></div></div>
            <div class="col-md-3"><div class="p-4"><i class="bi bi-clock" style="font-size:2.5rem; color:#f0a500;"></i><h5 class="mt-3 fw-bold">Layanan 24 Jam</h5><p class="text-muted small">Siap melayani kapan saja</p></div></div>
            <div class="col-md-3"><div class="p-4"><i class="bi bi-geo-alt" style="font-size:2.5rem; color:#f0a500;"></i><h5 class="mt-3 fw-bold">Antar Jemput</h5><p class="text-muted small">Tersedia layanan antar jemput</p></div></div>
        </div>
    </div>
</section>
<section class="py-5" style="background: #f8f9fa;">
    <div class="container">
        <div class="text-center mb-4">
            <h2 class="fw-bold">Kendaraan Tersedia</h2>
            <p class="text-muted">Pilih kendaraan sesuai kebutuhan Anda</p>
        </div>
        <div class="row g-4">
            <?php while ($row = $kendaraanFeatured->fetch_assoc()): ?>
            <div class="col-md-4">
                <div class="card card-kendaraan h-100">
                    <div class="text-center py-4" style="background: #f0f2f5;">
                        <?php if ($row['gambar']): ?>
                            <img src="backend/uploads/<?= htmlspecialchars($row['gambar']) ?>" style="width:100%;height:200px;object-fit:cover;">
                        <?php else: ?>
                            <?php $icon = ($row['nama_kategori'] == 'Mobil') ? 'bi-car-front-fill' : 'bi-bicycle'; ?>
                            <i class="bi <?= $icon ?>" style="font-size:5rem; color:#f0a500;"></i>
                        <?php endif; ?>
                    </div>
                    <div class="card-body">
                        <span class="badge mb-2" style="background:#f0a500;"><?= $row['nama_kategori'] ?></span>
                        <h5 class="card-title fw-bold"><?= htmlspecialchars($row['nama']) ?></h5>
                        <p class="text-muted small"><?= htmlspecialchars($row['deskripsi']) ?></p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold" style="color:#f0a500; font-size:1.1rem;">Rp <?= number_format($row['harga_per_hari'], 0, ',', '.') ?></span>
                                <span class="text-muted small">/hari</span>
                            </div>
                            <small class="text-muted"><i class="bi bi-hash me-1"></i><?= $row['plat'] ?></small>
                        </div>
                    </div>
                    <div class="card-footer bg-white border-0 pb-3">
                        <a href="detail.php?id=<?= $row['id'] ?>" class="btn btn-orange w-100">Sewa Sekarang</a>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
        <div class="text-center mt-4">
            <a href="kendaraan.php" class="btn btn-outline-secondary btn-lg px-5">Lihat Semua Kendaraan</a>
        </div>
    </div>
</section>
<section class="py-5">
    <div class="container">
        <h2 class="text-center fw-bold mb-4">Cara Menyewa</h2>
        <div class="row g-4 text-center">
            <div class="col-md-3"><h6 class="fw-bold">Pilih Kendaraan</h6><p class="text-muted small">Pilih mobil atau motor yang sesuai</p></div>
            <div class="col-md-3"><h6 class="fw-bold">Isi Formulir</h6><p class="text-muted small">Lengkapi data diri dan tanggal sewa</p></div>
            <div class="col-md-3"><h6 class="fw-bold">Tunggu Konfirmasi</h6><p class="text-muted small">Kami akan konfirmasi pesanan Anda</p></div>
            <div class="col-md-3"><h6 class="fw-bold">Ambil Kendaraan</h6><p class="text-muted small">Kendaraan siap diambil atau diantarkan</p></div>
        </div>
    </div>
</section>
<?php include 'includes/footer.php'; ?>


> "/var/www/backend/Web Lanjutan/frontend/kendaraan.php"
nano "/var/www/backend/Web Lanjutan/frontend/kendaraan.php"

<?php
require_once 'includes/db.php';
$filterKategori = isset($_GET['kategori']) ? (int)$_GET['kategori'] : 0;
if ($filterKategori > 0) {
    $kat = $conn->query("SELECT nama FROM kategori WHERE id=$filterKategori")->fetch_assoc();
    $pageTitle = 'Sewa ' . ($kat['nama'] ?? 'Kendaraan');
} else {
    $pageTitle = 'Semua Kendaraan';
}
$where = $filterKategori > 0 ? "WHERE k.kategori_id=$filterKategori AND k.status='tersedia'" : "WHERE k.status='tersedia'";
$list = $conn->query("
    SELECT k.*, kt.nama as nama_kategori
    FROM kendaraan k LEFT JOIN kategori kt ON k.kategori_id = kt.id
    $where
    ORDER BY k.nama ASC
");
$kategoriList = $conn->query("SELECT * FROM kategori ORDER BY nama");
?>
<?php include 'includes/header.php'; ?>
<section style="background: #1a1a2e; color: #fff; padding: 40px 0;">
    <div class="container">
        <h2 class="fw-bold mb-1"><?= $pageTitle ?></h2>
        <p style="color: rgba(255,255,255,0.6);">Pilih kendaraan yang sesuai kebutuhan Anda</p>
    </div>
</section>
<section class="py-5">
    <div class="container">
        <div class="d-flex gap-2 mb-4 flex-wrap">
            <a href="kendaraan.php" class="btn btn-sm <?= $filterKategori==0?'btn-orange':'btn-outline-secondary' ?>">Semua</a>
            <?php $kategoriList->data_seek(0); while ($k = $kategoriList->fetch_assoc()): ?>
            <a href="kendaraan.php?kategori=<?= $k['id'] ?>" class="btn btn-sm <?= $filterKategori==$k['id']?'btn-orange':'btn-outline-secondary' ?>">
                <i class="bi bi-<?= $k['nama']=='Mobil'?'car-front':'bicycle' ?> me-1"></i><?= $k['nama'] ?>
            </a>
            <?php endwhile; ?>
        </div>
        <div class="row g-4">
            <?php if ($list->num_rows == 0): ?>
            <div class="col-12 text-center py-5">
                <i class="bi bi-car-front text-muted" style="font-size:4rem;"></i>
                <h5 class="mt-3 text-muted">Tidak ada kendaraan tersedia</h5>
            </div>
            <?php endif; ?>
            <?php while ($row = $list->fetch_assoc()): ?>
            <div class="col-md-4 col-sm-6">
                <div class="card card-kendaraan h-100">
                    <div class="text-center py-4" style="background:#f8f9fa;">
                        <?php if ($row['gambar']): ?>
                            <img src="../backend/uploads/<?= htmlspecialchars($row['gambar']) ?>" style="width:100%;height:200px;object-fit:cover;">
                        <?php else: ?>
                            <?php $icon = ($row['nama_kategori']=='Mobil') ? 'bi-car-front-fill' : 'bi-bicycle'; ?>
                            <i class="bi <?= $icon ?>" style="font-size:5rem; color:#f0a500;"></i>
                        <?php endif; ?>
                    </div>
                    <div class="card-body">
                        <span class="badge mb-2" style="background:#f0a500;"><?= $row['nama_kategori'] ?></span>
                        <h5 class="fw-bold"><?= htmlspecialchars($row['nama']) ?></h5>
                        <p class="text-muted small mb-2"><?= htmlspecialchars($row['deskripsi']) ?></p>
                        <div class="d-flex gap-3 text-muted small mb-3">
                            <span><i class="bi bi-hash me-1"></i><?= $row['plat'] ?></span>
                            <span><i class="bi bi-boxes me-1"></i>Stok: <?= $row['stok'] ?></span>
                        </div>
                        <div class="fw-bold" style="color:#f0a500; font-size:1.2rem;">
                            Rp <?= number_format($row['harga_per_hari'], 0, ',', '.') ?>
                            <span class="text-muted fw-normal" style="font-size:0.85rem;">/hari</span>
                        </div>
                    </div>
                    <div class="card-footer bg-white border-0 pb-3">
                        <a href="detail.php?id=<?= $row['id'] ?>" class="btn btn-orange w-100">
                            <i class="bi bi-calendar-check me-2"></i>Sewa Sekarang
                        </a>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
    </div>
</section>
<?php include 'includes/footer.php'; ?>
