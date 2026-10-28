#!/bin/bash
# =============================================================================
# deploy.sh — VPS deployment script
# Jalankan sekali setelah clone: chmod +x deploy.sh && ./deploy.sh
# Untuk update: ./deploy.sh update
# =============================================================================

set -e

ACTION=${1:-fresh}
INITIAL_MIGRATION="20261028000000_project_pb_reliability"

run_migrations() {
  local output
  if output=$(docker compose exec backend npx prisma migrate deploy 2>&1); then
    echo "$output"
    return 0
  fi
  echo "$output"
  if echo "$output" | grep -q "P3005"; then
    echo "Database lama terdeteksi. Terapkan migration awal dan buat baseline..."
    docker compose exec backend npx prisma db execute --file "prisma/migrations/$INITIAL_MIGRATION/migration.sql" --schema prisma/schema.prisma
    docker compose exec backend npx prisma migrate resolve --applied "$INITIAL_MIGRATION"
    docker compose exec backend npx prisma migrate deploy
    return 0
  fi
  return 1
}

echo "=== RubahRumah Deploy ($ACTION) ==="

# ── Pastikan .env ada ─────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env tidak ditemukan."
  echo "Salin dulu: cp .env.example .env && nano .env"
  exit 1
fi

if [ "$ACTION" = "fresh" ]; then
  # ── Fresh install (pertama kali) ────────────────────────────────────────────
  echo "[1/3] Build & start containers..."
  docker compose up -d --build

  echo "[2/3] Tunggu database ready..."
  sleep 5

  echo "[3/3] Jalankan Prisma migrate & seed..."
  run_migrations
  docker compose exec backend npm run seed
  docker compose exec backend npm run update:projek-access
  docker compose exec backend npm run sync-addendum-access

  echo ""
  echo "✓ Deploy selesai!"
  echo "  Backend : http://$(hostname -I | awk '{print $1}'):8000"
  echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"

elif [ "$ACTION" = "update" ]; then
  # ── Update dari git ──────────────────────────────────────────────────────────
  echo "[1/4] Pull latest code..."
  git pull

  echo "[2/4] Rebuild containers..."
  docker compose up -d --build --no-deps

  echo "[3/4] Jalankan Prisma migrate..."
  run_migrations

  echo "[3.5/4] Sinkronisasi akses Addendum..."
  docker compose exec backend npm run update:projek-access
  docker compose exec backend npm run sync-addendum-access

  echo "[4/4] Restart services..."
  docker compose restart backend frontend

  echo "✓ Update selesai!"

else
  echo "Usage: ./deploy.sh [fresh|update]"
  exit 1
fi
