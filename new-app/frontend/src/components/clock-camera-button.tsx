"use client";

import { useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { compressUploadImage } from "@/lib/compress-upload-image";
import { toast } from "sonner";
import { Clock, Camera, X, Loader2, MapPin, SwitchCamera } from "lucide-react";

type CameraFacing = "user" | "environment";

export type CameraCaptureMetadata = {
  accuracy: number;
  facing: CameraFacing;
  location: string;
};

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Browser tidak mendukung lokasi."));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

async function reverseName(lat: number, lng: number): Promise<string> {
  try {
    const response = await apiClient.get("/geo/reverse", { params: { lat, lng } });
    return response.data?.location || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export function ClockCameraButton({
  label,
  tone,
  disabled,
  watermarkTitle,
  onCapture,
}: {
  label: string;
  tone: "in" | "out";
  disabled?: boolean;
  watermarkTitle?: string;
  onCapture: (file: File, lat: number, lng: number, metadata: CameraCaptureMetadata) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [facing, setFacing] = useState<CameraFacing>("environment");
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const attachStream = (stream: MediaStream) => {
    streamRef.current = stream;
    window.setTimeout(() => {
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => undefined);
    }, 30);
  };

  const requestCamera = (cameraFacing: CameraFacing) => navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: cameraFacing } },
    audio: false,
  });

  const close = () => {
    stopStream();
    setOpen(false);
    setGps(null);
  };

  const start = async () => {
    if (disabled) return;
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser tidak mendukung kamera langsung.");
      const position = await getPosition();
      setGps({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
      const stream = await requestCamera(facing);
      setOpen(true);
      attachStream(stream);
    } catch (error: any) {
      toast.error(`Kamera dan GPS wajib diizinkan. ${error?.message || ""}`);
    } finally {
      setStarting(false);
    }
  };

  const switchCamera = async () => {
    if (busy) return;
    const previousFacing = facing;
    const nextFacing: CameraFacing = previousFacing === "environment" ? "user" : "environment";
    setBusy(true);
    stopStream();
    try {
      const stream = await requestCamera(nextFacing);
      setFacing(nextFacing);
      attachStream(stream);
    } catch {
      try {
        const fallback = await requestCamera(previousFacing);
        attachStream(fallback);
      } catch {
        close();
      }
      toast.error("Kamera yang dipilih tidak tersedia pada perangkat ini.");
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    try {
      const position = await getPosition();
      const coordinates = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
      setGps(coordinates);
      const location = await reverseName(coordinates.lat, coordinates.lng);

      const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Browser tidak dapat memproses foto.");

      if (facing === "user") {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0);

      const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "medium" });
      const padding = Math.round(canvas.width * 0.022);
      const fontSize = Math.max(18, Math.round(canvas.width * 0.026));
      context.font = `600 ${fontSize}px sans-serif`;
      const coordinateText = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)} (akurasi ±${Math.round(coordinates.accuracy)} m)`;
      const lines = [
        ...(watermarkTitle ? wrapText(context, watermarkTitle, canvas.width - padding * 2) : []),
        time,
        ...wrapText(context, location, canvas.width - padding * 2),
        coordinateText,
      ];
      const lineHeight = fontSize * 1.35;
      const barHeight = lineHeight * lines.length + padding * 2;
      context.fillStyle = "rgba(0,0,0,0.68)";
      context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
      context.fillStyle = "#ffffff";
      context.textBaseline = "top";
      lines.forEach((line, index) => context.fillText(line, padding, canvas.height - barHeight + padding + index * lineHeight));

      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Foto gagal dibuat.")),
        "image/jpeg",
        0.84,
      ));
      const rawFile = new File([blob], `visit-${tone}-${Date.now()}.jpg`, { type: "image/jpeg" });
      const file = await compressUploadImage(rawFile);
      await onCapture(file, coordinates.lat, coordinates.lng, { accuracy: coordinates.accuracy, facing, location });
      close();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || "Gagal mengambil foto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" disabled={disabled || starting} onClick={start}
        className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white ${tone === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"} ${disabled || starting ? "opacity-50" : ""}`}>
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />} {starting ? "Menyiapkan GPS..." : label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex min-h-[100dvh] flex-col bg-black">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} playsInline muted className={`h-full w-full object-contain ${facing === "user" ? "-scale-x-100" : ""}`} />
            <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-md bg-black/70 px-3 py-2 text-xs text-white">
              <div className="flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5" /> GPS aktif</div>
              {gps && <p className="mt-0.5 text-white/75">Akurasi ±{Math.round(gps.accuracy)} meter</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-5 bg-black px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={close} disabled={busy} aria-label="Tutup kamera" className="grid min-h-11 min-w-11 place-items-center justify-self-center rounded-full bg-white/20 text-white"><X className="h-6 w-6" /></button>
            <button type="button" onClick={capture} disabled={busy || !gps} aria-label="Ambil foto" className="grid h-16 w-16 place-items-center justify-self-center rounded-full bg-white ring-4 ring-white/40 disabled:opacity-60">
              {busy ? <Loader2 className="h-7 w-7 animate-spin text-black" /> : <Camera className="h-7 w-7 text-black" />}
            </button>
            <button type="button" onClick={switchCamera} disabled={busy} aria-label="Ganti kamera depan atau belakang" className="grid min-h-11 min-w-11 place-items-center justify-self-center rounded-full bg-white/20 text-white"><SwitchCamera className="h-6 w-6" /></button>
          </div>
          <p className="bg-black px-4 pb-3 text-center text-xs text-white/70">{facing === "environment" ? "Kamera belakang" : "Kamera depan"} · waktu dan lokasi otomatis tercetak</p>
        </div>
      )}
    </>
  );
}
