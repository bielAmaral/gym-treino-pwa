const CACHE = "treino-pwa-v23";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./presets.js",
  "./sanitize-kg.js",
  "./timer.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // HTML: rede primeiro, cache só offline — evita o PWA ficar com index.html antigo (ex. skip link removido)
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(event.request);
          if (res && res.status === 200) {
            const c = await caches.open(CACHE);
            await c.put(event.request, res.clone());
          }
          return res;
        } catch {
          const c = await caches.match(event.request);
          if (c) return c;
          return (await caches.match("./index.html"));
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== "basic") return res;
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
