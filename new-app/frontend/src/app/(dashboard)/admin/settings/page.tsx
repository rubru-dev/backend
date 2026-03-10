"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { Settings, MessageCircle, Bell, Send, Eye, EyeOff, Loader2, Check } from "lucide-react";

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
          {superAdmin && <TabsTrigger value="fontee"><MessageCircle className="h-3.5 w-3.5 mr-1.5" />Fontee WhatsApp</TabsTrigger>}
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
              <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-600" />Konfigurasi Fontee API</CardTitle>
              <CardDescription>Isi kredensial Fontee WhatsApp Business API. Konfigurasi ini digunakan untuk pengiriman reminder otomatis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fonteeLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat konfigurasi...</div>
              ) : (
                <>
                  <div>
                    <Label>Base URL</Label>
                    <Input
                      placeholder="https://api.fontee.io/v1"
                      value={fonteeForm.base_url}
                      onChange={(e) => { setFonteeForm({ ...fonteeForm, base_url: e.target.value }); setFonteeSynced(false); }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">URL dasar Fontee API (tanpa trailing slash)</p>
                  </div>
                  <div>
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Masukkan API key Fontee"
                      value={fonteeForm.api_key}
                      onChange={(e) => { setFonteeForm({ ...fonteeForm, api_key: e.target.value }); setFonteeSynced(false); }}
                    />
                  </div>
                  <div>
                    <Label>Sender Number</Label>
                    <Input
                      placeholder="628xxxxxxxxxx"
                      value={fonteeForm.sender_number}
                      onChange={(e) => { setFonteeForm({ ...fonteeForm, sender_number: e.target.value }); setFonteeSynced(false); }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Nomor WhatsApp pengirim (format internasional tanpa +)</p>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Aturan Reminder Otomatis</CardTitle>
              <CardDescription>Atur kapan dan kepada siapa reminder WhatsApp dikirim untuk setiap fitur sistem.</CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" />Memuat rules...</div>
              ) : (rulesData?.rules?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Belum ada reminder rules. Jalankan seeder untuk membuat rules default.</p>
              ) : (
                <div className="space-y-4">
                  {rulesData?.rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{rule.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">{rule.feature}</p>
                        </div>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(v) => updateRuleMut.mutate({ id: rule.id, data: { is_active: v } })}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs whitespace-nowrap">Hari sebelum deadline:</Label>
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
                      <div>
                        <Label className="text-xs">Role yang direminder:</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {rulesData?.roles.map((role) => {
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
