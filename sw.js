// Cache name is bumped any time the SW code itself changes, so old caches
// get purged. Feature deploys do NOT need a bump anymore — the fetch handler
// uses network-first for same-origin app files, so users always pull fresh
// index.html / app.js / modules / styles on every page load when online, and
// fall back to cache only when offline.
const CACHE_NAME = 'japan2026-v23';

// App shell — pre-cached on install so the app works offline even on first
// load-then-go-offline. At runtime these are served network-first.
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './src/app.js',
    './src/modules/config.js',
    './src/modules/data.js',
    './src/modules/helpers.js',
    './src/modules/state.js',
    './src/modules/toast.js',
    './src/modules/theme.js',
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
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            // Best-effort: don't block install if a single asset 404s in dev.
            .then(cache => Promise.all(
                ASSETS.map(url => cache.add(url).catch(() => null))
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
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

    if (isSameOrigin) {
        e.respondWith(networkFirst(req));
    } else {
        e.respondWith(cacheFirst(req));
    }
});

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
