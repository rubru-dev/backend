"use client";
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";

export type CanvasObject =
  | { id: string; type: "rect"; x: number; y: number; w: number; h: number; stroke: string; fill: string; label?: string }
  | { id: string; type: "circle"; x: number; y: number; r: number; stroke: string; fill: string; label?: string }
  | { id: string; type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string }
  | { id: string; type: "text"; x: number; y: number; text: string; color: string; fontSize: number }
  | { id: string; type: "marker"; x: number; y: number; level: "high" | "mid" | "low"; num: number }
  | { id: string; type: "pest"; x: number; y: number; pestType: string; num: number };

export type CanvasData = {
  bgImage?: string; // data URL or file URL
  objects: CanvasObject[];
};

export type FloorPlanCanvasHandle = {
  toDataURL: () => string;
  getData: () => CanvasData;
};

const MARKER_COLORS = { high: "#ef4444", mid: "#eab308", low: "#22c55e" };
const PEST_COLORS: Record<string, string> = {
  Tikus: "#7c3aed", Kecoa: "#92400e", Semut: "#111827", Rayap: "#b45309",
  Lalat: "#6b7280", Kucing: "#ca8a04", Musang: "#7e22ce", Kelelawar: "#1e3a5f",
  Burung: "#0369a1", Cicak: "#15803d", "Tawon/Lebah": "#a16207", "Kutu SPI": "#9f1239",
};

function uid() { return Math.random().toString(36).slice(2); }

type Tool = "select" | "rect" | "circle" | "line" | "text" | "risk-high" | "risk-mid" | "risk-low" | { pest: string };

