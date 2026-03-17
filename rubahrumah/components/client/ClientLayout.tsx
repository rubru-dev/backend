"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClientSidebar from "./ClientSidebar";
import ClientHeader from "./ClientHeader";
import { isLoggedIn } from "@/lib/apiClient";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ClientSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ClientHeader onMenuClick={() => setSidebarOpen(true)} />

      <main className="lg:ml-56 pt-16 min-h-screen">
        <div className="p-4 sm:p-5 md:p-7">{children}</div>
      </main>
    </div>
  );
}
