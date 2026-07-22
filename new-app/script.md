# Deploy New App

WhatsApp notification/reminder memakai Fonnte saja.

## Fonnte

Set environment backend:

```env
FONNTE_TOKEN=
FONNTE_API_URL=https://api.fonnte.com/send
```

Atau isi dari dashboard: Admin > Pengaturan > Fonnte.

## Build

```bash
cd /var/www/backend/new-app/backend
npm install
npm run build
pm2 restart jobdesk-backend --update-env

cd /var/www/backend/new-app/frontend
npm install
npm run build
pm2 restart jobdesk-frontend --update-env
```
