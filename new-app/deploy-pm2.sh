#!/bin/bash
# =============================================================================
# deploy-pm2.sh — Deploy RubahRumah (backend + frontend) di VPS dengan PM2
#
# Pakai:
#   ./deploy-pm2.sh                 # deploy normal (backup DB → pull → build → restart)
#   ./deploy-pm2.sh --force-db      # izinkan prisma db push --accept-data-loss
#   ./deploy-pm2.sh --skip-db       # lewati langkah prisma sepenuhnya
#   ./deploy-pm2.sh --skip-backup   # lewati pg_dump
#   ./deploy-pm2.sh --backend-only  # backend saja
#   ./deploy-pm2.sh --frontend-only # frontend saja
#
# KENAPA SKRIP INI ADA:
# `pm2 restart` TIDAK me-rebuild. Produksi menjalankan hasil compile
# (backend: dist/, frontend: .next/). Kalau `git pull` tanpa `npm run build`,
# PM2 menjalankan kode LAMA — inilah penyebab "fix tidak ngefek" di produksi.
# Skrip ini memastikan urutannya benar dan berhenti dengan pesan jelas bila gagal
# (rantai `cmd && cmd` sebelumnya bisa mati diam-diam di langkah pertama).
# =============================================================================

set -euo pipefail

# ── Konfigurasi (sesuaikan bila path/nama proses berubah) ─────────────────────
APP_DIR="${APP_DIR:-/var/www/backend/new-app}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
PM2_BACKEND="${PM2_BACKEND:-jobdesk-backend}"
PM2_FRONTEND="${PM2_FRONTEND:-jobdesk-frontend}"

# Backup database sebelum deploy (dijalankan otomatis; lewati dengan --skip-backup)
DB_USER="${DB_USER:-appuser}"
DB_NAME="${DB_NAME:-jobdesk_db}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_DIR="${BACKUP_DIR:-/root}"

# ── Flag ──────────────────────────────────────────────────────────────────────
FORCE_DB=false
SKIP_DB=false
SKIP_BACKUP=false
DO_BACKEND=true
DO_FRONTEND=true
for arg in "$@"; do
  case "$arg" in
    --force-db)      FORCE_DB=true ;;
    --skip-db)       SKIP_DB=true ;;
    --skip-backup)   SKIP_BACKUP=true ;;
    --backend-only)  DO_FRONTEND=false ;;
    --frontend-only) DO_BACKEND=false ;;
    -h|--help)       sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Flag tidak dikenal: $arg (pakai --help)"; exit 1 ;;
  esac
done

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; CYAN=$'\033[0;36m'; NC=$'\033[0m'
step() { echo ""; echo "${CYAN}=== $* ===${NC}"; }
ok()   { echo "${GREEN}✓ $*${NC}"; }
warn() { echo "${YELLOW}! $*${NC}"; }
fail() { echo "${RED}✗ GAGAL: $*${NC}"; exit 1; }

# Tampilkan langkah yang gagal dengan jelas (bukan mati diam-diam)
trap 'echo ""; echo "${RED}✗ Deploy BERHENTI di baris $LINENO. Perbaiki error di atas lalu jalankan ulang.${NC}"' ERR

echo "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo "${CYAN}║   RubahRumah — Deploy PM2                ║${NC}"
echo "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo "App dir  : $APP_DIR"
echo "Backend  : $PM2_BACKEND    Frontend: $PM2_FRONTEND"

[ -d "$APP_DIR" ] || fail "APP_DIR tidak ditemukan: $APP_DIR"

# ── 0. Backup database ────────────────────────────────────────────────────────
if [ "$SKIP_BACKUP" = false ]; then
  step "0. Backup database ($DB_NAME)"
  BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
  pg_dump -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" > "$BACKUP_FILE"
  ok "Backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
  warn "Backup dilewati (--skip-backup)"
fi

# ── 1. Git pull ───────────────────────────────────────────────────────────────
step "1. Git pull"
cd "$APP_DIR"
# Amankan perubahan lokal di VPS supaya git pull tidak gagal / menimpa diam-diam
if [ -n "$(git status --porcelain)" ]; then
  warn "Ada perubahan lokal di VPS — di-stash dulu (lihat: git stash list)."
  git stash push -u -m "deploy-pm2 autostash $(date +%F_%T)"
