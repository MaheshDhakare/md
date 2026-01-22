/* sw.js - PropCola Share Offline (Best Solution)
   Goal:
   - First open online: cache JSON + all assets (images/pdf/mp4/mp3/etc)
   - Next opens: never hit Supabase again (cache-only)
   - Fix MP4/MP3 Range request issue by caching full file + serving slices
*/

const CACHE_NAME = "propcola-share-v2";
const MAX_ITEMS = 500;

// ✅ Supabase storage url matcher
function isSupabasePublicStorage(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname === "mxuknvleveqqybhbhwnv.supabase.co" &&
      u.pathname.includes("/storage/v1/object/public/")
    );
  } catch (e) {
    return false;
  }
}

// ✅ Normalize request key so cache works even if URL has query params
function normalizeUrl(url) {
  const u = new URL(url);
  return u.origin + u.pathname; // drop ?query
}

// Optional: limit cache size
async function trimCache(maxItems = MAX_ITEMS) {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;

  const extra = keys.length - maxItems;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

// ✅ Fetch FULL file (remove Range header)
async function fetchFull(url) {
  return fetch(url, {
    method: "GET",
    headers: {
      // force full response
      "Accept": "*/*",
    },
  });
}

// ✅ Serve Range from a cached full response (MP4/MP3 streaming support)
async function serveRange(request, cachedResponse) {
  const range = request.headers.get("range");
  if (!range) return cachedResponse;

  const buf = await cachedResponse.arrayBuffer();
  const size = buf.byteLength;

  // parse: bytes=start-end
  const m = /bytes=(\d+)-(\d*)/.exec(range);
  if (!m) return cachedResponse;

  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : Math.min(start + 1024 * 1024 - 1, size - 1);

  const chunk = buf.slice(start, end + 1);

  const headers = new Headers(cachedResponse.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(chunk.byteLength));

  return new Response(chunk, {
    status: 206,
    statusText: "Partial Content",
    headers,
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();

    // Cleanup old cache versions
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
  })());
});

// ===================================================
// ✅ NEW: Asset precache message from share.html
// ===================================================
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "PRECACHE_ASSETS") return;

  event.waitUntil((async () => {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const cache = await caches.open(CACHE_NAME);

    for (const rawUrl of urls) {
      try {
        const url = normalizeUrl(rawUrl);

        if (!isSupabasePublicStorage(url)) continue;

        const hit = await cache.match(url);
        if (hit) continue;

        // ✅ Fetch full and cache
        const res = await fetchFull(url);
        if (res && res.ok && res.status === 200) {
          await cache.put(url, res.clone());
        }
      } catch (e) {}
    }

    await trimCache(MAX_ITEMS);
  })());
});

// ===================================================
// ✅ Fetch handler: CACHE-ONLY after cached
// ===================================================
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const cleanUrl = normalizeUrl(req.url);
  if (!isSupabasePublicStorage(cleanUrl)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // ✅ 1) Return cache if exists (NO NETWORK)
    const cached = await cache.match(cleanUrl);
    if (cached) {
      // ✅ Handle Range request for mp4/mp3
      if (req.headers.has("range")) {
        return serveRange(req, cached);
      }
      return cached;
    }

    // ✅ 2) Not cached yet: first-time only -> fetch FULL file & store
    try {
      const res = await fetchFull(cleanUrl);

      if (res && res.ok && res.status === 200) {
        try {
          await cache.put(cleanUrl, res.clone());
          trimCache(MAX_ITEMS);
        } catch (e) {}
      }

      return res;
    } catch (e) {
      return new Response("Offline: file not cached yet.", {
        status: 504,
        statusText: "Gateway Timeout",
      });
    }
  })());
});
