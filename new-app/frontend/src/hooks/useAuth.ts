"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import type { LoginPayload } from "@/lib/api/auth";

/**
 * useAuth — convenience hook that wraps the Zustand auth store
 * with router-aware login/logout actions.
 */
export function useAuth() {
  const router = useRouter();
  const store = useAuthStore();

  async function login(payload: LoginPayload) {
    const data = await apiLogin(payload);
    store.setAuth(data.user, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    router.push("/dashboard");
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // Silently ignore server errors on logout
    } finally {
      store.logout();
      router.push("/login");
      router.refresh();
    }
  }

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole,
    isSuperAdmin: store.isSuperAdmin,
    hasPermission: store.hasPermission,
    canView: store.canView,
    canCreate: store.canCreate,
    canEdit: store.canEdit,
    canDelete: store.canDelete,
    login,
    logout,
  };
}
