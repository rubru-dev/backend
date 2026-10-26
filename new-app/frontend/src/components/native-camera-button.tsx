"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { compressUploadImage } from "@/lib/compress-upload-image";

export type NativeCameraFacing = "user" | "environment";

export type NativeCameraMetadata = {
  accuracy: number | null;
  facing: NativeCameraFacing;
  location: string | null;
};

type Props = {
  label: string;
  disabled?: boolean;
  requireGps?: boolean;
  watermarkTitle?: string;
  onCapture: (file: File, lat: number | null, lng: number | null, metadata: NativeCameraMetadata) => Promise<void> | void;
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
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch {
      // Gunakan decoder gambar biasa pada browser yang belum mendukung createImageBitmap.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  try {
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Foto dari kamera tidak dapat dibaca.");
  }
}

async function addVisitWatermark(
  file: File,
  title: string,
  lat: number,
  lng: number,
  accuracy: number,
  location: string,
): Promise<File> {
  const decoded = await decodeImage(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Browser tidak dapat memproses foto.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    const padding = Math.max(14, Math.round(canvas.width * 0.022));
    const fontSize = Math.max(18, Math.round(canvas.width * 0.026));
    context.font = `600 ${fontSize}px sans-serif`;
    const time = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "medium",
    });
    const lines = [
      ...wrapText(context, title, canvas.width - padding * 2),
      time,
      ...wrapText(context, location, canvas.width - padding * 2),
      `${lat.toFixed(6)}, ${lng.toFixed(6)} (akurasi ±${Math.round(accuracy)} m)`,
    ];
    const lineHeight = fontSize * 1.35;
    const barHeight = lineHeight * lines.length + padding * 2;
    context.fillStyle = "rgba(0,0,0,0.7)";
    context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
    context.fillStyle = "#ffffff";
    context.textBaseline = "top";
    lines.forEach((line, index) => context.fillText(line, padding, canvas.height - barHeight + padding + index * lineHeight));

    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Foto gagal dibuat.")),
      "image/jpeg",
      0.82,
    ));
    return new File([blob], `visit-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    decoded.cleanup();
  }
}

export function NativeCameraButton({ label, disabled, requireGps = false, watermarkTitle, onCapture }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const facing: NativeCameraFacing = "environment";

  const openCamera = () => {
    if (disabled || busy) return;
    inputRef.current?.click();
  };

  const handleCapture = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      let accuracy: number | null = null;
      let location: string | null = null;
      let processed = file;

      if (requireGps) {
        const position = await getPosition();
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        accuracy = position.coords.accuracy;
        location = await reverseName(lat, lng);
        processed = await addVisitWatermark(
          file,
          watermarkTitle || "Bukti Visit Projek",
          lat,
          lng,
          accuracy,
          location,
        );
      }

      processed = await compressUploadImage(processed);
      await onCapture(processed, lat, lng, { accuracy, facing, location });
    } catch (error: any) {
      toast.error(requireGps
        ? `Foto dan GPS wajib tersedia. ${error?.message || ""}`
        : error?.message || "Foto gagal diproses.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={facing}
        className="hidden"
        onChange={(event) => void handleCapture(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={openCamera}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {busy ? (requireGps ? "Memproses foto dan GPS..." : "Memproses foto...") : label}
      </button>
      <p className="text-xs text-muted-foreground">
        Kamera HP akan dibuka langsung. Foto dari galeri tidak digunakan.
      </p>
    </div>
  );
}
