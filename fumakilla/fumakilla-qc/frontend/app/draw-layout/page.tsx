"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Arrow as KArrow,
  Ellipse as KEllipse,
  Image as KImage,
  Layer,
  Line as KLine,
  Rect as KRect,
  Shape as KShape,
  Stage,
  Text as KText,
  Transformer,
} from "react-konva";
import type Konva from "konva";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolType = "select" | "rect" | "circle" | "line" | "arrow" | "freehand" | "text" | "eraser" | "door";

type BaseShape = { id: string; name: string; visible: boolean; locked: boolean; opacity: number };

type RectShape   = BaseShape & { type: "rect";     x: number; y: number; width: number; height: number; fill: string; stroke: string; strokeWidth: number; cornerRadius: number; rotation: number; imageSrc?: string };
type EllipseShape= BaseShape & { type: "circle";   x: number; y: number; radiusX: number; radiusY: number; fill: string; stroke: string; strokeWidth: number; rotation: number; imageSrc?: string };
type LineShape   = BaseShape & { type: "line";     points: number[]; stroke: string; strokeWidth: number; dash: number[] };
type ArrowShape  = BaseShape & { type: "arrow";    points: number[]; stroke: string; strokeWidth: number; fill: string };
type FreeShape   = BaseShape & { type: "freehand"; points: number[]; stroke: string; strokeWidth: number };
type TextShape   = BaseShape & { type: "text";     x: number; y: number; text: string; fill: string; fontSize: number; fontFamily: string; rotation: number; width: number };
type ImageShape  = BaseShape & { type: "image";    x: number; y: number; width: number; height: number; src: string; rotation: number };
type PestShape   = BaseShape & { type: "pest";     x: number; y: number; pestType: string; count: number; size: number; rotation: number };
type DoorShape   = BaseShape & { type: "door";     x: number; y: number; width: number; rotation: number; flip: boolean; stroke: string; strokeWidth: number };

type DrawShape = RectShape | EllipseShape | LineShape | ArrowShape | FreeShape | TextShape | ImageShape | PestShape | DoorShape;

// ─── Image Node ───────────────────────────────────────────────────────────────

function ImgNode({ shape, ...rest }: { shape: ImageShape; [k: string]: unknown }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = shape.src;
  }, [shape.src]);
  if (!img) return null;
  return (
    <KImage
      image={img}
      id={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rotation={shape.rotation}
      opacity={shape.opacity}
      visible={shape.visible}
      {...rest}
    />
  );
}

// ─── Image fill nodes ─────────────────────────────────────────────────────────

function RectFillNode({ shape, ...rest }: { shape: RectShape; [k: string]: unknown }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!shape.imageSrc) return;
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = shape.imageSrc;
  }, [shape.imageSrc]);

  if (!img) {
    return <KRect id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} cornerRadius={shape.cornerRadius} rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible} {...rest} />;
  }
  return (
    <KRect
      id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height}
      stroke={shape.stroke} strokeWidth={shape.strokeWidth} cornerRadius={shape.cornerRadius}
      rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible}
      fillPriority="pattern"
      fillPatternImage={img}
      fillPatternScaleX={shape.width / img.width}
      fillPatternScaleY={shape.height / img.height}
      {...rest}
    />
  );
}

function EllipseFillNode({ shape, ...rest }: { shape: EllipseShape; [k: string]: unknown }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!shape.imageSrc) return;
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = shape.imageSrc;
  }, [shape.imageSrc]);

  if (!img) {
    return <KEllipse id={shape.id} x={shape.x} y={shape.y} radiusX={shape.radiusX} radiusY={shape.radiusY} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible} {...rest} />;
  }
  return (
    <KEllipse
      id={shape.id} x={shape.x} y={shape.y} radiusX={shape.radiusX} radiusY={shape.radiusY}
      stroke={shape.stroke} strokeWidth={shape.strokeWidth}
      rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible}
      fillPriority="pattern"
      fillPatternImage={img}
      fillPatternX={-shape.radiusX}
      fillPatternY={-shape.radiusY}
      fillPatternScaleX={(shape.radiusX * 2) / img.width}
      fillPatternScaleY={(shape.radiusY * 2) / img.height}
      {...rest}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `s${Date.now()}${++_id}`;
const snap = (v: number, g: number, on: boolean) => (on ? Math.round(v / g) * g : v);

function stageXY(stage: Konva.Stage) {
  const p = stage.getPointerPosition()!;
  return {
    x: (p.x - stage.x()) / stage.scaleX(),
    y: (p.y - stage.y()) / stage.scaleY(),
  };
}

const ICONS: Record<string, string> = { rect: "▭", circle: "○", line: "╱", arrow: "→", freehand: "✏", text: "T", image: "🖼", pest: "🐀", door: "🚪" };

const PEST_EMOJI: Record<string, string> = {
  Tikus: "🐀", Kecoa: "🪳", Semut: "🐜", Rayap: "🪲",
  Lalat: "🪰", Kucing: "🐱", Musang: "🦝", Kelelawar: "🦇",
  Burung: "🐦", Cicak: "🦎", "Tawon/Lebah": "🐝", "Kutu/Tungau": "🕷",
};
const PEST_COLORS: Record<string, string> = {
  Tikus: "#7c3aed", Kecoa: "#92400e", Semut: "#111827", Rayap: "#b45309",
  Lalat: "#6b7280", Kucing: "#ca8a04", Musang: "#7e22ce", Kelelawar: "#1e3a5f",
  Burung: "#0369a1", Cicak: "#15803d", "Tawon/Lebah": "#a16207", "Kutu/Tungau": "#9f1239",
};
const PEST_TYPES = ["Tikus", "Kecoa", "Semut", "Rayap", "Lalat", "Kucing", "Musang", "Kelelawar", "Burung", "Cicak", "Tawon/Lebah", "Kutu/Tungau"];

const CANVAS_W = 4800;
const CANVAS_H = 3600;

// ─── Toolbar Btn ──────────────────────────────────────────────────────────────

