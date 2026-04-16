import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Use relative path so requests go through Next.js proxy (next.config.js rewrites)
// This avoids CORS entirely since browser talks to same origin (Next.js server)
// SSR / server-side calls use the full backend URL
const isServer = typeof window === "undefined";
const API_BASE = isServer
  ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  : "";

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// ── Request interceptor: attach JWT from localStorage ──────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: handle 401 → refresh token ──────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Never attempt token refresh for auth endpoints themselves
    const isAuthEndpoint = originalRequest.url?.includes("/auth/");
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const refreshBase = isServer ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") : "";
        const { data } = await axios.post(`${refreshBase}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem("access_token", data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed → clear tokens + cookie, redirect to login
        // Guard: skip if we're already on the login page (prevents wiping a fresh
        // session during the login→dashboard transition, or causing a redirect loop)
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          document.cookie = "is_authed=; path=/; max-age=0";
          document.cookie = "is_tukang=; path=/; max-age=0";
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
