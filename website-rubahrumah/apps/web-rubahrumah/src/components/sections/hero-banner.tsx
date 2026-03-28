import { publicApi } from "@/lib/api";
import { HeroCarousel } from "@/components/sections/hero-carousel";

const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:8000";

/**
 * Hero banner untuk halaman selain homepage.
 * Mengambil banner dari API secara mandiri dan menampilkan carousel penuh
 * dengan dimensi yang sama seperti di homepage.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function HeroBanner(_props?: Record<string, unknown>) {
  let banners: Array<{
    id: number;
    title?: string | null;
    subtitle?: string | null;
    image_url?: string | null;
    mobile_image_url?: string | null;
  }> = [];

  try {
    const data = await publicApi.rb.banners();
    banners = (data?.data ?? []).map((b) => ({
      ...b,
      image_url: b.image_url ? `${STORAGE}${b.image_url}` : null,
      mobile_image_url: b.mobile_image_url ? `${STORAGE}${b.mobile_image_url}` : null,
    }));
  } catch {
    // silently fail — carousel hides itself when banners is empty
  }

  return <HeroCarousel banners={banners} />;
}
