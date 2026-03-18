const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api/v1/client-portal";
export const STORAGE_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Token management ──────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cp_token");
}

export function setAuth(token: string, username: string) {
  localStorage.setItem("cp_token", token);
  localStorage.setItem("cp_username", username);
}

export function clearAuth() {
  localStorage.removeItem("cp_token");
  localStorage.removeItem("cp_username");
}

export function getUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cp_username") ?? "";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers ?? {}) as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401 || res.status === 403) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Sesi berakhir, silakan login kembali");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "Request gagal");
  }
  return res.json();
}

// ── API calls ─────────────────────────────────────────────────────────────────
export const portalApi = {
  login: (username: string, password: string) =>
    apiFetch("/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  me: () => apiFetch("/me"),

  payments: () => apiFetch("/payments"),

  galeri: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch(`/galeri${qs}`);
  },

  dokumen: (search?: string, kategori?: string) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (kategori) p.set("kategori", kategori);
    const qs = p.toString();
    return apiFetch(`/dokumen${qs ? `?${qs}` : ""}`);
  },

  aktivitas: (search?: string, status?: string) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    const qs = p.toString();
    return apiFetch(`/aktivitas${qs ? `?${qs}` : ""}`);
  },

  kehadiran: (tanggal_mulai?: string, tanggal_selesai?: string) => {
    const p = new URLSearchParams();
    if (tanggal_mulai) p.set("tanggal_mulai", tanggal_mulai);
    if (tanggal_selesai) p.set("tanggal_selesai", tanggal_selesai);
    const qs = p.toString();
    return apiFetch(`/kehadiran${qs ? `?${qs}` : ""}`);
  },

  gantt: () => apiFetch("/gantt"),

  kontak: () => apiFetch("/kontak"),

  monitoring: () => apiFetch("/monitoring"),

  tiket: (data: { whatsapp_target: string; nama_pic: string; pesan: string }) =>
    apiFetch("/tiket", { method: "POST", body: JSON.stringify(data) }),
};
