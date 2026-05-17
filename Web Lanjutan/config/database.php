<?php
// ============================================
// Konfigurasi koneksi ke database MySQL
// ============================================

// Setting koneksi - pakai env variable kalau ada, fallback ke default VPS
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'rental_user');
define('DB_PASS', getenv('DB_PASS') ?: 'rental2026');
define('DB_NAME', getenv('DB_NAME') ?: 'rental_db');

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
