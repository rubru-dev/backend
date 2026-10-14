# Deployment Ruangkeruang

Target publik:

```text
https://ruangkeruang.rubru.id
```

## DNS

Buat record DNS berikut pada pengelola domain `rubru.id`:

```text
Type: A
Name: ruangkeruang
Value: IP_VPS
```

Jika server memakai IPv6, tambahkan record AAAA yang sesuai.

## Environment

Salin `.env.production.example` menjadi `.env.production` dan sesuaikan alamat API jika hostname API production berbeda.

Backend perlu mengizinkan origin berikut melalui `CORS_ORIGINS`:

```text
https://ruangkeruang.rubru.id
```

## Menjalankan aplikasi

```bash
cd /var/www/backend/Ruangkeruang-Website
npm ci
npm run build
PORT=3010 npm start
```

Gunakan process manager seperti PM2 agar proses otomatis hidup kembali:

```bash
pm2 start npm --name ruangkeruang-website -- start
pm2 save
```

## Reverse proxy dan SSL

Salin `deploy/nginx-ruangkeruang.rubru.id.conf.example` ke konfigurasi Nginx, reload Nginx, lalu terbitkan sertifikat:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d ruangkeruang.rubru.id
```

Root subdomain langsung membuka homepage. Path lama `/ruangkeruang/site` tetap tersedia untuk kompatibilitas link yang sudah terlanjur dibuat.