interface Props {
  initialData?: CanvasData | null;
  onChange?: (data: CanvasData) => void;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

const FloorPlanCanvas = forwardRef<FloorPlanCanvasHandle, Props>(function FloorPlanCanvas(
  { initialData, onChange, width = 700, height = 450, readOnly = false },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bgDataUrl, setBgDataUrl] = useState<string>(initialData?.bgImage || "");
  const [objects, setObjects] = useState<CanvasObject[]>(initialData?.objects || []);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [drawing, setDrawing] = useState<{ sx: number; sy: number } | null>(null);
  const [pestInput, setPestInput] = useState("Tikus");
  const [riskCount, setRiskCount] = useState({ high: 0, mid: 0, low: 0 });
  const markerCountRef = useRef(0);
  const pestCountRef = useRef(0);

  // Initialize from initialData
  useEffect(() => {
    if (initialData) {
      setObjects(initialData.objects || []);
      setBgDataUrl(initialData.bgImage || "");
    }
  }, []);

  // Load background image
  useEffect(() => {
    if (!bgDataUrl) { setBgImg(null); return; }
    const img = new Image();
    img.onload = () => setBgImg(img);
    img.src = bgDataUrl;
  }, [bgDataUrl]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#f8f9fb";
    ctx.fillRect(0, 0, width, height);
    if (bgImg) {
      const scale = Math.min(width / bgImg.width, height / bgImg.height);
      const w = bgImg.width * scale, h = bgImg.height * scale;
      const x = (width - w) / 2, y = (height - h) / 2;
      ctx.drawImage(bgImg, x, y, w, h);
    }

    // Grid (if no bg image)
    if (!bgImg) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y <= height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    }

    for (const obj of objects) {
      const isSel = obj.id === selected;
      ctx.save();
      if (isSel) { ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 6; }

      if (obj.type === "rect") {
        ctx.fillStyle = obj.fill || "rgba(59,130,246,0.15)";
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        ctx.strokeStyle = obj.stroke || "#3b82f6";
        ctx.lineWidth = 2;
        ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        if (obj.label) { ctx.fillStyle = obj.stroke || "#3b82f6"; ctx.font = "12px sans-serif"; ctx.fillText(obj.label, obj.x + 4, obj.y + 14); }
      } else if (obj.type === "circle") {
        ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
        ctx.fillStyle = obj.fill || "rgba(59,130,246,0.15)"; ctx.fill();
        ctx.strokeStyle = obj.stroke || "#3b82f6"; ctx.lineWidth = 2; ctx.stroke();
      } else if (obj.type === "line") {
        ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2);
        ctx.strokeStyle = obj.stroke || "#374151"; ctx.lineWidth = 2; ctx.stroke();
        // Arrow head
        const angle = Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1);
        ctx.beginPath();
        ctx.moveTo(obj.x2, obj.y2);
        ctx.lineTo(obj.x2 - 10 * Math.cos(angle - 0.5), obj.y2 - 10 * Math.sin(angle - 0.5));
        ctx.lineTo(obj.x2 - 10 * Math.cos(angle + 0.5), obj.y2 - 10 * Math.sin(angle + 0.5));
        ctx.closePath(); ctx.fillStyle = obj.stroke || "#374151"; ctx.fill();
      } else if (obj.type === "text") {
        ctx.fillStyle = obj.color || "#111827"; ctx.font = `${obj.fontSize || 14}px sans-serif`;
        ctx.fillText(obj.text, obj.x, obj.y);
      } else if (obj.type === "marker") {
        const color = MARKER_COLORS[obj.level];
        ctx.beginPath(); ctx.arc(obj.x, obj.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(obj.num), obj.x, obj.y);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      } else if (obj.type === "pest") {
        const color = PEST_COLORS[obj.pestType] || "#374151";
        ctx.beginPath(); ctx.arc(obj.x, obj.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const abbr = obj.pestType.slice(0, 3).toUpperCase();
        ctx.fillText(abbr, obj.x, obj.y - 3);
        ctx.font = "bold 8px sans-serif";
        ctx.fillText(String(obj.num), obj.x, obj.y + 6);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      }

      if (isSel && (obj.type === "rect" || obj.type === "circle")) {
        ctx.setLineDash([4, 2]); ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1;
        if (obj.type === "rect") ctx.strokeRect(obj.x - 2, obj.y - 2, obj.w + 4, obj.h + 4);
        else { ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r + 3, 0, Math.PI * 2); ctx.stroke(); }
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }, [objects, selected, bgImg, width, height]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (x: number, y: number): string | null => {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (obj.type === "rect") { if (x >= obj.x && x <= obj.x + obj.w && y >= obj.y && y <= obj.y + obj.h) return obj.id; }
      else if (obj.type === "circle" || obj.type === "marker" || obj.type === "pest") {
        const r = obj.type === "circle" ? obj.r : obj.type === "marker" ? 14 : 16;
        if (Math.hypot(x - obj.x, y - obj.y) <= r) return obj.id;
      } else if (obj.type === "text") { if (x >= obj.x && x <= obj.x + 100 && y >= obj.y - 16 && y <= obj.y + 4) return obj.id; }
    }
    return null;
  };

  const emit = useCallback((objs: CanvasObject[]) => {
    onChange?.({ bgImage: bgDataUrl, objects: objs });
  }, [bgDataUrl, onChange]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { x, y } = getPos(e);

    if (tool === "select") {
      const hit = hitTest(x, y);
      setSelected(hit);
      if (hit) {
        const obj = objects.find(o => o.id === hit)!;
        const ox = obj.type === "rect" ? x - obj.x : obj.type === "line" ? x - obj.x1 : x - (obj as any).x;
        const oy = obj.type === "rect" ? y - obj.y : obj.type === "line" ? y - obj.y1 : y - (obj as any).y;
        setDragging({ id: hit, ox, oy });
      }
      return;
    }

    if (tool === "rect" || tool === "circle" || tool === "line") {
      setDrawing({ sx: x, sy: y });
      return;
    }

    if (tool === "text") {
      const text = prompt("Masukkan teks:");
      if (text) {
        const newObj: CanvasObject = { id: uid(), type: "text", x, y, text, color: "#111827", fontSize: 13 };
        const next = [...objects, newObj];
        setObjects(next); emit(next);
      }
      return;
    }

    if (tool === "risk-high" || tool === "risk-mid" || tool === "risk-low") {
      const level = tool.split("-")[1] as "high" | "mid" | "low";
      markerCountRef.current += 1;
      const newObj: CanvasObject = { id: uid(), type: "marker", x, y, level, num: markerCountRef.current };
      const next = [...objects, newObj];
      setObjects(next); emit(next);
      return;
    }

    if (typeof tool === "object" && "pest" in tool) {
      pestCountRef.current += 1;
      const newObj: CanvasObject = { id: uid(), type: "pest", x, y, pestType: tool.pest, num: pestCountRef.current };
      const next = [...objects, newObj];
      setObjects(next); emit(next);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { x, y } = getPos(e);

    if (dragging) {
      const next = objects.map(obj => {
        if (obj.id !== dragging.id) return obj;
        if (obj.type === "rect") return { ...obj, x: x - dragging.ox, y: y - dragging.oy };
        if (obj.type === "line") return { ...obj, x1: x - dragging.ox, y1: y - dragging.oy, x2: obj.x2 + (x - dragging.ox - obj.x1), y2: obj.y2 + (y - dragging.oy - obj.y1) };
        return { ...obj, x: x - dragging.ox, y: y - dragging.oy };
      });
      setObjects(next); emit(next);
    }

    if (drawing) {
      // Preview while drawing — update a temp object
      const preview: CanvasObject[] = objects.filter(o => o.id !== "__preview__");
      if (tool === "rect") {
        preview.push({ id: "__preview__", type: "rect", x: Math.min(drawing.sx, x), y: Math.min(drawing.sy, y), w: Math.abs(x - drawing.sx), h: Math.abs(y - drawing.sy), stroke: "#3b82f6", fill: "rgba(59,130,246,0.1)" });
      } else if (tool === "circle") {
        preview.push({ id: "__preview__", type: "circle", x: drawing.sx, y: drawing.sy, r: Math.hypot(x - drawing.sx, y - drawing.sy), stroke: "#3b82f6", fill: "rgba(59,130,246,0.1)" });
      } else if (tool === "line") {
        preview.push({ id: "__preview__", type: "line", x1: drawing.sx, y1: drawing.sy, x2: x, y2: y, stroke: "#374151" });
      }
      setObjects(preview);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { x, y } = getPos(e);

    if (dragging) { setDragging(null); emit(objects); return; }

    if (drawing) {
      const next = objects.filter(o => o.id !== "__preview__");
      let newObj: CanvasObject | null = null;
      if (tool === "rect" && Math.abs(x - drawing.sx) > 5) {
        newObj = { id: uid(), type: "rect", x: Math.min(drawing.sx, x), y: Math.min(drawing.sy, y), w: Math.abs(x - drawing.sx), h: Math.abs(y - drawing.sy), stroke: "#3b82f6", fill: "rgba(59,130,246,0.1)" };
      } else if (tool === "circle" && Math.hypot(x - drawing.sx, y - drawing.sy) > 5) {
        newObj = { id: uid(), type: "circle", x: drawing.sx, y: drawing.sy, r: Math.hypot(x - drawing.sx, y - drawing.sy), stroke: "#3b82f6", fill: "rgba(59,130,246,0.1)" };
      } else if (tool === "line") {
        newObj = { id: uid(), type: "line", x1: drawing.sx, y1: drawing.sy, x2: x, y2: y, stroke: "#374151" };
      }
      const final = newObj ? [...next, newObj] : next;
      setObjects(final); emit(final);
      setDrawing(null);
    }
  };

  const deleteSelected = () => {
    if (!selected) return;
    const next = objects.filter(o => o.id !== selected);
    setObjects(next); setSelected(null); emit(next);
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setBgDataUrl(dataUrl);
      onChange?.({ bgImage: dataUrl, objects });
    };
    reader.readAsDataURL(file);
  };

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current?.toDataURL("image/png") || "",
    getData: () => ({ bgImage: bgDataUrl, objects }),
  }));

  const toolBtn = (t: Tool, label: string, active?: boolean) => (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
        (active !== undefined ? active : JSON.stringify(tool) === JSON.stringify(t))
          ? "bg-[#1a4d8c] text-white border-[#1a4d8c]"
          : "bg-white text-[#374151] border-[#d1d5db] hover:border-[#1a4d8c]"
      }`}
    >
      {label}
    </button>
  );

  const PEST_TYPES = ["Tikus", "Kecoa", "Semut", "Rayap", "Lalat", "Kucing", "Musang", "Kelelawar", "Burung", "Cicak", "Tawon/Lebah", "Kutu SPI"];

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2">
          <label className="cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1 text-xs font-medium text-[#374151] hover:border-[#1a4d8c]">
            📁 Upload Denah
            <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          </label>
          <span className="text-[#d1d5db]">|</span>
          {toolBtn("select", "⊹ Pilih")}
          {toolBtn("rect", "□ Kotak")}
          {toolBtn("circle", "○ Lingkaran")}
          {toolBtn("line", "↗ Garis/Panah")}
          {toolBtn("text", "T Teks")}
          <span className="text-[#d1d5db]">|</span>
          <span className="text-[10px] font-semibold text-[#6b7280]">RISIKO:</span>
          {toolBtn("risk-high", "🔴 Tinggi")}
          {toolBtn("risk-mid", "🟡 Sedang")}
          {toolBtn("risk-low", "🟢 Rendah")}
          <span className="text-[#d1d5db]">|</span>
          <span className="text-[10px] font-semibold text-[#6b7280]">HAMA:</span>
          <select
            className="rounded border border-[#d1d5db] bg-white px-1.5 py-1 text-xs"
            value={typeof tool === "object" && "pest" in tool ? tool.pest : pestInput}
            onChange={e => { setPestInput(e.target.value); setTool({ pest: e.target.value }); }}
          >
            {PEST_TYPES.map(p => <option key={p}>{p}</option>)}
          </select>
          {toolBtn({ pest: pestInput }, `🐛 Tempatkan`, typeof tool === "object" && "pest" in tool)}
          {selected && (
            <>
              <span className="text-[#d1d5db]">|</span>
              <button onClick={deleteSelected} className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">🗑 Hapus</button>
            </>
          )}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-[#d1d5db]" style={{ width, height }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={readOnly ? "cursor-default" : "cursor-crosshair"}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
      {!readOnly && (
        <div className="flex flex-wrap gap-1">
          {[
            { level: "high" as const, label: "🔴 High Risk — Bukti aktif / kondisi kritis" },
            { level: "mid" as const, label: "🟡 Medium Risk — Potensi risiko / kondisi pendukung" },
            { level: "low" as const, label: "🟢 Low Risk — Kondisi terkontrol / monitoring rutin" },
          ].map(r => (
            <span key={r.level} className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: MARKER_COLORS[r.level], color: MARKER_COLORS[r.level] }}>
              {r.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export default FloorPlanCanvas;
