const CACHE_NAME = 'japan2026-v20';
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
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
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

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then(cached => {
            const fetched = fetch(e.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => cached);
            return cached || fetched;
        })
    );
});
