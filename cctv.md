```
Saya ingin mengimplementasikan fitur CCTV live streaming on-demand di project ini (Next.js + Express + Prisma + PostgreSQL) untuk dicoba di LOCAL dulu.

## Konteks UI yang sudah ada:
- Admin page: tab "CCTV Online" di halaman client detail → ada tombol "Tambah Kamera"
- Client page: halaman "Pantau Online" → saat ini kosong dengan pesan "gunakan aplikasi Tapo"
- Goal: Client klik tombol Play → video CCTV langsung muncul di browser tanpa install app apapun

## Setup Local (bukan production):
- MediaMTX berjalan di localhost port 8888 (HLS) dan 9997 (API)
- Tidak perlu SSL/HTTPS untuk local
- Tidak perlu Nginx untuk local
- Base URL HLS: `http://localhost:8888`
- Base URL WebRTC: `http://localhost:8889`
- MediaMTX API: `http://localhost:9997`

## LANGKAH PERTAMA - Download & Setup MediaMTX:
Sebelum implementasi kode, download dan setup MediaMTX dulu menggunakan bash:

```bash
# Deteksi OS dan architecture, lalu download MediaMTX versi terbaru
# Jalankan script ini dari root project

# Untuk Linux/Mac:
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi
if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi

VERSION=$(curl -s https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep tag_name | cut -d '"' -f 4)

echo "Downloading MediaMTX $VERSION for $OS/$ARCH..."
curl -L "https://github.com/bluenviron/mediamtx/releases/download/${VERSION}/mediamtx_${VERSION}_${OS}_${ARCH}.tar.gz" -o mediamtx.tar.gz
tar -xzf mediamtx.tar.gz mediamtx
rm mediamtx.tar.gz
chmod +x mediamtx
echo "MediaMTX downloaded successfully!"
```

Jika OS Windows, download menggunakan PowerShell:
```powershell
$version = (Invoke-RestMethod "https://api.github.com/repos/bluenviron/mediamtx/releases/latest").tag_name
$url = "https://github.com/bluenviron/mediamtx/releases/download/$version/mediamtx_${version}_windows_amd64.zip"
Invoke-WebRequest -Uri $url -OutFile "mediamtx.zip"
Expand-Archive -Path "mediamtx.zip" -DestinationPath "." -Force
Remove-Item "mediamtx.zip"
Write-Host "MediaMTX downloaded successfully!"
```

Setelah download, deteksi OS project ini berjalan dan jalankan download yang sesuai.
Simpan binary `mediamtx` (atau `mediamtx.exe` untuk Windows) di root project.
Tambahkan `mediamtx`, `mediamtx.exe`, `mediamtx.tar.gz`, `mediamtx.zip` ke `.gitignore`.

## Yang perlu diimplementasikan:

### 1. Buat mediamtx.yml di root project:
```yaml
hlsAddress: :8888
hlsAlwaysRemux: yes
hlsSegmentCount: 3
hlsSegmentDuration: 1s

webrtcAddress: :8889

api: yes
apiAddress: :9997

paths:
  ~^.*$:
    sourceOnDemand: yes
    sourceOnDemandStartTimeout: 10s
    sourceOnDemandCloseAfter: 10s
```

### 2. Update package.json scripts
Tambahkan script untuk menjalankan MediaMTX bersamaan dengan dev server.
Install concurrently jika belum ada: `npm install concurrently --save-dev`

Tambahkan ke scripts di package.json:
```json
"mediamtx": "./mediamtx mediamtx.yml",
"dev:cctv": "concurrently \"npm run dev\" \"npm run mediamtx\""
```

Untuk Windows tambahkan juga:
```json
"mediamtx:win": "mediamtx.exe mediamtx.yml",
"dev:cctv:win": "concurrently \"npm run dev\" \"npm run mediamtx:win\""
```

Sehingga untuk test local cukup jalankan `npm run dev:cctv`.

### 3. Environment variables
Tambahkan ke `.env` (append saja, jangan overwrite yang sudah ada):
```
MEDIAMTX_API_URL=http://localhost:9997
MEDIAMTX_HLS_BASE_URL=http://localhost:8888
MEDIAMTX_WEBRTC_BASE_URL=http://localhost:8889
```

### 4. Database schema (Prisma)
Cek apakah sudah ada model Camera. Jika belum, tambahkan:
```prisma
model Camera {
  id          String   @id @default(cuid())
  name        String
  rtspUrl     String
  streamPath  String   @unique
  isActive    Boolean  @default(true)
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```
Jika model Camera sudah ada, sesuaikan — tambahkan field yang belum ada saja.
Jalankan migration setelah perubahan schema.

### 5. Backend Express - Camera routes
Buat atau update route kamera, ikuti struktur folder dan pattern yang sudah ada di project.

