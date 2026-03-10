"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, AlertCircle, CheckCircle, Info } from "lucide-react";

// ── Reusable Components ───────────────────────────────────────────────────────
function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
        {step}
      </div>
      <div className="flex-1 pb-6 border-l-2 border-sky-100 pl-4 -mt-1">
        <p className="font-semibold text-sm mb-2">{title}</p>
        <div className="text-sm text-muted-foreground space-y-1">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-md bg-slate-900 px-4 py-3 mt-2 mb-2">
      <code className="text-xs text-green-400 whitespace-pre-wrap font-mono">{children}</code>
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
    <div className={`flex gap-2 rounded-md border p-3 text-sm ${styles[type]}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ── Meta API (Graph API / Facebook Login) ─────────────────────────────────────
function MetaApiTab() {
  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
            <p className="text-sm text-blue-700">
              Meta API (Graph API) digunakan untuk mengambil data organik dari Facebook Page dan Instagram Business Account — seperti followers, reach, engagement, dan post insights.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prasyarat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[
            "Akun Facebook (personal) — untuk login ke Meta Developer",
            "Facebook Page aktif (bukan profil personal)",
            "Instagram Business/Creator Account yang terhubung ke Facebook Page",
            "Akses Admin ke Page tersebut",
          ].map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Langkah Koneksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Buat App di Meta Developer">
            <p>Buka <Badge variant="outline">developers.facebook.com</Badge> → Login → klik <strong>My Apps → Create App</strong>.</p>
            <p className="mt-1">Pilih tipe: <strong>Business</strong> → isi nama app → klik Create App.</p>
          </StepCard>

          <StepCard step={2} title="Tambahkan Products ke App">
            <p>Di dashboard app, klik <strong>Add Product</strong>:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Facebook Login</strong> — untuk OAuth user</li>
              <li><strong>Instagram Graph API</strong> — untuk data Instagram</li>
            </ul>
            <p className="mt-1">Di Facebook Login → Settings → isi Valid OAuth Redirect URIs:</p>
            <CodeBlock>{`http://localhost:8000/auth/facebook/callback
https://yourdomain.com/auth/facebook/callback`}</CodeBlock>
          </StepCard>

          <StepCard step={3} title="Ambil App ID & App Secret">
            <p>Buka <strong>Settings → Basic</strong>:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Catat <Badge>App ID</Badge></li>
              <li>Klik <strong>Show</strong> pada App Secret → catat nilainya</li>
            </ul>
            <p className="mt-2">Isi di file <code className="text-xs bg-muted px-1 rounded">.env</code> backend:</p>
            <CodeBlock>{`INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret`}</CodeBlock>
          </StepCard>

          <StepCard step={4} title="Generate User Access Token">
            <p>Buka <strong>Tools → Graph API Explorer</strong>:</p>
            <ol className="list-decimal pl-4 mt-1 space-y-1">
              <li>Pilih app Anda di dropdown</li>
              <li>Klik <strong>Generate Access Token</strong></li>
              <li>Centang permissions: <code className="text-xs bg-muted px-1 rounded">pages_read_engagement, instagram_basic, instagram_manage_insights</code></li>
              <li>Klik Generate → copy token yang muncul</li>
            </ol>
          </StepCard>

          <StepCard step={5} title="Perpanjang Token (Long-lived)">
            <p>Token default hanya 1 jam. Perpanjang menjadi 60 hari:</p>
            <CodeBlock>{`GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}`}</CodeBlock>
            <InfoBox type="warning">
              Token 60 hari tetap expired. Untuk produksi, gunakan System User Token yang tidak expires melalui Meta Business Suite.
            </InfoBox>
          </StepCard>

          <StepCard step={6} title="Verifikasi Koneksi">
            <p>Test di Graph API Explorer:</p>
            <CodeBlock>{`GET /me?fields=id,name,accounts{name,access_token,instagram_business_account}`}</CodeBlock>
            <p>Jika berhasil, akan muncul daftar Page dan Instagram account yang terhubung.</p>
          </StepCard>
        </CardContent>
      </Card>

      <InfoBox type="success">
        Setelah token tersimpan di <code className="text-xs bg-muted px-1 rounded">.env</code>, restart backend. Data Instagram akan otomatis ditarik saat user membuka Dashboard Sosmed.
      </InfoBox>
    </div>
  );
}

