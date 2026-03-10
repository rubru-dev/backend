"use client";
import { useRef, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SCROLL_STEP = 320;

export function DualScrollContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollLeft = useCallback(() => {
    contentRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    contentRef.current?.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
  }, []);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Scroll buttons row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={scrollLeft}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kiri
        </button>
        <button
          onClick={scrollRight}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Kanan
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={contentRef} style={{ overflowX: "auto", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
