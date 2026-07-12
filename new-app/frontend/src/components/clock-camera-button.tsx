"use client";

import { useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { Clock, Camera, X, Loader2 } from "lucide-react";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Browser tidak mendukung lokasi."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000 });
  });
}

async function reverseName(lat: number, lng: number): Promise<string> {
  try {
    const r = await apiClient.get("/geo/reverse", { params: { lat, lng } });
    return r.data?.location || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Bungkus teks agar muat lebar kanvas
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/**
 * Tombol clock in/out: WAJIB foto langsung dari kamera (bukan upload), minta lokasi,
 * lalu cap waktu + nama lokasi ke foto sebelum diserahkan ke onCapture.
 */
export function ClockCameraButton({
  label, tone, disabled, onCapture,
}: {
  label: string;
  tone: "in" | "out";
  disabled?: boolean;
  onCapture: (file: File, lat: number, lng: number) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const close = () => { stopStream(); setOpen(false); coordsRef.current = null; };

  const start = async () => {
    if (disabled) return;
    setStarting(true);
    try {
      const pos = await getPosition();
      coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setOpen(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 30);
    } catch (e: any) {
      toast.error("Butuh izin kamera & lokasi. " + (e?.message || ""));
    } finally {
      setStarting(false);
    }
  };

  const capture = async () => {
    const v = videoRef.current;
    const coords = coordsRef.current;
    if (!v || !coords || !v.videoWidth) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

      const timeStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      const locName = await reverseName(coords.lat, coords.lng);

      const pad = Math.round(canvas.width * 0.02);
      const fontSize = Math.max(18, Math.round(canvas.width * 0.03));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const locLines = wrapText(ctx, locName, canvas.width - pad * 2);
      const allLines = [`🕒 ${timeStr}`, ...locLines];
      const lineH = fontSize * 1.35;
      const barH = lineH * allLines.length + pad * 2;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "top";
      allLines.forEach((line, i) => ctx.fillText(line, pad, canvas.height - barH + pad + i * lineH));

      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), "image/jpeg", 0.85));
      const file = new File([blob], `clock-${tone}-${Date.now()}.jpg`, { type: "image/jpeg" });
      await onCapture(file, coords.lat, coords.lng);
      close();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || "Gagal mengambil foto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        disabled={disabled || starting}
        onClick={start}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white ${tone === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"} ${disabled || starting ? "opacity-50" : ""}`}
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />} {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} playsInline muted className="min-h-0 flex-1 w-full object-contain" />
          <div className="flex items-center justify-center gap-8 bg-black px-4 py-5">
            <button onClick={close} disabled={busy} className="rounded-full bg-white/20 p-3 text-white"><X className="h-6 w-6" /></button>
            <button onClick={capture} disabled={busy} className="grid h-16 w-16 place-items-center rounded-full bg-white ring-4 ring-white/40">
              {busy ? <Loader2 className="h-7 w-7 animate-spin text-black" /> : <Camera className="h-7 w-7 text-black" />}
            </button>
            <span className="w-12" />
          </div>
          <p className="bg-black pb-4 text-center text-xs text-white/70">Foto langsung dari kamera · waktu &amp; lokasi otomatis dicap ke foto</p>
        </div>
      )}
    </>
  );
}
