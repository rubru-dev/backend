#!/bin/bash
# =============================================================================
# setup-evolution-vps.sh — Pasang Evolution API (WhatsApp gateway) di VPS + PM2
#
# Pakai:
#   bash setup-evolution-vps.sh
#
# Bisa diatur lewat env (opsional):
#   EVO_DIR=/var/www/evolution-api  DB_USER=appuser  DB_HOST=localhost
#   EVO_DB=evolution_api            EVO_PORT=8080    PM2_NAME=evolution-api
#
# Script ini idempotent-ish: aman dijalankan ulang (skip langkah yang sudah ada).
# Di akhir, dia CETAK nilai yang harus ditempel ke .env backend.
# =============================================================================
set -euo pipefail

EVO_DIR="${EVO_DIR:-/var/www/evolution-api}"
EVO_DB="${EVO_DB:-evolution_api}"
EVO_PORT="${EVO_PORT:-8080}"
PM2_NAME="${PM2_NAME:-evolution-api}"
DB_USER="${DB_USER:-appuser}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKEND_ENV="${BACKEND_ENV:-/var/www/backend/new-app/backend/.env}"

GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; CYAN=$'\033[0;36m'; RED=$'\033[0;31m'; NC=$'\033[0m'
step() { echo ""; echo "${CYAN}=== $* ===${NC}"; }
ok()   { echo "${GREEN}✓ $*${NC}"; }
warn() { echo "${YELLOW}! $*${NC}"; }
fail() { echo "${RED}✗ GAGAL: $*${NC}"; exit 1; }

echo "${CYAN}Setup Evolution API${NC}"
echo "Dir: $EVO_DIR | DB: $EVO_DB | Port: $EVO_PORT | PM2: $PM2_NAME"

command -v node >/dev/null || fail "node tidak ada"
command -v pm2  >/dev/null || fail "pm2 tidak ada (npm i -g pm2)"
command -v psql >/dev/null || warn "psql tidak ada — pembuatan DB akan dilewati, buat manual bila perlu"

# ── 1. Kredensial DB ─────────────────────────────────────────────────────────
step "1. Password database untuk user '$DB_USER'"
if [ -z "${DB_PASS:-}" ]; then
  read -rsp "Password $DB_USER: " DB_PASS; echo ""
fi
[ -n "$DB_PASS" ] || fail "Password kosong"
export PGPASSWORD="$DB_PASS"

# ── 2. Buat database Evolution ───────────────────────────────────────────────
step "2. Database '$EVO_DB'"
if command -v psql >/dev/null; then
  if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -tAc \
       "SELECT 1 FROM pg_database WHERE datname='$EVO_DB';" 2>/dev/null | grep -q 1; then
    ok "Database '$EVO_DB' sudah ada"
  else
    if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres \
         -c "CREATE DATABASE $EVO_DB OWNER $DB_USER;" >/dev/null 2>&1; then
      ok "Database '$EVO_DB' dibuat"
    else
      fail "Tidak bisa membuat database '$EVO_DB' (user '$DB_USER' mungkin tidak punya izin CREATEDB).
  Buat manual dengan user superuser lalu jalankan ulang script ini:
      sudo -u postgres psql -c \"CREATE DATABASE $EVO_DB OWNER $DB_USER;\""
    fi
  fi
fi

# ── 3. Clone / update source ─────────────────────────────────────────────────
step "3. Source Evolution API"
if [ -d "$EVO_DIR/.git" ]; then
  cd "$EVO_DIR" && git pull --ff-only || warn "git pull dilewati"
  ok "Source diperbarui: $EVO_DIR"
else
  mkdir -p "$(dirname "$EVO_DIR")"
  git clone --depth 1 https://github.com/EvolutionAPI/evolution-api.git "$EVO_DIR"
  ok "Cloned ke $EVO_DIR"
fi
cd "$EVO_DIR"

# ── 4. Konfigurasi .env Evolution ────────────────────────────────────────────
step "4. Konfigurasi .env"
if [ -f .env ] && grep -q '^AUTHENTICATION_API_KEY=' .env; then
  API_KEY=$(grep '^AUTHENTICATION_API_KEY=' .env | head -1 | cut -d= -f2-)
  ok "Pakai .env yang sudah ada (API key dipertahankan)"
else
  cp env.example .env
  API_KEY="evo-$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
  ok "API key baru dibuat"
fi

DB_URI="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$EVO_DB?schema=public"
set_env() {
  local k="$1" v="$2"
  if grep -q "^$k=" .env; then
    # pakai '|' sebagai delimiter; escape '|' di value bila ada
    v=${v//|/\\|}
    sed -i "s|^$k=.*|$k=$v|" .env
  else
    printf '\n%s=%s\n' "$k" "$v" >> .env
  fi
}
set_env SERVER_PORT "$EVO_PORT"
set_env AUTHENTICATION_API_KEY "$API_KEY"
set_env DATABASE_PROVIDER postgresql
set_env DATABASE_CONNECTION_URI "\"$DB_URI\""
set_env DATABASE_CONNECTION_CLIENT_NAME evolution
set_env CACHE_REDIS_ENABLED false
set_env CACHE_LOCAL_ENABLED true
chmod 600 .env
ok ".env dikonfigurasi (Redis dimatikan, pakai cache lokal)"

# ── 5. Install + migrasi ─────────────────────────────────────────────────────
step "5. npm install (agak lama)"
npm install
ok "Dependencies terpasang"

step "6. Migrasi schema + generate client"
npm run db:deploy
npm run db:generate
ok "Schema Evolution siap di database '$EVO_DB'"

# ── 7. Jalankan via PM2 ──────────────────────────────────────────────────────
step "7. Jalankan via PM2"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
  ok "PM2 '$PM2_NAME' di-restart"
else
  pm2 start npm --name "$PM2_NAME" -- run start
  ok "PM2 '$PM2_NAME' dijalankan"
fi
pm2 save >/dev/null 2>&1 || true

# ── 8. Cek hidup ─────────────────────────────────────────────────────────────
step "8. Verifikasi"
sleep 6
if curl -sf -m 10 "http://localhost:$EVO_PORT/" >/dev/null 2>&1; then
  ok "Evolution API merespons di http://localhost:$EVO_PORT"
else
  warn "Belum merespons — cek log: pm2 logs $PM2_NAME --lines 40"
fi

# ── 9. Nilai untuk .env backend ──────────────────────────────────────────────
WEBHOOK_TOKEN="wh-$(node -e "console.log(require('crypto').randomBytes(12).toString('hex'))")"
echo ""
echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}  SELESAI — tempelkan ini ke $BACKEND_ENV${NC}"
echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
cat <<EOF

WA_PROVIDER=evolution
EVOLUTION_BASE_URL=http://localhost:$EVO_PORT
EVOLUTION_API_KEY=$API_KEY
EVOLUTION_INSTANCE=rubahrumah
EVOLUTION_WEBHOOK_TOKEN=$WEBHOOK_TOKEN

EOF
echo "Lalu:"
echo "  nano $BACKEND_ENV        # tempel baris di atas"
echo "  pm2 restart jobdesk-backend --update-env"
echo ""
echo "Terakhir: buka aplikasi → Pengaturan → GET QR Whatsapp → ketik nomor → Munculkan QR → scan."
