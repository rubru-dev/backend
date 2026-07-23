"use client";

import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { Settings, Bell, Send, Eye, EyeOff, Loader2, FlaskConical, CalendarClock, Zap, QrCode, Bot, RefreshCw } from "lucide-react";

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
        <Label className="text-xs">Template Pesan Telegram:</Label>
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
            Atur kapan dan kepada siapa reminder Telegram dikirim. <span className="font-medium">Deadline</span>: dikirim via cron sebelum jatuh tempo. <span className="font-medium">Event</span>: dikirim saat kejadian tertentu terjadi.
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

// bukan .env, jadi tanpa tab ini tidak ada cara mengisinya lewat aplikasi.
function FonnteTab() {
  const [form, setForm] = useState({ api_key: "", base_url: "", sender_number: "" });
  const [showKey, setShowKey] = useState(false);
  const [testNum, setTestNum] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini pesan test dari sistem RubahRumah.");

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["fontee-config"],
    queryFn: () => adminApi.getFonteeConfig(),
    retry: false,
  });

  useEffect(() => {
    if (!cfg) return;
    setForm({
      api_key: cfg.api_key ?? "",
      base_url: cfg.base_url ?? "",
      sender_number: cfg.sender_number ?? "",
    });
  }, [cfg]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.saveFonteeConfig(form),
    onSuccess: () => toast.success("Konfigurasi Fonnte disimpan"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan konfigurasi"),
  });

  const statusMut = useMutation({
    mutationFn: () => adminApi.getFonteeStatus(),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal cek status Fonnte"),
  });
  const status = statusMut.data;

  const sendTestMut = useMutation({
    mutationFn: (d: { target_number: string; message: string }) => adminApi.sendFonteeTest(d),
    onSuccess: () => toast.success("Pesan test berhasil dikirim!"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal kirim pesan test"),
  });

  // ── QR reconnect ──────────────────────────────────────────────────────────
  const [qrOpen, setQrOpen] = useState(false);
  const qrMut = useMutation({
    mutationFn: () => adminApi.getFonteeQr(),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal minta QR dari Fonnte"),
  });
  const qr = qrMut.data;

  function openQr() {
    setQrOpen(true);
    qrMut.mutate();
  }

  // Selama dialog QR terbuka, cek status tiap 3 detik supaya tahu begitu tersambung.
  useEffect(() => {
    if (!qrOpen) return;
    const iv = setInterval(() => statusMut.mutate(), 3000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen]);

  // Begitu terdeteksi tersambung, tutup dialog otomatis.
  useEffect(() => {
    if (qrOpen && status?.connected) {
      toast.success("WhatsApp tersambung!");
      setQrOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, qrOpen]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi Fonnte</CardTitle>
          <CardDescription>Gateway WhatsApp. Kredensial diambil dari sini oleh semua pengiriman reminder.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Memuat...
            </p>
          ) : (
            <>
              <div>
                <Label>API Key / Token</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="Token dari dashboard Fonnte"
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Base URL</Label>
                <Input
                  placeholder="https://api.fonnte.com/send"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Biasanya https://api.fonnte.com/send</p>
              </div>
              <div>
                <Label>Nomor Pengirim</Label>
                <Input
                  placeholder="628xxxxxxxxxx"
                  value={form.sender_number}
                  onChange={(e) => setForm({ ...form, sender_number: e.target.value })}
                />
              </div>
              <Button onClick={() => saveMut.mutate()} disabled={!form.api_key || !form.base_url || saveMut.isPending}>
                {saveMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Menyimpan...</> : "Simpan"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Perangkat</CardTitle>
          <CardDescription>Cek apakah nomor Fonnte sedang tersambung ke WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => statusMut.mutate()} disabled={statusMut.isPending}>
              {statusMut.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengecek...</>
                : <><Zap className="h-3.5 w-3.5 mr-1.5" />Cek Status</>}
            </Button>
            <Button variant="outline" onClick={openQr} disabled={qrMut.isPending}>
              <QrCode className="h-3.5 w-3.5 mr-1.5" />Hubungkan / QR
            </Button>
            {status && (
              <Badge className={status.connected ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                {status.connected ? "Tersambung" : "Terputus"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            QR untuk menyambung / menyambung-ulang WhatsApp tanpa login dashboard Fonnte. QR berlaku
            singkat — kalau kedaluwarsa, klik "Muat ulang QR". Setelah tersambung, koneksi bertahan lama
            selama HP utama tetap online berkala.
          </p>

          {status && (
            <div className="text-sm space-y-1">
              {status.device && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-24">Perangkat:</span>
                  <span className="font-medium">{status.device}</span>
                </div>
              )}
              {status.quota !== null && status.quota !== undefined && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-24">Kuota:</span>
                  <span>{String(status.quota)}</span>
                </div>
              )}
              {/* Fonnte tidak konsisten menamai field statusnya antar versi — tampilkan
                  respons mentahnya supaya tetap bisa dibaca kalau badge salah tebak. */}
              <details className="pt-1">
                <summary className="text-xs text-muted-foreground cursor-pointer">Respons mentah Fonnte</summary>
                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(status.raw, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Test Kirim Pesan</CardTitle>
          <CardDescription>Kirim pesan percobaan lewat Fonnte untuk memverifikasi koneksi.</CardDescription>
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
            {sendTestMut.isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengirim...</>
              : <><Send className="h-3.5 w-3.5 mr-1.5" />Kirim Test</>}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sambungkan WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Di HP: WhatsApp → <span className="font-medium">Perangkat Tertaut</span> → Tautkan Perangkat, lalu scan QR di bawah.
            </p>
            {qrMut.isPending ? (
              <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : qr?.qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr.qr} alt="QR Fonnte" className="mx-auto w-56 h-56 object-contain border rounded bg-white" />
            ) : (
              <div className="text-left space-y-2">
                <p className="text-sm text-red-600">QR tidak bisa ditampilkan. Respons mentah Fonnte (kirim ke developer bila perlu):</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">{JSON.stringify(qr?.raw, null, 2)}</pre>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />Menunggu koneksi... (auto-cek tiap 3 detik)
            </div>
            <Button variant="outline" size="sm" onClick={() => qrMut.mutate()} disabled={qrMut.isPending}>
              <QrCode className="h-3.5 w-3.5 mr-1.5" />Muat ulang QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TelegramTab() {
  const [form, setForm] = useState({ bot_token: "", api_url: "", default_chat_id: "" });
  const [showToken, setShowToken] = useState(false);
  const [testChatId, setTestChatId] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini pesan test Telegram dari sistem RubahRumah.");

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["telegram-config"],
    queryFn: () => adminApi.getTelegramConfig(),
    retry: false,
  });

  useEffect(() => {
    if (!cfg) return;
    setForm({
      bot_token: cfg.bot_token ?? "",
      api_url: cfg.api_url || "https://api.telegram.org",
      default_chat_id: cfg.default_chat_id ?? "",
    });
    setTestChatId(cfg.default_chat_id ?? "");
  }, [cfg]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.saveTelegramConfig(form),
    onSuccess: () => toast.success("Konfigurasi Telegram disimpan"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan konfigurasi Telegram"),
  });

  const statusMut = useMutation({
    mutationFn: () => adminApi.getTelegramStatus(),
    onSuccess: (data) => toast.success(`Bot aktif: @${data.bot.username ?? data.bot.first_name ?? data.bot.id}`),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal cek bot Telegram"),
  });

  const updatesMut = useMutation({
    mutationFn: () => adminApi.getTelegramUpdates(),
    onSuccess: (data) => {
      if (data.chats.length === 0) toast.info("Belum ada chat. Kirim /start ke bot atau kirim pesan di grup, lalu ambil ulang.");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal ambil chat Telegram"),
  });

  const sendTestMut = useMutation({
    mutationFn: (d: { chat_id: string; message: string }) => adminApi.sendTelegramTest(d),
    onSuccess: () => toast.success("Pesan test Telegram berhasil dikirim!"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal kirim pesan test Telegram"),
  });

  const chats = updatesMut.data?.chats ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Konfigurasi Telegram Bot</CardTitle>
          <CardDescription>Token dari BotFather dan chat tujuan default untuk uji coba reminder Telegram.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Memuat...
            </p>
          ) : (
            <>
              <div>
                <Label>Bot Token</Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    placeholder="Token dari @BotFather"
                    value={form.bot_token}
                    onChange={(e) => setForm({ ...form, bot_token: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowToken((v) => !v)}
                    title={showToken ? "Sembunyikan token" : "Tampilkan token"}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>API URL</Label>
                <Input
                  placeholder="https://api.telegram.org"
                  value={form.api_url}
                  onChange={(e) => setForm({ ...form, api_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Default Chat ID</Label>
                <Input
                  placeholder="-100xxxxxxxxxx atau chat id personal"
                  value={form.default_chat_id}
                  onChange={(e) => {
                    setForm({ ...form, default_chat_id: e.target.value });
                    setTestChatId(e.target.value);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Untuk grup biasanya diawali -100. Untuk personal, user harus /start bot dulu.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveMut.mutate()} disabled={!form.bot_token || !form.api_url || saveMut.isPending}>
                  {saveMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Menyimpan...</> : "Simpan"}
                </Button>
                <Button variant="outline" onClick={() => statusMut.mutate()} disabled={statusMut.isPending}>
                  {statusMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengecek...</> : <><Bot className="h-3.5 w-3.5 mr-1.5" />Cek Bot</>}
                </Button>
              </div>
              {statusMut.data?.bot && (
                <div className="text-sm border rounded-md p-3 bg-muted/40">
                  <div className="font-medium">@{statusMut.data.bot.username ?? "-"}</div>
                  <div className="text-muted-foreground">ID: {statusMut.data.bot.id}</div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />Ambil Chat ID</CardTitle>
          <CardDescription>Kirim /start ke bot atau kirim pesan di grup yang berisi bot, lalu ambil daftar chat terakhir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={() => updatesMut.mutate()} disabled={updatesMut.isPending}>
            {updatesMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengambil...</> : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Ambil Chat Terakhir</>}
          </Button>
          {chats.length > 0 && (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div key={chat.chat_id} className="border rounded-md p-3 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{chat.title || chat.username || chat.chat_id}</div>
                    <div className="text-xs text-muted-foreground">chat_id: <span className="font-mono">{chat.chat_id}</span> · {chat.type ?? "-"}</div>
                    {chat.last_message && <div className="text-xs text-muted-foreground truncate mt-1">{chat.last_message}</div>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm({ ...form, default_chat_id: chat.chat_id });
                      setTestChatId(chat.chat_id);
                    }}
                  >
                    Pakai
                  </Button>
                </div>
              ))}
            </div>
          )}
          {updatesMut.data && (
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">Respons mentah Telegram</summary>
              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-48">{JSON.stringify(updatesMut.data.raw, null, 2)}</pre>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Test Kirim Pesan</CardTitle>
          <CardDescription>Kirim pesan percobaan ke chat ID Telegram.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Chat ID Tujuan</Label>
            <Input placeholder="-100xxxxxxxxxx" value={testChatId} onChange={(e) => setTestChatId(e.target.value)} />
          </div>
          <div>
            <Label>Pesan</Label>
            <Input value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => sendTestMut.mutate({ chat_id: testChatId, message: testMsg })}
            disabled={!testChatId || !testMsg || sendTestMut.isPending}
          >
            {sendTestMut.isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengirim...</>
              : <><Send className="h-3.5 w-3.5 mr-1.5" />Kirim Test</>}
          </Button>
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

  const changePwMut = useMutation({
    mutationFn: (d: any) => apiClient.post("/auth/change-password", d).then((r) => r.data),
    onSuccess: () => { toast.success("Password berhasil diubah"); setPwForm({ old_password: "", new_password: "", confirm: "" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal ubah password"),
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
          {superAdmin && <TabsTrigger value="fonnte"><Zap className="h-3.5 w-3.5 mr-1.5" />Fonnte</TabsTrigger>}
          {superAdmin && <TabsTrigger value="telegram"><Bot className="h-3.5 w-3.5 mr-1.5" />Telegram</TabsTrigger>}
          {superAdmin && <TabsTrigger value="reminder"><Bell className="h-3.5 w-3.5 mr-1.5" />Reminder Rules</TabsTrigger>}
        </TabsList>

        {/* Akun tab */}
        <TabsContent value="akun" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Informasi Akun</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-4"><span className="text-muted-foreground w-24">Nama:</span><span className="font-medium">{user?.name}</span></div>
              <div className="flex gap-4"><span className="text-muted-foreground w-24">Email:</span><span>{user?.email}</span></div>
              <div className="flex gap-4"><span className="text-muted-foreground w-24">Role:</span><span>{user?.roles?.map((r) => r.name).join(", ")}</span></div>
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


        {/* Fonnte tab */}
        <TabsContent value="fonnte" className="mt-4 space-y-4">
          {superAdmin && <FonnteTab />}
        </TabsContent>

        {/* Telegram tab */}
        <TabsContent value="telegram" className="mt-4 space-y-4">
          {superAdmin && <TelegramTab />}
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
