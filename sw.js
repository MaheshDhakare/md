/* sw.js - PropCola Minimal Offline Shell v5
   Purpose:
   - Ensure share.html opens offline (app shell)
   - Cache FontAwesome CDN CSS + fonts so icons work offline
   Notes:
   - All JSON/images/pdf/mp4/mp3 handled by IndexedDB in share.html
*/

const CACHE_NAME = "propcola-shell-v5";

// ✅ canonical absolute shell url
const SHELL_URL = new URL("./share.html", self.location.href).toString();

const CORE_URLS = [
  SHELL_URL,
  new URL("./", self.location.href).toString(),
  new URL("./sw.js", self.location.href).toString(),

  // FontAwesome CSS
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",

  // FontAwesome fonts (brands + solid)
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-brands-400.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-solid-900.woff2"
];


self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const u of CORE_URLS) {
      try {
        const res = await fetch(new Request(u, { cache: "reload" }));
        if (res && res.ok) await cache.put(u, res.clone());
      } catch (e) {}
    }

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ✅ Offline navigation: always return cached share.html as fallback
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const res = await fetch(req);
        // ✅ update shell cache whenever online
        await cache.put(SHELL_URL, res.clone());
        return res;
      } catch (e) {
        const cached = await cache.match(SHELL_URL);
        if (cached) return cached;
        return new Response("Offline and share.html not cached yet.", { status: 503 });
      }
    })());
    return;
  }

  // ✅ Cache-first for FontAwesome CSS + Fonts
	const isFA =
	  req.method === "GET" &&
	  (
		req.url.includes("cdnjs.cloudflare.com/ajax/libs/font-awesome/") ||
		req.url.includes("use.fontawesome.com/") ||
		req.url.includes("/webfonts/") ||
		req.destination === "font"
	  );


  if (isFA) {
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
