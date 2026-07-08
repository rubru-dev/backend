// ─────────────────────────────────────────────────────────────────────────────
// domToPptx — konverter generik DOM → slide PPTX native (editable per-element).
//
// Alih-alih men-screenshot halaman jadi 1 gambar (html2canvas), modul ini
// menelusuri tiap elemen DOM yang dirender, membaca posisi asli
// (getBoundingClientRect) + gaya terpakai (getComputedStyle), lalu memancarkan
// elemen PowerPoint native di posisi yang sama:
//   - teks   → slide.addText   (text box, bisa diedit)
//   - tabel  → slide.addTable  (tabel PowerPoint asli)
//   - kotak/garis/warna → slide.addShape
//   - <img> & <canvas> (denah/foto) → slide.addImage (tetap gambar)
//
// Karena posisi dibaca dari layout nyata, hasilnya mengikuti tampilan HTML dan
// otomatis menangani jumlah halaman yang dinamis.
// ─────────────────────────────────────────────────────────────────────────────
import type PptxGenJS from "pptxgenjs";

type Slide = ReturnType<PptxGenJS["addSlide"]>;

// Ukuran slide = A4 landscape (inci) supaya rasio sama dgn halaman (297×210mm).
export const PAGE_W_IN = 11.69;
export const PAGE_H_IN = 8.27;

