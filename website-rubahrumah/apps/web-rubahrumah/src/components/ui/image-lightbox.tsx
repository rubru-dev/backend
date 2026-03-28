"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxImage {
  src: string;
  alt?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  cols?: 2 | 3 | 4;
  /** Height of thumbnails in the grid */
  thumbHeight?: number;
  /** Max images visible before sliding. undefined = show all */
  maxVisible?: number;
  /** If provided, open lightbox at this index on mount (for cover click) */
  initialIndex?: number | null;
  onClose?: () => void;
}

export function ImageLightbox({ images, cols = 4, thumbHeight = 160, maxVisible, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState<number | null>(initialIndex ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIndex(null);
    onClose?.();
  }, [onClose]);
  const prev = useCallback(() => setIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null)), [images.length]);
  const next = useCallback(() => setIndex((i) => (i !== null ? (i + 1) % images.length : null)), [images.length]);

  useEffect(() => {
    if (initialIndex !== null && initialIndex !== undefined) {
      setIndex(initialIndex);
    }
  }, [initialIndex]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, prev, next]);

  useEffect(() => {
    if (index !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [index]);

  if (!images.length) return null;

  // Determine visible vs hidden
  const visibleImages = maxVisible ? images.slice(0, maxVisible) : images;
  const hiddenImages = maxVisible ? images.slice(maxVisible) : [];

  const colClass =
    cols === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : cols === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2";

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -280, behavior: "smooth" });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 280, behavior: "smooth" });

  return (
    <>
      {/* Visible thumbnail grid */}
      <div className={`grid gap-3 ${colClass}`}>
        {visibleImages.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className="relative rounded-xl overflow-hidden bg-slate-100 cursor-zoom-in group"
            style={{ height: `${thumbHeight}px` }}
            aria-label={`Buka foto ${i + 1}`}
          >
            <Image
              src={img.src}
              alt={img.alt ?? `foto ${i + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </button>
        ))}
      </div>

      {/* Hidden images — horizontal scroll slider */}
      {hiddenImages.length > 0 && (
        <div className="relative mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-400 font-medium">+{hiddenImages.length} foto lainnya</span>
          </div>
          <div className="relative group/slider">
            <button
              type="button"
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center text-slate-600 opacity-0 group-hover/slider:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {hiddenImages.map((img, i) => {
                const globalIdx = (maxVisible ?? 0) + i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(globalIdx)}
                    className="flex-none rounded-xl overflow-hidden bg-slate-100 cursor-zoom-in group snap-start"
                    style={{ width: "200px", height: `${thumbHeight}px` }}
                    aria-label={`Buka foto ${globalIdx + 1}`}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={img.src}
                        alt={img.alt ?? `foto ${globalIdx + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center text-slate-600 opacity-0 group-hover/slider:opacity-100 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      {index !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
            aria-label="Tutup"
          >
            <X size={22} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm select-none">
            {index + 1} / {images.length}
          </div>

          {/* Prev */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 sm:left-6 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
              aria-label="Sebelumnya"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-5xl w-full mx-16 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[index].src}
              alt={images[index].alt ?? `foto ${index + 1}`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg select-none"
              draggable={false}
            />
          </div>

          {/* Next */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 sm:right-6 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
              aria-label="Berikutnya"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </>
  );
}

/** Standalone lightbox trigger (for single images like cover) */
interface CoverLightboxProps {
  src: string;
  alt?: string;
  children: React.ReactNode;
}

export function CoverLightbox({ src, alt, children }: CoverLightboxProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full cursor-zoom-in block">
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={() => setOpen(false)}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
          >
            <X size={22} />
          </button>
          <div className="relative max-w-5xl w-full mx-8 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={src} alt={alt ?? ""} className="w-full h-auto max-h-[90vh] object-contain rounded-lg select-none" draggable={false} />
          </div>
        </div>
      )}
    </>
  );
}
