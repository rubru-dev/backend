"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Eye, Heart, Share2, MessageCircle, Instagram, Youtube } from "lucide-react";

const contentDashApi = {
  getSummary: () => apiClient.get("/content-creator/dashboard").then((r) => r.data),
};

export default function DashboardSosmedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["content-dashboard"],
    queryFn: () => contentDashApi.getSummary(),
    retry: false,
  });

  const d = data as any;

  const statCards = [
    { label: "Total Konten", value: d?.total_konten ?? 0, icon: Share2, color: "text-pink-500" },
    { label: "Sudah Posting", value: d?.sudah_posting ?? 0, icon: TrendingUp, color: "text-green-500" },
    { label: "Draft", value: d?.draft ?? 0, icon: MessageCircle, color: "text-gray-500" },
    { label: "Siap Posting", value: d?.siap_posting ?? 0, icon: Eye, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Sosial Media</h1>
        <p className="text-muted-foreground">Overview performa konten dan sosial media</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading
                ? <Skeleton className="h-8 w-20" />
                : <p className="text-3xl font-bold">{s.value}</p>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" /> Konten per Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <Skeleton className="h-40 w-full" />
              : (
                <div className="space-y-3">
                  {(d?.per_platform ?? [
                    { platform: "Instagram", jumlah: 0 },
                    { platform: "TikTok", jumlah: 0 },
                    { platform: "YouTube", jumlah: 0 },
                    { platform: "Facebook", jumlah: 0 },
                  ]).map((p: any) => (
                    <div key={p.platform} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium">{p.platform}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-pink-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (p.jumlah / (d?.total_konten || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{p.jumlah}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konten Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <Skeleton className="h-40 w-full" />
              : (
                <div className="space-y-2">
                  {(d?.bulan_ini ?? []).length === 0
                    ? <p className="text-muted-foreground text-sm text-center py-8">Belum ada data konten bulan ini</p>
                    : (d?.bulan_ini ?? []).slice(0, 5).map((k: any) => (
                        <div key={k.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                          <span className="text-sm truncate flex-1">{k.judul}</span>
                          <div className="flex gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">{k.platform}</Badge>
                            <Badge className={`text-xs ${
                              k.status === "Sudah Posting" ? "bg-green-100 text-green-700" :
                              k.status === "Siap Posting" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>{k.status}</Badge>
                          </div>
                        </div>
                      ))
                  }
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
