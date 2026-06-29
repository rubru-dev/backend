"use client";
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CanvasObject =
  | { id: string; type: "rect"; x: number; y: number; w: number; h: number; stroke: string; fill: string; fillImageSrc?: string }
  | { id: string; type: "circle"; x: number; y: number; r: number; stroke: string; fill: string; fillImageSrc?: string }
  | { id: string; type: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string }
  | { id: string; type: "text"; x: number; y: number; text: string; color: string; fontSize: number }
  | { id: string; type: "marker"; x: number; y: number; level: "high" | "mid" | "low"; num: number }
  | { id: string; type: "pest"; x: number; y: number; pestType: string; num: number }
  | { id: string; type: "image"; x: number; y: number; w: number; h: number; src: string }
  | { id: string; type: "freedraw"; points: { x: number; y: number }[]; color: string; lineWidth: number };

export type CanvasData = {
  bgImage?: string; // legacy only, migrated to image objects on load
  objects: CanvasObject[];
};

export type FloorPlanCanvasHandle = {
  toDataURL: () => string;
  getData: () => CanvasData;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const MARKER_COLORS = { high: "#ef4444", mid: "#eab308", low: "#22c55e" };
const PEST_COLORS: Record<string, string> = {
  Tikus: "#7c3aed", Kecoa: "#92400e", Semut: "#111827", Rayap: "#b45309",
  Lalat: "#6b7280", Kucing: "#ca8a04", Musang: "#7e22ce", Kelelawar: "#1e3a5f",
  Burung: "#0369a1", Cicak: "#15803d", "Tawon/Lebah": "#a16207", "Kutu SPI": "#9f1239",
  "Rodent/Tikus": "#7c3aed", "Termite/Rayap": "#b45309",
};
const PEST_TYPES = ["Tikus", "Kecoa", "Semut", "Rayap", "Lalat", "Kucing", "Musang", "Kelelawar", "Burung", "Cicak", "Tawon/Lebah", "Kutu SPI"];
const HANDLE_R = 6;
type Handle = "NW" | "N" | "NE" | "E" | "SE" | "S" | "SW" | "W";
type Tool = "select" | "rect" | "circle" | "line" | "text" | "freedraw" | { pest: string } | "risk-high" | "risk-mid" | "risk-low";

function uid() { return Math.random().toString(36).slice(2, 9); }

function getHandles(obj: CanvasObject): { handle: Handle; x: number; y: number }[] {
  if (obj.type === "rect" || obj.type === "image") {
    const { x, y, w, h } = obj;
    return [
      { handle: "NW", x, y }, { handle: "N", x: x + w / 2, y }, { handle: "NE", x: x + w, y },
      { handle: "E", x: x + w, y: y + h / 2 }, { handle: "SE", x: x + w, y: y + h },
      { handle: "S", x: x + w / 2, y: y + h }, { handle: "SW", x, y: y + h }, { handle: "W", x, y: y + h / 2 },
    ];
  }
  return [];
}

function hitHandle(handles: { handle: Handle; x: number; y: number }[], mx: number, my: number): Handle | null {
  for (const h of handles) {
    if (Math.abs(mx - h.x) <= HANDLE_R + 2 && Math.abs(my - h.y) <= HANDLE_R + 2) return h.handle;
  }
  return null;
}

function applyResize(obj: CanvasObject, handle: Handle, dx: number, dy: number): CanvasObject {
  if (obj.type !== "rect" && obj.type !== "image") return obj;
  let { x, y, w, h } = obj;
  if (handle.includes("N")) { y += dy; h -= dy; }
  if (handle.includes("S")) { h += dy; }
  if (handle.includes("W")) { x += dx; w -= dx; }
  if (handle.includes("E")) { w += dx; }
  if (w < 20) { if (handle.includes("W")) x = obj.x + obj.w - 20; w = 20; }
  if (h < 20) { if (handle.includes("N")) y = obj.y + obj.h - 20; h = 20; }
  return { ...obj, x, y, w, h };
}

function handleCursor(handle: Handle): string {
  if (handle === "NW" || handle === "SE") return "nw-resize";
  if (handle === "NE" || handle === "SW") return "ne-resize";
  if (handle === "N" || handle === "S") return "ns-resize";
  return "ew-resize";
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  initialData?: CanvasData | null;
  onChange?: (data: CanvasData) => void;
  width?: number;
  height?: number;
  readOnly?: boolean;
  showRiskMarkers?: boolean;
}

const FloorPlanCanvas = forwardRef<FloorPlanCanvasHandle, Props>(function FloorPlanCanvas(
  { initialData, onChange, width = 700, height = 420, readOnly = false, showRiskMarkers = false },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const markerCountRef = useRef(0);
  const pestCountRef = useRef(0);
  const liveFreedrawRef = useRef<{ x: number; y: number }[]>([]);

  // Migrate legacy bgImage to image object
  const migrateData = useCallback((d?: CanvasData | null): CanvasObject[] => {
    if (!d) return [];
    const objs = d.objects || [];
    if (d.bgImage && !objs.some(o => o.type === "image")) {
      const imgObj: CanvasObject = { id: uid(), type: "image", x: 0, y: 0, w: width, h: height, src: d.bgImage };
      return [imgObj, ...objs];
    }
    return objs;
  }, [width, height]);

  const [objects, setObjects] = useState<CanvasObject[]>(() => migrateData(initialData));
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState("crosshair");
  const [activeColor, setActiveColor] = useState("#ef4444");
  const [activeFill, setActiveFill] = useState("rgba(239,68,68,0.15)");
  const [activeLineWidth, setActiveLineWidth] = useState(3);
  const [pestInput, setPestInput] = useState("Tikus");
  const [imgLoadTick, setImgLoadTick] = useState(0);

  // Drag state
  type DragState =
    | { mode: "move"; id: string; ox: number; oy: number }
    | { mode: "resize"; id: string; handle: Handle; prevMx: number; prevMy: number }
    | { mode: "draw"; sx: number; sy: number }
    | null;
  const dragRef = useRef<DragState>(null);

  // Load images
  useEffect(() => {
    for (const obj of objects) {
      let src: string | undefined;
      if (obj.type === "image") src = obj.src;
      else if (obj.type === "rect" || obj.type === "circle") src = obj.fillImageSrc;
      if (src && !imgCache.current.has(src)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { imgCache.current.set(src!, img); setImgLoadTick(t => t + 1); };
        img.src = src;
      }
    }
  }, [objects]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    // BG
    ctx.fillStyle = "#f8f9fb";
    ctx.fillRect(0, 0, width, height);

    // Grid
    const hasImageBg = objects.some(o => o.type === "image");
    if (!hasImageBg) {
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y <= height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    }

    // Sort: images first (background)
    const sorted = [...objects].sort((a, b) => {
      const aImg = a.type === "image" ? -1 : 0;
      const bImg = b.type === "image" ? -1 : 0;
      return aImg - bImg;
    });

    for (const obj of sorted) {
      const isSel = obj.id === selected;
      ctx.save();
      if (isSel) { ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 5; }

      if (obj.type === "image") {
        const img = imgCache.current.get(obj.src);
        if (img) ctx.drawImage(img, obj.x, obj.y, obj.w, obj.h);
        else {
          ctx.fillStyle = "#e5e7eb"; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
          ctx.fillStyle = "#9ca3af"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("Loading...", obj.x + obj.w / 2, obj.y + obj.h / 2);
        }

      } else if (obj.type === "rect") {
        if (obj.fillImageSrc) {
          const fImg = imgCache.current.get(obj.fillImageSrc);
          if (fImg) { ctx.save(); ctx.beginPath(); ctx.rect(obj.x, obj.y, obj.w, obj.h); ctx.clip(); ctx.drawImage(fImg, obj.x, obj.y, obj.w, obj.h); ctx.restore(); }
          else { ctx.fillStyle = obj.fill; ctx.fillRect(obj.x, obj.y, obj.w, obj.h); }
        } else {
          ctx.fillStyle = obj.fill; ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        }
        ctx.strokeStyle = obj.stroke; ctx.lineWidth = 2; ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

      } else if (obj.type === "circle") {
        ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
        if (obj.fillImageSrc) {
          const fImg = imgCache.current.get(obj.fillImageSrc);
          if (fImg) { ctx.save(); ctx.clip(); ctx.drawImage(fImg, obj.x - obj.r, obj.y - obj.r, obj.r * 2, obj.r * 2); ctx.restore(); }
          else { ctx.fillStyle = obj.fill; ctx.fill(); }
        } else { ctx.fillStyle = obj.fill; ctx.fill(); }
        ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
        ctx.strokeStyle = obj.stroke; ctx.lineWidth = 2; ctx.stroke();

      } else if (obj.type === "line") {
        ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2);
        ctx.strokeStyle = obj.stroke; ctx.lineWidth = 2.5; ctx.stroke();
        const angle = Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1);
        ctx.beginPath();
        ctx.moveTo(obj.x2, obj.y2);
        ctx.lineTo(obj.x2 - 12 * Math.cos(angle - 0.5), obj.y2 - 12 * Math.sin(angle - 0.5));
        ctx.lineTo(obj.x2 - 12 * Math.cos(angle + 0.5), obj.y2 - 12 * Math.sin(angle + 0.5));
        ctx.closePath(); ctx.fillStyle = obj.stroke; ctx.fill();

      } else if (obj.type === "text") {
        ctx.fillStyle = obj.color; ctx.font = `${obj.fontSize || 14}px sans-serif`; ctx.fillText(obj.text, obj.x, obj.y);

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
        ctx.fillText(obj.pestType.slice(0, 3).toUpperCase(), obj.x, obj.y - 3);
        ctx.font = "bold 8px sans-serif";
        ctx.fillText(String(obj.num), obj.x, obj.y + 6);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

      } else if (obj.type === "freedraw") {
        if (obj.points.length > 1) {
          ctx.beginPath(); ctx.moveTo(obj.points[0].x, obj.points[0].y);
          for (const p of obj.points) ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = obj.color; ctx.lineWidth = obj.lineWidth; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
        }
      }

      // Resize handles for selected rect/image
      if (isSel && (obj.type === "rect" || obj.type === "image")) {
        ctx.shadowBlur = 0;
        for (const h of getHandles(obj)) {
          ctx.fillStyle = "#fff"; ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1.5;
          ctx.fillRect(h.x - HANDLE_R, h.y - HANDLE_R, HANDLE_R * 2, HANDLE_R * 2);
          ctx.strokeRect(h.x - HANDLE_R, h.y - HANDLE_R, HANDLE_R * 2, HANDLE_R * 2);
        }
      }
      // Selection outline for circle
      if (isSel && obj.type === "circle") {
        ctx.shadowBlur = 0; ctx.setLineDash([4, 2]); ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // Live freedraw preview
    if (liveFreedrawRef.current.length > 1 && tool === "freedraw") {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(liveFreedrawRef.current[0].x, liveFreedrawRef.current[0].y);
      for (const p of liveFreedrawRef.current) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = activeColor; ctx.lineWidth = activeLineWidth; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
    }
  }, [objects, selected, width, height, imgLoadTick, tool, activeColor, activeLineWidth]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const hitTest = (x: number, y: number): string | null => {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (obj.type === "rect" || obj.type === "image") {
        if (x >= obj.x && x <= obj.x + obj.w && y >= obj.y && y <= obj.y + obj.h) return obj.id;
      } else if (obj.type === "circle" || obj.type === "marker" || obj.type === "pest") {
        const r = obj.type === "circle" ? obj.r : obj.type === "marker" ? 14 : 16;
        if (Math.hypot(x - obj.x, y - obj.y) <= r) return obj.id;
      } else if (obj.type === "text") {
        if (x >= obj.x && x <= obj.x + 100 && y >= obj.y - 16 && y <= obj.y + 4) return obj.id;
      } else if (obj.type === "freedraw") {
        for (const p of obj.points) { if (Math.hypot(x - p.x, y - p.y) <= 8) return obj.id; }
      }
    }
    return null;
  };

  const emit = useCallback((objs: CanvasObject[]) => {
    onChange?.({ objects: objs });
  }, [onChange]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { x, y } = getPos(e);

    if (tool === "select") {
      // Check resize handles first
      if (selected) {
        const selObj = objects.find(o => o.id === selected);
        if (selObj) {
          const handles = getHandles(selObj);
          const h = hitHandle(handles, x, y);
          if (h) {
            dragRef.current = { mode: "resize", id: selected, handle: h, prevMx: x, prevMy: y };
            return;
          }
        }
      }
      const hit = hitTest(x, y);
      setSelected(hit);
      if (hit) {
        const obj = objects.find(o => o.id === hit)!;
        const ox = obj.type === "rect" || obj.type === "image" ? x - obj.x
          : obj.type === "line" ? x - obj.x1 : x - (obj as any).x;
        const oy = obj.type === "rect" || obj.type === "image" ? y - obj.y
          : obj.type === "line" ? y - obj.y1 : y - (obj as any).y;
        dragRef.current = { mode: "move", id: hit, ox, oy };
      }
      return;
    }

    if (tool === "rect" || tool === "circle" || tool === "line") {
      dragRef.current = { mode: "draw", sx: x, sy: y };
      return;
    }

    if (tool === "freedraw") {
      liveFreedrawRef.current = [{ x, y }];
      return;
    }

    if (tool === "text") {
      const text = prompt("Masukkan teks:");
      if (text) {
        const newObj: CanvasObject = { id: uid(), type: "text", x, y, text, color: activeColor, fontSize: 13 };
        const next = [...objects, newObj]; setObjects(next); emit(next);
      }
      return;
    }

    if (tool === "risk-high" || tool === "risk-mid" || tool === "risk-low") {
      const level = tool.split("-")[1] as "high" | "mid" | "low";
      markerCountRef.current += 1;
      const newObj: CanvasObject = { id: uid(), type: "marker", x, y, level, num: markerCountRef.current };
      const next = [...objects, newObj]; setObjects(next); emit(next);
      return;
    }

    if (typeof tool === "object" && "pest" in tool) {
      pestCountRef.current += 1;
      const newObj: CanvasObject = { id: uid(), type: "pest", x, y, pestType: tool.pest, num: pestCountRef.current };
      const next = [...objects, newObj]; setObjects(next); emit(next);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { x, y } = getPos(e);

    // Update cursor
    if (tool === "select") {
      if (selected) {
        const selObj = objects.find(o => o.id === selected);
        if (selObj) {
          const h = hitHandle(getHandles(selObj), x, y);
          if (h) { setCursor(handleCursor(h)); return; }
        }
      }
      setCursor(hitTest(x, y) ? "move" : "default");
    } else if (tool === "freedraw") {
      setCursor("crosshair");
    } else {
      setCursor("crosshair");
    }

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "move") {
      const next = objects.map(obj => {
        if (obj.id !== drag.id) return obj;
        if (obj.type === "rect" || obj.type === "image") return { ...obj, x: x - drag.ox, y: y - drag.oy };
        if (obj.type === "line") {
          const dx = x - drag.ox - obj.x1, dy = y - drag.oy - obj.y1;
          return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
        }
        return { ...obj, x: x - drag.ox, y: y - drag.oy };
      });
      setObjects(next);

    } else if (drag.mode === "resize") {
      const dx = x - drag.prevMx, dy = y - drag.prevMy;
      dragRef.current = { ...drag, prevMx: x, prevMy: y };
      const next = objects.map(obj => obj.id !== drag.id ? obj : applyResize(obj, drag.handle, dx, dy));
      setObjects(next);

    } else if (drag.mode === "draw") {
      const preview = objects.filter(o => o.id !== "__preview__");
      if (tool === "rect") {
        preview.push({ id: "__preview__", type: "rect", x: Math.min(drag.sx, x), y: Math.min(drag.sy, y), w: Math.abs(x - drag.sx), h: Math.abs(y - drag.sy), stroke: activeColor, fill: activeFill });
      } else if (tool === "circle") {
        preview.push({ id: "__preview__", type: "circle", x: drag.sx, y: drag.sy, r: Math.hypot(x - drag.sx, y - drag.sy), stroke: activeColor, fill: activeFill });
      } else if (tool === "line") {
        preview.push({ id: "__preview__", type: "line", x1: drag.sx, y1: drag.sy, x2: x, y2: y, stroke: activeColor });
      }
      setObjects(preview);

    } else if (tool === "freedraw" && liveFreedrawRef.current.length > 0) {
      liveFreedrawRef.current = [...liveFreedrawRef.current, { x, y }];
      setImgLoadTick(t => t + 1); // force redraw
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const { x, y } = getPos(e);
    const drag = dragRef.current;

    if (drag?.mode === "move") {
      dragRef.current = null; emit(objects); return;
    }
    if (drag?.mode === "resize") {
      dragRef.current = null; emit(objects); return;
    }
    if (drag?.mode === "draw") {
      const next = objects.filter(o => o.id !== "__preview__");
      let newObj: CanvasObject | null = null;
      if (tool === "rect" && Math.abs(x - drag.sx) > 5) {
        newObj = { id: uid(), type: "rect", x: Math.min(drag.sx, x), y: Math.min(drag.sy, y), w: Math.abs(x - drag.sx), h: Math.abs(y - drag.sy), stroke: activeColor, fill: activeFill };
      } else if (tool === "circle" && Math.hypot(x - drag.sx, y - drag.sy) > 5) {
        newObj = { id: uid(), type: "circle", x: drag.sx, y: drag.sy, r: Math.hypot(x - drag.sx, y - drag.sy), stroke: activeColor, fill: activeFill };
      } else if (tool === "line") {
        newObj = { id: uid(), type: "line", x1: drag.sx, y1: drag.sy, x2: x, y2: y, stroke: activeColor };
      }
      const final = newObj ? [...next, newObj] : next;
      setObjects(final); emit(final);
      dragRef.current = null;
    }

    if (tool === "freedraw" && liveFreedrawRef.current.length > 1) {
      const newObj: CanvasObject = { id: uid(), type: "freedraw", points: [...liveFreedrawRef.current], color: activeColor, lineWidth: activeLineWidth };
      const next = [...objects, newObj];
      liveFreedrawRef.current = [];
      setObjects(next); emit(next);
    }
  };

  const deleteSelected = () => {
    if (!selected) return;
    const next = objects.filter(o => o.id !== selected);
    setObjects(next); setSelected(null); emit(next);
  };

  const addImageObject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imgCache.current.set(src, img);
        const scale = Math.min((width * 0.8) / img.width, (height * 0.8) / img.height, 1);
        const w = img.width * scale, h = img.height * scale;
        const x = (width - w) / 2, y = (height - h) / 2;
        const newObj: CanvasObject = { id: uid(), type: "image", x, y, w, h, src };
        const next = [...objects, newObj];
        setObjects(next); emit(next);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const addFillImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      imgCache.current.set(src, (() => { const i = new Image(); i.onload = () => setImgLoadTick(t => t + 1); i.src = src; return i; })());
      const next = objects.map(o => o.id !== selected ? o : { ...o, fillImageSrc: src } as CanvasObject);
      setObjects(next); emit(next);
    };
    reader.readAsDataURL(file);
  };

  const removeFillImage = () => {
    const next = objects.map(o => {
      if (o.id !== selected) return o;
      const copy = { ...o } as any; delete copy.fillImageSrc; return copy as CanvasObject;
    });
    setObjects(next); emit(next);
  };

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current?.toDataURL("image/png") || "",
    getData: () => ({ objects }),
  }));

  const selObj = objects.find(o => o.id === selected);
  const canHaveFill = selObj?.type === "rect" || selObj?.type === "circle";

  const Btn = ({ t, label }: { t: Tool; label: string }) => (
    <button onClick={() => setTool(t)} title={label}
      className={`px-2 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${JSON.stringify(tool) === JSON.stringify(t) ? "bg-[#1a4d8c] text-white border-[#1a4d8c]" : "bg-white text-[#374151] border-[#d1d5db] hover:border-[#1a4d8c]"}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <style>{`@media print { .fpc-toolbar { display: none !important; } }`}</style>

      {!readOnly && (
        <div className="fpc-toolbar flex flex-wrap items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2">
          {/* Upload gambar */}
          <label className="cursor-pointer rounded border border-[#d1d5db] bg-white px-2 py-1 text-xs font-medium text-[#374151] hover:border-[#1a4d8c] whitespace-nowrap">
            🖼 Upload Gambar
            <input type="file" accept="image/*" className="hidden" onChange={addImageObject} />
          </label>

          <span className="text-[#d1d5db]">|</span>

          {/* Tools */}
          <Btn t="select" label="⊹ Pilih" />
          <Btn t="rect" label="□ Kotak" />
          <Btn t="circle" label="○ Lingkaran" />
          <Btn t="line" label="↗ Panah" />
          <Btn t="text" label="T Teks" />
          <Btn t="freedraw" label="✏ Gambar Bebas" />

          <span className="text-[#d1d5db]">|</span>

          {/* Color */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#6b7280]">Warna:</span>
            <input type="color" value={activeColor} onChange={e => setActiveColor(e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-[#d1d5db] p-0.5" title="Warna garis/teks" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#6b7280]">Fill:</span>
            <input type="color" value={activeFill.startsWith("rgba") ? "#3b82f6" : activeFill}
              onChange={e => setActiveFill(e.target.value + "66")}
              className="h-6 w-8 cursor-pointer rounded border border-[#d1d5db] p-0.5" title="Warna isi" />
          </div>
          {tool === "freedraw" && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#6b7280]">Tebal:</span>
              <input type="range" min={1} max={20} value={activeLineWidth} onChange={e => setActiveLineWidth(Number(e.target.value))}
                className="w-16" />
              <span className="text-[10px] text-[#6b7280]">{activeLineWidth}px</span>
            </div>
          )}

          {/* Risk markers (only if showRiskMarkers) */}
          {showRiskMarkers && (
            <>
              <span className="text-[#d1d5db]">|</span>
              <span className="text-[10px] font-semibold text-[#6b7280]">RISIKO:</span>
              <Btn t="risk-high" label="🔴 Tinggi" />
              <Btn t="risk-mid" label="🟡 Sedang" />
              <Btn t="risk-low" label="🟢 Rendah" />
            </>
          )}

          <span className="text-[#d1d5db]">|</span>

          {/* Pest */}
          <span className="text-[10px] font-semibold text-[#6b7280]">HAMA:</span>
          <select className="rounded border border-[#d1d5db] bg-white px-1.5 py-1 text-xs"
            value={typeof tool === "object" && "pest" in tool ? tool.pest : pestInput}
            onChange={e => { setPestInput(e.target.value); setTool({ pest: e.target.value }); }}>
            {PEST_TYPES.map(p => <option key={p}>{p}</option>)}
          </select>
          <button onClick={() => setTool({ pest: pestInput })}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${typeof tool === "object" && "pest" in tool ? "bg-[#1a4d8c] text-white border-[#1a4d8c]" : "bg-white text-[#374151] border-[#d1d5db] hover:border-[#1a4d8c]"}`}>
            🐛 Tempatkan
          </button>

          {/* Selection actions */}
          {selected && (
            <>
              <span className="text-[#d1d5db]">|</span>
              <button onClick={deleteSelected} className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">
                🗑 Hapus
              </button>
              {canHaveFill && (
                <>
                  <label className="cursor-pointer rounded border border-[#1a4d8c] px-2 py-1 text-xs text-[#1a4d8c] hover:bg-[#f0f5ff] whitespace-nowrap">
                    🖼 Isi Gambar
                    <input type="file" accept="image/*" className="hidden" onChange={addFillImage} />
                  </label>
                  {(selObj as any)?.fillImageSrc && (
                    <button onClick={removeFillImage} className="rounded border border-[#d1d5db] px-2 py-1 text-xs text-[#6b7280] hover:bg-[#f3f4f6]">Hapus Fill</button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ width, height, overflow: "hidden", borderRadius: 8, border: "1px solid #d1d5db" }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ cursor, display: "block" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { dragRef.current = null; liveFreedrawRef.current = []; }}
        />
      </div>
    </div>
  );
});

export default FloorPlanCanvas;
