"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

type HorizontalDragScrollProps = {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
};

const DRAG_THRESHOLD = 6;
const KEYBOARD_SCROLL_DISTANCE = 160;

export function HorizontalDragScroll({ children, className = "", ariaLabel }: HorizontalDragScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    active: false,
  });
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  function finishDrag(pointerId: number, suppressClick: boolean) {
    const container = containerRef.current;
    if (container?.hasPointerCapture(pointerId)) container.releasePointerCapture(pointerId);
    dragRef.current.active = false;
    dragRef.current.pointerId = -1;
    setIsDragging(false);

    if (suppressClick) {
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || event.button !== 0) return;
    const container = containerRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      active: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!container || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        finishDrag(event.pointerId, false);
        return;
      }
      drag.active = true;
      container.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }

    event.preventDefault();
    container.scrollLeft = drag.startScrollLeft - deltaX;
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId !== event.pointerId) return;
    finishDrag(event.pointerId, dragRef.current.active);
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    containerRef.current?.scrollBy({
      left: event.key === "ArrowLeft" ? -KEYBOARD_SCROLL_DISTANCE : KEYBOARD_SCROLL_DISTANCE,
      behavior: "smooth",
    });
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={`overflow-x-auto touch-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(event) => finishDrag(event.pointerId, false)}
      onClickCapture={handleClickCapture}
      onKeyDown={handleKeyDown}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
