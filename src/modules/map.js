// ── Map: Google Maps integration, markers, autocomplete, day maps ──

import { MARKER_COLORS, ENABLE_API_PHOTOS } from './config.js';
import { esc, getArea, getPhotoPath, mapsNavUrl, findPlaceForItem } from './helpers.js';
import { state, save } from './state.js';
import { showToast } from './toast.js';
import { getMapStyles } from './theme.js';
import { parseDayTitle } from './helpers.js';

// ── Module-level state ──
let placesService = null;
let autocompleteWidget = null;
let photoQueue = [], isProcessingPhotos = false;
export let expandedDayMapInstance = null;

// ── Shared helper for day map views (deduplication) ──
function createDayMapView(mapEl, coords, options = {}) {
    const {
        zoom = 13,
        controls = false,
        gestureHandling = 'cooperative',
        markerScale = 14,
    } = options;

    const map = new google.maps.Map(mapEl, {
        center: coords[0],
        zoom,
        styles: getMapStyles(),
        mapTypeControl: controls,
        streetViewControl: controls,
        fullscreenControl: controls,
        zoomControl: true,
        gestureHandling,
    });

    const bounds = new google.maps.LatLngBounds();
    const path = [];

    coords.forEach((c, i) => {
        const color = MARKER_COLORS[c.cat] || '#3b82f6';
        new google.maps.Marker({
            position: { lat: c.lat, lng: c.lng },
            map,
            title: c.name,
            label: { text: String(i + 1), color: '#fff', fontWeight: '700', fontSize: markerScale <= 14 ? '11px' : '12px' },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color, fillOpacity: 1,
                strokeColor: '#fff', strokeWeight: 2, scale: markerScale,
            },
        });
        bounds.extend({ lat: c.lat, lng: c.lng });
        path.push({ lat: c.lat, lng: c.lng });
    });

    if (path.length >= 2) {
        new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.6,
            strokeWeight: markerScale <= 14 ? 3 : 4,
            icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: markerScale <= 14 ? 3 : 4, fillColor: '#3b82f6', fillOpacity: 1, strokeWeight: 0 }, offset: '50%' }],
            map,
        });
    }

    if (coords.length > 1) {
        map.fitBounds(bounds, markerScale <= 14 ? 30 : 40);
    }

    return map;
}

// ── Collect coordinates for a day ──
function getDayCoords(day) {
    const coords = [];
    for (const it of day.items) {
        if (it.isNote) continue;
        const p = findPlaceForItem(it);
        if (p && p.lat && p.lng) coords.push({ lat: p.lat, lng: p.lng, name: it.name, cat: p.category });
    }
    return coords;
}

// ── Main map ──
export function initMap() {
    window._gmap = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 36.2, lng: 138.2 }, zoom: 6,
        styles: getMapStyles(), mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
    window._infoWindow = new google.maps.InfoWindow();
    placesService = new google.maps.places.PlacesService(window._gmap);
    window._placesService = placesService;
    updateMapMarkers();
}

export function updateMapMarkers(cityFilter) {
    window._gmarkers.forEach(m => m.setMap(null));
    window._gmarkers = [];
    const filtered = (cityFilter && cityFilter !== 'all')
        ? state.places.filter(p => p.city === cityFilter) : state.places;

    filtered.forEach(p => {
        if (!p.lat || !p.lng) return;
        const color = MARKER_COLORS[p.category] || '#3b82f6';
        const marker = new google.maps.Marker({
            position: { lat: p.lat, lng: p.lng }, map: window._gmap, title: p.name,
            icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
        });
        marker.addListener('click', () => {
            const navUrl = mapsNavUrl(p.name, p.city, p.lat, p.lng, p.address);
            const photo = getPhotoPath(p);
            window._infoWindow.setContent(`
                <div style="min-width:200px;font-family:-apple-system,sans-serif;color:#1f2937">
                    <img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:6px 6px 0 0" onerror="this.style.display='none'">
                    <div style="padding:8px 10px 10px">
                        <strong style="font-size:13px">${esc(p.name)}</strong><br>
                        <span style="font-size:11px;color:#6b7280">${getArea(p) ? esc(getArea(p)) + ' · ' : ''}${esc(p.address||p.city)}</span><br>
                        ${p.hours?`<span style="font-size:11px">🕐 ${esc(p.hours)}</span><br>`:''}
                        <a href="${navUrl}" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:600">📍 Navigate →</a>
                    </div>
                </div>
            `);
            window._infoWindow.open(window._gmap, marker);
        });
        window._gmarkers.push(marker);
    });
}

