"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Server, CheckCircle, AlertCircle, Info, Globe, Lock, Zap } from "lucide-react";

// ── Reusable Components ───────────────────────────────────────────────────────
function StepCard({ step, title, children }: { step: number | string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
        {step}
      </div>
      <div className="flex-1 pb-6 border-l-2 border-slate-200 pl-4 -mt-1">
        <p className="font-semibold text-sm mb-2">{title}</p>
        <div className="text-sm text-muted-foreground space-y-1">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="mt-2 mb-2 rounded-md overflow-hidden">
      {title && (
        <div className="bg-slate-700 px-3 py-1.5 text-xs text-slate-300 font-mono">{title}</div>
      )}
      <div className="bg-slate-900 px-4 py-3">
        <code className="text-xs text-green-400 whitespace-pre-wrap font-mono">{children}</code>
      </div>
    </div>
  );
}

function InfoBox({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };
  const Icon = type === "warning" ? AlertCircle : type === "success" ? CheckCircle : Info;
  return (
    <div className={`flex gap-2 rounded-md border p-3 text-sm my-2 ${styles[type]}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────
export default function TutorialDeploymentPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Tutorial Deployment</h1>
          <p className="text-sm text-muted-foreground">
            Panduan lengkap deploy aplikasi ke VPS dengan domain custom
          </p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Server, label: "VPS Ubuntu 22.04", desc: "Min. 2 vCPU, 2 GB RAM", color: "#64748b" },
          { icon: Globe, label: "Domain & DNS", desc: "Pointing via A Record", color: "#0ea5e9" },
          { icon: Lock, label: "SSL Gratis", desc: "Let's Encrypt via Certbot", color: "#10b981" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: item.color + "20", color: item.color }}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 1: Server Setup */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-700 text-white text-xs">01</Badge>
            <CardTitle className="text-base">Persiapan VPS & Paket Dasar</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Login ke VPS via SSH">
            <CodeBlock>{`ssh root@your-vps-ip`}</CodeBlock>
            <p>Ganti password root jika diminta.</p>
          </StepCard>

          <StepCard step={2} title="Update sistem & install paket dasar">
            <CodeBlock>{`apt update && apt upgrade -y
apt install -y curl git wget nano ufw nginx`}</CodeBlock>
          </StepCard>

          <StepCard step={3} title="Install Node.js 20 LTS">
            <CodeBlock>{`curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # pastikan v20.x
npm -v`}</CodeBlock>
          </StepCard>

          <StepCard step={4} title="Install PM2 (Process Manager)">
            <CodeBlock>{`npm install -g pm2
pm2 startup   # ikuti instruksi yang muncul untuk auto-start saat reboot`}</CodeBlock>
          </StepCard>

          <StepCard step={5} title="Install PostgreSQL 16">
            <CodeBlock>{`apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql`}</CodeBlock>
          </StepCard>

          <StepCard step={6} title="Setup Database PostgreSQL">
            <CodeBlock>{`# Masuk ke postgres shell
sudo -u postgres psql

# Di dalam psql:
CREATE USER stockopname WITH PASSWORD 'stockopname_secret_2026';
CREATE DATABASE stockopname OWNER stockopname;
GRANT ALL PRIVILEGES ON DATABASE stockopname TO stockopname;
\\q`}</CodeBlock>
          </StepCard>
        </CardContent>
      </Card>

      {/* Section 2: Clone & Build */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-700 text-white text-xs">02</Badge>
            <CardTitle className="text-base">Clone Repositori & Build Aplikasi</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Clone repository">
            <CodeBlock>{`cd /var/www
git clone https://github.com/your-username/rubahrumah.git
cd rubahrumah`}</CodeBlock>
          </StepCard>

          <StepCard step={2} title="Setup Backend">
            <CodeBlock title="/var/www/rubahrumah/new-app/backend/.env">{`APP_NAME=StockOpname API
DEBUG=false
SECRET_KEY=change-this-to-random-64-char-string

DATABASE_URL=postgresql://stockopname:stockopname_secret_2026@localhost:5432/stockopname

JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=30

CORS_ORIGINS=https://yourdomain.com
CORS_ALLOW_ALL=false

APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
PORT=8000`}</CodeBlock>
            <CodeBlock>{`cd new-app/backend
npm install
npx prisma migrate deploy
npx prisma db seed   # (opsional) seed data awal
npm run build 2>/dev/null || true`}</CodeBlock>
          </StepCard>

          <StepCard step={3} title="Jalankan Backend dengan PM2">
            <CodeBlock>{`cd /var/www/rubahrumah/new-app/backend
pm2 start "npx ts-node-dev --respawn --transpile-only src/index.ts" --name "rubahrumah-backend"
pm2 save`}</CodeBlock>
            <InfoBox type="info">
              Untuk produksi lebih stabil, compile dulu dengan <code className="text-xs bg-white/50 px-1 rounded">tsc</code> lalu jalankan <code className="text-xs bg-white/50 px-1 rounded">node dist/index.js</code>.
            </InfoBox>
          </StepCard>

          <StepCard step={4} title="Setup Frontend">
            <CodeBlock title="/var/www/rubahrumah/new-app/frontend/.env.local">{`NEXT_PUBLIC_API_URL=https://api.yourdomain.com`}</CodeBlock>
            <CodeBlock>{`cd /var/www/rubahrumah/new-app/frontend
npm install
npm run build`}</CodeBlock>
          </StepCard>

          <StepCard step={5} title="Jalankan Frontend dengan PM2">
            <CodeBlock>{`pm2 start "npm start" --name "rubahrumah-frontend" -- --port 3000
pm2 save`}</CodeBlock>
          </StepCard>
        </CardContent>
      </Card>

      {/* Section 3: Nginx */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-700 text-white text-xs">03</Badge>
            <CardTitle className="text-base">Konfigurasi Nginx (Reverse Proxy)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Buat konfigurasi Nginx untuk Frontend">
            <CodeBlock title="/etc/nginx/sites-available/rubahrumah-frontend">{`server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}</CodeBlock>
          </StepCard>

          <StepCard step={2} title="Buat konfigurasi Nginx untuk Backend API">
            <CodeBlock title="/etc/nginx/sites-available/rubahrumah-api">{`server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}</CodeBlock>
          </StepCard>

          <StepCard step={3} title="Aktifkan konfigurasi & test Nginx">
            <CodeBlock>{`# Enable sites
ln -s /etc/nginx/sites-available/rubahrumah-frontend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/rubahrumah-api /etc/nginx/sites-enabled/

# Test konfigurasi
nginx -t

# Reload Nginx
systemctl reload nginx`}</CodeBlock>
          </StepCard>
        </CardContent>
      </Card>

      {/* Section 4: Domain */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-600 text-white text-xs">04</Badge>
            <CardTitle className="text-base">Pointing Domain ke VPS</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Dapatkan IP VPS">
            <p>Catat IP Public VPS Anda (contoh: <Badge variant="outline">103.xx.xx.xx</Badge>).</p>
            <p className="mt-1">Bisa dilihat di dashboard provider VPS (DigitalOcean, Vultr, Niagahoster, dll).</p>
          </StepCard>

          <StepCard step={2} title="Tambahkan DNS Record di Registrar Domain">
            <p>Login ke panel domain Anda (Niagahoster, Cloudflare, GoDaddy, dll) → DNS Management.</p>
            <p className="mt-2">Tambahkan record berikut:</p>
            <div className="mt-2 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border px-2 py-1.5 text-left">Type</th>
                    <th className="border px-2 py-1.5 text-left">Name/Host</th>
                    <th className="border px-2 py-1.5 text-left">Value</th>
                    <th className="border px-2 py-1.5 text-left">TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["A", "@ (atau yourdomain.com)", "103.xx.xx.xx (IP VPS)", "Auto"],
                    ["A", "www", "103.xx.xx.xx (IP VPS)", "Auto"],
                    ["A", "api", "103.xx.xx.xx (IP VPS)", "Auto"],
                  ].map(([type, name, value, ttl], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                      <td className="border px-2 py-1.5 font-mono font-bold text-blue-600">{type}</td>
                      <td className="border px-2 py-1.5 font-mono">{name}</td>
                      <td className="border px-2 py-1.5 font-mono">{value}</td>
                      <td className="border px-2 py-1.5">{ttl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InfoBox type="info">
              Propagasi DNS bisa memakan waktu 1-48 jam. Untuk mempercepat, gunakan Cloudflare sebagai nameserver — propagasi hanya beberapa menit.
            </InfoBox>
          </StepCard>

          <StepCard step={3} title="Verifikasi Propagasi DNS">
            <CodeBlock>{`# Cek dari VPS
nslookup yourdomain.com
dig yourdomain.com A

# Atau cek online di: dnschecker.org`}</CodeBlock>
            <p>Jika menampilkan IP VPS Anda, propagasi selesai.</p>
          </StepCard>
        </CardContent>
      </Card>

      {/* Section 5: SSL */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white text-xs">05</Badge>
            <CardTitle className="text-base">SSL dengan Let&apos;s Encrypt (HTTPS Gratis)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Install Certbot">
            <CodeBlock>{`apt install -y certbot python3-certbot-nginx`}</CodeBlock>
          </StepCard>

          <StepCard step={2} title="Generate SSL Certificate">
            <CodeBlock>{`certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Ikuti instruksi:
# - Isi email untuk notifikasi expiry
# - Setujui Terms of Service (ketik A)
# - Pilih redirect HTTP ke HTTPS (pilih 2)`}</CodeBlock>
          </StepCard>

          <StepCard step={3} title="Auto-renewal SSL">
            <CodeBlock>{`# Test renewal
certbot renew --dry-run

# Certbot otomatis membuat cron job, verifikasi:
systemctl status certbot.timer`}</CodeBlock>
            <InfoBox type="success">
              Setelah sukses, akses <strong>https://yourdomain.com</strong> dan <strong>https://api.yourdomain.com</strong> sudah menggunakan HTTPS. Sertifikat otomatis diperbarui setiap 90 hari.
            </InfoBox>
          </StepCard>
        </CardContent>
      </Card>

      {/* Section 6: Firewall */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 text-white text-xs">06</Badge>
            <CardTitle className="text-base">Konfigurasi Firewall (UFW)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Setup UFW Firewall">
            <CodeBlock>{`# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Blok direct access ke port aplikasi (opsional tapi recommended)
ufw deny 3000
ufw deny 8000

# Aktifkan firewall
ufw enable

# Cek status
ufw status`}</CodeBlock>
            <InfoBox type="warning">
              Pastikan port 22 (SSH) sudah di-allow SEBELUM mengaktifkan UFW, agar tidak terkunci dari server.
            </InfoBox>
          </StepCard>
        </CardContent>
      </Card>

      {/* Section 7: Maintenance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Update Aplikasi & Perintah Berguna</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Aplikasi Setelah Push Code</p>
              <CodeBlock>{`cd /var/www/rubahrumah
git pull origin main

# Update backend
cd new-app/backend
npm install
npx prisma migrate deploy
pm2 restart rubahrumah-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart rubahrumah-frontend`}</CodeBlock>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Perintah PM2 Berguna</p>
              <CodeBlock>{`pm2 list                        # Lihat semua proses
pm2 logs rubahrumah-backend    # Lihat log backend real-time
pm2 logs rubahrumah-frontend   # Lihat log frontend real-time
pm2 monit                      # Monitor CPU/RAM
pm2 restart all                # Restart semua proses
pm2 stop all                   # Stop semua proses`}</CodeBlock>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Backup Database</p>
              <CodeBlock>{`# Backup manual
pg_dump -U stockopname -h localhost stockopname > backup-$(date +%Y%m%d).sql

# Restore
psql -U stockopname -h localhost stockopname < backup-20260101.sql`}</CodeBlock>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cek Status Layanan</p>
              <CodeBlock>{`systemctl status nginx        # Status Nginx
systemctl status postgresql   # Status PostgreSQL
pm2 list                      # Status Node.js apps
ufw status                    # Status Firewall`}</CodeBlock>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base text-green-800">Checklist Deployment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "VPS aktif, dapat di-SSH",
              "Node.js 20 dan PM2 terinstall",
              "PostgreSQL running, database dibuat",
              "Backend berjalan di port 8000",
              "Frontend build sukses, berjalan di port 3000",
              "Nginx configured dan aktif",
              "DNS A Record pointing ke IP VPS",
              "SSL certificate aktif (HTTPS hijau)",
              "Firewall UFW aktif",
              "PM2 startup tersimpan (persist reboot)",
              "File .env production sudah diisi",
              "Prisma migrate sudah dijalankan",
            ].map((item, i) => (
              <div key={i} className="flex gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
