const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    cache: "no-store",
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function buildQs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

// API is mounted at /v1/public/rb/* — matches Express: app.use("/v1/public/rb", publicRbRouter)
// paginatedResponse returns { items, total, page, per_page, total_pages }

export const publicApi = {
  rb: {
    config: () =>
      fetcher<{ data: unknown }>("/public/rb/config"),

    portfolios: (params?: { jenis_jasa?: string; page?: number; per_page?: number }) =>
      fetcher<{ items: unknown[]; total: number; total_pages: number }>(
        `/public/rb/portfolio?${buildQs({ jenis_jasa: params?.jenis_jasa, page: params?.page, per_page: params?.per_page })}`
      ),

    portfolioBySlug: (slug: string) =>
      fetcher<{ data: unknown }>(
        `/public/rb/portfolio/${slug}`,
        { cache: "no-store" } as RequestInit
      ),

    projects: (params?: { page?: number; per_page?: number }) =>
      fetcher<{ items: unknown[]; total: number; total_pages: number }>(
        `/public/rb/project?${buildQs({ page: params?.page, per_page: params?.per_page })}`
      ),

    projectBySlug: (slug: string) =>
      fetcher<{ data: unknown }>(
        `/public/rb/project/${slug}`,
        { cache: "no-store" } as RequestInit
      ),

    artikels: (params?: { kategori?: string; search?: string; page?: number; per_page?: number }) =>
      fetcher<{ items: unknown[]; total: number; total_pages: number }>(
        `/public/rb/artikel?${buildQs({ kategori: params?.kategori, search: params?.search, page: params?.page, per_page: params?.per_page })}`
      ),

    artikelBySlug: (slug: string) =>
      fetcher<{ data: unknown }>(
        `/public/rb/artikel/${slug}`,
        { cache: "no-store" } as RequestInit
      ),

    // GET /artikel/kategori — returns { data: string[] }
    artikelCategories: () =>
      fetcher<{ data: string[] }>("/public/rb/artikel/kategori"),

    banners: () =>
      fetcher<{ data: Array<{ id: number; title?: string | null; subtitle?: string | null; image_url?: string | null; mobile_image_url?: string | null }> }>("/public/rb/banner"),

    kalkulator: () =>
      fetcher<{ data: { base_prices: any; surcharges: any } }>("/public/rb/kalkulator"),

    testimonis: () =>
      fetcher<{ data: unknown[] }>("/public/rb/testimoni"),

    layananByJenis: (jenis: string) =>
      fetcher<{ data: unknown }>(`/public/rb/layanan/${jenis}`),

    submitLead: (data: unknown) =>
      fetch(`${API}/public/rb/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
  },
};
