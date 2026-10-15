# Deployment Ruangkeruang

Target publik:

```text
https://ruangkeruang.com
```

## DNS

Buat record DNS berikut pada pengelola domain `ruangkeruang.com`:

```text
Type: A
Name: @
Value: 103.16.117.74

Type: A
Name: www
Value: 103.16.117.74
```

Jika server memakai IPv6, tambahkan record AAAA yang sesuai.

## Environment

Salin `.env.production.example` menjadi `.env.production` dan sesuaikan alamat API jika hostname API production berbeda.

API backend juga harus memiliki hostname publik. Project ini menggunakan `api.rubru.id` sebagai alamat API, sehingga buat record DNS berikut bila belum ada:

```text
Type: A
Name: api (pada rubru.id)
Value: 103.16.117.74
```

Backend perlu mengizinkan origin berikut melalui `CORS_ORIGINS`:

```text
https://ruangkeruang.com,https://www.ruangkeruang.com
```

## Menjalankan aplikasi

```bash
cd /var/www/backend/Ruangkeruang-Website
npm ci
cp .env.production.example .env.production
# Pastikan NEXT_PUBLIC_API_URL menunjuk ke API production sebelum build.
npm run build
npm start
```

Gunakan process manager seperti PM2 agar proses otomatis hidup kembali:

```bash
pm2 start npm --name ruangkeruang-website -- start
pm2 save
```

## Reverse proxy dan SSL

Terbitkan sertifikat setelah DNS aktif. Cara standalone membutuhkan Nginx berhenti sementara agar port 80 tersedia:

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d ruangkeruang.com -d www.ruangkeruang.com
sudo systemctl start nginx
```

Aktifkan konfigurasi website:

```bash
sudo cp deploy/nginx-ruangkeruang.com.conf.example /etc/nginx/sites-available/ruangkeruang.com
sudo ln -s /etc/nginx/sites-available/ruangkeruang.com /etc/nginx/sites-enabled/ruangkeruang.com
sudo nginx -t
sudo systemctl reload nginx
```

Untuk API, terbitkan sertifikat dan aktifkan `deploy/nginx-api.rubru.id.conf.example` dengan pola yang sama setelah record `api.rubru.id` dibuat.

Domain utama langsung membuka homepage. Path lama `/ruangkeruang/site` tetap tersedia untuk kompatibilitas link yang sudah terlanjur dibuat.
