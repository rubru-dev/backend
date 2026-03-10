"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, KeyRound, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { adsAccountApi, adsTargetApi, type AdAccountPayload } from "@/lib/api/meta-ads";
import { formatRupiah } from "@/lib/utils";
import type { AdPlatformAccount, AdMonthlyTarget } from "@/types";

const PLATFORMS = ["Meta", "TikTok"];

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

// ── Account Dialog ────────────────────────────────────────────────────────────
function AccountDialog({
  open, onOpenChange, defaultValues, onSubmit, isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: AdPlatformAccount | null;
  onSubmit: (v: AdAccountPayload) => Promise<void>;
  isSaving?: boolean;
}) {
  const [platform, setPlatform] = useState(defaultValues?.platform ?? "Meta");
  const [accountName, setAccountName] = useState(defaultValues?.account_name ?? "");
  const [appId, setAppId] = useState(defaultValues?.app_id ?? "");
  const [appSecret, setAppSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [pixelId, setPixelId] = useState(defaultValues?.pixel_id ?? "");
  const [adAccountId, setAdAccountId] = useState(defaultValues?.ad_account_id ?? "");
  const [advertiserId, setAdvertiserId] = useState(defaultValues?.advertiser_id ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: AdAccountPayload = {
      platform,
      account_name: accountName,
      app_id: appId || undefined,
      app_secret: appSecret || undefined,
      access_token: accessToken || undefined,
      pixel_id: pixelId || undefined,
      ad_account_id: adAccountId || undefined,
      advertiser_id: advertiserId || undefined,
    };
    await onSubmit(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Akun Platform" : "Tambah Akun Platform"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform <span className="text-destructive">*</span></Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p} Ads</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Akun <span className="text-destructive">*</span></Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Akun utama" required />
            </div>
          </div>

          {platform === "Meta" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>App ID</Label>
                  <Input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="App ID Meta" />
                </div>
                <div className="space-y-2">
                  <Label>Ad Account ID</Label>
                  <Input value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} placeholder="act_xxxxxxxx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pixel ID</Label>
                  <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="Pixel ID" />
                </div>
                <div className="space-y-2">
                  <Label>App Secret {defaultValues?.app_secret && <span className="text-xs text-muted-foreground ml-1">sudah diset</span>}</Label>
                  <Input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={defaultValues?.app_secret ? "Kosongkan jika tidak diganti" : "App Secret"} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Token {defaultValues?.access_token && <span className="text-xs text-muted-foreground ml-1">sudah diset</span>}</Label>
                <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder={defaultValues?.access_token ? "Kosongkan jika tidak diganti" : "Access Token (Long-lived)"} />
              </div>
            </>
          )}

          {platform === "TikTok" && (
            <>
              <div className="space-y-2">
                <Label>Advertiser ID</Label>
                <Input value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)} placeholder="Advertiser ID TikTok" />
              </div>
              <div className="space-y-2">
                <Label>Access Token {defaultValues?.access_token && <span className="text-xs text-muted-foreground ml-1">sudah diset</span>}</Label>
                <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder={defaultValues?.access_token ? "Kosongkan jika tidak diganti" : "Access Token TikTok"} />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSaving || !accountName.trim()}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Setup Platform Tab ────────────────────────────────────────────────────────
function SetupPlatformTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AdPlatformAccount | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncBulan, setSyncBulan] = useState(now.getMonth() + 1);
  const [syncTahun, setSyncTahun] = useState(now.getFullYear());

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/bd/ads/accounts"],
    queryFn: () => adsAccountApi.list(),
  });

  async function handleSubmit(payload: AdAccountPayload) {
    setIsSaving(true);
    try {
      if (editAccount) {
        await adsAccountApi.update(editAccount.id, payload);
        toast.success("Akun diperbarui");
      } else {
        await adsAccountApi.create(payload);
        toast.success("Akun ditambahkan");
      }
      setDialogOpen(false);
      setEditAccount(null);
      qc.invalidateQueries({ queryKey: ["/bd/ads/accounts"] });
    } catch { toast.error("Gagal menyimpan akun"); }
    finally { setIsSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus akun ini?")) return;
    try {
      await adsAccountApi.delete(id);
      toast.success("Akun dihapus");
      qc.invalidateQueries({ queryKey: ["/bd/ads/accounts"] });
    } catch { toast.error("Gagal menghapus"); }
  }

  async function handleSync(id: number) {
    setSyncingId(id);
    try {
      const result = await adsAccountApi.sync(id, syncBulan, syncTahun);
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["/bd/ads/accounts"] });
      qc.invalidateQueries({ queryKey: ["/bd/meta-ads/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/bd/meta-ads/campaigns"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal sync. Periksa kredensial akun.";
      toast.error(msg);
    } finally {
      setSyncingId(null);
    }
  }

  const platformColor: Record<string, string> = {
    Meta: "bg-blue-100 text-blue-700",
    TikTok: "bg-slate-900 text-white",
  };

  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Sync period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sync untuk:</span>
          <Select value={String(syncBulan)} onValueChange={(v) => setSyncBulan(Number(v))}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(syncTahun)} onValueChange={(v) => setSyncTahun(Number(v))}>
            <SelectTrigger className="w-20 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditAccount(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Akun
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Belum ada akun platform iklan.<br />Klik "Tambah Akun" untuk menambahkan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${platformColor[acc.platform] ?? "bg-slate-100 text-slate-700"}`}>
                      {acc.platform} Ads
                    </span>
                    <CardTitle className="text-base">{acc.account_name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {acc.is_active
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <XCircle className="h-4 w-4 text-slate-400" />}
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditAccount(acc); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(acc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {acc.platform === "Meta" && (
                  <>
                    <CredRow label="App ID" value={acc.app_id} />
                    <CredRow label="Ad Account ID" value={acc.ad_account_id} />
                    <CredRow label="Pixel ID" value={acc.pixel_id} />
                    <CredRow label="App Secret" value={acc.app_secret} masked />
                    <CredRow label="Access Token" value={acc.access_token} masked />
                  </>
                )}
                {acc.platform === "TikTok" && (
                  <>
                    <CredRow label="Advertiser ID" value={acc.advertiser_id} />
                    <CredRow label="Access Token" value={acc.access_token} masked />
                  </>
                )}
                {/* Sync row */}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {acc.last_synced_at
                      ? `Terakhir sync: ${new Date(acc.last_synced_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                      : "Belum pernah sync"}
                  </span>
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs gap-1"
                    disabled={syncingId === acc.id}
                    onClick={() => handleSync(acc.id)}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncingId === acc.id ? "animate-spin" : ""}`} />
                    {syncingId === acc.id ? "Syncing..." : `Sync ${MONTHS[syncBulan - 1]}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AccountDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditAccount(null); }}
        defaultValues={editAccount}
        onSubmit={handleSubmit}
        isSaving={isSaving}
      />
    </div>
  );
}

