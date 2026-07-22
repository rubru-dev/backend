# Skrip Deploy RubahRumah

WhatsApp gateway aplikasi ini memakai Fonnte saja.

## Backend `.env`

```env
FONNTE_TOKEN=
FONNTE_API_URL=https://api.fonnte.com/send
```

Konfigurasi Fonnte juga bisa disimpan dari menu Admin > Pengaturan > Fonnte. Nilai dari database dipakai lebih dulu; `.env` menjadi fallback.

## Restart Produksi

```bash
cd /var/www/backend/new-app/backend
npm install
npm run build
pm2 restart jobdesk-backend --update-env
```
