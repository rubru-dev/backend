"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { logout as apiLogout } from "@/lib/api/auth";
import { getInitials } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await apiLogout();
    } catch {
      // ignore server-side errors
    } finally {
      logout();
      // Clear the middleware auth cookie
      document.cookie = "is_authed=; path=/; max-age=0"; document.cookie = "is_tukang=; path=/; max-age=0";
      router.push("/login");
      router.refresh();
    }
  }

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu pengguna"
        >
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-primary/30 hover:ring-primary/60 transition-all">
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Profil Saya
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push("/profile/password")} className="cursor-pointer">
          <KeyRound className="mr-2 h-4 w-4" />
          Ganti Password
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
