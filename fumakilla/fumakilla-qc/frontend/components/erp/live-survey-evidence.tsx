"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { fileUrl } from "@/lib/utils";

type Position = { latitude: number; longitude: number; accuracy: number };
type AttendanceType = "checkin" | "checkout";

export function LiveSurveyEvidence({ survey, onSaved }: { survey: any; onSaved: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [type, setType] = useState<AttendanceType>(survey.evidenceImagePath ? "checkout" : "checkin");
  const [position, setPosition] = useState<Position | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const checkinDone = Boolean(survey.evidenceImagePath);
  const checkoutDone = Boolean(survey.checkoutImagePath);
  const disabled = type === "checkin" ? checkinDone : !checkinDone || checkoutDone;

  const stopCamera = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; setCameraOn(false); setCameraReady(false); };
  const resetCapture = () => { if (preview) URL.revokeObjectURL(preview); setPhoto(null); setPreview(""); setPosition(null); stopCamera(); };
  useEffect(() => () => { stream.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => { if (!cameraOn || !video.current || !stream.current) return; const element = video.current; element.srcObject = stream.current; const ready = async () => { try { await element.play(); setCameraReady(element.videoWidth > 0 && element.videoHeight > 0); } catch { setError("Kamera tidak dapat diputar. Pastikan izin kamera diberikan."); } }; element.addEventListener("loadedmetadata", ready, { once: true }); void ready(); return () => element.removeEventListener("loadedmetadata", ready); }, [cameraOn]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const start = async () => {
    setError("");
    setCameraReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.geolocation) throw new Error("Browser ini tidak mendukung kamera atau live location.");
      const [media, geo] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
        new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })),
      ]);
      stream.current = media;
      setPosition({ latitude: geo.coords.latitude, longitude: geo.coords.longitude, accuracy: geo.coords.accuracy });
      setCameraOn(true);
    } catch (requestError: any) {
      stopCamera();
      setError(requestError.message || "Kamera dan lokasi wajib diizinkan.");
    }
  };
  const capture = () => {
    const element = video.current;
    if (!element || !cameraReady || element.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return setError("Kamera sedang menyiapkan gambar. Tunggu sampai preview tampil, lalu ambil foto.");
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    const context = canvas.getContext("2d");
    if (!context || !canvas.width || !canvas.height) return setError("Kamera belum menghasilkan gambar. Coba aktifkan ulang kamera.");
    context.drawImage(element, 0, 0);
    canvas.toBlob((blob) => { if (!blob) return; if (preview) URL.revokeObjectURL(preview); setPhoto(blob); setPreview(URL.createObjectURL(blob)); stopCamera(); }, "image/jpeg", .9);
  };
  const submit = async () => {
    if (!photo || !position) return setError("Ambil foto live dan tunggu live location terdeteksi.");
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("type", type);
      body.append("photo", photo, `${type}-survey-${Date.now()}.jpg`);
      body.append("latitude", String(position.latitude));
      body.append("longitude", String(position.longitude));
      body.append("accuracy", String(position.accuracy));
      await api.post(`/erp/surveys/${survey.id}/attendance`, body);
      resetCapture();
      onSaved();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Bukti kehadiran gagal dikirim.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-bdr p-3">
          <p className="text-xs font-bold text-ts">CHECK IN</p>
          {checkinDone ? <img className="mt-2 max-h-36 rounded-lg object-cover" src={fileUrl(survey.evidenceImagePath)} alt="Check in" /> : <p className="mt-2 text-sm text-ts">Belum check in.</p>}
        </div>
        <div className="rounded-lg border border-bdr p-3">
          <p className="text-xs font-bold text-ts">CHECK OUT</p>
          {checkoutDone ? <img className="mt-2 max-h-36 rounded-lg object-cover" src={fileUrl(survey.checkoutImagePath)} alt="Check out" /> : <p className="mt-2 text-sm text-ts">Belum check out.</p>}
        </div>
      </div>
      <div className="flex gap-2 rounded-lg bg-surface p-1">
        <button className={`flex-1 rounded px-3 py-2 text-sm font-bold ${type === "checkin" ? "bg-white text-accent shadow" : "text-ts"}`} onClick={() => { resetCapture(); setType("checkin"); }}>Check In</button>
        <button className={`flex-1 rounded px-3 py-2 text-sm font-bold ${type === "checkout" ? "bg-white text-accent shadow" : "text-ts"}`} onClick={() => { resetCapture(); setType("checkout"); }}>Check Out</button>
      </div>
      {disabled && <p className="rounded-lg bg-[#dcf6e4] p-3 text-sm text-[#16713b]">{type === "checkin" ? "Check in sudah dikirim." : !checkinDone ? "Check in wajib dikirim sebelum check out." : "Check out sudah dikirim."}</p>}
      {!disabled && <div className="rounded-lg border border-[#c1c6d5] bg-[#f2f3fd] p-4 text-sm"><b>Foto wajib diambil langsung dari kamera.</b><p className="mt-1 text-ts">Lokasi GPS dan timestamp server dicatat saat bukti dikirim.</p></div>}
      {cameraOn && <video ref={video} className="max-h-72 w-full rounded-lg bg-black object-cover" playsInline muted />}
      {preview && <img className="max-h-72 w-full rounded-lg object-cover" src={preview} alt="Preview foto live survey" />}
      {position && <p className="text-xs text-ts">Live location terdeteksi - akurasi +/- {Math.round(position.accuracy)} m</p>}
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      {!disabled && <div className="flex flex-wrap gap-3">{!cameraOn && !photo && <button className="btn btn-primary" onClick={start}>Aktifkan Kamera & Lokasi</button>}{cameraOn && <button className="btn btn-primary" disabled={!cameraReady} onClick={capture}>{cameraReady ? "Ambil Foto Live" : "Menyiapkan Kamera..."}</button>}{photo && <button className="btn" onClick={resetCapture}>Ulangi Foto</button>}{photo && <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? "Mengirim..." : `Submit ${type === "checkin" ? "Check In" : "Check Out"}`}</button>}</div>}
    </div>
  );
}
