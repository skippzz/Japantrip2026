// ── Routing: Travel time estimates, route optimization, nearby suggestions ──

import { haversineKm, findPlaceForItem } from './helpers.js';

// ══════════════════════════════════════════════════════════════
//  AREA-SPECIFIC WALKING MULTIPLIERS
// ══════════════════════════════════════════════════════════════
// Straight-line distance × multiplier = realistic walking distance
// Dense urban = lots of turns, crossings, station navigation
// Temple/park = paths are direct but terrain may add time
// Rural = relatively straight roads
const AREA_MULTIPLIERS = {
    // Dense urban
    'Shinjuku': 1.6, 'Shibuya': 1.6, 'Ikebukuro': 1.6, 'Ginza': 1.5,
    'Namba': 1.6, 'Shinsaibashi': 1.5, 'Umeda': 1.6, 'Shinsekai': 1.5,
    'Harajuku': 1.5, 'Shimokitazawa': 1.5, 'Gion': 1.4, 'Downtown': 1.5,
    'Nishiki': 1.5, 'Shijo': 1.5, 'Tokyo Station': 1.5,
    // Temple / park / historic
    'Arashiyama': 1.3, 'Higashiyama': 1.3, 'Nara Park': 1.25,
    'Kinugasa': 1.3, 'Sakyo': 1.3, 'Fushimi': 1.3, 'Naramachi': 1.3,
    'Asakusa': 1.4, 'Kamakura': 1.3,
    // Rural / natural
    'Kawaguchiko': 1.2, 'Lake Saiko': 1.2, 'Fujiyoshida': 1.2,
    'Fujinomiya': 1.2, 'Oshino': 1.15, 'Yamanakako': 1.15,
    'Ito': 1.25, 'Shuzenji': 1.2, 'Kawazu': 1.2, 'Numazu': 1.25,
};
const DEFAULT_MULTIPLIER = 1.4;
const WALK_SPEED_KMH = 4.5;
const TRANSIT_OVERHEAD_MIN = 10; // avg time to enter/exit a station
const TRANSIT_SPEED_KMH = 30;   // avg including stops
const WALK_VS_TRANSIT_THRESHOLD_KM = 1.5;

// ══════════════════════════════════════════════════════════════
//  PER-SEGMENT TRAVEL TIME
// ══════════════════════════════════════════════════════════════
function getAreaMultiplier(area) {
    return AREA_MULTIPLIERS[area] || DEFAULT_MULTIPLIER;
}

export function estimateTravelTime(fromPlace, toPlace) {
    if (!fromPlace?.lat || !toPlace?.lat) return null;

    const straightKm = haversineKm(fromPlace.lat, fromPlace.lng, toPlace.lat, toPlace.lng);
    if (straightKm < 0.05) return null; // same location

    // Determine multiplier from the destination area
    const area = toPlace.area || '';
    const multiplier = getAreaMultiplier(area);
    const walkKm = straightKm * multiplier;

    if (walkKm <= WALK_VS_TRANSIT_THRESHOLD_KM) {
        // Walking
        const walkMin = Math.round((walkKm / WALK_SPEED_KMH) * 60);
        return {
            mode: 'walk',
            distanceKm: walkKm,
            minutes: Math.max(1, walkMin),
            label: `🚶 ~${Math.max(1, walkMin)} min walk (${walkKm.toFixed(1)} km)`
        };
    } else {
        // Transit recommended
        const transitMin = Math.round(TRANSIT_OVERHEAD_MIN + (straightKm / TRANSIT_SPEED_KMH) * 60);
        return {
            mode: 'transit',
            distanceKm: straightKm,
            minutes: transitMin,
            label: `🚆 ~${transitMin} min transit (${straightKm.toFixed(1)} km)`
        };
    }
}

export function getDaySegments(day) {
    const segments = [];
    const items = day.items.filter(it => !it.isNote);
    for (let i = 0; i < items.length - 1; i++) {
        const fromPlace = findPlaceForItem(items[i]);
        const toPlace = findPlaceForItem(items[i + 1]);
        const travel = estimateTravelTime(fromPlace, toPlace);
        segments.push({
            fromItem: items[i],
            toItem: items[i + 1],
            travel
        });
    }
    return segments;
}

