"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardSliderProps {
  children: React.ReactNode[];
}

/**
 * Horizontal card slider.
 * - Mobile: shows 2 cards side-by-side, rest accessible via horizontal scroll
 * - Desktop (lg+): shows 3 cards side-by-side, rest accessible via horizontal scroll
 */
export function CardSlider({ children }: CardSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    // Scroll by approximately 1 card width
    const card = scrollRef.current.querySelector<HTMLElement>("[data-card]");
    const cardWidth = card ? card.offsetWidth + 16 : 280;
    scrollRef.current.scrollBy({ left: dir === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  if (!children.length) return null;

  return (
    <div className="relative group/cs">
      {/* Prev button */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white shadow-md rounded-full flex items-center justify-center text-slate-600 hover:text-[#FF9122] opacity-0 group-hover/cs:opacity-100 transition-opacity -ml-4"
        aria-label="Sebelumnya"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {children.map((child, i) => (
          <div
            key={i}
            data-card=""
            className="flex-none snap-start w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white shadow-md rounded-full flex items-center justify-center text-slate-600 hover:text-[#FF9122] opacity-0 group-hover/cs:opacity-100 transition-opacity -mr-4"
        aria-label="Berikutnya"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
