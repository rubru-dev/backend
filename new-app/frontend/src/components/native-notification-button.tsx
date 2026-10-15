"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";

type InboxItem = { id: string; data: { title?: string; body?: string; url?: string }; read_at: string | null; created_at: string };

function encodeKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function NativeNotificationButton() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setEnabled(Boolean(subscription))).catch(() => undefined);
  }, [isAuthenticated]);

  async function enable() {
    if (busy || !isAuthenticated || !("Notification" in window)) return;
    setBusy(true);
    try {
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") return;
      const { data } = await apiClient.get<{ public_key: string | null }>("/notifications/push/config");
      if (!data.public_key) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: encodeKey(data.public_key) });
      await apiClient.post("/notifications/push/subscribe", subscription.toJSON());
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  }

  async function openInbox() {
    setOpen((value) => !value);
    if (!open) {
      const { data } = await apiClient.get<InboxItem[]>("/notifications/inbox?limit=6");
      setItems(data);
    }
  }

  const unread = items.filter((item) => !item.read_at).length;
  return <div className="relative">
    <Button variant="ghost" size="icon" aria-label={enabled ? "Notifikasi" : "Aktifkan notifikasi"} title={enabled ? "Notifikasi" : "Aktifkan notifikasi"} className="relative" onClick={enabled ? openInbox : enable} disabled={busy}>
      {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
      {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" aria-label={`${unread} belum dibaca`} />}
    </Button>
    {open && <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border bg-background p-2 shadow-lg">
      <div className="flex items-center justify-between px-2 py-1.5"><p className="text-sm font-semibold">Notifikasi</p><button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Tutup</button></div>
      {items.length === 0 ? <p className="px-2 py-5 text-center text-xs text-muted-foreground">Belum ada notifikasi.</p> : <div className="max-h-72 space-y-1 overflow-auto">{items.map((item) => <button key={item.id} className={`w-full rounded-md px-2 py-2 text-left hover:bg-muted ${item.read_at ? "opacity-65" : "bg-muted/60"}`} onClick={async () => { if (!item.read_at) { await apiClient.patch(`/notifications/inbox/${item.id}/read`); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry)); } if (item.data.url) window.location.href = item.data.url; }}><p className="text-xs font-medium">{item.data.title || "Notifikasi"}</p><p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.data.body || "Ada informasi baru."}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString("id-ID")}</p></button>)}</div>}
    </div>}
  </div>;
}
