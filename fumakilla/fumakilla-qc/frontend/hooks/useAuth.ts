"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";
import { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem("fqc_token");
    localStorage.removeItem("fqc_user");
    setUser(null);
    router.push("/login");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const token = localStorage.getItem("fqc_token");
      if (!token) {
        if (!pathname.startsWith("/login")) router.replace("/login");
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        if (cancelled) return;
        setUser(res.data.user);
        localStorage.setItem("fqc_user", JSON.stringify(res.data.user));
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [logout, pathname, router]);

  return { user, loading, logout };
}
