"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera, Clock, CheckCircle, XCircle, AlertTriangle, MapPin,
  LogIn, LogOut, RefreshCw, Loader2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";

const api = {
  getConfig: () => apiClient.get("/absen-karyawan/config").then((r) => r.data),
  getToday: () => apiClient.get("/absen-karyawan/today").then((r) => r.data),
  getHistory: () => apiClient.get("/absen-karyawan/history").then((r) => r.data),
  checkIn: (data: any) => apiClient.post("/absen-karyawan/check-in", data).then((r) => r.data),
  checkOut: (data: any) => apiClient.post("/absen-karyawan/check-out", data).then((r) => r.data),
};

// ── Haversine (client-side untuk preview jarak) ────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Gambar timestamp di atas foto via Canvas ───────────────────────────────────
function stampPhoto(imageSrc: string, lines: string[]): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const fh = Math.max(img.width * 0.035, 18);
      const pad = fh * 0.6;
      const boxH = fh * lines.length + pad * (lines.length + 1);

      // Semi-transparent background di bawah
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, img.height - boxH, img.width, boxH);

      ctx.font = `bold ${fh}px Arial, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillText(line, pad, img.height - boxH + pad + i * (fh + pad * 0.4));
      });

      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.src = imageSrc;
  });
}

function formatJam(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function formatTanggal(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const STATUS_STYLE: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  Hadir:     { color: "bg-green-100 text-green-700 border-green-200",   icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Hadir" },
  Terlambat: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="h-3.5 w-3.5" />,       label: "Terlambat" },
  Pending:   { color: "bg-blue-100 text-blue-700 border-blue-200",      icon: <Clock className="h-3.5 w-3.5" />,       label: "Menunggu Approval" },
  Disetujui: { color: "bg-green-100 text-green-700 border-green-200",   icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Disetujui" },
  Ditolak:   { color: "bg-red-100 text-red-700 border-red-200",         icon: <XCircle className="h-3.5 w-3.5" />,     label: "Ditolak" },
};

type GpsState = { lat: number; lng: number; jarak: number; accuracy: number; diLuar: boolean } | null;

export default function AbsenKaryawanPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<"idle" | "camera" | "preview" | "submit">("idle");
  const [mode, setMode] = useState<"masuk" | "keluar">("masuk");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsState>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const { data: cfg } = useQuery({ queryKey: ["absen-cfg"], queryFn: api.getConfig });
  const { data: today, isLoading: loadingToday } = useQuery({
    queryKey: ["absen-today"],
    queryFn: api.getToday,
    refetchInterval: 30000,
  });
  const { data: history = [], isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ["absen-history"],
    queryFn: api.getHistory,
  });

  const checkInMut = useMutation({
    mutationFn: (data: any) => api.checkIn(data),
    onSuccess: () => {
      toast.success("Absen masuk berhasil!");
      qc.invalidateQueries({ queryKey: ["absen-today"] });
      qc.invalidateQueries({ queryKey: ["absen-history"] });
      resetCamera();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal absen masuk"),
  });

  const checkOutMut = useMutation({
    mutationFn: (data: any) => api.checkOut(data),
    onSuccess: () => {
      toast.success("Absen keluar berhasil!");
      qc.invalidateQueries({ queryKey: ["absen-today"] });
      qc.invalidateQueries({ queryKey: ["absen-history"] });
      resetCamera();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Gagal absen keluar"),
  });

  const isMutating = checkInMut.isPending || checkOutMut.isPending;

  function resetCamera() {
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setCapturedPhoto(null);
    setGps(null);
    setAlasan("");
    setStep("idle");
  }

  async function startCamera(m: "masuk" | "keluar") {
    setMode(m);
    setStep("camera");
    setCapturedPhoto(null);
    setGps(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
      setStep("idle");
    }

    // Ambil GPS bersamaan
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (cfg) {
          const jarak = haversine(lat, lng, cfg.kantor_lat, cfg.kantor_lng);
          // Anggap dalam kantor jika jarak dikurangi akurasi GPS masih <= radius
          const diLuar = (jarak - accuracy) > cfg.radius_meter;
          setGps({ lat, lng, jarak, accuracy, diLuar });
        } else {
          setGps({ lat, lng, jarak: 0, accuracy, diLuar: false });
        }
        setGpsLoading(false);
      },
      () => {
        toast.error("Gagal mendapatkan lokasi. Pastikan izin lokasi diberikan.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 0.9);

    // Stop kamera
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    setCameraStream(null);

    // Overlay timestamp
    const now = new Date();
    const tgl = now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const jam = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const lokasiTeks = gps
      ? gps.diLuar
        ? `📍 Luar Kantor (${Math.round(gps.jarak)}m dari kantor)`
        : `📍 Dalam Kantor (${Math.round(gps.jarak)}m)`
      : "📍 Lokasi tidak tersedia";

    const stamped = await stampPhoto(raw, [
      `👤 ${user?.name ?? "Karyawan"}`,
      `🕐 ${jam}  📅 ${tgl}`,
      lokasiTeks,
    ]);

    setCapturedPhoto(stamped);
    setStep("preview");
  }, [cameraStream, gps, user?.name]);

  async function handleSubmit() {
    if (!capturedPhoto) return;
    if (gps?.diLuar && !alasan.trim()) {
      toast.error("Wajib isi alasan karena berada di luar kantor");
      return;
    }
    const payload = {
      [mode === "masuk" ? "foto_masuk" : "foto_keluar"]: capturedPhoto,
      lat: gps?.lat ?? null,
      lng: gps?.lng ?? null,
      ...(mode === "masuk" && gps?.diLuar ? { alasan_luar: alasan.trim() } : {}),
    };
    if (mode === "masuk") checkInMut.mutate(payload);
    else checkOutMut.mutate(payload);
  }

  const sudahMasuk = !!today?.foto_masuk;
  const sudahKeluar = !!today?.foto_keluar;

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold">Absen Karyawan</h1>
          <p className="text-sm text-muted-foreground">{formatTanggal(new Date())}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => {
          qc.invalidateQueries({ queryKey: ["absen-today"] });
          qc.invalidateQueries({ queryKey: ["absen-history"] });
        }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Status hari ini */}
      {loadingToday ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <Card className="rounded-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Status Hari Ini</span>
              {today?.status && (() => {
                const s = STATUS_STYLE[today.status] ?? STATUS_STYLE["Hadir"];
                return (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>
                    {s.icon}{s.label}
                  </span>
                );
              })()}
              {!today && <span className="text-xs text-muted-foreground">Belum absen</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Masuk</p>
                <p className="text-lg font-bold">{formatJam(today?.jam_masuk ?? null)}</p>
                {today?.terlambat && <p className="text-[10px] text-yellow-600 font-medium">Terlambat</p>}
                {today?.di_luar_kantor && (
                  <p className="text-[10px] text-blue-600 font-medium">
                    Luar Kantor {today.jarak_masuk ? `(${Math.round(today.jarak_masuk)}m)` : ""}
                  </p>
                )}
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Keluar</p>
                <p className="text-lg font-bold">{formatJam(today?.jam_keluar ?? null)}</p>
              </div>
            </div>

            {today?.status === "Ditolak" && today.catatan_reject && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5 text-xs text-red-700">
                <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Ditolak: {today.catatan_reject}</span>
              </div>
            )}
            {today?.status === "Pending" && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-700">
                <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Absen luar kantor menunggu persetujuan. Alasan: {today.alasan_luar}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Jam kerja info */}
      {cfg && step === "idle" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          Jam masuk: <b>{cfg.jam_masuk_awal}</b> – <b>{cfg.jam_masuk_akhir}</b> &nbsp;|&nbsp; Pulang: <b>{cfg.jam_pulang}</b>
        </div>
      )}

      {/* Tombol absen */}
      {step === "idle" && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-16 flex-col gap-1 bg-green-600 hover:bg-green-700"
            disabled={sudahMasuk}
            onClick={() => startCamera("masuk")}
          >
            <LogIn className="h-5 w-5" />
            <span className="text-xs">{sudahMasuk ? "Sudah Masuk" : "Absen Masuk"}</span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 flex-col gap-1 border-orange-300 hover:bg-orange-50"
            disabled={!sudahMasuk || sudahKeluar}
            onClick={() => startCamera("keluar")}
          >
            <LogOut className="h-5 w-5 text-orange-500" />
            <span className="text-xs text-orange-600">{sudahKeluar ? "Sudah Keluar" : "Absen Keluar"}</span>
          </Button>
        </div>
      )}

      {/* KAMERA */}
      {step === "camera" && (
        <Card className="rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-black aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {/* GPS status overlay */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                {gpsLoading ? (
                  <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Mendapatkan lokasi...
                  </span>
                ) : gps ? (
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium ${gps.diLuar ? "bg-red-500/80 text-white" : "bg-green-500/80 text-white"}`}>
                    <MapPin className="h-3 w-3" />
                    {gps.diLuar ? `Luar Kantor (${Math.round(gps.jarak)}m)` : `Dalam Kantor (${Math.round(gps.jarak)}m)`}
                    {` ±${Math.round(gps.accuracy)}m`}
                  </span>
                ) : (
                  <span className="bg-yellow-500/80 text-white text-xs px-2 py-1 rounded-full">Lokasi tidak tersedia</span>
                )}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="p-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetCamera}>Batal</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={capturePhoto} disabled={gpsLoading}>
                <Camera className="h-4 w-4 mr-2" />
                Ambil Foto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PREVIEW + submit */}
      {step === "preview" && capturedPhoto && (
        <Card className="rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img src={capturedPhoto} alt="preview" className="w-full object-cover" />
            </div>

            <div className="p-4 space-y-3">
              {/* GPS info */}
              {gps && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${gps.diLuar ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {gps.diLuar
                    ? `Luar kantor — ${Math.round(gps.jarak)} meter dari kantor`
                    : `Dalam kantor — ${Math.round(gps.jarak)} meter dari kantor`}
                  <span className="opacity-60 ml-1">(akurasi GPS ±{Math.round(gps.accuracy)}m)</span>
                </div>
              )}

              {/* Alasan wajib jika luar kantor & masuk */}
              {gps?.diLuar && mode === "masuk" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Alasan berada di luar kantor <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="Contoh: WFH, dinas luar, meeting klien..."
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    className="text-sm resize-none border-amber-300 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-amber-600">Absen ini akan membutuhkan persetujuan Head Finance / Super Admin</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setCapturedPhoto(null); startCamera(mode); }}>
                  Ulangi
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isMutating || (gps?.diLuar && mode === "masuk" && !alasan.trim())}
                  onClick={handleSubmit}
                >
                  {isMutating ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Mengirim...</> : `Kirim Absen ${mode === "masuk" ? "Masuk" : "Keluar"}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riwayat */}
      {step === "idle" && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Riwayat 30 Hari</p>
          {loadingHistory ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (history as any[]).length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Belum ada riwayat</p>
          ) : (
            <div className="divide-y border rounded-xl overflow-hidden">
              {(history as any[]).map((r: any) => {
                const s = STATUS_STYLE[r.status] ?? STATUS_STYLE["Hadir"];
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatTanggal(r.tanggal)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatJam(r.jam_masuk)} – {formatJam(r.jam_keluar)}
                        {r.di_luar_kantor && <span className="ml-2 text-blue-500">Luar Kantor</span>}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
                      {s.icon}{s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
