-- ============================================
-- Database: rental_db
-- Website Rental Mobil & Motor
-- ============================================

-- Buat database kalau belum ada
CREATE DATABASE IF NOT EXISTS rental_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rental_db;

-- ============================================
-- TABEL 1: users (akun admin/staff)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABEL 2: kategori (Mobil / Motor)
-- ============================================
CREATE TABLE IF NOT EXISTS kategori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(50) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABEL 3: kendaraan (daftar mobil dan motor)
-- ============================================
CREATE TABLE IF NOT EXISTS kendaraan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori_id INT,
    nama VARCHAR(100) NOT NULL,
    plat VARCHAR(20) NOT NULL,
    harga_per_hari DECIMAL(10,2) NOT NULL,
    stok INT DEFAULT 1,
    deskripsi TEXT,
    gambar VARCHAR(255) DEFAULT 'default.jpg',
    status ENUM('tersedia', 'disewa', 'maintenance') DEFAULT 'tersedia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE SET NULL
);

-- ============================================
-- TABEL 4: pelanggan (data orang yang menyewa)
-- ============================================
CREATE TABLE IF NOT EXISTS pelanggan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    no_hp VARCHAR(20) NOT NULL,
    no_ktp VARCHAR(30) NOT NULL,
    alamat TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABEL 5: penyewaan (transaksi sewa kendaraan)
-- ============================================
CREATE TABLE IF NOT EXISTS penyewaan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_sewa VARCHAR(20) UNIQUE NOT NULL,
    pelanggan_id INT,
    kendaraan_id INT,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    total_hari INT NOT NULL,
    total_harga DECIMAL(12,2) NOT NULL,
    status ENUM('menunggu', 'dikonfirmasi', 'berjalan', 'selesai', 'dibatalkan') DEFAULT 'menunggu',
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pelanggan_id) REFERENCES pelanggan(id) ON DELETE SET NULL,
    FOREIGN KEY (kendaraan_id) REFERENCES kendaraan(id) ON DELETE SET NULL
);

-- ============================================
-- DATA AWAL (Sample Data)
-- ============================================

-- Admin default (password: admin123)
INSERT INTO users (nama, email, password, role) VALUES
('Administrator', 'admin@rental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Staff Rental', 'staff@rental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff');

-- Kategori kendaraan
INSERT INTO kategori (nama, deskripsi) VALUES
('Mobil', 'Kendaraan roda empat untuk berbagai kebutuhan'),
('Motor', 'Kendaraan roda dua yang praktis dan irit');

-- Data kendaraan
INSERT INTO kendaraan (kategori_id, nama, plat, harga_per_hari, stok, deskripsi, status) VALUES
(1, 'Toyota Avanza 2022', 'B 1234 ABC', 350000, 2, 'Mobil keluarga 7 penumpang, AC dingin, kondisi bagus', 'tersedia'),
(1, 'Honda Jazz 2021', 'B 5678 DEF', 300000, 1, 'City car sporty, bensin irit, AC kencang', 'tersedia'),
(1, 'Toyota Innova 2023', 'B 9012 GHI', 500000, 1, 'Mobil premium 8 penumpang, nyaman untuk perjalanan jauh', 'tersedia'),
(1, 'Suzuki Ertiga 2022', 'B 3456 JKL', 320000, 2, 'MPV keluarga, lega dan nyaman', 'tersedia'),
(2, 'Honda Beat 2023', 'B 1111 AAA', 75000, 3, 'Motor matic populer, irit bensin, mudah dikendarai', 'tersedia'),
(2, 'Yamaha NMAX 2022', 'B 2222 BBB', 120000, 2, 'Motor matic premium, cocok untuk touring', 'tersedia'),
(2, 'Honda Vario 2023', 'B 3333 CCC', 85000, 2, 'Motor matic stylish, nyaman dikendarai', 'tersedia'),
(2, 'Kawasaki KLX 150', 'B 4444 DDD', 150000, 1, 'Motor trail untuk adventure off-road', 'tersedia');

-- Data pelanggan contoh
INSERT INTO pelanggan (nama, email, no_hp, no_ktp, alamat) VALUES
('Budi Santoso', 'budi@gmail.com', '081234567890', '3201010101800001', 'Jl. Merdeka No.10, Jakarta'),
('Sari Dewi', 'sari@gmail.com', '082345678901', '3201020202900002', 'Jl. Sudirman No.20, Bandung'),
('Ahmad Fauzi', 'ahmad@gmail.com', '083456789012', '3201030303850003', 'Jl. Gatot Subroto No.30, Bogor');

-- Data penyewaan contoh
INSERT INTO penyewaan (kode_sewa, pelanggan_id, kendaraan_id, tanggal_mulai, tanggal_selesai, total_hari, total_harga, status, catatan) VALUES
('RNT-20260301-001', 1, 1, '2026-03-01', '2026-03-03', 2, 700000, 'selesai', 'Sewa untuk liburan keluarga'),
('RNT-20260305-002', 2, 5, '2026-03-05', '2026-03-06', 1, 75000, 'selesai', 'Keperluan kerja'),
('RNT-20260308-003', 3, 2, '2026-03-08', '2026-03-10', 2, 600000, 'dikonfirmasi', 'Perjalanan bisnis');
