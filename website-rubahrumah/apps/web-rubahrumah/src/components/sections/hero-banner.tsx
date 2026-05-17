import { publicApi } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { HeroCarousel } from "@/components/sections/hero-carousel";

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
      image_url: mediaUrl(b.image_url),
      mobile_image_url: mediaUrl(b.mobile_image_url),
    }));
  } catch {
    // silently fail — carousel hides itself when banners is empty
  }

  return <HeroCarousel banners={banners} />;
}
