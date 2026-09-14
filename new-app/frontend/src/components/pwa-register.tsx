"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = localStorage.getItem("pwa-install-dismissed") === "1";
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios && !standalone && !dismissed) setShowIosHelp(true);
    const handlePrompt = (event: Event) => { event.preventDefault(); if (!dismissed) setPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  if (!prompt && !showIosHelp) return null;
  const dismiss = () => { localStorage.setItem("pwa-install-dismissed", "1"); setPrompt(null); setShowIosHelp(false); };
  return <aside className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl border bg-background p-4 shadow-xl sm:left-auto sm:max-w-sm">
    <p className="font-semibold">Install Report Rubru</p><p className="mt-1 text-xs text-muted-foreground">{showIosHelp ? "Di Safari, tekan Bagikan lalu pilih Tambahkan ke Layar Utama." : "Buka lebih cepat dari layar utama seperti aplikasi."}</p>
    <div className="mt-3 flex justify-end gap-2"><button className="rounded-md px-3 py-2 text-xs text-muted-foreground" onClick={dismiss}>Nanti</button>{prompt && <button className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>Install aplikasi</button>}</div>
  </aside>;
}