export function fitMapToAll() {
    if (!window._gmarkers.length) return;
    const bounds = new google.maps.LatLngBounds();
    window._gmarkers.forEach(m => bounds.extend(m.getPosition()));
    window._gmap.fitBounds(bounds, 40);
}

// ── Autocomplete ──
export function initAutocomplete() {
    const input = document.getElementById('f-address');
    autocompleteWidget = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'jp' },
        fields: ['place_id', 'geometry', 'formatted_address', 'name'],
    });
    autocompleteWidget.addListener('place_changed', () => {
        const place = autocompleteWidget.getPlace();
        if (place.geometry) {
            document.getElementById('f-lat').value = place.geometry.location.lat();
            document.getElementById('f-lng').value = place.geometry.location.lng();
        }
        if (place.formatted_address) document.getElementById('f-address').value = place.formatted_address;
        if (place.name && !document.getElementById('f-name').value) document.getElementById('f-name').value = place.name;
    });
}

// ── Day mini-maps ──
export function initDayMap(dayId) {
    if (typeof google === 'undefined' || !google.maps) return;
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;
    const el = document.getElementById(`daymap-${dayId}`);
    if (!el) return;

    const coords = getDayCoords(day);

    const wrap = document.getElementById(`daymap-wrap-${dayId}`);
    if (coords.length === 0) { if (wrap) wrap.style.display = 'none'; return; }
    if (wrap) wrap.style.display = ''; el.style.display = '';

    const map = createDayMapView(el, coords, {
        zoom: 13,
        controls: false,
        gestureHandling: 'cooperative',
        markerScale: 14,
    });

    window._dayMaps[dayId] = map;
}

export function expandDayMap(dayId) {
    if (typeof google === 'undefined' || !google.maps) { showToast('Map not loaded yet', 'warn'); return; }
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;
    const coords = getDayCoords(day);
    if (coords.length === 0) { showToast('No places with coordinates in this day', 'info'); return; }

    const modal = document.getElementById('modal-day-map');
    const container = document.getElementById('day-map-expanded');
    if (!modal || !container) return;
    container.innerHTML = '';
    const {date, subtitle} = parseDayTitle(day.title);
    document.getElementById('day-map-modal-title').textContent = `Map — ${date}${subtitle ? ': ' + subtitle : ''}`;
    window.openModal('modal-day-map');

    const map = createDayMapView(container, coords, {
        zoom: 14,
        controls: true,
        gestureHandling: 'greedy',
        markerScale: 16,
    });

    expandedDayMapInstance = map;
}

export function initExpandedDayMaps() {
    window._expandedDays.forEach(dayId => initDayMap(dayId));
}

// ── Photo fetching (disabled by ENABLE_API_PHOTOS flag) ──
export function startPhotoFetching() {
    if (!ENABLE_API_PHOTOS || !placesService) return;
    photoQueue = state.places.filter(p => !p.photoUrl);
    processPhotoQueue();
}

export function processPhotoQueue() {
    if (!ENABLE_API_PHOTOS) return;
    if (isProcessingPhotos || photoQueue.length === 0) return;
    isProcessingPhotos = true;
    const place = photoQueue.shift();
    const query = place.name + ', ' + place.city + ', Japan';
    placesService.findPlaceFromQuery({ query, fields: ['photos', 'place_id'] }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
            const r = results[0];
            if (r.photos?.length) {
                place.photoUrl = r.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
                save();
                // Update card if visible
                const card = document.querySelector(`.place-card[data-id="${place.id}"]`);
                if (card) {
                    const img = card.querySelector('.thumb-img');
                    if (img) { img.src = place.photoUrl; img.style.display = ''; }
                }
            }
            if (r.place_id) place.googlePlaceId = r.place_id;
        }
        isProcessingPhotos = false;
        setTimeout(processPhotoQueue, 200);
    });
}
