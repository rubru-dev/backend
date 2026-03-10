"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi } from "@/lib/api/content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, Instagram, Youtube, ExternalLink, Save, Target } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  platform: string;
  account_name: string;
  username: string | null;
  profile_url: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  has_instagram_token: boolean;
  instagram_user_id: string | null;
  instagram_page_id: string | null;
  has_tiktok_token: boolean;
  tiktok_open_id: string | null;
  youtube_channel_id: string | null;
  has_youtube_token: boolean;
  created_at: string | null;
}

interface PostMetric {
  id: string;
  account_id: string;
  platform: string | null;
  account_name: string | null;
  judul_konten: string | null;
  link_konten: string | null;
  tanggal: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  watch_time_minutes: number | null;
  engagement_rate: number | null;
  data_source: string;
}

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700 border-pink-200",
  TIKTOK: "bg-slate-100 text-slate-700 border-slate-200",
  YOUTUBE: "bg-red-100 text-red-700 border-red-200",
};

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

// ── Platform Icon ──────────────────────────────────────────────────────────────

function PlatformIcon({ platform, className = "h-4 w-4" }: { platform: string; className?: string }) {
  if (platform === "INSTAGRAM") return <Instagram className={className} />;
  if (platform === "YOUTUBE") return <Youtube className={className} />;
  // TikTok — use text
  return <span className="font-bold text-xs">TT</span>;
}

// ── Account Dialog ─────────────────────────────────────────────────────────────

function AccountDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Account | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!existing;

  const [form, setForm] = useState({
    platform: existing?.platform ?? "INSTAGRAM",
    account_name: existing?.account_name ?? "",
    username: existing?.username ?? "",
    profile_url: existing?.profile_url ?? "",
    instagram_user_id: existing?.instagram_user_id ?? "",
    instagram_access_token: "",
    instagram_page_id: existing?.instagram_page_id ?? "",
    tiktok_open_id: existing?.tiktok_open_id ?? "",
    tiktok_access_token: "",
    youtube_channel_id: existing?.youtube_channel_id ?? "",
    youtube_access_token: "",
    is_active: existing?.is_active ?? true,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: (data: any) => contentApi.createAccount(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["social-accounts"] }); toast.success("Akun ditambahkan"); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => contentApi.updateAccount(existing!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["social-accounts"] }); toast.success("Akun diperbarui"); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  function submit() {
    const payload: any = {
      platform: form.platform,
      account_name: form.account_name || null,
      username: form.username || null,
      profile_url: form.profile_url || null,
      is_active: form.is_active,
    };
    if (form.platform === "INSTAGRAM") {
      if (form.instagram_user_id) payload.instagram_user_id = form.instagram_user_id;
      if (form.instagram_access_token) payload.instagram_access_token = form.instagram_access_token;
      if (form.instagram_page_id) payload.instagram_page_id = form.instagram_page_id;
    } else if (form.platform === "TIKTOK") {
      if (form.tiktok_open_id) payload.tiktok_open_id = form.tiktok_open_id;
      if (form.tiktok_access_token) payload.tiktok_access_token = form.tiktok_access_token;
    } else if (form.platform === "YOUTUBE") {
      if (form.youtube_channel_id) payload.youtube_channel_id = form.youtube_channel_id;
      if (form.youtube_access_token) payload.youtube_access_token = form.youtube_access_token;
    }
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  }

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Akun" : "Tambah Akun Social Media"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Platform */}
          <div className="space-y-1">
            <Label>Platform *</Label>
            <Select value={form.platform} onValueChange={(v) => set("platform", v)} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nama Akun */}
          <div className="space-y-1">
            <Label>Nama Akun *</Label>
            <Input value={form.account_name} onChange={(e) => set("account_name", e.target.value)} placeholder="Nama tampilan akun" />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="@username" />
          </div>

          {/* Profile URL */}
          <div className="space-y-1">
            <Label>Link Profil</Label>
            <Input value={form.profile_url} onChange={(e) => set("profile_url", e.target.value)} placeholder="https://..." />
          </div>

          {/* Credential fields per platform */}
          {form.platform === "INSTAGRAM" && (
            <>
              <div className="space-y-1">
                <Label>Instagram User ID</Label>
                <Input value={form.instagram_user_id} onChange={(e) => set("instagram_user_id", e.target.value)} placeholder="Numerik ID dari Graph API" />
              </div>
              <div className="space-y-1">
                <Label>Access Token (Long-Lived) {isEdit && existing?.has_instagram_token && <span className="text-xs text-muted-foreground">— sudah tersimpan</span>}</Label>
                <Input type="password" value={form.instagram_access_token} onChange={(e) => set("instagram_access_token", e.target.value)} placeholder={isEdit ? "Biarkan kosong jika tidak diubah" : "Paste access token..."} />
              </div>
              <div className="space-y-1">
                <Label>Instagram Page ID (opsional)</Label>
                <Input value={form.instagram_page_id} onChange={(e) => set("instagram_page_id", e.target.value)} placeholder="Page ID Facebook yang terhubung" />
              </div>
            </>
          )}

          {form.platform === "TIKTOK" && (
            <>
              <div className="space-y-1">
                <Label>Advertiser ID / Open ID</Label>
                <Input value={form.tiktok_open_id} onChange={(e) => set("tiktok_open_id", e.target.value)} placeholder="TikTok Advertiser ID" />
              </div>
              <div className="space-y-1">
                <Label>Access Token {isEdit && existing?.has_tiktok_token && <span className="text-xs text-muted-foreground">— sudah tersimpan</span>}</Label>
                <Input type="password" value={form.tiktok_access_token} onChange={(e) => set("tiktok_access_token", e.target.value)} placeholder={isEdit ? "Biarkan kosong jika tidak diubah" : "Paste access token..."} />
              </div>
            </>
          )}

          {form.platform === "YOUTUBE" && (
            <>
              <div className="space-y-1">
                <Label>Channel ID</Label>
                <Input value={form.youtube_channel_id} onChange={(e) => set("youtube_channel_id", e.target.value)} placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx" />
              </div>
              <div className="space-y-1">
                <Label>API Key {isEdit && existing?.has_youtube_token && <span className="text-xs text-muted-foreground">— sudah tersimpan</span>}</Label>
                <Input type="password" value={form.youtube_access_token} onChange={(e) => set("youtube_access_token", e.target.value)} placeholder={isEdit ? "Biarkan kosong jika tidak diubah" : "Paste API key..."} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button onClick={submit} disabled={busy || !form.account_name}>
            {busy ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Akun"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Metric Form Dialog ─────────────────────────────────────────────────────────

function MetricDialog({
  open,
  onClose,
  accounts,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  existing?: PostMetric | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!existing;

  const [form, setForm] = useState({
    account_id: existing?.account_id ?? "",
    judul_konten: existing?.judul_konten ?? "",
    link_konten: existing?.link_konten ?? "",
    tanggal: existing?.tanggal ?? new Date().toISOString().split("T")[0],
    views: String(existing?.views ?? 0),
    likes: String(existing?.likes ?? 0),
    comments: String(existing?.comments ?? 0),
    shares: String(existing?.shares ?? 0),
    saves: String(existing?.saves ?? 0),
    reach: String(existing?.reach ?? 0),
    watch_time_minutes: String(existing?.watch_time_minutes ?? ""),
    engagement_rate: String(existing?.engagement_rate ?? ""),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedAccount = accounts.find((a) => a.id === form.account_id);
  const platform = selectedAccount?.platform ?? existing?.platform ?? "";

  const createMut = useMutation({
    mutationFn: (data: any) => contentApi.createPostMetric(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["post-metrics"] }); toast.success("Metrik ditambahkan"); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => contentApi.updatePostMetric(existing!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["post-metrics"] }); toast.success("Metrik diperbarui"); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  function submit() {
    const payload: any = {
      account_id: form.account_id,
      judul_konten: form.judul_konten || null,
      link_konten: form.link_konten || null,
      tanggal: form.tanggal,
      views: parseInt(form.views) || 0,
      likes: parseInt(form.likes) || 0,
      comments: parseInt(form.comments) || 0,
      shares: parseInt(form.shares) || 0,
      saves: parseInt(form.saves) || 0,
      reach: parseInt(form.reach) || 0,
    };
    if (form.watch_time_minutes) payload.watch_time_minutes = parseFloat(form.watch_time_minutes);
    if (form.engagement_rate) payload.engagement_rate = parseFloat(form.engagement_rate);
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  }

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Metrik" : "Input Metrik Manual"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Akun */}
          <div className="space-y-1">
            <Label>Akun *</Label>
            <Select value={form.account_id} onValueChange={(v) => set("account_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih akun..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {PLATFORM_LABELS[a.platform]} — {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Judul / Nama Konten</Label>
              <Input value={form.judul_konten} onChange={(e) => set("judul_konten", e.target.value)} placeholder="Judul konten..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Link Konten</Label>
              <Input value={form.link_konten} onChange={(e) => set("link_konten", e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Tanggal *</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Views</Label>
              <Input type="number" min={0} value={form.views} onChange={(e) => set("views", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Likes</Label>
              <Input type="number" min={0} value={form.likes} onChange={(e) => set("likes", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Comments</Label>
              <Input type="number" min={0} value={form.comments} onChange={(e) => set("comments", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Shares</Label>
              <Input type="number" min={0} value={form.shares} onChange={(e) => set("shares", e.target.value)} />
            </div>
            {/* Instagram-specific */}
            {(platform === "INSTAGRAM" || !platform) && (
              <>
                <div className="space-y-1">
                  <Label>Saves</Label>
                  <Input type="number" min={0} value={form.saves} onChange={(e) => set("saves", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Reach</Label>
                  <Input type="number" min={0} value={form.reach} onChange={(e) => set("reach", e.target.value)} />
                </div>
              </>
            )}
            {/* YouTube-specific */}
            {(platform === "YOUTUBE" || !platform) && (
              <div className="space-y-1">
                <Label>Watch Time (menit)</Label>
                <Input type="number" min={0} step={0.01} value={form.watch_time_minutes} onChange={(e) => set("watch_time_minutes", e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Engagement Rate (%)</Label>
              <Input type="number" min={0} step={0.0001} value={form.engagement_rate} onChange={(e) => set("engagement_rate", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button onClick={submit} disabled={busy || !form.account_id || !form.tanggal}>
            {busy ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Metrik"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 1: Akun Platform ───────────────────────────────────────────────────────

function AkunTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editAcc, setEditAcc] = useState<Account | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["social-accounts"],
    queryFn: () => contentApi.listAccounts(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => contentApi.deleteAccount(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["social-accounts"] }); toast.success("Akun dihapus"); },
    onError: () => toast.error("Gagal menghapus akun"),
  });

  async function handleSync(acc: Account) {
    setSyncing(acc.id);
    try {
      const res = await contentApi.syncAccount(acc.id);
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
      qc.invalidateQueries({ queryKey: ["post-metrics"] });
      toast.success(`Sync selesai: ${res.synced} post baru dari ${res.total} total`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Sync gagal");
    } finally {
      setSyncing(null);
    }
  }

  const grouped: Record<string, Account[]> = { INSTAGRAM: [], TIKTOK: [], YOUTUBE: [] };
  for (const a of accounts) {
    if (grouped[a.platform]) grouped[a.platform].push(a);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Kelola koneksi API untuk otomatis sinkronisasi metrik dari platform
        </p>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Akun
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Memuat...</p>
      ) : (
        PLATFORMS.map((plt) => (
          <Card key={plt}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlatformIcon platform={plt} className="h-5 w-5" />
                {PLATFORM_LABELS[plt]}
                <Badge variant="outline" className={PLATFORM_COLORS[plt]}>
                  {grouped[plt].length} akun
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grouped[plt].length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada akun {PLATFORM_LABELS[plt]} — klik "Tambah Akun" untuk menambahkan
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Akun</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Kredensial</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[plt].map((acc) => {
                      const hasCredential =
                        (plt === "INSTAGRAM" && acc.has_instagram_token && !!acc.instagram_user_id) ||
                        (plt === "TIKTOK" && acc.has_tiktok_token && !!acc.tiktok_open_id) ||
                        (plt === "YOUTUBE" && acc.has_youtube_token && !!acc.youtube_channel_id);
                      return (
                        <TableRow key={acc.id}>
                          <TableCell className="font-medium">{acc.account_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {acc.username ? `@${acc.username}` : "—"}
                            {acc.profile_url && (
                              <a href={acc.profile_url} target="_blank" rel="noreferrer" className="ml-1 inline-flex">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasCredential ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Lengkap</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Belum Lengkap</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {acc.is_active ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aktif</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-500">Nonaktif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {acc.last_synced_at
                              ? new Date(acc.last_synced_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                              : "Belum pernah"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!hasCredential || syncing === acc.id}
                                onClick={() => handleSync(acc)}
                                title="Sync dari API"
                              >
                                <RefreshCw className={`h-3 w-3 ${syncing === acc.id ? "animate-spin" : ""}`} />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditAcc(acc)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => { if (confirm(`Hapus akun "${acc.account_name}"?`)) deleteMut.mutate(acc.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <AccountDialog open={showAdd} onClose={() => setShowAdd(false)} />
      {editAcc && (
        <AccountDialog open={true} onClose={() => setEditAcc(null)} existing={editAcc} />
      )}
    </div>
  );
}

// ── Tab 2: Input Metrik Manual ─────────────────────────────────────────────────

function MetrikTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editMetric, setEditMetric] = useState<PostMetric | null>(null);
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["social-accounts"],
    queryFn: () => contentApi.listAccounts(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["post-metrics", filterAccount, search, page],
    queryFn: () => contentApi.listPostMetrics({
      account_id: filterAccount !== "all" ? filterAccount : undefined,
      judul: search || undefined,
      page,
      per_page: 20,
    }),
  });

  const metrics: PostMetric[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const deleteMut = useMutation({
    mutationFn: (id: string) => contentApi.deletePostMetric(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["post-metrics"] }); toast.success("Metrik dihapus"); },
    onError: () => toast.error("Gagal menghapus metrik"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterAccount} onValueChange={(v) => { setFilterAccount(v); setPage(1); }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Semua Akun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Akun</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{PLATFORM_LABELS[a.platform]} — {a.account_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Cari judul konten..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-56"
          />
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Input Metrik
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12">Memuat...</p>
          ) : metrics.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Belum ada data metrik</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Konten</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Komentar</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Eng.Rate</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">{m.tanggal}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={PLATFORM_COLORS[m.platform ?? ""] ?? ""}>
                          {PLATFORM_LABELS[m.platform ?? ""] ?? m.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate text-sm">{m.judul_konten ?? "—"}</div>
                        {m.link_konten && (
                          <a href={m.link_konten} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />Link
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{m.views.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{m.likes.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{m.comments.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{m.shares.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">
                        {m.engagement_rate != null ? `${m.engagement_rate.toFixed(2)}%` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={m.data_source === "api" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"}>
                          {m.data_source === "api" ? "API" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setEditMetric(m)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("Hapus metrik ini?")) deleteMut.mutate(m.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{total} total metrik</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="py-1 px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <MetricDialog open={showAdd} onClose={() => setShowAdd(false)} accounts={accounts} />
      {editMetric && (
        <MetricDialog open={true} onClose={() => setEditMetric(null)} accounts={accounts} existing={editMetric} />
      )}
    </div>
  );
}

// ── Tab 3: Target Metrik ───────────────────────────────────────────────────────

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

interface SocialTarget {
  id: string;
  platform: string;
  bulan: number;
  tahun: number;
  target_views: number;
  target_likes: number;
  target_comments: number;
  target_shares: number;
  target_saves: number;
  target_reach: number;
  target_watch_time_minutes: number | null;
  target_engagement_rate: number | null;
}

// Form state for one platform's targets
type TargetForm = {
  target_views: string;
  target_likes: string;
  target_comments: string;
  target_shares: string;
  target_saves: string;
  target_reach: string;
  target_watch_time_minutes: string;
  target_engagement_rate: string;
};

const emptyForm = (): TargetForm => ({
  target_views: "",
  target_likes: "",
  target_comments: "",
  target_shares: "",
  target_saves: "",
  target_reach: "",
  target_watch_time_minutes: "",
  target_engagement_rate: "",
});

function targetToForm(t: SocialTarget): TargetForm {
  return {
    target_views: String(t.target_views || ""),
    target_likes: String(t.target_likes || ""),
    target_comments: String(t.target_comments || ""),
    target_shares: String(t.target_shares || ""),
    target_saves: String(t.target_saves || ""),
    target_reach: String(t.target_reach || ""),
    target_watch_time_minutes: t.target_watch_time_minutes != null ? String(t.target_watch_time_minutes) : "",
    target_engagement_rate: t.target_engagement_rate != null ? String(t.target_engagement_rate) : "",
  };
}

function PlatformTargetCard({
  platform, bulan, tahun, existing,
}: {
  platform: string;
  bulan: number;
  tahun: number;
  existing?: SocialTarget;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TargetForm>(() => existing ? targetToForm(existing) : emptyForm());
  const set = (k: keyof TargetForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () => contentApi.upsertTarget({
      platform,
      bulan,
      tahun,
      target_views: parseInt(form.target_views) || 0,
      target_likes: parseInt(form.target_likes) || 0,
      target_comments: parseInt(form.target_comments) || 0,
      target_shares: parseInt(form.target_shares) || 0,
      target_saves: parseInt(form.target_saves) || 0,
      target_reach: parseInt(form.target_reach) || 0,
      target_watch_time_minutes: form.target_watch_time_minutes ? parseFloat(form.target_watch_time_minutes) : undefined,
      target_engagement_rate: form.target_engagement_rate ? parseFloat(form.target_engagement_rate) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-targets"] });
      toast.success(`Target ${PLATFORM_LABELS[platform]} ${MONTHS[bulan - 1]} ${tahun} disimpan`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan target"),
  });

  const deleteMut = useMutation({
    mutationFn: () => contentApi.deleteTarget(existing!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-targets"] });
      setForm(emptyForm());
      toast.success("Target dihapus");
    },
    onError: () => toast.error("Gagal menghapus target"),
  });

  const isIG = platform === "INSTAGRAM";
  const isYT = platform === "YOUTUBE";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlatformIcon platform={platform} className="h-5 w-5" />
          {PLATFORM_LABELS[platform]}
          {existing && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              Target tersimpan
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Target Views</Label>
            <Input type="number" min={0} placeholder="0" value={form.target_views}
              onChange={(e) => set("target_views", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Likes</Label>
            <Input type="number" min={0} placeholder="0" value={form.target_likes}
              onChange={(e) => set("target_likes", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Komentar</Label>
            <Input type="number" min={0} placeholder="0" value={form.target_comments}
              onChange={(e) => set("target_comments", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Shares</Label>
            <Input type="number" min={0} placeholder="0" value={form.target_shares}
              onChange={(e) => set("target_shares", e.target.value)} />
          </div>
          {isIG && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Target Saves</Label>
                <Input type="number" min={0} placeholder="0" value={form.target_saves}
                  onChange={(e) => set("target_saves", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Target Reach</Label>
                <Input type="number" min={0} placeholder="0" value={form.target_reach}
                  onChange={(e) => set("target_reach", e.target.value)} />
              </div>
            </>
          )}
          {isYT && (
            <div className="space-y-1">
              <Label className="text-xs">Target Watch Time (mnt)</Label>
              <Input type="number" min={0} step={0.01} placeholder="0" value={form.target_watch_time_minutes}
                onChange={(e) => set("target_watch_time_minutes", e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Target Engagement Rate (%)</Label>
            <Input type="number" min={0} step={0.01} placeholder="0.00" value={form.target_engagement_rate}
              onChange={(e) => set("target_engagement_rate", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="h-3 w-3 mr-1" />
            {saveMut.isPending ? "Menyimpan..." : existing ? "Update Target" : "Simpan Target"}
          </Button>
          {existing && (
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
              onClick={() => { if (confirm("Hapus target ini?")) deleteMut.mutate(); }}
              disabled={deleteMut.isPending}>
              <Trash2 className="h-3 w-3 mr-1" />
              Hapus
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TargetTab() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const { data: targets = [], isLoading } = useQuery<SocialTarget[]>({
    queryKey: ["social-targets", bulan, tahun],
    queryFn: () => contentApi.listTargets({ bulan, tahun }),
  });

  const targetByPlatform: Record<string, SocialTarget | undefined> = {};
  for (const t of targets) targetByPlatform[t.platform] = t;

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <Target className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Atur target metrik bulanan per platform:</p>
        <Select value={String(bulan)} onValueChange={(v) => setBulan(parseInt(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(tahun)} onValueChange={(v) => setTahun(parseInt(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Memuat...</p>
      ) : (
        <div className="space-y-4">
          {PLATFORMS.map((plt) => (
            <PlatformTargetCard
              key={plt}
              platform={plt}
              bulan={bulan}
              tahun={tahun}
              existing={targetByPlatform[plt]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ContentSocialMediaPage() {
  const canViewTarget = useAuthStore((s) => s.isSuperAdmin() || s.hasPermission("content", "target"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sosial Media</h1>
        <p className="text-muted-foreground">Kelola koneksi API dan input metrik konten per platform</p>
      </div>

      <Tabs defaultValue="akun">
        <TabsList>
          <TabsTrigger value="akun">Akun Platform</TabsTrigger>
          <TabsTrigger value="metrik">Input Metrik Manual</TabsTrigger>
          {canViewTarget && <TabsTrigger value="target">Target Metrik</TabsTrigger>}
        </TabsList>

        <TabsContent value="akun" className="mt-6">
          <AkunTab />
        </TabsContent>

        <TabsContent value="metrik" className="mt-6">
          <MetrikTab />
        </TabsContent>

        {canViewTarget && (
          <TabsContent value="target" className="mt-6">
            <TargetTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
