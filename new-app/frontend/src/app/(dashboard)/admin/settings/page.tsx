"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { adminApi } from "@/lib/api/admin";
import type { ReminderRule } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { Settings, Bell, Send, Eye, EyeOff, Loader2, FlaskConical, CalendarClock, Zap, QrCode, Smartphone, Power, RefreshCw } from "lucide-react";

const PRIORITY_CONFIG: Record<string, { label: string; emoji: string; active: string; inactive: string }> = {
  rendah: { label: "Rendah", emoji: "🟢", active: "bg-green-600 text-white border-green-600",  inactive: "bg-green-50 text-green-700 border-green-300 hover:bg-green-100" },
  sedang: { label: "Sedang", emoji: "🟡", active: "bg-yellow-500 text-white border-yellow-500", inactive: "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100" },
  tinggi: { label: "Tinggi", emoji: "🔴", active: "bg-red-600 text-white border-red-600",      inactive: "bg-red-50 text-red-700 border-red-300 hover:bg-red-100" },
};

function PrioritySelector({
  priority,
  onSelect,
}: {
  priority: string;
  onSelect: (p: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground mr-1">Prioritas:</span>
      {(["rendah", "sedang", "tinggi"] as const).map((p) => {
        const cfg = PRIORITY_CONFIG[p];
        const isActive = priority === p;
        return (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${isActive ? cfg.active : cfg.inactive}`}
          >
            {cfg.emoji} {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

function ReminderRuleCard({
  rule,
  roles,
  updateRuleMut,
  testRuleMut,
}: {
  rule: ReminderRule;
  roles: { id: number; name: string }[];
  updateRuleMut: any;
  testRuleMut: any;
}) {
  const [tplValue, setTplValue] = useState(rule.message_template ?? "");

  return (
    <div className={`border rounded-lg p-4 space-y-3 transition-opacity ${!rule.is_active ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{rule.label}</p>
            {rule.trigger_type === "event"
              ? <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded"><Zap className="h-2.5 w-2.5" />Event</span>
              : <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded"><CalendarClock className="h-2.5 w-2.5" />Deadline</span>}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{rule.feature}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={testRuleMut.isPending}
            onClick={() => testRuleMut.mutate(rule.id)}
          >
            {testRuleMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FlaskConical className="h-3 w-3 mr-1" />}
            Test
          </Button>
          <Switch
            checked={rule.is_active}
            onCheckedChange={(v) => updateRuleMut.mutate({ id: rule.id, data: { is_active: v } })}
          />
        </div>
      </div>

      {/* Timing (only for deadline type) */}
      {rule.trigger_type === "deadline" && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Hari sebelum:</Label>
            <Input
              type="number"
              min={0}
              max={30}
              className="h-7 w-20 text-sm"
              defaultValue={rule.days_before}
              onBlur={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val !== rule.days_before) {
                  updateRuleMut.mutate({ id: rule.id, data: { days_before: val } });
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Jam kirim:</Label>
            <Input
              type="time"
              className="h-7 w-28 text-sm"
              defaultValue={rule.send_time ?? "08:00"}
              onBlur={(e) => {
                const val = e.target.value;
                if (val && val !== rule.send_time) {
                  updateRuleMut.mutate({ id: rule.id, data: { send_time: val } });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Priority selector */}
      <PrioritySelector
        priority={rule.priority}
        onSelect={(p) => updateRuleMut.mutate({ id: rule.id, data: { priority: p } })}
      />

      {/* Role badges */}
      <div>
        <Label className="text-xs">Role yang direminder:</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {roles.map((role) => {
            const isSelected = rule.role_ids.includes(role.id);
            return (
              <button
                key={role.id}
                onClick={() => {
                  const newIds = isSelected
                    ? rule.role_ids.filter((id) => id !== role.id)
                    : [...rule.role_ids, role.id];
                  updateRuleMut.mutate({ id: rule.id, data: { role_ids: newIds } });
                }}
                className="focus:outline-none"
              >
                <Badge
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer text-xs transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {role.name}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message template */}
      <div>
        <Label className="text-xs">Template Pesan WhatsApp:</Label>
        <p className="text-[10px] text-muted-foreground mb-1">Gunakan variabel seperti &#123;nama&#125;, &#123;tanggal&#125;, &#123;days_before&#125; dll. Kosongkan untuk pakai template default.</p>
        <Textarea
          className="text-xs min-h-[80px] font-mono"
          placeholder="Ketik template pesan di sini... (kosongkan untuk default)"
          value={tplValue}
          onChange={(e) => setTplValue(e.target.value)}
          onBlur={() => {
            if (tplValue !== (rule.message_template ?? "")) {
              updateRuleMut.mutate({ id: rule.id, data: { message_template: tplValue || null } });
            }
          }}
        />
      </div>
    </div>
  );
}

function ReminderRulesTab({
  rulesData,
  rulesLoading,
  updateRuleMut,
  testRuleMut,
}: {
  rulesData: { rules: ReminderRule[]; roles: { id: number; name: string }[] } | undefined;
  rulesLoading: boolean;
  updateRuleMut: any;
  testRuleMut: any;
}) {
  const deadlineRules = (rulesData?.rules ?? []).filter((r) => r.trigger_type === "deadline");
  const eventRules = (rulesData?.rules ?? []).filter((r) => r.trigger_type === "event");
  const roles = rulesData?.roles ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Aturan Reminder Otomatis</CardTitle>
          <CardDescription>
            Atur kapan dan kepada siapa reminder WhatsApp dikirim. <span className="font-medium">Deadline</span>: dikirim via cron sebelum jatuh tempo. <span className="font-medium">Event</span>: dikirim saat kejadian tertentu terjadi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" />Memuat rules...</div>
          ) : (rulesData?.rules?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Belum ada reminder rules. Jalankan seeder untuk membuat rules default.</p>
          ) : (
            <div className="space-y-6">
              {/* Deadline-based */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Reminder Deadline</h3>
                  <span className="text-xs text-muted-foreground">— dikirim otomatis sebelum deadline</span>
                </div>
                <div className="space-y-3">
                  {deadlineRules.map((rule) => (
                    <ReminderRuleCard key={rule.id} rule={rule} roles={roles} updateRuleMut={updateRuleMut} testRuleMut={testRuleMut} />
                  ))}
                </div>
              </div>

              {/* Event-based */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Reminder Event</h3>
                  <span className="text-xs text-muted-foreground">— dikirim saat event tertentu terjadi</span>
                </div>
                <div className="space-y-3">
                  {eventRules.map((rule) => (
                    <ReminderRuleCard key={rule.id} rule={rule} roles={roles} updateRuleMut={updateRuleMut} testRuleMut={testRuleMut} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WhatsAppQrTab() {
  const qc = useQueryClient();
  const [number, setNumber] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["wa-status"],
    queryFn: () => adminApi.waStatus(),
    retry: false,
    // Polling saat menunggu scan (connecting) supaya UI otomatis berubah jadi "Tersambung"
    refetchInterval: (q) => (q.state.data?.state === "open" ? false : qr ? 3000 : false),
  });

  const connected = status?.state === "open";

  // Begitu terdeteksi tersambung, buang QR.
  if (connected && qr) setQr(null);

  const connectMut = useMutation({
    mutationFn: () => adminApi.waConnect(number),
    onSuccess: (data) => {
      if (data.state === "open") {
        toast.success(data.message ?? "WhatsApp sudah tersambung");
        setQr(null);
        setPairingCode(null);
      } else {
        setQr(data.qr_base64);
        setPairingCode(data.pairing_code);
        if (!data.qr_base64) toast.message("QR belum tersedia, coba klik lagi sebentar.");
      }
      qc.invalidateQueries({ queryKey: ["wa-status"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal memuat QR"),
  });

  const logoutMut = useMutation({
    mutationFn: () => adminApi.waLogout(),
    onSuccess: () => {
      toast.success("Sesi WhatsApp diputuskan");
      setQr(null);
      setPairingCode(null);
      qc.invalidateQueries({ queryKey: ["wa-status"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal logout"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-green-600" />
            GET QR WhatsApp
          </CardTitle>
          <CardDescription>
            Sambungkan nomor WhatsApp pengirim lewat Evolution API. Ketik nomor, klik <b>Munculkan QR</b>, lalu scan
            di HP: WhatsApp → Perangkat Tertaut → Tautkan Perangkat. Semua reminder otomatis dikirim dari nomor ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Belum dikonfigurasi */}
          {status && status.configured === false && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Evolution API belum dikonfigurasi di server: <span className="font-mono">{status.detail}</span>. Isi variabel
              <span className="font-mono"> EVOLUTION_BASE_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE</span> di <span className="font-mono">.env</span> backend.
            </div>
          )}

          {/* Status koneksi */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            {statusLoading ? (
              <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />memuat...</span>
            ) : connected ? (
              <Badge className="bg-green-100 text-green-700 border-green-300 flex items-center gap-1">
                <Smartphone className="h-3 w-3" /> Tersambung{status?.number ? ` — ${status.number}` : ""}
              </Badge>
            ) : status?.state === "connecting" || qr ? (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Menunggu scan…</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500">Belum tersambung</Badge>
            )}
          </div>

          {/* Form nomor + tombol */}
          {!connected && (
            <>
              <div>
                <Label>Nomor Pengirim (WhatsApp)</Label>
                <Input
                  placeholder="628xxxxxxxxxx"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  disabled={status?.configured === false}
                />
                <p className="text-xs text-muted-foreground mt-1">Format internasional tanpa + (misal: 6281994031608). Nomor ini yang akan meng-scan QR.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => connectMut.mutate()}
                  disabled={!number || connectMut.isPending || status?.configured === false}
                >
                  {connectMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Memuat...</> : <><QrCode className="h-4 w-4 mr-1.5" />Munculkan QR</>}
                </Button>
                {qr && (
                  <Button variant="outline" onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
                    <RefreshCw className="h-4 w-4 mr-1.5" />Refresh QR
                  </Button>
                )}
              </div>
            </>
          )}

          {/* QR */}
          {qr && !connected && (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR WhatsApp" className="h-64 w-64 object-contain" />
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Scan QR ini dari WhatsApp di nomor pengirim. QR akan kedaluwarsa dalam ~1 menit — klik <b>Refresh QR</b> bila sudah lewat.
              </p>
            </div>
          )}

          {/* Kode pairing — tampil mandiri (Evolution kadang hanya mengirim kode, tanpa QR) */}
          {pairingCode && !connected && (
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-sm text-muted-foreground">Kode pairing (kalau HP meminta &quot;masukkan kode&quot;):</p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-widest">{pairingCode}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Di HP: WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon → masukkan kode ini.
              </p>
            </div>
          )}

          {/* Sudah tersambung → tombol putuskan */}
          {connected && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => logoutMut.mutate()}
                disabled={logoutMut.isPending}
              >
                {logoutMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Memutuskan...</> : <><Power className="h-4 w-4 mr-1.5" />Putuskan / Ganti Nomor</>}
              </Button>
              <span className="text-xs text-muted-foreground">Putuskan untuk menyambungkan nomor lain.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const qc = useQueryClient();

  // Password change
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  // Test kirim pesan WhatsApp (via Evolution)
  const [testNum, setTestNum] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini pesan test dari sistem RubahRumah.");

  const changePwMut = useMutation({
    mutationFn: (d: any) => apiClient.post("/auth/change-password", d).then((r) => r.data),
    onSuccess: () => { toast.success("Password berhasil diubah"); setPwForm({ old_password: "", new_password: "", confirm: "" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal ubah password"),
  });

  const sendTestMut = useMutation({
    mutationFn: (d: any) => adminApi.sendFonteeTest(d),
    onSuccess: () => toast.success("Pesan test berhasil dikirim!"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal kirim pesan test"),
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["reminder-rules"],
    queryFn: () => adminApi.getReminderRules(),
    retry: false,
    enabled: superAdmin,
  });

  const updateRuleMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateReminderRule(id, data),
    onSuccess: () => { toast.success("Rule diperbarui"); qc.invalidateQueries({ queryKey: ["reminder-rules"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal"),
  });

  const testRuleMut = useMutation({
    mutationFn: (id: number) => adminApi.testReminderRule(id),
    onSuccess: (data: any) => toast.success(data?.message ?? "Test terkirim"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal kirim test"),
  });

  function handleChangePw() {
    if (pwForm.new_password !== pwForm.confirm) { toast.error("Konfirmasi password tidak cocok"); return; }
    changePwMut.mutate({ old_password: pwForm.old_password, new_password: pwForm.new_password });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" />Pengaturan</h1>
        <p className="text-muted-foreground">Konfigurasi sistem dan akun</p>
      </div>

      <Tabs defaultValue="akun">
        <TabsList>
          <TabsTrigger value="akun"><Settings className="h-3.5 w-3.5 mr-1.5" />Akun</TabsTrigger>
          {superAdmin && <TabsTrigger value="whatsapp"><QrCode className="h-3.5 w-3.5 mr-1.5" />GET QR Whatsapp</TabsTrigger>}
          {superAdmin && <TabsTrigger value="reminder"><Bell className="h-3.5 w-3.5 mr-1.5" />Reminder Rules</TabsTrigger>}
        </TabsList>

        {/* Akun tab */}
        <TabsContent value="akun" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Informasi Akun</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-4"><span className="text-muted-foreground w-24">Nama:</span><span className="font-medium">{user?.name}</span></div>
              <div className="flex gap-4"><span className="text-muted-foreground w-24">Email:</span><span>{user?.email}</span></div>
              <div className="flex gap-4"><span className="text-muted-foreground w-24">Role:</span><span>{user?.roles?.join(", ")}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ubah Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Password Lama</Label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} value={pwForm.old_password} onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })} />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div><Label>Password Baru</Label><Input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} /></div>
              <div><Label>Konfirmasi Password Baru</Label><Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} /></div>
              <Button onClick={handleChangePw} disabled={!pwForm.old_password || !pwForm.new_password || changePwMut.isPending}>
                {changePwMut.isPending ? "Mengubah..." : "Ubah Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GET QR Whatsapp tab */}
        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          <WhatsAppQrTab />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Test Kirim Pesan</CardTitle>
              <CardDescription>Kirim pesan percobaan lewat WhatsApp (Evolution API) untuk memverifikasi koneksi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nomor Tujuan</Label>
                <Input placeholder="628xxxxxxxxxx" value={testNum} onChange={(e) => setTestNum(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Format internasional tanpa + (misal: 6281234567890)</p>
              </div>
              <div>
                <Label>Pesan</Label>
                <Input value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
              </div>
              <Button
                variant="outline"
                onClick={() => sendTestMut.mutate({ target_number: testNum, message: testMsg })}
                disabled={!testNum || !testMsg || sendTestMut.isPending}
              >
                {sendTestMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengirim...</> : <><Send className="h-3.5 w-3.5 mr-1.5" />Kirim Test</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminder Rules tab */}
        <TabsContent value="reminder" className="mt-4 space-y-4">
          <ReminderRulesTab
            rulesData={rulesData}
            rulesLoading={rulesLoading}
            updateRuleMut={updateRuleMut}
            testRuleMut={testRuleMut}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
