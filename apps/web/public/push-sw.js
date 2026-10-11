// Web Push, imported by the generated service worker (vite-plugin-pwa, workbox.importScripts).
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Comptoirs", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.kind,
      // An ambush stays on screen until seen: the merchant has minutes to fight back.
      requireInteraction: data.kind === "ambush",
      renotify: data.kind === "ambush",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          // A link into the game (the ambush alert): open it in the window already there.
          if (url !== "/" && "navigate" in client)
            return client.navigate(url).then((c) => c?.focus());
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