function Btn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        height: 30, minWidth: 30, padding: "0 7px", borderRadius: 5, flexShrink: 0,
        background: active ? "#3b82f6" : "rgba(255,255,255,0.1)",
        color: "#fff", border: "none", cursor: "pointer",
        fontSize: 13, fontWeight: active ? 700 : 400,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.18)", margin: "0 3px", flexShrink: 0 }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DrawLayoutPage() {
  const stageRef    = useRef<Konva.Stage>(null);
  const trRef       = useRef<Konva.Transformer>(null);
  const containerRef= useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const bgFileRef   = useRef<HTMLInputElement>(null);
  const fillImgRef  = useRef<HTMLInputElement>(null);

  // mount guard (Konva needs window)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // container size
  const [size, setSize] = useState({ w: 1200, h: 700 });
  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // stage transform
  const [scale, setScale]   = useState(1);
  const [stagePos, setStagePos] = useState({ x: 40, y: 40 });
  const isPanning   = useRef(false);
  const lastPan     = useRef({ x: 0, y: 0 });

  // initial fit
  const fitted = useRef(false);
  useEffect(() => {
    if (size.w > 200 && !fitted.current) {
      fitted.current = true;
      const s = Math.min(size.w / CANVAS_W, size.h / CANVAS_H) * 0.9;
      setScale(s);
      setStagePos({ x: (size.w - CANVAS_W * s) / 2, y: (size.h - CANVAS_H * s) / 2 });
    }
  }, [size]);

  // tool & style defaults
  const [tool, setTool]       = useState<ToolType>("select");
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [fill, setFill]       = useState("#ffffff");
  const [stroke, setStroke]   = useState("#1e293b");
  const [strokeW, setStrokeW] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [fSize, setFSize]     = useState(18);
  const [cRadius, setCRadius] = useState(0);

  // grid
  const [showGrid, setShowGrid] = useState(true);
  const [doSnap, setDoSnap]     = useState(true);
  const [gridSize, setGridSize] = useState(20);

  // history via ref (avoids stale closure issues)
  const hist    = useRef<DrawShape[][]>([[]]);
  const histIdx = useRef(0);
  const [histUI, setHistUI] = useState({ len: 1, idx: 0 });

  // shapes & selection
  const [shapes, setShapes]         = useState<DrawShape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // drawing state
  const [drawing, setDrawing]   = useState(false);
  const [preview, setPreview]   = useState<DrawShape | null>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const freePoints= useRef<number[]>([]);

  // inline text edit
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [taStyle, setTaStyle]         = useState<React.CSSProperties>({});

  // background
  const [bgImg, setBgImg]     = useState<HTMLImageElement | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.3);

  // clipboard
  const clipboard = useRef<DrawShape[]>([]);

  // layers panel
  const [showLayers, setShowLayers] = useState(true);
  const [showPests, setShowPests]   = useState(true);

  // door tool state
  const [doorFlip, setDoorFlip] = useState(false);

  // ─── History ─────────────────────────────────────────────────────────────

  const pushHist = useCallback((s: DrawShape[]) => {
    const stack = hist.current.slice(0, histIdx.current + 1);
    stack.push([...s]);
    if (stack.length > 60) stack.shift();
    hist.current = stack;
    histIdx.current = stack.length - 1;
    setHistUI({ len: stack.length, idx: histIdx.current });
    setShapes(s);
  }, []);

  const undo = useCallback(() => {
    if (histIdx.current <= 0) return;
    histIdx.current--;
    setHistUI(u => ({ ...u, idx: histIdx.current }));
    setShapes([...hist.current[histIdx.current]]);
    setSelectedIds([]);
  }, []);

  const redo = useCallback(() => {
    if (histIdx.current >= hist.current.length - 1) return;
    histIdx.current++;
    setHistUI(u => ({ ...u, idx: histIdx.current }));
    setShapes([...hist.current[histIdx.current]]);
    setSelectedIds([]);
  }, []);

  // ─── Transformer sync ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    if (selectedIds.length > 0) {
      const nodes = selectedIds.map(id => stage.findOne(`#${id}`)).filter(Boolean) as Konva.Node[];
      trRef.current.nodes(nodes);
    } else {
      trRef.current.nodes([]);
    }
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds, shapes]);

  // ─── Keyboard ────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z") { e.preventDefault(); undo(); return; }
      if (ctrl && e.key === "y") { e.preventDefault(); redo(); return; }
      if (ctrl && e.shiftKey && e.key === "Z") { e.preventDefault(); redo(); return; }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        pushHist(shapes.filter(s => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        return;
      }
      if (ctrl && e.key === "a") { e.preventDefault(); setSelectedIds(shapes.map(s => s.id)); return; }
      if (ctrl && e.key === "c") { clipboard.current = shapes.filter(s => selectedIds.includes(s.id)); return; }
      if (ctrl && e.key === "v" && clipboard.current.length > 0) {
        e.preventDefault();
        const pasted = clipboard.current.map(s => {
          const c = { ...s, id: uid(), name: s.name + " (copy)" } as DrawShape;
          if ("x" in c) (c as RectShape).x += 20;
          if ("y" in c) (c as RectShape).y += 20;
          return c;
        });
        pushHist([...shapes, ...pasted]);
        setSelectedIds(pasted.map(s => s.id));
        return;
      }
      if (ctrl && e.key === "d") {
        e.preventDefault();
        const duped = shapes.filter(s => selectedIds.includes(s.id)).map(s => {
          const c = { ...s, id: uid(), name: s.name + " (copy)" } as DrawShape;
          if ("x" in c) (c as RectShape).x += 20;
          if ("y" in c) (c as RectShape).y += 20;
          return c;
        });
        pushHist([...shapes, ...duped]);
        setSelectedIds(duped.map(s => s.id));
        return;
      }

      if (!ctrl) {
        if (e.key === "v" || e.key === "Escape") setTool("select");
        else if (e.key === "r") setTool("rect");
        else if (e.key === "c") setTool("circle");
        else if (e.key === "l") setTool("line");
        else if (e.key === "a") setTool("arrow");
        else if (e.key === "p") setTool("freehand");
        else if (e.key === "t") setTool("text");
        else if (e.key === "e") setTool("eraser");
        else if (e.key === "d") setTool("door");
        else if (e.key === "f" && tool === "door") setDoorFlip(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, selectedIds, shapes, undo, redo, pushHist]);

  // ─── Stage events ─────────────────────────────────────────────────────────

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current!;

    // Middle mouse or Alt+drag = pan
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
      isPanning.current = true;
      lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (tool === "select") {
      if (e.target === stage) setSelectedIds([]);
      return;
    }
    if (tool === "eraser") {
      if (e.target !== stage) {
        const id = e.target.id();
        if (id) { pushHist(shapes.filter(s => s.id !== id)); }
      }
      return;
    }
    if (tool === "text") return; // handled in onClick

    const cp = stageXY(stage);
    const x = snap(cp.x, gridSize, doSnap);
    const y = snap(cp.y, gridSize, doSnap);
    drawStart.current = { x, y };
    setDrawing(true);

    if (tool === "freehand") {
      freePoints.current = [x, y];
      setPreview({ id: "_pre", name: "Freehand", type: "freehand", points: [x, y], stroke, strokeWidth: strokeW, visible: true, locked: false, opacity } as FreeShape);
    }
    if (tool === "door") {
      setPreview({ id: "_pre", name: "Pintu", type: "door", x, y, width: 0, rotation: 0, flip: doorFlip, stroke, strokeWidth: strokeW, visible: true, locked: false, opacity } as DoorShape);
    }
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) {
      const dx = e.evt.clientX - lastPan.current.x;
      const dy = e.evt.clientY - lastPan.current.y;
      setStagePos(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    if (!drawing || !drawStart.current) return;

    const stage = stageRef.current!;
    const cp = stageXY(stage);
    const x = snap(cp.x, gridSize, doSnap);
    const y = snap(cp.y, gridSize, doSnap);
    const { x: sx, y: sy } = drawStart.current;

    if (tool === "freehand") {
      freePoints.current = [...freePoints.current, x, y];
      setPreview(p => p ? { ...p, points: freePoints.current } as FreeShape : null);
      return;
    }
    if (tool === "rect") {
      setPreview({ id: "_pre", name: "Rectangle", type: "rect", x: Math.min(sx, x), y: Math.min(sy, y), width: Math.abs(x - sx), height: Math.abs(y - sy), fill, stroke, strokeWidth: strokeW, cornerRadius: cRadius, rotation: 0, visible: true, locked: false, opacity } as RectShape);
    } else if (tool === "circle") {
      setPreview({ id: "_pre", name: "Ellipse", type: "circle", x: (sx + x) / 2, y: (sy + y) / 2, radiusX: Math.abs(x - sx) / 2, radiusY: Math.abs(y - sy) / 2, fill, stroke, strokeWidth: strokeW, rotation: 0, visible: true, locked: false, opacity } as EllipseShape);
    } else if (tool === "line") {
      setPreview({ id: "_pre", name: "Line", type: "line", points: [sx, sy, x, y], stroke, strokeWidth: strokeW, dash: [], visible: true, locked: false, opacity } as LineShape);
    } else if (tool === "arrow") {
      setPreview({ id: "_pre", name: "Arrow", type: "arrow", points: [sx, sy, x, y], stroke, strokeWidth: strokeW, fill: stroke, visible: true, locked: false, opacity } as ArrowShape);
    } else if (tool === "door") {
      const dx = x - sx; const dy = y - sy;
      const w = Math.sqrt(dx * dx + dy * dy);
      const rot = Math.atan2(dy, dx) * 180 / Math.PI;
      setPreview(p => p ? { ...p, width: w, rotation: rot } as DoorShape : null);
    }
  };

  const onMouseUp = () => {
    if (isPanning.current) { isPanning.current = false; return; }
    if (!drawing) return;
    setDrawing(false);

    if (preview && preview.id === "_pre") {
      // Skip accidental tiny shapes
      const tiny =
        (preview.type === "rect"   && (preview as RectShape).width < 4  && (preview as RectShape).height < 4) ||
        (preview.type === "circle" && (preview as EllipseShape).radiusX < 2) ||
        ((preview.type === "line" || preview.type === "arrow") && (preview as LineShape).points.length < 4) ||
        (preview.type === "door"   && (preview as DoorShape).width < 10);

      if (!tiny) {
        const newShape = { ...preview, id: uid() };
        const newShapes = [...shapes, newShape];
        pushHist(newShapes);
        setSelectedIds([newShape.id]);
        if (tool !== "freehand") setTool("select");
      }
    }

    setPreview(null);
    drawStart.current = null;
    freePoints.current = [];
  };

  const onClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current!;
    if (tool === "text" && e.target === stage) {
      const cp = stageXY(stage);
      const x = snap(cp.x, gridSize, doSnap);
      const y = snap(cp.y, gridSize, doSnap);
      const s: TextShape = { id: uid(), name: "Text", type: "text", x, y, text: "Ketik di sini", fill, fontSize: fSize, fontFamily: "Arial", rotation: 0, width: 220, visible: true, locked: false, opacity };
      pushHist([...shapes, s]);
      setSelectedIds([s.id]);
      setTool("select");
    }
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const old = scale;
    const ptr = stage.getPointerPosition()!;
    const origin = { x: (ptr.x - stage.x()) / old, y: (ptr.y - stage.y()) / old };
    const ns = e.evt.deltaY < 0 ? Math.min(old * 1.12, 12) : Math.max(old / 1.12, 0.04);
    setScale(ns);
    setStagePos({ x: ptr.x - origin.x * ns, y: ptr.y - origin.y * ns });
  };

  // ─── Shape interactions ───────────────────────────────────────────────────

  const onShapeClick = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    if (tool === "eraser") {
      pushHist(shapes.filter(s => s.id !== id));
      return;
    }
    if (tool !== "select") return;
    e.cancelBubble = true;
    if (e.evt.shiftKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  };

  const onTextDblClick = (e: Konva.KonvaEventObject<MouseEvent>, shape: TextShape) => {
    e.cancelBubble = true;
    const stage = stageRef.current!;
    const node = stage.findOne(`#${shape.id}`) as Konva.Text;
    if (!node) return;
    const absPos = node.absolutePosition();
    const absScale = node.getAbsoluteScale();
    const box = stage.container().getBoundingClientRect();
    setTaStyle({
      position: "fixed",
      top: box.top + absPos.y,
      left: box.left + absPos.x,
      width: Math.max(60, shape.width * absScale.x),
      minHeight: shape.fontSize * absScale.y * 1.4,
      fontSize: shape.fontSize * absScale.y,
      lineHeight: "1.4",
      fontFamily: shape.fontFamily,
      color: shape.fill,
      border: "2px solid #3b82f6",
      padding: "2px 4px",
      background: "rgba(255,255,255,0.95)",
      resize: "none",
      outline: "none",
      zIndex: 9999,
      transform: `rotate(${shape.rotation}deg)`,
      transformOrigin: "top left",
      borderRadius: 3,
    });
    setEditingId(shape.id);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const commitText = (id: string, val: string) => {
    pushHist(shapes.map(s => s.id === id ? { ...s, text: val } as TextShape : s));
    setEditingId(null);
  };

  const onTransformEnd = (e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target as Konva.Node;
    const newShapes = shapes.map(s => {
      if (s.id !== id) return s;
      if (s.type === "rect")   return { ...s, x: node.x(), y: node.y(), width:  Math.max(4, node.width() * node.scaleX()), height: Math.max(4, node.height() * node.scaleY()), rotation: node.rotation() } as RectShape;
      if (s.type === "circle") return { ...s, x: node.x(), y: node.y(), radiusX: Math.max(2, (node as Konva.Ellipse).radiusX() * node.scaleX()), radiusY: Math.max(2, (node as Konva.Ellipse).radiusY() * node.scaleY()), rotation: node.rotation() } as EllipseShape;
      if (s.type === "text")   return { ...s, x: node.x(), y: node.y(), width: Math.max(20, node.width() * node.scaleX()), rotation: node.rotation() } as TextShape;
      if (s.type === "image")  return { ...s, x: node.x(), y: node.y(), width: Math.max(8, node.width() * node.scaleX()), height: Math.max(8, node.height() * node.scaleY()), rotation: node.rotation() } as ImageShape;
      if (s.type === "pest")   return { ...s, x: node.x(), y: node.y(), size: Math.max(16, s.size * node.scaleX()), rotation: node.rotation() } as PestShape;
      if (s.type === "door")   return { ...s, x: node.x(), y: node.y(), width: Math.max(20, s.width * node.scaleX()), rotation: node.rotation() } as DoorShape;
      return s;
    });
    node.scaleX(1); node.scaleY(1);
    pushHist(newShapes);
  };

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const newShapes = shapes.map(s => {
      if (s.id !== id) return s;
      if (s.type === "line" || s.type === "arrow" || s.type === "freehand") {
        const dx = e.target.x(); const dy = e.target.y();
        e.target.position({ x: 0, y: 0 });
        const pts = (s as LineShape).points;
        const np: number[] = [];
        for (let i = 0; i < pts.length; i += 2) np.push(pts[i] + dx, pts[i + 1] + dy);
        return { ...s, points: np };
      }
      return { ...s, x: e.target.x(), y: e.target.y() };
    });
    pushHist(newShapes);
  };

  // ─── Import / Export ─────────────────────────────────────────────────────

  const exportPNG = (withGrid: boolean) => {
    const stage = stageRef.current!;
    const gridLayer = stage.getLayers()[0];
    if (!withGrid) gridLayer.hide();
    const url = stage.toDataURL({ pixelRatio: 2 });
    if (!withGrid) gridLayer.show();
    const a = document.createElement("a");
    a.download = `layout-${Date.now()}.png`;
    a.href = url;
    a.click();
  };

  const saveLocal = () => {
    localStorage.setItem("dl_save", JSON.stringify({ shapes, gridSize }));
  };

  const loadLocal = () => {
    try {
      const raw = localStorage.getItem("dl_save");
      if (!raw) return;
      const d = JSON.parse(raw);
      pushHist(d.shapes ?? []);
      if (d.gridSize) setGridSize(d.gridSize);
      setSelectedIds([]);
    } catch {}
  };

  const importBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const i = new window.Image();
      i.onload = () => setBgImg(i);
      i.src = ev.target!.result as string;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const importImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target!.result as string;
      const i = new window.Image();
      i.onload = () => {
        const maxW = 500;
        const r = i.width > maxW ? maxW / i.width : 1;
        const s: ImageShape = { id: uid(), name: f.name, type: "image", x: 100, y: 100, width: i.width * r, height: i.height * r, src, rotation: 0, visible: true, locked: false, opacity: 1 };
        pushHist([...shapes, s]);
        setSelectedIds([s.id]);
      };
      i.src = src;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  // Assign image as fill to selected rect/ellipse
  const importFillImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || selectedIds.length === 0) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target!.result as string;
      pushHist(shapes.map(s =>
        selectedIds.includes(s.id) && (s.type === "rect" || s.type === "circle")
          ? { ...s, imageSrc: src } as DrawShape
          : s
      ));
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  // Remove image fill from selected shapes
  const removeFillImg = () => {
    pushHist(shapes.map(s =>
      selectedIds.includes(s.id) && (s.type === "rect" || s.type === "circle")
        ? { ...s, imageSrc: undefined } as DrawShape
        : s
    ));
  };

  // Add pest shape to center of current view
  const addPest = (pestType: string) => {
    const stage = stageRef.current;
    const cx = stage ? (size.w / 2 - stagePos.x) / scale : 400;
    const cy = stage ? (size.h / 2 - stagePos.y) / scale : 300;
    const existing = shapes.filter(s => s.type === "pest" && (s as PestShape).pestType === pestType);
    const s: PestShape = {
      id: uid(), name: pestType, type: "pest",
      x: cx + (existing.length % 5) * 60,
      y: cy + Math.floor(existing.length / 5) * 60,
      pestType, count: 1, size: 40, rotation: 0,
      visible: true, locked: false, opacity: 1,
    };
    pushHist([...shapes, s]);
    setSelectedIds([s.id]);
  };

  const fitView = () => {
    const s = Math.min(size.w / CANVAS_W, size.h / CANVAS_H) * 0.9;
    setScale(s);
    setStagePos({ x: (size.w - CANVAS_W * s) / 2, y: (size.h - CANVAS_H * s) / 2 });
  };

  // ─── Grid lines ───────────────────────────────────────────────────────────

  const gridLines: React.ReactElement[] = [];
  if (showGrid) {
    for (let x = 0; x <= CANVAS_W; x += gridSize) {
      const major = x % (gridSize * 5) === 0;
      gridLines.push(<KLine key={`v${x}`} points={[x, 0, x, CANVAS_H]} stroke={major ? "#94a3b8" : "#cbd5e1"} strokeWidth={major ? 1/scale : 0.5/scale} listening={false} />);
    }
    for (let y = 0; y <= CANVAS_H; y += gridSize) {
      const major = y % (gridSize * 5) === 0;
      gridLines.push(<KLine key={`h${y}`} points={[0, y, CANVAS_W, y]} stroke={major ? "#94a3b8" : "#cbd5e1"} strokeWidth={major ? 1/scale : 0.5/scale} listening={false} />);
    }
  }

  // ─── Shape renderer ───────────────────────────────────────────────────────

  const commonProps = (s: DrawShape) => ({
    id: s.id,
    opacity: s.opacity,
    visible: s.visible,
    draggable: tool === "select" && !s.locked,
    listening: tool === "eraser" ? true : !s.locked,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onShapeClick(e, s.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e, s.id),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => onTransformEnd(e, s.id),
  });

  const renderShape = (s: DrawShape) => {
    if (!s.visible) return null;
    const cp = commonProps(s);
    switch (s.type) {
      case "rect":
        return s.imageSrc
          ? <RectFillNode    key={s.id} shape={s} {...cp} />
          : <KRect           key={s.id} {...cp} x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} cornerRadius={s.cornerRadius} rotation={s.rotation} />;
      case "circle":
        return s.imageSrc
          ? <EllipseFillNode key={s.id} shape={s} {...cp} />
          : <KEllipse        key={s.id} {...cp} x={s.x} y={s.y} radiusX={s.radiusX} radiusY={s.radiusY} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} rotation={s.rotation} />;
      case "line":     return <KLine  key={s.id} {...cp} points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} dash={s.dash} lineCap="round" lineJoin="round" />;
      case "arrow":    return <KArrow key={s.id} {...cp} points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.fill} pointerLength={10} pointerWidth={8} />;
      case "freehand": return <KLine  key={s.id} {...cp} points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" />;
      case "text":     return <KText  key={s.id} {...cp} x={s.x} y={s.y} text={s.text} fill={s.fill} fontSize={s.fontSize} fontFamily={s.fontFamily} rotation={s.rotation} width={s.width} wrap="word" onDblClick={e => onTextDblClick(e, s)} />;
      case "image":    return <ImgNode key={s.id} shape={s} {...cp} />;
      case "pest": {
        const emoji = PEST_EMOJI[s.pestType] ?? "🐀";
        return (
          <KText key={s.id} {...cp}
            x={s.x} y={s.y} rotation={s.rotation}
            text={s.count > 1 ? `${emoji}×${s.count}` : emoji}
            fontSize={s.size}
            offsetX={s.size / 2} offsetY={s.size / 2}
          />
        );
      }
      case "door": {
        return (
          <KShape
            key={s.id} {...cp}
            x={s.x} y={s.y} rotation={s.rotation}
            stroke={s.stroke} strokeWidth={s.strokeWidth}
            fill="transparent"
            width={s.width} height={s.width}
            sceneFunc={(ctx, shape) => {
              const w = s.width;
              const sign = s.flip ? -1 : 1;
              // Door panel line
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(w, 0);
              // Quarter-circle swing arc
              ctx.moveTo(w, 0);
              ctx.arc(0, 0, w, 0, sign * Math.PI / 2, s.flip);
              // End tick (closed position indicator)
              ctx.moveTo(0, sign * w);
              ctx.lineTo(w * 0.08, sign * w);
              ctx.fillStrokeShape(shape);
            }}
            hitFunc={(ctx, shape) => {
              const w = s.width;
              ctx.beginPath();
              ctx.rect(-8, s.flip ? -w - 8 : -8, w + 16, w + 16);
              ctx.closePath();
              ctx.fillStrokeShape(shape);
            }}
          />
        );
      }
      default: return null;
    }
  };

  // preview renderer
  const renderPreview = () => {
    if (!preview) return null;
    const p = preview;
    switch (p.type) {
      case "rect":     return <KRect     x={p.x} y={p.y} width={p.width} height={p.height} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} cornerRadius={cRadius} opacity={0.65} listening={false} />;
      case "circle":   return <KEllipse  x={p.x} y={p.y} radiusX={p.radiusX} radiusY={p.radiusY} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} opacity={0.65} listening={false} />;
      case "line":     return <KLine     points={p.points} stroke={p.stroke} strokeWidth={p.strokeWidth} lineCap="round" opacity={0.65} listening={false} />;
      case "arrow":    return <KArrow    points={p.points} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} pointerLength={10} pointerWidth={8} opacity={0.65} listening={false} />;
      case "freehand": return <KLine     points={p.points} stroke={p.stroke} strokeWidth={p.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" opacity={0.65} listening={false} />;
      case "door": {
        const sign = p.flip ? -1 : 1;
        return (
          <KShape
            x={p.x} y={p.y} rotation={p.rotation}
            stroke={p.stroke} strokeWidth={p.strokeWidth}
            fill="transparent" opacity={0.65} listening={false}
            sceneFunc={(ctx, shape) => {
              const w = p.width;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(w, 0);
              ctx.moveTo(w, 0);
              ctx.arc(0, 0, w, 0, sign * Math.PI / 2, p.flip);
              ctx.moveTo(0, sign * w);
              ctx.lineTo(w * 0.08, sign * w);
              ctx.fillStrokeShape(shape);
            }}
          />
        );
      }
      default: return null;
    }
  };

  // ─── Layers helpers ───────────────────────────────────────────────────────

  const updateSelected = (upd: Partial<DrawShape>) => {
    if (selectedIds.length === 0) return;
    pushHist(shapes.map(s => selectedIds.includes(s.id) ? { ...s, ...upd } as DrawShape : s));
  };

  const toggleVis  = (id: string) => setShapes(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  const toggleLock = (id: string) => setShapes(prev => prev.map(s => s.id === id ? { ...s, locked: !s.locked } : s));
  const delShape   = (id: string) => { pushHist(shapes.filter(s => s.id !== id)); setSelectedIds(p => p.filter(i => i !== id)); };

  const moveLayer = (id: string, dir: -1 | 1) => {
    const i = shapes.findIndex(s => s.id === id);
    if (i < 0) return;
    const ni = i + dir;
    if (ni < 0 || ni >= shapes.length) return;
    const ns = [...shapes];
    [ns[i], ns[ni]] = [ns[ni], ns[i]];
    pushHist(ns);
  };

  const sel1 = selectedIds.length === 1 ? shapes.find(s => s.id === selectedIds[0]) : null;

  // Alat bentuk yang digabung ke dropdown "Bentuk"
  const SHAPE_TOOLS = [
    { id: "rect"     as ToolType, icon: "▭", name: "Persegi",   key: "R" },
    { id: "circle"   as ToolType, icon: "○", name: "Lingkaran", key: "C" },
    { id: "line"     as ToolType, icon: "╱", name: "Garis",     key: "L" },
    { id: "arrow"    as ToolType, icon: "→", name: "Panah",     key: "A" },
    { id: "freehand" as ToolType, icon: "✏", name: "Bebas",     key: "P" },
  ];
  const activeShape = SHAPE_TOOLS.find(s => s.id === tool);
  const isShapeTool = !!activeShape;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!mounted) return <div style={{ height: "calc(100vh - 80px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>Memuat canvas…</div>;

  const TOOLBAR_H = 44;
  const PANEL_W   = showLayers ? 224 : 0;
  const cursor    = isPanning.current ? "grabbing" : tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", overflow: "hidden", userSelect: "none" }}>
      {/* Hidden inputs */}
      <input ref={fileRef}    type="file" accept="image/*" style={{ display: "none" }} onChange={importImg} />
      <input ref={bgFileRef}  type="file" accept="image/*" style={{ display: "none" }} onChange={importBg} />
      <input ref={fillImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={importFillImg} />

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{ minHeight: TOOLBAR_H, background: "#0f172a", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 3, rowGap: 6, padding: "6px 8px", flexShrink: 0 }}>

        {/* Move */}
        <Btn active={tool === "select"} onClick={() => setTool("select")} title="Move — pilih & pindahkan objek (V)">
          ✋ <span style={{ fontSize: 11 }}>Move</span>
        </Btn>

        {/* Bentuk (dropdown) */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Btn active={isShapeTool} onClick={() => setShapeMenuOpen(o => !o)} title="Bentuk — pilih lalu gambar di kanvas">
            <span style={{ fontSize: 13 }}>{activeShape ? activeShape.icon : "◇"}</span>
            <span style={{ fontSize: 11 }}>{activeShape ? activeShape.name : "Bentuk"}</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
          </Btn>
          {shapeMenuOpen && (
            <div
              onMouseLeave={() => setShapeMenuOpen(false)}
              style={{ position: "absolute", top: 34, left: 0, zIndex: 50, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: 4, minWidth: 156, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
              {SHAPE_TOOLS.map(st => (
                <button key={st.id} onClick={() => { setTool(st.id); setShapeMenuOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 8px", borderRadius: 4, border: "none", cursor: "pointer",
                    background: tool === st.id ? "#3b82f6" : "transparent", color: "#e2e8f0", fontSize: 12, textAlign: "left" }}>
                  <span style={{ width: 16, textAlign: "center" }}>{st.icon}</span>
                  <span style={{ flex: 1 }}>{st.name}</span>
                  <span style={{ fontSize: 9, color: tool === st.id ? "#dbeafe" : "#64748b" }}>{st.key}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Teks */}
        <Btn active={tool === "text"} onClick={() => setTool("text")} title="Teks — klik di kanvas lalu ketik (T)">
          <b style={{ fontSize: 13 }}>T</b> <span style={{ fontSize: 11 }}>Teks</span>
        </Btn>

        {/* Pintu */}
        <Btn active={tool === "door"} onClick={() => setTool("door")} title="Pintu — klik-seret untuk menggambar pintu (D)">
          🚪 <span style={{ fontSize: 11 }}>Pintu</span>
        </Btn>

        {/* Hapus (eraser) */}
        <Btn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Hapus — klik objek untuk menghapusnya (E)">
          🧽 <span style={{ fontSize: 11 }}>Hapus</span>
        </Btn>

        <Sep />

        {/* Sisip gambar */}
        <Btn active={false} onClick={() => fileRef.current?.click()} title="Gambar — sisipkan foto/gambar ke kanvas">
          🖼 <span style={{ fontSize: 11 }}>Gambar</span>
        </Btn>
        <Btn active={!!bgImg} onClick={() => bgFileRef.current?.click()} title="Latar — gambar background untuk tracing (di belakang)">
          🗺 <span style={{ fontSize: 11 }}>Latar</span>
        </Btn>
        {bgImg && (
          <>
            <input type="range" min={0} max={1} step={0.05} value={bgOpacity} onChange={e => setBgOpacity(Number(e.target.value))} style={{ width: 52, accentColor: "#3b82f6" }} title="Opasitas latar" />
            <Btn active={false} onClick={() => setBgImg(null)} title="Hapus latar"><span style={{ fontSize: 10, color: "#f87171" }}>✕ Latar</span></Btn>
          </>
        )}

        <Sep />

        {/* Style */}
        <label title="Warna isi" style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Isi</span>
          <input type="color" value={fill} onChange={e => { setFill(e.target.value); updateSelected({ fill: e.target.value } as Partial<DrawShape>); }} style={{ width: 22, height: 22, border: "2px solid #334155", borderRadius: 4, cursor: "pointer", padding: 0 }} />
        </label>
        <label title="Warna garis" style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Garis</span>
          <input type="color" value={stroke} onChange={e => { setStroke(e.target.value); updateSelected({ stroke: e.target.value } as Partial<DrawShape>); }} style={{ width: 22, height: 22, border: "2px solid #334155", borderRadius: 4, cursor: "pointer", padding: 0 }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Tebal</span>
          <input type="range" min={1} max={24} value={strokeW} onChange={e => { const v = Number(e.target.value); setStrokeW(v); updateSelected({ strokeWidth: v } as Partial<DrawShape>); }} style={{ width: 56, accentColor: "#3b82f6" }} />
          <span style={{ fontSize: 10, color: "#64748b", minWidth: 14 }}>{strokeW}</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 3 }} title={sel1 ? "Opasitas objek terpilih" : "Opasitas untuk objek berikutnya"}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Opasitas</span>
          <input type="range" min={0} max={1} step={0.05} value={sel1 ? sel1.opacity : opacity} onChange={e => { const v = Number(e.target.value); setOpacity(v); updateSelected({ opacity: v }); }} style={{ width: 56, accentColor: "#3b82f6" }} />
          <span style={{ fontSize: 10, color: "#64748b", minWidth: 26 }}>{Math.round((sel1 ? sel1.opacity : opacity) * 100)}%</span>
        </label>
        {(tool === "text" || sel1?.type === "text") && (
          <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Font</span>
            <input type="number" min={8} max={200} value={sel1?.type === "text" ? sel1.fontSize : fSize} onChange={e => { const v = Number(e.target.value); setFSize(v); updateSelected({ fontSize: v } as Partial<DrawShape>); }} style={{ width: 40, height: 24, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 11, padding: "0 4px" }} />
          </label>
        )}
        {(tool === "rect" || sel1?.type === "rect") && (
          <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Radius</span>
            <input type="number" min={0} max={200} value={sel1?.type === "rect" ? sel1.cornerRadius : cRadius} onChange={e => { const v = Number(e.target.value); setCRadius(v); updateSelected({ cornerRadius: v } as Partial<DrawShape>); }} style={{ width: 40, height: 24, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 11, padding: "0 4px" }} />
          </label>
        )}
        {/* Door flip control */}
        {(tool === "door" || sel1?.type === "door") && (
          <>
            <Sep />
            <Btn active={doorFlip} onClick={() => {
              setDoorFlip(v => !v);
              if (sel1?.type === "door") updateSelected({ flip: !doorFlip } as Partial<DrawShape>);
            }} title="Balik arah swing pintu (F)">
              <span style={{ fontSize: 11 }}>⇅ Balik</span>
            </Btn>
          </>
        )}
        {/* Image fill inside rect/ellipse */}
        {sel1 && (sel1.type === "rect" || sel1.type === "circle") && (
          <>
            <Sep />
            {!(sel1 as RectShape).imageSrc
              ? <Btn active={false} onClick={() => fillImgRef.current?.click()} title="Isi shape dengan gambar (image fill)"><span style={{ fontSize: 10 }}>🖼 Isi</span></Btn>
              : <Btn active={false} onClick={removeFillImg} title="Hapus gambar dari dalam shape"><span style={{ fontSize: 10, color: "#f87171" }}>✕ Isi</span></Btn>
            }
          </>
        )}
        {/* Pest count input */}
        {sel1?.type === "pest" && (
          <>
            <Sep />
            <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Jumlah</span>
              <input type="number" min={1} max={999} value={sel1.count}
                onChange={e => updateSelected({ count: Number(e.target.value) } as Partial<DrawShape>)}
                style={{ width: 44, height: 24, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 11, padding: "0 4px" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Ukuran</span>
              <input type="number" min={16} max={120} value={sel1.size}
                onChange={e => updateSelected({ size: Number(e.target.value) } as Partial<DrawShape>)}
                style={{ width: 44, height: 24, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 11, padding: "0 4px" }} />
            </label>
          </>
        )}

        {/* Pemisah baris: grup utilitas pindah ke baris kedua biar rapi */}
        <div style={{ flexBasis: "100%", height: 0 }} />

        {/* Z-order */}
        <Btn active={false} onClick={() => { if (!sel1) return; moveLayer(sel1.id, 1); }} title="Bawa ke depan (naik layer)"><span style={{ fontSize: 11 }}>▲</span></Btn>
        <Btn active={false} onClick={() => { if (!sel1) return; moveLayer(sel1.id, -1); }} title="Kirim ke belakang (turun layer)"><span style={{ fontSize: 11 }}>▼</span></Btn>

        <Sep />

        {/* Undo/Redo */}
        <Btn active={false} onClick={undo} title="Undo (Ctrl+Z)"><span style={{ opacity: histUI.idx > 0 ? 1 : 0.3 }}>↩</span></Btn>
        <Btn active={false} onClick={redo} title="Redo (Ctrl+Y)"><span style={{ opacity: histUI.idx < histUI.len - 1 ? 1 : 0.3 }}>↪</span></Btn>

        <Sep />

        {/* Grid & snap */}
        <Btn active={showGrid} onClick={() => setShowGrid(v => !v)} title="Toggle Grid">Grid</Btn>
        <Btn active={doSnap}   onClick={() => setDoSnap(v => !v)}   title="Snap ke grid">Snap</Btn>
        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#64748b" }}>
          <span>Grid</span>
          <input type="number" min={4} max={100} value={gridSize} onChange={e => setGridSize(Number(e.target.value))} style={{ width: 36, height: 24, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 11, padding: "0 4px" }} />
        </label>

        <Sep />

        {/* Zoom */}
        <Btn active={false} onClick={() => setScale(s => Math.min(s * 1.2, 12))} title="Zoom In (+)">+</Btn>
        <span style={{ fontSize: 10, color: "#64748b", minWidth: 38, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
        <Btn active={false} onClick={() => setScale(s => Math.max(s / 1.2, 0.04))} title="Zoom Out (-)">−</Btn>
        <Btn active={false} onClick={fitView} title="Sesuaikan ke layar"><span style={{ fontSize: 11 }}>Fit</span></Btn>

        <Sep />

        {/* Export / Save */}
        <Btn active={false} onClick={() => exportPNG(false)} title="Export PNG (tanpa grid)"><span style={{ fontSize: 11, background: "#2563eb", padding: "1px 6px", borderRadius: 4 }}>↓ PNG</span></Btn>
        <Btn active={false} onClick={() => exportPNG(true)} title="Export PNG (dengan grid)"><span style={{ fontSize: 11 }}>↓+Grid</span></Btn>
        <Btn active={false} onClick={saveLocal} title="Simpan ke browser (localStorage)">💾</Btn>
        <Btn active={false} onClick={loadLocal} title="Muat dari browser (localStorage)">📂</Btn>

        <Sep />

        <Btn active={showLayers} onClick={() => setShowLayers(v => !v)} title="Toggle panel layers"><span style={{ fontSize: 11 }}>Layers</span></Btn>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Canvas */}
        <div ref={containerRef} style={{ flex: 1, overflow: "hidden", cursor, background: "#dde3ec" }}>
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onClick={onClick}
            onWheel={onWheel}
            style={{ display: "block" }}
          >
            {/* Grid + canvas bg */}
            <Layer listening={false}>
              <KRect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#ffffff"
                shadowBlur={24} shadowColor="rgba(0,0,0,0.18)" shadowOffsetX={4} shadowOffsetY={4} shadowEnabled listening={false} />
              {gridLines}
            </Layer>

            {/* Background image */}
            {bgImg && (
              <Layer listening={false}>
                <KImage image={bgImg} x={0} y={0} width={CANVAS_W} height={CANVAS_H} opacity={bgOpacity} />
              </Layer>
            )}

            {/* Shapes */}
            <Layer>
              {shapes.map(renderShape)}
              {renderPreview()}
              <Transformer
                ref={trRef}
                rotateEnabled
                enabledAnchors={["top-left","top-center","top-right","middle-right","bottom-right","bottom-center","bottom-left","middle-left"]}
                boundBoxFunc={(old, box) => (box.width < 5 || box.height < 5 ? old : box)}
              />
            </Layer>
          </Stage>
        </div>

        {/* ── Layers panel ──────────────────────────────────────────────── */}
        {showLayers && (
          <div style={{ width: PANEL_W, background: "#0f172a", color: "#e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid #1e293b", flexShrink: 0 }}>

            {/* ── Hama palette ── */}
            <div style={{ borderBottom: "1px solid #1e293b" }}>
              <button onClick={() => setShowPests(v => !v)}
                style={{ width: "100%", padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                <span>🐀 Hama</span>
                <span>{showPests ? "−" : "+"}</span>
              </button>
              {showPests && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, padding: "4px 6px 8px" }}>
                  {PEST_TYPES.map(pt => (
                    <button key={pt} onClick={() => addPest(pt)} title={`Tambah ${pt} ke canvas`}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "5px 2px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                      <span>{PEST_EMOJI[pt]}</span>
                      <span style={{ fontSize: 8, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{pt}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "8px 10px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>Layers ({shapes.length})</span>
              <button
                onClick={() => { pushHist(shapes.filter(s => !selectedIds.includes(s.id))); setSelectedIds([]); }}
                disabled={selectedIds.length === 0}
                style={{ fontSize: 10, color: selectedIds.length > 0 ? "#f87171" : "#334155", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
              >🗑 Hapus</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {shapes.length === 0 && (
                <p style={{ padding: "20px 12px", fontSize: 11, color: "#334155", textAlign: "center", lineHeight: 1.6 }}>Belum ada objek.<br />Pilih alat dan mulai menggambar!</p>
              )}
              {[...shapes].reverse().map(s => {
                const isSel = selectedIds.includes(s.id);
                return (
                  <div key={s.id} onClick={() => setSelectedIds([s.id])}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid #0a0f1a", background: isSel ? "#1d4ed8" : "transparent", minHeight: 32 }}>
                    <span style={{ fontSize: 13, color: "#475569", width: 16, flexShrink: 0, textAlign: "center" }}>{ICONS[s.type] ?? "◆"}</span>
                    <span style={{ flex: 1, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isSel ? "#fff" : "#cbd5e1" }}>{s.name}</span>
                    <button onClick={e => { e.stopPropagation(); toggleVis(s.id); }} title={s.visible ? "Sembunyikan" : "Tampilkan"}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: s.visible ? "#94a3b8" : "#334155", padding: "1px 2px" }}>{s.visible ? "👁" : "🙈"}</button>
                    <button onClick={e => { e.stopPropagation(); toggleLock(s.id); }} title={s.locked ? "Buka kunci" : "Kunci"}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: s.locked ? "#f59e0b" : "#334155", padding: "1px 2px" }}>{s.locked ? "🔒" : "🔓"}</button>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <button onClick={e => { e.stopPropagation(); moveLayer(s.id, 1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 8, padding: 0, lineHeight: 1.2 }}>▲</button>
                      <button onClick={e => { e.stopPropagation(); moveLayer(s.id, -1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 8, padding: 0, lineHeight: 1.2 }}>▼</button>
                    </div>
                    <button onClick={e => { e.stopPropagation(); delShape(s.id); }} title="Hapus"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#dc2626", padding: "1px 2px" }}>✕</button>
                  </div>
                );
              })}
            </div>

            {/* Properties of selected shape */}
            {sel1 && (
              <div style={{ borderTop: "1px solid #1e293b", padding: "8px 10px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Properties</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                    <span>Nama</span>
                    <input value={sel1.name} onChange={e => setShapes(prev => prev.map(s => s.id === sel1.id ? { ...s, name: e.target.value } : s))}
                      style={{ width: 108, height: 22, fontSize: 11, borderRadius: 4, border: "1px solid #1e293b", background: "#0a0f1a", color: "#e2e8f0", padding: "0 4px" }} />
                  </label>
                  {"x" in sel1 && (
                    <>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                        <span>X</span>
                        <input type="number" value={Math.round((sel1 as RectShape).x)} onChange={e => updateSelected({ x: Number(e.target.value) } as Partial<DrawShape>)}
                          style={{ width: 70, height: 22, fontSize: 11, borderRadius: 4, border: "1px solid #1e293b", background: "#0a0f1a", color: "#e2e8f0", padding: "0 4px" }} />
                      </label>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                        <span>Y</span>
                        <input type="number" value={Math.round((sel1 as RectShape).y)} onChange={e => updateSelected({ y: Number(e.target.value) } as Partial<DrawShape>)}
                          style={{ width: 70, height: 22, fontSize: 11, borderRadius: 4, border: "1px solid #1e293b", background: "#0a0f1a", color: "#e2e8f0", padding: "0 4px" }} />
                      </label>
                    </>
                  )}
                  {"rotation" in sel1 && (
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                      <span>Rotasi°</span>
                      <input type="number" value={Math.round(((sel1 as RectShape).rotation ?? 0))} onChange={e => updateSelected({ rotation: Number(e.target.value) } as Partial<DrawShape>)}
                        style={{ width: 70, height: 22, fontSize: 11, borderRadius: 4, border: "1px solid #1e293b", background: "#0a0f1a", color: "#e2e8f0", padding: "0 4px" }} />
                    </label>
                  )}
                  {"width" in sel1 && sel1.type !== "text" && (
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                      <span>Lebar</span>
                      <input type="number" value={Math.round((sel1 as RectShape).width)} onChange={e => updateSelected({ width: Number(e.target.value) } as Partial<DrawShape>)}
                        style={{ width: 70, height: 22, fontSize: 11, borderRadius: 4, border: "1px solid #1e293b", background: "#0a0f1a", color: "#e2e8f0", padding: "0 4px" }} />
                    </label>
                  )}
                  {"height" in sel1 && (
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8" }}>
                      <span>Tinggi</span>
                      <input type="number" value={Math.round((sel1 as RectShape).height)} onChange={e => updateSelected({ height: Number(e.target.value) } as Partial<DrawShape>)}
                        style={{ width: 70, height: 22, fontSize: 11, borderRadius: 4, border: "1px solid #1e293b", background: "#0a0f1a", color: "#e2e8f0", padding: "0 4px" }} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Hint */}
            <div style={{ padding: "6px 10px", borderTop: "1px solid #1e293b", fontSize: 9, color: "#334155", lineHeight: 1.5 }}>
              Alt+drag = pan · Scroll = zoom<br />
              Ctrl+Z/Y = undo/redo · Del = hapus<br />
              Ctrl+A = pilih semua · Ctrl+D = duplikat
            </div>
          </div>
        )}
      </div>

      {/* Inline text editor textarea */}
      {editingId && (
        <textarea
          ref={textareaRef}
          style={taStyle}
          defaultValue={(shapes.find(s => s.id === editingId) as TextShape | undefined)?.text ?? ""}
          onBlur={e => commitText(editingId, e.target.value)}
          onKeyDown={e => {
            if (e.key === "Escape") commitText(editingId, e.currentTarget.value);
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(editingId, e.currentTarget.value); }
          }}
        />
      )}
    </div>
  );
}