function CredRow({ label, value, masked }: { label: string; value: string | null; masked?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <KeyRound className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-28 text-xs">{label}</span>
      {value
        ? <Badge variant="secondary" className="text-xs font-mono">{masked ? "••••••" : value}</Badge>
        : <span className="text-xs text-slate-400 italic">belum diset</span>}
    </div>
  );
}

// ── Target Bulanan Tab ────────────────────────────────────────────────────────
function TargetBulananTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [saving, setSaving] = useState<string | null>(null); // "Meta" | "TikTok"

  const { data: targets = [] } = useQuery({
    queryKey: ["/bd/ads/targets", bulan, tahun],
    queryFn: () => adsTargetApi.list({ bulan, tahun }),
  });

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  function getTarget(platform: string): AdMonthlyTarget | undefined {
    return targets.find((t) => t.platform === platform);
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={String(bulan)} onValueChange={(v) => setBulan(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <TargetCard
            key={platform}
            platform={platform}
            bulan={bulan}
            tahun={tahun}
            existingTarget={getTarget(platform)}
            isSaving={saving === platform}
            onSave={async (payload) => {
              setSaving(platform);
              try {
                await adsTargetApi.upsert(payload);
                toast.success(`Target ${platform} disimpan`);
                qc.invalidateQueries({ queryKey: ["/bd/ads/targets", bulan, tahun] });
              } catch { toast.error("Gagal menyimpan target"); }
              finally { setSaving(null); }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TargetCard({
  platform, bulan, tahun, existingTarget, isSaving, onSave,
}: {
  platform: string;
  bulan: number;
  tahun: number;
  existingTarget?: AdMonthlyTarget;
  isSaving?: boolean;
  onSave: (payload: import("@/lib/api/meta-ads").AdTargetPayload) => Promise<void>;
}) {
  const [spend, setSpend] = useState(String(existingTarget?.target_spend ?? ""));
  const [impressions, setImpressions] = useState(String(existingTarget?.target_impressions ?? ""));
  const [clicks, setClicks] = useState(String(existingTarget?.target_clicks ?? ""));
  const [conversions, setConversions] = useState(String(existingTarget?.target_conversions ?? ""));
  const [ctr, setCtr] = useState(String(existingTarget?.target_ctr ?? ""));
  const [roas, setRoas] = useState(String(existingTarget?.target_roas ?? ""));

  // Sync when existingTarget changes (month/year switch)
  const key = `${platform}-${bulan}-${tahun}`;

  return (
    <Card key={key}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${platform === "Meta" ? "bg-blue-100 text-blue-700" : "bg-slate-900 text-white"}`}>
            {platform} Ads
          </span>
          Target {MONTHS[bulan - 1]} {tahun}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Target Spend (Rp)</Label>
            <Input
              type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_spend ?? ""}
              onChange={(e) => setSpend(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Impressions</Label>
            <Input
              type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_impressions ?? ""}
              onChange={(e) => setImpressions(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Klik</Label>
            <Input
              type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_clicks ?? ""}
              onChange={(e) => setClicks(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Conversions</Label>
            <Input
              type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_conversions ?? ""}
              onChange={(e) => setConversions(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target CTR (%)</Label>
            <Input
              type="number" min={0} step={0.01} placeholder="0.00"
              defaultValue={existingTarget?.target_ctr ?? ""}
              onChange={(e) => setCtr(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target ROAS</Label>
            <Input
              type="number" min={0} step={0.01} placeholder="0.00"
              defaultValue={existingTarget?.target_roas ?? ""}
              onChange={(e) => setRoas(e.target.value)}
            />
          </div>
        </div>
        <Button
          size="sm" className="w-full" disabled={isSaving}
          onClick={() => onSave({
            platform, bulan, tahun,
            target_spend: spend ? parseFloat(spend) : null,
            target_impressions: impressions ? parseInt(impressions) : null,
            target_clicks: clicks ? parseInt(clicks) : null,
            target_conversions: conversions ? parseInt(conversions) : null,
            target_ctr: ctr ? parseFloat(ctr) : null,
            target_roas: roas ? parseFloat(roas) : null,
          })}
        >
          {isSaving ? "Menyimpan..." : "Simpan Target"}
        </Button>
        {existingTarget && (
          <p className="text-xs text-muted-foreground text-center">
            Spend: {existingTarget.target_spend != null ? formatRupiah(existingTarget.target_spend) : "—"} &nbsp;|&nbsp;
            Klik: {existingTarget.target_clicks ?? "—"} &nbsp;|&nbsp;
            CTR: {existingTarget.target_ctr != null ? `${existingTarget.target_ctr}%` : "—"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MetaAdsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Setup Ads"
        description="Konfigurasi API platform iklan (Meta Ads, TikTok Ads) dan target bulanan"
      />
      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">Setup Platform</TabsTrigger>
          <TabsTrigger value="targets">Target Bulanan</TabsTrigger>
        </TabsList>
        <TabsContent value="setup" className="mt-4">
          <SetupPlatformTab />
        </TabsContent>
        <TabsContent value="targets" className="mt-4">
          <TargetBulananTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
