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

    if (error.response?.status === 401 && !originalRequest._retry) {
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
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (typeof window !== "undefined") {
          // Clear the middleware auth cookie so it doesn't redirect back to /dashboard
          document.cookie = "is_authed=; path=/; max-age=0"; document.cookie = "is_tukang=; path=/; max-age=0";
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