// ── Meta Ads API ──────────────────────────────────────────────────────────────
function MetaAdsApiTab() {
  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
            <p className="text-sm text-blue-700">
              Meta Ads API digunakan untuk mengambil data performa iklan berbayar di Facebook/Instagram — seperti impressions, reach, clicks, spend, dan konversi per campaign/ad set.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prasyarat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[
            "Meta Business Account (business.facebook.com)",
            "Ad Account aktif (sudah pernah menjalankan iklan)",
            "Role: Admin atau Advertiser di Ad Account",
            "App Facebook Developer sudah dibuat (lihat Tab Meta API)",
          ].map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Langkah Koneksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Tambahkan Marketing API ke App">
            <p>Di Facebook Developer Dashboard → App Anda → <strong>Add Product → Marketing API</strong>.</p>
            <p className="mt-1">Aktifkan permissions: <code className="text-xs bg-muted px-1 rounded">ads_read, ads_management</code>.</p>
          </StepCard>

          <StepCard step={2} title="Dapatkan Ad Account ID">
            <p>Buka <strong>business.facebook.com → Settings → Ad Accounts</strong>.</p>
            <p className="mt-1">Catat Ad Account ID (format: <code className="text-xs bg-muted px-1 rounded">act_1234567890</code>).</p>
            <InfoBox type="info">
              Ad Account ID selalu diawali dengan <code>act_</code>. Pastikan Anda menyertakan prefiks ini.
            </InfoBox>
          </StepCard>

          <StepCard step={3} title="Generate System User Token (Rekomendasi)">
            <p>System User Token tidak expired dan lebih aman untuk produksi:</p>
            <ol className="list-decimal pl-4 mt-1 space-y-1">
              <li>Buka <strong>Business Settings → Users → System Users</strong></li>
              <li>Klik <strong>Add</strong> → beri nama (misal: "Report Rubru System")</li>
              <li>Assign Ad Account dengan role <strong>Analyst</strong></li>
              <li>Klik <strong>Generate New Token</strong> → pilih app Anda</li>
              <li>Centang: <code className="text-xs bg-muted px-1 rounded">ads_read, ads_management, read_insights</code></li>
              <li>Copy token yang dihasilkan</li>
            </ol>
          </StepCard>

          <StepCard step={4} title="Konfigurasi Environment">
            <p>Isi di <code className="text-xs bg-muted px-1 rounded">backend/.env</code>:</p>
            <CodeBlock>{`META_ADS_ACCESS_TOKEN=your_system_user_token
META_ADS_AD_ACCOUNT_ID=act_1234567890
META_ADS_API_VERSION=v21.0`}</CodeBlock>
          </StepCard>

          <StepCard step={5} title="Test Koneksi">
            <p>Jalankan di terminal atau Postman:</p>
            <CodeBlock>{`GET https://graph.facebook.com/v21.0/act_1234567890/campaigns
  ?fields=name,status,objective,spend
  &access_token=your_token`}</CodeBlock>
            <p>Jika berhasil, akan muncul daftar campaign aktif.</p>
          </StepCard>

          <StepCard step={6} title="Verifikasi di Aplikasi">
            <p>Buka <strong>BD → Meta Ads</strong> di aplikasi.</p>
            <p className="mt-1">Jika konfigurasi benar, data campaign akan tampil dalam beberapa detik.</p>
          </StepCard>
        </CardContent>
      </Card>

      <InfoBox type="warning">
        Jangan gunakan Personal Access Token di produksi. Selalu gunakan System User Token agar tidak bergantung pada akun personal yang bisa dinonaktifkan.
      </InfoBox>
    </div>
  );
}

