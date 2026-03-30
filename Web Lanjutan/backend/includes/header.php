<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Judul tab browser: pakai $pageTitle kalau ada, kalau tidak pakai default -->
    <title><?= isset($pageTitle) ? $pageTitle . ' - ' : '' ?>Admin Rental Kendaraan</title>
    <!-- Bootstrap 5 untuk tampilan -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Icon Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        body { background-color: #f0f2f5; font-family: sans-serif; }

        /* Sidebar - menu di sebelah kiri */
        .sidebar {
            width: 240px;
            position: fixed;
            top: 0; left: 0; bottom: 0;
            background: #1a1a2e; /* warna gelap */
            overflow-y: auto;
            z-index: 1000;
        }
        .sidebar .brand {
            padding: 1.2rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: #f0a500;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .sidebar .nav-link {
            color: rgba(255,255,255,0.7);
            padding: 0.6rem 1.2rem;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .sidebar .nav-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .sidebar .nav-link.active { color: #fff; background: #f0a500; border-radius: 6px; margin: 2px 8px; }
        .sidebar .section-title {
            color: rgba(255,255,255,0.35);
            font-size: 0.7rem;
            text-transform: uppercase;
            padding: 0.8rem 1.2rem 0.3rem;
            letter-spacing: 1px;
        }

        /* Konten utama - di sebelah kanan sidebar */
        .main-content { margin-left: 240px; min-height: 100vh; }
        .topbar {
            background: #fff;
            padding: 0.8rem 1.5rem;
            border-bottom: 1px solid #eee;
            position: sticky;
            top: 0;
            z-index: 900;
        }
        .content-area { padding: 1.5rem; }

        /* Kartu statistik di dashboard */
        .stat-card { border-radius: 12px; border: none; }

        /* Tabel data */
        .table thead th { background: #f8f9fa; font-size: 0.82rem; font-weight: 600; color: #555; }
        .table td { vertical-align: middle; font-size: 0.9rem; }

        /* Card halaman */
        .page-card { background: #fff; border-radius: 12px; border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
    </style>
</head>
<body>
