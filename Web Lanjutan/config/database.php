<?php
// ============================================
// Konfigurasi koneksi ke database MySQL
// ============================================

// Setting koneksi - sesuaikan kalau beda
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'rental_db');

// Buat koneksi ke database MySQL
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Cek apakah koneksi berhasil atau tidak
if ($conn->connect_error) {
    die("<div style='padding:20px;color:red;font-family:sans-serif;'>
        <h3>Koneksi Database Gagal!</h3>
        <p>" . $conn->connect_error . "</p>
    </div>");
}

// Set charset supaya huruf Indonesia (ä, é, dll) terbaca dengan benar
$conn->set_charset("utf8mb4");
?>
