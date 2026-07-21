# Cara Deploy — Local ke VPS

## TL;DR

```bash
# 1. DI LAPTOP
git add . && git commit -m "pesan" && git push origin main

# 2. DI VPS (setelah SSH)
cd /var/www/backend/new-app && git pull && ./deploy-pm2.sh
```

Selesai. Sisanya di bawah cuma penjelasan + setup sekali-seumur-hidup.

---

## A. Di Laptop (Local)

```bash
cd "C:\Users\jerry\OneDrive\Dokumen\Project-RubahRumah\Backend Rubahrumah"
git add .
git commit -m "deskripsi perubahan"
git push origin main
```

**Test dulu di lokal sebelum push** (opsional tapi disarankan):
```bash
cd new-app/backend  && npm run dev    # backend :8000
cd new-app/frontend && npm run dev    # frontend :3000
```

> ⚠️ **Backend lokal WAJIB di-restart tiap ganti kode/.env** — hot-reload nggak jalan di folder OneDrive. Kalau fix "nggak ngefek", biasanya server masih pakai proses lama.

---

## B. Di VPS

```bash
ssh user@ip-vps
cd /var/www/backend/new-app
git pull
./deploy-pm2.sh
```

Skrip otomatis: `git pull` → **backup DB** → `npm install` → `prisma generate` → `prisma db push` → **`npm run build`** → `pm2 restart` (backend + frontend).

### Kalau muncul error minta `--force-db`

Artinya Prisma mau ubah schema DB dan minta persetujuan. **Baca dulu peringatannya:**

- Kalau cuma **nambah** tabel/index → aman:
  ```bash
  ./deploy-pm2.sh --force-db
  ```
- Kalau ada kata **DROP / kolom akan dihapus** → **JANGAN**. Lapor dulu.

### Flag lain

| Flag | Fungsi |
|---|---|
| `--force-db` | Izinkan `prisma db push --accept-data-loss` |
| `--skip-db` | Lewati langkah Prisma |
| `--skip-backup` | Lewati backup DB |
| `--backend-only` | Backend saja |
| `--frontend-only` | Frontend saja |

---

## C. Setup Sekali Saja

### C1. Kenapa dulu deploy sering "nggak ngefek"

`pm2 restart` **tidak** me-rebuild. Produksi jalan dari hasil compile (`dist/` & `.next/`).
Command lama kamu juga **tanpa `git pull`** dan **mati diam-diam** di `prisma db push`
(karena `&&`), jadi build & restart nggak pernah jalan. `deploy-pm2.sh` sudah menutup ketiganya.

### C2. WhatsApp (Evolution API)

**1) Isi `.env` backend:**
```bash
nano /var/www/backend/new-app/backend/.env
```
```env
WA_PROVIDER=evolution
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=isi-random-panjang
EVOLUTION_INSTANCE=rubahrumah
EVOLUTION_WEBHOOK_TOKEN=isi-token-random
APP_URL=http://localhost:8000
```

**2) Install Evolution API:**
```bash
cd /var/www
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
npm install
psql -U postgres -h localhost -c "CREATE DATABASE evolution_api;"
cp env.example .env
nano .env
```
Isi `.env` Evolution:
```env
SERVER_PORT=8080
AUTHENTICATION_API_KEY=isi-random-panjang     # SAMA dengan EVOLUTION_API_KEY di backend
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://USER:PASS@localhost:5432/evolution_api
DATABASE_CONNECTION_CLIENT_NAME=evolution
CACHE_REDIS_ENABLED=false
CACHE_LOCAL_ENABLED=true
```
Jalankan:
```bash
npm run db:deploy
npm run db:generate
pm2 start "npm run start" --name evolution-api
pm2 save
```

**3) Scan QR dari aplikasi:**
Buka **Pengaturan → GET QR Whatsapp** → ketik nomor pengirim (`6281994031608`) →
klik **Munculkan QR** → scan di HP (WhatsApp → Perangkat Tertaut).
Webhook pesan masuk otomatis terdaftar.

> Semua reminder (Reminder Rules, absen masuk/keluar, laporan harian, event)
> otomatis lewat Evolution. **Fonnte sudah tidak dipakai.**

---

## D. Kalau Bermasalah

| Gejala | Cek |
|---|---|
| Fix nggak muncul di production | `npm run build` beneran jalan? Jalankan `./deploy-pm2.sh` (jangan `pm2 restart` doang) |
| "Evolution API belum dikonfigurasi" | `.env` backend sudah ada `EVOLUTION_*`? Sudah `pm2 restart jobdesk-backend`? |
| WhatsApp nggak kirim | `pm2 logs evolution-api` — instance masih `open`? Kalau `close`, scan ulang QR |
| Deploy berhenti di Prisma | Baca peringatannya. Aman → `--force-db`. Ada DROP → jangan, lapor dulu |
| Backend nggak nyala | `pm2 logs jobdesk-backend --lines 50` |

### Perintah berguna
```bash
pm2 list                              # status semua proses
pm2 logs jobdesk-backend --lines 50   # log backend
pm2 restart jobdesk-backend           # restart backend
```

### Info sistem

| Item | Nilai |
|---|---|
| Path app | `/var/www/backend/new-app` |
| PM2 backend | `jobdesk-backend` (port 8000) |
| PM2 frontend | `jobdesk-frontend` (port 3000) |
| PM2 evolution | `evolution-api` (port 8080) |
| Database | `jobdesk_db` (user `appuser`) |
| Backup DB | `/root/jobdesk_db-<tanggal>.sql.gz` |
