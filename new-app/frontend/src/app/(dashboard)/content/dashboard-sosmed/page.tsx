"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { contentApi } from "@/lib/api/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  Users,
  Clock,
  Printer,
  BarChart2,
  LineChart as LineChartIcon,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Target,
  Repeat2,
  MousePointerClick,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "#e1306c",
  TIKTOK: "#010101",
  YOUTUBE: "#ff0000",
};

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

const METRIC_COLORS: Record<string, string> = {
  views: "#6366f1",
  likes: "#ec4899",
  comments: "#f59e0b",
  shares: "#10b981",
  saves: "#8b5cf6",
  reach: "#14b8a6",
};

const METRIC_LABELS: Record<string, string> = {
  views: "Views",
  likes: "Likes",
  comments: "Komentar",
  shares: "Shares",
  saves: "Saves",
  reach: "Reach",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface PostMetric {
  id: string;
  account_id: string;
  platform: string | null;
  account_name: string | null;
  judul_konten: string | null;
  link_konten: string | null;
  tanggal: string | null;
  media_type: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reposts: number;
  reach: number;
  watch_time_minutes: number | null;
  engagement_rate: number | null;
  data_source: string;
}

interface Summary {
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reposts: number;
    reach: number;
    watch_time_minutes: number;
    count: number;
    engagement_rate: number;
    ig_profile_visits?: number;
    ig_website_clicks?: number;
    ig_followers_count?: number;
    ig_follower_reach?: number;
    ig_non_follower_reach?: number;
  };
  time_series: Array<{
    date: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
  }>;
  by_platform: Array<{
    platform: string;
    views: number;
    likes: number;
    comments: number;
    count: number;
  }>;
  posts_count: number;
}

// ── Date Helpers ───────────────────────────────────────────────────────────────

function getDateRange(period: string): { date_from: string; date_to: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  if (period === "today") {
    return { date_from: fmt(today), date_to: fmt(today) };
  }
  if (period === "7d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { date_from: fmt(from), date_to: fmt(today) };
  }
  if (period === "30d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { date_from: fmt(from), date_to: fmt(today) };
  }
  if (period === "bulan_ini") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { date_from: fmt(from), date_to: fmt(today) };
  }
  // custom — handled externally
  return { date_from: fmt(today), date_to: fmt(today) };
}

