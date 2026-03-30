<?php
// Mulai session supaya bisa mengaksesnya
session_start();

// Hapus semua data session (data login)
session_destroy();

// Arahkan kembali ke halaman login
header("Location: login.php");
exit();
?>
