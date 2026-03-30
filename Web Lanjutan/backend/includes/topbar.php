<div class="topbar d-flex align-items-center justify-content-between">
    <div class="d-flex align-items-center gap-3">
        <button class="btn btn-sm btn-light d-md-none" onclick="document.getElementById('sidebar').classList.toggle('show')">
            <i class="bi bi-list fs-5"></i>
        </button>
        <div>
            <h6 class="mb-0 fw-bold" style="color: #1a1a2e;"><?= $pageTitle ?? 'Dashboard' ?></h6>
            <small class="text-muted"><?= date('l, d F Y') ?></small>
        </div>
    </div>
    <div class="d-flex align-items-center gap-3">
        <?php
        // Unread notifications count
        $unreads = $conn->query("SELECT COUNT(*) as c FROM contacts WHERE is_read=0")->fetch_assoc()['c'];
        $pendingRes = $conn->query("SELECT COUNT(*) as c FROM reservations WHERE status='pending'")->fetch_assoc()['c'];
        $pendingReviews = $conn->query("SELECT COUNT(*) as c FROM reviews WHERE is_approved=0")->fetch_assoc()['c'];
        $totalNotif = $unreads + $pendingRes + $pendingReviews;
        ?>
        <div class="dropdown">
            <button class="btn btn-sm btn-light position-relative rounded-circle" style="width:38px;height:38px;" data-bs-toggle="dropdown">
                <i class="bi bi-bell"></i>
                <?php if($totalNotif > 0): ?>
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size:0.65rem;"><?= $totalNotif ?></span>
                <?php endif; ?>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3" style="min-width: 250px;">
                <li><h6 class="dropdown-header">Notifikasi</h6></li>
                <?php if($unreads > 0): ?><li><a class="dropdown-item small" href="contacts.php"><i class="bi bi-envelope me-2 text-primary"></i><?= $unreads ?> pesan belum dibaca</a></li><?php endif; ?>
                <?php if($pendingRes > 0): ?><li><a class="dropdown-item small" href="reservations.php"><i class="bi bi-calendar me-2 text-warning"></i><?= $pendingRes ?> reservasi pending</a></li><?php endif; ?>
                <?php if($pendingReviews > 0): ?><li><a class="dropdown-item small" href="reviews.php"><i class="bi bi-star me-2 text-info"></i><?= $pendingReviews ?> ulasan menunggu</a></li><?php endif; ?>
                <?php if($totalNotif == 0): ?><li><span class="dropdown-item small text-muted">Tidak ada notifikasi</span></li><?php endif; ?>
            </ul>
        </div>
        <div class="dropdown">
            <button class="btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3" style="background: rgba(200,169,110,0.1);" data-bs-toggle="dropdown">
                <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style="width:28px;height:28px;background:#c8a96e;font-size:0.85rem;">
                    <?= strtoupper(substr($_SESSION['user_name'] ?? 'A', 0, 1)) ?>
                </div>
                <span class="fw-semibold" style="font-size:0.85rem;color:#1a1a2e;"><?= htmlspecialchars($_SESSION['user_name'] ?? 'Admin') ?></span>
                <i class="bi bi-chevron-down" style="font-size:0.7rem;color:#666;"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                <li><a class="dropdown-item small" href="users.php"><i class="bi bi-person me-2"></i>Profil</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item small text-danger" href="logout.php"><i class="bi bi-box-arrow-left me-2"></i>Keluar</a></li>
            </ul>
        </div>
    </div>
</div>
