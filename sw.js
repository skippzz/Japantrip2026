// Cache name is bumped any time the SW code itself changes, so old caches
// get purged. Feature deploys do NOT need a bump anymore — the fetch handler
// uses network-first for same-origin app files, so users always pull fresh
// index.html / app.js / modules / styles on every page load when online, and
// fall back to cache only when offline.
// Bumped to v26: image cache rejects sub-5KB responses so Google's
// "for development purposes only" placeholder PNG (~3KB) never gets cached
// as if it were a real photo.
const CACHE_NAME = 'japan2026-v26';
const IMG_CACHE_NAME = 'japan2026-img-v2';
const IMG_CACHE_MAX = 200;
const IMG_MIN_BYTES = 5000;

// App shell — pre-cached on install so the app works offline even on first
// load-then-go-offline. At runtime these are served network-first.
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './src/app.js',
    // Core modules
    './src/modules/config.js',
    './src/modules/data.js',
    './src/modules/helpers.js',
    './src/modules/state.js',
    './src/modules/toast.js',
    './src/modules/theme.js',
    // View / feature modules
    './src/modules/dashboard.js',
    './src/modules/itinerary.js',
    './src/modules/places.js',
    './src/modules/pool.js',
    './src/modules/packing.js',
    './src/modules/todos.js',
    './src/modules/map.js',
    './src/modules/guide.js',
    './src/modules/hotels.js',
    './src/modules/currency.js',
    './src/modules/destination.js',
    './src/modules/place-import.js',
    './src/modules/routing.js',
    './src/modules/trips.js',
    './src/modules/export.js',
    // Phase 1-6 mobile-overhaul modules (added v24)
    './src/modules/sheet.js',
    './src/modules/gestures.js',
    './src/modules/fab.js',
    './src/modules/app-drawer.js',
    './src/modules/reorder-mode.js',
    './src/modules/install-prompt.js',
    './src/modules/weather.js',
    './src/modules/yen-tap.js',
    './src/modules/geo.js',
    './src/modules/trip-stats.js',
    './src/modules/trip-share.js',
    './src/modules/trip-theme.js',
    // CDN libs
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            // Best-effort: don't block install if a single asset 404s in dev.
            // Tier 3 fix: log misses instead of silent swallow so dev can spot them.
            .then(cache => Promise.all(
                ASSETS.map(url => cache.add(url).catch(err => {
                    console.warn('[SW] failed to cache', url, err?.message || err);
                    return null;
                }))
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(k => k !== CACHE_NAME && k !== IMG_CACHE_NAME)
                .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Allow the page to force an immediate SW takeover after an update
// (used by the "Clear cache & reload" button and future update prompts).
self.addEventListener('message', e => {
    if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch strategy ──
// Same-origin (index.html, app.js, modules, styles, manifest): NETWORK FIRST.
//   → Users see new features the moment they reload after a deploy.
//   → Offline falls back to whatever is cached.
// Cross-origin CDN libs (SortableJS, confetti, html2canvas): CACHE FIRST.
//   → These are pinned to specific versions in index.html and never change;
//     no reason to hit the network for them on every load.
self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const isSameOrigin = url.origin === self.location.origin;

    // Wave 4: separate cache for off-origin images (Google Places photos etc.)
    // with stale-while-revalidate + LRU eviction so we don't blow storage.
    const isImage = req.destination === 'image'
        || /\.(jpe?g|png|webp|gif|svg|avif)(\?|$)/i.test(url.pathname);
    if (!isSameOrigin && isImage) {
        e.respondWith(imageCache(req));
        return;
    }

    if (isSameOrigin) {
        e.respondWith(networkFirst(req));
    } else {
        e.respondWith(cacheFirst(req));
    }
});

async function imageCache(req) {
    const cache = await caches.open(IMG_CACHE_NAME);
    const cached = await cache.match(req);
    const fetchAndCache = fetch(req).then(async res => {
        if (!res || res.status !== 200) return res;
        // Verify it's actually a real photo, not Google's "API key invalid"
        // placeholder PNG that comes back as HTTP 200. Branch on Content-Length
        // when set; otherwise buffer the body so we can both size-check and
        // serve. We clone before buffering so the network response stays usable.
        const ct = res.headers.get('content-type') || '';
        if (!ct.startsWith('image/')) return res;
        const cl = parseInt(res.headers.get('content-length') || '', 10);
        if (Number.isFinite(cl)) {
            if (cl >= IMG_MIN_BYTES) {
                cache.put(req, res.clone()).then(() => trimImgCache(cache));
            }
            return res;
        }
        // No content-length: buffer the body to measure.
        const buf = await res.clone().arrayBuffer();
        if (buf.byteLength >= IMG_MIN_BYTES) {
            const cacheable = new Response(buf, { status: 200, headers: res.headers });
            cache.put(req, cacheable).then(() => trimImgCache(cache));
        }
        return new Response(buf, { status: 200, headers: res.headers });
    }).catch(() => cached);
    return cached || fetchAndCache;
}

async function trimImgCache(cache) {
    try {
        const keys = await cache.keys();
        if (keys.length <= IMG_CACHE_MAX) return;
        // Drop oldest entries first (cache.keys() preserves insertion order).
        const excess = keys.length - IMG_CACHE_MAX;
        for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
    } catch { /* ignore */ }
}

async function networkFirst(req) {
    try {
        const fresh = await fetch(req);
        // Only cache successful, basic responses (skip opaque / error responses).
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, fresh.clone());
        }
        return fresh;
    } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Navigation request with no cache → serve the cached app shell so
        // the SPA can still boot offline and render from localStorage.
        if (req.mode === 'navigate') {
            const shell = await caches.match('./index.html');
            if (shell) return shell;
        }
        throw new Error('Network error and no cache match');
    }
}

async function cacheFirst(req) {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, fresh.clone());
        }
        return fresh;
    } catch {
        throw new Error('Network error and no cache match');
    }
}
