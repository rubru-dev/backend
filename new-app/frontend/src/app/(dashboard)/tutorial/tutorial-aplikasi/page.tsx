"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, Download, Users, TrendingUp, Share2, PhoneCall, Palette,
  Building2, Calculator, UserCheck, Camera, ShieldCheck, FileText,
  ChevronDown, ChevronRight, CheckCircle,
} from "lucide-react";

// ── Role Guide ────────────────────────────────────────────────────────────────
interface RoleSection {
  role: string;
  color: string;
  icon: React.ElementType;
  description: string;
  menus: { name: string; desc: string }[];
  steps: string[];
}

const ROLE_GUIDES: RoleSection[] = [
  {
    role: "Super Admin",
    color: "#64748b",
    icon: ShieldCheck,
    description: "Memiliki akses penuh ke seluruh fitur aplikasi. Bertanggung jawab mengelola user, role, permission, dan pengaturan sistem.",
    menus: [
      { name: "Dashboard", desc: "Ringkasan seluruh aktivitas dan KPI aplikasi." },
      { name: "Admin → Users", desc: "Tambah, edit, nonaktifkan akun user." },
      { name: "Admin → Roles", desc: "Buat role baru, atur permission per modul." },
      { name: "Admin → Pengaturan", desc: "Konfigurasi global aplikasi." },
      { name: "Semua modul", desc: "Super Admin dapat mengakses semua menu tanpa batasan." },
    ],
    steps: [
      "Login dengan akun Super Admin.",
      "Buka Admin → Users untuk membuat akun bagi setiap karyawan.",
      "Buka Admin → Roles, pastikan setiap role memiliki permission yang sesuai.",
      "Pantau seluruh aktivitas melalui Dashboard.",
    ],
  },
  {
    role: "BD (Business Development)",
    color: "#6366f1",
    icon: TrendingUp,
    description: "Mengelola leads, pipeline penjualan, dan analitik Meta Ads untuk mengoptimalkan akuisisi klien.",
    menus: [
      { name: "Dashboard BD", desc: "KPI BD: total leads, konversi, revenue pipeline." },
      { name: "Kanban BD", desc: "Pipeline visual leads per tahap (New, Follow Up, Survey, Closing, dll)." },
      { name: "Meta Ads", desc: "Koneksi dan analitik iklan Meta (Facebook/Instagram)." },
    ],
    steps: [
      "Login → buka Kanban BD untuk melihat pipeline leads saat ini.",
      "Klik kartu lead untuk melihat detail, riwayat follow-up, dan dokumen.",
      "Gunakan tombol 'Pindah Tahap' untuk menggeser lead ke tahap berikutnya.",
      "Buka Meta Ads untuk memantau performa campaign iklan.",
      "Laporan harian diinput setiap hari kerja sebelum jam 18.00.",
    ],
  },
  {
    role: "Content Creator",
    color: "#ec4899",
    icon: Share2,
    description: "Mengelola konten media sosial, timeline konten, dan laporan performa platform.",
    menus: [
      { name: "Dashboard Sosmed", desc: "Statistik followers, engagement, reach per platform." },
      { name: "Sosial Media", desc: "Input metrics harian untuk Instagram, TikTok, YouTube." },
      { name: "Timeline Konten", desc: "Rencana dan realisasi posting konten bulanan." },
      { name: "Laporan Harian", desc: "Input laporan aktivitas harian konten." },
    ],
    steps: [
      "Setiap hari, buka Sosial Media → input metrics terbaru dari setiap platform.",
      "Buka Timeline Konten → update status konten (draft, review, published).",
      "Buka Dashboard Sosmed untuk melihat tren performa.",
      "Isi Laporan Harian sebelum akhir jam kerja.",
    ],
  },
  {
    role: "Sales Admin",
    color: "#f59e0b",
    icon: Users,
    description: "Mengkoordinasikan leads dari telemarketing dan sales, menjadwalkan survey, dan mengelola administrasi penjualan.",
    menus: [
      { name: "Kanban Admin", desc: "Papan kanban untuk semua leads yang masuk." },
      { name: "Follow Up Leads", desc: "Daftar leads yang perlu di-follow up beserta reminder." },
      { name: "Kalender Survey", desc: "Jadwal survey lapangan dengan klien." },
      { name: "Laporan Harian", desc: "Input aktivitas harian Sales Admin." },
    ],
    steps: [
      "Pagi hari, cek Kalender Survey untuk jadwal hari ini.",
      "Buka Follow Up Leads → hubungi leads yang jadwal follow-up-nya hari ini.",
      "Update status lead di Kanban Admin setelah setiap interaksi.",
      "Isi Laporan Harian di akhir jam kerja.",
    ],
  },
  {
    role: "Telemarketing",
    color: "#10b981",
    icon: PhoneCall,
    description: "Menangani prospek awal, melakukan cold calling, dan mengumpulkan leads baru.",
    menus: [
      { name: "Kanban Telemarketing", desc: "Pipeline leads yang dikelola oleh tim telemarketing." },
      { name: "Follow Up Leads", desc: "Reminder dan riwayat follow up per lead." },
      { name: "Kalender Survey", desc: "Jadwal survey yang berhasil dibuat." },
      { name: "Laporan Harian", desc: "Input jumlah call, lead baru, dan konversi." },
    ],
    steps: [
      "Buka Kanban Telemarketing → ambil leads dari kolom 'New'.",
      "Setelah menghubungi, pindahkan lead ke kolom yang sesuai.",
      "Jika lead setuju survey, buat jadwal di Kalender Survey.",
      "Isi Laporan Harian dengan jumlah call & hasil.",
    ],
  },
  {
    role: "Desain",
    color: "#8b5cf6",
    icon: Palette,
    description: "Mengelola timeline desain proyek dan melaporkan progress pekerjaan desain harian.",
    menus: [
      { name: "Laporan Harian", desc: "Input progress pekerjaan desain hari ini." },
    ],
    steps: [
      "Setiap hari, buka Laporan Harian.",
      "Isi proyek yang dikerjakan, tahap desain, dan catatan progress.",
      "Submit sebelum jam 17.00.",
    ],
  },
  {
    role: "Finance",
    color: "#ef4444",
    icon: Calculator,
    description: "Mengelola invoice, kwitansi, administrasi proyek (cashflow, PR, dokumen), dan laporan keuangan.",
    menus: [
      { name: "Invoice & Kwitansi", desc: "Buat invoice dari lead, tanda tangan digital, mark as paid." },
      { name: "Administrasi Projek", desc: "Cashflow per termin, PR material, upload nota, gaji tukang." },
      { name: "Administrasi Kantor", desc: "Pengeluaran operasional kantor." },
      { name: "Laporan Harian", desc: "Input aktivitas keuangan harian." },
    ],
    steps: [
      "Invoice: buka Invoice & Kwitansi → Buat Invoice → pilih lead → simpan.",
      "Invoice perlu tanda tangan Head Finance dan Admin Finance sebelum bisa Terbit.",
      "Setelah klien bayar, klik 'Mark as Paid' → kwitansi otomatis dibuat.",
      "Administrasi Projek: pilih proyek → kelola cashflow per termin.",
      "Gaji Tukang: buka tab Tukang → input daftar tukang → absen → proses gajian.",
    ],
  },
  {
    role: "PIC Project",
    color: "#f97316",
    icon: Building2,
    description: "Memantau progress proyek di lapangan dan melaporkan perkembangan harian.",
    menus: [
      { name: "Laporan Harian", desc: "Input progress lapangan, kendala, dan dokumentasi foto." },
    ],
    steps: [
      "Buka Laporan Harian setiap hari.",
      "Isi: proyek yang dipantau, progress %, kendala, dan upload foto jika ada.",
      "Submit sebelum akhir jam kerja.",
    ],
  },
  {
    role: "Tukang",
    color: "#f97316",
    icon: UserCheck,
    description: "Submit absensi harian dengan foto selfie sebagai bukti kehadiran di proyek.",
    menus: [
      { name: "Absen Harian", desc: "Submit foto absensi harian dengan timestamp otomatis." },
    ],
    steps: [
      "Buka menu Absen Harian (halaman khusus tukang).",
      "Klik 'Ambil Foto' → izinkan akses kamera.",
      "Pastikan wajah terlihat jelas dan lokasi sesuai.",
      "Klik 'Submit Absen' → absensi tercatat dengan waktu otomatis.",
      "Absen hanya bisa dilakukan sekali per hari.",
    ],
  },
];