**POST /api/cameras** — tambah kamera (admin only)
- Terima: `{ name, rtspUrl, projectId }`
- Generate streamPath: `cam_${projectId}_${Date.now()}`
- Simpan ke database
- Register ke MediaMTX API:
  `PATCH http://localhost:9997/v3/config/paths/add/{streamPath}`
  body: `{ "source": rtspUrl, "sourceOnDemand": true }`
- Return camera + hlsUrl: `http://localhost:8888/{streamPath}/index.m3u8`
- Jika MediaMTX tidak jalan, tetap simpan ke DB dan log warning saja (jangan error 500)

**GET /api/cameras?projectId=xxx** — list kamera per project
- Admin: semua project
- Client/User: hanya project miliknya
- Return list + hlsUrl per kamera

**DELETE /api/cameras/:id** — hapus kamera (admin only)
- Hapus dari DB
- Unregister dari MediaMTX: `DELETE http://localhost:9997/v3/config/paths/remove/{streamPath}`
- Jika MediaMTX tidak jalan, tetap hapus dari DB

**PATCH /api/cameras/:id** — update nama/rtspUrl (admin only)
- Update DB
- Jika rtspUrl berubah, update di MediaMTX juga

### 6. Sync kamera saat server start
Buat function `syncCamerasToMediaMTX()`:
- Ambil semua kamera aktif dari DB
- Register ulang ke MediaMTX
- Wrap dengan try/catch — jika MediaMTX belum jalan, log warning dan lanjut
- Panggil di entry point Express setelah DB connect

### 7. Install hls.js
```bash
npm install hls.js
```

### 8. Buat komponen CameraPlayer
Buat komponen `CameraPlayer` (sesuaikan lokasi dengan struktur folder project):
- Props: `hlsUrl: string`, `cameraName: string`
- Default state: placeholder gelap dengan icon play di tengah + nama kamera
- Klik play → inisialisasi Hls.js → attach ke `<video>` element
- Loading state: spinner dengan teks "Menghubungkan ke kamera..."
- Error state: icon error + teks "Kamera tidak dapat dijangkau. Pastikan MediaMTX berjalan."
- Saat unmount → destroy Hls instance
- Badge "LIVE" merah muncul saat stream aktif
- Tombol fullscreen
- HLS URL format: `http://localhost:8888/{streamPath}/index.m3u8`

### 9. Update halaman client Monitoring (PRIORITAS UTAMA)
Cari halaman "Pantau Online" di client portal.

**Empty state (belum ada kamera):**
- Icon kamera
- Teks: "Kamera belum dipasang"
- Subtext: "Tim kami akan segera memasang kamera CCTV di lokasi proyek Anda"
- HAPUS pesan lama tentang Tapo app

**Ada kamera:**
- Grid layout: 1 kolom mobile, 2 kolom tablet, 3 kolom desktop
- Render komponen CameraPlayer per kamera
- Fetch dari GET /api/cameras?projectId={projectId}

### 10. Update halaman admin tab CCTV Online
Cari komponen tab "CCTV Online" di halaman admin client detail.
Update form tambah kamera:
- Field: Nama Kamera, RTSP URL
- Placeholder RTSP: `rtsp://admin:password@192.168.1.x/stream1`
- Validasi: RTSP URL harus diawali `rtsp://`
- Submit → POST /api/cameras
- Tampilkan list kamera yang sudah ditambahkan
- Setiap item: nama kamera, streamPath, tombol hapus
- Tambahkan note: "Untuk testing tanpa kamera fisik, gunakan RTSP publik: rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov"

## Catatan penting:
- Scan struktur project dulu sebelum buat file baru
- Ikuti pattern, naming convention, dan struktur folder yang sudah ada
- Semua error dari MediaMTX API harus di-handle gracefully — jangan crash server jika MediaMTX belum jalan
- Untuk testing local tanpa kamera fisik gunakan RTSP dummy publik:
  `rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov`
- Jangan ubah auth/middleware yang sudah ada

## Urutan implementasi:
1. Download MediaMTX binary sesuai OS
2. Tambahkan ke .gitignore
3. Buat mediamtx.yml
4. Update package.json scripts + install concurrently
5. Tambah env variables ke .env
6. Scan struktur project
7. Update Prisma schema + migration
8. Buat backend routes /api/cameras
9. Buat syncCamerasToMediaMTX + panggil di server start
10. Install hls.js
11. Buat komponen CameraPlayer
12. Update halaman admin tab CCTV Online
13. Update halaman client /monitoring

Mulai dari download MediaMTX dulu, lalu scan struktur project.
```

---

Setelah Claude Code selesai, test dengan jalankan:
```bash
npm run dev:cctv
```

Lalu di admin, tambah kamera dengan RTSP dummy `rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov` untuk test tanpa kamera fisik. Kalau ada error share di sini!