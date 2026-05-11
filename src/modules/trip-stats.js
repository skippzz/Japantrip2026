// ── Trip Stats: progress + summary metrics ──
// Phase 5.3. Surfaces a small stats panel useful during/after the trip.

import { state } from './state.js';

export function computeTripStats() {
    const totalDays = state.itinerary?.length || 0;
    const allItems = (state.itinerary || []).flatMap(d => d.items || []);
    const visited = allItems.filter(i => i.visited).length;
    const totalItems = allItems.length;
    const places = state.places?.length || 0;
    const reserved = (state.places || []).filter(p => p.reserved).length;
    const packed = (state.packing || []).filter(p => p.packed).length;
    const packTotal = state.packing?.length || 0;
    const cities = new Set((state.places || []).map(p => p.city)).size;
    return {
        totalDays, totalItems, visited, places, reserved,
        packed, packTotal,
        cities,
        visitedPct: totalItems ? Math.round(visited / totalItems * 100) : 0,
        packedPct: packTotal ? Math.round(packed / packTotal * 100) : 0,
    };
}

// Each tile deep-links to the relevant view + filter so the at-a-glance
// section is a navigation primary, not just a passive readout. closeSheet
// dismisses the app-drawer first so the user lands on the destination view.
function go(action) {
    return `onclick="closeSheet('app-drawer'); ${action}"`;
}
export function renderTripStatsHtml() {
    const s = computeTripStats();
    return `
        <div class="trip-stats-grid">
            <button class="trip-stat" ${go(`switchView('itinerary')`)}><strong>${s.totalDays}</strong><span>Days</span></button>
            <button class="trip-stat" ${go(`switchView('itinerary')`)}><strong>${s.totalItems}</strong><span>Activities</span></button>
            <button class="trip-stat" ${go(`setPlaceStatusFilter('completed'); switchView('places')`)}><strong>${s.visited}</strong><span>Done · ${s.visitedPct}%</span></button>
            <button class="trip-stat" ${go(`switchView('places')`)}><strong>${s.places}</strong><span>Places · ${s.cities} cities</span></button>
            <button class="trip-stat" ${go(`setPlaceStatusFilter('reserved'); switchView('places')`)}><strong>${s.reserved}</strong><span>Booked</span></button>
            <button class="trip-stat" ${go(`switchView('packing')`)}><strong>${s.packedPct}%</strong><span>${s.packed}/${s.packTotal} packed</span></button>
        </div>`;
}
