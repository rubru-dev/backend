import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthTokens } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  logout: () => void;

  // Role checks (mirrors Laravel's hasAnyRole)
  hasRole: (role: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
  isSuperAdmin: () => boolean;

  // Permission checks
  hasPermission: (module: string, action: string) => boolean;
  canView:   (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit:   (module: string) => boolean;
  canDelete: (module: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setAuth: (user, tokens) => {
        localStorage.setItem("access_token", tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
        set({ user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.roles.some((r) => r.name === role) ?? false;
      },

      hasAnyRole: (...roles) => {
        const { user } = get();
        if (!user) return false;
        const userRoles = new Set(user.roles.map((r) => r.name));
        return roles.some((r) => userRoles.has(r));
      },

      isSuperAdmin: () => get().hasRole("Super Admin"),

      hasPermission: (module, action) => {
        const { user } = get();
        if (!user) return false;
        if (user.roles.some((r) => r.name === "Super Admin")) return true;
        return user.permissions?.includes(`${module}.${action}`) ?? false;
      },

      canView:   (module) => get().hasPermission(module, "view"),
      canCreate: (module) => get().hasPermission(module, "create"),
      canEdit:   (module) => get().hasPermission(module, "edit"),
      canDelete: (module) => get().hasPermission(module, "delete"),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
