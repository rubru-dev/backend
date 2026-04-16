"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, KeyRound, CheckCircle2, XCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  goldenMetaAdsApi, goldenTargetApi,
  type GoldenCampaign, type GoldenMonthlyTarget, type GoldenTargetPayload,
} from "@/lib/api/golden-meta-ads";
import { formatRupiah } from "@/lib/utils";

const PLATFORMS = ["Meta", "TikTok"];

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

// ── Campaign (Account) Dialog ─────────────────────────────────────────────────
function CampaignDialog({
  open, onOpenChange, defaultValues, onSubmit, isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: GoldenCampaign | null;
  onSubmit: (v: Partial<GoldenCampaign>) => Promise<void>;
  isSaving?: boolean;
}) {
  const [platform, setPlatform] = useState(defaultValues?.platform ?? "Meta");
  const [campaignName, setCampaignName] = useState(defaultValues?.campaign_name ?? "");
  const [accountName, setAccountName] = useState(defaultValues?.account_name ?? "");
  const [appId, setAppId] = useState(defaultValues?.app_id ?? "");
  const [adAccountId, setAdAccountId] = useState(defaultValues?.ad_account_id ?? "");
  const [pixelId, setPixelId] = useState(defaultValues?.pixel_id ?? "");
  const [appSecret, setAppSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      platform,
      campaign_name: campaignName,
      account_name: accountName || null,
      app_id: appId || null,
      ad_account_id: adAccountId || null,
      pixel_id: pixelId || null,
      app_secret: appSecret || null,
      access_token: accessToken || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Kampanye" : "Tambah Kampanye"}</DialogTitle>
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
              <Label>Nama Kampanye <span className="text-destructive">*</span></Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Nama kampanye" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nama Akun</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Nama akun Meta Ads" />
          </div>

          <Separator />

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
                  <Label>
                    App Secret{" "}
                    {defaultValues?.has_credentials && <span className="text-xs text-muted-foreground ml-1">sudah diset</span>}
                  </Label>
                  <Input
                    type="password"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder={defaultValues?.has_credentials ? "Kosongkan jika tidak diganti" : "App Secret"}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Access Token{" "}
                  {defaultValues?.has_credentials && <span className="text-xs text-muted-foreground ml-1">sudah diset</span>}
                </Label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={defaultValues?.has_credentials ? "Kosongkan jika tidak diganti" : "Access Token (Long-lived)"}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {platform === "TikTok" && (
            <div className="space-y-2">
              <Label>
                Access Token{" "}
                {defaultValues?.has_credentials && <span className="text-xs text-muted-foreground ml-1">sudah diset</span>}
              </Label>
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={defaultValues?.has_credentials ? "Kosongkan jika tidak diganti" : "Access Token TikTok"}
                autoComplete="new-password"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSaving || !campaignName.trim()}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CredRow({ label, value, masked }: { label: string; value: string | null | undefined; masked?: boolean }) {
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

const PLATFORM_COLOR: Record<string, string> = {
  Meta: "bg-blue-100 text-blue-700",
  TikTok: "bg-slate-900 text-white",
  Instagram: "bg-pink-100 text-pink-700",
  YouTube: "bg-red-100 text-red-700",
  Google: "bg-green-100 text-green-700",
};

// ── Setup Platform Tab ────────────────────────────────────────────────────────
function SetupPlatformTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<GoldenCampaign | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [syncBulan, setSyncBulan] = useState(now.getMonth() + 1);
  const [syncTahun, setSyncTahun] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["/golden/meta-ads/campaigns"],
    queryFn: () => goldenMetaAdsApi.listCampaigns({ include_hidden: true }),
  });
  const campaigns = data?.items ?? [];

  const years = [now.getFullYear(), now.getFullYear() - 1];

  async function handleSubmit(payload: Partial<GoldenCampaign>) {
    setIsSaving(true);
    try {
      if (editCampaign) {
        await goldenMetaAdsApi.updateCampaign(editCampaign.id, payload);
        toast.success("Kampanye diperbarui");
      } else {
        await goldenMetaAdsApi.createCampaign(payload);
        toast.success("Kampanye ditambahkan");
      }
      setDialogOpen(false);
      setEditCampaign(null);
      qc.invalidateQueries({ queryKey: ["/golden/meta-ads/campaigns"] });
    } catch { toast.error("Gagal menyimpan kampanye"); }
    finally { setIsSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus kampanye ini?")) return;
    try {
      await goldenMetaAdsApi.deleteCampaign(id);
      toast.success("Kampanye dihapus");
      qc.invalidateQueries({ queryKey: ["/golden/meta-ads/campaigns"] });
    } catch { toast.error("Gagal menghapus"); }
  }

  async function handleSync(id: number) {
    setSyncingId(id);
    try {
      const result = await goldenMetaAdsApi.syncCampaign(id, syncBulan, syncTahun);
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["/golden/meta-ads/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/golden/meta-ads/dashboard"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal sync. Periksa kredensial kampanye.";
      toast.error(msg);
    } finally { setSyncingId(null); }
  }

  async function handleRefreshToken(id: number) {
    setRefreshingId(id);
    try {
      const result = await goldenMetaAdsApi.refreshToken(id);
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["/golden/meta-ads/campaigns"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Gagal refresh token";
      toast.error(msg);
    } finally { setRefreshingId(null); }
  }

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
        <Button onClick={() => { setEditCampaign(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Kampanye
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Belum ada kampanye.<br />Klik "Tambah Kampanye" untuk menambahkan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLATFORM_COLOR[c.platform] ?? "bg-slate-100 text-slate-700"}`}>
                      {c.platform} Ads
                    </span>
                    <CardTitle className="text-base truncate">{c.campaign_name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.has_credentials
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <XCircle className="h-4 w-4 text-slate-400" />}
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditCampaign(c); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {c.account_name && (
                  <div className="text-xs text-muted-foreground truncate">Akun: <span className="font-medium text-foreground">{c.account_name}</span></div>
                )}

                {c.platform === "Meta" && (
                  <>
                    <CredRow label="App ID" value={c.app_id_set ? "(diset)" : null} />
                    <CredRow label="Ad Account ID" value={c.ad_account_id_display} />
                    <CredRow label="Pixel ID" value={c.pixel_id_display} />
                    <CredRow label="App Secret" value={c.has_credentials ? "diset" : null} masked />
                    <CredRow label="Access Token" value={c.has_credentials ? "diset" : null} masked />
                    {/* Token status */}
                    {(() => {
                      const refreshedAt = c.token_refreshed_at ? new Date(c.token_refreshed_at) : null;
                      const daysSince = refreshedAt ? Math.floor((Date.now() - refreshedAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
                      const daysLeft = daysSince !== null ? 60 - daysSince : null;
                      return (
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${daysLeft === null ? "bg-gray-50 text-gray-500" : daysLeft <= 7 ? "bg-red-50 text-red-600" : daysLeft <= 14 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: daysLeft === null ? "#9ca3af" : daysLeft <= 7 ? "#dc2626" : daysLeft <= 14 ? "#d97706" : "#16a34a" }} />
                          {daysLeft === null
                            ? "Token belum pernah di-refresh manual"
                            : daysLeft <= 0
                              ? "Token sudah expired! Refresh sekarang."
                              : `Token valid ~${daysLeft} hari lagi • Auto-refresh hari ke-45`}
                        </div>
                      );
                    })()}
                  </>
                )}

                {c.platform === "TikTok" && (
                  <CredRow label="Access Token" value={c.has_credentials ? "diset" : null} masked />
                )}

                {/* Sync row */}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {c.last_synced_at
                      ? `Terakhir sync: ${new Date(c.last_synced_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                      : "Belum pernah sync"}
                  </span>
                  <div className="flex items-center gap-1">
                    {c.platform === "Meta" && c.has_credentials && (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                        disabled={refreshingId === c.id}
                        onClick={() => handleRefreshToken(c.id)}
                        title="Perpanjang masa berlaku access token (~60 hari)"
                      >
                        <RefreshCw className={`h-3 w-3 ${refreshingId === c.id ? "animate-spin" : ""}`} />
                        {refreshingId === c.id ? "Refreshing..." : "Refresh Token"}
                      </Button>
                    )}
                    {c.has_credentials && (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1"
                        disabled={syncingId === c.id}
                        onClick={() => handleSync(c.id)}
                      >
                        <RefreshCw className={`h-3 w-3 ${syncingId === c.id ? "animate-spin" : ""}`} />
                        {syncingId === c.id ? "Syncing..." : `Sync ${MONTHS[syncBulan - 1]}`}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CampaignDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditCampaign(null); }}
        defaultValues={editCampaign}
        onSubmit={handleSubmit}
        isSaving={isSaving}
      />
    </div>
  );
}

// ── Target Bulanan Tab ────────────────────────────────────────────────────────
function TargetBulananTab() {
  const qc = useQueryClient();
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [saving, setSaving] = useState<string | null>(null);

  const { data: targets = [] } = useQuery({
    queryKey: ["/golden/ads/targets", bulan, tahun],
    queryFn: () => goldenTargetApi.list({ bulan, tahun }),
  });

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  function getTarget(platform: string): GoldenMonthlyTarget | undefined {
    return targets.find((t) => t.platform === platform);
  }

  return (
    <div className="space-y-4">
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
                await goldenTargetApi.upsert(payload);
                toast.success(`Target ${platform} disimpan`);
                qc.invalidateQueries({ queryKey: ["/golden/ads/targets", bulan, tahun] });
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
  existingTarget?: GoldenMonthlyTarget;
  isSaving?: boolean;
  onSave: (payload: GoldenTargetPayload) => Promise<void>;
}) {
  const [spend, setSpend] = useState(String(existingTarget?.target_spend ?? ""));
  const [impressions, setImpressions] = useState(String(existingTarget?.target_impressions ?? ""));
  const [clicks, setClicks] = useState(String(existingTarget?.target_clicks ?? ""));
  const [conversions, setConversions] = useState(String(existingTarget?.target_conversions ?? ""));
  const [ctr, setCtr] = useState(String(existingTarget?.target_ctr ?? ""));
  const [roas, setRoas] = useState(String(existingTarget?.target_roas ?? ""));

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
            <Input type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_spend ?? ""}
              onChange={(e) => setSpend(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Impressions</Label>
            <Input type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_impressions ?? ""}
              onChange={(e) => setImpressions(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Klik</Label>
            <Input type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_clicks ?? ""}
              onChange={(e) => setClicks(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Conversions</Label>
            <Input type="number" min={0} placeholder="0"
              defaultValue={existingTarget?.target_conversions ?? ""}
              onChange={(e) => setConversions(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target CTR (%)</Label>
            <Input type="number" min={0} step={0.01} placeholder="0.00"
              defaultValue={existingTarget?.target_ctr ?? ""}
              onChange={(e) => setCtr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target ROAS</Label>
            <Input type="number" min={0} step={0.01} placeholder="0.00"
              defaultValue={existingTarget?.target_roas ?? ""}
              onChange={(e) => setRoas(e.target.value)} />
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

// ── Kelola Kampanye Tab ───────────────────────────────────────────────────────
function KelolaCampaignTab() {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/golden/meta-ads/campaigns"],
    queryFn: () => goldenMetaAdsApi.listCampaigns({ include_hidden: true }),
  });

  const campaigns = data?.items ?? [];

  async function handleToggle(id: number) {
    setToggling(id);
    try {
      await goldenMetaAdsApi.toggleHidden(id);
      qc.invalidateQueries({ queryKey: ["/golden/meta-ads/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/golden/meta-ads/dashboard"] });
      toast.success("Status kampanye diperbarui");
    } catch {
      toast.error("Gagal mengubah status kampanye");
    } finally {
      setToggling(null);
    }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground py-6 text-center">Memuat...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kelola Visibilitas Kampanye</CardTitle>
        <p className="text-xs text-muted-foreground">
          Kampanye yang disembunyikan tidak akan tampil di Dashboard Ads dan dropdown filter.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Belum ada kampanye.</p>
        ) : (
          <div className="divide-y">
            {campaigns.map((c) => (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${c.is_hidden ? "bg-muted/40" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${c.is_hidden ? "text-muted-foreground line-through" : ""}`}>
                    {c.campaign_name ?? `Campaign #${c.id}`}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.platform ?? "Meta"}</Badge>
                    {c.is_hidden && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Tersembunyi</Badge>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={toggling === c.id}
                  onClick={() => handleToggle(Number(c.id))}
                  className={c.is_hidden ? "text-muted-foreground" : "text-orange-500 hover:text-orange-600"}
                  title={c.is_hidden ? "Tampilkan di dashboard" : "Sembunyikan dari dashboard"}
                >
                  {toggling === c.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : c.is_hidden ? (
                    <><EyeOff className="h-4 w-4 mr-1" /><span className="text-xs">Tersembunyi</span></>
                  ) : (
                    <><Eye className="h-4 w-4 mr-1" /><span className="text-xs">Tampil</span></>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GoldenMetaAdsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Setup Ads Golden"
        description="Konfigurasi API platform iklan RubahrumahxGolden dan target bulanan"
      />
      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">Setup Platform</TabsTrigger>
          <TabsTrigger value="targets">Target Bulanan</TabsTrigger>
          <TabsTrigger value="campaigns">Kelola Kampanye</TabsTrigger>
        </TabsList>
        <TabsContent value="setup" className="mt-4">
          <SetupPlatformTab />
        </TabsContent>
        <TabsContent value="targets" className="mt-4">
          <TargetBulananTab />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <KelolaCampaignTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
