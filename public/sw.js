const CACHE_VERSION = "fact-atlas-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

async function primeAppShell() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(APP_SHELL);

  // Vite emits content-hashed bundles. Discover and cache them during install so
  // the first standalone launch can render even if the network is unavailable.
  const home = await fetch("/", { cache: "reload" });
  if (!home.ok) return;
  const html = await home.clone().text();
  const assetUrls = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)]
    .map((match) => match[1]);
  await cache.put("/", home);
  if (assetUrls.length) await cache.addAll([...new Set(assetUrls)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(primeAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Verification inputs, receipts, health state, maps, and fresh news must never be replayed from a cache.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) await (await caches.open(CACHE_VERSION)).put("/", response.clone());
          return response;
        } catch {
          return caches.match("/");
        }
      })(),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      const refreshed = fetch(request).then(async (response) => {
        if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      if (cached) {
        event.waitUntil(refreshed.catch(() => undefined));
        return cached;
      }
      return cached || refreshed;
    }),
  );
});
