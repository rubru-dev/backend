"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }

export function PwaRegister() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  useEffect(() => {
    let handleControllerChange: (() => void) | undefined;
    const reloadGuardTimeout = window.setTimeout(() => sessionStorage.removeItem("rubahrumah-sw-reloaded"), 10_000);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);
      handleControllerChange = () => {
        if (hadController && sessionStorage.getItem("rubahrumah-sw-reloaded") !== "1") {
          sessionStorage.setItem("rubahrumah-sw-reloaded", "1");
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.register("/sw.js").then((registration) => registration.update()).catch(() => undefined);
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = localStorage.getItem("rubahrumah-client-pwa-dismissed") === "1";
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone && !dismissed) setShowIosHelp(true);
    const handler = (event: Event) => { event.preventDefault(); if (!dismissed) setPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.clearTimeout(reloadGuardTimeout);
      window.removeEventListener("beforeinstallprompt", handler);
      if (handleControllerChange) navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);
  if (!prompt && !showIosHelp) return null;
  const dismiss = () => { localStorage.setItem("rubahrumah-client-pwa-dismissed", "1"); setPrompt(null); setShowIosHelp(false); };
  return <aside className="fixed right-4 bottom-4 left-4 z-[100] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl sm:left-auto sm:max-w-sm"><p className="font-semibold">Install RubahRumah</p><p className="mt-1 text-xs text-slate-500">{showIosHelp ? "Di Safari, tekan Bagikan lalu pilih Tambahkan ke Layar Utama." : "Pantau proyek langsung dari layar utama HP Anda."}</p><div className="mt-3 flex justify-end gap-2"><button className="rounded-md px-3 py-2 text-xs text-slate-500" onClick={dismiss}>Nanti</button>{prompt && <button className="rounded-md bg-[#262478] px-3 py-2 text-xs font-semibold text-white" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>Install aplikasi</button>}</div></aside>;
}
