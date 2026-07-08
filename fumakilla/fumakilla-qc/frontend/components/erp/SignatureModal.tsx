"use client";
import { useEffect, useRef, useState } from "react";

// Modal tanda tangan approval — bisa gambar di kanvas ATAU upload gambar.
// onSubmit menerima data URL PNG (base64). Dipakai saat approve report B2B/B2C.
export function SignatureModal({
  open,
  onClose,
  onSubmit,
  saving,
  title = "Tanda Tangan Approval",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (dataUrl: string) => void;
  saving?: boolean;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setHasDrawn(false);
    setUploaded(null);
    setError("");
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a"; }
    }
  }, [open]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width), y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height) };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (uploaded) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasDrawn(true);
  };
  const end = () => { drawing.current = false; };

  const clearAll = () => {
    setUploaded(null);
    setHasDrawn(false);
    setError("");
    const canvas = canvasRef.current;
    if (canvas) { const ctx = canvas.getContext("2d"); ctx?.clearRect(0, 0, canvas.width, canvas.height); }
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("File harus berupa gambar."); return; }
    const reader = new FileReader();
    reader.onload = () => setUploaded(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    let dataUrl = uploaded;
    if (!dataUrl) {
      if (!hasDrawn) { setError("Gambar tanda tangan atau upload gambar dulu."); return; }
      dataUrl = canvasRef.current!.toDataURL("image/png");
    }
    onSubmit(dataUrl);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="text-xl" onClick={onClose}>×</button>
        </div>
        <p className="mb-3 text-sm text-ts">Gambar tanda tangan di bawah, atau upload gambar tanda tangan.</p>
        {uploaded ? (
          <div className="rounded-lg border border-bdr bg-[#f8fbff] p-3">
            <img src={uploaded} alt="Tanda tangan" className="mx-auto max-h-40 object-contain" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={560}
            height={200}
            className="w-full touch-none rounded-lg border border-bdr bg-white"
            style={{ cursor: "crosshair" }}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" className="btn" onClick={clearAll} disabled={saving}>Bersihkan</button>
            <label className="btn cursor-pointer">
              Upload Gambar
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>Batal</button>
            <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Menyimpan..." : "Approve & Tanda Tangan"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
