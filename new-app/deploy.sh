#!/bin/bash
# =============================================================================
# deploy.sh — VPS deployment script
# Jalankan sekali setelah clone: chmod +x deploy.sh && ./deploy.sh
# Untuk update: ./deploy.sh update
# =============================================================================

set -e

ACTION=${1:-fresh}

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
  docker compose exec backend npx prisma migrate deploy
  docker compose exec backend npm run seed

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
  docker compose exec backend npx prisma migrate deploy

  echo "[4/4] Restart services..."
  docker compose restart backend frontend

  echo "✓ Update selesai!"

else
  echo "Usage: ./deploy.sh [fresh|update]"
  exit 1
fi
