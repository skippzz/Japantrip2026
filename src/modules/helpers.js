// ── Helpers: Pure utility functions ──

import { PLACE_AREAS, PLACE_VENUE } from './data.js';

// ── HTML escape ──
export function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ── String utilities ──
export function slugify(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── Place area/venue lookups ──
export function getArea(p) { return p.area || PLACE_AREAS[p.id] || ''; }
export function getVenue(p) { return p.venue || PLACE_VENUE[p.id] || ''; }

// ── Photo path ──
export function getPhotoPath(p) {
    if (p.photoUrl) return p.photoUrl;
    return `photos/${slugify(p.name)}.jpg`;
}

// ── Day/title parsing ──
export function getDayCity(day) {
    const t = day.title.toLowerCase();
    if (t.includes('kyoto'))  return 'Kyoto';
    if (t.includes('osaka'))  return 'Osaka';
    if (t.includes('nara'))   return 'Nara';
    if (t.includes('fuji'))   return 'Fuji';
    if (t.includes('izu'))    return 'Izu';
    return 'Tokyo';
}

export function parseDayTitle(title) {
    if (!title) return { date: 'Day', subtitle: '' };
    const parts = title.split(' — ');
    return { date: parts[0] || title, subtitle: parts.slice(1).join(' — ') || '' };
}

// ── Google Maps URL builders ──
export function mapsNavUrl(name, city, lat, lng, address) {
    const dest = address
        ? encodeURIComponent(name + ', ' + address)
        : encodeURIComponent(name + ', ' + city + ', Japan');
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`;
}

export function mapsSearchUrl(name, city, lat, lng, address) {
    const query = address ? name + ', ' + address : name + ', ' + city + ', Japan';
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17`;
}

// ── Place lookup ──
let _state = null;
export function setStateRef(s) { _state = s; }

export function findPlaceById(id) {
    if (id == null || !_state) return null;
    return _state.places.find(p => p.id === id) || null;
}

export function findPlaceByName(name) {
    if (!name || !_state) return null;
    return _state.places.find(p => p.name === name)
        || _state.places.find(p => p.name.toLowerCase() === name.toLowerCase());
}

export function findPlaceForItem(item) {
    if (!item) return null;
    if (item.placeId != null) {
        const p = findPlaceById(item.placeId);
        if (p) return p;
    }
    return item.isNote ? null : findPlaceByName(item.name);
}

// ── Geo / distance ──
export function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getDayWalkingEstimate(day) {
    const coords = [];
    for (const it of day.items) {
        if (it.isNote) continue;
        const p = findPlaceForItem(it);
        if (p && p.lat && p.lng) coords.push({ lat: p.lat, lng: p.lng });
    }
    if (coords.length < 2) return null;
    let totalKm = 0;
    for (let i = 1; i < coords.length; i++) {
        totalKm += haversineKm(coords[i-1].lat, coords[i-1].lng, coords[i].lat, coords[i].lng);
    }
    return (totalKm * 1.4).toFixed(1);
}

// ── Time parsing ──
export function parseTimeToMinutes(str) {
    if (!str) return null;
    str = str.trim().toLowerCase().replace(/\s+/g, ' ');
    let m = str.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
    m = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (m) {
        let h = parseInt(m[1]), min = parseInt(m[2] || '0');
        if (m[3] === 'pm' && h !== 12) h += 12;
        if (m[3] === 'am' && h === 12) h = 0;
        return h * 60 + min;
    }
    m = str.match(/^(\d{1,2})(?::(\d{2}))?/);
    if (m) {
        let h = parseInt(m[1]), min = parseInt(m[2] || '0');
        if (h <= 24) return h * 60 + min;
    }
    return null;
}

export function parseHoursRange(hoursStr) {
    if (!hoursStr) return null;
    if (/24\s*hours?/i.test(hoursStr)) return { open: 0, close: 1440 };
    const parts = hoursStr.split(/\s*[–—-]\s*/);
    if (parts.length < 2) return null;
    const open = parseTimeToMinutes(parts[0]);
    const close = parseTimeToMinutes(parts[1]);
    if (open === null || close === null) return null;
    return { open, close: close <= open ? close + 1440 : close };
}

export function formatMinutesTo24h(mins) {
    if (mins == null || mins < 0) return '';
    const h = Math.floor(mins / 60) % 24, m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getHoursConflict(it, place, travelMinFromPrev) {
    if (!place || !place.hours) return null;
    const hoursStr = place.hours;

    // Check for "Closed" days
    if (/closed/i.test(hoursStr)) {
        // Day-specific: "Closed Mondays" or "Mon: Closed"
        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const shortDays = ['sun','mon','tue','wed','thu','fri','sat'];
        for (let i = 0; i < dayNames.length; i++) {
            if (new RegExp(`closed\\s+${dayNames[i]}|${shortDays[i]}.*closed`, 'i').test(hoursStr)) {
                return `⚠️ May be closed on ${dayNames[i].charAt(0).toUpperCase() + dayNames[i].slice(1)}s`;
            }
        }
        if (/^closed$/i.test(hoursStr.trim())) return '⚠️ Marked as closed';
    }

    let startMins = it.time ? parseTimeToMinutes(it.time) : null;
    let endMins = it.timeEnd ? parseTimeToMinutes(it.timeEnd) : null;
    if (!it.timeEnd && it.time && /^\d{1,2}(?::\d{2})?\s*[-–]\s*\d{1,2}/.test(it.time)) {
        const parts = it.time.split(/\s*[-–]\s*/);
        if (parts.length >= 2) endMins = parseTimeToMinutes(parts[1].trim()) ?? startMins;
    }
    endMins = endMins ?? startMins;
    if (startMins === null) return null;

    // Factor in travel time from previous stop
    const arrivalMins = (travelMinFromPrev && travelMinFromPrev > 0)
        ? startMins + travelMinFromPrev
        : startMins;

    const hours = parseHoursRange(hoursStr);
    if (!hours) return null;

    // Check last entry (many temples stop entry 30min before close)
    const lastEntry = place.lastEntry
        ? parseTimeToMinutes(place.lastEntry)
        : (place.notes && /last.?entry/i.test(place.notes) ? hours.close - 30 : null);

    if (arrivalMins < hours.open) {
        const diff = hours.open - arrivalMins;
        return diff > 60 ? `Opens at ${formatMinutesTo24h(hours.open)}` : `Opens in ${diff} min`;
    }
    if (lastEntry && arrivalMins > lastEntry) {
        return `Last entry ~${formatMinutesTo24h(lastEntry)}`;
    }
    if (endMins > hours.close) return `Closes at ${formatMinutesTo24h(hours.close % 1440)}`;
    return null;
}

// ── Misc ──
export function downloadBlob(blob, fname) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
}

export function formatTimeAgo(date) {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
