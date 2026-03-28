import type { MetadataRoute } from "next";
import { publicApi } from "@/lib/api";

const BASE = "https://rubahrumah.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/projek-berjalan`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/portofolio`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/pilihanjasa/bangunrumah`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/pilihanjasa/renovasirumah`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/pilihanjasa/designrumah`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/pilihanjasa/interiorrumah`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const [portfolios, projects, artikels] = await Promise.all([
      publicApi.rb.portfolios({ per_page: 500 }),
      publicApi.rb.projects({ per_page: 500 }),
      publicApi.rb.artikels({ per_page: 500 }),
    ]);

    (portfolios?.items ?? []).forEach((p: { slug: string }) => {
      dynamicRoutes.push({ url: `${BASE}/portofolio/${p.slug}`, changeFrequency: "monthly", priority: 0.6 });
    });
    (projects?.items ?? []).forEach((p: { slug: string }) => {
      dynamicRoutes.push({ url: `${BASE}/projek-berjalan/${p.slug}`, changeFrequency: "weekly", priority: 0.6 });
    });
    (artikels?.items ?? []).forEach((a: { slug: string; updated_at?: string }) => {
      dynamicRoutes.push({
        url: `${BASE}/articles/${a.slug}`,
        lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.65,
      });
    });
  } catch {
    // Build without dynamic routes if API is unavailable
  }

  return [...staticRoutes, ...dynamicRoutes];
}
