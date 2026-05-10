// ── Geolocation helpers ──
// Phase 4.4 + 5.2. Returns user's current coords. Caches for 5 minutes to
// avoid spamming the GPS. Graceful failure if permission denied.

let cache = null;

export function getUserLocation(maxAgeMs = 5 * 60 * 1000) {
    return new Promise((resolve) => {
        if (cache && Date.now() - cache.ts < maxAgeMs) return resolve(cache.coords);
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                cache = { ts: Date.now(), coords: { lat: p.coords.latitude, lng: p.coords.longitude } };
                resolve(cache.coords);
            },
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
    });
}

// Haversine distance in km between two lat/lng pairs.
export function distanceKm(a, b) {
    if (!a || !b) return Infinity;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180;
    const la2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Format walk time from a km distance — assumes 5km/h.
export function walkMinutes(km) {
    if (!isFinite(km)) return null;
    return Math.round(km / 5 * 60);
}

if (typeof window !== 'undefined') {
    window.getUserLocation = getUserLocation;
    window.distanceKm = distanceKm;
}
