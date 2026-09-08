// Minimal service worker: exists so the browser considers FutureOS
// installable (Add to Home Screen). Deliberately does NOT cache API
// responses, auth state, or app data — everything stays network-first so
// users never see stale or wrong-account content. It only caches a couple
// of static assets for a faster repeat load.
const CACHE = "futureos-static-v1";
const STATIC_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }
  if (!STATIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});

// Web Push (Android Chrome, and iOS 16.4+ once added to the home screen).
// The payload is always our own JSON from src/lib/push/webpush.ts's
// PushPayload shape — never anything from a third party — so no origin
// check is needed here the way the fetch handler above needs one.
self.addEventListener("push", (event) => {
  let payload = { title: "Alxioum", body: "", href: "/app" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Malformed/empty push payload — fall back to the generic title above
    // rather than dropping the notification entirely.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { href: payload.href },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(href) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(href);
    })
  );
});
