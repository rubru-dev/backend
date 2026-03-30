        </div><!-- tutup content-area -->
    </div><!-- tutup main-content -->

    <!-- Bootstrap JS untuk komponen seperti modal, dropdown -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Notifikasi alert otomatis hilang setelah 3 detik
        setTimeout(function() {
            var alerts = document.querySelectorAll('.alert-auto');
            alerts.forEach(function(el) {
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.5s';
                setTimeout(function() { el.remove(); }, 500);
            });
        }, 3000);
    </script>
</body>
</html>
