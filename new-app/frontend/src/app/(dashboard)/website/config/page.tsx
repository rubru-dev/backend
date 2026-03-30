"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Globe, Phone, MapPin, Link2, Loader2, Mail, Clock } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z" />
    </svg>
  );
}

export default function WebsiteConfigPage() {
  const qc = useQueryClient();
  const { _hasHydrated, isSuperAdmin, hasPermission } = useAuthStore();
  const [form, setForm] = useState({
    whatsapp_number: "",
    alamat_kantor: "",
    alamat_workshop: "",
    telepon: "",
    email: "",
    jam_kerja: "",
    lokasi_maps: "",
    instagram: "",
    instagram_url: "",
    tiktok_url: "",
    facebook_url: "",
    stats_hari: "0",
    stats_projek: "0",
    stats_mitra: "0",
  });
  const [synced, setSynced] = useState(false);

  useQuery({
    queryKey: ["website-config"],
    queryFn: async () => {
      const data = await websiteApi.getConfig();
      setForm({
        whatsapp_number: data.whatsapp_number ?? "",
        alamat_kantor: data.alamat_kantor ?? "",
        alamat_workshop: data.alamat_workshop ?? "",
        telepon: data.telepon ?? "",
        email: data.email ?? "",
        jam_kerja: data.jam_kerja ?? "",
        lokasi_maps: data.lokasi_maps ?? "",
        instagram: data.instagram ?? "",
        instagram_url: data.instagram_url ?? "",
        tiktok_url: data.tiktok_url ?? "",
        facebook_url: data.facebook_url ?? "",
        stats_hari: String(data.stats_hari ?? 0),
        stats_projek: String(data.stats_projek ?? 0),
        stats_mitra: String(data.stats_mitra ?? 0),
      });
      setSynced(true);
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: () =>
      websiteApi.saveConfig({
        whatsapp_number: form.whatsapp_number,
        alamat_kantor: form.alamat_kantor || null,
        alamat_workshop: form.alamat_workshop || null,
        telepon: form.telepon || null,
        email: form.email || null,
        jam_kerja: form.jam_kerja || null,
        lokasi_maps: form.lokasi_maps || null,
        instagram: form.instagram || null,
        instagram_url: form.instagram_url || null,
        tiktok_url: form.tiktok_url || null,
        facebook_url: form.facebook_url || null,
        stats_hari: parseInt(form.stats_hari) || 0,
        stats_projek: parseInt(form.stats_projek) || 0,
        stats_mitra: parseInt(form.stats_mitra) || 0,
      }),
    onSuccess: () => {
      toast.success("Konfigurasi website berhasil disimpan");
      qc.invalidateQueries({ queryKey: ["website-config"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal menyimpan"),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!synced) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (_hasHydrated && !isSuperAdmin() && !hasPermission("website", "view")) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>;
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="text-orange-500" size={24} />
          Konfigurasi Website
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pengaturan kontak, alamat, media sosial, dan Google Maps untuk website publik.
        </p>
      </div>

      {/* Kontak */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone size={16} className="text-orange-500" />
            Kontak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Nomor WhatsApp</Label>
            <Input placeholder="6281234567890" value={form.whatsapp_number} onChange={set("whatsapp_number")} />
            <p className="text-xs text-muted-foreground">Format internasional tanpa + (contoh: 6281376405550)</p>
          </div>
          <div className="space-y-1">
            <Label>Telepon</Label>
            <Input placeholder="+62 813-7640-5550" value={form.telepon} onChange={set("telepon")} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" placeholder="info@rubahrumah.id" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-1">
            <Label>Jam Kerja</Label>
            <Input placeholder="Senin – Sabtu: 08.00 – 17.00 WIB" value={form.jam_kerja} onChange={set("jam_kerja")} />
          </div>
        </CardContent>
      </Card>

      {/* Alamat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin size={16} className="text-orange-500" />
            Alamat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Alamat Kantor</Label>
            <Textarea rows={3} placeholder="Jl. Pandu II No.420, Bekasi, Jawa Barat" value={form.alamat_kantor} onChange={set("alamat_kantor")} />
          </div>
          <div className="space-y-1">
            <Label>Alamat Workshop</Label>
            <Textarea rows={3} placeholder="Jl. Mutiara Gading Timur, Bekasi, Jawa Barat" value={form.alamat_workshop} onChange={set("alamat_workshop")} />
          </div>
          <div className="space-y-1">
            <Label>Embed Google Maps (URL iframe src)</Label>
            <Textarea
              rows={3}
              placeholder="https://www.google.com/maps/embed?pb=..."
              value={form.lokasi_maps}
              onChange={set("lokasi_maps")}
            />
            <p className="text-xs text-muted-foreground">
              Buka Google Maps → Share → Embed a map → salin hanya bagian URL dari src="..."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Media Sosial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 size={16} className="text-orange-500" />
            Media Sosial (Footer)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Instagram (username)</Label>
            <Input placeholder="@rubahrumah.id" value={form.instagram} onChange={set("instagram")} />
          </div>
          <div className="space-y-1">
            <Label>Instagram URL</Label>
            <Input placeholder="https://www.instagram.com/rubahrumah/" value={form.instagram_url} onChange={set("instagram_url")} />
          </div>
          <div className="space-y-1">
            <Label>TikTok URL</Label>
            <Input placeholder="https://www.tiktok.com/@rubahrumah" value={form.tiktok_url} onChange={set("tiktok_url")} />
          </div>
          <div className="space-y-1">
            <Label>Facebook URL</Label>
            <Input placeholder="https://www.facebook.com/rubahrumah" value={form.facebook_url} onChange={set("facebook_url")} />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="bg-orange-500 hover:bg-orange-600 text-white"
      >
        {saveMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
        Simpan Konfigurasi
      </Button>
    </div>
  );
}
