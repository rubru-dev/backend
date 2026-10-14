export type RuangkeruangService = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string | null;
  description: string | null;
  image_url: string | null;
  features: string[] | null;
};

export type RuangkeruangPortfolio = {
  id: string;
  slug: string;
  title: string;
  category: string;
  location: string | null;
  excerpt: string | null;
  description: string | null;
  cover_url: string | null;
  images: string[] | null;
};

export type RuangkeruangSite = {
  name?: string;
  eyebrow?: string;
  headline?: string;
  description?: string;
  whatsapp?: string;
  hero_image_url?: string;
};

export type RuangkeruangHomeData = {
  config: Record<string, RuangkeruangSite>;
  services: RuangkeruangService[];
  portfolio: RuangkeruangPortfolio[];
};

export type RuangkeruangArticle = { id: string; slug: string; title: string; excerpt: string | null; content?: string; cover_url: string | null; category: string; author: string; read_time: number; published_at: string | null };

export function toServiceCard(item: RuangkeruangService, fallbackImage: string) {
  return { title: item.title, category: item.category, description: item.excerpt || item.description || "Layanan Ruangkeruang", image: item.image_url || fallbackImage };
}

export function toPortfolioCard(item: RuangkeruangPortfolio, fallbackImage: string) {
  return { title: item.title, category: item.category, description: [item.location, item.excerpt].filter(Boolean).join(" · ") || "Portfolio Ruangkeruang", image: item.cover_url || item.images?.[0] || fallbackImage };
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}/v1/public/ruangkeruang${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Ruangkeruang API error: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getRuangkeruangHome() {
  return getJson<{ data: RuangkeruangHomeData }>("");
}

export async function getRuangkeruangPortfolio(slug: string) {
  return getJson<{ data: RuangkeruangPortfolio }>(`/portfolio/${encodeURIComponent(slug)}`);
}

export async function getRuangkeruangArticles() {
  return getJson<{ data: RuangkeruangArticle[] }>("/articles");
}

export async function getRuangkeruangArticle(slug: string) {
  return getJson<{ data: RuangkeruangArticle }>(`/articles/${encodeURIComponent(slug)}`);
}

export async function submitRuangkeruangLead(data: { name: string; whatsapp: string; service_type?: string; location?: string; budget?: string; detail?: Record<string, string> }) {
  const response = await fetch(`${apiUrl}/v1/public/ruangkeruang/leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) throw new Error("Lead gagal dikirim");
  return response.json();
}