fi
BEFORE=$(git rev-parse --short HEAD)
git pull
AFTER=$(git rev-parse --short HEAD)
if [ "$BEFORE" = "$AFTER" ]; then
  warn "Tidak ada commit baru (HEAD tetap $AFTER) — tetap lanjut rebuild."
else
  ok "Update: $BEFORE → $AFTER"
  git --no-pager log --oneline "$BEFORE".."$AFTER" | head -10
fi

# ── 1.5 Backup database (sebelum perubahan schema) ───────────────────────────
if [ "$SKIP_BACKUP" = false ]; then
  step "1.5 Backup database"
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-$(date '+%Y%m%d-%H%M%S').sql.gz"
  if pg_dump -U "$DB_USER" -h "$DB_HOST" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    ok "Backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
  else
    rm -f "$BACKUP_FILE"
    fail "Backup database GAGAL — deploy dihentikan demi keamanan.
  Cek kredensial: DB_USER=$DB_USER DB_NAME=$DB_NAME DB_HOST=$DB_HOST
  (set lewat env, mis: DB_USER=appuser DB_NAME=jobdesk_db ./deploy-pm2.sh)
  Atau lewati dengan: ./deploy-pm2.sh --skip-backup"
  fi
else
  warn "Backup dilewati (--skip-backup)"
fi

# ── 2. Backend ────────────────────────────────────────────────────────────────
if [ "$DO_BACKEND" = true ]; then
  step "2. Backend — install"
  cd "$BACKEND_DIR"
  npm install
  ok "Dependencies backend terpasang"

  if [ "$SKIP_DB" = false ]; then
    step "3. Backend — Prisma (generate + sync schema)"
    npx prisma generate
    ok "Prisma client di-generate"

    # db push dicoba TANPA --accept-data-loss dulu (aman).
    # Kalau gagal karena perlu perubahan destruktif, berhenti dengan instruksi jelas.
    if npx prisma db push; then
      ok "Schema DB sinkron"
    else
      if [ "$FORCE_DB" = true ]; then
        warn "db push perlu --accept-data-loss. Mengulang dengan flag tersebut (--force-db aktif)..."
        npx prisma db push --accept-data-loss
        ok "Schema DB sinkron (dengan --accept-data-loss)"
      else
        echo ""
        fail "prisma db push perlu persetujuan perubahan berisiko.
  Periksa peringatannya di atas. Kalau perubahannya memang aman
  (mis. hanya menambah index unik / tabel baru), jalankan ulang dengan:
      ./deploy-pm2.sh --force-db
  JANGAN pakai --force-db kalau peringatannya menyebut kolom/tabel akan DIHAPUS."
      fi
    fi
  else
    warn "Langkah Prisma dilewati (--skip-db)"
  fi

  step "4. Backend — build (tsc → dist/)"
  npm run build
  [ -f "$BACKEND_DIR/dist/index.js" ] || fail "Build backend tidak menghasilkan dist/index.js"
  ok "Build backend OK ($(date -r "$BACKEND_DIR/dist/index.js" '+%Y-%m-%d %H:%M:%S'))"

  step "5. Backend — restart PM2"
  pm2 restart "$PM2_BACKEND" --update-env
  ok "PM2 '$PM2_BACKEND' di-restart"
fi

# ── 3. Frontend ───────────────────────────────────────────────────────────────
if [ "$DO_FRONTEND" = true ]; then
  step "6. Frontend — install"
  cd "$FRONTEND_DIR"
  npm install
  ok "Dependencies frontend terpasang"

  step "7. Frontend — build (Next.js → .next/)"
  npm run build
  [ -d "$FRONTEND_DIR/.next" ] || fail "Build frontend tidak menghasilkan .next/"
  ok "Build frontend OK"

  step "8. Frontend — restart PM2"
  pm2 restart "$PM2_FRONTEND" --update-env
  ok "PM2 '$PM2_FRONTEND' di-restart"
fi

# ── 4. Ringkasan ──────────────────────────────────────────────────────────────
step "Selesai"
pm2 list
echo ""
ok "Deploy selesai pada commit $(cd "$APP_DIR" && git rev-parse --short HEAD)"
echo ""
echo "Cek cepat:"
echo "  pm2 logs $PM2_BACKEND --lines 30"
echo "  pm2 logs $PM2_FRONTEND --lines 30"
