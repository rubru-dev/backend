const CACHE = "report-rubru-pwa-v3";
const SHELL = ["/offline.html", "/manifest.webmanifest", "/pwa-192.png", "/pwa-512.png", "/maskable-512.png", "/images/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key.startsWith("report-rubru-pwa-")).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title || "Rubah Rumah", {
    body: data.body || "Ada notifikasi baru.",
    icon: "/images/logo.png",
    badge: "/images/logo.png",
    tag: data.tag || "rubru-notification",
    data: { url: data.url || "/dashboard" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => "focus" in client);
    if (existing) {
      existing.navigate(url);
      return existing.focus();
    }
    return clients.openWindow(url);
  }));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/storage/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i)) {
    event.respondWith(caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          // Clone sebelum response dikembalikan ke browser. Setelah itu body
          // response bisa sudah dipakai sehingga clone terlambat akan gagal.
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined));
        }
        return response;
      });
    }));
  }
});
