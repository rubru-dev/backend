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
import { Settings, MessageCircle, Bell, Send, Eye, EyeOff, Loader2, Check, FlaskConical, CalendarClock, Zap } from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  Urgent: "bg-red-100 text-red-700 border-red-200",
  Tinggi: "bg-orange-100 text-orange-700 border-orange-200",
  Sedang: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Rendah: "bg-green-100 text-green-700 border-green-200",
  Event:  "bg-blue-100 text-blue-700 border-blue-200",
};

function PriorityBadge({ priority }: { priority: ReminderRule["priority"] }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[priority.level] ?? "bg-muted text-muted-foreground"}`}>
      {priority.level}
    </span>
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
            <PriorityBadge priority={rule.priority} />
            {rule.trigger_type === "event"
              ? <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600"><Zap className="h-2.5 w-2.5" />Event</span>
              : <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500"><CalendarClock className="h-2.5 w-2.5" />Deadline</span>}
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

export default function SettingsPage() {
  const { user, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const qc = useQueryClient();

  // Password change
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  // Fontee config form
  const [fonteeForm, setFonteeForm] = useState({ api_key: "", base_url: "", sender_number: "" });
  const [fonteeSynced, setFonteeSynced] = useState(false);
  const [testNum, setTestNum] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini pesan test dari sistem RubahRumah.");

  const changePwMut = useMutation({
    mutationFn: (d: any) => apiClient.post("/auth/change-password", d).then((r) => r.data),
    onSuccess: () => { toast.success("Password berhasil diubah"); setPwForm({ old_password: "", new_password: "", confirm: "" }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal ubah password"),
  });

  const { isLoading: fonteeLoading } = useQuery({
    queryKey: ["fontee-config"],
    queryFn: async () => {
      const data = await adminApi.getFonteeConfig();
      setFonteeForm({ api_key: data.api_key, base_url: data.base_url, sender_number: data.sender_number });
      setFonteeSynced(true);
      return data;
    },
    staleTime: Infinity,
    retry: false,
    enabled: superAdmin,
  });

  const saveFonteeMut = useMutation({
    mutationFn: (d: any) => adminApi.saveFonteeConfig(d),
    onSuccess: () => { toast.success("Konfigurasi Fontee disimpan"); qc.invalidateQueries({ queryKey: ["fontee-config"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal menyimpan"),
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
          {superAdmin && <TabsTrigger value="fontee"><MessageCircle className="h-3.5 w-3.5 mr-1.5" />Fonnte WhatsApp</TabsTrigger>}
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

        {/* Fontee tab */}
        <TabsContent value="fontee" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-600" />Konfigurasi Fonnte API</CardTitle>
              <CardDescription>Isi kredensial Fonnte WhatsApp API. Konfigurasi ini digunakan untuk pengiriman reminder otomatis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fonteeLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat konfigurasi...</div>
              ) : (
                <>
                  <div>
                    <Label>Base URL</Label>
                    <Input
                      placeholder="https://api.fonnte.com/send"
                      value={fonteeForm.base_url}
                      onChange={(e) => { setFonteeForm({ ...fonteeForm, base_url: e.target.value }); setFonteeSynced(false); }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Endpoint Fonnte API — isi: https://api.fonnte.com/send</p>
                  </div>
                  <div>
                    <Label>Token Fonnte</Label>
                    <Input
                      type="password"
                      placeholder="Masukkan token dari dashboard Fonnte"
                      value={fonteeForm.api_key}
                      onChange={(e) => { setFonteeForm({ ...fonteeForm, api_key: e.target.value }); setFonteeSynced(false); }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Token dari app.fonnte.com → perangkat → token</p>
                  </div>
                  <div>
                    <Label>Sender Number</Label>
                    <Input
                      placeholder="628xxxxxxxxxx"
                      value={fonteeForm.sender_number}
                      onChange={(e) => { setFonteeForm({ ...fonteeForm, sender_number: e.target.value }); setFonteeSynced(false); }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Nomor WhatsApp yang terhubung ke Fonnte (format internasional tanpa +)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => saveFonteeMut.mutate(fonteeForm)} disabled={saveFonteeMut.isPending}>
                      {saveFonteeMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Menyimpan...</> : "Simpan Konfigurasi"}
                    </Button>
                    {fonteeSynced && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" />Tersinkronisasi</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Test Kirim Pesan</CardTitle>
              <CardDescription>Kirim pesan percobaan untuk memverifikasi konfigurasi Fontee.</CardDescription>
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