// ─── Util warna ───────────────────────────────────────────────────────────────
function clampByte(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function toHex(r: number, g: number, b: number) {
  return [r, g, b].map((v) => clampByte(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}
/** Parse "rgb(...)" / "rgba(...)" → { hex, alpha }. null utk transparan/invalid. */
function parseColor(str: string): { hex: string; alpha: number } | null {
  if (!str) return null;
  const m = str.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [r, g, b] = parts;
  const a = parts.length >= 4 ? parts[3] : 1;
  return { hex: toHex(r, g, b), alpha: a };
}
function fontFace(ff: string): string {
  const f = (ff || "").toLowerCase();
  if (f.includes("georgia")) return "Georgia";
  if (f.includes("times")) return "Times New Roman";
  if (f.includes("serif") && !f.includes("sans")) return "Georgia";
  return "Arial";
}

// ─── Util gambar ──────────────────────────────────────────────────────────────
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
/** Ambil dataURL dari <img> yang sudah termuat. Same-origin → gambar ke canvas;
 *  cross-origin/tainted → fallback fetch. null bila gagal (elemen di-skip). */
async function imgToDataURL(img: HTMLImageElement): Promise<string | null> {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  try {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/png"); // throws bila tainted (cross-origin tanpa CORS)
  } catch {
    try {
      const res = await fetch(img.currentSrc || img.src, { mode: "cors" });
      if (!res.ok) return null;
      return await blobToDataURL(await res.blob());
    } catch {
      return null;
    }
  }
}

// ─── Konverter ────────────────────────────────────────────────────────────────
type PptxCtor = typeof PptxGenJS;

/**
 * Render satu elemen halaman (.print-page) menjadi elemen-elemen native di slide.
 * @param _pptx instance PptxGenJS (dipakai utk tipe, tak wajib)
 * @param slide slide tujuan (sudah dibuat pemanggil)
 * @param pageEl elemen halaman A4 yang mau dikonversi
 */
export async function renderPageToSlide(
  _pptx: InstanceType<PptxCtor>,
  slide: Slide,
  pageEl: HTMLElement,
  opts?: { pageWIn?: number; pageHIn?: number }
): Promise<void> {
  const pageWIn = opts?.pageWIn ?? PAGE_W_IN;
  const pageHIn = opts?.pageHIn ?? PAGE_H_IN;
  const pageRect = pageEl.getBoundingClientRect();
  const kx = pageWIn / pageRect.width;
  const ky = pageHIn / pageRect.height;

  const inX = (px: number) => (px - pageRect.left) * kx;
  const inY = (px: number) => (px - pageRect.top) * ky;
  const wIn = (px: number) => px * kx;
  const hIn = (px: number) => px * ky;
  const ptOf = (px: number) => Math.max(1, px * ky * 72); // px → point (72pt/inch)

  // ── decoration (background + border) ──
  const addDecoration = (cs: CSSStyleDeclaration, x: number, y: number, w: number, h: number) => {
    if (w <= 0 && h <= 0) return;
    const bg = parseColor(cs.backgroundColor);
    const hasBg = !!bg && bg.alpha > 0.02;

    const rawSides = (["Top", "Right", "Bottom", "Left"] as const).map((side) => ({
      side,
      width: parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) || 0,
      style: cs.getPropertyValue(`border-${side.toLowerCase()}-style`),
      color: parseColor(cs.getPropertyValue(`border-${side.toLowerCase()}-color`)),
    }));
    const sides = rawSides.filter((b) => b.width > 0 && b.style !== "none" && b.color && b.color.alpha > 0.02);
    const radiusPx = parseFloat(cs.borderTopLeftRadius) || 0;
    const allFour =
      sides.length === 4 &&
      sides.every((s) => Math.abs(s.width - sides[0].width) < 0.6 && s.color!.hex === sides[0].color!.hex);

    if (hasBg || allFour) {
      const safeW = Math.max(w, 0.01);
      const safeH = Math.max(h, 0.01);
      const opt: any = { x, y, w: safeW, h: safeH };
      opt.fill = hasBg ? { color: bg!.hex, transparency: Math.round((1 - bg!.alpha) * 100) } : { type: "none" };
      opt.line = allFour ? { color: sides[0].color!.hex, width: ptOf(sides[0].width) } : { type: "none" };
      if (radiusPx > 2) {
        opt.rectRadius = Math.min(hIn(radiusPx), safeH / 2, safeW / 2);
        slide.addShape("roundRect", opt);
      } else {
        slide.addShape("rect", opt);
      }
    }

    // Border per-sisi (mis. garis pembatas biru = border-bottom saja)
    if (!allFour) {
      for (const b of sides) {
        const col = b.color!.hex;
        if (b.side === "Top") slide.addShape("rect", { x, y, w, h: hIn(b.width), fill: { color: col }, line: { type: "none" } });
        else if (b.side === "Bottom") slide.addShape("rect", { x, y: y + h - hIn(b.width), w, h: hIn(b.width), fill: { color: col }, line: { type: "none" } });
        else if (b.side === "Left") slide.addShape("rect", { x, y, w: wIn(b.width), h, fill: { color: col }, line: { type: "none" } });
        else slide.addShape("rect", { x: x + w - wIn(b.width), y, w: wIn(b.width), h, fill: { color: col }, line: { type: "none" } });
      }
    }
  };

  // ── text box ──
  const addTextBox = (text: string, cs: CSSStyleDeclaration, x: number, y: number, w: number, h: number) => {
    if (!text) return;
    const fsPx = parseFloat(cs.fontSize) || 12;
    const color = parseColor(cs.color)?.hex ?? "111111";
    const weight = parseInt(cs.fontWeight, 10);
    const bold = (Number.isFinite(weight) && weight >= 600) || cs.fontWeight === "bold";
    const italic = cs.fontStyle === "italic";
    const align = cs.textAlign === "center" ? "center" : cs.textAlign === "right" || cs.textAlign === "end" ? "right" : "left";
    const lhPx = cs.lineHeight === "normal" ? fsPx * 1.2 : parseFloat(cs.lineHeight) || fsPx * 1.2;
    slide.addText(text, {
      x,
      y,
      w: Math.max(w, 0.1),
      h: Math.max(h, 0.1),
      fontSize: ptOf(fsPx),
      fontFace: fontFace(cs.fontFamily),
      color,
      bold,
      italic,
      align: align as any,
      valign: "top",
      margin: 0,
      wrap: true,
      lineSpacingMultiple: Math.max(0.8, lhPx / fsPx),
      isTextBox: true,
    });
  };

  // ── teks langsung (child text-node saja, bukan turunan) ──
  const directText = (el: HTMLElement, pre: boolean): string => {
    let s = "";
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE) s += n.textContent ?? "";
    }
    return pre ? s.replace(/^\n+|\n+$/g, "") : s.replace(/\s+/g, " ").trim();
  };

  // ── tabel ──
  const cellText = (cell: HTMLElement): string => {
    const list = cell.querySelector("ol,ul");
    if (list) {
      const ordered = list.tagName === "OL";
      return Array.from(list.querySelectorAll("li"))
        .map((li, i) => (ordered ? `${i + 1}. ` : "• ") + (li.textContent ?? "").trim())
        .join("\n");
    }
    const ta = cell.querySelector("textarea") as HTMLTextAreaElement | null;
    if (ta) return ta.value;
    return (cell.innerText ?? cell.textContent ?? "").replace(/\n{2,}/g, "\n").trim();
  };

  const addTableEl = (table: HTMLTableElement, x: number, y: number) => {
    const trs = Array.from(table.querySelectorAll("tr"));
    if (trs.length === 0) return;
    const firstCells = Array.from(trs[0].querySelectorAll("th,td")) as HTMLElement[];
    const colW = firstCells.map((c) => wIn(c.getBoundingClientRect().width));
    const totalW = colW.reduce((a, b) => a + b, 0) || wIn(table.getBoundingClientRect().width);

    const rows = trs.map((tr) => {
      const cells = Array.from(tr.querySelectorAll("th,td")) as HTMLElement[];
      return cells.map((cell) => {
        const cs = getComputedStyle(cell);
        const bg = parseColor(cs.backgroundColor);
        const weight = parseInt(cs.fontWeight, 10);
        return {
          text: cellText(cell),
          options: {
            fontSize: ptOf(parseFloat(cs.fontSize) || 10),
            fontFace: fontFace(cs.fontFamily),
            color: parseColor(cs.color)?.hex ?? "111111",
            bold: (Number.isFinite(weight) && weight >= 600) || cs.fontWeight === "bold",
            align: (cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "right" : "left") as any,
            valign: "top" as any,
            fill: bg && bg.alpha > 0.02 ? { color: bg.hex } : undefined,
          },
        };
      });
    });

    slide.addTable(rows as any, {
      x,
      y,
      w: totalW,
      colW: colW.length ? colW : undefined,
      border: { type: "solid", pt: 0.5, color: "E5E7EB" },
      autoPage: false,
      valign: "top",
    });
  };

  // ── penelusuran DOM ──
  const walk = async (el: HTMLElement): Promise<void> => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    if (parseFloat(cs.opacity) === 0) return;
    if (el.classList?.contains("no-print") || el.classList?.contains("fpc-toolbar")) return;

    const r = el.getBoundingClientRect();
    // Di luar area halaman → lewati sub-pohon.
    if (r.right <= pageRect.left || r.left >= pageRect.right || r.bottom <= pageRect.top || r.top >= pageRect.bottom) return;

    const x = inX(r.left);
    const y = inY(r.top);
    const w = wIn(r.width);
    const h = hIn(r.height);
    const tag = el.tagName;

    if (tag === "IMG") {
      const data = await imgToDataURL(el as HTMLImageElement);
      if (data && w > 0 && h > 0) {
        const opacity = parseFloat(cs.opacity);
        slide.addImage({ data, x, y, w, h, transparency: opacity < 1 ? Math.round((1 - opacity) * 100) : 0 });
      }
      return;
    }
    if (tag === "CANVAS") {
      try {
        const data = (el as HTMLCanvasElement).toDataURL("image/png");
        if (data && w > 0 && h > 0) slide.addImage({ data, x, y, w, h });
      } catch {
        /* canvas tainted — skip */
      }
      return;
    }
    if (tag === "TABLE") {
      addTableEl(el as HTMLTableElement, x, y);
      return;
    }
    if (tag === "INPUT" || tag === "TEXTAREA") {
      addDecoration(cs, x, y, w, h);
      const val = (el as HTMLInputElement | HTMLTextAreaElement).value;
      if (val && val.trim()) {
        const padX = wIn(parseFloat(cs.paddingLeft) || 0);
        const padY = hIn(parseFloat(cs.paddingTop) || 0);
        addTextBox(val, cs, x + padX, y + padY, w - padX * 2, h - padY * 2);
      }
      return;
    }
    if (tag === "SVG" || tag === "svg" || tag === "SELECT") return;

    // Elemen container/teks biasa
    addDecoration(cs, x, y, w, h);

    const pre = cs.whiteSpace.startsWith("pre");
    let txt = directText(el, pre);
    if (txt && tag === "LI") {
      const parent = el.parentElement;
      if (parent) {
        const idx = Array.from(parent.children).indexOf(el);
        txt = (parent.tagName === "OL" ? `${idx + 1}. ` : "• ") + txt;
      }
    }
    if (txt) addTextBox(txt, cs, x, y, w, h);

    for (const child of Array.from(el.children)) {
      await walk(child as HTMLElement);
    }
  };

  await walk(pageEl);
}
