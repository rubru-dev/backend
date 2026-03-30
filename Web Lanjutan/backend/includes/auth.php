<?php
// ============================================
// Cek apakah user sudah login
// File ini di-include di setiap halaman backend
// ============================================

session_start();

// Kalau belum login, arahkan ke halaman login
if (!isset($_SESSION['user_id'])) {
    // Pakai path absolut supaya redirect selalu benar dari halaman mana pun
    header("Location: /Web Lanjutan/backend/login.php");
    exit();
}
?>
