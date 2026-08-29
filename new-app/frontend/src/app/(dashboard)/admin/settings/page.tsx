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
import { Settings, Bell, Send, Eye, EyeOff, Loader2, FlaskConical, CalendarClock, Zap, Bot, RefreshCw, Mail } from "lucide-react";

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

// Konfigurasi SMTP disimpan di database (bukan .env) supaya bisa diubah tanpa
// deploy — KECUALI password, yang sengaja hanya dibaca dari env SMTP_PASSWORD
// di server dan tidak pernah dikirim balik ke browser.
function EmailTab() {
  const [form, setForm] = useState({
    host: "", port: 465, secure: true, user: "", from_name: "RubahRumah", from_email: "",
  });
  const [passwordSet, setPasswordSet] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini email test dari sistem RubahRumah.");

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["email-config"],
    queryFn: () => adminApi.getEmailConfig(),
  });

  useEffect(() => {
    if (!cfg) return;
    setForm({
      host: cfg.host ?? "",
      port: cfg.port ?? 465,
      secure: cfg.secure ?? true,
      user: cfg.user ?? "",
      from_name: cfg.from_name || "RubahRumah",
      from_email: cfg.from_email ?? "",
    });
    setPasswordSet(Boolean(cfg.password_set));
  }, [cfg]);

  const save = useMutation({
    mutationFn: () => adminApi.saveEmailConfig(form),
    onSuccess: () => toast.success("Konfigurasi email disimpan"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan konfigurasi email"),
  });

  const cek = useMutation({
    mutationFn: () => adminApi.getEmailStatus(),
    onSuccess: (d) => toast.success(d?.message || "Koneksi SMTP berhasil"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal konek SMTP"),
  });

  const kirimTest = useMutation({
    mutationFn: () => adminApi.sendEmailTest({ target_email: testEmail, message: testMsg }),
    onSuccess: () => toast.success("Email test terkirim"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal kirim email test"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi Email (SMTP)</CardTitle>
          <CardDescription>
            Alamat pengirim utama untuk semua notifikasi. Telegram dan email dikirim bersamaan —
            user yang punya keduanya menerima dua-duanya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>SMTP Host</Label>
                  <Input
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={form.port}
                    onChange={(e) => {
                      const port = parseInt(e.target.value) || 465;
                      // 465 = SMTPS; 587 = STARTTLS. Salah pasang di sini adalah
                      // penyebab paling umum "connection timeout".
                      setForm({ ...form, port, secure: port !== 587 });
                    }}
                    placeholder="465"
                  />
                  <p className="text-xs text-muted-foreground mt-1">465 = SSL, 587 = STARTTLS</p>
                </div>
              </div>

              <div>
                <Label>Akun Pengirim (login SMTP)</Label>
                <Input
                  value={form.user}
                  onChange={(e) => setForm({ ...form, user: e.target.value })}
                  placeholder="notifikasi@rubahrumah.com"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nama Pengirim</Label>
                  <Input
                    value={form.from_name}
                    onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                    placeholder="RubahRumah"
                  />
                </div>
                <div>
                  <Label>Alamat From</Label>
                  <Input
                    value={form.from_email}
                    onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                    placeholder="samakan dengan akun pengirim"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kosongkan = ikut akun pengirim. Alamat berbeda dianggap spoofing dan masuk spam.
                  </p>
                </div>
              </div>

              <div className={`rounded-md border p-3 text-sm ${passwordSet ? "border-green-300 bg-green-50 text-green-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
                {passwordSet ? (
                  <>Password SMTP sudah terpasang di server.</>
                ) : (
                  <>
                    <b>Password SMTP belum di-set.</b> Demi keamanan, password tidak disimpan di
                    database. Isi <code>SMTP_PASSWORD</code> di file <code>.env</code> server lalu
                    restart backend. Untuk Gmail, pakai <b>App Password</b> 16 karakter (butuh 2FA aktif).
                  </>
                )}
              </div>

              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cek Koneksi</CardTitle>
          <CardDescription>Verifikasi login SMTP tanpa mengirim email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => cek.mutate()} disabled={cek.isPending}>
            {cek.isPending ? "Mengecek..." : "Cek Koneksi SMTP"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kirim Email Test</CardTitle>
          <CardDescription>
            Kirim ke alamat mana pun untuk memastikan email benar-benar sampai — cek juga folder Spam.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Email Tujuan</Label>
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="nama@contoh.com"
            />
          </div>
          <div>
            <Label>Pesan</Label>
            <Input value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
          </div>
          <Button
            onClick={() => kirimTest.mutate()}
            disabled={kirimTest.isPending || !testEmail || !testMsg}
          >
            {kirimTest.isPending ? "Mengirim..." : "Kirim Test"}
          </Button>
        </CardContent>
      </Card>
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
    mutationFn: () => adminApi.getTelegramUpdates(20),
    onSuccess: (data) => {
      if ((data.messages?.length ?? 0) === 0) toast.info("Belum ada update. Kirim /start ke bot, lalu ambil ulang.");
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal ambil chat Telegram"),
  });

  const sendTestMut = useMutation({
    mutationFn: (d: { chat_id: string; message: string }) => adminApi.sendTelegramTest(d),
    onSuccess: () => toast.success("Pesan test Telegram berhasil dikirim!"),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal kirim pesan test Telegram"),
  });

  const chats = updatesMut.data?.chats ?? [];
  const messages = updatesMut.data?.messages ?? [];

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
          <CardDescription>Kirim /start ke bot, lalu ambil hingga 20 update terakhir untuk menemukan chat id personal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={() => updatesMut.mutate()} disabled={updatesMut.isPending}>
            {updatesMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Mengambil...</> : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Ambil 20 Chat Terakhir</>}
          </Button>
          {messages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">20 update/pesan terakhir</p>
              {messages.map((message) => (
                <div key={message.update_id} className="border rounded-md p-3 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{message.title || message.username || message.chat_id}</div>
                    <div className="text-xs text-muted-foreground">chat_id: <span className="font-mono">{message.chat_id}</span> · {message.type ?? "-"}</div>
                    {message.text && <div className="text-xs text-muted-foreground truncate mt-1">{message.text}</div>}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm({ ...form, default_chat_id: message.chat_id });
                      setTestChatId(message.chat_id);
                    }}
                  >
                    Pakai
                  </Button>
                </div>
              ))}
            </div>
          )}
          {chats.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Chat unik dari update terakhir</p>
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
          {superAdmin && <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1.5" />Email</TabsTrigger>}
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


        {/* Email tab */}
        <TabsContent value="email" className="mt-4 space-y-4">
          {superAdmin && <EmailTab />}
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
