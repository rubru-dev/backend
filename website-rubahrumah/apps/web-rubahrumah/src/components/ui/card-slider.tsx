"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardSliderProps {
  children: React.ReactNode[];
  autoPlay?: boolean;
  intervalMs?: number;
}

/**
 * Horizontal card slider.
 * - Mobile: shows 2 cards side-by-side, rest accessible via horizontal scroll
 * - Desktop (lg+): shows 3 cards side-by-side, rest accessible via horizontal scroll
 */
export function CardSlider({ children, autoPlay = false, intervalMs = 4500 }: CardSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateOverflow = () => {
      setHasOverflow(element.scrollWidth > element.clientWidth + 1);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children.length]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    // Scroll by approximately 1 card width
    const card = scrollRef.current.querySelector<HTMLElement>("[data-card]");
    const cardWidth = card ? card.offsetWidth + 16 : 280;
    const element = scrollRef.current;
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;

    if (dir === "right" && atEnd) {
      element.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    element.scrollBy({ left: dir === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (!autoPlay || !hasOverflow || isPaused || reducedMotion) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") scroll("right");
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [autoPlay, hasOverflow, intervalMs, isPaused, reducedMotion]);

  if (!children.length) return null;

  return (
    <div
      className="relative group/cs"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Prev button */}
      {hasOverflow && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white shadow-md rounded-full flex items-center justify-center text-slate-600 hover:text-[#FF9122] opacity-0 group-hover/cs:opacity-100 transition-opacity -ml-4"
          aria-label="Sebelumnya"
        >
          <ChevronLeft size={18} />
        </button>
      )}

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
      {hasOverflow && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white shadow-md rounded-full flex items-center justify-center text-slate-600 hover:text-[#FF9122] opacity-0 group-hover/cs:opacity-100 transition-opacity -mr-4"
          aria-label="Berikutnya"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