// ── YouTube API ───────────────────────────────────────────────────────────────
function YoutubeApiTab() {
  return (
    <div className="space-y-4">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <p className="text-sm text-red-700">
              YouTube Data API v3 digunakan untuk mengambil statistik channel — subscribers, views, dan performa video terbaru.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prasyarat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[
            "Akun Google yang memiliki akses ke YouTube Channel",
            "Channel YouTube aktif (tidak perlu subscribers tertentu)",
            "Akses ke Google Cloud Console",
          ].map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Langkah Koneksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Buka Google Cloud Console">
            <p>Kunjungi <Badge variant="outline">console.cloud.google.com</Badge></p>
            <p className="mt-1">Login dengan akun Google → klik <strong>Select a Project → New Project</strong>.</p>
            <p>Beri nama project (misal: "Report Rubru") → klik Create.</p>
          </StepCard>

          <StepCard step={2} title="Aktifkan YouTube Data API v3">
            <p>Di Cloud Console → <strong>APIs & Services → Library</strong>.</p>
            <p className="mt-1">Cari <strong>"YouTube Data API v3"</strong> → klik → <strong>Enable</strong>.</p>
          </StepCard>

          <StepCard step={3} title="Buat API Key">
            <p>Buka <strong>APIs & Services → Credentials → Create Credentials → API Key</strong>.</p>
            <p className="mt-1">Copy API Key yang dihasilkan.</p>
            <InfoBox type="warning">
              Untuk keamanan, klik <strong>Restrict Key</strong> → pilih <strong>HTTP referrers</strong> → tambahkan domain produksi Anda.
            </InfoBox>
          </StepCard>

          <StepCard step={4} title="Untuk Data Private (Analytics)">
            <p>Jika perlu data analytics (bukan hanya public stats), gunakan OAuth 2.0:</p>
            <ol className="list-decimal pl-4 mt-1 space-y-1">
              <li>Credentials → Create Credentials → <strong>OAuth 2.0 Client ID</strong></li>
              <li>Application type: <strong>Web application</strong></li>
              <li>Authorized redirect URIs: <code className="text-xs bg-muted px-1 rounded">http://localhost:8000/auth/google/callback</code></li>
              <li>Copy Client ID dan Client Secret</li>
            </ol>
          </StepCard>

          <StepCard step={5} title="Konfigurasi Environment">
            <CodeBlock>{`YOUTUBE_API_KEY=your_api_key
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret`}</CodeBlock>
          </StepCard>

          <StepCard step={6} title="Test API Key">
            <p>Test langsung di browser (ganti CHANNEL_ID dan API_KEY):</p>
            <CodeBlock>{`https://www.googleapis.com/youtube/v3/channels
  ?part=statistics
  &id=YOUR_CHANNEL_ID
  &key=YOUR_API_KEY`}</CodeBlock>
            <p>Channel ID dapat ditemukan di YouTube Studio → Settings → Channel → Advanced settings.</p>
          </StepCard>
        </CardContent>
      </Card>

      <InfoBox type="success">
        YouTube API gratis dengan kuota 10.000 unit/hari. Untuk mengambil statistik channel dasar hanya membutuhkan sekitar 1-3 unit per request.
      </InfoBox>
    </div>
  );
}

