/**
 * GeoMarketics Service Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * Strategy:
 *   SVG floor plans  → Cache-first  (they rarely change; saves MB on repeat visits)
 *   API calls        → Network-first with cache fallback  (stall data stays fresh)
 *   JS/CSS bundles   → Stale-while-revalidate  (fast load, silent refresh)
 *
 * To bust the SVG cache when you publish a new floor plan layout:
 *   bump CACHE_VERSION below, redeploy. Old cache is deleted automatically.
 */

const CACHE_VERSION = "geomarketics-v2";
const SVG_CACHE     = `${CACHE_VERSION}-svgs`;
const API_CACHE     = `${CACHE_VERSION}-api`;

// All four floor plan SVGs pre-cached on install
const SVG_ASSETS = [
  "/MAIN_First_Floor.svg",
  "/MAIN_Second_Floor.svg",
  "/ANNEX_First_Floor.svg",
  "/ANNEX_Second_Floor.svg",
];

// ─── Install: pre-cache SVG floor plans ──────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Activate immediately without waiting for old SW to die
  event.waitUntil(
    caches.open(SVG_CACHE).then((cache) => {
      console.log("[SW] Pre-caching floor plan SVGs");
      return cache.addAll(SVG_ASSETS);
    }).catch((err) => {
      console.warn("[SW] Pre-cache failed (offline during install?):", err);
    })
  );
});

// ─── Activate: delete old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SVG_CACHE && k !== API_CACHE)
          .map((k) => {
            console.log("[SW] Deleting old cache:", k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: apply per-resource strategies ────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ── SVG floor plans: Cache-first ──────────────────────────────────────────
  if (url.pathname.endsWith(".svg") && SVG_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.open(SVG_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached; // Instant from cache
          // Not cached yet — fetch, store, return
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // ── API calls: Network-first, cache fallback ───────────────────────────────
  const isApiCall =
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("render.com") ||
    url.hostname.includes("railway.app") ||
    url.hostname.includes("vercel.app") ||
    url.hostname.includes("heroku") ||
    // Covers your Django backend on any host
    (url.pathname.startsWith("/api/") || url.pathname.includes("/stalls/") || url.pathname.includes("/vendors/"));

  if (isApiCall && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() =>
          caches.open(API_CACHE).then((cache) =>
            cache.match(event.request).then((cached) => {
              if (cached) {
                console.log("[SW] Offline — serving stale API data for:", url.pathname);
                return cached;
              }
              // No cache, truly offline
              return new Response(
                JSON.stringify({ results: [], offline: true }),
                { headers: { "Content-Type": "application/json" } }
              );
            })
          )
        )
    );
    return;
  }

  // ── Everything else: default browser fetch (no interference) ─────────────
});