// ── Metric Card ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color = "text-primary" }: {
  label: string;
  value: string | number;
  icon: any;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold leading-tight">
              {typeof value === "number" ? value.toLocaleString("id-ID") : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Comparison: Antar Konten ───────────────────────────────────────────────────

function AntarKonten({ metrics }: { metrics: PostMetric[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [metricKey, setMetricKey] = useState("views");

  const contents = useMemo(() => {
    const map: Record<string, PostMetric> = {};
    for (const m of metrics) {
      const key = m.judul_konten ?? m.id;
      if (!map[key]) map[key] = m;
    }
    return Object.values(map).slice(0, 30);
  }, [metrics]);

  const toggleSelect = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s
    );
  };

  const chartData = useMemo(() => {
    return contents
      .filter((c) => selected.includes(c.id))
      .map((c) => ({
        name: (c.judul_konten ?? "—").slice(0, 20),
        value: (c as any)[metricKey] ?? 0,
        platform: c.platform,
      }));
  }, [contents, selected, metricKey]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <p className="text-sm text-muted-foreground">Pilih 2–4 konten untuk dibandingkan:</p>
        <Select value={metricKey} onValueChange={setMetricKey}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(METRIC_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
        {contents.map((c) => (
          <button
            key={c.id}
            onClick={() => toggleSelect(c.id)}
            className={`text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
              selected.includes(c.id)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Badge variant="outline" className="text-xs shrink-0">
              {PLATFORM_LABELS[c.platform ?? ""] ?? c.platform}
            </Badge>
            <span className="truncate">{c.judul_konten ?? `Post #${c.id}`}</span>
            <span className="ml-auto text-xs opacity-70">{c.tanggal}</span>
          </button>
        ))}
        {contents.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">Belum ada data konten</p>
        )}
      </div>

      {chartData.length >= 2 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Bar dataKey="value" name={METRIC_LABELS[metricKey]} fill={METRIC_COLORS[metricKey]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {chartData.length < 2 && (
        <p className="text-center text-muted-foreground py-8 text-sm">Pilih minimal 2 konten di atas</p>
      )}
    </div>
  );
}

// ── Comparison: Antar Platform ─────────────────────────────────────────────────

function AntarPlatform({ byPlatform }: { byPlatform: Summary["by_platform"] }) {
  const [metricKey, setMetricKey] = useState("views");

  const chartData = byPlatform.map((p) => ({
    name: PLATFORM_LABELS[p.platform] ?? p.platform,
    value: (p as any)[metricKey] ?? 0,
    fill: PLATFORM_COLORS[p.platform] ?? "#6366f1",
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <p className="text-sm text-muted-foreground">Metrik:</p>
        <Select value={metricKey} onValueChange={setMetricKey}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="views">Views</SelectItem>
            <SelectItem value="likes">Likes</SelectItem>
            <SelectItem value="comments">Komentar</SelectItem>
            <SelectItem value="count">Jumlah Konten</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Bar dataKey="value" name={METRIC_LABELS[metricKey] ?? metricKey} radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-muted-foreground py-8 text-sm">Belum ada data per platform</p>
      )}
    </div>
  );
}

// ── Comparison: Antar Periode ──────────────────────────────────────────────────

function AntarPeriode() {
  const [periodeA, setPeriodeA] = useState({ from: "", to: "" });
  const [periodeB, setPeriodeB] = useState({ from: "", to: "" });

  const { data: summaryA } = useQuery<Summary>({
    queryKey: ["summary-periode-a", periodeA.from, periodeA.to],
    queryFn: () => contentApi.postMetricsSummary({ date_from: periodeA.from, date_to: periodeA.to }),
    enabled: !!periodeA.from && !!periodeA.to,
  });

  const { data: summaryB } = useQuery<Summary>({
    queryKey: ["summary-periode-b", periodeB.from, periodeB.to],
    queryFn: () => contentApi.postMetricsSummary({ date_from: periodeB.from, date_to: periodeB.to }),
    enabled: !!periodeB.from && !!periodeB.to,
  });

  const COMPARE_METRICS = ["views", "likes", "comments", "shares"] as const;

  const chartData = COMPARE_METRICS.map((k) => ({
    metric: METRIC_LABELS[k],
    "Periode A": summaryA?.totals?.[k as keyof typeof summaryA.totals] ?? 0,
    "Periode B": summaryB?.totals?.[k as keyof typeof summaryB.totals] ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Periode A</p>
          <div className="flex gap-2">
            <Input type="date" value={periodeA.from} onChange={(e) => setPeriodeA((p) => ({ ...p, from: e.target.value }))} />
            <Input type="date" value={periodeA.to} onChange={(e) => setPeriodeA((p) => ({ ...p, to: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Periode B</p>
          <div className="flex gap-2">
            <Input type="date" value={periodeB.from} onChange={(e) => setPeriodeB((p) => ({ ...p, from: e.target.value }))} />
            <Input type="date" value={periodeB.to} onChange={(e) => setPeriodeB((p) => ({ ...p, to: e.target.value }))} />
          </div>
        </div>
      </div>

      {summaryA && summaryB ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" />
            <YAxis />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Legend />
            <Bar dataKey="Periode A" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Periode B" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-muted-foreground py-8 text-sm">Pilih kedua periode untuk melihat perbandingan</p>
      )}
    </div>
  );
}

// ── Target vs Aktual ──────────────────────────────────────────────────────────

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

interface ComparisonEntry {
  platform: string;
  has_target: boolean;
  target: any | null;
  actual: {
    views: number; likes: number; comments: number; shares: number;
    saves: number; reach: number; watch_time_minutes: number; engagement_rate: number;
  };
  achievement: Record<string, number | null> | null;
}

function AchievementBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const capped = Math.min(value, 150);
  const color = value >= 100 ? "bg-green-500" : value >= 70 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(capped, 100)}%` }} />
      </div>
      <span className={`text-xs font-medium w-12 text-right ${value >= 100 ? "text-green-600" : value >= 70 ? "text-yellow-600" : "text-red-500"}`}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function TargetVsAktual() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["target-comparison", bulan, tahun],
    queryFn: () => contentApi.targetComparison({ bulan, tahun }),
  });

  const comparison: ComparisonEntry[] = data?.comparison ?? [];
  const hasSomeTarget = comparison.some((c) => c.has_target);

  const COMPARE_ROWS: Array<{ key: string; label: string; platforms?: string[] }> = [
    { key: "views", label: "Views" },
    { key: "likes", label: "Likes" },
    { key: "comments", label: "Komentar" },
    { key: "shares", label: "Shares" },
    { key: "saves", label: "Saves", platforms: ["INSTAGRAM"] },
    { key: "reach", label: "Reach", platforms: ["INSTAGRAM"] },
  ];

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
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
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        {!hasSomeTarget && !isLoading && (
          <p className="text-sm text-muted-foreground">
            Belum ada target untuk bulan ini — atur di menu <strong>Sosial Media → Target Metrik</strong>
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Memuat...</p>
      ) : (
        <div className="space-y-4">
          {comparison.map((entry) => (
            <Card key={entry.platform}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="font-semibold">{PLATFORM_LABELS[entry.platform]}</span>
                  {entry.has_target ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Target tersedia</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-500 text-xs">Belum ada target</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-28">Metrik</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Target</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Aktual</th>
                        <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Pencapaian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARE_ROWS.filter(
                        (row) => !row.platforms || row.platforms.includes(entry.platform)
                      ).map((row) => {
                        const targetVal = entry.target ? entry.target[`target_${row.key}`] : null;
                        const actualVal = (entry.actual as any)[row.key] ?? 0;
                        const pct = entry.achievement ? entry.achievement[row.key] : null;
                        return (
                          <tr key={row.key} className="border-b last:border-0">
                            <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                            <td className="py-2 px-4 text-right font-mono">
                              {targetVal != null ? Number(targetVal).toLocaleString("id-ID") : "—"}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-medium">
                              {Number(actualVal).toLocaleString("id-ID")}
                            </td>
                            <td className="py-2 pl-4 w-40">
                              <AchievementBar value={pct} />
                            </td>
                          </tr>
                        );
                      })}
                      {/* Engagement Rate row */}
                      <tr className="border-b last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">Eng. Rate</td>
                        <td className="py-2 px-4 text-right font-mono">
                          {entry.target?.target_engagement_rate != null
                            ? `${Number(entry.target.target_engagement_rate).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-medium">
                          {entry.actual.engagement_rate > 0
                            ? `${entry.actual.engagement_rate.toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="py-2 pl-4 w-40">
                          {entry.target?.target_engagement_rate && entry.actual.engagement_rate > 0 ? (
                            <AchievementBar
                              value={parseFloat(((entry.actual.engagement_rate / Number(entry.target.target_engagement_rate)) * 100).toFixed(1))}
                            />
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardSosmedPage() {
  // Filter state
  const [platform, setPlatform] = useState("all");
  const [period, setPeriod] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [chartMetric, setChartMetric] = useState("views");
  const [sortKey, setSortKey] = useState("tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tablePage, setTablePage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostMetric | null>(null);

  // Derived date range
  const dateRange = useMemo(() => {
    if (period === "custom") return { date_from: customFrom, date_to: customTo };
    return getDateRange(period);
  }, [period, customFrom, customTo]);

  const summaryParams = useMemo(() => ({
    ...(platform !== "all" ? { platform } : {}),
    ...(dateRange.date_from ? { date_from: dateRange.date_from } : {}),
    ...(dateRange.date_to ? { date_to: dateRange.date_to } : {}),
  }), [platform, dateRange]);

  const metricsParams = useMemo(() => ({
    ...summaryParams,
    ...(search ? { judul: search } : {}),
    page: tablePage,
    per_page: 20,
  }), [summaryParams, search, tablePage]);

  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ["sosmed-summary", summaryParams],
    queryFn: () => contentApi.postMetricsSummary(summaryParams),
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["sosmed-metrics", metricsParams],
    queryFn: () => contentApi.listPostMetrics(metricsParams),
  });

  const metrics: PostMetric[] = metricsData?.items ?? [];
  const totalMetrics = metricsData?.total ?? 0;
  const totalPages = Math.ceil(totalMetrics / 20);

  const totals = summary?.totals;
  const timeSeries = summary?.time_series ?? [];
  const byPlatform = summary?.by_platform ?? [];

  // Sorted table data
  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => {
      let av = (a as any)[sortKey] ?? 0;
      let bv = (b as any)[sortKey] ?? 0;
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [metrics, sortKey, sortDir]);

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }, [sortKey]);

  function SortIcon({ k }: { k: string }) {
    if (sortKey !== k) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  }

  async function handlePrint() {
    setPdfLoading(true);
    try {
    // Fetch all metrics (no pagination) + target comparison for PDF
    const now = new Date();
    const refDate = dateRange.date_to ? new Date(dateRange.date_to) : now;
    const compBulan = refDate.getMonth() + 1;
    const compTahun = refDate.getFullYear();

    let allMetrics: PostMetric[] = [];
    let compData: any = null;

    try {
      const [mRes, cRes] = await Promise.all([
        contentApi.listPostMetrics({ ...summaryParams, page: 1, per_page: 200 }),
        contentApi.targetComparison({ bulan: compBulan, tahun: compTahun }),
      ]);
      allMetrics = mRes?.items ?? [];
      compData = cRes;
    } catch {
      allMetrics = sortedMetrics;
    }

    const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember"];

    const periodeLabel = period === "today" ? "Hari Ini"
      : period === "7d" ? "7 Hari Terakhir"
      : period === "30d" ? "30 Hari Terakhir"
      : period === "bulan_ini" ? "Bulan Ini"
      : `${dateRange.date_from} s/d ${dateRange.date_to}`;

    const platformLabel = platform === "all" ? "Semua Platform"
      : PLATFORM_LABELS[platform] ?? platform;

    const fmt = (n: number) => n.toLocaleString("id-ID");
    const pct = (n: number | null | undefined) =>
      n != null ? `${Number(n).toFixed(2)}%` : "—";

    // Build per-platform rows for summary
    const platRows = (byPlatform.length > 0 ? byPlatform : []).map((p) => `
      <tr>
        <td>${PLATFORM_LABELS[p.platform] ?? p.platform}</td>
        <td class="num">${fmt(p.views)}</td>
        <td class="num">${fmt(p.likes)}</td>
        <td class="num">${fmt(p.comments)}</td>
        <td class="num">${p.count}</td>
      </tr>`).join("");

    // Build target vs actual rows
    const targetRows = compData?.comparison?.map((entry: any) => {
      const t = entry.target;
      const a = entry.actual;
      const metrics = [
        { label: "Views",    target: t?.target_views,    actual: a?.views,    pctVal: entry.achievement?.views },
        { label: "Likes",    target: t?.target_likes,    actual: a?.likes,    pctVal: entry.achievement?.likes },
        { label: "Komentar", target: t?.target_comments, actual: a?.comments, pctVal: entry.achievement?.comments },
        { label: "Shares",   target: t?.target_shares,   actual: a?.shares,   pctVal: entry.achievement?.shares },
        ...(entry.platform === "INSTAGRAM" ? [
          { label: "Saves", target: t?.target_saves, actual: a?.saves, pctVal: entry.achievement?.saves },
          { label: "Reach", target: t?.target_reach, actual: a?.reach, pctVal: entry.achievement?.reach },
        ] : []),
      ];
      if (!entry.has_target && a.views === 0) return "";
      return `
        <tr class="platform-header">
          <td colspan="4"><strong>${PLATFORM_LABELS[entry.platform] ?? entry.platform}</strong>
          ${entry.has_target ? "" : " <em style='color:#888;font-weight:normal;font-size:11px'>(Belum ada target)</em>"}
          </td>
        </tr>
        ${metrics.map((m) => `
          <tr>
            <td style="padding-left:20px">${m.label}</td>
            <td class="num">${m.target != null ? fmt(Number(m.target)) : "—"}</td>
            <td class="num">${m.actual != null ? fmt(Number(m.actual)) : "0"}</td>
            <td class="num ${m.pctVal != null ? (m.pctVal >= 100 ? "green" : m.pctVal >= 70 ? "yellow" : "red") : ""}">
              ${m.pctVal != null ? `${Number(m.pctVal).toFixed(1)}%` : "—"}
            </td>
          </tr>`).join("")}`;
    }).join("") ?? "";

    // Build top content table (top 20 by views)
    const topContent = [...allMetrics]
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const contentRows = topContent.map((m, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${m.tanggal ?? "—"}</td>
        <td>${PLATFORM_LABELS[m.platform ?? ""] ?? m.platform ?? "—"}</td>
        <td>${(m.judul_konten ?? "—").slice(0, 60)}${(m.judul_konten?.length ?? 0) > 60 ? "..." : ""}</td>
        <td class="num">${fmt(m.views)}</td>
        <td class="num">${fmt(m.likes)}</td>
        <td class="num">${fmt(m.comments)}</td>
        <td class="num">${pct(m.engagement_rate)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Laporan Sosial Media — ${MONTHS_ID[compBulan - 1]} ${compTahun}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 24px 32px; }
    h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #94a3b8; margin-bottom: 24px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 14px; font-weight: 700; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 14px; }
    /* Metric cards */
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 4px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #f8fafc; }
    .card-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
    .card-value { font-size: 20px; font-weight: 700; color: #1e293b; }
    .card-eng { font-size: 14px; font-weight: 700; color: #6366f1; }
    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .platform-header td { background: #f8fafc; font-weight: 600; padding: 6px 10px; border-top: 1px solid #e2e8f0; }
    .green { color: #16a34a; font-weight: 600; }
    .yellow { color: #d97706; font-weight: 600; }
    .red { color: #dc2626; font-weight: 600; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    /* Letterhead */
    .letterhead { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
    .letterhead-logo { height: 64px; width: auto; object-fit: contain; flex-shrink: 0; }
    .letterhead-info { flex: 1; }
    .company-name { font-size: 15px; font-weight: 700; color: #1e293b; letter-spacing: 0.02em; text-transform: uppercase; }
    .company-detail { font-size: 11px; color: #475569; margin-top: 2px; line-height: 1.5; }
    .letterhead-divider { border: none; border-top: 2px solid #1e293b; margin: 10px 0 16px; }
    @media print {
      body { padding: 16px 20px; }
      .cards { grid-template-columns: repeat(4, 1fr); }
    }
  </style>
</head>
<body>
  <!-- Letterhead -->
  <div class="letterhead">
    <img src="${window.location.origin}/images/logo.png" alt="Logo" class="letterhead-logo" onerror="this.style.display='none'"/>
    <div class="letterhead-info">
      <div class="company-name">PT. Rubah Rumah Inovasi Pemuda</div>
      <div class="company-detail">Telp: 081376405550</div>
      <div class="company-detail">Jl. Pandu II No.420. Sepanjang Jaya. Kec. Rawalumbu. Kota Bekasi. Jawa Barat 17116</div>
    </div>
  </div>
  <hr class="letterhead-divider"/>

  <!-- Header -->
  <div class="section">
    <h1>Laporan Sosial Media</h1>
    <div class="subtitle">Periode: <strong>${periodeLabel}</strong> &nbsp;|&nbsp; Platform: <strong>${platformLabel}</strong></div>
    <div class="meta">Dibuat: ${new Date().toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" })}</div>
  </div>

  <!-- Ringkasan Metrik -->
  <div class="section">
    <div class="section-title">Ringkasan Metrik</div>
    <div class="cards">
      <div class="card">
        <div class="card-label">Total Views</div>
        <div class="card-value">${fmt(totals?.views ?? 0)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Likes</div>
        <div class="card-value">${fmt(totals?.likes ?? 0)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Komentar</div>
        <div class="card-value">${fmt(totals?.comments ?? 0)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Shares</div>
        <div class="card-value">${fmt(totals?.shares ?? 0)}</div>
      </div>
      <div class="card">
        <div class="card-label">Engagement Rate (rata-rata)</div>
        <div class="card-eng">${pct(totals?.engagement_rate)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Saves (Instagram)</div>
        <div class="card-value">${fmt(totals?.saves ?? 0)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Reach (Instagram)</div>
        <div class="card-value">${fmt(totals?.reach ?? 0)}</div>
      </div>
      <div class="card">
        <div class="card-label">Jumlah Konten</div>
        <div class="card-value">${totals?.count ?? 0}</div>
      </div>
    </div>
  </div>

  <!-- Per Platform -->
  ${byPlatform.length > 0 ? `
  <div class="section">
    <div class="section-title">Breakdown per Platform</div>
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th class="num">Views</th>
          <th class="num">Likes</th>
          <th class="num">Komentar</th>
          <th class="num">Jumlah Konten</th>
        </tr>
      </thead>
      <tbody>${platRows}</tbody>
    </table>
  </div>` : ""}

  <!-- Target vs Aktual -->
  ${compData?.comparison ? `
  <div class="section">
    <div class="section-title">Target vs Aktual — ${MONTHS_ID[compBulan - 1]} ${compTahun}</div>
    <table>
      <thead>
        <tr>
          <th>Metrik</th>
          <th class="num">Target</th>
          <th class="num">Aktual</th>
          <th class="num">Pencapaian</th>
        </tr>
      </thead>
      <tbody>${targetRows}</tbody>
    </table>
  </div>` : ""}

  <!-- Top Konten -->
  ${topContent.length > 0 ? `
  <div class="section">
    <div class="section-title">Top ${topContent.length} Konten (berdasarkan Views)</div>
    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Tanggal</th>
          <th>Platform</th>
          <th>Judul Konten</th>
          <th class="num">Views</th>
          <th class="num">Likes</th>
          <th class="num">Komentar</th>
          <th class="num">Eng.Rate</th>
        </tr>
      </thead>
      <tbody>${contentRows}</tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    <span>PT. Rubah Rumah Inovasi Pemuda — Laporan Sosial Media</span>
    <span>Dibuat otomatis oleh sistem</span>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Popup diblokir. Izinkan popup untuk halaman ini."); return; }
    w.document.write(html);
    w.document.close();
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Sosial Media</h1>
          <p className="text-muted-foreground">Analitik metrik konten per platform</p>
        </div>
        <Button variant="outline" onClick={handlePrint} disabled={pdfLoading || summaryLoading}>
          <Printer className="h-4 w-4 mr-2" />
          {pdfLoading ? "Menyiapkan..." : "Download PDF"}
        </Button>
      </div>

      {/* ── Filter Bar ── */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Platform tabs */}
            <div className="flex gap-1 border rounded-lg p-1">
              {["all", "INSTAGRAM", "TIKTOK", "YOUTUBE"].map((p) => (
                <button
                  key={p}
                  onClick={() => { setPlatform(p); setTablePage(1); }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    platform === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {p === "all" ? "Semua" : PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Period */}
            <Select value={period} onValueChange={(v) => { setPeriod(v); setTablePage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="7d">7 Hari</SelectItem>
                <SelectItem value="30d">30 Hari</SelectItem>
                <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
                <SelectItem value="custom">Kustom</SelectItem>
              </SelectContent>
            </Select>

            {period === "custom" && (
              <>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-36" />
                <span className="text-muted-foreground text-sm">s/d</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-36" />
              </>
            )}

            {/* Search */}
            <Input
              placeholder="Cari konten..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setTablePage(1); }}
              className="w-48 ml-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Print Header (hidden on screen) ── */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Dashboard Sosial Media</h1>
        <p className="text-muted-foreground">
          Periode: {dateRange.date_from} s/d {dateRange.date_to}
          {platform !== "all" && ` | Platform: ${PLATFORM_LABELS[platform]}`}
        </p>
      </div>

      {/* ── Metric Cards ── */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}><CardContent className="h-20 p-4 flex items-center justify-center"><span className="text-muted-foreground text-sm">Memuat...</span></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Views" value={totals?.views ?? 0} icon={Eye} color="text-indigo-600" />
          <MetricCard label="Total Likes" value={totals?.likes ?? 0} icon={Heart} color="text-pink-600" />
          <MetricCard label="Total Komentar" value={totals?.comments ?? 0} icon={MessageCircle} color="text-yellow-600" />
          <MetricCard label="Total Shares" value={totals?.shares ?? 0} icon={Share2} color="text-green-600" />
          <MetricCard label="Avg Engagement Rate" value={totals?.engagement_rate ? `${totals.engagement_rate.toFixed(2)}%` : "0%"} icon={TrendingUp} color="text-blue-600" />
          {(platform === "all" || platform === "INSTAGRAM") && (
            <>
              <MetricCard label="Total Saves" value={totals?.saves ?? 0} icon={Bookmark} color="text-purple-600" />
              <MetricCard label="Total Reach" value={totals?.reach ?? 0} icon={Users} color="text-teal-600" />
              <MetricCard label="Total Repost" value={totals?.reposts ?? 0} icon={Repeat2} color="text-orange-600" />
              <MetricCard label="Profile Visits" value={totals?.ig_profile_visits ?? 0} icon={UserCheck} color="text-sky-600" />
              <MetricCard label="Link Klik (Bio)" value={totals?.ig_website_clicks ?? 0} icon={MousePointerClick} color="text-lime-600" />
              <MetricCard label="Total Followers" value={totals?.ig_followers_count ?? 0} icon={UserPlus} color="text-indigo-500" />
              {(totals?.ig_follower_reach ?? 0) + (totals?.ig_non_follower_reach ?? 0) > 0 && (
                <>
                  <MetricCard
                    label="Reach Followers"
                    value={`${totals?.ig_follower_reach ?? 0} (${
                      ((totals!.ig_follower_reach! / (totals!.ig_follower_reach! + totals!.ig_non_follower_reach!)) * 100).toFixed(1)
                    }%)`}
                    icon={Users}
                    color="text-emerald-600"
                  />
                  <MetricCard
                    label="Reach Non-Followers"
                    value={`${totals?.ig_non_follower_reach ?? 0} (${
                      ((totals!.ig_non_follower_reach! / (totals!.ig_follower_reach! + totals!.ig_non_follower_reach!)) * 100).toFixed(1)
                    }%)`}
                    icon={Users}
                    color="text-amber-600"
                  />
                </>
              )}
            </>
          )}
          {(platform === "all" || platform === "INSTAGRAM" || platform === "YOUTUBE") && (
            <MetricCard
              label="Watch Time (mnt)"
              value={totals?.watch_time_minutes ? Math.round(totals.watch_time_minutes).toLocaleString() : 0}
              icon={Clock}
              color="text-red-600"
            />
          )}
          <MetricCard label="Total Konten" value={totals?.count ?? 0} icon={BarChart2} color="text-slate-600" />
        </div>
      )}

      {/* ── Trend Chart ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Tren Metrik</CardTitle>
            <div className="flex gap-2 print:hidden">
              <Select value={chartMetric} onValueChange={setChartMetric}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChartType((t) => (t === "line" ? "bar" : "line"))}
              >
                {chartType === "line" ? <BarChart2 className="h-4 w-4" /> : <LineChartIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {timeSeries.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">Belum ada data untuk periode ini</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {chartType === "line" ? (
                <LineChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                  <Line
                    type="monotone"
                    dataKey={chartMetric}
                    name={METRIC_LABELS[chartMetric]}
                    stroke={METRIC_COLORS[chartMetric]}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(v) => Number(v).toLocaleString()} />
                  <Bar
                    dataKey={chartMetric}
                    name={METRIC_LABELS[chartMetric]}
                    fill={METRIC_COLORS[chartMetric]}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Comparison Section ── */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Perbandingan</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="konten">
            <TabsList>
              <TabsTrigger value="konten">Antar Konten</TabsTrigger>
              <TabsTrigger value="periode">Antar Periode</TabsTrigger>
              <TabsTrigger value="platform">Antar Platform</TabsTrigger>
            </TabsList>
            <TabsContent value="konten" className="mt-4">
              <AntarKonten metrics={metrics} />
            </TabsContent>
            <TabsContent value="periode" className="mt-4">
              <AntarPeriode />
            </TabsContent>
            <TabsContent value="platform" className="mt-4">
              <AntarPlatform byPlatform={byPlatform} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Target vs Aktual ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Target vs Aktual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TargetVsAktual />
        </CardContent>
      </Card>

      {/* ── Data Table Per Post ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Metrik Per Postingan</CardTitle>
            <p className="text-xs text-muted-foreground">Filter tanggal & platform dari filter bar atas · Cari konten dengan kolom pencarian</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {metricsLoading ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Memuat...</p>
          ) : sortedMetrics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Tidak ada data untuk filter ini</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: "tanggal", label: "Tanggal" },
                      { key: "platform", label: "Platform" },
                      { key: "media_type", label: "Tipe" },
                      { key: "judul_konten", label: "Konten" },
                      { key: "views", label: "Views" },
                      { key: "reach", label: "Reach" },
                      { key: "likes", label: "Likes" },
                      { key: "comments", label: "Komentar" },
                      { key: "shares", label: "Shares" },
                      { key: "saves", label: "Saves" },
                      { key: "watch_time_minutes", label: "Watch Time" },
                      { key: "engagement_rate", label: "Eng.Rate" },
                    ].map(({ key, label }) => (
                      <TableHead
                        key={key}
                        className="cursor-pointer select-none whitespace-nowrap"
                        onClick={() => toggleSort(key)}
                      >
                        {label}<SortIcon k={key} />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMetrics.map((m) => (
                    <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPost(m)}>
                      <TableCell className="text-sm whitespace-nowrap">{m.tanggal}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PLATFORM_LABELS[m.platform ?? ""] ?? m.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.media_type && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              m.media_type === "VIDEO" || m.media_type === "REEL"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : m.media_type === "CAROUSEL_ALBUM"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {m.media_type === "CAROUSEL_ALBUM" ? "Carousel" : m.media_type === "VIDEO" ? "Reel/Video" : m.media_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="truncate text-sm">{m.judul_konten ?? "—"}</div>
                        {m.link_konten && (
                          <a href={m.link_konten} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />Buka
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">{m.views.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{m.reach.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{m.likes.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{m.comments.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{m.shares.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{m.saves.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {m.watch_time_minutes != null ? `${m.watch_time_minutes.toFixed(1)} mnt` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {m.engagement_rate != null ? `${m.engagement_rate.toFixed(2)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-muted-foreground print:hidden">
              <span>{totalMetrics} total data</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={tablePage <= 1} onClick={() => setTablePage((p) => p - 1)}>Prev</Button>
                <span className="py-1 px-2">{tablePage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={tablePage >= totalPages} onClick={() => setTablePage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Per-Post Detail Modal ── */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {PLATFORM_LABELS[selectedPost.platform ?? ""] ?? selectedPost.platform}
                  </Badge>
                  {selectedPost.media_type && (
                    <Badge variant="outline" className={`text-xs ${
                      selectedPost.media_type === "VIDEO" || selectedPost.media_type === "REEL"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : selectedPost.media_type === "CAROUSEL_ALBUM"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-gray-600"
                    }`}>
                      {selectedPost.media_type === "CAROUSEL_ALBUM" ? "Carousel" : selectedPost.media_type === "VIDEO" ? "Reel/Video" : selectedPost.media_type}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{selectedPost.tanggal}</span>
                </div>
                <p className="text-sm font-medium leading-snug line-clamp-3">{selectedPost.judul_konten ?? "—"}</p>
                {selectedPost.link_konten && (
                  <a href={selectedPost.link_konten} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="h-3 w-3" />Buka di {PLATFORM_LABELS[selectedPost.platform ?? ""] ?? "platform"}
                  </a>
                )}
              </div>
              <button onClick={() => setSelectedPost(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Views", value: selectedPost.views, icon: Eye, color: "text-indigo-600" },
                { label: "Reach", value: selectedPost.reach, icon: Users, color: "text-teal-600" },
                { label: "Likes", value: selectedPost.likes, icon: Heart, color: "text-pink-600" },
                { label: "Komentar", value: selectedPost.comments, icon: MessageCircle, color: "text-yellow-600" },
                { label: "Shares", value: selectedPost.shares, icon: Share2, color: "text-green-600" },
                { label: "Saves", value: selectedPost.saves, icon: Bookmark, color: "text-purple-600" },
                { label: "Reposts", value: selectedPost.reposts, icon: Repeat2, color: "text-orange-600" },
                ...(selectedPost.watch_time_minutes != null ? [{ label: "Watch Time", value: `${selectedPost.watch_time_minutes.toFixed(1)} mnt`, icon: Clock, color: "text-red-600" }] : []),
                ...(selectedPost.engagement_rate != null ? [{ label: "Eng. Rate", value: `${selectedPost.engagement_rate.toFixed(2)}%`, icon: TrendingUp, color: "text-blue-600" }] : []),
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="border rounded-lg p-3">
                  <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-lg font-bold font-mono">{typeof value === "number" ? value.toLocaleString("id-ID") : value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
