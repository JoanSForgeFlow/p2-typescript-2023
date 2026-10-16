const sw = self as unknown as ServiceWorkerGlobalScope;

const CORE = "pqd-core-v1";
const RUNTIME = "pqd-runtime-v1";
const IMAGES = "pqd-images-v1";
const MAX_IMAGES = 800;
const SPANISH = new URL("es/", sw.location.href).pathname;
const PRECACHE = ["index.html", "offline.html", "es/offline.html", "data/meta.json", "data/moves.json", "manifest.webmanifest", "icons/icon-192.png"];

sw.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CORE).then((cache) => cache.addAll(PRECACHE)).then(() => sw.skipWaiting()));
});

sw.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = [CORE, RUNTIME, IMAGES];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await sw.clients.claim();
  })());
});

// "/" and "/index.html" are the same page (also under es/).
const pageKey = (url: URL): string => `${url.origin}${url.pathname}${url.pathname.endsWith("/") ? "index.html" : ""}`;

async function networkFirst(request: Request, fallback?: string, key: Request | string = request): Promise<Response> {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(key)) || (await caches.match(key, { ignoreSearch: true }));
    if (cached) return cached;
    if (fallback) {
      const offline = await caches.match(fallback);
      if (offline) return offline;
    }
    throw error;
  }
}

// Versioned assets (css/js with ?v=hash) never change for a given URL.
async function cacheFirst(request: Request, cacheName: string, limit = 0): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (limit) {
      const keys = await cache.keys();
      for (const key of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(key);
    }
  }
  return response;
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || network;
}

sw.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === sw.location.origin) {
    if (url.pathname.startsWith("/_vercel/")) return;
    if (request.mode === "navigate") event.respondWith(networkFirst(request, url.pathname.startsWith(SPANISH) ? "es/offline.html" : "offline.html", pageKey(url)));
    else if (url.searchParams.has("v")) event.respondWith(cacheFirst(request, RUNTIME));
    else event.respondWith(networkFirst(request));
  } else if (url.hostname === "raw.githubusercontent.com" && /\.(png|gif|svg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request));
  }
});