export function getDayTotalTravel(day) {
    const segments = getDaySegments(day);
    let totalMin = 0;
    let totalKm = 0;
    for (const seg of segments) {
        if (seg.travel) {
            totalMin += seg.travel.minutes;
            totalKm += seg.travel.distanceKm;
        }
    }
    return { totalMin, totalKm: totalKm.toFixed(1), segments };
}

// ══════════════════════════════════════════════════════════════
//  ROUTE OPTIMIZATION (Nearest-neighbor + 2-opt)
// ══════════════════════════════════════════════════════════════
export function optimizeRoute(day) {
    const items = [...day.items];
    if (items.length < 3) return null; // nothing to optimize

    // Separate fixed-time items from free items
    const fixed = []; // { index, item, place }
    const free = [];  // { item, place }

    items.forEach((item, idx) => {
        const place = findPlaceForItem(item);
        if (item.time && item.time.trim()) {
            fixed.push({ index: idx, item, place });
        } else if (!item.isNote) {
            free.push({ item, place });
        } else {
            // Notes stay in position relative to their neighbors
            fixed.push({ index: idx, item, place: null });
        }
    });

    // If all items have fixed times or there's nothing free to reorder, skip
    if (free.length < 2) return null;

    // Filter free items that have coordinates
    const freeWithCoords = free.filter(f => f.place?.lat && f.place?.lng);
    if (freeWithCoords.length < 2) return null;

    // Calculate current total distance for free items
    const currentOrder = freeWithCoords.map(f => f.place);
    const currentDist = routeDistance(currentOrder);

    // Nearest-neighbor heuristic
    const nn = nearestNeighbor(freeWithCoords.map(f => f.place));

    // 2-opt improvement
    const optimized = twoOpt(nn);
    const optimizedDist = routeDistance(optimized);

    if (optimizedDist >= currentDist * 0.95) {
        // Less than 5% improvement — not worth reordering
        return null;
    }

    // Rebuild items array: fixed items stay, free items reordered
    const reordered = [];
    let freeIdx = 0;

    // Map optimized places back to items
    const optimizedItems = optimized.map(place => {
        return freeWithCoords.find(f => f.place === place).item;
    });

    // Also include free items without coords (keep them at the end of free block)
    const freeWithoutCoords = free.filter(f => !f.place?.lat || !f.place?.lng).map(f => f.item);

    // Merge: walk through original order, replacing free items with optimized order
    let optIdx = 0;
    let noCoordIdx = 0;
    for (const item of items) {
        if (item.time && item.time.trim()) {
            // Fixed — keep in place
            reordered.push(item);
        } else if (item.isNote) {
            // Note — keep in place
            reordered.push(item);
        } else {
            const place = findPlaceForItem(item);
            if (place?.lat && place?.lng) {
                if (optIdx < optimizedItems.length) {
                    reordered.push(optimizedItems[optIdx++]);
                } else {
                    reordered.push(item);
                }
            } else {
                if (noCoordIdx < freeWithoutCoords.length) {
                    reordered.push(freeWithoutCoords[noCoordIdx++]);
                } else {
                    reordered.push(item);
                }
            }
        }
    }

    return {
        items: reordered,
        savedKm: (currentDist - optimizedDist).toFixed(1),
        beforeKm: currentDist.toFixed(1),
        afterKm: optimizedDist.toFixed(1),
    };
}

function routeDistance(places) {
    let total = 0;
    for (let i = 1; i < places.length; i++) {
        total += haversineKm(places[i-1].lat, places[i-1].lng, places[i].lat, places[i].lng);
    }
    return total;
}

function nearestNeighbor(places) {
    if (places.length <= 1) return [...places];

    // Try starting from each point, keep the best route
    let bestRoute = null;
    let bestDist = Infinity;

    for (let start = 0; start < Math.min(places.length, 5); start++) {
        const remaining = [...places];
        const route = [remaining.splice(start, 1)[0]];

        while (remaining.length) {
            const last = route[route.length - 1];
            let nearestIdx = 0;
            let nearestDist = Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const d = haversineKm(last.lat, last.lng, remaining[i].lat, remaining[i].lng);
                if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
            }
            route.push(remaining.splice(nearestIdx, 1)[0]);
        }

        const dist = routeDistance(route);
        if (dist < bestDist) { bestDist = dist; bestRoute = route; }
    }

    return bestRoute;
}