// ── Role Card ─────────────────────────────────────────────────────────────────
function RoleCard({ section }: { section: RoleSection }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: section.color + "20", color: section.color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{section.role}</CardTitle>
                <CardDescription className="text-xs mt-0.5 line-clamp-1">
                  {section.description}
                </CardDescription>
              </div>
            </div>
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 space-y-4">
          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menu yang Tersedia</p>
            <div className="space-y-1.5">
              {section.menus.map((m) => (
                <div key={m.name} className="flex gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0 text-[10px] h-5">{m.name}</Badge>
                  <span className="text-muted-foreground text-xs pt-0.5">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alur Kerja Harian</p>
            <ol className="space-y-1.5">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: section.color }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Docs Tab ──────────────────────────────────────────────────────────────────
const DOCS = [
  {
    title: "Dokumentasi Frontend",
    desc: "Arsitektur Next.js 14 App Router, komponen UI (shadcn/ui), state management (Zustand + React Query), sistem autentikasi JWT, RBAC permission, dan panduan pengembangan fitur baru.",
    sections: [
      "Stack: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui",
      "State: Zustand (authStore), TanStack React Query",
      "Auth: JWT Access Token (8 jam) + Refresh Token (30 hari)",
      "RBAC: Permission-based dengan fallback role",
      "PDF: @react-pdf/renderer — generate client-side",
      "API Client: Axios dengan interceptor auto-refresh token",
      "Folder: src/app/(dashboard) untuk halaman, src/components untuk komponen",
    ],
    filename: "docs-frontend.pdf",
    color: "#6366f1",
  },
  {
    title: "Dokumentasi Backend",
    desc: "Arsitektur Express + TypeScript, Prisma ORM dengan PostgreSQL, sistem autentikasi JWT, middleware RBAC, semua endpoint API, dan panduan menambah fitur baru.",
    sections: [
      "Stack: Node.js, Express, TypeScript, Prisma ORM",
      "Database: PostgreSQL — semua ID menggunakan BigInt",
      "Auth: bcrypt + JWT (access + refresh token)",
      "RBAC: Middleware requirePermission(module, action)",
      "BigInt: dikonversi ke string via BigInt.prototype.toJSON",
      "Decimal: Prisma Decimal field — jangan pass null, gunakan undefined",
      "Seeder: npm run seed — email test: admin@test.com / password123",
    ],
    filename: "docs-backend.pdf",
    color: "#10b981",
  },
];

function DocsTab() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDownload(doc: typeof DOCS[0]) {
    setLoading(doc.filename);
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
      const styles = StyleSheet.create({
        page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
        title: { fontSize: 20, fontWeight: "bold", marginBottom: 8, color: doc.color },
        desc: { fontSize: 10, color: "#555", marginBottom: 16, lineHeight: 1.5 },
        section: { marginBottom: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: doc.color },
        sectionText: { fontSize: 9, color: "#333", lineHeight: 1.6 },
        header: { fontSize: 11, fontWeight: "bold", marginTop: 16, marginBottom: 6, color: "#111" },
        generated: { fontSize: 8, color: "#999", marginTop: 24 },
      });

      const DocPDF = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>{doc.title}</Text>
            <Text style={styles.desc}>{doc.desc}</Text>
            <Text style={styles.header}>Ringkasan Teknis</Text>
            {doc.sections.map((s, i) => (
              <View key={i} style={[styles.section, { marginBottom: 4 }]}>
                <Text style={styles.sectionText}>• {s}</Text>
              </View>
            ))}
            <Text style={styles.generated}>
              Generated: {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })} — Report Rubru PT. Rubah Rumah
            </Text>
          </Page>
        </Document>
      );

      const blob = await pdf(<DocPDF />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Download dokumentasi teknis aplikasi dalam format PDF. Cocok untuk onboarding developer baru atau referensi pengembangan.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {DOCS.map((doc) => (
          <Card key={doc.filename} className="overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: doc.color }} />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: doc.color }} />
                <CardTitle className="text-base">{doc.title}</CardTitle>
              </div>
              <CardDescription className="text-xs leading-5">{doc.desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="rounded-md bg-muted p-3 space-y-1">
                {doc.sections.map((s, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: doc.color }} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                style={{ backgroundColor: doc.color, color: "#fff" }}
                onClick={() => handleDownload(doc)}
                disabled={loading === doc.filename}
              >
                <Download className="h-4 w-4" />
                {loading === doc.filename ? "Membuat PDF..." : `Download ${doc.title}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TutorialAplikasiPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Tutorial Aplikasi</h1>
          <p className="text-sm text-muted-foreground">
            Panduan penggunaan lengkap untuk setiap role
          </p>
        </div>
      </div>

      <Tabs defaultValue="panduan">
        <TabsList>
          <TabsTrigger value="panduan">Panduan Per Role</TabsTrigger>
          <TabsTrigger value="dokumentasi">Dokumentasi (Download PDF)</TabsTrigger>
        </TabsList>

        {/* Tab 1: Panduan */}
        <TabsContent value="panduan" className="mt-4">
          <div className="space-y-3">
            <Card className="border-sky-200 bg-sky-50">
              <CardContent className="pt-4 pb-3">
                <p className="text-sm text-sky-700">
                  Klik salah satu role di bawah untuk melihat panduan lengkap menu dan alur kerja hariannya.
                </p>
              </CardContent>
            </Card>
            {ROLE_GUIDES.map((section) => (
              <RoleCard key={section.role} section={section} />
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Dokumentasi */}
        <TabsContent value="dokumentasi" className="mt-4">
          <DocsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
