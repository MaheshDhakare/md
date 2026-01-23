/* sw.js - PropCola Minimal Offline Shell v4
   Purpose:
   - Ensure share.html opens offline (app shell)
   - Cache FontAwesome CDN CSS so UI icons work offline
   Notes:
   - All content (JSON/images/pdf/mp4/mp3) is handled by IndexedDB in share_everything_indexeddb.html
*/

const CACHE_NAME = "propcola-shell-v5";
const CORE_URLS = [
  "./share.html",
  "./",
  "./sw.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_URLS.map(async (u) => {
      try {
        const res = await fetch(new Request(u, { cache: "reload" }));
        if (res && res.ok) await cache.put(u, res);
      } catch (e) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    // remove old versions
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ✅ Offline navigation: return cached share.html
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      // network first (for updates), cache fallback offline
      try {
        const res = await fetch(req);
        try {
          const url = new URL(req.url);
          if (url.origin === self.location.origin) {
            await cache.put("./share.html", res.clone());
          }
        } catch (e) {}
        return res;
      } catch (e) {
        const cached = await cache.match("./share.html");
        if (cached) return cached;
        return new Response("Offline and share.html not cached yet.", { status: 503 });
      }
    })());
    return;
  }

  // ✅ Cache-first for FontAwesome CSS
  if (req.method === "GET" && req.url.includes("cdnjs.cloudflare.com/ajax/libs/font-awesome/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req.url);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) await cache.put(req.url, res.clone());
        return res;
      } catch (e) {
        return cached || new Response("", { status: 504 });
      }
    })());
    return;
  }
});