// ── TikTok API ────────────────────────────────────────────────────────────────
function TiktokApiTab() {
  return (
    <div className="space-y-4">
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-gray-600" />
            <p className="text-sm text-gray-700">
              TikTok for Developers API digunakan untuk mengambil data video, followers, dan engagement dari akun TikTok Business/Creator.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prasyarat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[
            "Akun TikTok Business atau Creator dengan minimal 1.000 followers",
            "Akun TikTok for Developers (developers.tiktok.com)",
            "Business yang sudah diverifikasi di TikTok Business Center",
          ].map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Langkah Koneksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StepCard step={1} title="Daftar di TikTok for Developers">
            <p>Buka <Badge variant="outline">developers.tiktok.com</Badge> → Login dengan akun TikTok.</p>
            <p className="mt-1">Klik <strong>Manage Apps → Create an app</strong>.</p>
            <p>Isi: nama app, kategori (Social Media / Marketing), deskripsi singkat.</p>
          </StepCard>

          <StepCard step={2} title="Konfigurasi App">
            <p>Di dashboard app, isi:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong>Redirect URI:</strong> <code className="text-xs bg-muted px-1 rounded">http://localhost:8000/auth/tiktok/callback</code></li>
              <li><strong>Terms of Service URL</strong> dan <strong>Privacy Policy URL</strong> (wajib untuk approval)</li>
            </ul>
          </StepCard>

          <StepCard step={3} title="Minta Izin Scopes">
            <p>Di tab <strong>Products</strong>, tambahkan <strong>Login Kit</strong> dan <strong>Research API</strong> (atau Content Posting API).</p>
            <p className="mt-1">Ajukan scopes yang dibutuhkan:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><code className="text-xs bg-muted px-1 rounded">user.info.basic</code> — info profil dasar</li>
              <li><code className="text-xs bg-muted px-1 rounded">video.list</code> — daftar video</li>
              <li><code className="text-xs bg-muted px-1 rounded">user.info.stats</code> — statistik akun</li>
            </ul>
            <InfoBox type="warning">
              Beberapa scope memerlukan review manual dari TikTok (1-7 hari kerja). Pastikan deskripsi use case jelas dan akurat.
            </InfoBox>
          </StepCard>

          <StepCard step={4} title="Ambil Client Key & Secret">
            <p>Di halaman app, catat:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><Badge>Client Key</Badge> (sama dengan Client ID)</li>
              <li><Badge>Client Secret</Badge> — klik Show</li>
            </ul>
          </StepCard>

          <StepCard step={5} title="Konfigurasi Environment">
            <CodeBlock>{`TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret`}</CodeBlock>
          </StepCard>

          <StepCard step={6} title="Flow OAuth untuk User Login">
            <p>TikTok menggunakan OAuth 2.0. Flow-nya:</p>
            <ol className="list-decimal pl-4 mt-1 space-y-1">
              <li>Redirect user ke TikTok Authorization URL dengan <code className="text-xs bg-muted px-1 rounded">client_key</code> dan <code className="text-xs bg-muted px-1 rounded">scope</code></li>
              <li>User login dan izinkan akses</li>
              <li>TikTok redirect ke callback URL dengan <code className="text-xs bg-muted px-1 rounded">code</code></li>
              <li>Tukar <code className="text-xs bg-muted px-1 rounded">code</code> dengan <code className="text-xs bg-muted px-1 rounded">access_token</code> via POST request</li>
              <li>Gunakan <code className="text-xs bg-muted px-1 rounded">access_token</code> untuk hit TikTok API</li>
            </ol>
            <CodeBlock>{`POST https://open.tiktokapis.com/v2/oauth/token/
Body:
  client_key=xxx
  client_secret=xxx
  code=xxx
  grant_type=authorization_code
  redirect_uri=http://localhost:8000/auth/tiktok/callback`}</CodeBlock>
          </StepCard>
        </CardContent>
      </Card>

      <InfoBox type="info">
        TikTok API lebih ketat dibanding Meta dan Google. Proses approval bisa memakan waktu hingga 2 minggu. Siapkan privacy policy dan terms of service yang valid sebelum submit.
      </InfoBox>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TutorialApiEksternalPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
          <Globe className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Tutorial API Eksternal</h1>
          <p className="text-sm text-muted-foreground">
            Panduan lengkap koneksi ke platform pihak ketiga
          </p>
        </div>
      </div>

      <Tabs defaultValue="meta">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="meta">Meta API</TabsTrigger>
          <TabsTrigger value="meta-ads">Meta Ads API</TabsTrigger>
          <TabsTrigger value="youtube">YouTube API</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok API</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="mt-4"><MetaApiTab /></TabsContent>
        <TabsContent value="meta-ads" className="mt-4"><MetaAdsApiTab /></TabsContent>
        <TabsContent value="youtube" className="mt-4"><YoutubeApiTab /></TabsContent>
        <TabsContent value="tiktok" className="mt-4"><TiktokApiTab /></TabsContent>
      </Tabs>
    </div>
  );
}