function twoOpt(route) {
    if (route.length < 4) return [...route];
    let improved = true;
    let best = [...route];
    let bestDist = routeDistance(best);

    while (improved) {
        improved = false;
        for (let i = 0; i < best.length - 1; i++) {
            for (let j = i + 2; j < best.length; j++) {
                const newRoute = twoOptSwap(best, i, j);
                const newDist = routeDistance(newRoute);
                if (newDist < bestDist - 0.01) { // 10m threshold
                    best = newRoute;
                    bestDist = newDist;
                    improved = true;
                }
            }
        }
    }
    return best;
}

function twoOptSwap(route, i, j) {
    const newRoute = route.slice(0, i + 1);
    for (let k = j; k > i; k--) newRoute.push(route[k]);
    for (let k = j + 1; k < route.length; k++) newRoute.push(route[k]);
    return newRoute;
}

// ══════════════════════════════════════════════════════════════
//  NEARBY PLACE SUGGESTIONS
// ══════════════════════════════════════════════════════════════
export function getNearbyUnaddedPlaces(day, allPlaces, addedIds, addedNames, maxResults = 5) {
    // Get coordinates of places already in this day
    const dayCoords = [];
    for (const it of day.items) {
        if (it.isNote) continue;
        const p = findPlaceForItem(it);
        if (p?.lat && p?.lng) dayCoords.push(p);
    }
    if (dayCoords.length === 0) return [];

    // Compute centroid
    const centroid = {
        lat: dayCoords.reduce((s, p) => s + p.lat, 0) / dayCoords.length,
        lng: dayCoords.reduce((s, p) => s + p.lng, 0) / dayCoords.length,
    };

    // Find unadded places with distances
    const candidates = allPlaces
        .filter(p => !addedIds.has(p.id) && !addedNames.has(p.name) && p.lat && p.lng)
        .map(p => ({
            place: p,
            distanceKm: haversineKm(centroid.lat, centroid.lng, p.lat, p.lng),
            nearestStopKm: Math.min(...dayCoords.map(c => haversineKm(c.lat, c.lng, p.lat, p.lng))),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);

    return candidates.slice(0, maxResults);
}

// ══════════════════════════════════════════════════════════════
//  SMART DAY SUMMARY
// ══════════════════════════════════════════════════════════════
export function getDaySummary(day) {
    const items = day.items.filter(it => !it.isNote);
    if (items.length === 0) return null;

    const travel = getDayTotalTravel(day);

    // Parse first and last times
    let firstMin = null, lastMin = null;
    for (const it of day.items) {
        if (!it.time) continue;
        const t = it.time.trim().split(/\s*[-–]\s*/)[0];
        const mins = parseSimpleTime(t);
        if (mins != null) {
            if (firstMin === null || mins < firstMin) firstMin = mins;
            if (lastMin === null || mins > lastMin) lastMin = mins;
        }
    }

    // Time span
    const spanHours = (firstMin != null && lastMin != null && lastMin > firstMin)
        ? ((lastMin - firstMin) / 60).toFixed(1)
        : null;

    // Pace calculation
    let pace = 'unknown';
    if (items.length >= 2 && spanHours) {
        const avgGapMin = (lastMin - firstMin) / (items.length - 1);
        if (avgGapMin < 30) pace = 'packed';
        else if (avgGapMin < 60) pace = 'moderate';
        else pace = 'relaxed';
    }

    const paceEmoji = { packed: '🔥', moderate: '⚡', relaxed: '🌿', unknown: '' };
    const paceLabel = { packed: 'Packed', moderate: 'Moderate', relaxed: 'Relaxed', unknown: '' };

    return {
        stopCount: items.length,
        travelMin: travel.totalMin,
        travelKm: travel.totalKm,
        spanHours,
        pace,
        paceEmoji: paceEmoji[pace],
        paceLabel: paceLabel[pace],
        firstTime: firstMin != null ? formatMins(firstMin) : null,
        lastTime: lastMin != null ? formatMins(lastMin) : null,
    };
}

function parseSimpleTime(str) {
    if (!str) return null;
    str = str.trim().toLowerCase();
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
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2] || '0');
    return null;
}

function formatMins(m) {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${h}:${String(min).padStart(2, '0')}`;
}
