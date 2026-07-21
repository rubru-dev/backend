# Skrip Deploy RubahRumah + Evolution API (WhatsApp)

Urutan dari atas ke bawah. Jalankan satu per satu, jangan dilompati.

- **Laptop** = mesin lokal kamu
- **VPS** = `ssh root@103.16.117.74`
- Path repo di VPS: `/var/www/backend`
- PM2: `jobdesk-backend`, `jobdesk-frontend`, `evolution-api`
- Database app: `jobdesk_db` (user `appuser`)

---

## A. Push kode dari laptop

```bash
cd "C:/Users/jerry/OneDrive/Dokumen/Project-RubahRumah/Backend Rubahrumah"
git add -A
git commit -m "update fitur"
git push origin main
```

---

## B. Deploy kode di VPS

SSH dulu:
```bash
ssh root@103.16.117.74
```

Lalu jalankan (satu baris, copy semua):
```bash
pg_dump -U appuser -h localhost -d jobdesk_db > /root/backup_$(date +%Y%m%d_%H%M%S).sql && cd /var/www/backend && git stash && git pull origin main && cd new-app/backend && npx prisma db push --accept-data-loss && npm install && npm run build && pm2 restart jobdesk-backend --update-env && cd ../frontend && npm install && npm run build && pm2 restart jobdesk-frontend --update-env
```

**Penting:**
- `--accept-data-loss` **wajib pada deploy pertama**. Tanpa itu `prisma db push` berhenti error, dan semua perintah setelahnya (`npm run build`, `pm2 restart`) **tidak jalan** → kode lama tetap dipakai (ini penyebab "fix tidak ngefek" selama ini).
- Perintah ini **sekaligus membuat tabel `wa_inbound_messages`** (untuk WhatsApp pesan masuk). Tidak perlu bikin tabel manual.
- Deploy berikutnya boleh tanpa `--accept-data-loss`.

Selesai bagian ini → bug **auto-timeline desain, penawaran, projek desain** sudah normal.

---

## C. Install Evolution API di VPS

### C1. Buat database Evolution
`appuser` tidak punya izin bikin database, jadi pakai superuser dulu:
```bash
sudo -u postgres psql -c "CREATE DATABASE evolution_api OWNER appuser;"
```
Sukses kalau muncul `CREATE DATABASE`.

### C2. Jalankan script setup
```bash
bash /var/www/backend/new-app/setup-evolution-vps.sh
```
- Diminta **password `appuser`** → masukkan.
- `npm install` agak lama (2–4 menit), tunggu saja.

Script ini otomatis: clone Evolution → konfigurasi `.env` (Redis dimatikan) → migrasi schema → jalankan via PM2 → cek hidup di `http://localhost:8080`.

### C3. Catat output-nya
Di akhir muncul 5 baris seperti ini (angkanya beda-beda):
```
WA_PROVIDER=evolution
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=evo-xxxxxxxxxxxxxxxx
EVOLUTION_INSTANCE=rubahrumah
EVOLUTION_WEBHOOK_TOKEN=wh-xxxxxxxxxxxx
```
**Copy 5 baris itu.**

> API key Evolution **dibuat sendiri oleh script** (bukan dari vendor). Kalau output-nya kelewat:
> ```bash
> grep '^AUTHENTICATION_API_KEY=' /var/www/evolution-api/.env
> ```

---

## D. Daftarkan ke `.env` backend

```bash
nano /var/www/backend/new-app/backend/.env
```

Tempel 5 baris dari langkah C3 di baris paling bawah. Simpan: `Ctrl+O` → `Enter` → `Ctrl+X`.

Restart backend supaya `.env` terbaca:
```bash
pm2 restart jobdesk-backend --update-env
```

> `.env` **tidak ikut git** (sengaja, karena berisi rahasia). Jadi memang harus diisi manual di VPS.

---

## E. Sambungkan WhatsApp (scan QR)

1. Buka aplikasi produksi di browser.
2. Masuk **Pengaturan → GET QR Whatsapp**.
3. Ketik nomor pengirim: `6281994031608`
4. Klik **Munculkan QR**.
5. Di HP: **WhatsApp → Perangkat Tertaut → Tautkan Perangkat** → scan.
6. Status berubah jadi **Tersambung**.

Webhook pesan masuk terdaftar otomatis. Tidak perlu curl manual.

---

## F. Tes

- **Pengaturan → GET QR Whatsapp → Test Kirim Pesan** → isi nomor + pesan → Kirim.
- **Pengaturan → Reminder Rules** → tombol **Test** di salah satu rule.

Semua reminder (harian, absen masuk/keluar, event) sekarang lewat Evolution. Fonnte sudah tidak dipakai.

---

## Deploy berikutnya (rutin)

Cukup ini di VPS:
```bash
cd /var/www/backend/new-app && ./deploy-pm2.sh
```
Kalau belum executable: `chmod +x /var/www/backend/new-app/deploy-pm2.sh`

Script ini berhenti dengan pesan jelas kalau ada langkah gagal — tidak diam-diam skip build lalu restart kode lama.

---

## Kalau error

| Error | Solusi |
|---|---|
| `prisma db push` minta `--accept-data-loss` | Tambahkan flag itu (lihat bagian B) |
| `Tidak bisa membuat database evolution_api` | Jalankan C1 dulu |
| Tab GET QR bilang "Evolution belum dikonfigurasi" | `.env` backend belum diisi / belum restart → ulangi bagian D |
| QR tidak muncul / kedaluwarsa | Klik **Refresh QR** |
| Evolution tidak jalan | `pm2 logs evolution-api --lines 40` |
| Backend error | `pm2 logs jobdesk-backend --lines 40` |

Cek semua proses hidup:
```bash
pm2 list
```
Harus ada: `jobdesk-backend`, `jobdesk-frontend`, `evolution-api` — semuanya `online`.
