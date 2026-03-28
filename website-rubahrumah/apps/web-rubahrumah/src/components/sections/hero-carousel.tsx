"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface ApiBanner {
  id: number;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  mobile_image_url?: string | null;
}

interface Props {
  banners?: ApiBanner[];
}

export function HeroCarousel({ banners }: Props) {
  const activeBanners = (banners ?? []).filter((b) => b.image_url);
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const t = setInterval(() => {
      setCurrent((c) => (c + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(t);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-1">
      <div className="relative w-full overflow-hidden rounded-md bg-slate-100">
        {activeBanners.map((b, i) => (
          <div
            key={b.id}
            className={`w-full transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0 absolute inset-0"}`}
          >
            {/* Desktop image */}
            <Image
              src={b.image_url!}
              alt={b.title ?? "Banner"}
              width={1920}
              height={600}
              className={`w-full h-auto block ${b.mobile_image_url ? "hidden sm:block" : ""}`}
              style={{ width: "100%", height: "auto" }}
              priority={i === 0}
            />
            {/* Mobile image (only if provided) */}
            {b.mobile_image_url && (
              <Image
                src={b.mobile_image_url}
                alt={b.title ?? "Banner"}
                width={768}
                height={400}
                className="w-full h-auto block sm:hidden"
                style={{ width: "100%", height: "auto" }}
                priority={i === 0}
              />
            )}
          </div>
        ))}

        {activeBanners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {activeBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "bg-white w-4" : "bg-white/50 w-1.5"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
