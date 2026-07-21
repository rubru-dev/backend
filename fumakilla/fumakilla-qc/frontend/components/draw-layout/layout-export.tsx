"use client";

/**
 * Read-only, off-screen Konva renderer used to export a saved Draw Layout to
 * PNG/PDF from the list table without opening the editor.
 *
 * NOTE: The shape types and node components below mirror the interactive editor
 * (app/draw-layout/[id]/page.tsx). If a new shape type is added there, mirror it
 * here too. Kept separate on purpose so the (fragile, 1400-line) editor stays
 * untouched. See memory: project_fumakilla_motion_system / draw-layout export.
 */

import { useEffect, useRef, useState } from "react";
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
} from "react-konva";
import type Konva from "konva";

// ─── Types (mirror editor) ──────────────────────────────────────────────────
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
export type DrawShape = RectShape | EllipseShape | LineShape | ArrowShape | FreeShape | TextShape | ImageShape | PestShape | DoorShape;

export type LayoutData = { shapes?: DrawShape[]; bgSrc?: string | null; bgOpacity?: number };

export const CANVAS_W = 4800;
export const CANVAS_H = 3600;

const PEST_EMOJI: Record<string, string> = {
  Tikus: "🐀", Kecoa: "🪳", Semut: "🐜", Rayap: "🪲",
  Lalat: "🪰", Kucing: "🐱", Musang: "🦝", Kelelawar: "🦇",
  Burung: "🐦", Cicak: "🦎", "Tawon/Lebah": "🐝", "Kutu/Tungau": "🕷",
};

const commonRO = (s: DrawShape) => ({ id: s.id, opacity: s.opacity, listening: false });

// ─── Image nodes (mirror editor, read-only) ─────────────────────────────────
function ImgNode({ shape }: { shape: ImageShape }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const i = new window.Image(); i.onload = () => setImg(i); i.src = shape.src; }, [shape.src]);
  if (!img) return null;
  return <KImage image={img} id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible} listening={false} />;
}
function RectFillNode({ shape }: { shape: RectShape }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { if (!shape.imageSrc) return; const i = new window.Image(); i.onload = () => setImg(i); i.src = shape.imageSrc; }, [shape.imageSrc]);
  if (!img) return <KRect id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} cornerRadius={shape.cornerRadius} rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible} listening={false} />;
  return <KRect id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke={shape.stroke} strokeWidth={shape.strokeWidth} cornerRadius={shape.cornerRadius} rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible} fillPriority="pattern" fillPatternImage={img} fillPatternScaleX={shape.width / img.width} fillPatternScaleY={shape.height / img.height} listening={false} />;
}
function EllipseFillNode({ shape }: { shape: EllipseShape }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { if (!shape.imageSrc) return; const i = new window.Image(); i.onload = () => setImg(i); i.src = shape.imageSrc; }, [shape.imageSrc]);
  if (!img) return <KEllipse id={shape.id} x={shape.x} y={shape.y} radiusX={shape.radiusX} radiusY={shape.radiusY} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible} listening={false} />;
  return <KEllipse id={shape.id} x={shape.x} y={shape.y} radiusX={shape.radiusX} radiusY={shape.radiusY} stroke={shape.stroke} strokeWidth={shape.strokeWidth} rotation={shape.rotation} opacity={shape.opacity} visible={shape.visible} fillPriority="pattern" fillPatternImage={img} fillPatternX={-shape.radiusX} fillPatternY={-shape.radiusY} fillPatternScaleX={(shape.radiusX * 2) / img.width} fillPatternScaleY={(shape.radiusY * 2) / img.height} listening={false} />;
}
function BgNode({ src, opacity }: { src: string; opacity: number }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const i = new window.Image(); i.onload = () => setImg(i); i.src = src; }, [src]);
  if (!img) return null;
  return <KImage image={img} x={0} y={0} width={CANVAS_W} height={CANVAS_H} opacity={opacity} listening={false} />;
}

function renderShape(s: DrawShape) {
  if (!s.visible) return null;
  const cp = commonRO(s);
  switch (s.type) {
    case "rect":     return s.imageSrc ? <RectFillNode key={s.id} shape={s} /> : <KRect key={s.id} {...cp} x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} cornerRadius={s.cornerRadius} rotation={s.rotation} />;
    case "circle":   return s.imageSrc ? <EllipseFillNode key={s.id} shape={s} /> : <KEllipse key={s.id} {...cp} x={s.x} y={s.y} radiusX={s.radiusX} radiusY={s.radiusY} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} rotation={s.rotation} />;
    case "line":     return <KLine  key={s.id} {...cp} points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} dash={s.dash} lineCap="round" lineJoin="round" />;
    case "arrow":    return <KArrow key={s.id} {...cp} points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.fill} pointerLength={10} pointerWidth={8} />;
    case "freehand": return <KLine  key={s.id} {...cp} points={s.points} stroke={s.stroke} strokeWidth={s.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" />;
    case "text":     return <KText  key={s.id} {...cp} x={s.x} y={s.y} text={s.text} fill={s.fill} fontSize={s.fontSize} fontFamily={s.fontFamily} rotation={s.rotation} width={s.width} wrap="word" />;
    case "image":    return <ImgNode key={s.id} shape={s} />;
    case "pest": {
      const emoji = PEST_EMOJI[s.pestType] ?? "🐀";
      return <KText key={s.id} {...cp} x={s.x} y={s.y} rotation={s.rotation} text={s.count > 1 ? `${emoji}×${s.count}` : emoji} fontSize={s.size} offsetX={s.size / 2} offsetY={s.size / 2} />;
    }
    case "door":
      return <KShape key={s.id} {...cp} x={s.x} y={s.y} rotation={s.rotation} stroke={s.stroke} strokeWidth={s.strokeWidth} fill="transparent" width={s.width} height={s.width}
        sceneFunc={(ctx, shape) => {
          const w = s.width; const sign = s.flip ? -1 : 1;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0);
          ctx.moveTo(w, 0); ctx.arc(0, 0, w, 0, sign * Math.PI / 2, s.flip);
          ctx.moveTo(0, sign * w); ctx.lineTo(w * 0.08, sign * w);
          ctx.fillStrokeShape(shape);
        }} />;
    default: return null;
  }
}

/**
 * Mounts a hidden full-size Konva stage for the given layout. Calls `onReady`
 * with the Konva.Stage once shapes are painted and images had time to load.
 * Layer order: [0]=background(white+bg image), [1]=shapes (last layer = content).
 */
export default function LayoutExport({ data, onReady }: { data: LayoutData; onReady: (stage: Konva.Stage) => void }) {
  const stageRef = useRef<Konva.Stage>(null);
  const shapes = Array.isArray(data.shapes) ? data.shapes : [];

  useEffect(() => {
    // Give async images (data URLs / remote) time to paint before capture.
    const t = setTimeout(() => { if (stageRef.current) onReady(stageRef.current); }, 550);
    return () => clearTimeout(t);
  }, [data, onReady]);

  return (
    // Off-screen but rendered (display:none breaks canvas sizing) — pushed far away.
    <div style={{ position: "fixed", left: -100000, top: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: "none", opacity: 0 }} aria-hidden>
      <Stage ref={stageRef} width={CANVAS_W} height={CANVAS_H}>
        <Layer listening={false}>
          <KRect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#ffffff" />
          {data.bgSrc ? <BgNode src={data.bgSrc} opacity={typeof data.bgOpacity === "number" ? data.bgOpacity : 1} /> : null}
        </Layer>
        <Layer listening={false}>
          {shapes.map(renderShape)}
        </Layer>
      </Stage>
    </div>
  );
}
